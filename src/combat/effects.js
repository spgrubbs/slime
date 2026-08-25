// ─────────────────────────────────────────────────────────────────────────────
// Effect definitions
//
// Every mutation passive and personality trait, declared against the hook
// points in hooks.js. `self.power` / `self.chance` are the viscosity-scaled
// magnitude of THIS effect on THIS slime — see hooks.js `effectPower`.
//
// Ordering within a file has no meaning; the resolver runs hooks in the order
// the combatant carries them.
// ─────────────────────────────────────────────────────────────────────────────

import { registerEffect } from './hooks.js';

const mut   = (id, hooks, extra = {}) => registerEffect({ id, source: 'mutation', hooks, ...extra });
const trait = (id, hooks, extra = {}) => registerEffect({ id, source: 'trait', hooks, ...extra });

const pct = (p) => 1 + p / 100;

// ═════════════════════════════════════════════════════════════════════════════
// VERDANT FOREST
// ═════════════════════════════════════════════════════════════════════════════

mut('sharp', {
  // "% auto-crit chance" — attacker-side, so it lives in onBeforeAttack
  onBeforeAttack: (ev, self) => {
    const roll = ev.rng();
    if (roll < self.chance) ev.autoCrit = true;
    ev.trace.roll('🔪 Sharp', roll, self.chance, roll < self.chance);
  },
});

mut('digest', {
  // "+X biomass per kill"
  onKill: (ev, self) => { ev.biomassFlat += self.power; },
});

mut('stoneskin', {
  // "+X Firmness" — a genuine stat bonus, declared explicitly
  statMod: (ev, self) => { ev.stats.firmness += Math.floor(self.power); },
});

mut('vinewebs', {
  // "% chance to block enemy attack"
  onHitChance: (ev, self) => { ev.chance.block += self.chance; },
});

