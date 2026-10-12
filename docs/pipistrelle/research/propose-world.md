# Pipistrelle: Under Hollin Hill — a world-and-atmosphere-first design for the full game

# Pipistrelle: Under Hollin Hill

*A full-game design proposal, written from the world and its atmosphere outward.*

---

## 0. The pitch in one paragraph

Pipistrelle is about seeing with sound. Under Hollin Hill there are six cave worlds and one silent abyss. Each is a place you remember for its light, its weather, its creatures and the way your own voice comes back to you. A spring flood has swept the colony's pups into the deep. You are a young pipistrelle who keeps going back into the dark for them. Every rescued pup comes home to hang in the Roost, which fills, dries out and comes back to life as you play. Moths you bring home fill the Larder, and you spend them on new bats, each a real species with its own way of hearing the dark. Nothing is sold for money. There are no ads and no timers. You come back because the next cave is a place you have not heard yet.

### Design pillars
1. **Darkness is the canvas.** Each biome is defined by the little light it has (moon slits, lantern gnats, crystals that hold your echo, hot-spring glow) and by how it sounds. We never light a cave "for readability". The sonar does that.
2. **The echo code is sacred.** Teal is rock, blue is water, violet is crystal, pink-red is danger, gold is food, rose is pups. Biomes may shift the rock echo inside the teal band (hue 165-200°) and change how dots behave, but never what the colours mean.
3. **Places, not levels.** Campaign caves use curated seeds, named landmarks, a three-act shape and one secret each. You should be able to say "the Organ, in the Vaults" and mean somewhere.
4. **Kind difficulty.** Walls stun but never kill. Every hazard warns you first. Bats are sidegrades, not power creep. The campaign can be finished with the starting bat.
5. **The big screen is a reward, not a stretch.** At 3840×2160 you see fossils in the chalk, the legs of harvestmen and caustics on a flooded ceiling. On a phone you see the same cave, the same field of view and the same fair game, at a quality tier the phone can hold at 60 fps.

---

## 1. What we keep, and what changes

**Kept as it is, because it is the soul of the game:**
- Tapping to chirp. A ring at 600 px/s paints walls in fading dots, and the memory layer slowly maps the cave.
- Holding still to shriek.
- Crystal re-echo.
- Echo audio with delays that match distance and pan.
- The bat's feel. The stats for Common Pipistrelle stay exactly the current constants: ACC 1050, MAXV 255, BAT_R 8, the relative drag stick, and the damping and bump rules.
- Moths as energy, pups that follow your path, and the multiplier at the exit.
- The moonlit exit arch with the haul counting up.
- Seeded generation, and hazards that warn you first.
- Attract mode behind the title.

**Changed:**

| Today | Full game |
|---|---|
| Endless numbered caves, one look | 25 named campaign caves in 6 biomes plus a finale, then the endless Long Night mode |
| 15 s night flight after every cave (35-50% of early play time) | A 30-45 s Homeward Flight once per chapter, each over a different landscape; 8 s optional flights in Long Night |
| Score is the only number | Larder moths (one currency), colony size (pups at home), Notes (3 missions per cave), Journal |
| Kit template title, game over with confetti | Its own title, Roost hub, Echo Map, Perch (bat shop), Journal, Results; the fall screen has no confetti |
| Zoom capped at 1.45; a 4K screen shows the whole cave | Constant visible world area: the same field of view on every device |
| Rock at 0.5 texel per world px, nearest-neighbour, on a 0.6× layer | Chunked rock at device density with crisp rims, drawn on the main canvas |
| No quality control | Auto/Low/Medium/High/Ultra tiers plus a dynamic resolution governor |

---

## 2. The world: Hollin Hill

### Story (told without cutscenes)
- Every summer the pipistrelles of Hollin Hill raise their pups in the **Warm Chamber**, just inside the chalk mouth of the hill.
- This spring the thaw broke through from below. Black water rose through the hill and carried the pups down into the lower caves.
- Most mothers will not fly the deep dark. You will.
- Deeper caves lead toward where the flood came from: **the Hush**, a sealed sink at the bottom of the hill. An old colony lived there long ago.
- One bat still lives there: **the Old Echo**, a greater horseshoe matriarch. She has been gathering the strongest swept-away pups.
- The game ends at dawn with the autumn swarming: the whole colony, with the Old Echo, pours out of Chalkmouth over the hill.

The story is told through:
- **The Roost**, which visibly dries out, warms up and fills with pups and returning adults chapter by chapter.
- **Old Scratches**: claw-marks on cave walls that you can only read in echo dots. A sonar ring passing over them resolves them into words for 3 s, and they are then kept in the Journal. There are 3 per biome and 1 in the Hush, 19 in all.
- **Three Roost elders** who speak in one-line bubbles and give Requests:
  - **Old Ash**, keeper of the scratches.
  - **Bracken**, who counts every pup.
  - **Tally**, who keeps the Larder.

Sample scratches:
- *Chalkmouth:* "We came in from the downs when the oaks were young. The chalk was kind."
- *Drowned Choir:* "The water sings back twice. Trust the first voice."
- *The Hush:* "Down here nothing is forgotten. Not even us."

### Structure
```
TITLE  →  ROOST (hub)  →  ECHO MAP  →  CAVE CARD  →  CAVE  →  RESULTS  → (chapter end) HOMEWARD FLIGHT → ROOST
                 ├─ PERCH (bats)     ├─ JOURNAL     ├─ REQUESTS     ├─ LONG NIGHT     ├─ TONIGHT'S FLIGHT     └─ SETTINGS
```

**Modes:**
1. **Campaign: Under Hollin Hill.** Six chapters of four caves each, plus the Hush.
   - Each cave is played on its own from the map: full energy at entry, 60-150 s long.
   - Energy no longer carries between caves; the squeeze now lives inside longer caves.
2. **Long Night.** Unlocks after Chapter I. This is today's game, evolved: an endless roguelike run through random caves from biomes you have unlocked.
   - Energy carries over, with a short 8 s night flight between caves that you can skip.
   - It has the Kiln score and best.
3. **Tonight's Flight.** Three caves seeded by the date, from unlocked biomes.
   - One rewarded attempt per day, which you can replay for fun.
   - No streaks and nothing is lost by missing a day.
   - The moon phase is computed offline from the real date.

---

## 3. The biomes (the heart of this proposal)

Every biome is defined as data in `js/data/biomes.js` with the same schema, so one agent can build one biome pack in parallel with the others:

```
{ id, name, line, palette{void, rockDeep, rockLit, rim, accent, fog, vignette}, echo{rockHue, dotStyle},
  strata{painter, bands, decals[]}, parallax[{depth, painter, alpha}], foreground[{depth, painter}],
  lights[{kind, count, color}], ambient[{kind, rate, max}], weather{kind, period, strength},
  hazards{pool, weights}, gen{rad, H, length, chamberBias, waterBias, crystalBias, chimneyBias},
  audio{bed[], echoFx{verb, slap, lowpass}, song, layers}, moths[speciesIds], life[creatureIds] }
```

### Summary

| # | Biome | One line | Ruling light | Signature weather | Hazards (★ = new) | Echo dot style | Music |
|---|---|---|---|---|---|---|---|
| I | **Chalkmouth** | The pale throat of the hill, where moonlight still reaches | Moon shafts through fissures, sweeping slowly | Moon draft: cool air drifting in from the mouth | Webs, ★chalk crusts | Clean round dots (the baseline) | *Chalk*: D dorian, 72 bpm |
| II | **The Dripping Vaults** | A cathedral still being built, one drop at a time | Wet flowstone shining back the bat's own light | Drip rain that masks echo returns | Stalactites, drips, ★bell curtains | Dots leave a short downward drip-streak | *Vaults*: A minor, 66 bpm |
| III | **The Drowned Choir** | The flood's own cave: half air, half black water, and everything echoes twice | Caustics thrown up from lit water | Tide: the water level breathes; mist banks | Rivers, flood, drips, ★siphons | Dots above water mirrored below it; water dots shimmer | *Choir*: B minor, 60 bpm |
| IV | **The Amethyst Throat** | Where the hill's bones turned to glass | Crystals that hold your echo and slowly let it go | Resonance: the chamber hums after a shriek | Crystals, ★singing shards, ★glass gates | Crystal dots split into prism triplets | *Glass*: F lydian, 76 bpm |
| V | **The Windpipes** | The hill breathes here, and it whistles | Moon slits down chimneys; dust lit like smoke | Drafts plus the Breath: the cave's wind reverses every ~30 s | Gusts, ★drafts, ★scree | Dots drift downwind before fading | *Pipes*: G minor pentatonic, 84 bpm |
| VI | **The Lantern Roots** | The forest's roots break through the ceiling, and the ceiling is full of stars that eat | Lantern gnats: thousands of pale ceiling stars | Root rain: soil trickling when owls stir | Owls, ★glow-threads | Dots bloom softly like spores | *Roots*: E dorian, 64 bpm |
| ✦ | **The Hush** | The bottom of the hill, where sound goes to be remembered | None but yours | Stillness: echoes never fade, returns come back late | Light mix of everything | Silver; ghost echoes of the old colony | *Hush*: near silence, 50 bpm |
| VII (v1.1) | **The Ember Seep** | Sulphur springs breathing orange steam | Hot pools glowing from below | Steam banks that scatter sonar | ★steam vents, ★scald pools | Dots in steam jitter and spread | *Seep*: D harmonic minor |
| VIII (v1.1) | **The Rime Hall** | A frozen river under the hill | Moonlight trapped in ice | Frost: resting chills your wings | ★ice stalactites, ★thin ice | Echoes last twice as long and are razor sharp | *Rime*: E lydian, bells |

