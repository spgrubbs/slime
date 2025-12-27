// Building definitions - structures to construct
export const BUILDINGS = {
  slimePit: { name: 'Slime Pit', icon: '🕳️', desc: '+10 max Magicka', cost: { 'Wolf Pelt': 5, 'Crude Iron': 3 } },
  researchLab: { name: 'Research Chamber', icon: '🔬', desc: '+25% build speed', cost: { 'Mana Crystal': 3, 'Ancient Stone': 5 } },
  hatchery: { name: 'Royal Hatchery', icon: '🥚', desc: 'Unlock Elite Slimes', cost: { 'Dragon Scale': 1, 'Soul Fragment': 10 }, max: 1 },
  defenseSlot: { name: 'Defense Slot', icon: '🎯', desc: '+1 Tower Defense slot', cost: { 'Human Bone': 5, 'Iron Sword': 3 }, max: 6 },
  efficientDigestion: { name: 'Biomass Pools', icon: '🧪', desc: '+20% biomass gain', cost: 50, time: 60, max: 1 },
  enhancedAbsorption: { name: 'Absorption Nexus', icon: '🔮', desc: '+25% reabsorb XP', cost: 100, time: 120, max: 1 },
  slimeVitality: { name: 'Vitality Chamber', icon: '💗', desc: '+15% max HP', cost: 150, time: 180, max: 1 },
  swiftSlimes: { name: 'Training Arena', icon: '⚔️', desc: '+20% attack speed', cost: 200, time: 240, max: 1 },
  extendedExpedition: { name: 'Expedition Depot', icon: '🗺️', desc: 'Unlock 100-enemy expeditions', cost: 250, time: 300, max: 1 },
  infiniteExpedition: { name: 'Deep Exploration Hub', icon: '🌌', desc: 'Unlock infinite expeditions', cost: 500, time: 600, max: 1 },
};

// Research definitions - upgrades to unlock
export const RESEARCH = {
  efficientDigestion: { name: 'Efficient Digestion', desc: '+20% biomass', cost: 50, time: 60 },
  enhancedAbsorption: { name: 'Enhanced Absorption', desc: '+25% reabsorb XP', cost: 100, time: 120 },
  slimeVitality: { name: 'Slime Vitality', desc: '+15% max HP', cost: 150, time: 180 },
  swiftSlimes: { name: 'Swift Strikes', desc: '+20% attack speed', cost: 200, time: 240 },
};
