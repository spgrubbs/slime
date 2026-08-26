import React, { useRef, useEffect, useState } from 'react';
import {
  CANVAS_W, CANVAS_H, drawFrame, applyBeats, setSpriteReadyCallback,
  fieldX, groundY, depthScale, sizeFromFirmness,
} from './arenaRender.js';

// ─────────────────────────────────────────────────────────────────────────────
// The one combat view.
//
// Expeditions and caravan ambushes both render through here — the only
// difference is how many enemies there are and whether they are marching.
// ─────────────────────────────────────────────────────────────────────────────

export default function CombatView({
  view, anim, logs, verboseLogs, setVerboseLogs, hud, emptyLabel,
}) {
  const canvasRef = useRef(null);
  const logRef = useRef(null);
  const motions = useRef(new Map());
  const lastFrame = useRef(performance.now());
  const seenAnim = useRef(null);
  const floats = useRef([]);
  const [, tick] = useState(0);

  // Repaint once sprite sheets finish decoding.
  useEffect(() => { setSpriteReadyCallback(() => tick(n => n + 1)); }, []);

  // Drop motion state for entities that are no longer in the fight.
  useEffect(() => {
    const live = new Set([
      ...(view?.slimes || []).map(s => s.id),
      ...(view?.enemies || []).map(e => e.id),
    ]);
    [...motions.current.keys()].forEach(k => { if (!live.has(k)) motions.current.delete(k); });
  }, [view]);

  // New round → fold its beats into motion and queue the floating numbers.
  useEffect(() => {
    if (!anim || anim.startedAt === seenAnim.current) return;
    seenAnim.current = anim.startedAt;
    applyBeats(view, motions.current, anim.beats, Date.now());
    floats.current.push(
      ...anim.beats.filter(b => b.text).map(b => ({ ...b, at: Date.now() + b.at })),
    );
  }, [anim, view]);

  // Animation loop, independent of the game tick so motion stays smooth.
  useEffect(() => {
    let raf;
    const loop = (t) => {
      const dt = Math.min(0.05, (t - lastFrame.current) / 1000);
      lastFrame.current = t;
      const canvas = canvasRef.current;
      if (canvas) {
        drawFrame(canvas.getContext('2d'), view, motions.current, dt, Date.now(), t * 0.06);
      }
      const now = Date.now();
      floats.current = floats.current.filter(f => now - f.at < 900);
      tick(n => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, verboseLogs]);

  const now = Date.now();
  const visibleFloats = floats.current.filter(f => f.at <= now);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{
        position: 'relative', width: '100%', paddingBottom: '60%',
        borderRadius: 8, overflow: 'hidden', background: '#05070a',
      }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />

        {!view && emptyLabel && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'rgba(255,255,255,0.35)', fontSize: 13,
          }}>{emptyLabel}</div>
        )}

        {/* Damage numbers, anchored to wherever the entity actually is */}
        {visibleFloats.map((f, i) => {
          const m = motions.current.get(f.targetId ?? f.actorId);
          if (!m) return null;
          const age = (now - f.at) / 900;
          const sc = depthScale(m.d);
          return (
            <div
              key={`${f.at}-${i}`}
              style={{
                position: 'absolute',
                left: `${(fieldX(m.x) / CANVAS_W) * 100}%`,
                top: `${((groundY(m.d) - 26 * sc - age * 26) / CANVAS_H) * 100}%`,
                color: f.color,
                fontSize: f.result === 'crit' || f.result === 'execute' ? 15 : 11,
                fontWeight: 'bold',
                opacity: Math.max(0, 1 - age),
                pointerEvents: 'none',
                textShadow: '1px 1px 2px rgba(0,0,0,0.95)',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {f.text}
            </div>
          );
        })}

        {hud && (
          <div style={{
            position: 'absolute', top: 5, left: 5, right: 5, display: 'flex',
            justifyContent: 'space-between', gap: 4, pointerEvents: 'none', flexWrap: 'wrap',
          }}>
            {hud.map((h, i) => (
              <span key={i} style={{
                fontSize: 10, color: h.color || '#e0e0e0', background: 'rgba(0,0,0,0.6)',
                padding: '2px 6px', borderRadius: 4,
              }}>{h.text}</span>
            ))}
          </div>
        )}
      </div>

      {logs && (
        <>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '4px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: 6,
          }}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>Battle Log</span>
            {setVerboseLogs && (
              <button
                onClick={() => setVerboseLogs(!verboseLogs)}
                title="Show the full damage derivation for every action"
                style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 4, cursor: 'pointer',
                  background: verboseLogs ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)',
                  border: verboseLogs ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.2)',
                  color: verboseLogs ? '#c084fc' : '#888',
                }}
              >
                📊 {verboseLogs ? 'Verbose ON' : 'Verbose'}
              </button>
            )}
          </div>
          <div
            ref={logRef}
            style={{
              background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '6px 8px',
              maxHeight: verboseLogs ? 220 : 110, overflowY: 'auto', fontSize: 10,
            }}
          >
            {logs.slice(verboseLogs ? -40 : -20).map((entry, i) => (
              <div key={i} style={{ lineHeight: 1.45, padding: '1px 0' }}>
                <span style={{ color: entry.c || '#e0e0e0' }}>{entry.m}</span>
                {verboseLogs && entry.v && (
                  <div style={{
                    fontSize: 9, opacity: 0.75, marginLeft: 10, color: '#a78bfa',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    wordBreak: 'break-word',
                  }}>{entry.v}</div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
