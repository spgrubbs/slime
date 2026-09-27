// Skill Tree Data - Queen progression system
//
// Three trees. Skills cost points earned on Queen levels and may require
// prerequisites.
//
// THE RULE THIS TREE IS WRITTEN TO: a skill should change how something works,
// not how big a number is. "+8% firmness" is not a decision — you take it when
// you can afford it and never think about it again. "Materials survive a wipe"
// changes how far you are willing to push an expedition.
//
// Flat bonuses survive in exactly one place: CAPACITY. Plasm, ranch
// slots, mutation slots and ambush slots are quantities by nature, and a
// capacity increase does change what you can field.
//
// Effect types:
// - passive: always active once purchased; the id is checked where it matters
// - unlock:  opens a feature, building or zone
// - pheromone: unlocks a mana ability
// - bonus:   a flat number — capacity only, by the rule above

export const SKILL_TREES = {
  expedition: {
    name: 'Ooze Outreach',
    icon: '🗺️',
    color: '#22d3ee',
    description: 'How we travel, hunt and come home',
    skills: {
      expeditionBasics: {
        id: 'expeditionBasics',
        name: 'Questing Instinct',
        icon: '🗺️',
        desc: 'We go out into the wilds and come back full.',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Expeditions' },
        position: { x: 50, y: 7 },
      },

      mutagenesis: {
        id: 'mutagenesis',
        name: 'Unstable Genes',
        icon: '🧬',
        desc: 'Our genes come loose. Monsters start dropping mutagens, and we can take them in.',
        cost: 1,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Mutagen drops and mutation slots' },
        position: { x: 18, y: 19 },
      },

      affinity: {
        id: 'affinity',
        name: 'Porous Membrane',
        icon: '🌈',
        desc: 'Our skin goes soft enough to soak up where we fight. Stay somewhere long enough and we take on its element.',
        cost: 2,
        requires: ['mutagenesis'],
        effect: { type: 'passive', desc: 'Elemental affinity' },
        position: { x: 8, y: 32 },
      },

      secondWind: {
        id: 'secondWind',
        name: 'Second Wind',
        icon: '🌬️',
        desc: 'On the road between fights, each of us also shakes off one bad status.',
        cost: 2,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Travel clears one debuff per slime' },
        position: { x: 50, y: 19 },
      },

      salvage: {
        id: 'salvage',
        name: 'Salvage Rites',
        icon: '📦',
        desc: 'If a party is wiped, the materials it was carrying still make it home.',
        cost: 3,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Carried materials survive a wipe' },
        position: { x: 82, y: 19 },
      },

      vanguard: {
        id: 'vanguard',
        name: 'Vanguard',
        icon: '⚡',
        desc: 'We always move first in the opening round of every fight.',
        cost: 3,
        requires: ['secondWind'],
        effect: { type: 'passive', desc: 'Party acts first on round 1' },
        position: { x: 50, y: 32 },
      },

      dissection: {
        id: 'dissection',
        name: 'Careful Dissection',
        icon: '🔪',
        desc: 'Every kill gives at least one material. Nothing gets eaten for nothing.',
        cost: 3,
        requires: ['salvage'],
        effect: { type: 'passive', desc: 'At least one material per kill' },
        position: { x: 82, y: 32 },
      },

      swiftExpeditionSkill: {
        id: 'swiftExpeditionSkill',
        name: 'Quickslime Secretion',
        icon: '🏃',
        desc: 'Learn the Swift Expedition pheromone.',
        cost: 2,
        requires: ['mutagenesis'],
        effect: { type: 'pheromone', ability: 'swiftExpedition' },
        position: { x: 28, y: 32 },
      },

      thirdFront: {
        id: 'thirdFront',
        name: 'Many Pseudopods',
        icon: '🗺️',
        desc: 'Send a third party out at the same time.',
        cost: 5,
        requires: ['secondFront', 'trophyHunter'],
        effect: { type: 'bonus', stat: 'expeditionSlots', value: 1 },
        position: { x: 34, y: 72 },
      },

      secondFront: {
        id: 'secondFront',
        name: 'Split Column',
        icon: '🗺️',
        desc: 'Send a second party out at the same time.',
        cost: 3,
        requires: ['vanguard'],
        effect: { type: 'bonus', stat: 'expeditionSlots', value: 1 },
        position: { x: 40, y: 45 },
      },

      tacticalRetreat: {
        id: 'tacticalRetreat',
        name: 'Survival Reflex',
        icon: '🛡️',
        desc: 'Once per expedition, a slime that takes a killing blow hangs on at 1 HP.',
        cost: 4,
        requires: ['vanguard'],
        effect: { type: 'passive', desc: 'One saved fall per expedition' },
        position: { x: 60, y: 45 },
      },

      fieldTriage: {
        id: 'fieldTriage',
        name: 'Field Triage',
        icon: '🩹',
        desc: 'A slime that falls keeps the biomass it was carrying.',
        cost: 4,
        requires: ['dissection'],
        effect: { type: 'passive', desc: 'Wounds no longer spill carried biomass' },
        position: { x: 82, y: 45 },
      },

      sharedVigorSkill: {
        id: 'sharedVigorSkill',
        name: 'Hive Resonance',
        icon: '💞',
        desc: 'Learn the Shared Vigor pheromone.',
        cost: 3,
        requires: ['swiftExpeditionSkill'],
        effect: { type: 'pheromone', ability: 'sharedVigor' },
        position: { x: 22, y: 45 },
      },

      trophyHunter: {
        id: 'trophyHunter',
        name: 'Trophy Hunter',
        icon: '🏆',
        desc: 'The first rare monster we catch on each trip always drops its mutagen.',
        cost: 4,
        requires: ['tacticalRetreat'],
        effect: { type: 'passive', desc: 'First rare kill each expedition drops its mutagen' },
        position: { x: 58, y: 58 },
      },

      pathfinder: {
        id: 'pathfinder',
        name: 'Pathfinder',
        icon: '🧭',
        desc: 'We travel between fights without stopping. Road events still happen.',
        cost: 4,
        requires: ['fieldTriage'],
        effect: { type: 'passive', desc: 'No travel pause' },
        position: { x: 82, y: 58 },
      },

      evolutionPulseSkill: {
        id: 'evolutionPulseSkill',
        name: 'Mutagenic Bloom',
        icon: '🧬',
        desc: 'Learn the Evolution Pulse pheromone.',
        cost: 4,
        requires: ['sharedVigorSkill'],
        effect: { type: 'pheromone', ability: 'evolutionPulse' },
        position: { x: 16, y: 58 },
      },

      rally: {
        id: 'rally',
        name: 'Rally',
        icon: '📣',
        desc: 'When one of us falls, the rest pull together and heal 25% of their health.',
        cost: 5,
        requires: ['trophyHunter'],
        effect: { type: 'passive', desc: 'Survivors heal 25% when one falls' },
        position: { x: 54, y: 72 },
      },

      quarry: {
        id: 'quarry',
        name: 'Quarry Scent',
        icon: '🩸',
        desc: 'Rare monsters smell us coming and show up much more often.',
        cost: 5,
        requires: ['pathfinder'],
        effect: { type: 'bonus', stat: 'rareSpawn', value: 150 },
        position: { x: 80, y: 72 },
      },

      relentless: {
        id: 'relentless',
        name: 'Relentless',
        icon: '🔥',
        desc: 'Five kills in a row with nobody falling earns the party a free round.',
        cost: 6,
        requires: ['rally', 'quarry'],
        effect: { type: 'passive', desc: 'Free round every 5 clean kills' },
        position: { x: 66, y: 87 },
      },
    },
  },

  hive: {
    name: 'Deep Culture',
    icon: '🏛️',
    color: '#a855f7',
    description: 'What the nucleus can hold, build and take back',
    skills: {
      hiveFoundation: {
        id: 'hiveFoundation',
        name: 'Load-Bearing Ooze',
        icon: '🏛️',
        desc: 'The nucleus itself. Everything else grows out of it.',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'The nucleus' },
        position: { x: 50, y: 6 },
      },

      masonry: {
        id: 'masonry',
        name: 'Calcified Frame',
        icon: '🏗️',
        desc: 'The nucleus hardens enough to carry structures. Unlocks buildings.',
        cost: 1,
        requires: ['hiveFoundation'],
        effect: { type: 'unlock', feature: 'building' },
        position: { x: 50, y: 17 },
      },

      jellyProduction: {
        id: 'jellyProduction',
        name: 'Plasm Glands',
        icon: '🫧',
        desc: '+15 plasm. Room for more of us.',
        cost: 1,
        requires: ['masonry'],
        effect: { type: 'bonus', stat: 'maxJelly', value: 15 },
        position: { x: 20, y: 29 },
      },

      spawningVatUnlock: {
        id: 'spawningVatUnlock',
        name: 'Vat Cultivation',
        icon: '🧫',
        desc: 'Unlocks the Spawning Vat, for budding Enhanced slimes.',
        cost: 2,
        requires: ['masonry'],
        effect: { type: 'unlock', building: 'spawningVat' },
        position: { x: 50, y: 29 },
      },

      reclamation: {
        id: 'reclamation',
        name: 'Reclamation',
        icon: '♻️',
        desc: 'Reabsorbing a slime gives back everything it cost.',
        cost: 2,
        requires: ['masonry'],
        effect: { type: 'passive', desc: 'Full biomass back on reabsorb' },
        position: { x: 80, y: 29 },
      },

      barter: {
        id: 'barter',
        name: 'Trade Musk',
        icon: '🐌',
        desc: 'A smell that says "we have things." Mossback the peddler starts coming by.',
        cost: 1,
        requires: ['masonry'],
        effect: { type: 'unlock', feature: 'merchant' },
        position: { x: 92, y: 42 },
      },

      researchLabUnlock: {
        id: 'researchLabUnlock',
        name: 'Culture Lab',
        icon: '🔬',
        desc: 'Unlocks the Research Chamber.',
        cost: 2,
        requires: ['spawningVatUnlock'],
        effect: { type: 'unlock', building: 'researchLab' },
        position: { x: 38, y: 42 },
      },

      ranchBasics: {
        id: 'ranchBasics',
        name: 'Cultivation Pools',
        icon: '🏠',
        desc: 'Unlocks the pools, including the Convalescence Pool for the wounded.',
        cost: 2,
        requires: ['spawningVatUnlock'],
        effect: { type: 'unlock', feature: 'ranch' },
        position: { x: 64, y: 42 },
      },

      bountifulHarvestSkill: {
        id: 'bountifulHarvestSkill',
        name: 'Gorging Bloom',
        icon: '🌾',
        desc: 'Learn the Bountiful Harvest pheromone.',
        cost: 2,
        requires: ['jellyProduction'],
        effect: { type: 'pheromone', ability: 'bountifulHarvest' },
        position: { x: 12, y: 42 },
      },

      royalHatcheryUnlock: {
        id: 'royalHatcheryUnlock',
        name: 'Deep Gestation',
        icon: '🥚',
        desc: 'Unlocks the Gestation Pool, for budding Elite slimes.',
        cost: 3,
        requires: ['researchLabUnlock'],
        effect: { type: 'unlock', building: 'royalHatchery' },
        position: { x: 38, y: 55 },
      },

      ranchExpansion: {
        id: 'ranchExpansion',
        name: 'Deeper Pools',
        icon: '🌊',
        desc: '+2 slots in every pool.',
        cost: 3,
        requires: ['ranchBasics'],
        effect: { type: 'bonus', stat: 'ranchSlots', value: 2 },
        position: { x: 68, y: 55 },
      },

      fieldDressing: {
        id: 'fieldDressing',
        name: 'Field Dressing',
        icon: '🧵',
        desc: 'Wounded slimes mend slowly on their own, even without a Convalescence Pool.',
        cost: 3,
        requires: ['ranchExpansion'],
        effect: { type: 'passive', desc: 'Wounds mend at half speed outside a pool' },
        position: { x: 72, y: 68 },
      },

      nurturingAuraSkill: {
        id: 'nurturingAuraSkill',
        name: 'Nurturing Musk',
        icon: '💗',
        desc: 'Learn the Nurturing Aura pheromone.',
        cost: 3,
        requires: ['bountifulHarvestSkill'],
        effect: { type: 'pheromone', ability: 'nurturingAura' },
        position: { x: 12, y: 55 },
      },

      primordialChamberUnlock: {
        id: 'primordialChamberUnlock',
        name: 'Primordial Depths',
        icon: '👑',
        desc: 'Unlocks the Primordial Chamber, for budding Royal slimes.',
        cost: 5,
        requires: ['royalHatcheryUnlock'],
        effect: { type: 'unlock', building: 'primordialChamber' },
        position: { x: 38, y: 68 },
      },

      slimePitUnlock: {
        id: 'slimePitUnlock',
        name: 'The Pit',
        icon: '🕳️',
        desc: 'Unlocks the Slime Pit, for more plasm.',
        cost: 4,
        requires: ['primordialChamberUnlock'],
        effect: { type: 'unlock', building: 'slimePit' },
        position: { x: 32, y: 80 },
      },

      dismantle: {
        id: 'dismantle',
        name: 'Dismantling',
        icon: '🔨',
        desc: 'Buildings can be pulled down for everything they cost.',
        cost: 4,
        requires: ['fieldDressing'],
        effect: { type: 'passive', desc: 'Full refund when dismantling' },
        position: { x: 68, y: 80 },
      },

      economyMastery: {
        id: 'economyMastery',
        name: 'The Deep Culture',
        icon: '🏰',
        desc: '+30 plasm and +2 more slots in every pool.',
        cost: 6,
        requires: ['slimePitUnlock', 'dismantle'],
        effect: { type: 'bonus', stat: 'maxJelly', value: 30, also: { ranchSlots: 2 } },
        position: { x: 50, y: 92 },
      },
    },
  },

  combat: {
    name: 'Slime Combat',
    icon: '⚔️',
    color: '#ef4444',
    description: 'How we fight, not how hard we hit',
    skills: {
      combatTraining: {
        id: 'combatTraining',
        name: 'Killing Instinct',
        icon: '⚔️',
        desc: 'We know how to hurt things.',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Combat' },
        position: { x: 50, y: 6 },
      },

      raiding: {
        id: 'raiding',
        name: 'Road Sense',
        icon: '🎯',
        desc: 'We learn the humans\' supply routes. Opens The Road.',
        cost: 2,
        requires: ['combatTraining'],
        effect: { type: 'unlock', feature: 'caravan' },
        position: { x: 86, y: 19 },
      },

      secondSkin: {
        id: 'secondSkin',
        name: 'Second Skin',
        icon: '🛡️',
        desc: 'The first bad status in each fight slides right off.',
        cost: 1,
        requires: ['combatTraining'],
        effect: { type: 'passive', desc: 'Blocks the first debuff each fight' },
        position: { x: 14, y: 19 },
      },

      opportunist: {
        id: 'opportunist',
        name: 'Opportunist',
        icon: '🎯',
        desc: 'Each slime\'s first swing in every fight is a critical hit.',
        cost: 2,
        requires: ['combatTraining'],
        effect: { type: 'passive', desc: 'First swing each fight always crits' },
        position: { x: 38, y: 19 },
      },

      adaptiveCarapace: {
        id: 'adaptiveCarapace',
        name: 'Adaptive Carapace',
        icon: '🔰',
        desc: 'Getting hit by an element toughens us against it for the rest of the fight.',
        cost: 2,
        requires: ['combatTraining'],
        effect: { type: 'passive', desc: 'Stacking resistance to repeated elements' },
        position: { x: 62, y: 19 },
      },

      contagion: {
        id: 'contagion',
        name: 'Contagion',
        icon: '🦠',
        desc: 'Whatever was eating the last monster moves on to the next one.',
        cost: 3,
        requires: ['secondSkin'],
        effect: { type: 'passive', desc: 'Debuffs carry over to the next monster' },
        position: { x: 14, y: 32 },
      },

      focusedVenom: {
        id: 'focusedVenom',
        name: 'Focused Venom',
        icon: '🧪',
        desc: 'Our poison, burn and bleed last twice as long.',
        cost: 3,
        requires: ['opportunist'],
        effect: { type: 'passive', desc: 'Double poison, burn and bleed duration' },
        position: { x: 38, y: 32 },
      },

      elementalCycling: {
        id: 'elementalCycling',
        name: 'Elemental Cycling',
        icon: '🌀',
        desc: 'When we hit an element we beat, its resistance doesn\'t count.',
        cost: 3,
        requires: ['adaptiveCarapace'],
        effect: { type: 'passive', desc: 'Winning matchups ignore resistance' },
        position: { x: 62, y: 32 },
      },

      spawnBoostSkill: {
        id: 'spawnBoostSkill',
        name: 'Rapid Division',
        icon: '⚡',
        desc: 'Learn the Primal Blessing pheromone.',
        cost: 3,
        requires: ['contagion'],
        effect: { type: 'pheromone', ability: 'spawnBoost' },
        position: { x: 14, y: 45 },
      },

      regeneration: {
        id: 'regeneration',
        name: 'Knitting Flesh',
        icon: '💚',
        desc: 'We mend 1 HP at the start of every round.',
        cost: 3,
        requires: ['focusedVenom'],
        effect: { type: 'passive', desc: '+1 HP each round' },
        position: { x: 38, y: 45 },
      },

      ambushSlots: {
        id: 'ambushSlots',
        name: 'Raiding Party',
        icon: '🎯',
        desc: '+2 slimes in the caravan ambush squad.',
        cost: 4,
        requires: ['raiding'],
        effect: { type: 'bonus', stat: 'defenseSlots', value: 2 },
        position: { x: 86, y: 32 },
      },

      siegeEngineering: {
        id: 'siegeEngineering',
        name: 'Siege Engineering',
        icon: '🪃',
        desc: 'Unlocks Slime Catapults for the road.',
        cost: 4,
        requires: ['ambushSlots'],
        effect: { type: 'unlock', building: 'slimeCatapult' },
        position: { x: 86, y: 45 },
      },

      decoySkill: {
        id: 'decoySkill',
        name: 'Sacrificial Bud',
        icon: '🎭',
        desc: 'Learn the Slime Decoy pheromone.',
        cost: 3,
        requires: ['spawnBoostSkill'],
        effect: { type: 'pheromone', ability: 'decoy' },
        position: { x: 14, y: 58 },
      },

      lastStand: {
        id: 'lastStand',
        name: 'Last Stand',
        icon: '🔥',
        desc: 'The last slime standing acts twice every round.',
        cost: 4,
        requires: ['regeneration'],
        effect: { type: 'passive', desc: 'Sole survivor gets an extra action' },
        position: { x: 38, y: 58 },
      },

      extraMutationSlot: {
        id: 'extraMutationSlot',
        name: 'Unstable Genome',
        icon: '🧬',
        desc: '+1 mutation slot on every slime.',
        cost: 5,
        requires: ['lastStand'],
        effect: { type: 'bonus', stat: 'mutationSlots', value: 1 },
        position: { x: 38, y: 71 },
      },

      renderingVat: {
        id: 'renderingVat',
        name: 'Rendering Vat',
        icon: '⚗️',
        desc: 'Unlocks the Rendering Vat, which pulls mutagens back out of a reabsorbed slime.',
        cost: 6,
        requires: ['extraMutationSlot'],
        effect: { type: 'unlock', building: 'renderingVat' },
        position: { x: 26, y: 86 },
      },

      combatMastery: {
        id: 'combatMastery',
        name: 'Apex Predator',
        icon: '👑',
        desc: 'Every mutation works twice as hard: double the chance and double the effect.',
        cost: 6,
        requires: ['extraMutationSlot', 'siegeEngineering'],
        effect: { type: 'passive', desc: 'Mutation strength ×2' },
        position: { x: 62, y: 86 },
      },
    },
  },
};

