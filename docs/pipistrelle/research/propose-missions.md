# Pipistrelle: The Long Rain. A missions-first design for the full game

# Pipistrelle: The Long Rain
### A missions-first design for the full game

**Angle of this proposal:** gameplay depth and missions come first. The game should get *deeper* over a long campaign, not just longer. Every new cave, bat and screen in this document exists to give the player a new way to use the one verb that makes Pipistrelle original: **calling into the dark and reading what comes back.**

---

## 0. The pitch in one paragraph

On the night of the Long Rain, floodwater pours through the caves under the old belfry at Lowmoor and scatters the bat colony into the deep. You are **Pip**, a first-year pipistrelle. Your job is to fly down into the black, call, listen, and bring the little ones home. Each cave is a short, hand-tuned mission in a distinct underground world: chalk galleries, flooded halls, singing glass vaults, an owl-haunted crypt. Every cave can be finished three ways and can earn three **Moons**. Moths you bank feed the colony, and the colony is how new bats join you: a tiny bumblebee bat that slips through hairline cracks, a water bat that skims rivers, a long-eared bat that hears moths without calling, a noctule that bolts past owls. You buy them with moths you earned by flying. There is no real money, there are no ads, and there are no timers. The roost visibly fills with every pup you save. Act I ends when you ring the old bell again.

---

## 1. Pillars (what we refuse to lose)

1. **The dark is the level.** The screen starts black. Sight is earned with sound. Nothing in the redesign may light the cave "for free". New light sources are themselves *sounds*: drips, pups answering, crystals ringing, a guide's calls.
2. **The ring is the hero moment.** The teal ring painting walls in fading dots stays exactly as it is, including the 600 px/s ring speed and the 2.2 s fade. The semantic colour code stays fixed in every biome: teal is rock, blue is water, violet is crystal, red is danger, gold is food, pink is kin. Biomes change the *rock, air and light*, never the meaning of an echo colour.
3. **The bat's feel.** The relative drag stick, tap to chirp, hold to shriek, glide on release, walls that stun but never kill. Bats differ in numbers and in one ability each. The core controls never change.
4. **Bring them home.** Rescuing pups and the moonlit exit with its count-up is the emotional payoff. It ends every successful cave.
5. **Fair and readable.** Every hazard telegraphs. Every Moon is earnable with the free starter bat, untrained. Purchases open *other* routes; they never become the *only* route.
6. **Short caves, deep mastery.** A first clear takes 60-150 s. A full-Moon clear takes understanding.

---

## 2. How the core verb deepens over the game

The current game has one information source (your ring) and one goal (the exit). The full game adds **one new way of knowing** per biome and **one new kind of goal** per mission type. Players never get a new control. Every addition is something new to listen for.

| Layer | Introduced | What the player learns | Built on |
|---|---|---|---|
| Chirp paints walls | Cave 1-1 | Tap is sight; sight fades | existing `sonar` |
| Memory map | 1-4 | What you've heard stays faintly painted, so surveying pays off | existing `L.mem` |
| **Pup answers** | 1-2 | When your ring passes a hidden pup, it squeaks back. A pink arc appears at the screen edge pointing at it, delayed by its distance, *through rock*. Sound goes round corners; light doesn't. | new, cheap: distance check plus delayed edge arc |
| Shriek reaches deep sleepers | 1-3 | Some pups only answer a shriek. Shrieks also wake things. | existing shriek |
| **Drip clocks** | 2-4 | Every drip that lands makes a tiny 90 px sonar of its own. Steady drips become free, rhythmic light. | existing drips, plus a mini `sonar` call |
| Water echoes | 2-1 | Blue lines mean current and splash | existing rivers |
| **Crystal re-echo as a tool** | 3-1 | Crystals call back 0.42 s later from *their* position. They work as remote lamps and, later, as decoys. | existing re-echo |
| **Bells** | 3-2 | Some crystals have a pitch. Ringing them in the right order opens crystal membranes. | crystal entity, a tone, a gate cell type |
| **Jammers** | 3-5 | Tiger moths click back and scramble nearby echoes (real behaviour). You have to find them by ear. | ray-hit jitter near the moth |
| **Owl hearing** | 4-1 | Owls come in light and deep sleepers. A light sleeper wakes if your ring front passes within 160 px. You learn to call *away* from owls, or not to call. | existing owl states |
| **Decoys** | 4-5 | A woken owl flies to the *loudest* sound. A crystal's re-echo is louder than you. | owl target = latest loud source |
| Moonshafts | 4-3 | Owls see in moonlight and hear in the dark. Pick which sense to cheat. | light zones |
| **Guide calls** | 2-3, 4-4 | Another bat's rings paint the cave for you. Follow her and don't add your own noise. | a second `sonar` source with warm white rings |

By the end of Act I a skilled player reads a cave the way a real bat does. Dark caves feel *noisy* with information, but you only learn that by listening.

---

## 3. World structure

### 3.1 Shape of the game

- **Campaign: "The Long Rain".** Biomes, each with 5 caves plus 1 set-piece, on a chart-like map. Caves are discrete missions: you start each one with full energy and your chosen bat. There is no long-run attrition in the campaign.
- **The Long Night (endless).** Today's game, kept and polished: energy carries over, the multiplier and night flights stay, the difficulty climbs. It rotates through the biomes you have unlocked, and it is the purest score mode.
- **Nightly Cave.** One seeded cave per calendar date (offline: the seed is `hash(yyyy-mm-dd)`) with a fixed mission type, played with an untrained Pip so everyone is equal. Your best is kept per date. The first clear each day pays +60 moths. **There are no streaks and no penalty for missing a day.**

### 3.2 Story spine (three acts; Act I ships in v1)

The story is told in single lines from **Vesper**, an old pipistrelle who guides you. Her lines sit in a thin whisper strip at the top edge and never cover play. Lore lives in **echo murals**: prehistoric paintings on the cave walls that only show up as fine ochre lines inside your echo dots. People once lived here and painted bats. One mural per cave, 24 in Act I. Together they tell *The First Song*, the legend of how bats learned to see by singing.

