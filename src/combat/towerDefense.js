// ─────────────────────────────────────────────────────────────────────────────
// Tower Defense engine
//
// The same round resolver as expeditions, with a different topology: three
// lanes resolving in parallel, and a targeting rule per lane derived from where
// you placed each slime. All the decisions happen in setup.
// ─────────────────────────────────────────────────────────────────────────────

import {
  TD_LANES, LANE_ORDER, TD_POSITIONS, POSITION_ORDER,
  HUMAN_TYPES, TD_WAVES, getTDScaling,
} from '../data/towerDefenseData.js';
import { STATUS_EFFECTS } from '../data/traitData.js';
import { makeSlimeCombatant, resolveRound } from './resolveRound.js';

const C = {
  lane:    '#22d3ee',
  breach:  '#ef4444',
  hold:    '#4ade80',
  wave:    '#f59e0b',
  march:   '#94a3b8',
};

// ── Combatants ───────────────────────────────────────────────────────────────

/** A slime placed at a position, with that position's modifiers baked in. */
export function makeDefender(slime, positionId, ctx) {
  const pos = TD_POSITIONS[positionId];
  const c = makeSlimeCombatant(slime, ctx);
  c.position = positionId;

  if (pos.firmnessMult) {
    c.stats = { ...c.stats, firmness: Math.floor(c.stats.firmness * pos.firmnessMult) };
  }
  if (pos.critBonus) c.critBonus = pos.critBonus;
  if (pos.procMult)  c.procMult  = pos.procMult;

  return c;
}

/** An invader. `march` counts down; at 0 it is at the line and fighting. */
export function makeInvader(type, index, laneId, scaling) {
  const def = HUMAN_TYPES[type];
  const lane = TD_LANES[laneId];
  const hp = Math.floor(def.hp * (scaling?.hpMultiplier || 1));
  const dmg = Math.floor(def.dmg * (scaling?.damageMultiplier || 1));

  const invader = {
    id: `${laneId}-${type}-${index}`,
    name: def.name,
    side: 'enemy',
    type,
    ref: { ...def, dmg, element: null, mats: def.mats, biomass: def.biomass, ability: null },
    isBoss: !!def.isBoss,
    critImmune: !!def.critImmune,
    statusImmune: !!def.statusImmune,
    ignoresGuard: !!def.ignoresGuard,
    hp,
    maxHp: hp,
    stats: { firmness: dmg, slipperiness: def.tier, viscosity: def.tier },
    tempStats: { firmness: 0, slipperiness: 0, viscosity: 0 },
    primaryElement: null,
    effects: [],
    status: [],
    flags: {},
    dead: false,
    // Stagger arrivals so a lane does not dump its whole column at once.
    march: lane.march + index * (lane.singleFile ? 2 : 1),
  };

  if (lane.slowsInvaders) {
    invader.status.push({ type: 'slowed', dur: 999, harmful: true, appliedRound: -1 });
  }
  return invader;
}

// ── Setup ────────────────────────────────────────────────────────────────────

/**
 * `placements` is { laneId: { choke: slimeId, flank: slimeId, rear: slimeId } }.
 * Empty positions are allowed — leaving a lane thin is a legitimate gamble.
 */
export function makeTowerDefense(placements, slimes, queenLevel, ctx = {}) {
  const scaling = getTDScaling(queenLevel);
  const byId = new Map(slimes.map(s => [s.id, s]));

  const lanes = {};
  LANE_ORDER.forEach(laneId => {
    const slots = {};
    POSITION_ORDER.forEach(posId => {
      const slimeId = placements?.[laneId]?.[posId];
      const slime = slimeId ? byId.get(slimeId) : null;
      slots[posId] = slime ? makeDefender(slime, posId, ctx) : null;
    });
    lanes[laneId] = {
      id: laneId,
      slots,
      invaders: [],
      breached: false,
      engaged: false,
    };
  });

  const td = {
    version: 1,
    phase: 'battle',
    wave: 0,
    round: 0,
    roundTimer: 0,
    scaling,
    lanes,
    breaches: [],
    logs: [{
      m: `Wave 1 — ${TD_WAVES[0].name} — approaches!`,
      c: C.wave,
      v: `queen level ${queenLevel} · invader HP ×${scaling.hpMultiplier.toFixed(2)}, damage ×${scaling.damageMultiplier.toFixed(2)}`,
    }],
    summary: null,
  };

  spawnWave(td, 0);
  return td;
}

