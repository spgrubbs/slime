// ─────────────────────────────────────────────────────────────────────────────
// 1v1 battle resolver
//
// Pure and fully deterministic: the same two combatants always produce the same
// fight, with no randomness at all. Chance-like stats are METERS instead of
// rolls — 25% crit means every 4th attack crits; 30% dodge means roughly every
// third incoming attack whiffs. Builds win or lose on their own merits and the
// player has no input once the fight starts.
//
// The resolver emits records; the UI replays them. It never decides anything.
// See docs/roguelike/GAME_DESIGN.md §8.
// ─────────────────────────────────────────────────────────────────────────────

export const MAX_TRIGGER_DEPTH = 64;
export const MAX_ACTIONS_PER_ROUND = 20;
export const SALT_RAIN_ROUND = 30;
export const SALT_RAIN_ROUND_BOSS = 50;
export const HARD_ROUND_LIMIT = 200;

const ELEMENT_STRONG = { fire: 'nature', nature: 'earth', earth: 'water', water: 'fire' };

const DURATION_STATUSES = ['softened', 'weakened', 'slowed', 'enraged'];

// ── Derived stats ────────────────────────────────────────────────────────────

export function effFirm(c) {
  return Math.max(0, c.firm + (c.temp.firm || 0) - (c.status.corrode || 0));
}

export function effSlip(c) {
  let s = Math.max(0, c.slip + (c.temp.slip || 0) - (c.status.sticky || 0));
  if (c.status.slowed) s *= 0.5;
  return s;
}

export function dodgeChance(c) {
  const s = effSlip(c);
  return Math.min(0.75, 0.5 * s / (s + 60) + c.dodge);
}

// ── Records ──────────────────────────────────────────────────────────────────

function snap(c) {
  return { hp: Math.max(0, c.hp), maxHp: c.maxHp, membrane: c.membrane, status: { ...c.status } };
}

