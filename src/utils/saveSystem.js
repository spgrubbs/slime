import { SAVE_KEY, DEFAULT_ELEMENTS } from '../data/gameConstants.js';

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

// Migrate old slime data to include element system
const migrateSlimeData = (slime) => {
  const migrated = { ...slime };

  // Add elements if missing (new element system)
  if (!migrated.elements) {
    migrated.elements = { ...DEFAULT_ELEMENTS };
  }

  // Add primaryElement if missing
  if (migrated.primaryElement === undefined) {
    migrated.primaryElement = null;
  }

  return migrated;
};

// Migrate save data to current version
const migrateSaveData = (data) => {
  const migrated = { ...data };

  // Migrate slimes to include element data
  if (migrated.slimes && Array.isArray(migrated.slimes)) {
    migrated.slimes = migrated.slimes.map(migrateSlimeData);
  }

  return migrated;
};

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
    const parsed = JSON.parse(data);
    // Apply migrations to ensure compatibility
    return migrateSaveData(parsed);
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
