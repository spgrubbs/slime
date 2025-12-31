// Stat definitions and display info
export const STAT_INFO = {
  firmness: { name: 'Firmness', icon: '💪', desc: 'Attack damage & max HP', color: '#ef4444' },
  slipperiness: { name: 'Slipperiness', icon: '💨', desc: 'Dodge & crit chance', color: '#22d3ee' },
  viscosity: { name: 'Viscosity', icon: '🌀', desc: 'Effect damage & proc chance', color: '#a855f7' },
};

// Slime tier definitions
// BALANCE: Basic slimes are weak and fragile - they need investment to survive
// Tiers are unlocked via buildings, not queen level
// biomassPerPercent: biomass needed for 1% stat increase (capped at 100% bonus)
// maxBiomassBonus: maximum % bonus from biomass (100 = double stats)
export const SLIME_TIERS = {
  basic: {
    name: 'Basic',
    jellyCost: 5,
    statMultiplier: 1,
    traitSlots: 1,
    color: '#4ade80',
    baseHp: 25,           // Reduced from 50 - fragile without investment
    biomassPerPercent: 5, // Reduced from 10 - biomass matters more
    maxBiomassBonus: 100, // Cap at 100% bonus (double stats)
    unlockBuilding: null, // Always available
  },
  enhanced: {
    name: 'Enhanced',
    jellyCost: 15,        // Increased from 10
    statMultiplier: 1.3,  // Reduced from 1.5
    traitSlots: 2,
    color: '#22d3ee',
    baseHp: 40,           // Reduced from 80
    biomassPerPercent: 15,// More biomass needed per %
    maxBiomassBonus: 100,
    unlockBuilding: 'spawningVat',
  },
  elite: {
    name: 'Elite',
    jellyCost: 30,        // Increased from 20
    statMultiplier: 1.6,  // Reduced from 2
    traitSlots: 3,
    color: '#a855f7',
    baseHp: 60,           // Reduced from 120
    biomassPerPercent: 30,// Even more biomass needed
    maxBiomassBonus: 100,
    unlockBuilding: 'royalHatchery',
  },
  royal: {
    name: 'Royal',
    jellyCost: 50,        // Increased from 40
    statMultiplier: 2,    // Reduced from 3
    traitSlots: 4,
    color: '#f59e0b',
    baseHp: 100,          // Reduced from 200
    biomassPerPercent: 50,// Most biomass needed
    maxBiomassBonus: 100,
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
