// ─────────────────────────────────────────────────────────────────────────────
// Zone Wardens — the boss at the bottom of each zone
//
// A Warden is the one fight in the game you have to prepare for. Everything
// else is a grind you can walk into; a Warden is summoned deliberately, from
// the expedition planner, and only once the zone's Tendril has been grown far
// enough to provoke it (see buildingData.js).
//
// Two states:
//
//   Warden   — the first kill. Drops a SEAL, which is the only way to grow a
//              Tendril into the NEXT zone. This is the progression spine: zones
//              are gated by beating the zone before them, not by skill points.
//
//   Warden+  — every kill after the first. Roughly 2.5x the fight, meant to be
//              come back to much later. Drops a HEART, which buys the Tendril's
//              final level and its small permanent passive.
//
// Wardens are deliberately NOT in the normal spawn table. You never meet one by
// accident, because a boss that can wipe an unprepared party at random is a
// punishment for exploring rather than a reason to build.
// ─────────────────────────────────────────────────────────────────────────────

// How much harder a Warden+ is than the first kill.
//
// Tuned against the real resolver, and the numbers are less obvious than they
// look. Past a threshold MORE HP makes a Warden *less* beatable rather than
// merely slower: the party's total health is fixed, so every extra round is
// another round of incoming damage, and the fight flips from "long" to "lost"
// without ever getting closer. Damage — and above all the action count — is the
// real dial. An extra action alone put every Warden+ at a 0% win rate.
//
// At these values a party wins 0% at twice the zone's recommendedStats, is on a
// knife edge around three times, and clears it comfortably in 9-11 rounds at
// four times. That is the "come back much later" the design wants.
export const WARDEN_PLUS_HP = 2.5;
export const WARDEN_PLUS_DMG = 1.3;

export const WARDENS = {
  forest: {
    zone: 'forest',
    name: 'The Verdant Warden',
    icon: '🌳',
    desc: 'The forest grew a body to object with. Bark over sap over something older, it moves like weather and hits like a falling tree.',
    tier: 1,
    hp: 240,
    dmg: 8,
    actions: 2,
    biomass: 180,
    element: 'nature',
    // NOT `heal`. It restores 15% of max HP per proc, which over a 20-round
    // Warden fight is most of its health back — a hard DPS check, and the wrong
    // thing to put on the first boss in the game, where it made the Verdant
    // Warden+ harder than the Hollow one.
    ability: 'cleave',
    abilities: ['Sweeping limbs', 'Bark like stone'],
    seal: 'Heartwood Seal',
    heart: 'Heartwood Core',
  },
  swamp: {
    zone: 'swamp',
    name: 'The Mire Warden',
    icon: '🫧',
    desc: 'Nothing in the bog rots without its permission. It surfaces as a shape the water agrees to hold, and drags what it takes back down.',
    tier: 2,
    hp: 360,
    dmg: 20,
    actions: 2,
    biomass: 420,
    element: 'water',
    ability: 'venomBite',
    abilities: ['Drowning grasp', 'Fen rot'],
    seal: 'Bog Seal',
    heart: 'Mire Core',
  },
  caves: {
    zone: 'caves',
    name: 'The Geode Warden',
    icon: '💠',
    desc: 'A cavern that decided to stand up. Every facet is a lens, and it has been watching the tunnels for a very long time.',
    tier: 3,
    hp: 480,
    dmg: 19,
    actions: 3,
    biomass: 900,
    element: 'earth',
    ability: 'rockThrow',
    abilities: ['Refracted assault', 'Crystalline hide'],
    seal: 'Geode Seal',
    heart: 'Geode Core',
  },
  ruins: {
    zone: 'ruins',
    name: 'The Cinder Warden',
    icon: '🜂',
    desc: 'What the fortress burned into. It still keeps a watch it was set centuries ago, and does not know the war ended.',
    tier: 4,
    hp: 800,
    dmg: 44,
    actions: 2,
    biomass: 1800,
    element: 'fire',
    ability: 'fireball',
    abilities: ['Slag wave', 'Everburning core'],
    seal: 'Cinder Seal',
    heart: 'Cinder Core',
  },
  peaks: {
    zone: 'peaks',
    name: 'The Storm Warden',
    icon: '🌩️',
    desc: 'The reason the storms never clear. It stands at the summit holding the weather in place, and resents being reached.',
    tier: 5,
    hp: 2050,
    dmg: 81,
    actions: 2,
    biomass: 3600,
    element: 'water',
    ability: 'frostBreath',
    abilities: ['Chain lightning', 'Thunderclap'],
    seal: 'Storm Seal',
    heart: 'Storm Core Prime',
  },
  volcano: {
    zone: 'volcano',
    name: 'The Hollow Warden',
    icon: '🕳️',
    desc: 'The shape the tear in reality takes when something looks at it. It has no element because it predates the idea of having one.',
    tier: 6,
    hp: 2300,
    dmg: 106,
    actions: 3,
    biomass: 7000,
    element: null,
    ability: 'voidTouch',
    abilities: ['Unmaking', 'Null field'],
    seal: 'Void Seal',
    heart: 'Hollow Core Prime',
  },
};

/** Zone order — a Tendril's first level is bought with the PREVIOUS zone's seal. */
export const ZONE_ORDER = ['forest', 'swamp', 'caves', 'ruins', 'peaks', 'volcano'];

/** The zone whose Warden must fall before `zone` can be reached at all. */
export const prerequisiteZone = (zone) => {
  const i = ZONE_ORDER.indexOf(zone);
  return i > 0 ? ZONE_ORDER[i - 1] : null;
};

export const ALL_SEALS = ZONE_ORDER.map(z => WARDENS[z].seal);
export const ALL_HEARTS = ZONE_ORDER.map(z => WARDENS[z].heart);

/**
 * A Warden as the combat resolver sees it — the same shape as a MONSTER_TYPES
 * entry, so `makeEnemyCombatant` needs no special case.
 *
 * `plus` is every kill after the first: a much bigger fight carrying the Heart
 * instead of the Seal.
 */
export const wardenMonster = (zone, plus = false) => {
  const w = WARDENS[zone];
  if (!w) return null;
  return {
    ...w,
    id: wardenTypeId(zone, plus),
    name: plus ? `${w.name}, Rekindled` : w.name,
    hp: Math.round(w.hp * (plus ? WARDEN_PLUS_HP : 1)),
    dmg: Math.round(w.dmg * (plus ? WARDEN_PLUS_DMG : 1)),
    biomass: Math.round(w.biomass * (plus ? 2 : 1)),
    actions: w.actions,   // never more than the first fight — see above
    // Only the drop that this state is worth fighting for.
    mats: plus ? [w.heart] : [w.seal],
    isWarden: true,
    plus,
    // Wardens never roll a mutagen — their drop IS the reward, and a boss you
    // fight a handful of times is a terrible mutagen source anyway.
    mutation: null,
    rare: false,
  };
};

export const wardenTypeId = (zone, plus = false) => `warden_${zone}${plus ? '_plus' : ''}`;

/** Every Warden state, keyed by the id `makeEnemyCombatant` will be given. */
export const WARDEN_TYPES = ZONE_ORDER.reduce((acc, z) => {
  acc[wardenTypeId(z, false)] = wardenMonster(z, false);
  acc[wardenTypeId(z, true)] = wardenMonster(z, true);
  return acc;
}, {});
