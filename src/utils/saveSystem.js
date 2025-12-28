import { SAVE_KEY, DEFAULT_ELEMENTS } from '../data/gameConstants.js';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';

// Default game state
export const getDefaultState = () => ({
  queen: { level: 1, xp: 0 },
  bio: 50,
  mats: {},
  monsterKills: {},       // Tracks kills per monster type
  unlockedMutations: [],  // Array of mutation IDs unlocked
  slimes: [],
  exps: {},
  builds: {},
  research: [],
  activeRes: null,
  lastTowerDefense: 0,
  lastSave: Date.now(),
});

// Migrate old slime data to include element system and mutations
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

  // Migrate traits to mutations (Phase 2)
  // Old slimes had 'traits' array, new slimes have 'mutations' array
  if (!migrated.mutations) {
    // If slime had traits, they become mutations
    migrated.mutations = migrated.traits || [];
  }

  // Ensure traits exists for personality traits (Phase 3)
  // For now, empty until personality traits are implemented
  if (migrated.traits && Array.isArray(migrated.traits)) {
    // Clear old traits since they're now mutations
    // Personality traits will be separate
    migrated.traits = [];
  }

  return migrated;
};

// Migrate save data to current version
const migrateSaveData = (data) => {
  const migrated = { ...data };

  // Migrate slimes to include element data and mutations
  if (migrated.slimes && Array.isArray(migrated.slimes)) {
    migrated.slimes = migrated.slimes.map(migrateSlimeData);
  }

  // Migrate old traits inventory to unlockedMutations
  // Old system: traits = { wolfFang: 3, goblinCunning: 2 } (object with counts)
  // New system: unlockedMutations = ['wolfFang', 'goblinCunning'] (array of IDs)
  if (migrated.traits && typeof migrated.traits === 'object' && !Array.isArray(migrated.traits)) {
    if (!migrated.unlockedMutations) {
      // Convert old trait inventory keys to mutation array
      migrated.unlockedMutations = Object.keys(migrated.traits).filter(id => migrated.traits[id] > 0);
    }
    // Remove old traits object
    delete migrated.traits;
  }

  // Ensure unlockedMutations exists
  if (!migrated.unlockedMutations) {
    migrated.unlockedMutations = [];
  }

  // Migrate old defeatedMonsters array to monsterKills object
  // Old system: defeatedMonsters = ['wolf', 'goblin'] (just discovery)
  // New system: monsterKills = { wolf: 45, goblin: 100 } (kill counts)
  if (migrated.defeatedMonsters && Array.isArray(migrated.defeatedMonsters)) {
    if (!migrated.monsterKills) {
      migrated.monsterKills = {};
      // For each discovered monster, give them enough kills to have been "discovered"
      // but not enough to unlock mutations (unless they had the trait)
      migrated.defeatedMonsters.forEach(monsterType => {
        // Check if this monster's mutation was already unlocked in old save
        const md = MONSTER_TYPES[monsterType];
        if (md && md.trait) {
          const hadTrait = migrated.unlockedMutations.includes(md.trait);
          const mutation = MUTATION_LIBRARY[md.trait];
          // If they had the trait, give full required kills, otherwise just 1
          migrated.monsterKills[monsterType] = hadTrait && mutation ? mutation.requiredKills : 1;
        } else {
          migrated.monsterKills[monsterType] = 1;
        }
      });
    }
    // Remove old defeatedMonsters array
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
