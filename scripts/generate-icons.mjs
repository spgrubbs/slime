// Regenerate every icon in the project from one source: assets/icon.svg.
//
//   npm run icons
//
// Writes the PWA icon set (public/icons), the favicon, and the Android launcher
// icons, round icons, adaptive-icon foregrounds and splash screens. Keeping all
// of them derived from a single SVG means the app never ends up with three
// slightly different slimes on three different surfaces.

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const SVG = fs.readFileSync(path.join(ROOT, 'assets/icon.svg'));
const BG = { r: 26, g: 26, b: 46, alpha: 1 };   // #1a1a2e, the app background

const out = (...p) => path.join(ROOT, ...p);
const ensure = (dir) => fs.mkdirSync(dir, { recursive: true });

// ── PWA / web ────────────────────────────────────────────────────────────────

ensure(out('public/icons'));
for (const size of [48, 72, 96, 144, 192, 256, 384, 512]) {
  await sharp(SVG).resize(size, size).png().toFile(out(`public/icons/icon-${size}.png`));
}
await sharp(SVG).resize(180, 180).png().toFile(out('public/icons/apple-touch-icon.png'));
await sharp(SVG).resize(32, 32).png().toFile(out('public/favicon.png'));

// Maskable: Android crops the icon to whatever shape the launcher uses, so the
// art has to sit inside a safe zone with the background filling the rest.
{
  const size = 512;
  const art = Math.round(size * 0.68);
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: await sharp(SVG).resize(art, art).png().toBuffer(), gravity: 'centre' }])
    .png().toFile(out('public/icons/maskable-512.png'));
}

// ── Android ──────────────────────────────────────────────────────────────────

const RES = out('android/app/src/main/res');
if (fs.existsSync(RES)) {
  const LAUNCHER = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  // Adaptive-icon foregrounds are 108dp; the system crops roughly the outer
  // third, so the art occupies 60% of the canvas and the rest is transparent.
  const FOREGROUND = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };

  const circular = async (size) => {
    const mask = Buffer.from(
      `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    return sharp(await sharp(SVG).resize(size, size).png().toBuffer())
      .composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  };

  for (const [density, size] of Object.entries(LAUNCHER)) {
    const dir = path.join(RES, `mipmap-${density}`);
    ensure(dir);
    await sharp(SVG).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), await circular(size));

    const fg = FOREGROUND[density];
    const art = Math.round(fg * 0.6);
    await sharp({ create: { width: fg, height: fg, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await sharp(SVG).resize(art, art).png().toBuffer(), gravity: 'centre' }])
      .png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }

  // Splash: what Capacitor shows while the WebView boots. Keep the existing
  // per-density dimensions and just repaint the contents.
  for (const dir of fs.readdirSync(RES).filter(d => d.startsWith('drawable'))) {
    const p = path.join(RES, dir, 'splash.png');
    if (!fs.existsSync(p)) continue;
    const { width, height } = await sharp(p).metadata();
    const art = Math.round(Math.min(width, height) * 0.35);
    const buf = await sharp({ create: { width, height, channels: 4, background: BG } })
      .composite([{ input: await sharp(SVG).resize(art, art).png().toBuffer(), gravity: 'centre' }])
      .png().toBuffer();
    fs.writeFileSync(p, buf);
  }
  console.log('android: launcher icons, round icons, adaptive foregrounds, splash');
} else {
  console.log('android/ not present — skipped native icons (run `npx cap add android`)');
}

console.log('web: public/icons + favicon');
