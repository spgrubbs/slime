// Mutation library - abilities learned by defeating monsters
// Mutations are unlocked by killing 100 of the associated monster type
// VISC scaling: many effects scale with the slime's viscosity stat
// Format: baseValue + (viscScale * viscosity)

export const MUTATION_LIBRARY = {
  // === VERDANT FOREST MUTATIONS ===
  sharp: {
    name: 'Sharp',
    icon: '🔪',
    stat: 'firmness',
    bonus: 2,
    passive: 'sharp',
    passiveDesc: (visc) => `${(10 + 0.25 * visc).toFixed(1)}% auto-crit chance`,
    baseChance: 10,
    viscScale: 0.25,
    color: '#94a3b8',
    monster: 'youngWolf',
    elementBonus: null,
  },
  digest: {
    name: 'Digest',
    affinity: 'nature',          // scales with nature affinity
    icon: '🌱',
    stat: 'viscosity',
    bonus: 2,
    passive: 'digest',
    passiveDesc: (visc) => `+${(5 + 0.5 * visc).toFixed(1)} biomass per kill`,
    baseValue: 5,
    viscScale: 0.5,
    color: '#22c55e',
    monster: 'venusSlimetrap',
    elementBonus: { nature: 5 },
  },
  stoneskin: {
    name: 'Stoneskin',
    affinity: 'earth',          // scales with earth affinity
    icon: '🪨',
    stat: 'firmness',
    bonus: 2,
    passive: 'stoneskin',
    passiveDesc: (visc) => `+${(5 + 0.1 * visc).toFixed(1)} Firmness`,
    baseValue: 5,
    viscScale: 0.1,
    color: '#a16207',
    monster: 'pebblet',
    elementBonus: { earth: 5 },
  },
  vinewebs: {
    name: 'Vinewebs',
    affinity: 'nature',          // scales with nature affinity
    icon: '🕸️',
    stat: 'slipperiness',
    bonus: 2,
    passive: 'vinewebs',
    passiveDesc: (visc) => `${(10 + 0.25 * visc).toFixed(1)}% chance to block enemy attack`,
    baseChance: 10,
    viscScale: 0.25,
    color: '#65a30d',
    monster: 'vineSpider',
    elementBonus: { nature: 3 },
  },
  resurrect: {
    name: 'Resurrect',
    icon: '🧚',
    stat: 'viscosity',
    bonus: 3,
    passive: 'resurrect',
    passiveDesc: (visc) => `Revive with ${(1 + 2 * visc).toFixed(0)} HP after death`,
    baseValue: 1,
    viscScale: 2,
    color: '#4ade80',
    monster: 'lifeFairy',
    elementBonus: { nature: 8 },
  },

  // === MURKY SWAMP MUTATIONS ===
  spiny: {
    name: 'Spiny',
    icon: '🐟',
    stat: 'firmness',
    bonus: 2,
    passive: 'spiny',
    passiveDesc: (visc) => `${(10 + 0.4 * visc).toFixed(1)}% chance to cause Bleed`,
    baseChance: 10,
    viscScale: 0.4,
    color: '#ef4444',
    monster: 'serratedCarp',
    elementBonus: { water: 3 },
  },
  whirlpool: {
    name: 'Whirlpool',
    affinity: 'water',          // scales with water affinity
    icon: '🌀',
    stat: 'viscosity',
    bonus: 3,
    passive: 'whirlpool',
    passiveDesc: (visc) => `+${(5 + 0.3 * visc).toFixed(1)}% damage to fleeing (<30% HP) enemies`,
    baseValue: 5,
    viscScale: 0.3,
    color: '#3b82f6',
    monster: 'antSeaLion',
    elementBonus: { water: 5 },
  },
  farstep: {
    name: 'Farstep',
    icon: '👟',
    stat: 'slipperiness',
    bonus: 3,
    passive: 'farstep',
    passiveDesc: (visc) => `${(25 + 0.4 * visc).toFixed(1)}% chance to avoid traps`,
    baseChance: 25,
    viscScale: 0.4,
    color: '#06b6d4',
    monster: 'swampStrider',
    elementBonus: { water: 3 },
  },
  ethereal: {
    name: 'Ethereal',
    icon: '👻',
    stat: 'slipperiness',
    bonus: 3,
    passive: 'ethereal',
    passiveDesc: (visc) => `${(10 + 0.5 * visc).toFixed(1)}% chance to phase through damage`,
    baseChance: 10,
    viscScale: 0.5,
    color: '#8b5cf6',
    monster: 'wilOWisp',
    elementBonus: { fire: 3 },
  },
  theTouch: {
    name: 'The Touch',
    icon: '🐌',
    stat: 'viscosity',
    bonus: 4,
    passive: 'theTouch',
    passiveDesc: (visc) => `${(1 + 0.15 * visc).toFixed(2)}% instant kill chance`,
    baseChance: 1,
    viscScale: 0.15,
    color: '#fbbf24',
    monster: 'theSnail',
    elementBonus: null,
  },

  // === CRYSTAL GROTTO MUTATIONS ===
  lifesteal: {
    name: 'Lifesteal',
    icon: '🦇',
    stat: 'viscosity',
    bonus: 2,
    passive: 'lifesteal',
    passiveDesc: (visc) => `${(10 + 0.2 * visc).toFixed(1)}% of damage heals you`,
    baseChance: 10,
    viscScale: 0.2,
    color: '#dc2626',
    monster: 'vampireBat',
    elementBonus: null,
  },
  sloughSkin: {
    name: 'Slough Skin',
    icon: '🪱',
    stat: 'firmness',
    bonus: 3,
    passive: 'sloughSkin',
    passiveDesc: (visc) => `${(25 + 0.5 * visc).toFixed(1)}% chance to remove debuff`,
    baseChance: 25,
    viscScale: 0.5,
    color: '#a16207',
    monster: 'rockWorm',
    elementBonus: { earth: 5 },
  },
  blindingPowder: {
    name: 'Blinding Powder',
    icon: '✨',
    stat: 'slipperiness',
    bonus: 3,
    passive: 'blindingPowder',
    passiveDesc: (visc) => `${(10 + 0.25 * visc).toFixed(1)}% chance enemy misses`,
    baseChance: 10,
    viscScale: 0.25,
    color: '#fcd34d',
    monster: 'coalSprite',
    elementBonus: { earth: 3 },
  },
  dropIn: {
    name: 'Drop In',
    icon: '⬇️',
    stat: 'firmness',
    bonus: 3,
    passive: 'dropIn',
    passiveDesc: (visc) => `First attack: +${(10 + 0.5 * visc).toFixed(1)}% damage`,
    baseValue: 10,
    viscScale: 0.5,
    color: '#6b7280',
    monster: 'stalagMite',
    elementBonus: { earth: 5 },
  },
  bejeweled: {
    name: 'Bejeweled',
    icon: '💎',
    stat: 'viscosity',
    bonus: 3,
    passive: 'bejeweled',
    passiveDesc: (visc) => `+${(25 + 0.2 * visc).toFixed(1)}% personal biomass gain`,
    baseValue: 25,
    viscScale: 0.2,
    color: '#3b82f6',
    monster: 'sapphireNewt',
    elementBonus: { water: 8 },
  },

  // === CINDERSPIRE MUTATIONS ===
  regenerate: {
    name: 'Regenerate',
    icon: '💚',
    stat: 'viscosity',
    bonus: 3,
    passive: 'regenerate',
    passiveDesc: (visc) => `Heal ${(2 + 0.3 * visc).toFixed(1)} HP per round`,
    baseValue: 2,
    viscScale: 0.3,
    color: '#22c55e',
    monster: 'embermander',
    elementBonus: { fire: 5 },
  },
  alloyPotential: {
    name: 'Alloy Potential',
    icon: '🤖',
    stat: 'firmness',
    bonus: 2,
    passive: 'alloyPotential',
    passiveDesc: () => 'Unlocks +2 mutation slots',
    special: 'extraSlots',
    extraSlots: 2,
    color: '#94a3b8',
    monster: 'animatedAlloy',
    elementBonus: { earth: 3 },
  },
  pyrolyze: {
    name: 'Pyrolyze',
    affinity: 'fire',          // scales with fire affinity
    icon: '🔥',
    stat: 'viscosity',
    bonus: 3,
    passive: 'pyrolyze',
    passiveDesc: (visc) => `${(15 + 0.3 * visc).toFixed(1)}% chance to Burn`,
    baseChance: 15,
    viscScale: 0.3,
    color: '#f97316',
    monster: 'magmaOoze',
    elementBonus: { fire: 5 },
  },
  ghastlyWail: {
    name: 'Ghastly Wail',
    icon: '💀',
    stat: 'viscosity',
    bonus: 3,
    passive: 'ghastlyWail',
    passiveDesc: (visc) => `${(15 + 0.3 * visc).toFixed(1)}% chance to stun (enemy skips round)`,
    baseChance: 15,
    viscScale: 0.3,
    color: '#6b7280',
    monster: 'burntSpirit',
    elementBonus: null,
  },
  draconicPower: {
    name: 'Draconic Power',
    affinity: 'fire',          // scales with fire affinity
    icon: '🐲',
    stat: 'firmness',
    bonus: 3,
    passive: 'draconicPower',
    passiveDesc: (visc) => `+${(3 + 0.15 * visc).toFixed(1)} to all base stats`,
    baseValue: 3,
    viscScale: 0.15,
    color: '#dc2626',
    monster: 'wyrm',
    elementBonus: { fire: 10 },
  },

  // === STORMSPIRE SUMMIT MUTATIONS ===
  chainLightning: {
    name: 'Chain Lightning',
    icon: '⚡',
    stat: 'slipperiness',
    bonus: 3,
    passive: 'chainLightning',
    passiveDesc: (visc) => `+${(15 + 0.3 * visc).toFixed(1)}% dmg with 3+ party`,
    baseValue: 15,
    viscScale: 0.3,
    color: '#fbbf24',
    monster: 'thunderHawk',
    elementBonus: null,
  },
  earthshaker: {
    name: 'Earthshaker',
    affinity: 'earth',          // scales with earth affinity
    icon: '👹',
    stat: 'firmness',
    bonus: 4,
    passive: 'earthshaker',
    passiveDesc: (visc) => `${(10 + 0.3 * visc).toFixed(1)}% chance to stun 1 round`,
    baseChance: 10,
    viscScale: 0.3,
    color: '#a16207',
    monster: 'boulderTroll',
    elementBonus: { earth: 5 },
  },
  charged: {
    name: 'Charged',
    icon: '🔋',
    stat: 'slipperiness',
    bonus: 3,
    passive: 'charged',
    passiveDesc: (visc) => `+${(15 + 0.3 * visc).toFixed(1)}% crit damage`,
    baseValue: 15,
    viscScale: 0.3,
    color: '#3b82f6',
    monster: 'stormElemental',
    elementBonus: { water: 5 },
  },
  permafrost: {
    name: 'Permafrost',
    affinity: 'water',          // scales with water affinity
    icon: '❄️',
    stat: 'viscosity',
    bonus: 3,
    passive: 'permafrost',
    passiveDesc: (visc) => `${(12 + 0.3 * visc).toFixed(1)}% chance to Weaken (enemy -25% dmg)`,
    baseChance: 12,
    viscScale: 0.3,
    color: '#06b6d4',
    monster: 'frostGiant',
    elementBonus: { water: 5 },
  },
  stormcaller: {
    name: 'Stormcaller',
    icon: '🌩️',
    stat: 'slipperiness',
    bonus: 4,
    passive: 'stormcaller',
    passiveDesc: (visc) => `+${(10 + 0.25 * visc).toFixed(1)}% crit for whole party`,
    baseValue: 10,
    viscScale: 0.25,
    color: '#8b5cf6',
    monster: 'thunderbird',
    elementBonus: null,
  },

  // === VOID ABYSS MUTATIONS ===
  consume: {
    name: 'Consume',
    icon: '🦑',
    stat: 'firmness',
    bonus: 3,
    passive: 'consume',
    passiveDesc: (visc) => `+${(2 + 0.2 * visc).toFixed(1)} random stat on kill (max 5)`,
    baseValue: 2,
    viscScale: 0.2,
    color: '#4c1d95',
    monster: 'voidTendril',
    elementBonus: null,
  },
  allSeeing: {
    name: 'All-Seeing',
    icon: '👁️',
    stat: 'slipperiness',
    bonus: 4,
    passive: 'allSeeing',
    passiveDesc: (visc) => `Cannot be crit, +${(5 + 0.2 * visc).toFixed(1)}% dodge`,
    baseValue: 5,
    viscScale: 0.2,
    color: '#7c3aed',
    monster: 'abyssalWatcher',
    elementBonus: null,
  },
  nullify: {
    name: 'Nullify',
    icon: '🔳',
    stat: 'viscosity',
    bonus: 4,
    passive: 'nullify',
    passiveDesc: (visc) => `${(50 + 0.5 * visc).toFixed(0)}% reduced status duration`,
    baseValue: 50,
    viscScale: 0.5,
    color: '#374151',
    monster: 'nullConstruct',
    elementBonus: null,
  },
  fracture: {
    name: 'Fracture',
    icon: '💥',
    stat: 'firmness',
    bonus: 3,
    passive: 'fracture',
    passiveDesc: (visc) => `On death: deal ${(50 + visc).toFixed(0)}% max HP as dmg`,
    baseValue: 50,
    viscScale: 1,
    color: '#dc2626',
    monster: 'realityShard',
    elementBonus: null,
  },
  voidTouched: {
    name: 'Void Touched',
    icon: '🕳️',
    stat: 'viscosity',
    bonus: 5,
    passive: 'voidTouched',
    passiveDesc: (visc) => `+${(10 + 0.4 * visc).toFixed(1)}% dmg, ignores resist`,
    baseValue: 10,
    viscScale: 0.4,
    color: '#0f0f23',
    monster: 'hollowOne',
    elementBonus: null,
  },

  // The secret one. Only Old Gullet carries it, and it always gives it up.
  firstStomach: {
    name: 'First Stomach',
    affinity: 'nature',
    icon: '🥣',
    stat: 'viscosity',
    bonus: 3,
    passive: 'firstStomach',
    passiveDesc: (visc) => `Every kill feeds the whole party: +${(10 + 0.3 * visc).toFixed(1)}% biomass, and this slime mends ${((10 + 0.3 * visc) / 2).toFixed(1)}% of its health`,
    baseValue: 10,
    viscScale: 0.3,
    color: '#15803d',
    monster: 'oldGullet',
    elementBonus: { nature: 10 },
  },
};

