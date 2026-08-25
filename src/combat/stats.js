// ─────────────────────────────────────────────────────────────────────────────
// Stat derivation — the single source of truth
//
// Previously duplicated between HiveQueenV4.getSlimeStats and
// arenaCombat.calcSlimeStats, which had already drifted apart. Both now call
// through here.
// ─────────────────────────────────────────────────────────────────────────────

import { SLIME_TIERS } from '../data/slimeData.js';
import { MUTATION_LIBRARY, SLIME_TRAITS } from '../data/traitData.js';
import { runHooks, getEffect } from './hooks.js';

/**
 * A slime's effects as the hook system sees them: the registry id it resolves
 * to, plus the data definition its magnitude scales from.
 */
export function buildEffectList(slime) {
  const out = [];
  (slime?.mutations || []).forEach(mutId => {
    const def = MUTATION_LIBRARY[mutId];
    if (def?.passive) out.push({ source: 'mutation', id: def.passive, def });
  });
  (slime?.traits || []).forEach(traitId => {
    const def = SLIME_TRAITS[traitId];
    if (def) out.push({ source: 'trait', id: traitId, def });
  });
  return out;
}

/** Base stats before mutations — tier scaling and biomass growth. */
function baseStatsOf(slime, pendingBiomass = 0) {
  // Legacy saves: pre-baseStats slimes stored a flat `stats` object.
  if (slime.stats && !slime.baseStats) {
    return { ...slime.stats };
  }
  const tier = SLIME_TIERS[slime.tier];
  if (!slime.baseStats) {
    const b = Math.floor(4 * (tier?.statMultiplier || 1));
    return { firmness: b, slipperiness: b, viscosity: b };
  }

  const biomass = (slime.biomass || 0) + pendingBiomass;
  const pct     = biomass / tier.biomassPerPercent;
  const capped  = Math.min(pct, tier.maxBiomassBonus || 100);
  const mult    = 1 + capped / 100;

  return {
    firmness:     Math.floor(slime.baseStats.firmness * mult),
    slipperiness: Math.floor(slime.baseStats.slipperiness * mult),
    viscosity:    Math.floor(slime.baseStats.viscosity * mult),
  };
}

/**
 * Full derived stats: base → statMod hooks → global multipliers.
 *
 * statMod magnitudes scale off the PRE-mutation viscosity so the result does
 * not depend on the order mutations were selected in.
 */
export function computeStats(slime, pendingBiomass = 0, combatBonuses = {}, mutationPower = 1) {
  if (!slime) return { firmness: 0, slipperiness: 0, viscosity: 0 };

  const stats = baseStatsOf(slime, pendingBiomass);
  const carrier = { stats: { ...stats }, effects: buildEffectList(slime) };

  runHooks(carrier, 'statMod', { stats, slime }, mutationPower);

  return {
    firmness:     Math.max(0, Math.floor(stats.firmness     * (combatBonuses.firmness     || 1))),
    slipperiness: Math.max(0, Math.floor(stats.slipperiness * (combatBonuses.slipperiness || 1))),
    viscosity:    Math.max(0, Math.floor(stats.viscosity    * (combatBonuses.viscosity    || 1))),
  };
}

/**
 * Max HP, derived from CURRENT firmness rather than frozen at spawn.
 * Fixes the drift where a matured slime's HP no longer matched its stat block.
 */
export function computeMaxHp(slime, stats, bon = {}, combatBonuses = {}, mutationPower = 1) {
  if (!slime) return 1;
  const tier = SLIME_TIERS[slime.tier];
  const base = (tier?.baseHp || 30) + (stats?.firmness || 0) * 3;

  const ev = { maxHp: base, mult: 1, slime };
  runHooks({ stats, effects: buildEffectList(slime) }, 'hpMod', ev, mutationPower);

  return Math.max(1, Math.floor(base * ev.mult * (bon.hp || 1) * (combatBonuses.maxHp || 1)));
}

/**
 * How many mutations this slime can carry: tier slots, plus slots granted by
 * effects it already has (`alloyPotential`, `ancient`), plus the skill tree.
 */
export function mutationSlots(slime, skillBonus = 0) {
  const tier = SLIME_TIERS[slime?.tier];
  let slots = (tier?.traitSlots || 1) + skillBonus;
  for (const { source, id } of buildEffectList(slime)) {
    slots += getEffect(source, id)?.slots || 0;
  }
  return slots;
}

/** Slots granted by a prospective mutation selection, used by the forge. */
export function slotsFromSelection(selectedMutationIds = []) {
  let bonus = 0;
  selectedMutationIds.forEach(mutId => {
    const def = MUTATION_LIBRARY[mutId];
    if (def?.passive) bonus += getEffect('mutation', def.passive)?.slots || 0;
  });
  return bonus;
}
