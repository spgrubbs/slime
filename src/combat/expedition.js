// ─────────────────────────────────────────────────────────────────────────────
// Expedition driver
//
// Owns pacing, encounters and rewards. Combat itself is resolved one whole
// round at a time by resolveRound(); this file decides WHEN a round happens and
// turns each round's records into presentation beats for the arena canvas.
//
// The arena is a view. It animates what this produced — it never decides
// anything.
// ─────────────────────────────────────────────────────────────────────────────

import { MONSTER_TYPES } from '../data/monsterData.js';
import {
  ZONES, INTERMISSION_EVENTS, EXPLORATION_EVENTS, INTERMISSION_DURATION,
} from '../data/zoneData.js';
import { ROUND_MS, BEAT_MS } from '../data/gameConstants.js';
import { runHooks } from './hooks.js';
import {
  makeSlimeCombatant, makeEnemyCombatant, resolveRound, resolveKill,
} from './resolveRound.js';
import { buildEffectList } from './stats.js';

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

// ── Encounters ───────────────────────────────────────────────────────────────

export function selectMonsterType(zone, rareSpawnMult = 1, rng = Math.random) {
  const zd = ZONES[zone];
  if (!zd?.monsters?.length) return null;
  const common = zd.monsters.filter(m => !MONSTER_TYPES[m]?.rare);
  const rare   = zd.monsters.filter(m =>  MONSTER_TYPES[m]?.rare);
  const rareChance = Math.min(0.25, 0.05 * rareSpawnMult);
  if (rare.length && rng() < rareChance) return pick(rare, rng);
  return common.length ? pick(common, rng) : pick(zd.monsters, rng);
}

export function spawnEnemy(zone, rareSpawnMult = 1, rng = Math.random) {
  const type = selectMonsterType(zone, rareSpawnMult, rng);
  return type ? makeEnemyCombatant(type) : null;
}

// ── Expedition state ─────────────────────────────────────────────────────────

export function makeExpedition(zone, slimes, targetKills, ctx = {}) {
  const rng = ctx.rng || Math.random;
  const enemy = spawnEnemy(zone, ctx.combatBonuses?.rareSpawn, rng);
  const zd = ZONES[zone];

  const logs = [
    { m: `Entering ${zd.name}...`, c: '#22d3ee',
      v: `target ${targetKills === Infinity ? '∞' : targetKills} kills · ${slimes.length} slimes deployed` },
  ];
  if (enemy) logs.push({ m: `A ${enemy.name} appears!`, c: '#22d3ee',
                         v: `${enemy.maxHp} HP · ${enemy.stats.firmness} dmg · ${enemy.ref.element || 'neutral'}` });

  return {
    version: 4,
    zone,
    phase: enemy ? 'battling' : 'intermission',
    round: 0,
    roundTimer: 0,
    slimes: slimes.map(sl => makeSlimeCombatant(sl, ctx)),
    enemy,
    kills: 0,
    targetKills,
    materials: {},
    monsterKillCounts: {},
    logs,
    intermission: enemy ? null : { timer: 0, duration: INTERMISSION_DURATION, event: null },
    anim: null,
  };
}

// ── Presentation beats ───────────────────────────────────────────────────────
//
// A round's records become a timeline the canvas replays. Each beat is a
// moment the view should show: a lunge, a number popping off a body, a death.

const BEAT_KINDS = {
  attack: 'strike',
  blast:  'strike',
  status: 'tick',
  heal:   'tick',
  death:  'fall',
  revive: 'rise',
  kill:   'fall',
  stunned:'stagger',
};

function buildAnim(records, roundMs) {
  const visual = records.filter(r => BEAT_KINDS[r.kind]);
  if (!visual.length) return null;

  const spacing = Math.min(BEAT_MS, roundMs / Math.max(visual.length, 1));
  return {
    startedAt: Date.now(),
    duration: roundMs,
    beats: visual.map((r, i) => ({
      at: Math.round(i * spacing),
      kind: BEAT_KINDS[r.kind],
      actorId:  r.actorId ?? null,
      targetId: r.targetId ?? null,
      side: r.side || (r.actorId ? 'slime' : 'enemy'),
      text: r.damage ? `-${r.damage}`
          : r.heal   ? `+${r.heal}`
          : r.result === 'evaded' ? 'dodge'
          : r.kind === 'stunned'  ? '💫'
          : null,
      color: r.log?.c || '#e0e0e0',
      result: r.result || r.kind,
    })),
  };
}

// ── Intermission events ──────────────────────────────────────────────────────

function rollIntermissionEvent(exp, zone, ctx) {
  const rng = ctx.rng || Math.random;
  const zoneFlavor = INTERMISSION_EVENTS[zone] || INTERMISSION_EVENTS.forest;

  // Curious slimes make a real (boon/malus) event more likely than flavor.
  const hazEv = { eventChance: 0.25, avoided: false, rng, label: '' };
  exp.slimes.filter(s => !s.dead).forEach(s => runHooks(s, 'onHazard', hazEv, ctx.mutationPower));

  if (rng() >= Math.min(0.75, hazEv.eventChance)) {
    return { ...pick(zoneFlavor, rng), effect: null };
  }
  return pick(INTERMISSION_EVENTS.general, rng);
}

