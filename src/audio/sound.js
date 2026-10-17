// ─────────────────────────────────────────────────────────────────────────────
// Sound
//
// Every sound in the game is synthesized here with the Web Audio API: no audio
// files, nothing to license, nothing added to the APK, and any sound can be
// retuned by changing a number. Slimes suit it. A slime is a pitch bend
// through a soft filter, and so is most of what they do.
//
// Rules the game follows:
//   - Sound only for what the player is watching. Offline catch-up is silent,
//     and combat sounds come from the fight on screen, not every fight running.
//   - Busy fights must not become machine-gun clicks: every sound has a
//     minimum gap before it can play again, pitch varies a little each time,
//     and a hard cap limits how many voices sound at once.
//   - Audio stops when the app is backgrounded and resumes when it returns.
//
// Browsers only allow audio after the player has touched the page, so the
// context is created on the first tap (`unlockAudio`).
// ─────────────────────────────────────────────────────────────────────────────

const PREFS_KEY = 'slime_queen_prefs';

const DEFAULT_PREFS = { volume: 0.8, sfx: 1, ambience: 0.5, muted: false, haptics: true, notifications: true };

// Per-device preferences, kept apart from the save so deleting a game does not
// reset your volume.
export function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

let prefs = loadPrefs();
let ctx = null;
let master = null;
let sfxBus = null;
let ambBus = null;
let noiseBuf = null;

export const getPrefs = () => ({ ...prefs });

export function setPrefs(next) {
  prefs = { ...prefs, ...next };
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* private mode */ }
  applyLevels();
}

function applyLevels() {
  if (!ctx) return;
  const t = ctx.currentTime;
  master.gain.setTargetAtTime(prefs.muted ? 0 : prefs.volume, t, 0.05);
  // Makeup gain: the sounds are mixed conservatively, and phone speakers
  // need the headroom used. The master compressor catches the peaks.
  sfxBus.gain.setTargetAtTime(prefs.sfx * 1.6, t, 0.05);
  ambBus.gain.setTargetAtTime(prefs.ambience * 0.6, t, 0.2);
}

/** Create (or wake) the audio context. Call from a user gesture. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  if (ctx) {
    if (ctx.state === 'suspended' && document.visibilityState === 'visible') ctx.resume();
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();

  // A gentle compressor on the master keeps a crowded moment from clipping.
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master = ctx.createGain();
  sfxBus = ctx.createGain();
  ambBus = ctx.createGain();
  sfxBus.connect(master);
  ambBus.connect(master);
  master.connect(comp).connect(ctx.destination);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  applyLevels();
  if (pendingAmbience !== undefined) setAmbience(pendingAmbience);
}

// Background the app → silence. Nothing should keep chirping in a pocket.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.visibilityState === 'hidden') ctx.suspend();
    else ctx.resume();
  });
}

// ── Building blocks ──────────────────────────────────────────────────────────

let voices = 0;
const MAX_VOICES = 12;

// When the sounds start. Live, that is now; the offline render moves it along
// so a whole reel can be laid out on one timeline.
let timeBase = null;
const clock = () => (timeBase ?? ctx.currentTime);

/** One enveloped oscillator, pitch-bent from f0 to f1. */
function tone({ type = 'sine', f0, f1 = f0, dur = 0.1, at = 0, gain = 0.2, attack = 0.005,
                lp = null, q = 0.7, bus = sfxBus }) {
  const t = clock() + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, f0), t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc;
  if (lp) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = q;
    node = osc.connect(f);
  }
  node.connect(g).connect(bus);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  voices++;
  osc.onended = () => { voices--; };
}

/** A burst of filtered noise with a swept cutoff: squelches, whooshes, thuds. */
function noise({ dur = 0.1, at = 0, gain = 0.15, type = 'bandpass', f0 = 1000, f1 = f0, q = 1,
                 attack = 0.004, bus = sfxBus }) {
  const t = clock() + at;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(bus);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
  voices++;
  src.onended = () => { voices--; };
}

