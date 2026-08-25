// ─────────────────────────────────────────────────────────────────────────────
// Turn-based round resolution
//
// Pure and deterministic given an rng. Produces a structured record of
// everything that happened in the round; presentation (the arena canvas, the
// battle log) reads those records but never produces them.
//
// See docs/GAME_DESIGN.md §9.
// ─────────────────────────────────────────────────────────────────────────────

import { STATUS_EFFECTS } from '../data/traitData.js';
import { MONSTER_TYPES, MONSTER_ABILITIES } from '../data/monsterData.js';
import { calculateElementalDamage } from '../utils/helpers.js';
import { runHooks } from './hooks.js';
import { computeStats, computeMaxHp, buildEffectList } from './stats.js';
import { makeTrace } from './trace.js';

const C = {
  slime:   '#4ade80',
  crit:    '#f59e0b',
  enemy:   '#ef4444',
  dodge:   '#22d3ee',
  status:  '#a855f7',
  death:   '#ef4444',
  revive:  '#fbbf24',
  reward:  '#4ade80',
  travel:  '#a855f7',
};

// ── Combatants ───────────────────────────────────────────────────────────────

export function makeSlimeCombatant(slime, { combatBonuses = {}, bon = {}, mutationPower = 1 } = {}) {
  const stats = computeStats(slime, 0, combatBonuses, mutationPower);
  const maxHp = computeMaxHp(slime, stats, bon, combatBonuses, mutationPower);
  return {
    id: slime.id,
    name: slime.name,
    side: 'slime',
    ref: slime,
    hp: maxHp,
    maxHp,
    stats,
    tempStats: { firmness: 0, slipperiness: 0, viscosity: 0 },
    primaryElement: slime.primaryElement || null,
    effects: buildEffectList(slime),
    status: [],
    flags: {},
    biomassGained: 0,
    elementGains: {},
    dead: false,
  };
}

export function makeEnemyCombatant(type, { hpMultiplier = 1, isBoss = false } = {}) {
  const md = MONSTER_TYPES[type];
  if (!md) return null;
  const maxHp = Math.floor(md.hp * hpMultiplier);
  const tier = md.tier || 1;
  return {
    id: `enemy-${type}`,
    name: md.name,
    side: 'enemy',
    type,
    ref: md,
    isBoss: isBoss || !!md.rare,
    hp: maxHp,
    maxHp,
    stats: { firmness: md.dmg, slipperiness: tier, viscosity: tier },
    tempStats: { firmness: 0, slipperiness: 0, viscosity: 0 },
    primaryElement: md.element || null,
    effects: [],
    status: [],
    flags: {},
    dead: false,
  };
}

// ── Status helpers ───────────────────────────────────────────────────────────

const statusDef = (type) => STATUS_EFFECTS[type] || {};

const hasStatus = (c, type) => (c.status || []).some(s => s.type === type);

/** Combined multiplier from every status currently on a combatant. */
function statusDamageMult(c) {
  return (c.status || []).reduce((m, s) => m * (statusDef(s.type).dmgMult ?? 1), 1);
}

function statusSpeedMult(c) {
  return (c.status || []).reduce((m, s) => m * (statusDef(s.type).speedMult ?? 1), 1);
}

/** Stats after in-battle gains (consume) and status effects (slowed). */
export function effectiveStats(c) {
  const t = c.tempStats || { firmness: 0, slipperiness: 0, viscosity: 0 };
  return {
    firmness:     Math.floor(c.stats.firmness + t.firmness),
    slipperiness: Math.floor((c.stats.slipperiness + t.slipperiness) * statusSpeedMult(c)),
    viscosity:    Math.floor(c.stats.viscosity + t.viscosity),
  };
}

/**
 * Apply a status, honoring onStatusReceive hooks (nullify) on the target.
 * Refreshes duration rather than stacking.
 */
