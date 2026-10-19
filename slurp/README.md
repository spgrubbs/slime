# Slurp — first playable draft

A slime roguelike: beat a creature, absorb a piece of it, fuse three copies into
something stronger, and climb a branching map. Design:
[`docs/roguelike/GAME_DESIGN.md`](../docs/roguelike/GAME_DESIGN.md).

This folder is a self-contained app (React 18 + Vite). It shares nothing with the
Hive Queen app at the repo root, so it can move to its own repo as is.

```bash
cd slurp
npm install
npm run dev      # play at http://localhost:5173
npm test         # engine tests (node:test)
npm run sim      # balance harness: bot careers with meta progression
npm run build    # static build in dist/
npm run build:single  # one self-contained dist/slurp.html (for single-page hosts)
```

## What's in the draft

- **Runs:** 3 acts (Verdant Forest, Ember Depths, Stormspire Summit) plus the Finale
  against the Hollow One. Slay the Spire–style maps with Fight, Elite, Boss, Event,
  Mystery, Shop, Pool and Treasure nodes.
- **Absorption:** after every win, pick 1 of 3–4 essences from the enemy you beat. 3
  copies fuse to II, 6 to III (renamed and stronger). Each fusion offers 3 **Mutations**
  for that essence. There's no slot limit, but every essence past capacity adds **Bloat**
  (−7% to every stat).
- **Tags and families:** every essence carries family, element, damage-type and role
  tags, and species have their own. Flavor Memory (an early upgrade) biases offers toward
  your tags, and some essences scale per tag. 9 families give Resonance bonuses at 2, 4
  and 6.
- **Combat:** 1v1, turn-based, **fully deterministic**. There is no input and no dice.
  Crit and dodge fill meters (25% crit = every 4th hit). Tempo gives extra actions from
  the speed ratio, statuses stack, Salt Rain ends stalemates, and runaway chains are cut
  off at 64 triggers while the fight plays out. The UI replays the resolved fight at
  1–8× speed.
- **Meta:** Genes from every run buy permanent Gene Tree upgrades (stats, healing,
  Gel, slots, extra options, an Heirloom start, and three extra species). A fresh slime
  is meant to lose.
- **Difficulty:** Salt levels unlock per species after a win (10 defined, then
  uncapped Deep Salt).
- **Content:** 64 essences with 86 hand-made Mutations plus 6 generic ones, 36 enemies (including elites and bosses), 17 relics, 8 events and 4 species.
- **Saves:** the profile and the current run live in `localStorage`. The same seed and
  the same choices always replay the same run.

**Not in the draft yet:** real art (everything is placeholder emoji and SVG), Remnants,
Hatchery nodes, hybrid elements, Iridescents, Feats, Endless, audio, and the Android
wrapper.

## Layout

```
src/engine/          pure game logic, no DOM — run it in Node
  battle.js          deterministic 1v1 resolver; emits records the UI replays
  combatant.js       slime/enemy + essences + resonance + relics → battle shape
  map.js             act map generator
  run.js             run state machine (every action returns a new run)
  meta.js            Brood Pool profile, Genes, upgrades, Hall of Slimes
  content/           essences, enemies/acts, families, relics, events, species, salt, upgrades
src/ui/              React screens; Slime.jsx is the placeholder body to replace with art
tools/sim.js         balance harness
```

Art hooks: `src/ui/Slime.jsx` (body color from element, size from Mass, one Morph per
essence socket, relics inside) and `EnemyBody` (currently an emoji). Each essence's
`socket` and `icon` in `content/essences.js` say where its Morph goes.

## Deploying (Vercel)

This is a static Vite site. In Vercel, import the repo and set **Root Directory** to
`slurp`; the Vite preset (build `npm run build`, output `dist`) is detected
automatically. A new repo isn't required for that. If you'd rather have one, copy this
folder into a fresh repo and leave Root Directory empty.
