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
// Flat bonuses survive in exactly one place: CAPACITY. Royal jelly, ranch
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
    description: 'How your slimes travel, hunt and come home',
    skills: {
      expeditionBasics: {
        id: 'expeditionBasics',
        name: 'Questing Instinct',
        icon: '🗺️',
        desc: 'Enables expeditions',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Enables expeditions' },
        position: { x: 50, y: 8 },
      },

      scoutingParty: {
        id: 'scoutingParty',
        name: 'Sensory Tendrils',
        icon: '👁️',
        desc: 'See a monster\'s stats before engaging',
        cost: 1,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Show monster HP/DMG in zone select' },
        position: { x: 22, y: 20 },
      },

      secondWind: {
        id: 'secondWind',
        name: 'Second Wind',
        icon: '🌬️',
        desc: 'Travel recovery also sheds one harmful status',
        cost: 2,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Clears one debuff per travel leg' },
        position: { x: 50, y: 20 },
      },

      salvage: {
        id: 'salvage',
        name: 'Salvage Rites',
        icon: '📦',
        desc: 'Materials a party was carrying survive a wipe',
        cost: 3,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Carried materials are kept on a wipe' },
        position: { x: 78, y: 20 },
      },

      vanguard: {
        id: 'vanguard',
        name: 'Vanguard',
        icon: '⚡',
        desc: 'Your party always acts first in the opening round',
        cost: 3,
        requires: ['secondWind'],
        effect: { type: 'passive', desc: 'Party wins initiative on round 1' },
        position: { x: 36, y: 33 },
      },

      dissection: {
        id: 'dissection',
        name: 'Careful Dissection',
        icon: '🔪',
        desc: 'Every kill yields at least one material',
        cost: 3,
        requires: ['salvage'],
        effect: { type: 'passive', desc: 'Guarantees a material per kill' },
        position: { x: 70, y: 33 },
      },

      swiftExpeditionSkill: {
        id: 'swiftExpeditionSkill',
        name: 'Quickslime Secretion',
        icon: '🏃',
        desc: 'Unlock the Swift Expedition pheromone',
        cost: 2,
        requires: ['scoutingParty'],
        effect: { type: 'pheromone', ability: 'swiftExpedition' },
        position: { x: 14, y: 33 },
      },

      tacticalRetreat: {
        id: 'tacticalRetreat',
        name: 'Survival Reflex',
        icon: '🛡️',
        desc: 'Once per expedition, a slime survives a killing blow at 1 HP',
        cost: 4,
        requires: ['vanguard'],
        effect: { type: 'passive', desc: 'One death prevented per expedition' },
        position: { x: 36, y: 46 },
      },

      fieldTriage: {
        id: 'fieldTriage',
        name: 'Field Triage',
        icon: '🩹',
        desc: 'A slime that goes down keeps the biomass it was carrying',
        cost: 4,
        requires: ['dissection'],
        effect: { type: 'passive', desc: 'Wounds no longer spill carried biomass' },
        position: { x: 70, y: 46 },
      },

      sharedVigorSkill: {
        id: 'sharedVigorSkill',
        name: 'Hive Resonance',
        icon: '💞',
        desc: 'Unlock the Shared Vigor pheromone',
        cost: 3,
        requires: ['swiftExpeditionSkill'],
        effect: { type: 'pheromone', ability: 'sharedVigor' },
        position: { x: 14, y: 46 },
      },

      trophyHunter: {
        id: 'trophyHunter',
        name: 'Trophy Hunter',
        icon: '🏆',
        desc: 'A rare monster always surrenders its mutagen',
        cost: 4,
        requires: ['tacticalRetreat'],
        effect: { type: 'passive', desc: 'Rare kills guarantee a mutagen' },
        position: { x: 50, y: 59 },
      },

      pathfinder: {
        id: 'pathfinder',
        name: 'Pathfinder',
        icon: '🧭',
        desc: 'Parties travel between fights without stopping',
        cost: 4,
        requires: ['fieldTriage'],
        effect: { type: 'passive', desc: 'Removes the travel pause' },
        position: { x: 76, y: 59 },
      },

      evolutionPulseSkill: {
        id: 'evolutionPulseSkill',
        name: 'Mutagenic Bloom',
        icon: '🧬',
        desc: 'Unlock the Evolution Pulse pheromone',
        cost: 4,
        requires: ['sharedVigorSkill'],
        effect: { type: 'pheromone', ability: 'evolutionPulse' },
        position: { x: 18, y: 59 },
      },

      rally: {
        id: 'rally',
        name: 'Rally',
        icon: '📣',
        desc: 'When a slime falls, the survivors close ranks and heal',
        cost: 5,
        requires: ['trophyHunter'],
        effect: { type: 'passive', desc: 'Survivors heal 25% when one goes down' },
        position: { x: 40, y: 74 },
      },

      quarry: {
        id: 'quarry',
        name: 'Quarry Scent',
        icon: '🩸',
        desc: 'Rare monsters are drawn to your parties — they appear far more often',
        cost: 5,
        requires: ['pathfinder'],
        effect: { type: 'bonus', stat: 'rareSpawn', value: 150 },
        position: { x: 68, y: 74 },
      },

      relentless: {
        id: 'relentless',
        name: 'Relentless',
        icon: '🔥',
        desc: 'Five kills without a casualty grants the party a free round',
        cost: 6,
        requires: ['rally', 'quarry'],
        effect: { type: 'passive', desc: 'Kill streaks grant an extra round' },
        position: { x: 54, y: 90 },
      },
    },
  },

  hive: {
    name: 'Hive Growth',
    icon: '🏛️',
    color: '#a855f7',
    description: 'What the hive can hold, build and take back',
    skills: {
      hiveFoundation: {
        id: 'hiveFoundation',
        name: 'Load-Bearing Ooze',
        icon: '🏛️',
        desc: 'Enables buildings',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Enables buildings' },
        position: { x: 50, y: 8 },
      },

      jellyProduction: {
        id: 'jellyProduction',
        name: 'Royal Jelly Glands',
        icon: '🍯',
        desc: '+15 royal jelly — a bigger brood',
        cost: 1,
        requires: ['hiveFoundation'],
        effect: { type: 'bonus', stat: 'maxJelly', value: 15 },
        position: { x: 24, y: 20 },
      },

      spawningVatUnlock: {
        id: 'spawningVatUnlock',
        name: 'Vat Cultivation',
        icon: '🧫',
        desc: 'Unlock the Spawning Vat',
        cost: 2,
        requires: ['hiveFoundation'],
        effect: { type: 'unlock', building: 'spawningVat' },
        position: { x: 50, y: 20 },
      },

      reclamation: {
        id: 'reclamation',
        name: 'Reclamation',
        icon: '♻️',
        desc: 'Reabsorbing a slime returns everything it cost, not a fraction',
        cost: 2,
        requires: ['hiveFoundation'],
        effect: { type: 'passive', desc: 'Full biomass back on reabsorb' },
        position: { x: 76, y: 20 },
      },

      researchLabUnlock: {
        id: 'researchLabUnlock',
        name: 'Culture Lab',
        icon: '🔬',
        desc: 'Unlock the Research Lab',
        cost: 2,
        requires: ['spawningVatUnlock'],
        effect: { type: 'unlock', building: 'researchLab' },
        position: { x: 38, y: 33 },
      },

      ranchBasics: {
        id: 'ranchBasics',
        name: 'Cultivation Pools',
        icon: '🏠',
        desc: 'Unlock ranches and the Convalescence Pool',
        cost: 2,
        requires: ['spawningVatUnlock'],
        effect: { type: 'unlock', feature: 'ranch' },
        position: { x: 62, y: 33 },
      },

      bountifulHarvestSkill: {
        id: 'bountifulHarvestSkill',
        name: 'Gorging Bloom',
        icon: '🌾',
        desc: 'Unlock the Bountiful Harvest pheromone',
        cost: 2,
        requires: ['jellyProduction'],
        effect: { type: 'pheromone', ability: 'bountifulHarvest' },
        position: { x: 14, y: 33 },
      },

      royalHatcheryUnlock: {
        id: 'royalHatcheryUnlock',
        name: 'Royal Brooding',
        icon: '🥚',
        desc: 'Unlock the Royal Hatchery',
        cost: 3,
        requires: ['researchLabUnlock'],
        effect: { type: 'unlock', building: 'royalHatchery' },
        position: { x: 38, y: 46 },
      },

      ranchExpansion: {
        id: 'ranchExpansion',
        name: 'Deeper Pools',
        icon: '🌊',
        desc: '+2 slots in every ranch and pool',
        cost: 3,
        requires: ['ranchBasics'],
        effect: { type: 'bonus', stat: 'ranchSlots', value: 2 },
        position: { x: 62, y: 46 },
      },

      fieldDressing: {
        id: 'fieldDressing',
        name: 'Field Dressing',
        icon: '🧵',
        desc: 'Wounded slimes mend slowly even outside a Convalescence Pool',
        cost: 3,
        requires: ['ranchExpansion'],
        effect: { type: 'passive', desc: 'Wounds heal at half rate with no slot' },
        position: { x: 78, y: 59 },
      },

      nurturingAuraSkill: {
        id: 'nurturingAuraSkill',
        name: 'Brooding Musk',
        icon: '💗',
        desc: 'Unlock the Nurturing Aura pheromone',
        cost: 3,
        requires: ['bountifulHarvestSkill'],
        effect: { type: 'pheromone', ability: 'nurturingAura' },
        position: { x: 14, y: 46 },
      },

      primordialChamberUnlock: {
        id: 'primordialChamberUnlock',
        name: 'Primordial Depths',
        icon: '👑',
        desc: 'Unlock the Primordial Chamber',
        cost: 5,
        requires: ['royalHatcheryUnlock'],
        effect: { type: 'unlock', building: 'primordialChamber' },
        position: { x: 38, y: 59 },
      },

      slimePitUnlock: {
        id: 'slimePitUnlock',
        name: 'The Pit',
        icon: '🕳️',
        desc: 'Unlock the Slime Pit',
        cost: 4,
        requires: ['primordialChamberUnlock'],
        effect: { type: 'unlock', building: 'slimePit' },
        position: { x: 30, y: 74 },
      },

      dismantle: {
        id: 'dismantle',
        name: 'Dismantling',
        icon: '🔨',
        desc: 'Buildings can be torn down for everything they cost',
        cost: 4,
        requires: ['fieldDressing'],
        effect: { type: 'passive', desc: 'Full refund on dismantling a building' },
        position: { x: 66, y: 74 },
      },

      economyMastery: {
        id: 'economyMastery',
        name: 'The Deep Hive',
        icon: '🏰',
        desc: '+30 royal jelly and +2 more pool slots',
        cost: 6,
        requires: ['slimePitUnlock', 'dismantle'],
        effect: { type: 'bonus', stat: 'maxJelly', value: 30, also: { ranchSlots: 2 } },
        position: { x: 48, y: 90 },
      },
    },
  },

  combat: {
    name: 'Slime Combat',
    icon: '⚔️',
    color: '#ef4444',
    description: 'How your slimes fight, not how hard they hit',
    skills: {
      combatTraining: {
        id: 'combatTraining',
        name: 'Killing Instinct',
        icon: '⚔️',
        desc: 'Enables combat training',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Enables combat' },
        position: { x: 50, y: 8 },
      },

      secondSkin: {
        id: 'secondSkin',
        name: 'Second Skin',
        icon: '🛡️',
        desc: 'The first harmful status each fight slides off',
        cost: 1,
        requires: ['combatTraining'],
        effect: { type: 'passive', desc: 'Blocks the first debuff per fight' },
        position: { x: 24, y: 20 },
      },

      opportunist: {
        id: 'opportunist',
        name: 'Opportunist',
        icon: '🎯',
        desc: 'The slime that lands a killing blow strikes again immediately',
        cost: 2,
        requires: ['combatTraining'],
        effect: { type: 'passive', desc: 'Killing blow grants an extra action' },
        position: { x: 50, y: 20 },
      },

      adaptiveCarapace: {
        id: 'adaptiveCarapace',
        name: 'Adaptive Carapace',
        icon: '🔰',
        desc: 'Being hit by an element hardens you against it for the fight',
        cost: 2,
        requires: ['combatTraining'],
        effect: { type: 'passive', desc: 'Stacking resistance to repeated elements' },
        position: { x: 76, y: 20 },
      },

      contagion: {
        id: 'contagion',
        name: 'Contagion',
        icon: '🦠',
        desc: 'Statuses on a dying monster carry to whatever comes next',
        cost: 3,
        requires: ['secondSkin'],
        effect: { type: 'passive', desc: 'Debuffs persist across encounters' },
        position: { x: 24, y: 34 },
      },

      focusedVenom: {
        id: 'focusedVenom',
        name: 'Focused Venom',
        icon: '🧪',
        desc: 'Your damage-over-time effects last twice as long',
        cost: 3,
        requires: ['opportunist'],
        effect: { type: 'passive', desc: 'Doubles poison, burn and bleed duration' },
        position: { x: 50, y: 34 },
      },

      elementalCycling: {
        id: 'elementalCycling',
        name: 'Elemental Cycling',
        icon: '🌀',
        desc: 'A slime striking an element it beats also strips that element\'s resistance',
        cost: 3,
        requires: ['adaptiveCarapace'],
        effect: { type: 'passive', desc: 'Advantageous hits ignore resistance' },
        position: { x: 76, y: 34 },
      },

      spawnBoostSkill: {
        id: 'spawnBoostSkill',
        name: 'Rapid Division',
        icon: '⚡',
        desc: 'Unlock the Spawn Boost pheromone',
        cost: 3,
        requires: ['contagion'],
        effect: { type: 'pheromone', ability: 'spawnBoost' },
        position: { x: 14, y: 48 },
      },

      regeneration: {
        id: 'regeneration',
        name: 'Knitting Flesh',
        icon: '💚',
        desc: 'Slimes mend a little at the end of every round',
        cost: 3,
        requires: ['focusedVenom'],
        effect: { type: 'passive', desc: 'Passive healing each round' },
        position: { x: 40, y: 48 },
      },

      ambushSlots: {
        id: 'ambushSlots',
        name: 'Raiding Party',
        icon: '🎯',
        desc: '+2 slimes in the caravan ambush squad',
        cost: 4,
        requires: ['elementalCycling'],
        effect: { type: 'bonus', stat: 'defenseSlots', value: 2 },
        position: { x: 76, y: 48 },
      },

      siegeEngineering: {
        id: 'siegeEngineering',
        name: 'Siege Engineering',
        icon: '🪃',
        desc: 'Unlock Slime Catapults on the road',
        cost: 4,
        requires: ['ambushSlots'],
        effect: { type: 'unlock', building: 'slimeCatapult' },
        position: { x: 84, y: 62 },
      },

      decoySkill: {
        id: 'decoySkill',
        name: 'Sacrificial Bud',
        icon: '🎭',
        desc: 'Unlock the Decoy pheromone',
        cost: 3,
        requires: ['spawnBoostSkill'],
        effect: { type: 'pheromone', ability: 'decoy' },
        position: { x: 14, y: 62 },
      },

      lastStand: {
        id: 'lastStand',
        name: 'Last Stand',
        icon: '🔥',
        desc: 'The final slime standing acts twice each round',
        cost: 4,
        requires: ['regeneration'],
        effect: { type: 'passive', desc: 'Sole survivor gains an extra action' },
        position: { x: 40, y: 62 },
      },

      extraMutationSlot: {
        id: 'extraMutationSlot',
        name: 'Unstable Genome',
        icon: '🧬',
        desc: '+1 mutation slot on every slime',
        cost: 5,
        requires: ['lastStand'],
        effect: { type: 'bonus', stat: 'mutationSlots', value: 1 },
        position: { x: 40, y: 76 },
      },

      renderingVat: {
        id: 'renderingVat',
        name: 'Rendering Vat',
        icon: '⚗️',
        desc: 'Unlock the Rendering Vat — recover mutagens from a dissolved slime',
        cost: 6,
        requires: ['extraMutationSlot'],
        effect: { type: 'unlock', building: 'renderingVat' },
        position: { x: 30, y: 90 },
      },

      combatMastery: {
        id: 'combatMastery',
        name: 'Apex Predator',
        icon: '👑',
        desc: 'Mutation passives trigger twice as often',
        cost: 6,
        requires: ['extraMutationSlot', 'siegeEngineering'],
        effect: { type: 'passive', desc: 'Doubles mutation proc chances' },
        position: { x: 62, y: 90 },
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
