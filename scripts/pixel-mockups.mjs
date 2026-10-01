// Pixel-art mockups in the style of slime-basic-idle.png.
//
//   node scripts/pixel-mockups.mjs <outdir>
//
// The house style, read off the slime sprite:
//   - three tones per material: a mid-tone OUTLINE in the body's own hue (no
//     black), a pale RIM light just inside the outline, and the FILL
//   - a darker POOL sunk into the lower body
//   - a few highlight specks, upper left
// Shapes here are built from simple masks and the shading is applied by rule,
// so every sprite gets the same treatment the slime has.

import sharp from 'sharp';
import path from 'path';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

// ── A tiny canvas ────────────────────────────────────────────────────────────

class Sprite {
  constructor(w, h) { this.w = w; this.h = h; this.mat = new Array(w * h).fill(null); this.over = new Map(); }
  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  set(x, y, m) { if (this.inside(x, y)) this.mat[y * this.w + x] = m; }
  get(x, y) { return this.inside(x, y) ? this.mat[y * this.w + x] : null; }
  ellipse(cx, cy, rx, ry, m) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1) this.set(x, y, m);
  }
  rect(x0, y0, w, h, m) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) this.set(x, y, m); }
  poly(pts, m) { // even-odd fill
    const ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
      for (let x = 0; x < this.w; x++) {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) c = !c;
        }
        if (c) this.set(x, y, m);
      }
  }
  /** A hand-placed pixel that skips shading: eyes, teeth, cracks. */
  dot(x, y, color) { if (this.inside(x, y)) this.over.set(y * this.w + x, hex(color)); }
  dots(list, color) { list.forEach(([x, y]) => this.dot(x, y, color)); }

  /** Apply the house shading and return RGBA bytes. */
  render(materials) {
    const { w, h } = this;
    const out = Buffer.alloc(w * h * 4);
    // Lowest row of each material, for the sunk pool.
    const bounds = {};
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const m = this.get(x, y); if (!m) continue;
      const b = bounds[m] ||= { top: y, bottom: y };
      b.top = Math.min(b.top, y); b.bottom = Math.max(b.bottom, y);
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const m = this.get(x, y);
      const i = (y * w + x) * 4;
      if (!m) continue;
      const pal = materials[m];
      const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      const edge = n4.some(([dx, dy]) => this.get(x + dx, y + dy) !== m && !(pal.blend || []).includes(this.get(x + dx, y + dy)));
      const nearEdge = !edge && n4.some(([dx, dy]) => {
        const o = this.get(x + dx, y + dy);
        return o === m && n4.some(([ex, ey]) => this.get(x + dx + ex, y + dy + ey) !== m);
      });
      const b = bounds[m];
      const depth = (y - b.top) / Math.max(1, b.bottom - b.top);
      let c = pal.fill;
      if (edge) c = pal.outline;
      else if (nearEdge && depth < 0.75) c = pal.rim;
      else if (pal.pool && depth > pal.poolAt) c = pal.pool;
      const col = hex(c);
      col.forEach((v, k) => { out[i + k] = v; });
    }
    for (const [idx, col] of this.over) col.forEach((v, k) => { out[idx * 4 + k] = v; });
    return out;
  }
}

// ── Palettes ─────────────────────────────────────────────────────────────────

const P = {
  slime:  { outline: '#6bb9b6', fill: '#a7d6c5', rim: '#c1d6cb', pool: '#6bb9b6', poolAt: 0.7 },
  wolf:   { outline: '#7f8aa3', fill: '#b9c1d3', rim: '#d6dbe6', pool: '#9aa3b9', poolAt: 0.72 },
  wolfDk: { outline: '#7f8aa3', fill: '#9aa3b9', rim: '#b9c1d3' },
  trap:   { outline: '#5f9e5a', fill: '#9fd08a', rim: '#c4e3b1', pool: '#7fb86f', poolAt: 0.7, blend: ['trapIn'] },
  trapIn: { outline: '#b35f7d', fill: '#e9a0b4', rim: '#f2c4d0', pool: '#cf7d97', poolAt: 0.55, blend: ['trap'] },
  stem:   { outline: '#5f9e5a', fill: '#7fb86f', rim: '#9fd08a' },
  rock:   { outline: '#8a7f73', fill: '#c4b8a6', rim: '#ddd3c2', pool: '#a89c8a', poolAt: 0.68 },
  gullet: { outline: '#5d5a7a', fill: '#8f9a84', rim: '#aab49d', pool: '#727d6b', poolAt: 0.62, blend: ['gulIn'] },
  gulIn:  { outline: '#6e3e58', fill: '#a9627f', rim: '#c48298', pool: '#8a4a66', poolAt: 0.5, blend: ['gullet'] },
  shell:  { outline: '#9a7a5c', fill: '#d8b98f', rim: '#ead3ad', pool: '#b8986f', poolAt: 0.7 },
  snail:  { outline: '#8b9a6b', fill: '#c9d4a8', rim: '#dfe6c6', pool: '#aab887', poolAt: 0.75 },
  pack:   { outline: '#7d6a8f', fill: '#b6a3c8', rim: '#cfc1dc' },
};

