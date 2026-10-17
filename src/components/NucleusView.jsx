import React, { useEffect, useMemo, useRef, useState } from 'react';
import { composeNucleus, NUCLEUS_W, NUCLEUS_H } from '../art/nucleusArt.js';
import { ZONES } from '../data/zoneData.js';

const FRAMES = 4;
const FRAME_MS = 280;

// The Nucleus screen's picture: the inside of the Queen's body, drawn in
// pixels, with a button over each organ and Tendril tip. `art` is the state
// composeNucleus takes; `badges` puts a small count or mark on an organ.
const NucleusView = ({ art, badges = {}, onTap }) => {
  const canvas = useRef(null);
  const [frame, setFrame] = useState(0);
  const key = JSON.stringify(art);

  // Four breathing frames, drawn once per change in what the body holds.
  const frames = useMemo(() => {
    const out = [];
    for (let f = 0; f < FRAMES; f++) out.push(composeNucleus(art, f));
    return out;
  }, [key]); // eslint-disable-line

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) setFrame(f => (f + 1) % FRAMES);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const { data, w, h } = frames[frame];
    ctx.putImageData(new ImageData(new Uint8ClampedArray(data), w, h), 0, 0);
  }, [frames, frame]);

  const pct = (v, of) => `${(v / of) * 100}%`;
  const spots = frames[0].hotspots;

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 360, margin: '0 auto 12px', aspectRatio: `${NUCLEUS_W} / ${NUCLEUS_H}` }}>
      <canvas
        ref={canvas}
        width={NUCLEUS_W}
        height={NUCLEUS_H}
        style={{ width: '100%', height: '100%', imageRendering: 'pixelated', display: 'block' }}
      />
      {spots.map(s => {
        const tendril = s.id.startsWith('tendril:');
        const badge = badges[s.id];
        return (
          <button
            key={s.id}
            onClick={() => onTap(s.id, s)}
            aria-label={s.label || ZONES[s.zone]?.name}
            style={{
              position: 'absolute',
              left: pct(s.x - s.rx, NUCLEUS_W), top: pct(s.y - s.ry, NUCLEUS_H),
              width: pct(s.rx * 2, NUCLEUS_W), height: pct(s.ry * 2, NUCLEUS_H),
              background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
              WebkitTapHighlightColor: 'rgba(255,255,255,0.15)', borderRadius: '50%',
            }}
          >
            {tendril ? (
              <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', fontSize: 14, filter: 'drop-shadow(0 1px 2px #000)' }}>
                {ZONES[s.zone]?.icon}
              </span>
            ) : (
              <span style={{
                position: 'absolute', left: '50%', top: '100%', transform: 'translate(-50%, -2px)', whiteSpace: 'nowrap',
                fontSize: 10, fontWeight: 'bold', color: '#fff', background: 'rgba(15,17,28,0.78)',
                padding: '2px 7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.12)', pointerEvents: 'none',
              }}>
                {s.label}
                {badge != null && badge !== false && (
                  <span style={{ marginLeft: 5, background: '#ec4899', padding: '0 5px', borderRadius: 7 }}>{badge}</span>
                )}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default NucleusView;
