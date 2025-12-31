// Core game timing and costs
// BALANCE: Timing is designed for an idle game with 3-4 visits per day

// Game loop runs every 100ms, dt = real milliseconds elapsed / 100
export const TICK_RATE = 100;

// Slime costs
export const BASE_SLIME_COST = 10;       // Base jelly cost for spawning
export const TRAIT_JELLY_COST = 5;       // Increased from 3 - traits are valuable

// Royal Jelly capacity
export const BASE_JELLY = 30;            // Reduced from 50 - start with fewer slimes
export const JELLY_PER_QUEEN_LEVEL = 5;  // Reduced from 10 - slower scaling

// Battle timing (in ms, divided by game speed for actual tick)
export const BATTLE_TICK_SPEED = 1500;   // Increased from 1000 - slower combat

// Save settings
export const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
export const SAVE_KEY = 'hive_queen_save_v2'; // New version for balance changes!

// Tower Defense timing
export const TOWER_DEFENSE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours real-time
export const TD_TICK_SPEED = 100;        // Fast for active gameplay

// Research timing uses real seconds (not game ticks)
// This ensures research takes actual real-world time
export const RESEARCH_USES_REAL_TIME = true;

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

// Queen leveling - XP required for each level
// BALANCE: Queen leveling is the primary progression metric
// Designed for several months of play to reach max level
export const QUEEN_MAX_LEVEL = 50;
export const getQueenXpRequired = (level) => {
  // Exponential scaling: starts slow, gets much harder
  // Level 1->2: 100 XP
  // Level 10->11: ~1,600 XP
  // Level 25->26: ~25,000 XP
  // Level 40->41: ~160,000 XP
  // Level 49->50: ~400,000 XP
  return Math.floor(100 * Math.pow(1.25, level - 1));
};

// Biomass per Queen level (as fallback if reabsorption XP is too slow)
export const BIOMASS_TO_QUEEN_XP_RATIO = 10; // 10 biomass = 1 queen XP
