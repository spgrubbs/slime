import { SAVE_KEY } from '../data/gameConstants.js';
import { dehydrateExpedition } from '../combat/expedition.js';
import { dehydrateAmbush } from '../combat/caravan.js';

// The key the real-time arena wrote to. Its in-flight expeditions cannot be
// converted to round-based combatants, but everything else still migrates.

// ── The saved game ───────────────────────────────────────────────────────────
//
// THE list of what a save contains. Every key here is a piece of state the
// game keeps across sessions, with its value for a brand-new game. The main
// component builds its save, its load and its starting state from this one
// object, and startup fails loudly if a piece of state is wired up there but
// missing here (or the reverse). Before this, save, load and the new-game reset
// were three hand-written lists that had already drifted apart.
export const getDefaultState = () => ({
  queen: { level: 1 },
  bio: 50,
  mats: {},
  slimes: [],
  exps: {},
  // The forest tendril is already grown: the first zone is never gated.
  builds: { forestTendril: 1 },
  research: [],
  activeRes: null,
  lastCaravan: 0,
  caravanTier: 1,
  ambush: null,
  seenTutorials: [],
  tutorialsOn: true,
  monsterKills: {},
  mutagens: {},          // { [mutationId]: count }
  pityKills: {},         // kills since the last pity mutagen, per monster
  wardenKills: {},       // { [zone]: times felled }
  wardenTries: {},       // { [zone]: hunts started }, reveals the counter
  purchasedSkills: ['expeditionBasics', 'hiveFoundation', 'combatTraining'], // roots are free
  merchant: null,        // Mossback: { firstVisit, visit, deals, taken }
  guide: { flags: {}, dismissed: false }, // Glub's first steps (tutorialData.js)
  secrets: {},           // { gullet: 'beaten' }: secret bosses found
  prisms: 0,
  ranchBuildings: {},
  ranchAssignments: {},
  ranchProgress: {},
  mana: 0,               // "musk" in the game
  lastManaUpdate: Date.now(),
  activeHiveAbilities: {}, // { abilityId: expiresAt }
  lastSave: Date.now(),
});

/** Every key a save carries, except its own timestamp. */
export const SAVED_KEYS = Object.keys(getDefaultState()).filter(k => k !== 'lastSave');

// Saves are not carried across versions. The game is in active design and its
// state shape changes with almost every pass; the migration layer that used to
// live here translated a dozen retired systems (kill-count mutation unlocks,
// skill-point zone gates, a `traits` array that became `mutations`) and was
// more code than the systems it propped up. A save that predates the current
// shape is filled in from defaults instead.
const withDefaults = (data) => ({ ...getDefaultState(), ...data });

// Save game to localStorage
// `at` is the save's timestamp. Only the dev panel passes one, to pretend the
// game was closed hours ago and exercise offline progress.
export const saveGame = (state, at = Date.now()) => {
  try {
    // Combatants carry live references that must not be serialized.
    const exps = {};
    Object.entries(state.exps || {}).forEach(([zone, exp]) => {
      exps[zone] = dehydrateExpedition(exp);
    });
    const saveData = { ...state, exps, ambush: dehydrateAmbush(state.ambush), lastSave: at };
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

// ── Backups ──────────────────────────────────────────────────────────────────
//
// The save lives only in the app's own storage, so uninstalling the app (or a
// build signed with a different key forcing an uninstall) deletes it. A backup
// code is the whole save as text the player can paste somewhere safe.
//
//   SQ1.<checksum>.<base64 of the JSON>
//
// The checksum is only there to catch a code that got truncated or mangled on
// the way through a chat app, so an import never half-loads garbage.

const BACKUP_PREFIX = 'SQ1';

const toBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin);
};
const fromBase64 = (b64) => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};
const checksum = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
};

/** The current save as a backup code, or null if there is no save. */
export const exportSave = () => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const body = toBase64(raw);
    return `${BACKUP_PREFIX}.${checksum(body)}.${body}`;
  } catch (e) {
    console.error('Export failed:', e);
    return null;
  }
};

/**
 * Replace the current save with a backup code. Returns true on success.
 * Nothing is written unless the code checks out and parses.
 */
export const importSave = (code) => {
  try {
    const [prefix, sum, body] = String(code || '').trim().split('.');
    if (prefix !== BACKUP_PREFIX || !body || checksum(body) !== sum) return false;
    const json = fromBase64(body);
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object' || !Array.isArray(data.slimes)) return false;
    localStorage.setItem(SAVE_KEY, json);
    return true;
  } catch {
    return false;
  }
};
