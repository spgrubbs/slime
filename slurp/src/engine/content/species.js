// Starting slimes. Each one bends a rule of absorption. Base stats are
// deliberately weak — permanent Brood Pool upgrades are what carry a slime
// toward the end game (GDD §12).

export const SPECIES = {
  gloop: {
    name: 'Gloop', icon: '🟢', color: '#4ade80', title: 'The Omnivore',
    tags: ['ooze', 'heal'],
    base: { mass: 65, firm: 5, slip: 4, visc: 4 },
    innate: 'Absorb offers show 1 extra option',
    starter: 'bounce',
    rules: { absorbOptions: 1 },
  },
  ironjelly: {
    name: 'Ironjelly', icon: '⚙️', color: '#94a3b8', title: 'The Bulwark',
    tags: ['construct', 'membrane', 'earth'],
    base: { mass: 80, firm: 5, slip: 2, visc: 3 },
    innate: 'Stat essences give 50% more. One less capacity before Bloat',
    starter: 'plating',
    rules: { statMult: 1.5, slots: -1 },
  },
  prismjelly: {
    name: 'Prismjelly', icon: '💎', color: '#c084fc', title: 'The Refiner',
    tags: ['crit', 'water'],
    base: { mass: 50, firm: 4, slip: 4, visc: 6 },
    innate: 'Fuses at 2 / 4 copies instead of 3 / 6, but offers show 1 fewer option',
    starter: 'glimmer',
    rules: { copiesFor: [1, 2, 4], absorbOptions: -1 },
  },
  mimic: {
    name: 'Mimic', icon: '🪞', color: '#f472b6', title: 'The Copycat',
    tags: ['spirit', 'speed'],
    base: { mass: 55, firm: 4, slip: 6, visc: 4 },
    innate: "Copies the enemy's signature essence (Level I) at the start of every battle",
    starter: 'jiggle',
    rules: { mimic: true },
  },
};
