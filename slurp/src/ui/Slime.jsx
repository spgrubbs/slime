import React from 'react';
import { ESSENCES } from '../engine/content/essences.js';
import { RELICS } from '../engine/content/relics.js';
import { SPECIES } from '../engine/content/species.js';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder slime. Real art comes later; this only has to show WHAT changed:
// body color from element, size from Mass, an emoji Morph per slotted essence
// on its socket (bigger at higher levels), and swallowed relics inside.
// ─────────────────────────────────────────────────────────────────────────────

const ELEMENT_COLOR = { fire: '#f97316', water: '#3b82f6', nature: '#22c55e', earth: '#a16207' };

const SOCKETS = {
  crown: [50, 8], brow: [50, 22], eyes: [50, 34], mouth: [50, 58], back: [86, 30],
  left: [12, 56], right: [88, 56], base: [50, 92], tail: [92, 80],
};

export default function Slime({ species, element, mass = 60, slotted = [], levels = [], relics = [], size, hurt = false, flip = false }) {
  const color = element ? ELEMENT_COLOR[element] : SPECIES[species]?.color || '#4ade80';
  const px = size ?? Math.round(Math.min(220, 64 + Math.log2(Math.max(1, mass / 40)) * 34));
  const used = new Set();
  const morphs = slotted.map((e, i) => ({ e, L: levels[i] ?? 0 })).filter(({ e }) => {
    const s = ESSENCES[e.id]?.socket;
    if (!s || used.has(s)) return false;
    used.add(s);
    return true;
  });

  return (
    <div className={`slime ${hurt ? 'hurt' : ''}`} style={{ width: px, height: px, transform: flip ? 'scaleX(-1)' : undefined }}>
      <svg viewBox="0 0 100 100" width={px} height={px}>
        <defs>
          <radialGradient id={`g-${color}`} cx="40%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="35%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </radialGradient>
        </defs>
        <path className="blob" d="M10 82 C6 50 24 18 50 18 C76 18 94 50 90 82 C88 92 70 95 50 95 C30 95 12 92 10 82 Z"
          fill={`url(#g-${color})`} stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" />
        {relics.slice(0, 6).map((id, i) => (
          <text key={id} x={28 + (i % 3) * 22} y={74 + Math.floor(i / 3) * 12} fontSize="9" opacity="0.65" textAnchor="middle">{RELICS[id]?.icon}</text>
        ))}
        <ellipse cx="38" cy="48" rx="6" ry="8" fill="#fff" /><ellipse cx="62" cy="48" rx="6" ry="8" fill="#fff" />
        <circle cx="39" cy="50" r="3.2" fill="#1f2937" /><circle cx="63" cy="50" r="3.2" fill="#1f2937" />
        {morphs.map(({ e, L }) => {
          const [x, y] = SOCKETS[ESSENCES[e.id].socket];
          return <text key={e.id} x={x} y={y} fontSize={9 + L * 4} textAnchor="middle" dominantBaseline="middle">{ESSENCES[e.id].icon}</text>;
        })}
      </svg>
    </div>
  );
}

export function EnemyBody({ icon, size = 110, hurt = false }) {
  return <div className={`enemy-body ${hurt ? 'hurt' : ''}`} style={{ fontSize: size * 0.7, width: size, height: size }}>{icon}</div>;
}