// Backward compatibility alias - will be removed in future
export const TRAIT_LIBRARY = MUTATION_LIBRARY;

// Status effects that can be applied in combat
// dur is measured in ROUNDS.
//   dmg        damage per round
//   skipsTurn  the carrier loses their action
//   dmgMult    multiplier on the carrier's OUTGOING damage
//   speedMult  multiplier on the carrier's effective slipperiness
//   harmful    eligible for cleansing (Slough Skin); false for buffs
// The three damage-over-time statuses used to be the same status with three
// different numbers on it. Each now does one thing the others do not:
//
//   Poison  corrodes — everything hits the target harder while it lasts
//   Burn    sears    — the target cannot heal at all while it burns
//   Bleed   stacks   — each new wound deepens it instead of refreshing it
//
// They apply both ways: a slime poisoned by a Venom Bite takes more damage, and
// a slime set alight by a Fireball stops regenerating.
export const STATUS_EFFECTS = {
  poison:   { name: 'Poison',   icon: '🧪', color: '#22c55e', dmg: 2, dur: 5, harmful: true,
              dmgTakenMult: 1.25,
              desc: 'Corrodes: takes 25% more damage from everything' },
  burn:     { name: 'Burn',     icon: '🔥', color: '#f97316', dmg: 3, dur: 4, harmful: true,
              noHeal: true,
              desc: "Sears: can't heal at all. No regeneration, lifesteal or healing" },
  bleed:    { name: 'Bleed',    icon: '🩸', color: '#ef4444', dmg: 3, dur: 3, harmful: true,
              maxStacks: 4,
              desc: 'Deepens: each new cut adds a stack, up to 4' },
  stun:     { name: 'Stun',     icon: '💫', color: '#fbbf24', dmg: 0, dur: 1, harmful: true, skipsTurn: true,
              desc: 'Loses its next turn' },
  weakened: { name: 'Weakened', icon: '⬇️', color: '#6b7280', dmg: 0, dur: 2, harmful: true, dmgMult: 0.75,
              desc: 'Deals 25% less damage' },
  slowed:   { name: 'Slowed',   icon: '🕸️', color: '#94a3b8', dmg: 0, dur: 2, harmful: true, speedMult: 0.5,
              desc: 'Half slipperiness: acts later and dodges less' },
  enraged:  { name: 'Enraged',  icon: '😤', color: '#f97316', dmg: 0, dur: 2, harmful: false, dmgMult: 1.5,
              desc: 'Deals 50% more damage' },
};

