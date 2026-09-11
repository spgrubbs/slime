// ─────────────────────────────────────────────────────────────────────────────
// Warden mechanics
//
// A Warden is not a monster with bigger numbers. Each one has a RULE that
// defeats the obvious approach, and each rule has an answer the player can
// already reach — from that zone's own drops or an earlier one's. The fight is
// meant to be lost once, read in the verbose log, and then solved.
//
// The constraint every mechanic here is written against: the counter must be
// obtainable by the time you can provoke that Warden. Provoking costs ~90-150
// kills in that zone, so its mutagens are in hand; everything shallower is too.
//
//   Zone     Rule                                  Answer the player has
//   ------   -----------------------------------   -------------------------
//   forest   Thornskin — reflects each hit          Vinewebs (block), Sharp
//                                                   (fewer, bigger hits)
//   swamp    Fen Rot — regenerates each round       Spiny (bleed); any DoT
//   caves    Refraction — crits are turned back     Drop crit, build Firmness
//   ruins    Everburning — damage ramps each round  Ghastly Wail (stun) clears
//   peaks    Stormlash — unblockable, only dodgeable  Slipperiness; Permafrost
//   volcano  Null Field — hardens against each        Four different affinities
//            element that hits it
//
// Registered against the same hook registry as mutations and traits, so they go
// through exactly the same resolver path and show up in the verbose log.
// ─────────────────────────────────────────────────────────────────────────────

import { registerEffect } from './hooks.js';

const warden = (id, hooks, extra = {}) =>
  registerEffect({ id, source: 'warden', hooks, ...extra });

/** Statuses that count as "actively being hurt" — they suppress regeneration. */
export const DOT_STATUSES = new Set(['burn', 'poison', 'bleed']);

export const hasDot = (c) => (c?.status || []).some(s => DOT_STATUSES.has(s.type));

// ── Forest: Thornskin ────────────────────────────────────────────────────────
//
// Reflects a share of every hit back at the attacker. Punishes chipping it down
// with many small hits; a blocked attack never lands, so it reflects nothing.
// Answered by Vinewebs (block) and Sharp (fewer, harder hits), both of which
// drop in the forest itself.

warden('thornskin', {
  onDamageTaken: (ev, self) => {
    const share = self.def?.reflect ?? 0.25;
    ev.reflect = (ev.reflect || 0) + share;
    ev.trace?.note(`🌵 Thornskin — ${Math.round(share * 100)}% returned`);
  },
});

// ── Swamp: Fen Rot ───────────────────────────────────────────────────────────
//
// Heals every round unless something is actively rotting it. Spiny (bleed) is a
// swamp drop; burn and poison work too, so the answer keeps working later.

warden('fenRot', {
  onRoundStart: (ev, self) => {
    const pct = self.def?.regen ?? 0.08;
    if (hasDot(ev.self)) {
      ev.log.push({ m: `${ev.self.name} cannot knit — the rot holds. 🩸`, c: '#4ade80',
                    v: 'Fen Rot suppressed by a damage-over-time status' });
      return;
    }
    ev.heal += Math.floor(ev.self.maxHp * pct);
    ev.healLabel = '🫧 Fen Rot';
  },
});

// ── Caves: Refraction ────────────────────────────────────────────────────────
//
// Every facet is a lens. A critical hit is turned back on the party instead of
// landing. The answer is a build decision rather than an item: drop the crit
// stacking the rest of the game rewards, and bring Firmness and health. Sharp —
// the very first mutation most players get — is a liability here, which is the
// point: it teaches that a mutation is a choice, not an upgrade.

warden('refraction', {
  onDamageTaken: (ev, self) => {
    if (!ev.crit) return;
    ev.refract = self.def?.refract ?? 0.6;
    ev.trace?.note('💠 Refraction — the crit is turned back');
  },
});

// ── Ruins: Everburning ───────────────────────────────────────────────────────
//
// Its damage grows every round it is left standing: a soft enrage that makes a
// long grind lethal. A stun clears the stacks, so Ghastly Wail (ruins) and
// Earthshaker (peaks) are the pressure valve, and the fight becomes about
// landing them rather than out-tanking it.

