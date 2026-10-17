// ─────────────────────────────────────────────────────────────────────────────
// The Nucleus, as anatomy
//
// The player is the nucleus, so The Nucleus screen is the inside of her body:
// the Queen at the heart, an organ for each system, and a Tendril reaching out
// of the membrane toward every zone she has grown into. Nothing locked is
// drawn. Unlocking something grows a new organ, and leveling a Tendril makes it
// longer; that growth is the point of the screen.
//
// Everything is drawn in a 120×160 pixel space by the rule-based renderer in
// pixel.js. `composeNucleus` returns the pixels for one animation frame and the
// tappable hotspots, in the same space, for the page to lay buttons over.
// ─────────────────────────────────────────────────────────────────────────────

import { Sprite } from './pixel.js';

export const NUCLEUS_W = 120;
export const NUCLEUS_H = 160;

const PAL = {
  membrane: { outline: '#6bb9b6', fill: '#bfe3d5', rim: '#d8eee6',
              blend: ['tendril'] },
  tendril:  { outline: '#6bb9b6', fill: '#a7d6c5', rim: '#c1d6cb', blend: ['membrane'] },
  queen:    { outline: '#c45a8a', fill: '#f29ac0', rim: '#f8c3da', pool: '#de78a6', poolAt: 0.72 },
  neural:   { outline: '#c08a3e', fill: '#ecc98a', rim: '#f6e0b5', pool: '#d9ad66', poolAt: 0.65 },
  gland:    { outline: '#a06aa8', fill: '#d6a8dc', rim: '#e8c9ec', pool: '#bd88c4', poolAt: 0.6 },
  stomach:  { outline: '#5f9e5a', fill: '#9fd08a', rim: '#c4e3b1', pool: '#7fb86f', poolAt: 0.55 },
  vat:      { outline: '#5b86b8', fill: '#9cc2e6', rim: '#c3dbf1', pool: '#7aa6d4', poolAt: 0.6 },
  shell:    { outline: '#9a7a5c', fill: '#d8b98f', rim: '#ead3ad', pool: '#b8986f', poolAt: 0.7 },
  snail:    { outline: '#8b9a6b', fill: '#c9d4a8', rim: '#dfe6c6', pool: '#aab887', poolAt: 0.75 },
  pack:     { outline: '#7d6a8f', fill: '#b6a3c8', rim: '#cfc1dc' },
};

// The body.
const BODY = { cx: 60, cy: 84, rx: 44, ry: 56 };

// Where each organ sits, and the system it opens.
export const ORGANS = {
  queen:   { x: 60, y: 80,  rx: 15, ry: 12, label: 'The Queen' },
  neural:  { x: 86, y: 54,  rx: 10, ry: 7,  label: 'Instincts' },
  gland:   { x: 33, y: 55,  rx: 9,  ry: 7,  label: 'Pheromones' },
  stomach: { x: 40, y: 112, rx: 13, ry: 9,  label: 'Stores' },
  vat:     { x: 82, y: 110, rx: 10, ry: 10, label: 'Buildings' },
};

// Each zone's Tendril leaves the membrane at its own angle (degrees, 0 = right,
// negative = up), so the body reaches toward the wilds in every direction.
const TENDRIL_ANGLE = {
  forest: -135, swamp: -45, caves: 180, ruins: 0, peaks: 135, volcano: 45,
};

const onMembrane = (deg, inset = 2) => {
  const a = (deg * Math.PI) / 180;
  return { x: BODY.cx + (BODY.rx - inset) * Math.cos(a), y: BODY.cy + (BODY.ry - inset) * Math.sin(a), a };
};

/**
 * state: {
 *   organs:   { queen, neural, gland, stomach, vat }   which to draw
 *   tendrils: [{ zone, level }]                          level 1-3
 *   merchant: bool                                       Mossback at the door
 * }
 * frame: 0-3, for a gentle breathing loop.
 */
