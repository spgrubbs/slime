# SLURP — Requirements

> **v0.2:** requirements touched by the Decisions in the GDD are updated in place and
> marked v0.2. The first playable draft (`/slurp`) implements most P0 rows; see its README.

These are testable requirements derived from [`GAME_DESIGN.md`](./GAME_DESIGN.md) (cited
as "GDD"). Each one is a single "shall" with its acceptance criteria folded into the
wording. Numbers are starting values to tune. Where a number and the GDD disagree, the
GDD wins until both are updated.

**Priority**

- **P0:** needed for the vertical slice (M0–M1).
- **P1:** needed for 1.0 (M2–M3).
- **P2:** post-launch or stretch.

**IDs** are stable. Retired requirements are struck through and never reused.

---

## RUN — Run structure

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| RUN-01 | A run shall consist of Acts 1–3, each ending in a boss, followed by a Finale (Pool → Shop → The Hollow One). The vertical slice ships Act 1 only, ending in its boss | P0 | §4.1 |
| RUN-02 | After each act boss, the player shall choose the next act's biome from the unlocked options, seeing each biome's dominant Families and element | P1 | §4.1 |
| RUN-03 | Between acts the slime shall heal 100% of missing Mass (reduced by Salt 5) and gain +1 slot after the Act 1 and Act 2 bosses | P0 | §4.5, §5.2 |
| RUN-04 | A run shall end on slime death, a Finale victory, or player abandonment. Every ending shall go to the Run Summary and bank Genes | P0 | §12.3 |
| RUN-05 | A run shall be resumable from any point after the app is closed or killed (see TECH-05) | P0 | §16.6 |
| RUN-06 | At run start the player shall pick 1 of 3 Queen's Blessing boons | P1 | §14 |
| RUN-07 | After a Finale win the player shall be offered Endless Depths (Keep Eating) | P1 | §13.3 |

## MAP — Map generation

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| MAP-01 | Each act shall generate a map on a 7×12 grid plus a boss row, from 6 non-crossing upward walks starting in row 1 | P0 | §4.2 |
| MAP-02 | Rows 1, 7 and 12 shall be all Fight, all Treasure and all Pool respectively. Row 13 is the Boss | P0 | §4.2 |
| MAP-03 | Generation shall enforce, for all seeds tested: no Elite or Pool in rows 1–4; no two consecutive Elite, Shop or Pool on any path; children of a branching node of different types; at least 2 Elites; at least one path with two or more Shops-or-Pools | P0 | §4.2 |
| MAP-04 | Free rows shall use configurable type weights (Fight 40, Event 15, Mystery 12, Elite 9, Pool 10, Shop 6, Hatchery 4, Remnant 4). Weights shall be modifiable by Salt and Brine rules | P0 | §4.2 |
| MAP-05 | Remnant weight shall become Fight when no Remnants exist. Hatchery and Remnant shall only appear once unlocked | P1 | §4.2, §12.4 |
| MAP-06 | Fight nodes shall show the enemy Family icon. Elite nodes shall show species and modifier on long-press. The boss shall be shown at act start with its Boss Essence pool | P0 | §4.4 |
| MAP-07 | With Compass Needle or Keen Senses, Fight nodes shall show the exact species | P1 | §4.4 |
| MAP-08 | The map shall be generated from the run seed's map stream, so the same seed always gives the same map | P0 | §16.6 |
| MAP-09 | The player shall only be able to move to nodes connected to the current node. The current path and the reachable nodes shall be highlighted | P0 | §14 |

