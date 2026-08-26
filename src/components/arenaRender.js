// ─────────────────────────────────────────────────────────────────────────────
// Arena rendering — presentation only.
//
// Combat has no geometry. This module invents all of it: a 2.5D ground plane
// seen from a low angle, slimes that circle and harry their target, and stat
// readouts expressed as size, speed and particles rather than numbers.
//
// It reads the beats a resolved round produced (see combat/expedition.js) and
// decides nothing about the fight itself.
// ─────────────────────────────────────────────────────────────────────────────

import { STATUS_EFFECTS } from '../data/traitData.js';
import { SLIME_TIERS } from '../data/slimeData.js';
import { SLIME_SPRITES, ELEMENT_SPRITES, ANIMATION_CONFIG } from '../data/spriteConfig.js';

export const CANVAS_W = 400;
export const CANVAS_H = 240;

// The ground plane. Depth d runs 0 (far) → 1 (near); everything sits ON it.
const HORIZON = 84;
const GROUND_H = 140;
const FAR_SCALE = 0.60;
const NEAR_SCALE = 1.18;

export const groundY = (d) => HORIZON + d * GROUND_H;
export const depthScale = (d) => FAR_SCALE + d * (NEAR_SCALE - FAR_SCALE);
export const fieldX = (x) => 18 + x * (CANVAS_W - 36);

const ZONE_THEMES = {
  forest:  { sky: '#0d2b0d', far: '#16401a', ground: '#1d5423', grass: '#2d7a2d', mote: '#7dd87d' },
  swamp:   { sky: '#0d1f0d', far: '#172a10', ground: '#22381a', grass: '#3a4a1a', mote: '#9ab84a' },
  caves:   { sky: '#0d0d1f', far: '#181836', ground: '#22224a', grass: '#2a1a4a', mote: '#8fa5ff' },
  ruins:   { sky: '#1f0d0d', far: '#33150c', ground: '#4a1f0d', grass: '#5a2a1a', mote: '#ff9a5a' },
  peaks:   { sky: '#0d1f2d', far: '#17293a', ground: '#20364a', grass: '#2a4a5a', mote: '#9adcff' },
  volcano: { sky: '#1f0500', far: '#330a00', ground: '#460f00', grass: '#5a1500', mote: '#ff6a3a' },
  road:    { sky: '#141a24', far: '#232b38', ground: '#333a46', grass: '#4a5262', mote: '#c9d2e0' },
};

// ── Sprite loading ───────────────────────────────────────────────────────────

const srcOf = (s) => (s && typeof s === 'object' && s.default ? s.default : s);

const images = new Map();
let onReady = null;

function loadImage(src) {
  if (!src) return null;
  if (images.has(src)) return images.get(src);
  const img = new Image();
  img.onload = () => { if (onReady) onReady(); };
  img.src = src;
  images.set(src, img);
  return img;
}

/** Called once so the canvas can repaint when a sheet finishes loading. */
export const setSpriteReadyCallback = (fn) => { onReady = fn; };

// Tier-tinted copies of each sprite frame, built once and cached.
const tintCache = new Map();

function tintedFrame(sheetImg, frame, color, key) {
  const cacheKey = `${key}-${frame}-${color}`;
  if (tintCache.has(cacheKey)) return tintCache.get(cacheKey);
  if (!sheetImg?.complete || !sheetImg.naturalWidth) return null;

  const size = ANIMATION_CONFIG.spriteSize;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(sheetImg, frame * size, 0, size, size, 0, 0, size, size);

  // Tint only where the sprite already has pixels, so the silhouette survives.
  g.globalCompositeOperation = 'source-atop';
  g.globalAlpha = 0.55;
  g.fillStyle = color;
  g.fillRect(0, 0, size, size);

  tintCache.set(cacheKey, c);
  return c;
}

const slimeSheet = () => loadImage(srcOf(SLIME_SPRITES.basic?.idle));
const elementIcon = (el) => (el ? loadImage(srcOf(ELEMENT_SPRITES[el])) : null);

// ── Stat expression ──────────────────────────────────────────────────────────
//
// A slime's build should be legible at a glance, without reading its sheet.

/** Firmness → body size. A bruiser is visibly bigger. */
export const sizeFromFirmness = (f = 0) => Math.min(1.75, 0.78 + f / 90);

/** Slipperiness → how fast it crosses the ground and how twitchy it is. */
export const speedFromSlip = (s = 0) => Math.min(2.6, 0.75 + s / 26);

