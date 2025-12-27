// Zone definitions - exploration areas
export const ZONES = {
  forest: { name: 'Dark Forest', icon: '🌲', monsters: ['wolf', 'bat', 'goblin'], unlocked: true, bg: '#1a3d1a', desc: 'Shadowy woodland with common creatures.' },
  caves: { name: 'Crystal Caves', icon: '🕳️', monsters: ['bat', 'skeleton', 'golem'], unlock: 3, bg: '#1a2d4a', desc: 'Glittering caverns with dangerous foes.' },
  swamp: { name: 'Poison Swamp', icon: '🌿', monsters: ['snake', 'turtle', 'goblin'], unlock: 6, bg: '#2d3a1a', desc: 'Toxic wetlands with venomous creatures.' },
  ruins: { name: 'Shadow Ruins', icon: '🏛️', monsters: ['skeleton', 'shade', 'wisp'], unlock: 10, bg: '#2a1a3a', desc: 'Haunted ancient structures.' },
  peaks: { name: 'Ogre Peaks', icon: '⛰️', monsters: ['ogre', 'golem', 'bat'], unlock: 15, bg: '#3a2a1a', desc: 'Mountains ruled by giants.' },
  volcano: { name: 'Dragon Volcano', icon: '🌋', monsters: ['dragon', 'phoenix', 'wisp'], unlock: 25, bg: '#4a1a1a', desc: 'Blazing hellscape of fire.' },
};

// Random events during exploration
export const EXPLORATION_EVENTS = [
  { msg: 'The slimes discover a hidden grove...', type: 'flavor' },
  { msg: 'Strange sounds echo in the distance.', type: 'flavor' },
  { msg: 'The party finds ancient markings on a tree.', type: 'flavor' },
  { msg: 'A gentle breeze carries unfamiliar scents.', type: 'flavor' },
  { msg: 'The slimes spot movement in the shadows.', type: 'flavor' },
  { msg: 'Mysterious lights flicker ahead.', type: 'flavor' },
  { msg: 'The path winds deeper into unknown territory.', type: 'flavor' },
  { msg: 'Rustling in the undergrowth keeps the party alert.', type: 'flavor' },
  { msg: 'Found a small biomass deposit!', type: 'biomass', amount: 3 },
  { msg: 'Discovered a cache of materials!', type: 'material' },
];