function applyStatus(target, type, ctx, records, sourceLabel = '') {
  const def = statusDef(type);
  if (!def.name) return false;

  if (target.statusImmune) return false;

  const ev = { self: target, type, dur: def.dur, blocked: false, label: '' };
  runHooks(target, 'onStatusReceive', ev, ctx.mutationPower);
  if (ev.blocked || ev.dur <= 0) return false;

  // `appliedRound` stops a status from decaying at the end of the round it
  // landed in — otherwise a 1-round stun expired before its victim ever
  // missed a turn.
  const existing = (target.status || []).find(s => s.type === type);
  if (existing) {
    existing.dur = Math.max(existing.dur, ev.dur);
    existing.appliedRound = ctx.round;
  } else {
    target.status.push({ type, dur: ev.dur, harmful: def.harmful !== false, appliedRound: ctx.round });
  }

  records.push({
    kind: 'status',
    actorName: sourceLabel,
    targetId: target.id,
    targetName: target.name,
    status: type,
    log: {
      m: `${target.name} is ${def.name}! ${def.icon}`,
      c: def.color,
      v: `${sourceLabel || 'source'} → ${def.name} for ${ev.dur} round(s)` +
         (ev.label ? ` (${ev.label} reduced from ${def.dur})` : ''),
    },
  });
  return true;
}

// ── Turn order ───────────────────────────────────────────────────────────────

/** Living combatants, fastest first. Ties break on id so runs are repeatable. */
export function turnOrder(world) {
  const all = [...world.slimes.filter(s => !s.dead), ...(world.enemy && !world.enemy.dead ? [world.enemy] : [])];
  return all.sort((a, b) => {
    const d = effectiveStats(b).slipperiness - effectiveStats(a).slipperiness;
    return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
  });
}

// ── Party auras ──────────────────────────────────────────────────────────────

function partyAura(world, ctx) {
  const aura = { critChance: 0 };
  world.slimes.filter(s => !s.dead).forEach(s => {
    runHooks(s, 'partyAura', { aura, source: s }, ctx.mutationPower);
  });
  return aura;
}

// ── Attack resolution ────────────────────────────────────────────────────────

