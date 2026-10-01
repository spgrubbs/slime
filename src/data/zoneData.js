// Zone definitions - exploration areas
//
// recommendedStats is the stat level at which a party of four with no mutations
// clears the zone's common monsters roughly three times in four. Calibrated by
// simulation against the real resolver, not estimated — see docs/GAME_DESIGN.md §11.
// BALANCE: Each zone has 5 monsters (including 1 rare), plus one Warden that is
// NOT in this list — Wardens live in wardenData.js and are summoned, never spawned.
//
// A zone opens when the PREVIOUS zone's Warden falls and its Seal buys this
// zone's Tendril. Queen level no longer gates anything here; the `unlock` field
// below is vestigial and read by nothing.
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
    desc: 'Trees, wolves, and plants with teeth. Good eating for a young slime.',
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
    desc: 'Warm, wet and rotten. Everything in the water wants to eat us back.',
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
    desc: 'Glittery tunnels under the hills. The rocks bite, and so do the bats.',
    element: 'earth',
    elementGainRate: 0.5,
    recommendedStats: 9,
  },
  ruins: {
    name: 'Cinderspire',
    icon: '🔥',
    tier: 4,
    monsters: ['embermander', 'animatedAlloy', 'magmaOoze', 'burntSpirit', 'wyrm'],
    unlock: 18,
    bg: '#3a1a1a',
    desc: 'An old fortress that never stopped burning. Everything here is on fire, the lizards included.',
    element: 'fire',
    elementGainRate: 0.6,
    recommendedStats: 14,
  },
  peaks: {
    name: 'Stormspire Summit',
    icon: '⛰️',
    tier: 5,
    monsters: ['thunderHawk', 'boulderTroll', 'stormElemental', 'frostGiant', 'thunderbird'],
    unlock: 28,
    bg: '#2a2a3a',
    desc: 'Cold rock at the top of the world. The storm never stops and the birds are bigger than you.',
    element: 'water',
    elementGainRate: 0.7,
    recommendedStats: 28,
  },
  volcano: {
    name: 'Void Abyss',
    icon: '🕳️',
    tier: 6,
    monsters: ['voidTendril', 'abyssalWatcher', 'nullConstruct', 'realityShard', 'hollowOne'],
    unlock: 40,
    bg: '#0a0a1a',
    desc: 'A hole where the world forgot to be. Elements mean nothing here. I don\'t like it.',
    element: null,
    elementGainRate: 0,
    recommendedStats: 45,
  },
};

// Random events during exploration
// Weight determines relative frequency (higher = more common)
export const EXPLORATION_EVENTS = [
  // Flavor events (no effect, just atmosphere)
  { msg: 'We find a quiet grove and stop to sniff it.', type: 'flavor', weight: 15 },
  { msg: 'Something howls far away. We squish closer together.', type: 'flavor', weight: 15 },
  { msg: 'Old scratches on a rock. Somebody was here before us.', type: 'flavor', weight: 10 },
  { msg: 'The wind smells like food. Everything smells like food.', type: 'flavor', weight: 10 },
  { msg: 'Something moves in the shadows. We move the other way.', type: 'flavor', weight: 10 },
  { msg: 'Little lights bob up ahead. They taste like nothing.', type: 'flavor', weight: 8 },
  { msg: 'The path gets narrower. So do we.', type: 'flavor', weight: 8 },
  { msg: 'The bushes rustle the whole way. Nobody relaxes.', type: 'flavor', weight: 8 },

  // Bonus events (small rewards)
  { msg: 'Found a lump of biomass on the path!', type: 'biomass', amount: 2, weight: 8 },
  { msg: 'Found a little stash of materials!', type: 'material', weight: 5 },

  // Rare trait events. The message follows the slime's name.
  { msg: 'sits very still for a long time and comes back different.', type: 'trait', traitPool: ['wise', 'cautious'], weight: 1 },
  { msg: 'nearly got eaten, and liked it.', type: 'trait', traitPool: ['brave', 'fierce'], weight: 1 },
];

