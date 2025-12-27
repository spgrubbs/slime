import React, { useState } from 'react';
import { SLIME_TIERS, STAT_INFO } from '../data/slimeData.js';
import { TRAIT_LIBRARY } from '../data/traitData.js';
import { BASE_SLIME_COST, TRAIT_MAGICKA_COST } from '../data/gameConstants.js';
import { genName } from '../utils/helpers.js';
import SlimeSprite from './SlimeSprite.jsx';

const SlimeForge = ({ traits, biomass, freeMag, tiers, onSpawn }) => {
  const [tier, setTier] = useState('basic');
  const [selTraits, setSelTraits] = useState([]);
  const [name, setName] = useState(genName());

  const td = SLIME_TIERS[tier];
  const maxT = td.traitSlots;
  const bioCost = BASE_SLIME_COST + selTraits.length * 5;
  const magCost = td.magickaCost + selTraits.length * TRAIT_MAGICKA_COST;
  const avail = Object.entries(traits).filter(([,c]) => c > 0);

  const toggle = (id) => {
    if (selTraits.includes(id)) setSelTraits(selTraits.filter(t => t !== id));
    else if (selTraits.length < maxT) setSelTraits([...selTraits, id]);
  };

  const spawn = () => {
    if (biomass >= bioCost && freeMag >= magCost) {
      onSpawn(tier, selTraits, name, magCost);
      setSelTraits([]);
      setName(genName());
    }
  };

  const stats = { firmness: Math.floor(5 * td.statMultiplier), slipperiness: Math.floor(5 * td.statMultiplier), viscosity: Math.floor(5 * td.statMultiplier) };
  selTraits.forEach(id => { const t = TRAIT_LIBRARY[id]; if (t) stats[t.stat] += t.bonus; });

  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: 15 }}>
      <h3 style={{ margin: '0 0 15px', fontSize: 16 }}>🧪 Slime Forge</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 15, marginBottom: 15, padding: 15, background: 'rgba(236,72,153,0.1)', borderRadius: 10 }}>
        <SlimeSprite tier={tier} size={60} traits={selTraits} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 5, padding: '5px 10px', color: '#fff', fontSize: 14, flex: 1 }} />
            <button onClick={() => setName(genName())} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 5, padding: '5px 10px', cursor: 'pointer' }}>🎲</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>{td.name} • {selTraits.length}/{maxT} traits</div>
          <div style={{ display: 'flex', gap: 10, fontSize: 11 }}>
            {Object.entries(STAT_INFO).map(([k,v]) => <span key={k} style={{ color: v.color }}>{v.icon}{stats[k]}</span>)}
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Tier</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {Object.entries(SLIME_TIERS).map(([k,t]) => {
            const ok = tiers.includes(k);
            return (
              <button key={k} onClick={() => { if(ok){setTier(k);setSelTraits([]);} }} style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 12px',background:tier===k?'rgba(255,255,255,0.2)':'rgba(0,0,0,0.3)',border:`2px solid ${tier===k?t.color:'transparent'}`,borderRadius:8,color:'#fff',cursor:ok?'pointer':'not-allowed',opacity:ok?1:0.4,fontSize:12 }}>
                <div style={{ width:16,height:12,backgroundColor:t.color,borderRadius:'50% 50% 50% 50% / 60% 60% 40% 40%' }} />
                {t.name} <span style={{color:'#a855f7',fontSize:10}}>💜{t.magickaCost}+</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 15 }}>
        <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.7 }}>Traits ({selTraits.length}/{maxT}) • +{TRAIT_MAGICKA_COST}💜 each</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, maxHeight: 160, overflowY: 'auto' }}>
          {avail.map(([id, cnt]) => {
            const t = TRAIT_LIBRARY[id];
            const sel = selTraits.includes(id);
            const can = sel || selTraits.length < maxT;
            return (
              <button key={id} onClick={() => can && toggle(id)} style={{ display:'flex',flexDirection:'column',alignItems:'flex-start',padding:8,background:sel?`${t.color}33`:'rgba(0,0,0,0.3)',border:`2px solid ${sel?t.color:'transparent'}`,borderRadius:8,color:'#fff',cursor:can?'pointer':'not-allowed',opacity:can?1:0.5,textAlign:'left' }}>
                <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:4,width:'100%' }}>
                  <span>{t.icon}</span><span style={{fontSize:11,fontWeight:'bold'}}>{t.name}</span><span style={{fontSize:10,opacity:0.6,marginLeft:'auto'}}>x{cnt}</span>
                </div>
                <div style={{fontSize:9,opacity:0.7}}>+{t.bonus} {STAT_INFO[t.stat]?.name}</div>
                <div style={{fontSize:9,color:t.color}}>{t.passiveDesc}</div>
              </button>
            );
          })}
          {!avail.length && <div style={{opacity:0.5,fontStyle:'italic',fontSize:12,gridColumn:'1/-1'}}>No traits yet. Defeat monsters!</div>}
        </div>
      </div>
      <div style={{ display:'flex',justifyContent:'space-between',padding:'10px 15px',background:'rgba(0,0,0,0.2)',borderRadius:8,marginBottom:10,fontSize:13 }}>
        <span>Cost:</span>
        <div style={{display:'flex',gap:15}}>
          <span style={{color:biomass>=bioCost?'#4ade80':'#ef4444'}}>🧬{bioCost}</span>
          <span style={{color:freeMag>=magCost?'#a855f7':'#ef4444'}}>💜{magCost}</span>
        </div>
      </div>
      <button onClick={spawn} disabled={biomass<bioCost||freeMag<magCost} style={{ width:'100%',padding:12,background:biomass>=bioCost&&freeMag>=magCost?'linear-gradient(135deg,#ec4899,#a855f7)':'rgba(100,100,100,0.5)',border:'none',borderRadius:8,color:'#fff',fontWeight:'bold',cursor:biomass>=bioCost&&freeMag>=magCost?'pointer':'not-allowed',fontSize:14 }}>
        ✨ Spawn Slime
      </button>
    </div>
  );
};

export default SlimeForge;
