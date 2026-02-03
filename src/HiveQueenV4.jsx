import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Data imports
import {
  TICK_RATE,
  BASE_SLIME_COST,
  TRAIT_JELLY_COST,
  BASE_JELLY,
  JELLY_PER_QUEEN_LEVEL,
  BATTLE_TICK_SPEED,
  AUTO_SAVE_INTERVAL,
  TOWER_DEFENSE_COOLDOWN,
  TD_TICK_SPEED,
  ELEMENTS,
} from './data/gameConstants.js';

import { STAT_INFO, SLIME_TIERS } from './data/slimeData.js';
import { MUTATION_LIBRARY, TRAIT_LIBRARY, STATUS_EFFECTS, SLIME_TRAITS } from './data/traitData.js';
import { MONSTER_TYPES } from './data/monsterData.js';
import { ZONES, EXPLORATION_EVENTS, INTERMISSION_EVENTS, INTERMISSION_DURATION } from './data/zoneData.js';
import { BUILDINGS, RESEARCH } from './data/buildingData.js';
import { HUMAN_TYPES, TD_WAVES, getTDScaling } from './data/towerDefenseData.js';
import { RANCH_TYPES, RANCH_EVENTS, RANCH_UPGRADE_BONUSES, MAX_RANCH_LEVEL, RANCH_MAX_ACCUMULATION_TIME } from './data/ranchData.js';
import { HIVE_ABILITIES, PRISM_SHOP, MANA_UPDATE_INTERVAL, MANA_PER_SLIME_PER_HOUR } from './data/hiveData.js';
import { SKILL_TREES, SKILL_POINTS_PER_LEVEL, getSkillEffects, isZoneUnlocked, isBuildingUnlocked, isPheromoneUnlocked, isFeatureUnlocked } from './data/skillTreeData.js';

// Utility imports
import { genName, genId, formatTime, calculateElementalDamage, createDefaultElements, canGainElement, calculateElementGain } from './utils/helpers.js';
import { saveGame, loadGame, deleteSave } from './utils/saveSystem.js';

// Weighted monster spawning - rare monsters have 5% spawn rate (modified by rareSpawnMult), common share rest
const selectMonster = (zone, rareSpawnMult = 1) => {
  const zd = ZONES[zone];
  if (!zd || !zd.monsters?.length) return null;

  // Separate common and rare monsters
  const common = zd.monsters.filter(m => !MONSTER_TYPES[m]?.rare);
  const rare = zd.monsters.filter(m => MONSTER_TYPES[m]?.rare);

  // Base 5% chance for rare monster, modified by skill tree bonus (e.g. 2x = 10%)
  const rareChance = Math.min(0.25, 0.05 * rareSpawnMult); // Cap at 25%
  if (rare.length > 0 && Math.random() < rareChance) {
    return rare[Math.floor(Math.random() * rare.length)];
  }

  // Rest chance for common monster
  if (common.length > 0) {
    return common[Math.floor(Math.random() * common.length)];
  }

  // Fallback to any monster if no common (shouldn't happen)
  return zd.monsters[Math.floor(Math.random() * zd.monsters.length)];
};

// Component imports
import {
  SlimeSprite,
  MonsterSprite,
  BattleArena,
  SlimeForge,
  SlimeDetail,
  Compendium,
  Menu,
  WelcomeBackModal,
  SettingsTab,
  Ranch,
} from './components';
import SkillTree from './components/SkillTree.jsx';

// ============== OFFLINE PROGRESS ==============
const calculateOfflineProgress = (saved, bonuses) => {
  const now = Date.now();
  const offlineMs = now - (saved.lastSave || now);
  const offlineSec = Math.min(offlineMs / 1000, 24 * 3600); // Cap at 24h

  if (offlineSec < 60) return { hadProgress: false };

  const results = {
    biomassGained: 0,
    matsGained: {},
    monsterKillsGained: {},
    slimesLost: [],
    monstersKilled: 0,
    expeditionsWiped: [],
    researchCompleted: null,
  };

  let { bio, slimes, exps, mats, activeRes, research } = JSON.parse(JSON.stringify(saved));
  const battleTicks = Math.floor(offlineSec / 2.5);

  // Helper to get slime stats (handles both old and new format)
  const getStats = (sl) => {
    if (sl.baseStats) {
      const tier = SLIME_TIERS[sl.tier];
      const biomass = sl.biomass || 0;
      const percentBonus = biomass / tier.biomassPerPercent;
      // BALANCE: Cap at maxBiomassBonus (default 100% = double stats)
      const cappedBonus = Math.min(percentBonus, tier.maxBiomassBonus || 100);
      const mult = 1 + (cappedBonus / 100);
      return {
        firmness: Math.floor(sl.baseStats.firmness * mult),
        slipperiness: Math.floor(sl.baseStats.slipperiness * mult),
        viscosity: Math.floor(sl.baseStats.viscosity * mult),
      };
    }
    return sl.stats || { firmness: 4, slipperiness: 4, viscosity: 4 };
  };

  // Simulate expeditions
  Object.entries(exps || {}).forEach(([zone, exp]) => {
    const zd = ZONES[zone];
    if (!zd || !exp.party?.length) return;

    let ticks = battleTicks;
    let monster = exp.monster;

    while (ticks > 0 && exp.party.some(p => p.hp > 0)) {
      if (!monster || monster.hp <= 0) {
        const mt = selectMonster(zone) || zd.monsters[0];
        const md = MONSTER_TYPES[mt];
        monster = { type: mt, hp: md.hp, maxHp: md.hp, dmg: md.dmg };
      }

      const living = exp.party.filter(p => p.hp > 0);
      if (!living.length) break;
      const md = MONSTER_TYPES[monster.type];

      // Slimes attack
      living.forEach(p => {
        const sl = slimes.find(s => s.id === p.id);
        if (!sl || monster.hp <= 0) return;
        const stats = getStats(sl);
        let dmg = stats.firmness;
        if (sl.pass?.includes('ferocity')) dmg *= 1.15;
        if (Math.random() < 0.1 + stats.slipperiness * 0.01) dmg *= 1.5;
        monster.hp -= Math.floor(dmg);
      });

      if (monster.hp <= 0) {
        results.monstersKilled++;
        exp.kills = (exp.kills || 0) + 1;
        // Track monster kills for mutation system
        exp.monsterKillCounts = exp.monsterKillCounts || {};
        exp.monsterKillCounts[monster.type] = (exp.monsterKillCounts[monster.type] || 0) + 1;
        results.monsterKillsGained[monster.type] = (results.monsterKillsGained[monster.type] || 0) + 1;

        const bioG = Math.floor(md.biomass * (bonuses?.bio || 1));
        results.biomassGained += bioG;
        bio += bioG;
        if (Math.random() < 0.2) {
          const mat = md.mats[Math.floor(Math.random() * md.mats.length)];
          results.matsGained[mat] = (results.matsGained[mat] || 0) + 1;
          mats[mat] = (mats[mat] || 0) + 1;
        }
        // Mutations are now unlocked via kill counts, not drops
        // Element accumulation during offline progress
        if (zd.element && zd.elementGainRate > 0) {
          living.forEach(p => {
            const sl = slimes.find(s => s.id === p.id);
            if (!sl || sl.primaryElement || sl.pass?.includes('void')) return;
            if (!sl.elements) sl.elements = { fire: 0, water: 0, nature: 0, earth: 0 };
            let gain = zd.elementGainRate;
            if (sl.pass?.includes('adaptable')) gain *= 1.5;
            sl.elements[zd.element] = Math.min(100, (sl.elements[zd.element] || 0) + gain);
            if (sl.elements[zd.element] >= 100) {
              sl.primaryElement = zd.element;
            }
          });
        }
        monster = null;
      } else {
        const tgt = living[Math.floor(Math.random() * living.length)];
        const tgtSl = slimes.find(s => s.id === tgt.id);
        const tgtStats = tgtSl ? getStats(tgtSl) : { slipperiness: 0 };
        let inc = md.dmg;
        if (Math.random() < 0.05 + tgtStats.slipperiness * 0.01) inc = 0;
        if (tgtSl?.pass?.includes('armored')) inc *= 0.8;
        tgt.hp -= Math.floor(inc);
        if (tgt.hp <= 0) {
          if (tgtSl?.pass?.includes('undying') && !tgt.usedUndying) { tgt.hp = 1; tgt.usedUndying = true; }
          else if (tgtSl?.pass?.includes('rebirth') && !tgt.usedRebirth) { tgt.hp = Math.floor(tgt.maxHp * 0.3); tgt.usedRebirth = true; }
        }
        if (tgt.hp <= 0) {
          results.slimesLost.push(tgtSl?.name || 'Slime');
          slimes = slimes.filter(s => s.id !== tgt.id);
          exp.party = exp.party.filter(p => p.id !== tgt.id);
        }
      }
      ticks--;
    }
    exp.monster = monster;
    if (!exp.party.some(p => p.hp > 0)) {
      results.expeditionsWiped.push(zone);
      delete exps[zone];
    }
  });

  // Research progress
  if (activeRes) {
    const rd = RESEARCH[activeRes.id];
    if (rd) {
      const prog = activeRes.prog + (100 / rd.time) * (bonuses?.res || 1) * offlineSec;
      if (prog >= 100) {
        research = [...research, activeRes.id];
        results.researchCompleted = rd.name;
        activeRes = null;
      } else {
        activeRes = { ...activeRes, prog };
      }
    }
  }

  return {
    hadProgress: true,
    offlineTime: formatTime(offlineSec),
    results,
    newState: { bio, slimes, exps, mats, activeRes, research, lastSave: now }
  };
};

