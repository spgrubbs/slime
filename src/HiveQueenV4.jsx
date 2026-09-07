import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// Data imports
import {
  TICK_RATE,
  BASE_SLIME_COST,
  TRAIT_JELLY_COST,
  BASE_JELLY,
  JELLY_PER_QUEEN_LEVEL,
  AUTO_SAVE_INTERVAL,
  CARAVAN_COOLDOWN,
  ELEMENTS,
  ARENA_TICK_RATE,
  ROUND_MS,
} from './data/gameConstants.js';

import { STAT_INFO, SLIME_TIERS } from './data/slimeData.js';
import { MUTATION_LIBRARY, TRAIT_LIBRARY, STATUS_EFFECTS, SLIME_TRAITS, getMutationDesc } from './data/traitData.js';
import { MONSTER_TYPES, MONSTER_ABILITIES } from './data/monsterData.js';
import { ZONES, EXPLORATION_EVENTS, INTERMISSION_EVENTS, INTERMISSION_DURATION } from './data/zoneData.js';
import { BUILDINGS, RESEARCH } from './data/buildingData.js';
import { caravanDay, MAX_CARAVAN_TIER } from './data/caravanData.js';
import { RANCH_TYPES, RANCH_EVENTS, RANCH_UPGRADE_BONUSES, MAX_RANCH_LEVEL, RANCH_MAX_ACCUMULATION_TIME } from './data/ranchData.js';
import { HIVE_ABILITIES, PRISM_SHOP, MANA_UPDATE_INTERVAL, MANA_PER_SLIME_PER_HOUR } from './data/hiveData.js';
import { SKILL_TREES, SKILL_POINTS_PER_LEVEL, getSkillEffects, isZoneUnlocked, isBuildingUnlocked, isPheromoneUnlocked, isFeatureUnlocked } from './data/skillTreeData.js';

// Utility imports
import { genName, genId, formatTime, calculateElementalDamage, createDefaultElements, canGainElement, calculateElementGain } from './utils/helpers.js';
import { saveGame, loadGame, deleteSave } from './utils/saveSystem.js';

// Importing the combat module registers every mutation/trait effect and
// validates the registry — a passive with no implementation fails here.
import './combat/index.js';
import { computeStats, computeMaxHp, mutationSlots, slotsFromSelection, buildEffectList } from './combat/stats.js';
import { makeExpedition, tickExpedition, hydrateExpedition } from './combat/expedition.js';
import { makeAmbush, tickAmbush, retreatAmbush, hydrateAmbush, dehydrateAmbush } from './combat/caravan.js';
import { nextTutorial, TUTORIALS, TUTORIAL_ORDER } from './data/tutorialData.js';
import { MUTAGEN_PITY_KILLS } from './data/monsterData.js';
import { mutagenName } from './data/traitData.js';

/**
 * Rebuild the live references a saved expedition dropped. Combatants are
 * serialized without their slime/monster `ref` or their effect list — see
 * dehydrateExpedition — so both are restored against the current roster.
 */
const rehydrateExps = (exps, slimes = []) => {
  const out = {};
  Object.entries(exps || {}).forEach(([zone, exp]) => {
    out[zone] = hydrateExpedition(exp, slimes || []);
  });
  return out;
};

