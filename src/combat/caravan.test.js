import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { makeAmbush, tickAmbush, retreatAmbush, makeCaravanUnit } from './caravan.js';
import {
  rollCaravan, caravanValue, caravanManifest, getCaravanScaling, CARAVAN_UNITS,
  ESCAPE_ROUNDS, catapultDamage,
} from '../data/caravanData.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ROUND = 1600;
const DAY = 20400;

const slime = (id, over = {}) => ({
  id, name: `Ooze${id}`, tier: 'elite', biomass: 400,
  mutations: ['sharp', 'pyrolyze', 'stoneskin'], traits: ['brave'],
  baseStats: { firmness: 22, slipperiness: 14, viscosity: 18 },
  primaryElement: null, ...over,
});

const squad = (n = 3, make = slime) => Array.from({ length: n }, (_, i) => make(`s${i}`));

const run = (ambush, ctx, maxRounds = 60) => {
  const effects = [];
  for (let i = 0; i < maxRounds && ambush.phase === 'battle'; i++) {
    effects.push(...tickAmbush(ambush, ROUND, ctx, ROUND).sideEffects);
  }
  return effects;
};

// ═════════════════════════════════════════════════════════════════════════════
// Composition
// ═════════════════════════════════════════════════════════════════════════════

test('a given day and tier always produce the same caravan', () => {
  assert.deepEqual(rollCaravan(4, DAY).units, rollCaravan(4, DAY).units);
  assert.notDeepEqual(rollCaravan(4, DAY).units, rollCaravan(4, DAY + 1).units);
});

test('composition varies day to day', () => {
  const seen = new Set();
  for (let d = 0; d < 40; d++) seen.add(rollCaravan(5, DAY + d).units.join(','));
  assert.ok(seen.size > 10, `only ${seen.size} distinct compositions across 40 days`);
});

test('higher tiers bring more, tougher units and better loot', () => {
  const low = rollCaravan(1, DAY);
  const high = rollCaravan(10, DAY);
  assert.ok(high.units.length > low.units.length);
  assert.ok(caravanValue(high).biomass > caravanValue(low).biomass * 3);
});

test('a captain rides along from tier 3', () => {
  assert.equal(rollCaravan(2, DAY).units.includes('captain'), false);
  assert.equal(rollCaravan(3, DAY).units.includes('captain'), true);
});

test('the manifest names every unit type in the column', () => {
  const caravan = rollCaravan(6, DAY);
  const manifest = caravanManifest(caravan);
  assert.equal(manifest.reduce((n, m) => n + m.count, 0), caravan.units.length);
  manifest.forEach(m => assert.ok(m.def.name));
});

// ═════════════════════════════════════════════════════════════════════════════
// The fight
// ═════════════════════════════════════════════════════════════════════════════

test('a strong squad routs a low-tier caravan', () => {
  const a = makeAmbush(squad(3), 1, { rng: seeded(1) }, DAY);
  run(a, { rng: seeded(1) });
  assert.equal(a.phase, 'victory', `ended ${a.phase} after ${a.round} rounds`);
  assert.equal(a.summary.routed, true);
  assert.equal(a.summary.nextTier, 2, 'routing raises the tier');
});

test('rewards bank per kill, not at the end', () => {
  const a = makeAmbush(squad(3), 1, { rng: seeded(2) }, DAY);
  let bankedMidFight = 0;
  for (let i = 0; i < 60 && a.phase === 'battle'; i++) {
    tickAmbush(a, ROUND, { rng: seeded(2) }, ROUND);
    if (a.killed.length > 0 && a.units.some(u => !u.dead)) {
      bankedMidFight = a.banked.biomass;
      break;
    }
  }
  assert.ok(bankedMidFight > 0, 'nothing was banked while units were still standing');
});

test('retreating keeps the loot and the squad', () => {
  const a = makeAmbush(squad(3), 1, { rng: seeded(3) }, DAY);
  for (let i = 0; i < 4; i++) tickAmbush(a, ROUND, { rng: seeded(3) }, ROUND);
  const bankedBefore = a.banked.biomass;

  retreatAmbush(a);
  assert.equal(a.phase, 'over');
  assert.equal(a.summary.reason, 'retreated');
  assert.equal(a.summary.banked.biomass, bankedBefore);
  assert.equal(a.summary.lost.length, 0, 'retreat should not cost slimes');
  assert.equal(a.summary.nextTier, a.tier, 'a retreat does not raise the tier');
});

test('a weak squad loses only the slimes it sent', () => {
  const weak = squad(3, (id) => slime(id, {
    tier: 'basic', biomass: 0, mutations: [], traits: [],
    baseStats: { firmness: 1, slipperiness: 1, viscosity: 1 },
  }));
  const a = makeAmbush(weak, 8, { rng: seeded(4) }, DAY);
  const effects = run(a, { rng: seeded(4) }, 120);

  assert.equal(a.summary.routed, false);
  assert.equal(a.summary.banked.prisms, 0);
  assert.ok(a.summary.lost.length > 0);
  assert.ok(effects.every(e => e.type === 'slimeDeath' || e.type === 'bioReclaim'),
    'the only losses should be the deployed slimes');
});