| Act | Biomes | Story beat | Ends with |
|---|---|---|---|
| Prologue (title) | Belfry at Lowmoor | Rain, the bell tower, bats streaming out into the storm | Tap to begin |
| **I: The Long Rain (v1)** | Chalk Hollows, Drowned Halls, Glass Vaults, Owlstone Crypt | You gather the scattered young. Each biome has a lost elder of another species who joins the roost. | You ring the old bell in the crypt with a shriek. The colony hears it and starts to come home. |
| II: The Rootways (v1.1) | Rootways, Sulphur Vents | The oldest bats fled deeper than the flood. Why? | You find the edge of the silence. |
| III: The Hush (v1.2) | The Hush | A place where echoes die. | **The Chorus:** every pup you rescued in the whole campaign calls with you. The size of the final ring is your whole save file. |

The finale payoff is mechanical. The Chorus ring's radius is `600 + 4 × pupsRescuedLifetime`, capped at 3,000. A player who rescued everyone lights the entire final cavern with one call.

---

## 4. Mission system

### 4.1 Moons

Every cave has three Moons, shown as **crescent → half → full**:

- **Crescent: Homecoming.** Complete the primary objective.
- **Half: Kin.** Usually: bring every pup home. Some caves use a second objective instead.
- **Full: Mastery.** A cave-specific skill condition: chirp budget, no owl woken, time, no bumps, survey %.

Rules:
- Moons are earned **independently and cumulatively** across attempts. A Kin run and a separate Mastery run both count.
- The HUD shows the three Moons live. A Moon **dims the instant it becomes impossible** ("Mastery lost: 13th chirp"), so players never finish a cave only to find out they failed it.
- **Every Moon is verified achievable with an untrained Pip**, by a scripted bot run during development (see section 13).

Totals in v1: 24 caves × 3 = **72 Moons**. Biome gates: Drowned Halls opens at 8 Moons, Glass Vaults at 20, Owlstone at 34. A player who only takes crescents still reaches the crypt (18 crescents, plus the Kin Moons they will get naturally). The gates are soft.

### 4.2 Mission types (v1 ships nine)

