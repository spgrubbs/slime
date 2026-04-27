import { SLIME_TIERS } from '../data/slimeData.js';
import { MUTATION_LIBRARY, STATUS_EFFECTS } from '../data/traitData.js';
import { MONSTER_TYPES, MONSTER_ABILITIES } from '../data/monsterData.js';
import { ZONES, INTERMISSION_DURATION } from '../data/zoneData.js';
import { calculateElementalDamage } from './helpers.js';
import {
  ARENA_W, ARENA_H,
  ARENA_ATTACK_RANGE,
  ARENA_BASE_MOVE, ARENA_SLIP_MOVE,
  ARENA_BASE_ATTACK_MS, ARENA_SLIP_ATTACK, ARENA_MIN_ATTACK_MS,
} from '../data/gameConstants.js';

// ── Speed helpers ────────────────────────────────────────────────────────────

const slimeMoveSpeed  = (slip) => ARENA_BASE_MOVE + slip * ARENA_SLIP_MOVE;
const slimeAttackMs   = (slip) => Math.max(ARENA_MIN_ATTACK_MS, ARENA_BASE_ATTACK_MS - slip * ARENA_SLIP_ATTACK);
const enemyMoveSpeed  = (tier) => 14 + tier * 1.5;
const enemyAttackMs   = (tier) => Math.max(800, 2500 - tier * 150);

// ── Status helpers ───────────────────────────────────────────────────────────

// One old "turn" equivalent = 1500 ms
const TURN_MS = 1500;

const applyStatus = (entity, type, dur) => {
  if ((entity.status || []).some(s => s.type === type)) return;
  entity.status = entity.status || [];
  entity.status.push({ type, durMs: STATUS_EFFECTS[type].dur * TURN_MS });
};

// ── Geometry ─────────────────────────────────────────────────────────────────

const dist = (a, b) => Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

const moveToward = (mover, target, speed, dtSec) => {
  const d = dist(mover, target);
  if (d < 0.01) return;
  const step = speed * dtSec;
  mover.x += ((target.x - mover.x) / d) * Math.min(step, d);
  mover.y += ((target.y - mover.y) / d) * Math.min(step, d);
};

// ── Stat calculation (mirrors getSlimeStats in HiveQueenV4) ──────────────────

export const calcSlimeStats = (slime, pendingBiomass, combatBonuses) => {
  if (!slime) return { firmness: 0, slipperiness: 0, viscosity: 0 };

  let baseF, baseS, baseV;

  if (slime.stats && !slime.baseStats) {
    baseF = slime.stats.firmness;
    baseS = slime.stats.slipperiness;
    baseV = slime.stats.viscosity;
  } else if (!slime.baseStats) {
    const tier = SLIME_TIERS[slime.tier];
    const b = 4;
    baseF = Math.floor(b * (tier?.statMultiplier || 1));
    baseS = Math.floor(b * (tier?.statMultiplier || 1));
    baseV = Math.floor(b * (tier?.statMultiplier || 1));
  } else {
    const tier = SLIME_TIERS[slime.tier];
    const biomass = (slime.biomass || 0) + (pendingBiomass || 0);
    const pct = biomass / tier.biomassPerPercent;
    const capped = Math.min(pct, tier.maxBiomassBonus || 100);
    const mult = 1 + capped / 100;
    baseF = Math.floor(slime.baseStats.firmness * mult);
    baseS = Math.floor(slime.baseStats.slipperiness * mult);
    baseV = Math.floor(slime.baseStats.viscosity * mult);
  }

  if (slime.mutations) {
    slime.mutations.forEach(mutId => {
      const mut = MUTATION_LIBRARY[mutId];
      if (mut?.baseValue !== undefined && mut?.viscScale !== undefined) {
        const bonus = mut.baseValue + mut.viscScale * baseV;
        if (mut.stat === 'firmness')     baseF += Math.floor(bonus);
        else if (mut.stat === 'slipperiness') baseS += Math.floor(bonus);
        else if (mut.stat === 'viscosity')    baseV += Math.floor(bonus);
      }
    });
  }

  return {
    firmness:     Math.floor(baseF * (combatBonuses?.firmness  || 1)),
    slipperiness: baseS,
    viscosity:    Math.floor(baseV * (combatBonuses?.viscosity || 1)),
  };
};