function applyIntermissionEvent(exp, event, ctx, log) {
  if (!event?.effect) return;
  const rng = ctx.rng || Math.random;
  const living = exp.slimes.filter(s => !s.dead);

  if (event.type === 'malus') {
    living.forEach(s => {
      // Farstep gives each slime its own chance to sidestep the hazard.
      const ev = { self: s, hazard: event, avoided: false, eventChance: 0, rng, label: '' };
      runHooks(s, 'onHazard', ev, ctx.mutationPower);
      if (ev.avoided) {
        log({ m: `${s.name} sidesteps it! ${ev.label}`, c: '#22d3ee',
              v: `${ev.label} avoided "${event.msg}"` });
        return;
      }
      if (event.effect === 'damage') {
        s.hp = Math.max(0, s.hp - event.value);
        log({ m: `${s.name} takes ${event.value} damage`, c: '#ef4444',
              v: `hazard "${event.msg}" → ${event.value} dmg` });
      } else if (event.effect === 'poison') {
        s.status.push({ type: 'poison', dur: 3, harmful: true });
        log({ m: `${s.name} is poisoned! 🧪`, c: '#22c55e', v: `hazard "${event.msg}" → poison 3 rounds` });
      }
    });
  }

  if (event.type === 'boon') {
    if (event.effect === 'heal') {
      living.forEach(s => {
        const heal = Math.min(event.value, s.maxHp - s.hp);
        if (heal > 0) {
          s.hp += heal;
          log({ m: `${s.name} recovers ${heal} HP`, c: '#4ade80', v: `boon "${event.msg}"` });
        }
      });
    } else if (event.effect === 'biomass') {
      living.forEach(s => { s.biomassGained += event.value; });
      log({ m: `+${event.value}🧬 each`, c: '#4ade80', v: `boon "${event.msg}"` });
    }
  }
}

/** The rarer exploration table — flavor, small caches, and occasional traits. */
function rollExplorationEvent(exp, ctx, log, sideEffects) {
  const rng = ctx.rng || Math.random;
  if (rng() > 0.15) return;

  const total = EXPLORATION_EVENTS.reduce((n, e) => n + (e.weight || 1), 0);
  let roll = rng() * total;
  const event = EXPLORATION_EVENTS.find(e => (roll -= (e.weight || 1)) <= 0) || EXPLORATION_EVENTS[0];
  const living = exp.slimes.filter(s => !s.dead);
  if (!living.length) return;

  if (event.type === 'flavor') {
    log({ m: event.msg, c: '#94a3b8', v: 'exploration flavor' });
  } else if (event.type === 'biomass') {
    living.forEach(s => { s.biomassGained += event.amount; });
    log({ m: `${event.msg} +${event.amount}🧬 each`, c: '#4ade80', v: 'exploration cache' });
  } else if (event.type === 'material') {
    // Caches drop something native to the zone.
    const zoneMonsters = ZONES[exp.zone]?.monsters || [];
    const donor = zoneMonsters.length ? MONSTER_TYPES[pick(zoneMonsters, rng)] : null;
    const mat = donor?.mats?.length ? pick(donor.mats, rng) : null;
    if (mat) {
      exp.materials[mat] = (exp.materials[mat] || 0) + 1;
      log({ m: `${event.msg} (${mat})`, c: '#f59e0b', v: 'exploration cache' });
    }
  } else if (event.type === 'trait') {
    const s = pick(living, rng);
    const available = event.traitPool.filter(t => !(s.ref?.traits || []).includes(t));
    if (available.length) {
      const trait = pick(available, rng);
      sideEffects.push({ type: 'grantTrait', id: s.id, trait });
      log({ m: `${s.name} ${event.msg}`, c: '#a855f7', v: `gained trait: ${trait}` });
    }
  }
}

// ── Tick ─────────────────────────────────────────────────────────────────────

/**
 * Advance an expedition by `dt` real milliseconds (already speed-scaled).
 * Mutates `exp`; returns the side effects the host must apply to game state.
 */
