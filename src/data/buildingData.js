// Building definitions - structures to construct
// BALANCE: Buildings are progression gates and should take time to acquire
// Slime tier unlocks are building-gated, not level-gated
// Slime Pit is late-game and requires human materials

export const BUILDINGS = {
  // === ZONE TENDRILS ===
  //
  // The nucleus reaches a zone by growing a tendril into it. Three levels, and
  // each one is a different kind of gate:
  //
  //   1 REACH    expeditions to this zone become possible. Bought with the
  //              PREVIOUS zone's Warden Seal — so the way into a new zone is
  //              beating the one before it, not spending a skill point.
  //   2 PROVOKE  the zone's Warden can be challenged. Bought with four
  //              ordinary materials from this zone in quantity: ~90-150 kills,
  //              which is the mild grind an incremental wants before a boss.
  //   3 ROOT     a small permanent passive. Bought with the Warden's Heart,
  //              which only the Rekindled (post-first-kill) Warden drops.
  //
  // The forest tendril starts at level 1 on a new game; there is no earlier
  // Warden to buy it with, and the first zone should not be gated at all.

  forestTendril: {
    name: 'Verdant Tendril',
    icon: '🌲',
    zone: 'forest',
    category: 'tendril',
    max: 3,
    levels: [
      { title: 'Reach', desc: 'Expeditions into the Verdant Forest',
        cost: { biomass: 0, mats: {} } },
      { title: 'Provoke', desc: 'The Verdant Warden can be challenged',
        cost: { biomass: 830, mats: { 'Wolf Fang': 20, 'Spider Silk': 20, 'Vine Weave': 19, 'Earthite': 16 } } },
      { title: 'Root', desc: '+6% biomass from expeditions',
        cost: { biomass: 4400, mats: { 'Heartwood Core': 1 } },
        passive: { expeditionBiomass: 6 } },
    ],
  },
  swampTendril: {
    name: 'Mirebound Tendril',
    icon: '🌿',
    zone: 'swamp',
    category: 'tendril',
    max: 3,
    levels: [
      { title: 'Reach', desc: 'Expeditions into the Murky Swamp',
        cost: { biomass: 1100, mats: { 'Heartwood Seal': 1 } } },
      { title: 'Provoke', desc: 'The Mire Warden can be challenged',
        cost: { biomass: 2800, mats: { 'Carp Fin': 40, 'Marsh Gas': 45, 'Wisp Essence': 45, 'Strider Leg': 45 } } },
      { title: 'Root', desc: '+6% material drops',
        cost: { biomass: 8200, mats: { 'Mire Core': 1 } },
        passive: { materialDrop: 6 } },
    ],
  },
  cavesTendril: {
    name: 'Crystalline Tendril',
    icon: '💎',
    zone: 'caves',
    category: 'tendril',
    max: 3,
    levels: [
      { title: 'Reach', desc: 'Expeditions into the Crystal Grotto',
        cost: { biomass: 2800, mats: { 'Bog Seal': 1 } } },
      { title: 'Provoke', desc: 'The Geode Warden can be challenged',
        cost: { biomass: 6600, mats: { 'Echo Crystal': 75, 'Coal Dust': 80, 'Stalag Shard': 65, 'Cave Mineral': 75 } } },
      { title: 'Root', desc: '+6% max HP',
        cost: { biomass: 19000, mats: { 'Geode Core': 1 } },
        passive: { maxHp: 6 } },
    ],
  },
  ruinsTendril: {
    name: 'Cinderfast Tendril',
    icon: '🔥',
    zone: 'ruins',
    category: 'tendril',
    max: 3,
    levels: [
      { title: 'Reach', desc: 'Expeditions into the Cinderspire',
        cost: { biomass: 8200, mats: { 'Geode Seal': 1 } } },
      { title: 'Provoke', desc: 'The Cinder Warden can be challenged',
        cost: { biomass: 19000, mats: { 'Ember Scale': 120, 'Alloy Shard': 160, 'Molten Slag': 120, 'Ash Wisp': 120 } } },
      { title: 'Root', desc: '+6% firmness',
        cost: { biomass: 50000, mats: { 'Cinder Core': 1 } },
        passive: { firmness: 6 } },
    ],
  },
  peaksTendril: {
    name: 'Stormfast Tendril',
    icon: '⛰️',
    zone: 'peaks',
    category: 'tendril',
    max: 3,
    levels: [
      { title: 'Reach', desc: 'Expeditions into Stormspire Summit',
        cost: { biomass: 22000, mats: { 'Cinder Seal': 1 } } },
      { title: 'Provoke', desc: 'The Storm Warden can be challenged',
        cost: { biomass: 44000, mats: { 'Storm Feather': 160, 'Troll Hide': 180, 'Lightning Shard': 150, 'Giant Bone': 190 } } },
      { title: 'Root', desc: '+6% slipperiness',
        cost: { biomass: 110000, mats: { 'Storm Core Prime': 1 } },
        passive: { slipperiness: 6 } },
    ],
  },
  volcanoTendril: {
    name: 'Hollow Tendril',
    icon: '🕳️',
    zone: 'volcano',
    category: 'tendril',
    max: 3,
    levels: [
      { title: 'Reach', desc: 'Expeditions into the Void Abyss',
        cost: { biomass: 55000, mats: { 'Storm Seal': 1 } } },
      { title: 'Provoke', desc: 'The Hollow Warden can be challenged',
        cost: { biomass: 110000, mats: { 'Void Fiber': 220, 'Watcher Eye': 220, 'Construct Piece': 150, 'Reality Fragment': 220 } } },
      { title: 'Root', desc: '+6% viscosity',
        cost: { biomass: 250000, mats: { 'Hollow Core Prime': 1 } },
        passive: { viscosity: 6 } },
    ],
  },

  // === SLIME TIER UNLOCK BUILDINGS ===
  // These gate access to higher tier slimes

  spawningVat: {
    name: 'Spawning Vat',
    icon: '🧫',
    desc: 'Lets you bud Enhanced slimes',
    cost: { biomass: 330, mats: { 'Wolf Pelt': 11, 'Spider Silk': 11 } },
    max: 1,
    category: 'tier',
  },
  royalHatchery: {
    name: 'Gestation Pool',
    icon: '🥚',
    desc: 'Lets you bud Elite slimes',
    cost: { biomass: 2200, mats: { 'Snail Shell': 7, 'Mana Crystal': 14 } },
    max: 1,
    category: 'tier',
  },
  primordialChamber: {
    name: 'Primordial Chamber',
    icon: '👑',
    desc: 'Lets you bud Royal slimes',
    cost: { biomass: 14000, mats: { 'Wyrm Scale': 16, 'Ember Core': 8, 'Phoenix Ash': 8 } },
    max: 1,
    category: 'tier',
  },

  // === CAPACITY BUILDINGS ===
  // These increase slime/jelly capacity

  slimePit: {
    name: 'Slime Pit',
    icon: '🕳️',
    desc: '+10 plasm',
    cost: { biomass: 830, mats: { 'Human Bone': 4, 'Iron Sword': 3 } }, // Now requires human materials!
    max: 5,                             // Can build multiple
    category: 'capacity',
  },
  ambushSlot: {
    name: 'Ambush Post',
    icon: '🎯',
    desc: '+1 slime in the ambush squad',
    cost: { biomass: 830, mats: { 'Ancient Stone': 3, 'Chitin Shell': 11 } },
    max: 4,
    category: 'capacity',
  },

  slimeCatapult: {
    name: 'Slime Catapult',
    icon: '🪃',
    desc: 'Lobs a slime at the passing caravan every round of an ambush',
    cost: { biomass: 1700, mats: { 'Ancient Stone': 7, 'Iron Ore': 11, 'Human Bone': 6 } },
    max: 4,
    category: 'utility',
    skillUnlock: 'siegeEngineering',
  },

  renderingVat: {
    name: 'Rendering Vat',
    icon: '⚗️',
    desc: 'Pulls mutagens back out of a reabsorbed slime. Level 1 saves half, level 2 saves them all',
    cost: { biomass: 6600, mats: { 'Crystal Shard': 6, 'Champion Badge': 1, 'Mana Crystal': 11 } },
    max: 2,                             // tier 1 recovers half, tier 2 all of it
    category: 'utility',
    skillUnlock: 'renderingVat',
  },

  // Mutagens are scarce on purpose (§25); these are the slow, permanent way
  // to make them less so, and a sink for late-game materials.
  geneSieve: {
    name: 'Gene Sieve',
    icon: '🧬',
    desc: 'Strains genes out of everything we bring home. Every mutagen is 50% more likely to drop, per level',
    cost: { biomass: 5500, mats: { 'Crystal Shard': 8, 'Newt Eye': 10, 'Echo Crystal': 40 } },
    max: 3,
    category: 'utility',
  },

  // The carry cap's late answer: biomass that never has to be carried.
  feedingTendril: {
    name: 'Feeding Tendril',
    icon: '🫗',
    desc: 'Pipes 15% of every kill\'s biomass straight home to the nucleus, per level. It never fills up',
    cost: { biomass: 3000, mats: { 'Digestive Sac': 30, 'Snake Scale': 10, 'Marsh Gas': 40 } },
    max: 3,
    category: 'utility',
  },

  scoutCamp: {
    name: 'Scout Camp',
    icon: '🔭',
    desc: 'See what the caravan is carrying before you pick a squad',
    cost: { biomass: 1400, mats: { 'Human Bone': 4, 'Spider Silk': 16 } },
    max: 1,
    category: 'utility',
  },

  // === UTILITY BUILDINGS ===
  // These provide various bonuses

  researchLab: {
    name: 'Research Chamber',
    icon: '🔬',
    desc: 'Research goes 25% faster',
    cost: { biomass: 830, mats: { 'Mana Crystal': 6, 'Snake Scale': 8 } },
    max: 1,
    category: 'utility',
  },
  biomassReclaimer: {
    name: 'Biomass Reclaimer',
    icon: '♻️',
    desc: 'When a slime falls, get back 25% of its stored biomass per level',
    cost: { biomass: 1100, mats: { 'Life Essence': 6, 'Digestive Sac': 11 } },
    upgradeCost: { biomass: 1100, mats: { 'Life Essence': 4, 'Fairy Dust': 2 }, multiplier: 3 },
    max: 3,
    category: 'utility',
    recoveryPerTier: 0.25, // 25% per tier
  },

  // === RESEARCH UPGRADES ===
  // These are permanent upgrades researched with biomass

  efficientDigestion: {
    name: 'Biomass Pools',
    icon: '🧪',
    desc: '+20% biomass from kills',
    cost: 80,
    time: 600,                          // 10 minutes real-time (now in real seconds)
    max: 1,
    category: 'research',
  },
  enhancedAbsorption: {
    name: 'Absorption Nexus',
    icon: '🔮',
    desc: '+25% biomass when reabsorbing a slime',
    cost: 160,
    time: 1200,                         // 20 minutes
    max: 1,
    category: 'research',
  },
  slimeVitality: {
    name: 'Vitality Chamber',
    icon: '💗',
    desc: '+15% max HP for every slime',
    cost: 280,
    time: 1800,                         // 30 minutes
    max: 1,
    category: 'research',
  },
  swiftSlimes: {
    name: 'Training Arena',
    icon: '⚔️',
    desc: '+10% damage in every fight',
    cost: 410,
    time: 2400,                         // 40 minutes
    max: 1,
    category: 'research',
  },
  extendedExpedition: {
    name: 'Expedition Depot',
    icon: '🗺️',
    desc: 'Parties travel between encounters 40% faster',
    cost: 550,
    time: 3600,                         // 1 hour
    max: 1,
    category: 'research',
  },
  infiniteExpedition: {
    name: 'Deep Exploration Hub',
    icon: '🌌',
    desc: '+25% material drops',
    cost: 1400,
    time: 7200,                         // 2 hours
    max: 1,
    category: 'research',
  },
};

