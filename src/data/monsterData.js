// Monster type definitions
// BALANCE: Monsters are zone-exclusive with similar difficulty per zone
// Each zone has 2 monsters of comparable stats
// Elements: fire, water, nature, earth, or null (neutral)

export const MONSTER_TYPES = {
  // === ZONE 1: Dark Forest (Beginner) ===
  // Weak monsters - basic slimes should struggle but survive with attention
  wolf: {
    name: 'Wolf',
    icon: '🐺',
    tier: 1,
    hp: 30,
    dmg: 5,        // Increased from 4 - threatens weak slimes
    biomass: 3,    // Reduced from 5
    mats: ['Wolf Fang', 'Wolf Pelt'],
    trait: 'wolfFang',
    drop: 0.02,
    abilities: ['Can apply Bleed'],
    element: 'nature',
  },
  bat: {
    name: 'Cave Bat',
    icon: '🦇',
    tier: 1,
    hp: 20,        // Reduced from 25
    dmg: 4,        // Increased from 3
    biomass: 2,    // Reduced from 4
    mats: ['Bat Wing', 'Echo Crystal'],
    trait: 'batWing',
    drop: 0.025,
    abilities: ['Fast attacks'],
    element: null,
  },

  // === ZONE 2: Poison Swamp (Early) ===
  // Moderate difficulty - requires some investment
  snake: {
    name: 'Venom Snake',
    icon: '🐍',
    tier: 2,
    hp: 35,        // Increased from 30
    dmg: 6,        // Increased from 5
    biomass: 5,    // Reduced from 9
    mats: ['Snake Scale', 'Venom Gland'],
    trait: 'venomSac',
    drop: 0.02,
    abilities: ['Poisons on hit'],
    element: 'nature',
  },
  goblin: {
    name: 'Goblin',
    icon: '👺',
    tier: 2,
    hp: 30,        // Reduced from 35
    dmg: 7,        // Increased from 6
    biomass: 5,    // Reduced from 8
    mats: ['Goblin Ear', 'Crude Iron'],
    trait: 'goblinCunning',
    drop: 0.02,
    abilities: ['High dodge'],
    element: 'earth',
  },

  // === ZONE 3: Crystal Caves (Mid-Early) ===
  // Challenging - requires enhanced slimes or well-invested basics
  skeleton: {
    name: 'Skeleton',
    icon: '💀',
    tier: 3,
    hp: 45,
    dmg: 8,
    biomass: 7,
    mats: ['Bone Dust', 'Soul Fragment'],
    trait: 'boneArmor',
    drop: 0.018,
    abilities: ['Immune to Poison'],
    element: 'earth',
  },
  turtle: {
    name: 'Giant Turtle',
    icon: '🐢',
    tier: 3,
    hp: 80,        // Reduced from 120
    dmg: 6,        // Increased from 5
    biomass: 8,    // Reduced from 12
    mats: ['Turtle Shell', 'Ancient Stone'],
    trait: 'turtleShell',
    drop: 0.015,
    abilities: ['Very tanky'],
    element: 'water',
  },

  // === ZONE 4: Shadow Ruins (Mid) ===
  // Tough enemies - requires elite slimes or strong enhanced
  wisp: {
    name: 'Magic Wisp',
    icon: '✨',
    tier: 4,
    hp: 50,
    dmg: 10,
    biomass: 10,
    mats: ['Wisp Essence', 'Mana Crystal'],
    trait: 'wispGlow',
    drop: 0.015,
    abilities: ['Magic damage'],
    element: null,
  },
  shade: {
    name: 'Shadow Shade',
    icon: '👤',
    tier: 4,
    hp: 45,        // Increased from 40
    dmg: 12,       // Reduced from 15
    biomass: 10,   // Reduced from 14
    mats: ['Shadow Wisp', 'Dark Essence'],
    trait: 'shadowCloak',
    drop: 0.015,
    abilities: ['High dodge', 'Ambush'],
    element: null,
  },

  // === ZONE 5: Ogre Peaks (Late) ===
  // Very difficult - requires royal or well-invested elite slimes
  golem: {
    name: 'Crystal Golem',
    icon: '🗿',
    tier: 5,
    hp: 120,       // Reduced from 180
    dmg: 12,
    biomass: 15,   // Reduced from 18
    mats: ['Crystal Shard', 'Golem Core'],
    trait: 'crystalCore',
    drop: 0.012,
    abilities: ['Very tanky', 'Reflects damage'],
    element: 'earth',
  },
  ogre: {
    name: 'Ogre',
    icon: '👹',
    tier: 5,
    hp: 100,       // Reduced from 200
    dmg: 16,       // Reduced from 18
    biomass: 18,   // Reduced from 25
    mats: ['Ogre Hide', 'Ogre Club'],
    trait: 'ogreStrength',
    drop: 0.012,
    abilities: ['Massive damage', 'Stun chance'],
    element: 'earth',
  },

  // === ZONE 6: Dragon Volcano (End-Game) ===
  // Extremely difficult - requires fully invested royal slimes
  phoenix: {
    name: 'Phoenix',
    icon: '🔥',
    tier: 6,
    hp: 100,       // Reduced from 150
    dmg: 18,       // Reduced from 20
    biomass: 25,   // Reduced from 35
    mats: ['Phoenix Ash', 'Ember Core'],
    trait: 'phoenixFeather',
    drop: 0.01,
    abilities: ['Burns', 'Revives once at 50% HP'],
    element: 'fire',
  },
  dragon: {
    name: 'Young Dragon',
    icon: '🐉',
    tier: 6,
    hp: 180,       // Reduced from 350
    dmg: 22,       // Reduced from 25
    biomass: 35,   // Reduced from 50
    mats: ['Dragon Scale', 'Dragon Bone'],
    trait: 'dragonHeart',
    drop: 0.008,
    abilities: ['Burns', 'Fire breath', 'Flying'],
    element: 'fire',
  },
};

// Zone tier to recommended slime tier mapping (for UI hints)
export const ZONE_DIFFICULTY = {
  1: { recommended: 'basic', minStats: 4 },
  2: { recommended: 'basic', minStats: 6 },
  3: { recommended: 'enhanced', minStats: 8 },
  4: { recommended: 'enhanced', minStats: 10 },
  5: { recommended: 'elite', minStats: 14 },
  6: { recommended: 'royal', minStats: 18 },
};
