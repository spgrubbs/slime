// ─────────────────────────────────────────────────────────────────────────────
// Run state machine
//
// A run is plain, serializable data. Every exported action takes a run and
// returns a NEW run (the input is never mutated), so the UI can treat it like
// a reducer and saves are just JSON. All randomness is drawn from streams keyed
// by (seed, purpose, step), so the same seed + the same choices = the same run.
// ─────────────────────────────────────────────────────────────────────────────

import { stream, weightedSample, pick } from './rng.js';
import { resolveBattle } from './battle.js';
import { buildPlayer, buildEnemy, slimeProfile, levelFor } from './combatant.js';
import { generateMap, finaleMap, reachable } from './map.js';
import { ESSENCES, isSlotted } from './content/essences.js';
import { ENEMIES, ACTS, FINALE } from './content/enemies.js';
import { RELICS, RELIC_PRICES } from './content/relics.js';
import { SPECIES } from './content/species.js';
import { EVENTS } from './content/events.js';
import { saltRules } from './content/salt.js';
import { familyCounts, activeResonance } from './content/families.js';

export const RUN_VERSION = 1;
export const MAX_SLOTS = 8;
const RARITY_WEIGHT = { common: 60, uncommon: 30, rare: 10, keystone: 5 };

// ── Helpers ──────────────────────────────────────────────────────────────────

function mutate(run, fn) {
  const { records, ...rest } = run.battle || {};
  const r = structuredClone({ ...run, battle: run.battle ? rest : null });
  fn(r);
  // Fusion Bursts wait until the battle replay is over.
  if (r.phase !== 'fusion' && r.phase !== 'battle' && r.fusionQueue.length) openFusion(r);
  return r;
}

const up = (run, id) => run.meta.upgrades[id] || 0;
const rules = (run) => saltRules(run.salt);
export const actDef = (run) => (run.act < ACTS.length ? ACTS[run.act] : FINALE);
export const nameOf = (id) => ESSENCES[id]?.name || RELICS[id]?.name || id;

export function maxMass(run) {
  return slimeProfile(run.slime, run).stats.mass;
}

export function slotCount(run) {
  const sp = SPECIES[run.slime.species].rules || {};
  const relicSlots = run.relics.reduce((n, id) => n + (RELICS[id]?.run?.slots || 0), 0);
  return Math.max(1, Math.min(MAX_SLOTS, 3 + up(run, 'vacuole') + run.bonusSlots + (sp.slots || 0) + relicSlots));
}

const copiesFor = (run) => SPECIES[run.slime.species].rules?.copiesFor || [1, 3, 6];
export const levelOfOwned = (run, e) => levelFor(e, copiesFor(run));

function heal(run, n) {
  run.slime.hp = Math.min(maxMass(run), run.slime.hp + Math.max(0, Math.floor(n)));
}

/** Outside-battle damage never kills; it leaves you at 1. */
function loseMass(run, n) {
  run.slime.hp = Math.max(1, run.slime.hp - Math.max(0, Math.floor(n)));
}

function runEffects(run, key) {
  const out = [];
  for (const e of run.slime.slotted) {
    const fx = ESSENCES[e.id]?.run?.[key];
    if (fx !== undefined) out.push({ fx, L: levelOfOwned(run, e) });
  }
  for (const id of run.relics) {
    const fx = RELICS[id]?.run?.[key];
    if (fx !== undefined) out.push({ fx, L: 0 });
  }
  const counts = familyCounts(run.slime.slotted, ESSENCES);
  for (const res of activeResonance(counts)) {
    const fx = res.effect.run?.[key];
    if (fx !== undefined) out.push({ fx, L: 0 });
  }
  return out;
}

const sumRun = (run, key) => runEffects(run, key).reduce((n, { fx }) => n + fx, 0);

// ── Essences ─────────────────────────────────────────────────────────────────

/** Would gaining `id` need an empty slot the slime doesn't have? */
export function needsReplace(run, id) {
  return isSlotted(id) && !run.slime.slotted.some(e => e.id === id) && run.slime.slotted.length >= slotCount(run);
}

