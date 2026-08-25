import React, { useRef, useEffect, useState } from 'react';
import { STATUS_EFFECTS } from '../data/traitData.js';
import { ZONES } from '../data/zoneData.js';
import {
  ARENA_W, ARENA_H, ARENA_SLIME_X, ARENA_ENEMY_X, ARENA_LUNGE,
} from '../data/gameConstants.js';

// ─────────────────────────────────────────────────────────────────────────────
// Arena — presentation only.
//
// This component owns every position, lunge and floating number in the battle.
// It decides none of them: it replays the beats the expedition driver produced
// from a resolved round. Combat has no geometry.
// ─────────────────────────────────────────────────────────────────────────────

const TIER_COLORS = {
  basic:    '#4ade80',
  enhanced: '#22d3ee',
  elite:    '#a855f7',
  royal:    '#f59e0b',
};

const ZONE_THEMES = {
  forest:  { sky: '#0d2b0d', ground: '#1a4a1a', stripe: '#2d7a2d', mote: '#7dd87d' },
  swamp:   { sky: '#0d1f0d', ground: '#1a2d0d', stripe: '#3a4a1a', mote: '#9ab84a' },
  caves:   { sky: '#0d0d1f', ground: '#1a1a3d', stripe: '#2a1a4a', mote: '#8fa5ff' },
  ruins:   { sky: '#1f0d0d', ground: '#3d1a0a', stripe: '#5a2a1a', mote: '#ff9a5a' },
  peaks:   { sky: '#0d1f2d', ground: '#1a2d3d', stripe: '#2a4a5a', mote: '#9adcff' },
  volcano: { sky: '#1f0500', ground: '#3d0d00', stripe: '#5a1500', mote: '#ff6a3a' },
};

const CANVAS_W = 400;
const CANVAS_H = 240;

const wx = (x) => (x / ARENA_W) * CANVAS_W;
const wy = (y) => (y / ARENA_H) * CANVAS_H;
const wr = (r) => (r / ARENA_W) * CANVAS_W;

const easeOutBack = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

// ── Layout ───────────────────────────────────────────────────────────────────
// Slimes line up on the left, spread vertically; the enemy holds the right.

function layout(exp) {
  const spots = {};
  const living = (exp?.slimes || []);
  living.forEach((s, i) => {
    spots[s.id] = {
      x: ARENA_SLIME_X - (i % 2) * 12,
      y: 26 + (i / Math.max(living.length - 1, 1)) * (ARENA_H - 56),
    };
  });
  if (exp?.enemy) spots[exp.enemy.id] = { x: ARENA_ENEMY_X, y: ARENA_H / 2 };
  return spots;
}

// ── Beat playback ────────────────────────────────────────────────────────────

/** Beats that have already started, with their local progress 0..1. */
function activeBeats(anim, now) {
  if (!anim) return [];
  const elapsed = now - anim.startedAt;
  return anim.beats
    .map(b => ({ ...b, t: (elapsed - b.at) / 520 }))
    .filter(b => b.t >= 0 && b.t <= 1);
}

/** How far each entity is displaced from its resting spot right now. */
function lungeOffsets(beats) {
  const off = {};
  beats.forEach(b => {
    if (b.kind !== 'strike' || !b.actorId) return;
    // Out and back over the beat's life.
    const swing = Math.sin(Math.min(1, b.t) * Math.PI);
    const dir = b.side === 'slime' ? 1 : -1;
    off[b.actorId] = (off[b.actorId] || 0) + swing * ARENA_LUNGE * dir;
  });
  return off;
}

// ── Draw helpers ─────────────────────────────────────────────────────────────

function drawBackground(ctx, zone, tick) {
  const theme = ZONE_THEMES[zone] || ZONE_THEMES.forest;

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, theme.sky);
  grad.addColorStop(1, theme.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Drifting motes — cheap ambience that makes each zone feel alive.
  ctx.fillStyle = theme.mote;
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 14; i++) {
    const seed = i * 137.5;
    const x = (seed + tick * (0.15 + (i % 3) * 0.05)) % CANVAS_W;
    const y = (Math.sin((tick * 0.001) + i) * 0.5 + 0.5) * (CANVAS_H - 40) + 10;
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.stripe;
  ctx.fillRect(0, wy(100), CANVAS_W, wy(4));
}

function drawHpBar(ctx, ex, ey, r, hp, maxHp) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const bw = r * 2.6;
  const bh = wr(1.8);
  const bx = ex - bw / 2;
  const by = ey - r - bh - 3;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(bx, by, bw * pct, bh);
}

function drawStatusIcons(ctx, statuses, ex, ey, r) {
  if (!statuses?.length) return;
  ctx.font = `${wr(4)}px sans-serif`;
  ctx.textAlign = 'center';
  statuses.forEach((s, i) => {
    const effect = STATUS_EFFECTS[s.type];
    if (effect) ctx.fillText(effect.icon, ex + (i - (statuses.length - 1) / 2) * wr(5), ey + r + wr(5));
  });
}

