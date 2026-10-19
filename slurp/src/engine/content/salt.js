// Salt levels — cumulative difficulty (GDD §13). Past the table, Deep Salt adds
// a compounding +6% to enemy Mass and FIRM per level, with no ceiling.

export const SALT = [
  null,
  { desc: 'Elites appear more often', mapWeights: { elite: 14 } },
  { desc: 'Normal enemies +10% Mass', normalMass: 1.1 },
  { desc: 'Elites +15% Mass and FIRM', eliteScale: 1.15 },
  { desc: 'Shop prices +15%', shopMult: 1.15 },
  { desc: 'Act-end healing covers 75% of missing Mass', actHeal: 0.75 },
  { desc: 'Start with 10% less max Mass', startMass: 0.9 },
  { desc: 'Normal enemies +10% FIRM', normalScale: 1.1 },
  { desc: 'Bosses +15% Mass and FIRM', bossScale: 1.15 },
  { desc: 'Fewer Pools', mapWeights: { pool: 7 } },
  { desc: 'Pools heal 25% instead of 35%', poolHeal: 0.25 },
];

export const MAX_TABLE_SALT = SALT.length - 1;

/** Fold every Salt level ≤ `salt` into one rule object. */
export function saltRules(salt) {
  const r = {
    mapWeights: {}, normalMass: 1, eliteScale: 1, shopMult: 1, actHeal: 1,
    startMass: 1, normalScale: 1, bossScale: 1, poolHeal: 0.35, deep: 1,
  };
  for (let i = 1; i <= Math.min(salt, MAX_TABLE_SALT); i++) {
    const s = SALT[i];
    Object.assign(r.mapWeights, s.mapWeights || {});
    for (const k of ['normalMass', 'eliteScale', 'shopMult', 'startMass', 'normalScale', 'bossScale']) {
      if (s[k]) r[k] *= s[k];
    }
    if (s.actHeal) r.actHeal = s.actHeal;
    if (s.poolHeal) r.poolHeal = s.poolHeal;
  }
  if (salt > MAX_TABLE_SALT) r.deep = Math.pow(1.06, salt - MAX_TABLE_SALT);
  return r;
}

export function saltDesc(salt) {
  const out = [];
  for (let i = 1; i <= Math.min(salt, MAX_TABLE_SALT); i++) out.push(`Salt ${i}: ${SALT[i].desc}`);
  if (salt > MAX_TABLE_SALT) out.push(`Deep Salt ×${saltRules(salt).deep.toFixed(2)} enemy Mass and FIRM`);
  return out;
}
