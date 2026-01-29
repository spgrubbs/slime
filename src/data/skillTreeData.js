// Skill Tree Data - Queen progression system
// Skills are organized into three trees with branching paths
// Each skill costs skill points (earned on level up) and may require prerequisite skills

// Effect types:
// - passive: Always active once purchased
// - unlock: Unlocks a feature/ability
// - mana: Unlocks a new mana ability
// - bonus: Provides a percentage bonus

export const SKILL_TREES = {
  expedition: {
    name: 'Ooze Outreach',
    icon: '🗺️',
    color: '#22d3ee',
    description: 'Send your slimes farther, smarter, stronger',
    skills: {
      // Root skill
      expeditionBasics: {
        id: 'expeditionBasics',
        name: 'Slime Scouts',
        icon: '🥾',
        desc: 'Train slimes to venture beyond the hive',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Enables expeditions' },
        position: { x: 50, y: 10 },
      },

      // First tier
      swampAccess: {
        id: 'swampAccess',
        name: 'Mucus Membrane',
        icon: '🌿',
        desc: 'Slimes can traverse the Murky Swamp',
        cost: 2,
        requires: ['expeditionBasics'],
        effect: { type: 'unlock', zone: 'swamp' },
        position: { x: 50, y: 22 },
      },

      scoutingParty: {
        id: 'scoutingParty',
        name: 'Sensory Tendrils',
        icon: '👁️',
        desc: 'See monster stats before engaging',
        cost: 1,
        requires: ['expeditionBasics'],
        effect: { type: 'passive', desc: 'Show monster HP/DMG in zone select' },
        position: { x: 25, y: 22 },
      },

      forageExpertise: {
        id: 'forageExpertise',
        name: 'Absorptive Coating',
        icon: '🍄',
        desc: '+15% biomass from expeditions',
        cost: 1,
        requires: ['expeditionBasics'],
        effect: { type: 'bonus', stat: 'expeditionBiomass', value: 15 },
        position: { x: 75, y: 22 },
      },

      // Second tier
      cavesAccess: {
        id: 'cavesAccess',
        name: 'Crystalline Adaptation',
        icon: '💎',
        desc: 'Slimes can explore Crystal Grotto',
        cost: 3,
        requires: ['swampAccess'],
        effect: { type: 'unlock', zone: 'caves' },
        position: { x: 50, y: 34 },
      },

      swiftExpeditionSkill: {
        id: 'swiftExpeditionSkill',
        name: 'Quickslime Secretion',
        icon: '🏃',
        desc: 'Unlock Swift Expedition ability',
        cost: 2,
        requires: ['scoutingParty'],
        effect: { type: 'pheromone', ability: 'swiftExpedition' },
        position: { x: 15, y: 34 },
      },

      materialScavenger: {
        id: 'materialScavenger',
        name: 'Sticky Retrieval',
        icon: '📦',
        desc: '+20% material drop rate',
        cost: 2,
        requires: ['forageExpertise'],
        effect: { type: 'bonus', stat: 'materialDrop', value: 20 },
        position: { x: 85, y: 34 },
      },

      tacticalRetreat: {
        id: 'tacticalRetreat',
        name: 'Emergency Liquefaction',
        icon: '💧',
        desc: 'Slimes escape with 1 HP instead of dying (once per expedition)',
        cost: 2,
        requires: ['scoutingParty'],
        effect: { type: 'passive', desc: 'Death prevention (1x)' },
        position: { x: 35, y: 34 },
      },

      // Third tier
      ruinsAccess: {
        id: 'ruinsAccess',
        name: 'Thermal Resistance',
        icon: '🔥',
        desc: 'Slimes can survive in Cinderspire',
        cost: 4,
        requires: ['cavesAccess'],
        effect: { type: 'unlock', zone: 'ruins' },
        position: { x: 50, y: 46 },
      },

      sharedVigorSkill: {
        id: 'sharedVigorSkill',
        name: 'Hivemind Pulse',
        icon: '❤️‍🩹',
        desc: 'Unlock Shared Vigor ability',
        cost: 3,
        requires: ['swiftExpeditionSkill'],
        effect: { type: 'pheromone', ability: 'sharedVigor' },
        position: { x: 15, y: 46 },
      },

      rareHunter: {
        id: 'rareHunter',
        name: 'Predator Instinct',
        icon: '⭐',
        desc: 'Double rare monster spawn chance',
        cost: 3,
        requires: ['materialScavenger'],
        effect: { type: 'bonus', stat: 'rareSpawn', value: 100 },
        position: { x: 85, y: 46 },
      },

      // Fourth tier
      peaksAccess: {
        id: 'peaksAccess',
        name: 'Altitude Gel',
        icon: '⛰️',
        desc: 'Slimes can climb Stormspire Summit',
        cost: 5,
        requires: ['ruinsAccess'],
        effect: { type: 'unlock', zone: 'peaks' },
        position: { x: 50, y: 58 },
      },

      evolutionPulseSkill: {
        id: 'evolutionPulseSkill',
        name: 'Mutagenic Burst',
        icon: '⚡',
        desc: 'Unlock Evolution Pulse ability',
        cost: 4,
        requires: ['sharedVigorSkill'],
        effect: { type: 'pheromone', ability: 'evolutionPulse' },
        position: { x: 15, y: 58 },
      },

      veteranBonuses: {
        id: 'veteranBonuses',
        name: 'Battle-Hardened Membrane',
        icon: '🎖️',
        desc: 'Slimes gain +1% stats per 10 kills',
        cost: 4,
        requires: ['rareHunter', 'tacticalRetreat'],
        effect: { type: 'passive', desc: 'Kill count stat bonus' },
        position: { x: 60, y: 58 },
      },

      // Fifth tier
      voidAccess: {
        id: 'voidAccess',
        name: 'Void Membrane',
        icon: '🕳️',
        desc: 'Slimes can enter the Void Abyss',
        cost: 6,
        requires: ['peaksAccess'],
        effect: { type: 'unlock', zone: 'volcano' },
        position: { x: 50, y: 70 },
      },

      infiniteEndurance: {
        id: 'infiniteEndurance',
        name: 'Endless Ooze',
        icon: '♾️',
        desc: 'Unlock infinite expeditions',
        cost: 5,
        requires: ['peaksAccess', 'evolutionPulseSkill'],
        effect: { type: 'unlock', feature: 'infiniteExpedition' },
        position: { x: 25, y: 70 },
      },

      // Capstone
      expeditionMastery: {
        id: 'expeditionMastery',
        name: 'Apex Ooze',
        icon: '🌟',
        desc: '+25% all expedition rewards',
        cost: 6,
        requires: ['voidAccess', 'veteranBonuses'],
        effect: { type: 'bonus', stat: 'expeditionRewards', value: 25 },
        position: { x: 50, y: 82 },
      },
    },
  },

  economy: {
    name: 'Hive Growth',
    icon: '🏛️',
    color: '#f59e0b',
    description: 'Expand the hive, multiply your resources',
    skills: {
      // Root
      hiveFoundation: {
        id: 'hiveFoundation',
        name: 'Core Chamber',
        icon: '🏠',
        desc: 'Establish the foundations of your hive',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Enables buildings' },
        position: { x: 50, y: 10 },
      },

      // First tier
      biomassEfficiency: {
        id: 'biomassEfficiency',
        name: 'Efficient Digestion',
        icon: '🧬',
        desc: '+10% biomass from all sources',
        cost: 1,
        requires: ['hiveFoundation'],
        effect: { type: 'bonus', stat: 'biomassGain', value: 10 },
        position: { x: 30, y: 22 },
      },

      jellyProduction: {
        id: 'jellyProduction',
        name: 'Jelly Glands',
        icon: '🍯',
        desc: '+5 max Royal Jelly capacity',
        cost: 1,
        requires: ['hiveFoundation'],
        effect: { type: 'bonus', stat: 'maxJelly', value: 5 },
        position: { x: 70, y: 22 },
      },

      // Second tier
      spawningVatUnlock: {
        id: 'spawningVatUnlock',
        name: 'Spawning Vat Blueprint',
        icon: '🧫',
        desc: 'Unlock Spawning Vat (Enhanced slimes)',
        cost: 2,
        requires: ['biomassEfficiency'],
        effect: { type: 'unlock', building: 'spawningVat' },
        position: { x: 20, y: 34 },
      },

      researchLabUnlock: {
        id: 'researchLabUnlock',
        name: 'Cerebral Node',
        icon: '🔬',
        desc: 'Unlock Research Chamber',
        cost: 2,
        requires: ['biomassEfficiency'],
        effect: { type: 'unlock', building: 'researchLab' },
        position: { x: 40, y: 34 },
      },

      ranchBasics: {
        id: 'ranchBasics',
        name: 'Cultivation Pools',
        icon: '🌱',
        desc: 'Unlock the Ranch system',
        cost: 2,
        requires: ['jellyProduction'],
        effect: { type: 'unlock', feature: 'ranch' },
        position: { x: 60, y: 34 },
      },

      bountifulHarvestSkill: {
        id: 'bountifulHarvestSkill',
        name: 'Harvest Secretion',
        icon: '🌾',
        desc: 'Unlock Bountiful Harvest ability',
        cost: 2,
        requires: ['jellyProduction'],
        effect: { type: 'pheromone', ability: 'bountifulHarvest' },
        position: { x: 80, y: 34 },
      },

      // Third tier
      royalHatcheryUnlock: {
        id: 'royalHatcheryUnlock',
        name: 'Royal Hatchery Blueprint',
        icon: '🥚',
        desc: 'Unlock Royal Hatchery (Elite slimes)',
        cost: 3,
        requires: ['spawningVatUnlock'],
        effect: { type: 'unlock', building: 'royalHatchery' },
        position: { x: 20, y: 46 },
      },

      researchSpeed: {
        id: 'researchSpeed',
        name: 'Neural Acceleration',
        icon: '⚗️',
        desc: '+25% research speed',
        cost: 2,
        requires: ['researchLabUnlock'],
        effect: { type: 'bonus', stat: 'researchSpeed', value: 25 },
        position: { x: 40, y: 46 },
      },

      ranchExpansion: {
        id: 'ranchExpansion',
        name: 'Expanded Pools',
        icon: '🏡',
        desc: '+2 ranch building slots',
        cost: 3,
        requires: ['ranchBasics'],
        effect: { type: 'bonus', stat: 'ranchSlots', value: 2 },
        position: { x: 60, y: 46 },
      },

      nurturingAuraSkill: {
        id: 'nurturingAuraSkill',
        name: 'Nurturing Mist',
        icon: '💚',
        desc: 'Unlock Nurturing Aura ability',
        cost: 3,
        requires: ['bountifulHarvestSkill'],
        effect: { type: 'pheromone', ability: 'nurturingAura' },
        position: { x: 80, y: 46 },
      },

      // Fourth tier
      primordialChamberUnlock: {
        id: 'primordialChamberUnlock',
        name: 'Primordial Chamber Blueprint',
        icon: '👑',
        desc: 'Unlock Primordial Chamber (Royal slimes)',
        cost: 5,
        requires: ['royalHatcheryUnlock'],
        effect: { type: 'unlock', building: 'primordialChamber' },
        position: { x: 20, y: 58 },
      },

      buildingDiscount: {
        id: 'buildingDiscount',
        name: 'Organic Architecture',
        icon: '🔨',
        desc: '-20% building costs',
        cost: 3,
        requires: ['researchSpeed'],
        effect: { type: 'bonus', stat: 'buildingCost', value: -20 },
        position: { x: 40, y: 58 },
      },

      premiumCreatures: {
        id: 'premiumCreatures',
        name: 'Enriched Cultivation',
        icon: '✨',
        desc: 'Ranch buildings give +50% resources',
        cost: 4,
        requires: ['ranchExpansion', 'nurturingAuraSkill'],
        effect: { type: 'bonus', stat: 'ranchYield', value: 50 },
        position: { x: 70, y: 58 },
      },

      // Fifth tier
      slimePitUnlock: {
        id: 'slimePitUnlock',
        name: 'Slime Pit Blueprint',
        icon: '🕳️',
        desc: 'Unlock Slime Pit (+10 jelly cap each)',
        cost: 4,
        requires: ['primordialChamberUnlock', 'buildingDiscount'],
        effect: { type: 'unlock', building: 'slimePit' },
        position: { x: 30, y: 70 },
      },

      // Capstone
      economyMastery: {
        id: 'economyMastery',
        name: 'Hive Overmind',
        icon: '💰',
        desc: '+15% all resource gains',
        cost: 6,
        requires: ['slimePitUnlock', 'premiumCreatures'],
        effect: { type: 'bonus', stat: 'allResources', value: 15 },
        position: { x: 50, y: 82 },
      },
    },
  },

  combat: {
    name: 'Slime Combat',
    icon: '⚔️',
    color: '#ef4444',
    description: 'Harden your slimes for battle',
    skills: {
      // Root
      combatTraining: {
        id: 'combatTraining',
        name: 'Combat Instincts',
        icon: '🎯',
        desc: 'Awaken the predator within your slimes',
        cost: 0,
        requires: [],
        effect: { type: 'passive', desc: 'Enables combat' },
        position: { x: 50, y: 10 },
      },

      // First tier - three branches
      offensiveFocus: {
        id: 'offensiveFocus',
        name: 'Hardened Core',
        icon: '💪',
        desc: '+10% Firmness for all slimes',
        cost: 1,
        requires: ['combatTraining'],
        effect: { type: 'bonus', stat: 'firmness', value: 10 },
        position: { x: 25, y: 22 },
      },

      defensiveFocus: {
        id: 'defensiveFocus',
        name: 'Resilient Gel',
        icon: '🛡️',
        desc: '+10% max HP for all slimes',
        cost: 1,
        requires: ['combatTraining'],
        effect: { type: 'bonus', stat: 'maxHp', value: 10 },
        position: { x: 50, y: 22 },
      },

      utilityFocus: {
        id: 'utilityFocus',
        name: 'Thickened Viscosity',
        icon: '🌀',
        desc: '+10% Viscosity for all slimes',
        cost: 1,
        requires: ['combatTraining'],
        effect: { type: 'bonus', stat: 'viscosity', value: 10 },
        position: { x: 75, y: 22 },
      },

      // Second tier
      criticalStrikes: {
        id: 'criticalStrikes',
        name: 'Piercing Pseudopods',
        icon: '💥',
        desc: '+5% critical hit chance',
        cost: 2,
        requires: ['offensiveFocus'],
        effect: { type: 'bonus', stat: 'critChance', value: 5 },
        position: { x: 15, y: 34 },
      },

      brutalForce: {
        id: 'brutalForce',
        name: 'Crushing Mass',
        icon: '🔥',
        desc: '+15% damage vs monsters with more HP',
        cost: 2,
        requires: ['offensiveFocus'],
        effect: { type: 'bonus', stat: 'damageVsHighHp', value: 15 },
        position: { x: 35, y: 34 },
      },

      toughHide: {
        id: 'toughHide',
        name: 'Rubbery Membrane',
        icon: '🧱',
        desc: 'Reduce incoming damage by 2 (min 1)',
        cost: 2,
        requires: ['defensiveFocus'],
        effect: { type: 'bonus', stat: 'damageReduction', value: 2 },
        position: { x: 50, y: 34 },
      },

      elementalAffinity: {
        id: 'elementalAffinity',
        name: 'Elemental Absorption',
        icon: '🔮',
        desc: '+25% elemental damage bonuses',
        cost: 2,
        requires: ['utilityFocus'],
        effect: { type: 'bonus', stat: 'elementalDamage', value: 25 },
        position: { x: 65, y: 34 },
      },

      statusMastery: {
        id: 'statusMastery',
        name: 'Toxic Secretions',
        icon: '☠️',
        desc: '+20% status effect chance',
        cost: 2,
        requires: ['utilityFocus'],
        effect: { type: 'bonus', stat: 'statusChance', value: 20 },
        position: { x: 85, y: 34 },
      },

      // Third tier
      spawnBoostSkill: {
        id: 'spawnBoostSkill',
        name: 'Primal Ooze',
        icon: '🌟',
        desc: 'Unlock Primal Blessing ability',
        cost: 3,
        requires: ['criticalStrikes'],
        effect: { type: 'pheromone', ability: 'spawnBoost' },
        position: { x: 15, y: 46 },
      },

      executioner: {
        id: 'executioner',
        name: 'Finishing Surge',
        icon: '⚡',
        desc: '+30% damage to monsters below 25% HP',
        cost: 3,
        requires: ['brutalForce'],
        effect: { type: 'bonus', stat: 'executeDamage', value: 30 },
        position: { x: 35, y: 46 },
      },

      regeneration: {
        id: 'regeneration',
        name: 'Regenerative Gel',
        icon: '💚',
        desc: 'Slimes heal 1 HP per battle tick',
        cost: 3,
        requires: ['toughHide'],
        effect: { type: 'passive', desc: 'Passive healing' },
        position: { x: 50, y: 46 },
      },

      mutationSynergy: {
        id: 'mutationSynergy',
        name: 'Mutation Resonance',
        icon: '🧬',
        desc: '+25% mutation passive effects',
        cost: 3,
        requires: ['elementalAffinity', 'statusMastery'],
        effect: { type: 'bonus', stat: 'mutationPower', value: 25 },
        position: { x: 75, y: 46 },
      },

      // Fourth tier
      berserkMode: {
        id: 'berserkMode',
        name: 'Feral Ooze',
        icon: '😤',
        desc: '+50% damage when below 30% HP',
        cost: 4,
        requires: ['executioner', 'spawnBoostSkill'],
        effect: { type: 'bonus', stat: 'lowHpDamage', value: 50 },
        position: { x: 25, y: 58 },
      },

      lastStand: {
        id: 'lastStand',
        name: 'Desperate Coagulation',
        icon: '🏰',
        desc: 'Take 50% less damage when below 20% HP',
        cost: 4,
        requires: ['regeneration'],
        effect: { type: 'bonus', stat: 'lowHpDefense', value: 50 },
        position: { x: 50, y: 58 },
      },

      decoySkill: {
        id: 'decoySkill',
        name: 'Decoy Blob',
        icon: '🎭',
        desc: 'Unlock Slime Decoy ability',
        cost: 3,
        requires: ['mutationSynergy'],
        effect: { type: 'pheromone', ability: 'decoy' },
        position: { x: 75, y: 58 },
      },

      // Fifth tier
      towerDefenseSlots: {
        id: 'towerDefenseSlots',
        name: 'Defensive Formation',
        icon: '🎯',
        desc: '+2 Tower Defense party slots',
        cost: 4,
        requires: ['berserkMode', 'lastStand'],
        effect: { type: 'bonus', stat: 'defenseSlots', value: 2 },
        position: { x: 35, y: 70 },
      },

      extraMutationSlot: {
        id: 'extraMutationSlot',
        name: 'Mutation Overflow',
        icon: '➕',
        desc: '+1 mutation slot for all slimes',
        cost: 5,
        requires: ['mutationSynergy', 'decoySkill'],
        effect: { type: 'bonus', stat: 'mutationSlots', value: 1 },
        position: { x: 65, y: 70 },
      },

      // Capstone
      combatMastery: {
        id: 'combatMastery',
        name: 'Apex Predator',
        icon: '🏆',
        desc: '+10% all combat stats',
        cost: 6,
        requires: ['towerDefenseSlots', 'extraMutationSlot'],
        effect: { type: 'bonus', stat: 'allCombat', value: 10 },
        position: { x: 50, y: 82 },
      },
    },
  },
};

// Calculate skill points needed to reach a level
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
    unlockedZones: ['forest'], // Forest always unlocked
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
            break;
          case 'unlock':
            effects.unlocks.push(eff);
            if (eff.zone) effects.unlockedZones.push(eff.zone);
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
export const isZoneUnlocked = (zoneId, purchasedSkills) => {
  if (zoneId === 'forest') return true; // Always unlocked
  const effects = getSkillEffects(purchasedSkills);
  return effects.unlockedZones.includes(zoneId);
};

// Helper to check if a building is unlocked
export const isBuildingUnlocked = (buildingId, purchasedSkills) => {
  // Some buildings don't need skill unlocks (research items)
  const skillGatedBuildings = ['spawningVat', 'royalHatchery', 'primordialChamber', 'slimePit', 'researchLab'];
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
  if (featureId === 'infiniteExpedition') {
    return purchasedSkills.includes('infiniteEndurance');
  }
  const effects = getSkillEffects(purchasedSkills);
  return effects.unlockedFeatures.includes(featureId);
};
