// Monster type definitions
//
// BALANCE — fight LENGTH, not just difficulty.
//
// Measured against the real resolver, a party of four at each zone's
// recommendedStats used to clear the forest in 2.2 rounds losing 2% of its
// health, while caves-and-deeper already ran 4.7-5.7 rounds at 28-45%. The
// early game was over before the arena could show a single behaviour, and no
// build expressed itself in two rounds.
//
// So the correction is front-loaded and tapers to nothing: HP and damage were
// multiplied by (x3.0, x2.0) at tier 1, (x1.8, x1.4) at 2, (x1.3, x1.1) at 3,
// (x1.1, x1.0) at 4, and left alone at 5-6, which were already in band. The
// whole game now sits at roughly 5-7 rounds a fight. A flat doubling was the
// obvious move and the wrong one: it would have pushed the peaks to 11 rounds
// and a 56% win rate, breaking the part of the curve that already worked.
//
// A later pass raised early damage again (tier 1 x1.4, tier 2 x1.15, tier 6
// x1.15 off those values): with travel recovery in place, a tier-1 party could
// run seventeen fights and finish at FULL health, which is not a game. Measured
// at each zone's recommendedStats, a party now ends 17 fights around 60-73% and
// loses a slime roughly one run in three.
//
// Worth knowing before touching this: attrition here is BIMODAL, not a dial.
// Losing a slime cuts party damage, which lengthens fights, which costs more
// health — positive feedback with an absorbing barrier. Recovery slightly above
// the cost of a fight pins the party at full health; slightly below it spirals
// to a wipe. There is very little stable middle, so the risk that matters comes
// from per-slime variance (a basic slime has ~30 HP and takes 8-damage hits),
// not from a slow average bleed.
//
// Re-check with the sim described in docs/GAME_DESIGN.md §11.
//
// Zone 1: Basic slimes comfortable, ~45-120 HP, 6-12 dmg
// Zone 2: Basic slimes struggle, Enhanced comfortable, ~90-215 HP, 11-20 dmg
// Zone 3: Basic suicide, Enhanced struggle, ~145-235 HP, 18-26 dmg
// Zone 4: Enhanced suicide, Elite comfortable, ~220-385 HP, 28-40 dmg
// Zone 5: Elite struggle, Royal comfortable, ~400-600 HP, 45-65 dmg
// Zone 6: Royal struggle with investment, ~700-1000 HP, 70-100 dmg

// ── Material drops ───────────────────────────────────────────────────────────
//
// Every material rolls independently when a monster dies, at a rate set by what
// it gates rather than by which monster dropped it. Commons keep the economy
// moving; gating materials are deliberately slow, because in an incremental the
// wait IS the progression.
//
// Rare monsters are their own gate — they only appear ~5% of the time — so
// everything they carry drops generously once you have actually found one.

export const MATERIAL_RATES = {
  common:   0.38,   // keeps buildings and ranches ticking over
  uncommon: 0.16,
  gating:   0.08,   // wanted in quantity by one specific building
  fromRare: 0.45,   // anything on a rare monster; the spawn was the grind
};

/** Materials wanted in bulk by a building or ranch, so they drop slowly. */
export const GATING_MATERIALS = new Set([
  'Storm Core', 'Void Essence', 'Wyrm Scale', 'Snail Shell', 'Ancient Stone',
  'Golem Core', 'Ember Core', 'Phoenix Ash', 'Turtle Shell', 'Life Essence',
  'Mana Crystal', 'Crystal Shard',
]);

const UNCOMMON_MATERIALS = new Set([
  'Iron Ore', 'Bat Wing', 'Snake Scale', 'Digestive Sac',
]);

/** Chance that `mat` drops from one kill of `monster`. */
export const materialDropChance = (mat, monster) => {
  if (monster?.rare) return MATERIAL_RATES.fromRare;
  if (GATING_MATERIALS.has(mat)) return MATERIAL_RATES.gating;
  if (UNCOMMON_MATERIALS.has(mat)) return MATERIAL_RATES.uncommon;
  return MATERIAL_RATES.common;
};

