# Slime Queen — Game Design Document

_Status: living document. Reconstructed from the implemented systems in `src/`._

---

## 1. Pitch

You are a slime Slime Queen. You don't fight — you **breed, mutate, and dispatch**.

Slimes are **assets, not ammunition**. You build one deliberately, send it out, and it comes
back changed — fatter with biomass, or wounded and empty-handed. Nothing you build is ever
deleted by bad luck; what you lose is the biomass it was carrying and the days it spends
mending. The fun is in **building a slime**, not in piloting one.

Loop: `spawn → apply mutagens → send on expedition → draw off the biomass → build → repeat`

Genre: idle/incremental with a creature-builder core. Designed for **3–4 check-ins per day**,
not continuous play.

---

## 2. Core Resources

| Resource | Symbol | Source | Sink |
|---|---|---|---|
| **Biomass** | 🧬 | Monster kills, ranches, withdrawing from or reabsorbing slimes | Spawning, buildings, research |
| **Plasm** | 🍯 | `BASE_JELLY` + `JELLY_PER_QUEEN_LEVEL` × level, + Slime Pit, + skills | **The population cap.** Held by every living slime, wounded ones included |
| **Materials** | 📦 | Monster drops, caravan ambushes | Buildings |
| **Mana** | ✨ | 1/hour per living slime + Mana Well ranch | Hive Abilities (timed global buffs) |
| **Prisms** | 💎 | 0.1% expedition drop, **guaranteed on routing a caravan**, IAP | Prism Shop (trait grants, time skips, mutation resets) |
| **Queen XP** | 👑 | Reabsorbing slimes, biomass conversion | Queen levels 1–50 → skill points, plasm cap |

Biomass is the throughput resource; **Prisms are the gate resource** and the reason caravan
ambushes exist at all. Plasm is the population cap — and because a wounded slime keeps
its jelly for the whole time it is mending, a bad expedition squeezes how much else you can
have in the field.

---

## 3. Slimes

### Tiers
`basic → enhanced → elite → royal`. Each tier ~doubles power and costs more jelly
(population cap), gets more mutation slots, and is gated behind a building.

| Tier | Jelly | Stat mult | Slots | Base HP | Biomass/1% | Held cap |
|---|---|---|---|---|---|---|
| Basic | 5 | 1× | 1 | 30 | 3 | +35% |
| Enhanced | 20 | 2× | 2 | 75 | 8 | +35% |
| Elite | 50 | 3.5× | 3 | 150 | 20 | +35% |
| Royal | 100 | 5× | 4 | 300 | 40 | +35% |

The held cap is the same on every tier on purpose — it is temporary power (see below), and
uniform is the clearest way to say "this is not part of the ladder". What differs per tier is
how much biomass buys that 35%: a Basic fills up on 105, a Royal needs 1,400.

### Stats
Three stats, deliberately non-standard so they read as *slime* properties:

- **Firmness** 💪 — attack damage and max HP
- **Slipperiness** 💨 — dodge, crit chance, action speed
- **Viscosity** 🌀 — the **effect stat**: scales mutation proc chances and effect magnitudes

Viscosity is the linchpin of the build game. Almost every mutation's power is
`baseValue + viscScale × viscosity`. A high-VISC slime isn't a bruiser — it's a slime
whose *weird effects actually land*.

### Two kinds of power

This split is the spine of the whole economy:

| | **Intrinsic** | **Held** |
|---|---|---|
| Comes from | Tier, traits, mutations | Biomass carried on the slime |
| Magnitude | ×1 → ×5 across tiers | up to **+35%**, every tier |
| Permanent? | Yes | No — forfeited entirely when the slime goes down |
| Can you bank it? | No | Yes, any time, for free |

Held power is capped well below the smallest tier step (Elite → Royal is ×1.43), so **maturing
a slime never promotes it a rung** — it sharpens the rung it is on and gives you something to
lose. A loaded Royal is a fat target; a drained one is merely a Royal.

### Wounds

A slime reduced to 0 HP is **Wounded**, not killed:

- it forfeits **every point of held biomass**,
- it cannot be deployed until it has mended,
- it keeps its plasm slot the entire time.

Recovery happens in a **Convalescence Pool** — 2 slots and 24 hours at base, improving to 6
slots and ~14 hours by level 5. Slots and time are both upgradeable, and both are the real
cost of a bad run: not a dead slime, but a body clogging your population cap for a day.

### Getting biomass back out

Two actions, deliberately distinct:

- **Draw out** — take everything a slime is carrying. It survives, unhurt, and drops back to
  its intrinsic power. This is how held biomass becomes spendable, and it is free and
  repeatable. Drawing down before a risky expedition is a legitimate hedge.
- **Reabsorb** — dissolve the slime for good: its held biomass *plus* its body (10× its jelly
  cost), and the jelly slot back. This is retirement, not harvesting.

---

## 4. Mutations

30 mutations, 5 per zone. A mutation reaches a slime exactly one way: you find a **mutagen**
and apply it. There is no unlock threshold, no spawn-time picker, and no graft — one
mechanism, used everywhere.

Each mutation carries:
- a flat stat `bonus` applied when the mutagen takes hold,
- a `passive` — the actual combat behavior,
- an optional `elementBonus` — starting elemental affinity,
- VISC scaling on the passive's magnitude or proc chance.

Design intent: mutations should be **flamboyant, not incremental**. The set includes
instant-kill rolls (`theTouch`), death explosions (`fracture`), resurrection (`resurrect`),
party-wide crit auras (`stormcaller`), debuff cleansing (`sloughSkin`), and status-duration
nullification (`nullify`). A slime should have a *silhouette of behavior*, not just bigger
numbers.

Every passive is implemented as a hook (§9.3), and `validateRegistry()` fails at startup if
one is not. Mutation slots come from the tier, plus `ancient` and `alloyPotential`, plus the
skill tree.

### Mutagens

Each monster drops the mutagen for its own mutation. The rate follows the **mutation's**
rarity, not the monster's — a rare monster is already scarce at ~5% spawn, so taxing it twice
would put a specific rare mutagen 2,000 kills away.

| Source | Drop chance | Kills in-zone for that specific mutagen |
|---|---|---|
| Common monster | 1% | ~420 |
| Rare monster | 3% | ~670 |
| *Any* mutagen from a zone | — | ~100 |

`monsterKills` no longer gates anything; it is now a **pity floor** — every 150 kills of a type
grants that mutagen outright, so a cold streak reads as unlucky rather than broken. The
Compendium shows both the per-kill rate and progress toward the floor.

Applying a mutagen is permanent and irreversible, and consumes the item. Slimes spawn blank —
the Forge picks tier and name, the slime screen is where a slime is *developed*.

### Why this shape

Every kill is a lottery ticket rather than a tally mark that stops mattering at 100, and a
mutation now has a real cost, so choosing where to spend one is a decision. It also makes
slots meaningfully scarce in the right direction: `ancient` and `alloyPotential` gained value
because a slot is now a place to put something you had to find.

