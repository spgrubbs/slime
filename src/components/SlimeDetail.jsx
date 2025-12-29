import React from 'react';
import { SLIME_TIERS, STAT_INFO } from '../data/slimeData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { ELEMENTS } from '../data/gameConstants.js';
import SlimeSprite from './SlimeSprite.jsx';

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

  // Get mutations array (with backward compatibility for old 'traits' field)
  const mutations = slime.mutations || [];

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, border: `2px solid ${tier.color}33` }}>
      <div style={{ display: 'flex', gap: 15, marginBottom: 15 }}>
        <SlimeSprite tier={slime.tier} size={60} hp={hp} maxHp={slime.maxHp} mutations={mutations} status={expState?.status} primaryElement={slime.primaryElement} />
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

      {/* Mutations Section (Combat Abilities) */}
      {mutations.length > 0 && (
        <div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>Mutations</div>
          {mutations.map((m,i) => {
            const mut = MUTATION_LIBRARY[m];
            if (!mut) return null;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: `${mut.color}22`, borderRadius: 6, borderLeft: `3px solid ${mut.color}`, marginBottom: 4 }}>
                <span style={{ fontSize: 18 }}>{mut.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 'bold' }}>{mut.name}</div>
                  <div style={{ fontSize: 10, color: mut.color }}>{mut.passiveDesc}</div>
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
        </div>
      )}
    </div>
  );
};

export default SlimeDetail;
