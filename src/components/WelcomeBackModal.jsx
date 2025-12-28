import React from 'react';
import { TRAIT_LIBRARY } from '../data/traitData.js';
import { ZONES } from '../data/zoneData.js';

const WelcomeBackModal = ({ data, onClose }) => {
  const { offlineTime, results } = data;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'linear-gradient(135deg, #1a1a2e, #16213e)', borderRadius: 15, padding: 25, maxWidth: 400, width: '100%', border: '2px solid #ec4899' }}>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, color: '#ec4899' }}>👋 Welcome Back!</h2>
        <p style={{ margin: '0 0 15px', opacity: 0.7 }}>You were away for {offlineTime}</p>

        <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>While you were gone...</div>

          {results.monstersKilled > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>💀 Monsters Killed</span>
              <span style={{ color: '#4ade80' }}>+{results.monstersKilled}</span>
            </div>
          )}

          {results.biomassGained > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span>🧬 Biomass Earned</span>
              <span style={{ color: '#4ade80' }}>+{results.biomassGained}</span>
            </div>
          )}

          {Object.keys(results.matsGained).length > 0 && (
            <div style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div>📦 Materials Found:</div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                {Object.entries(results.matsGained).map(([m, c]) => `${m} x${c}`).join(', ')}
              </div>
            </div>
          )}

          {Object.keys(results.traitsGained).length > 0 && (
            <div style={{ padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#a855f7' }}>✨ Rare Traits Found!</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {Object.entries(results.traitsGained).map(([t, c]) => `${TRAIT_LIBRARY[t]?.icon} ${TRAIT_LIBRARY[t]?.name} x${c}`).join(', ')}
              </div>
            </div>
          )}

          {results.slimesLost.length > 0 && (
            <div style={{ padding: '5px 0', color: '#ef4444' }}>
              <div>💔 Slimes Lost:</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{results.slimesLost.join(', ')}</div>
            </div>
          )}

          {results.expeditionsWiped.length > 0 && (
            <div style={{ padding: '5px 0', color: '#ef4444' }}>
              ⚠️ Expeditions wiped: {results.expeditionsWiped.map(z => ZONES[z]?.name).join(', ')}
            </div>
          )}

          {results.researchCompleted && (
            <div style={{ padding: '5px 0', color: '#22d3ee' }}>
              🔬 Research Completed: {results.researchCompleted}
            </div>
          )}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: 12, background: 'linear-gradient(135deg, #ec4899, #a855f7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }}>
          Continue Playing
        </button>
      </div>
    </div>
  );
};

export default WelcomeBackModal;
