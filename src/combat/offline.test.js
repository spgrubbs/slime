import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { calculateOfflineProgress } from './offline.js';
import { makeExpedition, dehydrateExpedition } from './expedition.js';
import { seededRng } from '../utils/helpers.js';
import { ROUND_MS } from '../data/gameConstants.js';

const HOUR = 3600 * 1000;

// A party that can win a few fights in the swamp and then loses: something
// for the forecast to predict.
const party = () => [0, 1].map(i => ({
  id: `s${i}`, name: `Ooze${i}`, tier: 'enhanced', biomass: 0, mutations: [], traits: [],
  baseStats: { firmness: 12, slipperiness: 5, viscosity: 5 }, primaryElement: null,
  elements: { fire: 0, water: 0, nature: 0, earth: 0 }, maxHp: 50, magCost: 5,
}));

const saveWith = (zone, lastSave) => {
  const slimes = party();
  const exp = makeExpedition(zone, slimes, null, { rng: seededRng(1), roundMs: ROUND_MS });
  return JSON.parse(JSON.stringify({
    bio: 0, mats: {}, slimes, builds: { forestTendril: 1, swampTendril: 1 }, research: [], activeRes: null,
    exps: { [zone]: dehydrateExpedition(exp) }, lastSave,
  }));
};

const run = (save, now) =>
  calculateOfflineProgress(save, {}, { rng: seededRng(save.lastSave), roundMs: ROUND_MS }, now);

test('the same save and seed always play out the same way', () => {
  const save = saveWith('swamp', 1_000_000);
  const a = run(save, save.lastSave + 6 * HOUR);
  const b = run(save, save.lastSave + 6 * HOUR);
  assert.deepEqual(a.results, b.results);
});

test('a forecast wipe time matches what the real catch-up finds', () => {
  const save = saveWith('swamp', 2_000_000);
  const forecast = run(save, save.lastSave + 12 * HOUR);
  const wipe = forecast.results.events.find(e => e.type === 'wipe');
  assert.ok(wipe, 'this party should fall within 12 hours in the swamp');

  // Reopen a minute before the forecast: the party is still out.
  const before = run(save, wipe.at - 60 * 1000);
  assert.ok(!before.results.expeditionsWiped.includes('swamp'), 'not wiped yet');
  assert.ok(before.newState.exps.swamp, 'still out');

  // Reopen a minute after: it has fallen, exactly as the notification said.
  const after = run(save, wipe.at + 60 * 1000);
  assert.ok(after.results.expeditionsWiped.includes('swamp'), 'wiped as forecast');
});

test('under a minute away is not an absence', () => {
  const save = saveWith('forest', 3_000_000);
  assert.equal(run(save, save.lastSave + 30 * 1000).hadProgress, false);
});
