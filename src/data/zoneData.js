// Zone definitions - exploration areas
// BALANCE: Each zone has 5 monsters (including 1 rare)
// Zones unlock progressively via queen level
// element: The dominant element of the zone (affects slime element gain)
// elementGainRate: How fast slimes gain element affinity per kill (0 = neutral zone)
// Elemental Progression: Nature → Earth → Water → Fire (each beats the next)

export const ZONES = {
  forest: {
    name: 'Verdant Forest',
    icon: '🌲',
    tier: 1,
    monsters: ['youngWolf', 'venusSlimetrap', 'pebblet', 'vineSpider', 'lifeFairy'],
    unlocked: true,
    bg: '#1a3d1a',
    desc: 'Lush woodland teeming with nature spirits. Perfect for training new slimes.',
    element: 'nature',
    elementGainRate: 0.3,
    recommendedStats: 4,
  },
  swamp: {
    name: 'Murky Swamp',
    icon: '🌿',
    tier: 2,
    monsters: ['serratedCarp', 'antSeaLion', 'swampStrider', 'wilOWisp', 'theSnail'],
    unlock: 5,
    bg: '#2d3a1a',
    desc: 'Toxic wetlands hiding dangerous creatures. Beware the waters!',
    element: 'water',
    elementGainRate: 0.4,
    recommendedStats: 6,
  },
  caves: {
    name: 'Crystal Grotto',
    icon: '💎',
    tier: 3,
    monsters: ['vampireBat', 'rockWorm', 'coalSprite', 'stalagMite', 'sapphireNewt'],
    unlock: 10,
    bg: '#1a2d4a',
    desc: 'Glittering caverns with crystalline foes. Earth magic runs strong.',
    element: 'earth',
    elementGainRate: 0.5,
    recommendedStats: 8,
  },
  ruins: {
    name: 'Cinderspire',
    icon: '🔥',
    tier: 4,
    monsters: ['embermander', 'animatedAlloy', 'magmaOoze', 'burntSpirit', 'wyrm'],
    unlock: 18,
    bg: '#3a1a1a',
    desc: 'Volcanic fortress of flame. Fire elementals rule these scorched halls.',
    element: 'fire',
    elementGainRate: 0.6,
    recommendedStats: 10,
  },
  peaks: {
    name: 'Stormspire Summit',
    icon: '⛰️',
    tier: 5,
    monsters: ['thunderHawk', 'boulderTroll', 'stormElemental', 'frostGiant', 'thunderbird'],
    unlock: 28,
    bg: '#2a2a3a',
    desc: 'Lightning-scarred peaks where storms never cease. Only the strongest survive.',
    element: 'water',
    elementGainRate: 0.7,
    recommendedStats: 14,
  },
  volcano: {
    name: 'Void Abyss',
    icon: '🕳️',
    tier: 6,
    monsters: ['voidTendril', 'abyssalWatcher', 'nullConstruct', 'realityShard', 'hollowOne'],
    unlock: 40,
    bg: '#0a0a1a',
    desc: 'A tear in reality where ancient horrors lurk. Elements mean nothing here.',
    element: null,
    elementGainRate: 0,
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

// Intermission events between battles
// flavor: Just text, no effect
// boon: Positive effect
// malus: Negative effect
export const INTERMISSION_EVENTS = {
  // Zone-specific flavor text (75% of events)
  forest: [
    { msg: 'The slimes push through dense undergrowth...', type: 'flavor' },
    { msg: 'Twisted branches claw at the party as they advance.', type: 'flavor' },
    { msg: 'Moonlight filters through the canopy above.', type: 'flavor' },
    { msg: 'The forest grows darker and more oppressive.', type: 'flavor' },
    { msg: 'Ancient trees loom like silent sentinels.', type: 'flavor' },
  ],
  swamp: [
    { msg: 'The party trudges through murky waters...', type: 'flavor' },
    { msg: 'Bubbles rise from the fetid depths below.', type: 'flavor' },
    { msg: 'A thick fog obscures the path ahead.', type: 'flavor' },
    { msg: 'The stench of decay fills the air.', type: 'flavor' },
    { msg: 'Twisted roots create treacherous footing.', type: 'flavor' },
  ],
  caves: [
    { msg: 'Crystals cast prismatic light across the cavern.', type: 'flavor' },
    { msg: 'The echo of dripping water guides the way.', type: 'flavor' },
    { msg: 'Stalactites hang overhead like frozen daggers.', type: 'flavor' },
    { msg: 'The passage narrows, forcing single file.', type: 'flavor' },
    { msg: 'Strange minerals glitter in the darkness.', type: 'flavor' },
  ],
  ruins: [
    { msg: 'Crumbling pillars mark the path of ancients.', type: 'flavor' },
    { msg: 'Whispers seem to emanate from the shadows.', type: 'flavor' },
    { msg: 'Faded murals depict forgotten battles.', type: 'flavor' },
    { msg: 'The air grows cold and heavy with dread.', type: 'flavor' },
    { msg: 'Spectral energy pulses through the stones.', type: 'flavor' },
  ],
  peaks: [
    { msg: 'The climb grows steeper and more treacherous.', type: 'flavor' },
    { msg: 'Bitter winds howl across the mountainside.', type: 'flavor' },
    { msg: 'Massive footprints mark the trail ahead.', type: 'flavor' },
    { msg: 'Boulders the size of houses block the path.', type: 'flavor' },
    { msg: 'The thin air makes every movement difficult.', type: 'flavor' },
  ],
  volcano: [
    { msg: 'Lava flows illuminate the scorched terrain.', type: 'flavor' },
    { msg: 'The heat is almost unbearable.', type: 'flavor' },
    { msg: 'Ash rains down from the darkened sky.', type: 'flavor' },
    { msg: 'The ground trembles with volcanic fury.', type: 'flavor' },
    { msg: 'Sulfurous fumes sting and burn.', type: 'flavor' },
  ],
  // General events that can happen in any zone (25% of events)
  general: [
    // Boons (positive effects)
    { msg: 'A refreshing spring restores the party!', type: 'boon', effect: 'heal', value: 5 },
    { msg: 'Found a hidden cache of biomass!', type: 'boon', effect: 'biomass', value: 3 },
    { msg: 'The party finds a moment of respite.', type: 'boon', effect: 'heal', value: 3 },
    // Maluses (negative effects)
    { msg: 'A trap! The party takes damage!', type: 'malus', effect: 'damage', value: 3 },
    { msg: 'Poisonous spores fill the air!', type: 'malus', effect: 'poison', value: 1 },
    { msg: 'A rock slide injures the party!', type: 'malus', effect: 'damage', value: 4 },
  ],
};

// Intermission duration in timer units (matches battle tick system)
// At 1x speed: 4500 units = 45 ticks = 4.5 seconds
// This is 3x the BATTLE_TICK_SPEED (1500) for a clear pause
export const INTERMISSION_DURATION = 4500;
