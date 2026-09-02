import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { computeStats } from './stats.js';
import { makeSlimeCombatant, makeEnemyCombatant, resolveKill } from './resolveRound.js';
import { SLIME_TIERS } from '../data/slimeData.js';
import { MONSTER_TYPES, materialDropChance, GATING_MATERIALS, MATERIAL_RATES } from '../data/monsterData.js';
import { BUILDINGS } from '../data/buildingData.js';
import { RANCH_TYPES } from '../data/ranchData.js';
import { CARAVAN_UNITS } from '../data/caravanData.js';

const slime = (tier, biomassPct = 0, over = {}) => {
  const td = SLIME_TIERS[tier];
  const base = Math.floor(5 * td.statMultiplier);
  return {
    id: 's1', name: 'S', tier,
    biomass: td.biomassPerPercent * td.maxBiomassBonus * biomassPct,
    mutations: [], traits: [],
    baseStats: { firmness: base, slipperiness: base, viscosity: base },
    primaryElement: null,
    ...over,
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// Intrinsic vs held power
// ═════════════════════════════════════════════════════════════════════════════

test('held biomass is never worth a tier step', () => {
  // A slime's power splits in two: intrinsic (tier, traits, mutations) and
  // held (biomass). Held power must never promote a slime a rung, or the
  // tier ladder stops meaning anything.
  const tiers = Object.keys(SLIME_TIERS);
  for (let i = 0; i < tiers.length - 1; i++) {
    const maturedLower = computeStats(slime(tiers[i], 1)).firmness;
    const freshHigher = computeStats(slime(tiers[i + 1], 0)).firmness;
    assert.ok(
      maturedLower < freshHigher,
      `a fully loaded ${tiers[i]} (${maturedLower}) outclasses a fresh ${tiers[i + 1]} (${freshHigher})`,
    );
  }
});

test('every tier caps held power at the same modest fraction', () => {
  Object.entries(SLIME_TIERS).forEach(([tier, td]) => {
    assert.ok(td.maxBiomassBonus <= 40, `${tier} allows +${td.maxBiomassBonus}% from biomass`);
    const fresh = computeStats(slime(tier, 0)).firmness;
    const full = computeStats(slime(tier, 1)).firmness;
    assert.ok(full > fresh, `${tier} gains nothing from biomass`);
  });
});

test('biomass still sharpens the rung it is on', () => {
  const fresh = computeStats(slime('elite', 0));
  const full = computeStats(slime('elite', 1));
  assert.ok(full.firmness >= Math.floor(fresh.firmness * 1.3));
});

// ═════════════════════════════════════════════════════════════════════════════
// Material economy
// ═════════════════════════════════════════════════════════════════════════════

test('every material a building or ranch needs can actually be obtained', () => {
  // Eight gating materials once had no source at all, which made several
  // buildings and ranches literally unbuildable.
  const needed = new Set();
  Object.values(BUILDINGS).forEach(b =>
    Object.keys(b.cost?.mats || {}).forEach(m => needed.add(m)));
  Object.values(RANCH_TYPES).forEach(r => {
    Object.keys(r.cost?.mats || {}).forEach(m => needed.add(m));
    Object.keys(r.upgradeCost?.mats || {}).forEach(m => needed.add(m));
  });

  const obtainable = new Set();
  Object.values(MONSTER_TYPES).forEach(m => (m.mats || []).forEach(x => obtainable.add(x)));
  Object.values(CARAVAN_UNITS).forEach(u => Object.keys(u.mats || {}).forEach(x => obtainable.add(x)));

  const orphans = [...needed].filter(m => !obtainable.has(m));
  assert.deepEqual(orphans, [], 'materials with no drop source');
});

test('gating materials drop more slowly than commons', () => {
  const commonMon = MONSTER_TYPES.youngWolf;
  assert.ok(materialDropChance('Storm Core', commonMon) < materialDropChance('Wolf Pelt', commonMon));
  assert.equal(materialDropChance('Storm Core', commonMon), MATERIAL_RATES.gating);
});

test('rare monsters pay out generously — finding them was the grind', () => {
  const rare = MONSTER_TYPES.theSnail;
  assert.equal(rare.rare, true);
  assert.equal(materialDropChance('Ancient Stone', rare), MATERIAL_RATES.fromRare);
  assert.ok(materialDropChance('Ancient Stone', rare) > materialDropChance('Ancient Stone', MONSTER_TYPES.youngWolf));
});

test('each material rolls on its own, so a kill can drop several or none', () => {
  const sl = makeSlimeCombatant(slime('royal'));
  const counts = new Map();
  let none = 0;
  for (let i = 0; i < 2000; i++) {
    const se = [];
    resolveKill({ slimes: [sl], enemy: makeEnemyCombatant('pebblet') }, { rng: Math.random }, [], se, null);
    const mats = se.filter(x => x.type === 'material');
    if (!mats.length) none++;
    counts.set(mats.length, (counts.get(mats.length) || 0) + 1);
  }
  assert.ok(none > 0, 'some kills should drop nothing');
  assert.ok((counts.get(2) || 0) + (counts.get(3) || 0) > 0, 'some kills should drop several');
});

test('a gating material takes real time but not an unreasonable amount', () => {
  // Void Essence x5 for the Primordial Chamber, from a rare in the endgame zone.
  const perKill = 0.05 * materialDropChance('Void Essence', MONSTER_TYPES.hollowOne);
  const kills = 5 / perKill;
  assert.ok(kills > 100, `only ${Math.round(kills)} kills — too cheap for a capstone`);
  assert.ok(kills < 600, `${Math.round(kills)} kills is a slog, not a gate`);
});

test('drop skills and Lucky raise every material together', () => {
  const sl = makeSlimeCombatant(slime('royal', 0, { traits: ['lucky'] }));
  let boosted = 0, plain = 0;
  for (let i = 0; i < 1500; i++) {
    const a = []; const b = [];
    resolveKill({ slimes: [sl], enemy: makeEnemyCombatant('youngWolf') },
      { rng: Math.random, combatBonuses: { materialDrop: 2 } }, [], a, null);
    resolveKill({ slimes: [makeSlimeCombatant(slime('royal'))], enemy: makeEnemyCombatant('youngWolf') },
      { rng: Math.random }, [], b, null);
    boosted += a.filter(x => x.type === 'material').length;
    plain += b.filter(x => x.type === 'material').length;
  }
  assert.ok(boosted > plain, `${boosted} vs ${plain}`);
});
