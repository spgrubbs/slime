// ─────────────────────────────────────────────────────────────────────────────
// Status predicates
//
// What each status DOES beyond its tick damage, read off the data in
// traitData.STATUS_EFFECTS so a new status declares its behaviour there rather
// than being special-cased by name here. Shared by the resolver and the Warden
// mechanics, which is why it lives on its own: resolveRound imports
// wardenMechanics, so the reverse import would be a cycle.
// ─────────────────────────────────────────────────────────────────────────────

import { STATUS_EFFECTS } from '../data/traitData.js';

const defOf = (s) => STATUS_EFFECTS[s?.type] || {};

/** Burn: nothing heals while it holds. */
export const isSeared = (c) => (c?.status || []).some(s => defOf(s).noHeal);

/** Poison: combined damage-taken multiplier from every corroding status. */
export const corrosion = (c) =>
  (c?.status || []).reduce((m, s) => m * (defOf(s).dmgTakenMult ?? 1), 1);

/** Bleed specifically — the Mire Warden's rot cannot close an open wound. */
export const isBleeding = (c) => (c?.status || []).some(s => s.type === 'bleed');

/** How many stacks a status is at (1 for anything that does not stack). */
export const stacksOf = (s) => Math.max(1, s?.stacks || 1);