// Backward compatibility alias
export const RESEARCH = {
  efficientDigestion: BUILDINGS.efficientDigestion,
  enhancedAbsorption: BUILDINGS.enhancedAbsorption,
  slimeVitality: BUILDINGS.slimeVitality,
  swiftSlimes: BUILDINGS.swiftSlimes,
  extendedExpedition: BUILDINGS.extendedExpedition,
  infiniteExpedition: BUILDINGS.infiniteExpedition,
};

// ── Tendrils ─────────────────────────────────────────────────────────────────

/** buildingId of the tendril that reaches `zone`. */
export const tendrilFor = (zone) => `${zone}Tendril`;

/** Every tendril building, in zone order. */
export const TENDRILS = Object.entries(BUILDINGS)
  .filter(([, b]) => b.category === 'tendril')
  .map(([id, b]) => ({ id, ...b }));

/**
 * The cost of taking `id` from its current level to the next one.
 *
 * Buildings with a `levels` array price each level separately; everything else
 * charges the same `cost` every time, which is what the old flat model did.
 */
export const nextLevelCost = (id, currentLevel = 0) => {
  const b = BUILDINGS[id];
  if (!b) return null;
  if (b.levels) return b.levels[currentLevel]?.cost ?? null;
  return b.cost;
};

/** The level entry a building is AT (0-indexed into `levels`), or null. */
export const levelInfo = (id, level = 0) => BUILDINGS[id]?.levels?.[level - 1] ?? null;

/**
 * Combined passive bonuses from every fully-grown tendril, as percentage points
 * keyed the same way skill bonuses are, so the two just add.
 */
export const tendrilBonuses = (builds = {}) => {
  const out = {};
  for (const t of TENDRILS) {
    const lvl = builds[t.id] || 0;
    for (let i = 0; i < lvl; i++) {
      const p = t.levels[i]?.passive;
      if (p) for (const [k, v] of Object.entries(p)) out[k] = (out[k] || 0) + v;
    }
  }
  return out;
};

/** A zone is reachable once its tendril exists at all. */
export const zoneReached = (zone, builds = {}) => (builds[tendrilFor(zone)] || 0) >= 1;

/** A zone's Warden can be challenged once its tendril has been provoked. */
export const wardenUnlocked = (zone, builds = {}) => (builds[tendrilFor(zone)] || 0) >= 2;
