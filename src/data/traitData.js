// Trait library - abilities gained from monsters
export const TRAIT_LIBRARY = {
  wolfFang: { name: 'Wolf Fang', icon: '🐺', stat: 'firmness', bonus: 3, passive: 'ferocity', passiveDesc: '+15% damage', color: '#94a3b8' },
  goblinCunning: { name: 'Goblin Cunning', icon: '👺', stat: 'slipperiness', bonus: 3, passive: 'trickster', passiveDesc: '+8% dodge & crit', color: '#84cc16' },
  turtleShell: { name: 'Turtle Shell', icon: '🐢', stat: 'firmness', bonus: 5, passive: 'armored', passiveDesc: '-20% damage taken', color: '#65a30d' },
  batWing: { name: 'Bat Wing', icon: '🦇', stat: 'slipperiness', bonus: 4, passive: 'echolocation', passiveDesc: '+12% dodge', color: '#6366f1' },
  boneArmor: { name: 'Bone Armor', icon: '💀', stat: 'firmness', bonus: 3, passive: 'undying', passiveDesc: 'Survive fatal blow once', color: '#d4d4d4' },
  ogreStrength: { name: 'Ogre Might', icon: '👹', stat: 'firmness', bonus: 6, passive: 'crushing', passiveDesc: '+30% crit damage', color: '#dc2626' },
  dragonHeart: { name: 'Dragon Heart', icon: '🐉', stat: 'viscosity', bonus: 5, passive: 'fireBreath', passiveDesc: 'Attacks apply Burn', color: '#f97316' },
  wispGlow: { name: 'Wisp Essence', icon: '✨', stat: 'viscosity', bonus: 4, passive: 'manaLeech', passiveDesc: '+10% biomass/kill', color: '#8b5cf6' },
  venomSac: { name: 'Venom Sac', icon: '🧪', stat: 'viscosity', bonus: 3, passive: 'poison', passiveDesc: 'Attacks apply Poison', color: '#22c55e' },
  crystalCore: { name: 'Crystal Core', icon: '💎', stat: 'firmness', bonus: 4, passive: 'reflect', passiveDesc: 'Reflect 15% damage', color: '#06b6d4' },
  shadowCloak: { name: 'Shadow Cloak', icon: '🌑', stat: 'slipperiness', bonus: 5, passive: 'ambush', passiveDesc: 'First attack crits', color: '#1f2937' },
  phoenixFeather: { name: 'Phoenix Feather', icon: '🔥', stat: 'viscosity', bonus: 3, passive: 'rebirth', passiveDesc: 'Revive at 30% HP once', color: '#fb923c' },
};

// Status effects that can be applied in combat
export const STATUS_EFFECTS = {
  poison: { name: 'Poison', icon: '🧪', color: '#22c55e', dmg: 2, dur: 5 },
  burn: { name: 'Burn', icon: '🔥', color: '#f97316', dmg: 3, dur: 4 },
  bleed: { name: 'Bleed', icon: '🩸', color: '#ef4444', dmg: 4, dur: 3 },
};