// ── Spawn helpers ─────────────────────────────────────────────────────────────

const selectMonsterType = (zone, rareSpawnMult = 1) => {
  const zd = ZONES[zone];
  if (!zd?.monsters?.length) return null;
  const common = zd.monsters.filter(m => !MONSTER_TYPES[m]?.rare);
  const rare   = zd.monsters.filter(m =>  MONSTER_TYPES[m]?.rare);
  const rareChance = Math.min(0.25, 0.05 * rareSpawnMult);
  if (rare.length > 0 && Math.random() < rareChance) {
    return rare[Math.floor(Math.random() * rare.length)];
  }
  return common.length > 0
    ? common[Math.floor(Math.random() * common.length)]
    : zd.monsters[Math.floor(Math.random() * zd.monsters.length)];
};

export const spawnEnemy = (zone, rareSpawnMult = 1) => {
  const type = selectMonsterType(zone, rareSpawnMult);
  if (!type) return null;
  const md = MONSTER_TYPES[type];
  return {
    type,
    x: ARENA_W - 20 + (Math.random() * 6 - 3),
    y: ARENA_H / 2,
    hp: md.hp,
    maxHp: md.hp,
    status: [],
    attackCooldown: 800,
    targetId: null,
  };
};

export const makeArenaSlime = (sl, index, total) => ({
  id:    sl.id,
  x:     15 + Math.random() * 10,
  y:     20 + (index / Math.max(total - 1, 1)) * (ARENA_H - 40),
  hp:    sl.maxHp,
  maxHp: sl.maxHp,
  status: [],
  attackCooldown: 300 + Math.random() * 400,
  biomassGained: 0,
  usedUndying: false,
  usedRebirth: false,
  usedAmbush: false,
  usedFierce: false,
  dead: false,
});

// ── Main tick ────────────────────────────────────────────────────────────────

// sideEffects items:
//   { type: 'bLog', m, c }
//   { type: 'log', m }
//   { type: 'slimeDeath', id }
//   { type: 'bioReclaim', amount }
//   { type: 'prism' }
//   { type: 'expComplete' }
//   { type: 'expWipe' }
//   { type: 'float', id, text, x, y, color, born }

