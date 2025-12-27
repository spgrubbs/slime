import React from 'react';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { STATUS_EFFECTS } from '../data/traitData.js';

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

export default MonsterSprite;