function makeCtx(player, enemy, opts) {
  const ctx = {
    round: 0,
    depth: 0,
    truncated: false,
    over: false,
    records: [],
    player,
    enemy,
    isBoss: !!opts.isBoss,
    stats: { biggestHit: 0, mostActions: 0, playerHpLost: 0 },
  };
  ctx.foe = (c) => (c === player ? enemy : player);
  ctx.push = (rec) => {
    ctx.records.push({ ...rec, round: ctx.round, snap: { player: snap(player), enemy: snap(enemy) } });
  };
  ctx.log = (text, extra = {}) => ctx.push({ kind: 'log', text, ...extra });
  return ctx;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Run every hook of `name` on combatant `c`. Reactive hooks share a depth budget. */
function runHooks(ctx, c, name, ev, reactive = false) {
  if (ctx.over) return;
  if (reactive) {
    if (ctx.depth >= MAX_TRIGGER_DEPTH) {
      if (!ctx.truncated) {
        ctx.truncated = true;
        ctx.log(`⛓️ Chain limit reached — the rest of this chain fizzles`, { tone: 'note' });
      }
      return;
    }
    ctx.depth++;
  }
  for (const hk of c.hooks) {
    const fn = hk.h[name];
    // `repeat` comes from the Echoing mutation: the effect triggers again.
    for (let i = 0; fn && i <= (hk.repeat || 0) && !ctx.over; i++) fn(ctx, c, ctx.foe(c), hk.L, ev, hk);
    if (ctx.over) break;
  }
  if (reactive) ctx.depth--;
}

// ── Primitive effects (exposed to content through ctx) ───────────────────────

function checkDeath(ctx, c) {
  if (c.hp > 0 || ctx.over) return;
  const ev = { saved: false };
  runHooks(ctx, c, 'onLethal', ev);
  if (ev.saved && c.hp > 0) return;
  c.hp = 0;
  ctx.over = true;
  ctx.winner = c === ctx.player ? 'enemy' : 'player';
  ctx.push({ kind: 'death', actor: c.side, text: `${c.name} is defeated!`, tone: c.side === 'player' ? 'bad' : 'good' });
}

/** Lose Mass. `throughMembrane` damage is absorbed by Membrane first. */
function loseMass(ctx, c, amount, { throughMembrane = true } = {}) {
  let dmg = Math.max(0, amount);
  let absorbed = 0;
  if (throughMembrane && c.membrane > 0) {
    absorbed = Math.min(c.membrane, dmg);
    c.membrane -= absorbed;
    dmg -= absorbed;
  }
  c.hp -= dmg;
  if (c === ctx.player) ctx.stats.playerHpLost += dmg;
  return { dmg, absorbed };
}

function damage(ctx, src, tgt, amount, { label = '', trueDmg = false, icon = '' } = {}) {
  if (ctx.over || amount <= 0) return 0;
  const { dmg, absorbed } = loseMass(ctx, tgt, Math.floor(amount), { throughMembrane: !trueDmg });
  ctx.push({
    kind: 'damage', actor: src?.side, target: tgt.side, amount: dmg, absorbed,
    text: `${icon}${label ? label + ': ' : ''}${tgt.name} takes ${fmt(dmg)}${absorbed ? ` (${fmt(absorbed)} absorbed)` : ''}`,
  });
  checkDeath(ctx, tgt);
  return dmg;
}

function heal(ctx, c, amount, label = '') {
  if (ctx.over || amount <= 0) return 0;
  const want = Math.floor(amount * c.healMult);
  const room = c.maxHp - c.hp;
  const healed = Math.min(room, want);
  c.hp += healed;
  const over = want - healed;
  if (over > 0) for (const f of c.overhealFns) f(ctx, c, over);
  if (healed > 0) ctx.push({ kind: 'heal', target: c.side, amount: healed, text: `💚 ${label ? label + ': ' : ''}${c.name} heals ${fmt(healed)}` });
  return healed;
}

function gainMembrane(ctx, c, amount, label = '') {
  if (ctx.over || amount <= 0) return;
  const n = Math.floor(amount * c.membraneMult);
  if (n <= 0) return;
  c.membrane += n;
  ctx.push({ kind: 'membrane', target: c.side, amount: n, text: `🛡️ ${label ? label + ': ' : ''}${c.name} gains ${fmt(n)} Membrane` });
}

function applyStatus(ctx, src, tgt, type, n, label = '') {
  if (ctx.over || n <= 0) return;
  let amount = n;
  if (src && src !== tgt) amount *= (src.statusAmp[type] || 1) * (src.statusAmp.all || 1);
  amount = DURATION_STATUSES.includes(type) || type === 'stun' ? Math.max(1, Math.round(amount)) : Math.floor(amount);
  if (amount <= 0) return;
  if (tgt.immune?.includes(type)) {
    ctx.push({ kind: 'status', target: tgt.side, text: `${tgt.name} is immune to ${type}` });
    return;
  }
  if (type === 'stun') {
    if (tgt.status.stunResist > 0 || tgt.status.stun > 0) return;
    tgt.status.stun = 1;
  } else if (DURATION_STATUSES.includes(type)) {
    tgt.status[type] = Math.max(tgt.status[type] || 0, amount);
    tgt.statusRound[type] = ctx.round;
  } else {
    tgt.status[type] = (tgt.status[type] || 0) + amount;
  }
  ctx.push({ kind: 'status', actor: src?.side, target: tgt.side, status: type, amount, text: `${STATUS_ICON[type] || '•'} ${label ? label + ': ' : ''}${tgt.name} gains ${type} ${amount}` });
}

export const STATUS_ICON = {
  poison: '🧪', burn: '🔥', bleed: '🩸', corrode: '🟢', sticky: '🍯', softened: '🫠',
  weakened: '⬇️', slowed: '🐌', enraged: '😤', stun: '💫', regen: '💚', thorns: '🌵',
};

// ── Attacks ──────────────────────────────────────────────────────────────────

/**
 * One attack, possibly several hits. `mult` scales FIRM; `basic` marks the
 * default attack so traits like Many Legs can reshape it.
 */
function attack(ctx, src, tgt, { mult = 1, label = 'Attack', basic = false, flat = 0 } = {}) {
  if (ctx.over) return 0;
  const ev = { mult, hits: [1], basic, label, flat, bonusMult: 1 };
  runHooks(ctx, src, 'beforeAttack', ev);
  let total = 0;
  for (const h of ev.hits) {
    if (ctx.over) break;
    total += hit(ctx, src, tgt, ev, h);
  }
  return total;
}

function hit(ctx, src, tgt, ev, hitMult) {
  // Dodge: the defender's meter fills by its dodge chance on every incoming hit.
  tgt.meters.dodge += dodgeChance(tgt);
  if (tgt.meters.dodge >= 1) {
    tgt.meters.dodge -= 1;
    ctx.push({ kind: 'dodge', actor: src.side, target: tgt.side, text: `💨 ${tgt.name} dodges ${ev.label}` });
    runHooks(ctx, tgt, 'onDodge', {}, true);
    return 0;
  }

  let dmg = (effFirm(src) * ev.mult + ev.flat) * hitMult * ev.bonusMult;

  // Crit: the attacker's meter fills by its crit chance on every hit.
  // Chance above 100% turns into extra crit damage.
  const chance = src.critChance;
  src.meters.crit += Math.min(1, chance);
  let crit = false;
  if (src.meters.crit >= 1 || src.flags.nextHitCrits) {
    if (!src.flags.nextHitCrits) src.meters.crit -= 1;
    src.flags.nextHitCrits = false;
    crit = true;
    dmg *= 1.5 + src.critDmg + Math.max(0, chance - 1) * 0.5;
  }

  if (src.status.enraged) dmg *= 1.5;
  if (src.status.weakened) dmg *= 0.75;
  if (src.element && tgt.element) {
    if (ELEMENT_STRONG[src.element] === tgt.element) dmg *= 1.25;
    else if (ELEMENT_STRONG[tgt.element] === src.element) dmg *= 0.75;
  }
  if (tgt.status.softened) dmg *= 1.25;
  dmg *= src.damageDealtMult;
  dmg *= tgt.damageTakenMult;
  dmg = Math.max(1, Math.floor(dmg));

  const truePart = Math.floor(dmg * Math.min(1, src.trueDmgPct));
  const a = loseMass(ctx, tgt, dmg - truePart);
  const b = loseMass(ctx, tgt, truePart, { throughMembrane: false });
  const dealt = a.dmg + b.dmg;
  ctx.stats.biggestHit = src === ctx.player ? Math.max(ctx.stats.biggestHit, dealt) : ctx.stats.biggestHit;

  ctx.push({
    kind: 'hit', actor: src.side, target: tgt.side, amount: dealt, absorbed: a.absorbed, crit,
    text: `${crit ? '💥 CRIT! ' : ''}${src.name} ${ev.label === 'Attack' ? 'hits' : `uses ${ev.label} on`} ${tgt.name} for ${fmt(dealt)}${a.absorbed ? ` (+${fmt(a.absorbed)} into Membrane)` : ''}`,
  });

  if (src.lifesteal > 0 && dealt > 0) heal(ctx, src, dealt * src.lifesteal, 'Lifesteal');

  const hitEv = { damage: dealt, crit, label: ev.label, basic: ev.basic, absorbed: a.absorbed };
  if (crit) runHooks(ctx, src, 'onCrit', hitEv, true);
  runHooks(ctx, src, 'onHit', hitEv, true);
  if (tgt.status.thorns > 0 && !ctx.over) damage(ctx, tgt, src, tgt.status.thorns, { label: 'Thorns', icon: '🌵 ' });
  runHooks(ctx, tgt, 'onDamaged', hitEv, true);

  checkDeath(ctx, tgt);
  if (!ctx.over && !tgt.flags.lowHpFired && tgt.hp < tgt.maxHp * 0.5) {
    tgt.flags.lowHpFired = true;
    runHooks(ctx, tgt, 'onLowHp', {}, true);
  }
  return dealt;
}

// ── Turns ────────────────────────────────────────────────────────────────────

function turnStart(ctx, c) {
  if (c.membrane > 0 && !c.flags.retainMembrane) {
    const keep = c.flags.halfMembrane ? Math.floor(c.membrane / 2) : 0;
    c.membrane = keep;
  }
  if (c.status.poison > 0) {
    damage(ctx, null, c, c.status.poison, { label: 'Poison', trueDmg: true, icon: '🧪 ' });
    if (!c.flags.poisonNoDecay) c.status.poison -= 1;
  }
  if (ctx.over) return;
  if (c.status.burn > 0) {
    damage(ctx, null, c, c.status.burn, { label: 'Burn', icon: '🔥 ' });
    if (!c.flags.burnNoDecay) c.status.burn = Math.floor(c.status.burn / 2);
  }
  if (ctx.over) return;
  if (c.status.regen > 0) {
    heal(ctx, c, c.status.regen, 'Regen');
    c.status.regen -= 1;
  }
  runHooks(ctx, c, 'turnStart', {});
}

function act(ctx, c, actionIndex) {
  const foe = ctx.foe(c);
  turnStart(ctx, c);
  if (ctx.over) return;

  if (c.status.stun > 0) {
    c.status.stun = 0;
    c.status.stunResist = ctx.isBoss && c === ctx.enemy ? 2 : 1;
    ctx.push({ kind: 'stunned', actor: c.side, text: `💫 ${c.name} is stunned and loses the action` });
    return;
  }

  if (c.status.bleed > 0) {
    damage(ctx, null, c, c.status.bleed, { label: 'Bleed', icon: '🩸 ' });
    if (ctx.over) return;
  }

  // First ready Action in slot order, else a basic attack. Slot order is the
  // priority — it is set outside battle, never during it.
  const ready = c.hooks.find(hk => hk.h.action && (c.cooldowns[hk.key] || 0) <= 0);
  if (ready) {
    const times = 1 + (c.flags.echoActions || 0) + (ready.extraTimes || 0) + (actionIndex === 0 && c.flags.echoFirst && !c.flags.echoFirstUsed ? 1 : 0);
    if (actionIndex === 0 && c.flags.echoFirst) c.flags.echoFirstUsed = true;
    ctx.push({ kind: 'action', actor: c.side, text: `${ready.icon || '✨'} ${c.name} uses ${ready.name}${times > 1 ? ` ×${times}` : ''}` });
    for (let i = 0; i < times && !ctx.over; i++) ready.h.action(ctx, c, foe, ready.L, {}, ready);
    // Ticks once at the end of this turn, so CD 3 means "usable every 3rd action".
    c.cooldowns[ready.key] = Math.max(1, ready.cd - c.cdReduction);
  } else {
    attack(ctx, c, foe, { basic: true });
  }
  if (ctx.over) return;
  runHooks(ctx, c, 'onAction', {});

  for (const k of Object.keys(c.cooldowns)) c.cooldowns[k] = Math.max(0, c.cooldowns[k] - 1);
}

function roundEnd(ctx) {
  for (const c of [ctx.player, ctx.enemy]) {
    for (const t of DURATION_STATUSES) {
      if (c.status[t] > 0 && c.statusRound[t] !== ctx.round) c.status[t] -= 1;
    }
    if (c.status.sticky > 0) c.status.sticky -= 1;
    if (c.status.bleed > 0 && !c.flags.bleedNoDecay) c.status.bleed -= 1;
    if (c.status.stunResist > 0) c.status.stunResist -= 1;
    runHooks(ctx, c, 'roundEnd', {});
  }
}

// ── Battle ───────────────────────────────────────────────────────────────────

/**
 * Resolve a whole battle. Combatants are mutated; pass fresh copies.
 * Returns { winner, rounds, records, stats, flawless, playerHp }.
 */
export function resolveBattle(player, enemy, opts = {}) {
  const ctx = makeCtx(player, enemy, opts);
  ctx.attack = (src, tgt, o) => attack(ctx, src, tgt, o);
  ctx.damage = (src, tgt, n, o) => damage(ctx, src, tgt, n, o);
  ctx.heal = (c, n, label) => heal(ctx, c, n, label);
  ctx.gainMembrane = (c, n, label) => gainMembrane(ctx, c, n, label);
  ctx.applyStatus = (src, tgt, t, n, label) => applyStatus(ctx, src, tgt, t, n, label);

  ctx.push({ kind: 'start', text: `${player.name} vs ${enemy.name}` });
  runHooks(ctx, player, 'battleStart', {});
  runHooks(ctx, enemy, 'battleStart', {});

  const rainStart = opts.isBoss ? SALT_RAIN_ROUND_BOSS : SALT_RAIN_ROUND;

  while (!ctx.over) {
    ctx.round++;
    ctx.truncated = false;
    if (ctx.round > HARD_ROUND_LIMIT) {
      ctx.over = true;
      ctx.winner = 'enemy';
      ctx.push({ kind: 'death', actor: 'player', text: `The fight drags on forever — ${player.name} dries out.`, tone: 'bad' });
      break;
    }
    ctx.push({ kind: 'round', text: `— Round ${ctx.round} —` });

    if (ctx.round >= rainStart) {
      const pct = 0.05 * (1 + ctx.round - rainStart);
      ctx.push({ kind: 'log', text: `🧂 Salt Rain falls (${Math.round(pct * 100)}% max Mass)`, tone: 'note' });
      for (const c of [player, enemy]) {
        damage(ctx, null, c, Math.max(1, c.maxHp * pct), { label: 'Salt Rain', trueDmg: true });
        if (ctx.over) break;
      }
      if (ctx.over) break;
    }

    // Tempo: the faster side banks extra actions from the speed ratio.
    const counts = {};
    for (const c of [player, enemy]) {
      const o = ctx.foe(c);
      c.tempo += Math.max(0, (effSlip(c) + 5) / (effSlip(o) + 5) - 1) * c.tempoMult;
      const extra = Math.floor(c.tempo);
      c.tempo -= extra;
      counts[c.side] = Math.min(MAX_ACTIONS_PER_ROUND, 1 + extra + (c.flags.bonusActions || 0));
    }
    ctx.stats.mostActions = Math.max(ctx.stats.mostActions, counts.player);

    // Interleave actions, faster side first; ties go to the player.
    const first = effSlip(enemy) > effSlip(player) ? enemy : player;
    const second = ctx.foe(first);
    const done = { player: 0, enemy: 0 };
    while (!ctx.over && (done[first.side] < counts[first.side] || done[second.side] < counts[second.side])) {
      for (const c of [first, second]) {
        if (ctx.over || done[c.side] >= counts[c.side]) continue;
        act(ctx, c, done[c.side]);
        done[c.side]++;
      }
    }
    if (!ctx.over) roundEnd(ctx);
  }

  return {
    winner: ctx.winner,
    rounds: ctx.round,
    records: ctx.records,
    stats: ctx.stats,
    flawless: ctx.winner === 'player' && ctx.stats.playerHpLost === 0,
    devoured: ctx.winner === 'player' && !!ctx.devoured,
    playerHp: Math.max(0, Math.min(player.maxHp, player.hp)),
    runGains: player.runGains,
  };
}

// ── Number formatting ────────────────────────────────────────────────────────

export function fmt(n) {
  if (!Number.isFinite(n)) return n > 0 ? '∞' : '0';
  const a = Math.abs(n);
  if (a < 1e4) return String(Math.floor(n));
  const units = [[1e12, 'T'], [1e9, 'B'], [1e6, 'M'], [1e3, 'K']];
  if (a >= 1e15) return n.toExponential(2);
  for (const [v, u] of units) if (a >= v) return (n / v).toFixed(a / v < 100 ? 1 : 0) + u;
  return String(Math.floor(n));
}