export function composeNucleus(state, frame = 0) {
  const W = NUCLEUS_W, H = NUCLEUS_H;
  const s = new Sprite(W, H);
  const breathe = [0, 0.6, 1, 0.6][frame % 4];
  const bob = (i) => [0, 0, 1, 1][(frame + i) % 4];
  const hotspots = [];

  // Tendrils first, so the membrane draws over their roots.
  (state.tendrils || []).forEach(({ zone, level }, i) => {
    const deg = TENDRIL_ANGLE[zone];
    if (deg == null) return;
    const from = onMembrane(deg, 6);
    const len = 6 + 6 * Math.max(1, Math.min(3, level));
    const sway = [0, 1, 0, -1][(frame + i) % 4] * 0.6;
    const tip = { x: from.x + Math.cos(from.a) * (len + 6), y: from.y + Math.sin(from.a) * (len + 6) };
    s.tube(from.x, from.y, tip.x, tip.y, 2 + sway, 3.8, 1.4, 'tendril');
    hotspots.push({ id: `tendril:${zone}`, zone, x: tip.x, y: tip.y, rx: 7, ry: 7 });
  });

  s.ellipse(BODY.cx, BODY.cy, BODY.rx + breathe * 0.5, BODY.ry + breathe * 0.5, 'membrane');

  const organ = (id, i) => {
    const o = ORGANS[id];
    const y = o.y + bob(i) * 0.5;
    s.ellipse(o.x, y, o.rx, o.ry, id);
    hotspots.push({ id, x: o.x, y, rx: o.rx + 3, ry: o.ry + 3, label: o.label });
    return { ...o, y };
  };

  const org = state.organs || {};
  const drawn = {};
  ['neural', 'gland', 'stomach', 'vat'].forEach((id, i) => { if (org[id]) drawn[id] = organ(id, i + 1); });
  const q = organ('queen', 0);

  // Mossback, pressed against the outside of the membrane.
  if (state.merchant) {
    const mx = 48, my = 142;
    s.poly([[mx, my + 15], [mx + 2, my + 11], [mx + 10, my + 10], [mx + 22, my + 11], [mx + 25, my + 15], [mx + 24, my + 16], [mx + 2, my + 16]], 'snail');
    s.rect(mx + 1, my + 3, 3, 9, 'snail'); s.ellipse(mx + 2.5, my + 3, 2.2, 2.2, 'snail');
    s.ellipse(mx + 14, my + 7, 7, 6, 'shell');
    s.rect(mx + 10, my - 1, 9, 4, 'pack');
    hotspots.push({ id: 'merchant', x: mx + 12, y: my + 8, rx: 14, ry: 10, label: 'Mossback' });
  }

  const px = s.render(PAL);
  const t = new Sprite(W, H);

  // The Queen: face and crown.
  const qy = Math.round(q.y);
  t.dots([[55, qy - 1], [65, qy - 1]], '#5a2340'); t.dots([[55, qy - 2], [65, qy - 2]], '#ffffff');
  t.dots([[58, qy + 4], [59, qy + 5], [60, qy + 5], [61, qy + 5], [62, qy + 4]], '#a8476f');
  for (let x = 52; x <= 68; x++) { t.dot(x, qy - 11, '#e0a93a'); t.dot(x, qy - 12, '#f2c94c'); }
  [[53, 3], [56, 2], [60, 5], [64, 2], [67, 3]].forEach(([x, h]) => { for (let k = 1; k <= h; k++) t.dot(x, qy - 12 - k, '#f2c94c'); });
  t.dots([[60, qy - 17], [60, qy - 13]], '#ffffff'); t.dots([[56, qy - 12], [64, qy - 12]], '#e2557a');

  if (drawn.neural) { const { x, y } = drawn.neural; t.dots([[x - 4, y - 1], [x - 2, y], [x, y], [x + 2, y - 1], [x + 4, y + 1], [x - 1, y + 2], [x + 1, y - 3]], '#c08a3e'); }
  if (drawn.gland) { const { x, y } = drawn.gland; t.dots([[x - 1, y - 10 - frame % 2], [x + 2, y - 13], [x - 3, y - 15 + frame % 2]], '#d6a8dc'); }
  if (drawn.stomach) { const { x, y } = drawn.stomach; t.dots([[x - 3, y - 1], [x - 2, y - 1], [x + 3, y + 1], [x + 4, y + 1], [x, y + 3]], '#5f9e5a'); }
  if (drawn.vat) { const { x, y } = drawn.vat; t.dots([[x - 1, y - 1], [x, y - 2], [x + 1, y - 1], [x, y], [x - 1, y], [x + 1, y]], '#a7d6c5'); }
  if (state.merchant) {
    t.dots([[49, 144], [50, 143]], '#3b3a2e');
    t.dots([[61, 141], [62, 140], [65, 141]], '#f2d27a');
  }
  // Membrane highlight specks, upper left like the slime's.
  t.dots([[37, 44], [38, 43], [39, 43], [35, 48]], '#e9f6f0');

  for (const [idx, col] of t.over) px.set(col, idx * 4);
  return { data: px, w: W, h: H, hotspots };
}