| Type | Primary objective | Typical Mastery | Fail state | New tech needed |
|---|---|---|---|---|
| **Homing** | Reach the moonlit arch | ≤N chirps / ≤N bumps / time | Energy 0 | none (today's game) |
| **Kin** | Bring K of N pups home | All pups plus a time limit | Energy 0 | pup answers, shriek-only pups |
| **Survey** | Hear X% of the cave's walls | 85%+ and find the mural | Energy 0 | coverage grid (below) |
| **Follow** | Reach the exit with the guide | Never call; stay within 300 px | Energy 0 (the guide waits at forks, so there is no "lost her" fail) | guide NPC on the flow field, warm-white rings |
| **Hush** | Reach the exit past owls | Wake no owl | Energy 0 | light and deep sleeper owls |
| **Escape** | Outrun a moving threat to the exit | No damage / energy ≥N | Overtaken: 3 s inside the threat | collapse wave, rising water |
| **Larder** | Eat N of a moth species | Higher count / no web | Energy 0 | moth species behaviours |
| **Silence** | Reach the exit within a chirp budget | Budget of 1-3 | Budget spent *and* energy 0 (you can still fly blind) | budget UI, drip clocks, glowworm threads |
| **Bellringing** | Ring crystal bells to open membranes | ≤N shrieks / single-shriek solve | Energy 0 | bell tones, gate cells (type 7), local flow rebuild |

v1.1 adds **Carry** (bring a heavy, injured pup or a glowing lantern beetle home; the beetle lights the way but draws owls) and **Trials** (post-campaign mastery remixes, below).

**Survey coverage.** A coarse 48 px grid marks every open cell next to rock as a wall cell. Any ray hit within a cell marks it as heard. Coverage % = heard / total. The memory layer already shows the player this map, so Survey simply rewards something the game already does beautifully.

**Mission data shape** (one object per cave in `js/data/caves.js`):

```js
{ id: '1-3', name: 'The Loud Dark', biome: 'chalk', seed: 31337, layout: 'run', screens: 6,
  mission: { type: 'kin', pups: 3, deepSleepers: 1 },
  moons: [ { id: 'home' }, { id: 'kin', all: true }, { id: 'chirps', max: 12 } ],
  hazards: { stals: 3, webs: 1, drips: 2 }, intro: 'Some little ones only answer a loud call.',
  mural: 'chamber:1', secret: { crack: true, reward: 'moth:herald' } }
```

Missions listen to a small **event bus** (`PP.on/emit`) and a **run stats** object. Events: `chirp, shriek, bump, hurt, splash, web, webFree, mothEat(species), pupFound, pupHome, owlWake, owlSeen, bellRing, gateOpen, crackEnter, muralFound, exit, death`. Stats: time, chirps, shrieks, bumps, damage, splashes, websCaught, owlsWoken, seenByOwl, coverage, minEnergy, maxGuideDist, cracksUsed, mothsBySpecies.

### 4.3 The shape inside each cave (rising action)

Today, early caves take 11 s and then reset in a night flight. Campaign caves instead have three **beats**:

1. **Mouth (first ~25%).** Roomy, safe, and holds the cave's *introduction moment*: the new hazard is staged harmlessly. For example, a stalactite drops onto empty rock ahead of you while Vesper whispers "Listen for the tick."
2. **Gallery (middle).** The mission happens here: branches, pups, the moths you need.
3. **Last gallery (before the arch).** The cave's signature hazard is concentrated into a short gauntlet. The arch is out of sight until you clear it (the fixed field of view in section 11 guarantees this on every screen).

Target times for a first clear: 60-150 s for normal caves and 3-4 min for set-pieces. Set-pieces have two **roost ledges**: hanging pups act as checkpoints, and you respawn there with the energy you had when you reached them.

---

## 5. Act I, cave by cave (v1: 24 caves)

Energy drain is per second at 100 max energy. Passage radius is the generator's `rad`. "Moons" lists Crescent / Half / Full.

### Biome 1: Chalk Hollows (teaching biome)
*Pale chalk strata with ochre murals and flint nodules that glint in echoes. Chalk dust drifts through the bat's warm light. A few glowworm threads. Drain 1.5→1.7/s, rad 120→105, moths 24→20.* **Elder met:** a lost **bumblebee bat** found in a crack in 1-6, which unlocks **Mote** in the Colony.

| # | Name | Mission | New element | Moons |
|---|---|---|---|---|
| 1-1 | First Flight | Homing | Fly, chirp, memory (today's tutorial, kept) | Exit / rescue the 1 pup / exit with ≥70 energy |
| 1-2 | Little Voices | Kin (3) | **Pup answers** (pink edge arcs) | 2 pups / all 3 / ≤3 bumps |
| 1-3 | The Loud Dark | Kin (3, one deep sleeper) | Shriek; first stalactites, with a staged drop | Exit / all 3 / ≤12 chirps |
| 1-4 | Chalk Map | Survey 60% | Coverage meter; the mural hunt | 60% / 80% plus mural / under 90 s |
| 1-5 | Silk Gallery | Larder: 25 moths | Webs at chokepoints; drip intro | 25 / 35 / never caught in a web |
| 1-6 ★ | **The Chalk Stair Falls** | Escape (set-piece) | **Collapse wave**: the ceiling behind you comes down as a band of falling stalactites, moving 90 px/s and rising to 140 px/s. Touching it costs 25 energy and shoves you forward. | Escape / save all 3 ledge pups / never touched |

### Biome 2: The Drowned Halls
*Black water with slick blue-grey rock. Mist bands hang over rivers. When a ring passes, caustic ripples flicker on the ceilings. Drain 1.7→1.85, rad 110→95.* **Elder met:** an old **Daubenton's bat** (the guide in 2-3), which unlocks **Skimmer**.

| # | Name | Mission | New element | Moons |
|---|---|---|---|---|
| 2-1 | Low Water | Homing | Rivers and current | Exit / all pups / no splash |
| 2-2 | Mayfly Run | Larder: 20 mayflies | **Mayflies** live only within 40 px of a water surface | 20 / 30 / ≤2 splashes |
| 2-3 | Follow the Elder | Follow | **Guide calls**: her warm-white rings light the cave for you | Arrive together / no own chirps / never >300 px behind |
| 2-4 | Drip Clock | Silence (budget 5) | **Drip clocks**: landing drips are 90 px mini-sonars | ≤5 chirps / ≤3 / ≤1 |
| 2-5 | Sunken Nursery | Kin (5) | **Tide**: water rises and falls 60 px on a 9 s cycle, opening and closing passages | 3 pups / 5 / under 120 s |
| 2-6 ★ | **The Long Rain** | Escape, vertical | **Rising flood** at 14 px/s, rising to 22, in a vertical shaft about 3,200 px tall with air pockets and 4 stranded pups | Escape / all 4 pups / finish with ≥50 energy |

### Biome 3: The Glass Vaults
*Amethyst geodes. Rock with violet veins. Prism sparkles drift in the air. Re-echo rings shed faint chromatic fringes. Drain 1.8→1.95, rad 100→85.* **Elder met:** a **brown long-eared bat** who listens to the crystals sing, which unlocks **Hark**.

| # | Name | Mission | New element | Moons |
|---|---|---|---|---|
| 3-1 | Prism Hall | Homing | Crystal re-echo as remote light; gust intro | Exit / all pups / ≤10 chirps |
| 3-2 | Bellringer | Bellringing (4 bells, free order) | **Bells and membranes** | Open / ≤3 shrieks / under 100 s |
| 3-3 | Luna Lights | Larder: 8 luna moths | **Luna moths** are dark until a re-echo touches them | 8 / 12 / never below 40 energy |
| 3-4 | Hark's Lesson | Silence (budget 4) | Crystals and gusts as the only light. The elder demonstrates listening. | ≤4 / ≤2 / ≤1 |
| 3-5 | Jammers | Larder: 6 tiger moths | **Tiger moths** scramble echoes within 120 px; locate them by the scramble itself | 6 / 9 / ≤15 chirps |
| 3-6 ★ | **The Chorister** | Bellringing (set-piece) | A glass cathedral with 5 pitched bells. A mural shows the melody as glyphs. A chain of re-echoes can play it with one perfect shriek from the right perch. 3 pups are sealed in amber that their bell frees. | Open the vault / free all 3 / solve with ≤4 shrieks |

### Biome 4: The Owlstone Crypt
*A collapsed church crypt where worked stone ribs meet raw cave. Bone dust and owl feathers. Moonshafts fall through cracks. Lit rock takes warm ash tones. Drain 1.9→2.1, rad 95→78 in tunnels with big naves.* **Elder met:** a **noctule** who draws owls away in 4-4, which unlocks **Gale**.

| # | Name | Mission | New element | Moons |
|---|---|---|---|---|
| 4-1 | Feathers | Hush (3 owls) | **Light vs deep sleepers.** Sleeping owls breathe; the breath shows as faint sound sparks. | Exit / wake none / all pups |
| 4-2 | Crypt Larder | Larder: 20 moths | **Patrolling owl** on a perch circuit with a 6 s loop | 20 / 28 / never seen |
| 4-3 | Moonshafts | Survey 70% | **Moonshafts**: owls *see* you in light without being woken by sound | 70% / 85% plus mural / never seen |
| 4-4 | The Noctule's Run | Follow (fast) | The guide flies at 300 px/s and pulls owls off you | Arrive / no own chirps / never seen |
| 4-5 | Under the Owl | Kin (4) | **Decoys**: a woken owl flies to the loudest recent sound, and a crystal's re-echo counts | 3 / 4 / wake ≤1 owl |
| 4-6 ★ | **The Grey Lady** | Hush, then Escape (set-piece) | A great grey owl hunts the nave in 3 phases. (1) She hears everything; navigate by moonshafts and pillars. (2) Decoy her with crystals to reach 3 pups. (3) She pursues you up the belfry stair, and a shriek at the top rings the old bell and drives her out into the night. **She is never harmed, only outwitted.** | Ring the bell / all 3 pups / never caught in her talons |

**End of Act I:** the bell rings, the screen cuts to the belfry exterior, and the bats come home. The Roost gains its bell animation. Vesper: "There are older voices still below."

### Acts II and III (later versions, outlined)

| Biome | Ver. | Identity | New knowledge | Set-piece |
|---|---|---|---|---|
| The Rootways | v1.1 | Ancient tree roots through a soil cave; glowworm curtains; spiders | **Glowworm curtains** dim and go dark when you call (real behaviour); **cave centipede**, a predator that hunts by vibration | *The Centipede*: a chase through root tunnels in which it follows your calls |
| Sulphur Vents | v1.1 | Amber and sickly green; steam | **Heat shimmer** bends rays (ray paths curve near vents); **vent eruptions** as rideable gusts | *The Breath*: ride eruptions up a 3,000 px chimney |
| The Hush | v1.2 | Near-monochrome grey felt-moss | **Echoes die** after 0.8 s on moss and only crystals carry sound | *The Chorus*: the finale |

---

## 6. Bats you can buy (the Colony)

### 6.1 Roster and stats

Baseline (today's Pip): radius 8, max speed 255, accel 1050, energy 100, chirp 420 px / 0.6 s, shriek 840 px / 3 s, echo life 2.2 s, drain ×1.0.

| Bat | Species | Body r | Max v | Accel | Energy | Chirp R / CD | Shriek R / CD | Echo life | Drain | Ability | Price | Joins |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Pip** | Common pipistrelle | 8 | 255 | 1050 | 100 | 420 / 0.6 | 840 / 3.0 | 2.2 | ×1.00 | **Steady:** shortest bump stun (0.2 s) and pups follow tightest | free | start |
| **Mote** | Kitti's hog-nosed (bumblebee) bat | 5 | 230 | 1250 | 70 | 340 / 0.45 | 680 / 2.6 | 2.0 | ×0.70 | **Crackrunner:** fits through hairline cracks (secret cells, 18 px) that hold murals, rare moths and shortcuts. Gusts push it ×1.6. | 500 | after 1-6 |
| **Skimmer** | Daubenton's bat | 8 | 260 | 1000 | 100 | 420 / 0.6 | 840 / 3.0 | 2.2 (water 4.4) | ×1.00 | **Skim:** no splash damage, ignores current, +30% speed within 40 px of a water surface, eats mayflies on contact from 2× range | 700 | after 2-3 |
| **Hark** | Brown long-eared bat | 9 | 220 | 950 | 100 | 360 / 0.6 *whisper* | 720 / 3.5 | 3.0 | ×0.90 | **Hark:** every 1.2 s, moths, pups, owls and drips within 320 px show as dim sound sparks without a call. **Whisper:** chirps never wake owls. Hovers in place when input is released. | 900 | after 3-4 |
| **Gale** | Noctule | 10 | 330 | 1300 | 120 | 560 / 0.8 | 1100 / 3.5 | 1.8 | ×1.25 | **Bolt:** flick to dash 200 px in 0.18 s (tears webs, outruns a swoop), cooldown 3.5 s. *Loud:* chirps wake light sleepers at 260 px. | 1,200 | after 4-4 |
| Hollow | Lesser horseshoe | 7 | 210 | 1100 | 100 | **Beam**: a held 35° cone, 600 px, refreshed 4×/s, drain +0.4/s while held | 760 / 3 | 2.2 | ×0.95 | **Hang:** cling to a ceiling to pause drain | 1,500 | v1.1 |
| Velvet | Barbastelle | 8 | 250 | 1050 | 100 | 400 / 0.6 | 800 / 3 | 2.2 | ×1.00 | **Hushcall:** no creature hears its calls (owls, centipede); tiger moths cannot jam it | 1,500 | v1.1 |
| Vesper | Old pipistrelle | 8 | 255 | 1050 | 110 | 420 / 0.6 | 840 / 3 | 2.6 | ×0.95 | **Chorus:** each trailing pup adds a 120 px ring to your chirp | **not sold**, earned by finishing Act III | v1.2 |

Each bat is drawn with the parametric bat art (section 11.4): its own ear shape, wing aspect, fur palette and flap rate. Mote has a pig snout and a fast buzzy flap. Hark has huge ears that swivel toward sound sparks. Gale has narrow swept wings and fewer, stronger flaps. Skimmer has big feet that trail over water.

### 6.2 How each bat opens new ways through missions

This is the point of buying bats. **A bat never unlocks a Moon that Pip cannot earn.** It changes *which skill* the Moon tests.

| Cave | Pip's way | Alternative way |
|---|---|---|
| 1-4 Chalk Map (Survey) | Methodical chirping through every gallery | **Mote** uses two cracks that connect galleries and halve the route. **Gale's** 560 px chirp hears more wall per call. |
| 1-6 Chalk Stair (Escape) | Hold the main line and glide the corners | **Gale** bolts through the two web chokepoints. **Mote** takes a crack shortcut, but its small energy pool makes the no-touch Moon riskier. |
| 2-4 Drip Clock (Silence) | Time movement to the drip clocks | **Hark** gets passive sparks, so a 1-chirp run becomes natural. **Skimmer's** water echoes last 4.4 s, so one call lights the river route twice as long. |
| 2-6 The Long Rain (Escape) | Find air pockets and keep ahead | **Skimmer** rides the rising surface at +30% speed and is never slowed by splashes. A different line entirely. |
| 3-2 Bellringer | Fly to each bell and call | **Gale's** 1,100 px shriek rings 3 bells from one perch, so ≤3 shrieks becomes a positioning puzzle |
| 3-5 Jammers (Larder) | Read the scramble pattern in your echoes | **Hark** hears the tiger moths' clicks as sparks. (v1.1 **Velvet** cannot be jammed at all.) |
| 4-1 Feathers (Hush) | Call away from owls; use crystals | **Hark's** whisper chirps never wake owls, so the challenge shifts to moonshafts. **Gale** is *harder* (loud), but Bolt clears an owl before its 0.9 s alert ends. |
| 4-5 Under the Owl (Kin) | Decoy with crystal re-echoes | **Mote** reaches one pup through a crack and skips one decoy. **Gale** can wake an owl on purpose and outrun it. |
| 4-6 The Grey Lady | Pillars, shafts, decoys | Every bat works. **Hark** is strongest in phase 1, **Gale** in phase 3. This is the cave that makes players want both. |
| Any Homing / Kin | — | **Mote** finds the secret crack chamber in every cave that has one (12 of 24 in v1). These hold murals and rare moths for the Journal, never Moons. |

The cave brief shows a single unobtrusive line, **"Heard well by: Hark, Skimmer"**, with no buy button on that screen.

### 6.3 Training (the long tail)

Each bat has two training tracks plus one Knack:

- **Wings:** max speed +4 / 8 / 12%, accel +5 / 10 / 15%.
- **Voice:** chirp radius +5 / 10 / 15%, shriek cooldown −0.25 / −0.5 / −0.75 s.
- **Knack** (one level, 400 moths), one per bat:
  - Mote's cracks cost no speed.
  - Skimmer's skim band grows to 60 px.
  - Hark's sparks range is 420 px.
  - Gale's Bolt cooldown is 2.5 s.
  - Pip's trail pups also bank +1 moth each.

Track levels cost 100 / 250 / 500. Moons are balanced against *untrained* bats. The Nightly Cave always uses untrained Pip.

**Cosmetic wing tints:** 12 natural variants (albino, ginger, frosted, moonlit and others) at 120 moths each. They are purely visual and listed in the Colony.

---

## 7. Economy (moths are the only currency)

**Earning:**

| Source | Amount | Notes |
|---|---|---|
| Campaign cave, banked at exit | carried × (1 + pups home), multiplier cap ×6 | Typically 20-60 early, 60-150 late. Paid on *every* clear, including replays. |
| First Moon in a cave | +25 / +50 / +75 (crescent / half / full) | Once per Moon. Set-pieces pay double. |
| Colony Requests | 50-300 each, 30 in v1 | Listed in section 8 |
| Nightly Cave | +60 for the first clear of the day | No streaks |
| The Long Night | banked score 1:1 | Typical run 150-500 |
| Legacy gift (migration) | old best score, up to 500 | "Your old haul is waiting in the larder." |
| Failure | 0 | No cost to retry, ever. Fail → Retry is a single tap. |

**Totals in v1 content:**
- Moon bonuses: 20 × 150 + 4 × 300 = 4,200.
- First-pass banking: about 1,500.
- Requests: about 3,000.
- Together that is **about 8,700 moths from the content itself.**

**Spending in v1:**
- Bats: 500 + 700 + 900 + 1,200 = 3,300.
- Training: 5 bats × 1,700 = 8,500.
- Knacks: 5 × 400 = 2,000.
- Tints: 1,440.
- Together that is **about 15,200 moths.**

**Pacing:**
- The first bat (Mote) is affordable at the end of biome 1, about 25-35 minutes in.
- All four bought bats are affordable by the end of Act I at about two Moons per cave.
- Full training is the long tail: about 20-30 endless runs or cave replays beyond finishing the content.

**Explicitly absent:**
- Real money, ads, premium currency, loot boxes, random rewards, energy or lives timers, daily-login rewards, streaks, limited-time offers, and fake discounts.
- Every price is shown in full before purchase, and nothing is ever lost from the larder.

---

## 8. Meta: Requests, Journal, Roost

### 8.1 Colony Requests (30 in v1, all visible at once, no rotation)

Examples:

| Request | Goal | Reward |
|---|---|---|
| First Light | Hear 100% of any cave | 100 |
| Nursemaid I / II / III | Bring 25 / 75 / 150 pups home | 100 / 200 / 300 |
| Light Sleeper | Finish 3 Hush caves without waking an owl | 200 |
| Three Calls | Finish any cave with ≤3 chirps | 200 |
| Dry Feet | 20 river crossings without a splash | 100 |
| Mothwatcher | Record 6 moth species | 150 |
| Muralist | Find 12 murals | 250 |
| Tiny Doors | Pass through 10 hairline cracks | 100 |
| No Scratch | 5 caves with zero bumps | 150 |
| Long Night | Reach cave 10 in The Long Night | 200 |
| Bell Choir | Solve The Chorister with one shriek | 300 |
| Deep Breath | Clear The Long Rain with ≥50 energy | 150 |

### 8.2 Journal

- **Moths:** 10 species in v1. Each has a sketch, a real-world note and a game behaviour.
  - Common Rustic: standard.
  - Silver Y: fast.
  - Mayfly: water only.
  - Luna Moth: crystal-lit.
  - Tiger Moth: jams sonar.
  - Herald: clusters on walls. A real cave-overwintering moth that you glean by hovering close.
  - Brimstone: gold, worth 3.
  - Ghost Moth: shows only in memory echoes.
  - Death's-head Hawkmoth: rare, squeaks audibly when near.
  - Lappet: big, slow, +8 energy.
- **Murals:** 24 fragments. Each completed biome set plays a short echo-painted vignette and adds a verse of *The First Song*, which plays as a music track.
- **Creatures:** a bestiary card per hazard, added when first met. The card shows its tell (the "how to read it" line).
- **Stats:** lifetime chirps, shrieks, moths, pups, caves, Moons, time in the dark, coverage heard (km of wall).

### 8.3 The Roost (home screen and visible progress)

The Roost is the inside of the belfry, drawn at full resolution:
- Owned bats hang from the beams; tap one to select it.
- **Every pup you have ever rescued hangs here.** The roost visibly fills from a lonely beam to a crowded, chirping colony. 1 pup = 1 sprite up to 200, then clusters.
- The bell sits silent until Act I ends.

This is the "bring them home" heart of the game, paid off on the home screen.

---

## 9. Difficulty curve and fairness

- **Within the campaign:** drain rises from 1.5 to 2.1 per second across Act I; passages narrow from rad 120 to 78; hazard *variants* replace hazard *counts* (light-sleeper owls, patrols, tide, jammers). After the teaching biome, each biome introduces 2-3 knowledge layers and then combines them in its set-piece.
- **Within a cave:** the mouth, gallery and last-gallery beats from section 4.3.
- **The Long Night:** today's curve, extended. Rad keeps narrowing to cave 16 (rad 50). From cave 12, each cave rolls one **Omen**, shown at the cave entry, for example:
  - "Owls sleep lightly here; moths ×2"
  - "Tide"
  - "Jammers"
  - "No drip clocks"

  The night flight shortens to 8 s, with a random moon phase and weather.
- **Assist, "Gentle Wings"** (settings): drain −30%, hazard damage −50%, owl alert +0.5 s. Moons stay earnable; nothing is locked or marked.
- **Dramatic failure, where earned:** set-pieces add real threats (the collapse wave, the flood, the Grey Lady's talons) so death is no longer always a slow starve. Fair rules still hold: everything telegraphs at least 0.6 s ahead.

---

## 10. Night flight, rethought

The assessment found the 15 s night flight is 35-50% of early play time. The fix:

- **Campaign:** no night flight between caves. The moonlit exit and count-up lead into the Results screen.
- **Four Dusk Flights**, one between each pair of biomes plus the epilogue, each 25-30 s with one event:
  1. **Rain over Lowmoor:** moths fly low; raindrops speckle the screen.
  2. **The Bat Hawk:** a real bat predator. Its shadow and cry come 0.8 s before each dive; dodge three dives.
  3. **Fireflies:** tell moths from fireflies by their flight pattern.
  4. **Full Moon Home:** calm, the story beat over the belfry.

  Each is skippable after it has been seen once.
- **The Long Night:** an 8 s flight with a random moon phase and weather.
- **The world is a fixed size, 1,000 × 600 world px, letterboxed by sky**, so every screen sees the same moths for the same time.

---

## 11. Full 4K and atmosphere (art direction plus the technical spine)

### 11.1 Camera: the same view on every device

Visible world area is held at about **450,000 world px²**, with visible height capped at 900 and width at 1,150:

```
zoom = sqrt(cssW · cssH / 450000)
zoom = max(zoom, cssW / 1150, cssH / 900)
```

| Screen | Zoom | Visible world (w × h) |
|---|---|---|
| Phone 390×844 | 0.86 | about 453 × 981; height capped, so ≈ 418 × 900 |
| 1920×1080 | 2.15 | 893 × 502 |
| 3840×2160 | 4.29 | 895 × 503 |

The bat fills the same share of the screen everywhere, the arch is never visible from the mouth, and mission times are fair across devices.

### 11.2 Quality tiers and dynamic resolution (`js/render/quality.js`)

| Tier | DPR cap | Back layer scale | Dark mask | Cave tile density | Echo pool (dots/lines) | Lights / frame | Ambient particles |
|---|---|---|---|---|---|---|---|
| Low | 1.0 | 0.5 | ¼ | 0.75 texel per world px | 2,400 / 1,800 | 60 | 40% |
| Medium | 2.0 | 0.75 | ⅓ | 1.0 | 3,600 / 2,600 | 120 | 70% |
| High | 3.0 | 1.0 | ½ | 1.5 | 5,000 / 3,500 | 200 | 100% |
| Ultra (4K) | native | 1.0 | ½ | 1.5 plus a native-resolution detail pattern | 6,000 / 4,000 | 300 | 100% plus foreground layers |

- **Auto tier:** a 2 s benchmark on the animated title picks the starting tier. A governor then measures p90 frame time over 90 frames. It drops the internal resolution scale by 0.1 (to a floor of 0.6) when p90 exceeds the budget, and raises it after 3 s under 70% of the budget. Players can force a tier and a 30 or 60 fps cap.
- `Kit.view` is created with `maxDpr`/`maxPixels` from the tier.
- game-check's 390×844@2 software run must land in Low or Medium at ≤ 25 ms p95.

### 11.3 Cave art at 4K

- Rock is painted into **256 world-px chunks**, on demand, kept in an LRU cache of at most 48 chunks, at the tier's density.
- Crisp detail comes from three things:
  1. **Vector rims** stroked from `segs` at full device resolution.
  2. A per-biome 512² **detail texture** applied as a `createPattern` at native resolution and modulated by the chunk. The texture shows chalk grain, wet sheen, crystal facets or worked stone.
  3. A per-biome **light ramp**: what a passing ring reveals.
- The memory layer is chunked the same way, with batched strokes.
- No canvas exceeds 2048².
- Glow sprites are 512 px with blue-noise dither, which kills the 8-bit banding in the dark.
- The capture scenes use the honest Ultra tier, not a special `hiQ` path.

### 11.4 Atmosphere per biome

| Biome | Rock (base / lit) | Backdrop layers | Ambient | Echo rock tint (stays in the teal family) | Music |
|---|---|---|---|---|---|
| Chalk Hollows | #1b1a22 / chalk #cfc6b0 with ochre murals | flint ribs, hanging chalk curtains | dust motes, sparse glowworms | #5ff0d6 | today's D-minor song, kept (70 bpm) |
| Drowned Halls | #0d1a24 / slick #3b6378 | mist bands, flooded arches, reflections | drips, ripple caustics, spray | #5fe6e0 | 60 bpm; drips and drone forward; long wet echo tail |
| Glass Vaults | #120f22 / amethyst #8d6bff | geode walls, crystal spires | prism sparkles, chime dust | #66f0e8 | 76 bpm lydian; bells; re-echoes harmonised to the key |
| Owlstone Crypt | #17130f / ash stone #b8a68a | ribs, broken arches, crypt niches | feathers, moonshafts, bone dust | #6fe8cf | the kit's `mystery` style; organ pad; cathedral reverb |

Hazards get real art:
- **Owls:** layered feather shapes with a breathing idle, eye-shine only when awake, and a wing-spread swoop.
- **Stalactites:** layered limestone with a drip glint. The tick tell becomes a visible tremble and dust.
- **Rivers:** surface sheen, flow lines and a splash crown.
- **Webs:** dew-beaded silk that catches echoes.
- **Gusts:** visible particle columns.
- **Drips:** a glint, a fall streak and a ring.

**Bat art** is parametric (`batArt.js`): ear length and shape, snout, wing aspect, fur palette and flap rate. The same drawing powers the gameplay sprite and the Colony preview.

### 11.5 HUD and menus at any size

- `uiScale = max(1, min(cssW/1280, cssH/720))`, so 1.5 at 1080p and 3 at 4K. Everything is anchored to real safe-area corners, not a 1100 px column.
- The logo is drawn on canvas (no kit title wrap).
- Menus are DOM with `rem` scaled by `uiScale`. Keyboard focus navigation works in every screen, for TV and desktop.

---

## 12. Audio (a game about sound)

- **Keep all 23 effects** and the distance-delayed, panned echo returns.
- **Per-biome reverb:** each biome sets the echo return's delay feedback, filter and level. The Drowned Halls are long and dark; the Glass Vaults have shimmer harmonics on crystal hits; the Owlstone Crypt uses a cathedral ConvolverNode with a generated impulse.
- **Adaptive layers on each biome song:**
  - *danger*: a pulse and low ostinato when an owl is alert, the flood is near or the collapse wave is within 400 px.
  - *homing*: star bells within 600 px of the arch.
  - *kin*: a soft pluck motif when a pup answers.
- **Ambience beds** per biome: water, wind through crystal, the crypt's distant owl.
- **Pup answers** are the most important sound in the game: a pitched squeak, panned and delayed by distance.
- **Sound captions** (accessibility): every off-screen sound that matters gets a small directional glyph at the screen edge. The sounds covered are pup answers, ticks, hoots, gust warnings and the collapse rumble. This makes the game playable without audio, and it also teaches hearing players what to listen for.

---

## 13. Screens and flow

| # | Screen | Contents | Kiln phase |
|---|---|---|---|
| 1 | **Title** | The belfry at night in the rain, bats streaming out, a canvas logo, "Tap to begin" | title |
| 2 | **Roost** (home) | Hanging bats (tap to select), pup crowd, larder count, Moon count. Big tiles: **Fly**, **Colony**, **Journal**, **Requests**. Gear icon for Settings. | title |
| 3 | **Map** | Each biome as a chart drawn in echo dots. Caves you have not flown stay dark until reached; tapping chirps across the map. Tabs: The Long Rain, The Long Night, Nightly Cave. | title |
| 4 | **Cave brief** | Name, mission line, three Moons with conditions, best, "Heard well by …", bat picker, Fly | title |
| 5 | **In-cave HUD** | Energy pips scaled to the bat's max energy, chirp and shriek arcs, mission tracker with live Moons, carried and multiplier, pup icons, whisper strip, sound captions | play |
| 6 | **Pause** | Resume, Restart cave, Mission, Settings, Sound, Vibration, Leave cave, **Back to games** | paused |
| 7 | **Results: Home** | Moonlit exit, then three moons rise one by one, payout count-up, Request progress, next-goal teaser. Buttons: Next, Retry, Roost. *No confetti.* | over |
| 8 | **Results: The echoes fade** | Quiet. Shows what you achieved ("You heard 64% of the cave, 2 of 3 pups found"). Retry in one tap. | over |
| 9 | **Colony** | Species cards with stats bars, an ability demo loop, price, Training, tints | title |
| 10 | **Requests** | All 30, grouped, with progress bars | title |
| 11 | **Journal** | Moths, Murals, Creatures, Stats | title |
| 12 | **Settings** | Graphics (Auto/Low/Med/High/Ultra, resolution scale, fps cap). Audio (master/music/effects/echo volume). Controls (stick sensitivity, left-handed, hold-to-shriek time). Accessibility (colour-safe echo palette with *shape* coding, so danger dots become crosses; reduce flashing; captions; Gentle Wings; UI scale override). Data (reset progress, with a typed confirmation). | title |
| 13 | **Dusk Flight** | Between-biome set-pieces | play |
| 14 | **Credits** | Echo-painted scroll | title |

**Kiln contract mapping:**
- All front-end screens report phase `title`.
- `__kilnTest.start()` begins *quick play*: the next uncleared campaign cave with the selected bat, phase `play`.
- `lose()` ends at Results with phase `over`.
- `runEnd` sends the cave's banked moths, or the Long Night score.
- `Arcade.progress({ label: 'Glass Vaults 3-2 · 31/72 moons', pct: moons/72 })`.
- Every menu hides in `?keyart`.
- The pause menu keeps Back to games, Sound and Vibration.

---

## 14. Onboarding

- **Chalk Hollows is the tutorial**, one idea per cave:
  - 1-1: fly and chirp, with today's ghost-hand sequence kept.
  - 1-2: pup answers and the multiplier, explained *in the count-up*: "3 moths × (1 + 2 pups)".
  - 1-3: shriek.
  - 1-4: the memory map.
  - 1-5: webs and drips.
  - 1-6: the first set-piece.
- **Every new hazard gets a staged introduction moment** in a safe spot, a whisper line from Vesper (top edge, one line, 3 s, never over the bat) and a Creature card added to the Journal.
- **Banners no longer sit over play.**
- After each Results screen, a **next goal** line: "12 more moths to welcome Mote", "One Moon from the Drowned Halls".
- **Continue is seamless.** Leaving mid-cave saves your position at the last roost ledge (set-pieces) or at the cave mouth (normal caves). The Long Night keeps today's Continue behaviour.

---

## 15. Technical plan in brief

The module split recommended in the technical map is adopted as is: classic ordered scripts, one `PP` namespace, `js/` under `games/pipistrelle/`. Additions this design requires:

1. **Separate rng streams** (`gen`, `sim`, `fx`), so campaign caves and the Nightly Cave are exactly reproducible and cosmetics can change freely.
2. **Event bus and stats**, which feed missions, Requests and the Journal.
3. **Hazard registry** (`place/update/ping/draw/debug`). The 7 existing hazards are ported first. v1 adds: collapse wave, tide, light/deep-sleeper and patrolling owls, moonshafts, bells with membranes, mayfly/luna/tiger/herald moth species, pup answers, drip clocks, hairline cracks, and the guide NPC.
4. **Generator layouts:**
   - `run`: today's layout.
   - `rise`: generate a run, transpose the cell grid, then place gravity-aware hazards. Used by The Long Rain.
   - `nave`: a hand-authored list of primitives (capsules and circles) passed through the same roughening and connectivity pass. Used by The Chorister and The Grey Lady.
5. **Curated seeds.** A dev script (`games/pipistrelle/dev/seeds.cjs`) generates candidate seeds per cave spec, rejects those that break mission constraints (reachable pups, owl spacing, coverage achievability, route length), and writes the chosen seed into `caves.js`.
6. **Profile v2** with a version field. It migrates v1 keys: `best` becomes the Long Night best and the legacy gift; `run` becomes the Long Night continue; `taught` skips the 1-1 ghost hand.
7. **Moon bots.** For each cave, an autopilot script plays with untrained Pip and asserts every Moon condition can be met. Some Moons need scripted inputs; the bot can take routes from `path()`. This is the guarantee behind the "no Moon needs a purchase" rule.
8. **Outside the folder** (already flagged in the technical map): update `docs/GAME_CONTRACT.md` to allow multi-file games, and teach `tools/bundle.cjs` to inline local scripts.

---

## 16. What ships when

| | **v1: "The Long Rain" (Act I)** | v1.1: "The Rootways" | v1.2: "The Hush" |
|---|---|---|---|
| Biomes and caves | 4 biomes, 24 caves including 4 set-pieces | +2 biomes, +12 caves | +1 biome, +6 caves plus the finale |
| Mission types | Homing, Kin, Survey, Follow, Hush, Escape, Larder, Silence, Bellringing | + Carry, + Trials (3 remix challenges per biome) | Chorus finale |
| Bats | Pip, Mote, Skimmer, Hark, Gale | + Hollow, Velvet | + Vesper (earned) |
| Modes | Campaign, The Long Night, Nightly Cave | Omens for every Long Night cave | Deep Echo (New Game+: Hush rules everywhere) |
| Meta | 30 Requests, Journal (10 moths, 24 murals, creatures, stats), Roost, Training, tints | +20 Requests, more moths and murals | — |
| Presentation | Camera, quality tiers, chunked 4K art, per-biome art and music, UI scale, captions, 4 Dusk Flights | Gamepad (Android TV) | — |

**Cut lines if v1 runs late, in order:**
1. Bellringing moves to v1.1; 3-2 and 3-6 become Homing and Kin with crystal decoys.
2. Dusk Flights become one shared flight with a random event.
3. The tints move out.
4. Requests drop to 15.

The camera, tiers, profile migration, Moons and the four bats are never cut.

### Build plan (parallel agent tracks, about 12-15 agent-days)

| Milestone | Work | Gate |
|---|---|---|
| M0: Split | Module split, rng streams, event bus, no behaviour change | Existing `test.cjs` passes; fingerprint equal for the gen stream |
| M1: View | Camera, quality tiers, governor, chunked rock and memory, vector rims, UI scale, canvas logo | game-check ≤ 25 ms p95; 4K captures sharp |
| M2: Worlds | Biome data, hazard registry, the 4 biome painters and backdrops, new hazards, `rise`/`nave` layouts | Per-hazard tests |
| M3: Missions | Mission engine, Moons, 24 cave specs, seed curation, Moon bots | All 72 Moons bot-verified with Pip |
| M4: Colony | Profile v2 and migration, economy, 5 bats with parametric art, Training | Migration test; shop tests |
| M5: Front end | Roost, Map, Brief, Results, Colony, Journal, Requests, Settings, Pause | Keyart clean; layout check at all sizes |
| M6: Sound | Biome songs, adaptive layers, reverb, captions | — |
| M7: Polish | Introduction moments, Vesper lines, murals, Dusk Flights, store captures | Full playthrough by an independent critic agent |

---

## 17. Why this is not a generic mobile game

- **There is no combat, ever.** Predators are outwitted with sound: decoys, whispers, moonshafts. The Grey Lady flies off into the night unharmed.
- **Progression is tied to the theme.** Currency is food for the colony. Bats are real species with their real traits: Daubenton's skims water, the long-eared bat gleans by listening, tiger moths jam, the herald moth winters in caves, the bat hawk hunts at dusk.
- **The home screen shows your compassion, not your spending.** Every pup you ever saved hangs in the roost.
- **The finale's power is your whole save file.** The Chorus ring is as big as the colony you brought home.
- **The only thing that grows from start to finish is how well you listen.**
