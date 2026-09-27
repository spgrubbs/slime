import React from 'react';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { ZONES } from '../data/zoneData.js';
import { WARDENS } from '../data/wardenData.js';
import { MUTATION_LIBRARY, mutagenName } from '../data/traitData.js';

const Row = ({ label, value, color = '#4ade80' }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
    <span>{label}</span>
    <span style={{ color }}>{value}</span>
  </div>
);

const Block = ({ label, children, color }) => (
  <div style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', color }}>
    <div>{label}</div>
    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4 }}>{children}</div>
  </div>
);

const list = (obj, fmt) => Object.entries(obj || {}).map(fmt).join(', ');

const WelcomeBackModal = ({ data, onClose }) => {
  const { offlineTime, results: r } = data;
  const quiet = !r.monstersKilled && !r.biomassGained && !r.researchCompleted
    && !r.slimesLost?.length && !r.expeditionsWiped?.length;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 15, padding: 25, maxWidth: 400, width: '100%', maxHeight: '85vh', overflowY: 'auto', border: '2px solid #ec4899' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, color: '#ec4899' }}>Mother, you're back!</h2>
        <p style={{ margin: '0 0 15px', opacity: 0.7 }}>You were gone {offlineTime}. Here's what we did.</p>

        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
          {quiet && <div style={{ opacity: 0.7, fontSize: 13 }}>Nothing much. Nobody was out, so we just sat here and wobbled.</div>}

          {r.monstersKilled > 0 && <Row label="Things we ate" value={`+${r.monstersKilled}`} />}
          {r.biomassGained > 0 && <Row label="Biomass" value={`+${Math.floor(r.biomassGained)}`} />}

          {Object.keys(r.matsGained || {}).length > 0 && (
            <Block label="Brought home">{list(r.matsGained, ([m, c]) => `${m} ×${c}`)}</Block>
          )}

          {Object.keys(r.mutagensFound || {}).length > 0 && (
            <Block label="🧬 Mutagens" color="#c084fc">
              {list(r.mutagensFound, ([id, c]) => `${MUTATION_LIBRARY[id]?.icon || ''} ${mutagenName(id)}${c > 1 ? ` ×${c}` : ''}`)}
            </Block>
          )}

          {r.prismsFound > 0 && <Row label="💎 Prisms" value={`+${r.prismsFound}`} color="#a78bfa" />}

          {r.wardensFelled?.length > 0 && (
            <Block label="👑 Wardens beaten" color="#fbbf24">
              {r.wardensFelled.map(w => `${WARDENS[w.zone]?.name || w.zone}${w.plus ? ', Rekindled' : ''}`).join(', ')}
            </Block>
          )}

          {Object.keys(r.monsterKillsGained || {}).length > 0 && (
            <Block label="Who we ate" color="#a855f7">
              {list(r.monsterKillsGained, ([m, c]) => `${MONSTER_TYPES[m]?.icon || '?'} ${MONSTER_TYPES[m]?.name || m} ×${c}`)}
            </Block>
          )}

          {r.slimesLost?.length > 0 && (
            <Block label="🩹 Hurt, need to mend" color="#ef4444">{r.slimesLost.join(', ')}</Block>
          )}

          {r.expeditionsWiped?.length > 0 && (
            <Block label="💀 Wiped out" color="#ef4444">
              {r.expeditionsWiped.map(z => ZONES[z]?.name).join(', ')}
              {Object.keys(r.salvaged || {}).length > 0 && `. Still saved: ${list(r.salvaged, ([m, c]) => `${m} ×${c}`)}`}
            </Block>
          )}

          {r.completed?.length > 0 && (
            <Block label="Home from" color="#22d3ee">{r.completed.map(z => ZONES[z]?.name).join(', ')}</Block>
          )}

          {r.researchCompleted && (
            <Block label="🔬 Research finished" color="#22d3ee">{r.researchCompleted}</Block>
          )}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #ec4899, #a855f7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>
          Back to it
        </button>
      </div>
    </div>
  );
};

export default WelcomeBackModal;