function resolveAttack(attacker, defender, world, ctx, records, opts = {}) {
  const rng = ctx.rng;
  const aStats = effectiveStats(attacker);
  const isSlime = attacker.side === 'slime';
  const livingParty = world.slimes.filter(s => !s.dead).length;

  const baseDmg = opts.baseDamage ?? (isSlime ? aStats.firmness : attacker.stats.firmness);
  const trace = makeTrace(isSlime ? 'FIRM' : 'ATK', baseDmg);

  if (opts.abilityMultiplier) trace.mul(opts.abilityName || 'ability', opts.abilityMultiplier);

  // ── 1. Attacker-side setup ────────────────────────────────────────────────
  const beforeEv = {
    attacker, defender, trace, rng, world,
    critBonus: 0, autoCrit: false, partySize: livingParty,
  };
  runHooks(attacker, 'onBeforeAttack', beforeEv, ctx.mutationPower);

  // Statuses the attacker is carrying (weakened, enraged)
  const sMult = statusDamageMult(attacker);
  if (sMult !== 1) trace.mul('status', sMult);

  // Global multipliers
  const cb = ctx.combatBonuses || {};
  if (isSlime) {
    if (attacker.hp < attacker.maxHp * 0.3 && cb.lowHpDamage > 1)   trace.mul('Last Stand', cb.lowHpDamage);
    if (defender.maxHp > attacker.maxHp && cb.damageVsHighHp > 1)   trace.mul('Giant Slayer', cb.damageVsHighHp);
    if (defender.hp < defender.maxHp * 0.25 && cb.executeDamage > 1) trace.mul('Execute', cb.executeDamage);
    if (ctx.bon?.spd > 1) trace.mul('Training Arena', 1 + (ctx.bon.spd - 1) * 0.2);
  }

  // ── 2. Hit determination ──────────────────────────────────────────────────
  const hitEv = {
    attacker, defender, trace, rng, world,
    chance: { dodge: 0.05, block: 0, phase: 0, miss: 0 },
    autoCrit: false,
    noCrit: false,
  };
  // Evasion is purely defender-side — attacker-side crit sources live in
  // onBeforeAttack, so a dodgy attacker never makes its own swing easier to dodge.
  hitEv.chance.dodge += effectiveStats(defender).slipperiness * 0.015;
  runHooks(defender, 'onHitChance', hitEv, ctx.mutationPower);

  const evade = [
    ['dodges',  hitEv.chance.dodge, '💨'],
    ['blocks',  hitEv.chance.block, '🕸️'],
    ['phases through', hitEv.chance.phase, '👻'],
  ];
  for (const [verb, chance, icon] of evade) {
    if (chance <= 0) continue;
    const roll = rng();
    if (roll < chance) {
      trace.roll(verb, roll, chance, true);
      records.push({
        kind: 'attack', result: 'evaded',
        actorId: attacker.id, actorName: attacker.name, side: attacker.side,
        targetId: defender.id, targetName: defender.name,
        damage: 0,
        log: { m: `${defender.name} ${verb} ${attacker.name}'s attack! ${icon}`, c: C.dodge, v: trace.render() },
      });
      return 0;
    }
    trace.roll(verb, roll, chance, false);
  }
  if (hitEv.chance.miss > 0) {
    const roll = rng();
    if (roll < hitEv.chance.miss) {
      trace.roll('blinded', roll, hitEv.chance.miss, true);
      records.push({
        kind: 'attack', result: 'miss',
        actorId: attacker.id, actorName: attacker.name, side: attacker.side,
        targetId: defender.id, targetName: defender.name,
        damage: 0,
        log: { m: `${attacker.name} misses! ✨`, c: C.dodge, v: trace.render() },
      });
      return 0;
    }
  }

  // ── 3. Crit ───────────────────────────────────────────────────────────────
  const aura = opts.aura || { critChance: 0 };
  let crit = false;
  if (beforeEv.autoCrit) {
    crit = true;
  } else if (!hitEv.noCrit && !defender.critImmune) {
    const critCh = Math.min(0.95,
      0.05 + (cb.critChance || 0) + aStats.slipperiness * 0.01 +
      beforeEv.critBonus + (attacker.critBonus || 0) + (isSlime ? aura.critChance : 0));
    if (critCh >= 0.95 && (attacker.critBonus || 0) >= 1) {
      crit = true;
      trace.note('position: guaranteed crit');
    } else {
      const roll = rng();
      crit = roll < critCh;
      trace.roll('crit', roll, critCh, crit);
    }
  } else {
    trace.note(defender.critImmune ? 'target is crit-immune' : 'crit-immune');
  }
  if (crit) trace.mul('CRIT', 1.5 + (cb.critDamage || 0));

  // ── 4. Attacker-side final damage ─────────────────────────────────────────
  const dealtEv = {
    attacker, defender, trace, rng, world, crit,
    execute: false, healPct: 0, ignoreResist: false,
  };
  runHooks(attacker, 'onDamageDealt', dealtEv, ctx.mutationPower);

  // ── 5. Elemental ──────────────────────────────────────────────────────────
  if (!opts.trueDamage) {
    const pre  = trace.value;
    const post = calculateElementalDamage(pre, attacker.primaryElement, defender.primaryElement);
    if (post !== pre) {
      const mult = post / pre;
      if (mult < 1 && dealtEv.ignoreResist) {
        trace.note('🕳️ resistance ignored');
      } else {
        trace.mul(mult > 1 ? 'element ⚡ strong' : 'element weak', mult);
        if (mult > 1 && cb.elementalDamage > 1) trace.mul('Elemental Mastery', cb.elementalDamage);
      }
    }
  }

  // ── 6. Defender-side mitigation ───────────────────────────────────────────
  if (!opts.trueDamage) {
    const takenEv = { attacker, defender, trace, rng, world };
    runHooks(defender, 'onDamageTaken', takenEv, ctx.mutationPower);
    if (defender.side === 'slime') {
      if (cb.damageReduction > 0) trace.add('Carapace', -cb.damageReduction);
      if (defender.hp < defender.maxHp * 0.2 && cb.lowHpDefense > 0) {
        trace.mul('Desperation', 1 - cb.lowHpDefense);
      }
    }
  }

  // ── 7. Apply ──────────────────────────────────────────────────────────────
  let dmg = Math.max(1, Math.floor(trace.floor().value));
  if (dealtEv.execute) {
    dmg = Math.max(dmg, defender.hp);
    trace.set('💀 EXECUTE', dmg);
  }
  defender.hp -= dmg;

  // Status procs roll BEFORE the hit is logged so their rolls — landed or not —
  // appear in that hit's trace. The statuses themselves are applied after, so
  // they read below the hit in the log.
  // The Toxicologist skill scales proc CHANCES, so it is folded into the
  // magnitude multiplier rather than re-rolling a failed proc.
  const statusEv = { attacker, defender, apply: [], rng, world, trace };
  runHooks(attacker, 'onStatusApply', statusEv,
    ctx.mutationPower * (cb.statusChance || 1) * (attacker.procMult || 1));

  records.push({
    kind: 'attack',
    result: dealtEv.execute ? 'execute' : crit ? 'crit' : 'hit',
    actorId: attacker.id, actorName: attacker.name, side: attacker.side,
    targetId: defender.id, targetName: defender.name,
    damage: dmg,
    log: {
      m: dealtEv.execute ? `${attacker.name} ANNIHILATES ${defender.name}! 🐌`
        : crit            ? `${attacker.name} 💥CRITS ${defender.name} for ${dmg}!`
        :                   `${attacker.name} hits ${defender.name} for ${dmg}`,
      c: dealtEv.execute ? C.crit : crit ? C.crit : (isSlime ? C.slime : C.enemy),
      v: trace.render(),
    },
  });

  statusEv.apply.forEach(({ type, label }) => applyStatus(defender, type, ctx, records, label));

  // ── 8. Post-hit: lifesteal ────────────────────────────────────────────────
  if (dealtEv.healPct > 0 && attacker.hp < attacker.maxHp) {
    const heal = Math.max(1, Math.floor(dmg * dealtEv.healPct));
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
    records.push({
      kind: 'heal', actorId: attacker.id, actorName: attacker.name, heal,
      log: { m: `${attacker.name} drains ${heal} HP 🦇`, c: C.reward,
             v: `lifesteal ${(dealtEv.healPct * 100).toFixed(1)}% of ${dmg}` },
    });
  }

  return dmg;
}

