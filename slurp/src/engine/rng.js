// ─────────────────────────────────────────────────────────────────────────────
// Seeded randomness
//
// Every random draw in a run comes from a named stream derived from the run
// seed, so reloading a save can never reroll an outcome. Combat itself uses no
// randomness at all (see battle.js) — dice live only in maps, offers, shops and
// events.
// ─────────────────────────────────────────────────────────────────────────────

/** FNV-1a string hash → 32-bit unsigned int. */
export function hash(...parts) {
  let h = 0x811c9dc5;
  const s = parts.join('|');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 — small, fast, reproducible. Returns floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stream for one purpose at one point in the run, e.g. stream(seed, 'offer', 7). */
export const stream = (seed, ...key) => mulberry32(hash(seed, ...key));

export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

export function shuffle(rng, arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Weighted draw of `n` distinct items. `weight(item)` must be ≥ 0. */
export function weightedSample(rng, items, n, weight) {
  const pool = [...items];
  const out = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, it) => s + weight(it), 0);
    if (total <= 0) break;
    let roll = rng() * total;
    const idx = pool.findIndex(it => (roll -= weight(it)) < 0);
    out.push(pool.splice(idx === -1 ? pool.length - 1 : idx, 1)[0]);
  }
  return out;
}

export const newSeed = () => Math.random().toString(36).slice(2, 10).toUpperCase();