**Wounds never touch mutations** — they are intrinsic (§3). Only reabsorbing does, and by
default reabsorbing a developed slime destroys its genes, so you dissolve spares and your
veterans accrete. The **Rendering Vat** (endgame materials, two tiers: 50% then 100% recovery)
is what reverses that, and it is a change in *how you relate to the roster* rather than a
number: after it, dissolving a veteran to re-house its mutagens in a Royal becomes correct.
The Convalescence Pool's slot pressure and the population cap are what keep the pre-Vat game
from turning into pure hoarding.

One tension to watch: the optimal play still drifts toward a small stable of perfected Royals.
Population cap and Pool rotation push back. If the roster ever stops turning over, look here
first.

---

## 5. Traits

Personality traits are separate from mutations — behavioral flavor with small mechanical
weight, rolled at spawn (25% chance) or granted by ranches / Prism Shop. They also supply
the slime's **title** (`Gloop the Reckless`), which is most of their value: a slime you keep
for months should be someone, not a row in a list.

Rarities: common → uncommon → rare (ranch-only) → legendary (Prism-only:
`ancient` +1 mutation slot, `primordial` +10% all stats).

Traits are intentionally *small* numbers. Mutations are the build; traits are the personality.

---

## 6. Elements

Four elements in a strict cycle: **Fire → Nature → Earth → Water → Fire** (strong ×1.25,
weak ×0.75).

Slimes have no element at spawn. They **accrue affinity by fighting in elemental zones**
(and in element ranches) until one locks in as `primaryElement`. This makes element a
*consequence of where a slime has been* rather than a pick — the slime's history is
written into its stat block. The `void` trait blocks this entirely; `adaptable` accelerates it.

The Void Abyss (zone 6) is elementally neutral — endgame content where the whole element
layer switches off.

---

## 7. Activities

### 7.1 Expeditions (primary)
Send up to 4 slimes to a zone. They fight **until you recall them** — there is no duration to
pick, because picking one was never a decision. Slimes gain biomass and element affinity and
drop materials the whole time, including while the game is closed. A slime that goes down is
**wounded**, not killed (§3) — the loss is its held biomass and a day in the pool.
A zone opens when the previous zone's **Warden** falls and its Seal buys the next Tendril (§17).
Each zone also holds one Warden of its own, challenged from the planner rather than met at random.

This is where 90% of the game happens. It runs while you're away.

### 7.2 Ranches (idle side-channel)
12 ranch types on real-time cycles (30 min – 24 hr). Assigned slimes are **out of the
expedition pool** — a genuine opportunity cost. Ranches grant biomass, element affinity,
raw stats, traits, mana, or global buffs (War Den → ambush damage; Healing Spring →
expedition buff). Accumulation caps at 24h so you can't neglect them forever without loss.

The **Convalescence Pool** is the exception: it is the only ranch that takes wounded slimes,
and the only one that refuses healthy ones. Its slots are the throttle on how fast the hive
recovers from a bad week.

### 7.3 Caravan Ambush (progression gate)
Once a real-world day, a human supply caravan passes near the hive. You may ambush it.

**The only decision is who goes.** Deploy up to `squadSize` slimes (3, plus Ambush Posts and
the Raiding Party skill). Everything after that is a damage race against a column that is
trying to get clear.

- **Rewards bank per kill, immediately.** Every unit that falls pays its biomass and
  materials on the spot. Nothing is contingent on finishing the job.
- **You can break off at any time**, keeping the whole haul and bringing every surviving
  slime home. Withdrawing is a real option, not a forfeit.
- **The column escapes after `ESCAPE_ROUNDS`.** That, not a puzzle, is what makes squad
  damage matter.
- **Routing the entire column** pays a Prism and permanently raises the caravan tier: bigger
  columns, tougher escorts, better cargo, forever. Difficulty is something you opt into by
  succeeding.

**Composition is randomized per day** and stable until the next one, so it can be scouted
rather than memorized. Without a **Scout Camp** you know only how many are in the column;
with one you get the full manifest — types, HP, immunities, and the total haul — before
committing.

The units are mostly a spread of HP and damage, with two immunities that punish a squad
built around a single trick:

| Unit | Character |
|---|---|
| Porter 🎒 | Weak, carries the goods. Kill first. |
| Outrider 🐎 | Slippery — a slow squad flails at it |
| Caravan Guard 🛡️ | A wall of HP that punishes a squad with no damage |
| Zealot 🕯️ | Status-immune, so proc-heavy squads must hit it honestly |
| Quartermaster 📜 | The good steel and the ledger |
| Caravan Captain 👑 | Crit-immune boss from tier 3 up; drops the Champion Badge |

**Why this shape.** Human materials gate several buildings, so this is the progression
faucet and the only reliable Prism source. But slimes are meant to be *moderately* precious —
losing an entire garrison to one bad read taught avoidance rather than mastery. Here you
risk a squad of three, you can pull them out, and the worst realistic outcome is a partial
haul.

### 7.4 Hive Abilities & Prism Shop
Mana buys timed global buffs (2–8 hours). Prisms buy permanent, targeted, high-impact
changes. Mana is the soft economy; Prisms are the hard one.

---

## 8. Progression Spine

```
Zone N's Warden ── Seal ── Tendril N+1 "Reach" ── zone N+1 opens   ← the spine
                                │
Zone N materials ── Tendril N "Provoke" ── zone N's Warden becomes challengeable
                                │
Warden+ Core ───── Tendril N "Root" ── small permanent passive

Queen level ──┬── skill points → 3 trees (Ooze Outreach / Hive Growth / Slime Combat)
              └── plasm cap (population)

Monster kills ──── mutagen pity floor (1 per 150); drops are the real source
Buildings ──────── tier unlocks, ambush slots, biomass recovery
Research ───────── multipliers on the above
Caravan tier ───── Prisms + human materials → buildings, legendary traits, resets
```

The spine is the top line and it is **linear and earned**: you cannot reach a zone without
beating the one before it, and you cannot challenge a Warden without grinding its zone first.
Everything else — queen level, mutagens, buildings, research — is breadth that makes the spine
achievable, not an alternative route along it.

This replaced three parallel currencies that gated each other only loosely, where advancing
meant reaching a biomass total rather than accomplishing anything.

---

## 9. Combat Model

### 9.1 Model
Combat resolves **turn-based**: discrete rounds, deterministic order, one clear resolution
per action. This is the model the mutation set was written for — "chance to skip a turn",
"heal X per turn", "revive after death", "first attack bonus" are all turn-language, and
turn structure is what makes flamboyant effects legible in a battle log.

The real-time arena is retained as an **aesthetic layer only**: a canvas visualization that
animates the turn results (slimes sliding in, hits landing, floating numbers, status icons)
without owning the simulation. Presentation reads the log; it does not produce it.

Why: the arena's continuous model made every effect a special case (durations in ms, "turns"
faked as 1500ms, no discrete point at which a stun could take hold), and the mutation layer
silently fell off during the port. Simulation and presentation are now separable —
`resolveRound()` is pure and deterministic given an rng, and `ArenaCanvas` replays the beats
it produces.

Both activities run on the same resolver. An expedition is one party against one monster;
a caravan ambush is that same squad working down a column one unit at a time. That reuse is
the payoff of the split.