// ── Monster abilities ────────────────────────────────────────────────────────

function resolveEnemyTurn(enemy, world, ctx, records, aura) {
  const living = world.slimes.filter(s => !s.dead);
  if (!living.length) return;

  const md = enemy.ref;
  const ability = md.ability ? MONSTER_ABILITIES[md.ability] : null;
  // Formations (tower defense lanes) override who the enemy can reach.
  const reachable = ctx.selectTargets ? ctx.selectTargets(living, world) : living;
  const pool = reachable.length ? reachable : living;
  const pick = () => pool[Math.floor(ctx.rng() * pool.length)];

  if (ability && ctx.rng() < ability.chance) {
    switch (ability.effect) {
      case 'selfHeal': {
        const heal = Math.floor(enemy.maxHp * ability.healPercent);
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        records.push({
          kind: 'ability', actorId: enemy.id, actorName: enemy.name, heal,
          log: { m: `${enemy.name} uses ${ability.name}! ${ability.icon} +${heal} HP`, c: C.reward,
                 v: `${(ability.healPercent * 100).toFixed(0)}% of ${enemy.maxHp} max HP` },
        });
        return;
      }
      case 'aoe': {
        records.push({
          kind: 'ability', actorId: enemy.id, actorName: enemy.name,
          log: { m: `${enemy.name} uses ${ability.name}! ${ability.icon}`, c: C.enemy,
                 v: `hits all ${pool.length} reachable slimes at ×${ability.multiplier}` },
        });
        pool.forEach(t => resolveAttack(enemy, t, world, ctx, records, {
          abilityMultiplier: ability.multiplier, abilityName: ability.name, aura,
        }));
        return;
      }
      case 'buff': {
        applyStatus(enemy, 'enraged', ctx, records, ability.name);
        records.push({
          kind: 'ability', actorId: enemy.id, actorName: enemy.name,
          log: { m: `${enemy.name} uses ${ability.name}! ${ability.icon}`, c: C.enemy,
                 v: `enraged: ×${STATUS_EFFECTS.enraged.dmgMult} damage for ${STATUS_EFFECTS.enraged.dur} rounds` },
        });
        return;
      }
      case 'slow': {
        const t = pick();
        applyStatus(t, 'slowed', ctx, records, ability.name);
        return;
      }
      default: {
        const t = pick();
        const mult = ability.multiplier || ability.damageMultiplier || 1;
        const dmg = resolveAttack(enemy, t, world, ctx, records, {
          abilityMultiplier: mult,
          abilityName: ability.name,
          trueDamage: ability.effect === 'trueDamage',
          aura,
        });
        if (ability.effect === 'lifesteal' && dmg > 0) {
          const heal = Math.floor(dmg * (ability.healPercent || 0.5));
          enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
        }
        if (dmg > 0) {
          if (ability.effect === 'poison') applyStatus(t, 'poison', ctx, records, ability.name);
          if (ability.effect === 'burn')   applyStatus(t, 'burn',   ctx, records, ability.name);
          if (ability.effect === 'stun')   applyStatus(t, 'stun',   ctx, records, ability.name);
          if (ability.effect === 'freeze') { applyStatus(t, 'slowed', ctx, records, ability.name);
                                             applyStatus(t, 'stun',   ctx, records, ability.name); }
        }
        return;
      }
    }
  }

  // Plain attack, plus the monster's on-hit trait procs
  const target = pick();
  const dmg = resolveAttack(enemy, target, world, ctx, records, { aura });
  if (dmg > 0) {
    const t = md.trait;
    if (t === 'venomSac' && ctx.rng() < 0.3) applyStatus(target, 'poison', ctx, records, 'Venom Sac');
    if ((t === 'dragonHeart' || t === 'phoenixFeather') && ctx.rng() < 0.25)
      applyStatus(target, 'burn', ctx, records, 'Dragon Heart');
    if (t === 'wolfFang' && ctx.rng() < 0.2) applyStatus(target, 'bleed', ctx, records, 'Wolf Fang');
  }
}