mut('resurrect', {
  // "Revive with X HP after death"
  onDeath: (ev, self) => {
    if (ev.self.flags.usedResurrect) return;
    ev.self.flags.usedResurrect = true;
    ev.revive = Math.max(1, Math.floor(self.power));
    ev.reviveLabel = '🧚 Resurrect';
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// MURKY SWAMP
// ═════════════════════════════════════════════════════════════════════════════

mut('spiny', {
  // "% chance to cause Bleed"
  onStatusApply: (ev, self) => {
    if (ev.rng() < self.chance) ev.apply.push({ type: 'bleed', label: '🐟 Spiny' });
  },
});

mut('whirlpool', {
  // "+X% damage to fleeing (wounded) enemies"
  onBeforeAttack: (ev, self) => {
    if (ev.defender.hp < ev.defender.maxHp * 0.3) {
      ev.trace.mul('🌀 Whirlpool (fleeing)', pct(self.power));
    }
  },
});

mut('farstep', {
  // "% chance to avoid traps"
  onHazard: (ev, self) => {
    if (!ev.avoided && ev.rng() < self.chance) {
      ev.avoided = true;
      ev.label = '👟 Farstep';
    }
  },
});

mut('ethereal', {
  // "% chance to phase through damage"
  onHitChance: (ev, self) => { ev.chance.phase += self.chance; },
});

mut('theTouch', {
  // "% instant kill chance"
  onDamageDealt: (ev, self) => {
    if (ev.defender.isBoss) return;
    const roll = ev.rng();
    if (roll < self.chance) {
      ev.execute = true;
      ev.trace.roll('🐌 The Touch', roll, self.chance, true);
    }
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// CRYSTAL GROTTO
// ═════════════════════════════════════════════════════════════════════════════

mut('lifesteal', {
  // "% of damage heals you"
  onDamageDealt: (ev, self) => { ev.healPct += self.chance; },
});

mut('sloughSkin', {
  // "% chance to remove debuff"
  onRoundStart: (ev, self) => {
    const debuffs = ev.self.status.filter(s => s.harmful);
    if (!debuffs.length) return;
    if (ev.rng() < self.chance) {
      const shed = debuffs[0];
      ev.cleanse.push(shed.type);
      ev.log.push({ m: `${ev.self.name} sheds ${shed.type}! 🪱`, c: '#a16207' });
    }
  },
});

mut('blindingPowder', {
  // "% chance enemy misses"
  onHitChance: (ev, self) => { ev.chance.miss += self.chance; },
});

mut('dropIn', {
  // "First attack: +X% damage"
  onBeforeAttack: (ev, self) => {
    if (ev.attacker.flags.usedDropIn) return;
    ev.attacker.flags.usedDropIn = true;
    ev.trace.mul('⬇️ Drop In (first strike)', pct(self.power));
  },
});

mut('bejeweled', {
  // "+X% personal biomass gain"
  onKill: (ev, self) => { ev.biomassMult += self.power / 100; },
});

// ═════════════════════════════════════════════════════════════════════════════
// CINDERSPIRE
// ═════════════════════════════════════════════════════════════════════════════

mut('regenerate', {
  // "Heal X HP per round"
  onRoundStart: (ev, self) => { ev.heal += self.power; ev.healLabel = '💚 Regenerate'; },
});

// "Unlocks +2 mutation slots" — read by the forge, no combat behavior.
mut('alloyPotential', {}, { slots: 2 });

mut('pyrolyze', {
  // "% chance to Burn"
  onStatusApply: (ev, self) => {
    if (ev.rng() < self.chance) ev.apply.push({ type: 'burn', label: '🔥 Pyrolyze' });
  },
});

mut('ghastlyWail', {
  // "% chance enemy skips turn" — stun is now enforced by the resolver
  onStatusApply: (ev, self) => {
    if (ev.rng() < self.chance) ev.apply.push({ type: 'stun', label: '💀 Ghastly Wail' });
  },
});

mut('draconicPower', {
  // "+X to all base stats"
  statMod: (ev, self) => {
    const n = Math.floor(self.power);
    ev.stats.firmness     += n;
    ev.stats.slipperiness += n;
    ev.stats.viscosity    += n;
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// STORMSPIRE SUMMIT
// ═════════════════════════════════════════════════════════════════════════════

mut('chainLightning', {
  // "+X% dmg with 3+ party"
  onBeforeAttack: (ev, self) => {
    if (ev.partySize >= 3) ev.trace.mul('⚡ Chain Lightning (3+ party)', pct(self.power));
  },
});

mut('earthshaker', {
  // "% chance to stun 1 round"
  onStatusApply: (ev, self) => {
    if (ev.rng() < self.chance) ev.apply.push({ type: 'stun', label: '👹 Earthshaker' });
  },
});

mut('charged', {
  // "+X% crit damage"
  onDamageDealt: (ev, self) => {
    if (ev.crit) ev.trace.mul('🔋 Charged (crit dmg)', pct(self.power));
  },
});

mut('permafrost', {
  // "% to reduce enemy damage 25%" — applies Weakened, which the resolver honors
  onStatusApply: (ev, self) => {
    if (ev.rng() < self.chance) ev.apply.push({ type: 'weakened', label: '❄️ Permafrost' });
  },
});

mut('stormcaller', {
  // "+X% crit for whole party"
  partyAura: (ev, self) => { ev.aura.critChance += self.power / 100; },
});

// ═════════════════════════════════════════════════════════════════════════════
// VOID ABYSS
// ═════════════════════════════════════════════════════════════════════════════

mut('consume', {
  // "+X random stat on kill (max 5 stacks)"
  onKill: (ev, self) => {
    const gains = ev.self.tempStats;
    const total = gains.firmness + gains.slipperiness + gains.viscosity;
    if (total >= 5 * Math.max(1, self.power)) return;
    const stat = ['firmness', 'slipperiness', 'viscosity'][Math.floor(ev.rng() * 3)];
    gains[stat] += self.power;
    ev.log.push({ m: `${ev.self.name} consumes! +${self.power.toFixed(1)} ${stat} 🦑`, c: '#4c1d95' });
  },
});

mut('allSeeing', {
  // "Cannot be crit, +X% dodge"
  onHitChance: (ev, self) => {
    ev.chance.dodge += self.power / 100;
    ev.noCrit = true;
  },
});

mut('nullify', {
  // "% reduced status duration"
  onStatusReceive: (ev, self) => {
    const reduced = ev.dur * (1 - Math.min(0.9, self.power / 100));
    ev.dur = Math.max(1, Math.round(reduced));
    ev.label = '🔳 Nullify';
  },
});

mut('fracture', {
  // "On death: deal X% of max HP as damage"
  onDeath: (ev, self) => {
    ev.blast += ev.self.maxHp * (self.power / 100);
    ev.blastLabel = '💥 Fracture';
  },
});

mut('voidTouched', {
  // "+X% damage, ignores elemental resistance"
  onBeforeAttack: (ev, self) => { ev.trace.mul('🕳️ Void Touched', pct(self.power)); },
  onDamageDealt: (ev) => { ev.ignoreResist = true; },
});

// ═════════════════════════════════════════════════════════════════════════════
// PERSONALITY TRAITS
// ═════════════════════════════════════════════════════════════════════════════

trait('brave', {
  onBeforeAttack: (ev) => {
    if (ev.attacker.hp < ev.attacker.maxHp * 0.5) ev.trace.mul('🦁 Brave (wounded)', 1.05);
  },
});

trait('cautious', {
  onHitChance: (ev) => {
    if (ev.defender.hp < ev.defender.maxHp * 0.5) ev.chance.dodge += 0.05;
  },
});

trait('hardy',   { hpMod: (ev) => { ev.mult *= 1.03; } });
trait('glutton', {
  hpMod:  (ev) => { ev.mult *= 0.97; },
  onKill: (ev) => { ev.biomassMult += 0.10; },
});

trait('swift',  { onBeforeAttack: (ev) => { ev.critBonus += 0.03; } });
trait('wise',   { onKill: (ev) => { ev.elementMult *= 1.05; } });
trait('lucky',  { onKill: (ev) => { ev.matChance += 0.05; } });
trait('greedy', { onKill: (ev) => { ev.biomassMult += 0.05; } });

trait('resilient', {
  onKill: (ev) => { ev.heal += 1; ev.healLabel = '🔄 Resilient'; },
});

trait('fierce', {
  onBeforeAttack: (ev) => {
    if (ev.attacker.flags.usedFierce) return;
    ev.attacker.flags.usedFierce = true;
    ev.trace.mul('😤 Fierce (first strike)', 1.08);
  },
});

trait('lazy', { onBeforeAttack: (ev) => { ev.trace.mul('😴 Lazy', 0.95); } });

trait('timid', {
  onBeforeAttack: (ev) => { ev.trace.mul('😰 Timid', 0.95); },
  onHitChance:    (ev) => { ev.chance.dodge += 0.10; },
});

trait('reckless', {
  onBeforeAttack: (ev) => { ev.trace.mul('💥 Reckless', 1.10); },
  onDamageTaken:  (ev) => { ev.trace.mul('💥 Reckless (exposed)', 1.05); },
});

trait('curious', {
  // "+10% exploration event chance" — read by the intermission roll
  onHazard: (ev) => { ev.eventChance += 0.10; },
});

trait('void',      { onKill: (ev) => { ev.blockElement = true; } });
trait('adaptable', { onKill: (ev) => { ev.elementMult *= 1.5; } });

// "+1 mutation slot" — read by the forge and the graft action
trait('ancient', {}, { slots: 1 });

trait('primordial', {
  statMod: (ev) => {
    ev.stats.firmness     = Math.floor(ev.stats.firmness * 1.10);
    ev.stats.slipperiness = Math.floor(ev.stats.slipperiness * 1.10);
    ev.stats.viscosity    = Math.floor(ev.stats.viscosity * 1.10);
  },
  hpMod: (ev) => { ev.mult *= 1.10; },
});
