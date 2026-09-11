import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { makeSlimeCombatant, makeEnemyCombatant, resolveRound } from './resolveRound.js';
import { makeExpedition, tickExpedition } from './expedition.js';
import {
  WARDENS, WARDEN_TYPES, ZONE_ORDER, wardenTypeId, wardenMonster,
  prerequisiteZone, ALL_SEALS, ALL_HEARTS, WARDEN_PLUS_HP, WARDEN_PLUS_DMG,
} from '../data/wardenData.js';
import {
  BUILDINGS, TENDRILS, tendrilFor, nextLevelCost, tendrilBonuses,
  zoneReached, wardenUnlocked,
} from '../data/buildingData.js';
import { ZONES } from '../data/zoneData.js';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { ROUND_MS } from '../data/gameConstants.js';

// A seeded PRNG: a constant rng cannot both fail an evasion roll and pass a proc.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const TIER_FOR_ZONE = ['basic', 'enhanced', 'elite', 'royal'];
const tierOf = (zone) =>
  TIER_FOR_ZONE[Math.min(3, Math.ceil(ZONES[zone].tier / 1.6) - 1)];

const slimeAt = (tier, stat) => ({
  id: 's' + Math.random(), name: 'S', tier, mutations: [], traits: [], biomass: 0,
  baseStats: { firmness: stat, slipperiness: stat, viscosity: stat }, elements: {},
});

/** Win rate of four slimes at `stat` against a warden, over `trials` seeds. */
function wardenWinRate(zone, stat, plus, trials = 120) {
  let wins = 0;
  for (let t = 0; t < trials; t++) {
    const rng = mulberry32(t * 7919 + 3);
    const world = {
      slimes: [0, 1, 2, 3].map(() => makeSlimeCombatant(slimeAt(tierOf(zone), stat))),
      enemy: makeEnemyCombatant(wardenTypeId(zone, plus)),
      round: 0,
    };
    for (let r = 0; r < 200; r++) {
      if (world.enemy.dead || world.slimes.every(s => s.dead)) break;
      resolveRound(world, { rng });
    }
    if (world.enemy.dead) wins++;
  }
  return wins / trials;
}

// ── Shape ────────────────────────────────────────────────────────────────────

test('every zone has a warden, and every warden a zone', () => {
  assert.deepEqual(Object.keys(WARDENS).sort(), Object.keys(ZONES).sort());
  assert.deepEqual(ZONE_ORDER.slice().sort(), Object.keys(ZONES).sort());
});

test('the resolver can build both states of every warden', () => {
  for (const zone of ZONE_ORDER) {
    for (const plus of [false, true]) {
      const c = makeEnemyCombatant(wardenTypeId(zone, plus));
      assert.ok(c, `${zone} plus=${plus} built`);
      assert.equal(c.isWarden, true);
      assert.equal(c.isBoss, true);
      assert.ok(c.maxHp > 0 && c.stats.firmness > 0);
    }
  }
});

test('warden ids do not collide with monster ids', () => {
  for (const id of Object.keys(WARDEN_TYPES)) {
    assert.equal(MONSTER_TYPES[id], undefined, `${id} shadows a monster`);
  }
});

test('wardens never appear in a zone spawn table', () => {
  for (const z of Object.values(ZONES)) {
    for (const m of z.monsters) assert.ok(!WARDEN_TYPES[m], `${m} is huntable at random`);
  }
});

test('a warden drops only its seal, and a warden+ only its heart', () => {
  for (const zone of ZONE_ORDER) {
    const w = WARDENS[zone];
    assert.deepEqual(wardenMonster(zone, false).mats, [w.seal]);
    assert.deepEqual(wardenMonster(zone, true).mats, [w.heart]);
  }
  assert.equal(new Set(ALL_SEALS).size, ALL_SEALS.length, 'seals are unique');
  assert.equal(new Set(ALL_HEARTS).size, ALL_HEARTS.length, 'hearts are unique');
});

test('wardens carry no mutagen — their drop is the reward', () => {
  for (const zone of ZONE_ORDER) {
    assert.equal(wardenMonster(zone, false).mutation, null);
    assert.equal(wardenMonster(zone, true).mutation, null);
  }
});