// ── Monsters ─────────────────────────────────────────────────────────────────

function youngWolf() {
  const s = new Sprite(32, 32);
  s.ellipse(17, 20, 9, 6.5, 'wolf');          // body, chunky
  s.rect(9, 22, 4, 7, 'wolf'); s.rect(14, 23, 3, 6, 'wolf');    // front legs
  s.rect(19, 23, 3, 6, 'wolf'); s.rect(23, 22, 4, 7, 'wolf');   // back legs
  s.poly([[24, 17], [30, 11], [31.5, 14], [27, 21]], 'wolf');     // tail
  s.ellipse(9, 14, 6.2, 5.6, 'wolf');          // head
  s.poly([[1, 15], [6, 13], [7, 19], [2, 18.5]], 'wolf');         // snout
  s.poly([[5, 11], [6.5, 4.5], [10, 10]], 'wolf');                // ear
  s.poly([[10, 10], [13, 4.5], [14, 11]], 'wolf');                // ear
  const px = s.render(P);
  const t = new Sprite(32, 32); // details on top
  t.dots([[8, 13], [8, 14]], '#3b4256'); t.dot(9, 13, '#ffffff');  // eye + glint
  t.dots([[1, 15], [2, 15]], '#3b4256');                           // nose
  t.dots([[3, 18], [5, 18]], '#ffffff');                           // fangs
  t.dots([[16, 18], [17, 17], [18, 18], [19, 17]], '#d6dbe6');     // fur tufts
  return overlay(px, t, 32, 32);
}

function slimetrap() {
  const s = new Sprite(32, 32);
  s.rect(15, 18, 3, 11, 'stem');
  s.ellipse(9, 26, 6, 2.6, 'stem'); s.ellipse(23, 26, 6, 2.6, 'stem');     // leaves
  s.ellipse(16, 12, 10, 7.5, 'trap');                                        // head
  s.ellipse(16, 13, 7, 3.2, 'trapIn');                                       // open maw
  const px = s.render(P);
  const t = new Sprite(32, 32);
  t.dots([[10, 11], [13, 10], [16, 10], [19, 10], [22, 11]], '#ffffff');    // top teeth
  t.dots([[11, 15], [14, 16], [17, 16], [20, 15]], '#ffffff');              // bottom teeth
  t.dots([[13, 14], [14, 14], [18, 13]], '#7a2f4c');                        // throat
  t.dots([[11, 6], [12, 6], [12, 7]], '#e6f5d8');                           // highlight
  t.dots([[16, 3], [16, 2]], '#5f9e5a');                                    // drip of a tendril
  return overlay(px, t, 32, 32);
}

function pebblet() {
  const s = new Sprite(32, 32);
  s.poly([[6, 27], [5, 18], [9, 11], [17, 8], [24, 11], [27, 18], [26, 27]], 'rock');
  const px = s.render(P);
  const t = new Sprite(32, 32);
  t.dots([[12, 17], [20, 17]], '#3e3a33'); t.dots([[12, 16], [20, 16]], '#ffffff'); // eyes
  t.dots([[14, 21], [15, 22], [16, 22], [17, 22], [18, 21]], '#6f665b');           // grumpy mouth
  t.dots([[21, 11], [22, 12], [22, 13], [23, 14]], '#8a7f73');                     // crack
  t.dots([[9, 13], [10, 12]], '#ece5d8');                                          // highlight
  return overlay(px, t, 32, 32);
}

