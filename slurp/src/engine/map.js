// ─────────────────────────────────────────────────────────────────────────────
// Act map generation — Slay the Spire's recipe (GDD §4.2).
// 7 columns × 12 rows, 6 non-crossing upward walks, then a boss row.
// ─────────────────────────────────────────────────────────────────────────────

import { stream, weightedSample } from './rng.js';

export const COLS = 7;
export const ROWS = 12;
export const BOSS_ROW = ROWS;

export const NODE_TYPES = {
  fight:    { name: 'Fight', icon: '⚔️' },
  elite:    { name: 'Elite', icon: '💀' },
  boss:     { name: 'Boss', icon: '👑' },
  shop:     { name: 'Shop', icon: '🛒' },
  event:    { name: 'Event', icon: '✦' },
  mystery:  { name: 'Mystery', icon: '❓' },
  treasure: { name: 'Treasure', icon: '🎁' },
  pool:     { name: 'Pool', icon: '💧' },
};

const BASE_WEIGHTS = { fight: 45, event: 15, mystery: 12, elite: 9, pool: 11, shop: 8 };
const NO_REPEAT = new Set(['elite', 'shop', 'pool']);

const id = (r, c) => `${r}-${c}`;

function walks(rng) {
  const edges = new Set();
  const used = new Set();
  const starts = [];
  for (let w = 0; w < 6; w++) {
    let c = Math.floor(rng() * COLS);
    // The first two walks start in different columns so row 1 always branches.
    if (w === 1 && c === starts[0]) c = (c + 1 + Math.floor(rng() * (COLS - 1))) % COLS;
    starts.push(c);
    used.add(id(0, c));
    for (let r = 0; r < ROWS - 1; r++) {
      const options = [c - 1, c, c + 1].filter(n => n >= 0 && n < COLS).filter(n => {
        // No crossing: moving c→n is illegal if an edge already goes n→c on the same row pair.
        if (n === c) return true;
        return !edges.has(`${id(r, n)}>${id(r + 1, c)}`);
      });
      const n = options[Math.floor(rng() * options.length)];
      edges.add(`${id(r, c)}>${id(r + 1, n)}`);
      used.add(id(r + 1, n));
      c = n;
    }
  }
  return { edges, used };
}

/**
 * Generate an act map. Returns { nodes: {id → node}, start: [ids], boss: id }.
 * `weights` overrides node weights (Salt rules).
 */
export function generateMap(seed, act, { weights = {} } = {}) {
  const rng = stream(seed, 'map', act);
  const { edges, used } = walks(rng);
  const nodes = {};
  for (const nid of used) {
    const [r, c] = nid.split('-').map(Number);
    nodes[nid] = { id: nid, row: r, col: c, type: null, next: [], prev: [] };
  }
  for (const e of edges) {
    const [a, b] = e.split('>');
    if (!nodes[a].next.includes(b)) nodes[a].next.push(b);
    if (!nodes[b].prev.includes(a)) nodes[b].prev.push(a);
  }
  const bossId = id(BOSS_ROW, 3);
  nodes[bossId] = { id: bossId, row: BOSS_ROW, col: 3, type: 'boss', next: [], prev: [] };
  for (const n of Object.values(nodes)) {
    if (n.row === ROWS - 1) { n.next.push(bossId); nodes[bossId].prev.push(n.id); }
  }

  const w = { ...BASE_WEIGHTS, ...weights };
  const byRow = Object.values(nodes).filter(n => n.row < ROWS).sort((a, b) => a.row - b.row || a.col - b.col);
  for (const n of byRow) {
    if (n.row === 0) { n.type = 'fight'; continue; }
    if (n.row === 6) { n.type = 'treasure'; continue; }
    if (n.row === ROWS - 1) { n.type = 'pool'; continue; }
    const banned = new Set();
    if (n.row < 4) { banned.add('elite'); banned.add('pool'); }
    if (n.row === ROWS - 2) banned.add('pool'); // a Pool row follows
    for (const p of n.prev) {
      const pt = nodes[p].type;
      if (NO_REPEAT.has(pt)) banned.add(pt);
      // Siblings out of a branching parent should differ.
      for (const sib of nodes[p].next) if (sib !== n.id && nodes[sib].type) banned.add(nodes[sib].type);
    }
    const types = Object.keys(w).filter(t => !banned.has(t) && w[t] > 0);
    const [t] = weightedSample(rng, types.length ? types : ['fight'], 1, t => w[t] ?? 1);
    n.type = t || 'fight';
  }

  // Guarantee at least two Elites.
  let elites = byRow.filter(n => n.type === 'elite').length;
  for (const n of byRow) {
    if (elites >= 2) break;
    if (n.type === 'fight' && n.row >= 4 && n.row < ROWS - 2 &&
        ![...n.prev, ...n.next].some(x => nodes[x]?.type === 'elite')) {
      n.type = 'elite';
      elites++;
    }
  }

  const start = byRow.filter(n => n.row === 0).map(n => n.id);
  return { nodes, start, boss: bossId };
}

/** The Finale is a short fixed corridor: Pool → Shop → The Hollow One. */
export function finaleMap() {
  const nodes = {
    '0-3': { id: '0-3', row: 0, col: 3, type: 'pool', next: ['1-3'], prev: [] },
    '1-3': { id: '1-3', row: 1, col: 3, type: 'shop', next: ['2-3'], prev: ['0-3'] },
    '2-3': { id: '2-3', row: 2, col: 3, type: 'boss', next: [], prev: ['1-3'] },
  };
  return { nodes, start: ['0-3'], boss: '2-3', finale: true };
}

/** Node ids the player may move to next. */
export function reachable(map, currentId) {
  if (!currentId) return map.start;
  return map.nodes[currentId]?.next || [];
}