// ── Deaths ───────────────────────────────────────────────────────────────────

function checkDeaths(world, ctx, records, sideEffects) {
  world.slimes.forEach(s => {
    if (s.dead || s.hp > 0) return;

    const ev = { self: s, world, revive: null, reviveLabel: '', blast: 0, blastLabel: '', log: [] };
    runHooks(s, 'onDeath', ev, ctx.mutationPower);

    // Tactical Retreat is a skill, not a carried effect
    if (!ev.revive && ctx.passives?.includes('tacticalRetreat') && !s.flags.usedTacticalRetreat) {
      s.flags.usedTacticalRetreat = true;
      ev.revive = 1;
      ev.reviveLabel = '💧 Tactical Retreat';
    }

    if (ev.blast > 0 && world.enemy && !world.enemy.dead) {
      const dmg = Math.floor(ev.blast);
      world.enemy.hp -= dmg;
      records.push({
        kind: 'blast', actorId: s.id, actorName: s.name, damage: dmg,
        log: { m: `${s.name} ruptures for ${dmg}! ${ev.blastLabel}`, c: C.crit,
               v: `${ev.blastLabel}: ${dmg} to ${world.enemy.name}` },
      });
    }

    if (ev.revive) {
      s.hp = Math.min(s.maxHp, Math.floor(ev.revive));
      records.push({
        kind: 'revive', actorId: s.id, actorName: s.name,
        log: { m: `${s.name} refuses to die! ${ev.reviveLabel}`, c: C.revive,
               v: `revived at ${s.hp}/${s.maxHp} HP` },
      });
      return;
    }

    s.dead = true;
    s.hp = 0;
    records.push({
      kind: 'death', actorId: s.id, actorName: s.name,
      log: { m: `${s.name} fell! 💔`, c: C.death, v: `${s.name} removed from the party` },
    });
    sideEffects.push({ type: 'slimeDeath', id: s.id });

    const reclaimer = ctx.builds?.biomassReclaimer || 0;
    if (reclaimer > 0 && s.ref?.biomass > 0) {
      const recovered = Math.floor(s.ref.biomass * reclaimer * 0.25);
      if (recovered > 0) {
        sideEffects.push({ type: 'bioReclaim', amount: recovered });
        records.push({
          kind: 'reward',
          log: { m: `♻️ Reclaimed ${recovered} biomass`, c: C.reward,
                 v: `Biomass Reclaimer tier ${reclaimer} → ${(reclaimer * 25)}% of ${Math.floor(s.ref.biomass)}` },
        });
      }
    }
  });
}

// ── Kill rewards ─────────────────────────────────────────────────────────────

