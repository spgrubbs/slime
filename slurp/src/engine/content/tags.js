// ─────────────────────────────────────────────────────────────────────────────
// Tags — what an essence IS: its family, its element, the damage it deals and
// the role it plays. Tags you own pull matching essences into later offers
// (once the Flavor Memory upgrade is bought), and some essences scale per tag.
// A species brings its own intrinsic tags.
// ─────────────────────────────────────────────────────────────────────────────

import { FAMILIES } from './families.js';

export const TAGS = {
  // elements
  fire:     { name: 'Fire',     icon: '🔥', kind: 'element' },
  water:    { name: 'Water',    icon: '💧', kind: 'element' },
  nature:   { name: 'Nature',   icon: '🍃', kind: 'element' },
  earth:    { name: 'Earth',    icon: '🟫', kind: 'element' },
  // damage types
  physical: { name: 'Physical', icon: '👊', kind: 'damage' },
  poison:   { name: 'Poison',   icon: '🧪', kind: 'damage' },
  burn:     { name: 'Burn',     icon: '♨️', kind: 'damage' },
  bleed:    { name: 'Bleed',    icon: '🩸', kind: 'damage' },
  true:     { name: 'True',     icon: '🕳️', kind: 'damage' },
  // roles
  crit:     { name: 'Crit',     icon: '💥', kind: 'role' },
  membrane: { name: 'Membrane', icon: '🛡️', kind: 'role' },
  heal:     { name: 'Heal',     icon: '💚', kind: 'role' },
  speed:    { name: 'Speed',    icon: '💨', kind: 'role' },
  control:  { name: 'Control',  icon: '💫', kind: 'role' },
  thorns:   { name: 'Thorns',   icon: '🌵', kind: 'role' },
  growth:   { name: 'Growth',   icon: '📈', kind: 'role' },
  // families are tags too
  ...Object.fromEntries(Object.entries(FAMILIES).map(([id, f]) => [id, { name: f.name, icon: f.icon, kind: 'family' }])),
};

/** Mechanic tags per essence. Family and element are added automatically. */
const MECHANICS = {
  fangs: ['crit', 'physical'],
  pounce: ['bleed', 'physical'],
  bloodthirst: ['heal'],
  feralInstinct: ['physical'],
  chainCrit: ['crit', 'physical'],
  packTactics: ['crit'],
  bloodletting: ['bleed'],
  photosynthesis: ['heal'],
  devour: ['true'],
  sporeCloud: ['poison', 'control'],
  sapSpray: ['poison', 'control'],
  catalyst: ['poison'],
  fermenter: ['poison'],
  toxicBloom: ['poison'],
  stoneskin: ['membrane'],
  harden: ['membrane'],
  spikedHide: ['thorns'],
  bodySlam: ['physical', 'growth'],
  bedrock: ['membrane'],
  manyLegs: ['physical', 'speed'],
  webShot: ['control', 'speed'],
  venomGland: ['poison'],
  swarming: ['speed'],
  bounce: ['physical', 'membrane'],
  gulp: ['growth'],
  jiggle: ['speed'],
  gelPouch: ['growth'],
  acidSplash: ['control'],
  overeater: ['heal', 'growth'],
  resurrect: ['heal'],
  glimmer: ['speed'],
  wail: ['control'],
  pyrolyze: ['burn'],
  kindling: ['burn'],
  diveBomb: ['physical', 'speed'],
  staticCharge: ['physical'],
  momentum: ['speed', 'growth'],
  undertow: ['speed'],
  voidTouch: ['true'],
  consume: ['growth', 'physical'],
  hollowGaze: ['control'],
  plating: ['membrane'],
  overclock: ['speed'],
  carnivoresMaw: ['growth'],
  perennial: ['heal'],
  strangler: ['control', 'poison'],
  draconicHeart: ['growth'],
  emberSoul: ['burn'],
  hoard: ['growth'],
  graniteShell: ['membrane'],
  echoChamber: ['speed'],
  eyeOfStorm: ['speed'],
  lightningRod: ['speed', 'physical'],
};

/** Every tag an essence carries. Needs the essence definition (to avoid an import cycle). */
export function tagsOfDef(id, def) {
  if (!def) return [];
  const out = [];
  for (const f of [].concat(def.family || [])) out.push(f);
  if (def.element) out.push(def.element);
  for (const t of MECHANICS[id] || []) out.push(t);
  for (const el of Object.keys(def.affinity || {})) out.push(el);
  return [...new Set(out)];
}
