import React, { useState } from 'react';
import { ZONES } from '../data/zoneData.js';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { TRAIT_LIBRARY } from '../data/traitData.js';

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

export default Compendium;
