import React, { useState, useEffect, useCallback, useRef } from 'react';

const TICK_RATE = 100;
const BASE_SLIME_COST = 10;
const TRAIT_MAGICKA_COST = 3;
const BASE_MAGICKA = 50;
const BATTLE_TICK_SPEED = 2500;
const AUTO_SAVE_INTERVAL = 30000;
const SAVE_KEY = 'hive_queen_save_v1';

const STAT_INFO = {
  firmness: { name: 'Firmness', icon: '💪', desc: 'Attack damage & max HP', color: '#ef4444' },
  slipperiness: { name: 'Slipperiness', icon: '💨', desc: 'Dodge & crit chance', color: '#22d3ee' },
  viscosity: { name: 'Viscosity', icon: '🌀', desc: 'Effect damage & proc chance', color: '#a855f7' },
};

const SLIME_TIERS = {
  basic: { name: 'Basic', magickaCost: 5, statMultiplier: 1, traitSlots: 1, color: '#4ade80', baseHp: 50, biomassPerPercent: 10 },
  enhanced: { name: 'Enhanced', magickaCost: 10, statMultiplier: 1.5, traitSlots: 2, color: '#22d3ee', unlockLevel: 5, baseHp: 80, biomassPerPercent: 100 },
  elite: { name: 'Elite', magickaCost: 20, statMultiplier: 2, traitSlots: 3, color: '#a855f7', unlockLevel: 15, baseHp: 120, biomassPerPercent: 1000 },
  royal: { name: 'Royal', magickaCost: 40, statMultiplier: 3, traitSlots: 4, color: '#f59e0b', unlockLevel: 30, baseHp: 200, biomassPerPercent: 10000 },
};

const TRAIT_LIBRARY = {
  wolfFang: { name: 'Wolf Fang', icon: '🐺', stat: 'firmness', bonus: 3, passive: 'ferocity', passiveDesc: '+15% damage', color: '#94a3b8' },
  goblinCunning: { name: 'Goblin Cunning', icon: '👺', stat: 'slipperiness', bonus: 3, passive: 'trickster', passiveDesc: '+8% dodge & crit', color: '#84cc16' },
  turtleShell: { name: 'Turtle Shell', icon: '🐢', stat: 'firmness', bonus: 5, passive: 'armored', passiveDesc: '-20% damage taken', color: '#65a30d' },
  batWing: { name: 'Bat Wing', icon: '🦇', stat: 'slipperiness', bonus: 4, passive: 'echolocation', passiveDesc: '+12% dodge', color: '#6366f1' },
  boneArmor: { name: 'Bone Armor', icon: '💀', stat: 'firmness', bonus: 3, passive: 'undying', passiveDesc: 'Survive fatal blow once', color: '#d4d4d4' },
  ogreStrength: { name: 'Ogre Might', icon: '👹', stat: 'firmness', bonus: 6, passive: 'crushing', passiveDesc: '+30% crit damage', color: '#dc2626' },
  dragonHeart: { name: 'Dragon Heart', icon: '🐉', stat: 'viscosity', bonus: 5, passive: 'fireBreath', passiveDesc: 'Attacks apply Burn', color: '#f97316' },
  wispGlow: { name: 'Wisp Essence', icon: '✨', stat: 'viscosity', bonus: 4, passive: 'manaLeech', passiveDesc: '+10% biomass/kill', color: '#8b5cf6' },
  venomSac: { name: 'Venom Sac', icon: '🧪', stat: 'viscosity', bonus: 3, passive: 'poison', passiveDesc: 'Attacks apply Poison', color: '#22c55e' },
  crystalCore: { name: 'Crystal Core', icon: '💎', stat: 'firmness', bonus: 4, passive: 'reflect', passiveDesc: 'Reflect 15% damage', color: '#06b6d4' },
  shadowCloak: { name: 'Shadow Cloak', icon: '🌑', stat: 'slipperiness', bonus: 5, passive: 'ambush', passiveDesc: 'First attack crits', color: '#1f2937' },
  phoenixFeather: { name: 'Phoenix Feather', icon: '🔥', stat: 'viscosity', bonus: 3, passive: 'rebirth', passiveDesc: 'Revive at 30% HP once', color: '#fb923c' },
};

const STATUS_EFFECTS = {
  poison: { name: 'Poison', icon: '🧪', color: '#22c55e', dmg: 2, dur: 5 },
  burn: { name: 'Burn', icon: '🔥', color: '#f97316', dmg: 3, dur: 4 },
  bleed: { name: 'Bleed', icon: '🩸', color: '#ef4444', dmg: 4, dur: 3 },
};

const MONSTER_TYPES = {
  wolf: { name: 'Wolf', icon: '🐺', diff: 1, hp: 40, dmg: 4, biomass: 5, mats: ['Wolf Fang', 'Wolf Pelt'], trait: 'wolfFang', drop: 0.025, abilities: ['Can apply Bleed'] },
  goblin: { name: 'Goblin', icon: '👺', diff: 2, hp: 35, dmg: 6, biomass: 8, mats: ['Goblin Ear', 'Crude Iron'], trait: 'goblinCunning', drop: 0.025, abilities: ['High dodge'] },
  turtle: { name: 'Giant Turtle', icon: '🐢', diff: 3, hp: 120, dmg: 5, biomass: 12, mats: ['Turtle Shell', 'Ancient Stone'], trait: 'turtleShell', drop: 0.02, abilities: ['Very tanky'] },
  bat: { name: 'Cave Bat', icon: '🦇', diff: 1, hp: 25, dmg: 3, biomass: 4, mats: ['Bat Wing', 'Echo Crystal'], trait: 'batWing', drop: 0.03, abilities: ['Fast'] },
  skeleton: { name: 'Skeleton', icon: '💀', diff: 2, hp: 45, dmg: 8, biomass: 7, mats: ['Bone Dust', 'Soul Fragment'], trait: 'boneArmor', drop: 0.025, abilities: ['Immune to Poison'] },
  snake: { name: 'Venom Snake', icon: '🐍', diff: 2, hp: 30, dmg: 5, biomass: 9, mats: ['Snake Scale', 'Venom Gland'], trait: 'venomSac', drop: 0.025, abilities: ['Poisons'] },
  golem: { name: 'Crystal Golem', icon: '🗿', diff: 4, hp: 180, dmg: 12, biomass: 18, mats: ['Crystal Shard', 'Golem Core'], trait: 'crystalCore', drop: 0.015, abilities: ['Very tanky'] },
  shade: { name: 'Shadow Shade', icon: '👤', diff: 3, hp: 40, dmg: 15, biomass: 14, mats: ['Shadow Wisp', 'Dark Essence'], trait: 'shadowCloak', drop: 0.02, abilities: ['High dodge'] },
  ogre: { name: 'Ogre', icon: '👹', diff: 5, hp: 200, dmg: 18, biomass: 25, mats: ['Ogre Hide', 'Ogre Club'], trait: 'ogreStrength', drop: 0.015, abilities: ['Massive damage'] },
  dragon: { name: 'Young Dragon', icon: '🐉', diff: 8, hp: 350, dmg: 25, biomass: 50, mats: ['Dragon Scale', 'Dragon Bone'], trait: 'dragonHeart', drop: 0.01, abilities: ['Burns', 'Fire breath'] },
  wisp: { name: 'Magic Wisp', icon: '✨', diff: 3, hp: 50, dmg: 10, biomass: 10, mats: ['Wisp Essence', 'Mana Crystal'], trait: 'wispGlow', drop: 0.025, abilities: ['Magic damage'] },
  phoenix: { name: 'Phoenix Chick', icon: '🔥', diff: 6, hp: 150, dmg: 20, biomass: 35, mats: ['Phoenix Ash', 'Ember Core'], trait: 'phoenixFeather', drop: 0.012, abilities: ['Burns', 'Revives'] },
};

