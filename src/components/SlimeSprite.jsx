import React from 'react';
import { SLIME_TIERS } from '../data/slimeData.js';
import { STATUS_EFFECTS } from '../data/traitData.js';
import { TRAIT_LIBRARY } from '../data/traitData.js';

const SlimeSprite = ({ tier, size = 40, isQueen, hp, maxHp, traits = [], anim = 'idle', status = [] }) => {
  const color = isQueen ? '#ec4899' : (SLIME_TIERS[tier]?.color || '#4ade80');
  const hpPct = hp !== undefined && maxHp ? (hp / maxHp) * 100 : 100;
  const transform = anim === 'attack' ? 'translateX(15px) scale(1.1)' : anim === 'hurt' ? 'translateX(-5px) scale(0.9)' : 'scale(1)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {hp !== undefined && maxHp && (
        <div style={{ width: size, height: 5, background: 'rgba(0,0,0,0.5)', borderRadius: 2, marginBottom: 3, overflow: 'hidden' }}>
          <div style={{ width: `${hpPct}%`, height: '100%', background: hpPct > 50 ? '#4ade80' : hpPct > 25 ? '#f59e0b' : '#ef4444', transition: 'width 0.3s' }} />
        </div>
      )}
      <div style={{
        width: size, height: size * 0.7, backgroundColor: color,
        borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
        position: 'relative',
        boxShadow: `0 ${size*0.1}px ${size*0.2}px rgba(0,0,0,0.3), inset 0 ${size*0.1}px ${size*0.2}px rgba(255,255,255,0.3)`,
        transform, transition: 'transform 0.15s',
        filter: anim === 'hurt' ? 'brightness(1.5)' : 'none',
      }}>
        <div style={{position:'absolute',top:'25%',left:'20%',width:size*0.15,height:size*0.15,backgroundColor:'white',borderRadius:'50%'}}>
          <div style={{position:'absolute',top:'30%',left:'30%',width:'50%',height:'50%',backgroundColor:'#333',borderRadius:'50%'}}/>
        </div>
        <div style={{position:'absolute',top:'25%',right:'20%',width:size*0.15,height:size*0.15,backgroundColor:'white',borderRadius:'50%'}}>
          <div style={{position:'absolute',top:'30%',left:'30%',width:'50%',height:'50%',backgroundColor:'#333',borderRadius:'50%'}}/>
        </div>
        {isQueen && <div style={{position:'absolute',top:-size*0.3,left:'50%',transform:'translateX(-50%)',fontSize:size*0.4}}>👑</div>}
      </div>
      {status?.length > 0 && <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>{status.map((s,i) => <span key={i} style={{fontSize:size*0.3}}>{STATUS_EFFECTS[s.type]?.icon}</span>)}</div>}
      {traits?.length > 0 && <div style={{ display: 'flex', gap: 1, marginTop: 2 }}>{traits.slice(0,4).map((t,i) => <span key={i} style={{fontSize:size*0.25}}>{TRAIT_LIBRARY[t]?.icon}</span>)}</div>}
    </div>
  );
};

export default SlimeSprite;