export const tickArena = (exp, slimeMap, gameState, dt, zone) => {
  if (!exp || exp.phase === 'defeat') return { exp, sideEffects: [] };

  // dt is already speed-scaled (real ms * speed multiplier)
  const dtSec = dt / 1000;
  const sideEffects = [];
  const zd = ZONES[zone];

  const { combatBonuses, bon, builds, passives, hiveAbilities, ranchBonus } = gameState;
  const mutPower = combatBonuses?.mutationPower || 1;

  const pushLog  = (m, c = '#e0e0e0') => sideEffects.push({ type: 'bLog', m, c });
  const pushFloat = (text, x, y, color) =>
    sideEffects.push({ type: 'float', id: Math.random(), text, x, y, color, born: Date.now() });

  // ── INTERMISSION ───────────────────────────────────────────────────────────
  if (exp.phase === 'intermission') {
    exp.intermission.timer += dt;
    if (exp.intermission.timer >= exp.intermission.duration) {
      const enemy = spawnEnemy(zone, combatBonuses?.rareSpawn);
      if (enemy) {
        const md = MONSTER_TYPES[enemy.type];
        exp.enemy = enemy;
        exp.phase  = 'battling';
        exp.intermission = null;
        pushLog(`A ${md.name} appears!`, '#22d3ee');
      }
    }
    return { exp, sideEffects };
  }

  if (exp.phase !== 'battling') return { exp, sideEffects };

  const living = exp.slimes.filter(s => !s.dead);
  if (!living.length) return { exp, sideEffects };

  // ── STATUS TICK ────────────────────────────────────────────────────────────
  const tickStatus = (entity, getName) => {
    entity.status = (entity.status || []).filter(s => {
      if (s.durMs <= 0) return false;
      const effect = STATUS_EFFECTS[s.type];
      if (effect && effect.dmg > 0) {
        const dmg = effect.dmg * (dt / TURN_MS);
        entity.hp -= dmg;
        pushFloat(`-${Math.round(dmg)}`, entity.x, entity.y - 8, effect.color);
        pushLog(`${getName()} takes ${Math.round(dmg)} ${effect.name} dmg`, effect.color);
      }
      s.durMs -= dt;
      return s.durMs > 0;
    });
  };

  if (exp.enemy) {
    const md = MONSTER_TYPES[exp.enemy.type];
    tickStatus(exp.enemy, () => md.name);
  }
  living.forEach(s => {
    const sl = slimeMap[s.id];
    tickStatus(s, () => sl?.name || '?');
  });

  // ── ENEMY AI ───────────────────────────────────────────────────────────────
  const enemy = exp.enemy;
  if (enemy && enemy.hp > 0) {
    const md = MONSTER_TYPES[enemy.type];
    const tier = md.tier || 1;

    // Re-target if needed
    if (!enemy.targetId || !living.find(s => s.id === enemy.targetId)) {
      let nearest = null, nearestDist = Infinity;
      living.forEach(s => {
        const d = dist(enemy, s);
        if (d < nearestDist) { nearestDist = d; nearest = s; }
      });
      enemy.targetId = nearest?.id || null;
    }

    const target = living.find(s => s.id === enemy.targetId);
    if (target) {
      const d = dist(enemy, target);
      if (d > ARENA_ATTACK_RANGE) {
        moveToward(enemy, target, enemyMoveSpeed(tier), dtSec);
      } else {
        enemy.attackCooldown -= dt;
        if (enemy.attackCooldown <= 0) {
          enemy.attackCooldown = enemyAttackMs(tier);
          performEnemyAttack(enemy, target, md, living, slimeMap, combatBonuses,
            passives, pushLog, pushFloat, sideEffects, builds);
        }
      }
    }
  }

  // ── SLIME AI ───────────────────────────────────────────────────────────────
  living.forEach(s => {
    const sl = slimeMap[s.id];
    if (!sl) return;
    const stats = calcSlimeStats(sl, s.biomassGained, combatBonuses);

    if (!enemy || enemy.hp <= 0) {
      // Idle drift toward center
      moveToward(s, { x: ARENA_W * 0.4, y: ARENA_H / 2 }, slimeMoveSpeed(stats.slipperiness) * 0.3, dtSec);
      return;
    }

    const d = dist(s, enemy);
    if (d > ARENA_ATTACK_RANGE) {
      moveToward(s, enemy, slimeMoveSpeed(stats.slipperiness), dtSec);
    } else {
      s.attackCooldown -= dt;
      if (s.attackCooldown <= 0) {
        s.attackCooldown = slimeAttackMs(stats.slipperiness);
        performSlimeAttack(s, sl, stats, enemy, MONSTER_TYPES[enemy.type], zone,
          combatBonuses, bon, mutPower, passives, hiveAbilities,
          pushLog, pushFloat, sideEffects);
      }
    }
  });

  // ── DEATH CHECKS ──────────────────────────────────────────────────────────
  // Enemy death
  if (enemy && enemy.hp <= 0) {
    exp.kills++;
    exp.monsterKillCounts = exp.monsterKillCounts || {};
    exp.monsterKillCounts[enemy.type] = (exp.monsterKillCounts[enemy.type] || 0) + 1;

    const md = MONSTER_TYPES[enemy.type];
    const livingNow = exp.slimes.filter(s => !s.dead);

    // Biomass reward
    let bioG = md.biomass;
    if (bon?.bio > 1)                           bioG = Math.floor(bioG * bon.bio);
    if (combatBonuses?.expeditionBiomass > 1)   bioG = Math.floor(bioG * combatBonuses.expeditionBiomass);
    if (combatBonuses?.biomassGain > 1)         bioG = Math.floor(bioG * combatBonuses.biomassGain);
    if (ranchBonus > 0)                         bioG = Math.floor(bioG * (1 + ranchBonus));
    livingNow.forEach(s => {
      const sl = slimeMap[s.id];
      if (sl?.pass?.includes('manaLeech')) bioG = Math.floor(bioG * 1.1);
    });
    let bioMult = 1;
    livingNow.forEach(s => {
      const sl = slimeMap[s.id];
      if (sl?.traits?.includes('greedy')) bioMult += 0.05;
      if (sl?.traits?.includes('glutton')) bioMult += 0.10;
    });
    if (hiveAbilities?.bountifulHarvest) bioMult += 0.25;
    bioG = Math.floor(bioG * bioMult);

    // Resilient trait: +1 HP per kill
    livingNow.forEach(s => {
      const sl = slimeMap[s.id];
      if (sl?.traits?.includes('resilient')) s.hp = Math.min(s.maxHp, s.hp + 1);
    });

    // Distribute biomass evenly
    if (livingNow.length > 0) {
      const perSlime = bioG / livingNow.length;
      livingNow.forEach(s => { s.biomassGained = (s.biomassGained || 0) + perSlime; });
    }
    pushLog(`${md.name} defeated! +${Math.floor(bioG / Math.max(livingNow.length, 1))}🧬 each`, '#4ade80');

    // Prism drop
    if (Math.random() < 0.001) {
      sideEffects.push({ type: 'prism' });
      pushLog('💎 Found a Prism!', '#f59e0b');
    }

    // Material drop
    let matChance = 0.5 * (combatBonuses?.materialDrop || 1) * (1 + (ranchBonus || 0));
    livingNow.forEach(s => {
      if (slimeMap[s.id]?.traits?.includes('lucky')) matChance += 0.05;
    });
    if (hiveAbilities?.bountifulHarvest) matChance *= 1.25;
    if (Math.random() < matChance) {
      const mat = md.mats[Math.floor(Math.random() * md.mats.length)];
      exp.materials = exp.materials || {};
      exp.materials[mat] = (exp.materials[mat] || 0) + 1;
      pushLog(`Found ${mat}! 📦`, '#f59e0b');
    }

    // Element gain
    if (zd?.element && zd.elementGainRate > 0) {
      livingNow.forEach(s => {
        const sl = slimeMap[s.id];
        if (!sl || sl.primaryElement) return;
        const traits = sl.traits || [];
        if (sl.pass?.includes('void')) return;
        let gain = zd.elementGainRate;
        if (traits.includes('wise')) gain *= 1.05;
        if (sl.pass?.includes('adaptable')) gain *= 1.5;
        if (hiveAbilities?.evolutionPulse) gain *= 1.5;
        s.elementGains = s.elementGains || {};
        s.elementGains[zd.element] = (s.elementGains[zd.element] || 0) + gain;
      });
    }

    exp.enemy = null;

    // Check target reached
    if (exp.kills >= exp.targetKills) {
      pushLog('Target reached! Auto-recalling party...', '#4ade80');
      sideEffects.push({ type: 'expComplete' });
    } else {
      // Start intermission
      exp.phase = 'intermission';
      exp.intermission = { timer: 0, duration: INTERMISSION_DURATION };
      pushLog('🚶 Traveling to next encounter...', '#a855f7');
    }
  }

  // Slime deaths
  exp.slimes.forEach(s => {
    if (s.dead || s.hp > 0) return;
    const sl = slimeMap[s.id];

    // Resurrection mutations
    if (sl?.pass?.includes('undying') && !s.usedUndying) {
      s.hp = 1; s.usedUndying = true;
      pushLog(`${sl.name} survives! (Undying) 💀`, '#d4d4d4');
      return;
    }
    if (sl?.pass?.includes('rebirth') && !s.usedRebirth) {
      s.hp = Math.floor(s.maxHp * 0.3); s.usedRebirth = true;
      pushLog(`${sl.name} revives! (Rebirth) 🔥`, '#fb923c');
      return;
    }
    // Tactical Retreat (skill passive)
    if (passives?.includes('tacticalRetreat') && !s.usedTacticalRetreat) {
      s.hp = 1; s.usedTacticalRetreat = true;
      pushLog(`${sl?.name} barely escapes! (Tactical Retreat) 💧`, '#22d3ee');
      return;
    }

    s.dead = true;
    pushLog(`${sl?.name || '?'} fell! 💔`, '#ef4444');
    sideEffects.push({ type: 'slimeDeath', id: s.id });

    // Biomass Reclaimer
    const reclaimerTier = builds?.biomassReclaimer || 0;
    if (reclaimerTier > 0 && sl?.biomass > 0) {
      const recovered = Math.floor(sl.biomass * reclaimerTier * 0.25);
      if (recovered > 0) {
        sideEffects.push({ type: 'bioReclaim', amount: recovered });
        pushLog(`♻️ Reclaimed ${recovered} biomass`, '#4ade80');
      }
    }
  });

  // Party wipe
  const stillLiving = exp.slimes.filter(s => !s.dead);
  if (!stillLiving.length) {
    pushLog('Party wiped! 💀', '#ef4444');
    sideEffects.push({ type: 'expWipe' });
    exp.phase = 'defeat';
  }

  return { exp, sideEffects };
};