/**
 * Add copies of an essence. Slotted essences fuse as copies accumulate; a
 * level-up queues a Fusion Burst. `replaceIndex` expels that slot first.
 */
export function gainEssence(run, id, copies = 1, replaceIndex = null) {
  const d = ESSENCES[id];
  if (!d) return;
  if (!isSlotted(id)) {
    const s = run.slime.stats.find(e => e.id === id);
    if (s) s.copies += copies;
    else run.slime.stats.push({ id, copies });
    return;
  }
  const owned = run.slime.slotted.find(e => e.id === id);
  if (owned) {
    const before = levelOfOwned(run, owned);
    owned.copies += copies;
    const after = levelOfOwned(run, owned);
    for (let L = before + 1; L <= after; L++) {
      run.fusionQueue.push({ id, level: L });
      run.stats.fusions++;
    }
    return;
  }
  if (run.slime.slotted.length >= slotCount(run)) {
    if (replaceIndex === null || !run.slime.slotted[replaceIndex]) throw new Error('Slots are full: choose an essence to expel');
    expel(run, replaceIndex);
  }
  run.slime.slotted.push({ id, copies });
  const e = run.slime.slotted[run.slime.slotted.length - 1];
  const L = levelOfOwned(run, e);
  for (let l = 1; l <= L; l++) { run.fusionQueue.push({ id, level: l }); run.stats.fusions++; }
}

function expel(run, index) {
  const [e] = run.slime.slotted.splice(index, 1);
  run.gel += 8 * e.copies; // its Husk
}

export const huskValue = (e) => 8 * e.copies;

/** Move a slotted essence up or down — slot order is the Action priority. */
export const reorderSlot = (run, index, dir) => mutate(run, r => {
  const j = index + dir;
  const s = r.slime.slotted;
  if (j < 0 || j >= s.length) return;
  [s[index], s[j]] = [s[j], s[index]];
});

// ── Fusion Bursts ────────────────────────────────────────────────────────────

const BOONS = {
  1: [
    { kind: 'mass', amount: 8, label: '+8 max Mass' },
    { kind: 'gel', amount: 30, label: '+30 Gel' },
    { kind: 'heal', amount: 0.25, label: 'Heal 25%' },
    { kind: 'copy', amount: 1, label: '+1 copy to another essence' },
  ],
  2: [
    { kind: 'firm', amount: 2, label: '+2 FIRM' },
    { kind: 'slip', amount: 2, label: '+2 SLIP' },
    { kind: 'visc', amount: 3, label: '+3 VISC' },
    { kind: 'mass', amount: 20, label: '+20 max Mass' },
    { kind: 'relic', amount: 1, label: 'A random relic' },
  ],
};

function openFusion(run) {
  const next = run.fusionQueue[0];
  const rng = stream(run.seed, 'boon', run.step, run.stats.fusions, run.fusionQueue.length);
  const table = BOONS[Math.min(2, next.level)] || BOONS[1];
  run.fusion = { ret: { phase: run.phase, pending: run.pending }, burst: next, boons: weightedSample(rng, table, 3, () => 1) };
  run.phase = 'fusion';
  run.pending = null;
}

export const chooseBoon = (run, index) => mutate(run, r => {
  const b = r.fusion.boons[index];
  const rng = stream(r.seed, 'boonApply', r.step, r.stats.fusions);
  switch (b.kind) {
    case 'mass': r.slime.maxMassBonus += b.amount; heal(r, b.amount); break;
    case 'gel': r.gel += b.amount; break;
    case 'heal': heal(r, maxMass(r) * b.amount); break;
    case 'firm': case 'slip': case 'visc': r.slime.base[b.kind] += b.amount; break;
    case 'relic': addRandomRelic(r, rng); break;
    case 'copy': {
      const others = r.slime.slotted.filter(e => e.id !== r.fusion.burst.id && levelOfOwned(r, e) < 2);
      if (others.length) gainEssence(r, pick(rng, others).id, 1);
      else r.gel += 30;
      break;
    }
    default: break;
  }
  r.fusionQueue.shift();
  const { ret } = r.fusion;
  r.fusion = null;
  r.phase = ret.phase;
  r.pending = ret.pending;
});

