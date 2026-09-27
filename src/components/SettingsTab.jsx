import React, { useState } from 'react';
import { PRISM_PACKAGES } from '../data/ranchData.js';
import { PRISM_SHOP } from '../data/hiveData.js';
import SlimeSprite from './SlimeSprite.jsx';

const SettingsTab = ({ onSave, onDelete, lastSave, prisms, slimes, purchasePrismItem,
  tutorialsOn, setTutorialsOn, seenTutorials = [], resetTutorials, totalTutorials = 0 }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPurchaseMessage, setShowPurchaseMessage] = useState(false);
  const [selectedShopItem, setSelectedShopItem] = useState(null);

  const handlePurchase = (pkg) => {
    setShowPurchaseMessage(true);
    setTimeout(() => setShowPurchaseMessage(false), 3000);
  };

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
          Prisms are rare and shiny. Spend them on things you can't get any other way.
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

      {/* Get Prisms */}
      <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.05))', borderRadius: 10, padding: 15, marginBottom: 15, border: '2px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <div style={{ fontSize: 16, fontWeight: 'bold' }}>💎 Get More Prisms</div>
        </div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 15 }}>
          Prisms turn up about once in every 1,000 kills, and every time we wipe out a whole caravan.
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
              💫 Nothing is for sale yet. This is a placeholder.
            </div>
          </div>
        )}
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
