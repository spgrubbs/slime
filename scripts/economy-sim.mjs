// Economy simulator.
//
//   node scripts/economy-sim.mjs [hours]
//
// Runs real expeditions through the real combat resolver (the same path as the
// offline catch-up) for a typical party at each stage of the game, and prints
// what an hour of farming yields there. Then prices every progression gate in
// hours of that farming, so costs can be tuned against a pacing target instead
// of guessed. See docs/GAME_DESIGN.md §23.

import '../src/combat/index.js';
import { makeExpedition, tickExpedition } from '../src/combat/expedition.js';
import { ZONES } from '../src/data/zoneData.js';
import { BUILDINGS, TENDRILS } from '../src/data/buildingData.js';
import { MATERIAL_TABLE } from '../src/data/merchantData.js';
import { ROUND_MS } from '../src/data/gameConstants.js';
import { seededRng } from '../src/utils/helpers.js';

const HOURS = Number(process.argv[2]) || 4;

// A typical party for each stage: four slimes of the tier that zone is built
// for, at the stats a player would have when they start farming it (a fresh
// slime of that tier, grown about 20% from carried biomass).
export const STAGES = {
  forest:  { tier: 'basic',    stat: 6 },
  swamp:   { tier: 'enhanced', stat: 12 },
  caves:   { tier: 'enhanced', stat: 13 },
  ruins:   { tier: 'elite',    stat: 20 },
  peaks:   { tier: 'royal',    stat: 30 },
  volcano: { tier: 'royal',    stat: 34 },
};

const party = (tier, stat) => [0, 1, 2, 3].map(i => ({
  id: `p${i}`, name: `P${i}`, tier, biomass: 0, mutations: [], traits: [],
  baseStats: { firmness: stat, slipperiness: stat, viscosity: stat },
  primaryElement: null, elements: { fire: 0, water: 0, nature: 0, earth: 0 },
}));

/** Farm `zone` for `hours` of game time. */
export function farm(zone, { tier, stat }, hours = HOURS, seed = 7) {
  const rng = seededRng(seed);
  const ctx = { rng, roundMs: ROUND_MS, passives: ['mutagenesis'] };
  const exp = makeExpedition(zone, party(tier, stat), null, ctx);
  const out = { kills: 0, biomass: 0, mats: {}, mutagens: 0, wipedAt: null };
  const steps = Math.floor(hours * 3600 * 1000 / ROUND_MS);
  for (let i = 0; i < steps; i++) {
    const { sideEffects } = tickExpedition(exp, ROUND_MS, ctx, zone);
    sideEffects.forEach(se => { if (se.type === 'mutagen') out.mutagens++; });
    if (exp.phase === 'defeat') { out.wipedAt = (i * ROUND_MS) / 3600000; break; }
  }
  const h = out.wipedAt ?? hours;
  out.kills = exp.kills / h;
  out.biomass = exp.slimes.reduce((n, s) => n + (s.biomassGained || 0), 0) / h;
  Object.entries(exp.materials).forEach(([m, n]) => { out.mats[m] = n / h; });
  out.mutagens /= h;
  out.hours = h;
  return out;
}

// ── Gates ────────────────────────────────────────────────────────────────────

/** Hours of farming `zone` to afford `cost` from nothing ({ biomass, mats }). */
function hoursFor(cost, yieldOf) {
  let worst = (cost.biomass || 0) / Math.max(1e-9, yieldOf.biomass);
  let why = 'biomass';
  for (const [m, n] of Object.entries(cost.mats || {})) {
    const src = MATERIAL_TABLE[m]?.zone;
    const rate = src ? (yields[src]?.mats[m] || 0) : 0;
    if (!src) { continue; } // Seals/Cores and road goods are not farmed
    const h = rate > 0 ? n / rate : Infinity;
    if (h > worst) { worst = h; why = `${m} (${src})`; }
  }
  return { hours: worst, why };
}

const yields = {};
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(`\nFarming yields per hour (${HOURS}h simulated per zone, 4-slime party)\n`);
  for (const [zone, stage] of Object.entries(STAGES)) {
    const y = farm(zone, stage);
    yields[zone] = y;
    const mats = Object.values(y.mats).reduce((a, b) => a + b, 0);
    console.log(`${zone.padEnd(8)} ${stage.tier.padEnd(9)} stat ${String(stage.stat).padEnd(3)}`
      + ` kills ${y.kills.toFixed(0).padStart(4)}/h  biomass ${y.biomass.toFixed(0).padStart(6)}/h`
      + `  mats ${mats.toFixed(0).padStart(4)}/h  mutagens ${y.mutagens.toFixed(2)}/h`
      + (y.wipedAt != null ? `  WIPED at ${(y.wipedAt * 60).toFixed(0)} min` : ''));
  }

  console.log('\nGates, in hours of farming the zone that pays for them\n');
  const gate = (label, cost, zone) => {
    const { hours, why } = hoursFor(cost, yields[zone]);
    console.log(`${label.padEnd(34)} ${Number.isFinite(hours) ? hours.toFixed(1).padStart(6) + ' h' : '   never'}  limited by ${why}`);
  };
  TENDRILS.forEach(t => t.levels.forEach((lv, i) => {
    if (i === 0 && t.zone === 'forest') return;
    const farmZone = i === 0 ? Object.keys(ZONES)[Object.keys(ZONES).indexOf(t.zone) - 1] : t.zone;
    gate(`${t.name} ${lv.title}`, lv.cost, farmZone);
  }));
  for (const [id, b] of Object.entries(BUILDINGS)) {
    if (b.category === 'tendril' || b.category === 'research' || !b.cost?.mats) continue;
    const zones = Object.keys(b.cost.mats).map(m => MATERIAL_TABLE[m]?.zone).filter(Boolean);
    const deepest = Object.keys(ZONES).filter(z => zones.includes(z)).pop() || 'forest';
    gate(`${b.name}`, b.cost, deepest);
  }
  console.log('');
}