const ZONES = {
  forest: { name: 'Dark Forest', icon: '🌲', monsters: ['wolf', 'bat', 'goblin'], unlocked: true, bg: '#1a3d1a', desc: 'Shadowy woodland with common creatures.' },
  caves: { name: 'Crystal Caves', icon: '🕳️', monsters: ['bat', 'skeleton', 'golem'], unlock: 3, bg: '#1a2d4a', desc: 'Glittering caverns with dangerous foes.' },
  swamp: { name: 'Poison Swamp', icon: '🌿', monsters: ['snake', 'turtle', 'goblin'], unlock: 6, bg: '#2d3a1a', desc: 'Toxic wetlands with venomous creatures.' },
  ruins: { name: 'Shadow Ruins', icon: '🏛️', monsters: ['skeleton', 'shade', 'wisp'], unlock: 10, bg: '#2a1a3a', desc: 'Haunted ancient structures.' },
  peaks: { name: 'Ogre Peaks', icon: '⛰️', monsters: ['ogre', 'golem', 'bat'], unlock: 15, bg: '#3a2a1a', desc: 'Mountains ruled by giants.' },
  volcano: { name: 'Dragon Volcano', icon: '🌋', monsters: ['dragon', 'phoenix', 'wisp'], unlock: 25, bg: '#4a1a1a', desc: 'Blazing hellscape of fire.' },
};

const BUILDINGS = {
  slimePit: { name: 'Slime Pit', icon: '🕳️', desc: '+10 max Magicka', cost: { 'Wolf Pelt': 5, 'Crude Iron': 3 } },
  researchLab: { name: 'Research Chamber', icon: '🔬', desc: '+25% research speed', cost: { 'Mana Crystal': 3, 'Ancient Stone': 5 } },
  hatchery: { name: 'Royal Hatchery', icon: '🥚', desc: 'Unlock Elite Slimes', cost: { 'Dragon Scale': 1, 'Soul Fragment': 10 }, max: 1 },
  defenseSlot: { name: 'Defense Slot', icon: '🎯', desc: '+1 Tower Defense slot', cost: { 'Human Bone': 5, 'Iron Sword': 3 }, max: 6 },
};

const RESEARCH = {
  efficientDigestion: { name: 'Efficient Digestion', desc: '+20% biomass', cost: 50, time: 60 },
  enhancedAbsorption: { name: 'Enhanced Absorption', desc: '+25% reabsorb XP', cost: 100, time: 120 },
  slimeVitality: { name: 'Slime Vitality', desc: '+15% max HP', cost: 150, time: 180 },
  swiftSlimes: { name: 'Swift Strikes', desc: '+20% attack speed', cost: 200, time: 240 },
};

const TOWER_DEFENSE_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours
const TD_TICK_SPEED = 100; // Combat tick rate

const HUMAN_TYPES = {
  warrior: { name: 'Human Warrior', icon: '⚔️', hp: 100, speed: 1, biomassReward: 20, mats: ['Human Bone', 'Iron Sword'] },
};

const TD_WAVES = [
  { wave: 1, humans: 5, hpMultiplier: 1, reward: { biomass: 50, mats: { 'Human Bone': 3, 'Iron Sword': 2 } } },
  { wave: 2, humans: 8, hpMultiplier: 1.5, reward: { biomass: 75, mats: { 'Human Bone': 5, 'Iron Sword': 3 } } },
  { wave: 3, humans: 12, hpMultiplier: 2, reward: { biomass: 100, mats: { 'Human Bone': 8, 'Iron Sword': 5 } } },
];

const NAME_PRE = ['Glo', 'Spl', 'Oo', 'Squ', 'Blo', 'Jel', 'Wob', 'Bou', 'Dri', 'Sli', 'Goo', 'Muc', 'Pud', 'Glu', 'Flu', 'Gel', 'Mor', 'Gur', 'Bub'];
const NAME_SUF = ['bby', 'osh', 'ize', 'orp', 'oop', 'elly', 'ubble', 'urt', 'ime', 'ick', 'ooey', 'uck', 'udge', 'op', 'ash', 'urp', 'oze', 'ish'];
const NAME_TIT = ['', '', '', '', ' the Brave', ' the Squishy', ' the Mighty', ' the Swift', ' the Wise', ' the Gooey', ' the Bouncy', ' the Firm'];

