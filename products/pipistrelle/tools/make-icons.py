"""Builds every Pipistrelle icon from the master art (art/icon.webp, 1254 x 1254, the owner's icon of 13 October
2026): the Android adaptive launcher icon (foreground with the art inset to the 66 dp safe zone, so round and
squircle masks never clip the wings, and a monochrome bat for Android 13+ themed icons), the legacy square and
round icons, the splash screens, the 512 px Play Store icon and the web icons.

Run from products/pipistrelle:  python3 tools/make-icons.py   (needs Pillow: pip install pillow)
The generated files are committed, so the app builds without running this."""
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'res')
BG = (5, 6, 13)            # #05060D, the app's night
ART_DP = 68                # the art's size inside the 108 dp adaptive canvas (wingtips inside the 66 dp circle)
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

art = Image.open(os.path.join(ROOT, 'art', 'icon.webp')).convert('RGB')
N = art.size[0]


def bat_mask():
    """The bat alone, white, with its eyes cut out: purple and gold pixels, closed, holes filled, smoothed."""
    hsv = art.convert('HSV')
    hp, sp, vp = (c.load() for c in hsv.split())
    m = Image.new('L', art.size, 0)
    mp = m.load()
    for y in range(int(N * 0.12), int(N * 0.66)):
        for x in range(N):
            h, s, v = hp[x, y] * 360 / 255, sp[x, y] / 255, vp[x, y] / 255
            if (255 <= h <= 335 and s > 0.25 and v > 0.12) or (15 <= h <= 65 and s > 0.35 and v > 0.35):
                mp[x, y] = 255
    m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
    f = m.copy()
    ImageDraw.floodfill(f, (0, 0), 128)
    m = ImageChops.lighter(m, f.point(lambda v: 255 if v == 0 else 0))
    m = m.filter(ImageFilter.GaussianBlur(5)).point(lambda v: 255 if v >= 128 else 0)
    # the eyes: the two largest bright, pale blobs in the face
    bright, seen, comps = set(), set(), []
    for y in range(int(N * 0.38), int(N * 0.54)):
        for x in range(int(N * 0.38), int(N * 0.62)):
            if vp[x, y] > 225 and sp[x, y] < 110:
                bright.add((x, y))
    for p in bright:
        if p in seen:
            continue
        stack, comp = [p], []
        seen.add(p)
        while stack:
            q = stack.pop()
            comp.append(q)
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (q[0] + dx, q[1] + dy)
                if n in bright and n not in seen:
                    seen.add(n)
                    stack.append(n)
        comps.append(comp)
    eyes = Image.new('L', art.size, 0)
    ep = eyes.load()
    for comp in sorted(comps, key=len, reverse=True)[:2]:
        for p in comp:
            ep[p] = 255
    eyes = eyes.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(2)).point(lambda v: 255 if v >= 90 else 0)
    return ImageChops.subtract(m, eyes).filter(ImageFilter.GaussianBlur(1.2))


def adaptive(px):
    """108 dp canvas: the art inset at ART_DP, on a blurred, darkened copy of itself so the bleed has no seam."""
    out = art.resize((px, px), Image.LANCZOS).filter(ImageFilter.GaussianBlur(px / 30))
    out = Image.blend(out, Image.new('RGB', (px, px), BG), 0.45)
    s = round(px * ART_DP / 108)
    inner = art.resize((s, s), Image.LANCZOS)
    feather = Image.new('L', (s, s), 0)
    e = max(2, s // 40)
    ImageDraw.Draw(feather).rectangle((e, e, s - 1 - e, s - 1 - e), fill=255)
    feather = feather.filter(ImageFilter.GaussianBlur(e))
    out.paste(inner, ((px - s) // 2, (px - s) // 2), feather)
    return out


def save(img, *path):
    p = os.path.join(*path)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    img.save(p, optimize=True)


def rounded(img, radius):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, img.size[0] - 1, img.size[1] - 1), radius=radius, fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


mask = bat_mask()
for name, k in DENSITIES.items():
    d = os.path.join(RES, 'mipmap-' + name)
    fg = round(108 * k)
    save(adaptive(fg), d, 'ic_launcher_foreground.png')
    s = round(fg * ART_DP / 108)
    mono = Image.new('RGBA', (fg, fg), (0, 0, 0, 0))
    mono.paste(Image.new('RGBA', (s, s), (255, 255, 255, 255)), ((fg - s) // 2, (fg - s) // 2), mask.resize((s, s), Image.LANCZOS))
    save(mono, d, 'ic_launcher_monochrome.png')
    lg = round(48 * k)
    # legacy icons show what an adaptive mask would: the middle 72/108 of the canvas
    c = adaptive(round(lg * 108 / 72)).crop(((round(lg * 108 / 72) - lg) // 2,) * 2 + ((round(lg * 108 / 72) + lg) // 2,) * 2).resize((lg, lg), Image.LANCZOS)
    save(rounded(c, round(lg * 0.2)), d, 'ic_launcher.png')
    rm = Image.new('L', (lg, lg), 0)
    ImageDraw.Draw(rm).ellipse((0, 0, lg - 1, lg - 1), fill=255)
    r = Image.new('RGBA', (lg, lg), (0, 0, 0, 0))
    r.paste(c, (0, 0), rm)
    save(r, d, 'ic_launcher_round.png')

# splash screens (Android 8 to 11; 12+ draws the adaptive icon on the night colour): the art as a soft disc
for folder in sorted(os.listdir(RES)):
    p = os.path.join(RES, folder, 'splash.png')
    if not folder.startswith('drawable') or not os.path.exists(p):
        continue
    w, h = Image.open(p).size
    out = Image.new('RGB', (w, h), BG)
    s = round(min(w, h) * 0.62)
    disc = Image.new('L', (s, s), 0)
    ImageDraw.Draw(disc).ellipse((s * 0.1, s * 0.1, s * 0.9, s * 0.9), fill=255)
    disc = disc.filter(ImageFilter.GaussianBlur(s * 0.06))
    out.paste(art.resize((s, s), Image.LANCZOS), ((w - s) // 2, (h - s) // 2), disc)
    save(out, p)

# the Play Store icon (512 x 512, full bleed: Play rounds the corners itself) and the web icons
save(art.resize((512, 512), Image.LANCZOS), ROOT, 'store', 'play-icon-512.png')
for px in (192, 32):
    save(art.resize((px, px), Image.LANCZOS), ROOT, 'web', 'icons', 'icon-%d.png' % px)
print('icons written')