// Intermission events between battles
// flavor: Just text, no effect
// boon: Positive effect
// malus: Negative effect
export const INTERMISSION_EVENTS = {
  // Zone-specific flavor text (75% of events)
  forest: [
    { msg: 'We squeeze through the undergrowth.', type: 'flavor' },
    { msg: 'Branches grab at us. We slide right out of them.', type: 'flavor' },
    { msg: 'Moonlight comes down through the leaves.', type: 'flavor' },
    { msg: 'The trees get closer together, and darker.', type: 'flavor' },
    { msg: 'Big old trees watch us go by.', type: 'flavor' },
  ],
  swamp: [
    { msg: 'We wade through the brown water.', type: 'flavor' },
    { msg: 'Bubbles come up from somewhere underneath us.', type: 'flavor' },
    { msg: 'Fog. We follow the smell instead.', type: 'flavor' },
    { msg: 'It stinks of rot. We quite like it.', type: 'flavor' },
    { msg: 'Roots everywhere. Slimes can\'t trip, but we try our best.', type: 'flavor' },
  ],
  caves: [
    { msg: 'Crystals throw colored light all over us.', type: 'flavor' },
    { msg: 'Drip, drip. We follow the sound.', type: 'flavor' },
    { msg: 'Pointy rocks hang over our heads.', type: 'flavor' },
    { msg: 'The tunnel pinches down to one slime wide.', type: 'flavor' },
    { msg: 'Shiny bits in the walls. Not food. We checked.', type: 'flavor' },
  ],
  ruins: [
    { msg: 'Hot stone underneath us. We keep moving.', type: 'flavor' },
    { msg: 'Old walls, still smoking.', type: 'flavor' },
    { msg: 'Paintings of a war on the walls. Everyone in them is on fire.', type: 'flavor' },
    { msg: 'Embers drift past like snow.', type: 'flavor' },
    { msg: 'The heat makes our edges wobble.', type: 'flavor' },
  ],
  peaks: [
    { msg: 'Uphill. Everything up here is uphill.', type: 'flavor' },
    { msg: 'The wind tries to peel us off the rock.', type: 'flavor' },
    { msg: 'Footprints bigger than all of us put together.', type: 'flavor' },
    { msg: 'Boulders the size of the nucleus block the way.', type: 'flavor' },
    { msg: 'The air is thin. We puff up to make up for it.', type: 'flavor' },
  ],
  volcano: [
    { msg: 'The ground stops being ground for a moment.', type: 'flavor' },
    { msg: 'Colors with no names drift past.', type: 'flavor' },
    { msg: 'It is very quiet. Too quiet to be a place.', type: 'flavor' },
    { msg: 'Our shadows walk a little behind us.', type: 'flavor' },
    { msg: 'Something far off is looking at us. We don\'t look back.', type: 'flavor' },
  ],
  // General events that can happen in any zone (25% of events)
  general: [
    // Boons (positive effects)
    { msg: 'A cold spring! We soak in it and feel better.', type: 'boon', effect: 'heal', value: 5 },
    { msg: 'Found a hidden lump of biomass!', type: 'boon', effect: 'biomass', value: 3 },
    { msg: 'A quiet moment to catch our breath.', type: 'boon', effect: 'heal', value: 3 },
    // Maluses (negative effects)
    { msg: 'A trap! Everyone gets pinched.', type: 'malus', effect: 'damage', value: 3 },
    { msg: 'Spores in the air. We cough, which is hard without lungs.', type: 'malus', effect: 'poison', value: 1 },
    { msg: 'Rocks fall on us. Rude.', type: 'malus', effect: 'damage', value: 4 },
  ],
};

// Intermission duration in timer units (matches battle tick system)
// At 1x speed: 4500 units = 45 ticks = 4.5 seconds
// This is 3x the BATTLE_TICK_SPEED (1500) for a clear pause
export const INTERMISSION_DURATION = 4500;
