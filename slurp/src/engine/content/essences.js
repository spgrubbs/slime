// ─────────────────────────────────────────────────────────────────────────────
// Essences — everything a slime can absorb, and everything enemies are built from
//
// Level index L: 0 = I (1 copy), 1 = II (3 copies), 2 = III (6 copies), 3 = Apex.
// Hook signature: (ctx, me, foe, L, ev). `passive(c, L)` runs when the
// combatant is built. `run` holds effects that live outside battle.
//
// Types: stat / element (slotless, every copy stacks) and action / reflex /
// trait / keystone (slotted, copies fuse into levels).
// ─────────────────────────────────────────────────────────────────────────────

const v = (arr, L) => arr[Math.min(L, arr.length - 1)];
const pct = (x) => `${Math.round(x * 100)}%`;
const visc = (c, k) => Math.floor(c.visc * k);

export const ESSENCES = {
  // ═══ STAT ═══════════════════════════════════════════════════════════════
  leanMuscle:  { name: 'Lean Muscle',  icon: '🦵', type: 'stat', rarity: 'common', stats: { slip: 2 } },
  grit:        { name: 'Grit',         icon: '🪨', type: 'stat', rarity: 'common', stats: { firm: 2 } },
  thickHide:   { name: 'Thick Hide',   icon: '🐗', type: 'stat', rarity: 'common', stats: { mass: 10 } },
  tailwind:    { name: 'Tailwind',     icon: '🌬️', type: 'stat', rarity: 'common', stats: { slip: 3 } },
  servo:       { name: 'Servo',        icon: '⚙️', type: 'stat', rarity: 'common', stats: { firm: 2, slip: 1 } },
  focusGland:  { name: 'Focus Gland',  icon: '🧠', type: 'stat', rarity: 'common', stats: { visc: 2 } },
  heartyCore:  { name: 'Hearty Core',  icon: '❤️', type: 'stat', rarity: 'uncommon', stats: { mass: 18, firm: 1 } },

  // ═══ ELEMENT ════════════════════════════════════════════════════════════
  chlorophyll: { name: 'Chlorophyll', icon: '🍃', type: 'element', rarity: 'common', affinity: { nature: 2 }, stats: { visc: 1 } },
  earthite:    { name: 'Earthite',    icon: '🟫', type: 'element', rarity: 'common', affinity: { earth: 2 }, stats: { mass: 6 } },
  emberCore:   { name: 'Ember Core',  icon: '🔥', type: 'element', rarity: 'common', affinity: { fire: 2 }, stats: { firm: 1 } },
  tidepool:    { name: 'Tidepool',    icon: '💧', type: 'element', rarity: 'common', affinity: { water: 2 }, stats: { slip: 1 } },

  // ═══ BEAST ══════════════════════════════════════════════════════════════
  fangs: {
    name: 'Fangs', icon: '🦷', type: 'trait', family: 'beast', rarity: 'common', socket: 'mouth',
    desc: (L) => `+${pct(v([0.1, 0.16, 0.25, 0.35], L))} crit chance${L >= 2 ? '. Crits apply Bleed 2' : ''}`,
    passive: (c, L) => { c.critChance += v([0.1, 0.16, 0.25, 0.35], L); },
    hooks: { onCrit: (ctx, me, foe, L) => { if (L >= 2) ctx.applyStatus(me, foe, 'bleed', 2, 'Fangs'); } },
  },
  pounce: {
    name: 'Pounce', evolved: 'Rending Pounce', icon: '🐺', type: 'action', family: 'beast', rarity: 'common', cd: 3, socket: 'crown',
    desc: (L) => `CD 3: ${pct(v([1.5, 2, 3, 4], L))} FIRM hit + Bleed ${v([2, 3, 5, 8], L)}${L >= 2 ? ' + Softened 1' : ''}`,
    hooks: {
      action: (ctx, me, foe, L) => {
        const d = ctx.attack(me, foe, { mult: v([1.5, 2, 3, 4], L), label: 'Pounce' });
        if (d > 0) ctx.applyStatus(me, foe, 'bleed', v([2, 3, 5, 8], L) + visc(me, 0.1), 'Pounce');
        if (L >= 2) ctx.applyStatus(me, foe, 'softened', 1, 'Pounce');
      },
    },
  },
  bloodthirst: {
    name: 'Bloodthirst', icon: '🦇', type: 'trait', family: 'beast', rarity: 'uncommon', socket: 'back',
    desc: (L) => `Lifesteal ${pct(v([0.1, 0.16, 0.25, 0.35], L))}`,
    passive: (c, L) => { c.lifesteal += v([0.1, 0.16, 0.25, 0.35], L); },
  },
  feralInstinct: {
    name: 'Feral Instinct', icon: '😤', type: 'reflex', family: 'beast', rarity: 'common', socket: 'brow',
    desc: (L) => `First time below 50% Mass: Enraged ${v([2, 3, 4, 6], L)} rounds (+50% damage)`,
    hooks: { onLowHp: (ctx, me, foe, L) => ctx.applyStatus(me, me, 'enraged', v([2, 3, 4, 6], L), 'Feral Instinct') },
  },
  chainCrit: {
    name: 'Chain Crit', icon: '⛓️', type: 'trait', family: 'beast', rarity: 'rare', socket: 'tail',
    desc: (L) => `Every crit makes an extra attack for ${pct(v([0.5, 0.6, 0.8, 1], L))} FIRM (can chain)`,
    hooks: { onCrit: (ctx, me, foe, L) => ctx.attack(me, foe, { mult: v([0.5, 0.6, 0.8, 1], L), label: 'Chain Crit' }) },
  },

  // ═══ FLORA ══════════════════════════════════════════════════════════════
  photosynthesis: {
    name: 'Photosynthesis', icon: '🌱', type: 'trait', family: 'flora', element: 'nature', rarity: 'common', socket: 'crown',
    desc: (L) => `Heal ${v([2, 3, 5, 8], L)} + 30% VISC at the start of each turn`,
    hooks: { turnStart: (ctx, me, foe, L) => ctx.heal(me, v([2, 3, 5, 8], L) + visc(me, 0.3), 'Photosynthesis') },
  },
  devour: {
    name: 'Devour', icon: '😋', type: 'action', family: 'flora', rarity: 'uncommon', cd: 4, socket: 'mouth',
    desc: (L) => `CD 4: if the enemy is below ${pct(v([0.25, 0.3, 0.35, 0.45], L))} Mass, swallow it whole (Devour kill: absorb 2). Otherwise a 100% hit`,
    hooks: {
      action: (ctx, me, foe, L) => {
        if (foe.hp <= foe.maxHp * (v([0.25, 0.3, 0.35, 0.45], L) + (me.flags.devourBonus || 0))) {
          ctx.devoured = true;
          ctx.damage(me, foe, foe.hp, { label: 'DEVOUR', trueDmg: true, icon: '😋 ' });
        } else ctx.attack(me, foe, { mult: 1, label: 'Devour' });
      },
    },
  },
  sporeCloud: {
    name: 'Spore Cloud', icon: '🍄', type: 'action', family: 'flora', rarity: 'common', cd: 3, socket: 'crown',
    desc: (L) => `CD 3: Poison ${v([3, 5, 8, 12], L)} + 30% VISC and Weakened 1`,
    hooks: {
      action: (ctx, me, foe, L) => {
        ctx.applyStatus(me, foe, 'poison', v([3, 5, 8, 12], L) + visc(me, 0.3), 'Spore Cloud');
        ctx.applyStatus(me, foe, 'weakened', 1, 'Spore Cloud');
      },
    },
  },
  sapSpray: {
    name: 'Sap Spray', icon: '🍯', type: 'reflex', family: 'flora', rarity: 'common', socket: 'left',
    desc: (L) => `When hit: give the attacker Sticky ${v([1, 2, 3, 4], L)} and Poison ${v([1, 1, 2, 3], L)}`,
    hooks: {
      onDamaged: (ctx, me, foe, L) => {
        ctx.applyStatus(me, foe, 'sticky', v([1, 2, 3, 4], L), 'Sap Spray');
        ctx.applyStatus(me, foe, 'poison', v([1, 1, 2, 3], L), 'Sap Spray');
      },
    },
  },
  catalyst: {
    name: 'Catalyst', icon: '⚗️', type: 'action', family: 'flora', rarity: 'rare', cd: 4, socket: 'right',
    desc: (L) => `CD 4: multiply the enemy's Poison by ${v([2, 2, 3, 4], L)}`,
    hooks: {
      action: (ctx, me, foe, L) => {
        const p = foe.status.poison || 0;
        if (p > 0) ctx.applyStatus(me, foe, 'poison', p * (v([2, 2, 3, 4], L) - 1) / ((me.statusAmp.poison || 1) * (me.statusAmp.all || 1)), 'Catalyst');
        else ctx.applyStatus(me, foe, 'poison', 3, 'Catalyst');
      },
    },
  },
  fermenter: {
    name: 'Fermenter', icon: '🫙', type: 'trait', family: 'flora', rarity: 'rare', socket: 'base',
    desc: (L) => `Poison on the enemy no longer decays${L >= 1 ? `. +${pct(v([0, 0.25, 0.5, 1], L))} Poison applied` : ''}`,
    passive: (c, L) => { c.statusAmp.poison = (c.statusAmp.poison || 1) * (1 + v([0, 0.25, 0.5, 1], L)); },
    hooks: { battleStart: (ctx, me, foe) => { foe.flags.poisonNoDecay = true; } },
  },

  // ═══ STONE ══════════════════════════════════════════════════════════════
  stoneskin: {
    name: 'Stoneskin', evolved: 'Granite Hide', icon: '🧱', type: 'trait', family: 'stone', element: 'earth', rarity: 'common', socket: 'back',
    desc: (L) => `Start each battle with ${pct(v([0.15, 0.25, 0.4, 0.6], L))} of max Mass as Membrane`,
    hooks: { battleStart: (ctx, me, foe, L) => ctx.gainMembrane(me, me.maxHp * v([0.15, 0.25, 0.4, 0.6], L), 'Stoneskin') },
  },
  harden: {
    name: 'Harden', icon: '🛡️', type: 'action', family: 'stone', rarity: 'common', cd: 2, socket: 'left',
    desc: (L) => `CD 2: gain Membrane equal to ${pct(v([1, 1.5, 2.5, 4], L))} FIRM`,
    hooks: { action: (ctx, me, foe, L) => ctx.gainMembrane(me, (me.firm + (me.temp.firm || 0)) * v([1, 1.5, 2.5, 4], L), 'Harden') },
  },
  spikedHide: {
    name: 'Spiked Hide', icon: '🌵', type: 'trait', family: 'stone', rarity: 'common', socket: 'right',
    desc: (L) => `Thorns ${v([2, 4, 7, 12], L)}: attackers lose Mass whenever they hit you`,
    hooks: { battleStart: (ctx, me, foe, L) => ctx.applyStatus(me, me, 'thorns', v([2, 4, 7, 12], L), 'Spiked Hide') },
  },
  bodySlam: {
    name: 'Body Slam', icon: '🫃', type: 'action', family: 'stone', rarity: 'rare', cd: 3, socket: 'base',
    desc: (L) => `CD 3: hit for 50% FIRM + ${pct(v([0.1, 0.15, 0.25, 0.35], L))} of your current Mass`,
    hooks: { action: (ctx, me, foe, L) => ctx.attack(me, foe, { mult: 0.5, flat: me.hp * v([0.1, 0.15, 0.25, 0.35], L), label: 'Body Slam' }) },
  },

  // ═══ INSECT ═════════════════════════════════════════════════════════════
  manyLegs: {
    name: 'Many Legs', icon: '🦗', type: 'trait', family: 'insect', rarity: 'common', socket: 'base',
    desc: (L) => `Basic attacks hit twice for ${pct(v([0.6, 0.7, 0.85, 1], L))} each`,
    hooks: { beforeAttack: (ctx, me, foe, L, ev) => { if (ev.basic) { const m = v([0.6, 0.7, 0.85, 1], L); ev.hits = [m, m, ...ev.hits.slice(1)]; } } },
  },
  webShot: {
    name: 'Web Shot', icon: '🕸️', type: 'action', family: 'insect', element: 'nature', rarity: 'common', cd: 3, socket: 'tail',
    desc: (L) => `CD 3: 100% hit, Slowed 2 and Sticky ${v([2, 3, 5, 8], L)}`,
    hooks: {
      action: (ctx, me, foe, L) => {
        ctx.attack(me, foe, { mult: 1, label: 'Web Shot' });
        ctx.applyStatus(me, foe, 'slowed', 2, 'Web Shot');
        ctx.applyStatus(me, foe, 'sticky', v([2, 3, 5, 8], L), 'Web Shot');
      },
    },
  },
  venomGland: {
    name: 'Venom Gland', icon: '🦂', type: 'reflex', family: 'insect', rarity: 'common', socket: 'mouth',
    desc: (L) => `Every hit applies Poison ${v([1, 2, 3, 5], L)} + 10% VISC`,
    hooks: { onHit: (ctx, me, foe, L) => ctx.applyStatus(me, foe, 'poison', v([1, 2, 3, 5], L) + visc(me, 0.1), 'Venom Gland') },
  },
  swarming: {
    name: 'Swarming', icon: '🐝', type: 'trait', family: 'insect', rarity: 'uncommon', socket: 'back',
    desc: (L) => `Start each battle with ${v([0.5, 0.8, 1.2, 1.6], L)} Tempo (an early extra action)`,
    passive: (c, L) => { c.tempo += v([0.5, 0.8, 1.2, 1.6], L); },
  },

  // ═══ OOZE ═══════════════════════════════════════════════════════════════
  bounce: {
    name: 'Bounce', icon: '🟢', type: 'action', family: 'ooze', rarity: 'common', cd: 3, socket: 'base',
    desc: (L) => `CD 3: ${pct(v([1.6, 2.1, 3, 4], L))} FIRM hit and gain ${v([3, 6, 12, 20], L)} Membrane`,
    hooks: {
      action: (ctx, me, foe, L) => {
        ctx.attack(me, foe, { mult: v([1.6, 2.1, 3, 4], L), label: 'Bounce' });
        ctx.gainMembrane(me, v([3, 6, 12, 20], L), 'Bounce');
      },
    },
  },
  gulp: {
    name: 'Gulp', icon: '🫦', type: 'reflex', family: 'ooze', rarity: 'common', socket: 'mouth',
    desc: (L) => `After each win: +${v([2, 3, 5, 8], L)} max Mass for the rest of the run`,
    run: { onWin: (L, gains) => { gains.maxMass += v([2, 3, 5, 8], L); } },
  },
  jiggle: {
    name: 'Jiggle', icon: '🍮', type: 'trait', family: 'ooze', rarity: 'common', socket: 'base',
    desc: (L) => `+${pct(v([0.08, 0.12, 0.18, 0.25], L))} dodge`,
    passive: (c, L) => { c.dodge += v([0.08, 0.12, 0.18, 0.25], L); },
  },
  gelPouch: {
    name: 'Gel Pouch', icon: '👝', type: 'trait', family: 'ooze', rarity: 'common', socket: 'left',
    desc: (L) => `+${v([8, 12, 20, 30], L)} Gel after each win`,
    run: { onWin: (L, gains) => { gains.gel += v([8, 12, 20, 30], L); } },
  },
  acidSplash: {
    name: 'Acid Splash', icon: '🧪', type: 'action', family: 'ooze', rarity: 'common', cd: 3, socket: 'right',
    desc: (L) => `CD 3: 80% hit and Corrode ${v([2, 3, 5, 8], L)} (−FIRM for the battle)`,
    hooks: {
      action: (ctx, me, foe, L) => {
        ctx.attack(me, foe, { mult: 0.8, label: 'Acid Splash' });
        ctx.applyStatus(me, foe, 'corrode', v([2, 3, 5, 8], L), 'Acid Splash');
      },
    },
  },
  overeater: {
    name: 'Overeater', icon: '🍩', type: 'trait', family: 'ooze', rarity: 'rare', socket: 'base',
    desc: (L) => `Overhealing raises max Mass by ${pct(v([0.5, 0.75, 1, 1.5], L))} of the excess (this battle), and ${v([1, 2, 3, 5], L)} of it stays for the run per win`,
    passive: (c, L) => { c.overhealFns.push((ctx, me, over) => { const g = Math.floor(over * v([0.5, 0.75, 1, 1.5], L)); me.maxHp += g; me.hp += g; }); },
    run: { onWin: (L, gains) => { gains.maxMass += v([1, 2, 3, 5], L); } },
  },

  // ═══ SPIRIT ═════════════════════════════════════════════════════════════
  resurrect: {
    name: 'Resurrect', icon: '🧚', type: 'reflex', family: 'spirit', element: 'nature', rarity: 'uncommon', socket: 'back',
    desc: (L) => `Once per battle, a lethal blow leaves you at ${pct(v([0.25, 0.35, 0.5, 0.7], L))} Mass instead`,
    hooks: {
      onLethal: (ctx, me, foe, L, ev) => {
        if (me.flags.resurrected) return;
        me.flags.resurrected = true;
        me.hp = Math.max(1, Math.floor(me.maxHp * v([0.25, 0.35, 0.5, 0.7], L)));
        ev.saved = true;
        ctx.log(`🧚 ${me.name} refuses to die!`, { tone: 'good' });
      },
    },
  },
  glimmer: {
    name: 'Glimmer', icon: '✨', type: 'trait', family: 'spirit', rarity: 'common', socket: 'eyes',
    desc: (L) => `+${pct(v([0.1, 0.15, 0.22, 0.3], L))} dodge`,
    passive: (c, L) => { c.dodge += v([0.1, 0.15, 0.22, 0.3], L); },
  },
  wail: {
    name: 'Ghastly Wail', icon: '👻', type: 'action', family: 'spirit', rarity: 'uncommon', cd: 4, socket: 'mouth',
    desc: (L) => `CD 4: ${pct(v([0.6, 0.8, 1.2, 1.6], L))} hit and Stun (the enemy loses its next action)`,
    hooks: {
      action: (ctx, me, foe, L) => {
        ctx.attack(me, foe, { mult: v([0.6, 0.8, 1.2, 1.6], L), label: 'Ghastly Wail' });
        ctx.applyStatus(me, foe, 'stun', 1, 'Ghastly Wail');
      },
    },
  },
  pyrolyze: {
    name: 'Pyrolyze', icon: '🔥', type: 'reflex', family: 'spirit', element: 'fire', rarity: 'common', socket: 'crown',
    desc: (L) => `Every hit applies Burn ${v([2, 3, 5, 8], L)} + 20% VISC`,
    hooks: { onHit: (ctx, me, foe, L) => ctx.applyStatus(me, foe, 'burn', v([2, 3, 5, 8], L) + visc(me, 0.2), 'Pyrolyze') },
  },

  // ═══ SKY ════════════════════════════════════════════════════════════════
  diveBomb: {
    name: 'Dive Bomb', icon: '🦅', type: 'action', family: 'sky', rarity: 'common', cd: 2, socket: 'back',
    desc: (L) => `CD 2: ${pct(v([1.2, 1.6, 2.4, 3.2], L))} FIRM hit`,
    hooks: { action: (ctx, me, foe, L) => ctx.attack(me, foe, { mult: v([1.2, 1.6, 2.4, 3.2], L), label: 'Dive Bomb' }) },
  },
  staticCharge: {
    name: 'Static', icon: '⚡', type: 'trait', family: 'sky', element: 'water', rarity: 'uncommon', socket: 'crown',
    desc: (L) => `Every action adds a charge. At 5 charges, discharge for ${pct(v([2, 3, 5, 7], L))} FIRM`,
    hooks: {
      onAction: (ctx, me, foe, L) => {
        me.temp.static = (me.temp.static || 0) + 1;
        if (me.temp.static >= (me.flags.staticAt || 5)) {
          me.temp.static = 0;
          ctx.attack(me, foe, { mult: v([2, 3, 5, 7], L), label: 'Static Discharge' });
          if (me.flags.arcStun) ctx.applyStatus(me, foe, 'stun', 1, 'Arc');
        }
      },
    },
  },
  momentum: {
    name: 'Momentum', icon: '🌀', type: 'trait', family: 'sky', rarity: 'rare', socket: 'tail',
    desc: (L) => `+${pct(v([0.05, 0.08, 0.12, 0.16], L))} damage per action taken this battle (stacks without limit)`,
    hooks: {
      onAction: (ctx, me) => { me.temp.momentum = (me.temp.momentum || 0) + 1; },
      beforeAttack: (ctx, me, foe, L, ev) => { ev.bonusMult *= 1 + (me.temp.momentum || 0) * v([0.05, 0.08, 0.12, 0.16], L); },
    },
  },

  // ═══ VOID ═══════════════════════════════════════════════════════════════
  voidTouch: {
    name: 'Void Touch', icon: '🕳️', type: 'trait', family: 'void', rarity: 'uncommon', socket: 'left',
    desc: (L) => `${pct(v([0.15, 0.25, 0.4, 0.6], L))} of hit damage is true damage (ignores Membrane)`,
    passive: (c, L) => { c.trueDmgPct += v([0.15, 0.25, 0.4, 0.6], L); },
  },
  consume: {
    name: 'Consume', icon: '🦑', type: 'reflex', family: 'void', rarity: 'rare', socket: 'tail',
    desc: (L) => `Every hit grants +1 FIRM for the battle (up to +${v([10, 20, 40, 80], L)})`,
    hooks: {
      onHit: (ctx, me, foe, L) => {
        const cap = v([10, 20, 40, 80], L) * (me.flags.consumeCapMult || 1);
        if ((me.temp.firm || 0) < cap) me.temp.firm = (me.temp.firm || 0) + 1;
        if (me.flags.consumeSlip && (me.temp.slip || 0) < cap) me.temp.slip = (me.temp.slip || 0) + 1;
      },
    },
  },
  hollowGaze: {
    name: 'Hollow Gaze', icon: '👁️', type: 'trait', family: 'void', rarity: 'uncommon', socket: 'eyes',
    desc: (L) => `The enemy heals ${pct(v([0.5, 0.7, 1, 1], L))} less${L >= 3 ? ' and takes +15% damage' : ''}`,
    hooks: {
      battleStart: (ctx, me, foe, L) => {
        foe.healMult *= 1 - v([0.5, 0.7, 1, 1], L);
        if (L >= 3) foe.damageTakenMult *= 1.15;
      },
    },
  },

  // ═══ TAG SYNERGY — scale with how many of a tag you carry ═══════════════
  kindling: {
    name: 'Kindling', icon: '🪵', type: 'trait', family: 'spirit', element: 'fire', rarity: 'uncommon', socket: 'right',
    desc: (L) => `+${pct(v([0.06, 0.09, 0.14, 0.2], L))} hit damage per 🔥 Fire tag you have`,
    hooks: { beforeAttack: (ctx, me, foe, L, ev) => { ev.bonusMult *= 1 + v([0.06, 0.09, 0.14, 0.2], L) * (me.tags.fire || 0); } },
  },
  toxicBloom: {
    name: 'Toxic Bloom', icon: '🌺', type: 'trait', family: 'flora', element: 'nature', rarity: 'uncommon', socket: 'crown',
    desc: (L) => `Poison you apply +${pct(v([0.1, 0.15, 0.22, 0.3], L))} per 🧪 Poison tag you have`,
    passive: (c, L) => { c.statusAmp.poison = (c.statusAmp.poison || 1) * (1 + v([0.1, 0.15, 0.22, 0.3], L) * (c.tags.poison || 0)); },
  },
  bedrock: {
    name: 'Bedrock', icon: '🏔️', type: 'trait', family: 'stone', element: 'earth', rarity: 'uncommon', socket: 'base',
    desc: (L) => `Membrane you gain +${pct(v([0.1, 0.15, 0.22, 0.3], L))} per 🛡️ Membrane tag you have`,
    passive: (c, L) => { c.membraneMult *= 1 + v([0.1, 0.15, 0.22, 0.3], L) * (c.tags.membrane || 0); },
  },
  undertow: {
    name: 'Undertow', icon: '🌊', type: 'trait', family: 'sky', element: 'water', rarity: 'uncommon', socket: 'tail',
    desc: (L) => `+${v([1, 2, 3, 4], L)} SLIP per 💧 Water tag you have`,
    passive: (c, L) => { c.slip += v([1, 2, 3, 4], L) * (c.tags.water || 0); },
  },
  packTactics: {
    name: 'Pack Tactics', icon: '🐾', type: 'trait', family: 'beast', rarity: 'uncommon', socket: 'brow',
    desc: (L) => `+${pct(v([0.03, 0.04, 0.06, 0.08], L))} crit chance per 🐾 Beast tag you have`,
    passive: (c, L) => { c.critChance += v([0.03, 0.04, 0.06, 0.08], L) * (c.tags.beast || 0); },
  },
  bloodletting: {
    name: 'Bloodletting', icon: '🩸', type: 'trait', family: 'beast', rarity: 'uncommon', socket: 'left',
    desc: (L) => `Bleed you apply +${pct(v([0.12, 0.18, 0.26, 0.35], L))} per 🩸 Bleed tag you have`,
    passive: (c, L) => { c.statusAmp.bleed = (c.statusAmp.bleed || 1) * (1 + v([0.12, 0.18, 0.26, 0.35], L) * (c.tags.bleed || 0)); },
  },

  // ═══ CONSTRUCT ══════════════════════════════════════════════════════════
  plating: {
    name: 'Plating', icon: '🔩', type: 'trait', family: 'construct', rarity: 'common', socket: 'back',
    desc: (L) => `Start each battle with Membrane equal to ${pct(v([2, 3, 5, 8], L))} FIRM`,
    hooks: { battleStart: (ctx, me, foe, L) => ctx.gainMembrane(me, me.firm * v([2, 3, 5, 8], L), 'Plating') },
  },
  overclock: {
    name: 'Overclock', icon: '🔧', type: 'trait', family: 'construct', rarity: 'uncommon', socket: 'brow',
    desc: (L) => `Action cooldowns −${v([1, 1, 2, 3], L)} (minimum 1)`,
    passive: (c, L) => { c.cdReduction += v([1, 1, 2, 3], L); },
  },

  // ═══ KEYSTONES (bosses and rare elites) ═════════════════════════════════
  carnivoresMaw: {
    name: "Carnivore's Maw", icon: '🦖', type: 'keystone', family: 'flora', rarity: 'keystone', socket: 'mouth',
    desc: () => 'Absorb 2 essences after every win instead of 1',
    run: { absorbPicks: 1 },
  },
  perennial: {
    name: 'Perennial', icon: '🌳', type: 'keystone', family: 'flora', rarity: 'keystone', socket: 'crown',
    desc: () => 'All your healing is doubled',
    passive: (c) => { c.healMult *= 2; },
  },
  strangler: {
    name: 'Strangling Vines', icon: '🪢', type: 'keystone', family: 'flora', rarity: 'keystone', socket: 'tail',
    desc: () => 'Every status you apply is 50% stronger',
    passive: (c) => { c.statusAmp.all = (c.statusAmp.all || 1) * 1.5; },
  },
  draconicHeart: {
    name: 'Draconic Heart', icon: '🐉', type: 'keystone', family: 'beast', rarity: 'keystone', socket: 'crown',
    desc: () => 'All stats +25%',
    passive: (c) => {
      c.firm = Math.floor(c.firm * 1.25); c.slip = Math.floor(c.slip * 1.25); c.visc = Math.floor(c.visc * 1.25);
      c.maxHp = Math.floor(c.maxHp * 1.25); c.hp = Math.floor(c.hp * 1.25);
    },
  },
  emberSoul: {
    name: 'Ember Soul', icon: '🌋', type: 'keystone', family: 'spirit', element: 'fire', rarity: 'keystone', socket: 'base',
    desc: () => 'Burn on the enemy never decays',
    hooks: { battleStart: (ctx, me, foe) => { foe.flags.burnNoDecay = true; } },
  },
  hoard: {
    name: 'Hoard', icon: '💰', type: 'keystone', family: 'beast', rarity: 'keystone', socket: 'right',
    desc: () => 'Your hits deal +1 damage per 10 Gel you hold',
    hooks: { beforeAttack: (ctx, me, foe, L, ev) => { ev.flat += Math.floor((me.gel || 0) / 10); } },
  },
  graniteShell: {
    name: 'Granite Shell', icon: '🗿', type: 'keystone', family: 'stone', rarity: 'keystone', socket: 'back',
    desc: () => 'Your Membrane never dissolves',
    passive: (c) => { c.flags.retainMembrane = true; },
  },
  echoChamber: {
    name: 'Echo Chamber', icon: '📣', type: 'keystone', family: 'construct', rarity: 'keystone', socket: 'brow',
    desc: () => 'Every Action triggers twice',
    passive: (c) => { c.flags.echoActions = (c.flags.echoActions || 0) + 1; },
  },
  eyeOfStorm: {
    name: 'Eye of the Storm', icon: '🌪️', type: 'keystone', family: 'sky', rarity: 'keystone', socket: 'eyes',
    desc: () => '+1 action every round; −20% max Mass',
    passive: (c) => {
      c.flags.bonusActions = (c.flags.bonusActions || 0) + 1;
      c.maxHp = Math.floor(c.maxHp * 0.8); c.hp = Math.min(c.hp, c.maxHp);
    },
  },
  lightningRod: {
    name: 'Lightning Rod', icon: '🌩️', type: 'keystone', family: 'sky', rarity: 'keystone', socket: 'crown',
    desc: () => 'Each dodge strikes back for 75% FIRM',
    hooks: { onDodge: (ctx, me, foe) => ctx.attack(me, foe, { mult: 0.75, label: 'Lightning Rod' }) },
  },
};

export const SLOTTED_TYPES = new Set(['action', 'reflex', 'trait', 'keystone']);
export const isSlotted = (id) => SLOTTED_TYPES.has(ESSENCES[id]?.type);

/** Level index from copies: 1 → I, 3 → II, 6 → III. Apex is a flag. */
export function levelOf(e) {
  if (e.apex) return 3;
  return e.copies >= 6 ? 2 : e.copies >= 3 ? 1 : 0;
}

export const LEVEL_NAMES = ['I', 'II', 'III', 'APEX'];
export const COPIES_FOR = [1, 3, 6];

export function essenceDesc(id, L = 0) {
  const d = ESSENCES[id];
  if (!d) return '';
  if (d.desc) return d.desc(L);
  if (d.type === 'stat' || d.type === 'element') {
    const parts = Object.entries(d.stats || {}).map(([k, n]) => `+${n} ${k.toUpperCase()}`);
    Object.entries(d.affinity || {}).forEach(([k, n]) => parts.push(`+${n} ${k} affinity`));
    return parts.join(', ') + ' (permanent, no slot)';
  }
  return '';
}

export const displayName = (id, L) => {
  const d = ESSENCES[id];
  return L >= 2 && d.evolved ? d.evolved : d.name;
};
