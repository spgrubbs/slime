import React, { useState } from 'react';
import { SLIME_TIERS, STAT_INFO } from '../data/slimeData.js';
import { MUTATION_LIBRARY, SLIME_TRAITS, TRAIT_RARITY_COLORS, getMutationDesc } from '../data/traitData.js';
import { ELEMENTS } from '../data/gameConstants.js';
import SlimeSprite from './SlimeSprite.jsx';

const SlimeDetail = ({
  slime, expState, getSlimeStats, getMaxHp, mutationSlots,
  unlockedMutations = [], biomass: bank = 0, graftCost, onGraft,
}) => {
  const tier = SLIME_TIERS[slime.tier];
  const [grafting, setGrafting] = useState(false);

  // Stats and max HP come from the shared helper so this panel can never
  // disagree with what combat actually uses.
  const currentStats = getSlimeStats
    ? getSlimeStats(slime)
    : { firmness: slime.baseStats.firmness, slipperiness: slime.baseStats.slipperiness, viscosity: slime.baseStats.viscosity };
  const maxHp = getMaxHp ? getMaxHp(slime) : slime.maxHp;
  const hp = expState?.hp ?? maxHp;

  const biomass = slime.biomass || 0;
  const percentBonus = biomass / tier.biomassPerPercent;
  const cappedPercent = Math.min(percentBonus, tier.maxBiomassBonus || 100);
  const atCap = percentBonus >= (tier.maxBiomassBonus || 100);

  const mutations = slime.mutations || [];
  const slots = mutationSlots ? mutationSlots(slime) : (tier.traitSlots || 1);
  const freeSlots = Math.max(0, slots - mutations.length);
  const cost = graftCost ? graftCost(slime) : 0;
  const graftable = unlockedMutations.filter(id => !mutations.includes(id));
  const inTheField = !!expState;

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, border: `2px solid ${tier.color}33` }}>
      <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
        <SlimeSprite tier={slime.tier} size={60} hp={hp} maxHp={maxHp} mutations={mutations} status={expState?.status} primaryElement={slime.primaryElement} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', fontSize: 16 }}>{slime.name}</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{tier.name}</div>
          <div style={{ marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}><span>❤️ HP</span><span>{Math.ceil(hp)}/{maxHp}</span></div>
            <div style={{ height: 8, background: 'rgba(0,0,0,0.5)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${(hp/maxHp)*100}%`, height: '100%', background: 'linear-gradient(90deg,#ef4444,#f87171)', transition: 'width 0.3s' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}><span>🧬 Biomass</span><span>{Math.floor(biomass)} (+{cappedPercent.toFixed(1)}%)</span></div>
            <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>
              {atCap
                ? `Fully grown — capped at +${tier.maxBiomassBonus}%. Reabsorb for Queen XP.`
                : `Next 1%: ${Math.ceil(tier.biomassPerPercent - (biomass % tier.biomassPerPercent))} more`}
            </div>
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

      {/* Element Affinity Section */}
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
          Element Affinity
          {slime.primaryElement && (
            <span style={{
              background: `${ELEMENTS[slime.primaryElement].color}33`,
              color: ELEMENTS[slime.primaryElement].color,
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 'bold',
            }}>
              {ELEMENTS[slime.primaryElement].icon} {ELEMENTS[slime.primaryElement].name} (LOCKED)
            </span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {Object.entries(ELEMENTS).map(([key, elem]) => {
            const value = slime.elements?.[key] || 0;
            const isLocked = slime.primaryElement === key;
            const isDisabled = slime.primaryElement && !isLocked;
            return (
              <div key={key} style={{
                background: isDisabled ? 'rgba(0,0,0,0.2)' : `${elem.color}11`,
                padding: 6,
                borderRadius: 4,
                opacity: isDisabled ? 0.4 : 1,
                border: isLocked ? `2px solid ${elem.color}` : '2px solid transparent',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 3 }}>
                  <span>{elem.icon} {elem.name}</span>
                  <span style={{ color: elem.color, fontWeight: 'bold' }}>{Math.floor(value)}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${value}%`,
                    height: '100%',
                    background: isLocked ? `linear-gradient(90deg, ${elem.color}, ${elem.color}cc)` : elem.color,
                    transition: 'width 0.3s',
                    boxShadow: isLocked ? `0 0 8px ${elem.color}` : 'none',
                  }} />
                </div>
                {isLocked && (
                  <div style={{ fontSize: 8, marginTop: 3, color: elem.color }}>
                    Strong vs {ELEMENTS[elem.strong].icon} {ELEMENTS[elem.strong].name} | Weak vs {ELEMENTS[elem.weak].icon} {ELEMENTS[elem.weak].name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Personality Traits Section */}
      {slime.traits?.length > 0 && (
        <div style={{ marginBottom: 15 }}>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>Personality Traits</div>
          {slime.traits.map((t, i) => {
            const trait = SLIME_TRAITS[t];
            if (!trait) return null;
            const color = TRAIT_RARITY_COLORS[trait.rarity] || '#9ca3af';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: `${color}22`, borderRadius: 6, borderLeft: `3px solid ${color}`, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{trait.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 'bold' }}>{trait.name}</span>
                    <span style={{ fontSize: 9, padding: '1px 4px', background: `${color}33`, color: color, borderRadius: 3, textTransform: 'uppercase' }}>{trait.rarity}</span>
                  </div>
                  <div style={{ fontSize: 10, opacity: 0.8 }}>{trait.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Mutations Section (Combat Abilities) */}
      <div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
          Mutations ({mutations.length}/{slots})
        </div>
        <div>
          {mutations.map((m,i) => {
            const mut = MUTATION_LIBRARY[m];
            if (!mut) return null;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: `${mut.color}22`, borderRadius: 6, borderLeft: `3px solid ${mut.color}`, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{mut.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{mut.name}</div>
                  <div style={{ fontSize: 10, color: mut.color }}>{getMutationDesc(m, currentStats.viscosity)}</div>
                </div>
                {mut.elementBonus && (
                  <div style={{ fontSize: 10 }}>
                    {Object.entries(mut.elementBonus).map(([elem, bonus]) => (
                      <span key={elem} style={{ color: ELEMENTS[elem]?.color }}>
                        {ELEMENTS[elem]?.icon}+{bonus}%
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {!mutations.length && (
            <div style={{ fontSize: 11, opacity: 0.5, fontStyle: 'italic' }}>No mutations</div>
          )}
        </div>

        {/* Grafting — the point of the slots that Ancient and Alloy Potential grant */}
        {freeSlots > 0 && onGraft && (
          <div style={{ marginTop: 10, padding: 10, background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#c084fc', marginBottom: 4 }}>
              🧬 {freeSlots} open slot{freeSlots === 1 ? '' : 's'}
            </div>
            <div style={{ fontSize: 10, opacity: 0.75, marginBottom: 8 }}>
              Graft another mutation onto {slime.name.split(' ')[0]} for 🧬{cost}.
              {inTheField && ' Recall them first.'}
            </div>

            {!grafting ? (
              <button
                onClick={() => setGrafting(true)}
                disabled={bank < cost || !graftable.length || inTheField}
                style={{
                  fontSize: 11, padding: '6px 12px', borderRadius: 6, border: 'none', color: '#fff',
                  cursor: bank >= cost && graftable.length && !inTheField ? 'pointer' : 'not-allowed',
                  background: bank >= cost && graftable.length && !inTheField
                    ? 'linear-gradient(135deg, #a855f7, #6366f1)'
                    : 'rgba(100,100,100,0.5)',
                }}
              >
                {inTheField ? 'On expedition'
                  : !graftable.length ? 'Nothing left to graft'
                  : bank < cost ? `Need 🧬${cost}`
                  : 'Graft mutation'}
              </button>
            ) : (
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxHeight: 150, overflowY: 'auto' }}>
                  {graftable.map(id => {
                    const m = MUTATION_LIBRARY[id];
                    return (
                      <button
                        key={id}
                        onClick={() => { onGraft(slime.id, id); setGrafting(false); }}
                        title={getMutationDesc(id, currentStats.viscosity)}
                        style={{
                          fontSize: 10, padding: '5px 8px', borderRadius: 5, cursor: 'pointer',
                          background: `${m.color}22`, border: `1px solid ${m.color}66`, color: '#fff',
                        }}
                      >
                        {m.icon} {m.name}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setGrafting(false)}
                  style={{ marginTop: 8, fontSize: 10, padding: '4px 10px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 4, color: '#aaa', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlimeDetail;