function oldGullet() {
  const s = new Sprite(48, 48);
  s.rect(21, 26, 6, 19, 'stem');
  s.poly([[2, 46], [8, 36], [22, 41], [13, 47]], 'stem');                   // drooping leaves
  s.poly([[46, 46], [40, 35], [26, 41], [35, 47]], 'stem');
  s.ellipse(24, 18, 17, 12, 'gullet');                                      // big wilted head
  s.poly([[8, 22], [3, 30], [10, 27]], 'gullet');                           // drooping lip
  s.poly([[40, 22], [45, 30], [38, 27]], 'gullet');
  s.ellipse(24, 20, 12.5, 6, 'gulIn');                                      // maw
  const px = s.render(P);
  const t = new Sprite(48, 48);
  const teethTop = [13, 16, 19, 22, 25, 28, 31, 34];
  teethTop.forEach(x => { t.dot(x, 16, '#f3ecd8'); t.dot(x, 17, '#f3ecd8'); });
  [15, 19, 23, 27, 31].forEach(x => { t.dot(x, 24, '#f3ecd8'); t.dot(x, 23, '#f3ecd8'); });
  t.dots([[22, 20], [23, 20], [24, 21], [25, 20], [26, 20]], '#4a2338');    // the deep throat
  t.dots([[19, 8], [20, 7], [28, 7], [29, 8]], '#d9c96a');                  // two old eyes, half shut
  t.dots([[12, 10], [13, 9], [14, 9]], '#c5cdb8');                          // highlight
  t.dots([[34, 9], [35, 11], [33, 12]], '#5d5a7a');                         // wrinkles
  return overlay(px, t, 48, 48);
}

function mossback() {
  const s = new Sprite(40, 32);
  s.poly([[3, 28], [5, 24], [16, 22], [34, 23], [38, 28], [36, 29], [5, 29]], 'snail');   // foot
  s.rect(4, 13, 4, 12, 'snail'); s.ellipse(6, 13, 3, 3, 'snail');                         // neck + head
  s.rect(4, 6, 1, 6, 'snail'); s.rect(8, 6, 1, 6, 'snail');                               // eye stalks
  s.ellipse(21, 16, 11, 9, 'shell');                                                       // shell
  s.rect(15, 4, 13, 6, 'pack');                                                            // the shop on its back
  s.rect(16, 9, 2, 3, 'pack'); s.rect(25, 9, 2, 3, 'pack');                               // straps
  const px = s.render(P);
  const t = new Sprite(40, 32);
  t.dots([[4, 5], [8, 5]], '#3b3a2e');                                                     // eyes
  t.dots([[21, 16], [22, 15], [23, 16], [23, 17], [22, 18], [20, 18], [19, 16], [20, 14], [22, 13], [25, 14], [26, 17]], '#9a7a5c'); // spiral
  t.dots([[17, 3], [18, 3], [19, 2], [23, 3], [24, 2], [25, 3]], '#f2d27a');               // goods poking out
  t.dots([[7, 16], [6, 17]], '#3b3a2e');                                                   // smile
  return overlay(px, t, 40, 32);
}

function overlay(base, top, w, h) {
  for (const [idx, col] of top.over) col.forEach((v, k) => { base[idx * 4 + k] = v; });
  return base;
}

// ── The Nucleus, as anatomy ──────────────────────────────────────────────────
//
// A composition sketch: the membrane, the Queen at the center, the organelles
// for each system, and Tendrils reaching out of the membrane toward the zones.

