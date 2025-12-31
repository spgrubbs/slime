// Mutation library - abilities learned by defeating monsters
// Mutations are unlocked by killing 100 of the associated monster type
export const MUTATION_LIBRARY = {
  wolfFang: {
    name: 'Wolf Fang',
    icon: '🐺',
    stat: 'firmness',
    bonus: 3,
    passive: 'ferocity',
    passiveDesc: '+15% damage',
    color: '#94a3b8',
    requiredKills: 100,
    monster: 'wolf',
    elementBonus: { nature: 5 }
  },
  goblinCunning: {
    name: 'Goblin Cunning',
    icon: '👺',
    stat: 'slipperiness',
    bonus: 3,
    passive: 'trickster',
    passiveDesc: '+8% dodge & crit',
    color: '#84cc16',
    requiredKills: 100,
    monster: 'goblin',
    elementBonus: { earth: 3 }
  },
  turtleShell: {
    name: 'Turtle Shell',
    icon: '🐢',
    stat: 'firmness',
    bonus: 5,
    passive: 'armored',
    passiveDesc: '-20% damage taken',
    color: '#65a30d',
    requiredKills: 100,
    monster: 'turtle',
    elementBonus: { water: 5 }
  },
  batWing: {
    name: 'Bat Wing',
    icon: '🦇',
    stat: 'slipperiness',
    bonus: 4,
    passive: 'echolocation',
    passiveDesc: '+12% dodge',
    color: '#6366f1',
    requiredKills: 100,
    monster: 'bat',
    elementBonus: null
  },
  boneArmor: {
    name: 'Bone Armor',
    icon: '💀',
    stat: 'firmness',
    bonus: 3,
    passive: 'undying',
    passiveDesc: 'Survive fatal blow once',
    color: '#d4d4d4',
    requiredKills: 100,
    monster: 'skeleton',
    elementBonus: null
  },
  ogreStrength: {
    name: 'Ogre Might',
    icon: '👹',
    stat: 'firmness',
    bonus: 6,
    passive: 'crushing',
    passiveDesc: '+30% crit damage',
    color: '#dc2626',
    requiredKills: 100,
    monster: 'ogre',
    elementBonus: { earth: 5 }
  },
  dragonHeart: {
    name: 'Dragon Heart',
    icon: '🐉',
    stat: 'viscosity',
    bonus: 5,
    passive: 'fireBreath',
    passiveDesc: 'Attacks apply Burn',
    color: '#f97316',
    requiredKills: 100,
    monster: 'dragon',
    elementBonus: { fire: 10 }
  },
  wispGlow: {
    name: 'Wisp Essence',
    icon: '✨',
    stat: 'viscosity',
    bonus: 4,
    passive: 'manaLeech',
    passiveDesc: '+10% biomass/kill',
    color: '#8b5cf6',
    requiredKills: 100,
    monster: 'wisp',
    elementBonus: null
  },
  venomSac: {
    name: 'Venom Sac',
    icon: '🧪',
    stat: 'viscosity',
    bonus: 3,
    passive: 'poison',
    passiveDesc: 'Attacks apply Poison',
    color: '#22c55e',
    requiredKills: 100,
    monster: 'snake',
    elementBonus: { nature: 5 }
  },
  crystalCore: {
    name: 'Crystal Core',
    icon: '💎',
    stat: 'firmness',
    bonus: 4,
    passive: 'reflect',
    passiveDesc: 'Reflect 15% damage',
    color: '#06b6d4',
    requiredKills: 100,
    monster: 'golem',
    elementBonus: { earth: 5 }
  },
  shadowCloak: {
    name: 'Shadow Cloak',
    icon: '🌑',
    stat: 'slipperiness',
    bonus: 5,
    passive: 'ambush',
    passiveDesc: 'First attack crits',
    color: '#1f2937',
    requiredKills: 100,
    monster: 'shade',
    elementBonus: null
  },
  phoenixFeather: {
    name: 'Phoenix Feather',
    icon: '🔥',
    stat: 'viscosity',
    bonus: 3,
    passive: 'rebirth',
    passiveDesc: 'Revive at 30% HP once',
    color: '#fb923c',
    requiredKills: 100,
    monster: 'phoenix',
    elementBonus: { fire: 10 }
  },
};