// Component imports
import {
  SlimeSprite,
  MonsterSprite,
  CombatView,
  Caravan,
  TutorialModal,
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
const calculateOfflineProgress = (saved, bonuses, offlineCtx = {}) => {
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

  let { bio, slimes, exps, mats, activeRes, research, builds } = JSON.parse(JSON.stringify(saved));

  // Offline expeditions run the real resolver rather than a simplified copy of
  // it — mutations, traits and status effects all apply exactly as they do
  // while you are watching. Progress is capped so a long absence cannot lock
  // the tab up on load.
  const MAX_OFFLINE_ROUNDS = 1500;

  Object.entries(exps || {}).forEach(([zone, savedExp]) => {
    if (!ZONES[zone]) return;

    // Pre-rewrite expeditions have no combatants to advance; recall them.
    if (!Array.isArray(savedExp.slimes) || savedExp.version !== 4) {
      results.expeditionsWiped.push(zone);
      delete exps[zone];
      return;
    }

    const exp = hydrateExpedition(savedExp, slimes);
    const budgetMs = Math.min(offlineSec * 1000, MAX_OFFLINE_ROUNDS * ROUND_MS);
    const step = ROUND_MS;

    for (let elapsed = 0; elapsed < budgetMs; elapsed += step) {
      if (exp.phase === 'defeat') break;

      const before = exp.kills;
      const { sideEffects } = tickExpedition(exp, step, offlineCtx, zone);

      if (exp.kills > before && exp.monsterKillCounts) {
        const justKilled = Object.entries(exp.monsterKillCounts);
        results.monstersKilled += exp.kills - before;
        justKilled.forEach(([type, n]) => { results.monsterKillsGained[type] = n; });
      }

      sideEffects.forEach(se => {
        if (se.type === 'slimeDown') {
          const hurt = slimes.find(sl => sl.id === se.id);
          results.slimesLost.push(hurt?.name || 'Slime');
          slimes = slimes.map(sl => (
            sl.id === se.id ? { ...sl, wounded: true, woundedAt: Date.now(), biomass: 0 } : sl
          ));
        } else if (se.type === 'bioReclaim') {
          bio += se.amount;
          results.biomassGained += se.amount;
        } else if (se.type === 'grantTrait') {
          slimes = slimes.map(sl => sl.id === se.id && !(sl.traits || []).includes(se.trait)
            ? { ...sl, traits: [...(sl.traits || []), se.trait] }
            : sl);
        }
      });

      if (exp.phase === 'defeat') break;
      if (exp.kills >= exp.targetKills) break;
    }

    if (exp.phase === 'defeat' || exp.slimes.every(c => c.dead)) {
      results.expeditionsWiped.push(zone);
      delete exps[zone];
      return;
    }

    // Bank what the party earned so the welcome-back summary can report it.
    exp.slimes.filter(c => !c.dead).forEach(c => {
      const sl = slimes.find(x => x.id === c.id);
      if (!sl) return;
      results.biomassGained += c.biomassGained;
      sl.biomass = (sl.biomass || 0) + c.biomassGained;
      c.biomassGained = 0;

      if (!sl.primaryElement && c.elementGains) {
        sl.elements = sl.elements || { fire: 0, water: 0, nature: 0, earth: 0 };
        Object.entries(c.elementGains).forEach(([el, gain]) => {
          sl.elements[el] = Math.min(100, (sl.elements[el] || 0) + gain);
          if (sl.elements[el] >= 100) sl.primaryElement = el;
        });
        c.elementGains = {};
      }
    });

    Object.entries(exp.materials || {}).forEach(([mat, n]) => {
      results.matsGained[mat] = (results.matsGained[mat] || 0) + n;
      mats[mat] = (mats[mat] || 0) + n;
    });
    exp.materials = {};

    // Banked here, so clear them — otherwise recalling the party would count
    // the same kills a second time toward mutation unlocks.
    exp.monsterKillCounts = {};

    exps[zone] = exp;
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
  const [lastCaravan, setLastCaravan] = useState(0);
  const [caravanTier, setCaravanTier] = useState(1);
  const [ambush, setAmbush] = useState(null);
  const [monsterKills, setMonsterKills] = useState({});
  const [mutagens, setMutagens] = useState({});   // { [mutationId]: count }
  const [pityKills, setPityKills] = useState({});  // kills since the last pity mutagen
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

  const [tab, setTab] = useState('hive');
  // The Brood screen holds both the roster and the pools the slimes rest in.
  const [broodView, setBroodView] = useState('roster');
  const [menu, setMenu] = useState(false);
  const [dev, setDev] = useState(false);
  const [seenTutorials, setSeenTutorials] = useState([]);
  const [tutorialsOn, setTutorialsOn] = useState(true);
  const [selZone, setSelZone] = useState('forest');
  const [party, setParty] = useState([]);
  const [selSlime, setSelSlime] = useState(null);
  const touchX = useRef(null);
  const lastArenaTickRef = useRef(Date.now());
  const lastAmbushTickRef = useRef(Date.now());

  // Calculate skill effects from purchased skills (must be first, before other calculations)
  const skillEffects = useMemo(() => getSkillEffects(purchasedSkills), [purchasedSkills]);
  const skillBonuses = skillEffects.bonuses;

  // Named for the hive rather than the menu, and one screen shorter: materials
  // now sit with the buildings that eat them, mutagens with the slimes they go
  // into, so there is no inventory screen to bounce off.
  // Six screens, grouped by what they are *about* rather than by system:
  // the Queen and her hive, the slimes themselves, where slimes are sent,
  // the one timed event, the record, and the knobs.
  const tabs = [
    { id: 'hive', icon: '👑', label: 'The Hive' },
    { id: 'brood', icon: '🟢', label: 'The Brood', badge: slimes.length },
    { id: 'wilds', icon: '🗺️', label: 'The Wilds' },
    { id: 'road', icon: '🎯', label: 'The Road' },
    { id: 'memory', icon: '📖', label: 'Memory' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  // Filter tabs based on skill unlocks
  const visibleTabs = tabs.filter(t => !t.skillUnlock || isFeatureUnlocked(t.skillUnlock, purchasedSkills));

  const woundedCount = slimes.filter(s => s.wounded).length;

  const maxJelly = BASE_JELLY + (queen.level - 1) * JELLY_PER_QUEEN_LEVEL + (builds.slimePit || 0) * 10 + (skillBonuses.maxJelly || 0);
  const usedJelly = slimes.reduce((s, sl) => s + (sl.magCost || 0), 0);
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
    travel: research.includes('extendedExpedition') ? 0.6 : 1,   // Expedition Depot
    mats: 1 + (research.includes('infiniteExpedition') ? 0.25 : 0), // Deep Exploration Hub
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
    squadSlots: skillBonuses.defenseSlots || 0, // Extra caravan ambush slots
    mutationSlots: skillBonuses.mutationSlots || 0, // Extra mutation slots for slimes
  };

  // Check if passive skill is purchased
  const hasPassive = (passiveId) => skillEffects.passives.includes(passiveId);

  // Calculate ranch bonuses from active ranch buildings
  const getRanchBonuses = useCallback(() => {
    const bonuses = {
      ambushDamage: 0,       // % bonus to caravan ambush damage from warDen
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
          bonuses.ambushDamage += stats.firmness * ranch.effectValue * effectMult;
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
              ? { ...s, mutations: [] }
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
        {
          const all = Object.keys(MUTATION_LIBRARY);
          const rolled = all[Math.floor(Math.random() * all.length)];
          grantMutagen(rolled);
          log(`🧬 A ${MUTATION_LIBRARY[rolled].name} mutagen condenses out of the prism.`);
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
      const offline = calculateOfflineProgress(saved, bon, combatContext());
      if (offline.hadProgress) {
        // Apply offline progress
        setBio(offline.newState.bio);
        setSlimes(offline.newState.slimes);
        setExps(rehydrateExps(offline.newState.exps, offline.newState.slimes));
        setMats(offline.newState.mats);
        setActiveRes(offline.newState.activeRes);
        setResearch(offline.newState.research);
        setQueen(saved.queen);
        setBuilds(saved.builds || {});
        setLastCaravan(saved.lastCaravan || 0);
        setCaravanTier(saved.caravanTier || 1);
        setAmbush(saved.ambush ? hydrateAmbush(saved.ambush, saved.slimes || [], buildEffectList) : null);
        setSeenTutorials(saved.seenTutorials || []);
        setTutorialsOn(saved.tutorialsOn !== false);

        // Apply monster kills gained from offline progress
        const newMonsterKills = { ...(saved.monsterKills || {}) };
        Object.entries(offline.results.monsterKillsGained || {}).forEach(([type, count]) => {
          newMonsterKills[type] = (newMonsterKills[type] || 0) + count;
        });
        setMonsterKills(newMonsterKills);
        setMutagens(saved.mutagens || {});
        setPityKills(saved.pityKills || {});

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
        setExps(rehydrateExps(saved.exps, saved.slimes));
        setBuilds(saved.builds || {});
        setResearch(saved.research || []);
        setActiveRes(saved.activeRes);
        setLastCaravan(saved.lastCaravan || 0);
        setCaravanTier(saved.caravanTier || 1);
        setAmbush(saved.ambush ? hydrateAmbush(saved.ambush, saved.slimes || [], buildEffectList) : null);
        setSeenTutorials(saved.seenTutorials || []);
        setTutorialsOn(saved.tutorialsOn !== false);
        setMonsterKills(saved.monsterKills || {});
        setMutagens(saved.mutagens || {});
        setPityKills(saved.pityKills || {});
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
      const state = { queen, bio, mats, slimes, exps, builds, research, activeRes, lastCaravan, caravanTier, ambush, seenTutorials, tutorialsOn, monsterKills, mutagens, pityKills, purchasedSkills, prisms, ranchBuildings, ranchAssignments, ranchProgress, mana, lastManaUpdate, activeHiveAbilities, lastSave: Date.now() };
      if (saveGame(state)) {
        setLastSave(Date.now());
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [gameLoaded, queen, bio, mats, slimes, exps, builds, research, activeRes, lastCaravan, caravanTier, ambush, seenTutorials, tutorialsOn, monsterKills, mutagens, pityKills, purchasedSkills, prisms, ranchBuildings, ranchAssignments, ranchProgress, mana, lastManaUpdate, activeHiveAbilities]);

  const manualSave = () => {
    const state = { queen, bio, mats, slimes, exps, builds, research, activeRes, lastCaravan, caravanTier, ambush, seenTutorials, tutorialsOn, monsterKills, mutagens, pityKills, purchasedSkills, prisms, ranchBuildings, ranchAssignments, ranchProgress, mana, lastManaUpdate, activeHiveAbilities, lastSave: Date.now() };
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
    setLastCaravan(0);
    setCaravanTier(1);
    setAmbush(null);
    setSeenTutorials([]);
    setTutorialsOn(true);
    setMutagens({});
    setPityKills({});
    setMonsterKills({});
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
  // bLog: z=zone, m=message, c=color, v=verbose details (optional)
  const bLog = useCallback((z, m, c, v) => setBLogs(p => ({ ...p, [z]: [...(p[z] || []).slice(-30), { m, c, v }] })), []);

  const onTouch = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      const i = visibleTabs.findIndex(t => t.id === tab);
      const next = i + (diff > 0 ? 1 : -1);
      if (i >= 0 && next >= 0 && next < visibleTabs.length) setTab(visibleTabs[next].id);
    }
    touchX.current = null;
  };

  const spawn = (tier, name, magCost) => {
    const td = SLIME_TIERS[tier];
    const bioCost = BASE_SLIME_COST;
    if (bio < bioCost || freeJelly < magCost) return;

    // Slimes are born blank. Everything they become is applied afterwards.
    const spawnBoostMult = isHiveAbilityActive('spawnBoost') ? 1.10 : 1.0;
    const baseStat = Math.floor(5 * td.statMultiplier * spawnBoostMult);
    const baseStats = { firmness: baseStat, slipperiness: baseStat, viscosity: baseStat };

    let spawnTraits = [];
    const traitRoll = Math.random();
    if (traitRoll < 0.05) {
      const uncommon = Object.entries(SLIME_TRAITS)
        .filter(([, t]) => t.rarity === 'uncommon' && !t.source).map(([id]) => id);
      if (uncommon.length) spawnTraits = [uncommon[Math.floor(Math.random() * uncommon.length)]];
    } else if (traitRoll < 0.25) {
      const common = Object.entries(SLIME_TRAITS)
        .filter(([, t]) => t.rarity === 'common' && !t.source).map(([id]) => id);
      if (common.length) spawnTraits = [common[Math.floor(Math.random() * common.length)]];
    }

    const slimeName = spawnTraits.length > 0 ? genName(spawnTraits) : name;
    const provisional = { tier, mutations: [], traits: spawnTraits, baseStats, biomass: 0 };
    const maxHp = computeMaxHp(
      provisional,
      computeStats(provisional, 0, combatBonuses, combatBonuses.mutationPower),
      bon, combatBonuses, combatBonuses.mutationPower,
    );

    setSlimes(p => [...p, {
      id: genId(),
      name: slimeName,
      tier,
      biomass: 0,
      mutations: [],
      traits: spawnTraits,
      baseStats,
      maxHp,
      magCost,
      elements: createDefaultElements(),
      primaryElement: null,
    }]);
    setBio(p => p - bioCost);
    if (spawnTraits.length > 0) {
      const trait = SLIME_TRAITS[spawnTraits[0]];
      log(`${slimeName} emerges with ${trait.icon} ${trait.name} trait!`);
    } else {
      log(`${slimeName} emerges!`);
    }
  };

  /**
   * A slime that goes down is wounded, not killed. It forfeits every point of
   * held biomass — the temporary half of its power — and cannot be deployed
   * again until it has recovered in a Convalescence Pool. It keeps its jelly
   * slot the whole time, so a bad run clogs the hive's capacity.
   */
  const woundSlime = useCallback((id) => {
    setSlimes(list => list.map(sl => (
      sl.id === id ? { ...sl, wounded: true, woundedAt: Date.now(), biomass: 0 } : sl
    )));
  }, []);

  /**
   * Take the biomass a slime is carrying without harming it. This is how held
   * biomass becomes spendable: the slime drops back to its intrinsic power and
   * carries on.
   */
  const grantMutagen = useCallback((mutationId, n = 1) => {
    setMutagens(prev => ({ ...prev, [mutationId]: (prev[mutationId] || 0) + n }));
  }, []);

  /**
   * Apply a mutagen to a slime. Permanent and irreversible: the item is spent,
   * the mutation becomes intrinsic, and only the Rendering Vat ever gets it back.
   */
  const applyMutagen = (slimeId, mutationId) => {
    const slime = slimes.find(s => s.id === slimeId);
    const mut = MUTATION_LIBRARY[mutationId];
    if (!slime || !mut || (mutagens[mutationId] || 0) <= 0) return;
    if ((slime.mutations || []).includes(mutationId)) return;
    if ((slime.mutations || []).length >= mutationSlots(slime, combatBonuses.mutationSlots)) return;
    if (Object.values(exps).some(e => (e.slimes || []).some(x => x.id === slimeId))) {
      log('Recall them before you start cutting.');
      return;
    }

    setMutagens(prev => {
      const n = { ...prev, [mutationId]: (prev[mutationId] || 0) - 1 };
      if (n[mutationId] <= 0) delete n[mutationId];
      return n;
    });
    setSlimes(list => list.map(sl => {
      if (sl.id !== slimeId) return sl;
      const next = {
        ...sl,
        mutations: [...(sl.mutations || []), mutationId],
        baseStats: { ...sl.baseStats, [mut.stat]: sl.baseStats[mut.stat] + mut.bonus },
      };
      if (mut.elementBonus && !next.primaryElement) {
        const elements = { ...(next.elements || createDefaultElements()) };
        Object.entries(mut.elementBonus).forEach(([el, bonus]) => {
          elements[el] = Math.min(100, (elements[el] || 0) + bonus);
        });
        next.elements = elements;
      }
      next.maxHp = getMaxHp(next);
      return next;
    }));
    log(`🧬 ${mut.icon} ${mut.name} takes hold in ${slime.name}.`);
  };

  /** How much of a dissolved slime's genework the Rendering Vat gives back. */
  const mutagenRecovery = () => [0, 0.5, 1][builds.renderingVat || 0] ?? 1;

  const withdrawBiomass = (id) => {
    const sl = slimes.find(s => s.id === id);
    if (!sl) return;
    const held = Math.floor(sl.biomass || 0);
    if (held <= 0) return;
    if (Object.values(exps).some(e => (e.slimes || []).some(x => x.id === id))) {
      log('Recall them first — you cannot withdraw from a slime in the field.');
      return;
    }
    setBio(p => p + held);
    setSlimes(list => list.map(x => (x.id === id ? { ...x, biomass: 0 } : x)));
    log(`Drew ${held}🧬 from ${sl.name}.`);
  };

  /** Dissolve a slime for good: its held biomass plus its body, and the jelly back. */
  const reabsorb = (id) => {
    const sl = slimes.find(s => s.id === id);
    if (!sl || Object.values(exps).some(e => (e.slimes || []).some(s => s.id === id))) { log('Cannot reabsorb!'); return; }
    const held = Math.floor(sl.biomass || 0);
    const body = (SLIME_TIERS[sl.tier]?.jellyCost || 5) * 10;
    setBio(p => p + held + body);

    // Dissolving a developed slime destroys its genework until the Rendering
    // Vat is built — the point at which the roster becomes raw material.
    const carried = sl.mutations || [];
    const recovery = mutagenRecovery();
    if (carried.length) {
      const recovered = carried.filter(() => Math.random() < recovery);
      if (recovered.length) {
        setMutagens(prev => {
          const n = { ...prev };
          recovered.forEach(m => { n[m] = (n[m] || 0) + 1; });
          return n;
        });
        log(`⚗️ The vat reclaims ${recovered.map(m => mutagenName(m)).join(', ')}.`);
      }
      const lost = carried.length - recovered.length;
      if (lost > 0) log(`🧬 ${lost} mutation${lost === 1 ? '' : 's'} lost with the body.`);
    }

    setSlimes(p => p.filter(s => s.id !== id));
    setRanchAssignments(prev => {
      const next = {};
      Object.entries(prev).forEach(([rid, list]) => {
        next[rid] = (list || []).filter(a => (typeof a === 'object' ? a.slimeId : a) !== id);
      });
      return next;
    });
    log(`Reabsorbed ${sl.name}! +${held + body}🧬 (${held} held, ${body} from the body)`);
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

  // Everything the tutorial triggers need, and nothing else.
  const tutorialState = {
    tab,
    broodView,
    skillPoints: availableSkillPoints,
    woundedCount,
    mutagenKinds: Object.keys(mutagens).length,
    maxHeldBiomass: slimes.reduce((n, sl) => Math.max(n, sl.biomass || 0), 0),
    maxElementAffinity: slimes.reduce(
      (n, sl) => Math.max(n, ...Object.values(sl.elements || { a: 0 })), 0),
    totalKills: Object.values(monsterKills).reduce((n, c) => n + c, 0),
  };
  const activeTutorial = tutorialsOn ? nextTutorial(tutorialState, seenTutorials) : null;
  const dismissTutorial = () => {
    if (activeTutorial) setSeenTutorials(prev => [...prev, activeTutorial.id]);
  };

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

    // The Convalescence Pool only takes the wounded; every other ranch refuses
    // them, because a wounded slime has nothing to give until it has mended.
    if (ranch.woundedOnly && !slime.wounded) return false;
    if (!ranch.woundedOnly && slime.wounded) return false;

    // Check if slime is on expedition
    if (Object.values(exps).some(e => (e.slimes || []).some(s => s.id === slimeId))) return false;

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

  const [expSummaries, setExpSummaries] = useState([]); // Array of expedition summaries
  const [expandedSections, setExpandedSections] = useState({ research: false, buildings: false, queenUnlocks: false, mana: false }); // Collapsible sections
  const [verboseLogs, setVerboseLogs] = useState(false); // Toggle for detailed combat calculations in logs
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
  // pendingBiomass: optional extra biomass to consider (e.g., earned during expedition but not yet applied)
  // Stats, max HP and mutation slots all come from src/combat/stats.js so the
  // UI and the resolver can never disagree about what a slime is.
  const getSlimeStats = useCallback(
    (slime, pendingBiomass = 0) =>
      computeStats(slime, pendingBiomass, combatBonuses, combatBonuses.mutationPower),
    [combatBonuses],
  );

  const getMaxHp = useCallback(
    (slime, pendingBiomass = 0) => computeMaxHp(
      slime,
      computeStats(slime, pendingBiomass, combatBonuses, combatBonuses.mutationPower),
      bon,
      combatBonuses,
      combatBonuses.mutationPower,
    ),
    [combatBonuses, bon],
  );

  /** Everything the resolver needs to know about global game state. */
  const combatContext = useCallback(() => ({
    combatBonuses: { ...combatBonuses, materialDrop: combatBonuses.materialDrop * bon.mats },
    bon,
    builds,
    passives: skillEffects.passives,
    mutationPower: combatBonuses.mutationPower || 1,
    ranchBonus: getRanchBonuses().expeditionRewards,
    travelMult: bon.travel,
    roundMs: ROUND_MS,
    hiveAbilities: {
      sharedVigor:      isHiveAbilityActive('sharedVigor'),
      bountifulHarvest: isHiveAbilityActive('bountifulHarvest'),
      evolutionPulse:   isHiveAbilityActive('evolutionPulse'),
    },
  }), [combatBonuses, bon, builds, skillEffects, getRanchBonuses, activeHiveAbilities]);

  const startExp = (zone) => {
    if (exps[zone] || !party.length) return;
    // Expeditions run until you recall them or the party goes down.
    const targetKills = Infinity;

    const roster = party.map(id => slimes.find(s => s.id === id)).filter(Boolean);
    const exp = makeExpedition(zone, roster, targetKills, combatContext());

    setExps(pr => ({ ...pr, [zone]: exp }));
    log(`Party sent to ${ZONES[zone].name}!`);
    lastArenaTickRef.current = Date.now();
    setParty([]);
  };

  const stopExp = (zone) => {
    setExps(currentExps => {
      const exp = currentExps[zone];
      if (!exp) return currentExps;

      const survivors = (exp.slimes || []).filter(s => !s.dead);
      const summary = {
        zone: ZONES[zone].name,
        kills: exp.kills,
        materials: { ...exp.materials },
        survivors,
        totalParty: (exp.slimes || []).length,
        biomassDistributed: (exp.slimes || []).reduce((sum, s) => sum + (s.biomassGained || 0), 0),
        party: (exp.slimes || []).map(s => ({ ...s })),
        monsterKillCounts: { ...exp.monsterKillCounts },
      };

      setTimeout(() => processExpSummary(zone, summary), 0);

      const next = { ...currentExps };
      delete next[zone];
      return next;
    });
  };

  // Process expedition summary (split out to avoid nested state updates)
  const processExpSummary = (zone, summary) => {
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
        const arenaEntity = summary.party.find(s => s.id === sl.id);
        if (arenaEntity && !arenaEntity.dead) {
          const updatedSlime = {
            ...sl,
            biomass: (sl.biomass || 0) + (arenaEntity.biomassGained || 0),
          };

          if (arenaEntity.elementGains && !sl.primaryElement) {
            const newElements = { ...(sl.elements || createDefaultElements()) };
            Object.entries(arenaEntity.elementGains).forEach(([element, gain]) => {
              newElements[element] = Math.min(100, (newElements[element] || 0) + gain);
            });
            updatedSlime.elements = newElements;

            // Lock primary element if any reached 100%
            const locked = Object.entries(newElements).find(([, v]) => v >= 100);
            if (locked) {
              updatedSlime.primaryElement = locked[0];
              updatedSlime.elements[locked[0]] = 100;
            }
          }

          return updatedSlime;
        }
        return sl;
      }));

      log(`Recalled from ${ZONES[zone].name}! Materials secured.`);

      // Kills no longer unlock anything — they are the pity floor that
      // guarantees a mutagen eventually, however the rolls fall.
      Object.entries(summary.monsterKillCounts || {}).forEach(([monsterType, count]) => {
        if (count <= 0) return;
        setMonsterKills(prev => ({ ...prev, [monsterType]: (prev[monsterType] || 0) + count }));

        const md = MONSTER_TYPES[monsterType];
        if (!md?.mutation) return;
        setPityKills(prev => {
          const total = (prev[monsterType] || 0) + count;
          const earned = Math.floor(total / MUTAGEN_PITY_KILLS);
          if (earned > 0) {
            grantMutagen(md.mutation, earned);
            log(`🧬 Enough ${md.name} samples to culture ${earned > 1 ? `${earned} mutagens` : 'a mutagen'}.`);
          }
          return { ...prev, [monsterType]: total % MUTAGEN_PITY_KILLS };
        });
      });
    } else {
      log(`Party wiped in ${ZONES[zone].name}! Materials lost.`);
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

  // ── Caravan ambush ────────────────────────────────────────────────────────
  // A daily damage race on the same round resolver. The only decision is who
  // goes; everything after that you can walk away from. See combat/caravan.js.

  const caravanCooldownLeft = () => Math.max(0, CARAVAN_COOLDOWN - (Date.now() - lastCaravan));
  const squadSize = 3 + (builds.ambushSlot || 0) + (combatBonuses.squadSlots || 0);
  const hasScouts = (builds.scoutCamp || 0) > 0;

  const startAmbush = (squadIds) => {
    if (!squadIds?.length || caravanCooldownLeft() > 0) return;
    const roster = squadIds.map(id => slimes.find(s => s.id === id)).filter(Boolean);
    if (!roster.length) return;

    // The War Den ranch trains the raiding party specifically, so its bonus
    // rides on the ambush context rather than the global one.
    const base = combatContext();
    const warDen = getRanchBonuses().ambushDamage || 0;
    const ctx = warDen > 0
      ? { ...base, combatBonuses: { ...base.combatBonuses, firmness: (base.combatBonuses.firmness || 1) * (1 + warDen) } }
      : base;

    setAmbush(makeAmbush(roster, caravanTier, { ...ctx, catapults: builds.slimeCatapult || 0 }, caravanDay()));
    lastAmbushTickRef.current = Date.now();
    log(`🎯 Ambush sprung on a tier ${caravanTier} caravan!`);
  };

  const finishAmbush = useCallback((finished) => {
    const { summary } = finished;
    const { banked } = summary;

    if (banked.biomass > 0) setBio(b => b + banked.biomass);
    if (banked.prisms > 0)  setPrisms(p => p + banked.prisms);
    if (Object.keys(banked.mats).length) {
      setMats(m => {
        const n = { ...m };
        Object.entries(banked.mats).forEach(([mat, c]) => { n[mat] = (n[mat] || 0) + c; });
        return n;
      });
    }

    const matStr = Object.entries(banked.mats).map(([m, c]) => `${c}× ${m}`).join(', ');
    if (summary.routed) {
      setCaravanTier(t => Math.min(MAX_CARAVAN_TIER, t + 1));
      log(`💎 Caravan routed! +${banked.biomass}🧬, +1💎${matStr ? `, ${matStr}` : ''}. Caravans rise to tier ${summary.nextTier}.`);
    } else if (banked.biomass > 0) {
      log(`🎯 Ambush over — ${summary.killed.length} killed. +${banked.biomass}🧬${matStr ? `, ${matStr}` : ''}`);
    } else {
      log('🌫️ The caravan got clear before anything fell.');
    }
    summary.lost.forEach(sl => log(`💔 ${sl.name} was lost in the ambush.`));

    setLastCaravan(Date.now());
  }, [log]);

  const doRetreat = () => {
    setAmbush(prev => {
      if (!prev || prev.phase !== 'battle') return prev;
      const next = retreatAmbush({ ...prev });
      setTimeout(() => finishAmbush(next), 0);
      return { ...next };
    });
  };

  const closeAmbush = () => setAmbush(null);

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

          // Convalescence is per-slime, timed from when each was laid in,
          // rather than sharing one ranch-wide cycle.
          if (ranch.effect === 'recover') {
            const healed = [];
            (ranchAssignments[ranchId] || []).forEach(a => {
              if (typeof a !== 'object') return;
              // cycleTime is in real seconds; startTime is a ms timestamp.
              if (Date.now() - a.startTime >= effectiveCycleTime * 1000) {
                healed.push(a.slimeId);
              }
            });
            if (healed.length) {
              setTimeout(() => {
                setSlimes(list => list.map(sl => (
                  healed.includes(sl.id) ? { ...sl, wounded: false, woundedAt: null } : sl
                )));
                setRanchAssignments(prev => ({
                  ...prev,
                  [ranchId]: (prev[ranchId] || []).filter(a =>
                    !healed.includes(typeof a === 'object' ? a.slimeId : a)),
                }));
                healed.forEach(id => {
                  const sl = slimes.find(x => x.id === id);
                  if (sl) log(`🩹 ${sl.name} is whole again.`);
                });
              }, 0);
            }
            return; // recovery has no accumulating reward
          }

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

  // Expedition loop. Ticks at 20fps so travel bars and animations stay smooth,
  // but combat itself only advances when a full round's worth of time elapses —
  // the driver decides that, not this interval.
  useEffect(() => {
    if (!gameLoaded || Object.keys(exps).length === 0) return;

    const iv = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastArenaTickRef.current) * speed;
      lastArenaTickRef.current = now;

      const ctx = combatContext();

      setExps(prev => {
        if (Object.keys(prev).length === 0) return prev;
        const next = { ...prev };
        const pending = [];

        Object.entries(next).forEach(([zone, exp]) => {
          if (!exp || exp.phase === 'defeat') return;
          const { exp: newExp, sideEffects } = tickExpedition(exp, dt, ctx, zone);
          next[zone] = { ...newExp };
          pending.push(...sideEffects.map(se => ({ ...se, zone })));
        });

        if (pending.length > 0) {
          setTimeout(() => {
            pending.forEach(se => {
              switch (se.type) {
                case 'slimeDown':
                  woundSlime(se.id);
                  break;
                case 'bioReclaim':
                  setBio(b => b + se.amount);
                  break;
                case 'prism':
                  setPrisms(p => p + 1);
                  break;
                case 'mutagen':
                  grantMutagen(se.mutation);
                  break;
                case 'grantTrait':
                  setSlimes(list => list.map(sl =>
                    sl.id === se.id && !(sl.traits || []).includes(se.trait)
                      ? { ...sl, traits: [...(sl.traits || []), se.trait] }
                      : sl));
                  break;
                case 'expComplete':
                  stopExp(se.zone);
                  break;
                case 'expWipe':
                  setExps(cur => { const n = { ...cur }; delete n[se.zone]; return n; });
                  break;
                default:
                  break;
              }
            });
          }, 0);
        }
        return next;
      });
    }, ARENA_TICK_RATE);

    return () => clearInterval(iv);
  }, [gameLoaded, exps, speed, combatContext]);

  // Caravan loop — same cadence as expeditions, one round at a time.
  useEffect(() => {
    if (!gameLoaded || !ambush || ambush.phase !== 'battle') return;

    const iv = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastAmbushTickRef.current) * speed;
      lastAmbushTickRef.current = now;

      const ctx = combatContext();

      setAmbush(prev => {
        if (!prev || prev.phase !== 'battle') return prev;

        const { ambush: next, sideEffects } = tickAmbush(prev, dt, ctx, ROUND_MS);

        if (sideEffects.length) {
          setTimeout(() => {
            sideEffects.forEach(se => {
              if (se.type === 'slimeDown') woundSlime(se.id);
              if (se.type === 'bioReclaim') setBio(b => b + se.amount);
              if (se.type === 'mutagen') grantMutagen(se.mutation);
            });
          }, 0);
        }

        if (next.phase !== 'battle') setTimeout(() => finishAmbush(next), 0);
        return { ...next };
      });
    }, ARENA_TICK_RATE);

    return () => clearInterval(iv);
  }, [gameLoaded, ambush, speed, combatContext, finishAmbush]);

    // The combat view is a projection of the expedition, not part of it — the
  // renderer invents all geometry from this.
  const selExpedition = exps[selZone];
  const expView = selExpedition ? {
    zone: selZone,
    slimes: selExpedition.slimes || [],
    enemies: selExpedition.enemy ? [selExpedition.enemy] : [],
    focusId: selExpedition.enemy?.id,
    marching: false,
  } : null;
  const expHud = selExpedition ? [
    { text: `💀 ${selExpedition.kills}${selExpedition.targetKills !== Infinity ? `/${selExpedition.targetKills}` : ''}`, color: '#f59e0b' },
    { text: `Round ${selExpedition.round}`, color: '#94a3b8' },
    selExpedition.phase === 'intermission'
      ? { text: '🚶 Traveling', color: '#22d3ee' }
      : selExpedition.enemy
        ? { text: `${selExpedition.enemy.name} ${Math.ceil(selExpedition.enemy.hp)}/${selExpedition.enemy.maxHp}`, color: '#ef4444' }
        : null,
  ].filter(Boolean) : null;

  const onAmbush = new Set((ambush?.slimes || []).map(c => c.id));
  const assignedToRanch = new Set(
    Object.values(ranchAssignments).flat()
      .map(a => (typeof a === 'object' ? a?.slimeId : a))
      .filter(Boolean),
  );
  const avail = slimes.filter(s =>
    !s.wounded &&
    !assignedToRanch.has(s.id) &&
    !Object.values(exps).some(e => (e.slimes || []).some(es => es.id === s.id)) &&
    !party.includes(s.id) &&
    !onAmbush.has(s.id));
  const woundedSlimes = slimes.filter(s => s.wounded);
  const selSl = slimes.find(s => s.id === selSlime);
  const selExp = selSlime ? Object.values(exps).find(e => (e.slimes || []).some(s => s.id === selSlime)) : null;
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
      <Menu open={menu} close={() => setMenu(false)} tab={tab} setTab={setTab} tabs={tabs} />
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => setMenu(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>☰</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>🧬 <strong>{Math.floor(bio)}</strong></div>
          <div
            title={`Royal Jelly is your population cap — ${slimes.length} slime(s) alive${woundedCount ? `, ${woundedCount} wounded and still holding a slot` : ''}. Raise it with Queen levels, the Slime Pit, and skills.`}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}
          >
            🍯 <strong>{freeJelly}/{maxJelly}</strong>
            {woundedCount > 0 && <span style={{ color: '#f87171', fontSize: 10 }}>🩹{woundedCount}</span>}
          </div>
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
        
        {tab === 'hive' && (
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

            {/* Stores — kept next to the buildings that eat them */}
            <details open={availableSkillPoints > 0} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
              <summary style={{ fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>
                🌳 Instincts{' '}
                <span style={{ fontSize: 12, fontWeight: 'normal', opacity: availableSkillPoints > 0 ? 1 : 0.55, color: availableSkillPoints > 0 ? '#4ade80' : undefined }}>
                  {availableSkillPoints > 0 ? `${availableSkillPoints} point${availableSkillPoints > 1 ? 's' : ''} to spend` : 'no points'}
                </span>
              </summary>
              <div style={{ marginTop: 12 }}>
              <SkillTree
                queenLevel={queen.level}
                purchasedSkills={purchasedSkills}
                onPurchaseSkill={purchaseSkill}
                availablePoints={availableSkillPoints}
              />
              </div>
            </details>

            <details style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
              <summary style={{ fontSize: 16, fontWeight: 'bold', cursor: 'pointer' }}>
                📦 Stores <span style={{ fontSize: 12, opacity: 0.5, fontWeight: 'normal' }}>
                  ({Object.keys(mats).length} kinds)
                </span>
              </summary>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 12 }}>
                {Object.entries(mats).sort(([a], [b]) => a.localeCompare(b)).map(([n, c]) => (
                  <div key={n} style={{ padding: 9, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: 12 }}>
                    {n} <strong style={{ float: 'right' }}>×{c}</strong>
                  </div>
                ))}
                {!Object.keys(mats).length && (
                  <div style={{ opacity: 0.5, fontStyle: 'italic', gridColumn: '1/-1', fontSize: 12 }}>
                    Nothing yet — monsters and caravans drop it.
                  </div>
                )}
              </div>
            </details>
          </div>
        )}

        {tab === 'brood' && (
          selSl ? (
            <div>
              <button onClick={() => setSelSlime(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, padding: '8px 16px', color: '#fff', cursor: 'pointer', marginBottom: 15 }}>← Back</button>
              <SlimeDetail
                slime={selSl}
                expState={(selExp?.slimes || []).find(s => s.id === selSlime)}
                getSlimeStats={getSlimeStats}
                getMaxHp={getMaxHp}
                mutationSlots={(x) => mutationSlots(x, combatBonuses.mutationSlots)}
                mutagens={mutagens}
                onApplyMutagen={applyMutagen}
                onWithdraw={withdrawBiomass}
              />
              {!selExp && <button onClick={() => { reabsorb(selSl.id); setSelSlime(null); }} style={{ width: '100%', marginTop: 15, padding: 12, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>🔄 Reabsorb</button>}
            </div>
          ) : (
            <div>
              {/* The Brood is every slime you have: the ones on their feet and the ones mending. */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: 'roster', icon: '🟢', label: 'Roster', badge: slimes.length },
                  { id: 'pools', icon: '🏠', label: 'Pools', badge: woundedCount || undefined, locked: !isFeatureUnlocked('ranch', purchasedSkills) },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setBroodView(v.id)}
                    style={{
                      flex: 1, padding: '9px 6px', fontSize: 13, cursor: 'pointer', color: '#fff',
                      background: broodView === v.id ? 'rgba(236,72,153,0.22)' : 'rgba(0,0,0,0.25)',
                      border: `1px solid ${broodView === v.id ? 'rgba(236,72,153,0.6)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 8, fontWeight: broodView === v.id ? 'bold' : 'normal',
                      opacity: v.locked ? 0.55 : 1,
                    }}
                  >
                    {v.locked ? '🔒' : v.icon} {v.label}
                    {v.badge !== undefined && (
                      <span style={{ marginLeft: 6, background: 'rgba(236,72,153,0.85)', padding: '1px 7px', borderRadius: 9, fontSize: 11 }}>{v.badge}</span>
                    )}
                  </button>
                ))}
              </div>

              {broodView === 'pools' && (isFeatureUnlocked('ranch', purchasedSkills) ? (
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
            ))}

              {broodView === 'roster' && (<>
              <SlimeForge biomass={bio} freeJelly={freeJelly} tiers={unlockedTiers} onSpawn={spawn} />
              {Object.keys(mutagens).length > 0 && (
                <details open style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)', borderRadius: 10, padding: 12, marginBottom: 12 }}>
                  <summary style={{ fontSize: 13, fontWeight: 'bold', cursor: 'pointer', color: '#c084fc' }}>
                    🧬 Mutagens <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 'normal' }}>
                      ({Object.values(mutagens).reduce((n, c) => n + c, 0)} on hand)
                    </span>
                  </summary>
                  <div style={{ fontSize: 10, opacity: 0.6, margin: '8px 0' }}>
                    Open a slime with a free slot to apply one.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {Object.entries(mutagens).map(([id, count]) => {
                      const m = MUTATION_LIBRARY[id];
                      if (!m) return null;
                      return (
                        <div key={id} title={getMutationDesc(id, 10)} style={{
                          fontSize: 11, padding: '5px 9px', borderRadius: 6,
                          background: `${m.color}22`, border: `1px solid ${m.color}55`,
                        }}>
                          {m.icon} {m.name} <strong style={{ color: m.color }}>×{count}</strong>
                        </div>
                      );
                    })}
                  </div>
                </details>
              )}

              {slimes.length ? (
                <div style={{ display: 'grid', gap: 10 }}>
                {slimes.map(s => {
                  const tier = SLIME_TIERS[s.tier];
                  const onExp = Object.entries(exps).find(([_, e]) => (e.slimes || []).some(es => es.id === s.id));
                  const expS = onExp ? (onExp[1].slimes || []).find(es => es.id === s.id) : null;
                  const stats = getSlimeStats(s);
                  const biomass = s.biomass || 0;
                  return (
                    <div key={s.id} onClick={() => setSelSlime(s.id)} style={{ background: s.wounded ? 'rgba(239,68,68,0.10)' : 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 12, border: `2px solid ${s.wounded ? 'rgba(239,68,68,0.45)' : tier.color + '33'}`, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <SlimeSprite tier={s.tier} size={45} hp={expS?.hp} maxHp={expS?.maxHp || s.maxHp} mutations={s.mutations} status={expS?.status} primaryElement={s.primaryElement} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 'bold', fontSize: 14 }}>{s.name}</div>
                          <div style={{ fontSize: 11, opacity: 0.7 }}>
                            {tier.name}
                            {s.wounded && <span style={{ color: '#f87171', fontWeight: 'bold', marginLeft: 6 }}>🩹 Wounded</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 10, marginTop: 4 }}>
                            {Object.entries(STAT_INFO).map(([k, v]) => <span key={k} style={{ color: v.color }}>{v.icon}{stats[k]}</span>)}
                          </div>
                          {onExp && <div style={{ fontSize: 10, color: '#22d3ee', marginTop: 4 }}>📍 {ZONES[onExp[0]].name} • ❤️ {Math.ceil(expS?.hp || 0)}/{s.maxHp}</div>}
                          {s.wounded && !onExp && (
                            <div style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>
                              {assignedToRanch.has(s.id) ? '🩹 Mending in the pool' : '🩹 Needs a Convalescence Pool slot'}
                            </div>
                          )}
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
              </>)}
            </div>
          )
        )}

        {tab === 'wilds' && (
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
            <CombatView
              view={expView}
              anim={exps[selZone]?.anim}
              logs={exps[selZone]?.logs}
              hud={expHud}
              emptyLabel={`${ZONES[selZone].icon} ${ZONES[selZone].name}`}
              verboseLogs={verboseLogs}
              setVerboseLogs={setVerboseLogs}
            />
            {exps[selZone] ? (
              <button onClick={() => stopExp(selZone)} style={{ width: '100%', marginTop: 15, padding: 12, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>🛑 Recall</button>
            ) : (
              <div style={{ marginTop: 15 }}>
                <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Party</div>
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
                {Object.entries(exps).map(([z, e]) => <div key={z} onClick={() => setSelZone(z)} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: z === selZone ? 'rgba(34,211,238,0.1)' : 'rgba(0,0,0,0.3)', borderRadius: 8, marginBottom: 6, cursor: 'pointer' }}><span>{ZONES[z].icon} {ZONES[z].name}</span><span>💀{e.kills} 👥{(e.slimes||[]).filter(s=>!s.dead).length}/{(e.slimes||[]).length}</span></div>)}
              </div>
            )}
          </div>
        )}

        {tab === 'road' && (
          <div>
            <Caravan
              ambush={ambush}
              slimes={avail}
              getSlimeStats={getSlimeStats}
              tier={caravanTier}
              scouted={hasScouts}
              squadSize={squadSize}
              catapults={builds.slimeCatapult || 0}
              cooldownLeft={caravanCooldownLeft() > 0 ? formatTime(Math.ceil(caravanCooldownLeft() / 1000)) : 0}
              onStart={startAmbush}
              onRetreat={doRetreat}
              onClose={closeAmbush}
              verboseLogs={verboseLogs}
              setVerboseLogs={setVerboseLogs}
            />
          </div>
        )}

        {tab === 'memory' && (
          <Compendium
            queen={queen}
            monsterKills={monsterKills}
            mutagens={mutagens}
            seenTutorials={seenTutorials}
          />
        )}

        {tab === 'settings' && (
          <SettingsTab
            onSave={manualSave}
            onDelete={handleDelete}
            lastSave={lastSave}
            prisms={prisms}
            slimes={slimes}
            purchasePrismItem={purchasePrismItem}
            tutorialsOn={tutorialsOn}
            setTutorialsOn={setTutorialsOn}
            seenTutorials={seenTutorials}
            resetTutorials={() => { setSeenTutorials([]); setTutorialsOn(true); }}
            totalTutorials={TUTORIAL_ORDER.length}
          />
        )}
      </main>

      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)', maxHeight: 70, overflowY: 'auto', padding: 8 }}>
        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>📜 Log</div>
        {logs.slice(-4).reverse().map((l, i) => <div key={i} style={{ fontSize: 10, padding: '2px 0', opacity: i === 0 ? 1 : 0.6 }}><span style={{ opacity: 0.4, marginRight: 6 }}>{l.t}</span>{l.m}</div>)}
      </div>

      <TutorialModal
        tutorial={activeTutorial}
        onDismiss={dismissTutorial}
        onDisableAll={() => { dismissTutorial(); setTutorialsOn(false); }}
      />

      {dev && (
        <div style={{ position: 'fixed', top: 60, right: 10, width: 220, background: 'rgba(0,0,0,0.95)', borderRadius: 10, padding: 15, zIndex: 200, border: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}><span style={{ fontWeight: 'bold' }}>🛠️ Dev</span><button onClick={() => setDev(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>×</button></div>
          <div style={{ marginBottom: 10 }}><label style={{ fontSize: 12 }}>Speed: {speed}x</label><input type="range" min="1" max="50" value={speed} onChange={e => setSpeed(+e.target.value)} style={{ width: '100%' }} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <button onClick={() => setBio(b => b + 100)} style={{ padding: 8, background: '#4ade80', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+100🧬</button>
            <button onClick={() => setMats(m => ({ ...m, 'Wolf Fang': (m['Wolf Fang'] || 0) + 10, 'Wolf Pelt': (m['Wolf Pelt'] || 0) + 10, 'Spider Silk': (m['Spider Silk'] || 0) + 10, 'Mana Crystal': (m['Mana Crystal'] || 0) + 5, 'Snail Shell': (m['Snail Shell'] || 0) + 5, 'Wyrm Scale': (m['Wyrm Scale'] || 0) + 3, 'Storm Core': (m['Storm Core'] || 0) + 3, 'Void Essence': (m['Void Essence'] || 0) + 3, 'Human Bone': (m['Human Bone'] || 0) + 10, 'Iron Sword': (m['Iron Sword'] || 0) + 10, 'Champion Badge': (m['Champion Badge'] || 0) + 2 }))} style={{ padding: 8, background: '#f59e0b', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+Mats</button>
            <button onClick={() => setMutagens(m => { const n = { ...m }; ['sharp','digest','stoneskin','vinewebs','resurrect','spiny','pyrolyze','lifesteal','theTouch','fracture','stormcaller','voidTouched'].forEach(k => { n[k] = (n[k] || 0) + 3; }); return n; })} style={{ padding: 8, background: '#a855f7', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+3 Each Mutagen</button>
            <button onClick={() => setMonsterKills(k => ({ ...k, youngWolf: (k.youngWolf || 0) + 50, venusSlimetrap: (k.venusSlimetrap || 0) + 50, serratedCarp: (k.serratedCarp || 0) + 50, crystalBat: (k.crystalBat || 0) + 50, emberWyrm: (k.emberWyrm || 0) + 50, voidHollow: (k.voidHollow || 0) + 50 }))} style={{ padding: 8, background: '#22c55e', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+50 Kills</button>
            <button onClick={() => setQueen(q => ({ ...q, level: q.level + 5 }))} style={{ padding: 8, background: '#ec4899', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+5 Queen Lv</button>
            <button onClick={() => { setLastCaravan(0); setAmbush(null); log('🎯 Caravan timer reset!'); }} style={{ padding: 8, background: '#22d3ee', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Reset Caravan</button>
            <button onClick={() => setPrisms(p => p + 100)} style={{ padding: 8, background: '#8b5cf6', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+100 Prisms</button>
            <button onClick={() => setMana(p => p + 100)} style={{ padding: 8, background: '#10b981', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+100 Mana</button>
            <button onClick={() => { setSeenTutorials([]); setTutorialsOn(true); }} style={{ padding: 8, background: '#a855f7', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Replay Tutorials</button>
            <button onClick={() => { setSeenTutorials(TUTORIAL_ORDER); }} style={{ padding: 8, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12, color: '#fff' }}>Skip Tutorials</button>
            <button onClick={() => setSlimes(list => list.map((sl, i) => (i === 0 ? { ...sl, wounded: true, woundedAt: Date.now(), biomass: 0 } : sl)))} style={{ padding: 8, background: '#ef4444', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Wound First Slime</button>
          </div>
        </div>
      )}
    </div>
  );
}