test('a warden+ is bigger but never acts more often', () => {
  for (const zone of ZONE_ORDER) {
    const base = wardenMonster(zone, false);
    const plus = wardenMonster(zone, true);
    assert.equal(plus.hp, Math.round(base.hp * WARDEN_PLUS_HP));
    assert.equal(plus.dmg, Math.round(base.dmg * WARDEN_PLUS_DMG));
    // An extra action put every Warden+ at a 0% win rate; actions are the
    // dominant difficulty dial and must not scale with the plus state.
    assert.equal(plus.actions, base.actions);
  }
});

// ── The progression spine ────────────────────────────────────────────────────

test('each tendril level 1 costs the previous zone\'s seal', () => {
  for (const zone of ZONE_ORDER) {
    const prev = prerequisiteZone(zone);
    const cost = nextLevelCost(tendrilFor(zone), 0);
    if (!prev) {
      assert.deepEqual(cost.mats, {}, 'the first zone is never gated');
      continue;
    }
    assert.equal(cost.mats[WARDENS[prev].seal], 1,
      `${zone} should need the ${prev} seal`);
  }
});

test('each tendril level 3 costs that zone\'s own heart', () => {
  for (const zone of ZONE_ORDER) {
    const cost = nextLevelCost(tendrilFor(zone), 2);
    assert.equal(cost.mats[WARDENS[zone].heart], 1);
  }
});

test('a tendril gates its zone, then its warden', () => {
  for (const zone of ZONE_ORDER) {
    const id = tendrilFor(zone);
    assert.equal(zoneReached(zone, {}), false);
    assert.equal(zoneReached(zone, { [id]: 1 }), true);
    assert.equal(wardenUnlocked(zone, { [id]: 1 }), false);
    assert.equal(wardenUnlocked(zone, { [id]: 2 }), true);
  }
});

test('every tendril has exactly three levels and a rooted passive', () => {
  assert.equal(TENDRILS.length, ZONE_ORDER.length);
  for (const t of TENDRILS) {
    assert.equal(t.max, 3);
    assert.equal(t.levels.length, 3);
    assert.ok(t.levels[2].passive, `${t.id} level 3 grants nothing`);
    assert.equal(t.levels[0].passive, undefined, 'reaching a zone is not a buff');
  }
});

test('rooted tendrils stack into one bonus object', () => {
  const all = Object.fromEntries(TENDRILS.map(t => [t.id, 3]));
  const bon = tendrilBonuses(all);
  assert.ok(Object.keys(bon).length >= 6);
  for (const v of Object.values(bon)) assert.ok(v > 0);
  // Half-grown tendrils pay nothing.
  assert.deepEqual(tendrilBonuses(Object.fromEntries(TENDRILS.map(t => [t.id, 2]))), {});
});

test('every material a tendril asks for is actually obtainable in its zone', () => {
  for (const t of TENDRILS) {
    const dropped = new Set();
    for (const m of ZONES[t.zone].monsters) {
      (MONSTER_TYPES[m].mats || []).forEach(x => dropped.add(x));
    }
    const seals = new Set([...ALL_SEALS, ...ALL_HEARTS]);
    // Level 2 is the "grind this zone" gate, so every material must drop here.
    for (const mat of Object.keys(t.levels[1].cost.mats || {})) {
      assert.ok(dropped.has(mat), `${t.id} wants ${mat}, which ${t.zone} never drops`);
    }
    // Levels 1 and 3 are paid in warden drops, which no monster carries.
    for (const lvl of [0, 2]) {
      for (const mat of Object.keys(t.levels[lvl].cost.mats || {})) {
        assert.ok(seals.has(mat), `${t.id} level ${lvl + 1} wants non-warden ${mat}`);
      }
    }
  }
});

test('every tendril is a known building and every zone has one', () => {
  for (const zone of ZONE_ORDER) {
    assert.ok(BUILDINGS[tendrilFor(zone)], `${zone} has no tendril building`);
  }
});

// ── Difficulty ───────────────────────────────────────────────────────────────

test('a warden cannot be beaten by the party that clears the zone', () => {
  // recommendedStats is calibrated to clear a zone's COMMON monsters. If that
  // same party could also take the warden, the boss would not be a reason to
  // optimise anything.
  for (const zone of ZONE_ORDER) {
    const rate = wardenWinRate(zone, ZONES[zone].recommendedStats, false, 60);
    assert.ok(rate <= 0.1, `${zone} warden falls to a stock party (${rate})`);
  }
});

