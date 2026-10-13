# Pipistrelle: Full Game Design Proposal (Progression and Economy First)

# Pipistrelle: full game design proposal
### Angle: progression and economy first

> **One line:** a small bat leads her colony home through five living cave systems. She sees only by sound, feeds the roost with every moth she banks, and welcomes new bat species to fly with her. Every species changes *how* you see the dark, not just how fast you move.

This proposal builds on the current v1.0.0 game. It does not replace it. Sonar painting the dark, the bat's feel, the pup trail and the moonlit exit stay exactly as they are and become the centre of a complete game. Everything below can be built in plain canvas and JS inside the existing folder and SDK contract, and it is scoped for a small team of agents working in days.

Ground rules (decided by the owner and D14 in `docs/DECISIONS.md`, not reopened here):
- No real money, no ads, no energy timers, no dark patterns.
- The game stays in `games/pipistrelle/` and keeps loading old saves.
- It must be crisp at native resolution up to 3840×2160 and hold a smooth frame on phones.

---

## 0. Contents

1. Pillars and what we keep
2. The loop at four timescales
3. **Economy**: currencies, earn rates, sinks, pacing model
4. **The bats**: roster, stats, abilities, training, knacks, trials
5. **Cosmetics**: the Amber Shelf
6. **The colony**: the meta-progression spine
7. **World map**: Reaches, the cave-by-cave table, unlock order
8. **Missions**: Marks, Commissions, Moonrise, Migration, Field Guide
9. Reasons to come back tomorrow, and the fairness charter
10. Caves, hazards and set pieces
11. Atmosphere and audio
12. 4K art direction, quality tiers and camera
13. Screens and menus
14. Onboarding
15. Save profile v2 and migration
16. Kiln contract compliance
17. Scope: version 1 compared with later, with build milestones
18. Risks and open questions

---

## 1. Pillars and what we keep

**Pillars**
1. **Sound is sight.** Every system, purchase and biome must change *how you perceive* the cave. A bat that is only "+10% speed" fails this pillar.
2. **You are feeding a family.** Moths are not points but food for the roost. Pups are not a multiplier but named individuals who come home and stay.
3. **Earned, never extracted.** Every currency comes from flying well. Every price is honest and final. Nothing expires.
4. **Dark, quiet, beautiful.** The game is closer to a nature documentary at night than to an arcade. There is no confetti.

**Kept from v1.0.0, unchanged in feel**
- Tap to chirp, hold to shriek, sonar rings painting fading dots, the permanent faint memory map, and echoes returning with distance-matched delays.
- The colour code: teal rock, blue water, violet crystal, gold food, pink pups, red danger. This is locked and cosmetics cannot override it (see §5).
- Bat physics (`ACC 1050`, `MAXV 255`, damping, wall bounces that stun and never kill). This becomes the stat line of the starter bat.
- The pup trail following the bat's flown path, and banking `carried × (1 + pups)` at the moonlit arch.
- Fair hazards that warn first, and seeded deterministic caves.
- The night flight, made shorter and varied (§10).

---

## 2. The loop at four timescales

| Timescale | Loop | What the player feels |
|---|---|---|
| **Moment** (1-5 s) | chirp → read → steer → eat or rescue | "I can see because I sang." |
| **Sortie** (2-4 min) | enter a named cave → find the pups → reach the arch → **Homecoming** (bank, Marks, colony +N) → short night flight | "I brought Wren and Bramble home with 64 moths." |
| **Session** (10-25 min) | 4-6 sorties, then the Roost: spend moths at the Perch, check Commissions, read a new Field Guide card | "Two more caves and I can welcome Nox." |
| **Week and beyond** | Reaches unlock by skill, new species arrive as the colony grows, tonight's real moon phase changes Moonrise, Migration best | "The colony is 61 strong. The horseshoe bat comes at 50." |

---

## 3. Economy

### 3.1 Two currencies and one population. That is all.

| Name | Type | What it is in the fiction | Earned by | Spent on | Ever lost? |
|---|---|---|---|---|---|
| **Moths** | Spendable, functional | Food the roost stores for the winter | Banking at exits, night flight, rare moths, Mark and Commission rewards, Moonrise, Migration milestones | **Welcoming bats** and **Training** (functional only) | Banked moths never. Carried moths are lost on death, as today. |
| **Amber** | Spendable, beauty only | Fossil resin with insects trapped inside, treasured by the elders | Mark 2 and 3 first clears, hidden **amber pockets** (one per cave), Reach completion, Field Guide pages, Moonrise | **Keepsakes**: coats, echo tints, chirp voices, roost decor, trail styles | Never |
| **Colony** | Population, not spendable | Every pup you have brought home, by name | Pups that reach the arch with you | Nothing. Milestones *attract* new species and grow the Roost. | Never |

**The rule a player can say back in one sentence:** *Moths change how you fly. Amber changes how you look. Pups grow your family.* There is no conversion between them, no premium currency, no bundles and no exchange rate to hide a price behind.

Today's score (banked moths) stays the Kiln score, so `Arcade.runEnd` still reports it.

### 3.2 Moth earn sources (numbers)

**Banking formula (unchanged):** `bank = carried × (1 + pups in trail)`.

| Source | Amount | Notes |
|---|---|---|
| Common moth | 1 carried (2 at full energy, as today) | Multiplied by the pups at the exit |
| **Rare moth** (12 real species, §8.5) | 5 carried | About one per cave at 8% spawn. The first catch of each species writes a Field Guide page. |
| Mayfly (Drowned Bells only) | 1 carried, 2 for Daubenton's | Swarm over rivers |
| Night flight moth | +1 straight to the bank (gold +3) | Not multiplied, as today |
| **Mark 2** (all pups home), first time | +40 moths and +1 amber | |
| **Mark 3** (cave mastery), first time | +80 moths and +2 amber | |
| **Reach completion** (first Heart clear) | +300 moths and +5 amber | |
| Commission | 60-200 moths (some pay amber, §8.2) | Three on the board at a time, none expire |
| **Moonrise** (daily cave), first finish each calendar day | +150 moths and +1 amber | No streak and no penalty for missing a day (§9) |
| Migration depth milestones (first time) | Cave 5: 100, 10: 250, 15: 500, 20: 800 | Plus everything banked during the run |

### 3.3 Expected yield per cave (competent play, first clear, including the night flight)

| Reach | Moths in cave | Pups | Typical carried × mult | Night flight | **Typical per sortie** | First-clear Mark bonus |
|---|---|---|---|---|---|---|
| I Chalk Throat | 18 | 1-3 | 13 × 2.5 | 12 | **≈ 45** | up to 120 |
| II Weaver's Gallery | 20 | 2-4 | 14 × 3.2 | 15 | **≈ 60** | up to 120 |
| III Drowned Bells | 22 + mayflies | 3-4 | 16 × 3.5 | 18 | **≈ 75** | up to 120 |
| IV Geode Choir | 22 | 3-4 | 16 × 4 | 20 | **≈ 85** | up to 120 |
| V Owlery | 24 | 4-5 | 17 × 4.5 | 22 | **≈ 100** | up to 120 |
| Migration (endless) | as v1 spec | 1-3 | | | **≈ 45/min** sustained | milestones |

Replays pay the same base yield, so replaying a favourite cave is allowed and is never punished with diminishing returns. Mark bonuses pay once. Later Reaches simply pay more per minute, which pulls players forward instead of rewarding farming in cave 1.

### 3.4 Sinks (total functional spend ≈ 43,000 moths)

