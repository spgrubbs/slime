import { SAVE_KEY, DEFAULT_ELEMENTS } from '../data/gameConstants.js';

// Default game state
export const getDefaultState = () => ({
  queen: { level: 1, xp: 0 },
  bio: 50,
  mats: {},
  slimes: [],
  exps: {},
  builds: {},
  research: [],
  activeRes: null,
  lastTowerDefense: 0,
  monsterKills: {},
  unlockedMutations: [],
  lastSave: Date.now(),
});

// Migrate old slime data to include element system and mutation system
const migrateSlimeData = (slime) => {
  const migrated = { ...slime };

  // Add elements if missing (element system)
  if (!migrated.elements) {
    migrated.elements = { ...DEFAULT_ELEMENTS };
  }

  // Add primaryElement if missing
  if (migrated.primaryElement === undefined) {
    migrated.primaryElement = null;
  }

  // Migrate traits to mutations (mutation system)
  // Old structure: slime.traits = ['wolfFang', 'dragonHeart']
  // New structure: slime.mutations = ['wolfFang', 'dragonHeart'], slime.traits = [] (personality)
  if (migrated.traits && !migrated.mutations) {
    migrated.mutations = [...migrated.traits];
    migrated.traits = []; // Reset traits for personality system (Phase 3)
  }

  // Ensure mutations array exists
  if (!migrated.mutations) {
    migrated.mutations = [];
  }

  // Ensure traits array exists (for personality traits)
  if (!Array.isArray(migrated.traits)) {
    migrated.traits = [];
  }

  return migrated;
};

// Migrate save data to current version
const migrateSaveData = (data) => {
  const migrated = { ...data };

  // Migrate slimes to include element data and mutation data
  if (migrated.slimes && Array.isArray(migrated.slimes)) {
    migrated.slimes = migrated.slimes.map(migrateSlimeData);
  }

  // Migrate old traits inventory to unlockedMutations
  // Old structure: traits = { wolfFang: 2, dragonHeart: 1 }
  // New structure: unlockedMutations = ['wolfFang', 'dragonHeart']
  if (migrated.traits && typeof migrated.traits === 'object' && !migrated.unlockedMutations) {
    migrated.unlockedMutations = Object.keys(migrated.traits);
    // Delete the old traits inventory
    delete migrated.traits;
  }

  // Ensure unlockedMutations exists
  if (!migrated.unlockedMutations) {
    migrated.unlockedMutations = [];
  }

  // Migrate defeatedMonsters array to monsterKills object
  // Old structure: defeatedMonsters = ['wolf', 'goblin', 'wolf']
  // New structure: monsterKills = { wolf: 2, goblin: 1 }
  if (migrated.defeatedMonsters && Array.isArray(migrated.defeatedMonsters) && !migrated.monsterKills) {
    migrated.monsterKills = {};
    // Count occurrences of each monster type (estimate if it was unique list)
    migrated.defeatedMonsters.forEach(type => {
      // If defeatedMonsters was unique, estimate some kills based on having defeated them
      migrated.monsterKills[type] = (migrated.monsterKills[type] || 0) + 10;
    });
    delete migrated.defeatedMonsters;
  }

  // Ensure monsterKills exists
  if (!migrated.monsterKills) {
    migrated.monsterKills = {};
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
