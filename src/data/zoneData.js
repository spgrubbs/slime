// Zone definitions - exploration areas
// BALANCE: Each zone has exactly 2 exclusive monsters of similar difficulty
// Zones unlock progressively via queen level
// element: The dominant element of the zone (affects slime element gain)
// elementGainRate: How fast slimes gain element affinity per kill (0 = neutral zone)

export const ZONES = {
  forest: {
    name: 'Dark Forest',
    icon: '🌲',
    tier: 1,
    monsters: ['wolf', 'bat'],           // Tier 1 monsters only
    unlocked: true,
    bg: '#1a3d1a',
    desc: 'Shadowy woodland with common creatures. Good for training new slimes.',
    element: 'nature',
    elementGainRate: 0.3,                // Slow element gain
    recommendedStats: 4,
  },
  swamp: {
    name: 'Poison Swamp',
    icon: '🌿',
    tier: 2,
    monsters: ['snake', 'goblin'],       // Tier 2 monsters only
    unlock: 5,                           // Requires queen level 5
    bg: '#2d3a1a',
    desc: 'Toxic wetlands with cunning creatures. Beware the poison!',
    element: 'water',                    // Changed from nature for variety
    elementGainRate: 0.4,
    recommendedStats: 6,
  },
  caves: {
    name: 'Crystal Caves',
    icon: '🕳️',
    tier: 3,
    monsters: ['skeleton', 'turtle'],    // Tier 3 monsters only
    unlock: 10,                          // Increased from 3
    bg: '#1a2d4a',
    desc: 'Glittering caverns with armored foes. Requires stronger slimes.',
    element: 'earth',
    elementGainRate: 0.5,
    recommendedStats: 8,
  },
  ruins: {
    name: 'Shadow Ruins',
    icon: '🏛️',
    tier: 4,
    monsters: ['wisp', 'shade'],         // Tier 4 monsters only
    unlock: 18,                          // Increased from 10
    bg: '#2a1a3a',
    desc: 'Haunted ancient structures. Ethereal enemies deal heavy damage.',
    element: null,                       // Neutral zone
    elementGainRate: 0,
    recommendedStats: 10,
  },
  peaks: {
    name: 'Ogre Peaks',
    icon: '⛰️',
    tier: 5,
    monsters: ['golem', 'ogre'],         // Tier 5 monsters only
    unlock: 28,                          // Increased from 15
    bg: '#3a2a1a',
    desc: 'Mountains ruled by giants. Only the strongest survive.',
    element: 'earth',
    elementGainRate: 0.7,
    recommendedStats: 14,
  },
  volcano: {
    name: 'Dragon Volcano',
    icon: '🌋',
    tier: 6,
    monsters: ['phoenix', 'dragon'],     // Tier 6 monsters only
    unlock: 40,                          // Increased from 25
    bg: '#4a1a1a',
    desc: 'Blazing hellscape of fire. The ultimate challenge.',
    element: 'fire',
    elementGainRate: 1.0,
    recommendedStats: 18,
  },
};

// Random events during exploration
// Weight determines relative frequency (higher = more common)
export const EXPLORATION_EVENTS = [
  // Flavor events (no effect, just atmosphere)
  { msg: 'The slimes discover a hidden grove...', type: 'flavor', weight: 15 },
  { msg: 'Strange sounds echo in the distance.', type: 'flavor', weight: 15 },
  { msg: 'The party finds ancient markings on a wall.', type: 'flavor', weight: 10 },
  { msg: 'A gentle breeze carries unfamiliar scents.', type: 'flavor', weight: 10 },
  { msg: 'The slimes spot movement in the shadows.', type: 'flavor', weight: 10 },
  { msg: 'Mysterious lights flicker ahead.', type: 'flavor', weight: 8 },
  { msg: 'The path winds deeper into unknown territory.', type: 'flavor', weight: 8 },
  { msg: 'Rustling in the undergrowth keeps the party alert.', type: 'flavor', weight: 8 },

  // Bonus events (small rewards)
  { msg: 'Found a small biomass deposit!', type: 'biomass', amount: 2, weight: 8 },
  { msg: 'Discovered a cache of materials!', type: 'material', weight: 5 },

  // Rare trait events (very low weight - takes time to trigger)
  { msg: 'experienced a moment of clarity!', type: 'trait', traitPool: ['wise', 'cautious'], weight: 1 },
  { msg: 'faced danger and grew from it!', type: 'trait', traitPool: ['brave', 'fierce'], weight: 1 },
];