| Sink | Count | Cost | Subtotal |
|---|---|---|---|
| Welcoming bats (§4) | 6 species | 400 / 900 / 1,500 / 2,400 / 3,600 / 6,000 | **14,800** |
| Training (§4.4) | 7 bats × 3 tracks × 3 ranks | 100 / 250 / 500 × species factor | ≈ 21,700 |
| Knacks (§4.5) | 7 | 800 × species factor | ≈ 6,800 |
| **Total** | | | **≈ 43,300** |

The amber sinks are in §5 (about 340 amber for the whole Shelf).

### 3.5 Pacing model (the targets that tests and playtests check)

| Milestone | Target time played | How |
|---|---|---|
| First species arrives (Hollis, colony 4) | ≈ 8 min (after cave 3) | Pups from caves 1-3 |
| First bat affordable (400 moths) | ≈ 15-20 min | About 6 sorties plus Mark bonuses |
| Reach II unlocked | ≈ 25 min | Clear the Heart cave "The Long Dark" |
| Third bat owned | ≈ 2 h | |
| Campaign finished (all 25 caves exited) | ≈ 5-7 h, with about 4 bats owned | Fully possible with Pip alone |
| All Marks | ≈ 9-11 h | Some Mark 3s are easier with a fitting bat, but all are possible with Pip |
| Everything owned and trained | ≈ 18-22 h | Migration, Moonrise and replays |
| Amber Shelf complete | ≈ 25-30 h | The long tail, cosmetic only |

**Cumulative check:** finishing Reach I yields ≈ 5 × 45 + 5 × 120 + 300 = **1,125**. Finishing Reach II brings the total to ≈ 2,800. A player can therefore welcome Hollis (400) and Dabb (900) before reaching the water Reach where Dabb shines, with change left over for training. That is intended.

All economy numbers live in `js/data/economy.js` as one table, so rebalancing is a data edit. A pure-function test (§17) simulates the full campaign and asserts the milestones above to within ±25%.

---

## 4. The bats

### 4.1 Design rule
Each species is a **real bat**, with a real trait turned into a **different way of seeing or moving**, plus a clear weakness. Every bat uses the same gesture set (tap, hold-still, drag, second finger, and the keys Space and Shift), so the controls never need relearning. What changes is what those gestures *do*.

Buying a bat is framed as **welcoming** it: you offer moths from the roost's store, and the bat joins the colony. Each bat is a named individual. Their portraits on the Perch are drawn by the same parametric bat renderer as in flight (§12.6).

### 4.2 Roster for version 1 (7 bats)

| # | Name, species | Colony needed | Welcome price | Species factor | In one line |
|---|---|---|---|---|---|
| 1 | **Pip**, Common pipistrelle | n/a | free | 1.0 | The all-rounder you know |
| 2 | **Hollis**, Brown long-eared bat | 4 | 400 | 1.0 | Hears what she cannot see |
| 3 | **Dabb**, Daubenton's bat | 12 | 900 | 1.1 | Skims rivers like a swallow |
| 4 | **Fen**, Natterer's bat | 24 | 1,500 | 1.2 | Slips through gaps and hangs to rest |
| 5 | **Nox**, Common noctule | 36 | 2,400 | 1.3 | Fast, loud and forward-facing |
| 6 | **Horace**, Greater horseshoe bat | 50 | 3,600 | 1.4 | Sees with a steerable beam |
| 7 | **Ash**, Ghost bat | 70 | 6,000 | 1.5 | An apex hunter that scares owls |

"Colony needed" means the species *arrives* at the Roost once your colony reaches that size. It then shows on the Perch with its price. Before that, it appears as a silhouette with "Arrives when your colony reaches 36". This is information, not a tease: there is no countdown and no "almost!".

### 4.3 Stats and abilities (base values; Pip equals today's constants)

| | Pip | Hollis | Dabb | Fen | Nox | Horace | Ash |
|---|---|---|---|---|---|---|---|
| Body radius `BAT_R` | 8 | 8 | 8 | **6.5** | 10 | 8.5 | 10.5 |
| Accel `ACC` | 1050 | 950 | 1100 | **1400** | 1250 | 1000 | 900 |
| Top speed `MAXV` | 255 | 220 | 260 | 230 | **320** | 240 | 250 |
| Max energy `E_MAX` | 100 | 100 | 100 | 90 | 110 | 105 | **140** |
| Drain × | 1.00 | 0.90 | 1.00 | 0.95 | 1.15 | 1.00 | **1.35** |
| Energy per moth | 4 | 4 | 4 | 4 | 4 | 4 | **6** |
| Tap voice | Chirp 420 px, 200 rays, 0.6 s | Chirp **330**, 0.6 s | Chirp 400, 0.6 s | Chirp 380, **0.5 s** | **Forward Call**: 140° cone, **640 px**, 0.8 s | Click 300, 0.6 s | Chirp 420, 0.6 s |
| Hold voice | Shriek 840, 3 s | **Hush** 700, 3 s | Shriek 760, **4 s** | Shriek 760, 3 s | **Stoop** (dash) | **Beam** (continuous) | **Roar** 840, 3 s |
| Echo life | 2.2 s | **4.0 s** | 2.2 s (water 4.4) | 2.2 s | 2.0 s | 2.2 s (moving things 3 s) | 2.2 s |
| Bump stun | 0.3 s | 0.3 | 0.3 | **0.15** | 0.3 (cost ×1.5) | 0.3 | 0.25 |

**What each one actually changes**

- **Pip, the Common pipistrelle (starter).** Today's bat, exactly. The baseline that every Mark is verified against.

- **Hollis, the Brown long-eared bat.** Real trait: her enormous ears let her hunt by listening to insects' own sounds.
  - **Listen (passive):** within 280 px, moths, pups, ticking stalactites and drips give off a faint ripple every 1.5 s without any chirp. You learn to fly half-blind and read the cave by its *noises*.
  - **Hush (replaces the shriek):** a wide quiet ping that never wakes owls and never shakes stalactites.
  - **Echoes last 4 s:** she is the patient reader.
  - **Weakness:** small chirp and the slowest top speed.
  - **Shines in:** the Owlery and Hushmoss Hollow.

- **Dabb, Daubenton's bat.** Real trait: trawls insects off the surface of ponds with its feet.
  - **Trawl (passive):** touching water is a skim, not a splash (no damage). River currents *boost* you (+40% speed along the current) instead of shoving you. Mayflies are worth double. Water echoes last twice as long.
  - Rivers stop being obstacles and become highways, so your whole route through the Drowned Bells changes.
  - **Weakness:** the shriek is shorter and slower to recharge, which hurts in big dry chambers.

- **Fen, Natterer's bat.** Real trait: hunts in dense clutter and is a superb slow flier.
  - **Small and nimble:** the smallest body and the sharpest turning, with half the bump stun.
  - **Squeezes:** every cave has one gap of radius 7 or less. Only bats with radius ≤ 7 fit through, and it is a shortcut to the amber pocket. The pocket can *also* be reached by a longer route, so no bat is required for it.
  - **Perch:** hold still against a ceiling to hang. Drain drops to ×0.2 while hanging, and owls ignore a hanging bat. This lets you wait out an owl patrol or a gust cycle.
  - **Weakness:** 90 energy and a lower top speed.

- **Nox, the Common noctule.** Real trait: a big, fast open-air bat with long-range calls.
  - **Forward Call:** the tap paints a 140° cone 640 px ahead, so you see far forward but nothing behind.
  - **Stoop (replaces the shriek):** hold still, double-tap, or press Shift to dash 200 px in 0.25 s (2.5 s cooldown). The dash tears through webs and ignores currents and gusts.
  - **Weakness:** the biggest wingspan after Ash, bumps cost ×1.5, and narrow branches are a risk.
  - **Shines in:** Migration and Windpipe. This is the speedrunner's bat.

