// Monster type definitions
// Elements: fire, water, nature, earth, or null (neutral)
export const MONSTER_TYPES = {
  wolf: { name: 'Wolf', icon: '🐺', diff: 1, hp: 40, dmg: 4, biomass: 5, mats: ['Wolf Fang', 'Wolf Pelt'], trait: 'wolfFang', drop: 0.025, abilities: ['Can apply Bleed'], element: 'nature' },
  goblin: { name: 'Goblin', icon: '👺', diff: 2, hp: 35, dmg: 6, biomass: 8, mats: ['Goblin Ear', 'Crude Iron'], trait: 'goblinCunning', drop: 0.025, abilities: ['High dodge'], element: 'earth' },
  turtle: { name: 'Giant Turtle', icon: '🐢', diff: 3, hp: 120, dmg: 5, biomass: 12, mats: ['Turtle Shell', 'Ancient Stone'], trait: 'turtleShell', drop: 0.02, abilities: ['Very tanky'], element: 'water' },
  bat: { name: 'Cave Bat', icon: '🦇', diff: 1, hp: 25, dmg: 3, biomass: 4, mats: ['Bat Wing', 'Echo Crystal'], trait: 'batWing', drop: 0.03, abilities: ['Fast'], element: null },
  skeleton: { name: 'Skeleton', icon: '💀', diff: 2, hp: 45, dmg: 8, biomass: 7, mats: ['Bone Dust', 'Soul Fragment'], trait: 'boneArmor', drop: 0.025, abilities: ['Immune to Poison'], element: 'earth' },
  snake: { name: 'Venom Snake', icon: '🐍', diff: 2, hp: 30, dmg: 5, biomass: 9, mats: ['Snake Scale', 'Venom Gland'], trait: 'venomSac', drop: 0.025, abilities: ['Poisons'], element: 'nature' },
  golem: { name: 'Crystal Golem', icon: '🗿', diff: 4, hp: 180, dmg: 12, biomass: 18, mats: ['Crystal Shard', 'Golem Core'], trait: 'crystalCore', drop: 0.015, abilities: ['Very tanky'], element: 'earth' },
  shade: { name: 'Shadow Shade', icon: '👤', diff: 3, hp: 40, dmg: 15, biomass: 14, mats: ['Shadow Wisp', 'Dark Essence'], trait: 'shadowCloak', drop: 0.02, abilities: ['High dodge'], element: null },
  ogre: { name: 'Ogre', icon: '👹', diff: 5, hp: 200, dmg: 18, biomass: 25, mats: ['Ogre Hide', 'Ogre Club'], trait: 'ogreStrength', drop: 0.015, abilities: ['Massive damage'], element: 'earth' },
  dragon: { name: 'Young Dragon', icon: '🐉', diff: 8, hp: 350, dmg: 25, biomass: 50, mats: ['Dragon Scale', 'Dragon Bone'], trait: 'dragonHeart', drop: 0.01, abilities: ['Burns', 'Fire breath'], element: 'fire' },
  wisp: { name: 'Magic Wisp', icon: '✨', diff: 3, hp: 50, dmg: 10, biomass: 10, mats: ['Wisp Essence', 'Mana Crystal'], trait: 'wispGlow', drop: 0.025, abilities: ['Magic damage'], element: null },
  phoenix: { name: 'Phoenix Chick', icon: '🔥', diff: 6, hp: 150, dmg: 20, biomass: 35, mats: ['Phoenix Ash', 'Ember Core'], trait: 'phoenixFeather', drop: 0.012, abilities: ['Burns', 'Revives'], element: 'fire' },
};
