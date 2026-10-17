// ─────────────────────────────────────────────────────────────────────────────
// Carried biomass
//
// Every way a slime in the field gains biomass goes through `carry`, so the
// cap holds no matter where the biomass came from: kills, caches on the road,
// boons. See carryCapacity in slimeData.js.
// ─────────────────────────────────────────────────────────────────────────────

import { carryCapacity } from '../data/slimeData.js';

/** How much more this combatant can hold, given what it left home with. */
export function room(c, ctx = {}) {
  const cap = carryCapacity(c.ref, ctx.combatBonuses?.carryCapacity || 1);
  const held = (c.ref?.biomass || 0) + (c.biomassGained || 0);
  return Math.max(0, cap - held);
}

/** Add biomass to a combatant up to its cap. Returns the amount that spilled. */
export function carry(c, amount, ctx = {}) {
  if (amount <= 0) return 0;
  const take = Math.min(amount, room(c, ctx));
  c.biomassGained = (c.biomassGained || 0) + take;
  c.full = room(c, ctx) <= 0;
  return amount - take;
}

/** Every living slime in the party is full. */
export const partyFull = (slimes, ctx = {}) => {
  const living = (slimes || []).filter(s => !s.dead);
  return living.length > 0 && living.every(s => room(s, ctx) <= 0);
};
