/* Kiln game kit (v1): engine pieces for building a polished canvas game fast, on top of hub/sdk.js.
 *
 *   <script src="../../hub/sdk.js"></script>
 *   <script src="../../hub/kit.js"></script>
 *
 * Everything lives on window.Kit: view, loop, input, audio (sfx, music), fx, tween/ease, cam, gfx, rng and
 * math, save, and shell (title, pause and game-over screens). The kit brings no look of its own: each game
 * picks its palette, fonts and shell style. Reference and art direction: docs/KIT.md.
 * It is also inlined into a srcdoc bundle, so it never loads anything by URL or reads its own script path.
 */
(function () {
  'use strict';
  if (window.Kit) return;

  const DEBUG = /[?&]debug\b/.test(location.search);
  const TAU = Math.PI * 2;
  // True while the kit draws text that belongs to the world (signs, tile letters, particle glyphs), so
  // tools/game-check.cjs can tell it from HUD text, which must never appear in key art.
  let worldText = false;

  // Arcade is normally loaded first; a stand-in keeps the kit usable on a bare page (and in unit tests).
  const A = window.Arcade || (function () {
    const mem = {};
    return {
      embedded: false,
      keyart: /[?&]keyart\b/.test(location.search),
      settings: { sound: true, vibration: true },
      on() {}, ready() {}, runStart() {}, runEnd() {}, inRun() { return false; }, haptic() {}, exit() {}, track() {},
      setSetting(k, v) { this.settings[k] = v; },
      store: { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v; }, del: k => { delete mem[k]; } },
    };
  })();

  const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  /* ---------------------------------------------------------------- math, rng, collision */

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (ax, ay, bx, by) => Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
  const angle = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
  const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  function wrap(v, min, max) {
    const r = max - min;
    return r <= 0 ? min : ((((v - min) % r) + r) % r) + min;
  }
  // Frame-rate independent easing toward a target: `rate` 10 closes ~63% of the gap in 0.1 s.
  const smooth = (v, target, rate, dt) => target + (v - target) * Math.exp(-rate * dt);
  function smoothstep(e0, e1, x) {
    const t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  const angleDiff = (a, b) => wrap(b - a, -Math.PI, Math.PI);

  function hashSeed(seed) {
    if (typeof seed === 'number' && isFinite(seed)) return seed >>> 0;
    const s = String(seed);
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  // mulberry32: tiny, fast and good enough for games. Same seed, same sequence, on every device.
  function rng(seed) {
    let s = seed == null ? (Math.random() * 4294967296) >>> 0 : hashSeed(seed);
    const r = {
      next() {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      },
      range: (a, b) => a + (b - a) * r.next(),
      int: (a, b) => Math.floor(a + (b - a + 1) * r.next()),
      pick: arr => arr[Math.floor(r.next() * arr.length)],
      chance: p => r.next() < p,
      sign: () => (r.next() < 0.5 ? -1 : 1),
      shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(r.next() * (i + 1));
          const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
      },
      reset(seed2) { s = hashSeed(seed2); return r; },
    };
    return r;
  }

  const circleCircle = (ax, ay, ar, bx, by, br) => (bx - ax) * (bx - ax) + (by - ay) * (by - ay) <= (ar + br) * (ar + br);
  const rectRect = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const pointInRect = (px, py, r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
  function segCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const t = len2 ? clamp(((cx - x1) * dx + (cy - y1) * dy) / len2, 0, 1) : 0;
    const px = x1 + dx * t - cx, py = y1 + dy * t - cy;
    return px * px + py * py <= r * r;
  }

  const fmt = n => Math.round(+n || 0).toLocaleString('en-US');

  // Arcade.haptic, minus the browser's console warning when nobody has touched the page yet (capture scenes).
  function haptic(pattern) {
    const ua = navigator.userActivation;
    if (ua && !ua.hasBeenActive) return;
    A.haptic(pattern);
  }

  /* ---------------------------------------------------------------- easing and tweens */

  const ease = {
    linear: t => t,
    quadIn: t => t * t,
    quadOut: t => t * (2 - t),
    quadInOut: t => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
    cubicIn: t => t * t * t,
    cubicOut: t => 1 - (1 - t) * (1 - t) * (1 - t),
    cubicInOut: t => (t < 0.5 ? 4 * t * t * t : 1 - 4 * (1 - t) * (1 - t) * (1 - t)),
    sineInOut: t => (1 - Math.cos(Math.PI * t)) / 2,
    expoOut: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    backIn: t => t * t * (2.70158 * t - 1.70158),
    backOut: t => 1 + (t - 1) * (t - 1) * (2.70158 * (t - 1) + 1.70158),
    backInOut: t => (t < 0.5 ? ease.backIn(t * 2) / 2 : 0.5 + ease.backOut(t * 2 - 1) / 2),
    elasticIn: t => (t <= 0 || t >= 1 ? t : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * (TAU / 3))),
    elasticOut: t => (t <= 0 || t >= 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
    elasticInOut: t => (t < 0.5 ? ease.elasticIn(t * 2) / 2 : 0.5 + ease.elasticOut(t * 2 - 1) / 2),
    bounceOut(t) {
      const n = 7.5625, d = 2.75;
      if (t < 1 / d) return n * t * t;
      if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
      if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
      return n * (t -= 2.625 / d) * t + 0.984375;
    },
    bounceIn: t => 1 - ease.bounceOut(1 - t),
    bounceInOut: t => (t < 0.5 ? (1 - ease.bounceOut(1 - 2 * t)) / 2 : (1 + ease.bounceOut(2 * t - 1)) / 2),
  };
  const easeFn = e => (typeof e === 'function' ? e : ease[e] || ease.quadOut);

  const tweens = [];
  // Tween numeric props of target over ms (game time: they freeze with the loop). A new tween on the
  // same target and prop replaces the old one, so rapid retriggers never fight. Finished and replaced
  // tweens are only marked done here and dropped by update(), so onDone may safely start new tweens.
  function tween(target, props, ms, easing, o) {
    o = o || {};
    const keys = Object.keys(props);
    for (let i = tweens.length - 1; i >= 0; i--) {
      const old = tweens[i];
      if (old.target === target && old.keys.some(k => keys.indexOf(k) >= 0)) old.done = true;
    }
    const tw = {
      target, keys,
      to: keys.map(k => +props[k]),
      from: null,
      dur: Math.max(0.001, (ms || 0) / 1000),
      t: -(o.delay || 0) / 1000,
      ease: easeFn(easing),
      onUpdate: o.onUpdate || null,
      onDone: o.onDone || null,
      done: false,
      stop() { tw.done = true; },
    };
    tweens.push(tw);
    return tw;
  }
  tween.update = function (dt) {
    for (let i = 0; i < tweens.length; i++) {
      const tw = tweens[i];
      if (!tw.done) {
        tw.t += dt;
        if (tw.t >= 0) {
          if (!tw.from) tw.from = tw.keys.map(k => +tw.target[k] || 0);
          const p = Math.min(1, tw.t / tw.dur), e = tw.ease(p);
          for (let k = 0; k < tw.keys.length; k++) tw.target[tw.keys[k]] = tw.from[k] + (tw.to[k] - tw.from[k]) * e;
          if (tw.onUpdate) tw.onUpdate(tw.target, p);
          if (p >= 1) { tw.done = true; if (tw.onDone) tw.onDone(tw.target); }
        }
      }
      if (tw.done) { tweens.splice(i, 1); i--; }
    }
  };
  tween.clear = function (target) {
    for (let i = tweens.length - 1; i >= 0; i--) {
      if (target === undefined || tweens[i].target === target) tweens[i].done = true;
    }
  };
  Object.defineProperty(tween, 'count', { get: () => tweens.reduce((n, tw) => n + (tw.done ? 0 : 1), 0) });

  /* ---------------------------------------------------------------- colours and theme */

  const colorCache = new Map();
  let colorCtx = null;
  // Any CSS colour -> [r, g, b, a]. The browser parses names, hsl() and friends for us, once per colour.
  function parseColor(c) {
    c = String(c);
    let v = colorCache.get(c);
    if (v) return v;
    if (!colorCtx) colorCtx = document.createElement('canvas').getContext('2d');
    colorCtx.fillStyle = '#000';
    colorCtx.fillStyle = c;
    const s = colorCtx.fillStyle;
    if (s[0] === '#') v = [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16), 1];
    else { const m = s.match(/[\d.]+/g) || [0, 0, 0, 1]; v = [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]]; }
    if (colorCache.size > 512) colorCache.clear();
    colorCache.set(c, v);
    return v;
  }
  const rgba = (r, g, b, a) => (a >= 1 ? `rgb(${r | 0},${g | 0},${b | 0})` : `rgba(${r | 0},${g | 0},${b | 0},${+a.toFixed(3)})`);
  const hsl = (h, s, l, a) => (a === undefined || a >= 1 ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a})`);
  function mix(c1, c2, t) {
    const a = parseColor(c1), b = parseColor(c2);
    return rgba(lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t));
  }
  const shade = (c, amt) => (amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt));
  function alpha(c, a) { const v = parseColor(c); return rgba(v[0], v[1], v[2], v[3] * a); }
  function css(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback || '';
  }
  function isDark() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark' || t === 'light') return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  // Calls fn whenever the light/dark theme may have changed (hub setting or system preference).
  function onTheme(fn) {
    const dq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    if (dq && dq.addEventListener) dq.addEventListener('change', () => fn(isDark()));
    new MutationObserver(() => fn(isDark())).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /* ---------------------------------------------------------------- gfx */

  const FONT_STACKS = {
    display: '"Unbounded", "Arial Black", "Helvetica Neue", system-ui, sans-serif',
    body: '"Figtree", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    rounded: 'ui-rounded, "SF Pro Rounded", "Nunito", "Varela Round", system-ui, sans-serif',
    mono: 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace',
    serif: '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif',
    condensed: '"Roboto Condensed", "Arial Narrow", "Helvetica Neue", sans-serif-condensed, sans-serif',
  };

  function offscreen(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  const glowSprites = new Map();
  // A soft round light of one colour, rendered once and reused by light(), particles and softShadow().
  function glowSprite(color) {
    let s = glowSprites.get(color);
    if (s) return s;
    s = offscreen(128, 128);
    const g = s.getContext('2d');
    const v = parseColor(color);
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    const stops = [[0, 1], [0.18, 0.75], [0.42, 0.32], [0.7, 0.09], [1, 0]];
    for (const st of stops) grad.addColorStop(st[0], rgba(v[0], v[1], v[2], st[1]));
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    glowSprites.set(color, s);
    return s;
  }

  const fontCache = new Map();
  function font(size, weight, family) {
    const key = size + '|' + weight + '|' + family;
    let f = fontCache.get(key);
    if (!f) {
      f = `${weight} ${size}px ${FONT_STACKS[family] || family}`;
      fontCache.set(key, f);
    }
    return f;
  }

  const skyCache = new WeakMap();
  const sprites = new Map();
  let vignetteCache = null;
  const noiseCache = new Map();
  const rayGrads = new Map();
  const grainPatterns = new WeakMap();
  let grainTex = null;
  function grainTexture() {
    if (grainTex) return grainTex;
    grainTex = offscreen(160, 160);
    const g = grainTex.getContext('2d'), img = g.createImageData(160, 160), r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = r.next() * 2 - 1, v = n > 0 ? 255 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = Math.abs(n) * 255;
    }
    g.putImageData(img, 0, 0);
    return grainTex;
  }

  const gfx = {
    dpr: Math.min(2, window.devicePixelRatio || 1),
    fonts: FONT_STACKS,
    offscreen,

    roundRect(ctx, x, y, w, h, r) {
      r = Math.max(0, Math.min(r, w / 2, h / 2));
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      return ctx;
    },

    // Real canvas glow (shadowBlur). Costly on big shapes: prefer light() for many small glows.
    glow(ctx, color, blur, fn) {
      const pc = ctx.shadowColor, pb = ctx.shadowBlur;
      ctx.shadowColor = color;
      ctx.shadowBlur = blur;
      fn(ctx);
      ctx.shadowColor = pc;
      ctx.shadowBlur = pb;
    },

    // Additive soft light: one cached sprite per colour, so hundreds per frame stay cheap.
    light(ctx, x, y, r, color, a) {
      if (r <= 0) return;
      const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
      ctx.globalAlpha = a === undefined ? 1 : a;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
      ctx.globalAlpha = pa;
      ctx.globalCompositeOperation = pc;
    },

    softShadow(ctx, x, y, rx, ry, a) {
      const pa = ctx.globalAlpha;
      ctx.globalAlpha = a === undefined ? 0.35 : a;
      ctx.drawImage(glowSprite('#000'), x - rx, y - ry, rx * 2, ry * 2);
      ctx.globalAlpha = pa;
    },

    // Fill the whole canvas with a vertical gradient. Pass the same stops array each frame: the gradient
    // is cached on it. stops: ['#top', '#mid', '#bottom'] or [[0, '#top'], [0.7, '#mid'], [1, '#bottom']].
    // It is rendered once into a 1 px wide strip and stretched: a blit costs far less than a gradient fill.
    sky(ctx, stops, h0, h1) {
      const W = ctx.canvas.width, H = ctx.canvas.height;
      let c = skyCache.get(stops);
      if (!c || c.H !== H || c.h0 !== h0 || c.h1 !== h1) {
        const strip = offscreen(1, H), g = strip.getContext('2d');
        const grad = g.createLinearGradient(0, (h0 || 0) * H, 0, (h1 === undefined ? 1 : h1) * H);
        stops.forEach((s, i) => (Array.isArray(s) ? grad.addColorStop(s[0], s[1]) : grad.addColorStop(stops.length > 1 ? i / (stops.length - 1) : 0, s)));
        g.fillStyle = grad;
        g.fillRect(0, 0, 1, H);
        c = { H, h0, h1, strip };
        skyCache.set(stops, c);
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(c.strip, 0, 0, 1, H, 0, 0, W, H);
      ctx.restore();
    },

    // Darkened edges over the whole canvas, cached per size.
    vignette(ctx, strength, color) {
      const W = ctx.canvas.width, H = ctx.canvas.height;
      strength = strength === undefined ? 0.5 : strength;
      color = color || '#000';
      const v = vignetteCache;
      if (!v || v.W !== W || v.H !== H || v.s !== strength || v.c !== color) {
        const c = offscreen(W, H), g = c.getContext('2d');
        const col = parseColor(color);
        const grad = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.hypot(W, H) * 0.56);
        grad.addColorStop(0, rgba(col[0], col[1], col[2], 0));
        grad.addColorStop(0.6, rgba(col[0], col[1], col[2], strength * 0.35));
        grad.addColorStop(1, rgba(col[0], col[1], col[2], strength));
        g.fillStyle = grad;
        g.fillRect(0, 0, W, H);
        vignetteCache = { W, H, s: strength, c: color, canvas: c };
      }
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(vignetteCache.canvas, 0, 0);
      ctx.restore();
    },

    // Seeded value-noise texture on an offscreen canvas (cached by its options). Tiles seamlessly.
    noiseTexture(w, h, o) {
      o = o || {};
      const key = [w, h, o.seed || 1, o.alpha || 0.08, o.color || '#fff', o.scale || 1, !!o.mono].join('|');
      let c = noiseCache.get(key);
      if (c) return c;
      c = offscreen(w, h);
      const g = c.getContext('2d');
      const img = g.createImageData(c.width, c.height);
      const r = rng(o.seed || 1), col = parseColor(o.color || '#fff'), a = (o.alpha === undefined ? 0.08 : o.alpha) * 255;
      const sc = Math.max(1, o.scale || 1) | 0;
      const cw = Math.ceil(c.width / sc), ch = Math.ceil(c.height / sc);
      const cells = new Float32Array(cw * ch);
      for (let i = 0; i < cells.length; i++) cells[i] = r.next();
      for (let y = 0; y < c.height; y++) {
        for (let x = 0; x < c.width; x++) {
          const n = cells[((y / sc) | 0) * cw + ((x / sc) | 0)];
          const i = (y * c.width + x) * 4;
          if (o.mono === false) { img.data[i] = col[0] * n; img.data[i + 1] = col[1] * n; img.data[i + 2] = col[2] * n; img.data[i + 3] = a; }
          else { img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = a * n; }
        }
      }
      g.putImageData(img, 0, 0);
      noiseCache.set(key, c);
      return c;
    },

    // Film grain over the whole canvas; `t` (seconds) jitters it so it shimmers instead of sitting still.
    // Light and dark specks blended normally: an 'overlay' blend looks alike but costs several times more.
    grain(ctx, amount, t) {
      let pattern = grainPatterns.get(ctx);
      if (!pattern) {
        pattern = ctx.createPattern(grainTexture(), 'repeat');
        grainPatterns.set(ctx, pattern);
      }
      const ox = ((t || 0) * 997) % 160 | 0, oy = ((t || 0) * 613) % 160 | 0;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, -ox, -oy);
      ctx.globalAlpha = amount === undefined ? 0.05 : amount;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = pattern;
      ctx.fillRect(ox, oy, ctx.canvas.width, ctx.canvas.height);
      ctx.restore();
    },

    // Draw once, blit forever: an offscreen canvas of w x h CSS px at the current DPR, cached by key.
    // drawFn(g, w, h) paints in CSS px. The result carries .w and .h; draw it with blit() or drawImage.
    sprite(key, w, h, drawFn) {
      let s = sprites.get(key);
      if (s && s.dpr === gfx.dpr && s.w === w && s.h === h) return s;
      s = offscreen(w * gfx.dpr, h * gfx.dpr);
      s.w = w; s.h = h; s.dpr = gfx.dpr;
      const g = s.getContext('2d');
      g.scale(gfx.dpr, gfx.dpr);
      drawFn(g, w, h);
      sprites.set(key, s);
      return s;
    },
    clearSprites(prefix) {
      for (const k of Array.from(sprites.keys())) if (prefix === undefined || String(k).indexOf(prefix) === 0) sprites.delete(k);
    },

    // Centered draw of a sprite (or any canvas/image) with optional scale, rotation and alpha.
    blit(ctx, s, x, y, scale, rot, a) {
      const w = (s.w || s.width) * (scale === undefined ? 1 : scale), h = (s.h || s.height) * (scale === undefined ? 1 : scale);
      const pa = ctx.globalAlpha;
      if (a !== undefined) ctx.globalAlpha = pa * a;
      if (rot) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.drawImage(s, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else ctx.drawImage(s, x - w / 2, y - h / 2, w, h);
      ctx.globalAlpha = pa;
    },

    text(ctx, str, x, y, o) {
      o = o || {};
      ctx.font = font(o.size || 16, o.weight || 700, o.font || 'display');
      ctx.textAlign = o.align || 'center';
      ctx.textBaseline = o.baseline || 'middle';
      const pa = ctx.globalAlpha;
      if (o.alpha !== undefined) ctx.globalAlpha = pa * o.alpha;
      if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = o.shadowBlur === undefined ? 12 : o.shadowBlur; }
      worldText = !!o.world;
      if (o.stroke) {
        ctx.lineJoin = 'round';
        ctx.lineWidth = o.strokeWidth || Math.max(2, (o.size || 16) / 7);
        ctx.strokeStyle = o.stroke;
        ctx.strokeText(str, x, y);
        ctx.shadowBlur = 0;
      }
      ctx.fillStyle = o.color || '#fff';
      ctx.fillText(str, x, y);
      worldText = false;
      if (o.shadow) ctx.shadowBlur = 0;
      ctx.globalAlpha = pa;
    },

    // God rays fanning out from (x, y). Gradient cached per colour/length; `t` sways them slowly.
    lightRays(ctx, x, y, o) {
      o = o || {};
      const n = o.count || 6, len = o.length || 500, spread = o.spread === undefined ? 1 : o.spread;
      const base = o.angle === undefined ? Math.PI / 2 : o.angle, width = o.width || 0.07, t = o.t || 0;
      const color = o.color || '#fff', key = color + '|' + len;
      let grad = rayGrads.get(key);
      if (!grad) {
        const v = parseColor(color);
        grad = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
        grad.addColorStop(0, rgba(v[0], v[1], v[2], 1));
        grad.addColorStop(0.35, rgba(v[0], v[1], v[2], 0.45));
        grad.addColorStop(1, rgba(v[0], v[1], v[2], 0));
        rayGrads.set(key, grad);
      }
      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = grad;
      for (let i = 0; i < n; i++) {
        const k = n > 1 ? i / (n - 1) - 0.5 : 0;
        const a = base + k * spread + Math.sin(t * 0.3 + i * 1.7) * 0.05;
        const w = width * (0.6 + 0.4 * Math.sin(i * 2.3 + t * 0.5) ** 2);
        ctx.globalAlpha = (o.alpha === undefined ? 0.12 : o.alpha) * (0.55 + 0.45 * Math.sin(t * 0.7 + i * 2.1) ** 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a - w) * len, Math.sin(a - w) * len);
        ctx.lineTo(Math.cos(a + w) * len, Math.sin(a + w) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },

    // Twinkling stars in a few depth layers, positions generated once from a seed.
    // draw(ctx, w, h, t, ox, oy): ox/oy scroll the field (deeper layers move less).
    starfield(o) {
      o = o || {};
      const r = rng(o.seed || 3), n = o.count || 120, layers = o.layers || 3;
      const color = o.color || '#ffffff';
      const sizeMin = o.size ? o.size[0] : 0.6, sizeMax = o.size ? o.size[1] : 1.8;
      const stars = [];
      for (let i = 0; i < n; i++) {
        const layer = i % layers;
        stars.push({ x: r.next(), y: r.next(), d: (layer + 1) / layers, s: lerp(sizeMin, sizeMax, r.next() ** 3), ph: r.next() * TAU, sp: 0.6 + r.next() * 2.2 });
      }
      return {
        stars,
        draw(ctx, w, h, t, ox, oy) {
          ox = ox || 0; oy = oy || 0; t = t || 0;
          const tw = o.twinkle === undefined ? 1 : o.twinkle;
          ctx.fillStyle = color;
          const pa = ctx.globalAlpha;
          for (let i = 0; i < stars.length; i++) {
            const s = stars[i];
            const x = wrap(s.x * w - ox * s.d * 0.3, 0, w), y = wrap(s.y * h - oy * s.d * 0.3, 0, h);
            const a = (0.35 + 0.65 * s.d) * (1 - tw * 0.5 + tw * 0.5 * Math.sin(t * s.sp + s.ph));
            ctx.globalAlpha = pa * a;
            if (s.s > 1.4) { gfx.light(ctx, x, y, s.s * 5, color, a * 0.5); ctx.globalAlpha = pa * a; }
            ctx.fillRect(x - s.s / 2, y - s.s / 2, s.s, s.s);
          }
          ctx.globalAlpha = pa;
        },
      };
    },

    // Parallax layers, each painted once into a tile and scrolled at its own depth.
    // defs: [{ depth, paint(g, w, h), axis: 'x'|'y', tile: px along the axis (default view size), alpha }]
    // Only the painted part of a tile is drawn (hills fill the bottom of an x layer, walls the sides of a
    // y layer), so stacking several layers costs far less fill rate than full-screen images would.
    layers(defs) {
      const L = defs.map(d => Object.assign({ depth: 0.5, axis: 'x' }, d, { canvas: null, w: 0, h: 0, dpr: 0, spans: null }));
      function ready(l, w, h) {
        const tw = l.axis === 'x' ? (l.tile || w) : w, th = l.axis === 'y' ? (l.tile || h) : h;
        if (l.canvas && l.w === tw && l.h === th && l.dpr === gfx.dpr) return;
        l.w = tw; l.h = th; l.dpr = gfx.dpr;
        l.canvas = offscreen(tw * gfx.dpr, th * gfx.dpr);
        const g = l.canvas.getContext('2d');
        g.scale(gfx.dpr, gfx.dpr);
        l.paint(g, tw, th);
        l.spans = paintedSpans(g, l.canvas.width, l.canvas.height, l.axis === 'x');
      }
      // Runs of device pixels across the scroll axis (rows for x layers, columns for y layers) that hold paint.
      function paintedSpans(g, W, H, rows) {
        const n = rows ? H : W;
        let data;
        try { data = g.getImageData(0, 0, W, H).data; } catch (e) { return [[0, n]]; }
        const used = new Uint8Array(n);
        for (let y = 0, i = 3; y < H; y++) {
          for (let x = 0; x < W; x++, i += 4) if (data[i]) used[rows ? y : x] = 1;
        }
        const out = [];
        for (let i = 0; i < n; i++) {
          if (!used[i]) continue;
          const last = out[out.length - 1];
          // Bridge small gaps: one more draw call costs more than a few empty pixels.
          if (last && i - last[1] < 24) last[1] = i + 1; else out.push([i, i + 1]);
        }
        return out;
      }
      return {
        layers: L,
        invalidate() { for (const l of L) l.canvas = null; },
        draw(ctx, w, h, sx, sy) {
          sx = sx || 0; sy = sy || 0;
          const pa = ctx.globalAlpha;
          for (const l of L) {
            ready(l, w, h);
            if (l.alpha !== undefined) ctx.globalAlpha = pa * l.alpha;
            // Tiles land on whole device pixels and keep their exact pixel size, so the seams never show.
            const c = l.canvas, d = l.dpr, dw = c.width / d, dh = c.height / d;
            if (l.axis === 'x') {
              const off = Math.round(-wrap(sx * l.depth, 0, l.w) * d) / d;
              for (let x = off; x < w; x += l.w) for (const s of l.spans) ctx.drawImage(c, 0, s[0], c.width, s[1] - s[0], x, s[0] / d, dw, (s[1] - s[0]) / d);
            } else {
              const off = Math.round(-wrap(sy * l.depth, 0, l.h) * d) / d;
              for (let y = off; y < h; y += l.h) for (const s of l.spans) ctx.drawImage(c, s[0], 0, s[1] - s[0], c.height, s[0] / d, y, (s[1] - s[0]) / d, dh);
            }
            ctx.globalAlpha = pa;
          }
        },
      };
    },

    // Paint a seamless silhouette (hills, dunes, a city's roofline) into a layer tile.
    // o: { color, side, base (0..1), amp (0..1), rough (0..1), seed, points }. side is the edge the mass
    // grows from: 'bottom' (default, hills) or 'top' for an x layer, 'left' or 'right' (cave or canyon walls)
    // for a y layer. base is where the silhouette sits and amp its height, as fractions across the tile
    // measured from the open side: base 0.8 fills the 20% nearest that side, plus the peaks.
    ridge(g, w, h, o) {
      o = o || {};
      const side = o.side || 'bottom';
      if (side !== 'bottom') {
        g.save();
        // Paint a bottom ridge in a turned frame: along = the edge's length, across = the tile's depth.
        if (side === 'top') g.transform(1, 0, 0, -1, 0, h);
        else if (side === 'left') g.transform(0, 1, -1, 0, w, 0);
        else g.transform(0, 1, 1, 0, 0, 0);
        const turned = side === 'top' ? [w, h] : [h, w];
        gfx.ridge(g, turned[0], turned[1], Object.assign({}, o, { side: 'bottom' }));
        g.restore();
        return;
      }
      const r = rng(o.seed || 1), n = o.points || 64, rough = o.rough === undefined ? 0.55 : o.rough;
      const pts = new Float32Array(n + 1);
      // Midpoint displacement on a loop: first and last points match, so the tile wraps cleanly.
      let step = n, amp = 1;
      pts[0] = pts[n] = 0;
      while (step > 1) {
        const half = step >> 1;
        for (let i = half; i < n; i += step) pts[i] = (pts[i - half] + pts[Math.min(n, i + half)]) / 2 + (r.next() * 2 - 1) * amp;
        amp *= rough;
        step = half;
      }
      let mn = Infinity, mx = -Infinity;
      for (let i = 0; i <= n; i++) { mn = Math.min(mn, pts[i]); mx = Math.max(mx, pts[i]); }
      const base = (o.base === undefined ? 0.6 : o.base) * h, a = (o.amp === undefined ? 0.15 : o.amp) * h;
      g.fillStyle = o.color || '#000';
      g.beginPath();
      g.moveTo(0, h);
      for (let i = 0; i <= n; i++) g.lineTo((i / n) * w, base - ((pts[i] - mn) / (mx - mn || 1)) * a);
      g.lineTo(w, h);
      g.closePath();
      g.fill();
    },

    hsl, mix, shade, alpha, css, rgba, parse: parseColor,
  };

  /* ---------------------------------------------------------------- view */

  const views = [];
  function view(canvas, o) {
    o = o || {};
    const maxDpr = o.maxDpr || 2, maxPixels = o.maxPixels || 3.4e6;
    if (o.fill !== false) {
      canvas.style.display = 'block';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
    }
    if (!canvas.style.touchAction) canvas.style.touchAction = 'none';
    const ctx = canvas.getContext('2d', { alpha: o.alpha !== false });
    const fns = [];
    const v = {
      canvas, ctx, w: 1, h: 1, dpr: 1,
      onResize(fn) { fns.push(fn); return v; },
      resize,
      // Reset the transform to CSS px and clear (or fill) the canvas.
      clear(color) {
        ctx.setTransform(v.dpr, 0, 0, v.dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        if (color) { ctx.fillStyle = color; ctx.fillRect(0, 0, v.w, v.h); } else ctx.clearRect(0, 0, v.w, v.h);
      },
    };
    function resize() {
      const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      let dpr = Math.min(maxDpr, window.devicePixelRatio || 1);
      // Huge canvases (tablets, desktops) get a lower DPR so fill rate stays inside the frame budget; 3.4 MP
      // keeps a 1280x800 window at 0.9x sharpness or better.
      if (w * h * dpr * dpr > maxPixels) dpr = Math.max(1, Math.sqrt(maxPixels / (w * h)));
      const W = Math.round(w * dpr), H = Math.round(h * dpr);
      if (w === v.w && h === v.h && canvas.width === W && canvas.height === H) return;
      v.w = w; v.h = h; v.dpr = dpr;
      gfx.dpr = dpr;
      canvas.width = W; canvas.height = H;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cam.view === v) cam.resize(w, h);
      for (const fn of fns) fn(v);
    }
    if (!cam.view) cam.view = v;
    views.push(v);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
    window.addEventListener('resize', resize);
    resize();
    return v;
  }

  /* ---------------------------------------------------------------- camera */

  function camera(o) {
    o = o || {};
    const c = {
      x: o.x || 0, y: o.y || 0, zoom: o.zoom || 1, rot: 0,
      w: 1, h: 1, view: null,
      target: null, rate: 8, offsetX: 0, offsetY: 0,
      bounds: o.bounds || null, // { minX, minY, maxX, maxY } in world units
      shake: o.shake !== false,  // include Kit.fx.shake() in apply()
      resize(w, h) { c.w = w; c.h = h; },
      follow(target, rate) { c.target = target; if (rate !== undefined) c.rate = rate; return c; },
      snap() { if (c.target) { c.x = c.target.x + c.offsetX; c.y = c.target.y + c.offsetY; } clampBounds(); },
      update(dt) {
        if (c.target) {
          c.x = smooth(c.x, c.target.x + c.offsetX, c.rate, dt);
          c.y = smooth(c.y, c.target.y + c.offsetY, c.rate, dt);
        }
        clampBounds();
      },
      // World -> screen transform (center of the view looks at x, y). Pair with restore(ctx).
      apply(ctx) {
        ctx.save();
        const sx = c.shake ? fx.shakeX : 0, sy = c.shake ? fx.shakeY : 0, sr = c.shake ? fx.shakeRot : 0;
        ctx.translate(c.w / 2 + sx, c.h / 2 + sy);
        if (c.rot + sr) ctx.rotate(c.rot + sr);
        ctx.scale(c.zoom, c.zoom);
        ctx.translate(-c.x, -c.y);
      },
      restore(ctx) { ctx.restore(); },
      toWorld(sx, sy, out) {
        out = out || {};
        const dx = (sx - c.w / 2) / c.zoom, dy = (sy - c.h / 2) / c.zoom;
        const cs = Math.cos(-c.rot), sn = Math.sin(-c.rot);
        out.x = c.x + dx * cs - dy * sn;
        out.y = c.y + dx * sn + dy * cs;
        return out;
      },
      toScreen(wx, wy, out) {
        out = out || {};
        const dx = (wx - c.x) * c.zoom, dy = (wy - c.y) * c.zoom;
        const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
        out.x = c.w / 2 + dx * cs - dy * sn;
        out.y = c.h / 2 + dx * sn + dy * cs;
        return out;
      },
      // Cheap culling: is a circle at (x, y) with radius r on screen?
      visible(x, y, r) {
        const hw = c.w / 2 / c.zoom + r, hh = c.h / 2 / c.zoom + r;
        return Math.abs(x - c.x) <= hw * 1.42 && Math.abs(y - c.y) <= hh * 1.42;
      },
    };
    function clampBounds() {
      const b = c.bounds;
      if (!b) return;
      const hw = c.w / 2 / c.zoom, hh = c.h / 2 / c.zoom;
      c.x = b.maxX - b.minX < hw * 2 ? (b.minX + b.maxX) / 2 : clamp(c.x, b.minX + hw, b.maxX - hw);
      c.y = b.maxY - b.minY < hh * 2 ? (b.minY + b.maxY) / 2 : clamp(c.y, b.minY + hh, b.maxY - hh);
    }
    return c;
  }
  const cam = camera();

  /* ---------------------------------------------------------------- fx: particles, shake, flash, floats */

  const fxRand = rng(12345);
  const rv = v => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * fxRand.next() : v);
  const pickColor = c => (Array.isArray(c) ? c[(fxRand.next() * c.length) | 0] : c);
  const STAR = [];
  for (let i = 0; i < 10; i++) STAR.push([Math.cos((i / 10) * TAU - Math.PI / 2) * (i % 2 ? 0.45 : 1), Math.sin((i / 10) * TAU - Math.PI / 2) * (i % 2 ? 0.45 : 1)]);

  const CAP = 1600;
  const parts = [];
  for (let i = 0; i < CAP; i++) parts.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 1, size1: 0, color: '#fff', shape: 'circle', rot: 0, spin: 0, grav: 0, drag: 0, add: false, fade: true, text: '' });
  let partN = 0, partRing = 0;
  const floats = [];
  for (let i = 0; i < 48; i++) floats.push({ on: false, text: '', x: 0, y: 0, t: 0, max: 1, size: 20, color: '#fff', stroke: '', font: 'display', rise: 40 });
  const waves = [];
  for (let i = 0; i < 24; i++) waves.push({ on: false, x: 0, y: 0, r0: 0, r1: 1, t: 0, max: 1, color: '#fff', width: 3, add: true });
  const emitters = [];
  let shakeAmp = 0, shakeT = 0, shakeMax = 1, shakeTime = 0;
  let flashColor = '#fff', flashT = 0, flashMax = 1, flashA = 0;

  function spawn(x, y, o, ang, speed) {
    let p;
    if (partN < CAP) p = parts[partN++];
    else { p = parts[partRing]; partRing = (partRing + 1) % CAP; }
    p.x = x; p.y = y;
    p.vx = Math.cos(ang) * speed; p.vy = Math.sin(ang) * speed;
    p.max = p.life = Math.max(0.016, rv(o.life === undefined ? [0.4, 0.9] : o.life));
    p.size = rv(o.size === undefined ? [2, 5] : o.size);
    p.size1 = o.sizeEnd === undefined ? 0 : p.size * o.sizeEnd;
    p.color = pickColor(o.color || '#fff');
    p.shape = o.shape || 'circle';
    p.rot = rv(o.rot === undefined ? [0, TAU] : o.rot);
    p.spin = rv(o.spin || 0);
    p.grav = o.gravity || 0;
    p.drag = o.drag === undefined ? 1.5 : o.drag;
    p.add = !!o.glow;
    p.fade = o.fade !== false;
    p.text = o.text || '';
    return p;
  }
  const scaleCount = n => Math.max(1, Math.round(n * (fx.reduced ? 0.45 : 1)));

  const fx = {
    reduced: !!(motionQuery && motionQuery.matches),
    shakeX: 0, shakeY: 0, shakeRot: 0,
    get count() { return partN; },
    seed(n) { fxRand.reset(n); },

    // o: { count, speed, angle, spread, life, size, sizeEnd (ratio), color (or array), shape:
    //      'circle'|'spark'|'square'|'star'|'ring'|'glow'|'text', text, gravity, drag, spin, glow (additive) }
    burst(x, y, o) {
      o = o || {};
      const n = scaleCount(o.count || 16), base = o.angle || 0, spread = o.spread === undefined ? TAU : o.spread;
      for (let i = 0; i < n; i++) spawn(x, y, o, base + (fxRand.next() - 0.5) * spread, rv(o.speed === undefined ? [60, 220] : o.speed));
    },

    // Continuous emitter. o.rate per second, o.duration ms (0 = until stop()), o.follow = object with x, y.
    fountain(x, y, o) {
      o = Object.assign({ rate: 30, angle: -Math.PI / 2, spread: 0.6, duration: 0 }, o);
      const e = { x, y, o, acc: 0, t: 0, alive: true, follow: o.follow || null, spacing: 0, lx: x, ly: y };
      e.stop = () => { e.alive = false; };
      e.move = (nx, ny) => { e.x = nx; e.y = ny; };
      emitters.push(e);
      return e;
    },

    // Particles left behind a moving object, spaced by distance travelled (o.spacing px), not by time.
    trail(target, o) {
      o = Object.assign({ spacing: 6, speed: [0, 20], life: [0.25, 0.5], size: [2, 4], spread: TAU }, o);
      const e = fx.fountain(target.x, target.y, Object.assign({}, o, { rate: 0, follow: target }));
      e.spacing = o.spacing;
      e.lx = target.x; e.ly = target.y;
      return e;
    },

    shake(amount, ms) {
      if (fx.reduced) return;
      shakeAmp = Math.max(shakeAmp * (shakeT / shakeMax || 0), amount || 6);
      shakeMax = shakeT = Math.max(0.05, (ms || 250) / 1000);
    },

    flash(color, ms, a) {
      flashColor = color || '#fff';
      flashMax = flashT = Math.max(0.03, (ms || 120) / 1000);
      flashA = (a === undefined ? 0.6 : a) * (fx.reduced ? 0.4 : 1);
    },

    // Floating text that pops in and rises. style: { color, size, stroke, font, rise, ms }
    float(text, x, y, s) {
      if (A.keyart) return;
      s = s || {};
      let f = null;
      for (const c of floats) if (!c.on) { f = c; break; }
      if (!f) { f = floats[0]; for (const c of floats) if (c.t > f.t) f = c; }
      f.on = true; f.text = String(text); f.x = x; f.y = y; f.t = 0;
      f.max = (s.ms || 900) / 1000; f.size = s.size || 20; f.color = s.color || '#fff';
      f.stroke = s.stroke === undefined ? 'rgba(0,0,0,0.55)' : s.stroke; f.font = s.font || 'display';
      f.rise = s.rise === undefined ? 42 : s.rise; f.weight = s.weight || 800;
    },

    // Expanding ring. o: { radius, from, ms, color, width, glow }
    shockwave(x, y, o) {
      o = o || {};
      let w = null;
      for (const c of waves) if (!c.on) { w = c; break; }
      if (!w) w = waves[0];
      w.on = true; w.x = x; w.y = y; w.t = 0;
      w.r0 = o.from || 4; w.r1 = o.radius || 90; w.max = (o.ms || 450) / 1000;
      w.color = o.color || '#fff'; w.width = o.width || 4; w.add = o.glow !== false;
    },

    clear() {
      partN = 0;
      for (const f of floats) f.on = false;
      for (const w of waves) w.on = false;
      emitters.length = 0;
      shakeT = flashT = 0;
      fx.shakeX = fx.shakeY = fx.shakeRot = 0;
    },

    update(dt) {
      for (let i = 0; i < emitters.length; i++) {
        const e = emitters[i];
        if (e.follow) { e.x = e.follow.x; e.y = e.follow.y; }
        e.t += dt;
        if (e.o.duration && e.t * 1000 >= e.o.duration) e.alive = false;
        if (!e.alive) { emitters.splice(i, 1); i--; continue; }
        if (e.spacing) {
          const d = dist(e.lx, e.ly, e.x, e.y);
          if (d > 400) { e.lx = e.x; e.ly = e.y; continue; } // teleported: do not draw a line of dust across
          const n = Math.floor(d / e.spacing);
          for (let k = 1; k <= n; k++) {
            const t = (k * e.spacing) / d;
            spawn(lerp(e.lx, e.x, t), lerp(e.ly, e.y, t), e.o, e.o.angle + (fxRand.next() - 0.5) * e.o.spread, rv(e.o.speed));
          }
          if (n) { const t = (n * e.spacing) / d; e.lx = lerp(e.lx, e.x, t); e.ly = lerp(e.ly, e.y, t); }
        } else {
          e.acc += dt * e.o.rate * (fx.reduced ? 0.45 : 1);
          while (e.acc >= 1) {
            e.acc -= 1;
            const ox = e.o.area ? (fxRand.next() - 0.5) * e.o.area : 0;
            const oy = e.o.areaY ? (fxRand.next() - 0.5) * e.o.areaY : 0;
            spawn(e.x + ox, e.y + oy, e.o, e.o.angle + (fxRand.next() - 0.5) * e.o.spread, rv(e.o.speed === undefined ? [40, 120] : e.o.speed));
          }
        }
      }
      for (let i = 0; i < partN; i++) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          partN--;
          if (i !== partN) { parts[i] = parts[partN]; parts[partN] = p; }
          i--;
          continue;
        }
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vy = p.vy * k + p.grav * dt;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.rot += p.spin * dt;
      }
      for (const f of floats) if (f.on && (f.t += dt) >= f.max) f.on = false;
      for (const w of waves) if (w.on && (w.t += dt) >= w.max) w.on = false;
      if (flashT > 0) flashT = Math.max(0, flashT - dt);
    },

    // Shake runs on real time so it keeps settling during hitstop.
    updateShake(dt) {
      shakeTime += dt;
      if (shakeT > 0) {
        shakeT = Math.max(0, shakeT - dt);
        const k = shakeT / shakeMax, a = shakeAmp * k * k;
        fx.shakeX = a * (Math.sin(shakeTime * 71) * 0.6 + Math.sin(shakeTime * 113) * 0.4);
        fx.shakeY = a * (Math.sin(shakeTime * 83 + 1.3) * 0.6 + Math.sin(shakeTime * 127 + 0.4) * 0.4);
        fx.shakeRot = a * 0.0016 * Math.sin(shakeTime * 59);
      } else fx.shakeX = fx.shakeY = fx.shakeRot = 0;
    },

    draw(ctx) {
      const pa = ctx.globalAlpha, pc = ctx.globalCompositeOperation;
      for (const w of waves) {
        if (!w.on) continue;
        const p = w.t / w.max, e = ease.cubicOut(p);
        ctx.globalCompositeOperation = w.add ? 'lighter' : 'source-over';
        ctx.globalAlpha = pa * (1 - p);
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.width * (1 - p * 0.7);
        ctx.beginPath();
        ctx.arc(w.x, w.y, w.r0 + (w.r1 - w.r0) * e, 0, TAU);
        ctx.stroke();
      }
      // Normal particles first, additive ones second, so the blend mode switches only once.
      for (let pass = 0; pass < 2; pass++) {
        const additive = pass === 1;
        ctx.globalCompositeOperation = additive ? 'lighter' : 'source-over';
        let lastColor = '';
        for (let i = 0; i < partN; i++) {
          const p = parts[i];
          if (p.add !== additive) continue;
          const t = 1 - p.life / p.max;
          const s = p.size + (p.size1 - p.size) * t;
          if (s <= 0.05) continue;
          ctx.globalAlpha = pa * (p.fade ? (t < 0.1 ? 1 : 1 - (t - 0.1) / 0.9) : 1);
          if (p.shape === 'glow') { ctx.drawImage(glowSprite(p.color), p.x - s, p.y - s, s * 2, s * 2); continue; }
          if (p.color !== lastColor) { ctx.fillStyle = ctx.strokeStyle = lastColor = p.color; }
          switch (p.shape) {
            case 'spark': {
              const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy) || 1, l = Math.min(s * 5, 2 + sp * 0.045);
              ctx.lineWidth = Math.max(1, s * 0.6);
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p.x - (p.vx / sp) * l, p.y - (p.vy / sp) * l);
              ctx.stroke();
              break;
            }
            case 'square': {
              const c = Math.cos(p.rot) * s * 0.7, n = Math.sin(p.rot) * s * 0.7;
              ctx.beginPath();
              ctx.moveTo(p.x + c - n, p.y + n + c);
              ctx.lineTo(p.x - c - n, p.y - n + c);
              ctx.lineTo(p.x - c + n, p.y - n - c);
              ctx.lineTo(p.x + c + n, p.y + n - c);
              ctx.fill();
              break;
            }
            case 'star': {
              const c = Math.cos(p.rot), n = Math.sin(p.rot);
              ctx.beginPath();
              for (let k = 0; k < 10; k++) {
                const px = STAR[k][0] * s, py = STAR[k][1] * s;
                const X = p.x + px * c - py * n, Y = p.y + px * n + py * c;
                if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
              }
              ctx.fill();
              break;
            }
            case 'ring':
              ctx.lineWidth = Math.max(1, s * 0.25);
              ctx.beginPath();
              ctx.arc(p.x, p.y, s, 0, TAU);
              ctx.stroke();
              break;
            case 'text':
              ctx.font = font(Math.round(s * 3), 800, 'display');
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              worldText = true;
              ctx.fillText(p.text, p.x, p.y);
              worldText = false;
              break;
            default:
              if (s < 1.6) ctx.fillRect(p.x - s, p.y - s, s * 2, s * 2);
              else { ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.fill(); }
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
      for (const f of floats) {
        if (!f.on) continue;
        const p = f.t / f.max;
        const pop = p < 0.18 ? ease.backOut(p / 0.18) : 1;
        ctx.globalAlpha = pa * (p > 0.65 ? 1 - (p - 0.65) / 0.35 : 1);
        gfx.text(ctx, f.text, f.x, f.y - f.rise * ease.cubicOut(p), {
          size: Math.max(1, Math.round(f.size * (0.6 + 0.4 * pop))), weight: f.weight, font: f.font, color: f.color,
          stroke: f.stroke || undefined,
        });
      }
      if (flashT > 0) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = flashA * (flashT / flashMax);
        ctx.fillStyle = flashColor;
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.restore();
      }
      ctx.globalAlpha = pa;
      ctx.globalCompositeOperation = pc;
    },
  };
  if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', () => { fx.reduced = motionQuery.matches; });

  /* ---------------------------------------------------------------- loop */

  const STEP = 1 / 60;
  const inputs = [];
  const loops = [];

  // Fixed 1/60 s updates, one draw per display frame. When paused or hidden no frame is requested,
  // so a paused game costs no CPU. Calls Arcade.ready() once its first frame is drawn (opt out: ready:false).
  // Each tick clears the pressed/released edges of o.input (one input or a list), or of every input when
  // it is not given: a page with two loops must give each its own inputs, or one would eat the other's edges.
  function loop(o) {
    o = o || {};
    const own = o.input ? [].concat(o.input) : inputs;
    let raf = 0, last = 0, acc = 0, stopMs = 0, readySent = o.ready === false;
    const L = {
      running: false, paused: false, timeScale: 1, time: 0, frame: 0, alpha: 0,
      autoPause: o.autoPause !== false,
      view: o.view || null,
      start() {
        L.running = true;
        L.paused = false;
        last = 0;
        L.render();
        if (!readySent) { readySent = true; setTimeout(() => A.ready(), 0); }
        schedule();
        return L;
      },
      stop() { L.running = false; cancel(); return L; },
      pause() { if (!L.paused) { L.paused = true; cancel(); } return L; },
      resume() {
        if (!L.paused) return L;
        L.paused = false;
        last = 0;
        for (const i of own) i.flush();
        schedule();
        return L;
      },
      // Freeze updates for ms of real time (impact frames). Drawing and shake continue.
      hitstop(ms) { stopMs = Math.max(stopMs, ms || 0); return L; },
      // Advance n fixed steps right now and draw once: for tests, scenes and pre-warming effects.
      step(n) {
        for (let i = 0; i < (n === undefined ? 1 : n); i++) tick(STEP);
        L.render();
        return L;
      },
      render() {
        const ctx = o.ctx || (L.view && L.view.ctx);
        if (o.draw) o.draw(ctx, L.alpha);
      },
    };
    function schedule() { if (!raf && L.running && !L.paused && !document.hidden) raf = requestAnimationFrame(frame); }
    function cancel() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
    function tick(realDt) {
      const dt = STEP * L.timeScale;
      L.time += dt;
      L.frame++;
      if (o.update) o.update(dt);
      if (o.auto !== false) { fx.update(dt); tween.update(dt); cam.update(dt); }
      fx.updateShake(realDt);
      for (const i of own) i.flush();
    }
    function frame(now) {
      raf = 0;
      if (!L.running || L.paused || document.hidden) return;
      raf = requestAnimationFrame(frame);
      let dt = last ? (now - last) / 1000 : STEP;
      last = now;
      if (dt > 0.1) dt = 0.1; // after a stall, resume calmly instead of fast-forwarding
      if (stopMs > 0) {
        stopMs -= dt * 1000;
        fx.updateShake(dt);
      } else {
        acc += dt;
        let n = 0;
        while (acc >= STEP && n < 6) { tick(STEP); acc -= STEP; n++; }
        if (n === 6) acc = 0;
      }
      L.alpha = acc / STEP;
      L.render();
    }
    if (L.view) L.view.onResize(() => L.render());
    A.on('pause', () => { if (L.autoPause) L.pause(); });
    document.addEventListener('visibilitychange', () => { last = 0; schedule(); });
    loops.push(L);
    return L;
  }

  /* ---------------------------------------------------------------- input */

  let inputBlocked = false;
  const isField = t => !!(t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]'));
  const isButton = t => !!(t && t.closest && t.closest('button, a[href], [role="button"], [role="switch"]'));
  const GAME_KEYS = /^(Arrow|Space$| $)/;

  // Pointers (multi-touch) and keyboard for one element. Positions are CSS px inside el.
  function input(el, o) {
    o = o || {};
    el = el || document.body;
    const handlers = { down: [], move: [], up: [], tap: [], swipe: [], key: [] };
    const keys = new Set(), pressedSet = new Set(), releasedSet = new Set();
    const controls = [];
    const swipeDist = o.swipeDist || 32, swipeMs = o.swipeMs || 320, tapMs = o.tapMs || 280, tapSlop = o.tapSlop || 12;

    const I = {
      el, pointers: new Map(), pointer: null,
      on(type, fn) { (handlers[type] || (handlers[type] = [])).push(fn); return I; },
      onKey(fn) { return I.on('key', fn); },
      isDown(k) { return keys.has(norm(k)) || controls.some(c => c.key && norm(c.key) === norm(k) && c.down); },
      pressed(k) { return pressedSet.has(norm(k)) || controls.some(c => c.key && norm(c.key) === norm(k) && c.pressed); },
      released(k) { return releasedSet.has(norm(k)); },
      // -1, 0 or 1 from arrows and WASD.
      axisX() { return (I.isDown('ArrowRight') || I.isDown('d') ? 1 : 0) - (I.isDown('ArrowLeft') || I.isDown('a') ? 1 : 0); },
      axisY() { return (I.isDown('ArrowDown') || I.isDown('s') ? 1 : 0) - (I.isDown('ArrowUp') || I.isDown('w') ? 1 : 0); },
      flush() {
        pressedSet.clear(); releasedSet.clear();
        for (const c of controls) c.pressed = false;
      },
      reset() {
        keys.clear(); I.flush();
        for (const p of I.pointers.values()) if (p.owner) p.owner.release(p);
        I.pointers.clear(); I.pointer = null;
      },
      joystick(jo) { return addControl(makeJoystick(jo || {})); },
      button(bo) { return addControl(makeButton(bo || {})); },
      destroy() {
        el.removeEventListener('pointerdown', onDown);
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        const i = inputs.indexOf(I);
        if (i >= 0) inputs.splice(i, 1);
      },
    };
    function norm(k) { return typeof k === 'string' && k.length === 1 ? k.toLowerCase() : k; }
    function emit(type, a) { const list = handlers[type]; for (let i = 0; i < list.length; i++) list[i](a); }
    function addControl(c) { controls.push(c); return c; }
    function local(e, p) {
      const r = el.getBoundingClientRect ? el.getBoundingClientRect() : { left: 0, top: 0 };
      p.x = e.clientX - r.left;
      p.y = e.clientY - r.top;
    }
    function primary() {
      for (const p of I.pointers.values()) if (!p.owner) return p;
      return null;
    }

    function onDown(e) {
      if (inputBlocked || (e.pointerType === 'mouse' && e.button !== 0)) return;
      const p = { id: e.pointerId, type: e.pointerType, x: 0, y: 0, sx: 0, sy: 0, dx: 0, dy: 0, t0: performance.now(), owner: null, swiped: false, dir: '' };
      local(e, p);
      p.sx = p.x; p.sy = p.y;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* synthetic events cannot be captured */ }
      const w = el.clientWidth || window.innerWidth, h = el.clientHeight || window.innerHeight;
      for (const c of controls) if (c.claim(p, w, h)) { p.owner = c; break; }
      I.pointers.set(p.id, p);
      if (!p.owner) {
        if (!I.pointer) I.pointer = p;
        emit('down', p);
      }
    }
    function onMove(e) {
      const p = I.pointers.get(e.pointerId);
      if (!p) return;
      const px = p.x, py = p.y;
      local(e, p);
      p.dx = p.x - px; p.dy = p.y - py;
      if (p.owner) { p.owner.move(p); return; }
      if (inputBlocked) return;
      emit('move', p);
      if (!p.swiped && performance.now() - p.t0 <= swipeMs) {
        const ddx = p.x - p.sx, ddy = p.y - p.sy;
        if (ddx * ddx + ddy * ddy >= swipeDist * swipeDist) {
          p.swiped = true;
          p.dir = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up');
          emit('swipe', p);
        }
      }
    }
    function onUp(e) {
      const p = I.pointers.get(e.pointerId);
      if (!p) return;
      local(e, p);
      I.pointers.delete(p.id);
      if (I.pointer === p) I.pointer = primary();
      if (p.owner) { p.owner.release(p); return; }
      if (inputBlocked) return;
      emit('up', p);
      const moved = Math.hypot(p.x - p.sx, p.y - p.sy);
      if (e.type === 'pointerup' && !p.swiped && moved <= tapSlop && performance.now() - p.t0 <= tapMs) emit('tap', p);
    }
    function onKeyDown(e) {
      if (inputBlocked || isField(e.target)) return;
      if (isButton(e.target) && (e.key === 'Enter' || e.key === ' ')) return;
      const names = [e.code, norm(e.key)];
      if (GAME_KEYS.test(e.code) || GAME_KEYS.test(e.key)) e.preventDefault(); // no page scroll inside the hub frame
      for (const n of names) {
        if (!n) continue;
        if (!keys.has(n) && !e.repeat) pressedSet.add(n);
        keys.add(n);
      }
      emit('key', e);
    }
    function onKeyUp(e) {
      for (const n of [e.code, norm(e.key)]) {
        if (!n) continue;
        if (keys.delete(n)) releasedSet.add(n);
      }
    }

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', () => keys.clear());
    inputs.push(I);
    return I;
  }

  // Floating (or fixed) virtual stick. zone(x, y, w, h) decides which touches it owns.
  function makeJoystick(o) {
    const J = {
      active: false, x: 0, y: 0, mag: 0, ox: 0, oy: 0, px: 0, py: 0, id: null,
      radius: o.radius || 56, dead: o.deadzone === undefined ? 0.12 : o.deadzone,
      claim(p, w, h) {
        const zone = o.zone || ((x, y, W) => x < W / 2);
        if (J.active || !zone(p.x, p.y, w, h)) return false;
        const fixed = typeof o.fixed === 'function' ? o.fixed(w, h) : o.fixed;
        J.active = true; J.id = p.id;
        J.ox = fixed ? fixed.x : p.x; J.oy = fixed ? fixed.y : p.y;
        J.move(p);
        return true;
      },
      move(p) {
        let dx = p.x - J.ox, dy = p.y - J.oy;
        const d = Math.hypot(dx, dy), r = J.radius;
        if (d > r) { dx = (dx / d) * r; dy = (dy / d) * r; }
        J.px = J.ox + dx; J.py = J.oy + dy;
        const m = Math.min(1, d / r);
        J.mag = m < J.dead ? 0 : (m - J.dead) / (1 - J.dead);
        J.x = d ? (dx / Math.min(d, r)) * J.mag : 0;
        J.y = d ? (dy / Math.min(d, r)) * J.mag : 0;
      },
      release() { J.active = false; J.id = null; J.x = J.y = J.mag = 0; },
      // Default look; pass colours to match the game, or draw your own from ox/oy/px/py.
      draw(ctx, s) {
        s = s || {};
        if (!J.active && !o.fixed) return;
        const pa = ctx.globalAlpha;
        ctx.globalAlpha = pa * (J.active ? 1 : 0.5);
        ctx.fillStyle = s.base || 'rgba(255,255,255,0.12)';
        ctx.strokeStyle = s.ring || 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(J.ox, J.oy, J.radius, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = s.knob || 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(J.active ? J.px : J.ox, J.active ? J.py : J.oy, J.radius * 0.42, 0, TAU); ctx.fill();
        ctx.globalAlpha = pa;
      },
    };
    return J;
  }

  // On-screen button. place(w, h) -> { x, y, r } in CSS px; key: the keyboard key it stands in for.
  function makeButton(o) {
    const B = {
      down: false, pressed: false, key: o.key || null, x: 0, y: 0, r: 32, label: o.label || '', id: null,
      layout(w, h) { const pl = o.place ? o.place(w, h) : { x: w - 60, y: h - 60, r: 32 }; B.x = pl.x; B.y = pl.y; B.r = pl.r || 32; },
      claim(p, w, h) {
        B.layout(w, h);
        if (B.down || Math.hypot(p.x - B.x, p.y - B.y) > B.r * 1.25) return false; // a little slop for thumbs
        B.down = B.pressed = true; B.id = p.id;
        if (o.onPress) o.onPress();
        return true;
      },
      move() {},
      release() { B.down = false; B.id = null; },
      draw(ctx, s) {
        s = s || {};
        const v = views[0];
        if (v) B.layout(v.w, v.h);
        ctx.fillStyle = B.down ? (s.active || 'rgba(255,255,255,0.4)') : (s.fill || 'rgba(255,255,255,0.18)');
        ctx.beginPath(); ctx.arc(B.x, B.y, B.r * (B.down ? 0.94 : 1), 0, TAU); ctx.fill();
        if (B.label) gfx.text(ctx, B.label, B.x, B.y, { size: Math.round(B.r * 0.5), color: s.color || '#fff', font: s.font || 'body' });
      },
    };
    return B;
  }

  /* ---------------------------------------------------------------- audio */

  let soundOn = A.settings.sound !== false;
  const au = {
    ctx: null, master: null, sfxBus: null, musicIn: null, musicFilter: null, musicOut: null,
    verb: null, delay: null, delayIn: null, analyser: null, noise: null, voices: 0,
    vol: { music: 0.5, sfx: 0.8 }, held: false, duckLevel: 1,
  };
  const peakBuf = new Float32Array(2048);
  const lastPlayed = new Map();

  function impulse(c, seconds, decay) {
    const len = Math.floor(c.sampleRate * seconds);
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  // Graph: voices -> sfx/music buses -> master -> glue compressor -> limiter -> speakers.
  // Shared reverb and a tempo delay give the synth voices space without any sample files.
  function buildAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    let c;
    try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { return null; }
    au.ctx = c;
    const glue = c.createDynamicsCompressor();
    glue.threshold.value = -18; glue.knee.value = 12; glue.ratio.value = 3; glue.attack.value = 0.005; glue.release.value = 0.2;
    const limiter = c.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.001; limiter.release.value = 0.12;
    au.master = c.createGain();
    au.master.gain.value = soundOn ? 0.9 : 0;
    au.master.connect(glue); glue.connect(limiter); limiter.connect(c.destination);
    au.analyser = c.createAnalyser();
    au.analyser.fftSize = 2048;
    limiter.connect(au.analyser);

    au.sfxBus = c.createGain(); au.sfxBus.gain.value = au.vol.sfx; au.sfxBus.connect(au.master);
    au.musicIn = c.createGain();
    au.musicFilter = c.createBiquadFilter(); au.musicFilter.type = 'lowpass'; au.musicFilter.frequency.value = 20000; au.musicFilter.Q.value = 0.5;
    au.musicOut = c.createGain(); au.musicOut.gain.value = au.vol.music;
    au.musicIn.connect(au.musicFilter); au.musicFilter.connect(au.musicOut); au.musicOut.connect(au.master);

    au.verb = c.createConvolver();
    au.verb.buffer = impulse(c, 1.8, 2.6);
    const verbOut = c.createGain(); verbOut.gain.value = 0.5;
    au.verb.connect(verbOut); verbOut.connect(au.master);

    au.delayIn = c.createGain();
    au.delay = c.createDelay(1.5);
    au.delay.delayTime.value = 0.3;
    const fb = c.createGain(); fb.gain.value = 0.32;
    const tone = c.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 2600;
    au.delayIn.connect(au.delay); au.delay.connect(tone); tone.connect(fb); fb.connect(au.delay);
    tone.connect(au.musicFilter);

    const len = c.sampleRate;
    au.noise = c.createBuffer(1, len, c.sampleRate);
    const d = au.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return c;
  }

  function unlock() {
    if (!soundOn || document.hidden) return;
    const c = au.ctx || buildAudio();
    if (c && c.state === 'suspended') c.resume().then(seqKick, () => {});
    else seqKick();
  }
  ['pointerdown', 'keydown', 'touchend'].forEach(t => window.addEventListener(t, unlock, true));

  const live = () => !!(au.ctx && soundOn && au.ctx.state !== 'closed');
  function setLevels() {
    if (!au.ctx) return;
    const t = au.ctx.currentTime;
    au.master.gain.setTargetAtTime(soundOn ? 0.9 : 0, t, 0.015);
    au.sfxBus.gain.setTargetAtTime(au.held ? 0 : au.vol.sfx, t, 0.03);
    const m = au.vol.music * au.duckLevel * (au.held ? 0.4 : 1);
    au.musicOut.gain.setTargetAtTime(m, t, 0.08);
    const muffled = au.held || au.duckLevel < 0.7;
    au.musicFilter.frequency.setTargetAtTime(muffled ? 900 : 20000, t, 0.1);
  }
  A.on('settings', s => {
    soundOn = s.sound !== false;
    setLevels();
    if (soundOn) unlock();
  });
  A.on('pause', () => { if (au.ctx && au.ctx.state === 'running') au.ctx.suspend().catch(() => {}); });
  A.on('resume', () => { if (au.ctx && soundOn && !document.hidden) au.ctx.resume().then(seqKick, () => {}); });

  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  // 'A4' -> 440, 'C#5', 'Bb3'... or a MIDI number.
  function noteHz(n) {
    if (typeof n === 'number') return 440 * Math.pow(2, (n - 69) / 12);
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
    if (!m) return 440;
    const midi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12;
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  const semis = s => Math.pow(2, s / 12);

  // Attack-decay-sustain-release on an AudioParam. Starts and ends at zero, so voices never click.
  function adsr(param, t, peak, a, d, sus, end, r) {
    param.setValueAtTime(0, t);
    param.linearRampToValueAtTime(peak, t + a);
    const holdEnd = Math.max(end, t + a);
    let held = peak;
    if (d > 0 && sus < 1) {
      param.setTargetAtTime(peak * sus, t + a, d / 3);
      held = peak * sus + (peak - peak * sus) * Math.exp((-3 * (holdEnd - t - a)) / d);
    }
    param.setValueAtTime(held, holdEnd);
    param.linearRampToValueAtTime(0, holdEnd + r);
    return holdEnd + r;
  }

  function source(c, wave) {
    if (wave === 'noise') {
      const s = c.createBufferSource();
      s.buffer = au.noise;
      s.loop = true;
      s._offset = Math.random() * 0.9;
      return s;
    }
    const o = c.createOscillator();
    o.type = wave || 'square';
    return o;
  }

  // One synthesised voice from jsfxr-style params (see SFX_DOC in docs/KIT.md).
  function voice(p, o, when) {
    const c = au.ctx;
    const t = when + (p.at || 0);
    const pitch = semis((o.pitch || 0) + (p.jitter ? (Math.random() * 2 - 1) * p.jitter : 0));
    const a = Math.max(0.002, p.attack === undefined ? 0.003 : p.attack);
    const hold = p.hold === undefined ? 0.06 : p.hold;
    const r = Math.max(0.012, p.release === undefined ? 0.1 : p.release);
    const peak = (p.vol === undefined ? 0.3 : p.vol) * (o.vol === undefined ? 1 : o.vol);
    const out = c.createGain();
    const end = adsr(out.gain, t, peak, a, p.decay || 0, p.sustain === undefined ? 1 : p.sustain, t + a + hold, r);
    const src = source(c, p.wave);
    const f0 = (p.freq || 440) * pitch;
    let node = src;
    let filt = null;
    const ftype = p.filter || (p.wave === 'noise' ? 'lowpass' : null);
    if (ftype) {
      filt = c.createBiquadFilter();
      filt.type = ftype;
      const cut = (p.cut || (p.wave === 'noise' ? p.freq || 4000 : 4000)) * (p.wave === 'noise' ? pitch : 1);
      filt.frequency.setValueAtTime(cut, t);
      const cutTo = p.cutTo || (p.wave === 'noise' && p.to ? p.to * pitch : 0);
      if (cutTo) filt.frequency.exponentialRampToValueAtTime(Math.max(20, cutTo), t + (p.slide || a + hold + r * 0.6));
      filt.Q.value = p.q === undefined ? (ftype === 'bandpass' ? 1.2 : 0.8) : p.q;
      node.connect(filt);
      node = filt;
    }
    if (p.wave !== 'noise') {
      src.frequency.setValueAtTime(f0, t);
      if (p.arp && p.arp.length) {
        const st = p.arpStep || 0.06;
        for (let i = 0; i < p.arp.length; i++) src.frequency.setValueAtTime(f0 * semis(p.arp[i]), t + i * st);
      } else if (p.to) src.frequency.exponentialRampToValueAtTime(Math.max(20, p.to * pitch), t + (p.slide || a + hold + r * 0.6));
    }
    let lfo = null;
    if (p.vib) {
      lfo = c.createOscillator();
      lfo.frequency.value = p.vibRate || 7;
      const lg = c.createGain();
      lg.gain.value = p.wave === 'noise' ? (p.cut || p.freq || 2000) * (semis(p.vib) - 1) : f0 * (semis(p.vib) - 1);
      lfo.connect(lg);
      lg.connect(p.wave === 'noise' ? filt.frequency : src.frequency);
      lfo.start(t);
      lfo.stop(end + 0.02);
    }
    node.connect(out);
    let dest = au.sfxBus;
    if (o.pan || p.pan) {
      const pan = c.createStereoPanner();
      pan.pan.value = clamp(o.pan || p.pan, -1, 1);
      out.connect(pan);
      pan.connect(au.sfxBus);
      dest = pan;
    } else out.connect(dest);
    if (p.verb) { const s = c.createGain(); s.gain.value = p.verb; out.connect(s); s.connect(au.verb); }
    if (src._offset !== undefined) src.start(t, src._offset); else src.start(t);
    src.stop(end + 0.03);
    au.voices++;
    src.onended = () => { au.voices--; };
  }

  const P = {}; // presets: params object, array of layers, or (opts) => either
  function sfx(name, o) {
    o = o || {};
    if (!live()) return false;
    let p = typeof name === 'string' ? P[name] : name;
    if (typeof p === 'function') p = p(o);
    if (!p) return false;
    const now = au.ctx.currentTime;
    // The same sound twice within 30 ms only gets louder, never better: play it once.
    if (typeof name === 'string' && !o.force) {
      const lp = lastPlayed.get(name);
      if (lp !== undefined && now - lp < 0.03) return false;
      lastPlayed.set(name, now);
    }
    if (au.voices > 48 && !o.force) return false; // a pile-up costs CPU and is mud anyway
    const when = now + (o.delay || 0) / 1000 + 0.005;
    if (Array.isArray(p)) for (const l of p) voice(l, o, when);
    else voice(p, o, when);
    return true;
  }
  sfx.define = function (name, params) { P[name] = params; };
  sfx.list = () => Object.keys(P);
  sfx.combo = (n, o) => sfx('combo', Object.assign({ n }, o));

  const N = noteHz;
  Object.assign(P, {
    coin: [
      { wave: 'square', freq: N('B5'), arp: [0, 5], arpStep: 0.07, attack: 0.002, hold: 0.1, decay: 0.12, sustain: 0.4, release: 0.16, vol: 0.13, filter: 'lowpass', cut: 5200 },
      { wave: 'sine', freq: N('E7'), at: 0.07, attack: 0.002, hold: 0.02, release: 0.2, vol: 0.06 },
    ],
    pickup: [
      { wave: 'triangle', freq: N('E5'), to: N('E6'), slide: 0.09, attack: 0.003, hold: 0.06, release: 0.12, vol: 0.32, jitter: 0.3 },
      { wave: 'sine', freq: N('B6'), at: 0.05, hold: 0.02, release: 0.14, vol: 0.08 },
    ],
    jump: { wave: 'square', freq: 260, to: 620, slide: 0.13, attack: 0.004, hold: 0.07, release: 0.07, vol: 0.13, filter: 'lowpass', cut: 2800, jitter: 0.4 },
    land: [
      { wave: 'noise', freq: 900, to: 180, attack: 0.002, hold: 0.015, release: 0.09, vol: 0.32 },
      { wave: 'sine', freq: 130, to: 55, attack: 0.002, hold: 0.03, release: 0.1, vol: 0.4 },
    ],
    hit: [
      { wave: 'noise', freq: 2400, to: 500, filter: 'bandpass', q: 0.9, attack: 0.002, hold: 0.02, release: 0.09, vol: 0.45, jitter: 1 },
      { wave: 'square', freq: 210, to: 90, attack: 0.002, hold: 0.03, release: 0.08, vol: 0.14, filter: 'lowpass', cut: 1800 },
    ],
    hurt: [
      { wave: 'sawtooth', freq: 420, to: 140, slide: 0.26, attack: 0.004, hold: 0.12, release: 0.14, vol: 0.18, vib: 0.8, vibRate: 32, filter: 'lowpass', cut: 2200 },
      { wave: 'noise', freq: 1800, to: 400, attack: 0.002, hold: 0.03, release: 0.08, vol: 0.2 },
    ],
    explosion: [
      { wave: 'noise', freq: 2600, to: 90, attack: 0.003, hold: 0.08, decay: 0.3, sustain: 0.5, release: 0.55, vol: 0.6, verb: 0.25 },
      { wave: 'sine', freq: 95, to: 32, attack: 0.003, hold: 0.12, release: 0.4, vol: 0.55 },
    ],
    laser: { wave: 'square', freq: 1500, to: 280, slide: 0.16, attack: 0.002, hold: 0.09, release: 0.08, vol: 0.12, vib: 0.5, vibRate: 40, filter: 'lowpass', cut: 5000, jitter: 0.6 },
    shoot: [
      { wave: 'sawtooth', freq: 720, to: 170, slide: 0.1, attack: 0.002, hold: 0.04, release: 0.06, vol: 0.12, filter: 'lowpass', cut: 3400, jitter: 0.7 },
      { wave: 'noise', freq: 5000, to: 1200, attack: 0.001, hold: 0.015, release: 0.05, vol: 0.18 },
    ],
    powerup: { wave: 'square', freq: N('C5'), arp: [0, 4, 7, 12, 16, 19, 24], arpStep: 0.05, attack: 0.003, hold: 0.33, release: 0.18, vol: 0.12, vib: 0.15, vibRate: 9, filter: 'lowpass', cut: 4200, verb: 0.15 },
    levelup: [
      { wave: 'triangle', freq: N('C5'), arp: [0, 4, 7, 12], arpStep: 0.085, attack: 0.003, hold: 0.36, release: 0.3, vol: 0.3, verb: 0.2 },
      { wave: 'square', freq: N('C6'), arp: [0, 4, 7, 12], arpStep: 0.085, attack: 0.003, hold: 0.36, release: 0.3, vol: 0.06, filter: 'lowpass', cut: 3500 },
      { wave: 'sine', freq: N('G7'), at: 0.34, hold: 0.02, decay: 0.3, sustain: 0.2, release: 0.6, vol: 0.06, verb: 0.4 },
    ],
    click: [
      { wave: 'sine', freq: 1700, to: 1200, attack: 0.001, hold: 0.004, release: 0.035, vol: 0.14 },
      { wave: 'noise', freq: 7000, filter: 'highpass', cut: 5000, attack: 0.001, hold: 0.002, release: 0.02, vol: 0.06 },
    ],
    select: [
      { wave: 'triangle', freq: N('A5'), arp: [0, 7], arpStep: 0.055, attack: 0.002, hold: 0.07, release: 0.1, vol: 0.24 },
      { wave: 'sine', freq: N('E7'), at: 0.055, hold: 0.01, release: 0.1, vol: 0.05 },
    ],
    whoosh: { wave: 'noise', freq: 380, to: 2600, filter: 'bandpass', q: 1.6, attack: 0.12, hold: 0.06, release: 0.2, slide: 0.32, vol: 0.4, jitter: 2 },
    swish: { wave: 'noise', freq: 3200, to: 900, filter: 'bandpass', q: 1.2, attack: 0.015, hold: 0.04, release: 0.08, vol: 0.32, jitter: 2 },
    splash: [
      { wave: 'noise', freq: 4200, to: 500, attack: 0.004, hold: 0.06, decay: 0.2, sustain: 0.4, release: 0.3, vol: 0.4 },
      { wave: 'sine', freq: 500, to: 1500, slide: 0.06, at: 0.04, attack: 0.002, hold: 0.02, release: 0.04, vol: 0.12 },
      { wave: 'sine', freq: 700, to: 1900, slide: 0.05, at: 0.11, attack: 0.002, hold: 0.015, release: 0.04, vol: 0.09 },
    ],
    thud: [
      { wave: 'sine', freq: 120, to: 42, slide: 0.16, attack: 0.002, hold: 0.06, release: 0.14, vol: 0.6 },
      { wave: 'noise', freq: 420, attack: 0.001, hold: 0.02, release: 0.05, vol: 0.25 },
    ],
    bounce: [
      { wave: 'sine', freq: 200, to: 560, slide: 0.11, attack: 0.003, hold: 0.06, release: 0.07, vol: 0.3, jitter: 0.5 },
      { wave: 'triangle', freq: 400, to: 1120, slide: 0.11, attack: 0.003, hold: 0.05, release: 0.06, vol: 0.08 },
    ],
    bell: [
      { wave: 'sine', freq: N('E6'), attack: 0.002, hold: 0, decay: 0.9, sustain: 0.001, release: 1.1, vol: 0.22, verb: 0.35 },
      { wave: 'sine', freq: N('E6') * 2.76, attack: 0.002, hold: 0, decay: 0.35, sustain: 0.001, release: 0.4, vol: 0.06 },
      { wave: 'sine', freq: N('E6') * 5.4, attack: 0.002, hold: 0, decay: 0.12, sustain: 0.001, release: 0.15, vol: 0.03 },
    ],
    win: [
      { wave: 'triangle', freq: N('C5'), hold: 0.1, release: 0.2, vol: 0.28 },
      { wave: 'triangle', freq: N('E5'), at: 0.1, hold: 0.1, release: 0.2, vol: 0.28 },
      { wave: 'triangle', freq: N('G5'), at: 0.2, hold: 0.1, release: 0.2, vol: 0.28 },
      { wave: 'triangle', freq: N('C6'), at: 0.3, hold: 0.32, decay: 0.4, sustain: 0.5, release: 0.5, vol: 0.3, vib: 0.18, vibRate: 6, verb: 0.3 },
      { wave: 'square', freq: N('E6'), at: 0.3, hold: 0.32, release: 0.5, vol: 0.05, filter: 'lowpass', cut: 3000 },
      { wave: 'sine', freq: N('G7'), at: 0.42, hold: 0, decay: 0.6, sustain: 0.001, release: 0.8, vol: 0.06, verb: 0.5 },
    ],
    lose: [
      { wave: 'triangle', freq: N('G4'), hold: 0.14, release: 0.12, vol: 0.28, filter: 'lowpass', cut: 2000 },
      { wave: 'triangle', freq: N('Eb4'), at: 0.16, hold: 0.14, release: 0.12, vol: 0.28, filter: 'lowpass', cut: 2000 },
      { wave: 'triangle', freq: N('C4'), to: N('A3'), slide: 0.5, at: 0.32, hold: 0.36, release: 0.4, vol: 0.3, vib: 0.3, vibRate: 5, filter: 'lowpass', cut: 1600, verb: 0.25 },
    ],
    // Rising through a major pentatonic scale, so a long chain plays a little melody instead of beeping.
    combo(o) {
      const n = Math.max(0, (o.n | 0) - 1);
      const steps = [0, 2, 4, 7, 9];
      const st = steps[n % 5] + 12 * Math.min(2, Math.floor(n / 5));
      const f = N('C5') * semis(st);
      return [
        { wave: 'triangle', freq: f, attack: 0.002, hold: 0.05, decay: 0.12, sustain: 0.35, release: 0.16, vol: 0.28 },
        { wave: 'square', freq: f * 2, attack: 0.002, hold: 0.03, release: 0.08, vol: 0.04, filter: 'lowpass', cut: 4000 },
        { wave: 'sine', freq: f * 3, at: 0.02, hold: 0, decay: 0.2, sustain: 0.001, release: 0.25, vol: 0.05, verb: 0.3 },
      ];
    },
    error: { wave: 'square', freq: 180, arp: [0, -1], arpStep: 0.09, attack: 0.003, hold: 0.16, release: 0.06, vol: 0.12, filter: 'lowpass', cut: 1400 },
    pop: { wave: 'sine', freq: 520, to: 1300, slide: 0.04, attack: 0.001, hold: 0.02, release: 0.05, vol: 0.3, jitter: 1.5 },
    tick: { wave: 'sine', freq: 2400, attack: 0.001, hold: 0.002, release: 0.02, vol: 0.08, jitter: 0.4 },
    zap: { wave: 'sawtooth', freq: 900, to: 2400, slide: 0.06, attack: 0.002, hold: 0.04, release: 0.05, vol: 0.12, vib: 2, vibRate: 55, filter: 'lowpass', cut: 6000 },
    charge: { wave: 'triangle', freq: 220, to: 880, slide: 0.5, attack: 0.05, hold: 0.45, release: 0.08, vol: 0.2, vib: 0.3, vibRate: 12 },
    step: { wave: 'noise', freq: 1200, filter: 'bandpass', q: 2, attack: 0.001, hold: 0.012, release: 0.035, vol: 0.18, jitter: 3 },
    unlock: [
      { wave: 'triangle', freq: N('G5'), arp: [0, 5, 12], arpStep: 0.07, hold: 0.2, release: 0.25, vol: 0.24, verb: 0.25 },
      { wave: 'sine', freq: N('D7'), at: 0.14, hold: 0, decay: 0.4, sustain: 0.001, release: 0.5, vol: 0.05, verb: 0.4 },
    ],
  });

  // Continuous engine drone. set(throttle 0..1) glides pitch, brightness and level; stop() fades it out.
  sfx.engine = function (o) {
    o = o || {};
    const base = o.base || 55, vol = o.vol === undefined ? 0.14 : o.vol;
    let n = null;
    function build() {
      if (n || !live()) return;
      const c = au.ctx, t = c.currentTime;
      n = { o1: c.createOscillator(), o2: c.createOscillator(), sub: c.createOscillator(), f: c.createBiquadFilter(), g: c.createGain() };
      n.o1.type = n.o2.type = o.wave || 'sawtooth';
      n.sub.type = 'square';
      n.o2.detune.value = 9;
      n.f.type = 'lowpass'; n.f.Q.value = 3; n.f.frequency.value = 320;
      n.g.gain.setValueAtTime(0, t);
      const subG = c.createGain(); subG.gain.value = 0.5;
      n.o1.connect(n.f); n.o2.connect(n.f); n.sub.connect(subG); subG.connect(n.f);
      n.f.connect(n.g); n.g.connect(au.sfxBus);
      for (const k of ['o1', 'o2', 'sub']) n[k].start(t);
    }
    const E = {
      throttle: 0,
      set(th) {
        E.throttle = clamp(+th || 0, 0, 1);
        build();
        if (!n) return E;
        const t = au.ctx.currentTime, f = base * (1 + E.throttle * 2.4);
        n.o1.frequency.setTargetAtTime(f, t, 0.06);
        n.o2.frequency.setTargetAtTime(f, t, 0.06);
        n.sub.frequency.setTargetAtTime(f / 2, t, 0.06);
        n.f.frequency.setTargetAtTime(300 + E.throttle * 2600, t, 0.08);
        n.g.gain.setTargetAtTime(vol * (0.5 + 0.5 * E.throttle), t, 0.08);
        return E;
      },
      stop() {
        if (!n) return;
        const t = au.ctx.currentTime, nn = n;
        n = null;
        nn.g.gain.setTargetAtTime(0, t, 0.04);
        for (const k of ['o1', 'o2', 'sub']) nn[k].stop(t + 0.3);
      },
    };
    return E;
  };

  /* ---------------------------------------------------------------- music */

  const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10],
    mixolydian: [0, 2, 4, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11], phrygian: [0, 1, 3, 5, 7, 8, 10],
    harmonic: [0, 2, 3, 5, 7, 8, 11], pentatonic: [0, 2, 4, 7, 9], minorPent: [0, 3, 5, 7, 10],
  };
  const KEYS = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const INST_OCT = { bass: -2, pad: -1, pluck: 0, lead: 1, bell: 1 };
  const INST_VOL = { kick: 0.9, snare: 0.45, hat: 0.18, bass: 0.32, pad: 0.07, pluck: 0.16, lead: 0.11, bell: 0.13 };

  function degreeMidi(root, scale, d) {
    const n = scale.length, o = Math.floor(d / n);
    return root + scale[d - o * n] + 12 * o;
  }
  function parseNotes(str) {
    const tok = String(str).trim().split(/\s+/);
    const deg = [], len = [];
    for (let i = 0; i < tok.length; i++) {
      const v = tok[i] === '.' || tok[i] === '-' ? NaN : parseInt(tok[i], 10);
      deg.push(v);
      let l = 1;
      while (tok[i + l] === '-') l++;
      len.push(l);
    }
    return { deg, len, n: tok.length };
  }

  function compileSong(song) {
    const k = KEYS[song.key] === undefined ? 9 : KEYS[song.key];
    const s = {
      bpm: song.bpm || 110, swing: song.swing || 0, spb: song.steps || 16,
      scale: SCALES[song.scale] || SCALES.minor,
      root: 60 + (k > 6 ? k - 12 : k),
      chords: song.chords && song.chords.length ? song.chords : [0],
      tracks: (song.tracks || []).map(t => {
        const c = Object.assign({ on: t.on !== false, vol: 1 }, t);
        if (t.hits) c.hitsArr = String(t.hits).replace(/\s+/g, '');
        if (t.notes !== undefined) c.parsed = parseNotes(t.notes);
        return c;
      }),
    };
    return s;
  }

  const seq = { song: null, src: null, step: 0, next: 0, timer: 0 };

  function playInst(inst, t, freq, dur, vel, tr) {
    const c = au.ctx;
    const vol = (INST_VOL[inst] || 0.2) * vel * (tr.vol === undefined ? 1 : tr.vol);
    const out = c.createGain();
    out.connect(au.musicIn);
    const send = (node, amt) => { if (amt > 0) { const g = c.createGain(); g.gain.value = amt; out.connect(g); g.connect(node); } };
    const osc = (type, f, detune) => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; if (detune) o.detune.value = detune; return o; };
    const lp = (f, q) => { const b = c.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = f; b.Q.value = q || 0.7; return b; };
    let srcs = [], end;
    switch (inst) {
      case 'kick': {
        const o = osc('sine', 150);
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
        out.gain.setValueAtTime(0, t);
        out.gain.linearRampToValueAtTime(vol, t + 0.002);
        out.gain.setTargetAtTime(0, t + 0.02, 0.09);
        o.connect(out); srcs = [o]; end = t + 0.5;
        break;
      }
      case 'snare': {
        const n = c.createBufferSource(); n.buffer = au.noise;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1900; bp.Q.value = 0.7;
        const body = osc('triangle', 190);
        body.frequency.exponentialRampToValueAtTime(140, t + 0.08);
        const bg = c.createGain();
        bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.6, t + 0.002); bg.gain.setTargetAtTime(0, t + 0.01, 0.03);
        out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + 0.002); out.gain.setTargetAtTime(0, t + 0.01, 0.05);
        n.connect(bp); bp.connect(out); body.connect(bg); bg.connect(out);
        send(au.verb, tr.verb === undefined ? 0.18 : tr.verb);
        end = t + 0.4;
        n.start(t, Math.random() * 0.5); n.stop(end);
        srcs = [body];
        break;
      }
      case 'hat': {
        const n = c.createBufferSource(); n.buffer = au.noise;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
        out.gain.setValueAtTime(0, t); out.gain.linearRampToValueAtTime(vol, t + 0.001);
        out.gain.setTargetAtTime(0, t + 0.004, dur > 0 ? dur : 0.014);
        n.connect(hp); hp.connect(out);
        end = t + 0.35;
        n.start(t, Math.random() * 0.5); n.stop(end);
        break;
      }
      case 'bass': {
        const o = osc(tr.wave || 'sawtooth', freq), sub = osc('sine', freq / 2);
        const f = lp(tr.cutoff || 520, 5);
        f.frequency.setValueAtTime((tr.cutoff || 520) * 2.6, t);
        f.frequency.setTargetAtTime(tr.cutoff || 520, t + 0.01, 0.07);
        const sg = c.createGain(); sg.gain.value = 0.7;
        o.connect(f); sub.connect(sg); sg.connect(out); f.connect(out);
        end = adsr(out.gain, t, vol, 0.006, 0.18, 0.7, t + dur, 0.06);
        srcs = [o, sub];
        break;
      }
      case 'pad': {
        const f = lp(tr.cutoff || 1500, 0.6);
        for (const d of [-8, 7]) { const o = osc(tr.wave || 'sawtooth', freq, d); o.connect(f); srcs.push(o); }
        f.connect(out);
        end = adsr(out.gain, t, vol, tr.attack || 0.35, 0, 1, t + dur, tr.release || 0.7);
        send(au.verb, tr.verb === undefined ? 0.5 : tr.verb);
        break;
      }
      case 'pluck': {
        const o = osc(tr.wave || 'triangle', freq), o2 = osc('square', freq, 5);
        const f = lp(4200, 1.2);
        f.frequency.setValueAtTime(tr.cutoff || 4200, t);
        f.frequency.setTargetAtTime(800, t + 0.005, 0.09);
        const g2 = c.createGain(); g2.gain.value = 0.18;
        o.connect(f); o2.connect(g2); g2.connect(f); f.connect(out);
        end = adsr(out.gain, t, vol, 0.003, 0.25, 0.15, t + Math.min(dur, 0.35), 0.18);
        send(au.delayIn, tr.delay === undefined ? 0.35 : tr.delay);
        send(au.verb, tr.verb === undefined ? 0.25 : tr.verb);
        srcs = [o, o2];
        break;
      }
      case 'lead': {
        const o = osc(tr.wave || 'square', freq);
        const f = lp(tr.cutoff || 2800, 1);
        const lfo = osc('sine', 5.5), lg = c.createGain();
        lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(freq * 0.008, t + 0.25);
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(f); f.connect(out);
        end = adsr(out.gain, t, vol, 0.012, 0.2, 0.7, t + dur, 0.12);
        send(au.delayIn, tr.delay === undefined ? 0.3 : tr.delay);
        send(au.verb, tr.verb === undefined ? 0.2 : tr.verb);
        srcs = [o, lfo];
        break;
      }
      case 'bell': {
        const car = osc('sine', freq), mod = osc('sine', freq * 3.5), mg = c.createGain();
        mg.gain.setValueAtTime(freq * 2.2, t);
        mg.gain.setTargetAtTime(0, t, 0.25);
        mod.connect(mg); mg.connect(car.frequency); car.connect(out);
        end = adsr(out.gain, t, vol, 0.002, 1.2, 0.001, t + 0.05, 1.2);
        send(au.verb, tr.verb === undefined ? 0.45 : tr.verb);
        send(au.delayIn, tr.delay === undefined ? 0.2 : tr.delay);
        srcs = [car, mod];
        break;
      }
      default: return;
    }
    for (const s of srcs) { s.start(t); s.stop(end + 0.05); }
  }

  function scheduleStep(s, t) {
    const S = seq.song, stepDur = 60 / S.bpm / 4;
    const bar = Math.floor(s / S.spb) % S.chords.length;
    const chord = S.chords[bar];
    for (const tr of S.tracks) {
      if (!tr.on) continue;
      const inst = tr.inst;
      if (tr.hitsArr) {
        const ch = tr.hitsArr[s % tr.hitsArr.length];
        if (ch === '.' || ch === undefined) continue;
        const vel = ch === 'X' ? 1 : ch === 'g' ? 0.4 : 0.78;
        playInst(inst, t, 0, ch === 'o' ? 0.07 : 0, vel, tr);
      } else if (tr.chord) {
        const every = tr.every || S.spb;
        if (s % every) continue;
        const oct = tr.oct === undefined ? INST_OCT[inst] || 0 : tr.oct;
        const tones = tr.seventh ? [0, 2, 4, 6] : [0, 2, 4];
        for (const d of tones) playInst(inst, t, noteHz(degreeMidi(S.root + oct * 12, S.scale, chord + d)), every * stepDur * 0.95, 1, tr);
      } else if (tr.parsed) {
        const i = s % tr.parsed.n, d = tr.parsed.deg[i];
        if (d !== d) continue; // NaN: rest or tie
        const oct = tr.oct === undefined ? INST_OCT[inst] || 0 : tr.oct;
        const deg = d + (tr.follow ? chord : 0);
        playInst(inst, t, noteHz(degreeMidi(S.root + oct * 12, S.scale, deg)), tr.parsed.len[i] * stepDur * (tr.gate || 0.9), 1, tr);
      }
    }
  }

  function seqTick() {
    const c = au.ctx;
    if (!seq.song || !c || c.state !== 'running') return;
    const S = seq.song, stepDur = 60 / S.bpm / 4;
    if (seq.next < c.currentTime - 0.05) seq.next = c.currentTime + 0.03;
    while (seq.next < c.currentTime + 0.12) {
      const swing = seq.step % 2 ? S.swing * stepDur * 0.66 : 0;
      if (soundOn) scheduleStep(seq.step, seq.next + swing);
      seq.step++;
      seq.next += stepDur;
    }
  }
  // Starts the scheduler once audio exists (music may be requested before the first gesture).
  function seqKick() {
    if (!seq.song || !au.ctx || seq.timer) return;
    seq.next = au.ctx.currentTime + 0.06;
    au.delay.delayTime.setValueAtTime(Math.min(1.4, (60 / seq.song.bpm / 4) * 3), au.ctx.currentTime);
    au.musicOut.gain.cancelScheduledValues(au.ctx.currentTime);
    setLevels();
    seq.timer = setInterval(seqTick, 25);
    seqTick();
  }

  const music = {
    get playing() { return seq.src; },
    get step() { return seq.step; },
    // song: { bpm, swing, key, scale, steps, chords: [degree per bar], tracks: [...] } (see docs/KIT.md)
    // Playing the song that is already playing carries on; { restart: true } starts it over from bar one
    // with its tracks back as the song defines them (undoing layer()), e.g. at the start of each run.
    play(song, opts) {
      if (!song) return;
      if (seq.src === song && !(opts && opts.restart)) return;
      music.stop(0);
      seq.src = song;
      seq.song = compileSong(song);
      seq.step = 0;
      seqKick();
    },
    stop(ms) {
      if (seq.timer) { clearInterval(seq.timer); seq.timer = 0; }
      seq.song = null; seq.src = null;
      if (au.ctx && ms !== 0) {
        const t = au.ctx.currentTime;
        au.musicOut.gain.setTargetAtTime(0, t, (ms || 400) / 4000);
      }
    },
    // Turn a named track on or off live (adaptive music: add drums when the action starts).
    // Returns false (and warns under ?debug) when the playing song has no track of that name.
    layer(name, on) {
      if (!seq.song) return false;
      let hit = false;
      for (const t of seq.song.tracks) if (t.name === name) { t.on = !!on; hit = true; }
      if (!hit && DEBUG) console.warn(`Kit.music.layer: no track '${name}' (tracks: ${music.tracks().map(t => t.name).join(', ')})`);
      return hit;
    },
    // The playing song's tracks as [{ name, inst, on }].
    tracks() { return seq.song ? seq.song.tracks.map(t => ({ name: t.name, inst: t.inst, on: t.on })) : []; },
    // Lower (and muffle) the music: duck(0.3) until duck(1), or duck(0.3, 400) for a short dip.
    duck(level, ms) {
      au.duckLevel = level === undefined ? 0.35 : clamp(level, 0, 1);
      setLevels();
      clearTimeout(music._duckTimer);
      if (ms) music._duckTimer = setTimeout(() => { au.duckLevel = 1; setLevels(); }, ms);
    },
    // Ready-made songs by mood, varied by seed: 'calm', 'night', 'drive', 'chip', 'bounce', 'mystery', 'tense'.
    // o: { seed, key, bpm, lead: false, off: [track names that start silent, for layer() to bring in] }
    song: (style, o) => makeSong(style, o || {}),
    styles: ['calm', 'night', 'drive', 'chip', 'bounce', 'mystery', 'tense'],
  };

  function melody(r, bars, spb, chords, o) {
    const out = [];
    let prev = 4;
    for (let b = 0; b < bars; b++) {
      const phrase = b % 2 === 1 && out.length >= spb ? out.slice(out.length - spb) : null;
      for (let s = 0; s < spb; s++) {
        const chord = chords[b % chords.length];
        // The second bar of each pair echoes the first with a varied ending: memorable, not random.
        if (phrase && s < spb * 0.6) { out.push(phrase[s]); continue; }
        const strong = s % 4 === 0, half = s % 2 === 0;
        if (strong && r.chance(o.density)) prev = chord + r.pick([0, 2, 4, 7]);
        else if (half && r.chance(o.density * 0.5)) prev += r.pick([-1, 1, 1, 2, -2]);
        else { out.push(r.chance(0.5) && out.length && out[out.length - 1] !== '.' ? '-' : '.'); continue; }
        prev = clamp(prev, -2, 11);
        out.push(String(prev));
      }
    }
    return out.join(' ');
  }

  function makeSong(style, o) {
    const r = rng(o.seed === undefined ? style : o.seed);
    const pick = arr => r.pick(arr);
    const D = {
      calm: { bpm: 76, swing: 0.1, scale: 'lydian', progs: [[0, 1, 0, 1], [0, 4, 5, 3], [0, 3, 0, 4]] },
      night: { bpm: 88, swing: 0.16, scale: 'dorian', progs: [[0, 3, 0, 3], [0, 6, 5, 3], [0, 4, 3, 6]] },
      drive: { bpm: 116, swing: 0, scale: 'minor', progs: [[0, 5, 2, 6], [0, 5, 3, 4], [0, 3, 5, 6]] },
      chip: { bpm: 140, swing: 0, scale: 'major', progs: [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 4]] },
      bounce: { bpm: 104, swing: 0.22, scale: 'mixolydian', progs: [[0, 3, 0, 6], [0, 4, 3, 0], [0, 6, 3, 4]] },
      mystery: { bpm: 70, swing: 0.05, scale: 'phrygian', progs: [[0, 1, 0, 6], [0, 5, 1, 0], [0, 3, 1, 0]] },
      tense: { bpm: 132, swing: 0, scale: 'harmonic', progs: [[0, 5, 3, 4], [0, 0, 5, 4], [0, 3, 4, 0]] },
    }[style] || { bpm: 100, swing: 0.1, scale: 'minor', progs: [[0, 5, 3, 4]] };
    const chords = pick(D.progs);
    const key = o.key || pick(['C', 'D', 'E', 'F', 'G', 'A', 'Bb']);
    const tracks = [];
    const mel = (density) => melody(r, 4, 16, chords, { density });
    switch (style) {
      case 'calm':
        tracks.push({ name: 'pad', inst: 'pad', chord: true, seventh: true, cutoff: 1100 });
        tracks.push({ name: 'arp', inst: 'pluck', notes: pick(['0 . 4 . 7 . 4 .', '0 . 2 4 . 7 . 4', '7 . 4 . 2 . 0 .']), follow: true, vol: 0.8 });
        tracks.push({ name: 'bell', inst: 'bell', notes: mel(0.35), vol: 0.8 });
        tracks.push({ name: 'bass', inst: 'bass', notes: '0 - - - - - - - . . . . 4 - - -', follow: true, wave: 'triangle', cutoff: 380, vol: 0.8 });
        break;
      case 'night':
        tracks.push({ name: 'pad', inst: 'pad', chord: true, seventh: true, cutoff: 1300 });
        tracks.push({ name: 'kick', inst: 'kick', hits: pick(['x.....x...x.....', 'x.........x..x..']) });
        tracks.push({ name: 'snare', inst: 'snare', hits: '....x.......x...', vol: 0.7 });
        tracks.push({ name: 'hat', inst: 'hat', hits: 'x.g.x.gxx.g.x.g.' });
        tracks.push({ name: 'bass', inst: 'bass', notes: '0 - . 0 . . 4 . 0 - . . 2 . 4 .', follow: true, cutoff: 420 });
        tracks.push({ name: 'keys', inst: 'pluck', notes: mel(0.45) });
        break;
      case 'drive':
        tracks.push({ name: 'kick', inst: 'kick', hits: 'x...x...x...x...' });
        tracks.push({ name: 'snare', inst: 'snare', hits: '....x.......x...' });
        tracks.push({ name: 'hat', inst: 'hat', hits: '..x...x...x...xo' });
        tracks.push({ name: 'bass', inst: 'bass', notes: '0 0 7 0 0 7 0 0 0 0 7 0 0 7 0 7', follow: true, gate: 0.6, cutoff: 600 });
        tracks.push({ name: 'pad', inst: 'pad', chord: true, cutoff: 1800, vol: 0.8 });
        tracks.push({ name: 'arp', inst: 'pluck', notes: '0 2 4 7 4 2 0 2 4 7 9 7 4 2 4 7', follow: true, vol: 0.7 });
        tracks.push({ name: 'lead', inst: 'lead', notes: mel(0.5), wave: 'sawtooth', cutoff: 2400, on: o.lead !== false });
        break;
      case 'chip':
        tracks.push({ name: 'kick', inst: 'kick', hits: 'x.......x.......', vol: 0.8 });
        tracks.push({ name: 'snare', inst: 'snare', hits: '....x.......x..x', vol: 0.7 });
        tracks.push({ name: 'hat', inst: 'hat', hits: 'x.x.x.x.x.x.x.x.' });
        tracks.push({ name: 'bass', inst: 'bass', notes: '0 . 7 . 0 . 7 . 0 . 7 . 4 . 7 .', follow: true, wave: 'triangle', gate: 0.7, cutoff: 900 });
        tracks.push({ name: 'arp', inst: 'pluck', notes: '0 4 7 4 0 4 7 4 0 4 7 4 0 4 7 9', follow: true, wave: 'square', vol: 0.5, delay: 0.15 });
        tracks.push({ name: 'lead', inst: 'lead', notes: mel(0.7), wave: 'square', cutoff: 3600 });
        break;
      case 'bounce':
        tracks.push({ name: 'kick', inst: 'kick', hits: 'x.....x.x.......' });
        tracks.push({ name: 'snare', inst: 'snare', hits: '....x.......x.g.' });
        tracks.push({ name: 'hat', inst: 'hat', hits: 'x.x.x.x.x.x.x.xo' });
        tracks.push({ name: 'bass', inst: 'bass', notes: '0 . . 0 . . 4 . 5 . . 4 . 2 . .', follow: true, cutoff: 700 });
        tracks.push({ name: 'stabs', inst: 'pluck', notes: '. . 4 . . . 4 . . . 4 . . . 4 .', follow: true, vol: 0.9 });
        tracks.push({ name: 'lead', inst: 'lead', notes: mel(0.55), wave: 'triangle', cutoff: 3000 });
        break;
      case 'mystery':
        tracks.push({ name: 'pad', inst: 'pad', chord: true, cutoff: 900, attack: 0.8, release: 1.2 });
        tracks.push({ name: 'drone', inst: 'bass', notes: '0 - - - - - - - - - - - - - - -', wave: 'triangle', cutoff: 300 });
        tracks.push({ name: 'beat', inst: 'kick', hits: 'x..x............', vol: 0.5 });
        tracks.push({ name: 'bell', inst: 'bell', notes: mel(0.3), vol: 0.9 });
        break;
      case 'tense':
        tracks.push({ name: 'kick', inst: 'kick', hits: 'x...x...x...x.x.' });
        tracks.push({ name: 'snare', inst: 'snare', hits: '....x.......x...' });
        tracks.push({ name: 'hat', inst: 'hat', hits: 'xxgxxxgxxxgxxxgx' });
        tracks.push({ name: 'bass', inst: 'bass', notes: '0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 1', follow: true, gate: 0.5, cutoff: 500 });
        tracks.push({ name: 'stabs', inst: 'pluck', notes: '0 . . 0 . . 0 . . 0 . . 2 . 1 .', follow: true, wave: 'sawtooth' });
        tracks.push({ name: 'lead', inst: 'lead', notes: mel(0.45), wave: 'sawtooth', cutoff: 2000, on: o.lead !== false });
        break;
      default:
        tracks.push({ name: 'pad', inst: 'pad', chord: true });
        tracks.push({ name: 'kick', inst: 'kick', hits: 'x...x...x...x...' });
    }
    for (const t of tracks) if (o.off && o.off.includes(t.name)) t.on = false;
    return { bpm: o.bpm || D.bpm, swing: D.swing, key, scale: D.scale, chords, tracks };
  }

  const audio = {
    get ctx() { return au.ctx; },
    get ready() { return !!(au.ctx && au.ctx.state === 'running'); },
    get muted() { return !soundOn; },
    get voices() { return au.voices; },
    unlock,
    note: noteHz,
    // Relative levels, 0..1: { music, sfx }.
    volume(v) {
      if (v && v.music !== undefined) au.vol.music = clamp(v.music, 0, 1);
      if (v && v.sfx !== undefined) au.vol.sfx = clamp(v.sfx, 0, 1);
      setLevels();
    },
    // While held (the pause menu), effects go silent and the music drops back, muffled.
    hold(on) { au.held = !!on; setLevels(); },
    // Peak level after the limiter over the last ~40 ms (0..1). For tests and meters.
    peak() {
      if (!au.analyser) return 0;
      au.analyser.getFloatTimeDomainData(peakBuf);
      let m = 0;
      for (let i = 0; i < peakBuf.length; i++) { const v = Math.abs(peakBuf[i]); if (v > m) m = v; }
      return m;
    },
  };

  /* ---------------------------------------------------------------- save */

  const save = {
    get: (k, d) => A.store.get(k, d),
    set: (k, v) => A.store.set(k, v),
    best: () => +A.store.get('best', 0) || 0,
    // Stores n if it beats the best; true when it did.
    setBest(n) {
      n = +n || 0;
      if (n <= save.best()) return false;
      A.store.set('best', n);
      return true;
    },
  };

  /* ---------------------------------------------------------------- shell */

  const SHELL_CSS = `