export const getSkillPointsForLevel = (level) => level - 1;

// Calculate total skill points earned at a given level
export const getTotalSkillPoints = (level) => {
  let total = 0;
  for (let i = 1; i <= level; i++) {
    total += getSkillPointsForLevel(i);
  }
  return total;
};

// Get skill points per level (always 1 for now, but can be scaled)
export const SKILL_POINTS_PER_LEVEL = 1;

// Helper to check if a skill can be purchased
export const canPurchaseSkill = (skillId, tree, purchasedSkills, availablePoints) => {
  const skill = SKILL_TREES[tree]?.skills[skillId];
  if (!skill) return false;
  if (purchasedSkills.includes(skillId)) return false;
  if (skill.cost > availablePoints) return false;

  // Check prerequisites
  return skill.requires.every(reqId => purchasedSkills.includes(reqId));
};

// Get all effects from purchased skills
export const getSkillEffects = (purchasedSkills) => {
  const effects = {
    bonuses: {},
    unlocks: [],
    pheromones: [],
    passives: [],
    unlockedBuildings: [],
    unlockedFeatures: [],
  };

  Object.values(SKILL_TREES).forEach(tree => {
    Object.values(tree.skills).forEach(skill => {
      if (purchasedSkills.includes(skill.id)) {
        const eff = skill.effect;
        switch (eff.type) {
          case 'bonus':
            effects.bonuses[eff.stat] = (effects.bonuses[eff.stat] || 0) + eff.value;
            // A capstone may raise more than one capacity at once.
            if (eff.also) {
              for (const [k, v] of Object.entries(eff.also)) {
                effects.bonuses[k] = (effects.bonuses[k] || 0) + v;
              }
            }
            break;
          case 'unlock':
            effects.unlocks.push(eff);
            if (eff.building) effects.unlockedBuildings.push(eff.building);
            if (eff.feature) effects.unlockedFeatures.push(eff.feature);
            break;
          case 'pheromone':
            effects.pheromones.push(eff.ability);
            break;
          case 'passive':
            effects.passives.push(skill.id);
            break;
        }
      }
    });
  });

  return effects;
};

// Helper to check if a zone is unlocked
export const isBuildingUnlocked = (buildingId, purchasedSkills) => {
  // Some buildings don't need skill unlocks (research items)
  const skillGatedBuildings = ['spawningVat', 'royalHatchery', 'primordialChamber', 'slimePit', 'researchLab', 'slimeCatapult', 'renderingVat'];
  if (!skillGatedBuildings.includes(buildingId)) return true;

  const effects = getSkillEffects(purchasedSkills);
  return effects.unlockedBuildings.includes(buildingId);
};

// Helper to check if a pheromone ability is unlocked
export const isPheromoneUnlocked = (abilityId, purchasedSkills) => {
  const effects = getSkillEffects(purchasedSkills);
  return effects.pheromones.includes(abilityId);
};

// Helper to check if a feature is unlocked
export const isFeatureUnlocked = (featureId, purchasedSkills) => {
  // Ranch requires ranchBasics skill
  if (featureId === 'ranch') {
    return purchasedSkills.includes('ranchBasics');
  }
  const effects = getSkillEffects(purchasedSkills);
  return effects.unlockedFeatures.includes(featureId);
};
