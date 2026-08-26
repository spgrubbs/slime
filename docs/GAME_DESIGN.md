# Hive Queen — Game Design Document

_Status: living document. Reconstructed from the implemented systems in `src/`._

---

## 1. Pitch

You are a slime Hive Queen. You don't fight — you **breed, mutate, and dispatch**.
Slimes are consumable: you spawn them, invest biomass into them, send them out to die
somewhere useful, and reabsorb what comes back. The fun is in **building a slime**, not
in piloting one.

Loop: `spawn → equip mutations → send on expedition → absorb rewards → unlock more mutations → spawn better slimes`

Genre: idle/incremental with a creature-builder core. Designed for **3–4 check-ins per day**,
not continuous play.

---

## 2. Core Resources

| Resource | Symbol | Source | Sink |
|---|---|---|---|
| **Biomass** | 🧬 | Monster kills, ranches, reabsorbing slimes | Spawning, buildings, research |
| **Royal Jelly** | 🍯 | Capacity stat (`BASE_JELLY` + `JELLY_PER_QUEEN_LEVEL` × level) | Held by living slimes — it's population cap, not a spendable |
| **Materials** | 📦 | Monster drops, caravan ambushes | Buildings |
| **Mana** | ✨ | 1/hour per living slime + Mana Well ranch | Hive Abilities (timed global buffs) |
| **Prisms** | 💎 | 0.1% expedition drop, **guaranteed on routing a caravan**, IAP | Prism Shop (trait grants, time skips, mutation resets) |
| **Queen XP** | 👑 | Reabsorbing slimes, biomass conversion | Queen levels 1–50 → skill points, zone unlocks |

Biomass is the throughput resource; **Prisms are the gate resource** and the reason
caravan ambushes exist at all.

---

## 3. Slimes

### Tiers
`basic → enhanced → elite → royal`. Each tier ~doubles power and costs more jelly
(population cap), gets more mutation slots, and is gated behind a building.

| Tier | Jelly | Stat mult | Slots | Base HP | Biomass/1% | Cap |
|---|---|---|---|---|---|---|
| Basic | 5 | 1× | 1 | 30 | 3 | +80% |
| Enhanced | 20 | 2× | 2 | 75 | 8 | +100% |
| Elite | 50 | 3.5× | 3 | 150 | 20 | +120% |
| Royal | 100 | 5× | 4 | 300 | 40 | +150% |

### Stats
Three stats, deliberately non-standard so they read as *slime* properties:

- **Firmness** 💪 — attack damage and max HP
- **Slipperiness** 💨 — dodge, crit chance, action speed
- **Viscosity** 🌀 — the **effect stat**: scales mutation proc chances and effect magnitudes

Viscosity is the linchpin of the build game. Almost every mutation's power is
`baseValue + viscScale × viscosity`. A high-VISC slime isn't a bruiser — it's a slime
whose *weird effects actually land*.

### Growth
Slimes gain biomass on kills; biomass converts to a percentage stat multiplier, capped
per tier. A slime is therefore an **investment that matures** and then plateaus — at which
point reabsorbing it for Queen XP is the correct play. This is the intended
"slimes are consumable" pressure.

---

## 4. Mutations

30 mutations, 5 per zone, unlocked account-wide by killing 100 of the associated monster
(200–600 for rares). Once unlocked they are **unlimited** — the unlock is the progression,
not the inventory.

Each mutation carries:
- a flat stat `bonus` applied at spawn,
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

---

## 5. Traits

Personality traits are separate from mutations — behavioral flavor with small mechanical
weight, rolled at spawn (25% chance) or granted by ranches / Prism Shop. They also supply
the slime's **title** (`Gloop the Reckless`), which is most of their value: they make
individual slimes memorable in a game where slimes are disposable.

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
Send up to 4 slimes to a zone for 10 kills / 100 kills / infinite. Slimes fight
automatically, gain biomass and element affinity, drop materials, and can die permanently.
Zones unlock at Queen level 1 / 5 / 10 / 18 / 28 / 40.

This is where 90% of the game happens. It runs while you're away.

### 7.2 Ranches (idle side-channel)
11 ranch types on real-time cycles (30 min – 6 hr). Assigned slimes are **out of the
expedition pool** — a genuine opportunity cost. Ranches grant biomass, element affinity,
raw stats, traits, mana, or global buffs (War Den → ambush damage; Healing Spring →
expedition buff). Accumulation caps at 24h so you can't neglect them forever without loss.

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
Queen level ──┬── zone unlocks (1/5/10/18/28/40)
              ├── skill points → 3 trees (Ooze Outreach / Hive Growth / Slime Combat)
              └── royal jelly cap (population)

Monster kills ──── mutation unlocks (100 per type)

Buildings ──────── tier unlocks, defense slots, biomass recovery
Research ───────── multipliers on the above

