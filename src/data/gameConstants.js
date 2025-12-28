// Core game timing and costs
export const TICK_RATE = 100;
export const BASE_SLIME_COST = 10;
export const MUTATION_MAGICKA_COST = 3;
export const TRAIT_MAGICKA_COST = MUTATION_MAGICKA_COST; // Legacy alias
export const BASE_MAGICKA = 50;
export const BATTLE_TICK_SPEED = 1000;
export const AUTO_SAVE_INTERVAL = 30000;
export const SAVE_KEY = 'hive_queen_save_v1';

// Tower Defense timing
export const TOWER_DEFENSE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
export const TD_TICK_SPEED = 100;

// Element System - Rock-Paper-Scissors combat modifiers
// Cycle: Fire → Nature → Earth → Water → Fire
export const ELEMENTS = {
  fire: { name: 'Fire', icon: '🔥', color: '#ef4444', strong: 'nature', weak: 'water' },
  water: { name: 'Water', icon: '💧', color: '#3b82f6', strong: 'fire', weak: 'earth' },
  nature: { name: 'Nature', icon: '🌿', color: '#22c55e', strong: 'earth', weak: 'fire' },
  earth: { name: 'Earth', icon: '🪨', color: '#a16207', strong: 'water', weak: 'nature' },
};

// Default element values for new slimes
export const DEFAULT_ELEMENTS = { fire: 0, water: 0, nature: 0, earth: 0 };

// Element damage multipliers
export const ELEMENT_STRONG_MULTIPLIER = 1.25; // 25% more damage when strong against
export const ELEMENT_WEAK_MULTIPLIER = 0.75;   // 25% less damage when weak against
