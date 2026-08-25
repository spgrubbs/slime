// ─────────────────────────────────────────────────────────────────────────────
// Tower Defense
//
// The daily attention-rewarding event, and the only reliable Prism faucet.
// Its whole game is the placement you commit to before the first invader
// moves: three lanes, three positions per lane, and a wave manifest you can
// read in advance. Nothing about it is a DPS check.
//
// See docs/GAME_DESIGN.md §7.3.
// ─────────────────────────────────────────────────────────────────────────────

// ── Lanes ────────────────────────────────────────────────────────────────────
// `march` is how many rounds an invader needs to cross the lane. A long lane
// buys you time; a short one demands defenders up front.

export const TD_LANES = {
  ravine: {
    id: 'ravine',
    name: 'The Ravine',
    icon: '🏔️',
    desc: 'Narrow and steep. Invaders arrive slowly and one at a time.',
    march: 5,
    singleFile: true,   // only the front invader can engage
    color: '#a16207',
  },
  causeway: {
    id: 'causeway',
    name: 'The Causeway',
    icon: '🛣️',
    desc: 'Wide and fast. Invaders reach the hive quickly and in numbers.',
    march: 3,
    singleFile: false,
    color: '#ef4444',
  },
  marsh: {
    id: 'marsh',
    name: 'The Marsh',
    icon: '🌫️',
    desc: 'Sucking mud. Invaders arrive Slowed and struggle to close.',
    march: 6,
    singleFile: true,
    slowsInvaders: true,
    color: '#22c55e',
  },
};

export const LANE_ORDER = ['ravine', 'causeway', 'marsh'];

// ── Positions ────────────────────────────────────────────────────────────────
// Each position rewards a different stat, so a slime the expedition meta has
// no use for still has a job here.

export const TD_POSITIONS = {
  choke: {
    id: 'choke',
    name: 'Choke',
    icon: '🛡️',
    desc: 'Takes every hit while it stands. +50% Firmness.',
    wants: 'firmness',
    firmnessMult: 1.5,
    guards: true,          // sole legal target while alive
  },
  flank: {
    id: 'flank',
    name: 'Flank',
    icon: '🗡️',
    desc: 'Strikes from cover — every hit crits. Untargetable until the Choke falls.',
    wants: 'slipperiness',
    critBonus: 1,          // guaranteed crits
    hiddenBehindChoke: true,
  },
  rear: {
    id: 'rear',
    name: 'Rear',
    icon: '🧪',
    desc: 'Works the line from behind: procs roll twice. Dies instantly if reached.',
    wants: 'viscosity',
    procMult: 2,
    routsOnBreach: true,   // lost the moment invaders reach the line
  },
};

export const POSITION_ORDER = ['choke', 'flank', 'rear'];

// ── Invaders ─────────────────────────────────────────────────────────────────
// Each type invalidates one dominant strategy, so "stack Firmness" stops being
// an answer to everything.

export const HUMAN_TYPES = {
  warrior: {
    id: 'warrior',
    name: 'Human Warrior',
    icon: '⚔️',
    hp: 50,
    dmg: 7,
    tier: 2,
    desc: 'Rank and file. No tricks.',
    mats: ['Human Bone', 'Iron Sword'],
    biomass: 20,
  },
  shieldbearer: {
    id: 'shieldbearer',
    name: 'Shieldbearer',
    icon: '🛡️',
    hp: 90,
    dmg: 5,
    tier: 2,
    desc: 'Locked shield: cannot be critically hit. Flanks are wasted on it.',
    critImmune: true,
    mats: ['Human Bone', 'Tower Shield'],
    biomass: 30,
  },
  zealot: {
    id: 'zealot',
    name: 'Zealot',
    icon: '🕯️',
    hp: 55,
    dmg: 11,
    tier: 3,
    desc: 'Burns with conviction: immune to every status. Rear procs whiff.',
    statusImmune: true,
    mats: ['Human Bone', 'Sacred Ash'],
    biomass: 35,
  },
  sapper: {
    id: 'sapper',
    name: 'Sapper',
    icon: '⛏️',
    hp: 40,
    dmg: 9,
    tier: 3,
    desc: 'Tunnels past the Choke and goes straight for whatever is behind it.',
    ignoresGuard: true,
    mats: ['Human Bone', 'Blasting Charge'],
    biomass: 30,
  },
  champion: {
    id: 'champion',
    name: 'Human Champion',
    icon: '👑',
    hp: 260,
    dmg: 16,
    tier: 5,
    desc: 'Their best. Shrugs off crits and marches through anything.',
    critImmune: true,
    isBoss: true,
    mats: ['Human Bone', 'Iron Sword', 'Champion Badge'],
    biomass: 120,
  },
};

// ── Waves ────────────────────────────────────────────────────────────────────
// `lanes` maps a lane id to the invaders that come down it, in order. The
// manifest is shown during setup — the whole point is that you can read it
// before you commit.

export const TD_WAVES = [
  {
    wave: 1,
    name: 'Scouting Party',
    lanes: {
      ravine:   ['warrior', 'warrior'],
      causeway: ['warrior', 'warrior', 'warrior'],
      marsh:    ['warrior'],
    },
    reward: { biomass: 60, mats: { 'Human Bone': 3, 'Iron Sword': 2 } },
  },
  {
    wave: 2,
    name: 'Shield Wall',
    lanes: {
      ravine:   ['shieldbearer', 'warrior', 'warrior'],
      causeway: ['warrior', 'sapper', 'warrior'],
      marsh:    ['zealot', 'warrior'],
    },
    reward: { biomass: 110, mats: { 'Human Bone': 5, 'Iron Sword': 3, 'Tower Shield': 1 } },
  },
  {
    wave: 3,
    name: 'The Champion',
    lanes: {
      ravine:   ['zealot', 'shieldbearer', 'warrior'],
      causeway: ['sapper', 'sapper', 'warrior', 'warrior'],
      marsh:    ['champion', 'zealot'],
    },
    reward: { biomass: 200, mats: { 'Human Bone': 8, 'Iron Sword': 5, 'Sacred Ash': 2 } },
  },
];

/**
 * Difficulty and rewards both track queen level, so the mode stays a real
 * decision rather than something you outgrow.
 */
export const getTDScaling = (queenLevel) => ({
  hpMultiplier:     1 + (queenLevel - 1) * 0.10,
  damageMultiplier: 1 + (queenLevel - 1) * 0.06,
  rewardMultiplier: 1 + (queenLevel - 1) * 0.15,
});

/** The wave manifest, as shown during setup. */
export const getWaveManifest = (waveIndex, queenLevel) => {
  const wave = TD_WAVES[waveIndex];
  if (!wave) return null;
  const scaling = getTDScaling(queenLevel);
  return {
    wave: wave.wave,
    name: wave.name,
    lanes: LANE_ORDER.map(laneId => {
      const types = wave.lanes[laneId] || [];
      const counts = {};
      types.forEach(t => { counts[t] = (counts[t] || 0) + 1; });
      return {
        laneId,
        lane: TD_LANES[laneId],
        total: types.length,
        composition: Object.entries(counts).map(([type, count]) => ({
          type, count, def: HUMAN_TYPES[type],
        })),
      };
    }),
    scaling,
  };
};
