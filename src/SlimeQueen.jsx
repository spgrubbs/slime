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
  queenLevelCost,
} from './data/gameConstants.js';

import { STAT_INFO, SLIME_TIERS } from './data/slimeData.js';
import { MUTATION_LIBRARY, TRAIT_LIBRARY, STATUS_EFFECTS, SLIME_TRAITS, getMutationDesc } from './data/traitData.js';
import { MONSTER_TYPES, MONSTER_ABILITIES } from './data/monsterData.js';
import { ZONES, EXPLORATION_EVENTS, INTERMISSION_EVENTS, INTERMISSION_DURATION } from './data/zoneData.js';
import { BUILDINGS, RESEARCH, nextLevelCost, tendrilBonuses, tendrilFor, zoneReached, wardenUnlocked, TENDRILS } from './data/buildingData.js';
import { WARDENS, wardenTypeId, prerequisiteZone, ZONE_ORDER, ALL_SEALS, ALL_HEARTS } from './data/wardenData.js';
import { caravanDay, MAX_CARAVAN_TIER } from './data/caravanData.js';
import { RANCH_TYPES, RANCH_EVENTS, RANCH_UPGRADE_BONUSES, MAX_RANCH_LEVEL, RANCH_MAX_ACCUMULATION_TIME } from './data/ranchData.js';
import { HIVE_ABILITIES, PRISM_SHOP, MANA_UPDATE_INTERVAL, MANA_PER_SLIME_PER_HOUR } from './data/hiveData.js';
import { SKILL_TREES, SKILL_POINTS_PER_LEVEL, getSkillEffects, isBuildingUnlocked, isPheromoneUnlocked, isFeatureUnlocked } from './data/skillTreeData.js';

// Utility imports
import { genName, genId, formatTime, calculateElementalDamage, createDefaultElements, canGainElement, calculateElementGain, seededRng } from './utils/helpers.js';
import { askPermission, scheduleNotes, clearNotes, NOTE_IDS } from './notify.js';
import { saveGame, loadGame, deleteSave, getDefaultState, SAVED_KEYS, exportSave, importSave } from './utils/saveSystem.js';

// Importing the combat module registers every mutation/trait effect and
// validates the registry — a passive with no implementation fails here.
import './combat/index.js';
import { computeStats, computeMaxHp, mutationSlots, slotsFromSelection, buildEffectList } from './combat/stats.js';
import { makeExpedition, tickExpedition, hydrateExpedition } from './combat/expedition.js';
import { makeAmbush, tickAmbush, retreatAmbush, hydrateAmbush, dehydrateAmbush } from './combat/caravan.js';
import { nextTutorial, TUTORIALS, TUTORIAL_ORDER, GUIDE_STEPS, currentGuideStep } from './data/tutorialData.js';
import { MUTAGEN_PITY_KILLS, GULLET_TRAP_KILLS } from './data/monsterData.js';
import { mutagenName, traitValues } from './data/traitData.js';

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
  Merchant,
} from './components';
import { merchantVisit, rollMerchantDeals, canTakeDeal, MERCHANT, MATERIAL_TABLE } from './data/merchantData.js';
import SkillTree from './components/SkillTree.jsx';
import DevPanel from './components/DevPanel.jsx';
import { sfx, cue, unlockAudio, setAmbience } from './audio/index.js';

import { calculateOfflineProgress } from './combat/offline.js';