// ── The sounds ───────────────────────────────────────────────────────────────
//
// Each takes `p`, a pitch multiplier around 1 so repeated sounds vary.

const SOUNDS = {
  // Interface
  tap:      (p) => tone({ f0: 620 * p, f1: 420 * p, dur: 0.045, gain: 0.05 }),
  error:    (p) => tone({ type: 'triangle', f0: 170 * p, f1: 120 * p, dur: 0.14, gain: 0.12, lp: 600 }),
  glub:     (p) => { // Glub talking: three little formant blorps
    [0, 0.09, 0.2].forEach((at, i) => {
      const f = (260 + Math.random() * 180) * p;
      tone({ f0: f, f1: f * (i === 2 ? 0.7 : 1.25), dur: 0.08, at, gain: 0.12, lp: 900, q: 4 });
    });
  },

  // Slimes
  bud:      (p) => {
    tone({ f0: 160 * p, f1: 560 * p, dur: 0.13, gain: 0.2, lp: 1400, q: 3 });
    tone({ f0: 560 * p, f1: 300 * p, dur: 0.12, at: 0.12, gain: 0.14, lp: 1200, q: 3 });
    noise({ type: 'bandpass', f0: 500, f1: 1400, dur: 0.12, gain: 0.05, q: 2 });
  },
  squish:   (p) => {
    noise({ type: 'bandpass', f0: 900 * p, f1: 250 * p, dur: 0.14, gain: 0.14, q: 3 });
    tone({ f0: 240 * p, f1: 130 * p, dur: 0.12, gain: 0.12, lp: 700 });
  },
  slurp:    (p) => {
    noise({ type: 'bandpass', f0: 300 * p, f1: 1600 * p, dur: 0.35, gain: 0.12, q: 4 });
    tone({ f0: 500 * p, f1: 120 * p, dur: 0.4, gain: 0.14, lp: 900, q: 5 });
  },
  mutate:   (p) => {
    [262, 330, 392, 523].forEach((f, i) =>
      tone({ f0: f * p * 0.8, f1: f * p, dur: 0.12, at: i * 0.07, gain: 0.13, lp: 1800, q: 4 }));
    noise({ type: 'bandpass', f0: 400, f1: 1200, dur: 0.35, gain: 0.04, q: 6 });
  },
  depart:   (p) => [0, 0.07, 0.14].forEach((at, i) =>
    tone({ f0: (220 + i * 90) * p, f1: (330 + i * 110) * p, dur: 0.09, at, gain: 0.11, lp: 1500 })),
  recall:   (p) => [0, 0.07, 0.14].forEach((at, i) =>
    tone({ f0: (440 - i * 90) * p, f1: (330 - i * 70) * p, dur: 0.09, at, gain: 0.11, lp: 1500 })),

  // Combat
  // Ordinary hits are the most common sound in the game, so they are the
  // quietest and softest: a low muffled thump with no click on top. The first
  // version had a bright noise transient that, four slimes deep, turned into
  // constant tapping.
  hit:      (p) => tone({ f0: 150 * p, f1: 75 * p, dur: 0.08, gain: 0.09, lp: 420, q: 1 }),
  hurt:     (p) => {
    noise({ type: 'lowpass', f0: 500 * p, f1: 160 * p, dur: 0.1, gain: 0.08 });
    tone({ f0: 120 * p, f1: 58 * p, dur: 0.12, gain: 0.12, lp: 420, q: 4 });
  },
  crit:     (p) => {
    noise({ type: 'bandpass', f0: 2000 * p, f1: 500 * p, dur: 0.08, gain: 0.2, q: 1.2 });
    tone({ f0: 190 * p, f1: 70 * p, dur: 0.1, gain: 0.2 });
    tone({ type: 'triangle', f0: 1000 * p, f1: 1500 * p, dur: 0.09, at: 0.02, gain: 0.08 });
  },
  dodge:    (p) => noise({ type: 'bandpass', f0: 1500 * p, f1: 4200 * p, dur: 0.14, gain: 0.13, q: 0.9, attack: 0.04 }),
  stun:     (p) => [0, 0.07, 0.14].forEach(at =>
    tone({ type: 'triangle', f0: 760 * p, f1: 520 * p, dur: 0.07, at, gain: 0.07 })),
  eat:      (p) => { // the kill: a wet gulp
    tone({ f0: 320 * p, f1: 120 * p, dur: 0.09, gain: 0.2, lp: 900, q: 6 });
    tone({ f0: 270 * p, f1: 85 * p, dur: 0.12, at: 0.08, gain: 0.18, lp: 800, q: 6 });
    noise({ type: 'lowpass', f0: 600, f1: 150, dur: 0.15, at: 0.05, gain: 0.06 });
  },
  fall:     (p) => { // a slime going down: a slow sad deflate
    tone({ f0: 420 * p, f1: 70 * p, dur: 0.6, gain: 0.18, lp: 700, q: 8 });
    noise({ type: 'lowpass', f0: 500, f1: 80, dur: 0.5, gain: 0.05 });
  },
  revive:   (p) => {
    tone({ f0: 200 * p, f1: 700 * p, dur: 0.35, gain: 0.14, lp: 2000, q: 3 });
    tone({ type: 'triangle', f0: 1400 * p, f1: 2100 * p, dur: 0.25, at: 0.2, gain: 0.05 });
  },

  // Rewards and moments
  drop:     (p) => tone({ type: 'triangle', f0: 1400 * p, f1: 1800 * p, dur: 0.05, gain: 0.05 }),
  rare:     (p) => [1047, 1319, 1568, 2093].forEach((f, i) =>
    tone({ type: 'triangle', f0: f * p, dur: 0.2, at: i * 0.055, gain: 0.11 })),
  levelUp:  () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, at: i * 0.08, gain: 0.1 }));
    [523, 659, 784].forEach(f => tone({ type: 'triangle', f0: f, dur: 0.6, at: 0.34, gain: 0.05, attack: 0.02 }));
  },
  learn:    () => {
    tone({ type: 'sine', f0: 660, dur: 0.18, gain: 0.12 });
    tone({ type: 'sine', f0: 990, dur: 0.3, at: 0.1, gain: 0.1 });
  },
  build:    (p) => {
    tone({ f0: 95 * p, f1: 48 * p, dur: 0.22, gain: 0.25 });
    noise({ type: 'lowpass', f0: 400, f1: 120, dur: 0.18, gain: 0.12 });
  },
  swap:     (p) => {
    noise({ type: 'bandpass', f0: 700, f1: 300, dur: 0.1, gain: 0.08, q: 3 });
    tone({ type: 'triangle', f0: 1200 * p, f1: 1700 * p, dur: 0.07, at: 0.08, gain: 0.08 });
  },
  merchant: () => { // a little snail bell, twice
    [0, 0.28].forEach(at => {
      tone({ f0: 1318, dur: 0.7, at, gain: 0.09, attack: 0.002 });
      tone({ f0: 1318 * 2.76, dur: 0.3, at, gain: 0.03, attack: 0.002 });
    });
  },
  warden:   () => { // it answers: a low swell and a thump
    tone({ type: 'sawtooth', f0: 55, dur: 1.4, gain: 0.12, attack: 0.5, lp: 380, q: 4 });
    tone({ type: 'sawtooth', f0: 58.3, dur: 1.4, gain: 0.1, attack: 0.5, lp: 380, q: 4 });
    tone({ f0: 90, f1: 40, dur: 0.4, at: 1.1, gain: 0.3 });
  },
  // A ta-da for routing a whole caravan: a quick run up, a held chord, and a
  // thump under it.
  fanfare:  () => {
    const run = [523, 659, 784, 1047, 784, 1047];
    const at = [0, 0.1, 0.2, 0.3, 0.48, 0.58];
    run.forEach((f, i) => tone({ type: 'triangle', f0: f, dur: i === run.length - 1 ? 0.25 : 0.12, at: at[i], gain: 0.13 }));
    [523, 659, 784, 1047].forEach(f => tone({ type: 'triangle', f0: f, dur: 1.3, at: 0.72, gain: 0.06, attack: 0.02 }));
    [0, 0.3, 0.72].forEach(t => tone({ f0: 110, f1: 55, dur: 0.18, at: t, gain: 0.22 }));
    tone({ type: 'sine', f0: 2093, dur: 0.6, at: 0.72, gain: 0.03 });
  },
  // Smaller: a good haul, but they got away.
  victory:  () => {
    [659, 784, 1047].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.14, at: i * 0.1, gain: 0.11 }));
    [659, 1047].forEach(f => tone({ type: 'triangle', f0: f, dur: 0.6, at: 0.32, gain: 0.05, attack: 0.02 }));
  },
  wardenDown: () => {
    [392, 523, 659, 784].forEach((f, i) => tone({ type: 'triangle', f0: f, dur: 0.18, at: i * 0.12, gain: 0.12 }));
    [523, 659, 784, 1047].forEach(f => tone({ type: 'triangle', f0: f, dur: 1.0, at: 0.5, gain: 0.05, attack: 0.03 }));
  },
};

