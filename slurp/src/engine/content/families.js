// Families and Resonance — bonuses for slotting 2 / 4 / 6 essences of one family.
// Each tier is an effect in the same shape as an essence (passive + hooks).

export const FAMILIES = {
  beast:     { name: 'Beast',     icon: '🐾', color: '#d97706' },
  flora:     { name: 'Flora',     icon: '🌿', color: '#16a34a' },
  stone:     { name: 'Stone',     icon: '🪨', color: '#78716c' },
  insect:    { name: 'Insect',    icon: '🕷️', color: '#65a30d' },
  ooze:      { name: 'Ooze',      icon: '🫠', color: '#22c55e' },
  spirit:    { name: 'Spirit',    icon: '👻', color: '#a78bfa' },
  sky:       { name: 'Sky',       icon: '🦅', color: '#38bdf8' },
  void:      { name: 'Void',      icon: '🕳️', color: '#6d28d9' },
  construct: { name: 'Construct', icon: '🤖', color: '#94a3b8' },
};

export const THRESHOLDS = [2, 4, 6];

export const RESONANCE = {
  beast: [
    { desc: '+10% crit chance', passive: (c) => { c.critChance += 0.1; } },
    { desc: 'Crits apply Bleed 2', hooks: { onCrit: (ctx, me, foe) => ctx.applyStatus(me, foe, 'bleed', 2, 'Beast') } },
    { desc: 'Chimera: crit damage +100%', passive: (c) => { c.critDmg += 1; } },
  ],
  flora: [
    { desc: 'Heal 3 at the start of each turn', hooks: { turnStart: (ctx, me) => ctx.heal(me, 3, 'Flora') } },
    { desc: 'Healing ×1.5', passive: (c) => { c.healMult *= 1.5; } },
    { desc: 'Bloom: Poison you apply ×2', passive: (c) => { c.statusAmp.poison = (c.statusAmp.poison || 1) * 2; } },
  ],
  stone: [
    { desc: 'Start battles with 10% max Mass as Membrane', hooks: { battleStart: (ctx, me) => ctx.gainMembrane(me, me.maxHp * 0.1, 'Stone') } },
    { desc: 'Membrane only half dissolves', passive: (c) => { c.flags.halfMembrane = true; } },
    { desc: 'Golem: Membrane never dissolves', passive: (c) => { c.flags.retainMembrane = true; } },
  ],
  insect: [
    { desc: 'Start battles with 0.5 Tempo', passive: (c) => { c.tempo += 0.5; } },
    { desc: 'Basic attacks gain an extra 50% hit', hooks: { beforeAttack: (ctx, me, foe, L, ev) => { if (ev.basic) ev.hits.push(0.5); } } },
    { desc: 'Swarm: every hit applies Poison 1', hooks: { onHit: (ctx, me, foe) => ctx.applyStatus(me, foe, 'poison', 1, 'Swarm') } },
  ],
  ooze: [
    { desc: '+1 option on absorb offers', run: { absorbOptions: 1 } },
    { desc: 'Heal 10% max Mass after each win', run: { healAfterWin: 0.1 } },
    { desc: 'King Slime: every essence counts one level higher', levelBonus: 1 },
  ],
  spirit: [
    { desc: 'Once per battle, survive a lethal blow at 1 Mass', hooks: { onLethal: (ctx, me, foe, L, ev) => { if (!me.flags.spiritSaved) { me.flags.spiritSaved = true; me.hp = 1; ev.saved = true; ctx.log('👻 Spirit: clings on at 1 Mass', { tone: 'good' }); } } } },
    { desc: '+10% dodge', passive: (c) => { c.dodge += 0.1; } },
    { desc: 'Wraith: every dodge counterattacks for 100%', hooks: { onDodge: (ctx, me, foe) => ctx.attack(me, foe, { mult: 1, label: 'Wraith' }) } },
  ],
  sky: [
    { desc: '+3 SLIP', passive: (c) => { c.slip += 3; } },
    { desc: 'Tempo gain ×1.5', passive: (c) => { c.tempoMult *= 1.5; } },
    { desc: 'Tempest: Tempo gain ×2 more', passive: (c) => { c.tempoMult *= 2; } },
  ],
  void: [
    { desc: '10% of hit damage is true damage', passive: (c) => { c.trueDmgPct += 0.1; } },
    { desc: 'Lifesteal 10%', passive: (c) => { c.lifesteal += 0.1; } },
    { desc: 'Hollow: +30% true damage, the enemy heals half as much', passive: (c) => { c.trueDmgPct += 0.3; }, hooks: { battleStart: (ctx, me, foe) => { foe.healMult *= 0.5; } } },
  ],
  construct: [
    { desc: '+2 FIRM, +2 SLIP', passive: (c) => { c.firm += 2; c.slip += 2; } },
    { desc: 'Action cooldowns −1', passive: (c) => { c.cdReduction += 1; } },
    { desc: 'Mech: every Action triggers twice', passive: (c) => { c.flags.echoActions = (c.flags.echoActions || 0) + 1; } },
  ],
};

/** Count slotted essences per family. Dual-family essences count for both. */
export function familyCounts(slotted, ESSENCES) {
  const counts = {};
  for (const e of slotted) {
    const fam = ESSENCES[e.id]?.family;
    for (const f of [].concat(fam || [])) counts[f] = (counts[f] || 0) + 1;
  }
  return counts;
}

/** Active resonance tiers: [{ family, tier (0..2), effect }]. */
export function activeResonance(counts) {
  const out = [];
  for (const [family, n] of Object.entries(counts)) {
    THRESHOLDS.forEach((t, tier) => {
      if (n >= t && RESONANCE[family]?.[tier]) out.push({ family, tier, effect: RESONANCE[family][tier] });
    });
  }
  return out;
}