- **Horace, the Greater horseshoe bat.** Real trait: a constant-frequency call and Doppler hearing that detects fluttering wings.
  - **Beam (replaces the shriek):** hold a second finger, or hold Shift, or hold still for a 2 s burst. A 50° beam aims along your flight direction, reaches 560 px and repaints continuously (40 rays every 0.1 s). It costs 0.8 energy per second while on.
  - **Doppler:** anything *moving* inside the beam (a swooping owl, a falling stalactite, a moth, a drip) is outlined hot white and its echo lasts 3 s.
  - **Tap:** a small click of 300 px.
  - Crystal re-echo still answers the beam (once per 1.2 s per cluster).
  - **Weakness:** no area burst at all. You see only where you look.

- **Ash, the Ghost bat.** Real trait: Australia's carnivorous bat, large and pale.
  - **Roar (shriek):** owls hit by it fall stunned for 4 s, webs within 200 px tear, and every stalactite in range shakes. That last part is a risk you choose to take.
  - **Passive:** webs cannot hold her (she tears free in 0.3 s), stalactite hits cost half, and moths give +6 energy.
  - **Weakness:** she burns energy fast (×1.35 drain), she is heavy and wide, some pup alcoves are a tight fit, and her ordinary chirp wakes owls within 200 px.
  - **Shines in:** Weaver's Gallery and the Great Owl Heart.

**Code impact.** Today's top-level constants (`BAT_R, ACC, MAXV, EAT_R, E_MAX, CHIRP_*, SHRIEK_*, ECHO_LIFE`, drain and hurt values) become fields of `PP.bat.stats`, resolved from `data/bats.js` plus training. Voices are strategies: `voice.tap(bat)` and `voice.hold(bat, held)`. Each strategy calls the existing `sonar(ox, oy, R, rays, kind)`, extended with an optional `arc` (centre angle and spread) for the cone and the beam. The HUD's energy pips scale from `E_MAX` (10 pips per 100, with partial pips) and its cooldown arcs come from the voice.

### 4.4 Training (functional upgrades, paid in moths)

There are three tracks per bat with three ranks each. They are deliberately small (at most about +12-15%) so that skill always dominates.

| Track | Per rank | Rank costs (× species factor) |
|---|---|---|
| **Wings** | +4% accel and top speed | 100 / 250 / 500 |
| **Voice** | +5% sonar radius and −5% cooldown | 100 / 250 / 500 |
| **Autumn fat** (real bats fatten before winter) | +6 max energy and −3% drain | 100 / 250 / 500 |

**Training is 100% refundable at any time** ("Rest" on the Perch returns every moth spent on that bat). Experimenting costs nothing.

### 4.5 Knacks (one per bat, unlocked once all three tracks are at rank 2; costs 800 × species factor)

A knack is a twist on the bat's identity, not a stat bump.

| Bat | Knack | Effect |
|---|---|---|
| Pip | **Homing** | Pups in your trail answer each chirp with a pink ping that reveals unrescued pups within 600 px |
| Hollis | **Silent wings** | Wall bumps make no sound and never wake owls; Listen radius 400 |
| Dabb | **Spray** | While skimming, emits a free 200 px ripple-sonar each second |
| Fen | **Roost anywhere** | Can perch on walls too, and regains +0.5 energy per second while perched |
| Nox | **Double stoop** | Two dash charges |
| Horace | **Wide beam** | 80° beam, and crystals hold a Doppler afterimage |
| Ash | **Apex** | A Roar scatters moths *toward* you |

### 4.6 Try before you welcome
- **Practice Hollow:** a fixed small cave reached from the Perch where you can fly *any arrived* species free, at base stats, for as long as you like. You can see exactly what you would buy.
- **Moonrise loaner:** the daily cave sometimes features a species of the night that you may fly even if you do not own it (§8.3).
- A welcome is **final but never wasted**, because every bat is useful somewhere and the trial removes regret. There are no refunds on bats; training is refundable instead.

### 4.7 Later bats (post version 1)

| Bat | Species | Idea |
|---|---|---|
| **Tadi** | Mexican free-tailed bat | The fastest bat; Migration specialist; slipstream behind the pup trail |
| **Rou** | Egyptian fruit bat | Tongue-click sonar firing every 0.2 s at 260 px; sees moonlit and glowworm-lit rock without sonar |
| **Hoar** | Hoary bat | Frost coat; resists the cold of Rime Hollow; glide efficiency |
| **Vesper** | Common vampire bat | Can **land and scuttle** on floors (real trait); immune to gusts while grounded |
| **Dot** | Spotted bat | Calls audible to the bat's prey: chirps startle moths into flight toward you |

---

## 5. Cosmetics: the Amber Shelf (amber only, never stats)

| Category | Items in version 1 | Price (amber) | Notes |
|---|---|---|---|
| **Coats** (per bat) | 3 per bat × 7 = 21. Real colour morphs: ginger, leucistic (pale), melanistic, plus one Reach-themed coat (Chalk-dusted, Root-stained, River-sheen, Geode-flecked, Moonlit) | 6-12 | Recolours `P.body/belly/wing` through the parametric renderer |
| **Echo tints** | 5: Teal (default), Seafoam, Frost, Bone, Verdigris | 10 | **Restricted to rock echoes, from a vetted palette** that keeps contrast with water blue, crystal violet, gold and danger red. Hazard colours can never be changed by a cosmetic. |
| **Chirp voices** | 5: Classic, Glass, Wood click, Bell, Low hum | 8 | Sound skins: timbre only; pitch envelope and timing unchanged |
| **Trail styles** | 4: Hearts (default), Sparks, Notes, Petals | 6 | Pup trail particles |
| **Roost decor** | 8: glowworm strands, crystal cluster, tree roots, moon window, river pool, amber lamp, owl pellet (a joke), fossil fern | 8-15 | Placed in fixed slots on the Roost ceiling |

There are about 43 items and about 340 amber in total. Amber available in version 1 is about 125 from the campaign (Mark 2 = 1, Mark 3 = 2 and the pocket = 2 per cave, × 25), plus 25 from Reach completions, about 30 from the Field Guide, about 20 from Commissions, and 1 per Moonrise day. This gives roughly 200 at the end of the campaign, with the rest coming from Moonrise and replay pockets.

A **colourblind palette** (deuteranopia and tritanopia safe) is a *free setting*, never a purchase.

---

## 6. The colony: the meta-progression spine

The pup rescue is the soul of the game, so it carries the meta-progression.

- **Every campaign pup is a named individual.** Each named cave has 1-5 fixed pups, each with a generated name and a one-line note (for example "Wren, found hanging above the first web in Cobweb Bend"). The 80 campaign pups are unique: once home, they stay home.
- **Replays still have pups** (as cousins or strays), so the multiplier still works. They add to the colony as unnamed members. Migration and Moonrise pups count the same way. There is no cap.
- **The Roost** is the home screen: a cave ceiling where **every pup you have brought home is drawn hanging**, up to about 400 rendered (beyond that, clusters shown as dense dark masses with a count). Tap any pup and it squeaks back and shows its name and where it was found. Pups mature into adults after you clear 3 more caves (progress, not time), and their sprite grows.
- **Colony milestones** do three things: they attract species (§4.2), unlock Roost features, and change the Roost's music and lighting.