// ── Mutagens ─────────────────────────────────────────────────────────────────
//
// Every monster carries the mutagen for its own mutation. Applying one to a
// slime grants that mutation permanently and consumes the item — so a mutation
// is a scarce thing you spend, not a threshold you cross once.
//
// The rate belongs to the MUTATION's rarity, not the monster's: a rare monster
// already appears ~5% of the time, and taxing that twice would put its mutagen
// past 2,000 zone kills.

export const MUTAGEN_RATES = {
  common: 0.01,   // ~420 zone kills for one specific mutagen, ~100 for any
  rare:   0.03,   // ~670 zone kills, behind a 5% spawn
};

/**
 * Guaranteed floor. Pure 1% with no floor can hand a player 500 kills and
 * nothing, which reads as broken rather than unlucky — so the kill tally that
 * used to gate unlocks becomes the safety net instead of being deleted.
 */
export const MUTAGEN_PITY_KILLS = 150;

export const mutagenDropChance = (monster) =>
  monster?.rare ? MUTAGEN_RATES.rare : MUTAGEN_RATES.common;

// Monster Abilities - special attacks that monsters can use randomly
// chance: probability (0-1) of using ability instead of normal attack
// effect: what the ability does
export const MONSTER_ABILITIES = {
  // Damage abilities
  powerStrike: {
    id: 'powerStrike',
    name: 'Power Strike',
    icon: '💥',
    desc: 'A devastating blow dealing extra damage',
    chance: 0.2,
    effect: 'damage',
    multiplier: 1.5,
  },
  venomBite: {
    id: 'venomBite',
    name: 'Venom Bite',
    icon: '🐍',
    desc: 'Poisons the target, dealing damage over time',
    chance: 0.25,
    effect: 'poison',
    duration: 3,
    damagePerTick: 2,
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    icon: '🔥',
    desc: 'Launches a fireball that burns the target',
    chance: 0.2,
    effect: 'burn',
    duration: 3,
    damagePerTick: 3,
  },
  lifeDrain: {
    id: 'lifeDrain',
    name: 'Life Drain',
    icon: '💀',
    desc: 'Drains life from target, healing self',
    chance: 0.25,
    effect: 'lifesteal',
    multiplier: 0.8,
    healPercent: 0.5,
  },
  webTrap: {
    id: 'webTrap',
    name: 'Web Trap',
    icon: '🕸️',
    desc: 'Ensnares target, reducing their attack speed',
    chance: 0.2,
    effect: 'slow',
    duration: 2,
    slowAmount: 0.5,
  },
  rockThrow: {
    id: 'rockThrow',
    name: 'Rock Throw',
    icon: '🪨',
    desc: 'Hurls a rock that can stun the target',
    chance: 0.15,
    effect: 'stun',
    duration: 1,
    damageMultiplier: 0.8,
  },
  frostBreath: {
    id: 'frostBreath',
    name: 'Frost Breath',
    icon: '❄️',
    desc: 'Chilling breath that slows and damages',
    chance: 0.2,
    effect: 'freeze',
    duration: 2,
    damageMultiplier: 0.6,
  },
  cleave: {
    id: 'cleave',
    name: 'Cleave',
    icon: '⚔️',
    desc: 'Sweeping attack that hits all enemies',
    chance: 0.15,
    effect: 'aoe',
    multiplier: 0.6,
  },
  enrage: {
    id: 'enrage',
    name: 'Enrage',
    icon: '😤',
    desc: 'Becomes enraged, boosting next attack',
    chance: 0.1,
    effect: 'buff',
    duration: 2,
    damageBoost: 1.5,
  },
  voidTouch: {
    id: 'voidTouch',
    name: 'Void Touch',
    icon: '🕳️',
    desc: 'Corrupting touch that ignores defense',
    chance: 0.2,
    effect: 'trueDamage',
    multiplier: 0.7,
  },
  heal: {
    id: 'heal',
    name: 'Regenerate',
    icon: '💚',
    desc: 'Heals a portion of max HP',
    chance: 0.15,
    effect: 'selfHeal',
    healPercent: 0.15,
  },
};

