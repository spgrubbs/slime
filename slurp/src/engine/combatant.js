// ─────────────────────────────────────────────────────────────────────────────
// Combatant construction — turns a slime (or an enemy definition) plus its
// essences, mutations, resonance and relics into the flat shape battle.js
// resolves.
//
// Bloat: a slime can carry any number of essences, but every slotted essence
// past its capacity costs BLOAT_PER of every stat (compounding). A pile of
// Level I essences loses to a few leveled, mutated ones.
// ─────────────────────────────────────────────────────────────────────────────

import { ESSENCES, isSlotted } from './content/essences.js';
import { familyCounts, activeResonance, FAMILIES } from './content/families.js';
import { RELICS } from './content/relics.js';
import { SPECIES } from './content/species.js';
import { ENEMIES } from './content/enemies.js';
import { tagsOfDef } from './content/tags.js';
import { mutationDef } from './content/mutations.js';

export const BASE_CAPACITY = 4;
export const BLOAT_PER = 0.07;

export const tagsOf = (id) => tagsOfDef(id, ESSENCES[id]);

/** Level index for an owned essence under a species' fusion thresholds. */
export function levelFor(e, copiesFor = [1, 3, 6]) {
  if (e.apex) return 3;
  return e.copies >= copiesFor[2] ? 2 : e.copies >= copiesFor[1] ? 1 : 0;
}

/** Essences the slime can hold before Bloat starts. */
export function capacityOf(run) {
  const sp = SPECIES[run.slime.species].rules || {};
  const relicSlots = (run.relics || []).reduce((n, id) => n + (RELICS[id]?.run?.slots || 0), 0);
  const upgrades = run.meta?.upgrades?.vacuole || 0;
  return Math.max(1, BASE_CAPACITY + upgrades + (run.bonusSlots || 0) + (sp.slots || 0) + relicSlots);
}

export const bloatOf = (run) => Math.max(0, run.slime.slotted.length - capacityOf(run));
export const bloatMult = (bloat) => Math.pow(1 - BLOAT_PER, bloat);

function blank(name, side, s) {
  return {
    name, side,
    firm: s.firm, slip: s.slip, visc: s.visc,
    maxHp: s.mass, hp: s.mass, membrane: 0, element: null,
    critChance: 0.05, critDmg: 0, dodge: 0, lifesteal: 0, trueDmgPct: 0,
    healMult: 1, damageTakenMult: 1, damageDealtMult: 1, membraneMult: 1,
    statusAmp: {}, tempo: 0, tempoMult: 1, cdReduction: 0,
    flags: {}, temp: {}, status: {}, statusRound: {}, meters: { crit: 0, dodge: 0 },
    cooldowns: {}, overhealFns: [], hooks: [], immune: [], tags: {}, runGains: null,
  };
}

function essenceHook(id, L, keyPrefix) {
  const d = ESSENCES[id];
  return { key: `${keyPrefix}:${id}`, id, name: d.name, icon: d.icon, L, cd: d.cd || 0, h: d.hooks || {}, def: d };
}

function primaryElement(affinity) {
  let best = null;
  for (const [el, n] of Object.entries(affinity)) {
    if (n >= 3 && (!best || n > affinity[best])) best = el;
  }
  return best;
}

/** Tag counts: the species' own tags plus every slotted essence's tags (Attuned counts double). */
export function tagCounts(slime) {
  const counts = {};
  const add = (t, n = 1) => { counts[t] = (counts[t] || 0) + n; };
  for (const t of SPECIES[slime.species].tags || []) add(t);
  for (const e of slime.slotted) {
    const attuned = (e.mods || []).some(m => mutationDef(m)?.mod?.attune);
    for (const t of tagsOf(e.id)) add(t, attuned ? 2 : 1);
  }
  return counts;
}

/** Everything about a slime that does not depend on the enemy. */
export function slimeProfile(slime, run) {
  const sp = SPECIES[slime.species];
  const rules = sp.rules || {};
  const copiesFor = rules.copiesFor || [1, 3, 6];
  const stats = { ...slime.base };
  const affinity = { fire: 0, water: 0, nature: 0, earth: 0 };

  for (const e of slime.stats) {
    const d = ESSENCES[e.id];
    for (const [k, n] of Object.entries(d.stats || {})) stats[k] += Math.floor(n * e.copies * (rules.statMult || 1));
    for (const [k, n] of Object.entries(d.affinity || {})) affinity[k] += n * e.copies;
  }
  for (const e of slime.slotted) {
    const el = ESSENCES[e.id]?.element;
    if (el) affinity[el] += 1;
  }
  stats.mass += slime.maxMassBonus || 0;

  const bloat = run ? bloatOf(run) : 0;
  const bm = bloatMult(bloat);
  for (const k of ['mass', 'firm', 'slip', 'visc']) stats[k] = Math.max(k === 'mass' ? 1 : 0, Math.floor(stats[k] * bm));

  const counts = familyCounts(slime.slotted, ESSENCES);
  const bonus = (run?.relics || []).reduce((n, r) => n + (RELICS[r]?.run?.resonanceBonus || 0), 0);
  if (bonus) {
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) counts[top[0]] += bonus;
  }
  const resonance = activeResonance(counts);
  const levelBonus = resonance.reduce((n, r) => n + (r.effect.levelBonus || 0), 0);

  const levels = slime.slotted.map(e => {
    const up = (e.mods || []).reduce((n, m) => n + (mutationDef(m)?.mod?.levelUp || 0), 0);
    return Math.min(3, levelFor(e, copiesFor) + levelBonus + up);
  });
  return {
    stats, affinity, element: primaryElement(affinity), counts, resonance, levels, copiesFor,
    tags: tagCounts(slime), bloat, bloatMult: bm, capacity: run ? capacityOf(run) : BASE_CAPACITY,
  };
}