// Backward compatibility alias - will be removed in future
export const TRAIT_LIBRARY = MUTATION_LIBRARY;

// Status effects that can be applied in combat
export const STATUS_EFFECTS = {
  poison: { name: 'Poison', icon: '🧪', color: '#22c55e', dmg: 2, dur: 5 },
  burn: { name: 'Burn', icon: '🔥', color: '#f97316', dmg: 3, dur: 4 },
  bleed: { name: 'Bleed', icon: '🩸', color: '#ef4444', dmg: 4, dur: 3 },
};

// Personality traits - behavioral modifiers that slimes can acquire
// Separate from mutations (combat abilities)
// All traits now have titles for slime naming
export const SLIME_TRAITS = {
  // Common positive traits
  brave: { name: 'Brave', icon: '🦁', desc: '+5% damage when HP below 50%', rarity: 'common', title: ' the Brave' },
  cautious: { name: 'Cautious', icon: '🛡️', desc: '+5% dodge when HP below 50%', rarity: 'common', title: ' the Cautious' },
  hardy: { name: 'Hardy', icon: '💪', desc: '+3% max HP', rarity: 'common', title: ' the Mighty' },
  swift: { name: 'Swift', icon: '⚡', desc: '+3% crit chance', rarity: 'common', title: ' the Swift' },
  wise: { name: 'Wise', icon: '🧠', desc: '+5% element gain rate', rarity: 'common', title: ' the Wise' },

  // Uncommon positive traits
  lucky: { name: 'Lucky', icon: '🍀', desc: '+5% material drop rate', rarity: 'uncommon', title: ' the Lucky' },
  greedy: { name: 'Greedy', icon: '💰', desc: '+5% biomass gain', rarity: 'uncommon', title: ' the Greedy' },
  resilient: { name: 'Resilient', icon: '🔄', desc: 'Recover 1 HP per kill', rarity: 'uncommon', title: ' the Resilient' },
  fierce: { name: 'Fierce', icon: '😤', desc: '+8% damage on first attack', rarity: 'uncommon', title: ' the Fierce' },

  // Common neutral/negative traits (add flavor)
  lazy: { name: 'Lazy', icon: '😴', desc: '-5% damage, +10% ranch effectiveness', rarity: 'common', title: ' the Lazy' },
  timid: { name: 'Timid', icon: '😰', desc: '+10% dodge, -5% damage', rarity: 'common', title: ' the Timid' },
  curious: { name: 'Curious', icon: '🔍', desc: '+10% exploration event chance', rarity: 'common', title: ' the Curious' },

  // Uncommon mixed traits
  reckless: { name: 'Reckless', icon: '💥', desc: '+10% damage, +5% damage taken', rarity: 'uncommon', title: ' the Reckless' },
  glutton: { name: 'Glutton', icon: '🍖', desc: '+10% biomass gain, -3% max HP', rarity: 'uncommon', title: ' the Glutton' },

  // Rare traits (from specific ranches only)
  void: { name: 'Void', icon: '🕳️', desc: 'Cannot gain elemental affinity', rarity: 'rare', source: 'nullifier', title: ' the Void' },
  adaptable: { name: 'Adaptable', icon: '🔀', desc: '+50% elemental affinity gain', rarity: 'rare', title: ' the Adaptable' },

  // Legendary traits (premium currency only)
  ancient: { name: 'Ancient', icon: '📜', desc: '+1 mutation slot', rarity: 'legendary', title: ' the Ancient' },
  primordial: { name: 'Primordial', icon: '🌟', desc: '+10% all stats', rarity: 'legendary', title: ' the Primordial' },
};

// Rarity colors for traits
export const TRAIT_RARITY_COLORS = {
  common: '#9ca3af',
  uncommon: '#22c55e',
  rare: '#a855f7',
  legendary: '#f59e0b',
};
