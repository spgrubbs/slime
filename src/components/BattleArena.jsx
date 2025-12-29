import React, { useRef, useEffect } from 'react';
import { ZONES } from '../data/zoneData.js';
import { BATTLE_TICK_SPEED } from '../data/gameConstants.js';
import SlimeSprite from './SlimeSprite.jsx';
import MonsterSprite from './MonsterSprite.jsx';

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
                <SlimeSprite tier={sl.tier} size={38} hp={p.hp} maxHp={p.maxHp} mutations={sl.mutations} anim={exp.animSlime === p.id ? exp.slimeAnim : 'idle'} status={p.status || []} primaryElement={sl.primaryElement} />
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
      {exp.monster && (
        <div style={{ padding: '0 12px 8px', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Next action</div>
          <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' }}>
            <div
              style={{
                width: `${(exp.timer / (BATTLE_TICK_SPEED / 1)) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #22d3ee, #4ade80)',
                transition: 'width 0.1s linear'
              }}
            />
          </div>
        </div>
      )}
      <div ref={logRef} style={{ height: 100, overflowY: 'auto', background: 'rgba(0,0,0,0.5)', padding: '8px 12px', fontSize: 11 }}>
        {(logs || []).slice(-20).map((l,i) => (
          <div key={i} style={{ padding: '3px 0', color: l.c || '#888' }}>{l.m}</div>
        ))}
      </div>
    </div>
  );
};

export default BattleArena;
