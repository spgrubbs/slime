// ─────────────────────────────────────────────────────────────────────────────
// Caravan ambush
//
// Same round resolver as expeditions. The squad fights the column one unit at a
// time from the front; rewards bank the moment a unit falls, so pulling out
// early is always a real option rather than a forfeit.
// ─────────────────────────────────────────────────────────────────────────────

import { CARAVAN_UNITS, rollCaravan, caravanDay, getCaravanScaling } from '../data/caravanData.js';
import { makeSlimeCombatant, resolveRound } from './resolveRound.js';

const C = {
  hit:    '#4ade80',
  loss:   '#ef4444',
  loot:   '#f59e0b',
  road:   '#94a3b8',
  rout:   '#22d3ee',
};

// ── Combatants ───────────────────────────────────────────────────────────────

export function makeCaravanUnit(typeId, index, scaling) {
  const def = CARAVAN_UNITS[typeId];
  const hp = Math.max(1, Math.floor(def.hp * scaling.hpMultiplier));
  const dmg = Math.max(1, Math.floor(def.dmg * scaling.damageMultiplier));

  return {
    id: `unit-${index}-${typeId}`,
    name: def.name,
    side: 'enemy',
    type: typeId,
    ref: { ...def, dmg, element: null, ability: null, mats: Object.keys(def.mats) },
    isBoss: !!def.isBoss,
    critImmune: !!def.critImmune,
    statusImmune: !!def.statusImmune,
    hp,
    maxHp: hp,
    stats: { firmness: dmg, slipperiness: def.slippery || def.tier, viscosity: def.tier },
    tempStats: { firmness: 0, slipperiness: 0, viscosity: 0 },
    primaryElement: null,
    effects: [],
    status: [],
    flags: {},
    dead: false,
  };
}

// ── Setup ────────────────────────────────────────────────────────────────────

export function makeAmbush(squadSlimes, tier, ctx = {}, day = caravanDay()) {
  const caravan = rollCaravan(tier, day);
  const scaling = getCaravanScaling(tier);

  return {
    version: 1,
    phase: 'battle',
    tier,
    day,
    round: 0,
    roundTimer: 0,
    escapeRounds: caravan.escapeRounds,
    units: caravan.units.map((t, i) => makeCaravanUnit(t, i, scaling)),
    slimes: squadSlimes.map(sl => makeSlimeCombatant(sl, ctx)),
    banked: { biomass: 0, mats: {} },
    killed: [],
    logs: [{
      m: `A tier ${tier} caravan is on the road — ${caravan.units.length} in the column.`,
      c: C.road,
      v: `unit HP ×${scaling.hpMultiplier.toFixed(2)}, damage ×${scaling.damageMultiplier.toFixed(2)}, loot ×${scaling.lootMultiplier.toFixed(2)} · ${caravan.escapeRounds} rounds before they are clear`,
    }],
    anim: null,
    summary: null,
  };
}

// ── Presentation beats (shared with expeditions) ─────────────────────────────

const BEAT_KINDS = {
  attack: 'strike', blast: 'strike', status: 'tick', heal: 'tick',
  death: 'fall', revive: 'rise', kill: 'fall', stunned: 'stagger',
};

function buildAnim(records, roundMs) {
  const visual = records.filter(r => BEAT_KINDS[r.kind]);
  if (!visual.length) return null;
  const spacing = Math.min(320, roundMs / Math.max(visual.length, 1));
  return {
    startedAt: Date.now(),
    duration: roundMs,
    beats: visual.map((r, i) => ({
      at: Math.round(i * spacing),
      kind: BEAT_KINDS[r.kind],
      actorId: r.actorId ?? null,
      targetId: r.targetId ?? null,
      side: r.side || (r.actorId ? 'slime' : 'enemy'),
      text: r.damage ? `-${r.damage}` : r.heal ? `+${r.heal}`
          : r.result === 'evaded' ? 'dodge' : r.kind === 'stunned' ? '💫' : null,
      color: r.log?.c || '#e0e0e0',
      result: r.result || r.kind,
    })),
  };
}

// ── Rewards ──────────────────────────────────────────────────────────────────

function bankUnit(ambush, unit) {
  const def = CARAVAN_UNITS[unit.type];
  const mult = getCaravanScaling(ambush.tier).lootMultiplier;
  const biomass = Math.floor(def.biomass * mult);

  ambush.banked.biomass += biomass;
  Object.entries(def.mats).forEach(([m, c]) => {
    ambush.banked.mats[m] = (ambush.banked.mats[m] || 0) + c;
  });
  ambush.killed.push(unit.type);

  const matStr = Object.entries(def.mats).map(([m, c]) => `${c}× ${m}`).join(', ');
  ambush.logs.push({
    m: `${def.icon} ${def.name} down — +${biomass}🧬${matStr ? `, ${matStr}` : ''}`,
    c: C.loot,
    v: `banked immediately · ${def.biomass} base × ${mult.toFixed(2)} tier loot`,
  });
}

// ── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Advance the ambush by `dt` real milliseconds. Mutates `ambush`.
 * Returns the side effects the host must apply.
 */