/** Viscosity → how heavily it drips. */
export const dripFromVisc = (v = 0) => Math.min(1, v / 55);

// ── Motion state ─────────────────────────────────────────────────────────────
//
// Persistent per-entity: position on the ground, current behavior, and how long
// that behavior lasts. Rebuilt lazily so it survives re-renders.

export function makeMotion(index, total, side) {
  const spread = total > 1 ? index / (total - 1) : 0.5;
  // Each slime gets its own arc of the ring to hold, so a squad surrounds its
  // target instead of stacking on the nearest point to it.
  const home = (index / Math.max(total, 1)) * Math.PI * 2 + Math.PI * 0.75;
  return side === 'slime'
    ? { x: 0.06 + Math.random() * 0.06, d: 0.24 + spread * 0.6, vx: 0, vd: 0,
        state: 'advance', until: 0, home, angle: home, lane: spread, bulk: 1,
        hop: 0, hopPhase: Math.random() * Math.PI * 2, frame: (index * 3) % 8, drips: [] }
    : { x: 0.66, d: 0.5, vx: 0, vd: 0, state: 'hold', until: 0, home: 0, angle: 0,
        lane: spread, bulk: 1.4,
        hop: 0, hopPhase: Math.random() * Math.PI * 2, frame: 0, drips: [] };
}

const BEHAVIORS = ['press', 'flank', 'circle', 'dart'];

// How close two slimes may get before they shoulder each other aside. Without
// this the whole squad converges on one point and reads as a single blob.
const personalSpace = (a, b) => 0.042 * ((a.bulk || 1) + (b.bulk || 1));

/**
 * Push apart from neighbours. Depth is squashed relative to x because the
 * ground is seen at an angle, so a unit of depth is visually smaller.
 */
function separate(m, neighbours, dt) {
  neighbours.forEach(o => {
    if (o === m) return;
    const dx = m.x - o.x;
    const dd = (m.d - o.d) * 0.62;
    const dist = Math.hypot(dx, dd);
    const min = personalSpace(m, o);
    if (dist >= min || dist === 0) return;
    const push = (min - dist) / min;
    m.vx += (dx / dist) * push * 7 * dt;
    m.vd += (dd / dist) * push * 7 * dt;
  });
}

/**
 * Advance one slime's behavior. The states rotate on their own so the fight
 * reads as a pack harrying something, not a line taking turns stepping forward.
 */
function stepSlimeMotion(m, target, stats, dt, now, neighbours = [], rng = Math.random) {
  const speed = speedFromSlip(stats.slipperiness);

  if (now > m.until) {
    // recoil and dart are transient — always fall back to a standing behavior
    m.state = m.state === 'recoil' || m.state === 'dart'
      ? BEHAVIORS[Math.floor(rng() * 3)]
      : BEHAVIORS[Math.floor(rng() * BEHAVIORS.length)];
    m.until = now + 700 + rng() * 1400;
    // Flanking swings to a genuinely different side rather than nudging over.
    if (m.state === 'flank') m.angle = m.home + (rng() - 0.5) * 2.4 + Math.PI * (rng() < 0.5 ? 0.6 : -0.6);
    if (m.state === 'circle') m.spin = rng() < 0.5 ? 1 : -1;
    if (m.state === 'press')  m.angle = m.home + (rng() - 0.5) * 0.7;
  }

  if (!target) {
    // Nothing to fight — amble forward in a loose column, each on its own line.
    const tx = 0.22 + m.lane * 0.16 + Math.sin(now / 2600 + m.hopPhase) * 0.04;
    const td = 0.28 + m.lane * 0.42 + Math.cos(now / 3100 + m.hopPhase) * 0.06;
    m.vx += (tx - m.x) * 1.1 * dt;
    m.vd += (td - m.d) * 1.1 * dt;
  } else {
    // Bigger slimes stand further out, so a heavy front-liner does not end up
    // sitting inside the thing it is hitting.
    const reach = 0.055 * (m.bulk || 1);
    let radius, angle;
    switch (m.state) {
      case 'press':  radius = 0.115 + reach; angle = m.angle; break;
      case 'flank':  radius = 0.165 + reach; angle = m.angle; break;
      case 'dart':   radius = 0.080 + reach; angle = m.angle; break;
      case 'recoil': radius = 0.290 + reach; angle = m.angle; break;
      default:
        m.angle += (m.spin || 1) * dt * 1.0 * speed;
        radius = 0.205 + reach;
        angle = m.angle;
    }

    // The engage ring is an ellipse — the ground is seen at an angle, so depth
    // offsets have to be squashed relative to horizontal ones.
    const tx = target.x + Math.cos(angle) * radius;
    const td = target.d + Math.sin(angle) * radius * 0.85;

    // High enough that closing the gap reads as a charge rather than a drift.
    const pull = m.state === 'dart' ? 13 : m.state === 'recoil' ? 9 : 6.5;
    m.vx += (tx - m.x) * pull * speed * dt;
    m.vd += (td - m.d) * pull * speed * dt;
  }

  separate(m, neighbours, dt);
  // Keep clear of the target's own body too — the monster should stay visible.
  if (target) separate(m, [{ ...target, bulk: 2.6 }], dt);

  // Damping, then integrate. Light enough to stay snappy, heavy enough that
  // they settle on station instead of orbiting forever.
  const damp = Math.pow(0.0004, dt);
  m.vx *= damp;
  m.vd *= damp;
  m.x = Math.max(0.03, Math.min(0.96, m.x + m.vx * dt));
  m.d = Math.max(0.08, Math.min(1, m.d + m.vd * dt));

  // Slimes bounce as they travel; faster slimes bounce faster and higher.
  const moving = Math.hypot(m.vx, m.vd);
  m.hopPhase += dt * (6 + speed * 5);
  m.hop = Math.abs(Math.sin(m.hopPhase)) * Math.min(7, 1.4 + moving * 26);
  m.frame = Math.floor(m.hopPhase * 1.15) % ANIMATION_CONFIG.frameCount;
}

