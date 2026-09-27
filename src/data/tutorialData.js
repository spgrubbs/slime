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
  hive:       { name: 'The Nucleus',     icon: '🏛️' },
};

/**
 * Order matters — the first due entry wins, so broad introductions come before
 * the specific mechanics they set up.
 */
export const TUTORIALS = {
  welcome: {
    id: 'welcome',
    category: 'basics',
    title: 'Mother, you\'re awake',
    icon: '👑',
    body: [
      'I\'m **Glub**, your first. I stay home and explain things. You do the deciding.',
      'You don\'t fight. You bud slimes, shape them, and send them out to eat.',
      'Everything runs on **biomass**. We eat, you grow, you make more of us.',
      'Bud a slime in **The Spawn**, then send it into **The Wilds**.',
    ],
    when: () => true,
  },

  forge: {
    id: 'forge',
    category: 'slimes',
    title: 'Budding',
    icon: '🥚',
    body: [
      'Every slime has a **tier**. Each tier up is a lot stronger, and each one needs a building before you can bud it.',
      '**Firmness** is how hard we hit and how much we can take. **Slipperiness** is dodging and crits. **Viscosity** makes our mutations go off.',
      'Each of us takes up **plasm** while we live. Plasm is how many slimes the nucleus can hold.',
    ],
    when: (s) => s.tab === 'brood',
  },

  expeditions: {
    id: 'expeditions',
    category: 'expedition',
    title: 'Going out',
    icon: '🗺️',
    body: [
      'Pick a place, pick up to four of us, and send us. We keep fighting until you **recall** us.',
      'We keep going while the game is closed. Come back later and we\'ll have things for you.',
      'Each place says what stats it expects. Send us in weaker than that and we come home hurt.',
    ],
    when: (s) => s.tab === 'wilds',
  },

  heldBiomass: {
    id: 'heldBiomass',
    category: 'slimes',
    title: 'We get fat out there',
    icon: '🧬',
    body: [
      'We fatten up as we fight. The extra weight makes us up to **35% stronger**, but we drop all of it if we fall.',
      'Open a slime and **draw it out** to keep it. The slime is fine. It just goes back to its normal size.',
      'Carrying it is a gamble. Drawing it out is the safe choice.',
    ],
    when: (s) => s.maxHeldBiomass >= 25,
  },

  wounds: {
    id: 'wounds',
    category: 'slimes',
    title: 'Nobody dies',
    icon: '🩹',
    body: [
      'Slimes don\'t die. One that falls is **wounded**. It drops what it was carrying and can\'t go out until it mends.',
      'It mends in a **Convalescence Pool**, and it keeps its plasm the whole time.',
      'So a bad trip costs you room in the nucleus. It never costs you a slime.',
    ],
    when: (s) => s.woundedCount > 0,
  },

  mutations: {
    id: 'mutations',
    category: 'slimes',
    title: 'Mutagens',
    icon: '🧬',
    body: [
      'Our genes are loose now. Monsters sometimes drop a **mutagen**, and each one holds that monster\'s trick.',
      'Open a slime with a free slot and feed it one. The trick is ours for good. Wounds can\'t take it. Only reabsorbing can.',
      'Most tricks go off more often on a slime with high **Viscosity**. If one monster just won\'t drop its mutagen, keep at it: every 150 kills of it guarantees one.',
    ],
    when: (s) => s.mutationsUnlocked,
  },

  ranch: {
    id: 'ranch',
    category: 'hive',
    title: 'The pools',
    icon: '🏠',
    body: [
      'Pools run on real clocks. A slime in a pool isn\'t out fighting, so pick who gets to rest.',
      'Pools grow biomass, elements, stats and traits.',
      'The **Convalescence Pool** is different. Only the wounded go in, and they come out mended.',
    ],
    when: (s) => s.tab === 'brood' && s.broodView === 'pools',
  },

  building: {
    id: 'building',
    category: 'hive',
    title: 'The nucleus can hold weight',
    icon: '🏗️',
    body: [
      'It\'s hard enough to carry **structures** now. They last forever, and most cost materials as well as biomass.',
      'Buildings give you better tiers, more room, and the **Tendrils** that reach new places.',
      'You\'ll find them on **The Nucleus**.',
    ],
    when: (s) => s.buildingUnlocked,
  },

  splitColumn: {
    id: 'splitColumn',
    category: 'expedition',
    title: 'Two places at once',
    icon: '🗺️',
    body: [
      'You can send **two parties** now. One can gather while the other pushes somewhere harder.',
      'Each party needs its own slimes, so you\'ll want more of us.',
      '**Many Pseudopods** opens a third.',
    ],
    when: (s) => s.expeditionSlots > 1,
  },

  caravan: {
    id: 'caravan',
    category: 'hive',
    title: 'The road',
    icon: '🎯',
    body: [
      'Humans drive a caravan past once a day. Pick a squad and take what you can before it gets away.',
      'Every kill pays **right away**. Break off whenever you like and keep what you took.',
      'Kill the whole column and the next ones carry more and fight harder. That doesn\'t go back down.',
    ],
    when: (s) => s.caravanUnlocked,
  },

  merchant: {
    id: 'merchant',
    category: 'hive',
    title: 'Mossback',
    icon: '🐌',
    body: [
      'That\'s **Mossback**, an old snail with a shop on its shell. It comes by about every 8 hours and stays for 5.',
      'It swaps things for things. Give it what we have too much of and it gives us something we\'re short of. It always keeps a little for itself.',
      'It won\'t touch Seals or Cores, and it only carries things from places we can already reach.',
    ],
    when: (s) => s.merchantHere,
  },

  wardens: {
    id: 'wardens',
    category: 'expedition',
    title: 'Wardens',
    icon: '👑',
    body: [
      'Every place has a **Warden**. It only comes when called. Grow that place\'s Tendril to **Provoke** and the challenge shows up in The Wilds.',
      'Each Warden has a rule that beats the obvious plan. We\'ll probably lose the first time. Read the **Verbose** log to see why, then answer it with mutations from places we\'ve already been.',
      'The first win drops a **Seal**, the only way into the next place. After that it comes back **Rekindled**, much harder, carrying the **Core** its Tendril needs.',
    ],
    when: (s) => s.wardenProvoked,
  },

  tendrils: {
    id: 'tendrils',
    category: 'hive',
    title: 'Tendrils',
    icon: '🌲',
    body: [
      'The nucleus reaches a new place by growing a **Tendril** into it. Each one has three levels.',
      '**Reach** opens the place, and costs the Seal from the Warden before it. **Provoke** lets you call this place\'s Warden, and costs a pile of its ordinary materials.',
      '**Root** is last. It costs a Warden\'s Core and gives a small bonus that lasts forever.',
    ],
    when: (s) => s.tab === 'hive' && s.tendrilLevels > 1,
  },

  elements: {
    id: 'elements',
    category: 'expedition',
    title: 'We soak things up',
    icon: '🔥',
    body: [
      'Our skin takes in whatever a place is made of. Fight somewhere fiery for long enough and you get a fire slime.',
      'At 100% it sets for good. **Fire beats Nature, Nature beats Earth, Earth beats Water, Water beats Fire.**',
      'Some mutations **feed on it**. Pyrolyze burns hotter in a fire slime. Permafrost bites harder in a water one.',
    ],
    when: (s) => s.affinityUnlocked,
  },

  skills: {
    id: 'skills',
    category: 'hive',
    title: 'Instincts',
    icon: '🌳',
    body: [
      'Every Queen level gives you a point. Spend points on **Instincts** to teach us new things.',
      'Most Instincts change how something works. Some open up whole new parts of the nucleus.',
      'New places aren\'t bought here. Those need Tendrils, and Tendrils need Seals.',
    ],
    when: (s) => s.tab === 'hive' && s.skillPoints > 0,
  },

  verboseLog: {
    id: 'verboseLog',
    category: 'expedition',
    title: 'How a fight went',
    icon: '📊',
    body: [
      'Tap **Verbose** under any battle log and it shows the math behind every number.',
      'You get every bonus by name, and every roll, even the ones that missed.',
      'If a fight feels wrong, look here first.',
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
