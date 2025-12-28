import { NAME_PRE, NAME_SUF, NAME_TIT } from '../data/slimeData.js';
import { ELEMENTS, ELEMENT_STRONG_MULTIPLIER, ELEMENT_WEAK_MULTIPLIER, DEFAULT_ELEMENTS } from '../data/gameConstants.js';

// Generate a random slime name
export const genName = () =>
  NAME_PRE[Math.floor(Math.random() * NAME_PRE.length)] +
  NAME_SUF[Math.floor(Math.random() * NAME_SUF.length)] +
  NAME_TIT[Math.floor(Math.random() * NAME_TIT.length)];

// Generate a random unique ID
export const genId = () => Math.random().toString(36).substr(2, 9);

// Format seconds into readable time string
export const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} minutes`;
};

// Calculate elemental damage modifier
// Returns modified damage based on attacker vs defender element matchup
// Fire → Nature → Earth → Water → Fire (strong against cycle)
export const calculateElementalDamage = (baseDamage, attackerElement, defenderElement) => {
  if (!attackerElement || !defenderElement) return baseDamage;

  const attacker = ELEMENTS[attackerElement];
  if (!attacker) return baseDamage;

  if (attacker.strong === defenderElement) {
    return Math.floor(baseDamage * ELEMENT_STRONG_MULTIPLIER);
  }
  if (attacker.weak === defenderElement) {
    return Math.floor(baseDamage * ELEMENT_WEAK_MULTIPLIER);
  }
  return baseDamage;
};

// Get element matchup description for UI display
export const getElementMatchup = (attackerElement, defenderElement) => {
  if (!attackerElement || !defenderElement) return { type: 'neutral', text: '' };

  const attacker = ELEMENTS[attackerElement];
  if (!attacker) return { type: 'neutral', text: '' };

  if (attacker.strong === defenderElement) {
    return { type: 'strong', text: 'Super effective!', color: '#4ade80' };
  }
  if (attacker.weak === defenderElement) {
    return { type: 'weak', text: 'Not very effective...', color: '#ef4444' };
  }
  return { type: 'neutral', text: '' };
};

// Initialize default element values for a slime
export const createDefaultElements = () => ({ ...DEFAULT_ELEMENTS });

// Check if a slime can gain element affinity
export const canGainElement = (slime) => {
  // Cannot gain if already locked to an element
  if (slime.primaryElement) return false;
  // Cannot gain if has void trait (to be implemented in Phase 3)
  if (slime.pass?.includes('void')) return false;
  return true;
};

// Calculate element gain with modifiers
export const calculateElementGain = (baseGain, slime) => {
  let gain = baseGain;
  // Adaptable trait increases gain rate by 50%
  if (slime.pass?.includes('adaptable')) {
    gain *= 1.5;
  }
  return gain;
};