function stepEnemyMotion(m, dt, now, laneIndex = 0, marching = false) {
  if (marching) {
    // Caravan units trudge along the road rather than holding a spot.
    m.x -= dt * 0.012;
    m.d = 0.46 + Math.sin(now / 1800 + laneIndex) * 0.05;
  } else {
    m.x += (0.66 - m.x) * 1.4 * dt;
    m.d += (0.5 + Math.sin(now / 2400) * 0.06 - m.d) * 1.4 * dt;
  }
  m.hopPhase += dt * 2.6;
  m.hop = Math.abs(Math.sin(m.hopPhase)) * 2;
}

// ── Drip particles (viscosity) ───────────────────────────────────────────────

function stepDrips(m, viscosity, dt, now) {
  const rate = dripFromVisc(viscosity);
  if (rate > 0 && Math.random() < rate * dt * 7) {
    m.drips.push({ x: m.x, d: m.d, life: 0, ttl: 0.5 + Math.random() * 0.5,
                   off: (Math.random() - 0.5) * 0.02, born: now });
  }
  m.drips = m.drips.filter(p => { p.life += dt; return p.life < p.ttl; });
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function drawGround(ctx, zone, tick) {
  const t = ZONE_THEMES[zone] || ZONE_THEMES.forest;

  // Sky / backdrop above the horizon
  const sky = ctx.createLinearGradient(0, 0, 0, HORIZON + 12);
  sky.addColorStop(0, t.sky);
  sky.addColorStop(1, t.far);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CANVAS_W, HORIZON + 12);

  // Ground plane, receding
  const gr = ctx.createLinearGradient(0, HORIZON, 0, CANVAS_H);
  gr.addColorStop(0, t.far);
  gr.addColorStop(0.35, t.ground);
  gr.addColorStop(1, t.grass);
  ctx.fillStyle = gr;
  ctx.fillRect(0, HORIZON, CANVAS_W, CANVAS_H - HORIZON);

  // A cart track for the caravan road, running off toward the horizon.
  if (zone === 'road') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.moveTo(0, groundY(0.30));
    ctx.lineTo(CANVAS_W, groundY(0.30));
    ctx.lineTo(CANVAS_W, groundY(0.72));
    ctx.lineTo(0, groundY(0.72));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.moveTo(0, groundY(0.51));
    ctx.lineTo(CANVAS_W, groundY(0.51));
    ctx.stroke();
  }

  // Perspective bands — cheap, and they sell the plane better than a grid.
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 7; i++) {
    const d = Math.pow(i / 7, 1.6);
    const y = groundY(d);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_W, y);
    ctx.stroke();
  }

  // Drifting motes for atmosphere
  ctx.fillStyle = t.mote;
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 16; i++) {
    const seed = i * 137.5;
    const x = (seed + tick * (0.12 + (i % 3) * 0.05)) % CANVAS_W;
    const y = 14 + ((Math.sin(tick * 0.0012 + i) * 0.5 + 0.5) * (HORIZON + 40));
    ctx.beginPath();
    ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShadow(ctx, sx, sy, w, hop) {
  // The shadow stays pinned to the entity's own ground point. Anything else and
  // the whole cast reads as hovering.
  const lift = Math.min(1, hop / 8);
  ctx.fillStyle = `rgba(0,0,0,${0.34 - lift * 0.14})`;
  ctx.beginPath();
  ctx.ellipse(sx, sy, w * (0.40 - lift * 0.06), w * (0.15 - lift * 0.03), 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawHpBar(ctx, sx, topY, w, hp, maxHp) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const bw = Math.max(14, w * 0.9);
  const bh = 3;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(sx - bw / 2, topY, bw, bh);
  ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(sx - bw / 2, topY, bw * pct, bh);
}

function drawStatuses(ctx, statuses, sx, baseY, w) {
  if (!statuses?.length) return;
  ctx.font = '8px sans-serif';
  ctx.textAlign = 'center';
  statuses.slice(0, 4).forEach((s, i) => {
    const e = STATUS_EFFECTS[s.type];
    if (e) ctx.fillText(e.icon, sx + (i - (Math.min(statuses.length, 4) - 1) / 2) * 9, baseY + 8);
  });
}

function drawSlime(ctx, c, m, stats, now) {
  const sc = depthScale(m.d);
  const sx = fieldX(m.x);
  const sy = groundY(m.d);
  const w = 30 * sc * sizeFromFirmness(stats.firmness);

  drawShadow(ctx, sx, sy, w, m.hop);

  // Drips land on the ground behind the body, so draw them first.
  m.drips.forEach(p => {
    const psc = depthScale(p.d);
    const px = fieldX(p.x + p.off);
    const py = groundY(p.d) - (1 - p.life / p.ttl) * 8 * psc;
    ctx.globalAlpha = Math.max(0, 0.5 * (1 - p.life / p.ttl));
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.ellipse(px, py, 1.5 * psc, 2.2 * psc, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  const bodyY = sy - m.hop * sc - w * 0.5;
  const tier = SLIME_TIERS[c.ref?.tier];
  const color = tier?.color || '#4ade80';

  const sheet = slimeSheet();
  const tinted = sheet ? tintedFrame(sheet, m.frame, color, 'basic') : null;

  ctx.save();
  if (c.dead) ctx.globalAlpha = 0.28;

  if (tinted) {
    // Squash while landing so the hop reads as weight.
    const squash = 1 - Math.min(0.16, m.hop / 60);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tinted, sx - w / 2, bodyY - (w * squash) / 2 + w * 0.5 * (1 - squash),
                  w, w * squash);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(sx, bodyY, w * 0.42, w * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hit flash
  if (c.flashUntil && now < c.flashUntil) {
    ctx.globalAlpha = 0.55 * ((c.flashUntil - now) / 200);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(sx, bodyY, w * 0.5, w * 0.44, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Element affinity badge, using the icons from src/assets/sprites/elements
  const icon = elementIcon(c.primaryElement);
  if (icon?.complete && icon.naturalWidth) {
    const isz = 9 * sc;
    ctx.drawImage(icon, sx + w * 0.34, bodyY - w * 0.42, isz, isz);
  }

  if (!c.dead) {
    drawHpBar(ctx, sx, bodyY - w * 0.40 - 5, Math.min(w, 34), c.hp, c.maxHp);
    drawStatuses(ctx, c.status, sx, sy, w);
  }

  // Name, small, so a specific slime stays identifiable in a scrum
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `${Math.round(7 * sc)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText((c.name || '').split(' ')[0], sx, sy + 15 * sc);
}

function drawEnemy(ctx, c, m, now, opts = {}) {
  const sc = depthScale(m.d) * (c.isBoss ? 1.7 : 1.3);
  const sx = fieldX(m.x);
  const sy = groundY(m.d);
  const w = 30 * sc;

  drawShadow(ctx, sx, sy, w, m.hop);

  const bodyY = sy - m.hop - w * 0.45;
  ctx.save();
  if (c.dead) ctx.globalAlpha = 0.25;
  ctx.font = `${Math.round(w * 0.92)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (c.isBoss) {
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;
  }
  ctx.fillText(c.ref?.icon || '👾', sx, bodyY);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';

  if (c.flashUntil && now < c.flashUntil) {
    ctx.globalAlpha = 0.5 * ((c.flashUntil - now) / 200);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(sx, bodyY, w * 0.5, w * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  if (!c.dead) {
    drawHpBar(ctx, sx, bodyY - w * 0.5 - 5, Math.min(w, 40), c.hp, c.maxHp);
    drawStatuses(ctx, c.status, sx, sy, w);
  }

  if (opts.marker) {
    ctx.fillStyle = '#f59e0b';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.marker, sx, sy + 13);
  }
}

// ── Frame ────────────────────────────────────────────────────────────────────

/**
 * Draw one frame.
 *
 * `view` is { zone, slimes, enemies, focusId, marching, phase } and `motions`
 * is a persistent Map the caller owns so movement survives re-renders.
 */
export function drawFrame(ctx, view, motions, dt, now, tick) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  drawGround(ctx, view?.zone, tick);

  if (!view) return;

  const focus = (view.enemies || []).find(e => e.id === view.focusId && !e.dead)
             || (view.enemies || []).find(e => !e.dead);

  // Enemies first so their motion is available as a target this frame.
  (view.enemies || []).forEach((e, i) => {
    if (!motions.has(e.id)) motions.set(e.id, makeMotion(i, (view.enemies || []).length, 'enemy'));
    const m = motions.get(e.id);
    if (view.marching) {
      // A column on the move: the lead unit — the one being fought — is out
      // front to the right, with the rest strung out behind it up the road.
      const drift = Math.sin(now / 900 + i * 0.7) * 0.006;
      m.x = 0.70 - i * 0.105 + drift;
      m.d = 0.40 + ((i * 2) % 3) * 0.11 + Math.sin(now / 1400 + i) * 0.015;
      m.hopPhase += dt * 3.4;
      m.hop = Math.abs(Math.sin(m.hopPhase)) * 2.2;
    } else {
      stepEnemyMotion(m, dt, now, i, false);
    }
  });

  const focusMotion = focus ? motions.get(focus.id) : null;

  // Collected up front so separation sees every neighbour's current position.
  const livingMotions = (view.slimes || [])
    .filter(s => !s.dead)
    .map(s => motions.get(s.id))
    .filter(Boolean);

  (view.slimes || []).forEach((s, i) => {
    if (!motions.has(s.id)) motions.set(s.id, makeMotion(i, (view.slimes || []).length, 'slime'));
    const m = motions.get(s.id);
    const stats = s.stats || { firmness: 10, slipperiness: 10, viscosity: 10 };
    m.bulk = sizeFromFirmness(stats.firmness);
    if (s.dead) {
      m.hop *= 0.8;
      m.state = 'down';
    } else {
      stepSlimeMotion(m, focusMotion, stats, dt, now, livingMotions);
      stepDrips(m, stats.viscosity, dt, now);
    }
  });

  // Painter's algorithm: further back draws first.
  const cast = [
    ...(view.enemies || []).map(e => ({ c: e, m: motions.get(e.id), kind: 'enemy' })),
    ...(view.slimes || []).map(s => ({ c: s, m: motions.get(s.id), kind: 'slime' })),
  ].filter(o => o.m).sort((a, b) => a.m.d - b.m.d);

  cast.forEach(o => {
    if (o.kind === 'slime') {
      drawSlime(ctx, o.c, o.m, o.c.stats || {}, now);
    } else {
      drawEnemy(ctx, o.c, o.m, now, {
        marker: view.marching && o.c.id === focus?.id ? '▲ target' : null,
      });
    }
  });
}

/**
 * Fold a round's beats into the motion state: who lunged, who was knocked back,
 * who flashed. Called once per new animation, not per frame.
 */
export function applyBeats(view, motions, beats, now) {
  (beats || []).forEach(b => {
    const at = now + b.at;
    if (b.kind === 'strike' && b.actorId) {
      const m = motions.get(b.actorId);
      if (m) { m.state = 'dart'; m.until = at + 520; }
    }
    if (b.targetId) {
      const target = [...(view.slimes || []), ...(view.enemies || [])].find(e => e.id === b.targetId);
      if (target) target.flashUntil = at + 200;
      const tm = motions.get(b.targetId);
      if (tm && b.kind === 'strike' && b.result !== 'evaded') {
        tm.state = 'recoil';
        tm.until = at + 420;
      }
    }
  });
}