const genName = () => NAME_PRE[Math.floor(Math.random() * NAME_PRE.length)] + NAME_SUF[Math.floor(Math.random() * NAME_SUF.length)] + NAME_TIT[Math.floor(Math.random() * NAME_TIT.length)];
const genId = () => Math.random().toString(36).substr(2, 9);
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins} minutes`;
};

// ============== SAVE/LOAD SYSTEM ==============
const getDefaultState = () => ({
  queen: { level: 1, xp: 0 },
  bio: 50,
  mats: {},
  traits: {},
  slimes: [],
  exps: {},
  builds: {},
  research: [],
  activeRes: null,
  lastTowerDefense: 0,
  defeatedMonsters: [],
  lastSave: Date.now(),
});

const saveGame = (state) => {
  try {
    const saveData = { ...state, lastSave: Date.now() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    return true;
  } catch (e) { console.error('Save failed:', e); return false; }
};

const loadGame = () => {
  try {
    const data = localStorage.getItem(SAVE_KEY);
    if (!data) return null;
    return JSON.parse(data);
  } catch (e) { console.error('Load failed:', e); return null; }
};

const deleteSave = () => {
  try { localStorage.removeItem(SAVE_KEY); return true; }
  catch (e) { return false; }
};

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

// ============== COMPONENTS ==============
const SlimeSprite = ({ tier, size = 40, isQueen, hp, maxHp, traits = [], anim = 'idle', status = [] }) => {
  const color = isQueen ? '#ec4899' : (SLIME_TIERS[tier]?.color || '#4ade80');
  const hpPct = hp !== undefined && maxHp ? (hp / maxHp) * 100 : 100;
  const transform = anim === 'attack' ? 'translateX(15px) scale(1.1)' : anim === 'hurt' ? 'translateX(-5px) scale(0.9)' : 'scale(1)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {hp !== undefined && maxHp && (
        <div style={{ width: size, height: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 2, marginBottom: 3, overflow: 'hidden' }}>
          <div style={{ width: `${hpPct}%`, height: '100%', background: hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#f59e0b' : '#ef4444', transition: 'width 0.3s' }} />
        </div>
      )}
      <div style={{
        width: size, height: size * 0.7, backgroundColor: color,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        position: 'relative',
        boxShadow: `0 ${size*0.1}px ${size*0.2}px rgba(0,0,0,0.3), inset 0 ${size*0.1}px ${size*0.2}px rgba(255,255,255,0.3)`,
        transform, transition: 'transform 0.15s',
        filter: anim === 'hurt' ? 'brightness(1.5)' : 'none',
      }}>
        <div style={{position:'absolute',top:'25%',left:'20%',width:size*0.15,height:size*0.15,backgroundColor:'white',borderRadius:'50%'}}>
          <div style={{position:'absolute',top:'30%',left:'30%',width:'50%',height:'50%',backgroundColor:'#333',borderRadius:'50%'}}/>
        </div>
        <div style={{position:'absolute',top:'25%',right:'20%',width:size*0.15,height:size*0.15,backgroundColor:'white',borderRadius:'50%'}}>
          <div style={{position:'absolute',top:'30%',left:'30%',width:'50%',height:'50%',backgroundColor:'#333',borderRadius:'50%'}}/>
        </div>
        {isQueen && <div style={{position:'absolute',top:-size*0.3,left:'50%',transform:'translateX(-50%)',fontSize:size*0.4}}>👑</div>}
      </div>
      {status?.length > 0 && <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>{status.map((s,i) => <span key={i} style={{fontSize:size*0.3}}>{STATUS_EFFECTS[s.type]?.icon}</span>)}</div>}
      {traits?.length > 0 && <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>{traits.slice(0,4).map((t,i) => <span key={i} style={{fontSize:size*0.25}}>{TRAIT_LIBRARY[t]?.icon}</span>)}</div>}
    </div>
  );
};

const MonsterSprite = ({ monster, hp, maxHp, anim = 'idle', status = [] }) => {
  const m = MONSTER_TYPES[monster];
  const hpPct = (hp / maxHp) * 100;
  const transform = anim === 'attack' ? 'translateX(-15px) scale(1.1)' : anim === 'hurt' ? 'translateX(5px) scale(0.9)' : 'scale(1)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: 60, height: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 2, marginBottom: 4, overflow: 'hidden' }}>
        <div style={{ width: `${hpPct}%`, height: '100%', background: '#ef4444', transition: 'width 0.3s' }} />
      </div>
      <div style={{ fontSize: 10, marginBottom: 2, opacity: 0.8 }}>{Math.ceil(hp)}/{maxHp}</div>
      <div style={{ fontSize: 48, transform, transition: 'transform 0.15s', filter: anim === 'hurt' ? 'brightness(1.5)' : 'none' }}>{m?.icon}</div>
      <div style={{ fontSize: 11, marginTop: 4 }}>{m?.name}</div>
      {status?.length > 0 && (
        <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
          {status.map((s,i) => <div key={i} style={{display:'flex',alignItems:'center',gap:2,background:`${STATUS_EFFECTS[s.type]?.color}33`,padding:'2px 5px',borderRadius:4,fontSize:10}}><span>{STATUS_EFFECTS[s.type]?.icon}</span><span>{s.dur}</span></div>)}
        </div>
      )}
    </div>
  );
};

const BattleArena = ({ exp, slimes, zone, logs }) => {
  const z = ZONES[zone];
  const logRef = useRef(null);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);
  
  if (!exp || !exp.party.length) {
    return (
      <div style={{ height: 280, background: `linear-gradient(180deg, ${z.bg} 0%, ${z.bg}dd 100%)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.1)' }}>
        <div style={{ textAlign: 'center', opacity: 0.5 }}>
          <div style={{ fontSize: 48 }}>{z.icon}</div>
          <div>No expedition active</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: `linear-gradient(180deg, ${z.bg} 0%, ${z.bg}dd 100%)`, borderRadius: 10, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', fontSize: 12 }}>
        <span>{z.icon} {z.name}</span>
        <span style={{ color: '#4ade80' }}>💀 {exp.kills || 0} kills</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 25px', minHeight: 150 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {exp.party.map(p => {
            const sl = slimes.find(s => s.id === p.id);
            if (!sl) return null;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <SlimeSprite tier={sl.tier} size={38} hp={p.hp} maxHp={p.maxHp} traits={sl.traits} anim={exp.animSlime === p.id ? exp.slimeAnim : 'idle'} status={p.status || []} />
                <div style={{ fontSize: 10 }}>
                  <div style={{ fontWeight: 'bold' }}>{sl.name.split(' ')[0]}</div>
                  <div style={{ opacity: 0.7 }}>🧬{Math.floor(sl.biomass || 0)} • {Math.ceil(p.hp)}/{p.maxHp}</div>
                </div>
              </div>
            );
          })}
        </div>
        {exp.monster && <div style={{ fontSize: 28, color: '#ef4444' }}>⚔️</div>}
        <div>
          {exp.monster ? (
            <MonsterSprite monster={exp.monster.type} hp={exp.monster.hp} maxHp={exp.monster.maxHp} anim={exp.monAnim || 'idle'} status={exp.monster.status || []} />
          ) : (
            <div style={{ fontSize: 14, opacity: 0.5 }}>🔍 Searching...</div>
          )}
        </div>
      </div>
      <div ref={logRef} style={{ height: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.5)', padding: '8px 12px', fontSize: 11 }}>
        {(logs || []).slice(-20).map((l,i) => (
          <div key={i} style={{ padding: '3px 0', color: l.c || '#888' }}>{l.m}</div>
        ))}
      </div>
    </div>
  );
};