## NODE — Node types

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| NODE-01 | **Fight:** a 1v1 battle against an act-roster enemy. A win grants an Absorb (ABS-01) and 12–18 Gel (+4 per act) | P0 | §4.3 |
| NODE-02 | **Elite:** an elite enemy with an Elite Modifier. A win grants a relic, an Absorb including a Concentrated signature option, and 30–40 Gel | P0 | §4.3, §11.3 |
| NODE-03 | **Boss:** a multi-phase boss. A win grants pick-1-of-3 Boss Essences, pick-1-of-3 Boss relics, +1 slot (Acts 1–2), the act-transition heal and 75 Gel | P0 | §4.3 |
| NODE-04 | **Shop:** stock and services per ECO-04 | P0 | §10.2 |
| NODE-05 | **Event:** shows one event from the act's eligible pool, never one already seen this run | P0 | §10.6 |
| NODE-06 | **Mystery:** resolves to Event 55% / Fight 25% / Shop 10% / Treasure 10%. Each miss raises the odds of a non-Event result for the next Mystery (Slay the Spire–style pity) | P0 | §4.3 |
| NODE-07 | **Treasure:** grants 1 relic (Common 50 / Uncommon 33 / Rare 17%) plus 10–20 Gel, with a swallow animation | P0 | §4.3 |
| NODE-08 | **Pool:** the player picks exactly one of Soak (heal 35%), Ferment (+1 copy) or Molt (remove an essence for its Husk value), plus any unlocked options | P0 | §10.5 |
| NODE-09 | **Hatchery:** +1 copy to a chosen owned essence for 10% of current Mass. Repeatable, with the cost rising 5% per use, and never lethal | P1 | §4.3 |
| NODE-10 | **Remnant:** a battle against a stat-normalized past champion. A win grants one of its slotted essences at 2 copies plus bonus Genes | P1 | §11.5 |

## SLM — The slime

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| SLM-01 | The slime shall have four stats: Mass (HP and size), FIRM (damage and Membrane scaling), SLIP (turn order, Tempo, dodge) and VISC (effect magnitude, proc chance) | P0 | §5.1 |
| SLM-02 | Dodge shall be `50% × SLIP / (SLIP + 60)` plus flat sources, hard-capped at 75% | P0 | §5.1 |
| SLM-03 | Base crit chance shall be 5% and base crit damage ×1.5. Only essences and relics shall raise either | P0 | §5.1 |
| SLM-04 | The slime shall start with 4 slots (species may modify), have a baseline maximum of 6, and a hard cap of 8 | P0 | §5.2 |
| SLM-05 | Stat and Element essences shall take no slot. Each species' innate shall take no slot and can't be removed | P0 | §5.2 |
| SLM-06 | Element affinity shall be the sum of absorbed affinity points. The primary element is the highest affinity at 3 or more and sets attack element and body color | P0 | §5.3 |
| SLM-07 | A second element at 3 or more shall make the slime a hybrid (Steam, Magma, Ash, Mud, Bog or Amber), each granting its passive. All four at 3 or more grants Prismatic | P1 | §5.3 |
| SLM-08 | Element multipliers shall be ×1.25 strong and ×0.75 weak on the Fire → Nature → Earth → Water → Fire cycle. Hybrid attacks use their better component | P0 | §5.3 |
| SLM-09 | Species: Gloop (P0); Ironjelly, Prismjelly and Mimic (P1); Acid Ooze, Royal Heir and Void Slime (P1, unlockable). Each has its base stats, innate rule bend and starter essence per GDD §5.4 | P0/P1 | §5.4 |