// Minimum gap (ms) before the same sound can play again.
const MIN_GAP = { tap: 40, hit: 260, hurt: 260, crit: 80, dodge: 120, eat: 120, stun: 150, drop: 90 };
// Which sounds are varied in pitch: the repeated ones.
const VARIED = new Set(['hit', 'hurt', 'crit', 'dodge', 'eat', 'squish', 'bud', 'drop', 'fall', 'stun']);
const lastPlayed = {};

/** Play a sound by name. Silent until the first tap, when muted, or when busy. */
export function sfx(name) {
  if (!ctx || prefs.muted || ctx.state !== 'running') return;
  const play = SOUNDS[name];
  if (!play) return;
  const now = performance.now();
  if (now - (lastPlayed[name] || 0) < (MIN_GAP[name] || 0)) return;
  if (voices >= MAX_VOICES && !['wardenDown', 'levelUp', 'warden', 'rare', 'fanfare', 'victory'].includes(name)) return;
  lastPlayed[name] = now;
  const p = VARIED.has(name) ? 1 + (Math.random() - 0.5) * 0.12 : 1;
  try { play(p); } catch { /* audio is never worth a crash */ }
}

export const SOUND_NAMES = Object.keys(SOUNDS);

// ── Ambience ─────────────────────────────────────────────────────────────────
//
// A quiet bed per zone while you watch a party there: wind in the forest,
// bubbles in the swamp, drips in the caves, crackle in the Cinderspire, gusts
// on the peaks, and a wrong-feeling hum in the Void.

