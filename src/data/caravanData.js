// ─────────────────────────────────────────────────────────────────────────────
// Human Caravans
//
// Once a day a supply caravan passes near the hive and you may ambush it.
// It is a straight damage race, not a puzzle: you get paid per unit you kill,
// you can pull out at any time, and wiping the whole column permanently raises
// the difficulty and quality of every caravan after it.
//
// Human materials gate several buildings, so this is the progression faucet —
// see docs/GAME_DESIGN.md §7.3.
// ─────────────────────────────────────────────────────────────────────────────

// ── Units ────────────────────────────────────────────────────────────────────
// Loot roughly tracks how awkward a unit is to kill. A couple carry an immunity
// so a squad built around one trick has a bad day, but none of them require a
// special formation to beat — just a better-rounded team.

export const CARAVAN_UNITS = {
  porter: {
    id: 'porter', name: 'Porter', icon: '🎒', tier: 1,
    hp: 34, dmg: 4,
    desc: 'Loaded down and barely armed. Kill these first — they carry the goods.',
    biomass: 22,
    mats: { 'Human Bone': 1, 'Iron Sword': 1 },
    weight: 34,
  },
  outrider: {
    id: 'outrider', name: 'Outrider', icon: '🐎', tier: 2,
    hp: 42, dmg: 8, slippery: 6,
    desc: 'Fast and hard to pin down. Slippery slimes catch them; slow ones flail.',
    biomass: 30,
    mats: { 'Human Bone': 1, 'Saddle Leather': 1 },
    weight: 24,
  },
  guard: {
    id: 'guard', name: 'Caravan Guard', icon: '🛡️', tier: 2,
    hp: 88, dmg: 7,
    desc: 'Shielded and patient. A wall of HP that punishes a squad with no damage.',
    biomass: 38,
    mats: { 'Human Bone': 2, 'Tower Shield': 1 },
    weight: 26,
  },
  zealot: {
    id: 'zealot', name: 'Zealot', icon: '🕯️', tier: 3,
    hp: 60, dmg: 13, statusImmune: true,
    desc: 'Immune to every status. Proc-heavy squads have to hit it the honest way.',
    biomass: 44,
    mats: { 'Human Bone': 1, 'Sacred Ash': 2 },
    weight: 16,
  },
  quartermaster: {
    id: 'quartermaster', name: 'Quartermaster', icon: '📜', tier: 3,
    hp: 70, dmg: 9,
    desc: 'Keeps the ledger and the good steel. Worth killing before the column scatters.',
    biomass: 60,
    mats: { 'Human Bone': 2, 'Iron Sword': 3, 'Fine Ledger': 1 },
    weight: 12,
  },
  captain: {
    id: 'captain', name: 'Caravan Captain', icon: '👑', tier: 4,
    hp: 190, dmg: 17, critImmune: true, isBoss: true,
    desc: 'Rides at the rear in good armour. Shrugs off crits and hits like a cart.',
    biomass: 130,
    mats: { 'Human Bone': 3, 'Iron Sword': 2, 'Champion Badge': 1 },
    weight: 0, // never rolled — placed deliberately at higher tiers
  },
};

// ── Difficulty ───────────────────────────────────────────────────────────────
// Tier rises only when you rout a caravan completely, so the ramp is something
// you opt into by succeeding rather than something the clock does to you.

export const MAX_CARAVAN_TIER = 20;

export const getCaravanScaling = (tier = 1) => ({
  tier,
  hpMultiplier:     1 + (tier - 1) * 0.28,
  damageMultiplier: 1 + (tier - 1) * 0.20,
  lootMultiplier:   1 + (tier - 1) * 0.22,
  unitCount:        Math.min(11, 3 + Math.floor(tier * 0.8)),
  hasCaptain:       tier >= 3,
});

/** Rounds before the survivors are clear of the ambush and gone. */
export const ESCAPE_ROUNDS = 22;

// ── Rolling a caravan ────────────────────────────────────────────────────────

/** Small deterministic PRNG so a given day always presents the same caravan. */
const seededRng = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** Which day this is, so the composition is stable until tomorrow. */
export const caravanDay = (now = Date.now()) => Math.floor(now / 86400000);

const rollUnitType = (rng, tier) => {
  const pool = Object.values(CARAVAN_UNITS).filter(u => u.weight > 0 && u.tier <= Math.max(2, tier));
  const total = pool.reduce((n, u) => n + u.weight, 0);
  let roll = rng() * total;
  return (pool.find(u => (roll -= u.weight) <= 0) || pool[0]).id;
};

/**
 * The caravan for a given tier and day. Front of the column first — that is
 * the order you fight them in.
 */
export const rollCaravan = (tier = 1, day = caravanDay()) => {
  const scaling = getCaravanScaling(tier);
  const rng = seededRng(day * 7919 + tier * 104729);

  const units = [];
  for (let i = 0; i < scaling.unitCount; i++) units.push(rollUnitType(rng, tier));
  if (scaling.hasCaptain) units.push('captain');

  return { day, tier, units, scaling, escapeRounds: ESCAPE_ROUNDS };
};

/** What the column is worth if you kill all of it, for the setup screen. */
export const caravanValue = (caravan) => {
  const mult = caravan.scaling.lootMultiplier;
  const totals = { biomass: 0, mats: {} };
  caravan.units.forEach(id => {
    const u = CARAVAN_UNITS[id];
    totals.biomass += Math.floor(u.biomass * mult);
    Object.entries(u.mats).forEach(([m, c]) => {
      totals.mats[m] = (totals.mats[m] || 0) + c;
    });
  });
  return totals;
};

/** Composition summary for the scout report. */
export const caravanManifest = (caravan) => {
  const counts = {};
  caravan.units.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
  return Object.entries(counts).map(([id, count]) => ({ id, count, def: CARAVAN_UNITS[id] }));
};