### I. Chalkmouth
*The pale throat of the hill, where moonlight still reaches.*
- **Palette:** void `#05070D`, rock deep `#141A26`, rock lit `#C9C3B0` (bone chalk), flint `#2B2F3A`, moon `#DFE8FF`, vignette tint deep blue `#04060F`.
- **Light:** 2-3 moon shafts per cave through roof fissures (`gfx.lightRays`, narrow, sweeping ±4° over 40 s as the moon moves). They are brightest near the mouth and gone by the second half of the cave. The arch at the exit stays the moonlit payoff.
- **Strata and detail:**
  - Chalk bands with dark flint nodules in rows.
  - Decals, High and Ultra only: fossil sea-urchins ("shepherd's crowns"), small ammonites and the tick-marks of old claws.
- **Parallax:**
  - Far: pale chalk pillars dissolving into blue haze.
  - Mid: flint-banded walls.
  - Near foreground (depth 1.3): hanging chalk tips and the first beech roots near the mouth.
- **Ambient life:**
  - Harvestmen clusters on lit walls, which ripple away when pinged (legs drawn High+).
  - Cave crickets whose chirps you hear panned in the dark; they hop when a ring hits them.
  - Dust motes in the moon shafts.
- **Weather (moon draft):** motes drift left, toward the cave's depth, strongest near the entrance. Purely atmospheric.
- **Sound:** a low wind over the mouth (noise, low-pass 400 Hz), cricket chirps, a tawny owl far outside. Reverb 1.2 s, dry and clean.
- **Music, *Chalk*:**
  - D dorian, 72 bpm.
  - Tracks: `pad`, `pluck`, `bell`, `bass`.
  - Adaptive layers: `pups` (a lullaby lead that comes in when 2 or more pups trail you) and `exit` (bells when the arch is within 600 px).
- **Hazards:**
  - **Webs**, upgraded: orb-web cave spider webs with dew drops that catch the echo, and a real spider that retreats when you tear free.
  - **★ Chalk crusts:** thin chalk walls sealing side niches. A shriek within 260 px cracks them with a dusty collapse. This teaches the shriek as a tool, not a panic button.
- **Landmark: the Lantern Stone.** A holed flint in the ceiling. The moon shines through the hole, casting a moving spot of light across the chamber floor.
- **Secret:** a crust-sealed niche in every cave, holding a rare moth or an Old Scratch.

### II. The Dripping Vaults
*A cathedral still being built, one drop at a time.*
- **Palette:** rock `#1C1610`, flowstone lit `#E8C48F`, ochre `#A8672E`, soda-straw glass `#F5E6C8`, vignette tint warm umber `#0E0804`. Rock echo hue 168° (a greener teal, set off against the warm stone).
- **Light:** no natural light. Wet flowstone gives strong specular rims where the bat's warm light or an echo ring passes, so the walls seem to glisten for a beat.
- **Strata and detail:** flowstone draperies with translucent banding ("bacon strips") lit from behind by your glow; rimstone pools on floors; soda straws hanging in rows.
- **Parallax:**
  - Far: colossal columns where stalactite has met stalagmite, in amber haze.
  - Mid: curtain draperies.
  - Foreground: soda straws close to the camera, slightly out of scale.
- **Ambient life:**
  - A drip constellation: drops visible inside the bat's light, each with a tiny panned plink (at most 6 per second).
  - Ripple rings in floor pools.
- **Weather (drip rain):** some chambers have dense drip curtains. Inside them, echo voices are quieter and duller (low-pass 1.8 kHz), so you rely on the dots. The weather affects your hearing.
- **Sound:** constant soft dripping and an occasional deep settling groan. Reverb 3.5 s, long and warm.
- **Music, *Vaults*:**
  - A natural minor, 66 bpm.
  - Long-reverb pad, low bass pulse.
  - The bell track is quantised to real drips: plinks within 1 beat snap to scale notes.
- **Hazards:**
  - **Stalactites**, upgraded: real wet limestone with a dripping tip. Tells: a drop shaken loose first, then ticks and dust, then the fall. The crash shatters into a scatter of calcite.
  - **Drips**, upgraded: visible glinting drops with splash rings.
  - **★ Bell curtains:** flowstone draperies that ring when an echo ring hits them. The ringing shakes stalactites within 300 px. You can use it to clear a path from a distance, or trigger it by accident.
- **Landmark: the Organ.** A wall of draperies. Chirping it plays a chord that the music answers.
- **Secret:** rimstone pools holding **cave pearls** (Journal collectibles, +25 moths each).

### III. The Drowned Choir
*The flood's own cave: half air, half black water, and everything echoes twice.*
- **Palette:** water `#071A22`, surface light `#7FB8D8`, mist `#8FB4C4`, wet rock `#0F1C22`, caustic silver `#A9C6FF`, vignette tint deep blue-green `#020C10`. Water echo stays canonical blue.
- **Light:**
  - Caustics: animated additive sprite tiles on the ceiling above any lit water.
  - Echo reflections: each echo dot above the surface has a dimmed copy mirrored below it, rippling. This is High and Ultra only; on Low and Medium the surface line simply brightens.
- **Ambient life:**
  - Pale blind cavefish that flash silver when pinged and scatter.
  - Cave shrimp on the shallows.
  - Mist banks at water height, drawn as fog sprites on the water band.
- **Weather (tide):** water levels breathe ±12 px over 20 s. Mist is thicker in still chambers.
- **Sound:** lapping water, the gurgle of a distant siphon, fish splashes. Echo returns get a second slapback 120 ms later ("echoes twice"). Reverb 2.5 s.
- **Music, *Choir*:**
  - B minor, 60 bpm.
  - A slow-attack "choir" pad, a delay-heavy pluck.
  - A `deep` layer when the bat is below the main water line.
- **Hazards:**
  - **Rivers and current**, upgraded: visible flecks and foam lines.
  - **Flood and drips.**
  - **★ Siphons:** underwater holes that pull the bat down if it skims water within 90 px. Tell: a ring of rising bubbles and a sucking sound. Pull force 600 px/s², escapable.
- **Landmark: the Choir Stalls.** Rows of half-drowned stalagmites that hum when a gust passes.
- **Secret:** air pockets behind falling-water curtains. You fly through the curtain, and your echo dots break up as you pass.

### IV. The Amethyst Throat
*Where the hill's bones turned to glass.*
- **Palette:** rock `#120D1C`, crystal `#B48CFF` (canonical), magenta `#5A1E6E`, prism highlights `#FFFFFF`, `#9FF5FF` and `#FFB3E6`, vignette tint `#0A0412`.
- **Light:**
  - **Crystals hold your echo.** A pinged cluster glows for 4 s and dims slowly, so this biome is lit by your own voice.
  - Prismatic light rays come from big clusters, in 3 hues.
- **Ambient life:** floating mineral glitter (High+), drifting "geode bubbles" of trapped air, tiny violet moths.
- **Weather (resonance):** after a shriek, crystal-rich walls flash a soft violet wash and hum for 2 s.
- **Sound:** glassy ticks, very bright reverb (2.8 s). Re-echoes ring as bell partials.
- **Music, *Glass*:**
  - F lydian, 76 bpm.
  - Bells and pluck arpeggios.
  - Crystal re-echoes trigger bell notes in key, so the more you play, the more the music plays.
