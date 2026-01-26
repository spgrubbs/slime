// Stat definitions and display info
export const STAT_INFO = {
  firmness: { name: 'Firmness', icon: '💪', desc: 'Attack damage & max HP', color: '#ef4444' },
  slipperiness: { name: 'Slipperiness', icon: '💨', desc: 'Dodge & crit chance', color: '#22d3ee' },
  viscosity: { name: 'Viscosity', icon: '🌀', desc: 'Effect damage & proc chance', color: '#a855f7' },
};

// Slime tier definitions
// BALANCE: Wide gaps between tiers create meaningful progression
// Basic slimes are for Zone 1, suicide in Zone 3+
// Each tier roughly doubles power from previous
// biomassPerPercent: biomass needed for 1% stat increase (capped at maxBiomassBonus)
export const SLIME_TIERS = {
  basic: {
    name: 'Basic',
    jellyCost: 5,
    statMultiplier: 1,      // Base stats ~5
    traitSlots: 1,
    color: '#4ade80',
    baseHp: 30,             // Comfortable in Zone 1
    biomassPerPercent: 3,   // Easy to grow initially
    maxBiomassBonus: 80,    // Cap at 80% bonus
    unlockBuilding: null,   // Always available
  },
  enhanced: {
    name: 'Enhanced',
    jellyCost: 20,
    statMultiplier: 2,      // 2x basic stats ~10
    traitSlots: 2,
    color: '#22d3ee',
    baseHp: 75,             // Comfortable in Zone 2-3
    biomassPerPercent: 8,
    maxBiomassBonus: 100,
    unlockBuilding: 'spawningVat',
  },
  elite: {
    name: 'Elite',
    jellyCost: 50,
    statMultiplier: 3.5,    // 3.5x basic stats ~17
    traitSlots: 3,
    color: '#a855f7',
    baseHp: 150,            // Comfortable in Zone 4-5
    biomassPerPercent: 20,
    maxBiomassBonus: 120,
    unlockBuilding: 'royalHatchery',
  },
  royal: {
    name: 'Royal',
    jellyCost: 100,
    statMultiplier: 5,      // 5x basic stats ~25
    traitSlots: 4,
    color: '#f59e0b',
    baseHp: 300,            // Can tackle Zone 6
    biomassPerPercent: 40,
    maxBiomassBonus: 150,
    unlockBuilding: 'primordialChamber',
  },
};

// Base stat range for slime spawning (before tier multiplier)
// BALANCE: Low base stats mean slimes need biomass investment
export const BASE_STAT_RANGE = { min: 3, max: 6 }; // Reduced from implied 5-5

// Name generation parts
export const NAME_PRE = ['Glo', 'Spl', 'Oo', 'Squ', 'Blo', 'Jel', 'Wob', 'Bou', 'Dri', 'Sli', 'Goo', 'Muc', 'Pud', 'Glu', 'Flu', 'Gel', 'Mor', 'Gur', 'Bub'];
export const NAME_SUF = ['bby', 'osh', 'ize', 'orp', 'oop', 'elly', 'ubble', 'urt', 'ime', 'ick', 'ooey', 'uck', 'udge', 'op', 'ash', 'urp', 'oze', 'ish'];
export const NAME_TIT = ['', '', '', '', ' the Brave', ' the Squishy', ' the Mighty', ' the Swift', ' the Wise', ' the Gooey', ' the Bouncy', ' the Firm'];
