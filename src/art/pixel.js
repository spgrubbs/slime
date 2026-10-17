// ─────────────────────────────────────────────────────────────────────────────
// Pixel art, by rule
//
// The house style, read off slime-basic-idle.png:
//   - three tones per material: a mid-tone OUTLINE in the body's own hue (never
//     black), a pale RIM light just inside the outline, and the FILL
//   - a darker POOL sunk into the lower body
//   - a few highlight specks, upper left
// Shapes are drawn as masks of named materials and the shading is applied by
// rule, so everything drawn here sits next to the slime sprite naturally.
// Used at runtime (the Nucleus) and by scripts/pixel-mockups.mjs.
// ─────────────────────────────────────────────────────────────────────────────

export const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16), 255];

export class Sprite {
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
  /** A tapered tube along a gentle curve: tendrils, stems. */
  tube(x0, y0, x1, y1, bend, r0, r1, m) {
    const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2) + 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const nx = -(y1 - y0), ny = x1 - x0;
      const nl = Math.hypot(nx, ny) || 1;
      const b = Math.sin(t * Math.PI) * bend;
      const x = x0 + (x1 - x0) * t + (nx / nl) * b;
      const y = y0 + (y1 - y0) * t + (ny / nl) * b;
      const r = r0 + (r1 - r0) * t;
      this.ellipse(x, y, r, r, m);
    }
  }
  /** A hand-placed pixel that skips shading: eyes, teeth, cracks. */
  dot(x, y, color) { if (this.inside(Math.round(x), Math.round(y))) this.over.set(Math.round(y) * this.w + Math.round(x), hex(color)); }
  dots(list, color) { list.forEach(([x, y]) => this.dot(x, y, color)); }

  /** Apply the house shading. Returns RGBA bytes (Uint8ClampedArray). */
  render(materials) {
    const { w, h } = this;
    const out = new Uint8ClampedArray(w * h * 4);
    const bounds = {};
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const m = this.get(x, y); if (!m) continue;
      const b = bounds[m] ||= { top: y, bottom: y };
      b.top = Math.min(b.top, y); b.bottom = Math.max(b.bottom, y);
    }
    const n4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const m = this.get(x, y);
      if (!m) continue;
      const pal = materials[m];
      const joins = (o) => o === m || (pal.blend || []).includes(o);
      const edge = n4.some(([dx, dy]) => !joins(this.get(x + dx, y + dy)));
      const nearEdge = !edge && n4.some(([dx, dy]) => {
        const o = this.get(x + dx, y + dy);
        return o === m && n4.some(([ex, ey]) => !joins(this.get(x + dx + ex, y + dy + ey)));
      });
      const b = bounds[m];
      const depth = (y - b.top) / Math.max(1, b.bottom - b.top);
      let c = pal.fill;
      if (edge) c = pal.outline;
      else if (nearEdge && depth < 0.75) c = pal.rim;
      else if (pal.pool && depth > pal.poolAt) c = pal.pool;
      const col = hex(c);
      const i = (y * w + x) * 4;
      out[i] = col[0]; out[i + 1] = col[1]; out[i + 2] = col[2]; out[i + 3] = 255;
    }
    for (const [idx, col] of this.over) { out.set(col, idx * 4); }
    return out;
  }
}

/** Lay `top`'s hand-placed pixels over already-rendered `base` bytes. */
export function overlay(base, top) {
  for (const [idx, col] of top.over) base.set(col, idx * 4);
  return base;
}
