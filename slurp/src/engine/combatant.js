// ─────────────────────────────────────────────────────────────────────────────
// Combatant construction — turns a slime (or an enemy definition) plus its
// essences, resonance and relics into the flat shape battle.js resolves.
// ─────────────────────────────────────────────────────────────────────────────

import { ESSENCES, isSlotted } from './content/essences.js';
import { familyCounts, activeResonance, FAMILIES } from './content/families.js';
import { RELICS } from './content/relics.js';
import { SPECIES } from './content/species.js';
import { ENEMIES } from './content/enemies.js';

/** Level index for an owned essence under a species' fusion thresholds. */
export function levelFor(e, copiesFor = [1, 3, 6]) {
  if (e.apex) return 3;
  return e.copies >= copiesFor[2] ? 2 : e.copies >= copiesFor[1] ? 1 : 0;
}

function blank(name, side, s) {
  return {
    name, side,
    firm: s.firm, slip: s.slip, visc: s.visc,
    maxHp: s.mass, hp: s.mass, membrane: 0, element: null,
    critChance: 0.05, critDmg: 0, dodge: 0, lifesteal: 0, trueDmgPct: 0,
    healMult: 1, damageTakenMult: 1, statusAmp: {}, tempo: 0, tempoMult: 1, cdReduction: 0,
    flags: {}, temp: {}, status: {}, statusRound: {}, meters: { crit: 0, dodge: 0 },
    cooldowns: {}, overhealFns: [], hooks: [], immune: [], runGains: null,
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

/** Everything about a slime that does not depend on the enemy. */
export function slimeProfile(slime, run) {
  const sp = SPECIES[slime.species];
  const rules = sp.rules || {};
  const copiesFor = rules.copiesFor || [1, 3, 6];
  const stats = { ...slime.base };
  const affinity = { fire: 0, water: 0, nature: 0, earth: 0 };

  for (const e of slime.stats) {
    const d = ESSENCES[e.id];
    const mult = (rules.statMult || 1) * (d.type === 'stat' ? 1 : 1);
    for (const [k, n] of Object.entries(d.stats || {})) stats[k] += Math.floor(n * e.copies * mult);
    for (const [k, n] of Object.entries(d.affinity || {})) affinity[k] += n * e.copies;
  }
  for (const e of slime.slotted) {
    const el = ESSENCES[e.id]?.element;
    if (el) affinity[el] += 1;
  }
  stats.mass += slime.maxMassBonus || 0;

  const counts = familyCounts(slime.slotted, ESSENCES);
  const bonus = (run?.relics || []).reduce((n, r) => n + (RELICS[r]?.run?.resonanceBonus || 0), 0);
  if (bonus) {
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    if (top) counts[top[0]] += bonus;
  }
  const resonance = activeResonance(counts);
  const levelBonus = resonance.reduce((n, r) => n + (r.effect.levelBonus || 0), 0);

  const levels = slime.slotted.map(e => Math.min(3, levelFor(e, copiesFor) + levelBonus));
  return { stats, affinity, element: primaryElement(affinity), counts, resonance, levels, copiesFor };
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
  c.fusedCount = prof.levels.filter(L => L >= 1).length;
  c.runGains = { maxMass: 0, gel: 0 };

  // Slot order is the Action priority order.
  slime.slotted.forEach((e, i) => c.hooks.push(essenceHook(e.id, prof.levels[i], `s${i}`)));

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

/** Build an enemy. `scale` multiplies Mass and FIRM (Salt levels). */
export function buildEnemy(id, { scale = 1, massScale = 1 } = {}) {
  const d = ENEMIES[id];
  const s = d.stats;
  const c = blank(d.name, 'enemy', {
    mass: Math.floor(s.mass * scale * massScale), firm: Math.floor(s.firm * scale), slip: s.slip, visc: s.visc,
  });
  c.element = d.element;
  c.icon = d.icon;
  d.kit.forEach(([eid, L], i) => c.hooks.push(essenceHook(eid, L, `k${i}`)));
  for (const hk of c.hooks) hk.def.passive?.(c, hk.L);
  c.hp = c.maxHp;
  return c;
}