export function resolveKill(world, ctx, records, sideEffects, zoneDef) {
  const enemy = world.enemy;
  const md = enemy.ref;
  const living = world.slimes.filter(s => !s.dead);
  const cb = ctx.combatBonuses || {};

  const ev = {
    enemy, world,
    biomassMult: 1, biomassFlat: 0,
    matChance: 0.5 * (cb.materialDrop || 1) * (1 + (ctx.ranchBonus || 0)),
    elementMult: 1, blockElement: false,
    heal: 0, healLabel: '',
    log: [],
  };

  const trace = makeTrace('base biomass', md.biomass);
  if (ctx.bon?.bio > 1)          trace.mul('Biomass Pools', ctx.bon.bio);
  if (cb.expeditionBiomass > 1)  trace.mul('Expedition skill', cb.expeditionBiomass);
  if (cb.biomassGain > 1)        trace.mul('Biomass skill', cb.biomassGain);
  if (ctx.ranchBonus > 0)        trace.mul('Scout Post', 1 + ctx.ranchBonus);
  if (ctx.hiveAbilities?.bountifulHarvest) trace.mul('🌾 Bountiful Harvest', 1.25);

  // Per-slime onKill hooks. Contributions are additive across the party —
  // two Greedy slimes are worth two bonuses, as the trait text implies.
  living.forEach(s => {
    const sEv = {
      self: s, enemy, world, log: [],
      biomassMult: 1, biomassFlat: 0, matChance: 0,
      elementMult: 1, blockElement: false, heal: 0, healLabel: '',
    };
    runHooks(s, 'onKill', sEv, ctx.mutationPower);

    ev.biomassMult += sEv.biomassMult - 1;
    ev.biomassFlat += sEv.biomassFlat;
    ev.matChance   += sEv.matChance;
    ev.log.push(...sEv.log);

    if (sEv.heal > 0) {
      const heal = Math.min(Math.floor(sEv.heal), s.maxHp - s.hp);
      if (heal > 0) {
        s.hp += heal;
        records.push({
          kind: 'heal', actorId: s.id, actorName: s.name, heal,
          log: { m: `${s.name} recovers ${heal} HP`, c: C.reward, v: sEv.healLabel || 'on kill' },
        });
      }
    }

    // Element gain uses that slime's own multiplier, so Wise/Adaptable stack
    // per slime rather than across the party.
    if (zoneDef?.element && zoneDef.elementGainRate > 0 && !s.ref?.primaryElement && !sEv.blockElement) {
      let gain = zoneDef.elementGainRate * sEv.elementMult;
      if (ctx.hiveAbilities?.evolutionPulse) gain *= 1.5;
      s.elementGains[zoneDef.element] = (s.elementGains[zoneDef.element] || 0) + gain;
    }
  });

  if (ev.biomassMult !== 1) trace.mul('party traits', ev.biomassMult);
  if (ev.biomassFlat > 0)   trace.add('🌱 Digest', ev.biomassFlat);

  const total = Math.max(0, Math.floor(trace.value));
  const per   = living.length ? total / living.length : 0;
  living.forEach(s => { s.biomassGained += per; });

  records.push(...ev.log.map(l => ({ kind: 'effect', log: l })));
  records.push({
    kind: 'kill',
    targetId: enemy.id, targetName: enemy.name,
    log: {
      m: `${enemy.name} defeated! +${Math.floor(per)}🧬 each`,
      c: C.reward,
      v: `${trace.render()}  →  split ${living.length} ways`,
    },
  });

  // Drops
  if (ctx.rng() < 0.001) {
    sideEffects.push({ type: 'prism' });
    records.push({ kind: 'reward', log: { m: '💎 Found a Prism!', c: C.crit, v: '0.1% drop' } });
  }
  const matRoll = ctx.rng();
  if (matRoll < ev.matChance) {
    const mat = md.mats[Math.floor(ctx.rng() * md.mats.length)];
    sideEffects.push({ type: 'material', mat });
    records.push({
      kind: 'reward',
      log: { m: `Found ${mat}! 📦`, c: C.crit,
             v: `roll ${(matRoll * 100).toFixed(1)}% vs ${(ev.matChance * 100).toFixed(1)}%` },
    });
  }
  return total;
}

// ── The round ────────────────────────────────────────────────────────────────

