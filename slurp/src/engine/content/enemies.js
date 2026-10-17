// Enemies and acts. Enemies are built from the same essences the player absorbs:
// `kit` is what they fight with, `pool` is what you can take from them.
// Hive Queen monsters seed the roster; their HQ mutation became the signature.

const E = (name, icon, family, element, [mass, firm, slip, visc], kit, pool, gel = [12, 18]) =>
  ({ name, icon, family, element, stats: { mass, firm, slip, visc }, kit, pool, gel });

export const ENEMIES = {
  // ═══ ACT 1 — Verdant Forest ═════════════════════════════════════════════
  youngWolf:      E('Young Wolf', '🐺', 'beast', null, [28, 5, 7, 2], [['pounce', 0], ['fangs', 0]],
                    { signature: 'pounce', shared: ['fangs', 'feralInstinct'], stat: 'leanMuscle' }),
  venusSlimetrap: E('Venus Slimetrap', '🌱', 'flora', 'nature', [40, 4, 2, 5], [['devour', 0], ['photosynthesis', 0]],
                    { signature: 'devour', shared: ['photosynthesis', 'sapSpray'], stat: 'thickHide', element: 'chlorophyll' }),
  pebblet:        E('Pebblet', '🪨', 'stone', 'earth', [45, 4, 1, 3], [['harden', 0], ['stoneskin', 0]],
                    { signature: 'stoneskin', shared: ['harden', 'spikedHide'], stat: 'grit', element: 'earthite' }),
  vineSpider:     E('Vine Spider', '🕷️', 'insect', 'nature', [24, 5, 6, 3], [['webShot', 0], ['venomGland', 0]],
                    { signature: 'webShot', shared: ['manyLegs', 'venomGland'], stat: 'leanMuscle', element: 'chlorophyll' }),
  puffcap:        E('Puffcap', '🍄', 'flora', 'nature', [32, 3, 3, 6], [['sporeCloud', 0]],
                    { signature: 'sporeCloud', shared: ['photosynthesis', 'sapSpray'], stat: 'focusGland', element: 'chlorophyll' }),
  honeyWasp:      E('Honey Wasp', '🐝', 'insect', null, [20, 4, 10, 3], [['venomGland', 0], ['swarming', 0]],
                    { signature: 'swarming', shared: ['manyLegs', 'venomGland'], stat: 'tailwind' }),
  feralSlime:     E('Feral Slime', '🟢', 'ooze', null, [36, 4, 4, 4], [['bounce', 0], ['jiggle', 0]],
                    { signature: 'gulp', shared: ['jiggle', 'gelPouch', 'acidSplash'], stat: 'thickHide' }),
  lifeFairy:      E('Life Fairy', '🧚', 'spirit', 'nature', [22, 2, 9, 6], [['glimmer', 0], ['resurrect', 0]],
                    { signature: 'resurrect', shared: ['glimmer'], stat: 'focusGland', element: 'chlorophyll' }),

  alphaWolf:      E('Alpha Wolf', '🐺', 'beast', null, [130, 8, 8, 3], [['pounce', 1], ['fangs', 1], ['feralInstinct', 0]],
                    { signature: 'chainCrit', shared: ['pounce', 'fangs', 'bloodthirst'], stat: 'leanMuscle' }, [30, 40]),
  ironbarkTreant: E('Ironbark Treant', '🌳', 'flora', 'nature', [160, 7, 2, 5], [['harden', 1], ['spikedHide', 1], ['photosynthesis', 0]],
                    { signature: 'spikedHide', shared: ['harden', 'photosynthesis', 'stoneskin'], stat: 'thickHide', element: 'chlorophyll', rare: 'graniteShell' }, [30, 40]),
  broodMother:    E('Brood Mother', '🕸️', 'insect', 'nature', [120, 6, 6, 5], [['venomGland', 1], ['manyLegs', 0], ['webShot', 0]],
                    { signature: 'fermenter', shared: ['venomGland', 'manyLegs', 'swarming'], stat: 'leanMuscle' }, [30, 40]),

  greatSlimetrap: E('The Great Slimetrap', '🪴', 'flora', 'nature', [300, 8, 3, 6], [['sporeCloud', 1], ['photosynthesis', 0], ['sapSpray', 0]],
                    { boss: ['carnivoresMaw', 'perennial', 'strangler'] }, [75, 75]),

  // ═══ ACT 2 — Ember Depths (Crystal Grotto + Cinderspire) ════════════════
  vampireBat:     E('Vampire Bat', '🦇', 'beast', null, [95, 11, 9, 4], [['bloodthirst', 1], ['fangs', 0]],
                    { signature: 'bloodthirst', shared: ['fangs', 'feralInstinct'], stat: 'leanMuscle' }, [16, 22]),
  rockWorm:       E('Rock Worm', '🪱', 'stone', 'earth', [150, 10, 3, 5], [['bodySlam', 0], ['harden', 0]],
                    { signature: 'bodySlam', shared: ['harden', 'stoneskin'], stat: 'heartyCore', element: 'earthite' }, [16, 22]),
  coalSprite:     E('Coal Sprite', '🔥', 'spirit', 'fire', [85, 13, 7, 6], [['pyrolyze', 1], ['glimmer', 0]],
                    { signature: 'pyrolyze', shared: ['glimmer', 'wail'], stat: 'focusGland', element: 'emberCore' }, [16, 22]),
  stalagMite:     E('Stalag-Mite', '⛰️', 'stone', 'earth', [170, 10, 2, 4], [['stoneskin', 1], ['spikedHide', 1]],
                    { signature: 'spikedHide', shared: ['stoneskin', 'harden'], stat: 'grit', element: 'earthite' }, [16, 22]),
  embermander:    E('Embermander', '🦎', 'beast', 'fire', [120, 13, 6, 6], [['pounce', 1], ['pyrolyze', 0]],
                    { signature: 'pounce', shared: ['pyrolyze', 'feralInstinct'], stat: 'grit', element: 'emberCore' }, [16, 22]),
  magmaOoze:      E('Magma Ooze', '🌋', 'ooze', 'fire', [140, 12, 4, 7], [['acidSplash', 1], ['jiggle', 0]],
                    { signature: 'overeater', shared: ['acidSplash', 'gulp', 'jiggle'], stat: 'heartyCore', element: 'emberCore' }, [16, 22]),
  burntSpirit:    E('Burnt Spirit', '💀', 'spirit', 'fire', [100, 15, 6, 6], [['wail', 0], ['pyrolyze', 0]],
                    { signature: 'wail', shared: ['pyrolyze', 'resurrect'], stat: 'focusGland', element: 'emberCore' }, [16, 22]),
  sapphireNewt:   E('Sapphire Newt', '🦎', 'ooze', 'water', [110, 9, 8, 8], [['catalyst', 0], ['venomGland', 0]],
                    { signature: 'catalyst', shared: ['jiggle', 'venomGland'], stat: 'focusGland', element: 'tidepool' }, [16, 22]),

  animatedAlloy:  E('Animated Alloy', '🤖', 'construct', null, [380, 18, 4, 5], [['plating', 1], ['overclock', 0], ['harden', 1]],
                    { signature: 'overclock', shared: ['plating', 'harden'], stat: 'servo', rare: 'echoChamber' }, [35, 45]),
  cinderHound:    E('Cinder Hound', '🐕', 'beast', 'fire', [330, 20, 10, 5], [['pounce', 2], ['fangs', 1], ['bloodthirst', 0]],
                    { signature: 'chainCrit', shared: ['pounce', 'fangs', 'bloodthirst'], stat: 'leanMuscle', element: 'emberCore' }, [35, 45]),
  crystalSpider:  E('Crystal Spider', '💎', 'insect', 'earth', [300, 16, 9, 7], [['manyLegs', 1], ['venomGland', 1], ['webShot', 0]],
                    { signature: 'catalyst', shared: ['manyLegs', 'venomGland', 'swarming'], stat: 'leanMuscle', element: 'earthite' }, [35, 45]),

  fireWyrm:       E('Fire Wyrm', '🐉', 'beast', 'fire', [1000, 24, 6, 10], [['pyrolyze', 2], ['bloodthirst', 1], ['diveBomb', 1]],
                    { boss: ['draconicHeart', 'emberSoul', 'hoard'] }, [75, 75]),

  // ═══ ACT 3 — Stormspire Summit ══════════════════════════════════════════
  thunderHawk:    E('Thunder Hawk', '🦅', 'sky', 'water', [260, 26, 16, 6], [['diveBomb', 1], ['staticCharge', 0]],
                    { signature: 'diveBomb', shared: ['staticCharge', 'glimmer'], stat: 'tailwind', element: 'tidepool' }, [20, 28]),
  boulderTroll:   E('Boulder Troll', '🧌', 'stone', 'earth', [450, 28, 3, 6], [['bodySlam', 1], ['photosynthesis', 1]],
                    { signature: 'bodySlam', shared: ['stoneskin', 'spikedHide'], stat: 'heartyCore', element: 'earthite' }, [20, 28]),
  stormElemental: E('Storm Elemental', '⛈️', 'sky', 'water', [300, 30, 12, 10], [['staticCharge', 1], ['wail', 0]],
                    { signature: 'staticCharge', shared: ['diveBomb', 'glimmer'], stat: 'focusGland', element: 'tidepool' }, [20, 28]),
  frostGiant:     E('Frost Giant', '🥶', 'stone', 'water', [420, 32, 4, 8], [['harden', 1], ['wail', 1]],
                    { signature: 'wail', shared: ['harden', 'stoneskin'], stat: 'heartyCore', element: 'tidepool' }, [20, 28]),
  voidTendril:    E('Void Tendril', '🦑', 'void', null, [320, 34, 8, 8], [['voidTouch', 1], ['consume', 0]],
                    { signature: 'consume', shared: ['voidTouch', 'hollowGaze'], stat: 'focusGland' }, [20, 28]),
  abyssalWatcher: E('Abyssal Watcher', '👁️', 'void', null, [280, 30, 10, 12], [['hollowGaze', 1], ['glimmer', 1]],
                    { signature: 'hollowGaze', shared: ['voidTouch', 'glimmer'], stat: 'focusGland' }, [20, 28]),
  realityShard:   E('Reality Shard', '💠', 'void', null, [250, 38, 12, 8], [['voidTouch', 2], ['fangs', 1]],
                    { signature: 'voidTouch', shared: ['fangs', 'consume'], stat: 'servo' }, [20, 28]),

  nullConstruct:  E('Null Construct', '🗿', 'construct', null, [900, 40, 5, 8], [['plating', 2], ['overclock', 1], ['harden', 2]],
                    { signature: 'overclock', shared: ['plating', 'harden'], stat: 'servo', rare: 'echoChamber' }, [40, 50]),
  skyLeviathan:   E('Sky Leviathan', '🐋', 'sky', 'water', [820, 42, 18, 8], [['diveBomb', 2], ['momentum', 0]],
                    { signature: 'momentum', shared: ['diveBomb', 'staticCharge'], stat: 'tailwind', element: 'tidepool' }, [40, 50]),
  hollowSpawn:    E('Hollow Spawn', '🫥', 'void', null, [850, 45, 10, 10], [['consume', 1], ['voidTouch', 1], ['bloodthirst', 1]],
                    { signature: 'consume', shared: ['voidTouch', 'hollowGaze', 'bloodthirst'], stat: 'heartyCore' }, [40, 50]),

  thunderbird:    E('Thunderbird', '🦜', 'sky', 'water', [1700, 42, 16, 12], [['diveBomb', 2], ['staticCharge', 1], ['momentum', 0], ['glimmer', 0]],
                    { boss: ['eyeOfStorm', 'lightningRod', 'echoChamber'] }, [75, 75]),

  // ═══ FINALE ═════════════════════════════════════════════════════════════
  hollowOne:      E('The Hollow One', '🕳️', 'void', null, [4000, 60, 14, 15],
                    [['consume', 2], ['voidTouch', 2], ['hollowGaze', 2], ['bloodthirst', 2], ['plating', 1]],
                    { boss: [] }, [0, 0]),
};