export const MONSTER_TYPES = {
  // === ZONE 1: Verdant Forest (Basic slimes) ===
  youngWolf: {
    name: 'Young Wolf',
    icon: '🐺',
    desc: 'A scrappy young predator learning to hunt. Fast but fragile, it relies on sharp fangs to bring down prey.',
    tier: 1,
    hp: 100,
    dmg: 6,
    biomass: 6,
    mats: ['Wolf Fang', 'Wolf Pelt'],
    trait: null,
    drop: 0.03,
    abilities: ['Basic attacks'],
    ability: null,
    element: null,
    mutation: 'sharp',
  },
  venusSlimetrap: {
    name: 'Venus Slimetrap',
    icon: '🌱',
    desc: 'A carnivorous plant that evolved to trap slimes specifically. Its digestive juices are prized by alchemists.',
    tier: 1,
    hp: 124,
    dmg: 4,
    biomass: 8,
    mats: ['Slimetrap Vine', 'Digestive Sac'],
    trait: null,
    drop: 0.03,
    abilities: ['Digest prey'],
    element: 'nature',
    mutation: 'digest',
  },
  pebblet: {
    name: 'Pebblet',
    icon: '🪨',
    desc: 'A small living rock that tumbles through the forest floor. Its stony exterior makes it surprisingly tough.',
    tier: 1,
    hp: 124,
    dmg: 4,
    biomass: 7,
    mats: ['Pebble Shard', 'Earthite', 'Iron Ore'],
    trait: null,
    drop: 0.03,
    abilities: ['Rocky hide'],
    element: 'earth',
    mutation: 'stoneskin',
  },
  vineSpider: {
    name: 'Vine Spider',
    icon: '🕷️',
    desc: 'An aggressive arachnid that weaves webs from living vines. Its bite is quick and its traps are sticky.',
    tier: 1,
    hp: 92,
    dmg: 8,
    biomass: 5,
    mats: ['Spider Silk', 'Vine Weave'],
    trait: null,
    drop: 0.03,
    abilities: ['Web trap'],
    ability: 'webTrap',
    element: 'nature',
    mutation: 'vinewebs',
  },
  lifeFairy: {
    name: 'Life Fairy',
    icon: '🧚',
    desc: 'A rare magical creature that radiates life energy. Fragile but immensely valuable, its essence holds the secret to resurrection.',
    tier: 1,
    hp: 92,
    dmg: 3,
    biomass: 15,
    mats: ['Fairy Dust', 'Life Essence'],
    trait: null,
    drop: 0.01,
    abilities: ['Healing magic'],
    element: 'nature',
    mutation: 'resurrect',
    rare: true,
  },

  // === ZONE 2: Murky Swamp (Enhanced slimes) ===
  serratedCarp: {
    name: 'Serrated Carp',
    icon: '🐟',
    desc: 'A vicious fish with razor-edged scales that can shred through slime membranes. Thrives in the murky swamp waters.',
    tier: 2,
    hp: 175,
    dmg: 9,
    biomass: 8,
    mats: ['Serrated Scale', 'Carp Fin'],
    trait: null,
    drop: 0.03,
    abilities: ['Razor fins'],
    element: 'water',
    mutation: 'spiny',
  },
  antSeaLion: {
    name: 'Ant Sea Lion',
    icon: '🦭',
    desc: 'A bizarre hybrid creature with a chitinous exoskeleton. Its crushing jaws can crack even the toughest slime shell.',
    tier: 2,
    hp: 221,
    dmg: 7,
    biomass: 9,
    mats: ['Sea Lion Tusk', 'Chitin Shell', 'Turtle Shell'],
    trait: null,
    drop: 0.03,
    abilities: ['Crushing bite'],
    element: 'water',
    mutation: 'whirlpool',
  },
  swampStrider: {
    name: 'Swamp Strider',
    icon: '🦟',
    desc: 'A giant mosquito-like insect that skates across swamp water. Its venomous proboscis injects a slow-acting toxin.',
    tier: 2,
    hp: 164,
    dmg: 12,
    biomass: 7,
    mats: ['Strider Leg', 'Marsh Gas', 'Snake Scale'],
    trait: null,
    drop: 0.03,
    abilities: ['Poison sting'],
    ability: 'venomBite',
    element: 'nature',
    mutation: 'farstep',
  },
  wilOWisp: {
    name: "Wil-o'-Wisp",
    icon: '👻',
    desc: 'A flickering ball of spectral energy that lures prey deeper into the swamp. Elementally neutral but hits hard.',
    tier: 2,
    hp: 164,
    dmg: 13,
    biomass: 8,
    mats: ['Wisp Essence', 'Mana Crystal'],
    trait: null,
    drop: 0.03,
    abilities: ['Ethereal form'],
    element: null,
    mutation: 'ethereal',
  },
  theSnail: {
    name: 'Ancient Snail',
    icon: '🐌',
    desc: 'An ancient mollusk that has lived for centuries. Its shell is nearly impenetrable and it yields exceptional biomass.',
    tier: 2,
    hp: 221,
    dmg: 5,
    biomass: 15,
    mats: ['Snail Shell', 'Ancient Stone'],
    trait: null,
    drop: 0.01,
    abilities: ['Ancient defense'],
    element: 'earth',
    mutation: 'theTouch',
    rare: true,
  },

  // === ZONE 3: Crystal Grotto (Enhanced struggle, Elite comfortable) ===
  vampireBat: {
    name: 'Vampire Bat',
    icon: '🦇',
    desc: 'A cave-dwelling predator that feeds on life essence. Its bite drains vitality and heals its own wounds.',
    tier: 3,
    hp: 234,
    dmg: 8,
    biomass: 12,
    mats: ['Bat Wing', 'Echo Crystal'],
    trait: null,
    drop: 0.03,
    abilities: ['Life drain'],
    ability: 'lifeDrain',
    element: null,
    mutation: 'lifesteal',
  },
  rockWorm: {
    name: 'Rock Worm',
    icon: '🪱',
    desc: 'A massive segmented worm that burrows through crystal-laden stone. It hurls rocks from underground to stun prey.',
    tier: 3,
    hp: 288,
    dmg: 7,
    biomass: 14,
    mats: ['Worm Segment', 'Crystal Shard'],
    trait: null,
    drop: 0.03,
    abilities: ['Burrow'],
    ability: 'rockThrow',
    element: 'earth',
    mutation: 'sloughSkin',
  },
  coalSprite: {
    name: 'Coal Sprite',
    icon: '🔥',
    desc: 'A living ember born from the grotto\'s volcanic vents. Small but intensely hot, its attacks leave scorching burns.',
    tier: 3,
    hp: 220,
    dmg: 10,
    biomass: 11,
    mats: ['Coal Dust', 'Spark Essence'],
    trait: null,
    drop: 0.03,
    abilities: ['Ember burst'],
    element: 'fire',
    mutation: 'blindingPowder',
  },
  stalagMite: {
    name: 'Stalag-Mite',
    icon: '⛰️',
    desc: 'A crystal golem formed from living stalagmites. Extremely durable with natural spike armor that punishes attackers.',
    tier: 3,
    hp: 298,
    dmg: 7,
    biomass: 13,
    mats: ['Stalag Shard', 'Cave Mineral'],
    trait: null,
    drop: 0.03,
    abilities: ['Spike armor'],
    element: 'earth',
    mutation: 'dropIn',
  },
  sapphireNewt: {
    name: 'Sapphire Newt',
    icon: '🦎',
    desc: 'A rare amphibian covered in sapphire-like crystal scales. It can regenerate rapidly and is highly sought after.',
    tier: 3,
    hp: 252,
    dmg: 5,
    biomass: 20,
    mats: ['Sapphire Scale', 'Newt Eye'],
    trait: null,
    drop: 0.01,
    abilities: ['Crystal regeneration'],
    element: 'water',
    mutation: 'bejeweled',
    rare: true,
  },

  // === ZONE 4: Cinderspire (Elite comfortable) ===
  embermander: {
    name: 'Embermander',
    icon: '🔥',
    desc: 'A fire-breathing salamander that thrives in volcanic heat. Its fireballs leave lingering burns on anything they touch.',
    tier: 4,
    hp: 359,
    dmg: 13,
    biomass: 22,
    mats: ['Ember Scale', 'Ash Remnant'],
    trait: null,
    drop: 0.03,
    abilities: ['Fire breath'],
    ability: 'fireball',
    element: 'fire',
    mutation: 'regenerate',
  },
  animatedAlloy: {
    name: 'Animated Alloy',
    icon: '🤖',
    desc: 'A construct of living metal animated by ancient magic. Elementally neutral but incredibly durable.',
    tier: 4,
    hp: 480,
    dmg: 11,
    biomass: 25,
    mats: ['Alloy Shard', 'Crude Iron', 'Golem Core'],
    trait: null,
    drop: 0.03,
    abilities: ['Metal body'],
    element: null,
    mutation: 'alloyPotential',
  },
  magmaOoze: {
    name: 'Magma Ooze',
    icon: '🌋',
    desc: 'A sentient pool of magma that flows through the cinderspire. Extremely dangerous up close, it leaves trails of lava.',
    tier: 4,
    hp: 400,
    dmg: 14,
    biomass: 23,
    mats: ['Magma Core', 'Molten Slag', 'Ember Core'],
    trait: null,
    drop: 0.03,
    abilities: ['Lava trail'],
    element: 'fire',
    mutation: 'pyrolyze',
  },
  burntSpirit: {
    name: 'Burnt Spirit',
    icon: '💀',
    desc: 'The restless ghost of a creature consumed by the spire\'s flames. Fragile but hits with devastating ghostly fire.',
    tier: 4,
    hp: 359,
    dmg: 16,
    biomass: 24,
    mats: ['Soul Fragment', 'Ash Wisp', 'Phoenix Ash'],
    trait: null,
    drop: 0.03,
    abilities: ['Ghostly fire'],
    element: 'fire',
    mutation: 'ghastlyWail',
  },
  wyrm: {
    name: 'Fire Wyrm',
    icon: '🐉',
    desc: 'A juvenile dragon that guards the deepest chambers of the cinderspire. Immensely powerful with draconic fury.',
    tier: 4,
    hp: 486,
    dmg: 15,
    biomass: 40,
    mats: ['Wyrm Scale', 'Dragon Bone'],
    trait: null,
    drop: 0.01,
    abilities: ['Draconic fury'],
    element: 'fire',
    mutation: 'draconicPower',
    rare: true,
  },

  // === ZONE 5: Stormspire Summit (Elite struggle, Royal comfortable) ===
  thunderHawk: {
    name: 'Thunder Hawk',
    icon: '🦅',
    desc: 'A raptor crackling with electrical energy. Its diving attacks carry the force of a lightning bolt.',
    tier: 5,
    hp: 607,
    dmg: 20,
    biomass: 35,
    mats: ['Storm Feather', 'Thunder Beak'],
    trait: null,
    drop: 0.03,
    abilities: ['Lightning dive'],
    element: 'water',
    mutation: 'chainLightning',
  },
  boulderTroll: {
    name: 'Boulder Troll',
    icon: '🧌',
    desc: 'A massive troll with skin like granite. It can regenerate wounds mid-battle, making prolonged fights dangerous.',
    tier: 5,
    hp: 821,
    dmg: 18,
    biomass: 40,
    mats: ['Troll Hide', 'Stone Club', 'Iron Ore'],
    trait: null,
    drop: 0.03,
    abilities: ['Regeneration'],
    ability: 'heal',
    element: 'earth',
    mutation: 'earthshaker',
  },
  stormElemental: {
    name: 'Storm Elemental',
    icon: '⛈️',
    desc: 'A being of pure storm energy. Its chain lightning can arc between multiple targets simultaneously.',
    tier: 5,
    hp: 672,
    dmg: 22,
    biomass: 38,
    mats: ['Storm Core', 'Lightning Shard'],
    trait: null,
    drop: 0.03,
    abilities: ['Chain lightning'],
    element: 'water',
    mutation: 'charged',
  },
  frostGiant: {
    name: 'Frost Giant',
    icon: '🥶',
    desc: 'A towering ice creature whose freezing breath can slow enemies to a crawl. Durable and relentless.',
    tier: 5,
    hp: 770,
    dmg: 21,
    biomass: 42,
    mats: ['Frost Gem', 'Giant Bone'],
    trait: null,
    drop: 0.03,
    abilities: ['Freezing aura'],
    ability: 'frostBreath',
    element: 'water',
    mutation: 'permafrost',
  },
  thunderbird: {
    name: 'Thunderbird',
    icon: '🦜',
    desc: 'A legendary avian spirit that commands the storms themselves. Among the most powerful aerial predators.',
    tier: 5,
    hp: 700,
    dmg: 26,
    biomass: 60,
    mats: ['Thunderbird Plume', 'Storm Essence'],
    trait: null,
    drop: 0.01,
    abilities: ['Storm call'],
    element: 'water',
    mutation: 'stormcaller',
    rare: true,
  },

  // === ZONE 6: Void Abyss (Royal with investment) ===
  voidTendril: {
    name: 'Void Tendril',
    icon: '🦑',
    desc: 'A writhing appendage reaching from the void between dimensions. Its touch ignores all physical defenses.',
    tier: 6,
    hp: 975,
    dmg: 30,
    biomass: 70,
    mats: ['Void Fiber', 'Dark Matter'],
    trait: null,
    drop: 0.03,
    abilities: ['Reality warp'],
    ability: 'voidTouch',
    element: null,
    mutation: 'consume',
  },
  abyssalWatcher: {
    name: 'Abyssal Watcher',
    icon: '👁️',
    desc: 'A floating eye from the deepest void. It sees all weaknesses and strikes with perfect accuracy.',
    tier: 6,
    hp: 910,
    dmg: 34,
    biomass: 65,
    mats: ['Watcher Eye', 'Abyssal Fragment'],
    trait: null,
    drop: 0.03,
    abilities: ['All-seeing gaze'],
    element: null,
    mutation: 'allSeeing',
  },
  nullConstruct: {
    name: 'Null Construct',
    icon: '🗿',
    desc: 'An ancient construct built from void-infused stone. Immune to elemental damage and incredibly resilient.',
    tier: 6,
    hp: 1170,
    dmg: 28,
    biomass: 75,
    mats: ['Null Core', 'Construct Piece'],
    trait: null,
    drop: 0.03,
    abilities: ['Element immunity'],
    element: null,
    mutation: 'nullify',
  },
  realityShard: {
    name: 'Reality Shard',
    icon: '💠',
    desc: 'A fragment of broken reality given form. It phases in and out of existence, dealing devastating damage.',
    tier: 6,
    hp: 884,
    dmg: 38,
    biomass: 62,
    mats: ['Reality Fragment', 'Dimension Tear'],
    trait: null,
    drop: 0.03,
    abilities: ['Phase shift'],
    element: null,
    mutation: 'fracture',
  },
  hollowOne: {
    name: 'The Hollow One',
    icon: '🕳️',
    desc: 'The guardian of the Void Abyss itself. An emptiness given form that consumes all it touches. The ultimate challenge.',
    tier: 6,
    hp: 1196,
    dmg: 40,
    biomass: 120,
    mats: ['Hollow Core', 'Void Essence'],
    trait: null,
    drop: 0.01,
    abilities: ['Existence drain'],
    element: null,
    mutation: 'voidTouched',
    rare: true,
  },
};

// Zone tier to recommended slime tier mapping (for UI hints)
export const ZONE_DIFFICULTY = {
  1: { recommended: 'basic', danger: 'enhanced', minStats: 5, description: 'Safe for Basic slimes' },
  2: { recommended: 'enhanced', danger: 'elite', minStats: 10, description: 'Basic slimes will struggle' },
  3: { recommended: 'enhanced', danger: 'elite', minStats: 15, description: 'Basic slimes will die quickly' },
  4: { recommended: 'elite', danger: 'royal', minStats: 20, description: 'Enhanced slimes will struggle' },
  5: { recommended: 'royal', danger: null, minStats: 28, description: 'Elite slimes will struggle' },
  6: { recommended: 'royal', danger: null, minStats: 35, description: 'Even Royal slimes need investment' },
};
