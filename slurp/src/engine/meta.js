// ─────────────────────────────────────────────────────────────────────────────
// Meta progression — the Brood Pool profile that survives every run.
// Pure functions over plain data, like run.js.
// ─────────────────────────────────────────────────────────────────────────────

import { UPGRADES, upgradeCost, genesFor } from './content/upgrades.js';
import { ESSENCES, isSlotted } from './content/essences.js';
import { slimeProfile } from './combatant.js';

export const PROFILE_VERSION = 1;
const HALL_SIZE = 30;

export function newProfile() {
  return {
    version: PROFILE_VERSION,
    genes: 0,
    totalGenes: 0,
    upgrades: {},
    heirloom: null,
    runs: 0,
    wins: 0,
    saltUnlocked: { gloop: 0 },
    bestSalt: {},
    records: { biggestHit: 0, peakMass: 0, mostActions: 0, deepestAct: 0 },
    hall: [],
  };
}

export const rankOf = (profile, id) => profile.upgrades[id] || 0;

export function nextCost(profile, id) {
  const r = rankOf(profile, id);
  return r >= UPGRADES[id].max ? null : upgradeCost(id, r);
}

export function buyUpgrade(profile, id) {
  const cost = nextCost(profile, id);
  if (cost === null) throw new Error('Already maxed');
  if (profile.genes < cost) throw new Error('Not enough Genes');
  const p = structuredClone(profile);
  p.genes -= cost;
  p.upgrades[id] = rankOf(p, id) + 1;
  const sp = UPGRADES[id].species;
  if (sp && p.saltUnlocked[sp] === undefined) p.saltUnlocked[sp] = 0;
  return p;
}

export function unlockedSpecies(profile) {
  const hatched = Object.entries(UPGRADES).filter(([id, u]) => u.species && rankOf(profile, id)).map(([, u]) => u.species);
  return ['gloop', ...hatched];
}

export const metaForRun = (profile) => ({ upgrades: { ...profile.upgrades }, heirloom: profile.heirloom });

/** Essences from the final slime that can be banked as an Heirloom. */
export const heirloomChoices = (run) => run.slime.slotted.map(e => e.id).filter(id => isSlotted(id) && ESSENCES[id].type !== 'keystone');

/**
 * Bank a finished run: Genes, Salt unlocks, records, the Hall of Slimes entry
 * and (optionally) a new Heirloom.
 */
export function applyRunEnd(profile, run, heirloomId = null) {
  const p = structuredClone(profile);
  const genes = genesFor(run.stats, run.salt);
  p.genes += genes;
  p.totalGenes += genes;
  p.runs++;
  if (run.stats.won) {
    p.wins++;
    const sp = run.species;
    if (run.salt >= (p.saltUnlocked[sp] || 0)) p.saltUnlocked[sp] = run.salt + 1;
    p.bestSalt[sp] = Math.max(p.bestSalt[sp] ?? -1, run.salt);
  }
  const rec = p.records;
  rec.biggestHit = Math.max(rec.biggestHit, run.stats.biggestHit);
  rec.peakMass = Math.max(rec.peakMass, run.stats.peakMass);
  rec.mostActions = Math.max(rec.mostActions, run.stats.mostActions);
  rec.deepestAct = Math.max(rec.deepestAct, run.act + (run.stats.won ? 1 : 0));
  if (heirloomId && p.upgrades.heirloom) p.heirloom = heirloomId; // banking needs Ancestral Memory

  const prof = slimeProfile(run.slime, run);
  p.hall.unshift({
    n: p.runs, species: run.species, salt: run.salt, won: run.stats.won, act: run.act, floors: run.stats.floors,
    genes, stats: prof.stats, slotted: run.slime.slotted.map(e => ({ ...e })), relics: [...run.relics],
    biggestHit: run.stats.biggestHit,
  });
  p.hall = p.hall.slice(0, HALL_SIZE);
  return { profile: p, genes };
}
