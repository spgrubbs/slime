import React, { useState, useEffect, useCallback, useRef } from 'react';

// Data imports
import {
  TICK_RATE,
  BASE_SLIME_COST,
  TRAIT_MAGICKA_COST,
  BASE_MAGICKA,
  BATTLE_TICK_SPEED,
  AUTO_SAVE_INTERVAL,
  TOWER_DEFENSE_COOLDOWN,
  TD_TICK_SPEED,
  ELEMENTS,
} from './data/gameConstants.js';

import { STAT_INFO, SLIME_TIERS } from './data/slimeData.js';
import { MUTATION_LIBRARY, TRAIT_LIBRARY, STATUS_EFFECTS } from './data/traitData.js';
import { MONSTER_TYPES } from './data/monsterData.js';
import { ZONES, EXPLORATION_EVENTS } from './data/zoneData.js';
import { BUILDINGS, RESEARCH } from './data/buildingData.js';
import { HUMAN_TYPES, TD_WAVES } from './data/towerDefenseData.js';

// Utility imports
import { genName, genId, formatTime, calculateElementalDamage, createDefaultElements, canGainElement, calculateElementGain } from './utils/helpers.js';
import { saveGame, loadGame, deleteSave } from './utils/saveSystem.js';

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
} from './components';

// ============== OFFLINE PROGRESS ==============
const calculateOfflineProgress = (saved, bonuses) => {
  const now = Date.now();
  const offlineMs = now - (saved.lastSave || now);
  const offlineSec = Math.min(offlineMs / 1000, 24 * 3600); // Cap at 24h
  
  if (offlineSec < 60) return { hadProgress: false };

  const results = {
    biomassGained: 0,
    matsGained: {},
    traitsGained: {},
    slimesLost: [],
    monstersKilled: 0,
    expeditionsWiped: [],
    researchCompleted: null,
  };

  let { bio, slimes, exps, mats, traits, activeRes, research } = JSON.parse(JSON.stringify(saved));
  const battleTicks = Math.floor(offlineSec / 2.5);

  // Simulate expeditions
  Object.entries(exps || {}).forEach(([zone, exp]) => {
    const zd = ZONES[zone];
    if (!zd || !exp.party?.length) return;

    let ticks = battleTicks;
    let monster = exp.monster;

    while (ticks > 0 && exp.party.some(p => p.hp > 0)) {
      if (!monster || monster.hp <= 0) {
        const mt = zd.monsters[Math.floor(Math.random() * zd.monsters.length)];
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
        let dmg = sl.stats.firmness + sl.level * 1.2;
        if (sl.pass?.includes('ferocity')) dmg *= 1.15;
        if (Math.random() < 0.1 + sl.stats.slipperiness * 0.01) dmg *= 1.5;
        monster.hp -= Math.floor(dmg);
      });

      if (monster.hp <= 0) {
        results.monstersKilled++;
        exp.kills = (exp.kills || 0) + 1;
        const bioG = Math.floor(md.biomass * (bonuses?.bio || 1));
        results.biomassGained += bioG;
        bio += bioG;
        if (Math.random() < 0.2) {
          const mat = md.mats[Math.floor(Math.random() * md.mats.length)];
          results.matsGained[mat] = (results.matsGained[mat] || 0) + 1;
          mats[mat] = (mats[mat] || 0) + 1;
        }
        if (Math.random() < md.drop) {
          results.traitsGained[md.trait] = (results.traitsGained[md.trait] || 0) + 1;
          traits[md.trait] = (traits[md.trait] || 0) + 1;
        }
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
        living.forEach(p => {
          const sl = slimes.find(s => s.id === p.id);
          if (!sl) return;
          sl.xp += md.diff * 3 + 2;
          while (sl.xp >= sl.level * 50) { sl.xp -= sl.level * 50; sl.level++; }
        });
        monster = null;
      } else {
        const tgt = living[Math.floor(Math.random() * living.length)];
        const tgtSl = slimes.find(s => s.id === tgt.id);
        let inc = md.dmg;
        if (Math.random() < 0.05 + (tgtSl?.stats.slipperiness || 0) * 0.01) inc = 0;
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
    newState: { bio, slimes, exps, mats, traits, activeRes, research, lastSave: now }
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
  // Mutation system - tracks kills per monster type and unlocked mutations
  const [monsterKills, setMonsterKills] = useState({});
  const [unlockedMutations, setUnlockedMutations] = useState([]);

  const [tab, setTab] = useState(0);
  const [menu, setMenu] = useState(false);
  const [dev, setDev] = useState(false);
  const [selZone, setSelZone] = useState('forest');
  const [party, setParty] = useState([]);
  const [selSlime, setSelSlime] = useState(null);
  const touchX = useRef(null);

  const tabs = [
    { id: 0, icon: '👑', label: 'Queen' },
    { id: 1, icon: '🟢', label: 'Slimes', badge: slimes.length },
    { id: 2, icon: '🗺️', label: 'Explore' },
    { id: 3, icon: '🎯', label: 'Defense' },
    { id: 4, icon: '📦', label: 'Inventory' },
    { id: 5, icon: '📖', label: 'Compendium' },
    { id: 6, icon: '⚙️', label: 'Settings' },
  ];

  const maxMag = BASE_MAGICKA + (builds.slimePit || 0) * 10;
  const usedMag = slimes.reduce((s, sl) => s + sl.magCost, 0);
  const freeMag = maxMag - usedMag;
  const unlockedTiers = Object.keys(SLIME_TIERS).filter(t => t === 'elite' ? builds.hatchery > 0 : !SLIME_TIERS[t].unlockLevel || queen.level >= SLIME_TIERS[t].unlockLevel);
  const bon = {
    bio: 1 + (research.includes('efficientDigestion') ? 0.2 : 0),
    xp: 1 + (research.includes('enhancedAbsorption') ? 0.25 : 0),
    spd: 1 + (research.includes('swiftSlimes') ? 0.2 : 0),
    hp: 1 + (research.includes('slimeVitality') ? 0.15 : 0),
    res: 1 + (builds.researchLab || 0) * 0.25,
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
        setMonsterKills(offline.newState.monsterKills || saved.monsterKills || {});
        setUnlockedMutations(offline.newState.unlockedMutations || saved.unlockedMutations || []);
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
      const state = { queen, bio, mats, slimes, exps, builds, research, activeRes, lastTowerDefense, monsterKills, unlockedMutations, lastSave: Date.now() };
      if (saveGame(state)) {
        setLastSave(Date.now());
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [gameLoaded, queen, bio, mats, slimes, exps, builds, research, activeRes, lastTowerDefense, monsterKills, unlockedMutations]);

  const manualSave = () => {
    const state = { queen, bio, mats, slimes, exps, builds, research, activeRes, lastTowerDefense, monsterKills, unlockedMutations, lastSave: Date.now() };
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
    if (bio < bioCost || freeMag < magCost) return;
    const baseStats = { firmness: Math.floor(5 * td.statMultiplier), slipperiness: Math.floor(5 * td.statMultiplier), viscosity: Math.floor(5 * td.statMultiplier) };
    const pass = [];
    const startElements = createDefaultElements();
    // Apply mutation bonuses
    selMutations.forEach(id => {
      const m = MUTATION_LIBRARY[id];
      if (m) {
        baseStats[m.stat] += m.bonus;
        pass.push(m.passive);
        // Apply elementBonus from mutation
        if (m.elementBonus) {
          Object.entries(m.elementBonus).forEach(([elem, bonus]) => {
            startElements[elem] = Math.min(100, (startElements[elem] || 0) + bonus);
          });
        }
      }
    });
    const maxHp = Math.floor((td.baseHp + baseStats.firmness * 3) * bon.hp);
    setSlimes(p => [...p, {
      id: genId(),
      name,
      tier,
      biomass: 0,
      mutations: selMutations,  // Combat abilities from MUTATION_LIBRARY
      traits: [],               // Personality traits (Phase 3)
      pass,
      baseStats,
      maxHp,
      magCost,
      elements: startElements,
      primaryElement: null,
    }]);
    setBio(p => p - bioCost);
    // Mutations are unlimited once unlocked - no inventory to decrease
    log(`${name} emerges!`);
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
    log(`Queen leveled up to ${queen.level + 1}!`);
  };

  const [expDuration, setExpDuration] = useState('10'); // '10', '100', 'infinite'
  const [expSummaries, setExpSummaries] = useState([]); // Array of expedition summaries
  const [expandedSections, setExpandedSections] = useState({ research: false, buildings: false }); // Collapsible sections
  const [queenSlimeModal, setQueenSlimeModal] = useState(null); // Slime ID for modal on queen screen

  // Helper function to calculate current stats based on biomass
  const getSlimeStats = (slime) => {
    if (!slime) return { firmness: 0, slipperiness: 0, viscosity: 0 };

    // Backward compatibility: if slime has old stats property, use it directly
    if (slime.stats && !slime.baseStats) {
      return slime.stats;
    }

    // If no baseStats, return defaults
    if (!slime.baseStats) {
      const tier = SLIME_TIERS[slime.tier];
      return {
        firmness: Math.floor(5 * (tier?.statMultiplier || 1)),
        slipperiness: Math.floor(5 * (tier?.statMultiplier || 1)),
        viscosity: Math.floor(5 * (tier?.statMultiplier || 1)),
      };
    }

    const tier = SLIME_TIERS[slime.tier];
    const biomass = slime.biomass || 0;
    const percentBonus = biomass / tier.biomassPerPercent; // How many percent increases
    const multiplier = 1 + (percentBonus / 100); // Convert to multiplier (1% = 0.01)

    return {
      firmness: Math.floor(slime.baseStats.firmness * multiplier),
      slipperiness: Math.floor(slime.baseStats.slipperiness * multiplier),
      viscosity: Math.floor(slime.baseStats.viscosity * multiplier),
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
    const exp = exps[zone];
    if (!exp) return;

    // Create summary
    const summary = {
      zone: ZONES[zone].name,
      kills: exp.kills,
      materials: exp.materials,
      survivors: exp.party.filter(p => p.hp > 0),
      totalParty: exp.party.length,
      biomassDistributed: exp.party.reduce((sum, p) => sum + (p.biomassGained || 0), 0),
    };

    // Add materials to inventory if any slimes survived
    if (summary.survivors.length > 0) {
      setMats(m => {
        const n = { ...m };
        Object.entries(exp.materials).forEach(([mat, count]) => {
          n[mat] = (n[mat] || 0) + count;
        });
        return n;
      });

      // Distribute biomass and element gains to surviving slimes
      setSlimes(slimes => slimes.map(sl => {
        const partyMember = exp.party.find(p => p.id === sl.id);
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

      // Apply monster kill counts and check for mutation unlocks
      Object.entries(exp.monsterKillCounts || {}).forEach(([monsterType, count]) => {
        if (count <= 0) return;

        setMonsterKills(prev => {
          const newTotal = (prev[monsterType] || 0) + count;
          const md = MONSTER_TYPES[monsterType];

          // Check if this monster has an associated mutation
          if (md && md.trait) {
            const mutation = MUTATION_LIBRARY[md.trait];
            if (mutation && newTotal >= mutation.requiredKills) {
              // Check if not already unlocked
              setUnlockedMutations(unlocked => {
                if (!unlocked.includes(md.trait)) {
                  log(`🧬 Mutation Unlocked: ${mutation.name}!`);
                  bLog(zone, `🧬 NEW MUTATION: ${mutation.icon} ${mutation.name}!`, mutation.color);
                  return [...unlocked, md.trait];
                }
                return unlocked;
              });
            }
          }

          return { ...prev, [monsterType]: newTotal };
        });
      });

      log(`Recalled from ${ZONES[zone].name}! Materials secured.`);
    } else {
      log(`Party wiped in ${ZONES[zone].name}! Materials lost.`);
    }

    setExpSummaries(s => [...s, { ...summary, id: Date.now() }]);
    setExps(p => { const n = { ...p }; delete n[zone]; return n; });
    setBLogs(p => { const n = { ...p }; delete n[zone]; return n; });
  };

  const startRes = (id) => {
    const r = RESEARCH[id];
    if (!r || bio < r.cost || activeRes) return;
    setBio(p => p - r.cost);
    setActiveRes({ id, prog: 0 });
    log(`Researching ${r.name}...`);
  };

  const build = (id) => {
    const b = BUILDINGS[id];
    if (!b || !Object.entries(b.cost).every(([m, c]) => (mats[m] || 0) >= c)) return;
    if (b.max && (builds[id] || 0) >= b.max) return;
    setMats(p => { const n = { ...p }; Object.entries(b.cost).forEach(([m, c]) => { n[m] -= c; if (n[m] <= 0) delete n[m]; }); return n; });
    setBuilds(p => ({ ...p, [id]: (p[id] || 0) + 1 }));
    log(`Built ${b.name}!`);
  };

  // Tower Defense Functions
  const tdSlots = 4 + (builds.defenseSlot || 0);
  const tdAvailable = () => Date.now() - lastTowerDefense >= TOWER_DEFENSE_COOLDOWN;

  const startTowerDefense = (deployedSlimes) => {
    const wave = TD_WAVES[0];
    const humans = [];
    for (let i = 0; i < wave.humans; i++) {
      humans.push({
        id: genId(),
        type: 'warrior',
        hp: HUMAN_TYPES.warrior.hp * wave.hpMultiplier,
        maxHp: HUMAN_TYPES.warrior.hp * wave.hpMultiplier,
        position: 0, // 0 to 100, moving right to left
        speed: HUMAN_TYPES.warrior.speed,
      });
    }

    setTowerDefense({
      phase: 'battle', // 'setup', 'battle', 'victory', 'defeat'
      currentWave: 0,
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

    if (victory) {
      // Calculate rewards
      TD_WAVES.forEach(w => {
        rewards.biomass += w.reward.biomass;
        Object.entries(w.reward.mats).forEach(([m, c]) => {
          rewards.materials[m] = (rewards.materials[m] || 0) + c;
        });
      });
      setBio(p => p + rewards.biomass);
      setMats(p => {
        const n = { ...p };
        Object.entries(rewards.materials).forEach(([m, c]) => {
          n[m] = (n[m] || 0) + c;
        });
        return n;
      });
      log(`🎉 Victory! +${rewards.biomass} biomass, materials gained!`);
    } else {
      // Lose half biomass
      losses.biomass = Math.floor(bio / 2);
      setBio(p => Math.max(0, p - losses.biomass));
      log(`💀 Defeat! Lost ${losses.biomass} biomass!`);
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
      const dt = ((now - lastTick) / TICK_RATE) * speed;
      setLastTick(now);

      setExps(prev => {
        const next = { ...prev };
        Object.entries(next).forEach(([zone, exp]) => {
          const zd = ZONES[zone];
          // Only spawn new monsters if target not yet reached
          if (!exp.monster && exp.kills < exp.targetKills && !exp.exploring) {
            // 30% chance to trigger exploration event before spawning monster
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
              }
            } else {
              // Spawn monster immediately
              const mt = zd.monsters[Math.floor(Math.random() * zd.monsters.length)];
              const md = MONSTER_TYPES[mt];
              exp.monster = { type: mt, hp: md.hp, maxHp: md.hp, dmg: md.dmg, status: [] };
              bLog(zone, `A ${md.name} appears!`, '#22d3ee');
              exp.turn = 0;
            }
          } else if (exp.exploring) {
            // After exploration event, spawn the monster
            exp.exploring = false;
            const mt = zd.monsters[Math.floor(Math.random() * zd.monsters.length)];
            const md = MONSTER_TYPES[mt];
            exp.monster = { type: mt, hp: md.hp, maxHp: md.hp, dmg: md.dmg, status: [] };
            bLog(zone, `A ${md.name} appears!`, '#22d3ee');
            exp.turn = 0;
          }

          exp.timer += dt * 100;
          if (exp.timer >= BATTLE_TICK_SPEED / speed) {
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
                  if (sl.pass?.includes('ferocity')) dmg *= 1.15;
                  const critCh = 0.05 + stats.slipperiness * 0.01 + (sl.pass?.includes('trickster') ? 0.08 : 0);
                  if (sl.pass?.includes('ambush') && !p.usedAmbush) { crit = true; p.usedAmbush = true; }
                  else if (Math.random() < critCh) crit = true;
                  if (crit) dmg *= (1.5 + (sl.pass?.includes('crushing') ? 0.3 : 0));
                  dmg = Math.floor(dmg * (1 + bon.spd * 0.1));
                  // Apply elemental damage modifier (slime element vs monster element)
                  const preDmg = dmg;
                  dmg = calculateElementalDamage(dmg, sl.primaryElement, md.element);
                  const elementBonus = dmg !== preDmg;
                  mon.hp -= dmg;
                  if (sl.pass?.includes('fireBreath') && !(mon.status || []).some(s => s.type === 'burn') && Math.random() < 0.3 + stats.viscosity * 0.02) { mon.status.push({ type: 'burn', dur: STATUS_EFFECTS.burn.dur }); bLog(zone, `${sl.name} burns ${md.name}! 🔥`, '#f97316'); }
                  if (sl.pass?.includes('poison') && !(mon.status || []).some(s => s.type === 'poison') && Math.random() < 0.35 + stats.viscosity * 0.02) { mon.status.push({ type: 'poison', dur: STATUS_EFFECTS.poison.dur }); bLog(zone, `${sl.name} poisons ${md.name}! 🧪`, '#22c55e'); }
                  exp.animSlime = p.id; exp.slimeAnim = 'attack'; exp.monAnim = 'hurt';
                  // Show element effectiveness in battle log
                  let dmgMsg = `${sl.name} ${crit ? '💥CRITS' : 'hits'} for ${Math.floor(dmg)}!`;
                  if (elementBonus && dmg > preDmg) dmgMsg += ' ⚡ Super effective!';
                  else if (elementBonus && dmg < preDmg) dmgMsg += ' 💫 Not effective...';
                  bLog(zone, dmgMsg, crit ? '#f59e0b' : elementBonus && dmg > preDmg ? '#4ade80' : elementBonus ? '#94a3b8' : '#4ade80');
                }
              }
              if (mon.hp <= 0) {
                exp.kills++;
                // Track kills per monster type for mutation unlock progress
                exp.monsterKillCounts = exp.monsterKillCounts || {};
                exp.monsterKillCounts[mon.type] = (exp.monsterKillCounts[mon.type] || 0) + 1;

                let bioG = Math.floor(md.biomass * bon.bio);
                living.forEach(p => { const sl = slimes.find(s => s.id === p.id); if (sl?.pass?.includes('manaLeech')) bioG = Math.floor(bioG * 1.1); });

                // Distribute biomass evenly among living party members
                const bioPerSlime = bioG / living.length;
                living.forEach(p => {
                  p.biomassGained = (p.biomassGained || 0) + bioPerSlime;
                });
                bLog(zone, `${md.name} defeated! +${Math.floor(bioPerSlime)}🧬 each`, '#4ade80');

                // Material drops (50% chance) - add to expedition materials
                if (Math.random() < 0.5) {
                  const mat = md.mats[Math.floor(Math.random() * md.mats.length)];
                  exp.materials[mat] = (exp.materials[mat] || 0) + 1;
                  bLog(zone, `Found ${mat}! 📦`, '#f59e0b');
                }

                // Note: Mutations are now learned through kill counts, not drops
                // Mutation progress is tracked via monsterKillCounts and applied on recall

                // Element accumulation - slimes gain element affinity from zone
                if (zd.element && zd.elementGainRate > 0) {
                  living.forEach(p => {
                    const sl = slimes.find(s => s.id === p.id);
                    if (sl && canGainElement(sl)) {
                      const gain = calculateElementGain(zd.elementGainRate, sl);
                      const newValue = Math.min(100, (sl.elements?.[zd.element] || 0) + gain);
                      // Store element gain in party member for batch update on recall
                      if (!p.elementGains) p.elementGains = {};
                      p.elementGains[zd.element] = (p.elementGains[zd.element] || 0) + gain;
                      // Check if element would reach 100%
                      if ((sl.elements?.[zd.element] || 0) + (p.elementGains[zd.element] || 0) >= 100 && !p.elementLocked) {
                        p.elementLocked = zd.element;
                        bLog(zone, `${sl.name} attuned to ${ELEMENTS[zd.element].icon} ${ELEMENTS[zd.element].name}!`, ELEMENTS[zd.element].color);
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
                }
              }
            } else {
              if (mon.hp > 0) {
                const tgt = living[Math.floor(Math.random() * living.length)];
                const tgtSl = slimes.find(s => s.id === tgt.id);
                const tgtStats = tgtSl ? getSlimeStats(tgtSl) : { slipperiness: 0 };
                let inc = md.dmg;
                const dodgeCh = 0.05 + (tgtStats.slipperiness || 0) * 0.015 + (tgtSl?.pass?.includes('echolocation') ? 0.12 : 0) + (tgtSl?.pass?.includes('trickster') ? 0.08 : 0);
                if (Math.random() < dodgeCh) { bLog(zone, `${tgtSl?.name} dodges! 💨`, '#22d3ee'); }
                else {
                  if (tgtSl?.pass?.includes('armored')) inc *= 0.8;
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
        return next;
      });

      if (activeRes) {
        setActiveRes(p => {
          if (!p) return null;
          const r = RESEARCH[p.id];
          const np = p.prog + (100 / r.time) * bon.res * dt;
          if (np >= 100) { setResearch(c => [...c, p.id]); log(`${r.name} complete!`); return null; }
          return { ...p, prog: np };
        });
      }
    }, TICK_RATE);
    return () => clearInterval(iv);
  }, [gameLoaded, lastTick, speed, slimes, bon, activeRes, log, bLog, setDefeatedMonsters]);

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
        const reachedEnd = next.humans.some(h => h.position >= 100);
        if (reachedEnd) {
          next.phase = 'defeat';
          setTimeout(() => endTowerDefense(false, { totalDamage: next.totalDamage, humansDefeated: next.humansDefeated }), 100);
          return next;
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
              const damage = stats.firmness || 5;
              next.totalDamage += damage;

              // Apply damage to first human
              next.humans = next.humans.map((h, idx) => {
                if (idx === 0) {
                  const newHp = h.hp - damage;
                  next.battleLog = [...next.battleLog.slice(-20), `${sl.name} attacks for ${Math.floor(damage)} damage!`];

                  if (newHp <= 0) {
                    next.battleLog = [...next.battleLog.slice(-20), `Human warrior defeated!`];
                    next.humansDefeated++;
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
            const newHumans = [];
            for (let i = 0; i < wave.humans; i++) {
              newHumans.push({
                id: genId(),
                type: 'warrior',
                hp: HUMAN_TYPES.warrior.hp * wave.hpMultiplier,
                maxHp: HUMAN_TYPES.warrior.hp * wave.hpMultiplier,
                position: 0,
                speed: HUMAN_TYPES.warrior.speed,
              });
            }
            next.humans = newHumans;
            next.currentWave = nextWaveIdx;
            next.battleLog = [...next.battleLog.slice(-20), `Wave ${nextWaveIdx + 1} begins!`];
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
  }, [gameLoaded, towerDefense, speed, slimes, endTowerDefense]);

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
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 13 }}>🧬 <strong>{Math.floor(bio)}</strong></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.3)', padding: '4px 10px', borderRadius: 12, fontSize: 13 }}>💜 <strong>{freeMag}/{maxMag}</strong></div>
        </div>
        <button onClick={() => setDev(!dev)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer' }}>🛠️</button>
      </header>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'rgba(0,0,0,0.2)' }}>
        {tabs.map((t, i) => <div key={t.id} onClick={() => setTab(i)} style={{ width: 8, height: 8, borderRadius: '50%', background: tab === i ? '#ec4899' : 'rgba(255,255,255,0.3)', cursor: 'pointer' }} />)}
      </div>
      
      <main style={{ padding: 15, paddingBottom: 100 }}>
        <h2 style={{ margin: '0 0 15px', fontSize: 20 }}>{tabs[tab].icon} {tabs[tab].label}</h2>
        
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

              {/* Current Effects */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.9 }}>✨ Current Benefits</div>
                <div style={{ display: 'grid', gap: 4, fontSize: 11 }}>
                  {Object.entries(SLIME_TIERS).filter(([_, t]) => !t.unlockLevel || queen.level >= t.unlockLevel).map(([k, t]) => (
                    <div key={k} style={{ color: '#4ade80' }}>• {t.name} Slimes unlocked</div>
                  ))}
                  {Object.entries(ZONES).filter(([_, z]) => !z.unlock || queen.level >= z.unlock).map(([k, z]) => (
                    <div key={k} style={{ color: '#22d3ee' }}>• {z.name} accessible</div>
                  ))}
                </div>
              </div>

              {/* Next Level Preview */}
              {(() => {
                const nextLevel = queen.level + 1;
                const nextUnlocks = [];

                Object.entries(SLIME_TIERS).forEach(([k, t]) => {
                  if (t.unlockLevel === nextLevel) nextUnlocks.push({ type: 'slime', name: t.name + ' Slimes', icon: '🟢' });
                });

                Object.entries(ZONES).forEach(([k, z]) => {
                  if (z.unlock === nextLevel) nextUnlocks.push({ type: 'zone', name: z.name, icon: z.icon });
                });

                if (nextUnlocks.length > 0) {
                  return (
                    <div style={{ background: 'rgba(236,72,153,0.2)', borderRadius: 8, padding: 12 }}>
                      <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 8, opacity: 0.9 }}>🔮 Next Level ({nextLevel})</div>
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
                    {Object.entries(BUILDINGS).map(([k, b]) => {
                      const isTimeBased = typeof b.cost === 'number';
                      const done = research.includes(k);
                      const can = isTimeBased ? bio >= b.cost : Object.entries(b.cost).every(([m, c]) => (mats[m] || 0) >= c);
                      const max = b.max && (builds[k] || 0) >= b.max;
                      const isBuilding = activeRes?.id === k;

                      return <div key={k} style={{ padding: 15, background: 'rgba(0,0,0,0.3)', borderRadius: 10, borderLeft: done ? '3px solid #4ade80' : isBuilding ? '3px solid #22d3ee' : '3px solid transparent' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <span style={{ fontSize: 28 }}>{b.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 'bold' }}>{b.name}</div>
                            <div style={{ fontSize: 12, opacity: 0.7 }}>{b.desc}</div>
                            {isTimeBased && b.time && (
                              <div style={{ fontSize: 11, opacity: 0.5, marginTop: 4 }}>Build time: {Math.floor(b.time / 60)}:{(b.time % 60).toString().padStart(2, '0')}</div>
                            )}
                          </div>
                          {!isTimeBased && <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 18 }}>x{builds[k] || 0}</span>}
                        </div>

                        {isTimeBased ? (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, color: bio >= b.cost ? '#4ade80' : '#ef4444', display: 'inline-block', marginBottom: 8 }}>
                              Cost: {b.cost}🧬
                            </div>
                            {!done && !activeRes && <button onClick={() => startRes(k)} disabled={bio < b.cost || max} style={{ padding: '8px 16px', background: can && !max ? '#4ade80' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: can && !max ? 'pointer' : 'not-allowed', display: 'block' }}>{max ? 'Built' : `Build (${b.cost}🧬)`}</button>}
                            {done && <span style={{ color: '#4ade80' }}>✓ Built</span>}
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{Object.entries(b.cost).map(([m, c]) => <span key={m} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, color: (mats[m] || 0) >= c ? '#4ade80' : '#ef4444' }}>{m}: {c}</span>)}</div>
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
                          <SlimeSprite tier={s.tier} size={40} hp={expS?.hp} maxHp={expS?.maxHp || s.maxHp} traits={s.traits} status={expS?.status} primaryElement={s.primaryElement} />
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
              <SlimeForge unlockedMutations={unlockedMutations} biomass={bio} freeMag={freeMag} tiers={unlockedTiers} onSpawn={spawn} />
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
                        <SlimeSprite tier={s.tier} size={45} hp={expS?.hp} maxHp={expS?.maxHp || s.maxHp} traits={s.traits} status={expS?.status} primaryElement={s.primaryElement} />
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
                const ok = z.unlocked || queen.level >= (z.unlock || 0);
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
                  {!ok && <div style={{ fontSize: 9, color: '#f59e0b' }}>Lv.{z.unlock}</div>}
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
                    { value: '10', label: '10 Enemies', icon: '⚡', unlock: null },
                    { value: '100', label: '100 Enemies', icon: '⚔️', unlock: 'extendedExpedition' },
                    { value: 'infinite', label: 'Infinite', icon: '♾️', unlock: 'infiniteExpedition' }
                  ].map(opt => {
                    const unlocked = !opt.unlock || research.includes(opt.unlock);
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
                      {sl ? <><SlimeSprite tier={sl.tier} size={30} traits={sl.traits} primaryElement={sl.primaryElement} /><div style={{ fontSize: 9, marginTop: 2 }}>🧬{Math.floor(sl.biomass || 0)}</div></> : <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>}
                    </div>;
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15, maxHeight: 100, overflowY: 'auto' }}>
                  {avail.map(s => <div key={s.id} onClick={() => party.length < 4 && setParty(p => [...p, s.id])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 9 }}><SlimeSprite tier={s.tier} size={24} traits={s.traits} primaryElement={s.primaryElement} /><span style={{ marginTop: 2 }}>{s.name.split(' ')[0]}</span></div>)}
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
                          {sl ? <><SlimeSprite tier={sl.tier} size={30} traits={sl.traits} primaryElement={sl.primaryElement} /><div style={{ fontSize: 9, marginTop: 2 }}>🧬{Math.floor(sl.biomass || 0)}</div></> : <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>}
                        </div>;
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15, maxHeight: 150, overflowY: 'auto' }}>
                      {avail.map(s => <div key={s.id} onClick={() => party.length < tdSlots && setParty(p => [...p, s.id])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 9 }}><SlimeSprite tier={s.tier} size={24} traits={s.traits} primaryElement={s.primaryElement} /><span style={{ marginTop: 2 }}>{s.name.split(' ')[0]}</span></div>)}
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

                  {/* Humans */}
                  {towerDefense.humans.map(h => (
                    <div key={h.id} style={{ position: 'absolute', right: `${h.position}%`, top: '50%', transform: 'translateY(-50%)', fontSize: 32, transition: 'right 0.1s linear' }}>
                      ⚔️
                      <div style={{ fontSize: 10, color: '#fff', textAlign: 'center', background: 'rgba(0,0,0,0.7)', padding: '2px 4px', borderRadius: 4 }}>{Math.ceil(h.hp)}</div>
                    </div>
                  ))}
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
                        <SlimeSprite tier={sl.tier} size={32} traits={sl.traits} primaryElement={sl.primaryElement} />
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

        {tab === 4 && (
          <div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, opacity: 0.7 }}>Materials</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 20 }}>
              {Object.entries(mats).map(([n, c]) => <div key={n} style={{ padding: 10, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: 12 }}>{n} <strong style={{ float: 'right' }}>x{c}</strong></div>)}
              {!Object.keys(mats).length && <div style={{ opacity: 0.5, fontStyle: 'italic', gridColumn: '1/-1' }}>No materials</div>}
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 14, opacity: 0.7 }}>Trait Essences</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {Object.entries(traits).map(([id, cnt]) => {
                const t = TRAIT_LIBRARY[id];
                return <div key={id} style={{ padding: 12, background: `${t.color}22`, borderRadius: 8, border: `1px solid ${t.color}44` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}><span style={{ fontSize: 20 }}>{t.icon}</span><span style={{ fontSize: 14, fontWeight: 'bold' }}>{t.name}</span><span style={{ marginLeft: 'auto', fontSize: 14, fontWeight: 'bold' }}>x{cnt}</span></div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>+{t.bonus} {STAT_INFO[t.stat]?.name}</div>
                  <div style={{ fontSize: 11, color: t.color }}>{t.passiveDesc}</div>
                </div>;
              })}
              {!Object.keys(traits).length && <div style={{ opacity: 0.5, fontStyle: 'italic' }}>No traits. They're rare!</div>}
            </div>
          </div>
        )}

        {tab === 5 && <Compendium queen={queen} monsterKills={monsterKills} unlockedMutations={unlockedMutations} />}

        {tab === 6 && <SettingsTab onSave={manualSave} onDelete={handleDelete} lastSave={lastSave} />}
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
            <button onClick={() => setMats(m => ({ ...m, 'Dragon Scale': (m['Dragon Scale'] || 0) + 3, 'Soul Fragment': (m['Soul Fragment'] || 0) + 10, 'Wolf Pelt': (m['Wolf Pelt'] || 0) + 10, 'Crude Iron': (m['Crude Iron'] || 0) + 10, 'Mana Crystal': (m['Mana Crystal'] || 0) + 5, 'Ancient Stone': (m['Ancient Stone'] || 0) + 8, 'Human Bone': (m['Human Bone'] || 0) + 10, 'Iron Sword': (m['Iron Sword'] || 0) + 10 }))} style={{ padding: 8, background: '#f59e0b', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+Mats</button>
            <button onClick={() => setTraits(t => ({ ...t, wolfFang: (t.wolfFang || 0) + 2, dragonHeart: (t.dragonHeart || 0) + 1, turtleShell: (t.turtleShell || 0) + 2, venomSac: (t.venomSac || 0) + 2, phoenixFeather: (t.phoenixFeather || 0) + 1 }))} style={{ padding: 8, background: '#a855f7', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+Traits</button>
            <button onClick={() => setQueen(q => ({ ...q, level: q.level + 5 }))} style={{ padding: 8, background: '#ec4899', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>+5 Queen Lv</button>
            <button onClick={() => { setLastTowerDefense(0); setTowerDefense(null); log('🎯 Tower Defense reset!'); }} style={{ padding: 8, background: '#22d3ee', border: 'none', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>Reset TD Timer</button>
          </div>
        </div>
      )}
    </div>
  );
}
