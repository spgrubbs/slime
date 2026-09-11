import React from 'react';
import { TUTORIAL_CATEGORIES } from '../data/tutorialData.js';

// Minimal markdown: **bold** only. Enough for emphasis, not enough to be a
// rendering project.
export function renderEmphasis(text, key = 0) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((chunk, i) =>
    chunk.startsWith('**') && chunk.endsWith('**')
      ? <strong key={`${key}-${i}`} style={{ color: '#c4b5fd' }}>{chunk.slice(2, -2)}</strong>
      : <span key={`${key}-${i}`}>{chunk}</span>);
}

export default function TutorialModal({ tutorial, onDismiss, onDisableAll }) {
  if (!tutorial) return null;
  const cat = TUTORIAL_CATEGORIES[tutorial.category];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onDismiss}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'linear-gradient(160deg, #1e2233, #171a28)',
          border: '1px solid rgba(168,85,247,0.35)',
          borderRadius: 14, padding: 22, maxWidth: 420, width: '100%',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ fontSize: 32 }}>{tutorial.icon}</span>
          <div>
            <div style={{ fontSize: 17, fontWeight: 'bold' }}>{tutorial.title}</div>
            <div style={{ fontSize: 10, opacity: 0.55 }}>{cat?.icon} {cat?.name}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {tutorial.body.map((line, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, fontSize: 13, lineHeight: 1.5 }}>
              <span style={{ color: '#a855f7', flexShrink: 0 }}>▸</span>
              <span style={{ opacity: 0.92 }}>{renderEmphasis(line, i)}</span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 10, opacity: 0.45, marginBottom: 14 }}>
          📖 Kept in the Compendium if you want it again.
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onDismiss}
            style={{
              flex: 1, padding: 11, borderRadius: 8, border: 'none', fontWeight: 'bold',
              color: '#fff', cursor: 'pointer',
              background: 'linear-gradient(135deg, #a855f7, #6366f1)',
            }}
          >
            Got it
          </button>
          <button
            onClick={onDisableAll}
            title="Stop showing tutorials. You can turn them back on in Settings."
            style={{
              padding: '11px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 11,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)', color: '#9ca3af',
            }}
          >
            Skip all
          </button>
        </div>
      </div>
    </div>
  );
}