warden('everburning', {
  onRoundEnd: (ev) => {
    const c = ev.self;
    c.flags.emberStacks = (c.flags.emberStacks || 0) + 1;
  },
  onBeforeAttack: (ev, self) => {
    const per = self.def?.rampPerRound ?? 0.12;
    // The floor is what stops a stun build from simply switching the mechanic
    // off: venting buys time, it does not reset the clock. Without it a single
    // stun mutation held the Cinder Warden at zero stacks indefinitely.
    const floor = Math.floor((ev.world?.round || 0) / (self.def?.floorEvery ?? 3));
    const stacks = Math.max(ev.attacker.flags?.emberStacks || 0, floor);
    if (stacks <= 0) return;
    ev.trace?.mul(`🜂 Everburning ×${stacks}`, 1 + stacks * per);
  },
  // A stun is the vent — but only a partial one. Clearing the stacks outright
  // made a single stun mutation trivialise the fight (46% wins even UNDER the
  // zone's recommended stats), so it halves them instead: the counter keeps the
  // ramp survivable without removing the race.
  onStatusReceive: (ev) => {
    if (ev.type !== 'stun' || !ev.self?.flags) return;
    const had = ev.self.flags.emberStacks || 0;
    if (had <= 0) return;
    ev.self.flags.emberStacks = Math.floor(had / 2);
    ev.log?.push?.({ m: 'The Cinder Warden gutters — some of its heat scatters. 💫', c: '#f59e0b',
                     v: `stun halved Everburning stacks ${had} → ${ev.self.flags.emberStacks}` });
  },
});

// ── Peaks: Stormlash ─────────────────────────────────────────────────────────
//
// Its strikes cannot be blocked, phased, or made to miss — only dodged. Every
// interception layer the game has handed out by now (Vinewebs, Ethereal,
// Blinding Powder) is worthless here, and raw slipperiness is the entire
// defence. Permafrost blunts what does land.
//
// This replaced a "the storm is worse the more slimes are standing in it"
// mechanic meant to reward sending a smaller party. Measured, that never
// worked at any scaling: at equal per-slime stats four slimes beat three beat
// two at every value tried, because halving the party halves both damage and
// health and no AoE penalty offsets that. Action economy is simply not
// negotiable, so the mechanic now asks for a different DEFENCE instead of a
// different party size.

warden('stormlash', {
  onBeforeAttack: (ev) => {
    ev.trace?.note('⚡ Stormlash — interception does not apply');
  },
});

// ── Volcano: Null Field ──────────────────────────────────────────────────────
//
// It learns. Every hit teaches it the element that landed, and it hardens
// against that element for the rest of the fight — so a party that all hits the
// same way stalls out completely while a party of four affinities spreads the
// lesson four ways and keeps hurting it.
//
// Rotating a "current element" was the first attempt and it was mathematically
// empty: with a uniform rotation, four fire slimes and four mixed slimes take
// exactly the same expected damage, so the mechanic asked for nothing. Adaptive
// resistance is non-linear, which is what makes diversity actually pay.

warden('nullField', {
  onDamageTaken: (ev, self) => {
    const c = ev.defender;
    const el = ev.attacker?.primaryElement || 'none';
    const per = self.def?.adaptPerHit ?? 0.06;
    const cap = self.def?.adaptCap ?? 0.85;

    c.flags.adapt = c.flags.adapt || {};
    const learned = c.flags.adapt[el] || 0;
    const resist = Math.min(cap, learned * per);
    if (resist > 0) ev.trace?.mul(`🕳️ adapted to ${el}`, 1 - resist);

    c.flags.adapt[el] = learned + 1;
  },
});

/** Mechanic id -> the tuning its hooks read off `def`. */
// Magnitudes solved jointly with each Warden's HP against a single target: the
// build that answers the rule wins about three fights in four at 1.5x the
// zone's recommendedStats, and the build that ignores it wins well under one in
// four. Re-run the sweep in docs/GAME_DESIGN.md §11 after touching either.
export const WARDEN_MECHANICS = {
  thornskin:   { reflect: 0.20 },
  fenRot:      { regen: 0.03 },
  refraction:  { refract: 0.6 },
  everburning: { rampPerRound: 0.20, floorEvery: 2 },
  stormlash:   { ignoresAvoidance: true },
  nullField:   { adaptPerHit: 0.05, adaptCap: 0.85 },
};
