import React, { useRef, useEffect } from 'react';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { STATUS_EFFECTS } from '../data/traitData.js';
import { ZONES } from '../data/zoneData.js';
import { ARENA_W, ARENA_H, ARENA_ATTACK_RANGE } from '../data/gameConstants.js';

// Tier → fill color for slime circles
const TIER_COLORS = {
  basic:    '#4ade80',
  enhanced: '#22d3ee',
  elite:    '#a855f7',
  royal:    '#f59e0b',
};

// Zone → canvas background theme
const ZONE_THEMES = {
  forest:  { sky: '#0d2b0d', ground: '#1a4a1a', stripe: '#2d7a2d' },
  swamp:   { sky: '#0d1f0d', ground: '#1a2d0d', stripe: '#3a4a1a' },
  caves:   { sky: '#0d0d1f', ground: '#1a1a3d', stripe: '#2a1a4a' },
  ruins:   { sky: '#1f0d0d', ground: '#3d1a0a', stripe: '#5a2a1a' },
  peaks:   { sky: '#0d1f2d', ground: '#1a2d3d', stripe: '#2a4a5a' },
  volcano: { sky: '#1f0500', ground: '#3d0d00', stripe: '#5a1500' },
};

// Canvas resolution (logical pixels — scaled to fill the container)
const CANVAS_W = 400;
const CANVAS_H = 240;

// Convert world coords to canvas coords
const wx = (x) => (x / ARENA_W) * CANVAS_W;
const wy = (y) => (y / ARENA_H) * CANVAS_H;
const wr = (r) => (r / ARENA_W) * CANVAS_W;

// ── Draw helpers ──────────────────────────────────────────────────────────────

function drawBackground(ctx, zone) {
  const theme = ZONE_THEMES[zone] || ZONE_THEMES.forest;

  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, theme.sky);
  grad.addColorStop(1, theme.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Subtle horizontal stripe near the bottom (ground line)
  ctx.fillStyle = theme.stripe;
  ctx.fillRect(0, wy(98), CANVAS_W, wy(4));
}

function drawHpBar(ctx, ex, ey, r, hp, maxHp) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const bw  = r * 2.6;
  const bh  = wr(1.8);
  const bx  = ex - bw / 2;
  const by  = ey - r - bh - 3;

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
    if (effect) {
      ctx.fillText(effect.icon, ex + (i - (statuses.length - 1) / 2) * wr(5), ey + r + wr(5));
    }
  });
}

function drawEntity(ctx, entity, color, label) {
  const ex = wx(entity.x);
  const ey = wy(entity.y);
  const r  = wr(5.5);

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(ex, wy(100), r * 0.75, r * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  // Body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(ex, ey, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Label (emoji or first char)
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${wr(4.5)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, ex, ey);
  ctx.textBaseline = 'alphabetic';

  drawHpBar(ctx, ex, ey, r, entity.hp, entity.maxHp);
  drawStatusIcons(ctx, entity.status, ex, ey, r);
}

function drawIntermissionBar(ctx, timer, duration) {
  const pct = Math.min(1, timer / duration);
  const bh  = wy(4);
  const by  = CANVAS_H - bh - 2;

  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, by, CANVAS_W, bh);

  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(0, by, CANVAS_W * pct, bh);
}

// ── Main draw ─────────────────────────────────────────────────────────────────

function drawArena(ctx, exp, slimeMap, zone) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawBackground(ctx, zone);

  if (!exp) {
    // Empty arena — show zone name
    const zd = ZONES[zone];
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = `bold ${wr(8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(zd ? `${zd.icon} ${zd.name}` : zone, CANVAS_W / 2, CANVAS_H / 2);
    ctx.textBaseline = 'alphabetic';
    return;
  }

  // Draw slimes
  exp.slimes.forEach(s => {
    if (s.dead) return;
    const sl = slimeMap[s.id];
    const color = TIER_COLORS[sl?.tier] || '#4ade80';
    const label = sl?.name?.charAt(0) || '?';
    drawEntity(ctx, s, color, label);
  });

  // Draw enemy
  if (exp.enemy && exp.enemy.hp > 0) {
    const md = MONSTER_TYPES[exp.enemy.type];
    drawEntity(ctx, exp.enemy, '#ef4444', md?.icon || '👾');
  }

  // Intermission bar
  if (exp.phase === 'intermission' && exp.intermission) {
    drawIntermissionBar(ctx, exp.intermission.timer, exp.intermission.duration);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ArenaCanvas({ exp, slimeMap, zone, logs }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawArena(ctx, exp, slimeMap || {}, zone);
  });

  // Compute floats from current exp (expire after 1200ms)
  const floats = (exp?.floats || []).filter(f => Date.now() - f.born < 1200);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Arena */}
      <div style={{ position: 'relative', width: '100%', paddingBottom: '60%', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        />

        {/* Floating damage numbers */}
        {floats.map(f => {
          const age = Date.now() - f.born;
          const opacity = 1 - age / 1200;
          return (
            <div
              key={f.id}
              style={{
                position: 'absolute',
                left:    `${(f.x / ARENA_W) * 100}%`,
                top:     `${(f.y / ARENA_H) * 100 - (age * 0.025)}%`,
                color:    f.color,
                fontSize: 11,
                fontWeight: 'bold',
                opacity:  Math.max(0, opacity),
                pointerEvents: 'none',
                textShadow: '1px 1px 2px rgba(0,0,0,0.9)',
                transform: 'translateX(-50%)',
                whiteSpace: 'nowrap',
                transition: 'none',
              }}
            >
              {f.text}
            </div>
          );
        })}

        {/* HUD overlay */}
        {exp && (
          <div style={{ position: 'absolute', top: 5, left: 5, right: 5, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
            <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
              💀 {exp.kills}{exp.targetKills !== Infinity ? `/${exp.targetKills}` : ''}
            </span>
            {exp.phase === 'intermission' && (
              <span style={{ fontSize: 10, color: '#22d3ee', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
                🚶 Traveling...
              </span>
            )}
            {exp.enemy && exp.enemy.hp > 0 && (
              <span style={{ fontSize: 10, color: '#ef4444', background: 'rgba(0,0,0,0.55)', padding: '2px 6px', borderRadius: 4 }}>
                {MONSTER_TYPES[exp.enemy.type]?.name} {Math.ceil(exp.enemy.hp)}/{exp.enemy.maxHp}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Battle log */}
      {logs && logs.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 6, padding: '6px 8px', maxHeight: 90, overflowY: 'auto', fontSize: 10 }}>
          {logs.slice(-20).map((entry, i) => (
            <div key={i} style={{ color: entry.c || '#e0e0e0', lineHeight: 1.4 }}>{entry.m}</div>
          ))}
        </div>
      )}
    </div>
  );
}
