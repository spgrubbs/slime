import React, { useState } from 'react';
import { PRISM_SHOP } from '../data/hiveData.js';
import SlimeSprite from './SlimeSprite.jsx';
import { getPrefs, setPrefs, sfx, buzz, unlockAudio } from '../audio/index.js';
import { askPermission } from '../notify.js';

const SettingsTab = ({ onSave, onDelete, onExport, onImport, lastSave, prisms, slimes, purchasePrismItem,
  tutorialsOn, setTutorialsOn, seenTutorials = [], resetTutorials, totalTutorials = 0 }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [audio, setAudio] = useState(getPrefs);
  const changeAudio = (patch) => { setPrefs(patch); setAudio(getPrefs()); };
  const [backup, setBackup] = useState('');
  const [backupNote, setBackupNote] = useState('');
  const [restoreCode, setRestoreCode] = useState('');

  const makeBackup = async () => {
    const code = onExport?.();
    if (!code) { setBackupNote('Nothing to back up yet.'); return; }
    setBackup(code);
    try {
      await navigator.clipboard.writeText(code);
      setBackupNote('Copied. Paste it somewhere safe, like a note or a message to yourself.');
    } catch {
      setBackupNote('Select the code below and copy it somewhere safe.');
    }
  };

  const restore = () => {
    if (!restoreCode.trim()) return;
    if (!window.confirm('Replace this game with the backup? The current game will be gone.')) return;
    if (!onImport?.(restoreCode)) setBackupNote("That code didn't work. It may have been cut off when it was copied.");
  };
  const [selectedShopItem, setSelectedShopItem] = useState(null);


  const handleShopPurchase = (itemId, slimeId = null) => {
    const item = PRISM_SHOP[itemId];
    if (!item || prisms < item.cost) return;

    if (item.requiresTarget && !slimeId) {
      setSelectedShopItem(itemId);
      return;
    }

    purchasePrismItem(itemId, slimeId);
    setSelectedShopItem(null);
  };

  return (
    <div>
      {/* Prism Shop - Spend Prisms */}
      <div style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))', borderRadius: 10, padding: 15, marginBottom: 15, border: '2px solid #8b5cf6' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>💎 Prism Shop</div>
          <div style={{ fontSize: 14, color: '#8b5cf6' }}>
            You have: <strong>{prisms || 0}</strong> prisms
          </div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 15 }}>
          Prisms are rare and shiny. They turn up about once in every 1,000 kills, and every time we wipe out a whole caravan.
        </div>

        {/* Slime Selector Modal */}
        {selectedShopItem && (
          <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: 15, marginBottom: 15 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>Select a Slime</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {slimes && slimes.map(s => (
                <div
                  key={s.id}
                  onClick={() => handleShopPurchase(selectedShopItem, s.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: 8,
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)',
                    transition: 'all 0.2s',
                  }}
                >
                  <SlimeSprite tier={s.tier} size={32} mutations={s.mutations} primaryElement={s.primaryElement} />
                  <span style={{ fontSize: 9, marginTop: 4, textAlign: 'center' }}>{s.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setSelectedShopItem(null)}
              style={{ marginTop: 10, padding: '6px 12px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', fontSize: 11 }}
            >
              Cancel
            </button>
          </div>
        )}

        <div style={{ display: 'grid', gap: 10 }}>
          {Object.entries(PRISM_SHOP).map(([id, item]) => {
            const canAfford = prisms >= item.cost;
            return (
              <div
                key={id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: 8,
                  padding: 12,
                  border: canAfford ? '1px solid rgba(139,92,246,0.3)' : '1px solid transparent',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 18 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, fontWeight: 'bold' }}>{item.name}</span>
                    <span style={{ fontSize: 11, color: canAfford ? '#8b5cf6' : '#ef4444' }}>💎{item.cost}</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.7 }}>{item.desc}</div>
                </div>
                <button
                  onClick={() => handleShopPurchase(id)}
                  disabled={!canAfford}
                  style={{
                    padding: '8px 16px',
                    background: canAfford ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'rgba(100,100,100,0.5)',
                    border: 'none',
                    borderRadius: 6,
                    color: '#fff',
                    fontWeight: 'bold',
                    cursor: canAfford ? 'pointer' : 'not-allowed',
                    fontSize: 11,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.requiresTarget ? 'Select Slime' : 'Purchase'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sound */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>🔊 Sound</div>
        {[
          ['volume', 'Volume'],
          ['sfx', 'Effects'],
          ['ambience', 'Ambience'],
        ].map(([key, label]) => (
          <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, marginBottom: 8 }}>
            <span style={{ width: 70 }}>{label}</span>
            <input type="range" min="0" max="1" step="0.05" value={audio[key]}
              onChange={e => changeAudio({ [key]: +e.target.value })}
              onPointerUp={() => sfx(key === 'ambience' ? 'drop' : 'hit')}
              style={{ flex: 1 }} disabled={audio.muted} />
            <span style={{ width: 34, textAlign: 'right', opacity: 0.6 }}>{Math.round(audio[key] * 100)}%</span>
          </label>
        ))}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={audio.muted} onChange={e => changeAudio({ muted: e.target.checked })} />
            Mute everything
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={audio.haptics} onChange={e => { changeAudio({ haptics: e.target.checked }); if (e.target.checked) buzz('medium'); }} />
            Vibrate on big moments
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={audio.notifications} onChange={e => { changeAudio({ notifications: e.target.checked }); if (e.target.checked) askPermission(); }} />
            Tell me when things happen while I'm away
          </label>
          <button onClick={() => { unlockAudio(); setTimeout(() => sfx('glub'), 50); }}
            style={{ padding: '5px 12px', fontSize: 11, borderRadius: 5, cursor: 'pointer', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#e0e0e0' }}>
            Say hi, Glub
          </button>
        </div>
      </div>

      {/* Tutorials */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>📖 Tutorials</div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={!!tutorialsOn}
            onChange={(e) => setTutorialsOn?.(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span style={{ fontSize: 12 }}>Let Glub explain things the first time we meet them</span>
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, opacity: 0.65 }}>
            {seenTutorials.length}/{totalTutorials} heard. Every one stays in Memory.
          </span>
          <button
            onClick={resetTutorials}
            disabled={!seenTutorials.length}
            style={{
              padding: '5px 12px', fontSize: 11, borderRadius: 5,
              cursor: seenTutorials.length ? 'pointer' : 'not-allowed',
              background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
              color: seenTutorials.length ? '#e0e0e0' : '#666',
            }}
          >
            Show them again
          </button>
        </div>
      </div>

      {/* Save System */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>💾 Save System</div>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 15 }}>
          Saves every 10 seconds, and whenever you leave the app. Last saved: {lastSave ? new Date(lastSave).toLocaleString() : 'never'}
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

      {/* Backup */}
      <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: 15, marginBottom: 15 }}>
        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 6 }}>📤 Backup</div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 10 }}>
          The save lives inside the app. Uninstalling it deletes the save. A backup code is the whole game as text you can keep anywhere.
        </div>
        <button onClick={makeBackup} style={{ padding: '8px 14px', background: '#22d3ee', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: 'pointer', marginBottom: 8 }}>
          Make a backup code
        </button>
        {backup && (
          <textarea readOnly value={backup} onFocus={e => e.target.select()}
            style={{ width: '100%', height: 60, fontSize: 9, fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: 6, marginBottom: 8 }} />
        )}
        {backupNote && <div style={{ fontSize: 11, color: '#86efac', marginBottom: 8 }}>{backupNote}</div>}
        <textarea value={restoreCode} onChange={e => setRestoreCode(e.target.value)} placeholder="Paste a backup code here to restore it"
          style={{ width: '100%', height: 50, fontSize: 10, fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', color: '#e0e0e0', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: 6, marginBottom: 8 }} />
        <button onClick={restore} disabled={!restoreCode.trim()} style={{ padding: '8px 14px', background: restoreCode.trim() ? '#f59e0b' : 'rgba(100,100,100,0.5)', border: 'none', borderRadius: 6, color: '#1a1a2e', fontWeight: 'bold', cursor: restoreCode.trim() ? 'pointer' : 'not-allowed' }}>
          Restore from code
        </button>
      </div>

      {showConfirm && (
        <div style={{ background: 'rgba(239,68,68,0.2)', borderRadius: 10, padding: 15, border: '2px solid #ef4444', marginBottom: 15 }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 10 }}>⚠️ Are you sure?</div>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 15 }}>Everything goes. Every slime, every building. It can't be undone.</div>
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
          <p>Slime Queen, playtest build</p>
          <p>You are the nucleus. We are your slimes. I'm Glub.</p>
          <p style={{ marginTop: 10 }}>Things worth knowing:</p>
          <ul style={{ margin: '5px 0', paddingLeft: 20 }}>
            <li>Parties keep fighting while the app is closed, for up to a day.</li>
            <li>Pools keep working too, for up to 24 hours at a time.</li>
            <li>Every slime tier has more mutation slots than the one below.</li>
            <li>Memory has everything I've told you, and every monster we've eaten.</li>
            <li>Pheromones live on The Nucleus. They cost musk.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SettingsTab;
