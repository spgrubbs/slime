// ─────────────────────────────────────────────────────────────────────────────
// Mossback, the travelling peddler
//
// Materials pile up. A forest party brings home far more Wolf Fang than any
// building will ever eat, and nothing in the game turns that surplus into
// anything. Mossback does: an old snail with a shop on its shell who comes by
// every few hours and swaps what you have too much of for what you are short
// of. Items for items, never biomass. He trades at a loss to you, so the grind
// is still the main road and the peddler is the shortcut around a bad-luck
// drought.
//
// What he will NOT do:
//   - trade Seals or Hearts. Those are the progression spine; buying your way
//     past a Warden would skip the one fight the game asks you to plan for.
//   - sell anything from a zone you have not reached. He sells what grows
//     where your Tendrils already go.
//
// Deals are rolled when he arrives, from what you are carrying at that moment,
// and kept until he leaves. Each one can be taken once.
// ─────────────────────────────────────────────────────────────────────────────

import { MONSTER_TYPES, materialDropChance, MATERIAL_RATES } from './monsterData.js';
import { ZONES } from './zoneData.js';
import { CARAVAN_UNITS } from './caravanData.js';
import { BUILDINGS, TENDRILS, nextLevelCost, zoneReached } from './buildingData.js';
import { ALL_SEALS, ALL_HEARTS } from './wardenData.js';
import { MUTATION_LIBRARY } from './traitData.js';

export const MERCHANT = { name: 'Mossback', icon: '🐌' };

/** He comes every CYCLE and stays for STAY of it. */
export const MERCHANT_CYCLE_MS = 8 * 3600 * 1000;
export const MERCHANT_STAY_MS  = 5 * 3600 * 1000;

/** What you get back per unit of value you hand over. The peddler's cut. */
export const MERCHANT_RATE = 0.7;

// ── Schedule ─────────────────────────────────────────────────────────────────
//
// Anchored to the moment he first came (`firstVisit`), so a player who unlocks
// him sees him straight away instead of waiting on a wall clock. After that he
// keeps a steady rhythm whether or not the game is open.

export function merchantVisit(firstVisit, now = Date.now()) {
  if (!firstVisit || now < firstVisit) return { index: 0, present: true, arrivedAt: now, leavesAt: now + MERCHANT_STAY_MS, nextAt: now + MERCHANT_CYCLE_MS };
  const index = Math.floor((now - firstVisit) / MERCHANT_CYCLE_MS);
  const arrivedAt = firstVisit + index * MERCHANT_CYCLE_MS;
  const leavesAt = arrivedAt + MERCHANT_STAY_MS;
  return { index, present: now < leavesAt, arrivedAt, leavesAt, nextAt: arrivedAt + MERCHANT_CYCLE_MS };
}

// ── Values ───────────────────────────────────────────────────────────────────
//
// Worth is how hard a thing is to come by: which zone it drops in, and how
// often it drops there. A common forest material is 1. Each zone deeper is
// roughly a doubling, and a material that drops at a quarter of the common
// rate is worth about four commons.

const TIER_VALUE = [0, 1, 2, 4, 9, 20, 45];
const PROTECTED = new Set([...ALL_SEALS, ...ALL_HEARTS]);

/** material -> { value, zone } for everything monsters or caravans drop. */
const buildMaterialTable = () => {
  const table = {};
  for (const [zoneId, zone] of Object.entries(ZONES)) {
    for (const monId of zone.monsters || []) {
      const m = MONSTER_TYPES[monId];
      if (!m) continue;
      for (const mat of m.mats || []) {
        if (PROTECTED.has(mat)) continue;
        // A material only a rare monster carries is rarer than its drop rate
        // suggests, because the monster itself is rare.
        const rarity = m.rare ? 6 : MATERIAL_RATES.common / materialDropChance(mat, m);
        const value = Math.max(1, Math.round(TIER_VALUE[zone.tier] * rarity));
        const prev = table[mat];
        // Keep the cheapest source: if the forest drops it, it is a forest item.
        if (!prev || value < prev.value) table[mat] = { value, zone: zoneId, source: 'zone' };
      }
    }
  }
  for (const u of Object.values(CARAVAN_UNITS)) {
    for (const mat of Object.keys(u.mats || {})) {
      if (table[mat]) continue;
      table[mat] = { value: 3 * (u.tier || 1), zone: null, source: 'caravan' };
    }
  }
  return table;
};