Caravan tier ───── Prisms + human materials → buildings, legendary traits, resets
```

Three parallel currencies of progress (queen level, mutation library, buildings) that gate
each other loosely. The mutation library is the one that survives death — it's the
"metaprogression" that makes losing a party survivable.

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
   `alloyPotential` grant mutation slots that **grafting** can actually fill: a slime with an
   open slot can take another unlocked mutation for biomass, priced by tier.
6. ~~Max HP frozen at spawn.~~ Derived from current firmness.
7. ~~Exploration and intermission events never fired.~~ Both fire during travel.
8. ~~Tower defense had no decisions in it.~~ Rebuilt as lanes and positions — see §7.3.
9. ~~No test coverage on combat math.~~ 68 tests across the resolver, the expedition driver
   and the defense.

### Open

- **Balance has not been re-tuned.** Every number in the game was set against combat where
  mutations did nothing. Turning 30 passives back on has certainly moved the curve; the
  intended order was always to fix the mechanics first and tune second.
- **Ranch sprawl.** Four element ranches doing identical work is a lot of UI for one idea;
  one ranch with a selectable element would say the same thing.
- **Sprites.** Only the basic-tier idle sheet exists; every other tier and animation falls
  back to CSS. Not a bug, just unfinished art.

## 11. Design Principles

- **The Queen never fights.** All player power is expressed through what she builds and
  who she sends.
- **Slimes are consumable, individuals are memorable.** Names, titles, and mutation
  silhouettes make a specific slime's death land, even though slimes are fungible.
- **Effects should be loud.** Prefer a 10% chance of something absurd over a permanent 3%.
- **Idle by default, active when it pays.** Expeditions and ranches run away from the
  keyboard; the daily caravan is the one place that rewards attention.
- **Simulation and presentation are separate.** Combat resolves as data; the arena is one
  possible view of that data.

---

## 12. Proposal — Expeditions as delves

_Not built. This is the pitch for replacing the 10 / 100 / infinite kill-count picker._

### The problem

The current duration picker is a decision in shape only. "10 enemies" and "100 enemies" differ
by how long you wait, not by anything you weigh, and once **infinite** unlocks the other two
are dead options. Nothing in the system generates tension: a party either survives
indefinitely or dies to a monster it was never equipped for, and the player has no way to
express how much risk they are willing to take. Offline it is worse — you come back to an
outcome you had no input into.

### The reframe: the decision is *when to turn back*

Depth replaces kill count. A party pushes into a zone stage by stage; every stage pays, and
every stage is harder than the last. The interesting question is never "how many" — it is
**how far do we push before we come home**, and that question can be answered *in advance*,
which is exactly what makes it work while the player is asleep.

### The four pieces

**1. Depth.** An expedition runs in stages. Stage N is a handful of encounters against the
zone's monsters at a depth multiplier. Clearing it banks its haul and advances to N+1.
Rewards, material rarity and mutation kill-credit all scale with depth; so does monster
power. Pushing deeper is strictly better *and* strictly more dangerous, with no dominant
choice anywhere on the curve.

**2. Reserves.** The party carries a finite supply — call it Reserves — that drains per stage
and cannot be replenished in the field. As it runs low, healing effects weaken and incoming
damage climbs. Reserves guarantee every run ends without an arbitrary cooldown saying so, and
they give buildings, ranches and traits something meaningful to extend.

**3. Standing orders.** Set before departure. The party obeys them without the player
present:

| Order | Reads as |
|---|---|
| Return at depth **N** | "Get me to my target and come home" |
| Return if any slime drops below **X%** | Cautious — protects the investment |
| Return when a slime goes **Down** | The default; loses nobody to a bad streak |
| Return on empty Reserves | Squeeze the run for everything it has |
| Press on regardless | Greedy. Records are set here, and parties are lost here |

This is the actual decision, and it is a *risk posture* rather than a duration. It is also
what makes offline progression honest: the party comes home on its own terms, so you return
to a finished run report rather than an ongoing emergency you cannot influence.

**4. Downed, not dead.** A slime reduced to 0 HP is **Downed** — out of the fight, alive, and
carried. If the party gets home, it survives, hurt and having shed some biomass. If the party
wipes, everyone including the Downed is lost. So each Downed slime is a live argument to turn
back, and pushing on with two of them is a genuine gamble instead of a dice roll you never
saw. Slimes stay moderately precious, which is the same principle the caravan rework is built
on.

### What this buys

- **Continuous and productive.** One expedition runs until an order fires. Every stage pays,
  so even a timid posture earns.
- **Tension you chose.** Losing a slime is the consequence of an order you set, not of
  variance you never had a say in.
- **Honest offline.** The resolver is already headless; offline just runs stages until an
  order triggers or the elapsed time runs out.
- **A months-long axis.** Track **deepest cleared** per zone as a permanent record. It is a
  better zone gate than queen level, and it only moves with real investment — matured slimes,
  which cost biomass, which costs time.
- **Real-time pacing without a cooldown.** A stage takes a few minutes, rising with depth. A
  lunch-break check-in is a shallow run; an overnight is a deep one with a careful order. The
  clock throttles progress instead of a timer gate.

### Open questions

- **Recovering the dead.** A wiped party's biomass could be reclaimable by a later expedition
  that reaches the same depth — a revenge hook rather than a flat deletion. Good flavor,
  more bookkeeping; worth deciding before building.
- **How much Reserves upkeep is enough** that "press on regardless" is a gamble rather than a
  strictly correct play at high power.
- **Whether depth records should gate zones outright**, or just recommend them.