- **Hazards:**
  - **Crystals and re-echo**, upgraded: faceted sprites.
  - **★ Singing shards:** crystal spears that hum when lit. A shriek shatters them into a 1 s spray (−5 energy if inside it), clearing the way.
  - **★ Glass gates:** sealed passages that open when you chain 3 crystal re-echoes within 2 s. These are puzzles that need sonar mastery.
- **Landmark: the Throat.** A 600 px geode chamber, a natural cathedral of violet.
- **Secret:** a geode in every cave holding a Burnished Brass moth.

### V. The Windpipes
*The hill breathes here, and it whistles.*
- **Palette:** rock `#1A1414` (rust-grey), lit stone `#D9A38A` (pale terracotta), dust `#E8D2B8`, draft ribbons `#F0E6D8`, vignette tint `#0C0606`.
- **Light:** moon slits at the top of chimneys, with lit dust rising through them like smoke.
- **Ambient life:**
  - Dust ribbons: particle streams following the drafts' flow field, so you can see the wind.
  - Leaves and seeds sucked down from the surface.
  - Flute holes that whistle as the wind changes.
- **Weather:**
  - **Drafts:** persistent horizontal currents in some tunnels (±160 px/s² force).
  - **The Breath:** every ~30 s the cave's wind reverses. The music swells and the dust turns around 2 s before it happens.
- **Sound:** filtered noise swells used as an instrument, whistles tuned to the key. Reverb 1.5 s.
- **Music, *Pipes*:**
  - G minor pentatonic, 84 bpm.
  - Sine lead "flute", pad, and a `beat` track during the Breath.
- **Hazards:**
  - **Gusts**, upgraded: visible dust columns and a whistle that rises in pitch before a gust.
  - **★ Drafts** (above).
  - **★ Scree:** pebbles blown off ledges during gusts; small hits of −2.
- **Echo style:** dots drift downwind for their lifetime. This is useful as well as pretty, because it shows the air.
- **Landmark: the Great Flue.** A tall chimney with the full moon visible far above. Riding its updraft is a Note in cave 19.
- **Secret:** "still pockets", sheltered alcoves where moths swarm out of the wind.

### VI. The Lantern Roots
*The forest's roots break through the ceiling, and the ceiling is full of stars that eat.*
- **Palette:** rock `#0F120C`, loam `#2A2416`, root bark `#5A4632`, moss `#6F8F4A`, lantern-gnat light `#CFE8FF`, vignette tint `#060804`.
- **Light:** **lantern gnats** (a fictional cave fungus gnat whose larvae glow). Thousands of pale points cover ceiling regions, masked to rock, twinkling. They **dim when you shriek** and recover over 4 s, which makes shrieking a cost to the beauty around you.
- **Ambient life:** fungus gnats (tiny prey), swaying root tendrils (verlet strands, High+), drifting spores, a dormouse asleep in a root hollow (a Journal entry).
- **Weather (root rain):** soil trickles from the ceiling when an owl shifts somewhere above. It is an audio and visual tell of owl positions.
- **Sound:** earthy and dead, with a short 0.8 s reverb; creaking roots; owl hoots and feather-rustle accents.
- **Music, *Roots*:**
  - E dorian, 64 bpm.
  - Low drone, sparse twinkling bells.
  - A `danger` beat layer when any owl is alert.
- **Hazards:**
  - **Owls**, upgraded: a real tawny owl with silent wings and feather drift. Tell: its shadow swells across the lit area before the swoop.
  - **★ Glow-threads:** sticky lantern-gnat snares hanging from the ceiling. They glow faintly, moths get stuck in them (bait), and touching one snags you like a web.
- **Landmark: the Parliament Tree.** A single giant taproot pillar with owl roosts.
- **Secret:** hollow roots you can fly inside, tunnels through the wood.

### ✦ The Hush
*The bottom of the hill, where sound goes to be remembered.*
- **Palette:** near monochrome; void `#020205`. Echo dots are silver-white with each material's hue at only 30% saturation (still distinct).
- **Rules:**
  - Echoes never fade: `ECHO_LIFE ×3`, and the memory layer is at full strength.
  - Echo audio returns at double delay.
- **Ghost echoes:** the paths of the old colony replay through the walls as faint moving rings. Following them finds the way and the last secrets.
- **Light:** only yours, plus the Old Echo's faint silver ring at the end.
- **Music, *Hush*:** near silence, a 50 bpm drone and single bell tones. On meeting the Old Echo, the full theme from every biome comes back as one chord.

### Ambient life and particles per biome (budget per tier)

| Biome | Ambient kinds | Low | Med | High | Ultra |
|---|---|---|---|---|---|
| Chalkmouth | moon motes, harvestmen, crickets | 80 | 200 | 450 | 900 |
| Vaults | drips, pool rings, steam breath | 100 | 250 | 600 | 1200 |
| Drowned Choir | mist sprites, fish, caustics | 80 | 220 | 550 | 1100 |
| Amethyst Throat | glitter, bubbles, prism glints | 120 | 300 | 700 | 1400 |
| Windpipes | dust ribbons, seeds, leaves | 120 | 300 | 700 | 1400 |
| Lantern Roots | gnat stars (separate, sprite-batched), spores, tendrils | 100 + 300 stars | 250 + 800 | 600 + 2000 | 1200 + 4000 |

All ambient particles use a **cosmetic rng stream** separate from simulation, so a tier change never alters gameplay. Today `G.rng` mixes the two; splitting it is a prerequisite.

---

## 4. Campaign: cave by cave (v1, 25 caves)

**How caves are made:**
- Each cave has a **curated seed**. A tool script (`tools/pp-curate.cjs`, game-local) generates 200 seeds per cave spec and scores them: path length, number of chambers, room for a landmark, room for a secret, and autopilot clear time. It then stores the best seed in `js/data/caves.js`.
- Landmarks and set pieces are **stamped** into generated geometry: a chamber shape is carved at a chosen path point, and decor and lights are placed by data.
- Every cave has **three acts** along its length:
  - **Entrance (0-30%):** calm, moths plentiful.
  - **Heart (30-75%):** the landmark and the hazard density peak.
  - **Approach (75-100%):** the exit glimpsed, one final hazard gate, moths thin.

**Energy:** full (bat `E_MAX`) at each cave entry. Drain per second rises by chapter. Notes are the 3 missions of each cave (§8).

