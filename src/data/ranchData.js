// Ranch System - Passive slime progression buildings
// Slimes assigned to ranches gain benefits over time

export const RANCH_TYPES = {
  feedingPool: {
    id: 'feedingPool',
    name: 'Feeding Pool',
    icon: '🥣',
    desc: 'A nutrient-rich pool where slimes passively absorb biomass.',
    effect: 'biomass',
    effectValue: 0.5, // biomass per cycle per slime
    cycleTime: 30, // seconds
    capacity: 3,
    unlock: { type: 'level', value: 3 },
    cost: { biomass: 50 },
    upgradeCost: { biomass: 100, multiplier: 2 },
    color: '#22c55e',
  },
  fireGrove: {
    id: 'fireGrove',
    name: 'Fire Grove',
    icon: '🔥',
    desc: 'A volcanic garden where slimes attune to fire energy.',
    effect: 'element',
    element: 'fire',
    effectValue: 0.3, // element affinity per cycle
    cycleTime: 45,
    capacity: 2,
    unlock: { type: 'level', value: 5 },
    cost: { biomass: 100, mats: { dragonScale: 3 } },
    upgradeCost: { biomass: 200, multiplier: 2 },
    color: '#ef4444',
  },
  tidalPool: {
    id: 'tidalPool',
    name: 'Tidal Pool',
    icon: '🌊',
    desc: 'A mystical pool connected to ocean currents. Attunes slimes to water.',
    effect: 'element',
    element: 'water',
    effectValue: 0.3,
    cycleTime: 45,
    capacity: 2,
    unlock: { type: 'level', value: 5 },
    cost: { biomass: 100, mats: { turtleShell: 3 } },
    upgradeCost: { biomass: 200, multiplier: 2 },
    color: '#3b82f6',
  },
  earthenDen: {
    id: 'earthenDen',
    name: 'Earthen Den',
    icon: '🪨',
    desc: 'A deep cavern filled with mineral-rich clay. Attunes slimes to earth.',
    effect: 'element',
    element: 'earth',
    effectValue: 0.3,
    cycleTime: 45,
    capacity: 2,
    unlock: { type: 'level', value: 5 },
    cost: { biomass: 100, mats: { crystalShard: 3 } },
    upgradeCost: { biomass: 200, multiplier: 2 },
    color: '#a16207',
  },
  verdantNest: {
    id: 'verdantNest',
    name: 'Verdant Nest',
    icon: '🌿',
    desc: 'A lush garden bursting with life energy. Attunes slimes to nature.',
    effect: 'element',
    element: 'nature',
    effectValue: 0.3,
    cycleTime: 45,
    capacity: 2,
    unlock: { type: 'level', value: 5 },
    cost: { biomass: 100, mats: { wolfPelt: 3 } },
    upgradeCost: { biomass: 200, multiplier: 2 },
    color: '#22c55e',
  },
  nullifier: {
    id: 'nullifier',
    name: 'Nullifier Chamber',
    icon: '🕳️',
    desc: 'A void-touched room that strips elemental affinity and grants the Void trait.',
    effect: 'trait',
    grantsTrait: 'void',
    effectValue: 1, // completes when element reaches 0
    cycleTime: 120,
    capacity: 1,
    unlock: { type: 'prisms', value: 50 },
    cost: { prisms: 25 },
    upgradeCost: { prisms: 50, multiplier: 2 },
    color: '#6b21a8',
  },
  trainingPit: {
    id: 'trainingPit',
    name: 'Training Pit',
    icon: '⚔️',
    desc: 'An arena where slimes spar to improve their base stats.',
    effect: 'stats',
    effectValue: 0.1, // stat points per cycle (distributed)
    cycleTime: 60,
    capacity: 4,
    unlock: { type: 'level', value: 8 },
    cost: { biomass: 200, mats: { bone: 5 } },
    upgradeCost: { biomass: 400, multiplier: 2 },
    color: '#dc2626',
  },
  luxuryLounge: {
    id: 'luxuryLounge',
    name: 'Luxury Lounge',
    icon: '✨',
    desc: 'A premium spa that has a chance to grant rare personality traits.',
    effect: 'trait',
    grantsTrait: null, // random from pool
    traitPool: ['lucky', 'resilient', 'adaptable'],
    effectValue: 0.05, // 5% chance per cycle to gain trait
    cycleTime: 180,
    capacity: 2,
    unlock: { type: 'prisms', value: 100 },
    cost: { prisms: 50 },
    upgradeCost: { prisms: 100, multiplier: 2 },
    color: '#f59e0b',
  },
};

// Random events that can occur during ranch cycles
export const RANCH_EVENTS = [
  // Positive events
  {
    id: 'bountifulHarvest',
    msg: 'A bountiful harvest! Extra biomass gained.',
    type: 'bonus',
    effect: 'biomass',
    value: 5,
    weight: 10,
    ranchTypes: ['feedingPool'],
  },
  {
    id: 'elementalSurge',
    msg: 'An elemental surge! Rapid affinity gain.',
    type: 'bonus',
    effect: 'elementBoost',
    value: 2, // multiplier
    weight: 8,
    ranchTypes: ['fireGrove', 'tidalPool', 'earthenDen', 'verdantNest'],
  },
  {
    id: 'friendlyRivalry',
    msg: 'A friendly rivalry breaks out! Enhanced training.',
    type: 'bonus',
    effect: 'statsBoost',
    value: 1.5,
    weight: 8,
    ranchTypes: ['trainingPit'],
  },
  {
    id: 'luckyFind',
    msg: 'The slime found something shiny!',
    type: 'bonus',
    effect: 'material',
    value: 1,
    weight: 5,
    ranchTypes: ['feedingPool', 'trainingPit'],
  },
  // Neutral/flavor events
  {
    id: 'napTime',
    msg: 'The slimes took a peaceful nap.',
    type: 'flavor',
    weight: 15,
    ranchTypes: null, // all ranches
  },
  {
    id: 'playTime',
    msg: 'The slimes spent time playing together.',
    type: 'flavor',
    weight: 15,
    ranchTypes: null,
  },
  {
    id: 'meditation',
    msg: 'A moment of quiet meditation.',
    type: 'flavor',
    weight: 10,
    ranchTypes: ['nullifier', 'luxuryLounge'],
  },
  // Negative events (rare)
  {
    id: 'disruption',
    msg: 'A disturbance disrupted the session. Reduced gains.',
    type: 'penalty',
    effect: 'reducedGains',
    value: 0.5, // multiplier
    weight: 3,
    ranchTypes: null,
  },
];

// Ranch upgrade effects per level
export const RANCH_UPGRADE_BONUSES = {
  capacity: 1, // +1 capacity per upgrade
  effectMultiplier: 0.25, // +25% effect per upgrade
  cycleReduction: 0.1, // -10% cycle time per upgrade (min 50%)
};

// Maximum ranch level
export const MAX_RANCH_LEVEL = 5;
