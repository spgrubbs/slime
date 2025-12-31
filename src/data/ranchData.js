// Ranch System - Passive slime progression buildings
// BALANCE: Designed for idle gameplay with 3-4 visits per day
// Slimes assigned to ranches accumulate rewards over time (max 24h)
// Rewards are applied when slimes are removed from the ranch
// Cycle times are in REAL SECONDS (not game ticks)

export const RANCH_MAX_ACCUMULATION_TIME = 24 * 60 * 60; // 24 hours in seconds

export const RANCH_TYPES = {
  feedingPool: {
    id: 'feedingPool',
    name: 'Feeding Pool',
    icon: '🥣',
    desc: 'A nutrient-rich pool where slimes passively absorb biomass.',
    effect: 'biomass',
    effectValue: 2,                     // Biomass gained per cycle
    cycleTime: 30 * 60,                 // 30 minutes (in real seconds)
    capacity: 3,
    unlock: { type: 'level', value: 3 },
    cost: { biomass: 100 },             // Increased from 50
    upgradeCost: { biomass: 250, multiplier: 2 },
    color: '#22c55e',
  },
  fireGrove: {
    id: 'fireGrove',
    name: 'Fire Grove',
    icon: '🔥',
    desc: 'A volcanic garden where slimes attune to fire energy.',
    effect: 'element',
    element: 'fire',
    effectValue: 1,                     // Element affinity gained per cycle
    cycleTime: 60 * 60,                 // 1 hour
    capacity: 2,
    unlock: { type: 'materials' },
    cost: { biomass: 500, mats: { 'Phoenix Ash': 2, 'Ember Core': 1 } },
    upgradeCost: { biomass: 800, multiplier: 2 },
    color: '#ef4444',
  },
  tidalPool: {
    id: 'tidalPool',
    name: 'Tidal Pool',
    icon: '🌊',
    desc: 'A mystical pool connected to ocean currents. Attunes slimes to water.',
    effect: 'element',
    element: 'water',
    effectValue: 1,
    cycleTime: 60 * 60,                 // 1 hour
    capacity: 2,
    unlock: { type: 'materials' },
    cost: { biomass: 500, mats: { 'Turtle Shell': 3, 'Ancient Stone': 2 } },
    upgradeCost: { biomass: 800, multiplier: 2 },
    color: '#3b82f6',
  },
  earthenDen: {
    id: 'earthenDen',
    name: 'Earthen Den',
    icon: '🪨',
    desc: 'A deep cavern filled with mineral-rich clay. Attunes slimes to earth.',
    effect: 'element',
    element: 'earth',
    effectValue: 1,
    cycleTime: 60 * 60,                 // 1 hour
    capacity: 2,
    unlock: { type: 'materials' },
    cost: { biomass: 500, mats: { 'Crystal Shard': 2, 'Golem Core': 1 } },
    upgradeCost: { biomass: 800, multiplier: 2 },
    color: '#a16207',
  },
  verdantNest: {
    id: 'verdantNest',
    name: 'Verdant Nest',
    icon: '🌿',
    desc: 'A lush garden bursting with life energy. Attunes slimes to nature.',
    effect: 'element',
    element: 'nature',
    effectValue: 1,
    cycleTime: 60 * 60,                 // 1 hour
    capacity: 2,
    unlock: { type: 'materials' },
    cost: { biomass: 500, mats: { 'Wolf Pelt': 5, 'Snake Scale': 3 } },
    upgradeCost: { biomass: 800, multiplier: 2 },
    color: '#16a34a',
  },
  trainingPit: {
    id: 'trainingPit',
    name: 'Training Pit',
    icon: '⚔️',
    desc: 'An arena where slimes spar to add bonus stats.',
    effect: 'stats',
    effectValue: 0.5,                   // Base stat point bonus per cycle
    cycleTime: 2 * 60 * 60,             // 2 hours
    capacity: 4,
    unlock: { type: 'materials' },
    cost: { biomass: 1000, mats: { 'Bone Dust': 8, 'Ogre Hide': 3 } },
    upgradeCost: { biomass: 1500, multiplier: 2 },
    color: '#dc2626',
  },
  nullifier: {
    id: 'nullifier',
    name: 'Nullifier Chamber',
    icon: '🕳️',
    desc: 'A void-touched room that strips elemental affinity and grants the Void trait.',
    effect: 'trait',
    grantsTrait: 'void',
    effectValue: 1,
    cycleTime: 4 * 60 * 60,             // 4 hours
    capacity: 1,
    unlock: { type: 'prisms', value: 50 },
    cost: { prisms: 25 },
    upgradeCost: { prisms: 50, multiplier: 2 },
    color: '#6b21a8',
  },
  luxuryLounge: {
    id: 'luxuryLounge',
    name: 'Luxury Lounge',
    icon: '✨',
    desc: 'A premium spa that has a chance to grant rare personality traits.',
    effect: 'trait',
    grantsTrait: null,
    traitPool: ['lucky', 'resilient', 'adaptable'],
    effectValue: 0.08,                  // 8% chance per cycle
    cycleTime: 6 * 60 * 60,             // 6 hours
    capacity: 2,
    unlock: { type: 'prisms', value: 100 },
    cost: { prisms: 50 },
    upgradeCost: { prisms: 100, multiplier: 2 },
    color: '#f59e0b',
  },
};