function drawEntity(ctx, entity, pos, color, label, opts = {}) {
  const ex = wx(pos.x);
  const ey = wy(pos.y);
  const r  = wr(5.5) * (opts.scale || 1);

  ctx.globalAlpha = opts.alpha ?? 1;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ex, wy(100), r * 0.75, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hit flash
  if (opts.flash) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(ex, ey, r * 1.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${wr(4.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, ex, ey);
  ctx.textBaseline = 'alphabetic';

  if (!opts.dead) {
    drawHpBar(ctx, ex, ey, r, entity.hp, entity.maxHp);
    drawStatusIcons(ctx, entity.status, ex, ey, r);
  }
  ctx.globalAlpha = 1;
}

function drawArena(ctx, exp, zone, now, tick) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground(ctx, zone, tick);

  if (!exp) {
    const zd = ZONES[zone];
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = `bold ${wr(8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zd ? `${zd.icon} ${zd.name}` : zone, CANVAS_W / 2, CANVAS_H / 2);
    ctx.textBaseline = 'alphabetic';
    return;
  }

  const spots = layout(exp);
  const beats = activeBeats(exp.anim, now);
  const offsets = lungeOffsets(beats);
  const struck = new Set(beats.filter(b => b.kind === 'strike' && b.t < 0.45).map(b => b.targetId));
  const falling = new Set(beats.filter(b => b.kind === 'fall').map(b => b.actorId ?? b.targetId));

  // Travelling: the party ambles right while the road passes under them.
  const travel = exp.phase === 'intermission'
    ? Math.sin(now / 320) * 3
    : 0;

  exp.slimes.forEach(s => {
    const spot = spots[s.id];
    if (!spot) return;
    const fallT = falling.has(s.id) ? beats.find(b => (b.actorId ?? b.targetId) === s.id)?.t ?? 0 : 0;
    drawEntity(
      ctx,
      s,
      { x: spot.x + (offsets[s.id] || 0) + travel, y: spot.y + (s.dead ? 4 : 0) },
      TIER_COLORS[s.ref?.tier] || '#4ade80',
      s.name?.charAt(0) || '?',
      {
        alpha: s.dead ? 0.25 : 1,
        scale: s.dead ? 0.7 : 1 - fallT * 0.2,
        flash: struck.has(s.id),
        dead: s.dead,
      },
    );
  });

  if (exp.enemy && !exp.enemy.dead) {
    const spot = spots[exp.enemy.id];
    drawEntity(
      ctx,
      exp.enemy,
      { x: spot.x + (offsets[exp.enemy.id] || 0), y: spot.y },
      '#ef4444',
      exp.enemy.ref?.icon || '👾',
      { flash: struck.has(exp.enemy.id) },
    );
  }

  if (exp.phase === 'intermission' && exp.intermission) {
    const pct = Math.min(1, exp.intermission.timer / exp.intermission.duration);
    const bh = wy(4);
    const by = CANVAS_H - bh - 2;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, by, CANVAS_W, bh);
    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(0, by, CANVAS_W * pct, bh);
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ArenaCanvas({ exp, zone, logs, verboseLogs, setVerboseLogs }) {
  const canvasRef = useRef(null);
  const logRef = useRef(null);
  const [, forceFrame] = useState(0);

  // Drive the animation independently of the game tick so lunges stay smooth.
  useEffect(() => {
    let raf;
    const loop = () => { forceFrame(n => n + 1); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawArena(canvas.getContext('2d'), exp, zone, Date.now(), performance.now() * 0.06);
  });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs, verboseLogs]);

  const now = Date.now();
  const spots = layout(exp);
  const floats = activeBeats(exp?.anim, now).filter(b => b.text);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />

        {floats.map((b, i) => {
          const spot = spots[b.targetId ?? b.actorId];
          if (!spot) return null;
          const rise = easeOutBack(Math.min(1, b.t)) * 14;
          return (
            <div
              key={`${b.at}-${i}`}
              style={{
                position: 'absolute',
                left: `${(spot.x / ARENA_W) * 100}%`,
                top: `${(spot.y / ARENA_H) * 100 - rise}%`,
                color: b.color,
                fontSize: b.result === 'crit' ? 14 : 11,
                fontWeight: 'bold',
                opacity: Math.max(0, 1 - b.t),
                pointerEvents: 'none',
                textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
              }}
            >
              {b.text}
            </div>
          );
        })}

        {exp && (
          <div style={{ position: 'absolute', top: 5, left: 5, right: 5, display: 'flex', justifyContent: 'space-between', gap: 4, pointerEvents: 'none' }}>
            <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
              💀 {exp.kills}{exp.targetKills !== Infinity ? `/${exp.targetKills}` : ''}
            </span>
            <span style={{ fontSize: 10, color: '#94a3b8', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
              Round {exp.round}
            </span>
            {exp.phase === 'intermission' && (
              <span style={{ fontSize: 10, color: '#22d3ee', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
                🚶 Traveling
              </span>
            )}
            {exp.enemy && !exp.enemy.dead && (
              <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
                {exp.enemy.name} {Math.ceil(exp.enemy.hp)}/{exp.enemy.maxHp}
              </span>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(0,0,0,0.6)', borderRadius: 6 }}>
        <span style={{ fontSize: 10, opacity: 0.6 }}>Battle Log</span>
        {setVerboseLogs && (
          <button
            onClick={() => setVerboseLogs(!verboseLogs)}
            title="Show the full damage derivation for every action"
            style={{
              fontSize: 9,
              padding: '2px 8px',
              background: verboseLogs ? 'rgba(168,85,247,0.4)' : 'rgba(255,255,255,0.1)',
              border: verboseLogs ? '1px solid #a855f7' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: verboseLogs ? '#c084fc' : '#888',
              cursor: 'pointer',
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
        {(logs || []).slice(verboseLogs ? -40 : -20).map((entry, i) => (
          <div key={i} style={{ lineHeight: 1.45, padding: '1px 0' }}>
            <span style={{ color: entry.c || '#e0e0e0' }}>{entry.m}</span>
            {verboseLogs && entry.v && (
              <div style={{
                fontSize: 9, opacity: 0.75, marginLeft: 10, color: '#a78bfa',
                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                wordBreak: 'break-word',
              }}>
                {entry.v}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
