import React, { useRef, useState } from 'react';

// The screen picker, as a modal: a grid of places, closed by tapping outside
// it, tapping a place, or swiping it away in any direction.
const Menu = ({ open, close, tab, setTab, tabs }) => {
  const start = useRef(null);
  const [drag, setDrag] = useState({ x: 0, y: 0 });
  if (!open) return null;

  const onStart = (e) => { const t = e.touches[0]; start.current = { x: t.clientX, y: t.clientY }; };
  const onMove = (e) => {
    if (!start.current) return;
    const t = e.touches[0];
    setDrag({ x: t.clientX - start.current.x, y: t.clientY - start.current.y });
  };
  const onEnd = (e) => {
    e.stopPropagation(); // the app's own swipe-between-screens must not fire too
    const far = Math.hypot(drag.x, drag.y) > 70;
    start.current = null;
    setDrag({ x: 0, y: 0 });
    if (far) close();
  };

  const dist = Math.hypot(drag.x, drag.y);
  return (
    <div
      onClick={close}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(5,6,12,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        animation: 'sqFade 0.15s ease-out',
      }}
    >
      <style>{'@keyframes sqFade { from { opacity: 0 } to { opacity: 1 } } @keyframes sqPop { from { opacity: 0; transform: scale(0.94) } to { opacity: 1; transform: none } }'}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
        style={{
          width: '100%', maxWidth: 340, borderRadius: 16, padding: 16,
          background: 'linear-gradient(160deg, #1e2233, #171a28)',
          border: '1px solid rgba(236,72,153,0.35)', boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          transform: `translate(${drag.x}px, ${drag.y}px)`,
          opacity: Math.max(0.3, 1 - dist / 260),
          transition: start.current ? 'none' : 'transform 0.18s, opacity 0.18s',
          animation: 'sqPop 0.18s ease-out',
        }}
      >
        <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 'bold', color: '#ec4899', marginBottom: 12 }}>
          🟢 Slime Queen
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); close(); }}
              style={{
                position: 'relative', padding: '14px 8px', borderRadius: 10, cursor: 'pointer', color: '#fff',
                background: tab === t.id ? 'rgba(236,72,153,0.22)' : 'rgba(0,0,0,0.3)',
                border: `1px solid ${tab === t.id ? 'rgba(236,72,153,0.6)' : 'rgba(255,255,255,0.08)'}`,
              }}
            >
              <div style={{ fontSize: 24 }}>{t.icon}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{t.label}</div>
              {t.badge !== undefined && (
                <span style={{ position: 'absolute', top: 6, right: 8, background: '#ec4899', padding: '1px 7px', borderRadius: 9, fontSize: 10 }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ textAlign: 'center', fontSize: 10, opacity: 0.4, marginTop: 10 }}>tap outside or swipe to close</div>
      </div>
    </div>
  );
};

export default Menu;