test('a warden falls to a party at twice the zone\'s recommended stats', () => {
  for (const zone of ZONE_ORDER) {
    const rate = wardenWinRate(zone, ZONES[zone].recommendedStats * 2, false, 60);
    assert.ok(rate >= 0.9, `${zone} warden still unbeatable at 2x (${rate})`);
  }
});

test('a warden+ needs far more than the party that beat the warden', () => {
  for (const zone of ZONE_ORDER) {
    const at2x = wardenWinRate(zone, ZONES[zone].recommendedStats * 2, true, 60);
    const at4x = wardenWinRate(zone, ZONES[zone].recommendedStats * 4, true, 60);
    assert.ok(at2x <= 0.1, `${zone} warden+ is not a later fight (${at2x} at 2x)`);
    assert.ok(at4x >= 0.9, `${zone} warden+ never becomes beatable (${at4x} at 4x)`);
  }
});

test('a warden fight is meaningfully longer than a common encounter', () => {
  const rng = mulberry32(99);
  const zone = 'caves';
  const stat = ZONES[zone].recommendedStats * 2;
  const rounds = (enemyType) => {
    const world = {
      slimes: [0, 1, 2, 3].map(() => makeSlimeCombatant(slimeAt(tierOf(zone), stat))),
      enemy: makeEnemyCombatant(enemyType), round: 0,
    };
    for (let r = 0; r < 200; r++) {
      if (world.enemy.dead || world.slimes.every(s => s.dead)) break;
      resolveRound(world, { rng });
    }
    return world.round;
  };
  assert.ok(rounds(wardenTypeId(zone, false)) > rounds(ZONES[zone].monsters[0]));
});

// ── The hunt ─────────────────────────────────────────────────────────────────

const party = (zone, stat, n = 4) =>
  Array.from({ length: n }, () => slimeAt(tierOf(zone), stat));

test('a warden hunt starts on the warden, not a random monster', () => {
  const exp = makeExpedition('forest', party('forest', 20), 1,
    { rng: mulberry32(1), warden: { zone: 'forest', plus: false } });
  assert.equal(exp.enemy.isWarden, true);
  assert.equal(exp.enemy.type, wardenTypeId('forest', false));
  assert.equal(exp.phase, 'battling', 'no travel phase before a summoned boss');
  assert.deepEqual(exp.warden, { zone: 'forest', plus: false });
});

test('an ordinary expedition never spawns a warden', () => {
  for (let seed = 0; seed < 60; seed++) {
    const exp = makeExpedition('forest', party('forest', 10), Infinity, { rng: mulberry32(seed) });
    assert.ok(!exp.enemy?.isWarden, `seed ${seed} ambushed the party with a boss`);
  }
});

test('felling a warden reports it and ends the hunt', () => {
  const exp = makeExpedition('forest', party('forest', 40), 1,
    { rng: mulberry32(7), warden: { zone: 'forest', plus: false } });

  let felled = null;
  let completed = false;
  for (let i = 0; i < 200 && !completed; i++) {
    const { sideEffects } = tickExpedition(exp, ROUND_MS, { rng: mulberry32(i + 1) }, 'forest');
    for (const se of sideEffects) {
      if (se.type === 'wardenDown') felled = se;
      if (se.type === 'expComplete') completed = true;
    }
    if (exp.phase === 'defeat') break;
  }
  assert.ok(felled, 'no wardenDown side effect');
  assert.deepEqual(felled, { type: 'wardenDown', zone: 'forest', plus: false });
  assert.ok(completed, 'the hunt did not end on the kill');
  assert.equal(exp.kills, 1, 'a hunt is exactly one fight');
});

test('a warden hunt survives a save round trip', async () => {
  const { dehydrateExpedition, hydrateExpedition } = await import('./expedition.js');
  const roster = party('forest', 20);
  const exp = makeExpedition('forest', roster, 1,
    { rng: mulberry32(3), warden: { zone: 'forest', plus: true } });
  const saved = JSON.parse(JSON.stringify(dehydrateExpedition(exp)));
  const back = hydrateExpedition(saved, roster);
  assert.deepEqual(back.warden, { zone: 'forest', plus: true });
  assert.equal(back.enemy.isWarden, true);
});
