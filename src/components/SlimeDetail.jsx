import React from 'react';
import { SLIME_TIERS, STAT_INFO } from '../data/slimeData.js';
import { TRAIT_LIBRARY } from '../data/traitData.js';
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

export default SlimeDetail;