/** Apply an owned essence's mutations to its hook, adding any extra hooks they bring. */
function applyMutations(c, hk, mods) {
  const extra = [];
  const wraps = { before: [], after: [] };
  for (const key of mods || []) {
    const m = mutationDef(key);
    if (!m) continue;
    const mod = m.mod || {};
    if (mod.cd) hk.cd = Math.max(1, hk.cd + mod.cd);
    if (mod.twice) hk.extraTimes = (hk.extraTimes || 0) + mod.twice;
    if (mod.repeat) hk.repeat = (hk.repeat || 0) + mod.repeat;
    if (mod.opener && hk.h.action) {
      extra.push({ key: `${hk.key}:opener`, name: `${hk.name} (Opener)`, L: hk.L, def: {}, h: { battleStart: (ctx, me, foe) => hk.h.action(ctx, me, foe, hk.L, {}, hk) } });
    }
    if (m.before) wraps.before.push(m.before);
    if (m.after) wraps.after.push(m.after);
    if (m.hooks || m.passive) extra.push({ key: `${hk.key}:${key}`, name: m.name, L: hk.L, h: m.hooks || {}, def: m });
  }
  if (hk.h.action && (wraps.before.length || wraps.after.length)) {
    const base = hk.h.action;
    hk.h = {
      ...hk.h,
      action: (ctx, me, foe, L, ev, self) => {
        for (const f of wraps.before) f(ctx, me, foe, L);
        base(ctx, me, foe, L, ev, self);
        for (const f of wraps.after) if (!ctx.over) f(ctx, me, foe, L);
      },
    };
  }
  return extra;
}

/**
 * Build the player's combatant. `enemyId` lets the Mimic copy the foe's
 * signature for this battle.
 */
export function buildPlayer(run, enemyId = null) {
  const slime = run.slime;
  const prof = slimeProfile(slime, run);
  const c = blank(SPECIES[slime.species].name, 'player', prof.stats);
  c.hp = Math.min(slime.hp, c.maxHp);
  c.element = prof.element;
  c.gel = run.gel;
  c.tags = prof.tags;
  c.fusedCount = prof.levels.filter(L => L >= 1).length;
  c.runGains = { maxMass: 0, gel: 0 };

  // Slot order is the Action priority order.
  const extras = [];
  slime.slotted.forEach((e, i) => {
    const hk = essenceHook(e.id, prof.levels[i], `s${i}`);
    c.hooks.push(hk);
    extras.push(...applyMutations(c, hk, e.mods));
  });
  c.hooks.push(...extras);

  if (SPECIES[slime.species].rules?.mimic && enemyId) {
    const sig = ENEMIES[enemyId]?.pool?.signature;
    if (sig && ESSENCES[sig] && isSlotted(sig)) c.hooks.push(essenceHook(sig, 0, 'mimic'));
  }

  for (const r of prof.resonance) {
    c.hooks.push({ key: `res:${r.family}:${r.tier}`, name: `${FAMILIES[r.family].name} Resonance`, L: r.tier, h: r.effect.hooks || {}, def: r.effect });
  }
  for (const id of run.relics || []) {
    const d = RELICS[id];
    c.hooks.push({ key: `relic:${id}`, name: d.name, icon: d.icon, L: 0, h: d.hooks || {}, def: d });
  }

  for (const hk of c.hooks) hk.def.passive?.(c, hk.L);
  c.hp = Math.min(c.hp, c.maxHp);
  return c;
}

/** Build an enemy. `scale` multiplies FIRM (and Mass, unless `massScale` is given too). */
export function buildEnemy(id, { scale = 1, massScale = 1 } = {}) {
  const d = ENEMIES[id];
  const s = d.stats;
  const c = blank(d.name, 'enemy', {
    mass: Math.floor(s.mass * scale * massScale), firm: Math.floor(s.firm * scale), slip: s.slip, visc: s.visc,
  });
  c.element = d.element;
  c.icon = d.icon;
  d.kit.forEach(([eid, L], i) => {
    c.hooks.push(essenceHook(eid, L, `k${i}`));
    for (const t of tagsOf(eid)) c.tags[t] = (c.tags[t] || 0) + 1;
  });
  for (const hk of c.hooks) hk.def.passive?.(c, hk.L);
  c.hp = c.maxHp;
  return c;
}