const SlimeForge = ({ traits, biomass, freeMag, tiers, onSpawn }) => {
  const [tier, setTier] = useState('basic');
  const [selTraits, setSelTraits] = useState([]);
  const [name, setName] = useState(genName());

  const td = SLIME_TIERS[tier];
  const maxT = td.traitSlots;
  const bioCost = BASE_SLIME_COST + selTraits.length * 5;
  const magCost = td.magickaCost + selTraits.length * TRAIT_MAGICKA_COST;
  const avail = Object.entries(traits).filter(([,c]) => c > 0);

  const toggle = (id) => {
    if (selTraits.includes(id)) setSelTraits(selTraits.filter(t => t !== id));
    else if (selTraits.length < maxT) setSelTraits([...selTraits, id]);
  };

  const spawn = () => {
    if (biomass >= bioCost && freeMag >= magCost) {
      onSpawn(tier, selTraits, name, magCost);
      setSelTraits([]);
      setName(genName());
    }
  };

  const stats = { firmness: Math.floor(5 * td.statMultiplier), slipperiness: Math.floor(5 * td.statMultiplier), viscosity: Math.floor(5 * td.statMultiplier) };
  selTraits.forEach(id => { const t = TRAIT_LIBRARY[id]; if (t) stats[t.stat] += t.bonus; });

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 15 }}>
      <h3 style={{ margin: '0 0 15px', fontSize: 16 }}>🧪 Slime Forge</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15, padding: 15, background: 'rgba(236,72,153,0.1)', borderRadius: 10 }}>
        <SlimeSprite tier={tier} size={60} traits={selTraits} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, padding: '5px 10px', color: '#fff', fontSize: 14, flex: 1 }} />
            <button onClick={() => setName(genName())} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer' }}>🎲</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{td.name} • {selTraits.length}/{maxT} traits</div>
          <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
            {Object.entries(STAT_INFO).map(([k,v]) => <span key={k} style={{ color: v.color }}>{v.icon}{stats[k]}</span>)}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Tier</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(SLIME_TIERS).map(([k,t]) => {
            const ok = tiers.includes(k);
            return (
              <button key={k} onClick={() => { if(ok){setTier(k);setSelTraits([]);} }} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:tier===k?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.3)',border:`2px solid ${tier===k?t.color:'transparent'}`,borderRadius:8,color:'#fff',cursor:ok?'pointer':'not-allowed',opacity:ok?1:0.4,fontSize:12 }}>
                <div style={{ width:16,height:12,backgroundColor:t.color,borderRadius:'50% 50% 50% 50% / 60% 60% 40% 40%' }} />
                {t.name} <span style={{color:'#a855f7',fontSize:10}}>💜{t.magickaCost}+</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Traits ({selTraits.length}/{maxT}) • +{TRAIT_MAGICKA_COST}💜 each</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
          {avail.map(([id, cnt]) => {
            const t = TRAIT_LIBRARY[id];
            const sel = selTraits.includes(id);
            const can = sel || selTraits.length < maxT;
            return (
              <button key={id} onClick={() => can && toggle(id)} style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',padding:8,background:sel?`${t.color}33`:'rgba(0,0,0,0.3)',border:`2px solid ${sel?t.color:'transparent'}`,borderRadius:8,color:'#fff',cursor:can?'pointer':'not-allowed',opacity:can?1:0.5,textAlign:'left' }}>
                <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:4,width:'100%' }}>
                  <span>{t.icon}</span><span style={{fontSize:11,fontWeight:'bold'}}>{t.name}</span><span style={{fontSize:10,opacity:0.6,marginLeft:'auto'}}>x{cnt}</span>
                </div>
                <div style={{fontSize:9,opacity:0.7}}>+{t.bonus} {STAT_INFO[t.stat]?.name}</div>
                <div style={{fontSize:9,color:t.color}}>{t.passiveDesc}</div>
              </button>
            );
          })}
          {!avail.length && <div style={{opacity:0.5,fontStyle:'italic',fontSize:12,gridColumn:'1/-1'}}>No traits yet. Defeat monsters!</div>}
        </div>
      </div>
      <div style={{ display:'flex',justifyContent:'space-between',padding:'10px 15px',background:'rgba(0,0,0,0.2)',borderRadius:8,marginBottom:10,fontSize:13 }}>
        <span>Cost:</span>
        <div style={{display:'flex',gap:15}}>
          <span style={{color:biomass>=bioCost?'#4ade80':'#ef4444'}}>🧬{bioCost}</span>
          <span style={{color:freeMag>=magCost?'#a855f7':'#ef4444'}}>💜{magCost}</span>
        </div>
      </div>
      <button onClick={spawn} disabled={biomass<bioCost||freeMag<magCost} style={{ width:'100%',padding:12,background:biomass>=bioCost&&freeMag>=magCost?'linear-gradient(135deg,#ec4899,#a855f7)':'rgba(100,100,100,0.5)',border:'none',borderRadius:8,color:'#fff',fontWeight:'bold',cursor:biomass>=bioCost&&freeMag>=magCost?'pointer':'not-allowed',fontSize:14 }}>
        ✨ Spawn Slime
      </button>
    </div>
  );
};

