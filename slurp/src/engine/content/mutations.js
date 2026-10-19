// ─────────────────────────────────────────────────────────────────────────────
// Mutations — what an essence learns when it fuses (3 copies, then 6).
//
// Each fusion offers 3 Mutations for THAT essence: its own hand-made ones plus
// generic ones. A Mutation adds a new behavior, so two slimes with the same
// essences can still play very differently.
//
// Shape (all optional):
//   mod:     { cd, twice, levelUp, opener, repeat, attune }  — reshape the essence itself
//   before / after (ctx, me, foe, L) — wrap an Action
//   passive (c, L), hooks { … }     — extra behavior, same as an essence
//   run     { onWin(L, gains, run), healAfterWin }
// L is the essence's level index, so Mutations scale with it.
// ─────────────────────────────────────────────────────────────────────────────

const pctMax = (me, p) => Math.floor(me.maxHp * p);

export const MUTATIONS = {
  // ═══ BEAST ══════════════════════════════════════════════════════════════
  fangs: {
    serrated: { name: 'Serrated', desc: 'Crits also apply Bleed 3', hooks: { onCrit: (ctx, me, foe) => ctx.applyStatus(me, foe, 'bleed', 3, 'Serrated') } },
    jugular:  { name: 'Jugular', desc: '+50% crit damage', passive: (c) => { c.critDmg += 0.5; } },
  },
  pounce: {
    rending: { name: 'Rending', desc: 'Pounce also applies Softened 2 (+25% damage taken)', after: (ctx, me, foe) => ctx.applyStatus(me, foe, 'softened', 2, 'Rending') },
    ambush:  { name: 'Ambush', desc: 'Pounce always crits', before: (ctx, me) => { me.flags.nextHitCrits = true; } },
  },
  bloodthirst: {
    gorge:     { name: 'Gorge', desc: 'Overhealing becomes Membrane', passive: (c) => c.overhealFns.push((ctx, me, over) => ctx.gainMembrane(me, over, 'Gorge')) },
    bloodrush: { name: 'Bloodrush', desc: 'Lifesteal is doubled while below 50% Mass',
      hooks: { turnStart: (ctx, me) => { me.flags.lsBase ??= me.lifesteal; me.lifesteal = me.flags.lsBase * (me.hp < me.maxHp / 2 ? 2 : 1); } } },
  },
  feralInstinct: {
    secondWind:  { name: 'Second Wind', desc: 'When it triggers, also heal 20% max Mass', hooks: { onLowHp: (ctx, me) => ctx.heal(me, pctMax(me, 0.2), 'Second Wind') } },
    hairTrigger: { name: 'Hair Trigger', desc: 'Also triggers the first time you drop below 80% Mass',
      hooks: { onDamaged: (ctx, me) => { if (!me.flags.hair && me.hp < me.maxHp * 0.8) { me.flags.hair = true; ctx.applyStatus(me, me, 'enraged', 2, 'Hair Trigger'); } } } },
  },
  chainCrit: {
    bloodchain: { name: 'Bloodchain', desc: 'Every crit also applies Bleed 1', hooks: { onCrit: (ctx, me, foe) => ctx.applyStatus(me, foe, 'bleed', 1, 'Bloodchain') } },
    sharpening: { name: 'Sharpening', desc: 'Every crit grants +1 FIRM for the battle (up to +20)',
      hooks: { onCrit: (ctx, me) => { if ((me.temp.sharp || 0) < 20) { me.temp.sharp = (me.temp.sharp || 0) + 1; me.temp.firm = (me.temp.firm || 0) + 1; } } } },
  },
  packTactics: {
    alpha: { name: 'Alpha', desc: '+10% crit damage per 🐾 Beast tag', passive: (c) => { c.critDmg += 0.1 * (c.tags.beast || 0); } },
    hunt:  { name: 'The Hunt', desc: 'Crits heal 3% max Mass', hooks: { onCrit: (ctx, me) => ctx.heal(me, pctMax(me, 0.03), 'The Hunt') } },
  },
  bloodletting: {
    exsanguinate: { name: 'Exsanguinate', desc: "Bleed on the enemy no longer decays", hooks: { battleStart: (ctx, me, foe) => { foe.flags.bleedNoDecay = true; } } },
    openWound:    { name: 'Open Wound', desc: 'Hits on an enemy with Bleed 6+ apply Softened 1', hooks: { onHit: (ctx, me, foe) => { if ((foe.status.bleed || 0) >= 6) ctx.applyStatus(me, foe, 'softened', 1, 'Open Wound'); } } },
  },

  // ═══ FLORA ══════════════════════════════════════════════════════════════
  photosynthesis: {
    sunburst:  { name: 'Sunburst', desc: 'Overhealing is dealt to the enemy as damage', passive: (c) => c.overhealFns.push((ctx, me, over) => ctx.damage(me, ctx.foe(me), over, { label: 'Sunburst', icon: '☀️ ' })) },
    deepRoots: { name: 'Deep Roots', desc: 'Also gain Membrane equal to the heal each turn', hooks: { turnStart: (ctx, me, foe, L) => ctx.gainMembrane(me, [2, 3, 5, 8][L] + Math.floor(me.visc * 0.3), 'Deep Roots') } },
  },
  devour: {
    bottomless:    { name: 'Bottomless', desc: 'Devour works on enemies 15% healthier', passive: (c) => { c.flags.devourBonus = (c.flags.devourBonus || 0) + 0.15; } },
    digestiveAcid: { name: 'Digestive Acid', desc: 'Devour also applies Corrode 3 and Poison 5', after: (ctx, me, foe) => { ctx.applyStatus(me, foe, 'corrode', 3, 'Digestive Acid'); ctx.applyStatus(me, foe, 'poison', 5, 'Digestive Acid'); } },
  },
  sporeCloud: {
    choking:  { name: 'Choking Spores', desc: 'Spore Cloud also applies Sticky 3', after: (ctx, me, foe) => ctx.applyStatus(me, foe, 'sticky', 3, 'Choking Spores') },
    mycelium: { name: 'Mycelium', desc: 'Start every battle by applying Poison 4 + 30% VISC', hooks: { battleStart: (ctx, me, foe) => ctx.applyStatus(me, foe, 'poison', 4 + Math.floor(me.visc * 0.3), 'Mycelium') } },
  },
  sapSpray: {
    amberTrap: { name: 'Amber Trap', desc: 'Every 3rd time you are hit, Stun the attacker',
      hooks: { onDamaged: (ctx, me, foe) => { me.temp.amber = (me.temp.amber || 0) + 1; if (me.temp.amber % 3 === 0) ctx.applyStatus(me, foe, 'stun', 1, 'Amber Trap'); } } },
    syrup:     { name: 'Syrup', desc: 'When hit, also Corrode the attacker by 1', hooks: { onDamaged: (ctx, me, foe) => ctx.applyStatus(me, foe, 'corrode', 1, 'Syrup') } },
  },
  catalyst: {
    chainReaction: { name: 'Chain Reaction', desc: "Catalyst also doubles the enemy's Burn", after: (ctx, me, foe) => { if (foe.status.burn > 0) foe.status.burn *= 2; } },
    volatile:      { name: 'Volatile', desc: "Catalyst also deals half the enemy's Poison as damage", after: (ctx, me, foe) => ctx.damage(me, foe, (foe.status.poison || 0) / 2, { label: 'Volatile', icon: '💥 ' }) },
  },
  fermenter: {
    aged:     { name: 'Aged', desc: 'Poison on the enemy grows by 2 every round', hooks: { roundEnd: (ctx, me, foe) => { if (foe.status.poison > 0) foe.status.poison += 2; } } },
    sourMash: { name: 'Sour Mash', desc: "Each round, heal 25% of the enemy's Poison", hooks: { roundEnd: (ctx, me, foe) => ctx.heal(me, (foe.status.poison || 0) * 0.25, 'Sour Mash') } },
  },
  toxicBloom: {
    sporeBurst: { name: 'Spore Burst', desc: 'Start every battle by applying Poison 5', hooks: { battleStart: (ctx, me, foe) => ctx.applyStatus(me, foe, 'poison', 5, 'Spore Burst') } },
    rot:        { name: 'Rot', desc: 'Poison you apply +25%', passive: (c) => { c.statusAmp.poison = (c.statusAmp.poison || 1) * 1.25; } },
  },

  // ═══ STONE ══════════════════════════════════════════════════════════════
  stoneskin: {
    reinforced: { name: 'Reinforced', desc: 'Start battles with an extra 3× FIRM Membrane', hooks: { battleStart: (ctx, me) => ctx.gainMembrane(me, me.firm * 3, 'Reinforced') } },
    shrapnel:   { name: 'Shrapnel', desc: 'The first time your Membrane breaks, deal 25% of your max Mass to the enemy',
      hooks: { onDamaged: (ctx, me, foe, L, ev) => { if (!me.flags.shrapnel && ev.absorbed > 0 && me.membrane === 0) { me.flags.shrapnel = true; ctx.damage(me, foe, me.maxHp * 0.25, { label: 'Shrapnel', icon: '💥 ' }); } } } },
  },
  harden: {
    spikedShell: { name: 'Spiked Shell', desc: 'Harden also grants Thorns 3', after: (ctx, me) => ctx.applyStatus(me, me, 'thorns', 3, 'Spiked Shell') },
    tortoise:    { name: 'Tortoise', desc: 'Harden also heals half its Membrane', after: (ctx, me, foe, L) => ctx.heal(me, (me.firm + (me.temp.firm || 0)) * [1, 1.5, 2.5, 4][L] * 0.5, 'Tortoise') },
  },
  spikedHide: {
    barbs:      { name: 'Barbs', desc: 'Being hit also applies Bleed 1 to the attacker', hooks: { onDamaged: (ctx, me, foe) => ctx.applyStatus(me, foe, 'bleed', 1, 'Barbs') } },
    ironMaiden: { name: 'Iron Maiden', desc: 'Thorns +50% of your FIRM', hooks: { battleStart: (ctx, me) => ctx.applyStatus(me, me, 'thorns', Math.floor(me.firm / 2), 'Iron Maiden') } },
  },
  bodySlam: {
    heavyweight: { name: 'Heavyweight', desc: 'Body Slam also deals 6% of your max Mass', after: (ctx, me, foe) => ctx.damage(me, foe, me.maxHp * 0.06, { label: 'Heavyweight' }) },
    aftershock:  { name: 'Aftershock', desc: 'Body Slam also Stuns', after: (ctx, me, foe) => ctx.applyStatus(me, foe, 'stun', 1, 'Aftershock') },
  },
  bedrock: {
    monolith:  { name: 'Monolith', desc: 'Your Membrane only half dissolves', passive: (c) => { c.flags.halfMembrane = true; } },
    avalanche: { name: 'Avalanche', desc: 'Hits deal +25% while your Membrane exceeds 5× FIRM', hooks: { beforeAttack: (ctx, me, foe, L, ev) => { if (me.membrane > me.firm * 5) ev.bonusMult *= 1.25; } } },
  },

  // ═══ INSECT ═════════════════════════════════════════════════════════════
  manyLegs: {
    centipede: { name: 'Centipede', desc: 'Basic attacks gain another 50% hit', hooks: { beforeAttack: (ctx, me, foe, L, ev) => { if (ev.basic) ev.hits.push(0.5); } } },
    kickDust:  { name: 'Kick Up Dust', desc: 'Basic attack hits apply Sticky 1', hooks: { onHit: (ctx, me, foe, L, ev) => { if (ev.basic) ctx.applyStatus(me, foe, 'sticky', 1, 'Kick Up Dust'); } } },
  },
  webShot: {
    cocoon:    { name: 'Cocoon', desc: 'Every 2nd Web Shot also Stuns', after: (ctx, me, foe) => { me.temp.webs = (me.temp.webs || 0) + 1; if (me.temp.webs % 2 === 0) ctx.applyStatus(me, foe, 'stun', 1, 'Cocoon'); } },
    silkArmor: { name: 'Silk Armor', desc: 'Web Shot also grants Membrane equal to 2× FIRM', after: (ctx, me) => ctx.gainMembrane(me, me.firm * 2, 'Silk Armor') },
  },
  venomGland: {
    neurotoxin: { name: 'Neurotoxin', desc: 'Hits on an enemy with Poison 20+ apply Weakened 1', hooks: { onHit: (ctx, me, foe) => { if ((foe.status.poison || 0) >= 20) ctx.applyStatus(me, foe, 'weakened', 1, 'Neurotoxin'); } } },
    hemotoxin:  { name: 'Hemotoxin', desc: 'Every hit also applies Bleed 1', hooks: { onHit: (ctx, me, foe) => ctx.applyStatus(me, foe, 'bleed', 1, 'Hemotoxin') } },
  },
  swarming: {
    hiveMind: { name: 'Hive Mind', desc: '+0.15 Tempo every round', hooks: { roundEnd: (ctx, me) => { me.tempo += 0.15; } } },
    stinger:  { name: 'Stinger', desc: 'Your first hit each round applies Poison 3',
      hooks: { onHit: (ctx, me, foe) => { if (me.temp.stingRound !== ctx.round) { me.temp.stingRound = ctx.round; ctx.applyStatus(me, foe, 'poison', 3, 'Stinger'); } } } },
  },

  // ═══ OOZE ═══════════════════════════════════════════════════════════════
  bounce: {
    rebound: { name: 'Rebound', desc: "Bounce's Membrane is doubled", after: (ctx, me, foe, L) => ctx.gainMembrane(me, [3, 6, 12, 20][L], 'Rebound') },
    splat:   { name: 'Splat', desc: 'Bounce also applies Sticky 2 and Softened 1', after: (ctx, me, foe) => { ctx.applyStatus(me, foe, 'sticky', 2, 'Splat'); ctx.applyStatus(me, foe, 'softened', 1, 'Splat'); } },
  },
  gulp: {
    bigGulp:       { name: 'Big Gulp', desc: '+3 more max Mass after each win', run: { onWin: (L, gains) => { gains.maxMass += 3; } } },
    secondStomach: { name: 'Second Stomach', desc: 'Heal 6% max Mass after each win', run: { healAfterWin: 0.06 } },
  },
  jiggle: {
    wobbleBack: { name: 'Wobble Back', desc: 'Dodging heals 3% max Mass', hooks: { onDodge: (ctx, me) => ctx.heal(me, pctMax(me, 0.03), 'Wobble Back') } },
    slippery:   { name: 'Slippery', desc: 'Dodging grants Membrane equal to your SLIP', hooks: { onDodge: (ctx, me) => ctx.gainMembrane(me, me.slip, 'Slippery') } },
  },
  gelPouch: {
    gelArmor: { name: 'Gel Armor', desc: 'Start battles with Membrane equal to Gel held ÷ 5', hooks: { battleStart: (ctx, me) => ctx.gainMembrane(me, (me.gel || 0) / 5, 'Gel Armor') } },
    interest: { name: 'Interest', desc: '+5% of your Gel after each win (up to 30)', run: { onWin: (L, gains, run) => { gains.gel += Math.min(30, Math.floor(run.gel * 0.05)); } } },
  },
  acidSplash: {
    dissolve: { name: 'Dissolve', desc: "Acid Splash also halves the enemy's Membrane", after: (ctx, me, foe) => { foe.membrane = Math.floor(foe.membrane / 2); } },
    acidBath: { name: 'Acid Bath', desc: 'Basic attack hits apply Corrode 1', hooks: { onHit: (ctx, me, foe, L, ev) => { if (ev.basic) ctx.applyStatus(me, foe, 'corrode', 1, 'Acid Bath'); } } },
  },
  overeater: {
    foodComa: { name: 'Food Coma', desc: 'Start battles by healing 10% max Mass', hooks: { battleStart: (ctx, me) => ctx.heal(me, pctMax(me, 0.1), 'Food Coma') } },
    gourmand: { name: 'Gourmand', desc: '+1 FIRM per 40 max Mass', passive: (c) => { c.firm += Math.floor(c.maxHp / 40); } },
  },

  // ═══ SPIRIT ═════════════════════════════════════════════════════════════
  resurrect: {
    phoenix:   { name: 'Phoenix', desc: 'When you resurrect, deal 30% of your max Mass to the enemy',
      hooks: { onLethal: (ctx, me, foe) => { if (me.flags.resurrected && !me.flags.phoenix) { me.flags.phoenix = true; ctx.damage(me, foe, me.maxHp * 0.3, { label: 'Phoenix', icon: '🔥 ' }); } } } },
    twiceBorn: { name: 'Twice Born', desc: 'Resurrect a second time each battle (at 25%)',
      hooks: { onLethal: (ctx, me, foe, L, ev) => { if (!ev.saved && me.flags.resurrected && !me.flags.twice) { me.flags.twice = true; me.hp = pctMax(me, 0.25); ev.saved = true; ctx.log(`🧚 ${me.name} rises again!`, { tone: 'good' }); } } } },
  },
  glimmer: {
    dazzle:     { name: 'Dazzle', desc: 'Dodging applies Weakened 1 to the attacker', hooks: { onDodge: (ctx, me, foe) => ctx.applyStatus(me, foe, 'weakened', 1, 'Dazzle') } },
    afterimage: { name: 'Afterimage', desc: 'Dodging counterattacks for 60%', hooks: { onDodge: (ctx, me, foe) => ctx.attack(me, foe, { mult: 0.6, label: 'Afterimage' }) } },
  },
  wail: {
    banshee: { name: 'Banshee', desc: 'Ghastly Wail also applies Softened 2', after: (ctx, me, foe) => ctx.applyStatus(me, foe, 'softened', 2, 'Banshee') },
    haunt:   { name: 'Haunt', desc: 'Hits deal +30% to an enemy that was stunned recently', hooks: { beforeAttack: (ctx, me, foe, L, ev) => { if (foe.status.stunResist > 0 || foe.status.stun > 0) ev.bonusMult *= 1.3; } } },
  },
  pyrolyze: {
    inferno:    { name: 'Inferno', desc: 'Hits deal +25% to an enemy with Burn 15+', hooks: { beforeAttack: (ctx, me, foe, L, ev) => { if ((foe.status.burn || 0) >= 15) ev.bonusMult *= 1.25; } } },
    cauterize:  { name: 'Cauterize', desc: "Each round, heal 30% of the enemy's Burn", hooks: { roundEnd: (ctx, me, foe) => ctx.heal(me, (foe.status.burn || 0) * 0.3, 'Cauterize') } },
  },
  kindling: {
    blaze: { name: 'Blaze', desc: 'Burn you apply +30%', passive: (c) => { c.statusAmp.burn = (c.statusAmp.burn || 1) * 1.3; } },
    smoke: { name: 'Smoke', desc: 'Hits on a Burning enemy apply Weakened 1', hooks: { onHit: (ctx, me, foe) => { if ((foe.status.burn || 0) > 0) ctx.applyStatus(me, foe, 'weakened', 1, 'Smoke'); } } },
  },

  // ═══ SKY ════════════════════════════════════════════════════════════════
  diveBomb: {
    talons:  { name: 'Talons', desc: 'Dive Bomb also applies Bleed 3', after: (ctx, me, foe) => ctx.applyStatus(me, foe, 'bleed', 3, 'Talons') },
    updraft: { name: 'Updraft', desc: 'Dive Bomb also grants +0.5 Tempo', after: (ctx, me) => { me.tempo += 0.5; } },
  },
  staticCharge: {
    capacitor: { name: 'Capacitor', desc: 'Discharges every 3 actions instead of 5', passive: (c) => { c.flags.staticAt = 3; } },
    arc:       { name: 'Arc', desc: 'Discharges also Stun', passive: (c) => { c.flags.arcStun = true; } },
  },
  momentum: {
    gatherSpeed: { name: 'Gather Speed', desc: 'Every action grants +0.05 Tempo', hooks: { onAction: (ctx, me) => { me.tempo += 0.05; } } },
    impact:      { name: 'Impact', desc: 'Every 8th action deals 300% FIRM',
      hooks: { onAction: (ctx, me, foe) => { me.temp.impact = (me.temp.impact || 0) + 1; if (me.temp.impact % 8 === 0) ctx.attack(me, foe, { mult: 3, label: 'Impact' }); } } },
  },
  undertow: {
    riptide: { name: 'Riptide', desc: 'Start battles by applying Slowed 2', hooks: { battleStart: (ctx, me, foe) => ctx.applyStatus(me, foe, 'slowed', 2, 'Riptide') } },
    tidal:   { name: 'Tidal', desc: 'Start battles with +1 Tempo', passive: (c) => { c.tempo += 1; } },
  },

  // ═══ VOID ═══════════════════════════════════════════════════════════════
  voidTouch: {
    unmake:    { name: 'Unmake', desc: 'Every hit applies Corrode 1', hooks: { onHit: (ctx, me, foe) => ctx.applyStatus(me, foe, 'corrode', 1, 'Unmake') } },
    nullField: { name: 'Null Field', desc: 'The enemy gains half as much Membrane', hooks: { battleStart: (ctx, me, foe) => { foe.membraneMult *= 0.5; } } },
  },
  consume: {
    ravenous:      { name: 'Ravenous', desc: "Consume's cap is doubled", passive: (c) => { c.flags.consumeCapMult = 2; } },
    absorbEssence: { name: 'Absorb Essence', desc: 'Consume also grants +1 SLIP per hit (same cap)', passive: (c) => { c.flags.consumeSlip = true; } },
  },
  hollowGaze: {
    despair:   { name: 'Despair', desc: 'The enemy deals 15% less damage', hooks: { battleStart: (ctx, me, foe) => { foe.damageDealtMult *= 0.85; } } },
    voidStare: { name: 'Void Stare', desc: 'Start battles by applying Softened 3', hooks: { battleStart: (ctx, me, foe) => ctx.applyStatus(me, foe, 'softened', 3, 'Void Stare') } },
  },

  // ═══ CONSTRUCT ══════════════════════════════════════════════════════════
  plating: {
    riveted:   { name: 'Riveted', desc: 'Also gain Thorns equal to a third of your FIRM', hooks: { battleStart: (ctx, me) => ctx.applyStatus(me, me, 'thorns', Math.floor(me.firm / 3), 'Riveted') } },
    overplate: { name: 'Overplate', desc: 'All Membrane you gain +25%', passive: (c) => { c.membraneMult *= 1.25; } },
  },
  overclock: {
    turbo:    { name: 'Turbo', desc: 'Your first Action each battle triggers twice', passive: (c) => { c.flags.echoFirst = true; } },
    heatSink: { name: 'Heat Sink', desc: 'Every action heals 2% max Mass', hooks: { onAction: (ctx, me) => ctx.heal(me, pctMax(me, 0.02), 'Heat Sink') } },
  },
};

/** Mutations any essence of a matching type can take. */
export const GENERIC_MUTATIONS = {
  empowered: { name: 'Empowered', desc: 'Counts as one level higher', mod: { levelUp: 1 }, types: ['action', 'reflex', 'trait'] },
  quickened: { name: 'Quickened', desc: 'Cooldown −1', mod: { cd: -1 }, types: ['action'] },
  twinned:   { name: 'Twinned', desc: 'Fires twice every time', mod: { twice: 1 }, types: ['action'], minLevel: 2 },
  opener:    { name: 'Opener', desc: 'Also fires once at the start of every battle', mod: { opener: true }, types: ['action'] },
  echoing:   { name: 'Echoing', desc: 'Triggers twice', mod: { repeat: 1 }, types: ['reflex'] },
  attuned:   { name: 'Attuned', desc: "Its tags count double for tag bonuses and offers", mod: { attune: 1 }, types: ['action', 'reflex', 'trait'] },
};

/** Resolve a mutation id ("pounce.rending" or "generic.empowered"). */
export function mutationDef(key) {
  const [scope, id] = key.split('.');
  return scope === 'generic' ? GENERIC_MUTATIONS[id] : MUTATIONS[scope]?.[id];
}
