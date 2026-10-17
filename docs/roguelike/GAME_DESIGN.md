# SLURP — Game Design Document

_Working title. A slime roguelite where you become what you defeat._

_Status: **draft v0.1, a proposal for review**. Every number here is a starting value for
tuning, not a final one. Decisions I made on your behalf are listed in §19 (Open Questions)
with the default I assumed. Testable requirements live in
[`REQUIREMENTS.md`](./REQUIREMENTS.md)._

---

## Contents

1. [Vision](#1-vision)
2. [Setting & Tone](#2-setting--tone)
3. [Core Loops](#3-core-loops)
4. [Run Structure & the Map](#4-run-structure--the-map)
5. [The Slime](#5-the-slime)
6. [Absorption: the Core System](#6-absorption-the-core-system)
7. [Mutation Visuals](#7-mutation-visuals)
8. [Combat](#8-combat)
9. [Emergent Strategy: Designing to Be Broken](#9-emergent-strategy-designing-to-be-broken)
10. [Economy, Relics, Morsels, Events](#10-economy-relics-morsels-events)
11. [Enemies, Elites, Bosses, Remnants](#11-enemies-elites-bosses-remnants)
12. [Meta Progression](#12-meta-progression)
13. [Difficulty: Salt Levels & Endless](#13-difficulty-salt-levels--endless)
14. [UX & Screens](#14-ux--screens)
15. [Audio](#15-audio)
16. [Technical Design](#16-technical-design)
17. [Scope & Milestones](#17-scope--milestones)
18. [Risks](#18-risks)
19. [Open Questions](#19-open-questions)
20. [Appendices](#20-appendices)

---

## 1. Vision

### 1.1 Pitch

You are a single slime. Every creature you beat, you **eat**, and you pick which part of
it becomes part of you: the wolf's pounce, the turtle's shell, the bat's thirst, the
spider's extra legs. Eat the same thing three times and it **fuses** into something
stronger. Your slime visibly grows horns, plates, wings and extra eyes as you go. Pick
a path across a branching map of fights, elites, shops, events and treasure, Slay the
Spire style. Each battle is a 1v1 auto-battle: turns resolve underneath, animation plays
on top. Combinations are supposed to get out of hand. When the run ends, your slime
melts back into the Brood Pool, and what it learned unlocks more for the next one.

> **You are what you eat. Eat something broken.**

### 1.2 What we take from Batomon, and what we change

Batomon Showdown is an async-PvP, Pokémon-flavored auto-battler. You build a team over a
short run of rounds out of creatures, trainers, trinkets, items and encounters. Its
hooks are merging duplicates (three Level 1 copies make a Level 2, two Level 2s make a
Level 3, and Level 4 comes only from events or items), a trinket choice on every merge,
shiny variants, and synergies that "stack in ways that feel intentionally abusable."
It has no meta progression. (Details come from reviews and community guides, see
§20.3, since the store pages weren't reachable from here.)

| Batomon | SLURP | Why |
|---|---|---|
| Buy creatures from a shop after each fight | **Absorb** one of 3 essences from the enemy you just beat | The reward comes out of the fight itself. "What it used, you can take." |
| 6-creature team | **6 essence slots** (start with 4, grow to 6) | Keeps the "team of six" composition puzzle inside one body |
| 3 copies → L2, then L3 | Absorb the same essence: **3 copies → II, 6 copies → III** | Same merge feel and the same pull toward committing to a carry |
| L4 only from events/items | **Apex (IV)** only from special events, items and boss rewards | A rare peak to chase |
| Every merge gives a trinket choice | Every fusion triggers a **Fusion Burst** (pick 1 of 3 boons) | Fusing should be a celebration |
| Maxed species leave the shop | Essences at III leave the offer pools | No dead offers |
| Creature types/synergies | **Families** (Beast, Stone…) with 2/4/6 Resonance, plus **Elements** and hybrids | Composition matters |
| Trainers with unique powers | **Species** (starting slimes) that each bend absorption rules | Distinct runs from turn one |
| Trinkets / items / encounters | **Relics / Morsels / Events** | Familiar roguelite vocabulary |
| Shiny variants | **Iridescent** essences | The rare sparkle |
| Async PvP vs other players | **Remnants**: fight ghosts of *your own* past slimes | Async-battle flavor with no other players, no ladder |
| ~10 rounds against opponents | Branching map, 3 acts plus a finale | Path choice is the strategic layer Batomon lacks |
| **No meta progression** | Unlocks, bounded Instincts, a lineage system, Feats (§12) | Fixes your main complaint |

### 1.3 Pillars

1. **You are what you eat.** Every win changes the slime mechanically *and* visually. The
   absorb pick is the game's most important decision and its most frequent pleasure.
2. **Designed to be broken.** Individual pieces are modest. Combinations scale
   multiplicatively and are *meant* to reach absurd numbers. The game celebrates that and
   doesn't patch it out (§9).
3. **Readable chaos.** Combat is a deterministic turn simulation, so every effect has a
   clear moment, a log line and a trace. The real-time visual layer just makes that
   moment feel good.
4. **Every run leaves a mark.** Meta progression mostly widens the possibility space.
   Past slimes persist as heirlooms, ghosts and portraits.
5. **Short, decisive, mobile.** Each node is a meaningful decision that takes about a
   minute. You can stop and resume anywhere.

### 1.4 Player fantasy

Turning a wobbling green drop into a horned, plated, six-eyed, lava-veined monstrosity
that deletes a boss in one turn, and knowing it happened *because of the picks you
made*.

### 1.5 Platform, audience, session

- **Platform:** Android first (the reference is an Android game). Web build for desktop
  and testing. iOS later. Portrait, one-handed, offline.
- **Audience:** players of Slay the Spire, Balatro, Super Auto Pets and Batomon. People
  who like theorycrafting and big numbers.
- **Session:** about 40 minutes for a full run, 12–15 per act, resumable at any point.

### 1.6 Non-goals

- No online leaderboards, PvP ladder or other players' data. Remnants only use *your* runs.
- No real-time action controls. Combat is turn-based underneath.
- No gacha or pay-for-power. Monetization is open (§19, Q7), but nothing buys strength.
- No permadeath of meta progress. Losing a run always earns something.

---

## 2. Setting & Tone

**Default (see Q1):** the game is set in the **Hive Queen** world, reusing its zones,
monsters, stats and elements, so the existing project's content and code carry over.

- Under the Hive lies the **Brood Pool**. Each run, the Queen buds a single **Champion**
  slime and sends it down through the wilds. (The Queen still never fights; that is a
  Hive Queen principle.)
- At the bottom of the Void Abyss waits **The Hollow One**, "an emptiness given form that
  consumes all it touches." It is the anti-slime, a devourer like you, and the final boss.
- When a champion dies, it melts back into the Pool. What it learned becomes **Genes**,
  the meta currency, and the next champion is born knowing more.

**Tone:** cute-gross. Squishy, bouncy, a little disgusting, never grim. Absorption is
slapstick: the slime slurps up a wolf's ears and they keep twitching on its head.
Writing is light and dry. Enemies are critters, not villains, except the Hollow One.

---

## 3. Core Loops

```
 ┌──────────────────────────── META LOOP (between runs) ─────────────────────────────┐
 │  Brood Pool: spend Genes → unlock species / content / Instincts → pick Heirloom   │
 │        ▲                                                                   │      │
 │        │ Genes, Feats, Heirloom, Hall of Slimes portrait                   ▼      │
 │  ┌─────┴───────────────────── RUN LOOP (≈40 min) ───────────────────────────┐     │
 │  │  Act 1 → Act 2 → Act 3 → Finale (The Hollow One) → optional Endless      │     │
 │  │  ┌──────────────────── NODE LOOP (≈1 min) ─────────────────────┐         │     │
 │  │  │ read map → pick next node → resolve → reward → absorb/fuse  │         │     │
 │  │  │            ┌──── BATTLE (≈20–40 s) ────┐                    │         │     │
 │  │  │            │ watch turns · use Morsels │                    │         │     │
 │  │  │            │ · speed up / skip         │                    │         │     │
 │  │  │            └───────────────────────────┘                    │         │     │
 │  │  └─────────────────────────────────────────────────────────────┘         │     │
 │  └──────────────────────────────────────────────────────────────────────────┘     │
 └───────────────────────────────────────────────────────────────────────────────────┘
```

Where the decisions happen, most important first:

1. **Absorb pick** (after every win): which piece of the enemy becomes part of you.
2. **Path choice** (every node): which fights (and therefore which essences) to chase,
   and how much risk to take.
3. **Shop, Pool and Event choices:** spending, healing versus growing, gambling.
4. **Battle setup:** Action priority order and Morsel timing.
5. **Meta choices:** which Instincts, Heirloom, species and Salt level to bring.

---

## 4. Run Structure & the Map

### 4.1 Acts and biomes

A run is **3 acts plus a short Finale**. After each act boss, the player **chooses the
next act's biome** from two options, seeing each one's dominant families and element.
That choice is strategic for absorption builds: "I need Water essences, so I'm going to
the Swamp." Before alternates are unlocked (§12), each act offers one biome.

| Act | Biome A (start) | Biome B (unlock) | Character |
|---|---|---|---|
| 1 — The Shallows | Verdant Forest 🌲 (Nature) | Murky Swamp 🌿 (Water) | Learn the loop; commons and Families |
| 2 — The Depths | Crystal Grotto 💎 (Earth) | Cinderspire 🔥 (Fire) | Build-defining essences; first Keystones |
| 3 — The Heights | Stormspire Summit ⛰️ (Water/neutral) | **Salt Flats** 🧂 (new; dries slimes out) | Build checks; scaling tests |
| Finale | The Hollow (Void Abyss) 🕳️ | — | Pool → Shop → The Hollow One |

The six Hive Queen zones and their 30 monsters seed the roster (§11). The Salt Flats is
the one new biome. Its hazard, **Desiccation**, makes you lose 2% max Mass per round in
battle, which pushes you toward sustain or fast kills.

### 4.2 Map generation (per act)

This closely follows Slay the Spire's proven generator.

- A grid **7 columns × 12 rows**, plus a boss row.
- Generate **6 walks** from random row-1 columns. Each step moves up to the left, straight
  or right column. Paths may merge but may not cross. Unused cells are removed.
- **Fixed rows:** row 1 is all **Fight**, row 7 is all **Treasure**, row 12 is all
  **Pool** (rest), and row 13 is the **Boss**.
- **Constraints:**
  - No Elite or Pool in rows 1–4.
  - No two consecutive Elites, Shops or Pools on any path.
  - Children of a branching node have different types.
  - At least one path has two or more Shops-or-Pools.
  - At least two Elites per map.
- **Weights for the free rows** (tunable, and modified by Salt):

| Node | Weight | Node | Weight |
|---|---|---|---|
| Fight ⚔️ | 40 | Pool 💧 | 10 |
| Event ✦ | 15 | Shop 🛒 | 6 |
| Mystery ❓ | 12 | Hatchery 🥚 | 4 |
| Elite 💀 | 9 | Remnant 👻 | 4 (only once you have past champions, otherwise Fight) |

A typical path visits about **12 nodes plus the boss** per act, roughly 42 per run including the Finale.

### 4.3 Node types

| Node | What happens | Reward |
|---|---|---|
| **Fight** ⚔️ | 1v1 against a normal enemy from the act's roster | Absorb (pick 1 of 3) + Gel |
| **Elite** 💀 | Tougher enemy with an Elite Modifier (§11.3) | **Relic** + Absorb from a richer pool (one **Concentrated** option worth 2 copies) + more Gel |
| **Boss** 👑 | Act boss with phases and a build check | Pick 1 of 3 **Boss Essences** (Keystones) + pick 1 of 3 Boss Relics + **+1 slot** (Acts 1–2) + heal |
| **Shop** 🛒 | The Gelatinous Bazaar (§10.3) | Buy essences, relics, Morsels and services |
| **Event** ✦ | A known event: text, art, 2–4 choices (§10.6) | Varies, with risk/reward |
| **Mystery** ❓ | Unknown: Event 55%, Fight 25%, Shop 10%, Treasure 10% (with Slay the Spire–style pity) | Varies |
| **Treasure** 🎁 | A cache. The slime swallows a relic | 1 relic (Common 50 / Uncommon 33 / Rare 17%) + some Gel |
| **Pool** 💧 | Rest site. Choose one: **Soak** (heal 35%), **Ferment** (+1 copy to an owned essence), **Molt** (remove an essence for Gel) | Plus meta-unlocked options (§12) |
| **Hatchery** 🥚 | Mitosis pool: **duplicate** (+1 copy) any owned essence for 10% of current Mass. Can repeat at rising cost | Fusion fuel |
| **Remnant** 👻 | Fight the ghost of one of your past champions (§11.5) | Absorb one of *its* essences as 2 copies + bonus Genes |

### 4.4 Information and scouting

Absorption is targeted: you path toward the essences you want. So the map shows more
than Slay the Spire does.

- **Fight** nodes show the enemy's **Family icon** (paw = Beast, leaf = Flora…), not the
  exact species.
- **Elite** nodes show the exact species and its modifier on long-press.
- The **Boss** is revealed at act start, along with its Boss Essence pool.
- Exact species on Fight nodes can be unlocked through a relic (Compass Needle) or an
  Instinct (Keen Senses).
- A **Lure** (a Pool option and a Morsel) lets you pick the next Fight's enemy from 3 candidates.

### 4.5 Act transitions

After a boss: heal **100% of missing Mass** (Salt 5+ reduces this), gain the slot, pick
the next biome, and see the new map. The run autosaves at every transition.

### 4.6 Length targets

| Unit | Target |
|---|---|
| Normal battle | 6–10 rounds; 15–25 s at 1×, about 6 s at 4× |
| Elite / Boss | 10–15 / 15–25 rounds |
| Node, including menus | about 60 s on average |
| Act | 12–15 min |
| Full run | 35–50 min. A first-time losing run is 10–25 min |

---

## 5. The Slime

### 5.1 Stats

These keep Hive Queen's slime vocabulary, but each stat now does exactly **two** jobs, so
every stat pick is easy to read.

| Stat | Icon | Job 1 | Job 2 |
|---|---|---|---|
| **Mass** (HP) | 🫧 | Hit points | **Body size**: the slime visibly grows, shrinks when hurt, and swells when overhealed |
| **Firmness** (FIRM) | 💪 | Basic attack and physical ability damage | Membrane gained from FIRM-scaled effects |
| **Slipperiness** (SLIP) | 💨 | Turn order and **Tempo** (extra actions, §8.2) | Dodge: `50% × SLIP / (SLIP + 60)`, hard cap 75% with flat sources |
| **Viscosity** (VISC) | 🌀 | Effect magnitude: `base + viscScale × VISC` (Hive Queen's formula) | Proc chance on status essences |

Crit is **not** a stat. Crit chance is a base 5% and comes from essences and relics, so
crit is an archetype you choose rather than a tax on SLIP. Base crit damage is ×1.5.

**Membrane** 🛡️ is the shield mechanic. It absorbs damage before Mass and dissolves at
the start of its owner's turn unless something retains it. ("Membrane doesn't dissolve"
is a deliberately breakable rule.)

### 5.2 Slots

- **4 essence slots** at the start, +1 after the Act 1 boss, +1 after the Act 2 boss, for
  **6** by Act 3. That is the "team of six." Relics, Construct Resonance and some boss
  Keystones can add more (hard cap 8).
- Slots hold **Actions, Reflexes, Traits and Keystones**. **Stat** and **Element** essences
  take no slot and are permanent.
- Each species' **innate** ability is slotless and can't be removed.

### 5.3 Elements, affinity and hybrids

These reuse Hive Queen's cycle, **Fire → Nature → Earth → Water → Fire**: ×1.25 against
the element you're strong into, ×0.75 against the one you're weak into.

- Essences may carry elemental **affinity points**. Your **primary element** is your
  highest affinity once it reaches 3 or more, and it sets your attack element and body color.
- When a **second element** also reaches 3 or more, you become a **hybrid**. Each hybrid
  unlocks a passive and a body effect:

| Hybrid | Elements | Passive (draft) | Body |
|---|---|---|---|
| **Steam** | Fire + Water | +10% dodge; your Burns also apply Softened | Vents puffing steam |
| **Magma** | Fire + Earth | Membrane deals fire damage equal to 50% of what it absorbed | Glowing cracks |
| **Ash** | Fire + Nature | The enemy heals 50% less; Poison ticks also Burn 1 | Smoldering embers |
| **Mud** | Water + Earth | Hits apply Sticky 1; +10% max Mass | Dripping and sagging |
| **Bog** | Water + Nature | Regen also cleanses 1 debuff stack | Algae and bubbles |
| **Amber** | Earth + Nature | Stuns last +1 round; relics inside you glow (+5% their effect) | Golden, translucent resin |
| **Prismatic** | All four ≥ 3 | Your attacks always count as the element strong against the defender | Rainbow refraction |

Attacking as a hybrid uses whichever component is better against the defender. When
defending, a hybrid uses its primary element.

### 5.4 Species (starting slimes)

Species fill the role Batomon's trainers do. Each one **bends the absorption rules**,
which is what makes runs feel different from the first fight. There are four at launch
and three more to unlock (§12).

| Species | Fantasy | Base (Mass/FIRM/SLIP/VISC) | Innate (rule bend) | Starter essence |
|---|---|---|---|---|
| **Gloop** 🟢 | The Omnivore | 80 / 6 / 6 / 6 | Absorb offers show **4** options instead of 3 | *Bounce* (Action, CD 3: 160% FIRM + 3 Membrane) |
| **Ironjelly** ⚙️ | The Bulwark | 100 / 7 / 3 / 5 | **Stat essences ×1.5**. Starts with 3 slots (max 5 baseline) | *Plating* (Trait: gain Membrane = FIRM at battle start) |
| **Prismjelly** 💎 | The Refiner | 65 / 6 / 5 / 8 | **Fuses at 2 / 4 copies** instead of 3 / 6, but offers show only 2 options | *Refract* (Reflex: on crit, +1 affinity to your lowest element for the battle) |
| **Mimic** 🪞 | The Copycat | 70 / 5 / 8 / 6 | At battle start, temporarily copies the enemy's signature essence (Level I) for that battle | *Mirror Coat* (Reflex: the first status applied to you each battle is also applied to the enemy) |
| _Acid Ooze_ 🧪 | The Dissolver (unlock) | 75 / 7 / 5 / 6 | Can **Dissolve** an essence at Pools, turning its copies into permanent +4% FIRM/VISC each | *Corrode* (Trait: hits apply Corrode 1) |
| _Royal Heir_ 👑 | The Spoiled One (unlock) | 70 / 5 / 5 / 5 | Starts with a Relic choice and +1 Instinct capacity; Gel income −25% | *Command* (Action, CD 4: the enemy skips its next action) |
| _Void Slime_ 🕳️ | The Hungry (unlock) | 60 / 8 / 7 / 7 | **No slot limit**, but loses 3% max Mass per round in battle. Each kill grants +1 FIRM for the rest of the run | *Hunger* (Trait: lifesteal 10%) |

---

## 6. Absorption: the Core System

### 6.1 Essence types

Enemies are built from the **same essences** the player absorbs. If an enemy used it,
you can take it. That keeps absorption intuitive (you just watched the Pounce, now you
can have it) and means one implementation serves both sides.

| Type | Slot? | What it is | Example (Young Wolf) |
|---|---|---|---|
| **Stat** | No | Permanent stat gain | *Lean Muscle*: +2 SLIP |
| **Element** | No | Affinity points, often with a small stat | *Ember Core*: +2 Fire, +1 VISC |
| **Action** | Yes | Active ability on a cooldown that uses your turn | *Pounce*: CD 3, 150% FIRM + Bleed 2 |
| **Reflex** | Yes | Triggered ability that doesn't use your turn | *Feral Instinct*: below 50% Mass, gain Enraged 2 (once per battle) |
| **Trait** | Yes | Passive or aura | *Fangs*: +8% crit chance |
| **Keystone** | Yes | Rare rule-breaker from bosses and some elites | *Hydra Heart*: your Reflexes trigger twice |

Each essence also has a **Family** (synergy tag; some have two), an optional **Element**,
a **rarity** (Common, Uncommon, Rare, Keystone), and an optional **Morph** (the visual
body part it adds, §7).

### 6.2 The absorb moment

After every won battle, the enemy melts into a puddle and **essence orbs** rise from it.

1. **Candidate pool** = the defeated enemy's essence pool, minus essences you already
   have at III.
   - A normal enemy's pool is about 5 essences: 1 **signature**, 2 **family-shared**, 1
     **stat** and 1 **element** (if the enemy is elemental).
   - Elites add their elite signature, plus a 10% chance of a Keystone.
2. **Offer size** is 3 (Gloop 4, Prismjelly 2; relics can add).
3. **Guarantee:** at least one slotted essence (Action, Reflex or Trait) when the pool
   has one.
4. **Signature appearance:** 50% on normal enemies, 100% on elites. The elite's
   signature is **Concentrated** and counts as 2 copies.
5. **Weighted draw without replacement:** Common 60 / Uncommon 30 / Rare 10.
   **Affinity** gives essences you already own ×2 weight. This is the anti-frustration
   lever for fusion.
6. **Alternatives to absorbing:**
   - **Digest**: skip the pick and take either +15 Gel or a 15% heal.
   - **Reroll**: only if you hold reroll tokens (from relics or Instincts).
7. Absorbing **heals 5% of max Mass**. Eating restores you.

### 6.3 Fusion (the merge-3 analog)

| Level | Copies (cumulative) | What changes |
|---|---|---|
| **I** | 1 | Base values |
| **II** | 3 | Values improve by about 1.6×. The Morph grows |
| **III** | 6 | Values about 2.5× **plus a rider**, a qualitative new clause. Often **evolves** into a renamed form (Pounce → *Rending Pounce*). The Morph reaches its full form. The essence leaves offer pools |
| **Apex (IV)** | Special only | A second rider. Comes only from the Professor Ooze event, the shop-only *Apex Serum*, or certain Keystones |

- Copies come from absorbing it again, **Concentrated** essences (+2), Ferment at Pools
  (+1), the Hatchery (+1), the shop's **Infuse** service (+1), events and relics.
- **Fusion Burst:** every time an essence reaches II or III, pick 1 of 3 boons.
  - At II: +4 max Mass, +20 Gel, heal 20%, a random Morsel, or **+1 copy to another
    owned essence**. That last one can cascade into another fusion, which is fun.
  - At III: +1 reroll token, a random Common relic, +2 to a stat, or +1 copy to two other
    essences.
- Fusion has its own animation beat (§7.5). It should be the most satisfying moment in
  the game outside a boss kill.

### 6.4 Slots and expulsion

If your slots are full and you pick a new slotted essence, you **Expel** one first. The
expelled essence becomes a **Husk** worth 8 Gel per copy, and its copies are lost. That is
the core tension: **diversify** (more effects, more Resonance) or **commit** (fewer,
fused, stronger), the same pull as Batomon's "merge toward a carry."

### 6.5 Families and Resonance

Count your **slotted** essences per Family. At **2 / 4 / 6** you get Resonance bonuses.
**6** (an all-in build) triggers an **Evolution Form**: a new base body plus a big bonus.
Dual-family essences count toward both.

| Family | Hive Queen source monsters | 2 | 4 | 6 → Evolution Form |
|---|---|---|---|---|
| **Beast** 🐾 | Young Wolf, Vampire Bat, Ant Sea Lion | +10% crit | Crits apply Bleed 2 | **Chimera**: every 3rd attack is a guaranteed crit that hits twice |
| **Flora** 🌿 | Venus Slimetrap, Life Fairy | Regen 2 per turn | Healing also applies Poison equal to 50% of the amount healed | **Bloom**: Regen doubles each turn until you take damage |
| **Stone** 🪨 | Pebblet, Rock Worm, Stalag-Mite, Boulder Troll | Start battles with 10% Mass as Membrane | Membrane dissolves only by half | **Golem**: gain FIRM as Membrane every turn; Membrane hits back |
| **Insect** 🕷️ | Vine Spider, Swamp Strider | Basic attacks hit twice at 60% | +1 more hit | **Swarm**: every hit has a 25% chance of another hit (chains) |
| **Aquatic** 🐟 | Serrated Carp, Sapphire Newt | +8% dodge | Dodging heals 5% | **Leviathan**: +30% max Mass; your attacks Soften |
| **Spirit** 👻 | Wil-o'-Wisp, Burnt Spirit, Life Fairy | Once per battle, survive at 1 Mass | 15% phase chance | **Wraith**: on phase, counter-attack for 100% |
| **Construct** 🤖 | Animated Alloy, Null Construct | Your first Action each battle has CD 0 | **+1 slot** | **Mech**: all cooldowns −1 |
| **Sky** 🦅 | Thunder Hawk, Thunderbird, Storm Elemental | +3 SLIP | Tempo builds ×1.5 | **Tempest**: extra actions also trigger your Reflexes |
| **Draconic** 🐉 | Fire Wyrm, Frost Giant | +10% to all stats | Your Actions apply your element's status | **Dragon**: all your stats count double for essence scaling |
| **Void** 🕳️ | Void Tendril, Abyssal Watcher, Reality Shard, The Hollow One | 10% of damage dealt is true damage | Kills heal 25% | **Hollow**: each round, steal 1 stack of every enemy buff |
| **Ooze** 🫠 | Magma Ooze, feral slimes | +1 option on absorb offers | Fusion needs 1 fewer copy per level | **King Slime**: every essence counts as one level higher |

Ooze is the slime-on-slime family. Its bonuses improve **absorption itself**, which makes
it the economy-engine archetype.

### 6.6 Kill bonuses

How you win changes what you eat. These make good wins feel *more* rewarding.

| Bonus | Condition | Reward |
|---|---|---|
| **Flawless** ✨ | Lost no Mass this battle | +1 option on this absorb |
| **Overkill** 💥 | Killing blow overflows by at least 100% of the enemy's max Mass | +Gel (10 + 10 per 100% of overflow) |
| **Devour** 😋 | The enemy died while **Digesting**, or to a Devour effect | **Absorb 2** of the options |
| **Critical Mass** ♾️ | The chain overflow rule fired (§8.9) | All three of the above, plus a Feat check |

### 6.7 Iridescent essences

These are shiny variants. Fusing an essence to III once unlocks its Iridescent version
through Mastery (§12.7). From then on, any offer has a 2% chance to roll it as
Iridescent: same essence, plus a bonus line and a sparkle. Rare **Shiny enemies** (1 in
50) always offer one.

### 6.8 Other sources of essences

- **Shops:** essence vials. Buying one counts as an absorb.
- **Events:** gambles, trades and mirror fights.
- **Hatchery** and **Pools:** copies.
- **Remnants:** your old champions' essences.
- **Boss Essences:** Keystones only.
- **Mimic's** temporary copies, which can be made permanent with the *Taxidermy Kit* relic.

---

## 7. Mutation Visuals

The slime's look *is* its build. A player should be able to glance at it and roughly
read what it does.

### 7.1 Visual layers (back to front)

| Layer | Driven by | Notes |
|---|---|---|
| **Aura** | Resonance at 4+, Keystones, Enraged/Haste | Soft glow or particles in the family color |
| **Body** | Species base shape; Evolution Form replaces it | Procedural soft-body blob (§16.4) with squash and stretch |
| **Body color** | Element affinity blend (primary 70%, secondary 30%) | Hybrids add a material: steam vents, lava cracks, resin sheen |
| **Size** | Mass (log scale) | 1× at start, about 2.5× at 1,000 Mass, and **uncapped**: the camera zooms out (§9.5) |
| **Surface** | VISC (thicker drips), SLIP (gloss), FIRM (less wobble) | Subtle; reinforces the stat spread |
| **Inner relics** | Relics owned | Tiny icons floating *inside* the translucent body with parallax |
| **Morphs** | Slotted essences | Attachments on named sockets (below) |
| **Face** | Species + state | Eyes and mouth; expressions for idle, attack, hurt, low Mass, victory |

### 7.2 Morph sockets

- **Sockets:** `crown` (top), `brow`, `eyes`, `mouth`, `back`, `left`, `right`, `base`
  and `tail`.
- **Each Morph has 3 tiers** matching levels I, II and III. Small ears become wolf ears
  become a glowing mane.
- **Socket conflicts:** each socket shows one Morph, the highest level, with ties broken
  by most recently absorbed. Hidden Morphs still show in the inspect panel.
- **Stackable Morphs:** some *add* instead of replacing, for example *Watcher Eye* adds an
  eye per copy, up to 9.

**Examples**

| Morph | Source | Socket |
|---|---|---|
| Wolf ears / fangs | Pounce / Fangs | crown / mouth |
| Pebble plates | Stoneskin | back, left, right |
| Bat wings | Bloodthirst | back |
| Extra legs | Many Legs | base |
| Leaf sprouts | Photosynthesis | crown |
| Fairy wings | Resurrect | back |
| Eye cluster | Watcher Eye | eyes |
| Tentacles | Void Grasp | tail |
| Ember crest | Pyrolyze | crown |

### 7.3 Evolution Forms

A 6-piece Resonance (Chimera, Golem, Swarm and so on) or a hybrid element **replaces the
base body**. A Golem is boulder-shaped; a Swarm is a jelly shell crawling with tiny
critters. Morphs re-anchor to the new body's sockets. Forms are the discovery moments of
the game, and the Slimepedia shows undiscovered ones as silhouettes (§12.7).

### 7.4 Readability rules

- At most **6 visible Morphs** at once, and the silhouette must stay a blob.
- Morph palettes are tinted toward the body color so the result stays cohesive.
- **Enemies don't mutate.** A Remnant (your old slime) is the only enemy with Morphs.

### 7.5 Signature animation beats

| Moment | Beat |
|---|---|
| **Absorb** | The orb is slurped in with a gulp and bulge, the new Morph pops out with a wobble, and a "+ Pounce" toast appears |
| **Fusion** | The three pips swirl together, white flash, the body squashes, the Morph grows a tier, "FUSION! Pounce II", and the Fusion Burst cards deal in |
| **Evolution** | Slow-mo, the body melts and re-forms in the new shape, a family-colored shockwave, and the form's name card |
| **Victory** | The slime does a happy bounce. The enemy melts into a puddle and the orbs rise |
| **Death** | The slime flattens into a puddle that drains into the floor, back to the Brood Pool |

### 7.6 Hall of Slimes portrait

Every run ends by snapshotting the final slime: its render, its build and its key stats.
It goes into the **Hall of Slimes** gallery (§12.6). A static portrait is enough here;
there is no need for live rendering.

---

## 8. Combat

### 8.1 Model

Combat works exactly as it does in Hive Queen (its §9): **the turns are the simulation,
and the real-time arena is a view.** A pure, deterministic resolver advances the battle
one round at a time and emits structured records. The arena replays those records as
timed animation beats. Here it is **1v1**: your slime against one enemy.

The fight runs automatically. The player shapes it in three places:

- **before** the fight, by setting Action priority and picking which Morsels to carry;
- **during** the fight, by tapping Morsels;
- **between** fights, through the build itself.

(The level of in-battle agency is Open Question Q2.)

### 8.2 Round structure

1. **Round start.**
   - Both sides gain **Tempo**: `(SLIP_self + 5) / (SLIP_opp + 5) − 1`, floored at 0.
   - Every full point of Tempo is spent on **one extra action** this round.
   - A slime with 3× the enemy's speed takes 3 actions per round. Speed is a scaling
     axis that can be broken.
2. **Turn order.** Higher effective SLIP acts first; ties go to the player. Each
   *action* is its own turn.
3. **Owner's turn start.**
   - Membrane dissolves, unless retained.
   - Poison, Burn and Regen tick.
   - `onTurnStart` hooks run.
   - Stun check: a stunned actor loses this action.
4. **Action.**
   - The actor uses the first **ready Action** in its priority list. If none is ready,
     it makes a **basic attack** (100% FIRM).
   - Bleed triggers when the actor acts.
   - Cooldowns tick down at the end of the owner's turn.
5. **Resolution.**
   - Run the damage pipeline (§8.4).
   - Reflexes fire on their triggers.
   - Death checks run after each action: revives, on-death effects, kill bonuses.
6. **Round end.** `onRoundEnd` hooks run and buff and debuff durations tick.
   Hive Queen's `appliedRound` fix stays, so a status never expires in the round it
   landed.

### 8.3 Actions and priority

- The player drags Actions into a **priority order** on the build screen. The order
  persists between fights.
- An Action fires when its cooldown is ready. It starts ready unless it's marked
  *Windup*.
- A **conditional priority** rule, "only use when…" (for example, only when the enemy has
  no Poison), is a P2 meta unlock (§12).

### 8.4 Damage pipeline

This extends `resolveAttack` from Hive Queen. Every step writes to the trace.

1. **Base:** FIRM × ability multiplier. `onBeforeAttack` hooks apply crit bonuses and
   conditional multipliers.
2. **Hit check:** the defender's dodge, then block or phase, then the attacker's miss
   (Blinded). Every roll is traced, landed or not.
3. **Crit:** 5% + sources; ×1.5 + crit-damage sources.
4. **Attacker modifiers:** `onDamageDealt` hooks, Enraged/Weakened, execute checks.
5. **Element:** ×1.25 / ×0.75. Ignored by *true damage*.
6. **Defender modifiers:** `onDamageTaken` hooks, Softened.
7. **Membrane** absorbs, then **Mass** is lost.
8. **On-hit:**
   - status procs (`onStatusApply`);
   - lifesteal;
   - Thorns;
   - Reflex triggers (`onHit`, `onDamaged`, `onCrit`, `onDodge`).

### 8.5 Status effects (stacking)

Intensity stacking is what makes status builds scale, and scaling is what breaks games.

| Status | Kind | Behavior |
|---|---|---|
| **Poison N** 🧪 | debuff | At the owner's turn start, lose N Mass (ignores Membrane), then N −1 |
| **Burn N** 🔥 | debuff | At the owner's turn start, take N damage (Membrane absorbs), then N halves |
| **Bleed N** 🩸 | debuff | Lose N Mass each time the owner acts. −1 per round |
| **Digesting N** 😋 | debuff | At turn start, lose N% of max Mass. Dying while Digesting counts as a **Devour** kill |
| **Corrode N** 🟢 | debuff | −N FIRM for the rest of the battle |
| **Sticky N** 🍯 | debuff | −N SLIP and −5% dodge per stack. −1 per round |
| **Softened** (dur) | debuff | Takes +25% damage |
| **Weakened** (dur) | debuff | Deals −25% damage |
| **Slowed** (dur) | debuff | SLIP ×0.5 |
| **Stun** (1) 💫 | debuff | Skips its next action. Gives Stun Resist 1 (bosses 2), which blocks re-stun for that many rounds |
| **Membrane N** 🛡️ | buff | Shield (§5.1) |
| **Regen N** 💚 | buff | Heal N at turn start, then −1 |
| **Thorns N** 🌵 | buff | Attackers lose N Mass per hit |
| **Enraged** (dur) 😤 | buff | +50% damage |
| **Haste N** ⚡ | buff | +N actions this round |
| **Focus N** 🎯 | buff | The next Action gets +10% power per stack |

### 8.6 Enemy behavior and intents

- Enemies use the same Action, Reflex and Trait system, with **authored patterns**: a
  cycle such as *Bite, Bite, Howl*, with weighted branches and phase triggers for bosses.
- The **next intent** is always shown above the enemy (Slay the Spire style): damage
  number, status icons, or "?" for a few tricky enemies. This makes Morsel timing a
  readable decision.

### 8.7 Player input during battle

| Input | Detail |
|---|---|
| Speed | 1× / 2× / 4×, pause, and **Skip** (resolve instantly, then show the summary) |
| **Morsels** | Tap to queue one; it's eaten at the start of your next turn. Max 1 per turn. Free action. The game pauses while you pick a target |
| Log | Battle log with a **verbose toggle**, the same trace format as Hive Queen §9.4 |
| Inspect | Long-press either combatant for its full stats, statuses and essences |

### 8.8 Determinism

A battle is fully determined by the slime snapshot, the enemy, the **battle seed** and
the list of Morsel inputs with their round indices. That gives reproducible bugs,
instant Skip, replays, and resuming mid-battle by re-simulating.

### 8.9 Limits and safety valves

These exist so the game never hangs or crashes, and so overflow pays off instead of
breaking things.

- **Trigger depth:** at most 64 nested triggers per action.
  - If the **player's** chain exceeds it, **CRITICAL MASS ♾️** fires. The enemy is
    engulfed and the battle is won, with all kill bonuses and a Feat check (§12.8).
  - If an **enemy's** chain exceeds it, the chain is truncated.
- **Big numbers:** the game uses 64-bit floats. Display shortens to K / M / B / T, then
  `1.2e15`. **Infinity** is a legal value that shows as ∞ and counts as Critical Mass.
  NaN is sanitized to 0 and logged as a bug.
- **Stalemates:** at round 30 (bosses: 50), **Salt Rain** begins. Both sides lose 5% of
  max Mass as true damage per round, +5% each round after. Every battle ends.
- **Per-round action cap** (from Tempo): 20. Past that, extra Tempo becomes +10% damage
  per point, so speed keeps scaling without ballooning the log.

### 8.10 Presentation (the real-time layer)

This evolves `ArenaCanvas` and `buildAnim`. The beats come from records and nothing else.

- **Layout:** the player on the left, the enemy on the right, in a landscape arena strip
  across the top of the portrait screen. HUD and log sit below it.
- **Beat types:** `strike`, `projectile`, `tick`, `heal`, `shield`, `status-apply`,
  `stagger`, `fall`, `rise`, `morph-pulse`, `critical-mass`.
- **Juice:**
  - squash and stretch on every action;
  - hit-stop of 40–120 ms, scaled by damage as a fraction of the target's max Mass;
  - screen shake (off when reduced motion is on);
  - damage numbers sized by impact, with crits in large gold;
  - the slime shrinks a little as it loses Mass;
  - slow-mo on killing blows.
- **Speed scaling:** at 2× and 4×, beat spacing compresses. Above 6 actions per round,
  beats batch into a combo counter ("×14!").

---

## 9. Emergent Strategy: Designing to Be Broken

### 9.1 Philosophy

The best roguelite moments are the runs that break: an infinite in Slay the Spire, a
naneinf score in Balatro. We want those to be **reachable, discoverable, and
celebrated**:

- **Modest pieces, multiplicative combinations.** No single common essence is strong on
  its own. Power comes from two or three pieces multiplying each other.
- **Every archetype has a break point**: a combination where it scales super-linearly.
- **Breaking it pays.** Feats (§12.8) reward absurd outcomes with unlocks. Critical Mass
  is a win state, not a bug.
- **There's always a harder wall.** Salt levels, Deep Salt and Endless (§13) mean a
  broken build eventually meets its match, so breaking the game never "solves" it.

### 9.2 The interaction grammar

All content is written from five building blocks. That makes cross-combinations happen
on their own instead of needing to be authored one by one.

| Block | Examples |
|---|---|
| **Triggers** | on hit, on crit, on dodge, on damaged, on Membrane break, on status applied, on heal, on overheal, on kill, on Action, turn start/end, battle start, on absorb, on fusion |
| **Effects** | deal damage, apply status, gain Membrane, heal, gain Tempo, reduce cooldown, copy, steal |
| **Scalers** | per stack, per copy, per essence of a Family, per element point, per relic, per % Mass missing, per round elapsed |
| **Converters** | "X counts as Y": overheal → Membrane, Membrane → damage, Poison → Burn, SLIP → FIRM |
| **Rule-breakers** (Keystones) | Membrane doesn't dissolve, statuses never decay, Reflexes trigger twice, act twice but take double damage |

**Design rule:** every new essence must connect to at least two blocks that already
exist in the pool. Orphan mechanics don't ship.

### 9.3 Archetypes and their break points

These are the target emergent builds, written as a design brief and not a spoiler list.
Each one should be discoverable from normal play.

| Archetype | Core pieces (illustrative) | Break point |
|---|---|---|
| **Fortress** (Stone) | *Harden* (Membrane), *Granite Shell* (Keystone: Membrane doesn't dissolve), *Spiked Membrane* (absorbed damage reflects) | Membrane piles up without limit. The enemy kills itself on the reflect |
| **Plague** (Flora/Insect) | *Venom Gland*, *Catalyst* (Action: double the target's Poison), *Fermenter* (Poison ticks twice) | Exponential Poison. The tick numbers grow absurd |
| **Speed Demon** (Sky) | SLIP stacking, *Slick* (+SLIP on dodge), *Momentum* (+5% damage per action this battle) | Tempo gives 10+ actions a round, with Momentum compounding on each |
| **Crit Chain** (Beast) | *Fangs*, *Charged* (crit damage), *Chain Crit* (crits have 50% to attack again) | Crit chains up to the trigger cap, which means **Critical Mass** |
| **Glutton** (Ooze/Flora) | *Devour*, *Digestive Enzymes* (applies Digesting), *Carnivore's Maw* (absorb 2) | Absorbs 2 essences a fight, so the slime snowballs across the run |
| **Behemoth** (any) | *Overeater* (overheal → max Mass), lifesteal, *Body Slam* (damage = 10% of Mass) | The slime fills the screen, and damage scales with size |
| **Prism** (elements) | Element essences across all four, *Prism Shard* | Prismatic: always super-effective, with every hybrid passive at once |
| **Mirror** (Spirit/Mimic) | *Mirror Coat*, self-inflicted statuses (*Self-Immolate*: Burn yourself, +50% damage) | Your drawbacks become the enemy's death |

### 9.4 Build checks

This is a Hive Queen principle: each invader invalidates one dominant strategy. Some
enemies and elites **soft-counter** a one-dimensional build, so players need a backup
plan. Broken builds still win; merely "good" ones have to adapt.

| Enemy | Check |
|---|---|
| **Saltback Tortoise** | Immune to Poison and Bleed |
| **Glass Gecko** | Can't be crit, and punishes misses |
| **Ember Mirror** | Reflects the first status applied to it each round |
| **Gorger** | Steals your Membrane |
| **Tempo Leech** | Gains your extra actions |
| **Pacifist Moth** | Heals itself whenever it's hit 3+ times in a round, which punishes multi-hit spam |

### 9.5 Celebrating broken wins

- Damage numbers scale up visually. Above 10× the enemy's max Mass, a giant **OVERKILL**
  stamp appears.
- The **combo counter** and a **chain meter** fill toward Critical Mass.
- The camera zooms out to fit an enormous slime. At very large sizes, the enemy is shown
  as a tiny figure.
- **Run Summary highlights:**
  - biggest hit;
  - longest chain;
  - most actions in one round;
  - peak Mass;
  - fastest boss kill.
- **Personal records** in the Hall of Slimes (local only).

### 9.6 Balance policy

1. **Buff the weak before nerfing the strong.**
2. **Nerf only when a combo is broken *and* boring**: it's always picked, it needs no
   setup, or it causes stalemates.
3. **The simulation harness flags** (§16.7):
   - archetypes below a 25% simulated win rate;
   - single essences that appear in more than 40% of winning builds;
   - any stalemate pattern.

---

## 10. Economy, Relics, Morsels, Events

### 10.1 Currencies

| Currency | Scope | Earned | Spent |
|---|---|---|---|
| **Gel** 💧 | One run | Fights 12–18 (+4 per act), elites 30–40, bosses 75, Digest, Husks, events | Shops, some events |
| **Genes** 🧬 | Meta | End of every run (§12.3) | Brood Pool unlocks |

**Target:** about 200 Gel per act, which is 1–2 meaningful purchases per shop visit.

### 10.2 Shop: the Gelatinous Bazaar

It's run by **Shelly**, a hermit crab who lives in a jar of jam.

| Stock | Count | Price (Gel, before Salt) |
|---|---|---|
| Essence vials | 3, drawn from this act's biome pool, one guaranteed from a Family you own | Common 50 / Uncommon 80 / Rare 135 |
| Relics | 2 random + 1 shop-only | Common 150 / Uncommon 200 / Rare 260 / Shop 180 |
| Morsels | 3 | 30–70 |
| **Service: Infuse** | +1 copy to an owned essence | 75, +25 per use this run |
| **Service: Expel** | Remove an essence | 50, +25 per use this run |
| **Service: Restock** | Reroll everything | 15, +10 per use |

### 10.3 Relics: swallowed treasures

Relics are objects the slime has gulped. They float visibly inside its body.

- **Rarities:** Common, Uncommon, Rare, Boss, Shop, Event.
- **Sources:**
  - Elites always drop one.
  - Treasure nodes give one.
  - Bosses offer a choice of 3 Boss relics.
  - Shops and events.
- **Count:** about 25 for the vertical slice, 100 for 1.0.
- **Categories:**
  - *Combat*;
  - *Absorption* (offers, copies);
  - *Fusion*;
  - *Map* (scouting, Lures);
  - *Economy*;
  - *Rule-benders* (Boss and Rare).

| Relic | Rarity | Effect |
|---|---|---|
| Pebble in the Gut | Common | Start each battle with 6 Membrane |
| Rusty Fishhook | Common | Your crits apply Bleed 2 |
| Glass Marble | Common | Your first attack each battle crits |
| Lucky Acorn | Common | +1 reroll token per act |
| Snail Shell | Common | +5 max Mass whenever you rest at a Pool |
| Petri Dish | Uncommon | Absorb offers +1 option |
| Lodestone | Uncommon | Affinity weight ×3 instead of ×2 |
| Hourglass Sand | Uncommon | Your first Action each battle ignores its cooldown |
| Sponge | Uncommon | Overheal becomes Membrane |
| Compass Needle | Uncommon | Fight nodes show the exact species |
| Echo Shell | Rare | The first Action you use each turn triggers twice |
| Fermenting Jar | Rare | Every 4th battle, +1 copy to a random owned essence |
| Family Portrait | Rare | +1 to your highest Family's Resonance count |
| Taxidermy Kit | Rare | (Mimic) once per act, keep a copied essence permanently |
| **Bottomless Gut** | Boss | +1 slot; Pools can no longer Soak |
| **Philosopher's Gel** | Boss | Fusion needs 1 fewer copy per level; Gel income −50% |
| **Cracked Hourglass** | Boss | +1 Tempo every round; enemies also gain +0.5 |
| **Salt-Lined Stomach** | Boss | Digest heals 40%, but absorb offers −1 option |
| Membership Card | Shop | Shop prices −20% |
| Doggy Bag | Shop | Digest rewards are doubled |

### 10.4 Morsels (consumables)

You can hold **3** at a time. They're used in battle (§8.7) or on the map.

| Morsel | Effect |
|---|---|
| Jelly Bean | Heal 25% Mass |
| Spicy Pepper | Enraged for 3 rounds |
| Rock Candy | +20 Membrane (scales by act) |
| Sour Drop | Apply Poison 6 |
| Fizzy Soda | Haste 1 |
| Smelling Salts | Cleanse all debuffs |
| Fly Lure | (Map) pick the next Fight's enemy from 3 candidates |
| Royal Jelly | (Map) +1 copy to an essence. Rare |
| Apex Serum | (Map) raise an essence from III to Apex. Shop-only, very expensive |
| Mystery Meat | Random effect, usually good |

### 10.5 Pools (rest sites)

Choose **one** option:

- **Soak:** heal 35%.
- **Ferment:** +1 copy to an owned essence.
- **Molt:** remove an essence and gain its Husk value.

More options unlock in the Brood Pool:

- **Lure:** choose the next Fight.
- **Bud:** create a random Morsel.
- **Meditate:** re-roll an essence into another of the same Family and level.
- **Dissolve:** Acid Ooze only.

### 10.6 Events

**Format:** title, an illustration, 80–150 words of text, and **2–4 choices**. A choice can
be gated by what you own: a Family, an element, Gel, Mass. Outcomes can be fixed,
random with odds shown as words ("risky"), or **delayed** (they resolve some nodes later).
**Count:** 12 for the slice, about 50 for 1.0. **Curses** are slotted negative essences
that some risky outcomes give. You get rid of them with Molt or Expel.

| Event | Choices |
|---|---|
| **Professor Ooze's Lab** | Pay 150 Gel: raise an essence from III to **Apex** · Volunteer: +1 copy to a random essence and −1 copy to another · Leave |
| **The Mirror Pool** | Fight your reflection (your build at 80%); win to copy any of your essences (+1) · Gaze: heal 20% · Leave |
| **A Lonely Slime** | Merge: +15 max Mass and a random Ooze essence · Befriend: relic *Tiny Friend* · Eat it: +2 copies to an owned essence, and it looks at you sadly |
| **Salt Circle** | Push through: −20% Mass · Dissolve it (needs an Acid essence or 50 Gel) · Go around: the next node's reward is skipped |
| **Fermentation Barrel** | Seal an essence inside (remove it now); **3 nodes later** it comes back with +2 copies · Drink from it: random Morsel, risky |
| **Mushroom Ring** | Eat one: a random essence from a random Family at Level I, with a 25% chance it's a Curse · Collect spores: 2 Sour Drops |
| **Shrine of Mitosis** | Split: −25% current Mass, +1 copy to any essence; can repeat at rising cost · Pray: +1 Instinct effect this run |
| **Fossil Bed** (meta) | Dig: absorb an essence from one of your past champions · Leave it in peace: +25 Genes at run end |
| **Crab Caravan** | Trade an essence for a random relic of matching rarity · Trade 2 Morsels for 1 Morsel of your choice |
| **The Toll Troll** | Pay 40 Gel · Fight (an elite-strength troll, with elite rewards) · Sneak past (SLIP check) |

---

## 11. Enemies, Elites, Bosses, Remnants

### 11.1 Enemy anatomy (data)

Each enemy defines:

- `id`, name, Family (or Families), element
- Mass, FIRM, SLIP and VISC per act tier
- **kit**: the essences it actually uses, at their levels
- **pattern**: its intent cycle and any branches
- **essence pool**: what you can absorb from it. It's the kit plus a stat and an element
  essence
- art and sound references, and Slimepedia text

**Rule:** at least one kit essence is the enemy's **signature**, and it must be visible
in its behavior. The player should *see* what they could take.

### 11.2 Example roster: Verdant Forest (Act 1)

Monsters marked HQ come from Hive Queen. Their Hive Queen mutation becomes their
signature essence.

| Enemy | Fam / Elem | Mass · FIRM · SLIP · VISC | Pattern | Absorbable pool (signature first) |
|---|---|---|---|---|
| **Young Wolf** (HQ) | Beast / — | 28 · 5 · 7 · 2 | Bite, Bite, Pounce | **Pounce** (Action CD 3: 150% + Bleed 2) · Fangs (Trait +8% crit) · Feral Instinct (Reflex) · Lean Muscle (+2 SLIP) |
| **Venus Slimetrap** (HQ) | Flora / Nature | 40 · 4 · 2 · 5 | Snap, Enzyme Spray, Root | **Devour** (Action CD 4: execute below 25% Mass, counts as a Devour kill) · Photosynthesis (Regen 2) · Sap Spray (Reflex: hit → Sticky 1) · Chlorophyll (+2 Nature) |
| **Pebblet** (HQ) | Stone / Earth | 45 · 4 · 1 · 3 | Tumble, Harden, Tumble | **Stoneskin** (Trait: start with 15% Mass as Membrane) · Harden (Action CD 2: Membrane = FIRM) · Grit (+2 FIRM) · Earthite (+2 Earth) |
| **Vine Spider** (HQ) | Insect / Nature | 24 · 6 · 6 · 3 | Bite, Web Shot, Bite | **Web Shot** (Action CD 3: Slowed 2 + Sticky 2) · Many Legs (Trait: 2 hits at 60%) · Venom Gland (Reflex: 30% Poison 2) · +2 SLIP |
| **Life Fairy** (HQ, rare) | Spirit / Nature | 18 · 2 · 9 · 6 | Heals, **flees after 4 rounds** | **Resurrect** (Reflex: the first lethal hit leaves you at 25%) · Glimmer (+10% dodge) · +1 VISC +1 SLIP |
| Thornback Boar | Beast / Earth | 50 · 6 · 3 · 2 | Charge (Windup), Gore | **Charge** (Action, Windup: 250%) · Thick Hide (Trait: −2 damage per hit) · +8 Mass |
| Puffcap | Flora / Nature | 30 · 3 · 3 · 6 | Spore Cloud, Puff | **Spore Cloud** (Action CD 3: Poison 3 + Weakened 1) · Rot (Reflex: on death, Poison 4) · +2 VISC |
| Honey Wasp | Insect / — | 20 · 5 · 9 · 4 | Sting ×2 | **Barbed Sting** (Reflex: on hit, 25% Bleed 1 and Sticky 1) · Swarming (Trait: +1 Tempo at battle start) |
| Feral Slime | Ooze / — | 35 · 4 · 4 · 4 | Splat, Absorb | **Gulp** (Reflex: on kill, +2 max Mass permanently) · Jiggle (+5% dodge) · Gel Pouch (+12 Gel on win) |

**Elites:** **Alpha Wolf** (Beast; howls for Enraged; gives Concentrated Pounce),
**Ironbark Treant** (Flora/Stone; Membrane and Thorns), **Brood Mother** (Insect;
multi-hit and Poison).

The other biomes follow the same template from their Hive Queen monster lists, with new
fillers added: about **9 normal enemies and 3 elites per biome** at 1.0.

### 11.3 Elite Modifiers

Each elite rolls one modifier (two at Salt 18). The modifier is shown on its map node.

| Modifier | Effect |
|---|---|
| **Armored** | Starts with 30% Mass as Membrane |
| **Frenzied** | +1 Tempo per round |
| **Vampiric** | 25% lifesteal |
| **Spiteful** | On death, deals 20% of your max Mass as damage |
| **Warded** | Immune to the first 3 statuses applied |
| **Hungry** | Steals 1 copy from your highest essence if the fight goes past round 10 (you get it back if you win) |

### 11.4 Bosses

Each biome has **2 bosses**, one chosen at random per run. Each boss tests a different
build axis. Boss rewards are listed in §4.3.

| Biome | Boss | Mechanic / test | Boss Essences (pick 1 of 3) |
|---|---|---|---|
| Forest | **The Great Slimetrap** | Every 4 turns it **Ingests** one of your slotted essences (disabled until you deal 15% of its Mass). Tests relying on one carry | *Carnivore's Maw* (absorb 2 from every Fight) · *Perennial* (Regen never decays) · *Strangling Vines* (Slowed enemies take double status damage) |
| Forest | **Elder Stag** | Alternates a charge phase with a Membrane phase. Tests burst versus sustain | *Antler Crown* (+1 slot; crits stun once per battle) · *Rut* (each round +5% damage, stacking) · *Old Growth* (+50% max Mass; −3 SLIP) |
| Grotto | **Crystal Hydra** | Grows a head (+1 action per round) whenever a big hit lands. Tests damage pacing | *Hydra Heart* (Reflexes trigger twice) · *Faceted* (crits copy their status procs) · *Regrowth* (revive once per battle at 50%) |
| Cinderspire | **Fire Wyrm** (HQ) | Burns stack every turn. Tests cleanse and sustain | *Draconic Heart* (all stats +25%) · *Ember Soul* (Burn never decays) · *Hoard* (+1 Gel per 10 Gel held in damage) |
| Stormspire | **Thunderbird** (HQ) | Extreme Tempo. Tests speed and defense | *Eye of the Storm* (+3 Tempo; −20% max Mass) · *Lightning Rod* (each of your dodges deals 50% FIRM) · *Static* (each action adds a stack; at 10 stacks, 500% burst) |
| Salt Flats | **The Salt King** | Desiccation doubles; he **salts** your highest-level essence, lowering it a level for the fight. Tests breadth | *Brine-Cured* (immune to Desiccation and Salt Rain; −1 slot) · *Crown of Salt* (+1 level to your lowest essence) · *Preserved* (statuses on you last half as long) |
| **Finale** | **The Hollow One** (HQ) | **Phase 1:** consumes 1 stack of each of your buffs per round. **Phase 2 (66%):** copies your best Action. **Phase 3 (33%):** steals your highest essence for the fight. Tests everything | Win the run |

### 11.5 Remnants: your past champions

- When a champion dies or wins, its final build is saved as a **Remnant**: species,
  stats, essences with their levels, relics, portrait, name and title.
- **Remnant nodes** pull one Remnant and **normalize** its stats to the current act's
  power curve (×1.1). It fights with its real kit and Morphs.
- **Reward:** absorb one of its slotted essences at 2 copies, plus bonus Genes and a
  Slimepedia entry ("Gloop the Reckless, fell in the Swamp, Act 2").
- This is the async-battle feeling from Batomon, using only your own history.

---

## 12. Meta Progression

> You said meta progression must exist but you weren't sure what shape. This section is
> my recommended design. §12.10 lists the alternatives.

### 12.1 Goals

1. **Every run pays out**, including fast losses.
2. **Mostly horizontal.** Unlocks widen *what's possible*: new essences, relics, events
   and species. That fuels emergent strategy, since every unlock is a new combination to
   break.
3. **A little vertical, bounded.** A small permanent power layer for a sense of growth,
   capped by a loadout budget so Salt levels stay meaningful.
4. **Thematic.** The Brood Pool remembers your champions.
5. **No grind walls.** The first win should be possible without any unlocks.

### 12.2 The Brood Pool (hub)

The hub screen is the Queen's chamber over the Pool. From here you:

- start a run;
- browse the **Gene Tree**;
- equip **Instincts**;
- pick an **Heirloom**;
- read the **Slimepedia**;
- walk the **Hall of Slimes**.

### 12.3 Genes (meta currency)

Every run banks Genes, win or lose:

| Source | Genes |
|---|---|
| Per floor reached | 5 |
| Per elite killed | 15 |
| Per boss killed | 40 |
| Per fusion to III | 10 |
| Victory | +100 |
| New Slimepedia entry | 2 each |
| Feat completed | 25–100 |
| Salt multiplier | ×(1 + 0.1 × Salt) |

**Targets:** a typical Act 2 loss earns about 150–200 Genes, and a win about 500–700.

### 12.4 Gene Tree (unlock tracks)

| Track | Examples | Cost (Genes) |
|---|---|---|
| **Species** | Prismjelly, Mimic, Acid Ooze, Royal Heir, Void Slime | 300–900 |
| **Genomes** (content packs into the pools) | Insect Genome (+8 essences, +2 relics, +1 event) and so on, one per Family | 150–400 |
| **Biomes** | Murky Swamp, Cinderspire, Salt Flats (alternate acts) | 500 each |
| **Nodes and services** | Hatchery, Remnant nodes, Pool options (Lure, Bud, Meditate), Queen's Blessing options | 100–300 |
| **Instinct capacity** | +1 capacity point (5 tiers) | 300 / 600 / 1,000 / 1,500 / 2,200 |
| **Quality of life** | Battle Lab (sandbox), conditional priority rules, run seeds | 100–250 |

The full tree costs about **15,000 Genes**, roughly 40–60 runs or 30–45 hours.

### 12.5 Instincts (the bounded power layer)

Instincts are permanent perks you equip within a **capacity** (2 at the start, 7 at
most). Each has a cost of 1–3 points.

| Instinct | Cost | Effect |
|---|---|---|
| Thick Membrane | 1 | +8% max Mass |
| Scavenger | 1 | +15% Gel |
| Sweet Tooth | 1 | Start with a random Morsel |
| Keen Senses | 2 | Fight nodes show the exact species |
| Omnivore's Instinct | 2 | The first absorb in each act offers +1 option |
| Second Stomach | 2 | +1 Morsel slot |
| Ancestral Memory | 3 | Start with one of your **Heirlooms** at Level I |
| Queen's Favor | 3 | Start with a random Common relic |

A **Pure** toggle disables all Instincts, for purists, and earns cosmetic badges.

### 12.6 Lineage: Heirlooms, Remnants, Hall of Slimes

- **Heirloom:** at the end of every run, choose **one essence** from your final slime to
  store in the **Gene Bank** (6 shelves; replace one when full). *Ancestral Memory*
  lets a new champion start with one. Heirlooms used in winning runs gain **Lineage
  stars**, which are cosmetic and appear on their Morph.
- **Remnants:** §11.5.
- **Hall of Slimes:** a gallery of every champion. It shows each one's portrait, build,
  biome path and cause of death or victory, plus **personal records**: highest Salt
  cleared, biggest hit, peak Mass, longest chain, and deepest Endless loop. All local, no
  leaderboards.

### 12.7 Slimepedia and Mastery

- **Bestiary**, **Essence Codex**, **Relic Codex**, **Event log**, and **Forms** (the
  Evolution Forms and hybrids, shown as silhouettes until you discover them).
- **Essence Mastery** comes in three steps per essence:
  1. Absorb it in 3 runs: a Genes bonus.
  2. Fuse it to III: unlocks its **Iridescent** variant.
  3. Win while holding it at III: an alternate Morph cosmetic.
- This pays players to try **new builds**, which in turn drives the discovery of
  emergent strategies.

### 12.8 Feats (achievements that unlock content)

Feats tie meta progression to breaking the game.

| Feat | Unlocks |
|---|---|
| **Critical Mass**: trigger it once | Relic *Infinite Loop*, plus a golden glow cosmetic |
| **Supermassive**: reach 1,000 Mass | Relic *Black Hole Snack* |
| **Overkill ×100**: one hit for 100× the enemy's max Mass | Keystone *Annihilator* |
| **Monoculture**: reach any 6-Resonance form | That Family's Keystone set |
| **Rainbow**: become Prismatic | The Salt Flats biome (alternate unlock path) |
| **One-Trick Ooze**: win with only 1 slotted essence | Species: Void Slime |
| **Nine Lives**: revive 9 times in one run | Relic *Cat's Cradle* |
| **Gourmand**: absorb 40 essences in a single run | Pool option: Bud |

### 12.9 Pacing targets

| Milestone | Target |
|---|---|
| First Act 1 boss kill | Run 1–3 |
| First win (Salt 0) | Runs 5–10, possible on run 1 for an expert |
| All launch species unlocked | ~15 runs |
| Gene Tree complete | ~50 runs |
| Salt 20 with one species | 100+ hours (the dedicated tail) |

### 12.10 Alternatives considered

| Model | Pros | Cons | Verdict |
|---|---|---|---|
| **Pure unlocks** (Slay the Spire, Balatro) | Keeps difficulty honest | Feels thin to players who want visible growth | Folded in as the main track |
| **Permanent stat upgrades** (Rogue Legacy) | Strong "number goes up" feeling | Trivializes early content; difficulty becomes a grind | Only through bounded Instincts |
| **Hades-style mirror** | Choice-driven perks | Becomes mandatory power | Same as Instincts, with a capacity cap |
| **Lineage only** | Very thematic | Too little long-term structure | Folded in as Heirlooms and Remnants |

---

## 13. Difficulty: Salt Levels & Endless

Salt is a slime's nemesis, so difficulty is measured in it. Like Slay the Spire's
Ascension, levels are **cumulative**.

- **Unlocking:** clearing Salt N unlocks N+1.
- **Tracking:** each species has its own ladder (Q12).
- **Display:** the current Salt level shows on the map HUD. Tapping it lists every active rule.

### 13.1 Salt 1–20

| Salt | Adds | Salt | Adds |
|---|---|---|---|
| 1 | Elites are more common (weight ×1.6) | 11 | Digest rewards halved; fight Gel −10% |
| 2 | Normal enemies +10% Mass | 12 | Elites +15% Mass and FIRM |
| 3 | Elites roll a modifier from a harsher table | 13 | Fewer Pools (weight ×0.75) |
| 4 | Shop prices +15% | 14 | −5% more max Mass; Morsel slots −1 |
| 5 | Act-end heal covers 75% of missing Mass | 15 | Events skew hostile |
| 6 | Start with −10% max Mass | 16 | Normal enemies gain a random Trait |
| 7 | Normal enemies +10% FIRM | 17 | Shops stock 1 fewer essence and 1 fewer relic |
| 8 | Bosses +15% Mass and an enrage at round 15 | 18 | Elites always have 2 modifiers |
| 9 | Start with the Curse *Salt Burn* (−1 slot until removed) | 19 | Bosses use upgraded movesets |
| 10 | Pools heal 25% instead of 35% | 20 | **Double boss** at the end of Act 3; the Hollow One gains a 4th phase |

### 13.2 Deep Salt (21 and up, uncapped)

You asked for difficulty that keeps going up, so the ladder never ends.

- **Each level past 20 adds:**
  - enemy Mass and FIRM **+6%, compounding**;
  - one permanent **Brine Mutator**, drawn from a pool.
- **Mutator draws:** the run's mutators are shown before it starts, and you can reroll one
  draw per level.
- **Example Brine Mutators:**
  - enemies start with Haste 1;
  - Pools can't Ferment;
  - absorb offers −1 option;
  - Fusion needs +1 copy;
  - elites appear in pairs (back to back);
  - Salt Rain starts at round 20;
  - every enemy has a signature Reflex;
  - Morsels cost Mass to use.
- **Record:** the highest Deep Salt cleared is a personal record in the Hall of Slimes.

### 13.3 Endless Depths (after a win)

After the Hollow One falls, you can **Keep Eating**. That is the power-fantasy test for a
completed broken build.

- Endless loops through random biomes in 3-act cycles.
- **Each loop applies:**
  - enemy stats **×1.6, compounding**;
  - +1 Brine Mutator;
  - better offers (rare weight up);
  - +1 slot, up to 8.
- **Score** is the loop and floor you reach, a personal record. Endless scaling is
  exponential, so even a broken build eventually dies. That is the point.

### 13.4 Curve targets

| Act | Typical normal enemy (Mass / FIRM) | Expected player damage per round, typical / broken |
|---|---|---|
| 1 | 20–50 / 3–6 | 6–20 / 40+ |
| 2 | 60–150 / 8–16 | 25–80 / 500+ |
| 3 | 200–450 / 20–40 | 80–300 / 10K+ |
| Finale | 2,500 (boss) / 45 | — / ∞ |

Target win rates, measured on real players and approximated by the bots in the sim
harness: an experienced player at Salt 0 wins about 50%, at Salt 10 about 30%, and at
Salt 20 about 10–15%.

---

## 14. UX & Screens

**Portrait first.**

- Tap targets are at least 48 dp.
- Every element has a **long-press tooltip** that shows the exact numbers.
- One-handed; the important actions sit in the bottom third of the screen.

| Screen | Key contents |
|---|---|
| **Brood Pool (hub)** | Big animated Pool; Start Run; Species; Instincts; Gene Tree; Slimepedia; Hall of Slimes; Settings |
| **Run setup** | Species carousel with a preview slime, Salt selector, Heirloom slot, optional seed, Deep Salt mutator preview |
| **Queen's Blessing** | Pick 1 of 3 starting boons, for example *start with a random Level II common* or *100 Gel* |
| **Map** | Vertical scroll; node icons with Family badges; the current path highlighted; HUD with Mass, Gel, Morsels, relics strip, Salt, and a mini-slime you can tap to inspect |
| **Pre-battle card** | Enemy card (Family, element, intents preview, signature essence), Action priority drag list, Morsel loadout, **Fight** (the default fast path skips this card) |
| **Battle** | Arena strip; turn queue; Mass and Membrane bars; status chips; intent bubble; Morsel buttons; speed and skip; log with a verbose toggle |
| **Absorb** | Orbs become cards, each showing type, Family, element, level pips (●●○ toward the next fusion), a **live Morph preview** on your slime, and the slot-replace flow; Digest; Reroll |
| **Fusion / Evolution overlay** | Animation, then Fusion Burst cards |
| **Shop** | Shelly's counter; stock grid; services; Gel |
| **Event** | Illustration, text, choice buttons with requirement badges |
| **Pool** | 3+ option cards with their outcomes previewed |
| **Slime inspect** (anywhere) | Big render; stats; slots with levels; Resonance tracker (2/4/6); element meter; relics; Morph sockets |
| **Run summary** | Victory or defeat; highlights (§9.5); Genes breakdown; Heirloom pick; "Saved to the Hall of Slimes" |
| **Slimepedia / Hall** | Grids with filters, silhouettes for undiscovered entries, mastery bars |
| **Settings** | Default battle speed, skip animations, reduced motion, colorblind element shapes, haptics, audio, text size |

**Accessibility:**

- Elements use **shape** as well as color (fire = triangle, water = drop, nature =
  leaf, earth = square).
- Reduced-motion mode turns off screen shake and flashes.
- Text scales to 130%.
- Every battle can be **Skipped** to its summary.

---

## 15. Audio

- **Squish palette:** a layered library of slime sounds (plop, slurp, jiggle, stretch).
  Pitch follows Mass, so a big slime sounds lower and heavier.
- **Absorb** gets a satisfying gulp and a rising chime per copy pip. **Fusion** gets a
  stinger in the Family's key.
- **Music:** one track per biome with an intensity layer added for elites and bosses.
  The track ducks during the Critical Mass slow-mo.
- **Haptics:** short pulses on crits, fusions and kills. All optional.

---

## 16. Technical Design

### 16.1 Stack

- **Same stack as Hive Queen:** React 18 for the UI, Canvas 2D for the arena and the
  slime, and `node:test` for the simulation tests.
- **Android:** wrap the web build with **Capacitor** for the Play Store. It also ships
  as a PWA for desktop and web.
- **Rendering upgrade path:** if particles or the slime shader exceed the Canvas 2D
  budget on mid-range Android, move the arena alone to **PixiJS** (WebGL). The engine
  doesn't change, because presentation is separate.
- **Build tool:** consider moving from CRA (`react-scripts`, now unmaintained) to Vite
  when the new app is created.

### 16.2 Architecture

```
engine/            pure, deterministic, no DOM, fully unit-testable
  rng/             seeded PRNG + named streams (map, rewards, combat, shop, events)
  battle/          1v1 resolver, damage pipeline, statuses, hook registry, trace
  run/             run state machine, map generator, node resolvers, absorption,
                   fusion, offers, shop stock, event outcomes, salt rules
  meta/            Genes calc, unlock tree, instincts, heirlooms, feats, mastery
content/           data + effect implementations (registered as hooks)
  species/ essences/ enemies/ bosses/ relics/ morsels/ events/ biomes/ salt/
render/            canvas arena, procedural slime renderer, morph atlas, VFX, beats
ui/                React screens (hub, map, battle, absorb, shop, event, …)
persist/           versioned saves + migrations (localStorage / Capacitor storage)
tools/sim/         headless run simulator + bots + balance reports (Node CLI)
```

**Rule (from Hive Queen §11): simulation and presentation stay separate.** `engine/`
never imports from `render/` or `ui/`. The UI dispatches *intents* (pick node, absorb
essence X), and the engine returns a new state plus records.

### 16.3 Reuse from Hive Queen

| Existing file | Reuse |
|---|---|
| `src/combat/hooks.js` | The registry, `effectPower` (`base + viscScale × VISC`) and `runHooks`, carried over directly. **Extend** `HOOK_POINTS` with `onBattleStart`, `onTurnStart`, `onTurnEnd`, `onAction`, `onCrit`, `onDodge`, `onMembraneGain`, `onMembraneBreak`, `onHeal`, `onOverheal`, `onStatusTick`, `onBattleEnd`, and the run-level `onAbsorb`, `onFusion`, `onNodeEnter`, `onGelGain` |
| `src/combat/resolveRound.js` | The template for the 1v1 resolver: hit/dodge/crit pipeline, status application with the `appliedRound` fix, revive and on-death handling. Drop the party, aura and expedition-reward code |
| `src/combat/trace.js` | As is, for verbose logs and balancing |
| `src/combat/validate.js` | The pattern, extended to every content type (§16.5) |
| `src/combat/expedition.js` `buildAnim` | The beat-builder pattern, extended with new beat types |
| `src/components/ArenaCanvas.jsx` | The starting point for the battle view. Replace the circles with the slime renderer and enemy sprites |
| `src/data/monsterData.js`, `traitData.js` | Content seed: 30 monsters become enemies, and their 30 mutations become signature essences. Status list |
| `src/data/gameConstants.js` | `ELEMENTS` and the strong/weak multipliers |
| `src/components/Compendium.jsx` | UI pattern for the Slimepedia |
| `src/utils/saveSystem.js` | Versioned-save pattern |

**Shared-engine strategy (Q15):** extract `engine/battle` so both games use it, or fork
it for the new game and converge later. My default is to **fork first**, so Hive Queen's
balance stays untouched, and extract once the 1v1 resolver is stable.

### 16.4 Procedural slime renderer

- **Body:** a closed spline through about 16 control points on a spring-mass ring. It
  gives jiggle, squash and stretch, and impact wobble cheaply. Fill uses a radial
  gradient for translucency, plus a specular highlight and an inner shadow.
- **Inside:** inner relics are drawn inside a clip of the body path with parallax drift.
- **Morphs:** sprites from an atlas, anchored to sockets positioned by angle along the
  ring. Each tier is a different frame, recolored toward the body color by a tint pass.
- **Evolution Forms:** swap the ring's rest shape and the socket map.
- **Budget:** 2 ms per frame for one slime on a mid-range Android device. The cached
  static render is reused for portraits.

### 16.5 Content pipeline and validation

- All content is plain JS data plus hook implementations, keyed by `id`.
- **`validateContent()` runs at import time and in tests, and fails on:**
  - an essence whose effect id isn't registered;
  - level tables missing I, II or III;
  - a Morph missing art (it falls back to a placeholder and warns);
  - an enemy pool that references an unknown essence;
  - an enemy pattern that uses an essence outside its kit;
  - event choices with invalid outcomes;
  - an orphan mechanic (an essence that touches fewer than 2 existing blocks, §9.2; this
    one only warns).
- **Hot-reloadable content in dev** for fast tuning.

### 16.6 Determinism, seeds, saves

- **Run seed:** a string, shareable and enterable in setup. Each stream draws from
  `hash(seed, stream, nodeIndex)`, so results don't depend on UI order and **reloading
  can't reroll outcomes** (anti save-scum).
- **Autosave** at every node transition, after every absorb, and at battle start.
  Mid-battle resume re-simulates from the start state and the Morsel input log.
- **Save format:** `{ version, profile: {meta…}, run: {…} | null, settings }`, with
  migrations per version as in `saveSystem.js`. Corrupt saves fall back to the last good
  copy, keeping two rotating slots.

### 16.7 Simulation harness (balance)

- A **headless** Node CLI runs N full runs per species and Salt level with **bot
  policies**: random, greedy-stat, family-focus, fusion-focus and archetype-script.
- **It reports:**
  - win rate and death floor distribution;
  - per-essence pick rate versus win rate;
  - the most common essence pairs in wins (the emergent-combo radar);
  - battle length distribution;
  - stalemates and Salt Rain frequency;
  - Critical Mass frequency;
  - fusion-to-III achievement rate.
- **Battle Lab** (a dev screen that is also a meta unlock): build any slime and fight any
  enemy, with full traces.

### 16.8 Performance budgets

| Item | Budget |
|---|---|
| Battle scene frame rate | 60 fps on a 2021 mid-range Android |
| Particles | 300 at most |
| Memory | under 300 MB |
| Cold start | under 4 s |
| Simulation speed | a full battle in under 5 ms (so Skip is instant and the harness can run 1,000 runs in minutes) |
| Save size | under 200 KB |

### 16.9 Testing

`node:test` unit tests, following the existing pattern:

- the resolver;
- each status;
- the damage pipeline traces;
- fusion math;
- offer generation (guarantees and Affinity);
- map generator constraints (property-based, over 10,000 seeds);
- the Critical Mass and Salt Rain valves;
- save round-trips and migrations;
- **determinism** (the same seed and inputs give an identical record stream).

---

## 17. Scope & Milestones

| Milestone | Contents | Exit question |
|---|---|---|
| **M0: Paper and Lab** (about 2 weeks) | Forked 1v1 resolver, Battle Lab, 12 essences, absorb and fusion in a linear chain of 8 fights, placeholder art | *Is absorbing fun?* |
| **M1: Vertical slice** | Act 1 Forest complete: map generator, every node type, 9 enemies, 3 elites, 1 boss, about 45 essences, 25 relics, 10 Morsels, 12 events; Gloop; procedural slime with about 15 Morphs; save and resume; Genes and 5 unlocks; Salt 1–5; sim harness v1 | *Do people do "one more run"?* |
| **M2: Alpha** | 3 acts (one biome each) plus the Finale; 4 species; about 120 essences; 60 relics; 30 events; 4 bosses plus the Hollow One; full Brood Pool; Instincts; Heirlooms; Slimepedia; Salt 1–10; Android build | *Do builds diverge? Do broken builds appear?* |
| **M3: 1.0** | 6 act biomes (two choices per act) plus the Finale; 7 species; about 200 essences; 100 relics; 50 events; 12 bosses plus the Hollow One; Salt 1–20 plus Deep Salt; Endless; Remnants; Feats; Iridescents; audio and polish | Ship |

**Content math for 1.0:** 6 act biomes × about 9 enemies (about 54) × about 5 pool
entries, with heavy family sharing, gives roughly 200 unique essences. About 60 of them need full
3-tier Morph art; the rest reuse family Morphs or have none (stat and element essences).

---

## 18. Risks

| Risk | Mitigation |
|---|---|
| Fusion RNG frustration (never finding a 3rd copy) | Affinity weighting, Concentrated essences, Ferment, Hatchery, Infuse, Lures, and family-shared essences. The harness tracks the fusion-to-III rate (target: at least 2 per winning run) |
| Auto-battle passivity | Decisions live in the build and the map; Morsels and the priority list give some control; fights are fast with Skip; intents and verbose logs keep things legible. Q2 sets the agency level |
| Content volume (enemies × essences × Morph art) | Family-shared essences, a procedural body, tiered Morph reuse, and a tight vertical slice first |
| Broken combos trivializing the game | Build checks, Salt, Deep Salt, Endless, and the §9.6 policy. Harness flags |
| Visual clutter from Morphs | Socket priority, a 6-visible cap, tint-to-body |
| Meta power trivializing runs | Mostly horizontal; Instincts capped; the Pure toggle |
| WebView performance on Android | Budgets, a reduced-effects mode, the PixiJS fallback |
| Coupling with Hive Queen code | Fork the engine first and extract later (§16.3) |

---

## 19. Open Questions

These are the decisions I made for you so the document could be complete. Each lists the
default I assumed. They're ordered by how much the answer would change the design.

| # | Question | Default assumed | Alternatives |
|---|---|---|---|
| **Q1** | How does this relate to Hive Queen? | A standalone game in the Hive Queen world: the Queen spawns a Champion each run, reusing its zones, monsters, stats and elements | A mode inside Hive Queen; a brand-new world |
| **Q2** | How much control during battle? | Light: an Action priority list plus tap-to-use Morsels | Pure auto (Batomon-style); manual choice of action each turn |
| **Q3** | Meta progression shape? | Mostly horizontal unlocks, plus bounded Instincts, lineage (Heirlooms, Remnants) and Feats; about 50 runs to finish the tree | More permanent power; pure unlocks only; a shorter or longer tail |
| **Q4** | Run length? | About 40 min (3 acts plus the Finale) | 2 acts / 20–25 min for mobile; a longer 4-act run |
| **Q5** | Fusion pacing? | Faithful to Batomon: 3 copies → II, 6 → III; 3 options per absorb | Faster (2 / 4); 4 options by default |
| **Q6** | What do Fight nodes reveal? | The enemy's Family | Exact species; nothing (Slay the Spire style) |
| **Q7** | Monetization? | Premium, no IAP (Batomon is $6 on Android) | Free-to-play with cosmetic-only purchases; ads |
| **Q8** | Art direction? | A procedural, smooth, translucent slime, with Morph sprites and illustrated enemies | Pixel art, matching the existing 32 px sprite sheet (that changes the Morph pipeline) |
| **Q9** | Platform and orientation? | Android first, portrait, through Capacitor, plus a web build | Landscape; iOS at launch; PC/Steam |
| **Q10** | Tone? | Cute-gross | Purely cute; darker body horror |
| **Q11** | Remnants (fighting your own past slimes)? | Keep them; they're the async-PvP flavor with no other players | Cut them |
| **Q12** | Salt ladder per species or global? | Per species (Slay the Spire style) | One global ladder |
| **Q13** | Is there a ceiling on brokenness? | No power cap. Chains past the trigger cap become **Critical Mass** (an instant win) | Let chains run literally forever; cap scaling |
| **Q14** | Name? | "Slurp" (placeholder) | Gloop, Ooze Rogue, Brood, Devour |
| **Q15** | Where does the code live? | A new app in this repo with a **forked** engine, extracted and shared later | A separate repo; inside the Hive Queen app |

---

## 20. Appendices

### 20.1 Glossary

| Term | Meaning |
|---|---|
| **Absorb** | Take one essence from a defeated enemy |
| **Affinity** | Owned essences are weighted ×2 in offers |
| **Apex (IV)** | A level above III, only from special sources |
| **Brine Mutator** | A permanent random rule added by each Deep Salt level |
| **Brood Pool** | The meta hub |
| **Concentrated** | An essence worth 2 copies |
| **Copies / Levels** | Absorb counts: 1 = I, 3 = II, 6 = III |
| **Critical Mass** | The overflow win when a player chain exceeds the trigger cap |
| **Digest** | Skip absorbing for Gel or a heal |
| **Essence** | An absorbable piece of an enemy: Stat, Element, Action, Reflex, Trait or Keystone |
| **Evolution Form** | The body that replaces yours at 6-Resonance or as a hybrid element |
| **Expel / Husk** | Remove a slotted essence / its sell value |
| **Family / Resonance** | Synergy tag / the 2/4/6 count bonuses |
| **Fusion / Fusion Burst** | A level-up from copies / the 1-of-3 boon it grants |
| **Gel / Genes** | The run currency / the meta currency |
| **Heirloom** | An essence banked from a past run |
| **Instinct** | A bounded permanent perk |
| **Iridescent** | The shiny variant of an essence |
| **Mass** | HP and body size |
| **Membrane** | Shield |
| **Morph** | The visual body part an essence adds |
| **Morsel** | A consumable |
| **Remnant** | The ghost of one of your past champions |
| **Salt / Deep Salt** | The difficulty ladder 1–20 / 21 and beyond |
| **Salt Rain** | The anti-stalemate damage that starts at round 30 |
| **Tempo** | Extra actions from the speed ratio |

### 20.2 Draft data shapes

This follows the existing `src/data` style.

```js
// content/essences/beast.js
export const POUNCE = {
  id: 'pounce',
  name: 'Pounce', evolvesTo: 'Rending Pounce',        // name at level III
  type: 'action', family: ['beast'], element: null,
  rarity: 'common', icon: '🐺', morph: { socket: 'crown', art: 'wolf-ears' },
  cooldown: 3,
  levels: {                                            // I / II / III (/ apex)
    1: { mult: 1.5, bleed: 2 },
    2: { mult: 2.0, bleed: 3 },
    3: { mult: 3.0, bleed: 5, rider: 'softened1' },    // III adds a clause
    4: { mult: 4.0, bleed: 8, rider: 'softened2' },
  },
  viscScale: 0.05,                                     // bleed + 0.05 × VISC
  effect: 'pounce',                                    // registered hook implementation
};

// content/enemies/forest.js
export const YOUNG_WOLF = {
  id: 'youngWolf', name: 'Young Wolf', family: ['beast'], element: null,
  stats: { mass: 28, firm: 5, slip: 7, visc: 2 },     // act-1 tier; scaled per act
  kit: [{ id: 'pounce', level: 1 }, { id: 'fangs', level: 1 }],
  pattern: ['attack', 'attack', 'pounce'],             // intent cycle
  pool: { signature: 'pounce', shared: ['fangs', 'feralInstinct'],
          stat: 'leanMuscle', element: null },
  gel: [12, 18],
};
```

### 20.3 References and sources

**Batomon Showdown.** These pages were reached through search summaries only, because
store and review pages are blocked from this environment's network. Community-wiki
details are unverified.

- [Rogueliker: launch article](https://rogueliker.com/pokemon-inspired-autobattler-batoman-showdown-launches-season-1/)
  (Pokémon-inspired PvP auto-battler, upgrade and combine into overpowered builds)
- [Engadget](https://www.engadget.com/2276267/batomon-showdown-is-the-hottest-new-auto-battler-on-the-block/)
  ("Pokémon meets Super Auto Pets", $6 on Android)
- [XPN demo impressions](https://www.xpnnetwork.com/post/demo-impressions-batomon-showdown)
  (upgrade paths, items and trinkets that "stack in ways that feel intentionally abusable")
- [Community guide: levels, merging, shiny](https://batomonshowdown-game.wiki/guide/levels-merging-and-shiny/)
  and [merge guide](https://newgamewiki.wiki/batomon-showdown/merge)
  (3 → L2, 2×L2 → L3, L4 only from events or items, a trinket on every merge, maxed
  species leave the shop)
- [Google Play listing](https://play.google.com/store/apps/details?id=com.batomon.showdown),
  [Steam community](https://steamcommunity.com/app/4557380),
  [itch.io page](https://berrymint.itch.io/batomon-showdown)

**Design references:**

- **Slay the Spire:** map generation, intents, Ascension.
- **Balatro:** celebrated brokenness; stakes as a difficulty ladder.
- **Super Auto Pets and TFT:** merge-3 and synergy thresholds.
- **Hades:** bounded meta perks; Heat as opt-in difficulty.
- **Inscryption:** transferring abilities between creatures.
- **Hive Queen** (`docs/GAME_DESIGN.md`): stats, elements, hook registry, the split
  between simulation and presentation, and "effects should be loud."

