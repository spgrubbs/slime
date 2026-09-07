import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import { computeStats } from './stats.js';
import { makeSlimeCombatant, makeEnemyCombatant, resolveKill } from './resolveRound.js';
import { SLIME_TIERS } from '../data/slimeData.js';
import {
  MONSTER_TYPES, materialDropChance, GATING_MATERIALS, MATERIAL_RATES,
  mutagenDropChance, MUTAGEN_RATES, MUTAGEN_PITY_KILLS,
} from '../data/monsterData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { ZONES } from '../data/zoneData.js';
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

// ═════════════════════════════════════════════════════════════════════════════
// Mutagens
// ═════════════════════════════════════════════════════════════════════════════

test('every monster carries the mutagen for its own mutation', () => {
  // The round trip has to hold in both directions or a mutation becomes
  // unobtainable without anything failing loudly.
  Object.entries(MONSTER_TYPES).forEach(([id, m]) => {
    assert.ok(m.mutation, `${id} drops no mutagen`);
    assert.equal(MUTATION_LIBRARY[m.mutation].monster, id,
      `${id} and ${m.mutation} disagree about each other`);
  });
});

test('mutagen rate follows the mutation, not the monster', () => {
  // A rare monster already appears ~5% of the time. Taxing that twice puts its
  // mutagen past 2,000 zone kills.
  assert.equal(mutagenDropChance(MONSTER_TYPES.youngWolf), MUTAGEN_RATES.common);
  assert.equal(mutagenDropChance(MONSTER_TYPES.theSnail), MUTAGEN_RATES.rare);
  assert.ok(MUTAGEN_RATES.rare > MUTAGEN_RATES.common);
});

test('a specific mutagen is a real grind, and any mutagen is not', () => {
  const commonSpawn = 0.95 / 4;          // four commons share the common slot
  const specific = 1 / (commonSpawn * MUTAGEN_RATES.common);
  assert.ok(specific > 250 && specific < 700, `${Math.round(specific)} zone kills for a specific mutagen`);

  const any = 1 / MUTAGEN_RATES.common;  // any monster's own mutagen
  assert.ok(any <= 150, `${Math.round(any)} kills before seeing any mutagen at all`);
});

test('a rare mutagen costs more than a common one, but not absurdly', () => {
  const rareSpawn = 0.05;
  const kills = 1 / (rareSpawn * MUTAGEN_RATES.rare);
  assert.ok(kills > 400, `${Math.round(kills)} kills is too cheap for a rare`);
  assert.ok(kills < 1200, `${Math.round(kills)} kills is a wall, not a chase`);
});

test('the pity floor caps the worst case', () => {
  // Pure 1% with no floor can hand a player 500 kills and nothing.
  const worstCaseWithoutPity = Infinity;
  assert.ok(MUTAGEN_PITY_KILLS < worstCaseWithoutPity);
  assert.ok(MUTAGEN_PITY_KILLS >= 100 && MUTAGEN_PITY_KILLS <= 300,
    `pity at ${MUTAGEN_PITY_KILLS} kills`);

  // The floor must be reachable sooner than the raw drop's expected wait for a
  // specific common, or it never actually protects anyone.
  const expectedRawKillsOfThatMonster = 1 / MUTAGEN_RATES.common;
  assert.ok(MUTAGEN_PITY_KILLS <= expectedRawKillsOfThatMonster * 2);
});

test('mutagens actually drop from kills', () => {
  const sl = makeSlimeCombatant(slime('royal'));
  let drops = 0;
  const N = 6000;
  for (let i = 0; i < N; i++) {
    const se = [];
    resolveKill({ slimes: [sl], enemy: makeEnemyCombatant('youngWolf') }, { rng: Math.random }, [], se, null);
    drops += se.filter(x => x.type === 'mutagen' && x.mutation === 'sharp').length;
  }
  const rate = drops / N;
  assert.ok(rate > 0.005 && rate < 0.02, `observed ${(rate * 100).toFixed(2)}% vs 1% expected`);
});

test('every mutation is obtainable from a monster that exists in a zone', () => {
  const inAZone = new Set(Object.values(ZONES).flatMap(z => z.monsters));
  Object.entries(MUTATION_LIBRARY).forEach(([id, m]) => {
    assert.ok(inAZone.has(m.monster), `${id} comes from ${m.monster}, which no zone spawns`);
  });
});
