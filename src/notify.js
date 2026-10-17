// ─────────────────────────────────────────────────────────────────────────────
// Notifications
//
// When the app goes to the background, the game works out what will happen
// while it is away and schedules a notification for each thing worth coming
// back for. Everything here is either on a fixed clock (Mossback, pools,
// mending) or read from a forecast that runs the same seeded simulation the
// real catch-up will run on return, so the phone does not cry wolf.
//
// Rescheduled from scratch every time the app is backgrounded, and cleared
// when it comes back: nothing fires for something you already saw.
// ─────────────────────────────────────────────────────────────────────────────

import { LocalNotifications } from '@capacitor/local-notifications';

const PREFS_KEY = 'slime_queen_prefs';
const enabled = () => {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}').notifications !== false; } catch { return true; }
};

// Fixed ids per kind so a reschedule replaces rather than duplicates.
export const NOTE_IDS = { merchant: 1, poolFull: 2, mended: 3, expedition: 10 };

let permission = null;
let asked = false;

/** Ask once, at a moment the player will understand (their first expedition). */
export async function askPermission() {
  if (asked) return permission;
  asked = true;
  try {
    const cur = await LocalNotifications.checkPermissions();
    if (cur.display === 'granted') { permission = true; return true; }
    if (cur.display === 'denied') { permission = false; return false; }
    const res = await LocalNotifications.requestPermissions();
    permission = res.display === 'granted';
    return permission;
  } catch {
    permission = false;
    return false;
  }
}

async function canNotify() {
  if (!enabled()) return false;
  if (permission !== null) return permission;
  try {
    permission = (await LocalNotifications.checkPermissions()).display === 'granted';
  } catch { permission = false; }
  return permission;
}

export async function clearNotes() {
  try {
    const { notifications } = await LocalNotifications.getPending();
    if (notifications.length) await LocalNotifications.cancel({ notifications: notifications.map(n => ({ id: n.id })) });
  } catch { /* no plugin on this platform */ }
}

/**
 * Replace every pending notification with `notes`: [{ id, at, title, body }].
 * Anything in the past, or under a minute away, is dropped.
 */
export async function scheduleNotes(notes) {
  if (!(await canNotify())) return;
  await clearNotes();
  const soon = Date.now() + 60 * 1000;
  const list = notes.filter(n => n.at > soon).map(n => ({
    id: n.id, title: n.title, body: n.body,
    schedule: { at: new Date(n.at), allowWhileIdle: true },
    smallIcon: 'ic_stat_slime', iconColor: '#4ade80',
  }));
  if (!list.length) return;
  try { await LocalNotifications.schedule({ notifications: list }); } catch { /* ignore */ }
}
