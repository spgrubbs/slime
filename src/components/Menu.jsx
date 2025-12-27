import React from 'react';

const Menu = ({ open, close, tab, setTab, tabs }) => {
  if (!open) return null;
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} onClick={close} />
      <div style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: 260, background: 'linear-gradient(180deg, #1a1a2e, #16213e)', zIndex: 999, padding: 20, overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <span style={{ fontSize: 18, fontWeight: 'bold', color: '#ec4899' }}>🟢 Hive Queen</span>
          <button onClick={close} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>×</button>
        </div>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); close(); }} style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '12px 16px', background: tab===t.id ? 'rgba(236,72,153,0.2)' : 'transparent', border: 'none', borderLeft: tab===t.id ? '3px solid #ec4899' : '3px solid transparent', color: '#fff', fontSize: 14, cursor: 'pointer', textAlign: 'left', marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>{t.label}
            {t.badge !== undefined && <span style={{ marginLeft: 'auto', background: '#ec4899', padding: '2px 8px', borderRadius: 10, fontSize: 11 }}>{t.badge}</span>}
          </button>
        ))}
      </div>
    </>
  );
};

export default Menu;