export const ACTS = [
  {
    name: 'The Shallows', biome: 'Verdant Forest', icon: '🌲', theme: 'forest',
    normals: ['youngWolf', 'venusSlimetrap', 'pebblet', 'vineSpider', 'puffcap', 'honeyWasp', 'feralSlime', 'lifeFairy'],
    elites: ['alphaWolf', 'ironbarkTreant', 'broodMother'],
    boss: 'greatSlimetrap',
  },
  {
    name: 'The Depths', biome: 'Ember Depths', icon: '🔥', theme: 'ember',
    normals: ['vampireBat', 'rockWorm', 'coalSprite', 'stalagMite', 'embermander', 'magmaOoze', 'burntSpirit', 'sapphireNewt'],
    elites: ['animatedAlloy', 'cinderHound', 'crystalSpider'],
    boss: 'fireWyrm',
  },
  {
    name: 'The Heights', biome: 'Stormspire Summit', icon: '⛰️', theme: 'storm',
    normals: ['thunderHawk', 'boulderTroll', 'stormElemental', 'frostGiant', 'voidTendril', 'abyssalWatcher', 'realityShard'],
    elites: ['nullConstruct', 'skyLeviathan', 'hollowSpawn'],
    boss: 'thunderbird',
  },
];

export const FINALE = { name: 'The Hollow', biome: 'Void Abyss', icon: '🕳️', theme: 'void', boss: 'hollowOne' };
