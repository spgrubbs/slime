import React, { useState } from 'react';
import { ZONES } from '../data/zoneData.js';
import { MONSTER_TYPES, MONSTER_ABILITIES, MATERIAL_RATES, MUTAGEN_RATES, MUTAGEN_PITY_KILLS } from '../data/monsterData.js';
import { MUTATION_LIBRARY, SLIME_TRAITS, STATUS_EFFECTS, TRAIT_RARITY_COLORS } from '../data/traitData.js';
import { SLIME_TIERS, STAT_INFO } from '../data/slimeData.js';
import { ELEMENTS } from '../data/gameConstants.js';
import { TUTORIALS, TUTORIAL_ORDER, TUTORIAL_CATEGORIES } from '../data/tutorialData.js';
import { renderEmphasis } from './TutorialModal.jsx';

const card = { background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 };
const heading = (color) => ({ fontSize: 14, fontWeight: 'bold', marginBottom: 10, color });

// ── Guide: the tutorials, once they have been seen ───────────────────────────

function Guide({ seenTutorials = [] }) {
  const byCategory = {};
  TUTORIAL_ORDER.forEach(id => {
    const t = TUTORIALS[id];
    (byCategory[t.category] = byCategory[t.category] || []).push(t);
  });

  return (
    <div>
      <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 12 }}>
        Everything the game has explained to you, kept for reference. Entries appear
        as you meet them.
      </div>
      {Object.entries(byCategory).map(([catId, entries]) => {
        const cat = TUTORIAL_CATEGORIES[catId];
        return (
          <div key={catId} style={card}>
            <div style={heading('#a855f7')}>{cat.icon} {cat.name}</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {entries.map(t => {
                const seen = seenTutorials.includes(t.id);
                return (
                  <div key={t.id} style={{ opacity: seen ? 1 : 0.35 }}>
                    <div style={{ fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                      {seen ? t.icon : '🔒'} {seen ? t.title : 'Not yet discovered'}
                    </div>
                    {seen && t.body.map((line, i) => (
                      <div key={i} style={{ fontSize: 11, opacity: 0.85, lineHeight: 1.5, marginLeft: 4 }}>
                        · {renderEmphasis(line, i)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Reference: derived from the data, so it cannot drift ─────────────────────

function Reference() {
  return (
    <div>
      <div style={card}>
        <div style={heading('#22d3ee')}>🧫 Slime Tiers</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 340 }}>
            <thead>
              <tr style={{ opacity: 0.6 }}>
                {['Tier', '🍯', 'Stats', 'Slots', 'HP', 'Held cap'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 8px 6px 0', fontWeight: 'normal' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(SLIME_TIERS).map(([id, t]) => (
                <tr key={id} style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <td style={{ padding: '6px 8px 6px 0', color: t.color, fontWeight: 'bold' }}>{t.name}</td>
                  <td style={{ padding: '6px 8px 6px 0' }}>{t.jellyCost}</td>
                  <td style={{ padding: '6px 8px 6px 0' }}>×{t.statMultiplier}</td>
                  <td style={{ padding: '6px 8px 6px 0' }}>{t.traitSlots}</td>
                  <td style={{ padding: '6px 8px 6px 0' }}>{t.baseHp}</td>
                  <td style={{ padding: '6px 8px 6px 0' }}>+{t.maxBiomassBonus}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>
          Held cap is temporary power from carried biomass — lost if the slime goes down.
        </div>
      </div>

      <div style={card}>
        <div style={heading('#f59e0b')}>📊 Stats</div>
        <div style={{ display: 'grid', gap: 8, fontSize: 12 }}>
          {Object.entries(STAT_INFO).map(([k, v]) => (
            <div key={k}>
              <span style={{ color: v.color, fontWeight: 'bold' }}>{v.icon} {v.name}</span>
              <span style={{ opacity: 0.8 }}> — {v.desc}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>
          Dodge and crit have diminishing returns; all evasion caps at 70%.
        </div>
      </div>

      <div style={card}>
        <div style={heading('#ef4444')}>🌡️ Status Effects</div>
        <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
          {Object.entries(STATUS_EFFECTS).map(([k, e]) => (
            <div key={k}>
              <span style={{ color: e.color, fontWeight: 'bold' }}>{e.icon} {e.name}</span>
              <span style={{ opacity: 0.75 }}>
                {' — '}{e.dur} round{e.dur === 1 ? '' : 's'}
                {e.dmg ? `, ${e.dmg} damage each` : ''}
                {e.skipsTurn ? ', loses its turn' : ''}
                {e.dmgMult ? `, ×${e.dmgMult} outgoing damage` : ''}
                {e.speedMult ? `, ×${e.speedMult} speed` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={heading('#4ade80')}>🔥 Elements</div>
        <div style={{ display: 'grid', gap: 6, fontSize: 11 }}>
          {Object.entries(ELEMENTS).map(([k, e]) => (
            <div key={k}>
              <span style={{ color: e.color, fontWeight: 'bold' }}>{e.icon} {e.name}</span>
              <span style={{ opacity: 0.75 }}>
                {' — strong vs '}{ELEMENTS[e.strong].icon}, weak vs {ELEMENTS[e.weak].icon}
              </span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>Strong ×1.25 · weak ×0.75</div>
      </div>

      <div style={card}>
        <div style={heading('#a855f7')}>🧬 Personality Traits</div>
        <div style={{ display: 'grid', gap: 5, fontSize: 11 }}>
          {Object.entries(SLIME_TRAITS).map(([k, t]) => (
            <div key={k}>
              <span style={{ color: TRAIT_RARITY_COLORS[t.rarity], fontWeight: 'bold' }}>
                {t.icon} {t.name}
              </span>
              <span style={{ opacity: 0.75 }}> — {t.desc}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={card}>
        <div style={heading('#f59e0b')}>📦 Material Drops</div>
        <div style={{ display: 'grid', gap: 5, fontSize: 11 }}>
          <div><strong>Common</strong> — {Math.round(MATERIAL_RATES.common * 100)}% per kill</div>
          <div><strong>Uncommon</strong> — {Math.round(MATERIAL_RATES.uncommon * 100)}%</div>
          <div><strong>Gating</strong> — {Math.round(MATERIAL_RATES.gating * 100)}%, wanted in bulk by one building</div>
          <div><strong>From a rare monster</strong> — {Math.round(MATERIAL_RATES.fromRare * 100)}%</div>
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 8 }}>
          Each material rolls on its own, so one kill can drop several or none.
        </div>
      </div>
    </div>
  );
}

const Compendium = ({ queen, monsterKills, mutagens = {}, seenTutorials = [] }) => {
  const [tab, setTab] = useState('zones'); // 'zones' | 'guide' | 'reference'
  const [zone, setZone] = useState('forest');
  const z = ZONES[zone];

  return (
    <div>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 15 }}>
        <button onClick={() => setTab('zones')} style={{ padding: '10px 16px', background: tab === 'zones' ? 'rgba(34,211,238,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'zones' ? '#22d3ee' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          🗺️ Zones & Monsters
        </button>
        <button onClick={() => setTab('guide')} style={{ padding: '10px 16px', background: tab === 'guide' ? 'rgba(168,85,247,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'guide' ? '#a855f7' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          📖 Guide
        </button>
        <button onClick={() => setTab('reference')} style={{ padding: '10px 16px', background: tab === 'reference' ? 'rgba(236,72,153,0.2)' : 'rgba(0,0,0,0.3)', border: `2px solid ${tab === 'reference' ? '#ec4899' : 'transparent'}`, borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 'bold' }}>
          📐 Reference
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
            // Mutations are items now: what matters is whether you hold one,
            // and how close the pity floor is to handing you another.
            const held = mutation ? (mutagens?.[m.mutation] || 0) : 0;
            const isUnlocked = held > 0;
            const progress = mutation ? Math.min(100, ((kills % MUTAGEN_PITY_KILLS) / MUTAGEN_PITY_KILLS) * 100) : 0;
            const discovered = kills > 0;
            const monAbility = m.ability ? MONSTER_ABILITIES[m.ability] : null;

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
                <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 8 }}>
                  <span style={{ fontSize: 40 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16, fontWeight: 'bold' }}>{m.name}</span>
                      {m.rare && <span style={{ fontSize: 9, color: '#f59e0b', background: 'rgba(245,158,11,0.2)', padding: '2px 6px', borderRadius: 4 }}>RARE</span>}
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
                {m.desc && <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10, fontStyle: 'italic' }}>{m.desc}</div>}
                <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11, flexWrap: 'wrap' }}>
                  <span>❤️ {m.hp} HP</span><span>⚔️ {m.dmg} ATK</span><span>🧬 +{m.biomass} biomass</span>
                </div>
                {monAbility && (
                  <div style={{ marginBottom: 10, background: 'rgba(168,85,247,0.1)', borderRadius: 6, padding: 8 }}>
                    <div style={{ fontSize: 10, opacity: 0.6, marginBottom: 4 }}>Special Ability</div>
                    <div style={{ fontSize: 11 }}>
                      <span>{monAbility.icon} <strong>{monAbility.name}</strong></span>
                      <span style={{ opacity: 0.7 }}> - {monAbility.desc}</span>
                      <span style={{ opacity: 0.5, fontSize: 10 }}> ({Math.round(monAbility.chance * 100)}% chance)</span>
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
                        {isUnlocked && <span style={{ fontSize: 10, color: '#4ade80', background: 'rgba(74,222,128,0.2)', padding: '2px 6px', borderRadius: 4 }}>×{held} HELD</span>}
                      </div>
                      <span style={{ fontSize: 11, opacity: 0.8 }} title="Kills until a mutagen is guaranteed, whatever the drop rolls do">
                        {kills % MUTAGEN_PITY_KILLS}/{MUTAGEN_PITY_KILLS}
                      </span>
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
                      {mutation.stat && mutation.bonus && `+${mutation.bonus} ${mutation.stat} (on spawn) • `}
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
      ) : tab === 'guide' ? (
        <Guide seenTutorials={seenTutorials} />
      ) : (
        <Reference />
      )}
    </div>
  );
};

export default Compendium;
