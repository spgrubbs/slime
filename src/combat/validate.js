// ─────────────────────────────────────────────────────────────────────────────
// Registry validation
//
// The bug this exists to prevent: spawn() built each slime's passive list from
// MUTATION_LIBRARY[id].passive while combat checked an entirely different set
// of legacy names. The intersection was empty, so all 30 mutations were inert
// and nothing failed. This check makes that a startup error.
// ─────────────────────────────────────────────────────────────────────────────

import { MUTATION_LIBRARY, SLIME_TRAITS, STATUS_EFFECTS } from '../data/traitData.js';
import { MONSTER_ABILITIES } from '../data/monsterData.js';
import { hasEffect } from './hooks.js';

// Monster ability effects the resolver knows how to execute.
const HANDLED_ABILITY_EFFECTS = new Set([
  'damage', 'poison', 'burn', 'lifesteal', 'slow', 'stun', 'freeze',
  'aoe', 'buff', 'trueDamage', 'selfHeal',
]);

// Statuses the resolver knows how to execute.
const HANDLED_STATUS_FIELDS = ['dmg', 'skipsTurn', 'dmgMult', 'speedMult'];

/** Throws on the first inconsistency. Returns a summary when everything lines up. */
export function validateRegistry({ throwOnError = true } = {}) {
  const errors = [];

  for (const [id, def] of Object.entries(MUTATION_LIBRARY)) {
    if (!def.passive) {
      errors.push(`Mutation "${id}" has no \`passive\` id`);
    } else if (!hasEffect('mutation', def.passive)) {
      errors.push(`Mutation "${id}" declares passive "${def.passive}" with no registered effect`);
    }
  }

  for (const id of Object.keys(SLIME_TRAITS)) {
    if (!hasEffect('trait', id)) {
      errors.push(`Trait "${id}" has no registered effect`);
    }
  }

  for (const [id, def] of Object.entries(MONSTER_ABILITIES)) {
    if (!HANDLED_ABILITY_EFFECTS.has(def.effect)) {
      errors.push(`Monster ability "${id}" has unhandled effect "${def.effect}"`);
    }
  }

  for (const [id, def] of Object.entries(STATUS_EFFECTS)) {
    if (!HANDLED_STATUS_FIELDS.some(f => def[f])) {
      errors.push(`Status "${id}" does nothing — it has no dmg, skipsTurn, dmgMult, or speedMult`);
    }
  }

  if (errors.length && throwOnError) {
    throw new Error(
      `Combat registry validation failed (${errors.length}):\n  - ${errors.join('\n  - ')}`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    mutations: Object.keys(MUTATION_LIBRARY).length,
    traits: Object.keys(SLIME_TRAITS).length,
  };
}