// ── Relics ───────────────────────────────────────────────────────────────────

function rollRelic(run, rng, rarities = { common: 60, uncommon: 30, rare: 10 }) {
  const pool = Object.keys(RELICS).filter(id => !run.relics.includes(id) && rarities[RELICS[id].rarity]);
  const [id] = weightedSample(rng, pool, 1, id => rarities[RELICS[id].rarity]);
  return id || null;
}

function addRandomRelic(run, rng) {
  const id = rollRelic(run, rng);
  if (id) run.relics.push(id);
  return id ? RELICS[id].name : null;
}

// ── New run ──────────────────────────────────────────────────────────────────

/** `meta` = { upgrades: {id: rank}, heirloom: essenceId | null } */
export function newRun({ seed, species = 'gloop', salt = 0, meta = { upgrades: {}, heirloom: null } }) {
  const sp = SPECIES[species];
  const u = (id) => meta.upgrades[id] || 0;
  const r = saltRules(salt);
  const base = {
    mass: Math.floor((sp.base.mass + u('thickMembrane') * 8) * r.startMass),
    firm: sp.base.firm + u('denseCore'),
    slip: sp.base.slip + u('slickSkin'),
    visc: sp.base.visc + u('viscous'),
  };
  const run = {
    version: RUN_VERSION,
    seed: String(seed),
    salt,
    species,
    meta: structuredClone(meta),
    act: 0,
    map: generateMap(String(seed), 0, { weights: r.mapWeights }),
    current: null,
    visited: [],
    step: 0,
    gel: u('headStart') * 40,
    relics: [],
    bonusSlots: 0,
    phase: 'map',
    pending: null,
    battle: null,
    fusion: null,
    fusionQueue: [],
    lastEnemy: null,
    winsSinceFerment: 0,
    stats: { floors: 0, kills: 0, elites: 0, bosses: 0, fusions: 0, absorbed: 0, biggestHit: 0, mostActions: 0, won: false, peakMass: base.mass },
    slime: { species, base, hp: base.mass, slotted: [{ id: sp.starter, copies: 1 }], stats: [], maxMassBonus: 0 },
  };
  if (u('heirloom') && meta.heirloom && ESSENCES[meta.heirloom]) {
    gainEssence(run, meta.heirloom, 1, run.slime.slotted.length >= slotCount(run) ? 0 : null);
  }
  run.fusionQueue = []; // no bursts for starting kit
  return run;
}

// ── Map movement ─────────────────────────────────────────────────────────────

export const enterNode = (run, nodeId) => mutate(run, r => {
  if (r.phase !== 'map') throw new Error(`Cannot move during ${r.phase}`);
  if (!reachable(r.map, r.current).includes(nodeId)) throw new Error(`Node ${nodeId} is not reachable`);
  r.current = nodeId;
  r.visited.push(nodeId);
  r.step++;
  r.stats.floors++;
  resolveNode(r, r.map.nodes[nodeId].type);
});

function resolveNode(r, type) {
  const rng = stream(r.seed, 'node', r.step);
  switch (type) {
    case 'fight': return startBattle(r, pickEnemy(r, 'normals', rng), 'fight');
    case 'elite': return startBattle(r, pickEnemy(r, 'elites', rng), 'elite');
    case 'boss': return startBattle(r, actDef(r).boss, 'boss');
    case 'shop': r.phase = 'shop'; r.pending = makeShop(r); return;
    case 'pool': r.phase = 'pool'; r.pending = { used: false }; return;
    case 'treasure':
      r.phase = 'treasure';
      r.pending = { relic: rollRelic(r, rng), gel: 15 + Math.floor(rng() * 10), source: 'treasure' };
      return;
    case 'event': {
      const seen = r.seenEvents || (r.seenEvents = []);
      const options = Object.keys(EVENTS).filter(id => !seen.includes(id));
      const id = pick(rng, options.length ? options : Object.keys(EVENTS));
      seen.push(id);
      r.phase = 'event';
      r.pending = { eventId: id, result: null };
      return;
    }
    case 'mystery': {
      const roll = rng();
      const t = roll < 0.55 ? 'event' : roll < 0.8 ? 'fight' : roll < 0.9 ? 'shop' : 'treasure';
      r.mysteryRevealed = t;
      return resolveNode(r, t);
    }
    default: r.phase = 'map';
  }
}

