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
    desc: 'A warm, soupy pool. Slimes sit in it and get fatter.',
    effect: 'biomass',
    effectValue: 2,                     // Biomass gained per cycle
    cycleTime: 30 * 60,                 // 30 minutes (in real seconds)
    capacity: 3,
    unlock: { type: 'level', value: 3 },
    cost: { biomass: 100 },
    upgradeCost: { biomass: 250, multiplier: 2 },
    color: '#22c55e',
  },
  fireGrove: {
    id: 'fireGrove',
    name: 'Fire Grove',
    icon: '🔥',
    desc: 'A garden that never stops smoldering. Slimes here slowly turn to fire.',
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
    desc: 'A pool with a current running through it. Slimes here slowly turn to water.',
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
    desc: 'A cave full of wet clay. Slimes here slowly turn to earth.',
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
    desc: 'A nest of leaves and moss. Slimes here slowly turn to nature.',
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
  healingSpring: {
    id: 'healingSpring',
    name: 'Healing Spring',
    icon: '💚',
    desc: 'A hot spring. Every slime out in the field mends a little each round, more for each point of Viscosity soaking here.',
    effect: 'expeditionBuff',
    buffType: 'regen',
    effectValue: 0.1,                   // 0.1 HP regen per Viscosity point per slime
    cycleTime: 45 * 60,                 // 45 minutes
    capacity: 3,
    unlock: { type: 'materials' },
    cost: { biomass: 800, mats: { 'Life Essence': 3, 'Mana Crystal': 2 } },
    upgradeCost: { biomass: 1200, multiplier: 2 },
    color: '#10b981',
  },
  warDen: {
    id: 'warDen',
    name: 'War Den',
    icon: '⚔️',
    desc: 'Somewhere to practice hitting. Slimes here make the ambush squad hit harder, more for each point of Firmness.',
    effect: 'defenseBonus',
    buffType: 'damage',
    effectValue: 0.02,                   // +2% ambush damage per Firmness point per slime
    cycleTime: 45 * 60,                 // 45 minutes
    capacity: 3,
    unlock: { type: 'materials' },
    cost: { biomass: 1000, mats: { 'Iron Ore': 5, 'Wolf Pelt': 3 } },
    upgradeCost: { biomass: 1500, multiplier: 2 },
    color: '#dc2626',
  },
  manaWell: {
    id: 'manaWell',
    name: 'Musk Well',
    icon: '🔮',
    desc: 'A deep, smelly well. Slimes here make extra musk, more for each point of Viscosity.',
    effect: 'manaBonus',
    effectValue: 0.1,                   // +0.1 mana per hour per Viscosity point per slime
    cycleTime: 60 * 60,                 // 1 hour
    capacity: 3,
    unlock: { type: 'materials' },
    cost: { biomass: 1000, mats: { 'Mana Crystal': 5, 'Crystal Shard': 3 } },
    upgradeCost: { biomass: 1500, multiplier: 2 },
    color: '#a855f7',
  },
  scoutPost: {
    id: 'scoutPost',
    name: 'Scout Post',
    icon: '🔭',
    desc: 'A lookout. Slimes here help every party find more biomass and materials, more for each point of Slipperiness.',
    effect: 'expeditionBonus',
    buffType: 'rewards',
    effectValue: 0.01,                   // +1% expedition rewards per Slipperiness point per slime
    cycleTime: 45 * 60,                 // 45 minutes
    capacity: 3,
    unlock: { type: 'materials' },
    cost: { biomass: 1000, mats: { 'Bat Wing': 5, 'Snake Scale': 3 } },
    upgradeCost: { biomass: 1500, multiplier: 2 },
    color: '#0ea5e9',
  },
  nullifier: {
    id: 'nullifier',
    name: 'Nullifier Chamber',
    icon: '🕳️',
    desc: 'A room where nothing is anything. Strips a slime\'s elements and gives it the Void trait.',
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
  convalescencePool: {
    id: 'convalescencePool',
    name: 'Convalescence Pool',
    icon: '🩹',
    desc: 'Wounded slimes knit back together here. One per slot. Takes a day, less with upgrades.',
    effect: 'recover',
    effectValue: 1,
    cycleTime: 24 * 60 * 60,            // 24 hours; upgrades cut it toward 12
    capacity: 2,                        // +1 per level
    woundedOnly: true,                  // only wounded slimes may be assigned
    unlock: { type: 'materials' },
    cost: { biomass: 700, mats: { 'Life Essence': 2, 'Digestive Sac': 4 } },
    upgradeCost: { biomass: 1400, mats: { 'Life Essence': 4 }, multiplier: 2 },
    color: '#4ade80',
  },

  luxuryLounge: {
    id: 'luxuryLounge',
    name: 'Luxury Lounge',
    icon: '✨',
    desc: 'A fancy pool. Now and then a slime comes out with a rare trait.',
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
    msg: 'A good feed! Extra biomass.',
    type: 'bonus',
    effect: 'biomass',
    value: 5,                           // Extra biomass
    weight: 10,
    ranchTypes: ['feedingPool'],
  },
  {
    id: 'elementalSurge',
    msg: 'The element surges. Double affinity this time.',
    type: 'bonus',
    effect: 'elementBoost',
    value: 2,                           // Double element gain this cycle
    weight: 8,
    ranchTypes: ['fireGrove', 'tidalPool', 'earthenDen', 'verdantNest'],
  },
  {
    id: 'tacticalInsight',
    msg: 'A clever idea! The bonus is stronger this time.',
    type: 'bonus',
    effect: 'buffBoost',
    value: 1.5,                         // 50% stronger buff effect
    weight: 8,
    ranchTypes: ['warDen', 'scoutPost', 'manaWell'],
  },
  {
    id: 'healingWaters',
    msg: 'The spring bubbles harder than usual!',
    type: 'bonus',
    effect: 'healingBoost',
    value: 2,                           // Double healing effect
    weight: 8,
    ranchTypes: ['healingSpring'],
  },
  {
    id: 'luckyFind',
    msg: 'Found something shiny!',
    type: 'bonus',
    effect: 'material',
    value: 1,
    weight: 5,
    ranchTypes: ['feedingPool', 'healingSpring'],
  },
  {
    id: 'napTime',
    msg: 'Took a nap.',
    type: 'flavor',
    weight: 15,
    ranchTypes: null,
  },
  {
    id: 'playTime',
    msg: 'Played with the others.',
    type: 'flavor',
    weight: 15,
    ranchTypes: null,
  },
  {
    id: 'meditation',
    msg: 'Sat very still and thought about nothing.',
    type: 'flavor',
    weight: 10,
    ranchTypes: ['nullifier', 'luxuryLounge'],
  },
  {
    id: 'disruption',
    msg: 'Something spooked them. Half gains this time.',
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
