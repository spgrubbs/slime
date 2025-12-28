// Human invader types for tower defense
export const HUMAN_TYPES = {
  warrior: { name: 'Human Warrior', icon: '⚔️', hp: 100, speed: 1, biomassReward: 20, mats: ['Human Bone', 'Iron Sword'] },
};

// Tower defense wave definitions
export const TD_WAVES = [
  { wave: 1, humans: 5, hpMultiplier: 1, reward: { biomass: 50, mats: { 'Human Bone': 3, 'Iron Sword': 2 } } },
  { wave: 2, humans: 8, hpMultiplier: 1.5, reward: { biomass: 75, mats: { 'Human Bone': 5, 'Iron Sword': 3 } } },
  { wave: 3, humans: 12, hpMultiplier: 2, reward: { biomass: 100, mats: { 'Human Bone': 8, 'Iron Sword': 5 } } },
];
