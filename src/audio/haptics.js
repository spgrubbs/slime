// ─────────────────────────────────────────────────────────────────────────────
// Haptics
//
// Reserved for the big moments: a crit, a slime going down, a Warden falling,
// a rare drop. Buzzing on every hit would make the phone feel like a pager.
// On the web the plugin falls back to navigator.vibrate where that exists.
// ─────────────────────────────────────────────────────────────────────────────

import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { getPrefs } from './sound.js';

const STYLE = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
let last = 0;

export function buzz(level = 'light') {
  if (!getPrefs().haptics) return;
  const now = performance.now();
  if (now - last < 120) return;
  last = now;
  Haptics.impact({ style: STYLE[level] || ImpactStyle.Light }).catch(() => {});
}