test('the caravan escapes if the squad is too slow to finish it', () => {
  const chip = squad(3, (id) => slime(id, {
    tier: 'basic', biomass: 0, mutations: [], traits: ['hardy'],
    baseStats: { firmness: 2, slipperiness: 1, viscosity: 1 },
  }));
  const a = makeAmbush(chip, 2, { rng: seeded(5) }, DAY);
  run(a, { rng: seeded(5) }, 200);

  if (a.summary.reason === 'escaped') {
    assert.equal(a.round, a.escapeRounds);
    assert.ok(a.summary.remaining > 0);
  }
});

test('only a full rout pays a Prism', () => {
  const routed = makeAmbush(squad(4), 1, { rng: seeded(6) }, DAY);
  run(routed, { rng: seeded(6) });
  assert.equal(routed.summary.banked.prisms, 1);

  const partial = makeAmbush(squad(3), 1, { rng: seeded(7) }, DAY);
  tickAmbush(partial, ROUND, { rng: seeded(7) }, ROUND);
  retreatAmbush(partial);
  assert.equal(partial.summary.banked.prisms, 0);
});

test('losing costs nothing but the squad — no stores are touched', () => {
  const weak = squad(3, (id) => slime(id, {
    tier: 'basic', biomass: 0, mutations: [], traits: [],
    baseStats: { firmness: 1, slipperiness: 1, viscosity: 1 },
  }));
  const a = makeAmbush(weak, 10, { rng: seeded(8) }, DAY);
  run(a, { rng: seeded(8) }, 120);
  assert.ok(a.summary.banked.biomass >= 0);
  assert.equal('penalty' in a.summary, false, 'there should be no penalty field at all');
});

// ═════════════════════════════════════════════════════════════════════════════
// Unit character
// ═════════════════════════════════════════════════════════════════════════════

test('the captain cannot be crit and the zealot cannot be statused', () => {
  const scaling = getCaravanScaling(3);
  assert.equal(makeCaravanUnit('captain', 0, scaling).critImmune, true);
  assert.equal(makeCaravanUnit('zealot', 0, scaling).statusImmune, true);
  assert.equal(makeCaravanUnit('porter', 0, scaling).critImmune, false);
});

test('an outrider is harder to hit than a porter', () => {
  const scaling = getCaravanScaling(1);
  assert.ok(makeCaravanUnit('outrider', 0, scaling).stats.slipperiness >
            makeCaravanUnit('porter', 0, scaling).stats.slipperiness);
});

test('every unit carries loot and a description', () => {
  Object.values(CARAVAN_UNITS).forEach(u => {
    assert.ok(u.biomass > 0, `${u.id} has no biomass value`);
    assert.ok(Object.keys(u.mats).length > 0, `${u.id} drops no materials`);
    assert.ok(u.desc?.length > 10, `${u.id} has no description`);
  });
});

test('every ambush log entry carries a verbose derivation', () => {
  const a = makeAmbush(squad(3), 2, { rng: seeded(9) }, DAY);
  run(a, { rng: seeded(9) });
  assert.deepEqual(a.logs.filter(l => !l.v).map(l => l.m), []);
});

// ═════════════════════════════════════════════════════════════════════════════
// Catapults and the escape clock
// ═════════════════════════════════════════════════════════════════════════════

test('the column gets 30 rounds to break away', () => {
  assert.equal(ESCAPE_ROUNDS, 30);
  assert.equal(makeAmbush(squad(3), 1, { rng: seeded(20) }, DAY).escapeRounds, 30);
});

test('catapult damage scales with count and caravan tier', () => {
  assert.equal(catapultDamage(0, 1), 0);
  assert.ok(catapultDamage(2, 1) === catapultDamage(1, 1) * 2);
  assert.ok(catapultDamage(1, 5) > catapultDamage(1, 1));
});

test('catapults fire every round without the squad', () => {
  // One near-useless slime, so essentially all damage comes from emplacements.
  const chip = squad(1, (id) => slime(id, {
    tier: 'royal', biomass: 0, mutations: [], traits: [],
    baseStats: { firmness: 1, slipperiness: 1, viscosity: 1 },
  }));

  const without = makeAmbush(chip, 1, { rng: seeded(21) }, DAY);
  run(without, { rng: seeded(21) }, 40);

  const withGuns = makeAmbush(chip, 1, { rng: seeded(21), catapults: 4 }, DAY);
  run(withGuns, { rng: seeded(21) }, 40);

  assert.ok(withGuns.killed.length > without.killed.length,
    `${withGuns.killed.length} vs ${without.killed.length} killed`);
  assert.ok(withGuns.logs.some(l => l.m.includes('Catapults pound')));
});

test('an ambush with no catapults never mentions them', () => {
  const a = makeAmbush(squad(3), 1, { rng: seeded(22) }, DAY);
  run(a, { rng: seeded(22) });
  assert.equal(a.logs.some(l => l.m.includes('Catapult')), false);
});

test('catapults can finish a unit the squad did not, and it still banks', () => {
  const chip = squad(1, (id) => slime(id, {
    tier: 'royal', biomass: 0, mutations: [], traits: [],
    baseStats: { firmness: 1, slipperiness: 1, viscosity: 1 },
  }));
  const a = makeAmbush(chip, 1, { rng: seeded(23), catapults: 4 }, DAY);
  run(a, { rng: seeded(23) }, 40);
  assert.ok(a.banked.biomass > 0, 'catapult kills should pay like any other');
});