// ============== MAIN GAME ==============
export default function HiveQueenGame() {
  const [gameLoaded, setGameLoaded] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(null);
  
  const [queen, setQueen] = useState({ level: 1 });
  const [bio, setBio] = useState(50);
  const [mats, setMats] = useState({});
  const [slimes, setSlimes] = useState([]);
  const [exps, setExps] = useState({});
  const [bLogs, setBLogs] = useState({});
  const [builds, setBuilds] = useState({});
  const [research, setResearch] = useState([]);
  const [activeRes, setActiveRes] = useState(null);
  const [logs, setLogs] = useState([{ t: new Date().toLocaleTimeString(), m: 'The Hive awakens...' }]);
  const [speed, setSpeed] = useState(1);
  const [lastTick, setLastTick] = useState(Date.now());
  const [lastSave, setLastSave] = useState(null);
  const [lastTowerDefense, setLastTowerDefense] = useState(0);
  const [towerDefense, setTowerDefense] = useState(null);
  const [monsterKills, setMonsterKills] = useState({});
  const [unlockedMutations, setUnlockedMutations] = useState([]);
  const [purchasedSkills, setPurchasedSkills] = useState(['expeditionBasics', 'hiveFoundation', 'combatTraining']);

  // Ranch system state
  const [prisms, setPrisms] = useState(0);
  const [ranchBuildings, setRanchBuildings] = useState({});
  const [ranchAssignments, setRanchAssignments] = useState({});
  const [ranchProgress, setRanchProgress] = useState({});
  const [ranchEvents, setRanchEvents] = useState([]);

  // Mana and Hive Ability system
  const [mana, setMana] = useState(0);
  const [lastManaUpdate, setLastManaUpdate] = useState(Date.now());
  const [activeHiveAbilities, setActiveHiveAbilities] = useState({});
  // Format: { abilityId: expirationTimestamp, ... }

  const [tab, setTab] = useState(0);
  const [menu, setMenu] = useState(false);
  const [dev, setDev] = useState(false);
  const [selZone, setSelZone] = useState('forest');
  const [party, setParty] = useState([]);
  const [selSlime, setSelSlime] = useState(null);
  const touchX = useRef(null);

  // Calculate skill effects from purchased skills (must be first, before other calculations)
  const skillEffects = useMemo(() => getSkillEffects(purchasedSkills), [purchasedSkills]);
  const skillBonuses = skillEffects.bonuses;

  const tabs = [
    { id: 0, icon: '👑', label: 'Queen' },
    { id: 1, icon: '🟢', label: 'Slimes', badge: slimes.length },
    { id: 2, icon: '🗺️', label: 'Explore' },
    { id: 3, icon: '🏠', label: 'Ranch', skillUnlock: 'ranch' },
    { id: 4, icon: '🎯', label: 'Defense' },
    { id: 5, icon: '🌳', label: 'Skills' },
    { id: 6, icon: '📦', label: 'Inventory' },
    { id: 7, icon: '📖', label: 'Compendium' },
    { id: 8, icon: '⚙️', label: 'Settings' },
  ];

  // Filter tabs based on skill unlocks
  const visibleTabs = tabs.filter(t => !t.skillUnlock || isFeatureUnlocked(t.skillUnlock, purchasedSkills));

  const maxJelly = BASE_JELLY + (queen.level - 1) * JELLY_PER_QUEEN_LEVEL + (builds.slimePit || 0) * 10 + (skillBonuses.maxJelly || 0);
  const usedJelly = slimes.reduce((s, sl) => s + sl.magCost, 0);
  const freeJelly = maxJelly - usedJelly;
  // BALANCE: Slime tiers are unlocked by buildings, not queen level
  const unlockedTiers = Object.keys(SLIME_TIERS).filter(t => {
    const tier = SLIME_TIERS[t];
    if (!tier.unlockBuilding) return true; // Basic tier is always available
    return builds[tier.unlockBuilding] > 0;
  });

  const bon = {
    bio: 1 + (research.includes('efficientDigestion') ? 0.2 : 0),
    xp: 1 + (research.includes('enhancedAbsorption') ? 0.25 : 0),
    spd: 1 + (research.includes('swiftSlimes') ? 0.2 : 0),
    hp: 1 + (research.includes('slimeVitality') ? 0.15 : 0),
    res: (1 + (builds.researchLab || 0) * 0.25) * (1 + (skillBonuses.researchSpeed || 0) / 100),
  };

  // Combined bonuses applying skill tree effects
  const combatBonuses = {
    firmness: 1 + ((skillBonuses.firmness || 0) + (skillBonuses.allCombat || 0)) / 100,
    maxHp: 1 + ((skillBonuses.maxHp || 0) + (skillBonuses.allCombat || 0)) / 100,
    viscosity: 1 + ((skillBonuses.viscosity || 0) + (skillBonuses.allCombat || 0)) / 100,
    critChance: (skillBonuses.critChance || 0) / 100, // Flat addition to crit chance
    damageReduction: skillBonuses.damageReduction || 0, // Flat damage reduction
    elementalDamage: 1 + (skillBonuses.elementalDamage || 0) / 100, // Element damage multiplier
    statusChance: 1 + (skillBonuses.statusChance || 0) / 100, // Status effect chance multiplier
    executeDamage: 1 + (skillBonuses.executeDamage || 0) / 100, // Damage vs low HP targets
    damageVsHighHp: 1 + (skillBonuses.damageVsHighHp || 0) / 100, // Damage vs high HP targets
    lowHpDamage: 1 + (skillBonuses.lowHpDamage || 0) / 100, // Damage when low HP
    lowHpDefense: (skillBonuses.lowHpDefense || 0) / 100, // Damage reduction when low HP
    mutationPower: 1 + (skillBonuses.mutationPower || 0) / 100, // Mutation passive strength
    expeditionBiomass: 1 + (skillBonuses.expeditionBiomass || 0) / 100,
    materialDrop: 1 + (skillBonuses.materialDrop || 0) / 100,
    rareSpawn: 1 + (skillBonuses.rareSpawn || 0) / 100,
    expeditionRewards: 1 + (skillBonuses.expeditionRewards || 0) / 100,
    biomassGain: 1 + ((skillBonuses.biomassGain || 0) + (skillBonuses.allResources || 0)) / 100,
    defenseSlots: skillBonuses.defenseSlots || 0, // Extra tower defense slots
    mutationSlots: skillBonuses.mutationSlots || 0, // Extra mutation slots for slimes
  };

  // Check if passive skill is purchased
  const hasPassive = (passiveId) => skillEffects.passives.includes(passiveId);

  // Calculate ranch bonuses from active ranch buildings
  const getRanchBonuses = useCallback(() => {
    const bonuses = {
      towerDefenseDamage: 0, // % bonus to TD damage from warDen
      bonusManaPerHour: 0,   // Extra mana per hour from manaWell
      expeditionRewards: 0,  // % bonus to expedition rewards from scoutPost
    };

    Object.entries(ranchBuildings).forEach(([ranchId, building]) => {
      const ranch = RANCH_TYPES[ranchId];
      const assigned = ranchAssignments[ranchId] || [];
      if (!ranch || !building || assigned.length === 0) return;

      const effectMult = 1 + (building.level - 1) * RANCH_UPGRADE_BONUSES.effectMultiplier;

      assigned.forEach(assignment => {
        const slimeId = typeof assignment === 'object' ? assignment.slimeId : assignment;
        const slime = slimes.find(s => s.id === slimeId);
        if (!slime) return;

        const stats = slime.baseStats || { firmness: 4, slipperiness: 4, viscosity: 4 };

        if (ranch.effect === 'defenseBonus' && ranch.buffType === 'damage') {
          // warDen: +damage% based on firmness
          bonuses.towerDefenseDamage += stats.firmness * ranch.effectValue * effectMult;
        } else if (ranch.effect === 'manaBonus') {
          // manaWell: +mana/hour based on viscosity
          bonuses.bonusManaPerHour += stats.viscosity * ranch.effectValue * effectMult;
        } else if (ranch.effect === 'expeditionBonus' && ranch.buffType === 'rewards') {
          // scoutPost: +rewards% based on slipperiness
          bonuses.expeditionRewards += stats.slipperiness * ranch.effectValue * effectMult;
        }
      });
    });

    return bonuses;
  }, [ranchBuildings, ranchAssignments, slimes]);

  // Hive Ability Functions
  const isHiveAbilityActive = (abilityId) => {
    const expiration = activeHiveAbilities[abilityId];
    return expiration && Date.now() < expiration;
  };

  const activateHiveAbility = (abilityId) => {
    const ability = HIVE_ABILITIES[abilityId];
    if (!ability || mana < ability.cost) return;
    if (!isPheromoneUnlocked(abilityId, purchasedSkills)) return; // Must be unlocked via skill tree
    if (isHiveAbilityActive(abilityId)) return; // Already active

    setMana(p => p - ability.cost);
    setActiveHiveAbilities(prev => ({
      ...prev,
      [abilityId]: Date.now() + ability.duration
    }));
    log(`🧪 Activated ${ability.name}!`);
  };

  const getAbilityTimeRemaining = (abilityId) => {
    const expiration = activeHiveAbilities[abilityId];
    if (!expiration || Date.now() >= expiration) return 0;
    return expiration - Date.now();
  };

  // Prism Shop Functions
  const applyTimeSkip = (ms) => {
    // Advance ranch progress for all assigned slimes
    setRanchAssignments(prev => {
      const updated = {};
      Object.entries(prev).forEach(([ranchId, assignments]) => {
        updated[ranchId] = assignments.map(a => ({
          ...a,
          startTime: a.startTime - ms // Make it appear as if started earlier
        }));
      });
      return updated;
    });

    // Advance research progress (if activeRes exists)
    if (activeRes) {
      const rd = RESEARCH[activeRes.id];
      const addedProgress = (100 / rd.time) * bon.res * (ms / 1000);
      setActiveRes(prev => {
        if (!prev) return null;
        const newProg = prev.prog + addedProgress;
        if (newProg >= 100) {
          setResearch(r => [...r, prev.id]);
          log(`✅ ${rd.name} completed!`);
          return null;
        }
        return { ...prev, prog: newProg };
      });
    }

    log(`⏰ Time advanced by ${Math.round(ms / 3600000)} hours!`);
  };

  const purchasePrismItem = (itemId, targetSlimeId = null) => {
    const item = PRISM_SHOP[itemId];
    if (!item || prisms < item.cost) return;

    setPrisms(p => p - item.cost);

    switch(itemId) {
      case 'timeSkip1h':
        applyTimeSkip(3600000);
        break;
      case 'timeSkip24h':
        applyTimeSkip(86400000);
        break;
      case 'ancientTrait':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId && !s.traits?.includes('ancient')
              ? { ...s, traits: [...(s.traits || []), 'ancient'] }
              : s
          ));
          log(`📜 Granted Ancient trait!`);
        }
        break;
      case 'primordialTrait':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId && !s.traits?.includes('primordial')
              ? { ...s, traits: [...(s.traits || []), 'primordial'] }
              : s
          ));
          log(`🌟 Granted Primordial trait!`);
        }
        break;
      case 'mutationReset':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId
              ? { ...s, mutations: [], pass: [] }
              : s
          ));
          log(`🔄 Mutations reset!`);
        }
        break;
      case 'elementReset':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId
              ? { ...s, elements: { fire: 0, water: 0, nature: 0, earth: 0 }, primaryElement: null }
              : s
          ));
          log(`💫 Elements cleansed!`);
        }
        break;
      case 'instantMutation':
        const lockedMutations = Object.keys(MUTATION_LIBRARY).filter(m => !unlockedMutations.includes(m));
        if (lockedMutations.length > 0) {
          const newMutation = lockedMutations[Math.floor(Math.random() * lockedMutations.length)];
          setUnlockedMutations(p => [...p, newMutation]);
          log(`🧬 Unlocked mutation: ${MUTATION_LIBRARY[newMutation].name}!`);
        } else {
          // Refund if no mutations to unlock
          setPrisms(p => p + item.cost);
          log(`Already unlocked all mutations!`);
        }
        break;
      default:
        break;
    }
  };

  // Load game on mount
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      const offline = calculateOfflineProgress(saved, bon);
      if (offline.hadProgress) {
        // Apply offline progress
        setBio(offline.newState.bio);
        setSlimes(offline.newState.slimes);
        setExps(offline.newState.exps);
        setMats(offline.newState.mats);
        setActiveRes(offline.newState.activeRes);
        setResearch(offline.newState.research);
        setQueen(saved.queen);
        setBuilds(saved.builds || {});
        setLastTowerDefense(saved.lastTowerDefense || 0);

        // Apply monster kills gained from offline progress
        const newMonsterKills = { ...(saved.monsterKills || {}) };
        Object.entries(offline.results.monsterKillsGained || {}).forEach(([type, count]) => {
          newMonsterKills[type] = (newMonsterKills[type] || 0) + count;
        });
        setMonsterKills(newMonsterKills);

        // Check for new mutation unlocks from offline kills
        const newUnlocks = [...(saved.unlockedMutations || [])];
        Object.entries(newMonsterKills).forEach(([monsterType, kills]) => {
          const md = MONSTER_TYPES[monsterType];
          if (md?.trait && !newUnlocks.includes(md.trait)) {
            const mutation = MUTATION_LIBRARY[md.trait];
            if (mutation && kills >= mutation.requiredKills) {
              newUnlocks.push(md.trait);
            }
          }
        });
        setUnlockedMutations(newUnlocks);
        setPurchasedSkills(saved.purchasedSkills || ['expeditionBasics', 'hiveFoundation', 'combatTraining']);

        // Load ranch state
        setPrisms(saved.prisms || 0);
        setRanchBuildings(saved.ranchBuildings || {});
        setRanchAssignments(saved.ranchAssignments || {});
        setRanchProgress(saved.ranchProgress || {});

        // Load mana/hive ability state
        setMana(saved.mana || saved.pheromones || 0);
        setLastManaUpdate(saved.lastManaUpdate || saved.lastPheromoneUpdate || Date.now());
        setActiveHiveAbilities(saved.activeHiveAbilities || {});

        setWelcomeBack(offline);
      } else {
        // Just load normally
        setQueen(saved.queen || { level: 1 });
        setBio(saved.bio || 50);
        setMats(saved.mats || {});
        setSlimes(saved.slimes || []);
        setExps(saved.exps || {});
        setBuilds(saved.builds || {});
        setResearch(saved.research || []);
        setActiveRes(saved.activeRes);
        setLastTowerDefense(saved.lastTowerDefense || 0);
        setMonsterKills(saved.monsterKills || {});
        setUnlockedMutations(saved.unlockedMutations || []);
        setPurchasedSkills(saved.purchasedSkills || ['expeditionBasics', 'hiveFoundation', 'combatTraining']);
        setPrisms(saved.prisms || 0);
        setRanchBuildings(saved.ranchBuildings || {});
        setRanchAssignments(saved.ranchAssignments || {});
        setRanchProgress(saved.ranchProgress || {});
        setMana(saved.mana || saved.pheromones || 0);
        setLastManaUpdate(saved.lastManaUpdate || saved.lastPheromoneUpdate || Date.now());
        setActiveHiveAbilities(saved.activeHiveAbilities || {});
      }
      setLastSave(saved.lastSave);
      setLogs([{ t: new Date().toLocaleTimeString(), m: '💾 Game loaded!' }]);
    }
    setGameLoaded(true);
  }, []);

  // Auto-save
  useEffect(() => {
    if (!gameLoaded) return;
    const interval = setInterval(() => {
      const state = { queen, bio, mats, slimes, exps, builds, research, activeRes, lastTowerDefense, monsterKills, unlockedMutations, purchasedSkills, prisms, ranchBuildings, ranchAssignments, ranchProgress, mana, lastManaUpdate, activeHiveAbilities, lastSave: Date.now() };
      if (saveGame(state)) {
        setLastSave(Date.now());
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [gameLoaded, queen, bio, mats, slimes, exps, builds, research, activeRes, lastTowerDefense, monsterKills, unlockedMutations, purchasedSkills, prisms, ranchBuildings, ranchAssignments, ranchProgress, mana, lastManaUpdate, activeHiveAbilities]);

  const manualSave = () => {
    const state = { queen, bio, mats, slimes, exps, builds, research, activeRes, lastTowerDefense, monsterKills, unlockedMutations, purchasedSkills, prisms, ranchBuildings, ranchAssignments, ranchProgress, mana, lastManaUpdate, activeHiveAbilities, lastSave: Date.now() };
    if (saveGame(state)) {
      setLastSave(Date.now());
      log('💾 Game saved!');
    }
  };

  const handleDelete = () => {
    deleteSave();
    // Reset to defaults
    setQueen({ level: 1 });
    setBio(50);
    setMats({});
    setSlimes([]);
    setExps({});
    setBuilds({});
    setResearch([]);
    setActiveRes(null);
    setLastSave(null);
    setLastTowerDefense(0);
    setTowerDefense(null);
    setMonsterKills({});
    setUnlockedMutations([]);
    setPurchasedSkills(['expeditionBasics', 'hiveFoundation', 'combatTraining']);
    setPrisms(0);
    setRanchBuildings({});
    setRanchAssignments({});
    setRanchProgress({});
    setRanchEvents([]);
    setMana(0);
    setLastManaUpdate(Date.now());
    setActiveHiveAbilities({});
    log('🗑️ Save deleted. Starting fresh!');
  };

  const log = useCallback((m) => setLogs(p => [...p.slice(-50), { t: new Date().toLocaleTimeString(), m }]), []);
  const bLog = useCallback((z, m, c) => setBLogs(p => ({ ...p, [z]: [...(p[z] || []).slice(-30), { m, c }] })), []);

  const onTouch = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) { if (diff > 0 && tab < tabs.length - 1) setTab(tab + 1); else if (diff < 0 && tab > 0) setTab(tab - 1); }
    touchX.current = null;
  };

  const spawn = (tier, selMutations, name, magCost) => {
    const td = SLIME_TIERS[tier];
    const bioCost = BASE_SLIME_COST + selMutations.length * 5;
    if (bio < bioCost || freeJelly < magCost) return;

    // Base stats: flat 5, scaled by tier multiplier
    // Primal Blessing hive ability: +10% base stats
    const spawnBoostMult = isHiveAbilityActive('spawnBoost') ? 1.10 : 1.0;
    const baseStat = Math.floor(5 * td.statMultiplier * spawnBoostMult);
    const baseStats = { firmness: baseStat, slipperiness: baseStat, viscosity: baseStat };
    const pass = [];
    // Apply mutation stat bonuses and passives
    selMutations.forEach(id => { const m = MUTATION_LIBRARY[id]; if (m) { baseStats[m.stat] += m.bonus; pass.push(m.passive); } });

    // Random personality trait at spawn
    let spawnTraits = [];
    const traitRoll = Math.random();
    if (traitRoll < 0.05) {
      // 5% chance for uncommon trait
      const uncommonTraits = Object.entries(SLIME_TRAITS)
        .filter(([_, t]) => t.rarity === 'uncommon' && !t.source)
        .map(([id]) => id);
      if (uncommonTraits.length > 0) {
        spawnTraits = [uncommonTraits[Math.floor(Math.random() * uncommonTraits.length)]];
      }
    } else if (traitRoll < 0.25) {
      // 20% chance for common trait
      const commonTraits = Object.entries(SLIME_TRAITS)
        .filter(([_, t]) => t.rarity === 'common' && !t.source)
        .map(([id]) => id);
      if (commonTraits.length > 0) {
        spawnTraits = [commonTraits[Math.floor(Math.random() * commonTraits.length)]];
      }
    }

    // Generate name with potential title from trait
    const slimeName = spawnTraits.length > 0 ? genName(spawnTraits) : name;

    // Apply hardy trait HP bonus, glutton HP penalty, and skill tree bonus
    let maxHp = Math.floor((td.baseHp + baseStats.firmness * 3) * bon.hp * combatBonuses.maxHp);
    if (spawnTraits.includes('hardy')) maxHp = Math.floor(maxHp * 1.03);
    if (spawnTraits.includes('glutton')) maxHp = Math.floor(maxHp * 0.97);

    // Apply element bonuses from selected mutations
    const startingElements = createDefaultElements();
    selMutations.forEach(id => {
      const m = MUTATION_LIBRARY[id];
      if (m?.elementBonus) {
        Object.entries(m.elementBonus).forEach(([elem, bonus]) => {
          startingElements[elem] = Math.min(100, (startingElements[elem] || 0) + bonus);
        });
      }
    });
    setSlimes(p => [...p, {
      id: genId(),
      name: slimeName,
      tier,
      biomass: 0,
      mutations: selMutations,  // Combat abilities from MUTATION_LIBRARY
      traits: spawnTraits,      // Personality traits from SLIME_TRAITS
      pass,
      baseStats,
      maxHp,
      magCost,
      elements: startingElements,
      primaryElement: null,
    }]);
    setBio(p => p - bioCost);
    // Mutations are unlimited once unlocked - no inventory consumption
    if (spawnTraits.length > 0) {
      const trait = SLIME_TRAITS[spawnTraits[0]];
      log(`${slimeName} emerges with ${trait.icon} ${trait.name} trait!`);
    } else {
      log(`${slimeName} emerges!`);
    }
  };

  const reabsorb = (id) => {
    const sl = slimes.find(s => s.id === id);
    if (!sl || Object.values(exps).some(e => e.party.some(p => p.id === id))) { log('Cannot reabsorb!'); return; }
    const biomassGained = sl.biomass || 0;
    setBio(p => p + biomassGained);
    setSlimes(p => p.filter(s => s.id !== id));
    log(`Reabsorbed ${sl.name}! +${biomassGained}🧬`);
  };

  const levelUpQueen = () => {
    const cost = queen.level * 100; // 100 biomass per level
    if (bio < cost) return;
    setBio(p => p - cost);
    setQueen(q => ({ ...q, level: q.level + 1 }));
    log(`Queen leveled up to ${queen.level + 1}! +${SKILL_POINTS_PER_LEVEL}✨ skill point`);
  };

  // Skill tree functions
  const purchaseSkill = (skillId, cost) => {
    setPurchasedSkills(prev => [...prev, skillId]);
    log(`Learned ${skillId}! (-${cost}✨)`);
  };

  // Calculate available skill points
  const totalSkillPoints = queen.level; // 1 point per level
  const spentSkillPoints = purchasedSkills.reduce((total, skillId) => {
    for (const tree of Object.values(SKILL_TREES)) {
      if (tree.skills[skillId]) {
        return total + tree.skills[skillId].cost;
      }
    }
    return total;
  }, 0);
  const availableSkillPoints = totalSkillPoints - spentSkillPoints;

  // ============== RANCH FUNCTIONS ==============
  // ranchAssignments structure: { ranchId: [{ slimeId, startTime, accumulated: { biomass, element, stats, events } }] }

  const isRanchUnlocked = (ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    if (!ranch) return false;
    if (ranch.unlock.type === 'level') return queen.level >= ranch.unlock.value;
    if (ranch.unlock.type === 'prisms') return prisms >= ranch.unlock.value;
    if (ranch.unlock.type === 'materials') return true; // Always visible, just need mats to build
    return true;
  };

  const canBuildRanch = (ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    if (!ranch) return false;
    if (ranchBuildings[ranchId]) return false; // Already built
    if (!isRanchUnlocked(ranchId)) return false;

    // Check costs
    if (ranch.cost.biomass && bio < ranch.cost.biomass) return false;
    if (ranch.cost.prisms && prisms < ranch.cost.prisms) return false;
    if (ranch.cost.mats) {
      for (const [mat, count] of Object.entries(ranch.cost.mats)) {
        if ((mats[mat] || 0) < count) return false;
      }
    }
    return true;
  };

  const buildRanch = (ranchId) => {
    if (!canBuildRanch(ranchId)) return;
    const ranch = RANCH_TYPES[ranchId];

    // Deduct costs
    if (ranch.cost.biomass) setBio(p => p - ranch.cost.biomass);
    if (ranch.cost.prisms) setPrisms(p => p - ranch.cost.prisms);
    if (ranch.cost.mats) {
      setMats(p => {
        const newMats = { ...p };
        for (const [mat, count] of Object.entries(ranch.cost.mats)) {
          newMats[mat] = (newMats[mat] || 0) - count;
        }
        return newMats;
      });
    }

    setRanchBuildings(p => ({ ...p, [ranchId]: { level: 1 } }));
    setRanchAssignments(p => ({ ...p, [ranchId]: [] }));
    setRanchProgress(p => ({ ...p, [ranchId]: 0 }));
    log(`${ranch.icon} ${ranch.name} built!`);
  };

  const canUpgradeRanch = (ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    if (!ranch || !building) return false;
    if (building.level >= MAX_RANCH_LEVEL) return false;

    const costMult = Math.pow(ranch.upgradeCost.multiplier, building.level - 1);
    if (ranch.upgradeCost.biomass && bio < ranch.upgradeCost.biomass * costMult) return false;
    if (ranch.upgradeCost.prisms && prisms < ranch.upgradeCost.prisms * costMult) return false;
    return true;
  };

  const upgradeRanch = (ranchId) => {
    if (!canUpgradeRanch(ranchId)) return;
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    const costMult = Math.pow(ranch.upgradeCost.multiplier, building.level - 1);

    if (ranch.upgradeCost.biomass) setBio(p => p - Math.floor(ranch.upgradeCost.biomass * costMult));
    if (ranch.upgradeCost.prisms) setPrisms(p => p - Math.floor(ranch.upgradeCost.prisms * costMult));

    setRanchBuildings(p => ({ ...p, [ranchId]: { ...p[ranchId], level: p[ranchId].level + 1 } }));
    log(`${ranch.icon} ${ranch.name} upgraded to level ${building.level + 1}!`);
  };

  const getRanchCapacity = (ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    if (!ranch || !building) return 0;
    return ranch.capacity + (building.level - 1) * RANCH_UPGRADE_BONUSES.capacity + (skillBonuses.ranchSlots || 0);
  };

  const getAssignedSlimeIds = (ranchId) => {
    const assigned = ranchAssignments[ranchId] || [];
    return assigned.map(a => typeof a === 'object' ? a.slimeId : a);
  };

  const canAssignToRanch = (slimeId, ranchId) => {
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    if (!ranch || !building) return false;

    const slime = slimes.find(s => s.id === slimeId);
    if (!slime) return false;

    // Check if slime is on expedition
    if (Object.values(exps).some(e => e.party.some(p => p.id === slimeId))) return false;

    // Check if already assigned to any ranch
    for (const [rid, assigned] of Object.entries(ranchAssignments)) {
      const ids = (assigned || []).map(a => typeof a === 'object' ? a.slimeId : a);
      if (ids.includes(slimeId)) return false;
    }

    // Check capacity
    const capacity = getRanchCapacity(ranchId);
    if ((ranchAssignments[ranchId]?.length || 0) >= capacity) return false;

    return true;
  };

  const assignToRanch = (slimeId, ranchId) => {
    if (!canAssignToRanch(slimeId, ranchId)) return;
    const slime = slimes.find(s => s.id === slimeId);
    const ranch = RANCH_TYPES[ranchId];

    const assignment = {
      slimeId,
      startTime: Date.now(),
      accumulated: { biomass: 0, element: 0, stats: 0, cycles: 0 }
    };

    setRanchAssignments(p => ({
      ...p,
      [ranchId]: [...(p[ranchId] || []), assignment]
    }));
    log(`${slime.name} assigned to ${ranch.icon} ${ranch.name}`);
  };

  const removeFromRanch = (slimeId, ranchId) => {
    const slime = slimes.find(s => s.id === slimeId);
    const ranch = RANCH_TYPES[ranchId];
    const building = ranchBuildings[ranchId];
    if (!slime || !ranch || !building) return;

    // Find the assignment to get accumulated rewards
    const assigned = ranchAssignments[ranchId] || [];
    const assignment = assigned.find(a => (typeof a === 'object' ? a.slimeId : a) === slimeId);

    if (assignment && typeof assignment === 'object' && assignment.accumulated) {
      const acc = assignment.accumulated;

      // Apply accumulated rewards
      if (ranch.effect === 'biomass' && acc.biomass > 0) {
        setSlimes(prev => prev.map(s =>
          s.id === slimeId ? { ...s, biomass: (s.biomass || 0) + Math.floor(acc.biomass) } : s
        ));
        log(`${slime.name} gained ${Math.floor(acc.biomass)} biomass from ${ranch.icon} ${ranch.name}!`);
      } else if (ranch.effect === 'element' && acc.element > 0 && ranch.element) {
        setSlimes(prev => prev.map(s => {
          if (s.id !== slimeId) return s;
          if (s.primaryElement || s.traits?.includes('void')) return s;
          const newElements = { ...(s.elements || { fire: 0, water: 0, nature: 0, earth: 0 }) };
          newElements[ranch.element] = Math.min(100, (newElements[ranch.element] || 0) + acc.element);
          let primaryElement = s.primaryElement;
          if (newElements[ranch.element] >= 100) {
            primaryElement = ranch.element;
            log(`${s.name} fully attuned to ${ELEMENTS[ranch.element].icon} ${ELEMENTS[ranch.element].name}!`);
          } else {
            log(`${s.name} gained ${acc.element.toFixed(1)}% ${ELEMENTS[ranch.element].name} affinity!`);
          }
          return { ...s, elements: newElements, primaryElement };
        }));
      } else if (ranch.effect === 'stats' && acc.stats > 0) {
        setSlimes(prev => prev.map(s => {
          if (s.id !== slimeId || !s.baseStats) return s;
          const stats = ['firmness', 'slipperiness', 'viscosity'];
          const statGainPerStat = acc.stats / 3;
          return {
            ...s,
            baseStats: {
              firmness: s.baseStats.firmness + statGainPerStat,
              slipperiness: s.baseStats.slipperiness + statGainPerStat,
              viscosity: s.baseStats.viscosity + statGainPerStat,
            }
          };
        }));
        log(`${slime.name} gained ${acc.stats.toFixed(1)} stat points from training!`);
      } else if (ranch.effect === 'trait' && ranch.grantsTrait === 'void' && acc.cycles >= 1) {
        // Nullifier: Grant void trait
        setSlimes(prev => prev.map(s => {
          if (s.id !== slimeId) return s;
          if (s.traits?.includes('void')) return s;
          return {
            ...s,
            elements: { fire: 0, water: 0, nature: 0, earth: 0 },
            primaryElement: null,
            traits: [...(s.traits || []), 'void']
          };
        }));
        log(`${slime.name} gained the 🕳️ Void trait!`);
      }
    }

    setRanchAssignments(p => ({
      ...p,
      [ranchId]: (p[ranchId] || []).filter(a => (typeof a === 'object' ? a.slimeId : a) !== slimeId)
    }));
  };

  const getSlimeRanch = (slimeId) => {
    for (const [ranchId, assigned] of Object.entries(ranchAssignments)) {
      const ids = (assigned || []).map(a => typeof a === 'object' ? a.slimeId : a);
      if (ids.includes(slimeId)) return ranchId;
    }
    return null;
  };

  const getSlimeAccumulated = (slimeId, ranchId) => {
    const assigned = ranchAssignments[ranchId] || [];
    const assignment = assigned.find(a => (typeof a === 'object' ? a.slimeId : a) === slimeId);
    if (assignment && typeof assignment === 'object') {
      return assignment.accumulated || { biomass: 0, element: 0, stats: 0, cycles: 0 };
    }
    return { biomass: 0, element: 0, stats: 0, cycles: 0 };
  };

  const getSlimeStartTime = (slimeId, ranchId) => {
    const assigned = ranchAssignments[ranchId] || [];
    const assignment = assigned.find(a => (typeof a === 'object' ? a.slimeId : a) === slimeId);
    if (assignment && typeof assignment === 'object') {
      return assignment.startTime || Date.now();
    }
    return Date.now();
  };

  const [expDuration, setExpDuration] = useState('10'); // '10', '100', 'infinite'
  const [expSummaries, setExpSummaries] = useState([]); // Array of expedition summaries
  const [expandedSections, setExpandedSections] = useState({ research: false, buildings: false, queenUnlocks: false, mana: false }); // Collapsible sections
  const [queenSlimeModal, setQueenSlimeModal] = useState(null); // Slime ID for modal on queen screen
  const [editingSlimeName, setEditingSlimeName] = useState(null); // { id, name, title } for editing

  // Function to update a slime's name or title
  const updateSlimeName = (slimeId, newName, newTitle) => {
    setSlimes(prev => prev.map(s => {
      if (s.id === slimeId) {
        return {
          ...s,
          name: newName || s.name,
          customTitle: newTitle !== undefined ? newTitle : s.customTitle
        };
      }
      return s;
    }));
    setEditingSlimeName(null);
  };

  // Helper function to calculate current stats based on biomass and skill bonuses
  const getSlimeStats = (slime) => {
    if (!slime) return { firmness: 0, slipperiness: 0, viscosity: 0 };

    let baseF, baseS, baseV;

    // Backward compatibility: if slime has old stats property, use it directly
    if (slime.stats && !slime.baseStats) {
      baseF = slime.stats.firmness;
      baseS = slime.stats.slipperiness;
      baseV = slime.stats.viscosity;
    } else if (!slime.baseStats) {
      // If no baseStats, return defaults based on tier
      const tier = SLIME_TIERS[slime.tier];
      const baseStat = 4; // Default base stat for legacy slimes
      baseF = Math.floor(baseStat * (tier?.statMultiplier || 1));
      baseS = Math.floor(baseStat * (tier?.statMultiplier || 1));
      baseV = Math.floor(baseStat * (tier?.statMultiplier || 1));
    } else {
      const tier = SLIME_TIERS[slime.tier];
      const biomass = slime.biomass || 0;
      const percentBonus = biomass / tier.biomassPerPercent; // How many percent increases
      // BALANCE: Cap at maxBiomassBonus (default 100% = double stats)
      const cappedBonus = Math.min(percentBonus, tier.maxBiomassBonus || 100);
      const multiplier = 1 + (cappedBonus / 100); // Convert to multiplier

      baseF = Math.floor(slime.baseStats.firmness * multiplier);
      baseS = Math.floor(slime.baseStats.slipperiness * multiplier);
      baseV = Math.floor(slime.baseStats.viscosity * multiplier);
    }

    // Apply skill tree bonuses
    return {
      firmness: Math.floor(baseF * combatBonuses.firmness),
      slipperiness: baseS, // No skill bonus for slipperiness yet
      viscosity: Math.floor(baseV * combatBonuses.viscosity),
    };
  };

  const startExp = (zone, duration = expDuration) => {
    if (exps[zone] || !party.length) return;
    const p = party.map(id => { const sl = slimes.find(s => s.id === id); return { id, hp: sl.maxHp, maxHp: sl.maxHp, status: [], usedUndying: false, usedRebirth: false, usedAmbush: false, biomassGained: 0 }; });
    const targetKills = duration === '10' ? 10 : duration === '100' ? 100 : Infinity;
    setExps(pr => ({ ...pr, [zone]: { party: p, monster: null, kills: 0, targetKills, materials: {}, monsterKillCounts: {}, timer: 0, turn: 0, currentAttacker: 0, exploring: false, animSlime: null, slimeAnim: 'idle', monAnim: 'idle' } }));
    setBLogs(pr => ({ ...pr, [zone]: [{ m: `Entering ${ZONES[zone].name}... (Target: ${duration === 'infinite' ? '∞' : targetKills})`, c: '#22d3ee' }] }));
    log(`Party sent to ${ZONES[zone].name}!`);
    setParty([]);
  };

  const stopExp = (zone) => {
    // Use functional update to access current state, avoiding stale closure
    setExps(currentExps => {
      const exp = currentExps[zone];
      if (!exp) return currentExps;

      // Create summary with current state data
      const summary = {
        zone: ZONES[zone].name,
        kills: exp.kills,
        materials: { ...exp.materials },
        survivors: exp.party.filter(p => p.hp > 0),
        totalParty: exp.party.length,
        biomassDistributed: exp.party.reduce((sum, p) => sum + (p.biomassGained || 0), 0),
        // Copy party data for material/biomass distribution
        party: exp.party.map(p => ({ ...p })),
        monsterKillCounts: { ...exp.monsterKillCounts },
      };

      // Process the summary (materials, biomass, kills) outside the setExps call
      setTimeout(() => processExpSummary(zone, summary), 0);

      // Remove the expedition from state
      const next = { ...currentExps };
      delete next[zone];
      return next;
    });
  };

  // Process expedition summary (split out to avoid nested state updates)
  const processExpSummary = (zone, summary) => {
    // Add materials to inventory if any slimes survived
    if (summary.survivors.length > 0) {
      setMats(m => {
        const n = { ...m };
        Object.entries(summary.materials).forEach(([mat, count]) => {
          n[mat] = (n[mat] || 0) + count;
        });
        return n;
      });

      // Distribute biomass and element gains to surviving slimes
      setSlimes(slimes => slimes.map(sl => {
        const partyMember = summary.party.find(p => p.id === sl.id);
        if (partyMember && partyMember.hp > 0) {
          const updatedSlime = {
            ...sl,
            biomass: (sl.biomass || 0) + (partyMember.biomassGained || 0),
          };

          // Apply element gains from expedition
          if (partyMember.elementGains && !sl.primaryElement) {
            const newElements = { ...(sl.elements || createDefaultElements()) };
            Object.entries(partyMember.elementGains).forEach(([element, gain]) => {
              newElements[element] = Math.min(100, (newElements[element] || 0) + gain);
            });
            updatedSlime.elements = newElements;

            // Check if any element reached 100% - lock primary element
            if (partyMember.elementLocked) {
              updatedSlime.primaryElement = partyMember.elementLocked;
              updatedSlime.elements[partyMember.elementLocked] = 100;
            }
          }

          return updatedSlime;
        }
        return sl;
      }));

      log(`Recalled from ${ZONES[zone].name}! Materials secured.`);

      // Count kills toward mutation unlocks (only on successful recall)
      Object.entries(summary.monsterKillCounts || {}).forEach(([monsterType, count]) => {
        if (count <= 0) return;

        setMonsterKills(prev => {
          const newTotal = (prev[monsterType] || 0) + count;
          const md = MONSTER_TYPES[monsterType];

          if (md && md.mutation) {
            const mutation = MUTATION_LIBRARY[md.mutation];
            if (mutation && newTotal >= mutation.requiredKills) {
              // Check if not already unlocked (use functional update to avoid stale closure)
              setUnlockedMutations(p => {
                if (!p.includes(md.mutation)) {
                  log(`🧬 Mutation Unlocked: ${mutation.name}!`);
                  return [...p, md.mutation];
                }
                return p;
              });
            }
          }

          return { ...prev, [monsterType]: newTotal };
        });
      });
    } else {
      log(`Party wiped in ${ZONES[zone].name}! Materials lost.`);
      // Kills are NOT counted on party wipe
    }

    setExpSummaries(s => [...s, { ...summary, id: Date.now() }]);
    setBLogs(p => { const n = { ...p }; delete n[zone]; return n; });
  };

  const startRes = (id) => {
    const r = RESEARCH[id];
    if (!r || bio < r.cost || activeRes) return;
    setBio(p => p - r.cost);
    setActiveRes({ id, prog: 0 });
    log(`Researching ${r.name}...`);
  };

  // Calculate building cost with skill discount
  const getBuildingDiscount = () => 1 + (skillBonuses.buildingCost || 0) / 100; // buildingCost is -20, so discount = 0.8

  const build = (id) => {
    const b = BUILDINGS[id];
    if (!b) return;

    // Handle different cost formats with skill discount
    const discount = getBuildingDiscount();
    const hasMats = b.cost.mats;
    const biomassCost = Math.floor((b.cost.biomass || 0) * discount);
    const matCosts = hasMats ? b.cost.mats : (!b.cost.biomass ? b.cost : {});

    // Check affordability
    if (bio < biomassCost) return;
    if (!Object.entries(matCosts).every(([m, c]) => (mats[m] || 0) >= c)) return;
    if (b.max && (builds[id] || 0) >= b.max) return;

    // Deduct costs
    if (biomassCost > 0) setBio(p => p - biomassCost);
    setMats(p => {
      const n = { ...p };
      Object.entries(matCosts).forEach(([m, c]) => { n[m] -= c; if (n[m] <= 0) delete n[m]; });
      return n;
    });
    setBuilds(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
    log(`Built ${b.name}!`);
  };

  // Tower Defense Functions
  const tdSlots = 4 + (builds.defenseSlot || 0) + combatBonuses.defenseSlots;
  const tdAvailable = () => Date.now() - lastTowerDefense >= TOWER_DEFENSE_COOLDOWN;

  const startTowerDefense = (deployedSlimes) => {
    const wave = TD_WAVES[0];
    const scaling = getTDScaling(queen.level);
    const humans = [];
    const humanCount = wave.humans + scaling.countMultiplier - 1; // Base + scaling bonus
    for (let i = 0; i < humanCount; i++) {
      const baseHp = HUMAN_TYPES.warrior.hp * wave.hpMultiplier * scaling.hpMultiplier;
      humans.push({
        id: genId(),
        type: 'warrior',
        hp: baseHp,
        maxHp: baseHp,
        position: -i * 8, // Stagger start positions so humans don't overlap
        speed: HUMAN_TYPES.warrior.speed,
      });
    }

    setTowerDefense({
      phase: 'battle', // 'setup', 'battle', 'victory', 'defeat'
      currentWave: 0,
      scaling, // Store scaling for wave spawns
      deployedSlimes: deployedSlimes.map(id => {
        const sl = slimes.find(s => s.id === id);
        return { id, attackTimer: 0 };
      }),
      humans,
      battleLog: ['Wave 1 begins!'],
      battleTimer: 0,
    });
    log('🎯 Tower Defense battle started!');
  };

  const endTowerDefense = (victory, summary) => {
    let rewards = { biomass: 0, materials: {} };
    let losses = { biomass: 0 };
    const rewardMultiplier = towerDefense?.scaling?.rewardMultiplier || 1;

    if (victory) {
      // Calculate rewards with queen level scaling
      TD_WAVES.forEach(w => {
        rewards.biomass += Math.floor(w.reward.biomass * rewardMultiplier);
        Object.entries(w.reward.mats).forEach(([m, c]) => {
          rewards.materials[m] = (rewards.materials[m] || 0) + Math.floor(c * rewardMultiplier);
        });
      });
      // Boss drops Champion Badge (unique material)
      rewards.materials['Champion Badge'] = (rewards.materials['Champion Badge'] || 0) + 1;

      setBio(p => p + rewards.biomass);
      setMats(p => {
        const n = { ...p };
        Object.entries(rewards.materials).forEach(([m, c]) => {
          n[m] = (n[m] || 0) + c;
        });
        return n;
      });
      // Guaranteed Prism on TD victory
      setPrisms(p => p + 1);
      rewards.prisms = 1;
      log(`🎉 Victory! +${rewards.biomass} biomass, +1💎 Prism, +1🏅 Champion Badge!`);
    } else {
      // Lose half biomass
      losses.biomass = Math.floor(bio / 2);
      setBio(p => Math.max(0, p - losses.biomass));

      // Partial rewards based on humans defeated (even in defeat, you get some drops)
      const humansDefeated = summary?.humansDefeated || 0;
      if (humansDefeated > 0) {
        // Small biomass reward per human
        const partialBio = Math.floor(humansDefeated * 5 * rewardMultiplier);
        rewards.biomass = partialBio;
        setBio(p => p + partialBio);

        // 30% chance per human defeated to drop a material
        const dropChance = 0.3;
        const possibleMats = ['Human Bone', 'Iron Sword'];
        for (let i = 0; i < humansDefeated; i++) {
          if (Math.random() < dropChance) {
            const mat = possibleMats[Math.floor(Math.random() * possibleMats.length)];
            rewards.materials[mat] = (rewards.materials[mat] || 0) + 1;
          }
        }

        // Apply material rewards
        if (Object.keys(rewards.materials).length > 0) {
          setMats(p => {
            const n = { ...p };
            Object.entries(rewards.materials).forEach(([m, c]) => {
              n[m] = (n[m] || 0) + c;
            });
            return n;
          });
        }

        const matStr = Object.keys(rewards.materials).length > 0
          ? `, salvaged: ${Object.entries(rewards.materials).map(([m, c]) => `${c}x ${m}`).join(', ')}`
          : '';
        log(`💀 Defeat! Lost ${losses.biomass} biomass, but salvaged +${partialBio} biomass${matStr}!`);
      } else {
        log(`💀 Defeat! Lost ${losses.biomass} biomass!`);
      }
    }

    // Update tower defense with summary but don't clear it yet
    setTowerDefense(prev => ({
      ...prev,
      phase: victory ? 'victory' : 'defeat',
      summary: {
        victory,
        totalDamage: summary?.totalDamage || 0,
        humansDefeated: summary?.humansDefeated || 0,
        rewards,
        losses,
      }
    }));

    setLastTowerDefense(Date.now());
  };

  const closeTowerDefense = () => {
    setTowerDefense(null);
  };

  // Game Loop
  useEffect(() => {
    if (!gameLoaded) return;
    const iv = setInterval(() => {
      const now = Date.now();
      const dt = ((now - lastTick) / TICK_RATE) * speed; // Game ticks for battles
      const dtSeconds = (now - lastTick) / 1000 * speed; // Real seconds for research/ranch
      setLastTick(now);

      // Mana generation - 1 per slime per hour + ranch bonus, updated every minute
      const timeSinceManaUpdate = now - lastManaUpdate;
      if (timeSinceManaUpdate >= MANA_UPDATE_INTERVAL) {
        const hoursElapsed = timeSinceManaUpdate / 3600000;
        const ranchBonuses = getRanchBonuses();
        const baseManaRate = slimes.length * MANA_PER_SLIME_PER_HOUR;
        const totalManaRate = baseManaRate + ranchBonuses.bonusManaPerHour;
        const manaGain = Math.floor(totalManaRate * hoursElapsed);
        if (manaGain > 0) {
          setMana(p => p + manaGain);
        }
        setLastManaUpdate(now);
      }

      // Clean up expired hive abilities
      setActiveHiveAbilities(prev => {
        const active = {};
        Object.entries(prev).forEach(([id, expiration]) => {
          if (expiration > now) active[id] = expiration;
        });
        return active;
      });

      setExps(prev => {
        const next = { ...prev };
        Object.entries(next).forEach(([zone, exp]) => {
          const zd = ZONES[zone];
          const living = exp.party.filter(p => p.hp > 0);

          // Handle intermission phase between battles
          if (exp.intermission) {
            const swiftMult = isHiveAbilityActive('swiftExpedition') ? 1.5 : 1.0;
            exp.intermission.timer += dt * 100 * swiftMult;

            // Process event effects once (boons/maluses)
            if (!exp.intermission.processed && exp.intermission.event.type !== 'flavor') {
              exp.intermission.processed = true;
              const evt = exp.intermission.event;

              if (evt.type === 'boon') {
                if (evt.effect === 'heal') {
                  living.forEach(p => { p.hp = Math.min(p.maxHp, p.hp + evt.value); });
                  bLog(zone, `✨ Party healed +${evt.value} HP!`, '#4ade80');
                } else if (evt.effect === 'biomass') {
                  setBio(b => b + evt.value);
                  bLog(zone, `✨ Found +${evt.value} biomass!`, '#4ade80');
                }
              } else if (evt.type === 'malus') {
                if (evt.effect === 'damage') {
                  living.forEach(p => { p.hp = Math.max(1, p.hp - evt.value); });
                  bLog(zone, `⚠️ Party took ${evt.value} damage!`, '#ef4444');
                } else if (evt.effect === 'poison') {
                  living.forEach(p => {
                    if (!(p.status || []).some(s => s.type === 'poison')) {
                      p.status = p.status || [];
                      p.status.push({ type: 'poison', dur: STATUS_EFFECTS.poison.dur });
                    }
                  });
                  bLog(zone, `⚠️ Party poisoned!`, '#22c55e');
                }
              }
            }

            // Check if intermission is over
            if (exp.intermission.timer >= exp.intermission.duration) {
              exp.intermission = null;
              // Spawn next monster (weighted by rarity, with skill bonus)
              const mt = selectMonster(zone, combatBonuses.rareSpawn) || zd.monsters[0];
              const md = MONSTER_TYPES[mt];
              exp.monster = { type: mt, hp: md.hp, maxHp: md.hp, dmg: md.dmg, status: [] };
              bLog(zone, `A ${md.name} appears!`, '#22d3ee');
              exp.turn = 0;
            }
            return; // Skip combat during intermission
          }

          // Only spawn new monsters if target not yet reached (first monster only)
          if (!exp.monster && exp.kills < exp.targetKills && !exp.exploring && exp.kills === 0) {
            // 30% chance to trigger exploration event before spawning first monster
            if (Math.random() < 0.3) {
              exp.exploring = true;
              const event = EXPLORATION_EVENTS[Math.floor(Math.random() * EXPLORATION_EVENTS.length)];
              bLog(zone, event.msg, '#a855f7');

              if (event.type === 'biomass') {
                setBio(b => b + event.amount);
              } else if (event.type === 'material') {
                const zoneMats = zd.monsters.map(m => MONSTER_TYPES[m].mats).flat();
                const mat = zoneMats[Math.floor(Math.random() * zoneMats.length)];
                exp.materials[mat] = (exp.materials[mat] || 0) + 1;
                bLog(zone, `Found ${mat}!`, '#f59e0b');
              } else if (event.type === 'trait') {
                // Rare event: grant a trait to a random party member
                const eligible = living.filter(p => {
                  const sl = slimes.find(s => s.id === p.id);
                  return sl && (!sl.traits || sl.traits.length === 0);
                });
                if (eligible.length > 0) {
                  const target = eligible[Math.floor(Math.random() * eligible.length)];
                  const sl = slimes.find(s => s.id === target.id);
                  const trait = event.traitPool[Math.floor(Math.random() * event.traitPool.length)];
                  const traitData = SLIME_TRAITS[trait];
                  if (sl && traitData) {
                    setSlimes(prev => prev.map(s =>
                      s.id === sl.id ? { ...s, traits: [...(s.traits || []), trait] } : s
                    ));
                    bLog(zone, `${sl.name} ${event.msg} Gained ${traitData.icon} ${traitData.name}!`, '#f59e0b');
                    log(`${sl.name} developed the ${traitData.name} trait!`);
                  }
                }
              }
            } else {
              // Spawn monster immediately (weighted by rarity, with skill bonus)
              const mt = selectMonster(zone, combatBonuses.rareSpawn) || zd.monsters[0];
              const md = MONSTER_TYPES[mt];
              exp.monster = { type: mt, hp: md.hp, maxHp: md.hp, dmg: md.dmg, status: [] };
              bLog(zone, `A ${md.name} appears!`, '#22d3ee');
              exp.turn = 0;
            }
          } else if (exp.exploring) {
            // After exploration event, spawn the monster (weighted by rarity, with skill bonus)
            exp.exploring = false;
            const mt = selectMonster(zone, combatBonuses.rareSpawn) || zd.monsters[0];
            const md = MONSTER_TYPES[mt];
            exp.monster = { type: mt, hp: md.hp, maxHp: md.hp, dmg: md.dmg, status: [] };
            bLog(zone, `A ${md.name} appears!`, '#22d3ee');
            exp.turn = 0;
          }

          exp.timer += dt * 100;
          // Swift Expedition hive ability: 50% faster combat
          const swiftMult = isHiveAbilityActive('swiftExpedition') ? 1.5 : 1.0;
          if (exp.timer >= BATTLE_TICK_SPEED / speed / swiftMult) {
            exp.timer = 0;
            exp.animSlime = null; exp.slimeAnim = 'idle'; exp.monAnim = 'idle';
            
            const living = exp.party.filter(p => p.hp > 0);
            if (!living.length) return;
            const mon = exp.monster;
            const md = MONSTER_TYPES[mon.type];

            mon.status = (mon.status || []).filter(s => {
              if (s.dur > 0) { const e = STATUS_EFFECTS[s.type]; mon.hp -= e.dmg; bLog(zone, `${md.name} takes ${e.dmg} ${e.name} dmg`, e.color); s.dur--; return s.dur > 0; }
              return false;
            });
            exp.party.forEach(p => {
              if (p.hp <= 0) return;
              p.status = (p.status || []).filter(s => {
                if (s.dur > 0) { const e = STATUS_EFFECTS[s.type]; const sl = slimes.find(x => x.id === p.id); p.hp -= e.dmg; bLog(zone, `${sl?.name} takes ${e.dmg} ${e.name} dmg`, e.color); s.dur--; return s.dur > 0; }
                return false;
              });
            });

            // Determine whose turn it is
            const totalCombatants = living.length + 1; // slimes + monster
            const currentTurn = exp.turn % totalCombatants;
            const isMonsterTurn = currentTurn === living.length;
            exp.turn++;

            if (!isMonsterTurn) {
              // One slime attacks
              const p = living[currentTurn];
              if (mon.hp > 0 && p) {
                const sl = slimes.find(s => s.id === p.id);
                if (sl) {
                  const stats = getSlimeStats(sl);
                  let dmg = stats.firmness;
                  let crit = false;
                  // Primordial trait: +10% all stats (applied to damage)
                  if (sl.traits?.includes('primordial')) dmg = Math.floor(dmg * 1.10);
                  // Mutation passives (apply mutationPower bonus from skill tree)
                  const mutPower = combatBonuses.mutationPower;
                  if (sl.pass?.includes('ferocity')) dmg *= 1 + (0.15 * mutPower);
                  // Personality traits affecting damage
                  if (sl.traits?.includes('brave') && p.hp < p.maxHp * 0.5) dmg = Math.floor(dmg * 1.05);
                  if (sl.traits?.includes('lazy')) dmg = Math.floor(dmg * 0.95);
                  if (sl.traits?.includes('timid')) dmg = Math.floor(dmg * 0.95);
                  if (sl.traits?.includes('reckless')) dmg = Math.floor(dmg * 1.10);
                  if (sl.traits?.includes('fierce') && !p.usedFierce) { dmg = Math.floor(dmg * 1.08); p.usedFierce = true; }
                  // Skill tree: +damage when slime is low HP (berserkMode)
                  if (p.hp < p.maxHp * 0.3) dmg = Math.floor(dmg * combatBonuses.lowHpDamage);
                  // Skill tree: +damage vs monsters with more HP (brutalForce)
                  if (mon.maxHp > p.maxHp) dmg = Math.floor(dmg * combatBonuses.damageVsHighHp);
                  // Skill tree: +damage vs low HP monsters (executioner)
                  if (mon.hp < mon.maxHp * 0.25) dmg = Math.floor(dmg * combatBonuses.executeDamage);
                  // Crit chance calculation - apply skill tree bonus
                  let critCh = 0.05 + combatBonuses.critChance + stats.slipperiness * 0.01 + (sl.pass?.includes('trickster') ? 0.08 * mutPower : 0);
                  if (sl.traits?.includes('swift')) critCh += 0.03;
                  if (sl.pass?.includes('ambush') && !p.usedAmbush) { crit = true; p.usedAmbush = true; }
                  else if (Math.random() < critCh) crit = true;
                  if (crit) dmg *= (1.5 + (sl.pass?.includes('crushing') ? 0.3 * mutPower : 0));
                  dmg = Math.floor(dmg * (1 + bon.spd * 0.1));
                  // Apply elemental damage modifier (slime element vs monster element) with skill bonus
                  const preDmg = dmg;
                  dmg = calculateElementalDamage(dmg, sl.primaryElement, md.element);
                  // Apply elemental damage skill bonus
                  if (dmg > preDmg) dmg = Math.floor(dmg * combatBonuses.elementalDamage);
                  const elementBonus = dmg !== preDmg;
                  mon.hp -= dmg;
                  // Status effects with skill tree bonus
                  const statusMult = combatBonuses.statusChance;
                  if (sl.pass?.includes('fireBreath') && !(mon.status || []).some(s => s.type === 'burn') && Math.random() < (0.3 + stats.viscosity * 0.02) * statusMult) { mon.status.push({ type: 'burn', dur: STATUS_EFFECTS.burn.dur }); bLog(zone, `${sl.name} burns ${md.name}! 🔥`, '#f97316'); }
                  if (sl.pass?.includes('poison') && !(mon.status || []).some(s => s.type === 'poison') && Math.random() < (0.35 + stats.viscosity * 0.02) * statusMult) { mon.status.push({ type: 'poison', dur: STATUS_EFFECTS.poison.dur }); bLog(zone, `${sl.name} poisons ${md.name}! 🧪`, '#22c55e'); }
                  exp.animSlime = p.id; exp.slimeAnim = 'attack'; exp.monAnim = 'hurt';
                  // Shared Vigor hive ability: heal 2 HP when attacking
                  if (isHiveAbilityActive('sharedVigor') && p.hp < p.maxHp) {
                    const healAmt = Math.min(2, p.maxHp - p.hp);
                    p.hp = Math.min(p.maxHp, p.hp + 2);
                    if (healAmt > 0) bLog(zone, `❤️‍🩹 ${sl.name} healed +${healAmt} (Shared Vigor)`, '#ec4899');
                  }
                  // Skill tree passive: regeneration (1 HP per battle tick)
                  if (hasPassive('regeneration') && p.hp < p.maxHp) {
                    p.hp = Math.min(p.maxHp, p.hp + 1);
                  }
                  // Show element effectiveness in battle log
                  let dmgMsg = `${sl.name} ${crit ? '💥CRITS' : 'hits'} for ${Math.floor(dmg)}!`;
                  if (elementBonus && dmg > preDmg) dmgMsg += ' ⚡ Super effective!';
                  else if (elementBonus && dmg < preDmg) dmgMsg += ' 💫 Not effective...';
                  bLog(zone, dmgMsg, crit ? '#f59e0b' : elementBonus && dmg > preDmg ? '#4ade80' : elementBonus ? '#94a3b8' : '#4ade80');
                }
              }
              if (mon.hp <= 0) {
                exp.kills++;
                // Track kills per monster type for mutation unlocks
                exp.monsterKillCounts = exp.monsterKillCounts || {};
                exp.monsterKillCounts[mon.type] = (exp.monsterKillCounts[mon.type] || 0) + 1;

                // Apply skill tree bonuses and ranch bonuses: expeditionBiomass, biomassGain, scoutPost
                const ranchBonuses = getRanchBonuses();
                const scoutBonus = 1 + ranchBonuses.expeditionRewards;
                let bioG = Math.floor(md.biomass * bon.bio * combatBonuses.expeditionBiomass * combatBonuses.biomassGain * scoutBonus);
                living.forEach(p => { const sl = slimes.find(s => s.id === p.id); if (sl?.pass?.includes('manaLeech')) bioG = Math.floor(bioG * 1.1); });
                // Personality traits affecting biomass gain
                let bioMultiplier = 1;
                living.forEach(p => {
                  const sl = slimes.find(s => s.id === p.id);
                  if (sl?.traits?.includes('greedy')) bioMultiplier += 0.05;
                  if (sl?.traits?.includes('glutton')) bioMultiplier += 0.10;
                });
                // Bountiful Harvest hive ability: +25% biomass
                if (isHiveAbilityActive('bountifulHarvest')) bioMultiplier += 0.25;
                bioG = Math.floor(bioG * bioMultiplier);

                // Resilient trait: recover 1 HP per kill
                living.forEach(p => {
                  const sl = slimes.find(s => s.id === p.id);
                  if (sl?.traits?.includes('resilient')) {
                    p.hp = Math.min(p.maxHp, p.hp + 1);
                  }
                });

                // Distribute biomass evenly among living party members
                const bioPerSlime = bioG / living.length;
                const hasBountiful = isHiveAbilityActive('bountifulHarvest');
                living.forEach(p => {
                  p.biomassGained = (p.biomassGained || 0) + bioPerSlime;
                });
                const bioMsg = hasBountiful
                  ? `${md.name} defeated! +${Math.floor(bioPerSlime)}🧬 each (🌾+25%)`
                  : `${md.name} defeated! +${Math.floor(bioPerSlime)}🧬 each`;
                bLog(zone, bioMsg, '#4ade80');

                // Rare Prism drop (0.1% per kill)
                if (Math.random() < 0.001) {
                  setPrisms(p => p + 1);
                  bLog(zone, '💎 Found a Prism!', '#f59e0b');
                  log('💎 Prism discovered!');
                }

                // Material drops - check for lucky trait bonus, skill tree bonus, and ranch bonus
                let matDropChance = 0.5 * combatBonuses.materialDrop * scoutBonus;
                living.forEach(p => {
                  const sl = slimes.find(s => s.id === p.id);
                  if (sl?.traits?.includes('lucky')) matDropChance += 0.05;
                });
                // Bountiful Harvest hive ability: +25% material drops
                if (isHiveAbilityActive('bountifulHarvest')) matDropChance *= 1.25;
                if (Math.random() < matDropChance) {
                  const mat = md.mats[Math.floor(Math.random() * md.mats.length)];
                  exp.materials[mat] = (exp.materials[mat] || 0) + 1;
                  bLog(zone, `Found ${mat}! 📦`, '#f59e0b');
                }

                // Mutations are now unlocked via kill counts on recall, not drops

                // Element accumulation - slimes gain element affinity from zone
                if (zd.element && zd.elementGainRate > 0) {
                  const hasEvoPulse = isHiveAbilityActive('evolutionPulse');
                  living.forEach(p => {
                    const sl = slimes.find(s => s.id === p.id);
                    if (sl && canGainElement(sl)) {
                      let gain = calculateElementGain(zd.elementGainRate, sl);
                      // Evolution Pulse hive ability: +50% element gain
                      if (hasEvoPulse) gain *= 1.5;
                      const newValue = Math.min(100, (sl.elements?.[zd.element] || 0) + gain);
                      // Store element gain in party member for batch update on recall
                      if (!p.elementGains) p.elementGains = {};
                      p.elementGains[zd.element] = (p.elementGains[zd.element] || 0) + gain;
                      // Check if element would reach 100%
                      if ((sl.elements?.[zd.element] || 0) + (p.elementGains[zd.element] || 0) >= 100 && !p.elementLocked) {
                        p.elementLocked = zd.element;
                        const evoPulseMsg = hasEvoPulse ? ' (⚡+50%)' : '';
                        bLog(zone, `${sl.name} attuned to ${ELEMENTS[zd.element].icon} ${ELEMENTS[zd.element].name}!${evoPulseMsg}`, ELEMENTS[zd.element].color);
                        log(`${sl.name} is now a ${ELEMENTS[zd.element].name} slime!`);
                      }
                    }
                  });
                }

                exp.monster = null;

                // Check if target kills reached
                if (exp.kills >= exp.targetKills) {
                  bLog(zone, `Target reached! Auto-recalling party...`, '#4ade80');
                  setTimeout(() => stopExp(zone), 1000);
                } else {
                  // Start intermission before next battle
                  let event;
                  const roll = Math.random();
                  if (roll < 0.75 && INTERMISSION_EVENTS[zone]) {
                    // 75% zone-specific flavor text
                    const zoneEvents = INTERMISSION_EVENTS[zone];
                    event = zoneEvents[Math.floor(Math.random() * zoneEvents.length)];
                  } else {
                    // 25% general events (boons/maluses)
                    event = INTERMISSION_EVENTS.general[Math.floor(Math.random() * INTERMISSION_EVENTS.general.length)];
                  }
                  exp.intermission = {
                    timer: 0,
                    duration: INTERMISSION_DURATION,
                    event: event,
                    processed: false
                  };
                  bLog(zone, event.msg, event.type === 'boon' ? '#4ade80' : event.type === 'malus' ? '#ef4444' : '#a855f7');
                }
              }
            } else {
              if (mon.hp > 0) {
                const tgt = living[Math.floor(Math.random() * living.length)];
                const tgtSl = slimes.find(s => s.id === tgt.id);
                const tgtStats = tgtSl ? getSlimeStats(tgtSl) : { slipperiness: 0 };
                let inc = md.dmg;
                // Calculate dodge chance with trait bonuses
                let dodgeCh = 0.05 + (tgtStats.slipperiness || 0) * 0.015 + (tgtSl?.pass?.includes('echolocation') ? 0.12 : 0) + (tgtSl?.pass?.includes('trickster') ? 0.08 : 0);
                // Cautious: +5% dodge when HP below 50%
                if (tgtSl?.traits?.includes('cautious') && tgt.hp < tgt.maxHp * 0.5) dodgeCh += 0.05;
                // Timid: +10% dodge
                if (tgtSl?.traits?.includes('timid')) dodgeCh += 0.10;
                if (Math.random() < dodgeCh) { bLog(zone, `${tgtSl?.name} dodges! 💨`, '#22d3ee'); }
                else {
                  if (tgtSl?.pass?.includes('armored')) inc *= 0.8;
                  // Reckless trait: +5% damage taken
                  if (tgtSl?.traits?.includes('reckless')) inc = Math.floor(inc * 1.05);
                  // Skill tree: flat damage reduction (toughHide)
                  if (combatBonuses.damageReduction > 0) inc = Math.max(1, inc - combatBonuses.damageReduction);
                  // Skill tree: 50% less damage when below 20% HP (lastStand)
                  if (tgt.hp < tgt.maxHp * 0.2 && combatBonuses.lowHpDefense > 0) inc = Math.floor(inc * (1 - combatBonuses.lowHpDefense));
                  // Apply elemental damage modifier (monster element vs slime element)
                  const preInc = Math.floor(inc);
                  inc = calculateElementalDamage(Math.floor(inc), md.element, tgtSl?.primaryElement);
                  const elementBonus = inc !== preInc;
                  tgt.hp -= inc;
                  let hitMsg = `${md.name} hits ${tgtSl?.name} for ${inc}!`;
                  if (elementBonus && inc > preInc) hitMsg += ' ⚡';
                  else if (elementBonus && inc < preInc) hitMsg += ' 💫';
                  bLog(zone, hitMsg, '#ef4444');
                  if (tgtSl?.pass?.includes('reflect')) { const ref = Math.floor(inc * 0.15); mon.hp -= ref; bLog(zone, `Reflected ${ref}! 💎`, '#06b6d4'); }
                  if (md.trait === 'venomSac' && !(tgt.status || []).some(s => s.type === 'poison') && Math.random() < 0.3) { tgt.status.push({ type: 'poison', dur: STATUS_EFFECTS.poison.dur }); bLog(zone, `${tgtSl?.name} poisoned! 🧪`, '#22c55e'); }
                  if ((md.trait === 'dragonHeart' || md.trait === 'phoenixFeather') && !(tgt.status || []).some(s => s.type === 'burn') && Math.random() < 0.25) { tgt.status.push({ type: 'burn', dur: STATUS_EFFECTS.burn.dur }); bLog(zone, `${tgtSl?.name} burning! 🔥`, '#f97316'); }
                  if (md.trait === 'wolfFang' && !(tgt.status || []).some(s => s.type === 'bleed') && Math.random() < 0.2) { tgt.status.push({ type: 'bleed', dur: STATUS_EFFECTS.bleed.dur }); bLog(zone, `${tgtSl?.name} bleeding! 🩸`, '#ef4444'); }
                  exp.monAnim = 'attack'; exp.animSlime = tgt.id; exp.slimeAnim = 'hurt';
                }
                // Skill tree passive: tactical retreat (escape with 1 HP instead of dying, once per expedition)
                if (tgt.hp <= 0 && tgtSl && hasPassive('tacticalRetreat') && !tgt.usedTacticalRetreat) {
                  tgt.hp = 1;
                  tgt.usedTacticalRetreat = true;
                  bLog(zone, `${tgtSl.name} barely escapes! (Tactical Retreat) 💧`, '#22d3ee');
                }
                if (tgt.hp <= 0 && tgtSl) {
                  if (tgtSl.pass?.includes('undying') && !tgt.usedUndying) { tgt.hp = 1; tgt.usedUndying = true; bLog(zone, `${tgtSl.name} survives! (Undying) 💀`, '#d4d4d4'); }
                  else if (tgtSl.pass?.includes('rebirth') && !tgt.usedRebirth) { tgt.hp = Math.floor(tgt.maxHp * 0.3); tgt.usedRebirth = true; bLog(zone, `${tgtSl.name} revives! (Rebirth) 🔥`, '#fb923c'); }
                }
                if (tgt.hp <= 0) { bLog(zone, `${tgtSl?.name} fell! 💔`, '#ef4444'); log(`${tgtSl?.name} was defeated!`); setSlimes(s => s.filter(sl => sl.id !== tgt.id)); exp.party = exp.party.filter(p => p.id !== tgt.id); }
              }
            }
          }
        });
        Object.keys(next).forEach(z => { if (!next[z].party.filter(p => p.hp > 0).length) { bLog(z, 'Party wiped!', '#ef4444'); log(`Expedition wiped!`); delete next[z]; } });

        // Shared Vigor hive ability: regenerate 1 HP per minute (~0.017 per tick at dt=1)
        if (isHiveAbilityActive('sharedVigor')) {
          Object.values(next).forEach(exp => {
            exp.party.forEach(p => {
              if (p.hp > 0) {
                p.hp = Math.min(p.maxHp, p.hp + dt * 0.0167); // ~1 HP per minute
              }
            });
          });
        }

        return next;
      });

      // BALANCE: Research uses real seconds, not game ticks
      if (activeRes) {
        setActiveRes(p => {
          if (!p) return null;
          const r = RESEARCH[p.id];
          const np = p.prog + (100 / r.time) * bon.res * dtSeconds;
          if (np >= 100) { setResearch(c => [...c, p.id]); log(`${r.name} complete!`); return null; }
          return { ...p, prog: np };
        });
      }

      // Ranch tick - accumulate rewards (applied when slimes are removed)
      setRanchProgress(prev => {
        const next = { ...prev };
        Object.entries(ranchBuildings).forEach(([ranchId, building]) => {
          const ranch = RANCH_TYPES[ranchId];
          const assigned = ranchAssignments[ranchId] || [];
          if (!ranch || !building || assigned.length === 0) return;

          // Calculate cycle time with upgrades (in real seconds)
          const cycleReduction = 1 - Math.min(0.5, (building.level - 1) * RANCH_UPGRADE_BONUSES.cycleReduction);
          const effectiveCycleTime = ranch.cycleTime * cycleReduction;
          const effectMult = 1 + (building.level - 1) * RANCH_UPGRADE_BONUSES.effectMultiplier;

          // Nurturing Aura hive ability: double ranch tick speed
          const ranchSpeedMult = isHiveAbilityActive('nurturingAura') ? 2 : 1;
          next[ranchId] = (next[ranchId] || 0) + dtSeconds * ranchSpeedMult;

          // Check if cycle completes
          if (next[ranchId] >= effectiveCycleTime) {
            next[ranchId] = 0;

            // Roll for random event (15% chance)
            let eventMult = 1;
            let eventTriggered = null;
            if (Math.random() < 0.15) {
              const validEvents = RANCH_EVENTS.filter(e => !e.ranchTypes || e.ranchTypes.includes(ranchId));
              const totalWeight = validEvents.reduce((sum, e) => sum + (e.weight || 1), 0);
              let roll = Math.random() * totalWeight;
              for (const event of validEvents) {
                roll -= (event.weight || 1);
                if (roll <= 0) {
                  eventTriggered = event;
                  if (event.type === 'bonus') {
                    if (event.effect === 'elementBoost' || event.effect === 'statsBoost') {
                      eventMult = event.value;
                    }
                  } else if (event.type === 'penalty' && event.effect === 'reducedGains') {
                    eventMult = event.value;
                  }
                  break;
                }
              }
            }

            // Log event with timestamp
            if (eventTriggered) {
              const now = new Date();
              const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setRanchEvents(e => [...e.slice(-19), {
                msg: eventTriggered.msg,
                ranchId,
                time: Date.now(),
                timestamp,
                type: eventTriggered.type
              }]);
            }

            // Accumulate rewards for each assigned slime (respecting 24h cap)
            setRanchAssignments(prevAssignments => {
              const newAssignments = { ...prevAssignments };
              const ranchAssigned = [...(newAssignments[ranchId] || [])];

              ranchAssigned.forEach((assignment, idx) => {
                if (typeof assignment !== 'object') return;

                const slimeId = assignment.slimeId;
                const slime = slimes.find(s => s.id === slimeId);
                if (!slime) return;

                // Check if we've hit the 24h cap
                const timeInRanch = (Date.now() - assignment.startTime) / 1000;
                if (timeInRanch >= RANCH_MAX_ACCUMULATION_TIME) return; // Capped

                // Calculate lazy trait bonus and skill tree ranch yield bonus
                const lazyBonus = slime.traits?.includes('lazy') ? 1.1 : 1;
                const ranchYieldBonus = 1 + (skillBonuses.ranchYield || 0) / 100;
                const totalMult = effectMult * eventMult * lazyBonus * ranchYieldBonus;

                const acc = { ...assignment.accumulated };

                if (ranch.effect === 'biomass') {
                  acc.biomass = (acc.biomass || 0) + ranch.effectValue * totalMult;
                  // Bonus biomass from bountiful harvest event
                  if (eventTriggered?.effect === 'biomass') {
                    acc.biomass += eventTriggered.value;
                  }
                } else if (ranch.effect === 'element' && ranch.element) {
                  if (!slime.primaryElement && !slime.traits?.includes('void')) {
                    acc.element = (acc.element || 0) + ranch.effectValue * totalMult;
                  }
                } else if (ranch.effect === 'stats') {
                  acc.stats = (acc.stats || 0) + ranch.effectValue * totalMult;
                } else if (ranch.effect === 'trait') {
                  acc.cycles = (acc.cycles || 0) + 1;
                  // Luxury lounge: roll for trait on each cycle
                  if (ranch.traitPool && Math.random() < ranch.effectValue) {
                    const existingTraits = slime.traits || [];
                    const availableTraits = ranch.traitPool.filter(t => !existingTraits.includes(t));
                    if (availableTraits.length > 0) {
                      const newTrait = availableTraits[Math.floor(Math.random() * availableTraits.length)];
                      const traitData = SLIME_TRAITS[newTrait];
                      setSlimes(prev => prev.map(s =>
                        s.id === slimeId ? { ...s, traits: [...(s.traits || []), newTrait] } : s
                      ));
                      log(`${slime.name} gained the ${traitData.icon} ${traitData.name} trait at ${ranch.icon}!`);
                      const now = new Date();
                      setRanchEvents(e => [...e.slice(-19), {
                        msg: `${slime.name} developed ${traitData.name}!`,
                        ranchId,
                        time: Date.now(),
                        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        type: 'trait'
                      }]);
                    }
                  }
                }

                acc.cycles = (acc.cycles || 0) + 1;
                ranchAssigned[idx] = { ...assignment, accumulated: acc };
              });

              newAssignments[ranchId] = ranchAssigned;
              return newAssignments;
            });
          }
        });
        return next;
      });
    }, TICK_RATE);
    return () => clearInterval(iv);
  }, [gameLoaded, lastTick, speed, slimes, bon, activeRes, log, bLog, ranchBuildings, ranchAssignments]);

  // Tower Defense Combat Loop
  useEffect(() => {
    if (!gameLoaded || !towerDefense || towerDefense.phase !== 'battle') return;

    const iv = setInterval(() => {
      setTowerDefense(prev => {
        if (!prev || prev.phase !== 'battle') return prev;

        const next = { ...prev };
        const dt = (TD_TICK_SPEED / 1000) * speed;
        next.battleTimer += dt;

        // Track stats for summary
        if (!next.totalDamage) next.totalDamage = 0;
        if (!next.humansDefeated) next.humansDefeated = 0;

        // Move humans and apply damage
        let humansToRemove = [];
        next.humans = next.humans.map(h => {
          const updated = {
            ...h,
            position: h.position + h.speed * dt * 10,
          };
          return updated;
        });

        // Check if any human reached the end (position >= 100)
        const humanReachedEnd = next.humans.find(h => h.position >= 100);
        if (humanReachedEnd) {
          // Check if Decoy ability is active and not yet used
          const decoyActive = activeHiveAbilities.decoy && Date.now() < activeHiveAbilities.decoy;
          if (decoyActive && !next.decoyUsed) {
            // Decoy saves the hive - remove the human and consume the ability
            next.humans = next.humans.filter(h => h.id !== humanReachedEnd.id);
            next.decoyUsed = true;
            next.humansDefeated++;
            next.battleLog = [...next.battleLog.slice(-20), '🎭 Slime Decoy intercepted the invader!'];
            // Deactivate the decoy ability
            setActiveHiveAbilities(prev => {
              const updated = { ...prev };
              delete updated.decoy;
              return updated;
            });
          } else {
            next.phase = 'defeat';
            setTimeout(() => endTowerDefense(false, { totalDamage: next.totalDamage, humansDefeated: next.humansDefeated }), 100);
            return next;
          }
        }

        // Slimes attack - apply damage to humans
        next.deployedSlimes.forEach(ds => {
          const sl = slimes.find(s => s.id === ds.id);
          if (!sl) return;

          const stats = getSlimeStats(sl);
          const attackSpeed = 1 + (stats.slipperiness || 0) * 0.1;
          ds.attackTimer = (ds.attackTimer || 0) + dt;

          if (ds.attackTimer >= 1 / attackSpeed) {
            ds.attackTimer = 0;
            // Attack the first human
            if (next.humans.length > 0) {
              const ranchBonuses = getRanchBonuses();
              const warDenBonus = 1 + ranchBonuses.towerDefenseDamage;
              const damage = Math.floor((stats.firmness || 5) * warDenBonus);
              next.totalDamage += damage;

              // Apply damage to first human
              next.humans = next.humans.map((h, idx) => {
                if (idx === 0) {
                  const newHp = h.hp - damage;
                  next.battleLog = [...next.battleLog.slice(-20), `${sl.name} attacks for ${Math.floor(damage)} damage!`];

                  if (newHp <= 0) {
                    const defeatMsg = h.isBoss ? '🏆 Human Champion defeated!' : 'Human warrior defeated!';
                    next.battleLog = [...next.battleLog.slice(-20), defeatMsg];
                    next.humansDefeated++;
                    if (h.isBoss) next.bossDefeated = true;
                    humansToRemove.push(h.id);
                  }

                  return { ...h, hp: newHp };
                }
                return h;
              });
            }
          }
        });

        // Remove defeated humans
        next.humans = next.humans.filter(h => !humansToRemove.includes(h.id));

        // Check if all humans defeated
        if (next.humans.length === 0) {
          // Start next wave or victory
          const nextWaveIdx = next.currentWave + 1;
          if (nextWaveIdx < TD_WAVES.length) {
            const wave = TD_WAVES[nextWaveIdx];
            const scaling = next.scaling || { hpMultiplier: 1, countMultiplier: 1 };
            const newHumans = [];
            const humanCount = wave.humans + scaling.countMultiplier - 1;
            for (let i = 0; i < humanCount; i++) {
              const baseHp = HUMAN_TYPES.warrior.hp * wave.hpMultiplier * scaling.hpMultiplier;
              newHumans.push({
                id: genId(),
                type: 'warrior',
                hp: baseHp,
                maxHp: baseHp,
                position: -i * 8, // Stagger start positions so humans don't overlap
                speed: HUMAN_TYPES.warrior.speed,
              });
            }
            // Add boss on final wave (wave 3, index 2)
            if (nextWaveIdx === 2) {
              const bossHp = HUMAN_TYPES.boss.hp * wave.hpMultiplier * scaling.hpMultiplier;
              newHumans.push({
                id: genId(),
                type: 'boss',
                hp: bossHp,
                maxHp: bossHp,
                position: -humanCount * 8 - 15, // Boss starts further back
                speed: HUMAN_TYPES.boss.speed,
                isBoss: true,
              });
              next.battleLog = [...next.battleLog.slice(-20), `⚠️ Wave ${nextWaveIdx + 1} begins! A CHAMPION approaches!`];
            } else {
              next.battleLog = [...next.battleLog.slice(-20), `Wave ${nextWaveIdx + 1} begins!`];
            }
            next.humans = newHumans;
            next.currentWave = nextWaveIdx;
          } else {
            // Victory!
            next.phase = 'victory';
            setTimeout(() => endTowerDefense(true, { totalDamage: next.totalDamage, humansDefeated: next.humansDefeated }), 100);
          }
        }

        return next;
      });
    }, TD_TICK_SPEED);

    return () => clearInterval(iv);
  }, [gameLoaded, towerDefense, speed, slimes, endTowerDefense, activeHiveAbilities]);

  const avail = slimes.filter(s => !Object.values(exps).some(e => e.party.some(p => p.id === s.id)) && !party.includes(s.id) && !(towerDefense?.deployedSlimes || []).some(ds => ds.id === s.id));
  const selSl = slimes.find(s => s.id === selSlime);
  const selExp = selSlime ? Object.values(exps).find(e => e.party.some(p => p.id === selSlime)) : null;
  const getResTime = () => { if (!activeRes) return ''; const r = RESEARCH[activeRes.id]; const tot = r.time / bon.res; const rem = Math.ceil(tot * (1 - activeRes.prog / 100)); return `${Math.floor(rem / 60)}:${(rem % 60).toString().padStart(2, '0')}`; };

  if (!gameLoaded) {
    return (
      <div style={{ fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🟢</div>
          <div>Loading Hive Queen...</div>
        </div>
      </div>
    );
  }

  return (
    <div onTouchStart={onTouch} onTouchEnd={onTouchEnd} style={{ fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', minHeight: '100vh', color: '#e0e0e0' }}>
      {welcomeBack && <WelcomeBackModal data={welcomeBack} onClose={() => setWelcomeBack(null)} />}

      {/* Slime Examination Modal */}
      {queenSlimeModal && (() => {
        const sl = slimes.find(s => s.id === queenSlimeModal);
        const onExp = sl ? Object.entries(exps).find(([_, e]) => e.party.some(p => p.id === sl.id)) : null;
        const expS = onExp ? onExp[1].party.find(p => p.id === sl.id) : null;
        if (!sl) return null;
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setQueenSlimeModal(null)}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 15, padding: 20, maxWidth: 500, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>Examine Slime</h3>
                <button onClick={() => setQueenSlimeModal(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer' }}>✕ Close</button>
              </div>

              {/* Editable Name and Title */}
              <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, marginBottom: 15 }}>
                {editingSlimeName?.id === sl.id ? (
                  <div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>Name</label>
                      <input
                        type="text"
                        value={editingSlimeName.name}
                        onChange={(e) => setEditingSlimeName(prev => ({ ...prev, name: e.target.value }))}
                        maxLength={20}
                        style={{
                          width: '100%',
                          padding: 8,
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 14
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, opacity: 0.7, display: 'block', marginBottom: 4 }}>Title (leave blank for trait title)</label>
                      <input
                        type="text"
                        value={editingSlimeName.title}
                        onChange={(e) => setEditingSlimeName(prev => ({ ...prev, title: e.target.value }))}
                        placeholder={sl.traits?.[0] ? SLIME_TRAITS[sl.traits[0]]?.title || '' : ''}
                        maxLength={25}
                        style={{
                          width: '100%',
                          padding: 8,
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: 6,
                          color: '#fff',
                          fontSize: 14
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => updateSlimeName(sl.id, editingSlimeName.name, editingSlimeName.title)}
                        style={{ flex: 1, padding: 8, background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 12 }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingSlimeName(null)}
                        style={{ flex: 1, padding: 8, background: 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 12 }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 'bold' }}>
                        {sl.name}
                        <span style={{ fontSize: 12, opacity: 0.7, marginLeft: 4 }}>
                          {sl.customTitle || (sl.traits?.[0] && SLIME_TRAITS[sl.traits[0]]?.title) || ''}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.5 }}>Click edit to customize name & title</div>
                    </div>
                    <button
                      onClick={() => setEditingSlimeName({
                        id: sl.id,
                        name: sl.name,
                        title: sl.customTitle || ''
                      })}
                      style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11 }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </div>

              <SlimeDetail slime={sl} expState={expS} />
              {!onExp && (
                <button
                  onClick={() => { reabsorb(sl.id); setQueenSlimeModal(null); }}
                  style={{
                    width: '100%',
                    marginTop: 15,
                    padding: 12,
                    background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                    border: 'none',
                    borderRadius: 8,
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                  }}
                >
                  🔄 Reabsorb
                </button>
              )}
              {onExp && (
                <div style={{ marginTop: 15, padding: 10, background: 'rgba(34,211,238,0.1)', borderRadius: 8, fontSize: 12, color: '#22d3ee' }}>
                  ⚠️ This slime is currently on an expedition in {ZONES[onExp[0]].name} and cannot be reabsorbed.
                </div>
              )}
            </div>
          </div>
        );
      })()}

      <Menu open={menu} close={() => setMenu(false)} tab={tab} setTab={setTab} tabs={tabs} />
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => setMenu(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>☰</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>🧬 <strong>{Math.floor(bio)}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>🍯 <strong>{freeJelly}/{maxJelly}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>🔮 <strong>{mana}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>💎 <strong>{prisms}</strong></div>
        </div>
        <button onClick={() => setDev(!dev)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>🛠️</button>
      </header>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'rgba(0,0,0,0.2)' }}>
        {visibleTabs.map((t) => <div key={t.id} onClick={() => setTab(t.id)} style={{ width: 8, height: 8, borderRadius: '50%', background: tab === t.id ? '#ec4899' : 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />)}
      </div>
      
      <main style={{ padding: 15, paddingBottom: 100 }}>
        <h2 style={{ margin: '0 0 15px', fontSize: 20 }}>{tabs.find(t => t.id === tab)?.icon} {tabs.find(t => t.id === tab)?.label}</h2>
        
        {tab === 0 && (
          <div>
            <div style={{ background: 'rgba(236,72,153,0.1)', borderRadius: 12, marginBottom: 20, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 15 }}>
                <SlimeSprite tier="royal" size={80} isQueen />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>The Hive Queen</div>
                  <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>Level {queen.level}</div>
                  <button
                    onClick={levelUpQueen}
                    disabled={bio < queen.level * 100}
                    style={{
                      padding: '10px 20px',
                      background: bio >= queen.level * 100 ? 'linear-gradient(135deg, #ec4899, #f472b6)' : 'rgba(100,100,100,0.5)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: bio >= queen.level * 100 ? 'pointer' : 'not-allowed',
                      fontSize: 12
                    }}
                  >
                    ⬆️ Level Up ({queen.level * 100}🧬)
                  </button>
                </div>
              </div>

              {/* Collapsible Unlocks Section */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedSections(s => ({ ...s, queenUnlocks: !s.queenUnlocks }))}
                  style={{
                    width: '100%',
                    padding: 10,
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    opacity: 0.9
                  }}
                >
                  <span>✨ Current Benefits & Unlocks</span>
                  <span>{expandedSections.queenUnlocks ? '▼' : '▶'}</span>
                </button>
                {expandedSections.queenUnlocks && (
                  <div style={{ padding: '0 12px 12px' }}>
                    <div style={{ display: 'grid', gap: 4, fontSize: 11, marginBottom: 10 }}>
                      {/* Slime tiers are now building-unlocked, show which are available */}
                      {unlockedTiers.map(k => (
                        <div key={k} style={{ color: '#4ade80' }}>• {SLIME_TIERS[k].name} Slimes unlocked</div>
                      ))}
                      {Object.entries(ZONES).filter(([_, z]) => !z.unlock || queen.level >= z.unlock).map(([k, z]) => (
                        <div key={k} style={{ color: '#22d3ee' }}>• {z.name} accessible</div>
                      ))}
                    </div>

                    {/* Next Unlock Preview */}
                    {(() => {
                      // Find next zone unlock level
                      const unlockLevels = new Set();
                      Object.values(ZONES).forEach(z => {
                        if (z.unlock && z.unlock > queen.level) unlockLevels.add(z.unlock);
                      });

                      // Find the closest unlock level
                      const sortedLevels = [...unlockLevels].sort((a, b) => a - b);
                      if (sortedLevels.length === 0) return null;

                      const nextUnlockLevel = sortedLevels[0];
                      const nextUnlocks = [];

                      Object.entries(ZONES).forEach(([k, z]) => {
                        if (z.unlock === nextUnlockLevel) nextUnlocks.push({ type: 'zone', name: z.name, icon: z.icon });
                      });

                      if (nextUnlocks.length > 0) {
                        return (
                          <div style={{ background: 'rgba(236,72,153,0.2)', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.9 }}>🔮 Next Unlock (Level {nextUnlockLevel})</div>
                            <div style={{ display: 'grid', gap: 4, fontSize: 11 }}>
                              {nextUnlocks.map((u, i) => (
                                <div key={i} style={{ color: '#f472b6' }}>• {u.icon} {u.name}</div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible Mana & Abilities */}
            <div style={{ background: 'rgba(168,85,247,0.1)', borderRadius: 12, marginBottom: 20, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedSections(s => ({ ...s, mana: !s.mana }))}
                style={{
                  width: '100%',
                  padding: 15,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>🔮 Mana & Abilities</span>
                  <span style={{ background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 6, fontSize: 14, fontWeight: 'bold' }}>
                    {mana}
                  </span>
                  {Object.keys(activeHiveAbilities).filter(id => activeHiveAbilities[id] > Date.now()).length > 0 && (
                    <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(74,222,128,0.3)', borderRadius: 4, color: '#4ade80' }}>
                      {Object.keys(activeHiveAbilities).filter(id => activeHiveAbilities[id] > Date.now()).length} active
                    </span>
                  )}
                </div>
                <span>{expandedSections.mana ? '▼' : '▶'}</span>
              </button>

              {expandedSections.mana && (
                <div style={{ padding: '0 20px 20px' }}>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 15 }}>
                    +{slimes.length} mana/hour ({slimes.length} slimes × 1/hour)
                  </div>

                  {/* Active Abilities */}
              {Object.keys(activeHiveAbilities).length > 0 && (
                <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: 12, marginBottom: 15 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#4ade80' }}>✨ Active Abilities</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {Object.entries(activeHiveAbilities).filter(([_, exp]) => exp > Date.now()).map(([id, expiration]) => {
                      const ability = HIVE_ABILITIES[id];
                      const remaining = Math.max(0, expiration - Date.now());
                      const hours = Math.floor(remaining / 3600000);
                      const mins = Math.floor((remaining % 3600000) / 60000);
                      return (
                        <div key={id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: 8, borderRadius: 6 }}>
                          <span style={{ fontSize: 12 }}>{ability.icon} {ability.name}</span>
                          <span style={{ fontSize: 11, color: '#4ade80' }}>{hours}h {mins}m remaining</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ability List - Only show unlocked abilities */}
              <div style={{ display: 'grid', gap: 10 }}>
                {Object.entries(HIVE_ABILITIES).filter(([id]) => isPheromoneUnlocked(id, purchasedSkills)).map(([id, ability]) => {
                  const isActive = isHiveAbilityActive(id);
                  const canAfford = mana >= ability.cost;
                  return (
                    <div key={id} style={{
                      background: isActive ? 'rgba(74,222,128,0.2)' : 'rgba(0,0,0,0.2)',
                      borderRadius: 8,
                      padding: 12,
                      border: isActive ? '2px solid #4ade80' : '2px solid transparent'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div>
                          <span style={{ fontSize: 16, marginRight: 6 }}>{ability.icon}</span>
                          <span style={{ fontSize: 13, fontWeight: 'bold' }}>{ability.name}</span>
                          {isActive && <span style={{ fontSize: 10, marginLeft: 8, padding: '2px 6px', background: 'rgba(74,222,128,0.3)', borderRadius: 4, color: '#4ade80' }}>ACTIVE</span>}
                        </div>
                        <span style={{ fontSize: 12, color: canAfford ? '#a855f7' : '#ef4444' }}>🧪 {ability.cost}</span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{ability.desc}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>Duration: {Math.round(ability.duration / 3600000)}h</span>
                        <button
                          onClick={() => activateHiveAbility(id)}
                          disabled={!canAfford || isActive}
                          style={{
                            padding: '6px 12px',
                            background: isActive ? 'rgba(74,222,128,0.3)' : canAfford ? 'linear-gradient(135deg, #a855f7, #ec4899)' : 'rgba(100,100,100,0.5)',
                            border: 'none',
                            borderRadius: 6,
                            color: '#fff',
                            fontSize: 11,
                            fontWeight: 'bold',
                            cursor: !canAfford || isActive ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isActive ? 'Active' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {Object.entries(HIVE_ABILITIES).filter(([id]) => !isPheromoneUnlocked(id, purchasedSkills)).length > 0 && (
                  <div style={{ opacity: 0.5, fontSize: 11, textAlign: 'center', padding: 10 }}>
                    🔒 {Object.entries(HIVE_ABILITIES).filter(([id]) => !isPheromoneUnlocked(id, purchasedSkills)).length} more abilities locked - unlock via Skill Tree
                  </div>
                )}
                  </div>
                </div>
              )}
            </div>

            {/* Collapsible Buildings Section */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, marginBottom: 15, overflow: 'hidden' }}>
              <button
                onClick={() => setExpandedSections(s => ({ ...s, buildings: !s.buildings }))}
                style={{
                  width: '100%',
                  padding: 15,
                  background: 'rgba(245,158,11,0.1)',
                  border: 'none',
                  borderRadius: 0,
                  color: '#fff',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 14
                }}
              >
                <span>🏗️ Buildings</span>
                <span>{expandedSections.buildings ? '▼' : '▶'}</span>
              </button>
              {expandedSections.buildings && (
                <div style={{ padding: 15 }}>
                  {activeRes && (
                    <div style={{ background: 'rgba(34,211,238,0.1)', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>{BUILDINGS[activeRes.id].name}</span><span style={{ color: '#22d3ee', fontFamily: 'monospace' }}>⏱️ {getResTime()}</span></div>
                      <div style={{ height: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${activeRes.prog}%`, height: '100%', background: 'linear-gradient(90deg, #22d3ee, #4ade80)' }} /></div>
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{Math.floor(activeRes.prog)}%</div>
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: 10 }}>
                    {Object.entries(BUILDINGS).filter(([k]) => isBuildingUnlocked(k, purchasedSkills)).map(([k, b]) => {
                      // Handle different cost formats:
                      // - number: research item (biomass only, has time)
                      // - { biomass, mats }: building with biomass + materials
                      // - { mat: count, ... }: legacy material-only format
                      const isResearch = typeof b.cost === 'number';
                      const hasMats = !isResearch && b.cost.mats;
                      const discount = getBuildingDiscount();
                      const biomassCost = Math.floor((isResearch ? b.cost : (b.cost.biomass || 0)) * discount);
                      const matCosts = hasMats ? b.cost.mats : (!isResearch && !b.cost.biomass ? b.cost : {});

                      const done = research.includes(k);
                      const canAffordBio = bio >= biomassCost;
                      const canAffordMats = Object.entries(matCosts).every(([m, c]) => (mats[m] || 0) >= c);
                      const can = canAffordBio && canAffordMats;
                      const max = b.max && (builds[k] || 0) >= b.max;
                      const isBuilding = activeRes?.id === k;

                      return <div key={k} style={{ padding: 15, background: 'rgba(0,0,0,0.3)', borderRadius: 10, borderLeft: done ? '3px solid #4ade80' : isBuilding ? '3px solid #22d3ee' : '3px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 28 }}>{b.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{b.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{b.desc}</div>
                            {isResearch && b.time && (
                              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Build time: {Math.floor(b.time / 60)}:{(b.time % 60).toString().padStart(2, '0')}</div>
                            )}
                          </div>
                          {!isResearch && <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 18 }}>x{builds[k] || 0}</span>}
                        </div>

                        {isResearch ? (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, color: canAffordBio ? '#4ade80' : '#ef4444', display: 'inline-block', marginBottom: 8 }}>
                              Cost: {biomassCost}🧬
                            </div>
                            {!done && !activeRes && <button onClick={() => startRes(k)} disabled={!canAffordBio || max} style={{ padding: '8px 16px', background: canAffordBio && !max ? '#4ade80' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: canAffordBio && !max ? 'pointer' : 'not-allowed', display: 'block' }}>{max ? 'Built' : `Build (${biomassCost}🧬)`}</button>}
                            {done && <span style={{ color: '#4ade80' }}>✓ Built</span>}
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                              {biomassCost > 0 && <span style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, color: canAffordBio ? '#4ade80' : '#ef4444' }}>🧬 {biomassCost}</span>}
                              {Object.entries(matCosts).map(([m, c]) => <span key={m} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, color: (mats[m] || 0) >= c ? '#4ade80' : '#ef4444' }}>{m}: {c}</span>)}
                            </div>
                            <button onClick={() => build(k)} disabled={!can || max} style={{ padding: '8px 16px', background: can && !max ? '#4ade80' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: can && !max ? 'pointer' : 'not-allowed' }}>{max ? 'Max' : 'Build'}</button>
                          </div>
                        )}
                      </div>;
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Slime Management */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 15 }}>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 15 }}>🧬 Slime Management</div>
              {slimes.length ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  {slimes.map(s => {
                    const tier = SLIME_TIERS[s.tier];
                    const onExp = Object.entries(exps).find(([_, e]) => e.party.some(p => p.id === s.id));
                    const expS = onExp ? onExp[1].party.find(p => p.id === s.id) : null;
                    const stats = getSlimeStats(s);
                    const biomass = s.biomass || 0;
                    return (
                      <div key={s.id} onClick={() => setQueenSlimeModal(s.id)} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, border: `2px solid ${tier.color}33`, cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <SlimeSprite tier={s.tier} size={40} hp={expS?.hp} maxHp={expS?.maxHp || s.maxHp} mutations={s.mutations} status={expS?.status} primaryElement={s.primaryElement} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: 13 }}>{s.name}</div>
                            <div style={{ fontSize: 10, opacity: 0.7 }}>{tier.name}</div>
                            <div style={{ display: 'flex', gap: 6, fontSize: 9, marginTop: 3 }}>
                              {Object.entries(STAT_INFO).map(([k, v]) => <span key={k} style={{ color: v.color }}>{v.icon}{stats[k]}</span>)}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: 10 }}>
                            <div style={{ opacity: 0.6 }}>❤️ {expS ? Math.ceil(expS.hp) : s.maxHp}/{s.maxHp}</div>
                            <div style={{ opacity: 0.6 }}>🧬 {Math.floor(biomass)}</div>
                            {onExp && <div style={{ fontSize: 9, color: '#22d3ee', marginTop: 2 }}>📍 {ZONES[onExp[0]].name}</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, opacity: 0.5 }}>
                  <div style={{ fontSize: 40 }}>🥚</div>
                  <div style={{ fontSize: 12 }}>No slimes yet! Create one in the Slimes tab.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 1 && (
          selSl ? (
            <div>
              <button onClick={() => setSelSlime(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer', marginBottom: 15 }}>← Back</button>
              <SlimeDetail slime={selSl} expState={selExp?.party.find(p => p.id === selSlime)} />
              {!selExp && <button onClick={() => { reabsorb(selSl.id); setSelSlime(null); }} style={{ width: '100%', marginTop: 15, padding: 12, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>🔄 Reabsorb</button>}
            </div>
          ) : (
            <div>
              <SlimeForge unlockedMutations={unlockedMutations} biomass={bio} freeJelly={freeJelly} tiers={unlockedTiers} onSpawn={spawn} extraMutationSlots={combatBonuses.mutationSlots} />
              {slimes.length ? (
                <div style={{ display: 'grid', gap: 10 }}>
                {slimes.map(s => {
                  const tier = SLIME_TIERS[s.tier];
                  const onExp = Object.entries(exps).find(([_, e]) => e.party.some(p => p.id === s.id));
                  const expS = onExp ? onExp[1].party.find(p => p.id === s.id) : null;
                  const stats = getSlimeStats(s);
                  const biomass = s.biomass || 0;
                  return (
                    <div key={s.id} onClick={() => setSelSlime(s.id)} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, border: `2px solid ${tier.color}33`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <SlimeSprite tier={s.tier} size={45} hp={expS?.hp} maxHp={expS?.maxHp || s.maxHp} mutations={s.mutations} status={expS?.status} primaryElement={s.primaryElement} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>{tier.name}</div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 10, marginTop: 4 }}>
                            {Object.entries(STAT_INFO).map(([k, v]) => <span key={k} style={{ color: v.color }}>{v.icon}{stats[k]}</span>)}
                          </div>
                          {onExp && <div style={{ fontSize: 10, color: '#22d3ee', marginTop: 4 }}>📍 {ZONES[onExp[0]].name} • ❤️ {Math.ceil(expS?.hp || 0)}/{s.maxHp}</div>}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 10 }}>
                          <div style={{ opacity: 0.6 }}>❤️ {expS ? Math.ceil(expS.hp) : s.maxHp}/{s.maxHp}</div>
                          <div style={{ opacity: 0.6 }}>🧬 {Math.floor(biomass)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}><div style={{ fontSize: 48 }}>🥚</div><div>No slimes yet!</div></div>
              }
            </div>
          )
        )}

        {tab === 2 && (
          <div>
            {/* Expedition Summaries */}
            {expSummaries.length > 0 && (
              <div style={{ marginBottom: 15 }}>
                {expSummaries.map((summary, idx) => (
                  <div key={summary.id} style={{ background: summary.survivors.length > 0 ? 'rgba(74,222,128,0.1)' : 'rgba(239,68,68,0.1)', border: `2px solid ${summary.survivors.length > 0 ? '#4ade80' : '#ef4444'}`, borderRadius: 10, padding: 15, marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold', color: summary.survivors.length > 0 ? '#4ade80' : '#ef4444' }}>
                        {summary.survivors.length > 0 ? '✅ Expedition Complete' : '💀 Party Wiped'} - {summary.zone}
                      </div>
                      <button onClick={() => setExpSummaries(s => s.filter((_, i) => i !== idx))} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 4, color: '#fff', cursor: 'pointer', padding: '4px 8px', fontSize: 12 }}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 11, marginBottom: summary.survivors.length > 0 ? 8 : 0 }}>
                      <div><span style={{ opacity: 0.7 }}>Kills:</span> <strong style={{ color: '#f59e0b' }}>{summary.kills}</strong></div>
                      <div><span style={{ opacity: 0.7 }}>Survivors:</span> <strong>{summary.survivors.length}/{summary.totalParty}</strong></div>
                      <div><span style={{ opacity: 0.7 }}>Biomass:</span> <strong style={{ color: '#22d3ee' }}>{Math.floor(summary.biomassDistributed)}</strong></div>
                      {summary.survivors.length > 0 && Object.keys(summary.materials).length > 0 && (
                        <div><span style={{ opacity: 0.7 }}>Materials:</span> <strong style={{ color: '#4ade80' }}>{Object.values(summary.materials).reduce((a, b) => a + b, 0)}</strong></div>
                      )}
                    </div>
                    {summary.survivors.length > 0 && Object.keys(summary.materials).length > 0 && (
                      <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                        {Object.entries(summary.materials).map(([mat, count]) => `${mat} (${count})`).join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 15 }}>
              {Object.entries(ZONES).map(([k, z]) => {
                const ok = isZoneUnlocked(k, purchasedSkills);
                const has = exps[k];
                const zoneElement = z.element ? ELEMENTS[z.element] : null;
                return <button key={k} onClick={() => ok && setSelZone(k)} style={{ padding: 10, background: selZone === k ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${selZone === k ? '#22d3ee' : has ? '#4ade80' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.4, textAlign: 'center', position: 'relative' }}>
                  <div style={{ fontSize: 24 }}>{z.icon}</div>
                  <div style={{ fontSize: 11 }}>{z.name}</div>
                  {zoneElement && (
                    <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 12, opacity: 0.8 }} title={`${zoneElement.name} Zone`}>
                      {zoneElement.icon}
                    </div>
                  )}
                  {!ok && <div style={{ fontSize: 9, color: '#f59e0b' }}>🔒 Skills</div>}
                  {has && <div style={{ fontSize: 9, color: '#4ade80' }}>⚔️ {has.kills}</div>}
                </button>;
              })}
            </div>
            <BattleArena exp={exps[selZone]} slimes={slimes} zone={selZone} logs={bLogs[selZone]} />
            {exps[selZone] ? (
              <button onClick={() => stopExp(selZone)} style={{ width: '100%', marginTop: 15, padding: 12, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>🛑 Recall</button>
            ) : (
              <div style={{ marginTop: 15 }}>
                <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Expedition Duration</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 15 }}>
                  {[
                    { value: '10', label: '10 Enemies', icon: '⚡', unlock: null, skillUnlock: null },
                    { value: '100', label: '100 Enemies', icon: '⚔️', unlock: 'extendedExpedition', skillUnlock: null },
                    { value: 'infinite', label: 'Infinite', icon: '♾️', unlock: null, skillUnlock: 'infiniteExpedition' }
                  ].map(opt => {
                    const unlocked = (!opt.unlock || research.includes(opt.unlock)) && (!opt.skillUnlock || isFeatureUnlocked(opt.skillUnlock, purchasedSkills));
                    return (
                      <button
                        key={opt.value}
                        onClick={() => unlocked && setExpDuration(opt.value)}
                        disabled={!unlocked}
                        style={{
                          flex: 1,
                          padding: 10,
                          background: !unlocked ? 'rgba(100,100,100,0.3)' : expDuration === opt.value ? 'rgba(34,211,238,0.3)' : 'rgba(0,0,0,0.3)',
                          border: `2px solid ${expDuration === opt.value ? '#22d3ee' : 'transparent'}`,
                          borderRadius: 8,
                          color: '#fff',
                          cursor: unlocked ? 'pointer' : 'not-allowed',
                          fontSize: 10,
                          fontWeight: expDuration === opt.value ? 'bold' : 'normal',
                          opacity: unlocked ? 1 : 0.5
                        }}
                      >
                        <div style={{ fontSize: 16 }}>{unlocked ? opt.icon : '🔒'}</div>
                        <div>{opt.label}</div>
                      </button>
                    );
                  })}
                </div>
                <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Party (max 4)</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[0, 1, 2, 3].map(i => {
                    const sid = party[i];
                    const sl = slimes.find(s => s.id === sid);
                    return <div key={i} onClick={() => sid && setParty(p => p.filter(id => id !== sid))} style={{ width: 60, height: 70, background: 'rgba(0,0,0,0.3)', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: sl ? 'pointer' : 'default' }}>
                      {sl ? <><SlimeSprite tier={sl.tier} size={30} mutations={sl.mutations} primaryElement={sl.primaryElement} /><div style={{ fontSize: 9, marginTop: 2 }}>🧬{Math.floor(sl.biomass || 0)}</div></> : <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>}
                    </div>;
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15, maxHeight: 100, overflowY: 'auto' }}>
                  {avail.map(s => <div key={s.id} onClick={() => party.length < 4 && setParty(p => [...p, s.id])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 9 }}><SlimeSprite tier={s.tier} size={24} mutations={s.mutations} primaryElement={s.primaryElement} /><span style={{ marginTop: 2 }}>{s.name.split(' ')[0]}</span></div>)}
                  {!avail.length && slimes.length > 0 && <div style={{ opacity: 0.5, fontSize: 11 }}>All busy</div>}
                </div>
                <button onClick={() => startExp(selZone)} disabled={!party.length} style={{ width: '100%', padding: 12, background: party.length ? 'linear-gradient(135deg, #4ade80, #22d3ee)' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: party.length ? 'pointer' : 'not-allowed' }}>⚔️ Start</button>
              </div>
            )}
            {Object.keys(exps).length > 1 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>All Expeditions</div>
                {Object.entries(exps).map(([z, e]) => <div key={z} onClick={() => setSelZone(z)} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: z === selZone ? 'rgba(34,211,238,0.1)' : 'rgba(0,0,0,0.3)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}><span>{ZONES[z].icon} {ZONES[z].name}</span><span>💀{e.kills} 👥{e.party.filter(p => p.hp > 0).length}/{e.party.length}</span></div>)}
              </div>
            )}
          </div>
        )}

        {tab === 3 && (
          isFeatureUnlocked('ranch', purchasedSkills) ? (
            <Ranch
              queen={queen}
              bio={bio}
              mats={mats}
              prisms={prisms}
              slimes={slimes}
              exps={exps}
              ranchBuildings={ranchBuildings}
              ranchAssignments={ranchAssignments}
              ranchProgress={ranchProgress}
              ranchEvents={ranchEvents}
              canBuildRanch={canBuildRanch}
              buildRanch={buildRanch}
              canUpgradeRanch={canUpgradeRanch}
              upgradeRanch={upgradeRanch}
              getRanchCapacity={getRanchCapacity}
              canAssignToRanch={canAssignToRanch}
              assignToRanch={assignToRanch}
              removeFromRanch={removeFromRanch}
              getSlimeRanch={getSlimeRanch}
              isRanchUnlocked={isRanchUnlocked}
              getAssignedSlimeIds={getAssignedSlimeIds}
              getSlimeAccumulated={getSlimeAccumulated}
              getSlimeStartTime={getSlimeStartTime}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 15 }}>🏠</div>
              <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>Slime Ranch</div>
              <div style={{ opacity: 0.7, marginBottom: 15 }}>🔒 Unlock via Skill Tree (Hive Growth → Cultivation Pools)</div>
            </div>
          )
        )}

        {tab === 4 && (
          <div>
            {/* Tower Defense */}
            {!towerDefense ? (
              <div>
                <div style={{ background: 'rgba(236,72,153,0.1)', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>🎯 Tower Defense Challenge</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>Defend against waves of human invaders!</div>
                  {tdAvailable() ? (
                    <div style={{ color: '#4ade80', fontSize: 12 }}>✅ Available Now!</div>
                  ) : (
                    <div style={{ color: '#f59e0b', fontSize: 12 }}>⏱️ Next attempt: {formatTime(Math.ceil((TOWER_DEFENSE_COOLDOWN - (Date.now() - lastTowerDefense)) / 1000))}</div>
                  )}
                </div>

                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📋 Rules</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    <p>• Deploy slimes to defend against 3 waves</p>
                    <p>• Slimes attack based on Firmness (damage) & Slipperiness (speed)</p>
                    <p>• Victory: Unique materials & biomass</p>
                    <p>• Defeat: Lose half your current biomass</p>
                    <p>• Available slots: {tdSlots} (Build Defense Slots for more)</p>
                  </div>
                </div>

                {tdAvailable() && (
                  <div>
                    <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Deploy Slimes (max {tdSlots})</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                      {Array.from({ length: tdSlots }).map((_, i) => {
                        const sid = party[i];
                        const sl = slimes.find(s => s.id === sid);
                        return <div key={i} onClick={() => sid && setParty(p => p.filter(id => id !== sid))} style={{ width: 60, height: 70, background: 'rgba(0,0,0,0.3)', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: sl ? 'pointer' : 'default' }}>
                          {sl ? <><SlimeSprite tier={sl.tier} size={30} mutations={sl.mutations} primaryElement={sl.primaryElement} /><div style={{ fontSize: 9, marginTop: 2 }}>🧬{Math.floor(sl.biomass || 0)}</div></> : <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>}
                        </div>;
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15, maxHeight: 150, overflowY: 'auto' }}>
                      {avail.map(s => <div key={s.id} onClick={() => party.length < tdSlots && setParty(p => [...p, s.id])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 9 }}><SlimeSprite tier={s.tier} size={24} mutations={s.mutations} primaryElement={s.primaryElement} /><span style={{ marginTop: 2 }}>{s.name.split(' ')[0]}</span></div>)}
                      {!avail.length && slimes.length > 0 && <div style={{ opacity: 0.5, fontSize: 11 }}>All busy</div>}
                    </div>
                    <button onClick={() => { startTowerDefense(party); setParty([]); }} disabled={!party.length} style={{ width: '100%', padding: 12, background: party.length ? 'linear-gradient(135deg, #ec4899, #a855f7)' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: party.length ? 'pointer' : 'not-allowed' }}>🎯 Start Defense</button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Battle UI */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                  <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Wave {towerDefense.currentWave + 1} / 3</div>
                  <div style={{ fontSize: 12, color: '#22d3ee' }}>Enemies: {towerDefense.humans.length}</div>
                </div>

                {/* Battle Lane */}
                <div style={{ background: 'linear-gradient(90deg, #4ade80 0%, #1a1a2e 20%, #1a1a2e 100%)', height: 100, borderRadius: 10, position: 'relative', marginBottom: 15, overflow: 'hidden' }}>
                  {/* Endzone indicator */}
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: 'rgba(74,222,128,0.3)' }} />

                  {/* Humans - sorted by position so closest to end renders on top */}
                  {[...towerDefense.humans].sort((a, b) => a.position - b.position).map((h, idx) => {
                    const hpPercent = Math.max(0, Math.min(100, (h.hp / h.maxHp) * 100));
                    const isBoss = h.isBoss;
                    return (
                      <div key={h.id} style={{ position: 'absolute', right: `${Math.max(0, h.position)}%`, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'right 0.1s linear', zIndex: idx + 1 }}>
                        <div style={{ fontSize: isBoss ? 36 : 28, filter: isBoss ? 'drop-shadow(0 0 8px #f59e0b)' : 'none' }}>{isBoss ? '🛡️' : '⚔️'}</div>
                        {isBoss && <div style={{ fontSize: 8, color: '#f59e0b', fontWeight: 'bold', marginBottom: 2 }}>CHAMPION</div>}
                        {/* Health bar */}
                        <div style={{ width: isBoss ? 50 : 40, height: 6, background: 'rgba(0,0,0,0.7)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${hpPercent}%`, height: '100%', background: isBoss ? 'linear-gradient(90deg, #f59e0b, #fbbf24)' : (hpPercent > 50 ? '#4ade80' : hpPercent > 25 ? '#f59e0b' : '#ef4444'), transition: 'width 0.15s ease' }} />
                        </div>
                        <div style={{ fontSize: 9, color: isBoss ? '#f59e0b' : '#fff', marginTop: 2 }}>{Math.ceil(h.hp)}/{Math.ceil(h.maxHp)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Deployed Slimes */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>Defenders</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {towerDefense.deployedSlimes.map(ds => {
                      const sl = slimes.find(s => s.id === ds.id);
                      if (!sl) return null;
                      const stats = getSlimeStats(sl);
                      const biomass = sl.biomass || 0;
                      return <div key={ds.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(74,222,128,0.1)', borderRadius: 6, fontSize: 9 }}>
                        <SlimeSprite tier={sl.tier} size={32} mutations={sl.mutations} primaryElement={sl.primaryElement} />
                        <span style={{ marginTop: 2 }}>{sl.name.split(' ')[0]}</span>
                        <span style={{ fontSize: 8, opacity: 0.7 }}>DPS: {Math.floor((stats.firmness + biomass * 0.01) * (1 + stats.slipperiness * 0.1))}</span>
                      </div>;
                    })}
                  </div>
                </div>

                {/* Battle Log */}
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 10, maxHeight: 150, overflowY: 'auto' }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8 }}>📜 Battle Log</div>
                  {towerDefense.battleLog.slice(-10).reverse().map((log, i) => (
                    <div key={i} style={{ fontSize: 11, opacity: i === 0 ? 1 : 0.6, padding: '2px 0' }}>{log}</div>
                  ))}
                </div>

                {(towerDefense.phase === 'victory' || towerDefense.phase === 'defeat') && towerDefense.summary && (
                  <div style={{ marginTop: 15, padding: 20, background: towerDefense.phase === 'victory' ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)', borderRadius: 10 }}>
                    <div style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' }}>
                      {towerDefense.phase === 'victory' ? '🎉 Victory!' : '💀 Defeat!'}
                    </div>

                    {/* Battle Statistics */}
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>📊 Battle Statistics</div>
                      <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Total Damage Dealt:</span>
                          <strong style={{ color: '#f59e0b' }}>{Math.floor(towerDefense.summary.totalDamage)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Humans Defeated:</span>
                          <strong style={{ color: '#ef4444' }}>{towerDefense.summary.humansDefeated}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Waves Completed:</span>
                          <strong style={{ color: '#22d3ee' }}>{towerDefense.phase === 'victory' ? '3/3' : `${towerDefense.currentWave}/3`}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Rewards/Losses */}
                    {towerDefense.summary.victory ? (
                      <div style={{ background: 'rgba(74,222,128,0.2)', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#4ade80' }}>🎁 Rewards Gained</div>
                        <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Biomass:</span>
                            <strong style={{ color: '#4ade80' }}>+{towerDefense.summary.rewards.biomass}</strong>
                          </div>
                          {Object.entries(towerDefense.summary.rewards.materials).map(([mat, count]) => (
                            <div key={mat} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{mat}:</span>
                              <strong style={{ color: '#4ade80' }}>+{count}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: 'rgba(239,68,68,0.2)', padding: 15, borderRadius: 8, marginBottom: 15 }}>
                        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#ef4444' }}>💔 Resources Lost</div>
                        <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Biomass Lost:</span>
                            <strong style={{ color: '#ef4444' }}>-{towerDefense.summary.losses.biomass}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    <button onClick={closeTowerDefense} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #ec4899, #a855f7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>Continue</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 5 && (
          <SkillTree
            queenLevel={queen.level}
            purchasedSkills={purchasedSkills}
            onPurchaseSkill={purchaseSkill}
            availablePoints={availableSkillPoints}
          />
        )}

        {tab === 6 && (
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, opacity: 0.7 }}>Materials</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
              {Object.entries(mats).map(([n, c]) => <div key={n} style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: 12 }}>{n} <strong style={{ float: 'right' }}>x{c}</strong></div>)}
              {!Object.keys(mats).length && <div style={{ opacity: 0.5, fontStyle: 'italic', gridColumn: '1/-1' }}>No materials</div>}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, opacity: 0.7 }}>Unlocked Mutations ({unlockedMutations.length}/{Object.keys(MUTATION_LIBRARY).length})</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {unlockedMutations.map((id) => {
                const m = MUTATION_LIBRARY[id];
                if (!m) return null;
                return <div key={id} style={{ padding: 12, background: `${m.color}22`, borderRadius: 8, border: `1px solid ${m.color}44` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 20 }}>{m.icon}</span><span style={{ fontSize: 14, fontWeight: 'bold' }}>{m.name}</span></div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>+{m.bonus} {STAT_INFO[m.stat]?.name}</div>
                  <div style={{ fontSize: 11, color: m.color }}>{m.passiveDesc}</div>
                  {m.elementBonus && (
                    <div style={{ fontSize: 10, marginTop: 4 }}>
                      {Object.entries(m.elementBonus).map(([elem, bonus]) => (
                        <span key={elem} style={{ color: ELEMENTS[elem]?.color, marginRight: 8 }}>
                          {ELEMENTS[elem]?.icon}+{bonus}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>;
              })}
              {!unlockedMutations.length && <div style={{ opacity: 0.5, fontStyle: 'italic' }}>No mutations unlocked. Defeat 100 of any monster type!</div>}
            </div>
          </div>
        )}

        {tab === 7 && <Compendium queen={queen} monsterKills={monsterKills} unlockedMutations={unlockedMutations} />}

        {tab === 8 && <SettingsTab onSave={manualSave} onDelete={handleDelete} lastSave={lastSave} prisms={prisms} slimes={slimes} purchasePrismItem={purchasePrismItem} />}
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', maxHeight: 70, overflowY: 'auto', padding: 8 }}>
        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>📜 Log</div>
        {logs.slice(-4).reverse().map((l, i) => <div key={i} style={{ fontSize: 10, padding: '2px 0', opacity: i === 0 ? 1 : 0.6 }}><span style={{ opacity: 0.4, marginRight: 6 }}>{l.t}</span>{l.m}</div>)}
      </div>

      {dev && (
        <div style={{ position: 'fixed', top: 60, right: 10, width: 220, background: 'rgba(0,0,0,0.95)', borderRadius: 10, padding: 15, zIndex: 200, border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><span style={{ fontWeight: 'bold' }}>🛠️ Dev</span><button onClick={() => setDev(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button></div>
          <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12 }}>Speed: {speed}x</label><input type="range" min="1" max="50" value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: '100%' }} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setBio(b => b + 100)} style={{ padding: 8, background: '#4ade80', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+100🧬</button>
            <button onClick={() => setMats(m => ({ ...m, 'Wolf Fang': (m['Wolf Fang'] || 0) + 10, 'Wolf Pelt': (m['Wolf Pelt'] || 0) + 10, 'Spider Silk': (m['Spider Silk'] || 0) + 10, 'Mana Crystal': (m['Mana Crystal'] || 0) + 5, 'Snail Shell': (m['Snail Shell'] || 0) + 5, 'Wyrm Scale': (m['Wyrm Scale'] || 0) + 3, 'Storm Core': (m['Storm Core'] || 0) + 3, 'Void Essence': (m['Void Essence'] || 0) + 3, 'Human Bone': (m['Human Bone'] || 0) + 10, 'Iron Sword': (m['Iron Sword'] || 0) + 10, 'Champion Badge': (m['Champion Badge'] || 0) + 2 }))} style={{ padding: 8, background: '#f59e0b', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+Mats</button>
            <button onClick={() => setUnlockedMutations(['sharp', 'digest', 'stoneskin', 'vinewebs', 'resurrect', 'spiny', 'whirlpool', 'ethereal', 'lifesteal', 'pyrolyze', 'draconicPower', 'voidTouched'])} style={{ padding: 8, background: '#a855f7', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Unlock Mutations</button>
            <button onClick={() => setMonsterKills(k => ({ ...k, youngWolf: (k.youngWolf || 0) + 50, venusSlimetrap: (k.venusSlimetrap || 0) + 50, serratedCarp: (k.serratedCarp || 0) + 50, crystalBat: (k.crystalBat || 0) + 50, emberWyrm: (k.emberWyrm || 0) + 50, voidHollow: (k.voidHollow || 0) + 50 }))} style={{ padding: 8, background: '#22c55e', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+50 Kills</button>
            <button onClick={() => setQueen(q => ({ ...q, level: q.level + 5 }))} style={{ padding: 8, background: '#ec4899', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+5 Queen Lv</button>
            <button onClick={() => { setLastTowerDefense(0); setTowerDefense(null); log('🎯 Tower Defense reset!'); }} style={{ padding: 8, background: '#22d3ee', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Reset TD Timer</button>
            <button onClick={() => setPrisms(p => p + 100)} style={{ padding: 8, background: '#8b5cf6', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+100 Prisms</button>
            <button onClick={() => setMana(p => p + 100)} style={{ padding: 8, background: '#10b981', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+100 Mana</button>
          </div>
        </div>
      )}
    </div>
  );
}
