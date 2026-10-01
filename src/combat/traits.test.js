import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { computeStats, computeMaxHp } from './stats.js';
import { makeSlimeCombatant, makeEnemyCombatant, turnOrder } from './resolveRound.js';
import { makeExpedition, tickExpedition } from './expedition.js';
import { SLIME_TRAITS, traitValues, traitDesc } from '../data/traitData.js';
import { ROUND_MS } from '../data/gameConstants.js';

// A fresh basic slime, as the forge makes it.
const basic = (over = {}) => ({
  id: 'b1', name: 'Blob', tier: 'basic', biomass: 0, mutations: [], traits: [],
  baseStats: { firmness: 5, slipperiness: 5, viscosity: 5 }, primaryElement: null,
  elements: { fire: 0, water: 0, nature: 0, earth: 0 },
  ...over,
});

const hp = (s) => computeMaxHp(s, computeStats(s));

test('every trait with a number has one for each tier or a single flat value', () => {
  for (const [id, t] of Object.entries(SLIME_TRAITS)) {
    for (const key of ['values', 'values2']) {
      const vals = t[key];
      if (vals === undefined) continue;
      if (Array.isArray(vals)) assert.equal(vals.length, 4, `${id}.${key} needs four tiers`);
      else assert.equal(typeof vals, 'number', `${id}.${key}`);
    }
    // No placeholder left unfilled in any description.
    assert.ok(!/\{[vw]\}/.test(traitDesc(t, 'basic')), `${id} desc`);
  }
});

test('trait values climb with tier', () => {
  const tiers = ['basic', 'enhanced', 'elite', 'royal'];
  for (const id of ['hardy', 'brave', 'fierce', 'greedy', 'resilient']) {
    const vs = tiers.map(t => traitValues(id, t).v);
    for (let i = 1; i < vs.length; i++) assert.ok(vs[i] > vs[i - 1], `${id}: ${vs}`);
  }
});

test('Hardy is visible on a basic slime — the point of the rework', () => {
  const gain = hp(basic({ traits: ['hardy'] })) - hp(basic());
  assert.equal(gain, traitValues('hardy', 'basic').v);
  assert.ok(gain >= 5, `a basic Hardy slime gains ${gain} HP`);
});

test('Glutton costs real HP at tier 1', () => {
  assert.equal(hp(basic()) - hp(basic({ traits: ['glutton'] })), traitValues('glutton', 'basic').w);
});

test('Primordial raises every stat on a basic slime', () => {
  const a = computeStats(basic());
  const b = computeStats(basic({ traits: ['primordial'] }));
  assert.ok(b.firmness > a.firmness && b.slipperiness > a.slipperiness && b.viscosity > a.viscosity);
});

test('a Lazy slime acts after everyone, even the enemy', () => {
  const lazy  = makeSlimeCombatant(basic({ id: 'lazy', traits: ['lazy'], baseStats: { firmness: 5, slipperiness: 40, viscosity: 5 } }));
  const other = makeSlimeCombatant(basic({ id: 'other' }));
  const enemy = makeEnemyCombatant('youngWolf');
  const order = turnOrder({ round: 1, slimes: [lazy, other], enemy });
  assert.equal(order[order.length - 1].id, 'lazy');
});

test('once-per-fight effects re-arm when the next fight starts', () => {
  // Fierce fires on the first hit of EVERY fight, not once per expedition.
  const party = [basic({ id: 'f1', traits: ['fierce'], baseStats: { firmness: 30, slipperiness: 5, viscosity: 5 } })];
  let seed = 3;
  const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const exp = makeExpedition('forest', party, 3, { rng, roundMs: ROUND_MS });
  let fierceHits = 0;
  let seen = 0;
  for (let i = 0; i < 3000 && exp.kills < 3 && exp.phase !== 'defeat'; i++) {
    tickExpedition(exp, ROUND_MS, { rng, roundMs: ROUND_MS }, 'forest');
    const logs = exp.logs || [];
    for (const l of logs.slice(seen)) if (/Fierce/.test(l.v || '')) fierceHits++;
    seen = logs.length;
  }
  assert.ok(exp.kills >= 2, `needed at least two fights, got ${exp.kills}`);
  assert.ok(fierceHits >= 2, `Fierce fired ${fierceHits} times over ${exp.kills} fights`);
});
