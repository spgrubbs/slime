import { SAVE_KEY } from '../data/gameConstants.js';

// Default game state
export const getDefaultState = () => ({
  queen: { level: 1, xp: 0 },
  bio: 50,
  mats: {},
  traits: {},
  slimes: [],
  exps: {},
  builds: {},
  research: [],
  activeRes: null,
  lastTowerDefense: 0,
  defeatedMonsters: [],
  lastSave: Date.now(),
});

// Save game to localStorage
export const saveGame = (state) => {
  try {
    const saveData = { ...state, lastSave: Date.now() };
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
    if (!data) return null;
    return JSON.parse(data);
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