// ── Slime attack ──────────────────────────────────────────────────────────────

function performSlimeAttack(
  s, sl, stats, enemy, md, zone,
  combatBonuses, bon, mutPower, passives, hiveAbilities,
  pushLog, pushFloat, sideEffects,
) {
  let dmg = stats.firmness;

  // Trait/mutation damage multipliers
  if (sl.traits?.includes('primordial'))                      dmg = Math.floor(dmg * 1.10);
  if (sl.pass?.includes('ferocity'))                         dmg = Math.floor(dmg * (1 + 0.15 * mutPower));
  if (sl.traits?.includes('brave') && s.hp < s.maxHp * 0.5) dmg = Math.floor(dmg * 1.05);
  if (sl.traits?.includes('lazy'))                            dmg = Math.floor(dmg * 0.95);
  if (sl.traits?.includes('timid'))                           dmg = Math.floor(dmg * 0.95);
  if (sl.traits?.includes('reckless'))                        dmg = Math.floor(dmg * 1.10);
  if (sl.traits?.includes('fierce') && !s.usedFierce) {
    dmg = Math.floor(dmg * 1.08); s.usedFierce = true;
  }
  if (s.hp < s.maxHp * 0.3 && combatBonuses?.lowHpDamage > 1)
    dmg = Math.floor(dmg * combatBonuses.lowHpDamage);
  if (enemy.maxHp > s.maxHp && combatBonuses?.damageVsHighHp > 1)
    dmg = Math.floor(dmg * combatBonuses.damageVsHighHp);
  if (enemy.hp < enemy.maxHp * 0.25 && combatBonuses?.executeDamage > 1)
    dmg = Math.floor(dmg * combatBonuses.executeDamage);

  // Research speed bonus
  if (bon?.spd > 1) dmg = Math.floor(dmg * (1 + (bon.spd - 1) * 0.2));

  // Crit
  let crit = false;
  const critCh = 0.05 + (combatBonuses?.critChance || 0)
    + stats.slipperiness * 0.01
    + (sl.pass?.includes('trickster') ? 0.08 * mutPower : 0)
    + (sl.traits?.includes('swift') ? 0.03 : 0);
  if (sl.pass?.includes('ambush') && !s.usedAmbush) {
    crit = true; s.usedAmbush = true;
  } else if (Math.random() < critCh) {
    crit = true;
  }
  if (crit) {
    const critMult = 1.5 + (sl.pass?.includes('crushing') ? 0.3 * mutPower : 0);
    dmg = Math.floor(dmg * critMult);
  }

  // Elemental
  const preDmg = dmg;
  dmg = calculateElementalDamage(dmg, sl.primaryElement, md.element);
  if (dmg > preDmg && combatBonuses?.elementalDamage > 1)
    dmg = Math.floor(dmg * combatBonuses.elementalDamage);

  enemy.hp -= dmg;
  pushFloat(`-${dmg}`, enemy.x, enemy.y - 8, crit ? '#f59e0b' : '#4ade80');

  const label = crit ? `${sl.name} 💥CRITS for ${dmg}!` : `${sl.name} hits for ${dmg}!`;
  pushLog(label, crit ? '#f59e0b' : '#4ade80');

  // Status procs
  const statusMult = combatBonuses?.statusChance || 1;
  if (sl.pass?.includes('fireBreath') && !enemy.status.some(x => x.type === 'burn')
      && Math.random() < (0.3 + stats.viscosity * 0.02) * statusMult) {
    applyStatus(enemy, 'burn');
    pushLog(`${sl.name} burns ${md.name}! 🔥`, '#f97316');
  }
  if (sl.pass?.includes('poison') && !enemy.status.some(x => x.type === 'poison')
      && Math.random() < (0.35 + stats.viscosity * 0.02) * statusMult) {
    applyStatus(enemy, 'poison');
    pushLog(`${sl.name} poisons ${md.name}! 🧪`, '#22c55e');
  }

  // Shared Vigor: heal on attack
  if (hiveAbilities?.sharedVigor && s.hp < s.maxHp) {
    const heal = Math.min(2, s.maxHp - s.hp);
    s.hp = Math.min(s.maxHp, s.hp + heal);
  }

  // Regeneration skill
  if (passives?.includes('regeneration') && s.hp < s.maxHp)
    s.hp = Math.min(s.maxHp, s.hp + 1);
}

