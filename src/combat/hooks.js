// ─────────────────────────────────────────────────────────────────────────────
// Effect hook registry
//
// Every mutation, trait, and monster ability declares its behavior against a
// fixed set of hook points instead of being hand-wired into the damage
// functions. Adding content becomes data, not code — and `validateRegistry()`
// makes a name mismatch a startup failure rather than a silent no-op.
//
// See docs/GAME_DESIGN.md §9.3.
// ─────────────────────────────────────────────────────────────────────────────

export const HOOK_POINTS = [
  'statMod',         // (ev) adjust derived stats            ev.stats
  'hpMod',           // (ev) adjust max HP                   ev.maxHp
  'onRoundStart',    // (ev) regen, cleanse, aura refresh
  'onBeforeAttack',  // (ev) attacker-side damage setup      ev.dmg, ev.critChance
  'onHitChance',     // (ev) dodge / block / phase / miss    ev.chance
  'onDamageDealt',   // (ev) attacker-side final damage      ev.dmg, ev.execute, ev.heal
  'onDamageTaken',   // (ev) defender-side mitigation        ev.dmg, ev.reflect
  'onStatusApply',   // (ev) outgoing status procs           ev.apply[]
  'onStatusReceive', // (ev) incoming status modification    ev.dur, ev.blocked
  'onKill',          // (ev) reward modification             ev.biomassMult, ev.matChance…
  'onDeath',         // (ev) death-triggered effects         ev.revive, ev.blast
  'onHazard',        // (ev) intermission traps / maluses    ev.avoided, ev.mult
  'onRoundEnd',      // (ev) end-of-round effects
  'partyAura',       // (ev) party-wide passive buffs        ev.aura
];

const HOOK_SET = new Set(HOOK_POINTS);

// id -> { id, key, source, label, icon, hooks, slots }
const registry = new Map();

/** Registry key. Namespaced so a mutation and a trait may share a bare name. */
export const effectKey = (source, id) => `${source}:${id}`;

export function registerEffect(def) {
  const { id, source, hooks = {} } = def;
  if (!id || !source) throw new Error(`registerEffect: missing id/source (${JSON.stringify(def)})`);

  const bad = Object.keys(hooks).filter(h => !HOOK_SET.has(h));
  if (bad.length) {
    throw new Error(`Effect "${source}:${id}" declares unknown hook(s): ${bad.join(', ')}`);
  }

  const key = effectKey(source, id);
  if (registry.has(key)) throw new Error(`Effect "${key}" registered twice`);
  registry.set(key, { ...def, key });
  return key;
}

export const getEffect = (source, id) => registry.get(effectKey(source, id));
export const hasEffect = (source, id) => registry.has(effectKey(source, id));
export const allEffects = () => [...registry.values()];

/** Wipe the registry. Test-only — production registers once at import time. */
export const _resetRegistry = () => registry.clear();

// ── Magnitude ────────────────────────────────────────────────────────────────
//
// A mutation's power is `base + viscScale × viscosity`, where base is
// `baseValue` (a magnitude) or `baseChance` (a percentage). These fields
// describe the EFFECT, never the slime's stats — a stat bonus is either the
// flat `bonus` applied at spawn or an explicit `statMod` hook.

export function effectPower(def, viscosity = 0, mult = 1) {
  if (!def) return 0;
  const base = def.baseValue !== undefined ? def.baseValue
             : def.baseChance !== undefined ? def.baseChance
             : 0;
  return (base + (def.viscScale || 0) * viscosity) * mult;
}

/** Same, expressed as a 0..1 probability and capped so nothing becomes certain. */
export function effectChance(def, viscosity = 0, mult = 1, cap = 0.95) {
  return Math.min(cap, Math.max(0, effectPower(def, viscosity, mult) / 100));
}

// ── Collection ───────────────────────────────────────────────────────────────

/**
 * Every effect a combatant carries, paired with its computed power.
 * Returns [{ effect, def, power, chance }] for the requested hook.
 */
export function collectHooks(combatant, hook, mutationPower = 1) {
  const out = [];
  const visc = combatant?.stats?.viscosity || 0;

  for (const { source, id, def } of (combatant?.effects || [])) {
    const effect = getEffect(source, id);
    if (!effect?.hooks?.[hook]) continue;
    // Traits are flat by design; only mutation magnitudes scale with skills.
    const mult = source === 'mutation' ? mutationPower : 1;
    out.push({
      effect,
      def,
      run: effect.hooks[hook],
      power:  effectPower(def, visc, mult),
      chance: effectChance(def, visc, mult),
    });
  }
  return out;
}

/**
 * Run every hook of one kind against an event object. Mutates `ev`.
 * Each hook receives `(ev, self)` where `self` carries that effect's own
 * definition plus its viscosity-scaled `power` / `chance`.
 */
export function runHooks(combatant, hook, ev, mutationPower = 1) {
  for (const h of collectHooks(combatant, hook, mutationPower)) {
    h.run(ev, h);
  }
  return ev;
}