const SlimeDetail = ({ slime, expState }) => {
  const tier = SLIME_TIERS[slime.tier];
  const hp = expState?.hp ?? slime.maxHp;

  // Calculate current stats based on biomass
  const biomass = slime.biomass || 0;
  const percentBonus = biomass / tier.biomassPerPercent;
  const multiplier = 1 + (percentBonus / 100);
  const currentStats = {
    firmness: Math.floor(slime.baseStats.firmness * multiplier),
    slipperiness: Math.floor(slime.baseStats.slipperiness * multiplier),
    viscosity: Math.floor(slime.baseStats.viscosity * multiplier),
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, border: `2px solid ${tier.color}33` }}>
      <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
        <SlimeSprite tier={slime.tier} size={60} hp={hp} maxHp={slime.maxHp} traits={slime.traits} status={expState?.status} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{slime.name}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{tier.name}</div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}><span>❤️ HP</span><span>{Math.ceil(hp)}/{slime.maxHp}</span></div>
            <div style={{ height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(hp/slime.maxHp)*100}%`, height: '100%', background: 'linear-gradient(90deg,#ef4444,#f87171)', transition: 'width 0.3s' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}><span>🧬 Biomass</span><span>{Math.floor(biomass)} (+{percentBonus.toFixed(1)}%)</span></div>
            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>Next 1%: {Math.ceil(tier.biomassPerPercent - (biomass % tier.biomassPerPercent))} more</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 15 }}>
        {Object.entries(STAT_INFO).map(([k,v]) => (
          <div key={k} style={{ flex: 1, background: `${v.color}22`, padding: 8, borderRadius: 6, textAlign: 'center' }}>
            <div style={{ fontSize: 18 }}>{v.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 'bold', color: v.color }}>{currentStats[k]}</div>
            <div style={{ fontSize: 9, opacity: 0.7 }}>{v.name}</div>
            {slime.baseStats[k] !== currentStats[k] && (
              <div style={{ fontSize: 8, opacity: 0.5 }}>({slime.baseStats[k]} base)</div>
            )}
          </div>
        ))}
      </div>
      {slime.traits.length > 0 && (
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>Traits</div>
          {slime.traits.map((t,i) => {
            const tr = TRAIT_LIBRARY[t];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: `${tr.color}22`, borderRadius: 6, borderLeft: `3px solid ${tr.color}`, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{tr.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{tr.name}</div>
                  <div style={{ fontSize: 10, color: tr.color }}>{tr.passiveDesc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Compendium = ({ queen, defeatedMonsters }) => {
  const [zone, setZone] = useState('forest');
  const z = ZONES[zone];

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 15, flexWrap: 'wrap' }}>
        {Object.entries(ZONES).map(([k,zn]) => {
          const ok = zn.unlocked || queen.level >= (zn.unlock || 0);
          return <button key={k} onClick={() => ok && setZone(k)} style={{ padding: '8px 12px', background: zone===k ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${zone===k?'#22d3ee':'transparent'}`, borderRadius: 6, color: '#fff', cursor: ok?'pointer':'not-allowed', opacity: ok?1:0.4, fontSize: 12 }}>{zn.icon} {zn.name}</button>;
        })}
      </div>
      <div style={{ background: `linear-gradient(135deg, ${z.bg}, ${z.bg}cc)`, padding: 15, borderRadius: 10, marginBottom: 15 }}>
        <div style={{ fontSize: 24, marginBottom: 5 }}>{z.icon}</div>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{z.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{z.desc}</div>
        {z.unlock && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 5 }}>Unlocks at Queen Lv.{z.unlock}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Monsters</div>
      {z.monsters.map(mid => {
        const m = MONSTER_TYPES[mid];
        const tr = TRAIT_LIBRARY[m.trait];
        const defeated = defeatedMonsters.includes(mid);

        if (!defeated) {
          return (
            <div key={mid} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 10, textAlign: 'center', opacity: 0.5 }}>
              <div style={{ fontSize: 40 }}>❓</div>
              <div style={{ fontSize: 14, fontStyle: 'italic', marginTop: 8 }}>Defeat this monster to unlock its entry</div>
            </div>
          );
        }

        return (
          <div key={mid} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 10 }}>
              <span style={{ fontSize: 40 }}>{m.icon}</span>
              <div>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{m.name}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{'⭐'.repeat(m.diff)}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, flexWrap: 'wrap' }}>
              <span>❤️ {m.hp}</span><span>⚔️ {m.dmg}</span><span>🧬 +{m.biomass}</span>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Abilities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {m.abilities.map((a,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(168,85,247,0.2)', borderRadius: 4 }}>{a}</span>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Drops</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {m.mats.map((mat,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4 }}>📦 {mat} <span style={{ opacity: 0.6 }}>(50%)</span></span>)}
                <span style={{ fontSize: 10, padding: '3px 8px', background: `${tr.color}33`, borderRadius: 4 }}>{tr.icon} {tr.name} <span style={{ opacity: 0.6 }}>({(m.drop*100).toFixed(1)}%)</span></span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Menu = ({ open, close, tab, setTab, tabs }) => {
  if (!open) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} onClick={close} />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: 'linear-gradient(180deg, #1a1a2e, #16213e)', zIndex: 999, padding: 20, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ec4899' }}>🟢 Hive Queen</span>
          <button onClick={close} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); close(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: tab===t.id ? 'rgba(236,72,153,0.2)' : 'transparent', border: 'none', borderLeft: tab===t.id ? '3px solid #ec4899' : '3px solid transparent', color: '#fff', fontSize: 14, cursor: 'pointer', textAlign: 'left', marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
            {t.badge !== undefined && <span style={{ marginLeft: 'auto', background: '#ec4899', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{t.badge}</span>}
          </button>
        ))}
      </div>
    </>
  );
};

// Welcome Back Modal
const WelcomeBackModal = ({ data, onClose }) => {
  const { offlineTime, results } = data;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 15, padding: 25, maxWidth: 400, width: '100%', border: '2px solid #ec4899' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, color: '#ec4899' }}>👋 Welcome Back!</h2>
        <p style={{ margin: '0 0 15px', opacity: 0.7 }}>You were away for {offlineTime}</p>
        
        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>While you were gone...</div>
          
          {results.monstersKilled > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>💀 Monsters Killed</span>
              <span style={{ color: '#4ade80' }}>+{results.monstersKilled}</span>
            </div>
          )}
          
          {results.biomassGained > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>🧬 Biomass Earned</span>
              <span style={{ color: '#4ade80' }}>+{results.biomassGained}</span>
            </div>
          )}
          
          {Object.keys(results.matsGained).length > 0 && (
            <div style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div>📦 Materials Found:</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {Object.entries(results.matsGained).map(([m, c]) => `${m} x${c}`).join(', ')}
              </div>
            </div>
          )}
          
          {Object.keys(results.traitsGained).length > 0 && (
            <div style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#a855f7' }}>✨ Rare Traits Found!</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {Object.entries(results.traitsGained).map(([t, c]) => `${TRAIT_LIBRARY[t]?.icon} ${TRAIT_LIBRARY[t]?.name} x${c}`).join(', ')}
              </div>
            </div>
          )}
          
          {results.slimesLost.length > 0 && (
            <div style={{ padding: '5px 0', color: '#ef4444' }}>
              <div>💔 Slimes Lost:</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{results.slimesLost.join(', ')}</div>
            </div>
          )}
          
          {results.expeditionsWiped.length > 0 && (
            <div style={{ padding: '5px 0', color: '#ef4444' }}>
              ⚠️ Expeditions wiped: {results.expeditionsWiped.map(z => ZONES[z]?.name).join(', ')}
            </div>
          )}
          
          {results.researchCompleted && (
            <div style={{ padding: '5px 0', color: '#22d3ee' }}>
              🔬 Research Completed: {results.researchCompleted}
            </div>
          )}
        </div>
        
        <button onClick={onClose} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #ec4899, #a855f7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>
          Continue Playing
        </button>
      </div>
    </div>
  );
};