| # | Cave | Length (px) | H | Pups | Moths | Hazards | Landmark / secret | Notes (missions) |
|---|---|---|---|---|---|---|---|---|
| **I Chalkmouth** (drain 1.60/s) |||||||||
| 1 | Moonmouth | 3000 | 1040 | 1 | 24 | none | Moon shafts / crust niche | Bring the pup home · Eat 15 moths · Find the moon niche |
| 2 | Flint Row | 3400 | 1080 | 2 | 24 | webs | Flint galleries / Old Scratch I-1 | All pups · Exit with 70+ energy · Read the scratch |
| 3 | Shepherd's Crowns | 3800 | 1100 | 2 | 25 | webs, crusts | Fossil wall / Herald moth niche | All pups · Crack 2 crusts · Under 20 chirps |
| 4 | The Warm Chamber (finale) | 4200 | 1140 | 3 | 26 | webs, crusts | The old roost with its flood line; the colony reveal | All pups · Fewer than 3 bumps · Find the harvestmen hall |
| **II The Dripping Vaults** (1.70/s) |||||||||
| 5 | Soda Straws | 4400 | 1160 | 2 | 26 | stalactites | Straw forest / cave pearl | All pups · Dodge 4 falling stalactites · Find the pearl |
| 6 | Flowstone Stair | 4600 | 1200 | 3 | 26 | stalactites, drips, bell curtains | Drapery stair / Scratch II-1 | All pups · Clear a stalactite by bell · No drip hits |
| 7 | The Organ | 4800 | 1220 | 3 | 27 | all Vaults hazards, webs | The Organ / pearl | All pups · Play the Organ · Exit with 60+ |
| 8 | The Bell Chamber (finale) | 5200 | 1260 | 3 | 28 | cave-in run | A wave of falling stalactites chases you from the left at 150-190 px/s | All pups · Outrun the cave-in untouched · Find the Tissue moth |
| **III The Drowned Choir** (1.80/s) |||||||||
| 9 | The Weir | 4800 | 1260 | 3 | 26 | rivers | A waterfall weir / air pocket | All pups · Never splash · Ride the current 400 px |
| 10 | Mirrorpool | 5000 | 1300 | 3 | 26 | rivers, siphons | A still lake with reflections / Scratch III-1 | All pups · Ping 6 cavefish · Skim past a siphon |
| 11 | The Choir Stalls | 5400 | 1320 | 3 | 27 | flood, drips, siphons, stalactites | Choir Stalls / air pocket | All pups · Exit with 55+ · Under 30 chirps |
| 12 | The Rising (finale) | 5600 | 1400 | 4 | 28 | rising water | The cave floods from below at 9 px/s; take the high road | All pups · Never touch the rising water · Find the China-mark |
| **IV The Amethyst Throat** (1.90/s) |||||||||
| 13 | Glassweep | 5000 | 1320 | 3 | 25 | crystals | Prism hall / geode | All pups · Chain 2 re-echoes · Open the geode |
| 14 | Prism Gallery | 5400 | 1360 | 3 | 25 | crystals, singing shards | Prism rays / Scratch IV-1 | All pups · Shatter 3 shards safely · No shard hits |
| 15 | The Geode | 5600 | 1400 | 4 | 26 | crystals, shards, glass gates, owls | The Throat / geode | All pups · Open both glass gates · Exit with 50+ |
| 16 | The Choir of Glass (finale) | 6000 | 1420 | 4 | 27 | puzzle | The exit is sealed until 5 singing crystals ring in order | All pups · Ring them in under 40 s · Find the Large Emerald |
| **V The Windpipes** (2.00/s) |||||||||
| 17 | Flue Mouth | 5400 | 1400 | 3 | 25 | gusts, drafts | Chimneys / still pocket | All pups · Ride 2 gusts upward · No scree hits |
| 18 | Whistling Halls | 5600 | 1420 | 4 | 25 | gusts, drafts, scree, webs | Flute holes / Scratch V-1 | All pups · Fly the Breath without a bump · Find the Ghost moth |
| 19 | The Great Flue | 6000 | 1500 | 4 | 26 | all Windpipes hazards, rivers | The Great Flue / still pocket | All pups · Ride the Flue's updraft · Exit with 50+ |
| 20 | The Great Draw (finale) | 6200 | 1500 | 4 | 27 | global inhale/exhale every 6 s | Shelter alcoves | All pups · Never get blown back past a checkpoint · Under 35 chirps |
| **VI The Lantern Roots** (2.10/s) |||||||||
| 21 | Rootfall | 5600 | 1420 | 4 | 25 | glow-threads | Gnat ceiling / hollow root | All pups · Free 5 baited moths · Shriek no more than once |
| 22 | The Lantern Ceiling | 6000 | 1460 | 4 | 25 | owls, glow-threads | Star ceiling / Scratch VI-1 | All pups · Wake no owl · Find the Merveille du Jour |
| 23 | Hollow Roots | 6200 | 1500 | 4 | 26 | owls, threads, stalactites, crystals | Root tunnels / dormouse | All pups · Fly through 3 hollow roots · Exit with 50+ |
| 24 | Owl Parliament (finale) | 6400 | 1500 | 5 | 27 | 5 owls, threads | The Parliament Tree; a stealth route | All pups · Wake no owl · Find the Garden Tiger |
| **✦ The Hush** (2.20/s, ghost echoes) |||||||||
| 25 | The Hush | 7000 | 1500 | 6 | 30 | light mix of all | The Old Echo; final Old Scratch | All pups · Follow the ghost path · Find the Death's-head |

- **Total pups in the campaign: 79.** The Roost shows each one by name.
- **Checkpoints:** finale caves and the Hush have one **resting ledge** at about 55%. The bat hangs there for 1 s and the run is saved, with the energy you had. Other caves are short enough to replay from the start.

### Homeward Flights (one per chapter end, 30-45 s)
The chapter's rescued pups fly with you as a small swarm. You collect moths, you cannot die, and the flight is the payoff, not filler.

| After | Landscape | Moon | Event |
|---|---|---|---|
| I | Chalk downland, sheep, a hawthorn hedge | Waxing crescent | First flight of the pups: they wobble and learn |
| II | The old quarry and a lime kiln | First quarter | Moths rising off the kiln's warm stone |
| III | The millpond in mist | Waxing gibbous | A mayfly hatch: a moth bloom over the water |
| IV | Churchyard yews and a belfry | Full moon | The belfry colony joins you for 10 s |
| V | A windy ridge with a windmill | Waning gibbous | A gale: everyone tumbles, then regroups |
| VI | Ancient wood | Last quarter | An owl hunting pass, shown by its shadow |
| ✦ | Over the whole hill at dawn | Moonset, sunrise | **The swarming:** the whole colony and the Old Echo; then the credits over the Roost |

Night-flight fairness: the flight field is a fixed **1000×560 world band**. Portrait screens letterbox it with extra sky and land above and below, which is lovely for a tall moon. Moth spawns are defined per world px scrolled, not per screen.

---

## 5. Hazards and creatures: the full catalogue

| Hazard | Biome home | Data shape (registry) | Tell | Cost | Art upgrade (v1) |
|---|---|---|---|---|---|
| Web | I | existing | Dew drops in echo; spider | Time | Orb web with dew, spider retreats on tear |
| Chalk crust ★ | I | `{x,y,r,hp}` | Chalky echo with a crack pattern | None (a door) | Crumble particles, dust cloud |
| Stalactite | II | existing | Drop shaken loose, then ticks, dust, red rim | −10 | Wet limestone, calcite shatter, crash sonar |
| Drip | II, III | existing | Glint 0.45 s | −3, small stun | Visible drop, splash ring |
| Bell curtain ★ | II | `{x,y,w,h,ring}` | Shimmer when lit | Shakes stalactites in 300 px | Translucent banded drapery |
| River / current | III | existing | Blue echo, flecks | −3 per splash | Foam lines, reflection |
| Flood / rising water ★ | III | `{level, rate}` | Rumble, bubbles at the rim | −3 per touch, plus the push | Rising surface with caustics |
| Siphon ★ | III | `{x,y,r,pull}` | Bubble ring, suck sound | Pull | Swirl sprite |
| Crystal | IV | existing | Chime | Helpful | Faceted sprite, stored glow |
| Singing shard ★ | IV | `{x,y,len,ang}` | Hum when lit | −5 if in the spray | Spear plus shatter |
| Glass gate ★ | IV | `{x,y,h,need:3}` | Violet seal | Blocks a route | Sealed crystal membrane |
| Gust | V | existing | Rising whistle, dust column | Displacement | Visible dust column |
| Draft ★ | V | `{rect, fx, fy}` | Dust ribbons | Steady push | Ribbon particles |
| Scree ★ | V | `{ledge, period}` | Rattle | −2 | Pebble sprites |
| Owl | VI | existing | Shadow swell, hoot, root rain | −16 | Tawny owl sprite, 4-frame swoop, feather drift |
| Glow-thread ★ | VI | `{x,y,len,bait}` | Faint glow | Snare (like a web) | Beaded silk, glowing larvae |

Every hazard module is one file in `js/gen/hazards/`, exporting `{ place(lv, r), update(dt), ping(sonar), draw(ctx, tier), sound, journal }`. Biomes enable hazards by name with weights.

### Moth species (Journal collectibles, all real except the lantern gnats)

