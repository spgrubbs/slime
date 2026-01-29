import React, { useState } from 'react';
import { ZONES } from '../data/zoneData.js';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { ELEMENTS } from '../data/gameConstants.js';

const Compendium = ({ queen, monsterKills, unlockedMutations }) => {
  const [tab, setTab] = useState('zones'); // 'zones' | 'mechanics'
  const [zone, setZone] = useState('forest');
  const z = ZONES[zone];

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 15 }}>
        <button onClick={() => setTab('zones')} style={{ padding: '10px 16px', background: tab === 'zones' ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'zones' ? '#22d3ee' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          🗺️ Zones & Monsters
        </button>
        <button onClick={() => setTab('mechanics')} style={{ padding: '10px 16px', background: tab === 'mechanics' ? 'rgba(236,72,153,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'mechanics' ? '#ec4899' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          📖 Game Mechanics
        </button>
      </div>

      {tab === 'zones' ? (
        <>
          <div style={{ display: 'flex', gap: 6, marginBottom: 15, flexWrap: 'wrap' }}>
            {Object.entries(ZONES).map(([k,zn]) => {
              const ok = zn.unlocked || (queen?.level || 1) >= (zn.unlock || 0);
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
            if (!m) return null;
            const mutation = m.mutation ? MUTATION_LIBRARY[m.mutation] : null;
            const kills = monsterKills?.[mid] || 0;
            const isUnlocked = mutation && unlockedMutations?.includes(m.mutation);
            const progress = mutation ? Math.min(100, (kills / mutation.requiredKills) * 100) : 0;
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
                    <div style={{ fontSize: 11, opacity: 0.7 }}>{'⭐'.repeat(m.tier || 1)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 'bold', color: '#4ade80' }}>{kills}</div>
                    <div style={{ fontSize: 10, opacity: 0.6 }}>kills</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, flexWrap: 'wrap' }}>
                  <span>❤️ {m.hp}</span><span>⚔️ {m.dmg}</span><span>🧬 +{m.biomass}</span>
                </div>
                {m.abilities && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Abilities</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {m.abilities.map((a,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(168,85,247,0.2)', borderRadius: 4 }}>{a}</span>)}
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Material Drops</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.mats.map((mat,i) => <span key={i} style={{ fontSize: 10, padding: '3px 8px', background: 'rgba(245,158,11,0.2)', borderRadius: 4 }}>📦 {mat} <span style={{ opacity: 0.6 }}>(50%)</span></span>)}
                  </div>
                </div>

                {/* Mutation Progress Section - only show if monster has a mutation */}
                {mutation && (
                  <div style={{
                    background: isUnlocked ? 'rgba(168,85,247,0.15)' : 'rgba(0,0,0,0.2)',
                    borderRadius: 8,
                    padding: 10,
                    border: isUnlocked ? '2px solid #a855f7' : '2px solid transparent'
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
                          ? 'linear-gradient(90deg, #a855f7, #c084fc)'
                          : 'linear-gradient(90deg, #4ade80, #22c55e)',
                        transition: 'width 0.3s',
                        boxShadow: isUnlocked ? '0 0 8px #a855f7' : 'none'
                      }} />
                    </div>

                    {/* Mutation Details */}
                    <div style={{ fontSize: 10, opacity: 0.8, marginBottom: 4 }}>
                      {mutation.stat && mutation.bonus && `+${mutation.bonus} ${mutation.stat} • `}
                      {typeof mutation.passiveDesc === 'function' ? mutation.passiveDesc(10) : mutation.passiveDesc}
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
                )}
              </div>
            );
          })}
        </>
      ) : (
        <div style={{ display: 'grid', gap: 15 }}>
          {/* Core Resources */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#4ade80' }}>🧬 Core Resources</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Biomass 🧬</strong> - The primary currency, gained from defeating monsters. Used for spawning slimes and building structures.</div>
              <div><strong>Royal Jelly 🍯</strong> - The Queen's essence used to sustain slimes. Base amount is 50, +10 per Queen level, and +10 per Slime Pit building. Each slime tier and mutation costs Royal Jelly.</div>
              <div><strong>Prisms 💎</strong> - Premium currency for special ranch buildings. Earned through special events and achievements.</div>
              <div><strong>Materials 📦</strong> - Dropped by monsters. Used for buildings, ranch structures, and unlocking features.</div>
            </div>
          </div>

          {/* Queen System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#ec4899' }}>👑 Queen System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Queen Level</strong> - Increases by reabsorbing slimes. Higher levels unlock new zones, slime tiers, and increase Royal Jelly capacity.</div>
              <div><strong>Reabsorption</strong> - Dissolve a slime to gain XP based on its accumulated experience. Slimes gain XP by fighting monsters.</div>
              <div><strong>Unlocks</strong> - Level 5: Enhanced Slimes, Level 15: Elite Slimes, Level 30: Royal Slimes. Various zones unlock at different levels.</div>
            </div>
          </div>

          {/* Combat System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#ef4444' }}>⚔️ Combat System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Stats</strong> - Firmness (attack/HP), Slipperiness (dodge/crit), Viscosity (effects/procs)</div>
              <div><strong>Elements</strong> - Fire 🔥 &gt; Nature 🌿 &gt; Earth 🪨 &gt; Water 💧 &gt; Fire (25% damage bonus when strong, 25% penalty when weak)</div>
              <div><strong>Expeditions</strong> - Send slimes to zones to fight monsters, gain biomass, materials, and elemental affinity. Continues offline!</div>
              <div><strong>Tower Defense</strong> - Defend against human invaders. Difficulty scales with Queen level. 24-hour cooldown between battles.</div>
            </div>
          </div>

          {/* Element System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#3b82f6' }}>✨ Element System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Affinity</strong> - Slimes gain elemental affinity from fighting in elemental zones. At 100% affinity, they become attuned to that element.</div>
              <div><strong>Element Cycle</strong>: Fire 🔥 beats Nature 🌿 beats Earth 🪨 beats Water 💧 beats Fire</div>
              <div><strong>Void Trait</strong> - Slimes with the Void trait cannot gain elemental affinity but deal neutral damage to all types.</div>
              <div><strong>Ranch Attunement</strong> - Elemental ranch buildings (Fire Grove, Tidal Pool, etc.) can also grant elemental affinity over time.</div>
            </div>
          </div>

          {/* Mutation System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#a855f7' }}>🧪 Mutation System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Unlocking</strong> - Defeat 100 of a monster type to unlock its mutation. Check the Compendium for progress.</div>
              <div><strong>Trait Slots</strong> - Basic slimes have 1 slot, Enhanced have 2, Elite have 3, Royal have 4.</div>
              <div><strong>VISC Scaling</strong> - Mutation passive effects scale with the slime's Viscosity stat. Higher viscosity = stronger effects!</div>
              <div><strong>Mutation Effects</strong> - Each mutation grants stat bonuses and unique passive abilities. Some also provide starting elemental affinity.</div>
            </div>
          </div>

          {/* Mana System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#10b981' }}>🔮 Mana System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Earning Mana</strong> - Each slime generates 1 mana per hour. More slimes = faster accumulation.</div>
              <div><strong>Hive Abilities</strong>:</div>
              <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                <li><strong>Primal Blessing</strong> - +10% stats for newly spawned slimes (2h)</li>
                <li><strong>Nurturing Aura</strong> - Double ranch tick speed (4h)</li>
                <li><strong>Swift Expedition</strong> - Expeditions move 50% faster (2h)</li>
                <li><strong>Shared Vigor</strong> - Slimes heal 2 HP on attack (2h)</li>
                <li><strong>Evolution Pulse</strong> - +50% elemental affinity gain (8h)</li>
                <li><strong>Bountiful Harvest</strong> - +25% biomass and material drops (4h)</li>
                <li><strong>Slime Decoy</strong> - Prevents first raider from reaching hive in TD (one-time)</li>
              </ul>
            </div>
          </div>

          {/* Ranch System */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#22c55e' }}>🏠 Ranch System</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Building Ranches</strong> - Unlocks at Queen Level 3. Different ranches require different materials from expeditions.</div>
              <div><strong>Accumulation</strong> - Slimes assigned to ranches passively accumulate rewards over time (max 24 hours). Collect by clicking the slime.</div>
              <div><strong>Ranch Types</strong>:</div>
              <ul style={{ margin: '0 0 0 20px', padding: 0 }}>
                <li>Feeding Pool - Passive biomass generation</li>
                <li>Elemental Ranches (Fire, Water, Earth, Nature) - Grants elemental affinity</li>
                <li>Training Pit - Increases base stats</li>
                <li>Nullifier Chamber - Grants Void trait (Prism cost)</li>
                <li>Luxury Lounge - Chance for rare personality traits (Prism cost)</li>
              </ul>
            </div>
          </div>

          {/* Personality Traits */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#f59e0b' }}>💫 Personality Traits</div>
            <div style={{ display: 'grid', gap: 10, fontSize: 12 }}>
              <div><strong>Generation</strong> - Slimes can randomly gain personality traits when spawned or from the Luxury Lounge.</div>
              <div><strong>Types</strong>: Lucky (better drops), Resilient (survive fatal hits), Adaptable (faster element gain), Void (no elements, neutral damage)</div>
              <div><strong>Visibility</strong> - Personality traits appear as badges on slime cards and in the detail view.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Compendium;