// ── Enemy attack ──────────────────────────────────────────────────────────────

function performEnemyAttack(
  enemy, target, md, living, slimeMap, combatBonuses,
  passives, pushLog, pushFloat, sideEffects, builds,
) {
  const tgtSl   = slimeMap[target.id];
  const tgtStats = tgtSl
    ? calcSlimeStats(tgtSl, target.biomassGained || 0, combatBonuses)
    : { slipperiness: 0 };

  const monsterAbility = md.ability ? MONSTER_ABILITIES[md.ability] : null;
  const usesAbility = monsterAbility && Math.random() < monsterAbility.chance;

  if (usesAbility) {
    const ab = monsterAbility;

    if (ab.effect === 'selfHeal') {
      const heal = Math.floor(enemy.maxHp * ab.healPercent);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      pushLog(`${md.name} uses ${ab.name}! ${ab.icon} +${heal} HP`, '#4ade80');
      pushFloat(`+${heal}`, enemy.x, enemy.y - 8, '#4ade80');
      return;
    }

    if (ab.effect === 'aoe') {
      const aoeDmg = Math.floor(md.dmg * ab.multiplier);
      living.forEach(p => {
        let dmg = aoeDmg;
        const pSl = slimeMap[p.id];
        if (pSl?.pass?.includes('armored')) dmg = Math.floor(dmg * 0.8);
        if (combatBonuses?.damageReduction > 0) dmg = Math.max(1, dmg - combatBonuses.damageReduction);
        p.hp -= dmg;
        pushFloat(`-${dmg}`, p.x, p.y - 8, '#ef4444');
      });
      pushLog(`${md.name} uses ${ab.name}! ${ab.icon} Hits everyone for ${aoeDmg}!`, '#ef4444');
      return;
    }

    // Single-target ability
    let dodgeCh = 0.05 + (tgtStats.slipperiness || 0) * 0.015
      + (tgtSl?.pass?.includes('echolocation') ? 0.12 : 0)
      + (tgtSl?.traits?.includes('timid') ? 0.10 : 0);
    if (Math.random() < dodgeCh) {
      pushLog(`${tgtSl?.name} dodges ${md.name}'s ${ab.name}! 💨`, '#22d3ee');
      return;
    }

    let abilityDmg = md.dmg * (ab.multiplier || ab.damageMultiplier || 1);
    if (ab.effect !== 'trueDamage') {
      if (tgtSl?.pass?.includes('armored')) abilityDmg *= 0.8;
      if (combatBonuses?.damageReduction > 0)
        abilityDmg = Math.max(1, abilityDmg - combatBonuses.damageReduction);
    }

    if (ab.effect === 'lifesteal') {
      const heal = Math.floor(abilityDmg * (ab.healPercent || 0.5));
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
      pushFloat(`+${heal}`, enemy.x, enemy.y - 8, '#a855f7');
    }

    target.hp -= Math.floor(abilityDmg);
    pushFloat(`-${Math.floor(abilityDmg)}`, target.x, target.y - 8, '#ef4444');
    pushLog(`${md.name} uses ${ab.name}! ${ab.icon} ${tgtSl?.name} takes ${Math.floor(abilityDmg)}!`, '#ef4444');

    // Status from ability
    if (ab.effect === 'poison') applyStatus(target, 'poison');
    if (ab.effect === 'burn')   applyStatus(target, 'burn');
    if (ab.effect === 'stun')   applyStatus(target, 'stun');
    if (ab.effect === 'freeze') applyStatus(target, 'stun');

    if (tgtSl?.pass?.includes('reflect')) {
      const ref = Math.floor(abilityDmg * 0.15);
      enemy.hp -= ref;
      pushLog(`Reflected ${ref}! 💎`, '#06b6d4');
    }
    return;
  }

  // Normal attack with dodge
  let dodgeCh = 0.05 + (tgtStats.slipperiness || 0) * 0.015
    + (tgtSl?.pass?.includes('echolocation') ? 0.12 : 0)
    + (tgtSl?.pass?.includes('trickster') ? 0.08 : 0)
    + (tgtSl?.traits?.includes('cautious') && target.hp < target.maxHp * 0.5 ? 0.05 : 0)
    + (tgtSl?.traits?.includes('timid') ? 0.10 : 0);

  if (Math.random() < dodgeCh) {
    pushLog(`${tgtSl?.name} dodges! 💨`, '#22d3ee');
    return;
  }

  let inc = md.dmg;
  if (tgtSl?.pass?.includes('armored'))  inc = Math.floor(inc * 0.8);
  if (tgtSl?.traits?.includes('reckless')) inc = Math.floor(inc * 1.05);
  if (combatBonuses?.damageReduction > 0) inc = Math.max(1, inc - combatBonuses.damageReduction);
  if (target.hp < target.maxHp * 0.2 && combatBonuses?.lowHpDefense > 0)
    inc = Math.floor(inc * (1 - combatBonuses.lowHpDefense));

  const preInc = inc;
  inc = calculateElementalDamage(inc, md.element, tgtSl?.primaryElement);

  target.hp -= inc;
  pushFloat(`-${inc}`, target.x, target.y - 8, '#ef4444');
  const hitMsg = inc > preInc
    ? `${md.name} hits ${tgtSl?.name} for ${inc}! ⚡`
    : `${md.name} hits ${tgtSl?.name} for ${inc}!`;
  pushLog(hitMsg, '#ef4444');

  if (tgtSl?.pass?.includes('reflect')) {
    const ref = Math.floor(inc * 0.15);
    enemy.hp -= ref;
    pushLog(`Reflected ${ref}! 💎`, '#06b6d4');
  }

  // Monster on-hit status procs
  if (md.trait === 'venomSac' && !target.status.some(x => x.type === 'poison') && Math.random() < 0.3)
    applyStatus(target, 'poison');
  if ((md.trait === 'dragonHeart' || md.trait === 'phoenixFeather')
      && !target.status.some(x => x.type === 'burn') && Math.random() < 0.25)
    applyStatus(target, 'burn');
  if (md.trait === 'wolfFang' && !target.status.some(x => x.type === 'bleed') && Math.random() < 0.2)
    applyStatus(target, 'bleed');
}