// Random events that can occur during ranch cycles
// Weight determines relative frequency (higher = more common)
export const RANCH_EVENTS = [
  {
    id: 'bountifulHarvest',
    msg: 'A bountiful harvest! Extra biomass gained.',
    type: 'bonus',
    effect: 'biomass',
    value: 5,                           // Extra biomass
    weight: 10,
    ranchTypes: ['feedingPool'],
  },
  {
    id: 'elementalSurge',
    msg: 'An elemental surge! Rapid affinity gain.',
    type: 'bonus',
    effect: 'elementBoost',
    value: 2,                           // Double element gain this cycle
    weight: 8,
    ranchTypes: ['fireGrove', 'tidalPool', 'earthenDen', 'verdantNest'],
  },
  {
    id: 'friendlyRivalry',
    msg: 'A friendly rivalry! Enhanced training.',
    type: 'bonus',
    effect: 'statsBoost',
    value: 1.5,                         // 50% more stats
    weight: 8,
    ranchTypes: ['trainingPit'],
  },
  {
    id: 'luckyFind',
    msg: 'Found something shiny!',
    type: 'bonus',
    effect: 'material',
    value: 1,
    weight: 5,
    ranchTypes: ['feedingPool', 'trainingPit'],
  },
  {
    id: 'napTime',
    msg: 'Took a peaceful nap.',
    type: 'flavor',
    weight: 15,
    ranchTypes: null,
  },
  {
    id: 'playTime',
    msg: 'Spent time playing together.',
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
  {
    id: 'disruption',
    msg: 'A disturbance disrupted the session.',
    type: 'penalty',
    effect: 'reducedGains',
    value: 0.5,                         // 50% reduced gains
    weight: 3,
    ranchTypes: null,
  },
];

export const RANCH_UPGRADE_BONUSES = {
  capacity: 1,                          // +1 capacity per level
  effectMultiplier: 0.20,               // +20% effect per level
  cycleReduction: 0.10,                 // -10% cycle time per level (max 50%)
};

export const MAX_RANCH_LEVEL = 5;

// Prisms shop packages (cosmetic - not in actual game logic)
export const PRISM_PACKAGES = [
  { id: 'starter', name: 'Starter Pack', prisms: 50, price: '$0.99', bonus: null },
  { id: 'value', name: 'Value Pack', prisms: 150, price: '$2.99', bonus: '+50 bonus' },
  { id: 'premium', name: 'Premium Pack', prisms: 500, price: '$9.99', bonus: '+100 bonus' },
  { id: 'mega', name: 'Mega Pack', prisms: 1200, price: '$19.99', bonus: '+300 bonus' },
];