export function tickExpedition(exp, dt, ctx = {}, zone) {
  const sideEffects = [];
  if (!exp || exp.phase === 'defeat') return { exp, sideEffects };

  const rng = ctx.rng || Math.random;
  const zd = ZONES[zone];
  const roundMs = ctx.roundMs || ROUND_MS;
  const log = (entry) => { exp.logs = [...exp.logs, entry].slice(-80); };

  // ── Intermission ──────────────────────────────────────────────────────────
  if (exp.phase === 'intermission') {
    const im = exp.intermission;
    if (!im.event) {
      im.event = rollIntermissionEvent(exp, zone, ctx);
      log({ m: im.event.msg, c: im.event.type === 'boon' ? '#4ade80'
                             : im.event.type === 'malus' ? '#ef4444' : '#a855f7',
            v: `travel event (${im.event.type})` });
      applyIntermissionEvent(exp, im.event, ctx, log);
      rollExplorationEvent(exp, ctx, log, sideEffects);

      // Hazards can kill.
      exp.slimes.forEach(s => {
        if (!s.dead && s.hp <= 0) {
          s.dead = true;
          log({ m: `${s.name} succumbs on the road 💔`, c: '#ef4444', v: 'died during travel' });
          sideEffects.push({ type: 'slimeDown', id: s.id });
        }
      });
      if (exp.slimes.every(s => s.dead)) {
        exp.phase = 'defeat';
        sideEffects.push({ type: 'expWipe' });
        return { exp, sideEffects };
      }
    }

    im.timer += dt;
    if (im.timer >= im.duration) {
      const enemy = spawnEnemy(zone, ctx.combatBonuses?.rareSpawn, rng);
      if (enemy) {
        exp.enemy = enemy;
        exp.phase = 'battling';
        exp.intermission = null;
        exp.roundTimer = 0;
        log({ m: `A ${enemy.name} appears!`, c: '#22d3ee',
              v: `${enemy.maxHp} HP · ${enemy.stats.firmness} dmg · ${enemy.ref.element || 'neutral'}` });
      }
    }
    return { exp, sideEffects };
  }

  if (exp.phase !== 'battling' || !exp.enemy) return { exp, sideEffects };

  // ── Battle: advance the round clock ───────────────────────────────────────
  exp.roundTimer += dt;
  if (exp.roundTimer < roundMs) return { exp, sideEffects };
  exp.roundTimer -= roundMs;

  const world = { round: exp.round, slimes: exp.slimes, enemy: exp.enemy, zone };
  const { records, sideEffects: roundEffects, wiped, enemyDead } = resolveRound(world, ctx);

  exp.round = world.round;
  sideEffects.push(...roundEffects);
  records.forEach(r => { if (r.log) log(r.log); });
  exp.anim = buildAnim(records, roundMs);

  // ── Enemy defeated ────────────────────────────────────────────────────────
  if (enemyDead && !wiped) {
    const killRecords = [];
    resolveKill(world, { rng, ...ctx }, killRecords, sideEffects, zd);
    killRecords.forEach(r => { if (r.log) log(r.log); });

    exp.kills += 1;
    exp.monsterKillCounts[exp.enemy.type] = (exp.monsterKillCounts[exp.enemy.type] || 0) + 1;

    // Materials ride home with the party rather than banking immediately —
    // losing them on a wipe is the point of the risk.
    for (let i = sideEffects.length - 1; i >= 0; i--) {
      if (sideEffects[i].type === 'material') {
        const { mat } = sideEffects[i];
        exp.materials[mat] = (exp.materials[mat] || 0) + 1;
        sideEffects.splice(i, 1);
      }
    }

    exp.enemy = null;

    if (exp.kills >= exp.targetKills) {
      log({ m: 'Target reached! Recalling party...', c: '#4ade80',
            v: `${exp.kills}/${exp.targetKills} kills` });
      sideEffects.push({ type: 'expComplete' });
    } else {
      exp.phase = 'intermission';
      exp.intermission = { timer: 0, duration: INTERMISSION_DURATION, event: null };
    }
    return { exp, sideEffects };
  }

  // ── Party wipe ────────────────────────────────────────────────────────────
  if (wiped) {
    log({ m: 'Party wiped! 💀', c: '#ef4444', v: `after ${exp.round} rounds, ${exp.kills} kills` });
    exp.phase = 'defeat';
    sideEffects.push({ type: 'expWipe' });
  }

  return { exp, sideEffects };
}

// ── Persistence ──────────────────────────────────────────────────────────────
//
// Combatants hold live references: `ref` points at the slime or monster
// definition, and `effects` holds entries out of MUTATION_LIBRARY (which
// contain functions). Neither survives JSON, and a stale copy would silently
// diverge from the real slime — so both are stripped on save and rebuilt on
// load.

const stripCombatant = ({ ref, effects, ...rest }) => rest;

export function dehydrateExpedition(exp) {
  if (!exp) return exp;
  return {
    ...exp,
    anim: null, // presentation only
    slimes: (exp.slimes || []).map(stripCombatant),
    enemy: exp.enemy ? stripCombatant(exp.enemy) : null,
  };
}

export function hydrateExpedition(exp, slimes = []) {
  if (!exp) return exp;
  const byId = new Map(slimes.map(s => [s.id, s]));

  return {
    ...exp,
    anim: null,
    slimes: (exp.slimes || []).map(c => {
      const ref = byId.get(c.id);
      return {
        ...c,
        ref: ref || null,
        effects: ref ? buildEffectList(ref) : [],
        // A combatant whose slime is gone was reabsorbed or deleted elsewhere.
        dead: c.dead || !ref,
        tempStats: c.tempStats || { firmness: 0, slipperiness: 0, viscosity: 0 },
        status: c.status || [],
        flags: c.flags || {},
        elementGains: c.elementGains || {},
      };
    }),
    enemy: exp.enemy
      ? { ...exp.enemy, ref: MONSTER_TYPES[exp.enemy.type] || null, effects: [], status: exp.enemy.status || [], flags: exp.enemy.flags || {} }
      : null,
  };
}
