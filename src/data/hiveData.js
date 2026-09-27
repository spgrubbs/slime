// Pheromones: timed abilities, paid for in musk (`mana` in code)
export const HIVE_ABILITIES = {
  spawnBoost: {
    name: 'Primal Blessing',
    icon: '🌟',
    desc: 'Slimes budded while this lasts start with 10% higher stats',
    cost: 15,
    duration: 7200000, // 2 hours
  },
  nurturingAura: {
    name: 'Nurturing Aura',
    icon: '💚',
    desc: 'Pools work twice as fast',
    cost: 25,
    duration: 14400000, // 4 hours
  },
  swiftExpedition: {
    name: 'Swift Expedition',
    icon: '🏃',
    desc: 'Parties fight and travel 50% faster, even while the game is closed',
    cost: 35,
    duration: 7200000, // 2 hours
  },
  sharedVigor: {
    name: 'Shared Vigor',
    icon: '❤️‍🩹',
    desc: 'Every slime out in the field mends 2 HP each round',
    cost: 50,
    duration: 7200000, // 2 hours
  },
  evolutionPulse: {
    name: 'Evolution Pulse',
    icon: '⚡',
    desc: 'We soak up elements 50% faster',
    cost: 100,
    duration: 28800000, // 8 hours
  },
  bountifulHarvest: {
    name: 'Bountiful Harvest',
    icon: '🌾',
    desc: '+25% biomass and material drops from kills',
    cost: 75,
    duration: 14400000, // 4 hours
  },
  decoy: {
    name: 'Slime Decoy',
    icon: '🎭',
    desc: 'If a party is wiped while this lasts, a decoy covers the retreat and what they carried comes home. Works once',
    cost: 40,
    duration: 86400000, // 24 hours (or until used)
    oneTimeUse: true, // Consumed when triggered
  },
};

// Prism Shop Items - Purchased with Prisms (Prismatic Cores)
export const PRISM_SHOP = {
  timeSkip1h: {
    name: 'Time Warp (1 hour)',
    icon: '⏰',
    desc: 'Pools and research jump ahead 1 hour',
    cost: 1,
    requiresTarget: false,
  },
  timeSkip24h: {
    name: 'Time Warp (24 hours)',
    icon: '⏰',
    desc: 'Pools and research jump ahead 24 hours',
    cost: 5,
    requiresTarget: false,
  },
  ancientTrait: {
    name: 'Ancient Essence',
    icon: '📜',
    desc: 'Give a slime the Ancient trait: +1 mutation slot',
    cost: 10,
    requiresTarget: true,
  },
  primordialTrait: {
    name: 'Primordial Essence',
    icon: '🌟',
    desc: 'Give a slime the Primordial trait: more of every stat, more for higher tiers',
    cost: 20,
    requiresTarget: true,
  },
  mutationReset: {
    name: 'Mutation Reset',
    icon: '🔄',
    desc: 'Strip every mutation off a slime. Nothing comes back',
    cost: 3,
    requiresTarget: true,
  },
  elementReset: {
    name: 'Element Cleanse',
    icon: '💫',
    desc: 'Wash a slime\'s elements back to zero',
    cost: 5,
    requiresTarget: true,
  },
  instantMutation: {
    name: 'Mutation Insight',
    icon: '🧬',
    desc: 'A random mutagen condenses out of the prism',
    cost: 15,
    requiresTarget: false,
  },
};

// Mana generation rate
export const MANA_UPDATE_INTERVAL = 60000; // Update every minute
export const MANA_PER_SLIME_PER_HOUR = 1;