function spawnWave(td, waveIndex) {
  const wave = TD_WAVES[waveIndex];
  if (!wave) return;
  LANE_ORDER.forEach(laneId => {
    const types = wave.lanes[laneId] || [];
    td.lanes[laneId].invaders = types.map((t, i) => makeInvader(t, i, laneId, td.scaling));
  });
}

// ── Lane resolution ──────────────────────────────────────────────────────────

const livingDefenders = (lane) =>
  POSITION_ORDER.map(p => lane.slots[p]).filter(c => c && !c.dead);

/**
 * Who an invader may actually hit. The Choke guards everything behind it; the
 * Flank hides until the Choke falls; a Sapper ignores both rules.
 */
function reachableDefenders(lane, invader) {
  const living = livingDefenders(lane);
  if (invader?.ignoresGuard) {
    // Sappers tunnel past the guard and pick from what is behind it.
    const behind = living.filter(c => c.position !== 'choke');
    return behind.length ? behind : living;
  }
  const choke = lane.slots.choke;
  if (choke && !choke.dead) return [choke];
  return living.filter(c => !TD_POSITIONS[c.position].hiddenBehindChoke || !choke || choke.dead);
}

/** Advance one lane by a single round. */
function tickLane(td, lane, ctx, records) {
  if (lane.breached) return;

  const laneDef = TD_LANES[lane.id];
  const log = (m, c, v) => td.logs.push({ m: `${laneDef.icon} ${m}`, c, v });

  // March. Slowed invaders take two rounds per step.
  lane.invaders.forEach(inv => {
    if (inv.dead || inv.march <= 0) return;
    const slowed = inv.status.some(s => STATUS_EFFECTS[s.type]?.speedMult < 1);
    inv.marchPartial = (inv.marchPartial || 0) + (slowed ? 0.5 : 1);
    if (inv.marchPartial >= 1) {
      inv.marchPartial -= 1;
      inv.march -= 1;
      if (inv.march === 0) {
        log(`${inv.name} reaches the line!`, C.march,
            `${laneDef.name}: marched ${laneDef.march} steps${slowed ? ' (slowed by the marsh)' : ''}`);
      }
    }
  });

  const arrived = lane.invaders.filter(i => !i.dead && i.march <= 0);
  if (!arrived.length) { lane.engaged = false; return; }
  lane.engaged = true;

  const defenders = livingDefenders(lane);

  // Nothing left to hold the line.
  if (!defenders.length) {
    lane.breached = true;
    td.breaches.push(lane.id);
    log(`BREACHED — ${arrived[0].name} is through!`, C.breach,
        `${laneDef.name} had no living defenders when invaders arrived`);
    return;
  }

  // The Rear routs the moment invaders are in among the defenders and nothing
  // is guarding it.
  const choke = lane.slots.choke;
  const rear = lane.slots.rear;
  if (rear && !rear.dead && (!choke || choke.dead) && defenders.length === 1) {
    rear.dead = true;
    rear.hp = 0;
    log(`${rear.name} is overrun in the rear!`, C.breach,
        `${TD_POSITIONS.rear.name}: routs when reached with nothing in front`);
    lane.breached = true;
    td.breaches.push(lane.id);
    return;
  }

  // Single-file lanes only ever fight their front invader.
  const engaging = laneDef.singleFile ? [arrived[0]] : arrived;

  engaging.forEach(inv => {
    if (inv.dead || lane.breached) return;
    const world = { round: td.round, slimes: livingDefenders(lane), enemy: inv, zone: lane.id };
    if (!world.slimes.length) return;

    const { records: r } = resolveRound(world, {
      ...ctx,
      selectTargets: (living) => reachableDefenders(lane, inv),
    });
    r.forEach(rec => {
      if (rec.log) td.logs.push({ ...rec.log, m: `${laneDef.icon} ${rec.log.m}` });
    });
    records.push(...r);

    if (inv.hp <= 0) {
      inv.dead = true;
      log(`${inv.name} falls!`, C.hold, `${laneDef.name}: invader down`);
    }
  });

  lane.invaders = lane.invaders.filter(i => !i.dead);
}

// ── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Advance the defense by `dt` real milliseconds. Mutates `td`.
 * Returns the side effects the host must apply.
 */
export function tickTowerDefense(td, dt, ctx = {}, roundMs = 1600) {
  const sideEffects = [];
  if (!td || td.phase !== 'battle') return { td, sideEffects };

  td.roundTimer += dt;
  if (td.roundTimer < roundMs) return { td, sideEffects };
  td.roundTimer -= roundMs;
  td.round += 1;

  const records = [];
  LANE_ORDER.forEach(laneId => tickLane(td, td.lanes[laneId], ctx, records));

  // Defenders that died this round are gone for good.
  LANE_ORDER.forEach(laneId => {
    const lane = td.lanes[laneId];
    POSITION_ORDER.forEach(posId => {
      const c = lane.slots[posId];
      if (c && c.dead && !c.reported) {
        c.reported = true;
        sideEffects.push({ type: 'slimeDeath', id: c.id });
      }
    });
  });

  td.logs = td.logs.slice(-120);

  // Every lane breached: the hive falls.
  if (LANE_ORDER.every(id => td.lanes[id].breached)) {
    td.phase = 'defeat';
    td.logs.push({ m: 'Every lane has fallen. The hive is overrun. 💀', c: C.breach,
                   v: `defeat on wave ${td.wave + 1}, round ${td.round}` });
    return { td, sideEffects };
  }

  // Wave cleared once no invader is left standing anywhere unbreached.
  const remaining = LANE_ORDER
    .filter(id => !td.lanes[id].breached)
    .reduce((n, id) => n + td.lanes[id].invaders.filter(i => !i.dead).length, 0);

  if (remaining === 0) {
    const next = td.wave + 1;
    if (next < TD_WAVES.length) {
      td.wave = next;
      spawnWave(td, next);
      td.logs.push({
        m: `Wave ${next + 1} — ${TD_WAVES[next].name} — approaches!`,
        c: C.wave,
        v: `${td.breaches.length} lane(s) lost so far`,
      });
    } else {
      td.phase = 'victory';
      td.logs.push({
        m: td.breaches.length ? 'The assault is broken — but the hive was breached.' : 'Flawless defense! 🎉',
        c: C.hold,
        v: `${td.breaches.length} breach(es) over ${td.round} rounds`,
      });
    }
  }

  return { td, sideEffects };
}

// ── Rewards ──────────────────────────────────────────────────────────────────

/**
 * Clearing wave 3 pays a Prism regardless of how ugly it got. The Champion
 * Badge is reserved for a run with no lane lost — the mode's skill ceiling.
 */
export function towerDefenseRewards(td) {
  const victory = td.phase === 'victory';
  const flawless = victory && td.breaches.length === 0;
  const mult = td.scaling?.rewardMultiplier || 1;

  const rewards = { biomass: 0, materials: {}, prisms: 0 };
  const wavesCleared = victory ? TD_WAVES.length : td.wave;

  for (let i = 0; i < wavesCleared; i++) {
    const w = TD_WAVES[i];
    rewards.biomass += Math.floor(w.reward.biomass * mult);
    Object.entries(w.reward.mats).forEach(([m, c]) => {
      rewards.materials[m] = (rewards.materials[m] || 0) + Math.floor(c * mult);
    });
  }

  if (victory) {
    rewards.prisms = 1;
    if (flawless) rewards.materials['Champion Badge'] = 1;
  }

  const survivors = [];
  const lost = [];
  LANE_ORDER.forEach(laneId => {
    POSITION_ORDER.forEach(posId => {
      const c = td.lanes[laneId].slots[posId];
      if (!c) return;
      (c.dead ? lost : survivors).push({ id: c.id, name: c.name, lane: laneId, position: posId });
    });
  });

  return {
    victory,
    flawless,
    wavesCleared,
    rounds: td.round,
    breaches: [...td.breaches],
    rewards,
    survivors,
    lost,
  };
}