let pendingAmbience;     // requested before audio was unlocked
let ambience = null;     // { zone, stop }

const AMBIENCE = {
  forest: () => bed({ type: 'bandpass', freq: 1100, q: 0.6, gain: 0.05, lfo: 0.12 },
    () => [0, 0.12, 0.22].slice(0, 2 + Math.floor(Math.random() * 2)).forEach(at =>
      tone({ f0: 2600 + Math.random() * 900, f1: 3300, dur: 0.07, at, gain: 0.025, bus: ambBus })),
    [3000, 8000]),
  swamp: () => bed({ type: 'lowpass', freq: 380, q: 0.5, gain: 0.07, lfo: 0.08 },
    () => tone({ f0: 140 + Math.random() * 120, f1: 420 + Math.random() * 200, dur: 0.07, gain: 0.04, lp: 900, q: 6, bus: ambBus }),
    [500, 2200]),
  caves: () => bed({ type: 'lowpass', freq: 220, q: 0.5, gain: 0.07, lfo: 0.05 },
    () => {
      const f = 1500 + Math.random() * 900;
      tone({ f0: f, f1: f * 0.55, dur: 0.06, gain: 0.04, bus: ambBus });
      tone({ f0: f, f1: f * 0.55, dur: 0.06, at: 0.23, gain: 0.012, bus: ambBus }); // echo
    },
    [1400, 4200]),
  ruins: () => bed({ type: 'lowpass', freq: 160, q: 0.7, gain: 0.1, lfo: 0.1 },
    () => noise({ type: 'highpass', f0: 3000, dur: 0.02, gain: 0.03, bus: ambBus }),
    [80, 600]),
  peaks: () => bed({ type: 'bandpass', freq: 700, q: 1.2, gain: 0.07, lfo: 0.07, sweep: 500 }, null),
  volcano: () => {
    const a = droneVoice(110, 0.02);
    const b = droneVoice(113.4, 0.02);
    const c = bed({ type: 'lowpass', freq: 120, q: 0.5, gain: 0.04, lfo: 0.03 }, null);
    return () => { a(); b(); c(); };
  },
};