function pickEnemy(r, list, rng) {
  const options = actDef(r)[list].filter(id => id !== r.lastEnemy);
  const id = pick(rng, options);
  r.lastEnemy = id;
  return id;
}

// ── Battles ──────────────────────────────────────────────────────────────────

function enemyScale(r, kind) {
  const s = rules(r);
  if (kind === 'boss') return { scale: s.bossScale * s.deep };
  if (kind === 'elite') return { scale: s.eliteScale * s.deep };
  return { scale: s.normalScale * s.deep, massScale: s.normalMass };
}

function startBattle(r, enemyId, kind) {
  const player = buildPlayer(r, enemyId);
  const enemy = buildEnemy(enemyId, enemyScale(r, kind));
  const result = resolveBattle(player, enemy, { isBoss: kind === 'boss' });
  r.phase = 'battle';
  r.battle = {
    enemyId, kind,
    winner: result.winner, rounds: result.rounds, flawless: result.flawless, devoured: result.devoured,
    stats: result.stats, records: result.records,
  };
  r.slime.hp = Math.max(0, Math.floor(result.playerHp));
  r.stats.biggestHit = Math.max(r.stats.biggestHit, result.stats.biggestHit);
  r.stats.mostActions = Math.max(r.stats.mostActions, result.stats.mostActions);

  if (result.winner !== 'player') { r.pending = { outcome: 'defeat' }; return; }

  // Win: rewards are settled now, so they never depend on whether the
  // player watches the replay.
  r.stats.kills++;
  if (kind === 'elite') r.stats.elites++;
  if (kind === 'boss') r.stats.bosses++;
  const rng = stream(r.seed, 'reward', r.step);
  const [lo, hi] = ENEMIES[enemyId].gel;
  let gel = Math.floor((lo + rng() * (hi - lo + 1)) * (1 + 0.15 * up(r, 'gelGlands')));
  const gains = { maxMass: 0, gel: 0 };
  for (const { fx, L } of runEffects(r, 'onWin')) fx(L, gains);
  if (kind === 'elite') for (const { fx } of runEffects(r, 'onEliteWin')) fx(r);
  gel += gains.gel;
  r.gel += gel;
  r.slime.maxMassBonus += gains.maxMass;
  const healPct = 0.04 * up(r, 'regrowth') + sumRun(r, 'healAfterWin');
  heal(r, maxMass(r) * healPct + gains.maxMass);

  const ferment = runEffects(r, 'fermentEvery')[0];
  if (ferment && r.slime.slotted.length) {
    r.winsSinceFerment++;
    if (r.winsSinceFerment >= ferment.fx) { r.winsSinceFerment = 0; gainEssence(r, pick(rng, r.slime.slotted).id, 1); }
  }
  r.stats.peakMass = Math.max(r.stats.peakMass, maxMass(r));
  r.pending = { outcome: 'win', gel, massGained: gains.maxMass, healPct };
}

/** Leave the battle replay: on to the absorb screen, or to the end of the run. */
export const finishBattle = (run) => mutate(run, r => {
  if (r.phase !== 'battle') return;
  if (r.pending.outcome === 'defeat') { endRun(r, false); return; }
  const b = r.battle;
  if (b.kind === 'boss' && r.map.finale) { endRun(r, true); return; }
  r.phase = 'absorb';
  r.pending = makeOffer(r, b.enemyId, b.kind, { flawless: b.flawless, devoured: b.devoured });
});

