// Stat definitions and display info
export const STAT_INFO = {
  firmness: { name: 'Firmness', icon: '💪', desc: 'Attack damage & max HP', color: '#ef4444' },
  slipperiness: { name: 'Slipperiness', icon: '💨', desc: 'Dodge & crit chance', color: '#22d3ee' },
  viscosity: { name: 'Viscosity', icon: '🌀', desc: 'Effect damage & proc chance', color: '#a855f7' },
};

// Slime tier definitions
export const SLIME_TIERS = {
  basic: { name: 'Basic', magickaCost: 5, statMultiplier: 1, traitSlots: 1, color: '#4ade80', baseHp: 50, biomassPerPercent: 10 },
  enhanced: { name: 'Enhanced', magickaCost: 10, statMultiplier: 1.5, traitSlots: 2, color: '#22d3ee', unlockLevel: 5, baseHp: 80, biomassPerPercent: 100 },
  elite: { name: 'Elite', magickaCost: 20, statMultiplier: 2, traitSlots: 3, color: '#a855f7', unlockLevel: 15, baseHp: 120, biomassPerPercent: 1000 },
  royal: { name: 'Royal', magickaCost: 40, statMultiplier: 3, traitSlots: 4, color: '#f59e0b', unlockLevel: 30, baseHp: 200, biomassPerPercent: 10000 },
};

// Name generation parts
export const NAME_PRE = ['Glo', 'Spl', 'Oo', 'Squ', 'Blo', 'Jel', 'Wob', 'Bou', 'Dri', 'Sli', 'Goo', 'Muc', 'Pud', 'Glu', 'Flu', 'Gel', 'Mor', 'Gur', 'Bub'];
export const NAME_SUF = ['bby', 'osh', 'ize', 'orp', 'oop', 'elly', 'ubble', 'urt', 'ime', 'ick', 'ooey', 'uck', 'udge', 'op', 'ash', 'urp', 'oze', 'ish'];
export const NAME_TIT = ['', '', '', '', ' the Brave', ' the Squishy', ' the Mighty', ' the Swift', ' the Wise', ' the Gooey', ' the Bouncy', ' the Firm'];