| Biome | Common | Uncommon | Rare (and its behaviour) |
|---|---|---|---|
| I | Silver Y | Chalk Carpet | **Herald** (overwinters in caves; sleeps on walls and wakes when pinged) |
| II | Old Lady | Brimstone | **Tissue moth** (cave dweller, translucent wings) |
| III | Mayfly (water insect) | Caddisfly | **Brown China-mark** (skims water; Daubenton's catches it easily) |
| IV | Rosy Footman | Large Emerald | **Burnished Brass** (metallic, flashes gold in echo) |
| V | Angle Shades | Feathered Thorn | **Ghost moth** (hovers dead still; easy to miss) |
| VI | Fungus gnat swarm | Elephant Hawk-moth (fast, flees, worth 5) | **Merveille du Jour** (lichen camouflage: invisible in light, visible only in echo dots) / **Garden Tiger** (clicks back: when lit, your echo dots within 120 px jitter for 1 s) |
| ✦ | — | — | **Death's-head Hawkmoth** (squeaks; you hear it before you see it) |

Rare moths: +10 moths, a Journal page and a 4K "specimen" illustration in the Journal.

**Cave life** (Journal only, 12 entries): cave orb spider, harvestman, cave cricket, blind cavefish, cave shrimp, lantern gnat, tawny owl, dormouse, cave pearl, Herald hibernation cluster, chalk fossil urchin, the Old Echo.

---

## 6. "Full 4K": what it means and how it is built

### 6.1 Definition
1. **Native resolution, with no upscaled art.** At 3840×2160 every element is drawn or cached at ≥ 1 texel per device pixel on the Ultra tier:
   - Rock rims, echo dots, bat, pups, moths, hazards and HUD at 1:1.
   - Rock texture at ≥ 0.75:1 (with smoothing).
   - Soft layers (sky, far parallax, fog, darkness mask) at reduced scale. They are blurry by nature, so this is invisible.
2. **The same game everywhere.** Field of view, sonar coverage, moth counts and hazard timing are identical across devices and tiers. Tiers only change fidelity, never information.
3. **Phones at full device pixel ratio.** On High, DPR up to 3 (a 390×844 @3 phone renders 1170×2532).
4. **60 fps held by tiers and a dynamic resolution governor.** It never stutters into a "4K slideshow".
5. **Detail that rewards a big screen.** Fossils in the chalk, harvestmen legs, caustics, crystal refraction lines, beaded silk on glow-threads, owl feather texture, moth wing patterns, the fur rim on the bat. These appear only where the screen can resolve them (§6.6).

### 6.2 Camera: a constant visible world area
`zoom = min( sqrt(viewW × viewH / 480,000), viewH / 540 )`, clamped to [0.75, 6], in CSS px per world px.

| Viewport (CSS) | zoom | Visible world | Bat share of the short side |
|---|---|---|---|
| 390×844 (portrait phone) | 0.83 | 470×1017 | ~8% |
| 1280×800 | 1.46 | 876×548 | ~8% |
| 1920×1080 | 2.00 | 960×540 | ~8% |
| 3840×2160 | 4.00 | 960×540 | ~8% |

The ~8% figure is an estimate, not yet measured: the four rows share it because the 540 world px height floor binds on every landscape screen, while the portrait phone sees about 1017 world px of height. Check the phone row against a capture.

This fixes the main 4K bug, where the whole cave was visible and the mystery gone. It also makes missions fair across devices. The camera eases toward the flight direction with a 120 px lead, and pulls back 8% during a shriek.

### 6.3 Two canvases, reassigned
- **`#pp-back`** (opaque, reduced scale) holds only what is soft:
  - sky strip;
  - far, mid and near parallax (`gfx.layers`, DPR-aware, painted per biome);
  - fog bands;
  - distant ambient lights (gnat ceilings in far layers, moon haze).
- **`#game`** (full resolution, tier DPR) holds everything sharp, back to front:

```
 1  rock chunks (only chunks in view, smoothing on)
 2  darkness mask (stretched from tier scale; holes for bat, rings, crystals, landmarks, biome lights)
 3  memory layer chunks (additive 0.55)
 4  biome light sprites (additive, bloom = core + halo sprite, no blur filters)
 5  water surface, caustics, reflections (High+)
 6  entities, hazards, moths, pups
 7  rings, echo lines, echo dots (biome dot style)
 8  bat, trail pups, fx
 9  foreground occluders (depth 1.3, dark silhouettes, rim-lit by the bat's glow)
10  near-camera motes (depth 1.6, large soft "bokeh" sprites, High+)
11  tinted vignette sprite (per-biome colour), grain (High+)
12  HUD (UI-scaled, safe-area anchored)
```

The rock moving from the back layer onto the main canvas is the single biggest sharpness fix. The darkness mask on `#game` darkens the back canvas too, so the back canvas can stay cheap. The back canvas draws parallax only in the bands the layer painted, as `gfx.layers` already does.

### 6.4 Chunked cave art
Whole-cave images are impossible at 4K: a 9000×3000 cave at 3 texels per px is 243 MP, past the texture limits of iOS and many Android GPUs.

- **Chunks:**
  - The world is cut into 256×256 world-px chunks, painted on demand.
  - Texel density `d = quantize(zoom × dpr × renderScale)` from the set {0.5, 1, 1.5, 2, 3}, capped by the tier.
  - The cache is an LRU with a per-tier memory cap.
- **Paint priority:** visible chunks first, then 1 chunk of margin along the flight direction. At most 2 chunks painted per frame (~2-5 ms at d = 3), and 6 per frame behind the cave-entry fade.
- **Painter per chunk (biome painter params):**
  1. Base fill: a depth gradient by world y.
  2. Strata: sine-warped bands from the biome palette, seeded by cave seed and biome (not by cave index alone, as today).
  3. Ambient occlusion: darkening toward open air using the smoothed `field`.
  4. Two-octave noise from a 512 px noise texture, tiled at density-appropriate scale so it never repeats visibly.
  5. **Rims:** marching-squares `segs` stroked at full chunk density with the biome rim colour. Crisp at any zoom.
  6. Decals (High+): fossils, flint nodules, flowstone banding, crystal veins, root fibres. Stamped from a per-biome sprite atlas painted at device density, placed by the cosmetic rng.
- **Memory layer:** the same chunk grid at `min(d, 1.5)`. Echo memory is soft by design. `memFlush` is batched: one path per colour bucket per frame.
- **Low and Medium fallback:** chunks at d ≤ 1.5, decals off, rims still vector-crisp.

### 6.5 Light, bloom and banding
- **One glow atlas** replaces the single 128 px glow sprite: 64, 256 and 512 px falloff sprites with **baked ordered dither** (±1/255). The draw picks the smallest size ≥ the light's on-screen radius ÷ 2. This removes the 8-bit banding seen at 4K.
- **Bloom without blur:** each important light is a tight core sprite plus a wide halo sprite, both additive. There are no `ctx.filter` or `shadowBlur` passes over large areas.
- **Darkness mask** at tier scale. Holes use the same dithered sprites, so the edges stay smooth when stretched.
- **Per-biome colour grading** is done with palettes, tinted vignettes and light colours only. There are no full-screen `overlay` or `multiply` passes, per the kit's performance rules.

### 6.6 Level of detail
- **Size rule:** don't draw anything smaller than 2 device px. Detail flagged `hi` (harvestmen legs, fossil ribs, beaded silk, feather texture, moth wing pattern) draws only on High and Ultra and only when it would be ≥ 6 device px.
- **Gameplay silhouettes never depend on tier.** A rare moth on a Low-tier phone is still recognisable by colour, size and its extra glint. Its wing pattern is a 4K reward.
- **Per-tier sprite caches** (bat, moth species, owl, pups): painted at the current `gfx.dpr × zoom` bucket and rebuilt when the bucket changes.

### 6.7 Quality tiers

| Setting | Low | Medium | High | Ultra |
|---|---|---|---|---|
| Intended for | Old phones, software raster | Most phones | Flagship phones, laptops | Desktops, 4K TVs and monitors |
| DPR cap | 1.25 | 2 | 3 | 3 |
| Main-canvas pixel budget (`maxPixels`) | 1.2 MP | 2.6 MP | 4.5 MP | 8.3 MP (native 4K) |
| Back-canvas scale (× main) | 0.4 | 0.5 | 0.6 | 0.6 |
| Darkness-mask scale (× main) | 0.2 | 0.25 | 0.33 | 0.33 |
| Rock texel density cap | 1 | 1.5 | 2 | 3 |
| Chunk cache | 16 MB | 32 MB | 64 MB | 128 MB |
| Parallax layers | 2 | 3 | 3 + foreground | 3 + 2 foregrounds + depth fog |
| Ambient particles | §3 table | | | |
| Light rays per source | 0 | 6 | 10 | 16 |
| Echo dot sprite size | 16 px | 32 px | 64 px | 96 px |
| Water reflections, caustics | off | caustics only | on | on |
| `hi` decals and details | off | off | on | on |
| Dynamic-resolution floor (× budget) | 0.6 | 0.65 | 0.7 | 0.6 |

**Unchanged in every tier:** sonar ray counts, ring pools (raised to 6,000 dots and 4,000 lines so shrieks never overwrite), echo lifetimes, hazard behaviour, camera.

### 6.8 Auto tier and the dynamic-resolution governor
- **Boot pick:**
  - Medium on phones.
  - High when `hardwareConcurrency ≥ 8` and `deviceMemory ≥ 6`.
  - Ultra only on non-touch screens over 4 MP with ≥ 8 cores.
  - The 2 s attract mode behind the title then confirms or lowers the pick.
- **Governor (each frame):**
  - Track the median frame interval over 9 frames and the JS plus draw time.
  - Over 18.5 ms for 90 frames: `renderScale −= 0.1`, down to the tier floor.
  - Under 13 ms with headroom for 300 frames: `+= 0.05`.
  - Canvas resizes at most once every 2 s. Chunks re-quantise lazily, keeping the stale density scaled in the meantime.
  - At the floor and still slow for 5 s, Auto drops a tier silently. A manually chosen tier shows one toast instead: "Try Medium for a smoother flight."
- **Optional 30 fps lock** (Settings) for battery, which also relaxes the governor.
- **Contract check:** game-check measures 390×844 @2 in software raster. Auto starts at Medium there (1.3 MP main, 0.33 MP back) and the governor moves within ~1.5 s, so the p95 target stays ≤ 25 ms. Verify every phase of the build against it.

### 6.9 UI at every size
- **UI scale:** `u = clamp(minSide / 540, 1, 4) × userTextSize` (90-130%). That gives 1.0 on a phone, 1.48 at 1280×800, 2.0 at 1080p and 4.0 at 4K.
- **HUD:** drawn on the canvas, anchored to safe-area corners rather than a centre column. Energy as moth-wing pips (count from the bat's `E_MAX`) top left; Larder and multiplier top right; Notes tracker bottom left, as 3 small glyphs that light up as you go.
- **DOM menus:** `rem`-based, root font size `16 × u`. The wordmark is an SVG sized in `vmin`, so "Pipistrelle" never wraps.

### 6.10 Verification for 4K
Every phase captures the same 6 scenes, one per biome, at 390×844 @3, 1280×800 @1 and 3840×2160 @1, plus a native-resolution crop of the bat, a rock rim and a light edge. The bar:
- no stair-stepped rims;
- no visible banding;
- the HUD in its corners;
- frame-time numbers logged per tier.

Capture scenes use the **same tier as play** (High or Ultra), never a special `hiQ` path that makes store art better than the real game.

---

## 7. Audio and music

- **Ambience bed per biome:** 3 synthesised layers, each one or two `Kit.sfx` voices or long filtered-noise loops:
  - a **bed** (wind, water, hum);
  - a **texture** (crickets, drips, whistles, gnat ticks) with random panning;
  - a rare **accent** (rumble, owl, splash, settling stone) every 8-20 s.
- **Echo voices take on the biome:** reverb send (Chalk 0.2 … Vaults 0.6 … Hush 0.9), low-pass, the Choir's slapback, the Throat's bell partial, the Roots' dead short tail. The echo is the game's most important sound, so it sounds like the place.
- **Music:**
  - One `Kit.music` song per biome as song data (key, scale, bpm and instruments from §3).
  - Shared adaptive layers in every song:

| Layer | Comes in when |
|---|---|
| `pups` | 2 or more pups trail you |
| `danger` | A warned hazard is within 300 px, or an owl is alert |
| `exit` | The arch is within 600 px |
| `deep` | The second half of the cave |

  - Diegetic links:
    - Organ chord (Vaults).
    - Re-echo bells (Throat).
    - The Breath swell (Windpipes).
    - Drips quantised to the beat (Vaults).
- **Ducking:** shriek, hurt, exit, fall (as today), plus a 2 s near-silence when entering the Hush.
- **Mix settings:** master, music, effects, ambience, and a separate **echo volume** (the gameplay channel). There is also an "echo emphasis" accessibility option that ducks music during returns.
- **v1 sfx additions (~14):** crust crumble, bell curtain, siphon, shard hum and shatter, gate open, draft whistle, scree, glow-thread snag, gnat dim, cavefish flash, rare-moth chime, Note earned (a three-note chord: each Note is one chord tone), and the Roost's pup chatter.

---

## 8. Missions: Notes, Requests, Carvings, Journal

### Notes (3 per cave, 75 in v1)
Each cave's Notes form a chord. Earn all 3 and the cave "sings" on the Echo Map: its dot outline glows and plays its chord when tapped.

| Slot | Kind | First-time reward |
|---|---|---|
| 1 | **Homecoming**: rescue every pup | 40 moths |
| 2 | **Skill**: a biome-specific trick or restraint | 60 moths |
| 3 | **Exploration**: secret, scratch or rare moth | 80 moths |

**Templates** (used by `js/data/missions.js`, bound to the event bus):

| Template | Parameters |
|---|---|
| All pups | — |
| Exit with ≥ E energy | E |
| ≤ N chirps / ≤ N shrieks | N |
| ≤ N bumps | N |
| No damage from a given hazard kind | kind |
| Exit under T s | T |
| Read the Old Scratch | — |
| Find the secret | — |
| Catch a given moth species | species |
| Crack N crusts / clear a stalactite by bell / chain N re-echoes / open the gates | N |
| Ride the current D px / ride N gusts / never splash | D, N |
| Wake no owl / free N baited moths | N |
| Outrun the cave-in untouched / never touch the rising water | — |

Notes do **not** gate chapters; finishing a finale does. Notes unlock Journal pages, Roost decor and the Old Echo's last secret, which needs 60 of 75.

### Colony Requests (3 open at a time)
The elders ask, and a request is replaced only when you complete it: never on a timer, never expiring.

| Elder | Example request | Reward |
|---|---|---|
| Bracken | "Bring 10 more pups home." | 150 |
| Bracken | "Return every pup in a whole chapter." | 300 + a moss bed |
| Old Ash | "Read three scratches." | 120 |
| Old Ash | "Fly the Hush listening only: under 15 chirps." | 300 |
| Tally | "Catch 3 Garden Tigers." | 200 |
| Tally | "Bank 150 moths in one Long Night cave." | 250 |
| Tally | "Chain 5 crystal re-echoes in one cave." | 200 |

### Carvings (achievements, 30)
Cosmetic marks carved into the Roost wall, for example:
- *First Light* (finish Chapter I);
- *Echo of an Echo* (a re-echo hits another crystal);
- *Featherless* (finish Owl Parliament without waking an owl);
- *Full Larder* (bank 10,000 total);
- *Old Voices* (all 19 scratches).

### Journal
Tabs:
- **Moths:** 19 species, with a 4K specimen plate each.
- **Cave Life:** 12 entries.
- **Old Scratches:** 19.
- **Pups:** 79, each with a generated name (Sloe, Bramble, Tansy, Wick, Hazel, Rook, Fennel…), the cave they were found in, and the bat that rescued them.
- **Places:** 25 caves with best bank, Notes and the cave's echo outline.
- **Carvings.**

---

## 9. Bats: the Perch

Each bat is a real species and the "home species" of one biome, a sidegrade that suits its home. Every cave can be finished with the Common Pipistrelle. There are no stat upgrades to grind. Stats are relative to today's constants:

| Base value | |
|---|---|
| BAT_R | 8 |
| ACC | 1050 |
| MAXV | 255 |
| E_MAX | 100 |
| Chirp | radius 420, cooldown 0.6 s |
| Shriek | radius 840, cooldown 3 s |
| ECHO_LIFE | 2.2 s |
| Drain | ×1.0 |

| Bat | Price (moths) | Available after | Body / speed | Energy & drain | Sonar | Ability | Weakness | Look |
|---|---|---|---|---|---|---|---|---|
| **Common Pipistrelle** | Starter | — | R 8, ACC 1050, V 255 | 100, ×1.0 | 420 / 0.6 s; shriek 840 / 3 s; life 2.2 s | Balanced | — | Today's bat, refined: brown, big ears, fangs, warm glow |
| **Soprano Pipistrelle** | 500 | Cave 2 | R 7.5, ACC 1120, V 260 | 90, ×0.95 | 360 / **0.35 s**; life 1.8 s | **Twitter:** a double tap fires a 2-chirp burst | Shorter reach | Slimmer, chestnut, pale muzzle; higher-pitched chirp |
| **Brown Long-eared** | 1,000 | Chapter I done | R 8, ACC 950, V 225 | 100, ×0.95 | 400 / 0.6 s; **life 3.4 s** | **Listen:** glide 0.6 s with no input and moths and pups within 300 px show as faint gold and rose ripples | Slower | Enormous ears that fold back in flight |
| **Daubenton's** | 1,800 | Cave 9 reached | R 8, ACC 1050, V 250 | 100, ×1.0 | 420 / 0.6 s | **Skimmer:** water never hurts; skimming gives +15% speed and ignores current; catches water moths | Gusts and drafts ×1.3 | Pale belly, big trawling feet |
| **Noctule** | 2,600 | Chapter III done | **R 10**, ACC 1200, **V 310** | **130, ×1.25** | 460 / 0.7 s; **shriek 1100** | **Highflier:** +25% moths on Homeward Flights | Wide body in tight tunnels | Golden fur, long narrow wings |
| **Barbastelle** | 3,600 | Chapter V done | R 7.5, ACC 1000, V 245 | 100, ×1.0 | 380 / 0.6 s; shriek 760 | **Whisper:** owls never wake from sonar (only from contact within 70 px); gnats don't dim; webs and threads hold 40% shorter | Shorter range | Near-black, pug face, joined ears |
| **Lesser Horseshoe** | 4,500 | Chapter VI done | R 7, ACC 1000, V 235 | 90, ×1.0 | **Beam:** a 70° cone reaching 700 px in the facing direction, dense; shriek is a full ring of 800 | **Hang:** hold still under a ceiling to hang; drain ×0.25 while hanging (can't eat) | Narrow view | Tiny, horseshoe noseleaf, wraps itself in its wings |
| **Greater Horseshoe "The Old Echo"** | Earned (finish the Hush) | — | R 9, ACC 1050, V 265 | 120, ×1.0 | Beam and ring; **life 4 s**; memory layer ×2 | **Remembering:** your memory layer starts each cave with the ghost path faintly shown | — | Silver-grey, scarred ears, a faint silver ring |

- **Total to buy all six: 14,000 moths.**
- **Unlock gates** are progress, not grind: a bat becomes purchasable when you reach its home biome.
- **Bat art** is parametric (`js/render/batArt.js`): ear length and shape, noseleaf, fur hue and rim, wing span ratio, membrane tint and translucency, body size, face shape and wingbeat rate. The same code draws the Perch preview, the HUD icon and the bat in play.
- **The Perch** shows each bat flying a small sonar-lit practice tunnel, so you hear and see its sonar before buying. Stats appear as bars against the Pipistrelle. Buying takes one confirm ("Spend 2,600 of your 3,140 moths?").
- **v1.1:** "Coats", cosmetic fur and wing tints per bat earned through Carvings, never sold.

---

## 10. Economy

**One currency: Larder moths.** It never decays, cannot be bought, and every price is fixed and visible.

### Earn rates

| Source | Amount |
|---|---|
| Cave cleared | Banked = carried × (1 + pups in trail). Chapter I typically 20 × 2.5 ≈ 50; Chapter VI ≈ 26 × 3.5 ≈ 90 |
| First-time Notes | 40 / 60 / 80 (75 Notes ≈ 4,500 total) |
| Chapter finale first clear | 200 |
| Homeward Flight | 1 per moth, 3 per gold moth (~25-45 per flight) |
| Requests | 80-300 |
| Rare moth | +10 |
| Cave pearl | +25 |
| Tonight's Flight | 150, first attempt each day |
| Long Night | Banked per cave, same as campaign |
| Falling in a cave | Keep nothing carried from that cave; keep everything banked before it |

### Pace
- ~35-45 moths per minute of active play.
- A first campaign completion yields ~8,000 moths in about 2.5-3.5 hours.
- All bats plus the core Roost decor (~20,000 total) take about 7-9 hours.
- Long Night and Notes replays supply the rest naturally.

### Roost decor (cosmetic, part of the "pups come home" payoff)

| Item | Price |
|---|---|
| Moss bed | 150 |
| Lantern-gnat string | 200 |
| Drip-bell | 300 |
| Larder jar display | 250 |
| Widened moon window | 400 |
| Crystal from the Throat | 600 |
| Flowstone curtain | 500 |
| Root lanterns | 450 |
| Old Ash's scratch wall (earned) | — |
| Pup nursery shelves | 900 |

There are 15 items in v1, about 6,000 moths in total.

### Hard rules
- No real money, no ads, no loot boxes, no energy or lives, no timers or expiring offers, no streak loss.
- No "almost there" nags: progress toward the next bat appears once, on Results.

---

## 11. Progression and the first hour

| Minute | What happens |
|---|---|
| 0 | Title at dusk. Fly. Moonmouth (cave 1) starts at once; the tutorial is the cave itself (§13) |
| 2 | First Results: the first pup is named and "Sloe is home." The Roost opens with one pup hanging in an empty, flood-stained chamber |
| 5 | Cave 2: webs. First Old Scratch. Soprano Pipistrelle visible on the Perch (500) |
| 10 | Cave 3: crusts teach the shriek. First rare moth (Herald) |
| 15 | Finale: the Warm Chamber colony reveal. Homeward Flight I over the downs. The Roost dries a little and 3 adults return. Long Night and Tonight's Flight unlock |
| 20 | First purchase likely (Soprano at 500, or saving for Long-eared at 1,000) |
| 25 | Chapter II begins: amber light, the Vaults music. The first time the world clearly changes |
| 60 | Mid Chapter II or III; 2 bats owned; Requests flowing |

The Roost changes per chapter:
- The flood line fades.
- Adults return (2-4 per chapter).
- Lantern-gnat light creeps in once Chapter VI is done.
- After the Hush, the Old Echo hangs above everyone.

---

## 12. Screens and menus

| # | Screen | Contents | Notes |
|---|---|---|---|
| 1 | **Title: Dusk at Chalkmouth** | Hill in cross-section at dusk, bats streaming out, real moon phase; SVG wordmark; Fly / Continue (Cave N) | Attract mode (the existing self-playing cave) runs behind as the camera drifts in |
| 2 | **Roost (hub)** | A living diorama: your bat, named pups in clusters, elders, decor. Targets: Fly (Echo Map), Perch, Journal, Requests, Long Night (a dark crack), Tonight's Flight (moon window), Settings | The heart of the meta; every rescue is visible here |
| 3 | **Echo Map** | Hollin Hill cross-section; caves drawn as sonar dot outlines that fill in as explored; Notes per cave; locked caves faint | Tap a cave to open its card |
| 4 | **Cave Card** | Name, biome line, 3 Notes, pups x/y, best bank, hazard icons (a new hazard shows as "?"), bat switcher, Fly | |
| 5 | **Play** | HUD (§6.9) | |
| 6 | **Pause** (Kit.shell) | Resume, Restart cave, Leave to Roost, How to play, Sound, Vibration, Quality, Back to games (embedded) | Kit.shell pause, themed |
| 7 | **Exit moment** | Moonlit arch, haul count-up, pups fly out | In-world, as today |
| 8 | **Results "Home"** | Banked, Notes earned (chord), pups named, Journal entries, Larder total, next bat progress (once); Next / Roost / Replay | |
| 9 | **The echoes fade** (fall) | Quiet card with no confetti: what you found, one tip from Old Ash, Retry / Roost | Pups in the trail return to their hanging spots; nothing is lost permanently |
| 10 | **Homeward Flight** | Per-chapter landscape | |
| 11 | **Chapter interlude** | 6 s wordless Roost vignette and a scratch line | |
| 12 | **Perch** | Bat carousel, practice tunnel preview, stat bars, ability, price, buy | |
| 13 | **Journal** | Moths, Cave Life, Scratches, Pups, Places, Carvings | |
| 14 | **Requests** | 3 elder requests | |
| 15 | **Long Night** | Best, deepest cave, bat choice, Start | |
| 16 | **Tonight's Flight** | Moon calendar of nights flown (no streak), Start | |
| 17 | **Settings** | Audio (master, music, effects, ambience, echo); Haptics; Graphics (Auto/Low/Medium/High/Ultra, live resolution scale, 30/60 fps, show fps); Accessibility (echo shapes, high-contrast echoes, reduce motion, text size, left-handed stick, shriek hold 600-1400 ms, auto-chirp assist every 2/3/4 s, Gentle Dark with drain ×0.75); Controls (key map); Data (reset with double confirm) | |
| 18 | **Credits** | Over the Roost at dawn | |
| 19 | **Ending** | Swarming flight, then credits | |

**Echo shapes** is a colourblind mode where shape carries the meaning: rock dots are round, water dots are horizontal dashes, crystal dots are diamonds, danger dots are triangles, food dots are four-point stars and pup dots are small hearts.

### Contract integration (Kiln)
- **Front end:** the screens are a DOM layer (`js/ui/`) shown during the shell's `title` phase. Fly calls `shell.start()`, so `onStart` launches the selected cave or mode.
  - `__kilnTest.start()` starts the next campaign cave, or cave 1 on a fresh profile, from any menu.
  - Phase is `play` in a cave and `title` in menus.
  - The whole front end hides in `?keyart`.
- **Pause:** uses Kit.shell's pause menu (Back to games, Sound and Vibration stay), themed with `panel: 'glass'`, `font: serif` display, and colours from the biome.
- **Results:** `shell.over` would show the kit's game-over panel, with confetti on a new best. **Prerequisite decision:**
  - Preferred: a small kit option, `shell.over({ panel: false })`, which logs `runEnd` and sets phase `over` without the panel, so Pipistrelle shows its own Results and fall screens.
  - Fallback: theme the shell's panel with `title: 'Home'` or `'The echoes fade'` and skip celebration for campaign runs.
- **Scores:** each cave or Long Night run reports `runEnd` with score = moths banked and `props: { mode, cave, bat, biome }`. The Kiln best shown in the hub is the Long Night best (`mode: 'long'`). Campaign runs report `new_best: false`.
- **Progress:** `Arcade.progress({ label: 'Chapter III · The Weir', pct: cavesCleared / 25 })`.

---

## 13. Onboarding and feedback

- **Cave 1 is the tutorial** (keep the ghost hand), told through the place:
  1. A moon shaft lights the first metres. Fly.
  2. The shaft ends: "Tap to chirp." The ring paints the tunnel.
  3. A moth flutters in your glow: eat it.
  4. A pup hangs in a lit niche. Fly through it, and its heart pops.
  5. At the arch: "Every pup multiplies what you bring home." The count-up shows ×2.
- **Every new hazard gets a staged first encounter,** in a safe side room where you watch it before it threatens you:
  - a stalactite falls on a moth ahead of you;
  - an owl swoops at a cricket;
  - a siphon swallows a leaf.
  
  A Journal entry slides in for 2 s in the corner. Banners never sit over the play area: hints sit in the HUD's bottom-left corner for at most 2.5 s, and the Cave Card previews new hazards before you fly.
- **The shriek is taught by need:** cave 3's crust niches can only be opened with a shriek.
- **The multiplier is shown, not told:** pups' hearts float over the haul at the exit. The Results screen names each pup.
- **Juice:**
  - A moth gives a gold sparkle and a rising pitch on streaks.
  - A pup gives hearts and a rose ring.
  - A hazard hit gives 60 ms hitstop, a red rim flash and a shake scaled to damage.
  - An exit gives moonlight, a music swell and slow-motion for 0.4 s.
- **"Next goal" teaser on Results:** one line, such as "Find the Organ's pearl" or "Barbastelle: 1,240 / 3,600".

---

## 14. Saves and migration

**Profile v2** is one `Arcade.store` key, `profile`:

```
{ v: 2, larder, lifetime:{moths, pups, chirps, shrieks, caves, falls, time},
  bats:{ owned:[...], selected }, caves:{ [id]:{ cleared, notes:[0,1,1], best, pups:[...] } },
  pups:[{ id, name, cave, by }], journal:{ moths:{}, life:{}, scratches:[], carvings:[] },
  requests:[...], roost:{ decor:[...], placed:{} }, daily:{ lastDate, flown:[...] },
  long:{ best, deepest, run:{...} | null }, settings:{ tier, scale30, audio:{...}, a11y:{...} },
  tutorial:{ done, seenHazards:[...] } }
```

**Migration from v1** (runs once, then the v1 keys are left in place untouched):

| v1 key | Becomes |
|---|---|
| `best` | `long.best` |
| `taught` | `tutorial.done` |
| `run` | `long.run` (Continue still works, now under Long Night) |
| `runs` | `lifetime.caves` (estimate) |

- **Returning-flier gift:** `larder += min(best, 1000)`.
- **Registry:** `saves: 'profile'`.
- **Saving:** mid-cave saves happen only at resting ledges, plus the run state of Long Night as today. A campaign cave left mid-flight restarts at its entrance.

---

## 15. Scope: what ships in v1, and what comes later

| Area | v1 (this build) | v1.1 | Later (v2, standalone app) |
|---|---|---|---|
| Biomes | 6 + the Hush | Ember Seep, Rime Hall (8 caves) | The Old Workings (abandoned mine) |
| Caves | 25 curated + Long Night + daily | +8 | Hand-authored set-piece rooms, vertical-shaft generator |
| Bats | Starter + 6 purchasable + the Old Echo (earned) | Coats (earned cosmetics) | 2 more species |
| Hazards | 7 upgraded + 9 new | Steam, thin ice, ice stalactites | Chase set pieces beyond rising water and cave-in |
| Missions | 75 Notes, Requests, 30 Carvings, Journal | Weekly "expeditions" (still no expiry) | — |
| Homeward Flights | 6 + dawn swarm | Weather variants | — |
| 4K | Tiers, governor, chunked rock, glow atlas, UI scale, per-biome art | **Photo mode** (pause, hide HUD, free camera, native 4K PNG save) | — |
| Audio | 7 songs, 7 ambience beds, biome echo FX | Per-cave motif variations | — |
| Input | Touch, keyboard | Gamepad | — |
| Ship | Inside Kiln | — | Own Capacitor shell, store page |

### Build plan for a small team of agents (days, in order)

| Day | Work |
|---|---|
| 1 | **Module split** per the technical map (`js/core.js` … `js/debug.js`, classic scripts and a `PP` namespace) with no behaviour change; `test.cjs` and game-check stay green. Split rng into `gen`, `sim` and `fx` streams. Add the event bus. Decide the `tools/bundle.cjs` question (inline local scripts, or exclude Pipistrelle from the single-file bundle) and update `GAME_CONTRACT.md` to allow multi-file games. |
| 1-2 | **Render core:** camera rule, two-canvas reassignment, chunked rock and memory, glow atlas, tiers and governor, UI scale, safe-area HUD. Verify at the 3 sizes against game-check's frame budget. |
| 2-3 | **Biome packs in parallel,** one agent per biome, against the schema in §3: palette, strata painter and decals, parallax painters, foreground, lights, ambient particles, weather, ambience bed, song data, echo dot style. Each pack ships with a capture scene. |
| 3 | **Hazard registry:** port the 7 existing hazards to modules with upgraded art; add the 9 new ones. |
| 3-4 | **Profile and economy:** migration, parametric bat art, the Perch, bat stats wired through every former constant (about 40 sites). |
| 4-5 | **Campaign:** seed curation script, `caves.js` (25 entries), landmark and set-piece stamping, the 4 finale mechanics (cave-in, rising water, glass choir, Breath and the Great Draw) plus Owl Parliament's stealth layout, Notes and Requests, the Journal. |
| 5 | **Front end:** title, Roost, Echo Map, Cave Card, Results, fall screen, settings; Kit.shell integration. |
| 5-6 | **Homeward Flights, Long Night, Tonight's Flight,** the Hush and ending. |
| 6-7 | **Onboarding, mix and polish,** captures per biome, test expansion. |

### Test additions (`test.cjs`)
- All 25 campaign caves generate deterministically, and the safe autopilot reaches each exit.
- Each hazard module: place, tell, effect.
- v1 → v2 migration from fixture saves.
- Purchase flow, including a refusal when the Larder is short.
- Notes fire from bus events.
- Tier switches keep the simulation fingerprint identical.
- Keyboard play.
- A UI-scale layout check at 3840×2160.

### Risks and mitigations
- **Chunk painting hitches on low phones.** Paint behind the cave-entry fade, use a 2-per-frame budget with prefetch, and fall back to the Low density of 1.
- **WebView memory.** Per-tier LRU caps; release chunks on cave exit; one cave in memory at a time.
- **Game-check frame budget.** Auto starts at Medium, the governor adapts fast, and back-canvas passes stay ≤ 4.
- **Generator limits.** It stays a left-to-right generator. Set pieces are mechanics layered on that shape (rising water, a cave-in wave, gates, global wind), not new geometry types. Vertical shafts wait for v2.
- **Content volume.** Biome packs and hazard modules are data plus small painters with a fixed schema, so agents can build them in parallel and review each against a capture.
- **Shell results.** This needs the small `panel: false` kit option, or the themed fallback (§12).

---

## 16. Why this will feel original
- **Light and sound become a mechanic:**
  - crystals that store your echo;
  - lantern gnats that dim when you shriek;
  - drip rain that dulls your hearing;
  - the Choir's double returns;
  - wind you can only see in your echoes.
- **The lore is readable only by sonar.**
- **Real bat species with real hearing styles,** including beam sonar, listening, skimming and whispering, instead of generic "speed +10%" skins.
- **Real cave moths with real behaviour,** such as the Garden Tiger jamming your sonar and the Merveille du Jour visible only in echo.
- **A home that visibly fills with every pup you saved,** named.
- **On a 4K screen the dark becomes a place you can study:** fossils in the chalk, caustics on a drowned ceiling, beaded silk catching a ring of sound. On a phone it remains the same fair, fluid game.