// ── Absorbing ────────────────────────────────────────────────────────────────

function makeOffer(r, enemyId, kind, { flawless, devoured }) {
  const rng = stream(r.seed, 'offer', r.step);
  const pool = ENEMIES[enemyId].pool;
  const owns = (id) => r.slime.slotted.some(e => e.id === id) || r.slime.stats.some(e => e.id === id);
  const maxed = (id) => { const e = r.slime.slotted.find(x => x.id === id); return e && levelOfOwned(r, e) >= 2; };

  if (kind === 'boss') {
    return { kind, enemyId, picks: 1, flawless, devoured, options: pool.boss.filter(id => !owns(id)).map(id => ({ id, copies: 1 })) };
  }

  const sp = SPECIES[r.slime.species].rules || {};
  const n = Math.max(1, 3 + (sp.absorbOptions || 0) + up(r, 'secondHelping') + sumRun(r, 'absorbOptions') + (flawless ? 1 : 0));
  const affinity = Math.max(2, ...runEffects(r, 'affinity').map(x => x.fx));

  const candidates = [...new Set([...(pool.shared || []), pool.stat, pool.element].filter(Boolean))]
    .filter(id => ESSENCES[id] && !maxed(id));
  const options = [];
  const sigIn = kind === 'elite' || rng() < 0.5;
  if (pool.signature && !maxed(pool.signature) && sigIn) {
    options.push({ id: pool.signature, copies: kind === 'elite' ? 2 : 1, signature: true });
  }
  if (kind === 'elite' && pool.rare && !owns(pool.rare) && rng() < 0.3) options.push({ id: pool.rare, copies: 1, rare: true });

  const rest = candidates.filter(id => !options.some(o => o.id === id));
  const drawn = weightedSample(rng, rest, Math.max(0, n - options.length),
    id => (RARITY_WEIGHT[ESSENCES[id].rarity] || 30) * (owns(id) ? affinity : 1));
  options.push(...drawn.map(id => ({ id, copies: 1 })));

  // Guarantee one slotted option when the pool has one.
  if (!options.some(o => isSlotted(o.id))) {
    const slotted = rest.find(id => isSlotted(id) && !options.some(o => o.id === id));
    if (slotted) options[options.length - 1] = { id: slotted, copies: 1 };
  }
  const picks = 1 + (devoured ? 1 : 0) + sumRun(r, 'absorbPicks');
  return { kind, enemyId, picks, flawless, devoured, options: options.slice(0, Math.max(n, options.length)) };
}

export const absorb = (run, optionIndex, replaceIndex = null) => mutate(run, r => {
  if (r.phase !== 'absorb') throw new Error('Not absorbing');
  const opt = r.pending.options[optionIndex];
  if (!opt) throw new Error('No such option');
  gainEssence(r, opt.id, opt.copies, replaceIndex);
  r.stats.absorbed++;
  heal(r, maxMass(r) * 0.05);
  r.pending.options.splice(optionIndex, 1);
  r.pending.picks--;
  if (r.pending.picks <= 0 || !r.pending.options.length) afterAbsorb(r);
});

export const digest = (run, choice = 'gel') => mutate(run, r => {
  if (r.phase !== 'absorb') return;
  if (choice === 'gel') r.gel += 15;
  else heal(r, maxMass(r) * 0.15);
  afterAbsorb(r);
});

function afterAbsorb(r) {
  const kind = r.pending.kind;
  if (kind === 'elite') {
    const rng = stream(r.seed, 'eliteRelic', r.step);
    r.phase = 'treasure';
    r.pending = { relic: rollRelic(r, rng), gel: 0, source: 'elite' };
    return;
  }
  if (kind === 'boss') { completeAct(r); return; }
  r.phase = 'map';
  r.pending = null;
}

// ── Treasure ─────────────────────────────────────────────────────────────────

