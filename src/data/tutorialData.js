// ─────────────────────────────────────────────────────────────────────────────
// Tutorials
//
// Each entry explains one system, once, the first time the player meets it.
// After that it retires to the Compendium — so the live UI can stay terse and
// nothing has to be explained twice in a panel that is read every day.
//
// `when(state)` decides whether the tutorial is due. It is checked whenever the
// game state changes, and the first due, unseen tutorial in this order fires.
// ─────────────────────────────────────────────────────────────────────────────

export const TUTORIAL_CATEGORIES = {
  basics:     { name: 'Getting Started', icon: '🥚' },
  slimes:     { name: 'Your Slimes',     icon: '🟢' },
  expedition: { name: 'The Field',       icon: '🗺️' },
  hive:       { name: 'The Hive',        icon: '🏛️' },
};

/**
 * Order matters — the first due entry wins, so broad introductions come before
 * the specific mechanics they set up.
 */
export const TUTORIALS = {
  welcome: {
    id: 'welcome',
    category: 'basics',
    title: 'You are the Hive Queen',
    icon: '👑',
    body: [
      'You never fight. You breed slimes, shape them, and send them out.',
      'Everything runs on **biomass** — spend it to spawn, build and research.',
      'Start by forging a slime, then send it somewhere.',
    ],
    when: () => true,
  },

  forge: {
    id: 'forge',
    category: 'slimes',
    title: 'The Forge',
    icon: '🧪',
    body: [
      'A slime\'s **tier** sets its power. Better tiers need buildings first.',
      '**Firmness** hits and holds. **Slipperiness** dodges and crits. **Viscosity** makes mutations land.',
      'Every slime you keep alive occupies **royal jelly** — that is your population cap.',
    ],
    when: (s) => s.tab === 'brood',
  },

  expeditions: {
    id: 'expeditions',
    category: 'expedition',
    title: 'Expeditions',
    icon: '🗺️',
    body: [
      'Pick a zone, pick a party, send them. They fight until you **recall** them.',
      'They keep going while the game is closed.',
      'Each zone lists the stats it expects. Going in under-strength gets slimes hurt.',
    ],
    when: (s) => s.tab === 'wilds',
  },

  heldBiomass: {
    id: 'heldBiomass',
    category: 'slimes',
    title: 'Carried biomass is temporary',
    icon: '🧬',
    body: [
      'Slimes fatten as they fight. That weight is worth up to **+35% stats** — and it is lost if they go down.',
      'Open a slime and **draw it out** to bank it. The slime is unharmed; it just drops back to its own strength.',
      'Carrying it is a bet. Drawing it out is the hedge.',
    ],
    when: (s) => s.maxHeldBiomass >= 25,
  },

  wounds: {
    id: 'wounds',
    category: 'slimes',
    title: 'Wounded, not dead',
    icon: '🩹',
    body: [
      'Slimes do not die. One that falls is **wounded**: it loses everything it carried and cannot be sent out.',
      'It mends in a **Convalescence Pool** — and holds its royal jelly the whole time.',
      'The cost of a bad run is a body clogging your capacity, not a name off the list.',
    ],
    when: (s) => s.woundedCount > 0,
  },

  mutations: {
    id: 'mutations',
    category: 'slimes',
    title: 'Mutations',
    icon: '🧬',
    body: [
      'Killing enough of a monster unlocks its mutation — permanently, for every slime you forge after.',
      'Mutations are the part of a slime you actually design. They are never lost to wounds.',
      'Most scale with **Viscosity**, so a high-VISC slime is one whose tricks fire.',
    ],
    when: (s) => s.mutagenKinds > 0,
  },

  ranch: {
    id: 'ranch',
    category: 'hive',
    title: 'Ranches',
    icon: '🏠',
    body: [
      'Ranches work on real-world clocks. A slime assigned here is **out of the field** — that is the cost.',
      'They grow biomass, elemental affinity, raw stats and traits.',
      'The **Convalescence Pool** is the odd one out: it only takes the wounded.',
    ],
    when: (s) => s.tab === 'brood' && s.broodView === 'pools',
  },

  caravan: {
    id: 'caravan',
    category: 'hive',
    title: 'Caravan ambush',
    icon: '🎯',
    body: [
      'One caravan a day. Pick a squad and take what you can before it gets clear.',
      'You are **paid per kill, immediately** — break off whenever you like and keep the lot.',
      'Wipe out a whole column and the road gets richer and more dangerous, permanently.',
    ],
    when: (s) => s.tab === 'road',
  },

  elements: {
    id: 'elements',
    category: 'expedition',
    title: 'Elemental affinity',
    icon: '🔥',
    body: [
      'Fighting in an elemental zone slowly stains a slime with that element.',
      'At 100% it locks in for good: **Fire → Nature → Earth → Water → Fire**, each strong against the next.',
      'A slime\'s element is a record of where it has been, not something you pick.',
    ],
    when: (s) => s.maxElementAffinity >= 25,
  },

  skills: {
    id: 'skills',
    category: 'hive',
    title: 'The skill tree',
    icon: '🌳',
    body: [
      'Queen levels buy skill points. Points unlock zones, buildings and whole features.',
      'Three trees: expeditions, hive economy, and combat.',
      'Zone access lives here — not in your slimes.',
    ],
    when: (s) => s.tab === 'hive' && s.skillPoints > 0,
  },

  verboseLog: {
    id: 'verboseLog',
    category: 'expedition',
    title: 'Reading a fight',
    icon: '📊',
    body: [
      'Toggle **Verbose** under any battle log to see how every number was reached.',
      'It shows each modifier by name and every roll against its threshold — including the ones that missed.',
      'If a build feels wrong, this is where you find out why.',
    ],
    when: (s) => s.totalKills >= 15,
  },
};

export const TUTORIAL_ORDER = Object.keys(TUTORIALS);

/**
 * The first tutorial that is due and unseen, or null.
 * `state` is the small snapshot the host assembles each render.
 */
export function nextTutorial(state, seen = []) {
  for (const id of TUTORIAL_ORDER) {
    if (seen.includes(id)) continue;
    const t = TUTORIALS[id];
    try {
      if (t.when(state)) return t;
    } catch {
      // A malformed snapshot should never block the game.
    }
  }
  return null;
}