## ABS — Absorption and fusion

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| ABS-01 | After every won battle, the player shall be offered N essences (default 3) drawn from the defeated enemy's pool, excluding essences already at III | P0 | §6.2 |
| ABS-02 | Each offer shall include at least one slotted essence (Action, Reflex or Trait) whenever the candidate pool has one | P0 | §6.2 |
| ABS-03 | Normal enemies' signatures shall appear in 50% of offers; elites' always, as Concentrated (2 copies) | P0 | §6.2 |
| ABS-04 | Offers shall be drawn without replacement, weighted by rarity (Common 60 / Uncommon 30 / Rare 10), with ×2 Affinity weight on owned essences. Relics and rules shall be able to modify both | P0 | §6.2 |
| ABS-05 | Instead of absorbing, the player may Digest for +15 Gel or a 15% heal, or spend a reroll token to redraw the offer | P0 | §6.2 |
| ABS-06 | Absorbing an essence shall heal 5% of max Mass | P0 | §6.2 |
| ABS-07 | An essence shall be Level I at 1 copy, II at 3 cumulative copies, and III at 6 (species and rules may change the thresholds). Apex (IV) shall only come from sources marked `grantsApex` | P0 | §6.3 |
| ABS-08 | Each level of an essence shall define its own values. Level III shall add a rider and may rename the essence (`evolvesTo`) | P0 | §6.3 |
| ABS-09 | Reaching II or III shall trigger a Fusion Burst: pick 1 of 3 boons from the level-appropriate table. A "+1 copy" boon may cascade into further fusions, all resolved in order | P0 | §6.3 |
| ABS-10 | Choosing a slotted essence with full slots shall require Expelling an owned slotted essence first (or cancelling). The expelled essence becomes a Husk worth 8 Gel per copy, and its copies are lost | P0 | §6.4 |
| ABS-11 | The absorb screen shall show each option's type, Family, element, level pips toward the next fusion, and a live preview of its Morph on the player's slime | P0 | §14 |
| ABS-12 | Kill bonuses shall apply: Flawless (+1 option), Overkill (+10 Gel per 100% overflow, +10 base), Devour (absorb 2) | P1 | §6.6 |
| ABS-13 | Once unlocked through Mastery, an essence shall have a 2% chance per offer slot to appear Iridescent (base effect plus a bonus line). Shiny enemies (1/50 spawn) shall always offer one Iridescent | P1 | §6.7 |
| ABS-14 | Essences bought in shops, granted by events, or taken from Remnants shall go through the same absorb flow, including slot replacement and fusion | P0 | §6.8 |

## FAM — Families and Resonance

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| FAM-01 | Every slotted essence shall have one or two Families. Resonance counts slotted essences per Family, and dual-family essences count for both | P0 | §6.5 |
| FAM-02 | Resonance bonuses shall activate at 2, 4 and 6 for each of the 11 Families. The slice requires Beast, Flora, Stone, Insect, Spirit and Ooze | P0/P1 | §6.5 |
| FAM-03 | A 6-Resonance shall apply that Family's Evolution Form: a body swap plus its bonus. At most one Form is active; ties go to the Form reached first | P1 | §6.5, §7.3 |
| FAM-04 | The build screen and absorb screen shall show live Resonance counts and what the next threshold grants | P0 | §14 |

## VIS — Mutation visuals

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| VIS-01 | The slime shall render procedurally as a soft-body blob with squash, stretch and jiggle, without needing per-combination sprite sheets | P0 | §16.4 |
| VIS-02 | Body color shall blend primary and secondary element colors 70/30. Hybrids shall add their material effect | P0 / P1 | §7.1 |
| VIS-03 | Body size shall follow Mass on a log scale with no upper cap. The battle camera shall zoom out to keep both combatants in frame | P0 | §7.1, §9.5 |
| VIS-04 | Each slotted essence with a Morph shall attach it to its socket (crown, brow, eyes, mouth, back, left, right, base, tail) at the tier matching its level (I / II / III) | P0 | §7.2 |
| VIS-05 | When two Morphs compete for a socket, the higher level shall show; ties go to the most recently absorbed. Stackable Morphs add instances up to their cap | P0 | §7.2 |
| VIS-06 | No more than 6 Morphs shall be visible at once. Hidden ones shall be listed in the inspect panel | P0 | §7.4 |
| VIS-07 | Owned relics shall render as small icons floating inside the translucent body | P1 | §7.1 |
| VIS-08 | Absorb, Fusion, Evolution, Victory and Death shall each have the signature animation beats listed in GDD §7.5 | P0 (Absorb, Fusion) / P1 | §7.5 |
| VIS-09 | Every run end shall save a static portrait of the final slime to the Hall of Slimes | P1 | §7.6 |
| VIS-10 | Missing Morph art shall fall back to a placeholder icon badge. It must never crash or render invisibly | P0 | §16.5 |

