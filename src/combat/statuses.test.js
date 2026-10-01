import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { makeSlimeCombatant, makeEnemyCombatant, resolveRound, resolveKill } from './resolveRound.js';
import { collectHooks, affinityMult, AFFINITY_SCALE } from './hooks.js';
import { computeStats } from './stats.js';
import { isSeared, corrosion, isBleeding } from './statuses.js';
import { STATUS_EFFECTS } from '../data/traitData.js';

// A seeded PRNG: a constant rng cannot both fail an evasion roll and pass a proc.
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const slime = (over = {}) => ({
  id: 's' + Math.random(), name: 'S', tier: 'enhanced', mutations: [], traits: [], biomass: 0,
  baseStats: { firmness: 12, slipperiness: 0, viscosity: 10 }, elements: {}, ...over,
});

// ── Each damage-over-time does its own thing ─────────────────────────────────

test('the three DoTs are no longer interchangeable', () => {
  // The complaint this answers: poison, burn and bleed were the same status
  // with different numbers. Each now carries exactly one distinct rule.
  const rules = ['dmgTakenMult', 'noHeal', 'maxStacks'];
  const owner = (rule) => ['poison', 'burn', 'bleed'].filter(k => STATUS_EFFECTS[k][rule]);
  assert.deepEqual(owner('dmgTakenMult'), ['poison']);
  assert.deepEqual(owner('noHeal'), ['burn']);
  assert.deepEqual(owner('maxStacks'), ['bleed']);
  for (const k of ['poison', 'burn', 'bleed']) {
    assert.ok(STATUS_EFFECTS[k].desc, `${k} does not say what it does`);
    assert.equal(rules.filter(r => STATUS_EFFECTS[k][r]).length, 1, `${k} has more than one rule`);
  }
});

/** Average damage one slime deals to a monster over many single swings. */
function avgHit(statusOnTarget) {
  let total = 0;
  const N = 300;
  for (let i = 0; i < N; i++) {
    const s = makeSlimeCombatant(slime());
    const e = makeEnemyCombatant('youngWolf');
    e.hp = e.maxHp = 99999;
    e.actions = 0;                                   // it never swings back
    if (statusOnTarget) e.status = [{ type: statusOnTarget, dur: 9, harmful: true, appliedRound: 0 }];
    const world = { slimes: [s], enemy: e, round: 0 };
    resolveRound(world, { rng: mulberry32(i + 1) });
    // Strip the DoT tick itself so only the hit is measured.
    const tick = statusOnTarget ? STATUS_EFFECTS[statusOnTarget].dmg : 0;
    total += (99999 - e.hp) - tick;
  }
  return total / N;
}

test('poison corrodes: a poisoned target takes more from every hit', () => {
  const clean = avgHit(null);
  const poisoned = avgHit('poison');
  assert.ok(poisoned > clean * 1.15, `poisoned ${poisoned.toFixed(1)} vs clean ${clean.toFixed(1)}`);
  assert.equal(corrosion({ status: [{ type: 'poison' }] }), STATUS_EFFECTS.poison.dmgTakenMult);
  assert.equal(corrosion({ status: [{ type: 'burn' }] }), 1, 'burn does not corrode');
});

test('burn sears: a burning slime cannot heal at round start', () => {
  const s = makeSlimeCombatant(slime({ mutations: ['regenerate'] }));
  const e = makeEnemyCombatant('youngWolf');
  e.actions = 0;
  s.hp = Math.floor(s.maxHp / 2);
  const before = s.hp;
  s.status = [{ type: 'burn', dur: 9, harmful: true, appliedRound: 0 }];
  const { records } = resolveRound({ slimes: [s], enemy: e, round: 0 }, { rng: mulberry32(3) });
  assert.ok(s.hp < before, 'burn ticked and nothing mended it');
  assert.ok(records.some(r => /seared/i.test(r.log?.m || '')), 'the block is visible in the log');
});

test('burn stops a regenerating monster, and poison no longer does', () => {
  // boulderTroll heals; the answer is burn, not "any damage over time".
  assert.equal(isSeared({ status: [{ type: 'burn' }] }), true);
  assert.equal(isSeared({ status: [{ type: 'poison' }] }), false);
  assert.equal(isSeared({ status: [{ type: 'bleed' }] }), false);
});

test('bleed stacks instead of refreshing, and ticks harder for it', () => {
  // Apply bleed repeatedly via the resolver's own path: Spiny at a guaranteed proc.
  const s = makeSlimeCombatant(slime({ mutations: ['spiny'], baseStats: { firmness: 12, slipperiness: 0, viscosity: 400 } }));
  const e = makeEnemyCombatant('youngWolf');
  e.hp = e.maxHp = 99999; e.actions = 0;
  const world = { slimes: [s], enemy: e, round: 0 };
  for (let r = 0; r < 6; r++) resolveRound(world, { rng: mulberry32(r + 11) });
  const bleed = e.status.find(st => st.type === 'bleed');
  assert.ok(bleed, 'bleed landed');
  assert.ok(bleed.stacks > 1, `bleed deepened to ${bleed.stacks} stacks`);
  assert.ok(bleed.stacks <= STATUS_EFFECTS.bleed.maxStacks, 'and respects its cap');
  assert.equal(isBleeding(e), true);
});

// ── Affinity feeds the elemental mutations ───────────────────────────────────

test('an elemental mutation scales with its own element only', () => {
  const def = { affinity: 'fire' };
  assert.equal(affinityMult(def, { elements: {} }), 1);
  assert.equal(affinityMult(def, { elements: { fire: 100 } }), 1 + AFFINITY_SCALE);
  assert.equal(affinityMult(def, { elements: { water: 100 } }), 1, 'the wrong element does nothing');
  assert.equal(affinityMult({}, { elements: { fire: 100 } }), 1, 'untagged mutations never scale');
});

test("Pyrolyze's burn chance is higher in a fire slime", () => {
  const chanceIn = (fire) => {
    const c = makeSlimeCombatant(slime({ mutations: ['pyrolyze'], elements: { fire } }));
    return collectHooks(c, 'onStatusApply')[0].chance;
  };
  assert.ok(chanceIn(100) > chanceIn(0) * 1.4, `${chanceIn(100)} vs ${chanceIn(0)}`);
});

test("Stoneskin's firmness bonus scales too — the stat path sees affinity", () => {
  // computeStats builds its own hook carrier; without a `ref` on it, statMod
  // mutations would silently skip affinity while every other hook used it.
  const plain = computeStats(slime({ mutations: ['stoneskin'] }));
  const earthy = computeStats(slime({ mutations: ['stoneskin'], elements: { earth: 100 } }));
  assert.ok(earthy.firmness > plain.firmness, `${earthy.firmness} vs ${plain.firmness}`);
});