export const MATERIAL_TABLE = buildMaterialTable();
export const materialValue = (mat) => MATERIAL_TABLE[mat]?.value ?? 0;

/** A mutagen is worth a lot of materials: it is a permanent slot's worth of build. */
export const mutagenValue = (mutId) => {
  const m = MUTATION_LIBRARY[mutId];
  const mon = m && MONSTER_TYPES[m.monster];
  if (!mon) return 0;
  return TIER_VALUE[mon.tier] * (mon.rare ? 80 : 40);
};

const mutagenZone = (mutId) => {
  const mon = MONSTER_TYPES[MUTATION_LIBRARY[mutId]?.monster];
  return mon ? Object.keys(ZONES).find(z => ZONES[z].monsters.includes(MUTATION_LIBRARY[mutId].monster)) : null;
};

// ── Rolling a visit ──────────────────────────────────────────────────────────

const seededRng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

/** Materials he will deal in for this player: reached zones, plus the road. */
export function tradableMaterials({ builds = {}, caravanUnlocked = false } = {}) {
  return Object.entries(MATERIAL_TABLE)
    .filter(([, info]) => (info.zone ? zoneReached(info.zone, builds) : caravanUnlocked))
    .map(([mat]) => mat);
}

/**
 * What the player is short of for the next thing they could build, as
 * { material: { short, rank } }. Tendrils rank first: they are the road to the
 * next zone, and a peddler who offers Life Essence to a player stuck on Earthite
 * for their Provoke has not been listening.
 */
export function wantedMaterials({ builds = {}, mats = {}, buildingUnlocked = false } = {}) {
  const want = {};
  const add = (cost, rank) => {
    for (const [m, n] of Object.entries(cost?.mats || {})) {
      if (PROTECTED.has(m)) continue;
      const short = n - (mats[m] || 0);
      if (short <= 0) continue;
      const prev = want[m];
      want[m] = { short: Math.max(prev?.short || 0, short), rank: Math.min(prev?.rank ?? rank, rank) };
    }
  };
  for (const t of TENDRILS) {
    if (!zoneReached(t.zone, builds)) continue;
    add(nextLevelCost(t.id, builds[t.id] || 0), 0);
  }
  if (buildingUnlocked) {
    for (const [id, b] of Object.entries(BUILDINGS)) {
      if (b.category === 'tendril' || b.category === 'research') continue;
      if ((builds[id] || 0) >= (b.max || 1)) continue;
      add(b.cost, 1);
    }
  }
  return want;
}

/**
 * Quantities for swapping `give` for `get` at the peddler's rate, sized so the
 * player hands over roughly `budget` units of `give`. Rounded in his favour.
 */
function price(give, get, budget, maxGet = Infinity) {
  const vg = materialValue(give) || 1;
  const vt = materialValue(get) || 1;
  const getQty = Math.max(1, Math.min(maxGet, Math.floor((budget * vg * MERCHANT_RATE) / vt)));
  const giveQty = Math.max(1, Math.ceil((getQty * vt) / (vg * MERCHANT_RATE)));
  return { giveQty, getQty };
}

/**
 * The deals for one visit. Pure: the same inputs and visit index always roll
 * the same stall.
 *
 * Each deal is { id, give: { kind, id, qty }, get: { kind, id, qty }, pitch }.
 */