// ── Personality traits ───────────────────────────────────────────────────────
//
// Traits used to be small percentages: "+5% damage", "+3% max HP". On a basic
// slime with 5 Firmness and 45 HP that is a quarter of a point of damage and
// one hit point, and after rounding it was usually nothing at all.
//
// Now each trait is an AFFIX with a fixed value per tier, written as flat
// numbers sized to that tier's real stats. A Hardy basic slime gets +8 HP on a
// 45 HP body; a Hardy royal gets +60 on 375. Both are about the same share of
// the slime, and both are numbers you can see on its card.
//
//   values   the main number, one per tier: [basic, enhanced, elite, royal],
//            or a single number when it does not depend on tier (chances)
//   values2  a second number where the trait has a drawback
//   desc     shown to the player; {v} and {w} are filled in with the numbers
//            for that slime's tier
export const SLIME_TRAITS = {
  // Common
  brave:     { name: 'Brave',     icon: '🦁', rarity: 'common',   title: ' the Brave',
               values: [2, 3, 5, 8],
               desc: '+{v} damage while below half health' },
  cautious:  { name: 'Cautious',  icon: '🛡️', rarity: 'common',   title: ' the Cautious',
               values: 15,
               desc: '+{v}% dodge while below half health' },
  hardy:     { name: 'Hardy',     icon: '💪', rarity: 'common',   title: ' the Mighty',
               values: [8, 18, 35, 60],
               desc: '+{v} max HP' },
  swift:     { name: 'Swift',     icon: '⚡', rarity: 'common',   title: ' the Swift',
               values: 8,
               desc: '+{v}% crit chance' },
  wise:      { name: 'Wise',      icon: '🧠', rarity: 'common',   title: ' the Wise',
               values: 25,
               desc: 'Soaks up elements {v}% faster' },

  // Uncommon
  lucky:     { name: 'Lucky',     icon: '🍀', rarity: 'uncommon', title: ' the Lucky',
               values: 6,
               desc: '+{v}% chance on every material drop' },
  greedy:    { name: 'Greedy',    icon: '💰', rarity: 'uncommon', title: ' the Greedy',
               values: [2, 3, 8, 18],
               desc: '+{v} biomass from every kill' },
  resilient: { name: 'Resilient', icon: '🔄', rarity: 'uncommon', title: ' the Resilient',
               values: [3, 6, 12, 22],
               desc: 'Heals {v} HP on every kill' },
  fierce:    { name: 'Fierce',    icon: '😤', rarity: 'uncommon', title: ' the Fierce',
               values: [4, 8, 14, 20],
               desc: '+{v} damage on its first hit of each fight' },

  // Common, with a catch
  lazy:      { name: 'Lazy',      icon: '😴', rarity: 'common',   title: ' the Lazy',
               values: 20,
               desc: 'Always acts last. Pools work {v}% better with it in them' },
  timid:     { name: 'Timid',     icon: '😰', rarity: 'common',   title: ' the Timid',
               values: 15, values2: [1, 2, 3, 5],
               desc: '+{v}% dodge, but -{w} damage' },
  curious:   { name: 'Curious',   icon: '🔍', rarity: 'common',   title: ' the Curious',
               values: 50,
               desc: 'Finds things on the road {v}% more often' },

  // Uncommon, with a catch
  reckless:  { name: 'Reckless',  icon: '💥', rarity: 'uncommon', title: ' the Reckless',
               values: [2, 3, 5, 8],
               desc: '+{v} damage dealt, and +{v} damage taken' },
  glutton:   { name: 'Glutton',   icon: '🍖', rarity: 'uncommon', title: ' the Glutton',
               values: 20, values2: [5, 10, 20, 35],
               desc: '+{v}% biomass from kills, but -{w} max HP' },

  // Rare (specific pools only)
  void:      { name: 'Void',      icon: '🕳️', rarity: 'rare', source: 'nullifier', title: ' the Void',
               desc: 'Never takes on an element' },
  adaptable: { name: 'Adaptable', icon: '🔀', rarity: 'rare', title: ' the Adaptable',
               values: 50,
               desc: 'Soaks up elements {v}% faster' },

  // Legendary (prisms only)
  ancient:   { name: 'Ancient',   icon: '📜', rarity: 'legendary', title: ' the Ancient',
               desc: '+1 mutation slot' },
  primordial:{ name: 'Primordial', icon: '🌟', rarity: 'legendary', title: ' the Primordial',
               values: [1, 2, 4, 6],
               desc: '+{v} to every stat' },
};

