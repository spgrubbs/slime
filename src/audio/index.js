import { sfx } from './sound.js';
import { buzz } from './haptics.js';

export { sfx, unlockAudio, setAmbience, getPrefs, setPrefs, SOUND_NAMES } from './sound.js';
export { buzz } from './haptics.js';

// The moments that get a vibration as well as a sound.
const FEEL = { crit: 'light', fall: 'medium', wardenDown: 'heavy', warden: 'medium', rare: 'light', mutate: 'medium', levelUp: 'medium' };

/** A sound, plus a buzz if the moment warrants one. */
export function cue(name) {
  sfx(name);
  if (FEEL[name]) buzz(FEEL[name]);
}

// Playtest hook: render the whole sound set to a buffer (see renderReel).
if (typeof window !== 'undefined') {
  import('./sound.js').then(m => { window.slimeAudio = { renderReel: m.renderReel, names: m.SOUND_NAMES }; });
}