## CMB — Combat engine

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| CMB-01 | Combat shall be 1v1 and resolved by a pure function, `(battleState, inputs, rng) → (newState, records)`, with no DOM or timing dependence | P0 | §8.1 |
| CMB-02 | (v0.2) Given the same slime and enemy, a battle shall produce an identical record stream. Combat uses no randomness: crit and dodge are meters that fill by their chance per hit | P0 | §8.4, §8.8 |
| CMB-03 | At each round start both sides gain Tempo = `max(0, (SLIP_self+5)/(SLIP_opp+5) − 1)`. Each full point converts to one extra action that round, up to 20; extra Tempo beyond that becomes +10% damage per point | P0 | §8.2, §8.9 |
| CMB-04 | Actions shall resolve in effective-SLIP order, ties going to the player. Each action is its own turn, with turn-start processing per GDD §8.2 | P0 | §8.2 |
| CMB-05 | On its turn an actor shall use the first ready Action in its priority list, or else make a basic attack (100% FIRM). Cooldowns tick at the end of the owner's turn | P0 | §8.2–8.3 |
| CMB-06 | The player shall be able to reorder Action priority outside battle, and the order shall persist for the run | P0 | §8.3 |
| CMB-07 | The damage pipeline shall run in the GDD §8.4 order (base → hit check → crit → attacker modifiers → element → defender modifiers → Membrane → Mass → on-hit), with every step and roll written to a trace | P0 | §8.4 |
| CMB-08 | Membrane shall absorb damage before Mass and dissolve at the start of its owner's turn unless an effect retains it | P0 | §5.1 |
| CMB-09 | Reflexes shall trigger on their events without using an action, subject to the trigger-depth cap (EMG-01) | P0 | §6.1 |
| CMB-10 | The hook registry shall support every Hive Queen hook point plus `onBattleStart`, `onTurnStart`, `onTurnEnd`, `onAction`, `onCrit`, `onDodge`, `onMembraneGain`, `onMembraneBreak`, `onHeal`, `onOverheal`, `onStatusTick`, `onBattleEnd`, `onAbsorb`, `onFusion`, `onNodeEnter` and `onGelGain` | P0 | §16.3 |
| CMB-11 | Every content effect shall be implemented as hooks. Content referencing an unregistered effect shall fail validation at startup (TOOL-01) | P0 | §16.5 |
| CMB-12 | Enemies shall use the same essence system as the player, driven by an authored pattern (cycle plus weighted branches plus phase triggers) | P0 | §8.6 |
| CMB-13 | The enemy's next intent (damage value and/or status icons) shall be computed by the engine and shown above the enemy | P0 | §8.6 |
| CMB-14 | Death checks shall run after every action and every status tick, applying revives and on-death effects before declaring a winner | P0 | §8.2 |
| CMB-15 | Statuses shall never expire in the round they were applied (Hive Queen's `appliedRound` rule) | P0 | §8.2 |

## STS — Status effects

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| STS-01 | Poison, Burn, Bleed, Sticky, Corrode, Digesting, Membrane, Regen and Thorns shall stack by intensity with the decay rules in GDD §8.5 | P0 | §8.5 |
| STS-02 | Softened, Weakened, Slowed and Enraged shall be duration-based. Re-applying refreshes to the longer duration | P0 | §8.5 |
| STS-03 | Stun shall skip the target's next action and give Stun Resist (1 for normals, 2 for bosses), blocking further stuns for that many rounds | P0 | §8.5 |
| STS-04 | Haste N shall add N actions this round. Focus N shall add 10% power per stack to the next Action, then clear | P1 | §8.5 |
| STS-05 | Every status apply, tick and expiry shall produce a record with a log line and a verbose trace | P0 | §8.5 |

## PRS — Presentation

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| PRS-01 | The arena shall animate purely from engine records (it never decides outcomes), using the beat model from Hive Queen's `buildAnim` | P0 | §8.10 |
| PRS-02 | Supported beats shall include strike, projectile, tick, heal, shield, status-apply, stagger, fall, rise, morph-pulse and critical-mass | P0 / P1 | §8.10 |
| PRS-03 | (v0.2) Viewing speed shall be selectable at 1×, 2×, 4× and 8×. There is no Skip: every battle plays out | P0 | §8.7 |
| PRS-04 | Hit-stop (40–120 ms) and damage-number size shall scale with damage as a fraction of the target's max Mass. Crits shall render larger and in gold | P0 | §8.10 |
| PRS-05 | Above 6 actions in a round, beats shall batch into a combo counter instead of playing one by one | P1 | §8.10 |
| PRS-06 | The battle log shall show one line per record, with a verbose toggle that shows the trace under each line | P0 | §8.7 |
| PRS-07 | Long-pressing either combatant shall open a panel with full stats, statuses and essences | P0 | §8.7 |
| PRS-08 | (v0.2) The player shall have no input of any kind once a battle starts | P0 | §8.1 |

## EMG — Emergent play and safety valves

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| EMG-01 | (v0.2) Nested triggers shall be capped at 64 per action. A chain over the cap, on either side, is truncated with a log line and the battle continues. There are no instant wins | P0 | §8.9 |
| EMG-02 | Values shall be 64-bit floats. Display shall shorten to K/M/B/T, then scientific notation. Infinity shall display as ∞. NaN shall be sanitized to 0 and logged as a bug | P0 | §8.9 |
| EMG-03 | From round 30 (bosses 50), Salt Rain shall deal 5% of max Mass as true damage to both sides, +5% per round after, so every battle ends | P0 | §8.9 |
| EMG-04 | Overkill above 10× the enemy's max Mass shall show an OVERKILL stamp. The run shall track biggest hit, longest chain, most actions in a round, peak Mass and fastest boss kill for the Run Summary and personal records | P1 | §9.5 |
| EMG-05 | Content shall be built from the interaction grammar (triggers, effects, scalers, converters, rule-breakers), and every essence shall connect to at least two existing blocks (checked by TOOL-01 as a warning) | P1 | §9.2 |
| EMG-06 | Each of the 8 archetypes in GDD §9.3 shall have its core pieces in the 1.0 pool, and each shall reach its break point in the simulation harness at least once per 1,000 bot runs with an archetype script | P1 | §9.3 |
| EMG-07 | At least 6 build-check enemies (GDD §9.4) shall exist across the 1.0 roster, with at least one per act | P1 | §9.4 |

## ECO — Economy, relics, Morsels, events

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| ECO-01 | Gel shall be the in-run currency, reset at run end. Sources and amounts per GDD §10.1, tuned to about 200 Gel per act | P0 | §10.1 |
| ECO-02 | Relics shall have a rarity (Common / Uncommon / Rare / Boss / Shop / Event), effects implemented as hooks, and an inner-body icon | P0 | §10.3 |
| ECO-03 | A relic shall never be offered twice in one run, unless it is marked `stackable` | P0 | §10.3 |
| ECO-04 | Shops shall stock 3 essence vials (one guaranteed from an owned Family), 2 random relics plus 1 shop-only relic, and 3 Morsels, and shall offer Infuse, Expel and Restock at escalating prices per GDD §10.2 | P0 | §10.2 |
| ECO-05 | The player shall be able to hold up to 3 Morsels (species, Instincts and Salt may modify). With full slots, a new Morsel requires discarding one | P0 | §10.4 |
| ECO-06 | Map-use Morsels (Fly Lure, Royal Jelly, Apex Serum) shall be usable from the map HUD | P1 | §10.4 |
| ECO-07 | Events shall support 2–4 choices, choices gated by requirements (Family, element, Gel, Mass, essence), fixed or random outcomes, and delayed outcomes that resolve N nodes later | P0 (fixed / random) / P1 (delayed) | §10.6 |
| ECO-08 | Curses shall be slotted negative essences, removable by Molt or Expel | P1 | §10.6 |

## ENM — Enemies, elites, bosses, Remnants

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| ENM-01 | Every enemy shall define Family, element, stats per act tier, kit, pattern, essence pool (signature + 2 shared + stat + element if elemental), Gel range, art and Slimepedia text | P0 | §11.1 |
| ENM-02 | Every enemy's signature shall be in its kit and used by its pattern at least once every 4 actions, so the player sees what they could absorb | P0 | §11.1 |
| ENM-03 | Elites shall roll one Elite Modifier (two at Salt 18) from the GDD §11.3 table, shown on the map | P0 | §11.3 |
| ENM-04 | Each biome shall have 2 bosses (1 for the slice), one chosen per run, each with at least 2 phases and a documented build check | P0 / P1 | §11.4 |
| ENM-05 | The Hollow One shall have the 3 phases in GDD §11.4 (4 at Salt 20) | P1 | §11.4 |
| ENM-06 | Every run end shall save a Remnant snapshot (species, stats, essences with levels, relics, portrait, name, title, biome path, cause of end). The 20 most recent shall be kept, plus any marked as favorites | P1 | §11.5 |
| ENM-07 | Remnant stats shall be normalized to ×1.1 of the current act's expected power curve, and its real kit and Morphs shall be used | P1 | §11.5 |
| ENM-08 | Rare spawns (Life Fairy style) shall be supported, including a "flees after N rounds" behavior that ends the battle with no reward | P1 | §11.2 |
| ENM-09 | Shiny enemies shall spawn at a 1/50 rate once Iridescents are unlocked, with a visible sparkle | P1 | §6.7 |

## META — Meta progression

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| META-01 | Genes shall be awarded at every run end using the GDD §12.3 formula, with an itemized breakdown on the Run Summary | P0 | §12.3 |
| META-02 | The Gene Tree shall support the unlock tracks Species, Genomes, Biomes, Nodes and services, Instinct capacity, and QoL. Purchases are permanent and take effect on the next run | P0 (≥5 unlocks) / P1 | §12.4 |
| META-03 | Genome unlocks shall add their essences, relics and events to the drop pools. Content that isn't unlocked shall never appear in a run | P1 | §12.4 |
| META-04 | (v0.2) The Gene Tree shall offer ranked permanent upgrades (stats, healing, Gel, slots, absorb options, Heirloom start, species) with rising costs, forming the main progression | P0 | §12 |
| META-05 | At every run end the player shall be able to bank one essence into the Gene Bank (6 shelves, replace when full) | P1 | §12.6 |
| META-06 | The Slimepedia shall record enemies, essences, relics, events and Forms on discovery, showing undiscovered Forms as silhouettes | P1 | §12.7 |
| META-07 | Each essence shall track 3-step Mastery (absorbed in 3 runs / fused to III / won holding it at III) with the rewards in GDD §12.7 | P1 | §12.7 |
| META-08 | Feats shall be evaluated from run telemetry and unlock their listed content (GDD §12.8). At least 8 shall exist at 1.0 | P1 | §12.8 |
| META-09 | The Hall of Slimes shall list every past champion's portrait, build and outcome, plus personal records. Nothing shall be sent online | P1 | §12.6 |
| META-10 | (v0.2) A fresh profile shall be nearly unable to win: in the harness, the bot's first win shall come after at least 20 runs, and every bot career shall win within 150 runs | P0 | §12.1 |

## DIF — Difficulty

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| DIF-01 | Salt levels 1–20 shall apply cumulatively, as data-driven rules, per GDD §13.1. The slice ships Salt 1–5 | P0 / P1 | §13.1 |
| DIF-02 | Clearing Salt N with a species shall unlock Salt N+1 for that species | P0 | §13.1 |
| DIF-03 | Deep Salt (21+) shall be uncapped: each level adds compounding +6% enemy Mass and FIRM and one Brine Mutator, previewed before the run with one reroll per level | P1 | §13.2 |
| DIF-04 | Endless Depths shall loop random biomes with ×1.6 compounding enemy stats per loop, +1 Brine Mutator, better offers, and +1 slot per loop up to 8 | P1 | §13.3 |
| DIF-05 | The active Salt level and every active rule shall be viewable from the map HUD | P0 | §13 |

## UX — Screens and accessibility

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| UX-01 | Every screen listed in GDD §14 shall exist (the slice may stub Slimepedia, Hall and Gene Tree) | P0 / P1 | §14 |
| UX-02 | The layout shall be portrait-first, with tap targets of at least 48 dp and primary actions in the bottom third. It shall also be usable on desktop with a mouse | P0 | §14 |
| UX-03 | Every essence, relic, status, Morsel and node shall have a long-press or hover tooltip with exact current numbers, including VISC scaling | P0 | §14 |
| UX-04 | Slime inspect shall be reachable from the map, the absorb screen, the shop and between battle rounds | P0 | §14 |
| UX-05 | Elements shall be distinguishable by shape as well as color | P0 | §14 |
| UX-06 | Settings shall include default battle speed, skip animations, reduced motion (no shake or flashes), haptics, audio levels and text size up to 130% | P0 (speed, reduced motion) / P1 | §14 |
| UX-07 | All player-facing strings shall be externalized for later localization | P2 | — |

## AUD — Audio

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| AUD-01 | Slime sounds shall be pitch-shifted by Mass | P1 | §15 |
| AUD-02 | Absorb, fusion, evolution, crit and Critical Mass shall each have distinct audio stingers | P1 | §15 |
| AUD-03 | Each biome shall have a music track with an intensity layer for elites and bosses | P1 | §15 |

## TECH — Platform, saves, determinism, performance

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| TECH-01 | The game shall build as a web app and as an Android app (Capacitor), sharing one codebase | P0 (web) / P1 (Android) | §16.1 |
| TECH-02 | `engine/` shall have no imports from `render/` or `ui/`, enforced by a lint rule or test | P0 | §16.2 |
| TECH-03 | Every random draw shall come from a named stream seeded by `hash(runSeed, stream, nodeIndex)`. Reloading a save shall not change any outcome already determined | P0 | §16.6 |
| TECH-04 | The player shall be able to enter or copy a run seed. The same seed and the same choices shall reproduce the same run | P1 | §16.6 |
| TECH-05 | Autosave shall happen at every node transition, after every absorb, and at battle start. Mid-battle resume shall re-simulate from the start state plus the input log | P0 | §16.6 |
| TECH-06 | Saves shall be versioned with forward migrations. A corrupt save shall fall back to the previous good copy (two rotating slots) | P0 | §16.6 |
| TECH-07 | The game shall work fully offline and make no network calls apart from optional store and OS services | P0 | §1.6 |
| TECH-08 | Battle scenes shall hold 60 fps on a 2021 mid-range Android device, with at most 300 particles, under 300 MB of memory and a cold start under 4 s | P1 | §16.8 |
| TECH-09 | A full battle shall simulate headless in under 5 ms (median, Act 3 enemy) | P0 | §16.8 |

## TOOL — Validation, simulation, tests

| ID | Requirement | Pri | GDD |
|---|---|---|---|
| TOOL-01 | `validateContent()` shall run at startup and in tests, failing on the errors listed in GDD §16.5 | P0 | §16.5 |
| TOOL-02 | A headless simulation CLI shall run N runs per species, Salt level and bot policy, and report the metrics listed in GDD §16.7 | P0 (v1: win rate, death floor, pick rate) / P1 | §16.7 |
| TOOL-03 | A Battle Lab dev screen shall let you build any slime (essences, levels, relics, stats) and fight any enemy with full traces | P0 | §16.7 |
| TOOL-04 | Unit tests (`node:test`) shall cover the resolver, every status, fusion thresholds, offer guarantees and weights, map constraints (property test over 10,000 seeds), safety valves, save round-trips and determinism | P0 | §16.9 |
| TOOL-05 | Dev builds shall support hot-reloading content | P1 | §16.5 |

## CNT — Content targets

| Content | Vertical slice (M1) | Alpha (M2) | 1.0 (M3) |
|---|---|---|---|
| Biomes | 1 (Forest) | 3 + Finale | 6 + Finale |
| Species | 1 | 4 | 7 |
| Normal enemies | 9 | ~27 | ~54 |
| Elites | 3 | 9 | 18 |
| Bosses | 1 | 4 + Hollow One | 12 + Hollow One |
| Essences | ~45 | ~120 | ~200 |
| Morphs with 3 tiers | ~15 | ~35 | ~60 |
| Relics | 25 | 60 | 100 |
| Morsels | 10 | 14 | 20 |
| Events | 12 | 30 | 50 |
| Families with Resonance | 6 | 9 | 11 |
| Salt levels | 1–5 | 1–10 | 1–20 + Deep Salt |
| Feats | — | 4 | 8+ |

