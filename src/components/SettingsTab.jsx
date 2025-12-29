import React, { useState } from 'react';
import { PRISM_PACKAGES } from '../data/ranchData.js';

const SettingsTab = ({ onSave, onDelete, lastSave, prisms }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(false);

  const handlePurchase = (pkg) => {
    setShowPurchaseMessage(true);
    setTimeout(() => setShowPurchaseMessage(false), 3000);
  };

  return (
    <div>
      {/* Prism Shop */}
      <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', borderRadius: 10, padding: 15, marginBottom: 15, border: '2px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>💎 Prism Shop</div>
          <div style={{ fontSize: 14, color: '#f59e0b' }}>
            You have: <strong>{prisms || 0}</strong> prisms
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 15 }}>
          Prisms are the premium currency used for special ranch buildings and exclusive upgrades.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {PRISM_PACKAGES.map(pkg => (
            <div
              key={pkg.id}
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: 8,
                padding: 12,
                border: '1px solid rgba(245,158,11,0.3)',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>💎</div>
              <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 2 }}>{pkg.name}</div>
              <div style={{ fontSize: 18, color: '#f59e0b', marginBottom: 2 }}>{pkg.prisms}</div>
              {pkg.bonus && (
                <div style={{ fontSize: 10, color: '#4ade80', marginBottom: 6 }}>{pkg.bonus}</div>
              )}
              <button
                onClick={() => handlePurchase(pkg)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  border: 'none',
                  borderRadius: 6,
                  color: '#1a1a2e',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 12,
                }}
              >
                {pkg.price}
              </button>
            </div>
          ))}
        </div>

        {showPurchaseMessage && (
          <div style={{
            marginTop: 15,
            padding: 12,
            background: 'rgba(34,211,238,0.2)',
            borderRadius: 8,
            textAlign: 'center',
            border: '1px solid #22d3ee'
          }}>
            <div style={{ fontSize: 12, color: '#22d3ee' }}>
              💫 Purchases not yet implemented - this is a demo feature!
            </div>
          </div>
        )}
      </div>

      {/* Save System */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>💾 Save System</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 15 }}>
          Game auto-saves every 30 seconds. Last saved: {lastSave ? new Date(lastSave).toLocaleString() : 'Never'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={onSave} style={{ padding: '10px 20px', background: '#4ade80', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: 'pointer' }}>
            💾 Save Now
          </button>
          <button onClick={() => setShowConfirm(true)} style={{ padding: '10px 20px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            🗑️ Delete Save
          </button>
        </div>
      </div>

      {showConfirm && (
        <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 15, border: '2px solid #ef4444', marginBottom: 15 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>⚠️ Are you sure?</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 15 }}>This will permanently delete all your progress!</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { onDelete(); setShowConfirm(false); }} style={{ padding: '8px 16px', background: '#ef4444', border: 'none', borderRadius: 6, color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
              Yes, Delete Everything
            </button>
            <button onClick={() => setShowConfirm(false)} style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* About */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>ℹ️ About</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          <p>Hive Queen v0.5</p>
          <p>An idle game where you control a slime hive.</p>
          <p style={{ marginTop: 10 }}>Tips:</p>
          <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
            <li>Send expeditions before closing - they'll continue offline!</li>
            <li>Assign slimes to ranches for passive gains (up to 24 hours)</li>
            <li>Higher tier slimes have more trait slots</li>
            <li>Check the Compendium for mutation unlock requirements</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