export const takeTreasure = (run) => mutate(run, r => {
  if (r.phase !== 'treasure') return;
  if (r.pending.relic) r.relics.push(r.pending.relic);
  r.gel += r.pending.gel;
  heal(r, 0); // clamp in case a relic changed max Mass
  r.phase = 'map';
  r.pending = null;
});

// ── Pools ────────────────────────────────────────────────────────────────────

export const poolHealPct = (run) => rules(run).poolHeal + 0.1 * up(run, 'deepPools');

export const usePool = (run, option, index = null) => mutate(run, r => {
  if (r.phase !== 'pool') return;
  if (option === 'soak') {
    heal(r, maxMass(r) * poolHealPct(r));
    for (const { fx } of runEffects(r, 'onRest')) fx(r);
  } else if (option === 'ferment') {
    const e = r.slime.slotted[index];
    if (!e) throw new Error('Choose an essence to ferment');
    gainEssence(r, e.id, 1);
  } else if (option === 'molt') {
    if (!r.slime.slotted[index] || r.slime.slotted.length <= 1) throw new Error('Choose an essence to molt');
    expel(r, index);
  }
  r.phase = 'map';
  r.pending = null;
});

// ── Shop ─────────────────────────────────────────────────────────────────────

function priceMult(r) {
  const disc = sumRun(r, 'shopDiscount');
  return rules(r).shopMult * (1 - disc);
}

const ESSENCE_PRICE = { stat: 45, element: 45, common: 55, uncommon: 85, rare: 140, keystone: 220 };

function makeShop(r) {
  const rng = stream(r.seed, 'shop', r.step);
  const act = actDef(r);
  const normals = act.normals || ACTS[ACTS.length - 1].normals;
  const ids = new Set();
  for (const eid of normals) {
    const p = ENEMIES[eid].pool;
    [p.signature, ...(p.shared || []), p.stat, p.element].filter(Boolean).forEach(id => ids.add(id));
  }
  const m = priceMult(r);
  const essences = weightedSample(rng, [...ids], 3, id => RARITY_WEIGHT[ESSENCES[id].rarity] || 30).map(id => {
    const d = ESSENCES[id];
    const base = d.type === 'stat' || d.type === 'element' ? ESSENCE_PRICE.stat : ESSENCE_PRICE[d.rarity];
    return { id, price: Math.round(base * m), sold: false };
  });
  const relics = [];
  for (let i = 0; i < 2; i++) {
    const id = rollRelic({ ...r, relics: [...r.relics, ...relics.map(x => x.id)] }, rng);
    if (id) relics.push({ id, price: Math.round(RELIC_PRICES[RELICS[id].rarity] * m), sold: false });
  }
  if (!r.relics.includes('membershipCard') && rng() < 0.4) relics.push({ id: 'membershipCard', price: Math.round(RELIC_PRICES.shop * m), sold: false });
  return {
    essences, relics,
    services: {
      heal: { price: Math.round(40 * m), used: false },
      remove: { price: Math.round((50 + 25 * (r.removals || 0)) * m) },
      infuse: { price: Math.round((75 + 25 * (r.infusions || 0)) * m) },
    },
  };
}