/**
 * Advance the battle by exactly one round.
 * Returns { records, sideEffects, ended } — `world` is mutated in place.
 */
export function resolveRound(world, ctx = {}) {
  const c = {
    rng: Math.random,
    mutationPower: 1,
    combatBonuses: {},
    bon: {},
    builds: {},
    passives: [],
    hiveAbilities: {},
    ranchBonus: 0,
    ...ctx,
  };
  const records = [];
  const sideEffects = [];

  world.round = (world.round || 0) + 1;
  c.round = world.round;
  const aura = partyAura(world, c);

  // ── Phase 1: round start — DOTs, regen, cleanse ───────────────────────────
  const all = [...world.slimes, ...(world.enemy ? [world.enemy] : [])];
  all.forEach(e => {
    if (e.dead) return;

    // Damage over time
    e.status.forEach(s => {
      const def = statusDef(s.type);
      if (!def.dmg) return;
      e.hp -= def.dmg;
      records.push({
        kind: 'status', targetId: e.id, targetName: e.name, damage: def.dmg, status: s.type,
        log: { m: `${e.name} takes ${def.dmg} ${def.name} damage ${def.icon}`, c: def.color,
               v: `${def.name}: ${def.dmg}/round, ${s.dur} round(s) left` },
      });
    });

    const ev = { self: e, world, heal: 0, healLabel: '', cleanse: [], log: [], rng: c.rng };
    runHooks(e, 'onRoundStart', ev, c.mutationPower);

    if (c.passives?.includes('regeneration') && e.side === 'slime') ev.heal += 1;
    if (c.hiveAbilities?.sharedVigor && e.side === 'slime')        ev.heal += 2;

    if (ev.cleanse.length) {
      e.status = e.status.filter(s => !ev.cleanse.includes(s.type));
    }
    if (ev.heal > 0 && e.hp > 0 && e.hp < e.maxHp) {
      const heal = Math.min(Math.floor(ev.heal), e.maxHp - e.hp);
      if (heal > 0) {
        e.hp += heal;
        records.push({
          kind: 'heal', actorId: e.id, actorName: e.name, heal,
          log: { m: `${e.name} regenerates ${heal} HP 💚`, c: C.reward, v: ev.healLabel || 'round start' },
        });
      }
    }
    records.push(...ev.log.map(l => ({ kind: 'effect', log: l })));
  });

  checkDeaths(world, c, records, sideEffects);
  if (world.enemy && world.enemy.hp <= 0) world.enemy.dead = true;

  // ── Phase 2: turns ────────────────────────────────────────────────────────
  for (const actor of turnOrder(world)) {
    if (actor.dead || actor.hp <= 0) continue;
    if (!world.enemy || world.enemy.dead) break;
    if (world.slimes.every(s => s.dead)) break;

    // Incapacitation
    const stunned = actor.status.find(s => statusDef(s.type).skipsTurn);
    if (stunned) {
      records.push({
        kind: 'stunned', actorId: actor.id, actorName: actor.name,
        log: { m: `${actor.name} is ${statusDef(stunned.type).name} and loses their turn! 💫`, c: '#fbbf24',
               v: `${statusDef(stunned.type).name}, ${stunned.dur} round(s) left` },
      });
      continue;
    }

    if (actor.side === 'slime') {
      resolveAttack(actor, world.enemy, world, c, records, { aura });
      if (world.enemy.hp <= 0) world.enemy.dead = true;
    } else {
      resolveEnemyTurn(actor, world, c, records, aura);
      checkDeaths(world, c, records, sideEffects);
    }
  }

  if (world.enemy && world.enemy.hp <= 0) world.enemy.dead = true;

  // ── Phase 3: round end — status decay ─────────────────────────────────────
  all.forEach(e => {
    e.status = e.status
      .map(s => (s.appliedRound === world.round ? s : { ...s, dur: s.dur - 1 }))
      .filter(s => s.dur > 0);
    runHooks(e, 'onRoundEnd', { self: e, world }, c.mutationPower);
  });

  checkDeaths(world, c, records, sideEffects);

  const wiped = world.slimes.every(s => s.dead);
  const enemyDead = !!world.enemy && world.enemy.dead;

  return { records, sideEffects, wiped, enemyDead };
}