/** A looping noise bed, optionally with a slow wobble and occasional events. */
function bed({ type, freq, q, gain, lfo = 0.1, sweep = 0 }, event, gapRange = [2000, 5000]) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(gain, ctx.currentTime, 1.2);

  // Wobble the level (and optionally the filter) so the bed breathes.
  const osc = ctx.createOscillator();
  osc.frequency.value = lfo;
  const depth = ctx.createGain();
  depth.gain.value = gain * 0.5;
  osc.connect(depth).connect(g.gain);
  let sweepGain = null;
  if (sweep) {
    sweepGain = ctx.createGain();
    sweepGain.gain.value = sweep;
    osc.connect(sweepGain).connect(f.frequency);
  }
  src.connect(f).connect(g).connect(ambBus);
  src.start(); osc.start();

  let timer = null;
  const schedule = () => {
    if (!event) return;
    timer = setTimeout(() => {
      if (ctx.state === 'running' && !prefs.muted) { try { event(); } catch { /* ignore */ } }
      schedule();
    }, gapRange[0] + Math.random() * (gapRange[1] - gapRange[0]));
  };
  schedule();

  return () => {
    clearTimeout(timer);
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => { try { src.stop(); osc.stop(); } catch { /* already stopped */ } }, 1500);
  };
}

function droneVoice(freq, gain) {
  const osc = ctx.createOscillator();
  osc.type = 'sine'; osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(gain, ctx.currentTime, 2);
  osc.connect(g).connect(ambBus);
  osc.start();
  return () => {
    g.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    setTimeout(() => { try { osc.stop(); } catch { /* already stopped */ } }, 1500);
  };
}

/** Play `zone`'s ambience, or silence with null. Crossfades between zones. */
export function setAmbience(zone) {
  if (!ctx) { pendingAmbience = zone; return; }
  pendingAmbience = undefined;
  if (ambience?.zone === zone) return;
  ambience?.stop();
  ambience = null;
  const make = zone && AMBIENCE[zone];
  if (make) ambience = { zone, stop: make() };
}

// ── Offline render ───────────────────────────────────────────────────────────
//
// Renders sounds into an AudioBuffer instead of the speakers, one after
// another with `gap` seconds between. Used to audition the whole set and to
// check levels without a device.
export async function renderReel(names = SOUND_NAMES, gap = 1.1) {
  const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const rate = 44100;
  const off = new OAC(1, Math.ceil(rate * (names.length * gap + 1.5)), rate);
  const saved = { ctx, master, sfxBus, ambBus, noiseBuf };
  ctx = off;
  master = off.createGain(); master.gain.value = 0.8;
  sfxBus = off.createGain(); sfxBus.gain.value = 1.6; ambBus = off.createGain();
  const comp = off.createDynamicsCompressor();
  comp.threshold.value = -18; comp.ratio.value = 4;
  sfxBus.connect(master); ambBus.connect(master); master.connect(comp).connect(off.destination);
  noiseBuf = off.createBuffer(1, rate, rate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  names.forEach((n, i) => { timeBase = 0.3 + i * gap; SOUNDS[n]?.(1); });
  timeBase = null;

  const buf = await off.startRendering();
  ({ ctx, master, sfxBus, ambBus, noiseBuf } = saved);
  return buf;
}