const TIER_ORDER = ['basic', 'enhanced', 'elite', 'royal'];

const pickTier = (vals, tier) => {
  if (vals == null) return 0;
  if (!Array.isArray(vals)) return vals;
  return vals[Math.max(0, TIER_ORDER.indexOf(tier))] ?? vals[0];
};

/** A trait's numbers for a slime of `tier`: { v, w }. */
export const traitValues = (traitOrId, tier) => {
  const def = typeof traitOrId === 'string' ? SLIME_TRAITS[traitOrId] : traitOrId;
  return { v: pickTier(def?.values, tier), w: pickTier(def?.values2, tier) };
};

/**
 * The trait's description with numbers filled in. With a tier, the numbers for
 * that tier; without one, every tier's number side by side ("2/3/5/8"), for the
 * Compendium.
 */
export const traitDesc = (traitOrId, tier = null) => {
  const def = typeof traitOrId === 'string' ? SLIME_TRAITS[traitOrId] : traitOrId;
  if (!def) return '';
  const fmt = (vals) => {
    if (tier) return String(pickTier(vals, tier));
    return Array.isArray(vals) ? vals.join('/') : String(vals ?? '');
  };
  return def.desc.replaceAll('{v}', fmt(def.values)).replaceAll('{w}', fmt(def.values2));
};

// Rarity colors for traits
export const TRAIT_RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#a855f7',
  legendary: '#f59e0b',
};

// ── Mutagen items ────────────────────────────────────────────────────────────
//
// One mutagen per mutation, dropped by that mutation's monster. The item is
// what the player collects and spends; the mutation is what it becomes.

export const mutagenName = (mutationId) => {
  const m = MUTATION_LIBRARY[mutationId];
  return m ? `${m.name} Mutagen` : 'Unknown Mutagen';
};

/** Every mutagen, with the monster that drops it. Used by the Stores screen. */
export const ALL_MUTAGENS = Object.entries(MUTATION_LIBRARY).map(([id, m]) => ({
  id,
  name: mutagenName(id),
  icon: m.icon,
  color: m.color,
  monster: m.monster,
}));

// Helper function to get mutation description with current VISC value
export const getMutationDesc = (mutationId, viscosity = 0) => {
  const mut = MUTATION_LIBRARY[mutationId];
  if (!mut) return '';
  if (typeof mut.passiveDesc === 'function') {
    return mut.passiveDesc(viscosity);
  }
  return mut.passiveDesc;
};
