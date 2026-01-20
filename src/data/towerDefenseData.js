// Human invader types for tower defense
export const HUMAN_TYPES = {
  warrior: { name: 'Human Warrior', icon: '⚔️', hp: 50, speed: 0.8, biomassReward: 20, mats: ['Human Bone', 'Iron Sword'] },
  boss: {
    name: 'Human Champion',
    icon: '🛡️',
    hp: 200,
    speed: 0.5, // Slower but tankier
    biomassReward: 100,
    mats: ['Human Bone', 'Iron Sword', 'Champion Badge'],
    isBoss: true,
  },
};

// Base tower defense wave definitions (scaled by queen level)
export const TD_WAVES = [
  { wave: 1, humans: 3, hpMultiplier: 1, reward: { biomass: 50, mats: { 'Human Bone': 3, 'Iron Sword': 2 } } },
  { wave: 2, humans: 5, hpMultiplier: 1.3, reward: { biomass: 75, mats: { 'Human Bone': 5, 'Iron Sword': 3 } } },
  { wave: 3, humans: 7, hpMultiplier: 1.6, reward: { biomass: 100, mats: { 'Human Bone': 8, 'Iron Sword': 5 } } },
];

// Calculate TD scaling based on queen level
// Higher queen level = slightly harder TD, but also stronger slimes
export const getTDScaling = (queenLevel) => {
  const scaleFactor = 1 + (queenLevel - 1) * 0.1; // 10% increase per level
  return {
    hpMultiplier: scaleFactor,
    countMultiplier: Math.floor(1 + (queenLevel - 1) * 0.2), // +20% humans per level (rounded)
    rewardMultiplier: 1 + (queenLevel - 1) * 0.15, // 15% better rewards per level
  };
};
