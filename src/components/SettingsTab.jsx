import React, { useState } from 'react';

const SettingsTab = ({ onSave, onDelete, lastSave }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div>
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
        <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 15, border: '2px solid #ef4444' }}>
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

      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginTop: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>ℹ️ About</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>
          <p>Hive Queen v0.4</p>
          <p>An idle game where you control a slime hive.</p>
          <p style={{ marginTop: 10 }}>Tips:</p>
          <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
            <li>Send expeditions before closing - they'll continue offline!</li>
            <li>Higher tier slimes have more trait slots</li>
            <li>Traits are rare drops - check the Compendium for rates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
