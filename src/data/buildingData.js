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
  defenseSlot: {
    name: 'Defense Slot',
    icon: '🎯',
    desc: '+1 Tower Defense party slot',
    cost: { biomass: 500, mats: { 'Ash Remnant': 5, 'Ancient Stone': 3 } },
    max: 4,                             // Reduced from 6
    category: 'capacity',
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
    desc: 'Unlock 100-enemy expeditions',
    cost: 1000,                         // Increased from 250
    time: 3600,                         // 1 hour
    max: 1,
    category: 'research',
  },
  infiniteExpedition: {
    name: 'Deep Exploration Hub',
    icon: '🌌',
    desc: 'Unlock infinite expeditions',
    cost: 2500,                         // Increased from 500
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
