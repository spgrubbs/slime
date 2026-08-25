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
| **Materials** | 📦 | Monster drops, tower defense | Buildings |
| **Mana** | ✨ | 1/hour per living slime + Mana Well ranch | Hive Abilities (timed global buffs) |
| **Prisms** | 💎 | 0.1% expedition drop, **guaranteed on tower-defense victory**, IAP | Prism Shop (trait grants, time skips, mutation resets) |
| **Queen XP** | 👑 | Reabsorbing slimes, biomass conversion | Queen levels 1–50 → skill points, zone unlocks |

Biomass is the throughput resource; **Prisms are the gate resource** and the reason
tower defense exists at all.

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
raw stats, traits, mana, or global buffs (War Den → tower defense damage; Healing Spring →
expedition buff). Accumulation caps at 24h so you can't neglect them forever without loss.

### 7.3 Tower Defense (progression gate)
24-hour cooldown. Three approach lanes converge on the hive; you garrison each with up to
three slimes, one per position, then commit. Three waves, the last carrying a Champion.

**Lanes** differ in how long they buy you:

| Lane | Crossing | Character |
|---|---|---|
| The Ravine 🏔️ | 5 rounds | Single file — only the front invader engages |
| The Causeway 🛣️ | 3 rounds | Wide and fast; everything that arrives fights at once |
| The Marsh 🌫️ | 6 rounds | Invaders arrive Slowed and advance at half rate |

**Positions** each reward a different stat, which is what gives a slime the expedition meta
has no use for a job here:

| Position | Wants | Effect |
|---|---|---|
| Choke 🛡️ | Firmness | +50% Firmness; sole legal target while it stands |
| Flank 🗡️ | Slipperiness | Every hit crits; untargetable until the Choke falls |
| Rear 🧪 | Viscosity | Procs roll twice; routs the moment invaders reach it |

**Invaders** each invalidate one dominant strategy, so "stack Firmness" stops being a
universal answer: the **Shieldbearer** cannot be crit (Flanks are wasted on it), the
**Zealot** is immune to every status (Rear procs whiff), and the **Sapper** tunnels past
the Choke to whatever is behind it. The **Champion** does both and hits hardest.

The wave manifest is visible during setup — the decision is meant to be read and made in
advance, which suits a once-a-day event far better than reacting in real time.

**Stakes.** Losing a lane costs the slimes garrisoning it, permanently. It costs nothing
else — your stores are never touched. Clearing wave 3 pays a **Prism** however ugly the
run was; the **Champion Badge** is reserved for a defense with no lane lost.

Its role in the economy is specific and important: it is the **only reliable Prism faucet**,
and Prisms buy the things nothing else sells (legendary traits, mutation rerolls, time
skips). It is the once-a-day "sit down and actually play" moment against an otherwise
hands-off game.

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

Tower defense ──── Prisms → legendary traits, resets, time skips
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
tower defense is three lanes resolving in parallel with a targeting rule per lane. That
reuse is the payoff of the split.

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
renders those traces under each log line, in both expeditions and tower defense. Rolls that
*failed* are shown too: a proc you cannot watch miss is a proc you cannot balance.

```
FIRM 36  🔪 Sharp ✗ 41.1% vs 16.5%  dodges ✗ 28.2% vs 8.0%
         position: guaranteed crit  ×1.5 CRIT → 54  🔥 Pyrolyze ✓ 11.6% vs 22.8%
```

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
   travel-event rate, `ancient` and `alloyPotential` grant real mutation slots, `primordial`
   is +10% to all stats and max HP.
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
- **Grafting.** `ancient` grants a mutation slot to an already-spawned slime, but there is
  no way to fill it after spawn. The slot is real and counted; the action to use it is not
  built.

## 11. Design Principles

- **The Queen never fights.** All player power is expressed through what she builds and
  who she sends.
- **Slimes are consumable, individuals are memorable.** Names, titles, and mutation
  silhouettes make a specific slime's death land, even though slimes are fungible.
- **Effects should be loud.** Prefer a 10% chance of something absurd over a permanent 3%.
- **Idle by default, active when it pays.** Expeditions and ranches run away from the
  keyboard; tower defense is the one place that rewards attention.
- **Simulation and presentation are separate.** Combat resolves as data; the arena is one
  possible view of that data.