.k-shell{--k-ink:#fff;--k-ink-soft:rgba(255,255,255,.7);--k-panel:rgba(255,255,255,.1);--k-accent:#8B6CFF;--k-accent-ink:#fff;--k-scrim:rgba(6,4,18,.5);--k-line:rgba(255,255,255,.22);--k-radius:22px;--k-btn-radius:999px;--k-display:${FONT_STACKS.display};--k-body:${FONT_STACKS.body};
  position:fixed;inset:0;z-index:40;pointer-events:none;color:var(--k-ink);font:600 16px/1.4 var(--k-body);-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.k-shell [hidden]{display:none!important}
.kiln-keyart .k-shell{display:none!important}
.k-layer{position:absolute;inset:0;display:flex;pointer-events:auto;box-sizing:border-box;padding:max(20px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(20px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px))}
.k-shell *,.k-shell *::before,.k-shell *::after{box-sizing:border-box}
.k-shell h1,.k-shell h2,.k-shell p{margin:0}
.k-shell button{font:inherit;color:inherit;-webkit-tap-highlight-color:transparent}
.k-shell button:focus-visible{outline:3px solid var(--k-accent);outline-offset:3px}
.k-title{flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:18px;background:radial-gradient(120% 70% at 50% 100%,var(--k-scrim),transparent 70%)}
.k-title-inner{display:flex;flex-direction:column;align-items:inherit;gap:14px;width:min(560px,100%)}
.k-title-head{display:flex;flex-direction:column;align-items:inherit;gap:12px}
.k-title-actions{display:flex;flex-direction:column;align-items:inherit;gap:12px;width:100%}
.k-shell[data-layout=bottom] .k-title{justify-content:flex-end;padding-bottom:max(40px,calc(env(safe-area-inset-bottom,0px) + 28px));background:linear-gradient(to bottom,transparent 35%,var(--k-scrim))}
.k-shell[data-layout=bottom] .k-title-inner{flex:1;justify-content:space-between;padding-top:12vh}
.k-shell[data-layout=left] .k-title{align-items:flex-start;justify-content:flex-end;text-align:left;padding-bottom:max(44px,calc(env(safe-area-inset-bottom,0px) + 28px));background:linear-gradient(to top right,var(--k-scrim),transparent 65%)}
.k-shell[data-layout=left] .k-title-inner{align-items:flex-start}
.k-shell[data-layout=left] .k-title-actions{align-items:flex-start}
.k-shell[data-layout=left] .k-title-h{font-size:clamp(44px,13vw,96px)}
.k-shell[data-layout=card] .k-title{background:var(--k-scrim)}
.k-shell[data-layout=card] .k-title-inner{padding:30px 24px 24px;width:min(400px,100%)}
.k-kicker{font:700 12px/1 var(--k-body);letter-spacing:.24em;text-transform:uppercase;color:var(--k-ink-soft)}
.k-title-h{font:800 clamp(38px,11vw,78px)/.95 var(--k-display);letter-spacing:-.03em;text-wrap:balance;max-width:100%;overflow-wrap:anywhere}
.k-tagline{font-size:17px;color:var(--k-ink-soft);max-width:30ch;text-wrap:balance}
.k-best{font:700 12px/1 var(--k-body);letter-spacing:.16em;text-transform:uppercase;color:var(--k-ink-soft)}
.k-best b{font:700 15px/1 var(--k-display);letter-spacing:0;color:var(--k-ink);margin-left:6px;font-variant-numeric:tabular-nums}
.k-shell[data-title-style=gradient] .k-title-h{background:linear-gradient(180deg,var(--k-ink) 30%,var(--k-accent));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 18px rgba(0,0,0,.35))}
.k-shell[data-title-style=glow] .k-title-h{color:var(--k-ink);text-shadow:0 0 8px var(--k-accent),0 0 28px var(--k-accent),0 0 60px var(--k-accent)}
.k-shell[data-title-style=outline] .k-title-h{color:transparent;-webkit-text-stroke:2px var(--k-ink)}
.k-shell[data-title-style=stamp] .k-title-h{color:var(--k-ink);text-shadow:4px 4px 0 var(--k-accent),8px 8px 0 rgba(0,0,0,.25)}
.k-shell[data-title-style=solid] .k-title-h{color:var(--k-ink);text-shadow:0 6px 30px rgba(0,0,0,.35)}
.k-modal{align-items:center;justify-content:center;background:var(--k-scrim);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);animation:k-fade .2s ease-out;overflow:auto}
.k-panel{position:relative;width:min(380px,100%);max-height:100%;overflow:auto;padding:26px 22px 22px;border-radius:var(--k-radius);background:var(--k-panel);color:var(--k-ink);display:flex;flex-direction:column;gap:14px;text-align:center;animation:k-rise .38s cubic-bezier(.2,.9,.25,1.15)}
.k-panel h2{font:800 26px/1.1 var(--k-display);letter-spacing:-.02em}
.k-stack{display:flex;flex-direction:column;gap:10px}
.k-btn{appearance:none;border:0;cursor:pointer;min-height:52px;padding:14px 22px;border-radius:var(--k-btn-radius);font:700 17px/1 var(--k-body);letter-spacing:.01em;background:transparent;color:var(--k-ink);box-shadow:inset 0 0 0 2px var(--k-line);transition:transform .08s ease,filter .15s ease;display:inline-flex;align-items:center;justify-content:center;gap:10px}
.k-btn:active{transform:translateY(2px) scale(.98)}
.k-btn.k-primary{background:var(--k-accent);color:var(--k-accent-ink);box-shadow:inset 0 -4px 0 rgba(0,0,0,.2),inset 0 2px 0 rgba(255,255,255,.25),0 10px 30px -10px var(--k-accent)}
.k-title .k-btn.k-primary{min-width:min(280px,100%);min-height:60px;font-size:20px}
.k-btn svg{width:18px;height:18px;fill:currentColor}
.k-shell[data-btn=rounded]{--k-btn-radius:14px}
.k-shell[data-btn=square]{--k-btn-radius:3px}
.k-shell[data-btn=cut] .k-btn{border-radius:0;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
.k-pausebtn{position:absolute;pointer-events:auto;top:calc(env(safe-area-inset-top,0px) + 10px);right:max(10px,env(safe-area-inset-right,0px));width:48px;height:48px;border:0;border-radius:min(16px,var(--k-btn-radius));background:var(--k-panel);color:var(--k-ink);display:grid;place-items:center;cursor:pointer;box-shadow:inset 0 0 0 1.5px var(--k-line);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.k-shell[data-pause=tl] .k-pausebtn{right:auto;left:max(10px,env(safe-area-inset-left,0px))}
.k-pausebtn svg{width:20px;height:20px;fill:currentColor}
.k-eyebrow{font:700 12px/1 var(--k-body);letter-spacing:.2em;text-transform:uppercase;color:var(--k-ink-soft)}
.k-score{font:800 clamp(52px,16vw,72px)/1 var(--k-display);letter-spacing:-.04em;font-variant-numeric:tabular-nums}
.k-bestline{font-size:15px;color:var(--k-ink-soft)}
.k-bestline b{color:var(--k-ink);font-variant-numeric:tabular-nums}
.k-newbest{align-self:center;position:relative;overflow:hidden;padding:8px 16px;border-radius:999px;background:var(--k-accent);color:var(--k-accent-ink);font:800 12px/1 var(--k-body);letter-spacing:.2em;text-transform:uppercase;animation:k-pop .6s cubic-bezier(.2,1.6,.4,1) both}
.k-newbest::after{content:"";position:absolute;inset:0;background:linear-gradient(100deg,transparent 30%,rgba(255,255,255,.6) 50%,transparent 70%);transform:translateX(-100%);animation:k-shine 1.6s .4s ease-in-out infinite}
.k-stats{display:grid;gap:6px;margin:0;text-align:left}
.k-stat{display:flex;justify-content:space-between;gap:12px;padding:9px 12px;border-radius:calc(var(--k-radius) * .5);background:rgba(127,127,127,.12)}
.k-stat dt{color:var(--k-ink-soft);font-weight:600}
.k-stat dd{margin:0;font:700 15px/1.3 var(--k-display);font-variant-numeric:tabular-nums}
.k-row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:48px;padding:6px 4px;border:0;background:none;cursor:pointer;font-weight:600;text-align:left}
.k-switch{flex:none;position:relative;width:52px;height:30px;border-radius:999px;background:rgba(127,127,127,.35);transition:background .2s}
.k-switch::after{content:"";position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .2s}
.k-row[aria-checked=true] .k-switch{background:var(--k-accent)}
.k-row[aria-checked=true] .k-switch::after{transform:translateX(22px)}
.k-how{text-align:left;color:var(--k-ink-soft);font-size:15px;line-height:1.5;display:grid;gap:6px;padding:4px 2px}
.k-how p{margin:0}
.k-toast{position:absolute;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translate(-50%,-10px);max-width:calc(100% - 32px);padding:10px 18px;border-radius:999px;background:var(--k-panel);color:var(--k-ink);font-weight:700;box-shadow:0 10px 30px -12px rgba(0,0,0,.5),inset 0 0 0 1px var(--k-line);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);opacity:0;transition:opacity .2s,transform .25s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.k-toast.k-on{opacity:1;transform:translate(-50%,0)}
.k-confetti{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.k-confetti i{position:absolute;left:50%;top:38%;width:8px;height:12px;border-radius:2px;opacity:0;animation:k-confetti 1.5s cubic-bezier(.15,.7,.3,1) forwards}
.k-over[data-locked] .k-btn{pointer-events:none}

.k-shell[data-panel=glass] .k-panel{background:radial-gradient(120% 55% at 50% 0%,color-mix(in srgb,var(--k-accent) 16%,transparent),transparent 70%),var(--k-panel);-webkit-backdrop-filter:blur(22px) saturate(1.4);backdrop-filter:blur(22px) saturate(1.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 0 1px var(--k-line),0 30px 80px -30px rgba(0,0,0,.7)}
.k-shell[data-panel=solid] .k-panel{box-shadow:0 30px 70px -28px rgba(0,0,0,.55)}
.k-shell[data-panel=outline] .k-panel{background:transparent;box-shadow:inset 0 0 0 2px var(--k-line)}
.k-shell[data-panel=outline] .k-modal{-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
.k-shell[data-panel=paper] .k-panel{border:2.5px solid var(--k-line);box-shadow:7px 7px 0 var(--k-line);transform:rotate(-.6deg)}
.k-shell[data-panel=paper] .k-btn{box-shadow:inset 0 0 0 2.5px var(--k-line)}
.k-shell[data-panel=paper] .k-btn.k-primary{box-shadow:inset 0 0 0 2.5px var(--k-line),4px 4px 0 var(--k-line)}
.k-shell[data-panel=paper] .k-btn.k-primary:active{transform:translate(3px,3px);box-shadow:inset 0 0 0 2.5px var(--k-line),1px 1px 0 var(--k-line)}
.k-shell[data-panel=paper] .k-modal{-webkit-backdrop-filter:none;backdrop-filter:none}
.k-shell[data-panel=neon] .k-panel{box-shadow:inset 0 0 0 1.5px var(--k-line),0 0 24px -4px var(--k-line),inset 0 0 30px -12px var(--k-line);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
.k-shell[data-panel=neon] .k-btn.k-primary{background:transparent;color:var(--k-accent);box-shadow:inset 0 0 0 2px var(--k-accent),0 0 18px -2px var(--k-accent),inset 0 0 14px -4px var(--k-accent);text-shadow:0 0 10px var(--k-accent)}
.k-shell[data-panel=neon] .k-panel h2,.k-shell[data-panel=neon] .k-score{text-shadow:0 0 18px var(--k-accent)}
.k-shell[data-panel=pixel]{--k-radius:0px}
.k-shell[data-panel=pixel] .k-panel{border:4px solid var(--k-line);box-shadow:8px 8px 0 rgba(0,0,0,.45);animation-timing-function:steps(4)}
.k-shell[data-panel=pixel] .k-btn{text-transform:uppercase;letter-spacing:.08em;box-shadow:inset 0 0 0 3px var(--k-line)}
.k-shell[data-panel=pixel] .k-btn.k-primary{box-shadow:inset 0 -5px 0 rgba(0,0,0,.3),inset 0 0 0 3px var(--k-line)}
.k-shell[data-panel=pixel] .k-title-h{letter-spacing:0}
.k-shell[data-panel=pixel] .k-modal{-webkit-backdrop-filter:none;backdrop-filter:none}
.k-shell[data-panel=pixel] .k-pausebtn{border-radius:0;box-shadow:inset 0 0 0 3px var(--k-line)}

@keyframes k-fade{from{opacity:0}}
@keyframes k-rise{from{opacity:0;transform:translateY(18px) scale(.96)}}
@keyframes k-pop{from{opacity:0;transform:scale(.4)}}
@keyframes k-shine{to{transform:translateX(100%)}}
@keyframes k-confetti{0%{opacity:1;transform:translate(-50%,0) rotate(0)}100%{opacity:0;transform:translate(calc(-50% + var(--x)),var(--y)) rotate(var(--r))}}
@media (prefers-reduced-motion:reduce){.k-modal,.k-panel,.k-newbest{animation:none}.k-newbest::after{display:none}.k-toast{transition:none}}
`;

  const PANELS = {
    glass: { panel: 'rgba(255,255,255,0.10)', ink: '#F5F3FF', inkSoft: 'rgba(245,243,255,0.72)', accent: '#8B6CFF', accentInk: '#FFFFFF', scrim: 'rgba(6,4,18,0.5)', line: 'rgba(255,255,255,0.2)', button: 'pill', titleStyle: 'gradient', font: 'house' },
    solid: { panel: '#FFFFFF', ink: '#15192B', inkSoft: '#5A6178', accent: '#2F6BFF', accentInk: '#FFFFFF', scrim: 'rgba(10,14,28,0.5)', line: '#D9DDE8', button: 'rounded', titleStyle: 'solid', font: 'house' },
    outline: { panel: 'transparent', ink: '#FFFFFF', inkSoft: 'rgba(255,255,255,0.72)', accent: '#FFFFFF', accentInk: '#111111', scrim: 'rgba(0,0,0,0.55)', line: 'rgba(255,255,255,0.85)', button: 'pill', titleStyle: 'outline', font: 'house' },
    paper: { panel: '#F6EEDC', ink: '#2B2118', inkSoft: '#6E5E4C', accent: '#E0533D', accentInk: '#FFF8EC', scrim: 'rgba(43,33,24,0.35)', line: '#2B2118', button: 'rounded', titleStyle: 'stamp', font: 'house' },
    neon: { panel: 'rgba(10,6,24,0.78)', ink: '#F2F0FF', inkSoft: '#A9A3D6', accent: '#FF3EA5', accentInk: '#0A0618', scrim: 'rgba(5,2,14,0.55)', line: '#FF3EA5', button: 'cut', titleStyle: 'glow', font: 'house' },
    pixel: { panel: '#1B1B2F', ink: '#FFFFFF', inkSoft: '#B8B8D0', accent: '#FFCC00', accentInk: '#1B1B2F', scrim: 'rgba(0,0,0,0.5)', line: '#FFFFFF', button: 'square', titleStyle: 'stamp', font: 'mono' },
  };
  const FONT_PAIRS = {
    house: [FONT_STACKS.display, FONT_STACKS.body],
    system: [FONT_STACKS.system, FONT_STACKS.system],
    rounded: [FONT_STACKS.rounded, FONT_STACKS.rounded],
    mono: [FONT_STACKS.mono, FONT_STACKS.mono],
    serif: [FONT_STACKS.serif, FONT_STACKS.body],
    condensed: [FONT_STACKS.condensed, FONT_STACKS.body],
  };
  const ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>';
  const ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.6-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let shellSeq = 0;
  // Title, pause and game-over screens wired to the SDK. One per game.
  function shell(o) {
    o = o || {};
    if (!document.getElementById('kit-shell-css')) {
      const st = document.createElement('style');
      st.id = 'kit-shell-css';
      st.textContent = SHELL_CSS;
      document.head.appendChild(st);
    }
    const id = 'k' + ++shellSeq;
    const L = o.loop || null;
    if (L) L.autoPause = false; // the shell decides: pause menu in play, plain freeze elsewhere
    const format = o.format || fmt;
    // Scores are whole numbers everywhere the player or the hub sees them (HUD, best, run_end).
    const whole = n => Math.round(+n || 0);
    const scoreOf = () => (o.score ? whole(o.score()) : 0);
    const how = o.how ? (Array.isArray(o.how) ? o.how : [o.how]) : [];
    let phase = 'title', overTimer = 0, unlockTimer = 0, toastTimer = 0;

    const root = document.createElement('div');
    root.className = 'k-shell';
    root.innerHTML = `
<button class="k-pausebtn" type="button" aria-label="Pause" hidden>${ICON_PAUSE}</button>
<section class="k-layer k-title" aria-labelledby="${id}-t">
  <div class="k-title-inner">
    <div class="k-title-head">
      ${o.kicker ? `<p class="k-kicker">${esc(o.kicker)}</p>` : ''}
      <h1 class="k-title-h" id="${id}-t">${esc(o.title || document.title)}</h1>
      ${o.tagline ? `<p class="k-tagline">${esc(o.tagline)}</p>` : ''}
    </div>
    <div class="k-title-actions">
      <button class="k-btn k-primary" type="button" data-k="play">${ICON_PLAY}<span>${esc(o.playLabel || 'Play')}</span></button>
      <p class="k-best" hidden>Best<b></b></p>
    </div>
  </div>
</section>
<section class="k-layer k-modal k-pause" role="dialog" aria-modal="true" aria-labelledby="${id}-p" hidden>
  <div class="k-panel">
    <h2 id="${id}-p">Paused</h2>
    <div class="k-stack">
      <button class="k-btn k-primary" type="button" data-k="resume">Resume</button>
      <button class="k-btn" type="button" data-k="restart">Restart</button>
      ${how.length ? `<button class="k-btn" type="button" data-k="how" aria-expanded="false" aria-controls="${id}-h">How to play</button>
      <div class="k-how" id="${id}-h" hidden>${how.map(l => `<p>${esc(l)}</p>`).join('')}</div>` : ''}
      <div class="k-settings">
        <button class="k-row" type="button" role="switch" data-k="sound" aria-checked="true"><span>Sound</span><span class="k-switch" aria-hidden="true"></span></button>
        <button class="k-row" type="button" role="switch" data-k="vibration" aria-checked="true"><span>Vibration</span><span class="k-switch" aria-hidden="true"></span></button>
      </div>
      <button class="k-btn" type="button" data-k="exit">Back to games</button>
    </div>
  </div>
</section>
<section class="k-layer k-modal k-over" role="dialog" aria-modal="true" aria-labelledby="${id}-o" hidden>
  <div class="k-panel">
    <p class="k-eyebrow" id="${id}-o">Game over</p>
    <div class="k-newbest" hidden>New best</div>
    <div class="k-score" aria-live="polite">0</div>
    <p class="k-bestline">Best <b>0</b></p>
    <dl class="k-stats"></dl>
    <div class="k-stack">
      <button class="k-btn k-primary" type="button" data-k="again">Play again</button>
      <button class="k-btn" type="button" data-k="exit">Back to games</button>
    </div>
  </div>
  <div class="k-confetti" aria-hidden="true"></div>
</section>
<div class="k-toast" role="status" aria-live="polite"></div>`;
    (document.body || document.documentElement).appendChild(root);
    if (A.keyart) root.hidden = true;

    const $ = sel => root.querySelector(sel);
    const titleEl = $('.k-title'), pauseEl = $('.k-pause'), overEl = $('.k-over'), pauseBtn = $('.k-pausebtn');
    const toastEl = $('.k-toast'), scoreEl = $('.k-score'), statsEl = $('.k-stats'), howBtn = $('[data-k=how]');
    $('.k-settings').hidden = A.embedded;
    root.querySelectorAll('[data-k=exit]').forEach(b => { b.hidden = !A.embedded; });
    const focusTarget = () => o.focus || (L && L.view && L.view.canvas) || null;

    function applyTheme(t) {
      t = t || {};
      const style = PANELS[t.panel] ? t.panel : 'glass';
      const d = PANELS[style], c = Object.assign({}, d, t.colors || {});
      root.dataset.panel = style;
      root.dataset.btn = t.button || d.button;
      root.dataset.layout = t.layout || 'center';
      root.dataset.titleStyle = t.titleStyle || d.titleStyle;
      root.dataset.pause = t.pauseCorner === 'tl' ? 'tl' : 'tr';
      const fonts = typeof t.font === 'object' ? [t.font.display || FONT_STACKS.display, t.font.body || FONT_STACKS.body] : FONT_PAIRS[t.font || d.font] || FONT_PAIRS.house;
      const vars = { ink: c.ink, 'ink-soft': c.inkSoft, panel: c.panel, accent: c.accent, 'accent-ink': c.accentInk, scrim: c.scrim, line: c.line, display: fonts[0], body: fonts[1] };
      if (t.radius !== undefined) vars.radius = t.radius + 'px';
      for (const k in vars) root.style.setProperty('--k-' + k, vars[k]);
      if (t.layout === 'card') $('.k-title-inner').classList.add('k-panel');
      else $('.k-title-inner').classList.remove('k-panel');
    }
    applyTheme(o.theme);

    function syncSettings() {
      const s = A.settings;
      $('[data-k=sound]').setAttribute('aria-checked', String(s.sound !== false));
      $('[data-k=vibration]').setAttribute('aria-checked', String(s.vibration !== false));
    }
    function syncBest() {
      const b = save.best();
      $('.k-best').hidden = !(b > 0);
      $('.k-best b').textContent = format(b);
    }
    function block(on) {
      inputBlocked = on;
      for (const i of inputs) i.reset();
    }
    function focusGame() {
      if (document.activeElement && root.contains(document.activeElement)) document.activeElement.blur();
      const f = focusTarget();
      if (f) {
        if (!f.hasAttribute('tabindex') && f.tabIndex < 0) f.setAttribute('tabindex', '-1');
        try { f.focus({ preventScroll: true }); } catch (e) { /* not focusable */ }
      }
    }
    function show(el) {
      for (const x of [titleEl, pauseEl, overEl]) x.hidden = x !== el;
      pauseBtn.hidden = el !== null || phase !== 'play' || o.pauseButton === false;
    }
    const ui = () => { if (o.uiSound !== false) sfx('click'); };

    function start() {
      if (phase !== 'play') begin();
    }
    function begin() {
      clearTimeout(overTimer); clearTimeout(unlockTimer);
      phase = 'play';
      show(null);
      block(false);
      audio.hold(false);
      if (o.onStart) o.onStart();
      A.runStart(o.runProps ? o.runProps() : undefined);
      if (L) { if (!L.running) L.start(); else L.resume(); }
      focusGame();
    }
    function pause() {
      if (phase !== 'play') return;
      phase = 'paused';
      if (L) L.pause();
      block(true);
      audio.hold(true);
      syncSettings();
      if (howBtn) { howBtn.setAttribute('aria-expanded', 'false'); $('.k-how').hidden = true; }
      show(pauseEl);
      $('[data-k=resume]').focus({ preventScroll: true });
      if (o.onPause) o.onPause();
    }
    function resume() {
      if (phase !== 'paused') return;
      phase = 'play';
      show(null);
      block(false);
      audio.hold(false);
      if (L) L.resume();
      focusGame();
      if (o.onResume) o.onResume();
    }
    function restart() {
      if (A.inRun()) A.runEnd({ score: scoreOf(), reason: 'restart' });
      begin();
    }
    // End the run. r: { score, reason, stats: [{ label, value }], props, title, delay (ms before the panel) }
    function over(r) {
      if (phase !== 'play' && phase !== 'paused') return;
      r = r || {};
      const score = r.score === undefined ? scoreOf() : whole(r.score);
      const prev = save.best();
      const isBest = score > prev && score > 0;
      if (isBest) save.setBest(score);
      phase = 'over';
      if (L && L.paused) L.resume();
      block(true);
      audio.hold(false);
      pauseBtn.hidden = true;
      A.runEnd(Object.assign({ score, reason: r.reason || 'lose', new_best: isBest }, r.props));
      if (o.onOver) o.onOver({ score, best: Math.max(prev, score), isBest, reason: r.reason || 'lose' });
      clearTimeout(overTimer);
      overTimer = setTimeout(() => showOver(score, Math.max(prev, score), isBest, r), r.delay === undefined ? 650 : r.delay);
    }
    function showOver(score, best, isBest, r) {
      if (phase !== 'over') return;
      $('.k-eyebrow').textContent = r.title || 'Game over';
      $('.k-newbest').hidden = !isBest;
      $('.k-bestline').hidden = isBest;
      $('.k-bestline b').textContent = format(best);
      statsEl.innerHTML = '';
      for (const s of (r.stats || []).slice(0, 4)) {
        const row = document.createElement('div');
        row.className = 'k-stat';
        row.innerHTML = `<dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd>`;
        statsEl.appendChild(row);
      }
      statsEl.hidden = !statsEl.children.length;
      show(overEl);
      countUp(score);
      if (isBest) { celebrate(); if (o.uiSound !== false) sfx('win'); haptic([30, 50, 30]); }
      // Buttons wake up a beat later so a held key or a stray tap from play cannot skip the result.
      overEl.dataset.locked = '';
      unlockTimer = setTimeout(() => { delete overEl.dataset.locked; $('[data-k=again]').focus({ preventScroll: true }); }, 550);
    }
    function countUp(to) {
      if (fx.reduced || to <= 0) { scoreEl.textContent = format(to); return; }
      const t0 = performance.now(), dur = clamp(500 + Math.log10(to + 1) * 180, 500, 1300);
      const step = now => {
        if (phase !== 'over') return;
        const p = Math.min(1, (now - t0) / dur);
        scoreEl.textContent = format(to * ease.cubicOut(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
    function celebrate() {
      if (fx.reduced) return;
      const box = $('.k-confetti');
      box.innerHTML = '';
      const cs = getComputedStyle(root);
      const cols = [cs.getPropertyValue('--k-accent'), cs.getPropertyValue('--k-ink'), '#FFD166', '#4CC9F0'];
      for (let i = 0; i < 36; i++) {
        const el = document.createElement('i');
        const a = Math.random() * TAU, d = 120 + Math.random() * 260;
        el.style.cssText = `--x:${(Math.cos(a) * d) | 0}px;--y:${(Math.sin(a) * d * 0.8 + 140) | 0}px;--r:${(Math.random() * 720 - 360) | 0}deg;background:${cols[i % cols.length]};animation-delay:${(Math.random() * 120) | 0}ms`;
        box.appendChild(el);
      }
      setTimeout(() => { box.innerHTML = ''; }, 1900);
    }
    function toast(text, ms) {
      if (A.keyart) return;
      toastEl.textContent = text;
      toastEl.classList.add('k-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toastEl.classList.remove('k-on'), ms || 1800);
    }

    root.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-k]');
      if (!b || !root.contains(b)) return;
      const k = b.dataset.k;
      ui();
      if (k === 'play' || k === 'again') start();
      else if (k === 'resume') resume();
      else if (k === 'restart') restart();
      else if (k === 'exit') {
        block(true);
        // A run left from the pause menu still reports its score (it does not count toward best).
        if (A.inRun()) A.runEnd({ score: scoreOf(), reason: 'quit' });
        A.exit();
      }
      else if (k === 'how') {
        const h = $('.k-how');
        h.hidden = !h.hidden;
        b.setAttribute('aria-expanded', String(!h.hidden));
      } else if (k === 'sound' || k === 'vibration') {
        A.setSetting(k, !(A.settings[k] !== false));
        if (k === 'vibration') haptic(20);
        syncSettings();
      }
    });
    pauseBtn.addEventListener('click', () => { ui(); pause(); });
    pauseEl.addEventListener('click', e => { if (e.target === pauseEl) resume(); });

    // Capture phase, so keys the shell uses never also reach the game.
    window.addEventListener('keydown', e => {
      if (A.keyart) return;
      const k = e.key, act = k === 'Enter' || k === ' ';
      const consume = () => { e.preventDefault(); e.stopImmediatePropagation(); };
      if (phase === 'play') {
        if (k === 'Escape' || k === 'p' || k === 'P') { consume(); pause(); }
        return;
      }
      if (k === 'Tab') { trapFocus(e); return; }
      if (phase === 'paused') { if (k === 'Escape') { consume(); resume(); } return; }
      if (phase === 'over' && (overEl.hasAttribute('data-locked') || e.repeat)) { if (act) consume(); return; }
      if (act && !isButton(e.target)) { consume(); ui(); start(); }
    }, true);
    function trapFocus(e) {
      const layer = [titleEl, pauseEl, overEl].find(x => !x.hidden);
      if (!layer) return;
      const f = Array.from(layer.querySelectorAll('button')).filter(b => !b.hidden && b.offsetParent !== null);
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      e.preventDefault();
      f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }

    A.on('pause', () => {
      if (phase === 'play') pause();
      else if (L) L.pause();
    });
    A.on('resume', () => { if (phase !== 'paused' && L && L.running) L.resume(); });
    A.on('settings', syncSettings);

    const S = {
      el: root,
      get phase() { return phase; },
      get best() { return save.best(); },
      start, pause, resume, restart, over, toast,
      theme: applyTheme,
      // frame (loop updates so far) lets tools/game-check.cjs see that a paused game really stands still.
      state: () => ({ phase, score: scoreOf(), paused: phase === 'paused' || !!(L && L.paused), frame: L ? L.frame : undefined }),
      // Extend the Arcade.test hook: shell.test({ jump() {...} }). Defaults: start, lose, state, pause, resume.
      test(extra) { Object.assign(testApi, extra); registerTest(); return testApi; },
    };
    const testApi = {
      start() { if (phase === 'paused') resume(); else start(); },
      lose() { if (o.lose && phase === 'play') o.lose(); else over({ reason: 'lose', delay: 0 }); },
      state: S.state,
      pause, resume,
    };
    function registerTest() {
      if (typeof A.test === 'function') A.test(testApi);
      else if (DEBUG) window.__kilnTest = testApi;
    }
    registerTest();
    syncSettings();
    syncBest();
    show(titleEl);
    block(!A.keyart);
    // Focus Play so Enter and Space work at once, unless the game is only being captured.
    if (!A.keyart) setTimeout(() => { if (phase === 'title') $('[data-k=play]').focus({ preventScroll: true }); }, 0);
    return S;
  }

  /* ---------------------------------------------------------------- export */

  window.Kit = {
    version: 1,
    debug: DEBUG,
    get keyart() { return !!A.keyart; },
    get embedded() { return !!A.embedded; },
    get reducedMotion() { return fx.reduced; },
    get _worldText() { return worldText; },
    view, loop, input, cam, camera, fx, tween, ease, gfx, rng, save, shell,
    audio, sfx, music,
    clamp, lerp, dist, angle, approach, wrap, smooth, smoothstep, angleDiff,
    circleCircle, rectRect, pointInRect, segCircle,
    fmt, haptic, isDark, onTheme, css,
    STEP,
  };
})();