| Colony | Unlocks |
|---|---|
| 4 | Hollis arrives; the Perch opens |
| 8 | Commissions board (the elders start asking) |
| 12 | Dabb arrives |
| 20 | Roost decor slots 1-3 |
| 24 | Fen arrives |
| 36 | Nox arrives; Roost music gains a second voice |
| 50 | Horace arrives; decor slots 4-6 |
| 70 | Ash arrives |
| 80 | All named pups home: the "Whole colony" Field Guide page (+10 amber) |
| 100 / 150 / 250 | Roost glow and choir layers; title screen bat stream grows |

Campaign pups by Reach are 10, 15, 16, 17 and 22 (total 80). Ash at 70 therefore arrives late in Reach V for a campaign-only player, or earlier for someone who plays Migration and Moonrise. **Colony never gates the story;** only skill does (§7).

---

## 7. World map: five Reaches, 25 named caves

### 7.1 Structure
- The map is a vertical cross-section of a hillside. Reaches stack downward and sideways, joined by the passages your night flights take. Caves are nodes along each Reach's path.
- Each Reach has **4 caves plus a Heart cave** (a set piece).
- **Unlock order:** each cave unlocks the next. Clearing a Heart unlocks the next Reach. Exiting is the only gate; it never requires Marks, currency or colony.
- **Each cave is one sortie.** You start at full energy, and the run ends at the arch or on death. The energy squeeze across caves stays in **Migration**, today's endless mode.
- **Named caves are generated, not hand-drawn.** Each is `biome params + fixed seed + overrides` (forced hazards, forced pup alcoves, an amber pocket, a squeeze, and a landmark).
  - Seeds are chosen offline by a seed-scan dev script (`games/pipistrelle/dev/seedscan.cjs`). It rejects seeds where the autopilot cannot finish, pups are unreachable, or Mark 3 is impossible with Pip.
  - The chosen seeds are frozen in `data/caves.js`.

### 7.2 The Reaches