export const shopBuy = (run, kind, index, arg = null) => mutate(run, r => {
  if (r.phase !== 'shop') throw new Error('Not in a shop');
  const shop = r.pending;
  const pay = (price) => { if (r.gel < price) throw new Error('Not enough Gel'); r.gel -= price; };
  if (kind === 'essence') {
    const item = shop.essences[index];
    if (!item || item.sold) return;
    pay(item.price);
    item.sold = true;
    gainEssence(r, item.id, 1, arg);
  } else if (kind === 'relic') {
    const item = shop.relics[index];
    if (!item || item.sold) return;
    pay(item.price);
    item.sold = true;
    r.relics.push(item.id);
  } else if (kind === 'heal') {
    if (shop.services.heal.used) return;
    pay(shop.services.heal.price);
    shop.services.heal.used = true;
    heal(r, maxMass(r) * 0.3);
  } else if (kind === 'remove') {
    if (!r.slime.slotted[arg] || r.slime.slotted.length <= 1) throw new Error('Choose an essence to remove');
    pay(shop.services.remove.price);
    r.slime.slotted.splice(arg, 1);
    r.removals = (r.removals || 0) + 1;
    shop.services.remove.price = Math.round((50 + 25 * r.removals) * priceMult(r));
  } else if (kind === 'infuse') {
    if (!r.slime.slotted[arg]) throw new Error('Choose an essence to infuse');
    pay(shop.services.infuse.price);
    gainEssence(r, r.slime.slotted[arg].id, 1);
    r.infusions = (r.infusions || 0) + 1;
    shop.services.infuse.price = Math.round((75 + 25 * r.infusions) * priceMult(r));
  }
});

export const leaveShop = (run) => mutate(run, r => {
  if (r.phase !== 'shop') return;
  r.phase = 'map';
  r.pending = null;
});

// ── Events ───────────────────────────────────────────────────────────────────

const eventApi = {
  gainEssence: (run, id, n) => {
    if (needsReplace(run, id)) { run.gel += 20; return; } // no room: it dissolves into Gel
    gainEssence(run, id, n);
  },
  randomOwnedSlotted: (run, rng) => pick(rng, run.slime.slotted),
  name: (id) => nameOf(id),
  heal: (run, n) => heal(run, n),
  loseMass: (run, n) => loseMass(run, n),
  maxMass: (run) => maxMass(run),
  randomEssence: (rng, run) => {
    // With no free slot, the mushroom feeds something you already have.
    if (run && run.slime.slotted.length >= slotCount(run)) return pick(rng, run.slime.slotted).id;
    return pick(rng, Object.keys(ESSENCES).filter(id => isSlotted(id) && ['common', 'uncommon'].includes(ESSENCES[id].rarity)));
  },
  addRandomRelic: (run, rng) => addRandomRelic(run, rng),
  apexCandidates: (run) => run.slime.slotted.filter(e => !e.apex && levelOfOwned(run, e) >= 2),
};

export const eventChoiceAllowed = (run, choice) => !choice.req || choice.req(run, eventApi);

export const chooseEvent = (run, index) => mutate(run, r => {
  if (r.phase !== 'event' || r.pending.result) return;
  const ev = EVENTS[r.pending.eventId];
  const choice = ev.choices[index];
  if (!choice || !eventChoiceAllowed(r, choice)) throw new Error('That choice is not available');
  r.pending.result = choice.effect(r, stream(r.seed, 'event', r.step), eventApi);
});

export const leaveEvent = (run) => mutate(run, r => {
  if (r.phase !== 'event') return;
  r.phase = 'map';
  r.pending = null;
});

// ── Acts ─────────────────────────────────────────────────────────────────────

function completeAct(r) {
  const missing = maxMass(r) - r.slime.hp;
  const healed = Math.floor(missing * rules(r).actHeal);
  r.slime.hp += healed;
  const slot = r.act < 2;
  if (slot) r.bonusSlots++;
  r.phase = 'actComplete';
  r.pending = { act: r.act, healed, slot };
}

export const nextAct = (run) => mutate(run, r => {
  if (r.phase !== 'actComplete') return;
  r.act++;
  r.map = r.act < ACTS.length ? generateMap(r.seed, r.act, { weights: rules(r).mapWeights }) : finaleMap();
  r.current = null;
  r.visited = [];
  r.phase = 'map';
  r.pending = null;
});

function endRun(r, won) {
  r.stats.won = won;
  r.phase = won ? 'victory' : 'defeat';
  r.pending = null;
}

export const abandonRun = (run) => mutate(run, r => endRun(r, false));

/** Strip replay-only data before saving. */
export function serializeRun(run) {
  if (!run) return null;
  const { records, ...battle } = run.battle || {};
  return JSON.stringify({ ...run, battle: run.battle ? battle : null });
}
