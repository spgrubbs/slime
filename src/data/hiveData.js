// Hive Abilities - Activated with Pheromones
export const HIVE_ABILITIES = {
  hiveSense: {
    name: 'Hive Sense',
    icon: '👁️',
    desc: 'See all monster types in zones for 1 hour',
    cost: 10,
    duration: 3600000, // 1 hour
  },
  nurturingAura: {
    name: 'Nurturing Aura',
    icon: '💚',
    desc: 'Double ranch tick speed for 4 hours',
    cost: 25,
    duration: 14400000, // 4 hours
  },
  sharedVigor: {
    name: 'Shared Vigor',
    icon: '❤️‍🩹',
    desc: 'Expedition slimes regenerate 1 HP per minute',
    cost: 50,
    duration: 7200000, // 2 hours
  },
  evolutionPulse: {
    name: 'Evolution Pulse',
    icon: '⚡',
    desc: '+50% elemental affinity gain everywhere',
    cost: 100,
    duration: 28800000, // 8 hours
  },
  bountifulHarvest: {
    name: 'Bountiful Harvest',
    icon: '🌾',
    desc: '+25% biomass and material drops',
    cost: 75,
    duration: 14400000, // 4 hours
  },
};

// Prism Shop Items - Purchased with Prisms (Prismatic Cores)
export const PRISM_SHOP = {
  timeSkip1h: {
    name: 'Time Warp (1 hour)',
    icon: '⏰',
    desc: 'Advance all timers by 1 hour',
    cost: 1,
    requiresTarget: false,
  },
  timeSkip24h: {
    name: 'Time Warp (24 hours)',
    icon: '⏰',
    desc: 'Advance all timers by 24 hours',
    cost: 5,
    requiresTarget: false,
  },
  ancientTrait: {
    name: 'Ancient Essence',
    icon: '📜',
    desc: 'Grant Ancient trait to a slime (+1 mutation slot)',
    cost: 10,
    requiresTarget: true,
  },
  primordialTrait: {
    name: 'Primordial Essence',
    icon: '🌟',
    desc: 'Grant Primordial trait to a slime (+10% all stats)',
    cost: 20,
    requiresTarget: true,
  },
  mutationReset: {
    name: 'Mutation Reset',
    icon: '🔄',
    desc: 'Remove all mutations from a slime (refunds nothing)',
    cost: 3,
    requiresTarget: true,
  },
  elementReset: {
    name: 'Element Cleanse',
    icon: '💫',
    desc: 'Reset a slime\'s elemental affinities to zero',
    cost: 5,
    requiresTarget: true,
  },
  instantMutation: {
    name: 'Mutation Insight',
    icon: '🧬',
    desc: 'Instantly unlock a random locked mutation',
    cost: 15,
    requiresTarget: false,
  },
};

// Pheromone generation rate
export const PHEROMONE_UPDATE_INTERVAL = 60000; // Update every minute
export const PHEROMONES_PER_SLIME_PER_HOUR = 1;
