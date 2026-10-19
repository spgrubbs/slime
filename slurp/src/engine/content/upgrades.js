// Brood Pool upgrades — permanent, bought with Genes between runs (GDD §12).
// This is the main progression: a fresh slime is meant to lose, and these are
// what eventually carry one through the Hollow One and up the Salt ladder.

export const UPGRADES = {
  thickMembrane: { name: 'Thick Membrane', icon: '🫧', max: 25, base: 15, growth: 1.22, desc: (n) => `+${n * 8} max Mass` },
  denseCore:     { name: 'Dense Core',     icon: '💪', max: 20, base: 20, growth: 1.25, desc: (n) => `+${n} FIRM` },
  slickSkin:     { name: 'Slick Skin',     icon: '💨', max: 15, base: 20, growth: 1.28, desc: (n) => `+${n} SLIP` },
  viscous:       { name: 'Viscous',        icon: '🌀', max: 15, base: 18, growth: 1.27, desc: (n) => `+${n} VISC` },
  flavorMemory:  { name: 'Flavor Memory',  icon: '👅', max: 3,  base: 30, growth: 2.2,  desc: (n) => `Essences sharing your tags are more likely in offers (+${[0, 10, 18, 30][n]}% per matching tag)` },
  regrowth:      { name: 'Regrowth',       icon: '💚', max: 4,  base: 40, growth: 1.7,  desc: (n) => `Heal ${n * 4}% max Mass after every win` },
  gelGlands:     { name: 'Gel Glands',     icon: '💧', max: 4,  base: 30, growth: 1.6,  desc: (n) => `+${n * 15}% Gel` },
  headStart:     { name: 'Head Start',     icon: '🎒', max: 3,  base: 25, growth: 1.8,  desc: (n) => `Start runs with ${n * 40} Gel` },
  deepPools:     { name: 'Deep Pools',     icon: '♨️', max: 2,  base: 60, growth: 2,    desc: (n) => `Pools heal +${n * 10}%` },
  vacuole:       { name: 'Extra Vacuole',  icon: '🫙', max: 3,  base: 90, growth: 2.2,  desc: (n) => `+${n} capacity before Bloat` },
  secondHelping: { name: 'Second Helping', icon: '🍽️', max: 1,  base: 150, growth: 1,   desc: () => '+1 option on every absorb offer' },
  heirloom:      { name: 'Ancestral Memory', icon: '🧬', max: 1, base: 200, growth: 1,  desc: () => 'Start runs with 1 copy of your banked Heirloom essence' },
  // Species unlocks are one-rank upgrades.
  unlockIronjelly:  { name: 'Hatch Ironjelly',  icon: '⚙️', max: 1, base: 120, growth: 1, species: 'ironjelly', desc: () => 'Unlocks Ironjelly, the Bulwark' },
  unlockPrismjelly: { name: 'Hatch Prismjelly', icon: '💎', max: 1, base: 250, growth: 1, species: 'prismjelly', desc: () => 'Unlocks Prismjelly, the Refiner' },
  unlockMimic:      { name: 'Hatch Mimic',      icon: '🪞', max: 1, base: 250, growth: 1, species: 'mimic', desc: () => 'Unlocks Mimic, the Copycat' },
};

export const upgradeCost = (id, rank) => {
  const u = UPGRADES[id];
  return Math.round(u.base * Math.pow(u.growth, rank));
};

/** Genes earned at the end of a run. */
export function genesFor(stats, salt = 0) {
  const raw = stats.floors * 4 + stats.kills * 3 + stats.elites * 10 + stats.bosses * 30 + stats.fusions * 5 + (stats.won ? 100 : 0);
  return Math.round(raw * (1 + 0.1 * salt));
}