| Reach | Biome look | Echo and light character | New hazards | Music (§11) |
|---|---|---|---|---|
| **I. The Chalk Throat** | Pale limestone, flowstone curtains, swallow-hole skylights | Classic teal, sparse glowworms | (tutorial) webs, drips, stalactites | D minor, 70 bpm (today's `SONG`) |
| **II. Weaver's Gallery** | Root cave under an old wood: ochre and rust rock, hanging tree roots, silk curtains | Warm amber ambient motes | **Roots** (swaying thin obstacles), **glowworm lures** | A Phrygian wooden plucks, 66 bpm |
| **III. The Drowned Bells** | Flooded karst, green-black water with reflections, bell-shaped domes | Blue water echoes linger; drips ring like bells | Rivers, flood, drips, mayfly swarms, **rising water** | E minor bells, 60 bpm, long tails |
| **IV. The Geode Choir** | Amethyst geodes, prisms, dust in light shafts | Violet; crystals split rings into rainbows | Crystals (helpful), gusts, **hushmoss** | B Lydian glass pads, 72 bpm |
| **V. The Owlery** | Moonlit sea-cliff chimneys, silver and indigo, owl pellets | Moonbeams light parts of the cave | Owls, gusts, **moonbeams** | F minor wind flute, 64 bpm |

### 7.3 Cave-by-cave table (version 1)

"Size" is world width × height in px. M2 is always **all pups home**; M1 is simply reaching the exit.

| # | Cave | Size | Pups | Hazards (new in **bold**) | Mark 3 (mastery) | Landmark or secret | Best-fit bat |
|---|---|---|---|---|---|---|---|
| 1 | **Swallow Hole** | 2100×1040 | 1 | none (fly, chirp) | Eat 12 moths | A skylight shaft of grey dawn | Pip |
| 2 | **Flowstone Stair** | 2520×1080 | 2 | none (shriek lesson in a dark hall) | Exit in under 40 s | A huge flowstone "frozen waterfall" | Pip |
| 3 | **Cobweb Bend** | 2520×1120 | 2 | **webs** | Never caught in a web | First squeeze (tutorial: "a smaller bat could fit…") | Fen |
| 4 | **Dripping Choir** | 2940×1160 | 2 | **drips, stalactites** | Take no damage | Stalactite forest | Hollis |
| 5 | ♥ **The Long Dark** | 3360×1300 | 3 | stalactites; no ambient light at all | Exit using 12 chirps or fewer | **Set piece:** the last chamber collapses behind you as a stalactite cascade chases you to the arch | Pip |
| 6 | **Root Cellar** | 2940×1160 | 3 | **roots**, webs | Bank at ×3 or better | Roots of a single great oak | Fen |
| 7 | **Lantern Hall** | 2940×1200 | 3 | **glowworm lures** | Never touch a lure | A ceiling of real glowworms beside the fake lures | Hollis |
| 8 | **Silk Market** | 3360×1200 | 3 | dense webs, stalactites | Exit with ≥ 50 energy | Web maze around a hollow | Ash |
| 9 | **Hollow Oak Shaft** | 2100×2200 (tall, exit up and right) | 3 | roots, gusts (light) | Find the amber pocket | Climb inside a buried trunk | Nox |
| 10 | ♥ **The Weaver's Loom** | 3780×1300 | 3 | webs | All pups home, never caught | **Set piece:** the Old Weaver, a huge spider silhouette that can never be touched, re-spins webs across passages behind you. Keep moving and do not backtrack. | Ash or Nox |
| 11 | **Ferryman's Run** | 3360×1200 | 3 | **rivers** | Never splash | A long underground river | Dabb |
| 12 | **Bell Domes** | 3360×1240 | 3 | drips (ringing), **mayflies** | Eat 6 mayflies | Domes that ring a note when a drip lands | Dabb |
| 13 | **Sump Gallery** | 3780×1240 | 3 | flood with a low air gap | 3 bumps or fewer | Air pocket with a fossil | Fen or Dabb |
| 14 | **Undercroft** | 3780×1280 | 3 | two rivers, drips | Exit in under 70 s | Drowned stone steps (an old human mine) | Dabb |
| 15 | ♥ **Bell Tower Flood** | 2400×2600 (tall) | 4 | **rising water** | Take no damage | **Set piece:** water rises from below at 18-30 px/s as you climb, and the bells ring louder as it closes in | Nox or Dabb |
| 16 | **Prism Gate** | 3360×1240 | 3 | crystals | Trigger 6 crystal re-echoes | A prism that splits rings into colour | Pip |
| 17 | **Hushmoss Hollow** | 3360×1280 | 3 | **hushmoss** (no echo returns from moss) | 10 chirps or fewer | A meadow of moss where your memory map is everything | Hollis |
| 18 | **Windpipe** | 3780×1280 | 3 | gusts (strong) | Never pushed into a wall by a gust | Chimney that howls in tune | Nox or Fen |
| 19 | **Organ Loft** | 3780×1320 | 4 | crystals, gusts, stalactites | Light all choir crystals with one shriek | Wall of crystal pipes | Pip |
| 20 | ♥ **The Choir** | 3360×1400 | 4 | crystals | Finish in under 90 s | **Set piece:** five great crystals must be sung in order (each answers with a note); the full chord opens the sealed arch | Horace |
| 21 | **Moonwell** | 3360×1320 | 4 | **moonbeams** (lit zones: you see without sonar, but owls see you) | Never seen by an owl | A moonlit well shaft | Hollis |
| 22 | **Pellet Gallery** | 3780×1320 | 4 | owls (sleeping) | No owl wakes | An owl roost ledge | Hollis or Fen |
| 23 | **Barn Chimney** | 2400×2400 (tall) | 4 | owls, gusts | Exit with ≥ 40 energy | An old barn's floor above the cave mouth | Nox |
| 24 | **Thousand Wings** | 4200×1400 | 5 | wild colony (decoy bats) | All pups home in under 2 min | Your pups answer your chirp with pink pings among thousands of wild bats | Pip (Homing) |
| 25 | ♥ **The Great Owl** | 4200×1500 | 5 | owl hunt | No damage | **Set piece:** a great owl patrols and homes in on your *noise*. Each chirp reveals the cave and also reveals you. The ending flight follows: the whole colony streams out under the moon and the credits play. | Hollis, Fen or Ash |

**Generator work this needs** (§10.3):
- A `tall` layout (exit top-right, `H` up to 2600) for 9, 15 and 23.
- Set-piece scripts for the five Hearts.
- Overrides for landmarks, squeezes and pockets.

**Migration** unlocks after clearing The Long Dark (immediately for v1 players). It runs today's endless `caveSpec` but rotates through the biomes you have unlocked, uses biome art and music, and keeps the energy carry-over.

---

## 8. Missions

### 8.1 Marks (per cave, 75 in total)
- **M1, Return:** reach the arch.
- **M2, Whole family:** every pup home in one sortie.
- **M3, Mastery:** the cave-specific goal in §7.3.

The cave card shows the Marks, your best bank and the named pups (found or still lost). Marks can be earned in separate sorties. They are evaluated by `missions.js` listening to the event bus (`moth`, `pup`, `bump`, `hurt`, `web`, `splash`, `chirp`, `shriek`, `crystal`, `owlWake`, `seen`, `exit`, `death`), so every evaluation is a pure function over the sortie's stat record and is unit-testable.

### 8.2 Commissions (the elders' board, from colony 8)
Three requests from named elders (Old Hask, Mother Brindle, Tallow the Blind) are pinned at a time. They **never expire**. A completed commission is replaced by a new one drawn from a pool of about 40, with weights matched to your progress. You can swap one freely at any time; there is no cost and no limit. Rewards are 60-200 moths, and about one in four also gives 1-2 amber.

**Example commissions**
1. "Bring home 6 pups from Weaver's Gallery." 120 moths.
2. "Bank 150 moths in a single cave." 150 moths.
3. "Catch a luna moth." 1 amber + 80 moths.
4. "Fly a whole cave without a shriek." 100 moths.
5. "Tear free of 10 webs." 80 moths.
6. "Skim 400 px of river in one sortie (any bat)." 100 moths.
7. "Reach cave 8 in Migration." 200 moths.
8. "Wake no owls in three caves in a row." 2 amber.
9. "Use a crystal re-echo to find a pup." 120 moths.
10. "Fly the Practice Hollow with a bat you don't own." 60 moths (a nudge to *try*, not to buy).
11. "Exit Lantern Hall having chirped at every lure." 100 moths.
12. "Hang (perch) for 10 seconds next to an owl." 1 amber.
13. "Bank at ×5 or better." 200 moths.
14. "Finish a Moonrise." 100 moths.
15. "Survive a rising-water section without a bump." 150 moths.

### 8.3 Moonrise (daily cave, offline)
- **Seed:** `hash(YYYY-MM-DD)`. The biome rotates among those you have unlocked.
- **Moon:** the **real lunar phase** for the device date (a closed-form synodic-month formula, about 10 lines, no network).
  - **New moon:** the night flight is near black, glowworms are brighter, and owls sleep deeper (wake radius −30%).
  - **Full moon:** moonbeam zones are brighter, owls hunt (wake radius +30%), and night moths are ×1.5.
  - **Quarter moons:** neutral.
- **Fair flight:** base stats and no training. A **species of the night** is offered as a loaner on about 2 nights in 7. You may also fly any bat you own.
- **Reward:** the first finish each date gives +150 moths and +1 amber. Replays that day give normal bank only.
- A local calendar shows the nights you flew as small moons. There is **no streak counter and no broken-streak state**: a missed night simply shows an empty sky.

### 8.4 Migration (endless; the Kiln high score)
- Today's game, upgraded with biome rotation, energy carry-over and the night flight.
- Its best score is the Kiln best (`save.setBest`).
- Depth milestones pay once (§3.2).
- Continue works as today: it resumes at the saved cave entrance with the entry energy.

### 8.5 Field Guide (collection and lore; pages pay amber)

| Section | Pages | How to fill | Reward |
|---|---|---|---|
| **Moths** | 12 real species: luna moth, death's-head hawkmoth, garden tiger, rosy maple, emperor, oak eggar, peppered (pale and melanic forms), elephant hawkmoth, Atlas, comet, cinnabar, herald | Catch one; a rarer species appears in its home Reach | 1 amber per page, and 5 for the set |
| **Hazards** | 13 cards (the 7 existing plus roots, lures, hushmoss, moonbeams, rising water, the wild colony) | First encounter (this replaces the long banners) | Read-only; holds the tip |
| **Bats** | 7 species with a real natural-history note | Welcome the bat | n/a |
| **Colony** | 80 named pups | Bring each home | 10 amber at 80 |
| **Caves** | 25 lore lines (the elders' oral map) | Clear the cave | 1 amber per Reach set |

---

## 9. Reasons to come back tomorrow, and the fairness charter

### 9.1 Reasons to return (none of them punish absence)
1. **Tonight's moon is different.** Moonrise uses the real phase, so the sky, owls and night moths really change through the month.
2. **A new seeded Moonrise cave**, sometimes with a loaner species of the night.
3. **The next species is visibly close:** "Colony 31 of 36: Nox arrives." This is plain information with no pop-ups.
4. **Commissions waiting** on the board, with no expiry.
5. **Marks and pockets left** on the map: the cave card shows which pups are still lost, by name.
6. **The Roost grows:** pups mature as you clear caves, and new decor slots open.
7. **Migration best**, plus depth milestones.
8. **Calendar events, computed offline:** International Bat Night (late August), Bat Week (24-31 October) and the winter solstice. Each adds a cosmetic-only night flight variant and a commission. **Every event cosmetic returns every year and can also be earned outside the event by a Commission**, so nothing is ever exclusive.

### 9.2 Fairness charter (written into `docs/pipistrelle/DESIGN.md` and checked in review)
- Real money, ads, loot boxes and random-reward purchases: none of them, ever. Every price buys a known item.
- **No timers:** no energy, no lives, no cooldowns on play, no "come back in 4 h", no maturation by real time.
- **No streaks that punish:** the daily reward is identical whether or not you played yesterday.
- **No scarcity theatre:** no rotating stock, no "limited", no countdowns, no "only today", no inflated "was" prices.
- **Exact prices and balances** are always shown together. There is never a premium currency to obscure them.
- **Try before you welcome** (Practice Hollow and the Moonrise loaner), and **training is fully refundable**.
- **The story is gated by skill only.** Reaches unlock by exiting the Heart. The campaign is verified completable, with every Mark achievable, using Pip with no training. This is checked by playtest and, for M1, by autopilot in the seed scan.
- **Cosmetics never change stats**, and they cannot override the hazard colour code.
- **Losing is kind:** banked moths are never lost. A death costs only that cave's carried moths.
- **No notifications** (offline; none are needed).
- **Quiet UI:** no pop-up offers, no red badges on the shop. A small dot marks a *new* item once, and it clears when seen.

---

## 10. Caves, hazards and set pieces

### 10.1 Polishing the existing hazards (real art and tells; behaviour unchanged except where noted)

| Hazard | Version 1 treatment |
|---|---|
| Stalactite | Layered limestone cone with drip tip; tick sound plus a dust sift; falls with a trail; shatter debris that lands and stays on the floor as rubble echo |
| Owl | Proper barn-owl silhouette with heart-shaped face; animated sleep, alert (head swivel, eye glow) and swoop (wing spread); a tell with a feather-rustle sound |
| River | Filled water body with surface line, reflection band of the lit rock above, current flecks, and a mist layer |
| Web | Radial silk with dew beads that catch echo light; sags when torn |
| Gust | Visible dust columns, pre-gust "inhale" particles drawn inward, a howl that rises in pitch |
| Drip | Glint, a falling drop with streak, splash ring, and the drip's ring as a micro-sonar (it paints 60 px) |
| Crystal | Faceted clusters; re-echo in rainbow split |

### 10.2 New hazards in version 1 (each built from existing systems)

| Hazard | Reach | Mechanic | Why it is about sound |
|---|---|---|---|
| **Roots** | II | Thin swaying line obstacles (a solid capsule, bump-only) | They echo as thin teal lines that sway, so they must be re-pinged |
| **Glowworm lures** | II | Gold lights that *look* like moths but are sticky threads: they hold you like a 1.5 s web | A lure echoes as **teal rock, not gold**: trust your ears over your eyes |
| **Hushmoss** | IV | Cells of type 6: `cast` treats them as solid but returns no echo and no memory | You must fly by the memory map and the edges of the silence |
| **Moonbeams** | V | Lit screen-space shafts: you see the rock there without sonar, but an owl with a line of sight to a bat inside a beam wakes | Light is a trap; the dark is safety |
| **Rising water** | III Heart | Flood level rising over time | Bells ring faster as it nears |
| **Wild colony** | V | Hundreds of decoy bats (cheap particles, which also flock away from you) | Your pups answer your call in pink; others don't |

### 10.3 Generator extensions (in order of cost)
1. **Biome parameters:** palette, rock painter, hazard pool and weights, `rad`, `H` and length come from `data/biomes.js`.
2. **Overrides:** forced pup alcoves, the amber pocket (a dead-end chamber off a branch), the squeeze (a carved passage of radius 7 joining a branch to the pocket), and a landmark (a stamped chamber shape).
3. **Tall layout:** the path's control points move up with the exit at the top-right (the existing Catmull-Rom and flow-field code works for any exit cell; the arch art rotates to a skylight).
4. **Hearts:** a `setpiece.js` per Heart with `start`, `update` and `draw` hooks on top of a generated cave.

**Random-stream split (needed for Marks and Moonrise):** separate `rng.gen`, `rng.sim` and `rng.fx` streams, so cosmetic randomness no longer shifts the simulation.

### 10.4 Night flight, rethought
- **Length:** 8 s by default. It follows the map route to the next cave, and the setting "Night flight: Full (15 s) / Short (8 s) / Skip" exists. *Skip* banks the 8 s average yield, so skipping is never a loss.
- **The world is a fixed size** (900×506 world px), independent of the screen.
- **The landscape matches the Reach:** chalk downs, old wood, water meadows, crystal scree and sea cliffs.
- **The moon** follows the real phase in Moonrise and a scripted phase in the campaign.
- **One small event per flight** (about 30%): a firefly swarm (bonus moths), drizzle (dimmer, slower moths), a tawny owl crossing (dodge it; no damage, but you lose the moths you were chasing), or a wind ribbon (speed boost).

---

## 11. Atmosphere and audio

- **A song per Reach** (§7.2), built from `makeSong` parameters and seeded per biome, *not* `Kit.rng(77)` for all. Each song has these layers:
  - **Bed:** drone and ambience. Wind in the Owlery, water in the Bells, creaking wood in Weaver's Gallery, crystal hum in the Choir, a faint drip in Chalk.
  - **Pulse:** switched on deeper into a cave (by the bat's x progress), so tension rises *inside* a cave and not only between caves.
  - **Danger:** a low string that swells while an owl is alert, rising water is near, or energy is below 25.
  - **Exit:** moon strings within 600 px of the arch.
  - **Family (signature):** each pup in your trail adds one voice to a small music-box melody, so a full trail is a full song. The homecoming plays it at full.
- **Reverb by cave size:** a short synthetic impulse (noise decay generated with an `OfflineAudioContext`), sized from the local `dist` field. Small tunnels sound dry; great halls sound long. It is applied to the echo voices only.
- **Chirp voices** are cosmetic timbres (§5).
- **Sound effects:** 23 today, plus about 12 new (lure stick, root sway, hushmoss "thud of silence", moonbeam hum, mayfly swarm, bell rings, rising water, stoop, beam loop, roar, perch, pup squeak on the Roost).
- **Mixer:** separate music and effects volumes in Settings. Ducking stays as today.

---

## 12. 4K art direction, quality tiers and camera

### 12.1 Look
"Echo-lit naturalism":
- Rock is **almost black**, with a per-biome base hue and very subtle strata that only reveal themselves *where light touches*: the echo dots, the bat's warm light, moonbeams and crystals.
- The memory map is drawn as fine contour engraving, not as a blur.
- Lights are soft, dithered and never banded.
- Silhouettes (owls, roots, the Weaver) are drawn as vectors so they are razor-sharp at any resolution.

### 12.2 Camera: the same field of view everywhere
- Replace `zoom = clamp(sqrt(w·h)/600, 0.82, 1.45)` with a **target visible world area of about 400,000 world px²**. Today's phone sees about 360k.
  - Clamp so that the short side shows at least 420 world px and the long side at most 1,100.
  - 16:9 landscape therefore shows about 843×474 world px at *any* resolution, and a 390×844 phone about 430×930.
  - At 3840×2160 the zoom is about 4.6, so the bat is a hero-sized sprite and the exit is no longer visible from the start.
- This also fixes fairness: Marks and Moonrise are equal across devices.

### 12.3 Rendering changes

| Today | Version 1 |
|---|---|
| `#pp-low` at 0.6 × CSS and no DPR | Back layer at tier scale × device px (Low 0.5, Med 0.75, High 1.0, Ultra 1.0) |
| Rock and memory as two whole-cave canvases at 0.5 texel per world px, nearest-neighbour | **Chunked cave art:** 256×256 world-px tiles, painted on demand at `min(zoom × dpr × renderScale, tierCap)` texels per world px (caps: Low 0.75, Med 1.25, High 2, Ultra 2.5), held in an LRU cache with a budget of Low 24 MB, Med 48, High 96 and Ultra 160. This sidesteps the 8192 px and iOS canvas limits. |
| Stair-stepped edges | **Vector rim pass:** the `segs` edges near the light are stroked at full resolution on the main canvas. Edges are crisp at every tier. |
| 256 px noise stretched | A per-biome **512 px detail pattern** (`createPattern`) composited in screen space at device resolution, so micro-texture stays sharp even when chunks are upscaled |
| Dark mask at ¼ CSS | Mask at tier scale (Low ¼, Med ⅓, High ½, Ultra ½) with a smooth upscale |
| 32 px echo dot sprites, 128 px glow sprite | Sprites built at `ceil(maxDrawSize × dpr)` per tier (dots up to 64, glow 512), with a 1/255 blue-noise dither layer to remove gradient banding |
| `Kit.view` DPR cap 2 and 3.4 MP | Pipistrelle passes its own `maxDpr` (tier: 1.5 / 2 / 3 / 3) and `maxPixels` (2.5 / 4 / 9 / 9 MP). This needs a one-line kit option for `gfx.dpr`'s initial cap, or the game sets `gfx.dpr` after view creation. |
| Backdrop tiles at 1× | Built through `gfx.layers` (DPR-aware), per biome |
| HUD at fixed CSS px in an 1100 px column | **UI scale** `ui = clamp(minSide / 400, 1, 2.75)`, anchored to safe-area corners, with a handedness mirror |

### 12.4 Quality tiers and the dynamic resolution governor

| | Low | Medium | High | Ultra |
|---|---|---|---|---|
| Max DPR | 1.5 | 2 | 3 | 3 |
| Render scale range | 0.6-0.85 | 0.7-1.0 | 0.8-1.0 | 1.0 |
| Echo dots and lines in the pool | 2,400 / 1,800 | 3,600 / 2,600 | 4,800 / 3,400 | 6,000 / 4,000 |
| Ambient particles | 40 | 90 | 160 | 260 |
| BG ring relight | 1 ring | 2 | 4 | all |
| Moon rays and dust | off | lite | full | full |

- **Auto (default):** start at Medium on touch devices and High on desktop.
- **Governor:** it measures p90 frame time over a rolling 2 s window.
  - Above 18 ms: step the render scale down by 0.1, then drop a tier.
  - Below 12.5 ms for 6 s: step back up.
  - It never changes during the first 1 s of a cave.
- The settings screen shows the current tier and render scale. "Show FPS" is optional.

**Performance obligations**
- game-check's 390×844 @2 software run must stay at **p95 ≤ 25 ms** (warning threshold).
- A new `test.cjs` case at 3840×2160 @1 asserts that the governor settles at ≤ 40 ms p95 in headless software. Real GPUs will be far faster.

**Fill-rate fixes**
- Batch the ring relight (one clip path holding all rings) and `memFlush` (one path per colour bucket).
- Remove the per-frame allocations in `drawDark`, `autoSteer` and `drawEntities`.
- Rebuild the night scene with cached tree layers and no per-frame big gradients.

### 12.5 Orientation
- The Android shell is **portrait-locked** (`AndroidManifest.xml`), while desktop and TV at 4K are landscape. Every screen and the camera work in both orientations.
- Menus use a two-column layout when width is greater than height, and stacked panels otherwise.

### 12.6 The parametric bat renderer
`batArt.js` draws every species from parameters:
- ear shape (pointed, long, horseshoe noseleaf, round)
- ear scale
- wing aspect (narrow for Nox, broad for Fen)
- body size
- palette and coat pattern

The same renderer draws in flight, on the Perch (large, idle-animated) and on the Roost.

---

## 13. Screens and menus

All menus are DOM over the canvas, sized in `rem` with the root font size set to `16px × ui`. All are hidden in `?keyart`.

| # | Screen | Contents | Phase reported |
|---|---|---|---|
| 1 | **Title** | Animated cave mouth at dusk; bats stream out (more as the colony grows); a sonar ring reveals the PIPISTRELLE logotype, which is sized to fit and never wraps. "Tap to fly". | `title` |
| 2 | **Roost** (home hub) | Ceiling of your colony (tap a pup to hear it). Four exits: **Map**, **Perch**, **Field Guide**, **Elders' board**. Top corners: moths and amber balances, tonight's moon (Moonrise), Settings. | `title` |
| 3 | **Map** | Cross-section of the hillside; Reach panels; cave nodes with Mark pips and pup count (for example "3/4"); Migration and Moonrise entries | `title` |
| 4 | **Cave card** | Name and lore line; Marks; named pups (found or lost); best bank; amber pocket found or not; **bat picker**; Fly button | `title` |
| 5 | **Perch** (bats) | Carousel of species: large portrait, stat bars, voice demo animation, strengths and weaknesses, *Fly in Practice Hollow*, **Welcome · 2,400 moths** (shown next to your exact balance) | `title` |
| 6 | **Training** | 3 tracks × 3 ranks with exact effects and costs; Knack; **Rest (refund all)** | `title` |
| 7 | **Amber Shelf** | Keepsakes by category with live preview on the selected bat | `title` |
| 8 | **Elders' board** | 3 commissions, progress, swap button | `title` |
| 9 | **Field Guide** | Tabs: Moths, Hazards, Bats, Colony, Caves | `title` |
| 10 | **Moonrise** | Tonight's moon and what it changes, the species of the night, your moon calendar | `title` |
| 11 | **In-flight HUD** | Energy pips (from `E_MAX`), voice cooldown arcs, carried × multiplier, pup icons, compact Mark tracker (M3 only, small, top-right), elder whispers (one line, 2.5 s, never over the bat) | `play` |
| 12 | **Pause** | Resume, Restart cave, Leave to Roost, How to play, Settings shortcut, **Sound**, **Vibration**, **Back to games** (Kiln only) | `paused` |
| 13 | **Homecoming** (results) | Haul count-up (as today's exit moment) → Marks stamp in → moths and amber earned → "Colony +3: Wren, Bramble, Moss" → informative line ("Nox: 1,820 / 2,400") → Next cave / Replay / Roost | `over` |
| 14 | **The echoes fade** (death and Migration end) | Quiet: banked moths kept, carried lost, depth reached, best. No confetti. | `over` |
| 15 | **Settings** | Music volume, effects volume, haptics, graphics (Auto/Low/Med/High/Ultra), show FPS, colour assist, handedness, stick sensitivity, shriek hold time (600-1200 ms), night flight length, reduce flashes, text size, reset progress (two-step confirm) | `title` or `paused` |
| 16 | **Credits** | Plays over the ending flight and can be opened from Settings | `title` |
| 17 | **Welcome confirm** | "Welcome Nox to the roost? 2,400 of your 2,615 moths." Buttons: Welcome / Not now. No timer. | `title` |

---

## 14. Onboarding

- **Reach I is the tutorial**, one idea per cave:
  - Cave 1: fly and chirp. This is today's ghost-hand tutorial, kept.
  - Cave 2: shriek.
  - Cave 3: webs and the squeeze tease.
  - Cave 4: drips and stalactites.
  - Cave 5: the memory map.
- **Lesson pockets:** each new hazard first appears alone in a safe chamber you must pass, with a single whisper line from an elder. The Field Guide card is filed automatically. **Banners never sit over play.**
- **Multiplier explained by the game:** the first pup rescued shows "×2" on the trail itself. The first homecoming visibly multiplies the count.
- **Economy introduced only when it matters:**
  - At colony 4, Hollis arrives in a Roost moment and the Perch opens with a sentence: "Offer moths from the store to welcome her."
  - The first Training opens after the first welcome.
  - Amber appears with the first Mark 2.
- **Next goal:** the Homecoming always shows *one* next goal (a lost pup, a Mark, or an arriving species), never more.

---

## 15. Save profile v2 and migration

Everything lives in one `Arcade.store` key, `profile`, plus `run` for the Migration continue, which `registry.saves: 'run'` keeps pointing at.

```js
{
  v: 2,
  moths: 0, amber: 0,
  colony: { total: 0, named: { 'c07-1': { name: 'Wren', at: 'c07', grown: false } } },
  bats: { owned: ['pip'], selected: 'pip',
          training: { pip: { wings: 0, voice: 0, fat: 0, knack: false } },
          spent: { pip: 0 } },                       // for the 100% refund
  caves: { c01: { cleared: true, marks: [1,1,0], best: 46, pocket: false } },
  reach: 1,
  commissions: [ { id, progress } ],
  moonrise: { '2026-10-12': { done: true, bank: 88 } },
  migration: { best: 0, depth: 0, milestones: [] },
  guide: { moths: {}, hazards: {}, caves: {} },
  cosmetics: { owned: [], equipped: { pip: { coat, tint, voice, trail } }, decor: [] },
  stats: { sorties: 0, chirps: 0, shrieks: 0, bumps: 0, time: 0, runs: 0 },
  flags: { taught: false, seen: {} },
  settings: { quality: 'auto', music: 0.8, sfx: 1, nightFlight: 'short', ... }
}
```

**Migration from v1** (it runs once and keeps the old keys untouched for one version as a backup):
- `best` → `migration.best`
- `runs` → `stats.runs`
- `taught` → `flags.taught`
- a saved `run` stays the Migration continue
- **Old hands gift:** if `best > 0`, grant `min(1500, best × 2)` moths, the *First Echo* coat for Pip, Migration unlocked immediately and Reach I's tutorial skippable.

Writes are debounced, and every schema change bumps `v` with a migration function plus a test. `Arcade.progress({ label: 'Reach II · Root Cellar', pct: marks / 75 })` gives Kiln a true percentage.

**Standalone readiness:** an **export and import save code** (base64 of the profile) in Settings gives offline-safe backup.

---

## 16. Kiln contract compliance

- **Same folder, SDK and test hooks.** Classic `<script>` modules in order under one `window.PP` namespace (the split from the technical map, §13). This works in the WebView, the PWA and `file://`.
- **`tools/bundle.cjs`** must either inline local scripts or exclude Pipistrelle from the single-file bundle. `docs/GAME_CONTRACT.md` must allow multi-file games. This is a prerequisite decision outside the folder.
- **`__kilnTest.start()`** starts a deterministic **Migration** run with Pip (phase `play`). `lose()` ends it (`run_end` with a numeric score).
- **Phases:**
  - Every menu reports `title`, so game-check doesn't count menu frames as gameplay.
  - Cave and night report `play`.
  - Homecoming and death report `over`.
- **Pause** keeps Back to games, Sound and Vibration.
- **`?keyart`** hides all DOM; scenes `art`, `shot1` and `shot2` are kept (now in biome-rich caves, rendered at the *real* tier rather than a special `hiQ`).
- **Test hooks:** every existing hook name used by `test.cjs` is kept. New ones are `bat(id)`, `biome(id)`, `namedCave(id)`, `currency(moths, amber)`, `profile()`, `mark(id)`, `quality(tier)`, `moon(phase)` and `setpiece(step)`.

---

## 17. Scope: version 1 compared with later, with build milestones

### 17.1 Version 1 (the "full suite" release)
- The module split, the event bus and the random-stream split.
- Quality tiers, the governor, chunked cave art, the vector rim, the UI scale and the constant-area camera. **4K-crisp.**
- Profile v2 with migration, export and import.
- Front end: Title, Roost, Map, Cave card, Perch, Training, Amber Shelf, Elders' board, Field Guide, Moonrise, Homecoming, Settings, Credits.
- **5 Reaches and 25 named caves**, including the 5 Hearts, plus Migration and Moonrise.
- **7 bats**, with training, knacks and Practice Hollow.
- 6 new hazards and polished art for the 7 existing ones.
- About 43 keepsakes.
- 12 moth species, 40 commissions and 75 Marks.
- 5 biome songs with adaptive layers, including the family layer.

### 17.2 Cut line if the schedule slips (cut in this order; everything above it stays)
1. Calendar events.
2. Roost decor.
3. Night flight mini-events.
4. Two of the five Heart set pieces simplified to "a harder cave with a landmark" (The Weaver's Loom and The Choir are the most cuttable).
5. Knacks.
6. Rare moths 7-12.

### 17.3 Later (version 1.x and 2)
- **Reaches VI-VIII:**
  - **Sulphur Lung:** hot vents, and mist that muffles sonar range.
  - **Rime Hollow:** ice, echoes travel farther, frost on wings.
  - **Saltmouth:** a sea cave whose tides open and close passages.
- Five more bats (§4.7).
- **Echo Remix:** a new game plus mode with mirrored caves and harder Marks.
- A ghost of your best Migration run.
- Gamepad support for TV.
- A cave photo mode.
- Roost pup life stages.
- A Moonrise *week* cave.
- Standalone app packaging.

### 17.4 Build milestones (parallel agents; each ends with `node tools/game-check.cjs --game pipistrelle` and `test.cjs` green)

| M | Work | Parallel tracks | Exit test |
|---|---|---|---|
| **M0** | Module split with behaviour identical to today; event bus; rng streams; the bundle and contract decision | 1 agent | `test.cjs` 17/17; fingerprint updated once and stable |
| **M1** | Rendering: tiers, governor, camera, chunked art, rim, sprites, HUD UI scale | 1-2 agents | 390×844 @2 p95 ≤ 25 ms; 4K governor ≤ 40 ms; game-check sharpness OK at 1920×1080 @2 |
| **M2** | Profile v2 and migration; economy table and simulator; front end shell (Title, Roost, Map, Cave card, Homecoming, Settings) | 2 agents | Migration test from v1 keys; economy simulation within ±25% of §3.5 |
| **M3** | Bats: stats plumbing, voices (cone, beam, dash, hush, roar), perch, trawl, parametric renderer; Perch, Training and Practice Hollow | 2 agents | One test per bat ability; all 7 bats clear cave 1 by autopilot |
| **M4** | Biomes and caves: biome data, art, backdrops, hazards (6 new plus polish), tall layout, overrides, seed-scan, 25 frozen seeds, 5 Hearts | 3 agents (one per pair of Reaches, plus one for the Hearts) | Seed-scan: autopilot M1 on all 25; per-hazard tests |
| **M5** | Missions: Marks, Commissions, Moonrise and moon phase, Field Guide, Amber Shelf; audio (biome songs, layers, reverb, new effects) | 2 agents | Mark evaluation unit tests; Moonrise determinism per date |
| **M6** | Onboarding, playtest pass (an independent critic per Reach), balance tune, store art scenes, docs (`docs/pipistrelle/DESIGN.md`, `BUILD_PLAN.md`) | 2 agents | Full critic sign-off; no console errors at 3 sizes |

---

## 18. Risks and open questions

1. **Bundle and contract decision (blocks M0).** Should `tools/bundle.cjs` be extended to inline local scripts, or should Pipistrelle be excluded from `dist/kiln.html`? I recommend extending it (small and contained).
2. **Kit DPR cap.** `gfx.dpr` starts capped at 2 inside `kit.js`. Either add a `maxDpr` passthrough to the kit (a shared-code change, but tiny) or override it after creation in the game.
3. **Phone memory.** The chunk LRU budgets (24-160 MB) must be validated on a mid-range Android WebView. The governor should also lower `tierCap` on `webglcontextlost`-style pressure signals or long GC pauses.
4. **Ability input on one thumb.** Horace's beam and Nox's stoop share "hold still" with today's shriek gesture. This needs a playtest. The fallbacks are a second finger and an optional on-screen action button (setting: "Show action button").
5. **Economy tuning.** The numbers in §3 are a model. The economy simulator and the M6 playtest decide the final values, which are data-only edits.
6. **Named pups and frozen seeds.** If generator code changes after M4, the frozen seeds may produce different caves. The seed-scan plus fingerprint tests catch this, and generator changes after M4 require a rescan.
7. **Bat Week (24-31 October 2026)** falls only about two weeks after this decision. It should not be a version 1 target. Use it as a 2027 event.