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
        cost: { biomass: 400, mats: { 'Wolf Fang': 8, 'Spider Silk': 8, 'Vine Weave': 8, 'Earthite': 8 } } },
      { title: 'Root', desc: '+6% biomass from expeditions',
        cost: { biomass: 2500, mats: { 'Heartwood Core': 1 } },
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
        cost: { biomass: 600, mats: { 'Heartwood Seal': 1 } } },
      { title: 'Provoke', desc: 'The Mire Warden can be challenged',
        cost: { biomass: 1500, mats: { 'Carp Fin': 10, 'Marsh Gas': 10, 'Wisp Essence': 10, 'Strider Leg': 10 } } },
      { title: 'Root', desc: '+6% material drops',
        cost: { biomass: 6000, mats: { 'Mire Core': 1 } },
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
        cost: { biomass: 2000, mats: { 'Bog Seal': 1 } } },
      { title: 'Provoke', desc: 'The Geode Warden can be challenged',
        cost: { biomass: 4000, mats: { 'Echo Crystal': 10, 'Coal Dust': 10, 'Stalag Shard': 10, 'Cave Mineral': 10 } } },
      { title: 'Root', desc: '+6% max HP',
        cost: { biomass: 14000, mats: { 'Geode Core': 1 } },
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
        cost: { biomass: 6000, mats: { 'Geode Seal': 1 } } },
      { title: 'Provoke', desc: 'The Cinder Warden can be challenged',
        cost: { biomass: 12000, mats: { 'Ember Scale': 12, 'Alloy Shard': 12, 'Molten Slag': 12, 'Ash Wisp': 12 } } },
      { title: 'Root', desc: '+6% firmness',
        cost: { biomass: 32000, mats: { 'Cinder Core': 1 } },
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
        cost: { biomass: 16000, mats: { 'Cinder Seal': 1 } } },
      { title: 'Provoke', desc: 'The Storm Warden can be challenged',
        cost: { biomass: 30000, mats: { 'Storm Feather': 12, 'Troll Hide': 12, 'Lightning Shard': 12, 'Giant Bone': 12 } } },
      { title: 'Root', desc: '+6% slipperiness',
        cost: { biomass: 70000, mats: { 'Storm Core Prime': 1 } },
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
        cost: { biomass: 40000, mats: { 'Storm Seal': 1 } } },
      { title: 'Provoke', desc: 'The Hollow Warden can be challenged',
        cost: { biomass: 80000, mats: { 'Void Fiber': 14, 'Watcher Eye': 14, 'Construct Piece': 14, 'Reality Fragment': 14 } } },
      { title: 'Root', desc: '+6% viscosity',
        cost: { biomass: 160000, mats: { 'Hollow Core Prime': 1 } },
        passive: { viscosity: 6 } },
    ],
  },

  // === SLIME TIER UNLOCK BUILDINGS ===
  // These gate access to higher tier slimes

  spawningVat: {
    name: 'Spawning Vat',
    icon: '🧫',
    desc: 'Enables spawning of Enhanced slimes',
    cost: { biomass: 200, mats: { 'Wolf Pelt': 5, 'Spider Silk': 5 } },
    max: 1,
    category: 'tier',
  },
  royalHatchery: {
    name: 'Gestation Pool',
    icon: '🥚',
    desc: 'Enables spawning of Elite slimes',
    cost: { biomass: 800, mats: { 'Snail Shell': 3, 'Mana Crystal': 5 } },
    max: 1,
    category: 'tier',
  },
  primordialChamber: {
    name: 'Primordial Chamber',
    icon: '👑',
    desc: 'Enables spawning of Royal slimes',
    cost: { biomass: 3000, mats: { 'Wyrm Scale': 2, 'Void Essence': 5, 'Storm Core': 3 } },
    max: 1,
    category: 'tier',
  },

  // === CAPACITY BUILDINGS ===
  // These increase slime/jelly capacity

  slimePit: {
    name: 'Slime Pit',
    icon: '🕳️',
    desc: '+10 max Plasm',
    cost: { biomass: 1500, mats: { 'Human Bone': 8, 'Iron Sword': 5 } }, // Now requires human materials!
    max: 5,                             // Can build multiple
    category: 'capacity',
  },
  ambushSlot: {
    name: 'Ambush Post',
    icon: '🎯',
    desc: '+1 slime in the caravan ambush squad',
    cost: { biomass: 500, mats: { 'Ash Remnant': 5, 'Ancient Stone': 3 } },
    max: 4,
    category: 'capacity',
  },

  slimeCatapult: {
    name: 'Slime Catapult',
    icon: '🪃',
    desc: 'A road emplacement that lobs slimes at passing caravans every round',
    cost: { biomass: 1200, mats: { 'Ancient Stone': 6, 'Iron Ore': 4, 'Human Bone': 3 } },
    max: 4,
    category: 'utility',
    skillUnlock: 'siegeEngineering',
  },

  renderingVat: {
    name: 'Rendering Vat',
    icon: '⚗️',
    desc: 'Recover mutagens from a reabsorbed slime instead of losing them',
    cost: { biomass: 4000, mats: { 'Void Essence': 3, 'Champion Badge': 1, 'Mana Crystal': 8 } },
    max: 2,                             // tier 1 recovers half, tier 2 all of it
    category: 'utility',
    skillUnlock: 'renderingVat',
  },

  scoutCamp: {
    name: 'Scout Camp',
    icon: '🔭',
    desc: 'Scouts read the road: see tomorrow\'s caravan before you commit to it',
    cost: { biomass: 900, mats: { 'Human Bone': 4, 'Spider Silk': 6 } },
    max: 1,
    category: 'utility',
  },

  // === UTILITY BUILDINGS ===
  // These provide various bonuses

  researchLab: {
    name: 'Research Chamber',
    icon: '🔬',
    desc: '+25% research speed',
    cost: { biomass: 400, mats: { 'Mana Crystal': 3, 'Crystal Shard': 5 } },
    max: 1,
    category: 'utility',
  },
  biomassReclaimer: {
    name: 'Biomass Reclaimer',
    icon: '♻️',
    desc: 'Recover biomass when slimes die: Tier 1 = 25%, Tier 2 = 50%, Tier 3 = 75%',
    cost: { biomass: 600, mats: { 'Life Essence': 3, 'Digestive Sac': 5 } },
    upgradeCost: { biomass: 2000, mats: { 'Life Essence': 8, 'Fairy Dust': 3 }, multiplier: 3 },
    max: 3,
    category: 'utility',
    recoveryPerTier: 0.25, // 25% per tier
  },

  // === RESEARCH UPGRADES ===
  // These are permanent upgrades researched with biomass

  efficientDigestion: {
    name: 'Biomass Pools',
    icon: '🧪',
    desc: '+20% biomass gain from kills',
    cost: 150,                          // Increased from 50
    time: 600,                          // 10 minutes real-time (now in real seconds)
    max: 1,
    category: 'research',
  },
  enhancedAbsorption: {
    name: 'Absorption Nexus',
    icon: '🔮',
    desc: '+25% biomass when reabsorbing slimes',
    cost: 300,                          // Increased from 100
    time: 1200,                         // 20 minutes
    max: 1,
    category: 'research',
  },
  slimeVitality: {
    name: 'Vitality Chamber',
    icon: '💗',
    desc: '+15% max HP for all slimes',
    cost: 500,                          // Increased from 150
    time: 1800,                         // 30 minutes
    max: 1,
    category: 'research',
  },
  swiftSlimes: {
    name: 'Training Arena',
    icon: '⚔️',
    desc: '+20% attack frequency in combat',
    cost: 750,                          // Increased from 200
    time: 2400,                         // 40 minutes
    max: 1,
    category: 'research',
  },
  extendedExpedition: {
    name: 'Expedition Depot',
    icon: '🗺️',
    desc: 'Parties travel between encounters 40% faster',
    cost: 1000,
    time: 3600,                         // 1 hour
    max: 1,
    category: 'research',
  },
  infiniteExpedition: {
    name: 'Deep Exploration Hub',
    icon: '🌌',
    desc: '+25% material drops on expeditions',
    cost: 2500,
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