### 9.2 Resolution order (per round)
1. Status ticks (damage over time, duration decrement)
2. Incapacitation check (stun/freeze consume the actor's turn)
3. Actor acts in initiative order (derived from slipperiness)
4. Pre-hit modifiers → hit/dodge → damage modifiers → elemental → post-hit procs
5. Death checks (including revive mutations and death-triggered effects)
6. Round-end effects (regeneration, auras)

### 9.3 Effect hook points
Every mutation, trait, skill, hive ability, and monster ability must be expressible as one
of a fixed set of hooks, so new content is data rather than code:

`statMod` · `hpMod` · `onRoundStart` · `onBeforeAttack` · `onHitChance` · `onDamageDealt` ·
`onDamageTaken` · `onStatusApply` · `onStatusReceive` · `onKill` · `onDeath` · `onHazard` ·
`onRoundEnd` · `partyAura`

An effect that can't be written as a hook is a signal the hook set is wrong — not a reason
to special-case it inside the damage function.

`validateRegistry()` runs at import time and throws if any mutation passive, trait, monster
ability, or status effect has no implementation. That check is what makes the whole class of
"declared but silently inert" bug impossible to ship.

### 9.4 Verbose logging
Every number combat produces carries a trace of how it got there — base stat, each named
modifier that applied, every roll with its threshold and whether it landed. Verbose mode
renders those traces under each log line, in both expeditions and ambushes. Rolls that
*failed* are shown too: a proc you cannot watch miss is a proc you cannot balance.

```
FIRM 36  🔪 Sharp ✗ 41.1% vs 16.5%  dodges ✗ 28.2% vs 8.0%
         position: guaranteed crit  ×1.5 CRIT → 54  🔥 Pyrolyze ✓ 11.6% vs 22.8%
```

---

### 9.5 The arena
Combat is resolved as rounds; the arena is one view of those rounds and owns every piece of
geometry in the game.

The field is a **2.5D ground plane** seen from a low angle. Every entity has a position
`(x, depth)`; depth sets both where it sits vertically and how large it draws, and its
shadow is pinned to its own ground point — which is what keeps a squad reading as standing
on a field rather than floating in a column.

Slimes steer rather than teleport. Each holds an arc of a ring around the current target and
rotates through a handful of behaviors — **press** (in its face), **flank** (swing to a
different side), **circle** (orbit at range), **dart** (lunge and back off) — plus **recoil**
when something lands a hit on them. A separation force keeps them out of each other and out
of the target's body, so four slimes converging read as a pack surrounding something instead
of a single blob.

**Stats are legible without opening a sheet:**

| Stat | How you can see it |
|---|---|
| Firmness 💪 | Body size, and how far out the slime stands from its target |
| Slipperiness 💨 | How fast it crosses the ground, and how quickly it bounces |
| Viscosity 🌀 | Dripping particles trailing onto the ground |

Slimes draw from the sprite sheet in `src/assets/sprites`, tinted per tier, with the element
icons from `src/assets/sprites/elements` as an affinity badge. The same renderer draws
expeditions and caravan ambushes; the only difference is that a caravan column marches in
procession along a road rather than one monster holding ground.

---

## 10. Design Debt

### Cleared

1. ~~Mutation passives not connected to combat.~~ All 30 are wired through the hook
   registry, with a startup assertion preventing recurrence.
2. ~~Stat calculation misreading effect fields.~~ `baseValue`/`viscScale` are effect
   magnitudes only; stat bonuses come from `bonus` at spawn or an explicit `statMod` hook.
3. ~~`void`/`adaptable` read from the wrong list.~~ Both are traits and read as traits.
4. ~~`stun` applied but never checked.~~ Enforced by the resolver; `weakened`, `slowed` and
   `enraged` all have appliers, and monster `slow`/`buff` do their jobs.
5. ~~`curious` and `ancient` unimplemented; `primordial` partial.~~ `curious` raises the
   travel-event rate, `primordial` is +10% to all stats and max HP, and `ancient` /
   `alloyPotential` grant mutation slots that a **mutagen** can actually fill (§4).
6. ~~Max HP frozen at spawn.~~ Derived from current firmness.
7. ~~Exploration and intermission events never fired.~~ Both fire during travel.
8. ~~Tower defense had no decisions in it.~~ Removed. Replaced by the caravan ambush (§7.3),
   which asks one question — press or leave — and pays per kill so leaving is never a loss.
9. ~~No test coverage on combat math.~~ 96 tests across the resolver, the expedition driver,
   the caravan and the drop economy.
10. ~~Mutations unlocked by a kill threshold, then free forever.~~ Replaced by mutagens (§4);
    the kill tally survives as a pity floor.
11. ~~Grafting as a second, parallel way to gain a mutation.~~ Removed. Applying a mutagen is
    the only mechanism, and slimes now spawn blank.
12. ~~Nine screens, split by system.~~ Six, split by subject — see §11c. The roster no longer
    appears twice, and Inventory is a fold on the Hive rather than a screen.
13. ~~Zones gated by a skill point.~~ Gated by the previous zone's Warden — see §17.
14. ~~No fight in the game worth optimising for.~~ Six Wardens, each unbeatable by the party
    that clears its zone.
15. ~~Fights over in two rounds.~~ HP raised, damage cut; the game now runs 6-9 rounds.
16. ~~Every expedition wiped inside two minutes.~~ Slimes recover on the road, so an
    at-level zone is sustainable for hours and an over-level one bleeds.
17. ~~Bosses were stat checks.~~ Every Warden has a rule with a counter — see §17.
18. ~~The skill tree was 57% flat percentages.~~ 11%, and all of those are capacity — §18.

### Open

- **Balance has not been re-tuned.** Every number in the game was set against combat where
  mutations did nothing. Turning 30 passives back on has certainly moved the curve; the
  intended order was always to fix the mechanics first and tune second.
- **Ranch sprawl.** Four element ranches doing identical work is a lot of UI for one idea;
  one ranch with a selectable element would say the same thing.
- **Sprites.** Only the basic-tier idle sheet exists; every other tier and animation falls
  back to CSS. Not a bug, just unfinished art.

## 11. Balance

### The one rule that matters

**Combat power is roughly `DPS × EHP`.** Both scale with stats, so power scales with the
*square* of stats. Every balance intuition has to be translated through that:

| If stats differ by | Power differs by |
|---|---|
| 3× | ~9× |
| 10× | ~100× |
| 100× | ~10,000× |

So "two orders of magnitude between a tier 1 and a tier 4 slime" is the right *feel* and the
wrong *number*: it should be 100× in **power**, which is about **10× in stats**. The current
spread — 5 base at Basic to 62 fully-matured Royal, ~12× — is already correct. Raw stats were
never the problem.

### Action economy squares too

Four slimes each acting once per round against one monster acting once is a 4:1 economy. It
is also a squared term: the party has four attackers *and* the monster's damage is split four
ways. That dwarfs everything else. Measured against the real resolver, at fixed stats:

| Party size vs a Crystal Grotto monster | Win rate |
|---|---|
| 1 slime | 0% |
| 2 slimes | 0% |
| 3 slimes | 13% |
| 4 slimes | **91%** |

A cliff, not a curve — which is why four unmodified Basic slimes could clear a zone meant for
Elites. **Monster actions per round is therefore the primary difficulty dial**, not HP and not
damage: tier 1–2 monsters act once, 3–4 twice, 5–6 three times, and rares get an extra.

### Percentage stats need diminishing returns

Dodge and crit were flat multiples of slipperiness. At 62 slipperiness that is a **93% dodge**
— a matured slime simply stopped being hittable, and the top two tiers cleared every zone
without effort. Both now use `k · s / (s + c)` curves and all evasion is capped at 70%
combined. Anything that converts a stat into a probability needs this treatment; anything
that converts a stat into a magnitude does not.

### The intended ladder

Calibrated by simulation against the real resolver, party of four, no mutations:

| Tier | Fresh | Fully loaded with biomass |
|---|---|---|
| Basic | Forest, Swamp | Forest, Swamp (Grotto still out of reach) |
| Enhanced | + Crystal Grotto, Cinderspire at ~60% | Cinderspire comfortably |
| Elite | + Cinderspire, Stormspire at ~15% | Stormspire at ~50% |
| Royal | + Stormspire, the Void at ~40% | the Void comfortably |

Two rules fall out of it, and both are legible without a spreadsheet:

1. **A tier covers two zones** — one comfortably, one as a stretch.
2. **Held biomass turns the stretch zone into the comfortable one.** It never opens a third.

That second rule is the whole point of capping held power below a tier step (§3). Mutations,
elements and the skill tree are the *margin* on top — they should turn a coin-flip zone into
a comfortable one, never skip a rung.

### The material economy

Materials gate buildings, and the wait is the progression — this is an incremental, so a
gate you can walk through immediately is not a gate. Each material rolls **independently**
when a monster dies, at a rate set by what it gates rather than by which monster dropped it:

| Class | Rate | Role |
|---|---|---|
| Common | 38% | Keeps buildings and ranches ticking over |
| Uncommon | 16% | Mid-tier costs |
| **Gating** | **8%** | Wanted in bulk by one specific building |
| From a rare monster | 45% | The ~5% spawn *was* the grind; pay out once found |

That puts the heaviest gates around 130–270 kills — roughly a couple of check-ins with
expeditions running, since they progress offline. The capstone (Void Essence ×5 for the
Primordial Chamber, from a rare in the endgame zone) lands near 220 kills of content that
already requires matured Elites.

A test asserts that **every material any building or ranch asks for is actually obtainable**.
Eight of them once had no source at all, which quietly made several ranches unbuildable.

`recommendedStats` on each zone is the stat level at which that party clears ~3 fights in 4.
Those numbers are simulated, not estimated, and are re-derived whenever the curves move.

### How to re-check after a change

`node --input-type=module` against `src/combat/resolveRound.js` — build parties, run
`resolveRound` to completion, count wins. The resolver is pure and headless, so the whole
balance table is a script rather than an afternoon of playtesting. Verbose traces explain any
single number the table disagrees with.

---

## 11b. Teaching the game

The UI does not explain itself in place. Panels state **terms**, not tutorials — "⏳ 30 rounds ·
💰 paid per kill · 🏃 leave any time" rather than a paragraph saying the same thing to someone
who has read it forty times.

Explanation happens once, as a **popup the first time a system is met**, and then retires to
the Compendium's Guide. Triggers are declarative: each entry in `tutorialData.js` carries a
`when(state)` predicate checked against a small snapshot (current tab, wounded count, biggest
held biomass, kills so far), and the first due, unseen entry fires. Adding a tutorial is
adding a data entry.

The Compendium has three faces:

- **Zones & Monsters** — what lives where, and mutation unlock progress.
- **Guide** — every tutorial you have seen, kept verbatim. Unseen ones show as locked, so it
  doubles as a map of what you have not met yet.
- **Reference** — tier tables, stat curves, status effects, elements, traits and drop rates,
  **derived from the data files** rather than written out. The old hand-written version had
  drifted badly enough to be actively misleading (it still advertised the pre-rework biomass
  caps), which is the argument for deriving it.

Tutorials can be turned off in Settings or from the popup itself ("Skip all"), and reset from
either Settings or dev mode.

---

## 11c. Screens

Six screens, grouped by **what the screen is about** rather than by which system implemented
it. The earlier layout had nine, split by system, and it showed: the roster appeared on two of
them, the ranch had a whole screen for one component, and "Inventory" was a screen that only
ever listed materials.

| Screen | What it is | Holds |
|---|---|---|
| 👑 **The Hive** | the Queen and everything she owns | level & mana, abilities, buildings, Instincts (skill tree), Stores (materials) |
| 🟢 **The Spawn** | every slime, upright or mending | Forge, mutagens on hand, roster, slime detail, and the Pools |
| 🗺️ **The Wilds** | where slimes are sent | zones, expedition parties, the arena |
| 🎯 **The Road** | the one timed event | caravan ambush, its cooldown, catapults |
| 📖 **Memory** | the record | Compendium: zones, guide, reference |
| ⚙️ **Settings** | knobs | speed, verbose logs, tutorials, dev mode, save |

Rules that produced this:

- **A screen is a subject, not a system.** Convalescence Pools are not a fifth pillar of the
  game; they are where wounded slimes go, so they live with the slimes. The skill tree is not
  separate from the hive; it is what the Queen learns, so it folds into the hive.
- **Nothing appears in two places.** The roster is on the Brood and nowhere else.
- **Fold, don't paginate.** Secondary sections on a screen are `<details>` that state their
  own status in the summary — "🌳 Instincts · 1 point to spend", "📦 Stores (4 kinds)" — and
  open themselves when they want attention. A closed fold costs one line; a tab costs a
  navigation.
- **A timed thing stays top-level.** The Road is one component and could fold into the Wilds,
  but it is the only screen with a clock, and burying a clock is how players miss it.

Names are the hive's, not a UI's: the Brood, the Wilds, the Road, Instincts, Memory. Within a
screen the same applies — you *draw out* biomass rather than withdraw it, slimes *mend* rather
than heal, a mutagen *takes hold* rather than being equipped.

## 12. Design Principles

- **The Queen never fights.** All player power is expressed through what she builds and
  who she sends.
- **Slimes are consumable, individuals are memorable.** Names, titles, and mutation
  silhouettes make a specific slime's death land, even though slimes are fungible.
- **Effects should be loud.** Prefer a 10% chance of something absurd over a permanent 3%.
- **Idle by default, active when it pays.** Expeditions and ranches run away from the
  keyboard; the daily caravan is the one place that rewards attention.
- **A screen is a subject, not a system.** Group by what a thing *is about* — the Queen, the
  slimes, the field — not by which module renders it.
- **The interface states, the tutorial explains.** Anything that reads like a paragraph in a
  panel you visit daily belongs in a first-encounter popup and the Compendium instead.
- **Simulation and presentation are separate.** Combat resolves as data; the arena is one
  possible view of that data.

---

## 14. Proposal — five ways to make loss hurt

_Not built. Alternatives to permadeath-on-wipe, after the Downed idea was rejected for
removing the decision it was supposed to create._

The bar every option has to clear: **a player who is losing must face a real choice, and both
answers must be defensible.** "Everyone is nearly dead, do I press on" is not a choice if the
answer is always no.

### A. Wounds — you lose time, not the slime

Death stays death. But surviving a fight below some HP threshold leaves a **Wound**: a
persistent stat penalty that only heals by resting the slime in a ranch for real hours.

- **The choice it creates:** push on and come home with three wounded veterans who are out of
  rotation for a day, or bank now and keep them working.
- **Why it works:** cost is denominated in *time*, which is the resource an idle game is
  actually made of, and it gives ranches a second job.
- **Risk:** bookkeeping, and a wounded-slime backlog that feels like chores.

### B. Nerve — the party decides for itself

A shared party pool that drains on bad events (a death, a crit taken, a status landing). At
zero the party **breaks and flees on its own**, losing unbanked progress but not slimes.

- **The choice it creates:** none directly — and that is the point. It is a *floor*, so the
  other mechanics can be sharper without the game feeling unfair.
- **Why it works:** the catastrophic outcome is bounded, so pushing deep is exciting rather
  than reckless.
- **Risk:** if Nerve is generous it becomes invisible; if it is tight it overrides the player.

### C. Extraction — the loot is not yours until it is home

Everything a delve earns rides **unbanked** with the party. It is only secured on return.
Death loses the slime *and* its carried share.

- **The choice it creates:** the clean greed curve. Every stage asks "bank it or double it",
  and both answers are right at different times.
- **Why it works:** the tension is continuous rather than a single cliff at the end, and it
  makes the caravan and the delve feel like opposite propositions — the caravan banks
  instantly by design, the delve does not.
- **Risk:** losing an hour of accumulated haul in one bad round is the harshest option here,
  and needs pairing with something that caps the blast radius.

### D. The one-death rule — losses are real but bounded

The moment **any** slime dies, the expedition auto-recalls. You never lose more than one per
run, and losing one ends the run.

- **The choice it creates:** it moves the decision *earlier*, which is where it belongs — the
  choice is "how deep do I set my order", made while you still have information, not "do I
  keep going" while watching a disaster.
- **Why it works:** permadeath keeps its sting, but one bad streak cannot delete a squad you
  spent a week building. It is the most surgical answer to the objection that killed Downed.
- **Risk:** at high power a death becomes a mild annoyance rather than a loss.

### E. Personality decides — traits set the risk posture

Drop the standing-order menu. The party's behavior comes from **who you sent**: a `reckless`
or `brave` slime refuses to withdraw, a `timid` or `cautious` one pulls out early and drags
the party with it. `lazy` slimes bank sooner; `greedy` ones push for one more stage.

- **The choice it creates:** the decision moves entirely into squad composition, which is the
  part of the game you already enjoy building.
- **Why it works:** personality traits go from flavor text to the most consequential thing on
  a slime's sheet, and every squad has a temperament you can feel.
- **Risk:** less direct control, and it needs traits to be common enough to compose around.

### Decided: **A — Wounds**, with the stakes tightened

Implemented as of this pass. A slime that goes down forfeits **all** its held biomass and is
**Wounded**; it recovers in a Convalescence Pool (2 slots / 24h at base, 6 slots / ~14h at
level 5) and holds its plasm the entire time.

Why this one over the others:

- It passes the bar the Downed idea failed. There is no "do I press on with three casualties"
  non-choice, because the run simply ends when the party is down — the decision is *where to
  send them and how much biomass to let them carry*, made beforehand, with information.
- The cost is denominated in **time and capacity**, which is what an idle game is actually
  made of, and it gives the Convalescence Pool's slot and duration upgrades a real job.
- Slimes stop being ammunition without becoming invulnerable. You can lose a week of a
  slime's accumulated biomass in one bad round, and your best four sitting in the pool while
  a caravan passes is a genuine sting.
- **Drawing biomass out** (§3) is the counterplay, and it is a real decision: bank before a
  risky run and go in weaker, or carry it and gamble.

C (extraction) is effectively folded in already — held biomass *is* unbanked loot, and
withdrawing *is* banking it. B, D and E remain available if losses ever feel too soft; D in
particular is the natural next dial, since auto-recalling on the first wound would cap how
many slimes one bad night can put in the pool.

---
## 15. Proposal — the missing middle *(resolved: Wardens, §17)*

_Not built. The question this answers: the game stops introducing itself far too early, and
nothing in it ever asks whether a slime is built **right** rather than built **big**._

### The gap, measured

| Fact | Consequence |
|---|---|
| All three activities — expeditions, ranches, caravans — are reachable by **Queen level ~4 of 50** | 92% of the progression introduces nothing new |
| Zone gates are a Queen level plus one skill node, nothing else | Progress is a biomass total, not an accomplishment |
| Rare monsters carry **no ability and no trait** — the Life Fairy is *weaker* than its zone average | "Rare" is a drop-rate tag, not an encounter |
| Every fight is one monster against a party, resolved by whether your number is bigger | Nothing can be *countered*, only out-scaled |
| Late biomass has no sink once buildings and research are done | The economy flattens exactly when it should deepen |

The last two are the important ones. **Combat is fully automated, so every decision the player
makes happens before the fight starts.** That means the only way to make preparation matter is
to field encounters that *defeat specific preparations*. A pure stat check can only ever ask
for **more**. A counter-condition asks for **different** — and "different" is the entire
reason to keep a varied stable of slimes.

### A. Zone Wardens — the reason to optimise

One per zone. **Summoned, not wandered into**: calling a Warden costs a stack of that zone's
materials, so it is an act of preparation with a price, not something you grind into by
accident.

Each Warden carries a **counter-condition**, published in the Compendium before you fight it,
that makes some builds actively bad:

| Warden | Condition | What it demands |
|---|---|---|
| Grotto | Reflects critical damage back at the attacker | Firmness and `stoneskin`; a crit build kills itself |
| Cinderspire | Regenerates 12% max HP per round unless Burning | Somebody has to bring `pyrolyze` |
| Stormspire | Takes 90% less from the same slime twice in a row | A wide party, not one carry |
| Void | Immune to crits and status; its damage scales with your **living** party size | Few, tough slimes — inverts the action-economy lesson |

Plus an **enrage timer**: after N rounds it stops being beatable. That makes every Warden a
damage check *and* a survival check at once, which is what forces balanced builds rather than
one maxed stat.

Winning gates the next zone (replacing or supplementing the Queen-level gate, so advancement
is something you *did*). Wardens are re-fightable at escalating threat tiers for scaling
rewards, which gives the endgame a ladder that is not just a bigger number.

This is the cheapest of the three to build: a Warden is a monster definition with hooks the
resolver already supports, a summon cost, and the fight screen that already exists.

### B. Provisioning, and C. Brood lineage — **rejected**

Two other candidates were put up alongside Wardens: ranches producing consumables that
expeditions burn (Provisioning), and slimes inheriting from parents (Brood lineage). Both were
turned down. Recording them so they are not proposed again: Provisioning adds an upkeep chore
to a game whose appeal is that it runs without you, and lineage is a second slime-authoring
system competing with the one mutagens already provide.

Wardens were the pick, and they are built — see §17.

### On the guided tutorial

The eventual scripted opening — first spawn, first expedition, first recall, first
reabsorb, first building — fits the current system without rework. Tutorial triggers are
`when(state)` predicates, so a scripted track is just a `tutorialStep` counter in the snapshot
and predicates of the form `s.tutorialStep === 3`. The free-firing entries stay as they are
for systems met after the opening.

---


## 16. Mutagens replace kill-count unlocks — **BUILT**

_Shipped. Kept as the rationale record; the resulting system is documented in §4._
_Everything below describes what was decided and why; all of it landed, including the
pity floor and both Rendering Vat tiers._

### Why this is better

The current system has three problems that all come from the same root — **once a mutation is
unlocked it is free forever**:

1. **Progression ends at the unlock.** The 100th wolf matters; the 400th is noise. In an idle
   game where you will kill thousands of things, a threshold that fires once and never again
   is a poor use of the most common event in the game.
2. **There is no economy.** Nothing about a mutation is scarce after the unlock, so no
   decision about one has a cost. Slots became the only constraint, which is thin.
3. **Grafting is a patch.** It exists because `ancient` granted a slot nothing could fill. It
   is not a system anybody would design from scratch.

Mutagens fix all three. Every kill becomes a lottery ticket instead of a tally mark, mutations
gain a real cost, and grafting stops being a special case — **applying a mutagen is the only
way a slime ever gets a mutation**, so there is one mechanism instead of two.

### The shape

- Monsters drop a **mutagen** for their own mutation at a low rate.
- A mutagen is an inventory item. Applying it to a slime with a free slot grants that mutation
  **permanently and irreversibly**, and consumes the item.
- Slimes spawn **blank**. The Forge chooses tier and name; the slime screen is where it is
  developed. This suits "you *mutate* a slime" far better than ordering one pre-mutated.
- **Wounds never touch mutations** — they are intrinsic (§3). Only reabsorbing destroys them.
- **Reabsorbing a mutated slime destroys its mutagens**, until a late-game upgrade says
  otherwise.

### Drop rates

A flat 1% is right for commons and badly wrong for rares. Measured against the real spawn
tables:

| Source | Drop | Zone kills for that specific mutagen |
|---|---|---|
| Common monster (23.8% spawn) | **1%** | ~420 |
| Any mutagen from a zone | — | ~100 |
| Rare monster at 1% (5% spawn) | 1% | **~2,000** — far too steep |
| Rare monster at **3%** | 3% | ~670 |

So the rate belongs to the **mutation's rarity, not the monster's** — the same correction
already applied to materials, where a rare monster's ~5% spawn *is* the grind and its drops
pay out generously once found.

**Optional but recommended: a pity counter.** Pure 1% RNG with no floor can hand a player 500
kills and nothing, which reads as broken rather than unlucky. Repurpose the existing
`monsterKills` tally as a guaranteed floor — say, one mutagen every 150 kills of that type
regardless of rolls. This keeps the lottery feel, caps the worst case, and gives the counter
that is being retired a second job instead of deleting it.

### The late-game recovery upgrade

This is the strongest part of the idea and deserves to be built as a proper unlock — a
**Rendering Vat**, gated behind endgame materials.

- **Before it**, reabsorbing a developed slime destroys its genes, so you only ever dissolve
  unmutated spares and your roster accretes. Retirement has a real cost.
- **After it**, you can churn: dissolve a veteran and recover its mutagens to re-apply to a
  Royal. Suddenly the whole stable is raw material.

That is not a numerical upgrade — it **changes how the player relates to their roster**, which
is exactly the kind of late-game evolution §15 argues the game is missing. Consider staging it:
partial recovery (50%) at first tier, full recovery at a second.

### Knock-on decisions

| Thing | What happens to it |
|---|---|
| `requiredKills` on mutations | Retired as a gate; becomes the pity floor |
| `monsterKills` | Kept as a Compendium record and the pity counter |
| Spawn-time mutation picker | Removed — slimes spawn blank |
| Grafting | Removed as a separate concept; applying a mutagen *is* the mechanism |
| `alloyPotential` / `ancient` | **More** valuable — slots now cap how many scarce items a slime can hold |
| Prism `mutationReset` | Re-scope: currently "remove all mutations", which would destroy items. Make it "extract one mutation back into a mutagen" — a premium Rendering Vat |
| Prism `instantMutation` | Re-scope to "grants one random mutagen" |

### The risk worth naming

Loss-on-absorb may make absorbing a developed slime *never* correct before the Rendering Vat,
which could clog the population cap. I think that is correct rather than a flaw — you dissolve
spares, not veterans, and the Vat is what opens the other mode. But it should be a deliberate
choice, not a surprise, and the Convalescence Pool's slot pressure is what keeps it from
becoming a pure hoarding game.


---

## 17. Zone Wardens and Tendrils — **BUILT**

The answer to §15: one real fight per zone, and a building chain that turns beating it into
the way forward.

### The Warden

Six Wardens, one per zone, in `wardenData.js`. They are **not in any spawn table** — you never
meet one by accident, because a boss that can wipe an unprepared party at random punishes
exploring rather than rewarding preparation. A hunt is declared in the expedition planner
before the party leaves: no travel phase, no wandering, one fight, home either way.

Two states:

| | Drops | Purpose |
|---|---|---|
| **Warden** (first kill) | a **Seal** | the only way to grow a Tendril into the *next* zone |
| **Warden+ / Rekindled** (every kill after) | a **Core** | buys that Tendril's final level |

Tuned against the real resolver, not estimated:

| Party strength | Warden | Warden+ |
|---|---|---|
| the zone's `recommendedStats` (clears its commons) | **0%** | 0% |
| ×1.5 | 48–80% over 10–14 rounds | 0% |
| ×2 | 98–100% over 7–12 rounds | 0% |
| ×3 | — | knife edge |
| ×4 | — | 100% over 9–11 rounds |

That first row is the whole point: **the party that clears a zone loses to its Warden.** If a
stock party could take it, the boss would not be a reason to optimise anything. There are
tests asserting all three bands, so a future balance change cannot quietly erase the gate.

Two findings worth keeping, both counter-intuitive:

- **Past a threshold, more HP makes a boss *less* beatable, not merely slower.** The party's
  total health is fixed, so every extra round is another round of incoming damage; the fight
  flips from "long" to "lost" without ever getting closer. Damage, and above all **action
  count**, is the real dial — giving Warden+ a single extra action put every one of them at a
  0% win rate, which is why it now has exactly the actions its base form does.
- **`heal` is disproportionate at boss scale.** It restores 15% of max HP per proc, so over a
  20-round fight it returns most of the bar. On the *first* boss in the game it made the
  Verdant Warden+ harder than the Hollow one. It is off the Wardens entirely for now.

### The Tendril

Zones used to be bought with skill points, which made the most significant progression in the
game a menu click. Each zone now has a **Tendril** building with three levels, and each level
is a different kind of gate:

| Level | Costs | Grants |
|---|---|---|
| 1 **Reach** | the **previous** zone's Warden Seal | expeditions to this zone |
| 2 **Provoke** | four ordinary materials from *this* zone, ~90–150 kills' worth | the Warden can be challenged |
| 3 **Root** | this zone's Warden Core | a small permanent passive (+6%) |

So the way into a new zone is beating the one before it. The forest Tendril starts at Reach on
a new game — there is no earlier Warden to buy it with, and the first zone should not be gated
at all. Old saves are migrated: any zone a skill had already opened gets its Tendril at Reach.

The five skill nodes that used to unlock zones keep their place in the tree (other skills
require them) and pay a stat bonus instead.

### The Wardens' rules

Each Warden has a rule that beats the obvious approach, and an answer the player
can already reach — from that zone's own drops or a shallower one's. Provoking a
Warden costs ~90-150 kills in its zone, so its mutagens are in hand by then.

| Zone | Rule | The answer |
|---|---|---|
| forest | **Thornskin** — returns a share of every hit | Vinewebs blocks outright; Sharp means fewer, harder hits |
| swamp | **Fen Rot** — knits itself back each round | Nothing knits while it bleeds — Spiny, or any burn/poison |
| caves | **Refraction** — critical hits are turned back | Drop the crit build; Firmness and health. Sharp is a liability |
| ruins | **Everburning** — hits harder every round it stands | A stun halves the stacks — Ghastly Wail, Earthshaker |
| peaks | **Stormlash** — cannot be blocked or phased, only dodged | Slipperiness; Permafrost blunts what lands |
| volcano | **Null Field** — hardens against each element that hits it | Four different affinities take four times as long to teach |

Measured at 1.5× the zone's recommendedStats, the build that answers the rule
wins **66-83%**; the build that ignores it wins **0-31%**. Tests assert the gap.

Three things this cost to get right, all worth keeping:

- **A uniform rotation asks for nothing.** Null Field first "resisted everything
  but the element it currently shows, rotating each round". That is
  mathematically empty — four fire slimes and four mixed slimes take exactly the
  same expected damage — so the mechanic rewarded nothing. Adaptive resistance
  is non-linear, which is what makes diversity actually pay.
- **Action economy is not negotiable.** The peaks Warden was going to scale its
  AoE with party size, to reward sending fewer, stronger slimes. At equal
  per-slime stats, four beat three beat two at *every* scaling value tried:
  halving the party halves both damage and health, and no penalty offsets that.
  The mechanic now asks for a different **defence**, not a different party size.
- **A total counter is not a counter.** Clearing Everburning's stacks outright
  let one stun mutation trivialise the fight — 46% wins even *under* the zone's
  recommended stats. Halving them, with a floor that rises every two rounds,
  keeps the answer meaningful without switching the fight off.

### Balance: fight length, and why expeditions used to die

Two problems, one fix.

**Fights were over before anything could happen.** At each zone's
`recommendedStats` the forest ran 2.2 rounds at 2% party damage — no build, no
mutation and no arena behaviour gets to express itself in two rounds.

**And every expedition wiped in one to two minutes.** Measured across all six
zones, at every stat level: a party that runs "until recalled" and never heals
always ends in a wipe, after 1-8 kills. An idle game whose idle activity lasts
90 seconds is not an idle game. Nothing in the loop closed.

So slimes now **reknit on the road**: `TRAVEL_REGEN` (28% of max HP per travel
leg) is the dial that decides how long an expedition lasts, because a party
survives exactly as long as it out-heals what a fight costs it.

That makes monster HP and damage two separate levers with two separate jobs:

| | raised by | controls |
|---|---|---|
| **HP** | 1.3-4.0× | how LONG a fight runs — crit, dodge and procs need rounds |
| **Damage** | 0.35-1.0× | how much a fight COSTS — measured against travel recovery |

Damage came **down** in every zone past the second, because the old numbers cost
a party 40%+ of its health per fight and nothing at that rate is sustainable at
any regen. Fights now run **6-9 rounds** and cost **12-26%**.

| Zone tier | HP × | Damage × |
|---|---|---|
| 1 | 4.0 | 1.0 |
| 2 | 2.5 | 0.8 |
| 3 | 1.8 | 0.45 |
| 4 | 1.6 | 0.40 |
| 5 | 1.4 | 0.40 |
| 6 | 1.3 | 0.35 |

The resulting endurance curve is the design, and it reads cleanly:

| Party | Result |
|---|---|
| below `recommendedStats` | bleeds out in 1-37 minutes |
| at `recommendedStats` | forest and swamp run indefinitely; caves, ruins, peaks and volcano run 20 min - 4.4 h |
| 1.5× | indefinite everywhere |

Two further findings:

- **A flat doubling was the obvious move and the wrong one.** It would have put
  the peaks at 11.4 rounds and a 56% win rate, breaking the only part of the
  curve that already worked.
- **Within a zone, cost tracks fight LENGTH**, so a monster twice as tanky as its
  neighbours is a damage spike rather than flavour. `boulderTroll` ran 14.6
  rounds at 31% of party health where its zone averaged 8 rounds at 20%. Monster
  HP is now clamped to ±15% of its zone's mean: monsters differ in how they
  fight, not in how long they take.

And `boulderTroll` itself was the seed of a Warden mechanic. It carried
`ability: 'heal'` with flavour text promising "prolonged fights are dangerous",
and there was no answer to it — so **regeneration is now suppressed by any
damage-over-time**, everywhere. A wall became a puzzle, and the same rule is
what the Mire Warden is built on.

### The arena

Monsters used to spawn at a single fixed point, which was the exact spot the previous one died
— so each new monster materialised already surrounded by the squad that had just killed
something else. They now enter from a random edge (in from the right, or over the rise, or up
from the near slope) and walk to a post of their own. Motions are also retired when a
combatant leaves the field: enemy ids are derived from the monster type, so without that a
second Young Wolf inherited the dead one's position and skipped its entrance entirely.


---

## 18. The skill tree — rules, not numbers

**The rule this tree is written to: a skill should change how something works,
not how big a number is.**

"+8% firmness" is not a decision. You take it when you can afford it and never
think about it again, and it makes every build converge on the same one. The old
tree was **57% flat bonuses** (31 of 54 skills), plus five nodes that unlocked
zones — a job Tendrils took over in §17.

It is now **47 skills, 5 of them numbers (11%)**, and all five are *capacity*:
plasm, pool slots, mutation slots, ambush slots, rare spawn rate. A
capacity is legitimately a quantity, and raising one changes what you can field.

Everything else is a rule. A sample of what replaced the bonuses:

| Skill | What it changes |
|---|---|
| **Second Wind** | Travel recovery also sheds one harmful status |
| **Salvage Rites** | Materials a party was carrying survive a wipe |
| **Vanguard** | Your party always acts first in the opening round |
| **Careful Dissection** | Every kill yields at least one material |
| **Field Triage** | A slime that goes down keeps the biomass it carried |
| **Pathfinder** | Travel between fights costs no time |
| **Rally** | When a slime falls, the survivors heal 25% |
| **Relentless** | Five kills without a casualty grants a free round |
| **Reclamation** | Reabsorbing returns a slime's full cost |
| **Dismantling** | Buildings can be torn down for everything they cost |
| **Field Dressing** | Wounds mend slowly even without a pool slot |
| **Second Skin** | The first harmful status each fight slides off |
| **Opportunist** | A slime's opening strike of a fight always crits |
| **Adaptive Carapace** | Being hit by an element hardens you against it |
| **Contagion** | Statuses on a dying monster carry to the next one |
| **Focused Venom** | Your damage-over-time effects last twice as long |
| **Last Stand** | The final slime standing acts twice a round |
| **Apex Predator** | Mutation passives trigger twice as often |

Two rules that did not survive contact, both worth recording:

- **Opportunist was originally "a killing blow grants another action".** It could
  never fire: expeditions face one monster at a time, so the extra action had
  nothing left to hit. It is now the opening strike — which also makes it a
  *liability* into the Geode Warden, and that anti-synergy is a feature.
- **Endless Hunger promised "expeditions run until recalled".** That is simply
  how expeditions work now. A skill point spent on the status quo is worse than
  no skill at all; it became Quarry Scent (rare spawns) instead.

There is a test asserting every passive skill id is actually **read** somewhere
in the codebase. This repo has already shipped a whole content layer that
silently did nothing — all 30 mutation passives — and a skill point spent on a
passive nothing checks is that same bug wearing a different hat.

### Saves

There is no migration layer. The game is in active design and its state shape
changes most passes; the translator that used to live in `saveSystem.js` carried
a dozen retired systems and was more code than the systems it propped up. A save
that predates the current shape is filled in from defaults.


---

## 19. Playtest pass — what the first Android build found

Six things, five of them cheap and one a real defect.

### The defect: expeditions ended on reload

An overnight expedition came back having done nothing: seventeen hours away, an
empty summary, the party recalled, no progress.

`targetKills` was `Infinity` for the ordinary "run until recalled" case, and
**`JSON.stringify(Infinity)` is `null`**. After any save, `kills >= null`
coerces to `kills >= 0` — true immediately — so the first kill fired
`expComplete` and recalled the party. This was not an offline bug at all: *any*
reload ended the expedition. It is now a number or `null`, never Infinity, with
an explicit null check at both comparison sites.

Two things fell out of investigating it:

- **The offline cap was set without measuring.** `MAX_OFFLINE_ROUNDS = 1500` is
  40 minutes of simulated time, so a 17-hour absence was truncated to 40 minutes
  even once the break was fixed. Measured, a full 24h of forest costs ~430ms to
  simulate. The ceiling is now 60,000 — a safety net rather than the real limit,
  which is the 24h elapsed-time cap.
- **A reloaded Warden hunt lost its rule.** `hydrateExpedition` looked the enemy
  up in `MONSTER_TYPES` only, so a Warden rehydrated with a null `ref` and an
  empty `effects` list — its mechanic silently stopped applying mid-fight.

### Early fights had no risk at all

A tier-1 party ran seventeen fights and finished at **full health**. Travel
recovery (28%) comfortably exceeded what a forest fight cost (13%), so health
only ever moved one way.

Early damage went up — tier 1 ×1.4, tier 2 ×1.15, tier 6 ×1.15 — and a party now
ends 17 fights at 60-73% health, losing a slime roughly one run in three, with
the numbers degrading over a longer session (33-66% and up to 2 slimes down over
60 fights).

**The thing worth remembering:** attrition here is *bimodal*, not a dial. Losing
a slime cuts party damage, which lengthens fights, which costs more health —
positive feedback against an absorbing barrier. Recovery a little above the cost
of a fight pins the party at full health; a little below spirals to a wipe.
There is almost no stable middle, so the risk that matters comes from per-slime
variance (a basic slime has ~30 HP and takes 8-damage hits), not from a slow
average bleed. An earlier attempt to equalise single-fight cost across all six
zones made the deep zones completely safe, because sustained behaviour and
single-fight cost are not the same measurement.

### Sensory Tendrils is gone

It told the player "this zone expects 4 in each stat" — the answer to the
question the game is actually asking. Working out what a zone costs *is* the
reading. Its slot in the tree went to the mutation unlock, which wanted to be
early and cheap.

### Mutations are now an unlock

**Unstable Genes** (1 point, off the expedition root) turns on mutagen drops,
the pity floor, and the mutation tutorial. Before it, nothing about mutagens
exists: no drops, no pity progress, and no Compendium progress bar filling
toward a system that has never been explained.

### Travel is a visible transition

Between fights the party is on the road, and the arena now shows it: roadside
silhouettes and ground streaks slide right-to-left in two parallax bands while
the slimes bob along in a loose file. The *world* moves rather than the party,
which reads as walking left-to-right without anyone leaving the canvas. Each
zone has its own silhouette — conifers, reeds, stalagmites, broken pillars,
crags, tilted slabs.

### The theme is slime, not bee

"Hive Queen", royal jelly and a hatchery are beekeeping. The vocabulary is now:

| was | is |
|---|---|
| Hive Queen | **Slime Queen** |
| The Hive | **The Nucleus** |
| The Brood | **The Spawn** |
| Royal Jelly 🍯 | **Plasm** 🫧 |
| Royal Hatchery | **Gestation Pool** |
| Hive Growth (tree) | **Deep Culture** |

Internal identifiers (`hiveFoundation`, `activeHiveAbilities`, the Android
`appId`) are deliberately unchanged: they are not imagery, and the `appId`
especially must stay, or the next APK installs as a second app beside the one
already on the phone instead of upgrading it.


---

## 20. The unlock ladder

Gating mutations behind a skill worked better than anything else in the tree, so
the question became: what else should arrive rather than simply be there?

### The rule

**Gate verbs, never the core loop.** A first session must always contain: spawn
a slime, send it somewhere, watch it fight, spend what it brings back. Anything
that would leave a new player staring at one button is not a candidate, however
tempting it is as a progression beat.

And **hide, don't grey out.** A locked panel advertises what you are missing; an
absent one lets the screen grow. The moment is the thing appearing.

Every gate ships with a tutorial that fires on the unlock, not on first use — so
the explanation arrives with the system instead of after a lucky drop.

### What a fresh game now has

Four screens: The Nucleus (level, plasm, Instincts, Stores), The Spawn (forge
and roster), The Wilds, Memory. No Buildings panel, no Pools, no Road.

### The ladder

| Unlock | Cost | Opens |
|---|---|---|
| **Unstable Genes** | 1 | mutagen drops, the pity floor, mutation slots |
| **Calcified Frame** | 1 | the Buildings panel — and with it Tendrils and tiers |
| **Cultivation Pools** | 2 | ranches and the Convalescence Pool; the Pools switch appears on The Spawn |
| **Road Sense** | 2 | The Road — the caravan ambush tab appears |
| **Split Column** | 3 | a second simultaneous expedition |
| **Many Pseudopods** | 5 | a third |

Simultaneous expeditions were unlimited before and are now **one** by default.
That is the most tangible of the new gates: it is not a bigger number, it is a
second board to play on, and it costs roster depth rather than being free
throughput.

### Deliberately NOT gated

- **Reabsorb and withdraw.** Both are outs from a bad position. Gating an escape
  hatch punishes exactly the player who needs it.
- **The Compendium.** It is the reference; locking knowledge behind progress
  makes the early game more confusing, not more structured.
- **Party size.** Tempting — going 2 → 3 → 4 slimes would be an enormous felt
  power jump. That is exactly why it is dangerous: §11 measured action economy
  as the *dominant* combat dial, far ahead of stats, so gating party slots would
  invalidate the entire early-game balance pass and need the whole curve
  re-tuned around two-slime parties. Worth doing one day, as its own pass.
- **Elemental affinity.** The strongest remaining candidate. It is a whole
  system that currently just happens to you, and "your slimes can now take on a
  zone's element" is a good beat. Not built.

### The bug this pass exposed

`<Menu>` was being handed the unfiltered `tabs` array while `visibleTabs` only
reached the dot indicator and the swipe handler — so the `skillUnlock` filter on
tabs had never done anything at all. It was written for the ranch tab, which was
later folded into The Spawn, and nothing had used it since.
