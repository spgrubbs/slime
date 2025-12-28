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
        <div style={{ fontSize: 24, marginBottom: 5 }}>{z.icon}</div>
        <div style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 5 }}>{z.name}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{z.desc}</div>
        {z.unlock && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 5 }}>Unlocks at Queen Lv.{z.unlock}</div>}
        {z.element && (
          <div style={{ fontSize: 11, color: ELEMENTS[z.element]?.color, marginTop: 5 }}>
            {ELEMENTS[z.element]?.icon} {ELEMENTS[z.element]?.name} Zone (+{z.elementGainRate}/kill)
          </div>
        )}
      </div>
      <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Monsters</div>
      {z.monsters.map(mid => {
        const m = MONSTER_TYPES[mid];
        const mutation = MUTATION_LIBRARY[m.trait];
        const kills = monsterKills[mid] || 0;
        const isUnlocked = unlockedMutations.includes(m.trait);
        const progress = Math.min(100, (kills / mutation.requiredKills) * 100);
        const discovered = kills > 0;

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
              <span style={{ fontSize: 40 }}>{m.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 'bold' }}>{m.name}</span>
                  {m.element && (
                    <span style={{ fontSize: 12, color: ELEMENTS[m.element]?.color }}>
                      {ELEMENTS[m.element]?.icon}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{'⭐'.repeat(m.diff)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#4ade80' }}>{kills}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>kills</div>
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
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Material Drops</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {m.mats.map((mat,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4 }}>📦 {mat} <span style={{ opacity: 0.6 }}>(50%)</span></span>)}
              </div>
            </div>

            {/* Mutation Progress Section */}
            <div style={{
              background: isUnlocked ? `${mutation.color}22` : 'rgba(0,0,0,0.2)',
              borderRadius: 8,
              padding: 10,
              border: isUnlocked ? `2px solid ${mutation.color}` : '2px solid transparent'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 16 }}>{mutation.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 'bold' }}>{mutation.name}</span>
                  {isUnlocked && <span style={{ fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,0.2)', padding: '2px 6px', borderRadius: 4 }}>UNLOCKED</span>}
                </div>
                <span style={{ fontSize: 11, opacity: 0.8 }}>{kills}/{mutation.requiredKills}</span>
              </div>

              {/* Progress Bar */}
              <div style={{ height: 8, background: 'rgba(0,0,0,0.4)', borderRadius: 4, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  width: `${progress}%`,
                  height: '100%',
                  background: isUnlocked
                    ? `linear-gradient(90deg, ${mutation.color}, ${mutation.color}cc)`
                    : 'linear-gradient(90deg, #4ade80, #22c55e)',
                  transition: 'width 0.3s',
                  boxShadow: isUnlocked ? `0 0 8px ${mutation.color}` : 'none'
                }} />
              </div>

              {/* Mutation Details */}
              <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 4 }}>
                +{mutation.bonus} {mutation.stat} • {mutation.passiveDesc}
              </div>
              {mutation.elementBonus && (
                <div style={{ fontSize: 10 }}>
                  {Object.entries(mutation.elementBonus).map(([elem, bonus]) => (
                    <span key={elem} style={{ color: ELEMENTS[elem]?.color, marginRight: 8 }}>
                      {ELEMENTS[elem]?.icon}+{bonus}% starting affinity
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Compendium;
