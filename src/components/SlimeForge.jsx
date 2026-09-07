import React, { useState } from 'react';
import { SLIME_TIERS, STAT_INFO } from '../data/slimeData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { BASE_SLIME_COST, TRAIT_JELLY_COST, ELEMENTS } from '../data/gameConstants.js';
import { genName } from '../utils/helpers.js';
import SlimeSprite from './SlimeSprite.jsx';

const SlimeForge = ({ biomass, freeJelly, tiers, onSpawn }) => {
  const [tier, setTier] = useState('basic');
  const [name, setName] = useState(genName());

  const td = SLIME_TIERS[tier];
  const bioCost = BASE_SLIME_COST;
  const jellyCost = td.jellyCost;
  const canSpawn = biomass >= bioCost && freeJelly >= jellyCost;

  const spawn = () => {
    if (!canSpawn) return;
    onSpawn(tier, name, jellyCost);
    setName(genName());
  };

  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <SlimeSprite tier={tier} size={50} />
        <div style={{ flex: 1 }}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 6, color: '#fff', padding: '7px 10px', fontSize: 14, fontWeight: 'bold',
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
            <button
              onClick={() => setName(genName())}
              style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#aaa' }}
            >
              🎲
            </button>
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              {td.name} · {td.traitSlots} mutation slot{td.traitSlots === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {Object.entries(SLIME_TIERS).map(([k, t]) => {
          const ok = tiers.includes(k);
          return (
            <button
              key={k}
              onClick={() => ok && setTier(k)}
              disabled={!ok}
              style={{
                flex: '1 1 70px', padding: 8, borderRadius: 8, cursor: ok ? 'pointer' : 'not-allowed',
                background: tier === k ? `${t.color}33` : 'rgba(0,0,0,0.3)',
                border: `2px solid ${tier === k ? t.color : 'transparent'}`,
                color: '#fff', fontSize: 10, opacity: ok ? 1 : 0.4,
              }}
            >
              <div style={{ fontSize: 13 }}>{ok ? '🟢' : '🔒'}</div>
              <div style={{ fontWeight: tier === k ? 'bold' : 'normal' }}>{t.name}</div>
              <div style={{ opacity: 0.7 }}>🍯{t.jellyCost}</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 10, fontSize: 11, marginBottom: 12 }}>
        {Object.entries(STAT_INFO).map(([k, v]) => (
          <span key={k} style={{ color: v.color }}>
            {v.icon} {Math.floor(5 * td.statMultiplier)}
          </span>
        ))}
      </div>

      <button
        onClick={spawn}
        disabled={!canSpawn}
        style={{
          width: '100%', padding: 12, borderRadius: 8, border: 'none', fontWeight: 'bold',
          color: '#fff', cursor: canSpawn ? 'pointer' : 'not-allowed',
          background: canSpawn ? 'linear-gradient(135deg, #4ade80, #22d3ee)' : 'rgba(100,100,100,0.5)',
        }}
      >
        {canSpawn ? `🥚 Spawn — 🧬${bioCost} · 🍯${jellyCost}` : `Need 🧬${bioCost} · 🍯${jellyCost}`}
      </button>
    </div>
  );
};

export default SlimeForge;
