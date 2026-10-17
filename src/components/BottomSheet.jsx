import React, { useRef, useState } from 'react';

// A panel that slides up from the bottom of the screen. Closed by tapping the
// dim area above it, the ✕, or dragging its handle down.
const BottomSheet = ({ open, onClose, title, children }) => {
  const start = useRef(null);
  const [dy, setDy] = useState(0);
  if (!open) return null;

  const onStart = (e) => { start.current = e.touches[0].clientY; };
  const onMove = (e) => {
    if (start.current == null) return;
    setDy(Math.max(0, e.touches[0].clientY - start.current));
  };
  const onEnd = () => {
    const far = dy > 80;
    start.current = null;
    setDy(0);
    if (far) onClose();
  };

  // The app swipes between screens; nothing inside a sheet should trigger that.
  const stop = (e) => e.stopPropagation();

  return (
    <div
      onClick={onClose}
      onTouchStart={stop}
      onTouchMove={stop}
      onTouchEnd={stop}
      style={{
        position: 'fixed', inset: 0, zIndex: 990, background: 'rgba(5,6,12,0.55)',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        animation: 'sqSheetFade 0.15s ease-out',
      }}
    >
      <style>{'@keyframes sqSheetFade { from { opacity: 0 } to { opacity: 1 } } @keyframes sqSheetUp { from { transform: translateY(40px) } to { transform: none } }'}</style>
      <div
        onClick={stop}
        style={{
          width: '100%', maxWidth: 600, margin: '0 auto', maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          background: '#171a28', borderTop: '1px solid rgba(236,72,153,0.35)',
          borderRadius: '16px 16px 0 0', boxShadow: '0 -12px 40px rgba(0,0,0,0.5)',
          transform: `translateY(${dy}px)`,
          transition: start.current == null ? 'transform 0.18s' : 'none',
          animation: 'sqSheetUp 0.18s ease-out',
        }}
      >
        <div onTouchStart={onStart} onTouchMove={onMove} onTouchEnd={onEnd} style={{ padding: '8px 16px 10px', cursor: 'grab', touchAction: 'none' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.25)', margin: '0 auto 10px' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>{title}</div>
            <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.6, fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>
        </div>
        <div style={{ overflowY: 'auto', padding: '0 16px 24px', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default BottomSheet;
