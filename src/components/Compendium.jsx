import React, { useState } from 'react';
import { ZONES } from '../data/zoneData.js';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { ELEMENTS } from '../data/gameConstants.js';

const Compendium = ({ queen, monsterKills, unlockedMutations }) => {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 24 }}>{z.icon}</span>
          {z.element && ELEMENTS[z.element] && (
            <span style={{ fontSize: 16, padding: '4px 8px', background: `${ELEMENTS[z.element].color}33`, borderRadius: 6, border: `1px solid ${ELEMENTS[z.element].color}` }}>
              {ELEMENTS[z.element].icon} {ELEMENTS[z.element].name}
            </span>
          )}
        </div>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginTop: 8, marginBottom: 5 }}>{z.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{z.desc}</div>
        {z.unlock && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 5 }}>Unlocks at Queen Lv.{z.unlock}</div>}
      </div>
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Monsters</div>
      {z.monsters.map(mid => {
        const m = MONSTER_TYPES[mid];
        const mutation = MUTATION_LIBRARY[m.trait];
        const kills = monsterKills[mid] || 0;
        const discovered = kills > 0;
        const requiredKills = mutation?.requiredKills || 100;
        const mutationUnlocked = unlockedMutations?.includes(m.trait);
        const killProgress = Math.min(kills / requiredKills * 100, 100);
        const element = m.element ? ELEMENTS[m.element] : null;

        if (!discovered) {
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
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: 40 }}>{m.icon}</span>
                {element && (
                  <span style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -8,
                    fontSize: 14,
                    background: `${element.color}33`,
                    borderRadius: '50%',
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${element.color}`,
                  }}>
                    {element.icon}
                  </span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>{m.name}</div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{'⭐'.repeat(m.diff)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: mutationUnlocked ? '#4ade80' : '#888' }}>
                  💀 {kills}{!mutationUnlocked && `/${requiredKills}`}
                </div>
                {mutationUnlocked && <div style={{ fontSize: 10, color: '#4ade80' }}>✓ Mastered</div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, flexWrap: 'wrap' }}>
              <span>❤️ {m.hp}</span><span>⚔️ {m.dmg}</span><span>🧬 +{m.biomass}</span>
              {element && <span style={{ color: element.color }}>{element.icon} {element.name}</span>}
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Abilities</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {m.abilities.map((a,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(168,85,247,0.2)', borderRadius: 4 }}>{a}</span>)}
              </div>
            </div>
            {/* Mutation unlock progress */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 10, opacity: 0.6 }}>Mutation Progress</div>
                <div style={{ fontSize: 10, color: mutationUnlocked ? '#4ade80' : '#888' }}>
                  {mutationUnlocked ? 'Unlocked!' : `${kills}/${requiredKills}`}
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(0,0,0,0.5)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${killProgress}%`,
                  height: '100%',
                  background: mutationUnlocked ? '#4ade80' : `linear-gradient(90deg, ${mutation?.color || '#888'}, ${mutation?.color || '#888'}cc)`,
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
            {/* Mutation reward info */}
            {mutation && (
              <div style={{ background: mutationUnlocked ? `${mutation.color}22` : 'rgba(0,0,0,0.2)', borderRadius: 8, padding: 10, border: mutationUnlocked ? `1px solid ${mutation.color}` : '1px solid transparent' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 16 }}>{mutation.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 'bold', color: mutationUnlocked ? mutation.color : '#888' }}>{mutation.name}</span>
                  {mutation.elementBonus && Object.entries(mutation.elementBonus).map(([elem, val]) => (
                    <span key={elem} style={{ fontSize: 10, marginLeft: 'auto', color: ELEMENTS[elem]?.color }}>
                      {ELEMENTS[elem]?.icon}+{val}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: 10, opacity: mutationUnlocked ? 1 : 0.5 }}>
                  {mutation.passiveDesc}
                </div>
              </div>
            )}
            {/* Material drops */}
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Material Drops</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {m.mats.map((mat,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4 }}>📦 {mat} <span style={{ opacity: 0.6 }}>(50%)</span></span>)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Compendium;
