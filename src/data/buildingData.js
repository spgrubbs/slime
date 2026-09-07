// Building definitions - structures to construct
// BALANCE: Buildings are progression gates and should take time to acquire
// Slime tier unlocks are building-gated, not level-gated
// Slime Pit is late-game and requires human materials

export const BUILDINGS = {
  // === SLIME TIER UNLOCK BUILDINGS ===
  // These gate access to higher tier slimes

  spawningVat: {
    name: 'Spawning Vat',
    icon: '🧫',
    desc: 'Enables spawning of Enhanced slimes',
    cost: { biomass: 200, mats: { 'Wolf Pelt': 5, 'Spider Silk': 5 } },
    max: 1,
    category: 'tier',
  },
  royalHatchery: {
    name: 'Royal Hatchery',
    icon: '🥚',
    desc: 'Enables spawning of Elite slimes',
    cost: { biomass: 800, mats: { 'Snail Shell': 3, 'Mana Crystal': 5 } },
    max: 1,
    category: 'tier',
  },
  primordialChamber: {
    name: 'Primordial Chamber',
    icon: '👑',
    desc: 'Enables spawning of Royal slimes',
    cost: { biomass: 3000, mats: { 'Wyrm Scale': 2, 'Void Essence': 5, 'Storm Core': 3 } },
    max: 1,
    category: 'tier',
  },

  // === CAPACITY BUILDINGS ===
  // These increase slime/jelly capacity

  slimePit: {
    name: 'Slime Pit',
    icon: '🕳️',
    desc: '+10 max Royal Jelly capacity',
    cost: { biomass: 1500, mats: { 'Human Bone': 8, 'Iron Sword': 5 } }, // Now requires human materials!
    max: 5,                             // Can build multiple
    category: 'capacity',
  },
  ambushSlot: {
    name: 'Ambush Post',
    icon: '🎯',
    desc: '+1 slime in the caravan ambush squad',
    cost: { biomass: 500, mats: { 'Ash Remnant': 5, 'Ancient Stone': 3 } },
    max: 4,
    category: 'capacity',
  },

  slimeCatapult: {
    name: 'Slime Catapult',
    icon: '🪃',
    desc: 'A road emplacement that lobs slimes at passing caravans every round',
    cost: { biomass: 1200, mats: { 'Ancient Stone': 6, 'Iron Ore': 4, 'Human Bone': 3 } },
    max: 4,
    category: 'utility',
    skillUnlock: 'siegeEngineering',
  },

  renderingVat: {
    name: 'Rendering Vat',
    icon: '⚗️',
    desc: 'Recover mutagens from a reabsorbed slime instead of losing them',
    cost: { biomass: 4000, mats: { 'Void Essence': 3, 'Champion Badge': 1, 'Mana Crystal': 8 } },
    max: 2,                             // tier 1 recovers half, tier 2 all of it
    category: 'utility',
    skillUnlock: 'renderingVat',
  },

  scoutCamp: {
    name: 'Scout Camp',
    icon: '🔭',
    desc: 'Scouts read the road: see tomorrow\'s caravan before you commit to it',
    cost: { biomass: 900, mats: { 'Human Bone': 4, 'Spider Silk': 6 } },
    max: 1,
    category: 'utility',
  },

  // === UTILITY BUILDINGS ===
  // These provide various bonuses

  researchLab: {
    name: 'Research Chamber',
    icon: '🔬',
    desc: '+25% research speed',
    cost: { biomass: 400, mats: { 'Mana Crystal': 3, 'Crystal Shard': 5 } },
    max: 1,
    category: 'utility',
  },
  biomassReclaimer: {
    name: 'Biomass Reclaimer',
    icon: '♻️',
    desc: 'Recover biomass when slimes die: Tier 1 = 25%, Tier 2 = 50%, Tier 3 = 75%',
    cost: { biomass: 600, mats: { 'Life Essence': 3, 'Digestive Sac': 5 } },
    upgradeCost: { biomass: 2000, mats: { 'Life Essence': 8, 'Fairy Dust': 3 }, multiplier: 3 },
    max: 3,
    category: 'utility',
    recoveryPerTier: 0.25, // 25% per tier
  },

  // === RESEARCH UPGRADES ===
  // These are permanent upgrades researched with biomass

  efficientDigestion: {
    name: 'Biomass Pools',
    icon: '🧪',
    desc: '+20% biomass gain from kills',
    cost: 150,                          // Increased from 50
    time: 600,                          // 10 minutes real-time (now in real seconds)
    max: 1,
    category: 'research',
  },
  enhancedAbsorption: {
    name: 'Absorption Nexus',
    icon: '🔮',
    desc: '+25% biomass when reabsorbing slimes',
    cost: 300,                          // Increased from 100
    time: 1200,                         // 20 minutes
    max: 1,
    category: 'research',
  },
  slimeVitality: {
    name: 'Vitality Chamber',
    icon: '💗',
    desc: '+15% max HP for all slimes',
    cost: 500,                          // Increased from 150
    time: 1800,                         // 30 minutes
    max: 1,
    category: 'research',
  },
  swiftSlimes: {
    name: 'Training Arena',
    icon: '⚔️',
    desc: '+20% attack frequency in combat',
    cost: 750,                          // Increased from 200
    time: 2400,                         // 40 minutes
    max: 1,
    category: 'research',
  },
  extendedExpedition: {
    name: 'Expedition Depot',
    icon: '🗺️',
    desc: 'Parties travel between encounters 40% faster',
    cost: 1000,
    time: 3600,                         // 1 hour
    max: 1,
    category: 'research',
  },
  infiniteExpedition: {
    name: 'Deep Exploration Hub',
    icon: '🌌',
    desc: '+25% material drops on expeditions',
    cost: 2500,
    time: 7200,                         // 2 hours
    max: 1,
    category: 'research',
  },
};

// Backward compatibility alias
export const RESEARCH = {
  efficientDigestion: BUILDINGS.efficientDigestion,
  enhancedAbsorption: BUILDINGS.enhancedAbsorption,
  slimeVitality: BUILDINGS.slimeVitality,
  swiftSlimes: BUILDINGS.swiftSlimes,
  extendedExpedition: BUILDINGS.extendedExpedition,
  infiniteExpedition: BUILDINGS.infiniteExpedition,
};
