import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import {
  makeExpedition, tickExpedition, dehydrateExpedition, hydrateExpedition,
} from './expedition.js';
import { ROUND_MS } from '../data/gameConstants.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const roster = (n = 3, over = {}) =>
  Array.from({ length: n }, (_, i) => ({
    id: `s${i}`,
    name: `Ooze${i}`,
    tier: 'elite',
    biomass: 200,
    mutations: ['sharp', 'regenerate', 'stoneskin'],
    traits: ['brave'],
    baseStats: { firmness: 18, slipperiness: 12, viscosity: 18 },
    primaryElement: null,
    elements: { fire: 0, water: 0, nature: 0, earth: 0 },
    ...over,
  }));

const ctx = (seed = 1) => ({ rng: seeded(seed), roundMs: ROUND_MS });

/**
 * Run an expedition to completion (or the step cap), collecting side effects.
 * `exp.logs` is capped, so anything asserting on log contents has to watch the
 * whole run rather than reading the tail afterwards — `allLogs` is that record.
 */
function runToEnd(exp, zone, c, maxSteps = 4000) {
  const all = [];
  const allLogs = [];
  let seen = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (exp.phase === 'defeat') break;
    const before = exp.logs.length;
    const { sideEffects } = tickExpedition(exp, ROUND_MS, c, zone);
    // The buffer may have rotated; take whatever is new at the tail.
    const grew = exp.logs.length - before;
    if (grew > 0) allLogs.push(...exp.logs.slice(-grew));
    else if (exp.logs.length === 80) allLogs.push(...exp.logs.slice(-1));
    seen = exp.logs.length;
    all.push(...sideEffects);
    if (sideEffects.some(se => se.type === 'expComplete' || se.type === 'expWipe')) break;
  }
  all.logs = allLogs;
  return all;
}

test('an expedition reaches its kill target', () => {
  const exp = makeExpedition('forest', roster(), 10, ctx());
  const effects = runToEnd(exp, 'forest', ctx(5));
  assert.ok(effects.some(se => se.type === 'expComplete'), `kills: ${exp.kills}`);
  assert.equal(exp.kills, 10);
});

test('combat only advances once a full round has elapsed', () => {
  const exp = makeExpedition('forest', roster(1), 10, ctx());
  tickExpedition(exp, ROUND_MS / 4, ctx(2), 'forest');
  assert.equal(exp.round, 0, 'a partial round resolved nothing');
  tickExpedition(exp, ROUND_MS, ctx(2), 'forest');
  assert.equal(exp.round, 1);
});

test('a weak party wipes in a hard zone', () => {
  const weak = roster(1, {
    tier: 'basic', biomass: 0, mutations: [], traits: [],
    baseStats: { firmness: 3, slipperiness: 1, viscosity: 1 },
  });
  const exp = makeExpedition('volcano', weak, 10, ctx());
  const effects = runToEnd(exp, 'volcano', ctx(9));
  assert.ok(effects.some(se => se.type === 'expWipe'), `phase: ${exp.phase}`);
  assert.equal(exp.phase, 'defeat');
});

test('materials ride home on the expedition rather than banking immediately', () => {
  const exp = makeExpedition('forest', roster(), 20, ctx());
  const effects = runToEnd(exp, 'forest', ctx(3));
  assert.equal(effects.filter(se => se.type === 'material').length, 0,
    'material side effects should be consumed by the driver');
  assert.ok(Object.keys(exp.materials).length > 0, 'materials accumulated on the expedition');
});

test('intermission events fire between encounters', () => {
  const exp = makeExpedition('swamp', roster(), 12, ctx());
  const run = runToEnd(exp, 'swamp', ctx(11));
  const travelLogs = run.logs.filter(l => l.v?.startsWith('travel event'));
  assert.ok(travelLogs.length > 0, 'no intermission events fired');
});

test('exploration events fire during travel', () => {
  // Rare (15% per intermission), so run a long expedition.
  const exp = makeExpedition('forest', roster(), 60, ctx());
  const run = runToEnd(exp, 'forest', ctx(21));
  const explore = run.logs.filter(l => l.v?.startsWith('exploration'));
  assert.ok(explore.length > 0, 'no exploration events fired across 60 kills');
});

test('slimes accrue elemental affinity in an elemental zone', () => {
  const exp = makeExpedition('forest', roster(), 15, ctx()); // nature zone
  runToEnd(exp, 'forest', ctx(4));
  assert.ok(exp.slimes.some(c => (c.elementGains.nature || 0) > 0));
});

test('every battle log entry carries a verbose derivation', () => {
  const exp = makeExpedition('caves', roster(), 8, ctx());
  const run = runToEnd(exp, 'caves', ctx(7));
  const missing = run.logs.filter(l => !l.v);
  assert.deepEqual(missing.map(l => l.m), [], 'log entries without a trace');
});

test('the arena receives beats to animate', () => {
  const exp = makeExpedition('forest', roster(), 10, ctx());
  for (let i = 0; i < 6 && !exp.anim; i++) tickExpedition(exp, ROUND_MS, ctx(6), 'forest');
  assert.ok(exp.anim, 'no animation produced');
  assert.ok(exp.anim.beats.length > 0);
  for (const beat of exp.anim.beats) {
    assert.ok(typeof beat.at === 'number');
    assert.ok(beat.kind);
  }
});

// ── Persistence ──────────────────────────────────────────────────────────────

test('an expedition survives a save/load round trip', () => {
  const party = roster();
  const exp = makeExpedition('forest', party, 20, ctx());
  for (let i = 0; i < 12; i++) tickExpedition(exp, ROUND_MS, ctx(8), 'forest');

  const saved = JSON.parse(JSON.stringify(dehydrateExpedition(exp)));
  assert.equal(saved.slimes[0].ref, undefined, 'ref was stripped');
  assert.equal(saved.slimes[0].effects, undefined, 'effects were stripped');

  const restored = hydrateExpedition(saved, party);
  assert.ok(restored.slimes[0].effects.length > 0, 'effects were rebuilt');
  assert.equal(restored.slimes[0].ref.id, party[0].id, 'ref was rebuilt');
  assert.equal(restored.enemy ? restored.enemy.ref !== null : true, true);

  // And it keeps running.
  const before = restored.round;
  tickExpedition(restored, ROUND_MS, ctx(8), 'forest');
  assert.ok(restored.round > before);
});

test('a restored expedition drops combatants whose slime is gone', () => {
  const party = roster(2);
  const exp = makeExpedition('forest', party, 10, ctx());
  const saved = JSON.parse(JSON.stringify(dehydrateExpedition(exp)));

  const restored = hydrateExpedition(saved, [party[0]]); // second slime reabsorbed
  assert.equal(restored.slimes[0].dead, false);
  assert.equal(restored.slimes[1].dead, true);
});

test('a dehydrated expedition contains no functions', () => {
  const exp = makeExpedition('forest', roster(), 10, ctx());
  tickExpedition(exp, ROUND_MS, ctx(1), 'forest');
  const saved = dehydrateExpedition(exp);

  const walk = (v, path = '$') => {
    assert.notEqual(typeof v, 'function', `function survived at ${path}`);
    if (v && typeof v === 'object') {
      Object.entries(v).forEach(([k, child]) => walk(child, `${path}.${k}`));
    }
  };
  walk(saved);
});
