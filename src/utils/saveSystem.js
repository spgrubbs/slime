import { SAVE_KEY } from '../data/gameConstants.js';
import { dehydrateExpedition } from '../combat/expedition.js';
import { dehydrateAmbush } from '../combat/caravan.js';

// The key the real-time arena wrote to. Its in-flight expeditions cannot be
// converted to round-based combatants, but everything else still migrates.

// Default game state
export const getDefaultState = () => ({
  queen: { level: 1, xp: 0 },
  bio: 50,
  mats: {},
  slimes: [],
  exps: {},
  builds: { forestTendril: 1 },
  research: [],
  activeRes: null,
  lastCaravan: 0,
  caravanTier: 1,
  monsterKills: {},
  mutagens: {},
  pityKills: {},
  wardenKills: {},
  purchasedSkills: ['expeditionBasics', 'hiveFoundation', 'combatTraining'], // Root skills free
  lastSave: Date.now(),
});

// Saves are not carried across versions. The game is in active design and its
// state shape changes with almost every pass; the migration layer that used to
// live here translated a dozen retired systems (kill-count mutation unlocks,
// skill-point zone gates, a `traits` array that became `mutations`) and was
// more code than the systems it propped up. A save that predates the current
// shape is filled in from defaults instead.
const withDefaults = (data) => ({ ...getDefaultState(), ...data });

// Save game to localStorage
export const saveGame = (state) => {
  try {
    // Combatants carry live references that must not be serialized.
    const exps = {};
    Object.entries(state.exps || {}).forEach(([zone, exp]) => {
      exps[zone] = dehydrateExpedition(exp);
    });
    const saveData = { ...state, exps, ambush: dehydrateAmbush(state.ambush), lastSave: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) {
    console.error('Save failed:', e);
    return false;
  }
};

// Load game from localStorage
export const loadGame = () => {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    return data ? withDefaults(JSON.parse(data)) : null;
  } catch (e) {
    console.error('Load failed:', e);
    return null;
  }
};

// Delete save from localStorage
export const deleteSave = () => {
  try {
    localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (e) {
    return false;
  }
};