function nucleus() {
  const W = 120, H = 160;
  const s = new Sprite(W, H);
  const pal = {
    membrane: { outline: '#6bb9b6', fill: '#bfe3d5', rim: '#d8eee6',
                blend: ['gland', 'neural', 'stomach', 'vat', 'tendril'] },
    tendril:  { outline: '#6bb9b6', fill: '#a7d6c5', rim: '#c1d6cb', blend: ['membrane'] },
    gland:    { outline: '#a06aa8', fill: '#d6a8dc', rim: '#e8c9ec', pool: '#bd88c4', poolAt: 0.6 },
    neural:   { outline: '#c08a3e', fill: '#ecc98a', rim: '#f6e0b5', pool: '#d9ad66', poolAt: 0.65 },
    stomach:  { outline: '#5f9e5a', fill: '#9fd08a', rim: '#c4e3b1', pool: '#7fb86f', poolAt: 0.55 },
    vat:      { outline: '#5b86b8', fill: '#9cc2e6', rim: '#c3dbf1', pool: '#7aa6d4', poolAt: 0.6 },
    queen:    { outline: '#c45a8a', fill: '#f29ac0', rim: '#f8c3da', pool: '#de78a6', poolAt: 0.72 },
  };
  // Tendrils first, out through the membrane edge toward the zones.
  // A tapered tube along a gentle curve, from inside the body out to a tip.
  const tendril = (x0, y0, x1, y1, bend, r0) => {
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x0 + (x1 - x0) * t + Math.sin(t * Math.PI) * bend;
      const y = y0 + (y1 - y0) * t;
      const r = r0 * (1 - t * 0.7);
      s.ellipse(x, y, r, r, 'tendril');
    }
  };
  tendril(22, 64, 3, 30, -6, 4.2);     // toward the forest
  tendril(98, 64, 117, 30, 6, 4.2);    // toward the swamp
  tendril(30, 134, 6, 158, -4, 3.8);   // toward the caves
  s.ellipse(60, 92, 50, 62, 'membrane');                               // the body
  s.ellipse(60, 86, 16, 13, 'queen');                                  // the Queen, at the heart
  s.ellipse(32, 62, 9, 7, 'gland');                                    // scent gland: pheromones
  s.ellipse(88, 62, 10, 7, 'neural');                                  // neural knot: Instincts
  s.ellipse(40, 120, 13, 9, 'stomach');                                // stomach: stores
  s.ellipse(82, 118, 10, 10, 'vat');                                   // vat: spawning / buildings
  const px = s.render(pal);
  const t = new Sprite(W, H);
  // Queen face and crown.
  t.dots([[55, 85], [65, 85]], '#5a2340'); t.dots([[55, 84], [65, 84]], '#ffffff');
  t.dots([[58, 90], [59, 91], [60, 91], [61, 91], [62, 90]], '#a8476f');
  [[52, 73], [56, 70], [60, 68], [64, 70], [68, 73]].forEach(([x, y]) => { t.dot(x, y, '#f2c94c'); t.dot(x, y + 1, '#f2c94c'); });
  for (let x = 52; x <= 68; x++) t.dot(x, 75, '#e0a93a');
  t.dots([[56, 71], [64, 71], [60, 69]], '#ffffff');
  // Neural knot: a little branching nerve pattern.
  t.dots([[84, 60], [86, 61], [88, 62], [90, 61], [92, 63], [87, 64], [89, 59]], '#c08a3e');
  // Scent gland: puffs rising.
  t.dots([[31, 52], [33, 49], [30, 46], [34, 45]], '#d6a8dc');
  // Stomach: something half digested.
  t.dots([[37, 119], [38, 119], [43, 121], [44, 121], [40, 123]], '#5f9e5a');
  // Vat: a bud forming.
  t.ellipse && null;
  t.dots([[81, 117], [82, 116], [83, 117], [82, 118], [81, 118], [83, 118]], '#a7d6c5');
  // Membrane specks, upper left like the slime's highlight.
  t.dots([[26, 40], [27, 39], [28, 39], [24, 44]], '#e9f6f0');
  return overlay(px, t, W, H);
}

// ── Output ───────────────────────────────────────────────────────────────────

const out = process.argv[2] || '.';
const save = async (name, buf, w, h, scale) =>
  sharp(buf, { raw: { width: w, height: h, channels: 4 } })
    .resize(w * scale, h * scale, { kernel: 'nearest' }).png().toFile(path.join(out, name));

const slimeFrame = await sharp(path.resolve(import.meta.dirname, '../src/assets/sprites/slime-basic-idle.png'))
  .extract({ left: 0, top: 0, width: 32, height: 32 }).raw().toBuffer();

await save('slime.png', slimeFrame, 32, 32, 8);
await save('young-wolf.png', youngWolf(), 32, 32, 8);
await save('slimetrap.png', slimetrap(), 32, 32, 8);
await save('pebblet.png', pebblet(), 32, 32, 8);
await save('old-gullet.png', oldGullet(), 48, 48, 8);
await save('mossback.png', mossback(), 40, 32, 8);
await save('nucleus-raw.png', nucleus(), 120, 160, 4);
await sharp({ create: { width: 480, height: 640, channels: 4, background: '#1a1d2e' } })
  .composite([{ input: path.join(out, 'nucleus-raw.png') }]).png().toFile(path.join(out, 'nucleus.png'));

// A lineup on a dark background, the way they would sit in the arena.
const tiles = ['slime.png', 'young-wolf.png', 'slimetrap.png', 'pebblet.png', 'mossback.png', 'old-gullet.png'];
const metas = await Promise.all(tiles.map(f => sharp(path.join(out, f)).metadata()));
const gap = 24;
const width = metas.reduce((n, m) => n + m.width + gap, gap);
const height = Math.max(...metas.map(m => m.height)) + gap * 2;
let x = gap;
const comps = tiles.map((f, i) => {
  const c = { input: path.join(out, f), left: x, top: height - gap - metas[i].height };
  x += metas[i].width + gap;
  return c;
});
await sharp({ create: { width, height, channels: 4, background: '#1f2a24' } })
  .composite(comps).png().toFile(path.join(out, 'lineup.png'));
console.log('wrote', tiles.length + 2, 'images to', out);