// ============== MAIN GAME ==============
export default function SlimeQueen() {
  // A new game's state. Everything saved starts from here; see saveSystem.js.
  const [D] = useState(getDefaultState);
  const [gameLoaded, setGameLoaded] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(null);
  
  const [queen, setQueen] = useState(D.queen);
  const [bio, setBio] = useState(D.bio);
  const [mats, setMats] = useState(D.mats);
  const [slimes, setSlimes] = useState(D.slimes);
  const [exps, setExps] = useState(D.exps);
  const [bLogs, setBLogs] = useState({});
  const [builds, setBuilds] = useState(D.builds);
  const [research, setResearch] = useState(D.research);
  const [activeRes, setActiveRes] = useState(D.activeRes);
  const [logs, setLogs] = useState([{ t: new Date().toLocaleTimeString(), m: 'The nucleus stirs. Glub is here.' }]);
  const [speed, setSpeed] = useState(1);
  const [lastTick, setLastTick] = useState(Date.now());
  const [lastSave, setLastSave] = useState(null);
  const [lastCaravan, setLastCaravan] = useState(D.lastCaravan);
  const [caravanTier, setCaravanTier] = useState(D.caravanTier);
  const [ambush, setAmbush] = useState(D.ambush);
  const [monsterKills, setMonsterKills] = useState(D.monsterKills);
  const [mutagens, setMutagens] = useState(D.mutagens);
  const [wardenKills, setWardenKills] = useState(D.wardenKills);
  const [wardenTries, setWardenTries] = useState(D.wardenTries);
  const [pityKills, setPityKills] = useState(D.pityKills);
  const [purchasedSkills, setPurchasedSkills] = useState(D.purchasedSkills);
  const [merchant, setMerchant] = useState(D.merchant);
  const [guide, setGuide] = useState(D.guide);
  const [secrets, setSecrets] = useState(D.secrets);
  const devForceSecret = useRef(false);

  // Ranch system state
  const [prisms, setPrisms] = useState(D.prisms);
  const [ranchBuildings, setRanchBuildings] = useState(D.ranchBuildings);
  const [ranchAssignments, setRanchAssignments] = useState(D.ranchAssignments);
  const [ranchProgress, setRanchProgress] = useState(D.ranchProgress);
  const [ranchEvents, setRanchEvents] = useState([]);

  // Mana and Hive Ability system
  const [mana, setMana] = useState(D.mana);
  const [lastManaUpdate, setLastManaUpdate] = useState(D.lastManaUpdate);
  const [activeHiveAbilities, setActiveHiveAbilities] = useState(D.activeHiveAbilities);

  const [tab, setTab] = useState('hive');
  // The Spawn screen holds both the roster and the pools the slimes rest in.
  const [broodView, setBroodView] = useState('roster');
  const [menu, setMenu] = useState(false);
  const [dev, setDev] = useState(false);
  const [seenTutorials, setSeenTutorials] = useState(D.seenTutorials);
  const [tutorialsOn, setTutorialsOn] = useState(D.tutorialsOn);
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
    { id: 'hive', icon: '👑', label: 'The Nucleus' },
    { id: 'brood', icon: '🟢', label: 'The Spawn', badge: slimes.length },
    { id: 'wilds', icon: '🗺️', label: 'The Wilds' },
    { id: 'road', icon: '🎯', label: 'The Road', skillUnlock: 'caravan' },
    { id: 'memory', icon: '📖', label: 'Memory' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  // Filter tabs based on skill unlocks
  const visibleTabs = tabs.filter(t => !t.skillUnlock || isFeatureUnlocked(t.skillUnlock, purchasedSkills));

  const woundedCount = slimes.filter(s => s.wounded).length;

  // How many zones can be worked at once. One until Split Column.
  const expeditionSlots = 1 + (skillBonuses.expeditionSlots || 0);

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
    spd: 1 + (research.includes('swiftSlimes') ? 0.1 : 0),   // Training Arena: +10% damage
    travel: research.includes('extendedExpedition') ? 0.6 : 1,   // Expedition Depot
    mats: 1 + (research.includes('infiniteExpedition') ? 0.25 : 0), // Deep Exploration Hub
    hp: 1 + (research.includes('slimeVitality') ? 0.15 : 0),
    res: (1 + (builds.researchLab || 0) * 0.25) * (1 + (skillBonuses.researchSpeed || 0) / 100),
  };

  // A rooted tendril's passive is keyed exactly like a skill bonus, so the two
  // simply add rather than needing a second path through the stat code.
  const tendrilBon = tendrilBonuses(builds);
  const bonusOf = (k) => (skillBonuses[k] || 0) + (tendrilBon[k] || 0);

  // Combined bonuses applying skill tree effects
  const combatBonuses = {
    firmness: 1 + (bonusOf('firmness') + (skillBonuses.allCombat || 0)) / 100,
    maxHp: 1 + (bonusOf('maxHp') + (skillBonuses.allCombat || 0)) / 100,
    viscosity: 1 + (bonusOf('viscosity') + (skillBonuses.allCombat || 0)) / 100,
    slipperiness: 1 + (bonusOf('slipperiness') + (skillBonuses.allCombat || 0)) / 100,
    critChance: (skillBonuses.critChance || 0) / 100, // Flat addition to crit chance
    damageReduction: skillBonuses.damageReduction || 0, // Flat damage reduction
    elementalDamage: 1 + (skillBonuses.elementalDamage || 0) / 100, // Element damage multiplier
    statusChance: 1 + (skillBonuses.statusChance || 0) / 100, // Status effect chance multiplier
    executeDamage: 1 + (skillBonuses.executeDamage || 0) / 100, // Damage vs low HP targets
    damageVsHighHp: 1 + (skillBonuses.damageVsHighHp || 0) / 100, // Damage vs high HP targets
    lowHpDamage: 1 + (skillBonuses.lowHpDamage || 0) / 100, // Damage when low HP
    lowHpDefense: (skillBonuses.lowHpDefense || 0) / 100, // Damage reduction when low HP
    // Apex Predator is the one skill that scales mutations, and it doubles them.
    mutationPower: (skillEffects.passives.includes('combatMastery') ? 2 : 1),
    expeditionBiomass: 1 + bonusOf('expeditionBiomass') / 100,
    materialDrop: 1 + bonusOf('materialDrop') / 100,
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
      expeditionRegen: 0,    // HP per round for every slime in the field, from healingSpring
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
        } else if (ranch.effect === 'expeditionBuff' && ranch.buffType === 'regen') {
          // healingSpring: field regen based on viscosity
          bonuses.expeditionRegen += stats.viscosity * ranch.effectValue * effectMult;
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
    log(`${ability.icon} ${ability.name} fills the air.`);
    sfx('revive');
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
          log(`✅ ${rd.name} is finished.`);
          return null;
        }
        return { ...prev, prog: newProg };
      });
    }

    log(`⏰ The pools and the lab jump ahead ${Math.round(ms / 3600000)} hours.`);
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
          log('📜 The Ancient trait takes hold.');
        }
        break;
      case 'primordialTrait':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId && !s.traits?.includes('primordial')
              ? { ...s, traits: [...(s.traits || []), 'primordial'] }
              : s
          ));
          log('🌟 The Primordial trait takes hold.');
        }
        break;
      case 'mutationReset':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId
              ? { ...s, mutations: [] }
              : s
          ));
          log('🔄 Every mutation is gone. A fresh start.');
        }
        break;
      case 'elementReset':
        if (targetSlimeId) {
          setSlimes(prev => prev.map(s =>
            s.id === targetSlimeId
              ? { ...s, elements: { fire: 0, water: 0, nature: 0, earth: 0 }, primaryElement: null }
              : s
          ));
          log('💫 Washed clean of every element.');
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

  // ── Loading ──────────────────────────────────────────────────────────────
  //
  // Two phases. The save is restored first, exactly as it was left; only on the
  // next render, once skills, buildings and pheromones are back in state, does
  // the offline catch-up run. It used to run in the same breath as the load,
  // against a fresh game's context: no skills, no mutagen drops, no affinity,
  // none of the bonuses the player had actually built.
  const [pendingOffline, setPendingOffline] = useState(null);

  // ── The saved state, in one place ──────────────────────────────────────
  // Every saved key paired with its value and setter. Save, load and export
  // are all built from this table, and it must list exactly SAVED_KEYS.
  const persisted = {
    queen: [queen, setQueen], bio: [bio, setBio], mats: [mats, setMats],
    slimes: [slimes, setSlimes], exps: [exps, setExps], builds: [builds, setBuilds],
    research: [research, setResearch], activeRes: [activeRes, setActiveRes],
    lastCaravan: [lastCaravan, setLastCaravan], caravanTier: [caravanTier, setCaravanTier],
    ambush: [ambush, setAmbush], seenTutorials: [seenTutorials, setSeenTutorials],
    tutorialsOn: [tutorialsOn, setTutorialsOn], monsterKills: [monsterKills, setMonsterKills],
    mutagens: [mutagens, setMutagens], pityKills: [pityKills, setPityKills],
    wardenKills: [wardenKills, setWardenKills], wardenTries: [wardenTries, setWardenTries],
    purchasedSkills: [purchasedSkills, setPurchasedSkills], merchant: [merchant, setMerchant],
    guide: [guide, setGuide], secrets: [secrets, setSecrets],
    prisms: [prisms, setPrisms], ranchBuildings: [ranchBuildings, setRanchBuildings],
    ranchAssignments: [ranchAssignments, setRanchAssignments], ranchProgress: [ranchProgress, setRanchProgress],
    mana: [mana, setMana], lastManaUpdate: [lastManaUpdate, setLastManaUpdate],
    activeHiveAbilities: [activeHiveAbilities, setActiveHiveAbilities],
  };
  if (process.env.NODE_ENV !== 'production') {
    const wired = Object.keys(persisted).sort().join(',');
    const listed = [...SAVED_KEYS].sort().join(',');
    if (wired !== listed) throw new Error(`Saved state is out of sync.\n  wired:  ${wired}\n  listed: ${listed}`);
  }

  // Keys whose saved form is not their live form: combatants carry live
  // references that are stripped on save and rebuilt here.
  const HYDRATE = {
    exps: (v, saved) => rehydrateExps(v, saved.slimes),
    ambush: (v, saved) => (v ? hydrateAmbush(v, saved.slimes || [], buildEffectList) : null),
  };

  /** Put a whole saved game (already filled from defaults) into state. */
  const applySave = (saved) => {
    SAVED_KEYS.forEach(k => {
      const set = persisted[k][1];
      set(HYDRATE[k] ? HYDRATE[k](saved[k], saved) : saved[k]);
    });
  };

  useEffect(() => {
    const saved = loadGame();
    if (!saved) { setGameLoaded(true); return; }
    applySave(saved);
    setLastSave(saved.lastSave);
    setLogs([{ t: new Date().toLocaleTimeString(), m: 'Glub waves a pseudopod. Everything is where you left it.' }]);
    setPendingOffline(saved);
  }, []);

  useEffect(() => {
    if (!pendingOffline) return;
    const saved = pendingOffline;
    setPendingOffline(null);

    const offline = calculateOfflineProgress(saved, bon, { ...combatContext(), rng: seededRng(saved.lastSave || 0) });
    if (offline.hadProgress) {
      const r = offline.results;
      setBio(offline.newState.bio);
      setSlimes(offline.newState.slimes);
      setExps(rehydrateExps(offline.newState.exps, offline.newState.slimes));
      setMats(offline.newState.mats);
      setActiveRes(offline.newState.activeRes);
      setResearch(offline.newState.research);
      Object.entries(r.mutagensFound || {}).forEach(([id, n]) => grantMutagen(id, n));
      if (r.prismsFound) setPrisms(p => p + r.prismsFound);
      if (r.decoyUsed) setActiveHiveAbilities(a => { const n = { ...a }; delete n.decoy; return n; });
      r.wardensFelled.forEach(w => recordWardenKill(w.zone, w.plus));
      (r.secretsFound || []).forEach(id => setSecrets(x => ({ ...x, [id]: 'beaten' })));
      // A hunt that reached its target while the game was closed comes home
      // now. Its "done" signal fired offline, where there was nobody to hear it.
      if (r.completed.length) setTimeout(() => r.completed.forEach(z => stopExp(z)), 0);
      setWelcomeBack(offline);
    }
    // The catch-up covered the time away; the live clocks start from now.
    setLastTick(Date.now());
    lastArenaTickRef.current = Date.now();
    setGameLoaded(true);
  }, [pendingOffline]);

  // ── Sound ──────────────────────────────────────────────────────────────────
  // Browsers only allow audio after a touch, so the first tap anywhere wakes
  // it. Every button gets a very soft tap; actions layer their own sound on it.
  useEffect(() => {
    const wake = () => unlockAudio();
    const tap = (e) => { if (e.target?.closest?.('button')) sfx('tap'); };
    document.addEventListener('pointerdown', wake);
    document.addEventListener('click', tap);
    return () => {
      document.removeEventListener('pointerdown', wake);
      document.removeEventListener('click', tap);
    };
  }, []);

  // ── Saving ────────────────────────────────────────────────────────────────
  //
  // The autosave used to be an interval inside an effect that depended on every
  // piece of state. A running expedition changes state every tick, so the
  // effect tore the interval down and rebuilt it every second and the 30-second
  // save never fired. Closing the app abruptly lost everything since the last
  // manual save.
  //
  // Now the latest state sits in a ref, one interval reads it, and the game also
  // saves the moment the page is hidden: switching apps, locking the phone, or
  // swiping the app away. On Android the WebView reports all of those as the
  // page going hidden before the process is killed.
  const snapshot = () => ({
    ...Object.fromEntries(SAVED_KEYS.map(k => [k, persisted[k][0]])),
    lastSave: Date.now(),
  });
  const snapshotRef = useRef(null);
  const deletedRef = useRef(false);
  snapshotRef.current = gameLoaded && !deletedRef.current ? snapshot : null;

  const saveNow = useCallback(() => {
    const snap = snapshotRef.current;
    if (!snap) return false;
    const ok = saveGame(snap());
    if (ok) setLastSave(Date.now());
    return ok;
  }, []);

  // Backgrounding is treated exactly like closing: save, forecast, schedule
  // notifications, and stop the live clocks. Coming back runs the same seeded
  // catch-up a cold start would, so a phone that kept the app alive and one
  // that killed it end up in the same place, and the notifications were true.
  const hiddenAtRef = useRef(null);
  const planNotesRef = useRef(null);

  useEffect(() => {
    if (!gameLoaded) return;
    const interval = setInterval(() => { if (!document.hidden) saveNow(); }, AUTO_SAVE_INTERVAL);
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        if (hiddenAtRef.current) return;
        saveNow();
        hiddenAtRef.current = Date.now();
        try { planNotesRef.current?.(); } catch (e) { console.error('Notification plan failed:', e); }
        return;
      }
      // Visible again.
      const away = hiddenAtRef.current ? Date.now() - hiddenAtRef.current : 0;
      hiddenAtRef.current = null;
      clearNotes();
      if (away > 60 * 1000 && !deletedRef.current) {
        const saved = loadGame();
        if (saved) setPendingOffline(saved);
      }
      // A short absence needs nothing: the live clocks simply catch up.
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', saveNow);
    window.addEventListener('beforeunload', saveNow);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', saveNow);
      window.removeEventListener('beforeunload', saveNow);
    };
  }, [gameLoaded, saveNow]);

  const manualSave = () => {
    if (saveNow()) log('💾 Saved.');
  };

  // Backups. Export saves first so the code is the game as it is right now.
  const exportBackup = () => { saveNow(); return exportSave(); };
  // A restore replaces the save and restarts. The guard goes up BEFORE the
  // write so the page-hide save on the way out cannot overwrite the import.
  const importBackup = (code) => {
    deletedRef.current = true;
    snapshotRef.current = null;
    if (!importSave(code)) { deletedRef.current = false; return false; }
    window.location.reload();
    return true;
  };

  // Resetting thirty pieces of state by hand kept missing the newest ones, so a
  // deleted save simply restarts the app from nothing. The ref is cleared first
  // so the page-hide save on the way out cannot write the old game back.
  const handleDelete = () => {
    deletedRef.current = true;
    snapshotRef.current = null;
    deleteSave();
    window.location.reload();
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

  // `free` is the dev panel's: no biomass, no plasm, and the slime takes no
  // plasm while it lives, so test slimes never crowd the real roster.
  const spawn = (tier, name, magCost, { free = false } = {}) => {
    const td = SLIME_TIERS[tier];
    const bioCost = free ? 0 : BASE_SLIME_COST;
    if (free) magCost = 0;
    else if (bio < bioCost || freeJelly < magCost) return;

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
    if (bioCost) setBio(p => p - bioCost);
    if (spawnTraits.length > 0) {
      const trait = SLIME_TRAITS[spawnTraits[0]];
      log(`🥚 ${slimeName} buds off, and it's ${trait.icon} ${trait.name}!`);
      sfx('bud');
    } else {
      log(`🥚 ${slimeName} buds off!`);
      sfx('bud');
    }
  };

  /**
   * A slime that goes down is wounded, not killed. It forfeits every point of
   * held biomass — the temporary half of its power — and cannot be deployed
   * again until it has recovered in a Convalescence Pool. It keeps its jelly
   * slot the whole time, so a bad run clogs the nucleus's capacity.
   */
  // Field Triage (skill) keeps the carried biomass; without it a wound spills
  // everything the slime was holding, which is the whole risk of carrying it.
  const woundSlime = useCallback((id, keepBiomass = false) => {
    setSlimes(list => list.map(sl => (
      sl.id === id
        ? { ...sl, wounded: true, woundedAt: Date.now(), biomass: keepBiomass ? sl.biomass : 0 }
        : sl
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
      log("Call them home first. I can't feed a slime that isn't here.");
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
      // A mutagen's elemental trace only takes once affinity exists at all.
      if (mut.elementBonus && !next.primaryElement && hasPassive('affinity')) {
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
    cue('mutate');
  };

  /** How much of a dissolved slime's genework the Rendering Vat gives back. */
  const mutagenRecovery = () => [0, 0.5, 1][builds.renderingVat || 0] ?? 1;

  const markGuide = (flag) => setGuide(g => (g.flags?.[flag] ? g : { ...g, flags: { ...g.flags, [flag]: true } }));

  const withdrawBiomass = (id) => {
    const sl = slimes.find(s => s.id === id);
    if (!sl) return;
    const held = Math.floor(sl.biomass || 0);
    if (held <= 0) return;
    if (Object.values(exps).some(e => (e.slimes || []).some(x => x.id === id))) {
      log("Call them home first. I can't squeeze a slime that isn't here.");
      return;
    }
    setBio(p => p + held);
    setSlimes(list => list.map(x => (x.id === id ? { ...x, biomass: 0 } : x)));
    log(`Squeezed ${held}🧬 out of ${sl.name}.`);
    markGuide('squeezed');
    sfx('squish');
  };

  /** Squeeze every slime at home at once. Parties out in the wilds keep theirs. */
  const homeSlimes = () => slimes.filter(sl =>
    !Object.values(exps).some(e => (e.slimes || []).some(x => x.id === sl.id))
    && !(ambush?.slimes || []).some(x => x.id === sl.id));
  const heldAtHome = homeSlimes().reduce((n, sl) => n + Math.floor(sl.biomass || 0), 0);
  const withdrawAll = () => {
    const ids = new Set(homeSlimes().filter(sl => (sl.biomass || 0) >= 1).map(sl => sl.id));
    if (!ids.size) return;
    setBio(p => p + heldAtHome);
    setSlimes(list => list.map(x => (ids.has(x.id) ? { ...x, biomass: 0 } : x)));
    log(`Squeezed ${heldAtHome}🧬 out of ${ids.size} slime${ids.size === 1 ? '' : 's'}.`);
    markGuide('squeezed');
    sfx('squish');
  };

  /** Dissolve a slime for good: its held biomass plus its body, and the jelly back. */
  const reabsorb = (id) => {
    const sl = slimes.find(s => s.id === id);
    if (!sl || Object.values(exps).some(e => (e.slimes || []).some(s => s.id === id))) { log("Can't reabsorb a slime that's out in the wilds."); return; }
    const held = Math.floor(sl.biomass || 0);
    const body = (SLIME_TIERS[sl.tier]?.jellyCost || 5) * 10
      * (hasPassive('reclamation') ? 2 : 1);
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
    sfx('slurp');
    log(`${sl.name} melts back into the nucleus. +${held + body}🧬 (${held} carried, ${body} from the body)`);
  };

  const levelUpQueen = () => {
    const cost = queenLevelCost(queen.level);
    if (bio < cost) return;
    setBio(p => p - cost);
    setQueen(q => ({ ...q, level: q.level + 1 }));
    cue('levelUp');
    log(`👑 Queen level ${queen.level + 1}! +${SKILL_POINTS_PER_LEVEL} point for Instincts.`);
  };

  // Skill tree functions
  const purchaseSkill = (skillId, cost) => {
    setPurchasedSkills(prev => [...prev, skillId]);
    sfx('learn');
    log(`🌳 We learned ${Object.values(SKILL_TREES).find(t => t.skills[skillId])?.skills[skillId].name || skillId}.`);
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

  // ── Mossback ─────────────────────────────────────────────────────────────
  // `stall` is derived from the clock every render; the deals are rolled once
  // per visit, from what the player is carrying when the peddler turns up.
  const merchantUnlocked = isFeatureUnlocked('merchant', purchasedSkills);
  const stall = merchantUnlocked ? merchantVisit(merchant?.firstVisit, Date.now()) : null;

  useEffect(() => {
    if (!gameLoaded || !stall?.present) return;
    if (merchant?.deals && merchant.visit === stall.index) return;
    const firstVisit = merchant?.firstVisit || stall.arrivedAt;
    const deals = rollMerchantDeals({
      visit: stall.index * 7919 + (firstVisit % 104729),
      mats, mutagens, builds,
      mutationsUnlocked: hasPassive('mutagenesis'),
      caravanUnlocked: isFeatureUnlocked('caravan', purchasedSkills),
      buildingUnlocked: isFeatureUnlocked('building', purchasedSkills),
    });
    setMerchant({ firstVisit, visit: stall.index, deals, taken: [] });
    log(`${MERCHANT.icon} ${MERCHANT.name} has come up the path, shop and all.`);
    sfx('merchant');
  // Keyed on the visit only: a new stall per arrival, not per inventory change.
  }, [gameLoaded, stall?.index, stall?.present]);

  const takeDeal = (dealId) => {
    const deal = merchant?.deals?.find(d => d.id === dealId);
    if (!deal || !stall?.present || (merchant.taken || []).includes(dealId)) return;
    if (!canTakeDeal(deal, { mats, mutagens })) return;
    const move = (setter, item, sign) => setter(prev => {
      const n = (prev[item.id] || 0) + sign * item.qty;
      const next = { ...prev };
      if (n > 0) next[item.id] = n; else delete next[item.id];
      return next;
    });
    move(deal.give.kind === 'mutagen' ? setMutagens : setMats, deal.give, -1);
    move(deal.get.kind === 'mutagen' ? setMutagens : setMats, deal.get, +1);
    setMerchant(m => ({ ...m, taken: [...(m.taken || []), dealId] }));
    sfx('swap');
    log(`${MERCHANT.icon} Swapped ${deal.give.qty} ${deal.give.kind === 'mutagen' ? mutagenName(deal.give.id) : deal.give.id} for ${deal.get.qty} ${deal.get.kind === 'mutagen' ? mutagenName(deal.get.id) : deal.get.id}.`);
  };

  // ── Notifications ──────────────────────────────────────────────────────
  // Built when the app is backgrounded, from the save that was just written.
  planNotesRef.current = () => {
    const saved = loadGame();
    if (!saved) return;
    const now = Date.now();
    const notes = [];

    // Parties: the same seeded run the catch-up will do, up to 12 hours out.
    if (Object.keys(saved.exps || {}).length) {
      const forecast = calculateOfflineProgress(
        saved, bon, { ...combatContext(), rng: seededRng(saved.lastSave || 0) },
        (saved.lastSave || now) + 12 * 3600 * 1000,
      );
      forecast.results.events.forEach((e, i) => {
        const z = ZONES[e.zone];
        const w = WARDENS[e.zone];
        notes.push(e.type === 'wipe'
          ? { id: NOTE_IDS.expedition + i, at: e.at, title: `Mother, the party in ${z?.name} is down`,
              body: 'Everyone fell. They need to mend, and they dropped what they were carrying.' }
          : { id: NOTE_IDS.expedition + i, at: e.at, title: `${w?.icon || '👑'} It's over`,
              body: `The fight with ${w?.name || 'the Warden'} is done. Come and see how it went.` });
      });
    }

    // Mossback's next arrival.
    if (merchantUnlocked && merchant?.firstVisit) {
      const v = merchantVisit(merchant.firstVisit, now);
      notes.push({ id: NOTE_IDS.merchant, at: v.nextAt, title: '🐌 Mossback is here',
        body: 'It will stay for 5 hours, and it has things to swap.' });
    }

    // The first pool slime to fill up, and the first wounded slime to mend.
    let full = null;
    let mended = null;
    Object.entries(ranchAssignments).forEach(([ranchId, list]) => {
      const ranch = RANCH_TYPES[ranchId];
      const level = ranchBuildings[ranchId]?.level || 1;
      (list || []).forEach(a => {
        if (typeof a !== 'object' || !a.startTime) return;
        const sl = slimes.find(x => x.id === a.slimeId);
        if (!sl) return;
        if (ranch?.effect === 'recover') {
          const cycle = ranch.cycleTime * (1 - Math.min(0.5, (level - 1) * RANCH_UPGRADE_BONUSES.cycleReduction));
          const at = a.startTime + cycle * 1000;
          if (!mended || at < mended.at) mended = { at, name: sl.name };
        } else {
          const at = a.startTime + RANCH_MAX_ACCUMULATION_TIME * 1000;
          if (!full || at < full.at) full = { at, name: sl.name, pool: ranch?.name };
        }
      });
    });
    if (full) notes.push({ id: NOTE_IDS.poolFull, at: full.at, title: 'A pool is full',
      body: `${full.name} has soaked up all the ${full.pool} can give. Take it out to collect.` });
    if (mended) notes.push({ id: NOTE_IDS.mended, at: mended.at, title: `🩹 ${mended.name} is whole again`,
      body: 'Ready to go back out.' });

    scheduleNotes(notes);
  };

  // ── Dev panel ────────────────────────────────────────────────────────────
  // Everything a playtest needs to jump to any point in the game. Item lists
  // are derived from the data files, never typed out, so they cannot go stale.
  const devTools = {
    addBio: (n) => setBio(b => b + n),
    addLevels: (n) => setQueen(q => ({ ...q, level: q.level + n })),
    addPrisms: (n) => setPrisms(p => p + n),
    addMana: (n) => setMana(p => p + n),
    addAllMaterials: (n) => setMats(m => {
      const next = { ...m };
      Object.keys(MATERIAL_TABLE).forEach(k => { next[k] = (next[k] || 0) + n; });
      return next;
    }),
    addZoneMaterials: (zone, n) => setMats(m => {
      const next = { ...m };
      Object.entries(MATERIAL_TABLE).filter(([, i]) => i.zone === zone).forEach(([k]) => { next[k] = (next[k] || 0) + n; });
      return next;
    }),
    addAllMutagens: (n) => setMutagens(m => {
      const next = { ...m };
      Object.keys(MUTATION_LIBRARY).forEach(k => { next[k] = (next[k] || 0) + n; });
      return next;
    }),
    addSealsAndHearts: (n) => setMats(m => {
      const next = { ...m };
      ALL_SEALS.concat(ALL_HEARTS).forEach(k => { next[k] = (next[k] || 0) + n; });
      return next;
    }),
    learnAllSkills: () => {
      const all = Object.values(SKILL_TREES).flatMap(t => Object.keys(t.skills));
      const cost = Object.values(SKILL_TREES).flatMap(t => Object.values(t.skills)).reduce((n, sk) => n + (sk.cost || 0), 0);
      setPurchasedSkills(all);
      setQueen(q => ({ ...q, level: Math.max(q.level, cost) }));
    },
    setTendrils: (level) => setBuilds(b => {
      const next = { ...b };
      TENDRILS.forEach(t => { next[t.id] = Math.max(next[t.id] || 0, level); });
      return next;
    }),
    fellAllWardens: () => setWardenKills(k => {
      const next = { ...k };
      ZONE_ORDER.forEach(z => { next[z] = Math.max(1, next[z] || 0); });
      return next;
    }),
    buildEverything: () => {
      setBuilds(b => {
        const next = { ...b };
        Object.entries(BUILDINGS).forEach(([id, bd]) => {
          if (bd.category === 'tendril' || bd.category === 'research') return;
          next[id] = bd.max || 1;
        });
        return next;
      });
      setResearch(Object.keys(RESEARCH));
      setActiveRes(null);
      setRanchBuildings(Object.fromEntries(Object.keys(RANCH_TYPES).map(id => [id, { level: MAX_RANCH_LEVEL }])));
    },
    spawnFree: (tier) => spawn(tier, genName(), 0, { free: true }),
    healAll: () => setSlimes(list => list.map(sl => ({ ...sl, wounded: false, woundedAt: null }))),
    woundFirst: () => setSlimes(list => list.map((sl, i) => (i === 0 ? { ...sl, wounded: true, woundedAt: Date.now(), biomass: 0 } : sl))),
    giveTraits: () => setSlimes(list => list.map(sl => {
      const pool = Object.keys(SLIME_TRAITS).filter(t => !(sl.traits || []).includes(t) && t !== 'void');
      return pool.length ? { ...sl, traits: [...(sl.traits || []), pool[Math.floor(Math.random() * pool.length)]] } : sl;
    })),
    // Old Gullet: make the player eligible, hand the party its answer, and make
    // the next forest fight the one (it still needs a Digest slime in the party).
    wakeGullet: () => {
      setWardenKills(k => ({ ...k, forest: Math.max(1, k.forest || 0) }));
      setMonsterKills(k => ({ ...k, venusSlimetrap: Math.max(GULLET_TRAP_KILLS, k.venusSlimetrap || 0) }));
      setMutagens(m => ({ ...m, digest: (m.digest || 0) + 4 }));
      setSecrets(x => { const n = { ...x }; delete n.gullet; return n; });
      devForceSecret.current = true;
    },
    summonMerchant: () => {
      if (!purchasedSkills.includes('barter')) setPurchasedSkills(p => [...p, 'barter']);
      setMerchant(null);
    },
    resetCaravan: () => { setLastCaravan(0); setAmbush(null); },
    replayTutorials: () => { setSeenTutorials([]); setTutorialsOn(true); },
    skipTutorials: () => setSeenTutorials(TUTORIAL_ORDER),
    // Close the game "hours ago": every clock in the save is pushed back, then
    // the app restarts and runs its real offline catch-up.
    simulateOffline: (hours) => {
      const ms = hours * 3600 * 1000;
      const snap = snapshot();
      const back = (t) => (t ? t - ms : t);
      snap.ranchAssignments = Object.fromEntries(Object.entries(snap.ranchAssignments || {}).map(([id, list]) =>
        [id, list.map(a => ({ ...a, startTime: back(a.startTime) }))]));
      snap.slimes = snap.slimes.map(sl => ({ ...sl, woundedAt: back(sl.woundedAt) }));
      snap.lastManaUpdate = back(snap.lastManaUpdate);
      snap.lastCaravan = back(snap.lastCaravan);
      if (snap.merchant) snap.merchant = { ...snap.merchant, firstVisit: back(snap.merchant.firstVisit) };
      deletedRef.current = true;      // nothing may overwrite this save on the way out
      snapshotRef.current = null;
      saveGame(snap, Date.now() - ms);
      window.location.reload();
    },
  };

  // Everything the tutorial triggers need, and nothing else.
  const tutorialState = {
    tab,
    broodView,
    skillPoints: availableSkillPoints,
    wardenProvoked: ZONE_ORDER.some(z => wardenUnlocked(z, builds)),
    tendrilLevels: TENDRILS.reduce((n, t) => n + (builds[t.id] || 0), 0),
    woundedCount,
    mutagenKinds: Object.keys(mutagens).length,
    mutationsUnlocked: skillEffects.passives.includes('mutagenesis'),
    buildingUnlocked: isFeatureUnlocked('building', purchasedSkills),
    affinityUnlocked: skillEffects.passives.includes('affinity'),
    caravanUnlocked: isFeatureUnlocked('caravan', purchasedSkills),
    merchantHere: !!stall?.present,
    gulletBeaten: secrets.gullet === 'beaten',
    expeditionSlots,
    maxHeldBiomass: slimes.reduce((n, sl) => Math.max(n, sl.biomass || 0), 0),
    maxElementAffinity: slimes.reduce(
      (n, sl) => Math.max(n, ...Object.values(sl.elements || { a: 0 })), 0),
    totalKills: Object.values(monsterKills).reduce((n, c) => n + c, 0),
  };
  const activeTutorial = tutorialsOn ? nextTutorial(tutorialState, seenTutorials) : null;
  useEffect(() => { if (activeTutorial) sfx('glub'); }, [activeTutorial?.id]);
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
    log(`${ranch.icon} The ${ranch.name} is ready.`);
    sfx('build');
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
    log(`${slime.name} slips into the ${ranch.icon} ${ranch.name}.`);
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
    ranchRegen: getRanchBonuses().expeditionRegen,
    travelMult: bon.travel,
    roundMs: ROUND_MS,
    // Old Gullet rises only for a player who has beaten the forest Warden and
    // eaten a great many of its children, and only until it is beaten.
    secrets: {
      gullet: (wardenKills.forest || 0) > 0 && (monsterKills.venusSlimetrap || 0) >= GULLET_TRAP_KILLS
        && secrets.gullet !== 'beaten',
      force: devForceSecret.current,   // dev panel: next forest fight is Old Gullet
    },
    hiveAbilities: {
      sharedVigor:      isHiveAbilityActive('sharedVigor'),
      bountifulHarvest: isHiveAbilityActive('bountifulHarvest'),
      evolutionPulse:   isHiveAbilityActive('evolutionPulse'),
      swiftExpedition:  isHiveAbilityActive('swiftExpedition'),
      decoy:            isHiveAbilityActive('decoy'),
    },
  }), [combatBonuses, bon, builds, skillEffects, getRanchBonuses, activeHiveAbilities, wardenKills, monsterKills, secrets]);

  // ── Wardens ───────────────────────────────────────────────────────────────
  //
  // A Warden hunt is a separate kind of expedition: declared up front, one
  // fight, home either way. The party never blunders into one.

  /** Has this zone's Warden been beaten at least once? */
  const wardenBeaten = (zone) => (wardenKills[zone] || 0) > 0;

  /** Can a hunt be launched — tendril provoked, and not already out there? */
  const canHuntWarden = (zone) =>
    wardenUnlocked(zone, builds) && !exps[zone] && party.length > 0;

  const recordWardenKill = useCallback((zone, plus) => {
    setWardenKills(prev => ({ ...prev, [zone]: (prev[zone] || 0) + 1 }));
    cue('wardenDown');
    const w = WARDENS[zone];
    if (!w) return;
    log(plus
      ? `${w.name} falls again. Its Core is yours.`
      : `${w.name} falls for the first time. The way onward opens.`);
  }, []);

  const startExp = (zone, opts = {}) => {
    if (exps[zone] || !party.length) return;
    if (Object.keys(exps).length >= expeditionSlots) {
      log(`We can only have ${expeditionSlots} part${expeditionSlots > 1 ? 'ies' : 'y'} out at once.`);
      return;
    }
    const warden = opts.warden ? { zone, plus: wardenBeaten(zone) } : null;
    if (warden && !wardenUnlocked(zone, builds)) return;

    // A hunt is one fight. Everything else runs until you recall it.
    // null = until recalled. Never Infinity: it does not survive a save.
    const targetKills = warden ? 1 : null;

    const roster = party.map(id => slimes.find(s => s.id === id)).filter(Boolean);
    const exp = makeExpedition(zone, roster, targetKills, { ...combatContext(), warden });

    setExps(pr => ({ ...pr, [zone]: exp }));
    if (warden) setWardenTries(t => ({ ...t, [zone]: (t[zone] || 0) + 1 }));
    if (warden) cue('warden'); else sfx('depart');
    markGuide('sent');
    askPermission(); // asked once, the first time it is useful
    log(warden
      ? `${WARDENS[zone]?.icon || '👑'} We call out ${WARDENS[zone]?.name || 'the Warden'}. It answers.`
      : `${ZONES[zone].icon} Off to ${ZONES[zone].name}!`);
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
      markGuide('recalled');
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

      log(`${ZONES[zone].icon} The party is home from ${ZONES[zone].name}, with everything it carried.`);

      // Kills no longer unlock anything — they are the pity floor that
      // guarantees a mutagen eventually, however the rolls fall.
      Object.entries(summary.monsterKillCounts || {}).forEach(([monsterType, count]) => {
        if (count <= 0) return;
        setMonsterKills(prev => ({ ...prev, [monsterType]: (prev[monsterType] || 0) + count }));

        const md = MONSTER_TYPES[monsterType];
        // Same gate as the drop roll: no pity progress toward something the
        // player has not unlocked yet.
        if (!md?.mutation || !hasPassive('mutagenesis')) return;
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
      log(`💀 The party in ${ZONES[zone].name} was wiped. What they carried is gone.`);
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

    // Tendrils price each level separately (reach / provoke / root); everything
    // else charges the same cost at every level.
    const level = builds[id] || 0;
    const cost = nextLevelCost(id, level);
    if (!cost) return;

    // Handle different cost formats with skill discount
    const discount = getBuildingDiscount();
    const hasMats = cost.mats;
    const biomassCost = Math.floor((cost.biomass || 0) * discount);
    const matCosts = hasMats ? cost.mats : (!cost.biomass ? cost : {});

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
    const lv = b.levels?.[level];
    log(lv ? `${b.icon} ${b.name}: ${lv.title}. ${lv.desc}.` : `${b.icon} The ${b.name} is up!`);
    sfx('build');
  };

  /**
   * Dismantling (skill): tear a building back down for everything it cost.
   * Refunds the level actually being removed, which matters for Tendrils — each
   * of their levels has its own price. Tendril level 1 is never refundable:
   * giving back a Warden Seal would let a player un-reach a zone they have
   * already passed through, and the spine only runs one way.
   */
  const dismantle = (id) => {
    if (!hasPassive('dismantle')) return;
    const b = BUILDINGS[id];
    const level = builds[id] || 0;
    if (!b || level <= 0) return;
    if (b.category === 'tendril' && level <= 1) { log('The nucleus will not withdraw a tendril.'); return; }

    const cost = nextLevelCost(id, level - 1) || {};
    const biomassBack = Math.floor((cost.biomass || 0) * getBuildingDiscount());
    const matsBack = cost.mats || (typeof cost === 'object' && !cost.biomass ? cost : {});

    if (biomassBack > 0) setBio(p => p + biomassBack);
    if (Object.keys(matsBack).length) {
      setMats(p => {
        const n = { ...p };
        Object.entries(matsBack).forEach(([m, c]) => { n[m] = (n[m] || 0) + c; });
        return n;
      });
    }
    setBuilds(p => ({ ...p, [id]: level - 1 }));
    log(`🔨 ${b.name} pulled down. Everything it cost comes back.`);
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
      log(`🎯 Ambush over: ${summary.killed.length} down. +${banked.biomass}🧬${matStr ? `, ${matStr}` : ''}`);
    } else {
      log('🌫️ The caravan got clear before anything fell.');
    }
    summary.lost.forEach(sl => log(`🩹 ${sl.name} got hurt in the ambush and needs to mend.`));

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
      if (document.hidden) return; // backgrounded: the catch-up on return covers it
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
                const lazyBonus = slime.traits?.includes('lazy') ? 1 + traitValues('lazy').v / 100 : 1;
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
      if (document.hidden) return;
      const now = Date.now();
      const ctx = combatContext();
      const dt = (now - lastArenaTickRef.current) * speed * (ctx.hiveAbilities.swiftExpedition ? 1.5 : 1);
      lastArenaTickRef.current = now;

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
                  woundSlime(se.id, se.keepBiomass);
                  break;
                case 'bioReclaim':
                  setBio(b => b + se.amount);
                  break;
                case 'prism':
                  setPrisms(p => p + 1);
                  cue('rare');
                  break;
                case 'mutagen':
                  grantMutagen(se.mutation);
                  cue('rare');
                  break;
                case 'grantTrait':
                  setSlimes(list => list.map(sl =>
                    sl.id === se.id && !(sl.traits || []).includes(se.trait)
                      ? { ...sl, traits: [...(sl.traits || []), se.trait] }
                      : sl));
                  break;
                case 'wardenDown':
                  recordWardenKill(se.zone, se.plus);
                  break;
                case 'secretDown':
                  devForceSecret.current = false;
                  setSecrets(x => ({ ...x, [se.id]: 'beaten' }));
                  cue('wardenDown');
                  log('🥀 Old Gullet sinks back into the ground, and doesn\'t come up again.');
                  break;
                case 'expComplete':
                  stopExp(se.zone);
                  break;
                case 'expWipe':
                  if (se.salvage && Object.keys(se.salvage).length) {
                    setMats(m => {
                      const n = { ...m };
                      Object.entries(se.salvage).forEach(([mat, ct]) => { n[mat] = (n[mat] || 0) + ct; });
                      return n;
                    });
                    const n = Object.values(se.salvage).reduce((a, b) => a + b, 0);
                    log(se.decoy
                      ? `🎭 The decoy takes the blame. ${n} material${n === 1 ? '' : 's'} made it home.`
                      : `📦 Salvage Rites: ${n} material${n === 1 ? '' : 's'} made it home.`);
                  }
                  if (se.decoy) {
                    setActiveHiveAbilities(a => { const n = { ...a }; delete n.decoy; return n; });
                  }
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
      if (document.hidden) { lastAmbushTickRef.current = Date.now(); return; } // an ambush waits for you
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
    // Between fights the party is on the road; the arena scrolls the world past
    // them rather than leaving them standing in an empty field.
    traveling: selExpedition.phase === 'intermission',
  } : null;
  const expHud = selExpedition ? [
    { text: `💀 ${selExpedition.kills}${selExpedition.targetKills != null ? `/${selExpedition.targetKills}` : ''}`, color: '#f59e0b' },
    { text: `Round ${selExpedition.round}`, color: '#94a3b8' },
    selExpedition.phase === 'intermission'
      ? { text: '🚶 Traveling', color: '#22d3ee' }
      : selExpedition.enemy
        ? { text: `${selExpedition.enemy.name} ${Math.ceil(selExpedition.enemy.hp)}/${selExpedition.enemy.maxHp}`, color: '#ef4444' }
        : null,
  ].filter(Boolean) : null;

  const onAmbush = new Set((ambush?.slimes || []).map(c => c.id));
  // Field Dressing (skill): a wounded slime with no pool slot still mends, at
  // half speed. Without it, a wound is dead weight until a slot frees up.
  useEffect(() => {
    if (!gameLoaded || !hasPassive('fieldDressing')) return;
    const iv = setInterval(() => {
      const baseline = RANCH_TYPES.convalescencePool.cycleTime * 2 * 1000;
      setSlimes(list => {
        let changed = false;
        const next = list.map(sl => {
          if (!sl.wounded || !sl.woundedAt) return sl;
          if (Date.now() - sl.woundedAt < baseline) return sl;
          changed = true;
          return { ...sl, wounded: false, woundedAt: null };
        });
        return changed ? next : list;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [gameLoaded, skillEffects]);

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

  // Glub's first steps, until they are done or skipped.
  const guideStep = tutorialsOn && !guide.dismissed ? currentGuideStep({
    slimeCount: slimes.length,
    flags: guide.flags || {},
    bankedKills: Object.values(monsterKills).reduce((n, c) => n + c, 0),
    totalKills: Object.values(monsterKills).reduce((n, c) => n + c, 0)
      + Object.values(exps).reduce((n, e) => n + (e.kills || 0), 0),
    queenLevel: queen.level,
    skillsLearned: purchasedSkills.length,
  }) : null;
  const prevGuideStep = useRef(null);
  useEffect(() => {
    if (prevGuideStep.current && prevGuideStep.current !== guideStep?.id) sfx('learn');
    prevGuideStep.current = guideStep?.id || null;
  }, [guideStep?.id]);

  // Ambience plays only while you are watching a party in the wilds.
  const ambienceZone = tab === 'wilds' && exps[selZone] ? selZone : null;
  useEffect(() => { setAmbience(ambienceZone); }, [ambienceZone]);

  if (!gameLoaded) {
    return (
      <div style={{ fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', minHeight: '100vh', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🟢</div>
          <div>Loading Slime Queen...</div>
        </div>
      </div>
    );
  }

  return (
    <div onTouchStart={onTouch} onTouchEnd={onTouchEnd} style={{ fontFamily: 'system-ui', background: 'linear-gradient(135deg, #1a1a2e, #16213e)', minHeight: '100vh', color: '#e0e0e0' }}>
      {welcomeBack && <WelcomeBackModal data={welcomeBack} onClose={() => setWelcomeBack(null)} />}
      <Menu open={menu} close={() => setMenu(false)} tab={tab} setTab={setTab} tabs={visibleTabs} />
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 15px', background: 'rgba(0,0,0,0.3)', position: 'sticky', top: 0, zIndex: 100 }}>
        <button onClick={() => setMenu(true)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>☰</button>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>🧬 <strong>{Math.floor(bio)}</strong></div>
          <div
            title={`Plasm: how many of us the nucleus can hold. ${slimes.length} slime${slimes.length === 1 ? '' : 's'} now${woundedCount ? `, ${woundedCount} wounded and still taking up room` : ''}. Queen levels, the Slime Pit and Instincts raise it.`}
            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}
          >
            🫧 <strong>{freeJelly}/{maxJelly}</strong>
            {woundedCount > 0 && <span style={{ color: '#f87171', fontSize: 10 }}>🩹{woundedCount}</span>}
          </div>
          <div title="Musk. Pheromones cost it, and every slime makes 1 an hour." style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>🔮 <strong>{mana}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 12 }}>💎 <strong>{prisms}</strong></div>
        </div>
        <button onClick={() => setDev(!dev)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>🛠️</button>
      </header>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'rgba(0,0,0,0.2)' }}>
        {visibleTabs.map((t) => <div key={t.id} onClick={() => setTab(t.id)} style={{ width: 8, height: 8, borderRadius: '50%', background: tab === t.id ? '#ec4899' : 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />)}
      </div>
      
      <main style={{ padding: 15, paddingBottom: 'calc(110px + env(safe-area-inset-bottom))' }}>
        <h2 style={{ margin: '0 0 15px', fontSize: 20 }}>{tabs.find(t => t.id === tab)?.icon} {tabs.find(t => t.id === tab)?.label}</h2>

        {guideStep && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, rgba(168,85,247,0.18), rgba(99,102,241,0.12))', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 10, padding: '9px 12px', marginBottom: 14 }}>
            <SlimeSprite tier="basic" size={30} />
            <div style={{ flex: 1, fontSize: 12, lineHeight: 1.4 }}>
              <div style={{ fontSize: 10, opacity: 0.6 }}>Glub · first steps {GUIDE_STEPS.indexOf(guideStep) + 1}/{GUIDE_STEPS.length}</div>
              {guideStep.text}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {tab !== guideStep.tab && (
                <button onClick={() => { setTab(guideStep.tab); if (guideStep.tab === 'brood') { setBroodView('roster'); setSelSlime(null); } }}
                  style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, border: 'none', fontWeight: 'bold', cursor: 'pointer', background: '#a855f7', color: '#fff', whiteSpace: 'nowrap' }}>
                  Show me
                </button>
              )}
              <button onClick={() => setGuide(g => ({ ...g, dismissed: true }))}
                style={{ padding: '3px 8px', fontSize: 10, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent', color: '#9ca3af' }}>
                skip
              </button>
            </div>
          </div>
        )}
        
        {tab === 'hive' && (
          <div>
            <div style={{ background: 'rgba(236,72,153,0.1)', borderRadius: 12, marginBottom: 20, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 15 }}>
                <SlimeSprite tier="royal" size={80} isQueen />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 'bold' }}>The Slime Queen</div>
                  <div style={{ fontSize: 14, opacity: 0.7, marginBottom: 10 }}>Level {queen.level}</div>
                  <button
                    onClick={levelUpQueen}
                    disabled={bio < queenLevelCost(queen.level)}
                    style={{
                      padding: '10px 20px',
                      background: bio >= queenLevelCost(queen.level) ? 'linear-gradient(135deg, #ec4899, #f472b6)' : 'rgba(100,100,100,0.5)',
                      border: 'none',
                      borderRadius: 8,
                      color: '#fff',
                      fontWeight: 'bold',
                      cursor: bio >= queenLevelCost(queen.level) ? 'pointer' : 'not-allowed',
                      fontSize: 12
                    }}
                  >
                    ⬆️ Level Up ({queenLevelCost(queen.level)}🧬)
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
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>🔮 Pheromones</span>
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
                    +{slimes.length} musk an hour (1 per slime). Release a pheromone to change how the nucleus works for a while.
                  </div>

                  {/* Active Abilities */}
              {Object.keys(activeHiveAbilities).length > 0 && (
                <div style={{ background: 'rgba(74,222,128,0.1)', borderRadius: 8, padding: 12, marginBottom: 15 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#4ade80' }}>✨ In the air</div>
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
                        <span style={{ fontSize: 12, color: canAfford ? '#a855f7' : '#ef4444' }}>🔮 {ability.cost}</span>
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 8 }}>{ability.desc}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, opacity: 0.5 }}>Lasts {Math.round(ability.duration / 3600000)}h</span>
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
                          {isActive ? 'In the air' : 'Release'}
                        </button>
                      </div>
                    </div>
                  );
                })}
                {Object.entries(HIVE_ABILITIES).filter(([id]) => !isPheromoneUnlocked(id, purchasedSkills)).length > 0 && (
                  <div style={{ opacity: 0.5, fontSize: 11, textAlign: 'center', padding: 10 }}>
                    🔒 {Object.entries(HIVE_ABILITIES).filter(([id]) => !isPheromoneUnlocked(id, purchasedSkills)).length} more pheromones to learn in Instincts
                  </div>
                )}
                  </div>
                </div>
              )}
            </div>

            <Merchant stall={stall} merchant={merchant} mats={mats} mutagens={mutagens} onTake={takeDeal} />

            {/* Buildings — hidden entirely until Calcified Frame. A locked panel
                advertises what you are missing; an absent one lets the screen
                grow, which is the feeling this ladder is built around. */}
            {isFeatureUnlocked('building', purchasedSkills) && (
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
                      // Tendrils price every level differently, so the panel has
                      // to quote the NEXT level rather than a single flat cost.
                      const lvl = builds[k] || 0;
                      const cost = isResearch ? b.cost : (nextLevelCost(k, lvl) || { biomass: 0, mats: {} });
                      const hasMats = !isResearch && cost.mats;
                      const discount = getBuildingDiscount();
                      const biomassCost = Math.floor((isResearch ? b.cost : (cost.biomass || 0)) * discount);
                      const matCosts = hasMats ? cost.mats : (!isResearch && !cost.biomass ? cost : {});
                      const nextLvl = b.levels?.[lvl];

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
                            <div style={{ fontWeight: 'bold' }}>
                              {b.name}
                              {b.levels && <span style={{ fontSize: 11, opacity: 0.6, fontWeight: 'normal' }}> · {lvl}/{b.max}</span>}
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                              {nextLvl ? `Next, ${nextLvl.title}: ${nextLvl.desc}` : (b.levels ? b.levels[b.levels.length - 1].desc : b.desc)}
                            </div>
                            {isResearch && b.time && (
                              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Build time: {Math.floor(b.time / 60)}:{(b.time % 60).toString().padStart(2, '0')}</div>
                            )}
                          </div>
                          {!isResearch && !b.levels && <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 18 }}>x{builds[k] || 0}</span>}
                          {hasPassive('dismantle') && !isResearch && lvl > 0
                            && !(b.category === 'tendril' && lvl <= 1) && (
                            <button
                              onClick={(e) => { e.stopPropagation(); dismantle(k); }}
                              title="Dismantle for a full refund"
                              style={{ marginLeft: 8, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 6, color: '#fca5a5', cursor: 'pointer', fontSize: 11, padding: '3px 8px' }}
                            >🔨</button>
                          )}
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
            )}

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
                    Nothing yet. Monsters drop things when we eat them.
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
                affinityUnlocked={hasPassive('affinity')}
                onApplyMutagen={applyMutagen}
                onWithdraw={withdrawBiomass}
              />
              {!selExp && (
                <div style={{ marginTop: 22, textAlign: 'center' }}>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Reabsorb ${selSl.name}? It melts back into the nucleus for good. You get its biomass back, but the slime is gone.`)) return;
                      reabsorb(selSl.id); setSelSlime(null);
                    }}
                    style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(239,68,68,0.45)', borderRadius: 6, color: '#fca5a5', fontSize: 11, cursor: 'pointer' }}
                  >
                    Reabsorb this slime…
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* The Spawn is every slime you have: the ones on their feet and the ones mending. */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[
                  { id: 'roster', icon: '🟢', label: 'Roster', badge: slimes.length },
                  // Absent until Cultivation Pools, not greyed out: the switch
                  // appearing is the moment, and a lone Roster button reads as
                  // a heading rather than a disabled choice.
                  ...(isFeatureUnlocked('ranch', purchasedSkills)
                    ? [{ id: 'pools', icon: '🏠', label: 'Pools', badge: woundedCount || undefined }]
                    : []),
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
                <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>The Pools</div>
                <div style={{ opacity: 0.7, marginBottom: 15 }}>🔒 Learn Cultivation Pools in Instincts</div>
              </div>
            ))}

              {broodView === 'roster' && (<>
              <SlimeForge biomass={bio} freeJelly={freeJelly} tiers={unlockedTiers} onSpawn={spawn} mutationsUnlocked={hasPassive('mutagenesis')} />
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

              {heldAtHome > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, fontSize: 11 }}>
                    <div style={{ fontWeight: 'bold', color: '#4ade80', fontSize: 13 }}>🧬 {heldAtHome} biomass in the slimes at home</div>
                    <div style={{ opacity: 0.7, marginTop: 2 }}>Carrying it makes them stronger, but they spill it all if they fall.</div>
                  </div>
                  <button onClick={withdrawAll} style={{ padding: '9px 14px', borderRadius: 8, border: 'none', fontWeight: 'bold', cursor: 'pointer', background: 'linear-gradient(135deg, #4ade80, #22d3ee)', color: '#1a1a2e', whiteSpace: 'nowrap' }}>
                    Squeeze all
                  </button>
                </div>
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
              ) : <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}><div style={{ fontSize: 48 }}>🥚</div><div>No slimes yet. Bud one above!</div></div>
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
                        {summary.survivors.length > 0 ? '✅ Home safe' : '💀 Wiped'}: {summary.zone}
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
                const ok = zoneReached(k, builds);
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
                  {!ok && (
                    <div style={{ fontSize: 9, color: '#f59e0b' }} title={
                      prerequisiteZone(k)
                        ? `Beat ${WARDENS[prerequisiteZone(k)].name} for the ${WARDENS[prerequisiteZone(k)].seal}, then grow the ${BUILDINGS[tendrilFor(k)].name}`
                        : 'Grow this zone\'s Tendril'
                    }>
                      🔒 {prerequisiteZone(k) ? WARDENS[prerequisiteZone(k)].seal : 'Tendril'}
                    </div>
                  )}
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
              <button onClick={() => { sfx('recall'); stopExp(selZone); }} style={{ width: '100%', marginTop: 15, padding: 12, background: 'linear-gradient(135deg, #ef4444, #f59e0b)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>🛑 Call them home</button>
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
                  {!avail.length && slimes.length > 0 && <div style={{ opacity: 0.5, fontSize: 11 }}>Everyone's busy</div>}
                </div>
                <button onClick={() => startExp(selZone)} disabled={!party.length} style={{ width: '100%', padding: 12, background: party.length ? 'linear-gradient(135deg, #4ade80, #22d3ee)' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: party.length ? 'pointer' : 'not-allowed' }}>⚔️ Send them</button>

                {/* The Warden is opted into here, never met by accident. */}
                {(() => {
                  const w = WARDENS[selZone];
                  if (!w) return null;
                  const provoked = wardenUnlocked(selZone, builds);
                  const beaten = wardenBeaten(selZone);
                  const ready = provoked && party.length > 0;
                  return (
                    <button
                      onClick={() => ready && startExp(selZone, { warden: true })}
                      disabled={!ready}
                      title={provoked
                        ? `${beaten ? `${w.name}, Rekindled` : w.name}: one fight, then the party comes home`
                        : `Grow the ${BUILDINGS[tendrilFor(selZone)].name} to Provoke, on The Nucleus`}
                      style={{
                        width: '100%', marginTop: 8, padding: 12, borderRadius: 8, color: '#fff',
                        fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.5)',
                        background: ready ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'rgba(70,60,40,0.5)',
                        cursor: ready ? 'pointer' : 'not-allowed', opacity: provoked ? 1 : 0.55,
                      }}
                    >
                      {provoked ? `${w.icon} Challenge ${beaten ? `${w.name}, Rekindled` : w.name}` : `🔒 ${w.name}`}
                      <div style={{ fontSize: 10, fontWeight: 'normal', opacity: 0.85, marginTop: 2 }}>
                        {!provoked
                          ? `Needs ${BUILDINGS[tendrilFor(selZone)].name} · Provoke`
                          : beaten
                            ? `Drops ${w.heart}`
                            : `Drops the ${w.seal}, which opens the next place`}
                      </div>
                    </button>
                  );
                })()}
              </div>
            )}
            {Object.keys(exps).length > 1 && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Parties out</div>
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
            wardenKills={wardenKills}
            wardenTries={wardenTries}
            secrets={secrets}
            mutationsUnlocked={hasPassive('mutagenesis')}
            affinityUnlocked={hasPassive('affinity')}
            seenTutorials={seenTutorials}
          />
        )}

        {tab === 'settings' && (
          <SettingsTab
            onSave={manualSave}
            onDelete={handleDelete}
            onExport={exportBackup}
            onImport={importBackup}
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

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.95)', borderTop: '1px solid rgba(255,255,255,0.1)',
        maxHeight: 70, overflowY: 'auto',
        padding: 8,
        // Fixed elements are positioned against the viewport rather than the
        // safe-area-padded body, so this bar has to clear the gesture pill itself.
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom))',
      }}>
        <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 4 }}>📜 Log</div>
        {logs.slice(-4).reverse().map((l, i) => <div key={i} style={{ fontSize: 10, padding: '2px 0', opacity: i === 0 ? 1 : 0.6 }}><span style={{ opacity: 0.4, marginRight: 6 }}>{l.t}</span>{l.m}</div>)}
      </div>

      <TutorialModal
        tutorial={activeTutorial}
        onDismiss={dismissTutorial}
        onDisableAll={() => { dismissTutorial(); setTutorialsOn(false); }}
      />

      {dev && (
        <DevPanel
          tools={devTools}
          speed={speed}
          setSpeed={setSpeed}
          onClose={() => setDev(false)}
        />
      )}
    </div>
  );
}