// Settings Tab Component
const SettingsTab = ({ onSave, onLoad, onDelete, lastSave }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  
  return (
    <div>
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>💾 Save System</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 15 }}>
          Game auto-saves every 30 seconds. Last saved: {lastSave ? new Date(lastSave).toLocaleString() : 'Never'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onSave} style={{ padding: '10px 20px', background: '#4ade80', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: 'pointer' }}>
            💾 Save Now
          </button>
          <button onClick={() => setShowConfirm(true)} style={{ padding: '10px 20px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            🗑️ Delete Save
          </button>
        </div>
      </div>
      
      {showConfirm && (
        <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 15, border: '2px solid #ef4444' }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>⚠️ Are you sure?</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 15 }}>This will permanently delete all your progress!</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { onDelete(); setShowConfirm(false); }} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
              Yes, Delete Everything
            </button>
            <button onClick={() => setShowConfirm(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginTop: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>ℹ️ About</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          <p>Hive Queen v0.4</p>
          <p>An idle game where you control a slime hive.</p>
          <p style={{ marginTop: 10 }}>Tips:</p>
          <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
            <li>Send expeditions before closing - they'll continue offline!</li>
            <li>Higher tier slimes have more trait slots</li>
            <li>Traits are rare drops - check the Compendium for rates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// ============== MAIN GAME ==============
export default function HiveQueenGame() {
  const [gameLoaded, setGameLoaded] = useState(false);
  const [welcomeBack, setWelcomeBack] = useState(null);
  
  const [queen, setQueen] = useState({ level: 1, xp: 0 });
  const [bio, setBio] = useState(50);
  const [mats, setMats] = useState({});
  const [traits, setTraits] = useState({});
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
  const [defeatedMonsters, setDefeatedMonsters] = useState([]);

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
    { id: 6, icon: '🔬', label: 'Research' },
    { id: 7, icon: '🏗️', label: 'Buildings' },
    { id: 8, icon: '⚙️', label: 'Settings' },
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
        setTraits(offline.newState.traits);
        setActiveRes(offline.newState.activeRes);
        setResearch(offline.newState.research);
        setQueen(saved.queen);
        setBuilds(saved.builds || {});
        setLastTowerDefense(saved.lastTowerDefense || 0);
        setDefeatedMonsters(saved.defeatedMonsters || []);
        setWelcomeBack(offline);
      } else {
        // Just load normally
        setQueen(saved.queen || { level: 1, xp: 0 });
        setBio(saved.bio || 50);
        setMats(saved.mats || {});
        setTraits(saved.traits || {});
        setSlimes(saved.slimes || []);
        setExps(saved.exps || {});
        setBuilds(saved.builds || {});
        setResearch(saved.research || []);
        setActiveRes(saved.activeRes);
        setLastTowerDefense(saved.lastTowerDefense || 0);
        setDefeatedMonsters(saved.defeatedMonsters || []);
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
      const state = { queen, bio, mats, traits, slimes, exps, builds, research, activeRes, lastTowerDefense, defeatedMonsters, lastSave: Date.now() };
      if (saveGame(state)) {
        setLastSave(Date.now());
      }
    }, AUTO_SAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [gameLoaded, queen, bio, mats, traits, slimes, exps, builds, research, activeRes, lastTowerDefense, defeatedMonsters]);

  const manualSave = () => {
    const state = { queen, bio, mats, traits, slimes, exps, builds, research, activeRes, lastTowerDefense, defeatedMonsters, lastSave: Date.now() };
    if (saveGame(state)) {
      setLastSave(Date.now());
      log('💾 Game saved!');
    }
  };

  const handleDelete = () => {
    deleteSave();
    // Reset to defaults
    setQueen({ level: 1, xp: 0 });
    setBio(50);
    setMats({});
    setTraits({});
    setSlimes([]);
    setExps({});
    setBuilds({});
    setResearch([]);
    setActiveRes(null);
    setLastSave(null);
    setLastTowerDefense(0);
    setTowerDefense(null);
    setDefeatedMonsters([]);
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

  const spawn = (tier, selT, name, magCost) => {
    const td = SLIME_TIERS[tier];
    const bioCost = BASE_SLIME_COST + selT.length * 5;
    if (bio < bioCost || freeMag < magCost) return;
    const baseStats = { firmness: Math.floor(5 * td.statMultiplier), slipperiness: Math.floor(5 * td.statMultiplier), viscosity: Math.floor(5 * td.statMultiplier) };
    const pass = [];
    selT.forEach(id => { const t = TRAIT_LIBRARY[id]; if (t) { baseStats[t.stat] += t.bonus; pass.push(t.passive); } });
    const maxHp = Math.floor((td.baseHp + baseStats.firmness * 3) * bon.hp);
    setSlimes(p => [...p, { id: genId(), name, tier, biomass: 0, traits: selT, pass, baseStats, maxHp, magCost }]);
    setBio(p => p - bioCost);
    setTraits(p => { const n = { ...p }; selT.forEach(t => { n[t]--; if (n[t] <= 0) delete n[t]; }); return n; });
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

  const [expDuration, setExpDuration] = useState('10'); // '10', '100', 'infinite'
  const [expSummary, setExpSummary] = useState(null);

  // Helper function to calculate current stats based on biomass
  const getSlimeStats = (slime) => {
    if (!slime) return { firmness: 0, slipperiness: 0, viscosity: 0 };
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
    setExps(pr => ({ ...pr, [zone]: { party: p, monster: null, kills: 0, targetKills, materials: {}, timer: 0, turn: 0, animSlime: null, slimeAnim: 'idle', monAnim: 'idle' } }));
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

      // Distribute biomass to surviving slimes
      setSlimes(slimes => slimes.map(sl => {
        const partyMember = exp.party.find(p => p.id === sl.id);
        if (partyMember && partyMember.hp > 0) {
          return { ...sl, biomass: (sl.biomass || 0) + (partyMember.biomassGained || 0) };
        }
        return sl;
      }));

      log(`Recalled from ${ZONES[zone].name}! Materials secured.`);
    } else {
      log(`Party wiped in ${ZONES[zone].name}! Materials lost.`);
    }

    setExpSummary(summary);
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
          if (!exp.monster) {
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

            const slimeTurn = exp.turn % 2 === 0;
            exp.turn++;

            if (slimeTurn) {
              living.forEach((p, idx) => {
                if (mon.hp <= 0) return;
                const sl = slimes.find(s => s.id === p.id);
                if (!sl) return;
                const stats = getSlimeStats(sl);
                let dmg = stats.firmness;
                let crit = false;
                if (sl.pass?.includes('ferocity')) dmg *= 1.15;
                const critCh = 0.05 + stats.slipperiness * 0.01 + (sl.pass?.includes('trickster') ? 0.08 : 0);
                if (sl.pass?.includes('ambush') && !p.usedAmbush) { crit = true; p.usedAmbush = true; }
                else if (Math.random() < critCh) crit = true;
                if (crit) dmg *= (1.5 + (sl.pass?.includes('crushing') ? 0.3 : 0));
                dmg = Math.floor(dmg * (1 + bon.spd * 0.1));
                mon.hp -= dmg;
                if (sl.pass?.includes('fireBreath') && !(mon.status || []).some(s => s.type === 'burn') && Math.random() < 0.3 + stats.viscosity * 0.02) { mon.status.push({ type: 'burn', dur: STATUS_EFFECTS.burn.dur }); bLog(zone, `${sl.name} burns ${md.name}! 🔥`, '#f97316'); }
                if (sl.pass?.includes('poison') && !(mon.status || []).some(s => s.type === 'poison') && Math.random() < 0.35 + stats.viscosity * 0.02) { mon.status.push({ type: 'poison', dur: STATUS_EFFECTS.poison.dur }); bLog(zone, `${sl.name} poisons ${md.name}! 🧪`, '#22c55e'); }
                if (idx === 0) { exp.animSlime = p.id; exp.slimeAnim = 'attack'; exp.monAnim = 'hurt'; }
                bLog(zone, `${sl.name} ${crit ? '💥CRITS' : 'hits'} for ${Math.floor(dmg)}!`, crit ? '#f59e0b' : '#4ade80');
              });
              if (mon.hp <= 0) {
                exp.kills++;
                let bioG = Math.floor(md.biomass * bon.bio);
                living.forEach(p => { const sl = slimes.find(s => s.id === p.id); if (sl?.pass?.includes('manaLeech')) bioG = Math.floor(bioG * 1.1); });

                // Distribute biomass evenly among living party members
                const bioPerSlime = bioG / living.length;
                living.forEach(p => {
                  p.biomassGained = (p.biomassGained || 0) + bioPerSlime;
                });
                bLog(zone, `${md.name} defeated! +${Math.floor(bioPerSlime)}🧬 each`, '#4ade80');

                // Track defeated monsters for compendium
                setDefeatedMonsters(dm => dm.includes(mon.type) ? dm : [...dm, mon.type]);

                // Material drops (50% chance) - add to expedition materials
                if (Math.random() < 0.5) {
                  const mat = md.mats[Math.floor(Math.random() * md.mats.length)];
                  exp.materials[mat] = (exp.materials[mat] || 0) + 1;
                  bLog(zone, `Found ${mat}! 📦`, '#f59e0b');
                }

                // Trait drops (existing drop rate) - add immediately
                if (Math.random() < md.drop) {
                  setTraits(t => ({ ...t, [md.trait]: (t[md.trait] || 0) + 1 }));
                  bLog(zone, `✨ RARE: ${TRAIT_LIBRARY[md.trait].name}! ✨`, '#a855f7');
                  log(`Got ${TRAIT_LIBRARY[md.trait].name}!`);
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
                  tgt.hp -= Math.floor(inc);
                  bLog(zone, `${md.name} hits ${tgtSl?.name} for ${Math.floor(inc)}!`, '#ef4444');
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

      {expSummary && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 15, padding: 25, maxWidth: 400, width: '100%', border: `2px solid ${expSummary.survivors.length > 0 ? '#4ade80' : '#ef4444'}` }}>
            <h2 style={{ margin: '0 0 15px', fontSize: 20, color: expSummary.survivors.length > 0 ? '#4ade80' : '#ef4444', textAlign: 'center' }}>
              {expSummary.survivors.length > 0 ? '✅ Expedition Complete!' : '💀 Party Wiped!'}
            </h2>

            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
              <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>📊 Expedition Stats</div>
              <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Zone:</span>
                  <strong>{expSummary.zone}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Enemies Defeated:</span>
                  <strong style={{ color: '#f59e0b' }}>{expSummary.kills}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Survivors:</span>
                  <strong style={{ color: expSummary.survivors.length > 0 ? '#4ade80' : '#ef4444' }}>
                    {expSummary.survivors.length}/{expSummary.totalParty}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Biomass Distributed:</span>
                  <strong style={{ color: '#22d3ee' }}>{Math.floor(expSummary.biomassDistributed)}</strong>
                </div>
              </div>
            </div>

            {expSummary.survivors.length > 0 ? (
              <div style={{ background: 'rgba(74,222,128,0.2)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#4ade80' }}>📦 Materials Secured</div>
                {Object.keys(expSummary.materials).length > 0 ? (
                  <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
                    {Object.entries(expSummary.materials).map(([mat, count]) => (
                      <div key={mat} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{mat}:</span>
                        <strong style={{ color: '#4ade80' }}>+{count}</strong>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, opacity: 0.7 }}>No materials found</div>
                )}
              </div>
            ) : (
              <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
                <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#ef4444' }}>💀 Total Loss</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  All slimes perished. Materials and biomass lost.
                </div>
              </div>
            )}

            <button
              onClick={() => setExpSummary(null)}
              style={{
                width: '100%',
                padding: 12,
                background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
                border: 'none',
                borderRadius: 8,
                color: '#fff',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: 14
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 20, background: 'rgba(236,72,153,0.1)', borderRadius: 12, marginBottom: 20 }}>
              <SlimeSprite tier="royal" size={80} isQueen />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 'bold' }}>The Hive Queen</div>
                <div style={{ fontSize: 14, opacity: 0.7 }}>Level {queen.level}</div>
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 10, background: 'rgba(0,0,0,0.5)', borderRadius: 5, overflow: 'hidden' }}>
                    <div style={{ width: `${(queen.xp / (queen.level * 100)) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #ec4899, #f472b6)' }} />
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>{queen.xp}/{queen.level * 100} XP</div>
                </div>
              </div>
            </div>
            <SlimeForge traits={traits} biomass={bio} freeMag={freeMag} tiers={unlockedTiers} onSpawn={spawn} />
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
            slimes.length ? (
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
                        <SlimeSprite tier={s.tier} size={45} hp={expS?.hp} maxHp={expS?.maxHp || s.maxHp} traits={s.traits} status={expS?.status} />
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
          )
        )}

        {tab === 2 && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 15 }}>
              {Object.entries(ZONES).map(([k, z]) => {
                const ok = z.unlocked || queen.level >= (z.unlock || 0);
                const has = exps[k];
                return <button key={k} onClick={() => ok && setSelZone(k)} style={{ padding: 10, background: selZone === k ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${selZone === k ? '#22d3ee' : has ? '#4ade80' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: ok ? 'pointer' : 'not-allowed', opacity: ok ? 1 : 0.4, textAlign: 'center' }}>
                  <div style={{ fontSize: 24 }}>{z.icon}</div>
                  <div style={{ fontSize: 11 }}>{z.name}</div>
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
                    { value: '10', label: '10 Enemies', icon: '⚡' },
                    { value: '100', label: '100 Enemies', icon: '⚔️' },
                    { value: 'infinite', label: 'Infinite', icon: '♾️' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setExpDuration(opt.value)}
                      style={{
                        flex: 1,
                        padding: 10,
                        background: expDuration === opt.value ? 'rgba(34,211,238,0.3)' : 'rgba(0,0,0,0.3)',
                        border: `2px solid ${expDuration === opt.value ? '#22d3ee' : 'transparent'}`,
                        borderRadius: 8,
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: 10,
                        fontWeight: expDuration === opt.value ? 'bold' : 'normal'
                      }}
                    >
                      <div style={{ fontSize: 16 }}>{opt.icon}</div>
                      <div>{opt.label}</div>
                    </button>
                  ))}
                </div>
                <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Party (max 4)</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {[0, 1, 2, 3].map(i => {
                    const sid = party[i];
                    const sl = slimes.find(s => s.id === sid);
                    return <div key={i} onClick={() => sid && setParty(p => p.filter(id => id !== sid))} style={{ width: 60, height: 70, background: 'rgba(0,0,0,0.3)', border: '2px dashed rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: sl ? 'pointer' : 'default' }}>
                      {sl ? <><SlimeSprite tier={sl.tier} size={30} traits={sl.traits} /><div style={{ fontSize: 9, marginTop: 2 }}>🧬{Math.floor(sl.biomass || 0)}</div></> : <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>}
                    </div>;
                  })}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15, maxHeight: 100, overflowY: 'auto' }}>
                  {avail.map(s => <div key={s.id} onClick={() => party.length < 4 && setParty(p => [...p, s.id])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 9 }}><SlimeSprite tier={s.tier} size={24} traits={s.traits} /><span style={{ marginTop: 2 }}>{s.name.split(' ')[0]}</span></div>)}
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
                          {sl ? <><SlimeSprite tier={sl.tier} size={30} traits={sl.traits} /><div style={{ fontSize: 9, marginTop: 2 }}>🧬{Math.floor(sl.biomass || 0)}</div></> : <span style={{ fontSize: 24, opacity: 0.3 }}>+</span>}
                        </div>;
                      })}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 15, maxHeight: 150, overflowY: 'auto' }}>
                      {avail.map(s => <div key={s.id} onClick={() => party.length < tdSlots && setParty(p => [...p, s.id])} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 9 }}><SlimeSprite tier={s.tier} size={24} traits={s.traits} /><span style={{ marginTop: 2 }}>{s.name.split(' ')[0]}</span></div>)}
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
                      return <div key={ds.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 6, background: 'rgba(74,222,128,0.1)', borderRadius: 6, fontSize: 9 }}>
                        <SlimeSprite tier={sl.tier} size={32} traits={sl.traits} />
                        <span style={{ marginTop: 2 }}>{sl.name.split(' ')[0]}</span>
                        <span style={{ fontSize: 8, opacity: 0.7 }}>DPS: {Math.floor((sl.stats.firmness + sl.level * 1.2) * (1 + sl.stats.slipperiness * 0.1))}</span>
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

        {tab === 5 && <Compendium queen={queen} defeatedMonsters={defeatedMonsters} />}

        {tab === 6 && (
          <div>
            {activeRes && (
              <div style={{ background: 'rgba(34,211,238,0.1)', padding: 15, borderRadius: 10, marginBottom: 15 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><span>{RESEARCH[activeRes.id].name}</span><span style={{ color: '#22d3ee', fontFamily: 'monospace' }}>⏱️ {getResTime()}</span></div>
                <div style={{ height: 12, background: 'rgba(0,0,0,0.5)', borderRadius: 6, overflow: 'hidden' }}><div style={{ width: `${activeRes.prog}%`, height: '100%', background: 'linear-gradient(90deg, #22d3ee, #4ade80)' }} /></div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>{Math.floor(activeRes.prog)}%</div>
              </div>
            )}
            <div style={{ display: 'grid', gap: 10 }}>
              {Object.entries(RESEARCH).map(([k, r]) => {
                const done = research.includes(k);
                return <div key={k} style={{ padding: 15, background: 'rgba(0,0,0,0.3)', borderRadius: 10, borderLeft: done ? '3px solid #4ade80' : activeRes?.id === k ? '3px solid #22d3ee' : '3px solid transparent' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{r.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{r.desc}</div>
                  <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>Time: {Math.floor(r.time / 60)}:{(r.time % 60).toString().padStart(2, '0')}</div>
                  {!done && !activeRes && <button onClick={() => startRes(k)} disabled={bio < r.cost} style={{ padding: '8px 16px', background: bio >= r.cost ? '#4ade80' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: bio >= r.cost ? 'pointer' : 'not-allowed' }}>Research ({r.cost}🧬)</button>}
                  {done && <span style={{ color: '#4ade80' }}>✓ Complete</span>}
                </div>;
              })}
            </div>
          </div>
        )}

        {tab === 7 && (
          <div style={{ display: 'grid', gap: 10 }}>
            {Object.entries(BUILDINGS).map(([k, b]) => {
              const can = Object.entries(b.cost).every(([m, c]) => (mats[m] || 0) >= c);
              const max = b.max && (builds[k] || 0) >= b.max;
              return <div key={k} style={{ padding: 15, background: 'rgba(0,0,0,0.3)', borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}><span style={{ fontSize: 28 }}>{b.icon}</span><div><div style={{ fontWeight: 'bold' }}>{b.name}</div><div style={{ fontSize: 12, opacity: 0.7 }}>{b.desc}</div></div><span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 18 }}>x{builds[k] || 0}</span></div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>{Object.entries(b.cost).map(([m, c]) => <span key={m} style={{ fontSize: 11, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, color: (mats[m] || 0) >= c ? '#4ade80' : '#ef4444' }}>{m}: {c}</span>)}</div>
                <button onClick={() => build(k)} disabled={!can || max} style={{ padding: '8px 16px', background: can && !max ? '#4ade80' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: can && !max ? 'pointer' : 'not-allowed' }}>{max ? 'Max' : 'Build'}</button>
              </div>;
            })}
          </div>
        )}

        {tab === 8 && <SettingsTab onSave={manualSave} onDelete={handleDelete} lastSave={lastSave} />}
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
