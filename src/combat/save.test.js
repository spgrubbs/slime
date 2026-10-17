import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import './index.js';
import { SAVED_KEYS, getDefaultState, saveGame, loadGame, exportSave, importSave } from '../utils/saveSystem.js';

// A tiny in-memory localStorage for the save functions.
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

test('the component wires exactly the saved keys, no more and no fewer', () => {
  const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'SlimeQueen.jsx'), 'utf8');
  const block = src.slice(src.indexOf('const persisted = {'), src.indexOf('};', src.indexOf('const persisted = {')));
  const wired = [...block.matchAll(/(\w+): \[\w+, set\w+\]/g)].map(m => m[1]).sort();
  assert.deepEqual(wired, [...SAVED_KEYS].sort());
});

test('a new game survives a save and load unchanged', () => {
  const state = getDefaultState();
  assert.ok(saveGame(state));
  const back = loadGame();
  for (const k of SAVED_KEYS) assert.deepEqual(back[k], state[k], k);
});

test('a save missing newer keys is filled in from defaults', () => {
  localStorage.setItem('slime_queen_save_v5', JSON.stringify({ bio: 999 }));
  const back = loadGame();
  assert.equal(back.bio, 999);
  for (const k of SAVED_KEYS) assert.ok(k in back, k);
});

test('an exported save imports back to the same game', () => {
  const state = { ...getDefaultState(), bio: 1234, mats: { 'Wolf Fang': 7 } };
  saveGame(state);
  const code = exportSave();
  assert.equal(typeof code, 'string');
  store.clear();
  assert.equal(importSave(code), true);
  const back = loadGame();
  assert.equal(back.bio, 1234);
  assert.deepEqual(back.mats, { 'Wolf Fang': 7 });
});

test('a garbled backup code is refused and the current save is left alone', () => {
  saveGame({ ...getDefaultState(), bio: 55 });
  assert.equal(importSave('not a save'), false);
  assert.equal(loadGame().bio, 55);
});