export function tickAmbush(ambush, dt, ctx = {}, roundMs = 1600) {
  const sideEffects = [];
  if (!ambush || ambush.phase !== 'battle') return { ambush, sideEffects };

  ambush.roundTimer += dt;
  if (ambush.roundTimer < roundMs) return { ambush, sideEffects };
  ambush.roundTimer -= roundMs;

  const target = ambush.units.find(u => !u.dead);
  const living = ambush.slimes.filter(s => !s.dead);

  if (!target || !living.length) {
    finish(ambush, !target ? 'rout' : 'wiped');
    return { ambush, sideEffects };
  }

  const world = { round: ambush.round, slimes: ambush.slimes, enemy: target, zone: 'road' };
  const { records, sideEffects: roundEffects, wiped, enemyDead } = resolveRound(world, ctx);

  ambush.round = world.round;
  sideEffects.push(...roundEffects);
  records.forEach(r => { if (r.log) ambush.logs.push(r.log); });
  ambush.logs = ambush.logs.slice(-120);
  ambush.anim = buildAnim(records, roundMs);

  if (enemyDead) {
    target.dead = true;
    bankUnit(ambush, target);
  }

  if (wiped) {
    finish(ambush, 'wiped');
    return { ambush, sideEffects };
  }
  if (!ambush.units.some(u => !u.dead)) {
    finish(ambush, 'rout');
    return { ambush, sideEffects };
  }
  if (ambush.round >= ambush.escapeRounds) {
    finish(ambush, 'escaped');
  }

  return { ambush, sideEffects };
}

/** Pull the squad out. Everything banked so far is kept; nobody else dies. */
export function retreatAmbush(ambush) {
  if (!ambush || ambush.phase !== 'battle') return ambush;
  finish(ambush, 'retreated');
  return ambush;
}

// ── Outcome ──────────────────────────────────────────────────────────────────

const OUTCOMES = {
  rout: {
    phase: 'victory',
    title: 'Caravan routed',
    msg: 'The whole column is down. 💎',
    color: C.rout,
  },
  escaped: {
    phase: 'over',
    title: 'They broke through',
    msg: 'The survivors got clear of the ambush.',
    color: C.road,
  },
  retreated: {
    phase: 'over',
    title: 'Withdrew',
    msg: 'The squad melted back into the treeline with what it took.',
    color: C.road,
  },
  wiped: {
    phase: 'over',
    title: 'Squad lost',
    msg: 'The ambush failed.',
    color: C.loss,
  },
};

function finish(ambush, reason) {
  const outcome = OUTCOMES[reason];
  ambush.phase = outcome.phase;

  const routed = reason === 'rout';
  const survivors = ambush.slimes.filter(s => !s.dead);
  const lost = ambush.slimes.filter(s => s.dead);
  const remaining = ambush.units.filter(u => !u.dead).length;

  ambush.logs.push({
    m: `${outcome.title} — ${outcome.msg}`,
    c: outcome.color,
    v: `${ambush.killed.length} killed, ${remaining} escaped, ${lost.length} slime(s) lost over ${ambush.round} rounds`,
  });

  ambush.summary = {
    reason,
    routed,
    tier: ambush.tier,
    nextTier: routed ? ambush.tier + 1 : ambush.tier,
    rounds: ambush.round,
    killed: [...ambush.killed],
    remaining,
    banked: {
      biomass: ambush.banked.biomass,
      mats: { ...ambush.banked.mats },
      // Routing the column is the only Prism faucet outside a rare drop.
      prisms: routed ? 1 : 0,
    },
    survivors: survivors.map(s => ({ id: s.id, name: s.name })),
    lost: lost.map(s => ({ id: s.id, name: s.name })),
  };
}

// ── Persistence ──────────────────────────────────────────────────────────────

const strip = ({ ref, effects, ...rest }) => rest;

export function dehydrateAmbush(ambush) {
  if (!ambush) return ambush;
  return {
    ...ambush,
    anim: null,
    slimes: (ambush.slimes || []).map(strip),
    units: (ambush.units || []).map(strip),
  };
}

export function hydrateAmbush(ambush, slimes = [], buildEffectList) {
  if (!ambush) return ambush;
  const byId = new Map(slimes.map(s => [s.id, s]));
  return {
    ...ambush,
    anim: null,
    slimes: (ambush.slimes || []).map(c => {
      const ref = byId.get(c.id);
      return {
        ...c,
        ref: ref || null,
        effects: ref ? buildEffectList(ref) : [],
        dead: c.dead || !ref,
        status: c.status || [],
        flags: c.flags || {},
        tempStats: c.tempStats || { firmness: 0, slipperiness: 0, viscosity: 0 },
      };
    }),
    units: (ambush.units || []).map(u => ({
      ...u,
      ref: CARAVAN_UNITS[u.type]
        ? { ...CARAVAN_UNITS[u.type], dmg: u.stats.firmness, element: null, ability: null,
            mats: Object.keys(CARAVAN_UNITS[u.type].mats) }
        : null,
      effects: [],
      status: u.status || [],
      flags: u.flags || {},
      tempStats: u.tempStats || { firmness: 0, slipperiness: 0, viscosity: 0 },
    })),
  };
}