export function rollMerchantDeals({
  visit = 0, mats = {}, mutagens = {}, builds = {},
  mutationsUnlocked = false, caravanUnlocked = false, buildingUnlocked = false,
} = {}) {
  const rng = seededRng(visit * 2654435761 + 97);
  const pool = tradableMaterials({ builds, caravanUnlocked });
  if (!pool.length) return [];
  const want = wantedMaterials({ builds, mats, buildingUnlocked });
  const wanted = Object.keys(want).filter(m => pool.includes(m))
    .sort((a, b) => (want[a].rank - want[b].rank)
      || (want[b].short * materialValue(b) - want[a].short * materialValue(a)));

  // What the player has a pile of, most plentiful first.
  const surplus = Object.entries(mats)
    .filter(([m, n]) => pool.includes(m) && n >= 6)
    .sort((a, b) => b[1] - a[1])
    .map(([m]) => m);

  const deals = [];

  // 1-2. Clear out a pile for something you are short of.
  const targets = [...wanted];
  for (const give of surplus.slice(0, 2)) {
    let get = targets.find(m => m !== give);
    if (get) targets.splice(targets.indexOf(get), 1);
    else get = pick(pool.filter(m => m !== give), rng);
    if (!get) continue;
    // Offer what you are short of, not a warehouse of it.
    const { giveQty, getQty } = price(give, get, Math.ceil(mats[give] * 0.5), want[get]?.short);
    if (giveQty > (mats[give] || 0)) continue;
    deals.push({
      id: `clear-${give}`,
      give: { kind: 'mat', id: give, qty: giveQty },
      get: { kind: 'mat', id: get, qty: getQty },
      pitch: want[get] ? 'You need this one. I can smell it on you.' : 'Too much of one thing rots. Let me take it.',
    });
  }

  // 3. A mutagen from somewhere you have been, for a heap of materials.
  if (mutationsUnlocked) {
    const reachedMuts = Object.keys(MUTATION_LIBRARY).filter(id => {
      const z = mutagenZone(id);
      return z && zoneReached(z, builds);
    });
    const mut = pick(reachedMuts, rng);
    const payWith = surplus[0] || pick(pool, rng);
    if (mut && payWith) {
      const value = mutagenValue(mut);
      const qty = Math.max(1, Math.ceil(value / ((materialValue(payWith) || 1) * MERCHANT_RATE)));
      deals.push({
        id: `mutagen-${mut}`,
        give: { kind: 'mat', id: payWith, qty },
        get: { kind: 'mutagen', id: mut, qty: 1 },
        pitch: 'Found it in a ditch. Still twitching. Very fresh.',
      });
    }

    // 4. Swap a spare mutagen for a different one.
    const spare = Object.entries(mutagens).filter(([, n]) => n >= 2).map(([id]) => id);
    if (spare.length) {
      const give = pick(spare, rng);
      const options = reachedMuts.filter(id => id !== give);
      const get = pick(options, rng);
      if (get) {
        deals.push({
          id: `swap-${give}-${get}`,
          give: { kind: 'mutagen', id: give, qty: 2 },
          get: { kind: 'mutagen', id: get, qty: 1 },
          pitch: 'Two of the same is one too many. Try this instead.',
        });
      }
    }
  }

  // Always something on the stall, even for a player with no pile yet: a trade
  // up from the commonest thing he deals in to something scarcer.
  if (deals.length < 3) {
    const cheap = [...pool].sort((a, b) => materialValue(a) - materialValue(b));
    const give = cheap[0];
    const dear = pool.filter(m => materialValue(m) >= 3 * materialValue(give));
    const get = wanted.find(m => m !== give) || pick(dear.length ? dear : pool.filter(m => m !== give), rng);
    if (give && get) {
      const { giveQty, getQty } = price(give, get, Math.max(8, Math.ceil(3 * materialValue(get) / materialValue(give))));
      deals.push({
        id: `up-${give}-${get}`,
        give: { kind: 'mat', id: give, qty: giveQty },
        get: { kind: 'mat', id: get, qty: getQty },
        pitch: 'Small things add up to big things. Eventually.',
      });
    }
  }

  // Never the same deal twice on one stall.
  const seen = new Set();
  return deals.filter(d => (seen.has(d.id) ? false : seen.add(d.id)));
}

/** Can the player afford this deal right now? */
export const canTakeDeal = (deal, { mats = {}, mutagens = {} } = {}) => {
  const have = deal.give.kind === 'mutagen' ? (mutagens[deal.give.id] || 0) : (mats[deal.give.id] || 0);
  return have >= deal.give.qty;
};
