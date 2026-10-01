// ─────────────────────────────────────────────────────────────────────────────
// Offline catch-up
//
// Everything that happened while the game was closed, computed in one go when
// it reopens: expeditions run round by round through the real resolver, and
// research advances. Pure: it takes a save and returns the new state and a
// summary, and never touches the UI.
//
// Called with a seeded rng (from the save's timestamp) both for the real
// catch-up and for the forecast that schedules notifications when the app is
// backgrounded, so the two agree on what happens and when.
// ─────────────────────────────────────────────────────────────────────────────

import { ZONES } from '../data/zoneData.js';
import { RESEARCH } from '../data/buildingData.js';
import { ROUND_MS } from '../data/gameConstants.js';
import { formatTime } from '../utils/helpers.js';
import { tickExpedition, hydrateExpedition } from './expedition.js';

// `now` is when the catch-up runs to. The forecast behind notifications calls
// this with a future `now` and the same seed the real catch-up will use, so
// "your party fell around 3am" and what you find when you open the app agree.
export const calculateOfflineProgress = (saved, bonuses, offlineCtx = {}, now = Date.now()) => {
  const offlineMs = now - (saved.lastSave || now);
  const offlineSec = Math.min(offlineMs / 1000, 24 * 3600); // Cap at 24h

  if (offlineSec < 60) return { hadProgress: false };

  const results = {
    biomassGained: 0,
    matsGained: {},
    monsterKillsGained: {},
    slimesLost: [],
    monstersKilled: 0,
    expeditionsWiped: [],
    wardensFelled: [],
    events: [],            // [{ zone, type: 'wipe' | 'complete', at }] with timestamps
    mutagensFound: {},
    secretsFound: [],
    prismsFound: 0,
    salvaged: {},
    completed: [],
    researchCompleted: null,
  };

  let { bio, slimes, exps, mats, activeRes, research, builds } = JSON.parse(JSON.stringify(saved));

  // Offline expeditions run the real resolver rather than a simplified copy of
  // it — mutations, traits and status effects all apply exactly as they do
  // while you are watching.
  //
  // The ceiling is a safety net, not the real limit: elapsed time is already
  // capped at 24h above, and 24h is 54,000 rounds. The old 1,500 was set
  // without measuring and quietly truncated an overnight session to 40 minutes
  // of progress. Measured, a full 24h of forest costs ~430ms to simulate.
  const MAX_OFFLINE_ROUNDS = 60000;

  Object.entries(exps || {}).forEach(([zone, savedExp]) => {
    if (!ZONES[zone]) return;

    // Pre-rewrite expeditions have no combatants to advance; recall them.
    if (!Array.isArray(savedExp.slimes) || savedExp.version !== 4) {
      results.expeditionsWiped.push(zone);
      delete exps[zone];
      return;
    }

    const exp = hydrateExpedition(savedExp, slimes);
    // Swift Expedition runs offline too, for whatever part of the absence it
    // was still active.
    const swiftUntil = saved.activeHiveAbilities?.swiftExpedition || 0;
    const swiftMs = Math.max(0, Math.min(offlineSec * 1000, swiftUntil - (saved.lastSave || now)));
    const budgetMs = Math.min(offlineSec * 1000 + 0.5 * swiftMs, MAX_OFFLINE_ROUNDS * ROUND_MS);
    const step = ROUND_MS;

    const killsBefore = exp.kills;
    const countsBefore = { ...(exp.monsterKillCounts || {}) };

    const startAt = saved.lastSave || now;
    let elapsed = 0;
    for (; elapsed < budgetMs; elapsed += step) {
      if (exp.phase === 'defeat') break;

      const { sideEffects } = tickExpedition(exp, step, offlineCtx, zone);

      sideEffects.forEach(se => {
        if (se.type === 'slimeDown') {
          const hurt = slimes.find(sl => sl.id === se.id);
          results.slimesLost.push(hurt?.name || 'Slime');
          slimes = slimes.map(sl => (
            sl.id === se.id ? { ...sl, wounded: true, woundedAt: Date.now(), biomass: 0 } : sl
          ));
        } else if (se.type === 'bioReclaim') {
          bio += se.amount;
          results.biomassGained += se.amount;
        } else if (se.type === 'grantTrait') {
          slimes = slimes.map(sl => sl.id === se.id && !(sl.traits || []).includes(se.trait)
            ? { ...sl, traits: [...(sl.traits || []), se.trait] }
            : sl);
        } else if (se.type === 'wardenDown') {
          results.wardensFelled.push({ zone: se.zone, plus: se.plus });
        } else if (se.type === 'secretDown') {
          results.secretsFound.push(se.id);
        } else if (se.type === 'mutagen') {
          results.mutagensFound[se.mutation] = (results.mutagensFound[se.mutation] || 0) + 1;
        } else if (se.type === 'prism') {
          results.prismsFound += 1;
        } else if (se.type === 'expWipe') {
          Object.entries(se.salvage || {}).forEach(([mat, n]) => {
            results.salvaged[mat] = (results.salvaged[mat] || 0) + n;
            mats[mat] = (mats[mat] || 0) + n;
          });
          if (se.decoy) results.decoyUsed = true;
        }
      });

      if (exp.phase === 'defeat') break;
      if (exp.targetKills != null && exp.kills >= exp.targetKills) {
        results.completed.push(zone);
        results.events.push({ zone, type: 'complete', at: startAt + elapsed });
        break;
      }
    }
    if (exp.phase === 'defeat' || exp.slimes.every(c => c.dead)) {
      results.events.push({ zone, type: 'wipe', at: startAt + elapsed });
    }

    results.monstersKilled += exp.kills - killsBefore;
    Object.entries(exp.monsterKillCounts || {}).forEach(([type, n]) => {
      const gained = n - (countsBefore[type] || 0);
      if (gained > 0) results.monsterKillsGained[type] = (results.monsterKillsGained[type] || 0) + gained;
    });

    if (exp.phase === 'defeat' || exp.slimes.every(c => c.dead)) {
      results.expeditionsWiped.push(zone);
      delete exps[zone];
      return;
    }

    // Bank what the party earned so the welcome-back summary can report it.
    exp.slimes.filter(c => !c.dead).forEach(c => {
      const sl = slimes.find(x => x.id === c.id);
      if (!sl) return;
      results.biomassGained += c.biomassGained;
      sl.biomass = (sl.biomass || 0) + c.biomassGained;
      c.biomassGained = 0;

      if (!sl.primaryElement && c.elementGains) {
        sl.elements = sl.elements || { fire: 0, water: 0, nature: 0, earth: 0 };
        Object.entries(c.elementGains).forEach(([el, gain]) => {
          sl.elements[el] = Math.min(100, (sl.elements[el] || 0) + gain);
          if (sl.elements[el] >= 100) sl.primaryElement = el;
        });
        c.elementGains = {};
      }
    });

    Object.entries(exp.materials || {}).forEach(([mat, n]) => {
      results.matsGained[mat] = (results.matsGained[mat] || 0) + n;
      mats[mat] = (mats[mat] || 0) + n;
    });
    exp.materials = {};

    // Kill counts are NOT banked here. They stay on the expedition and are
    // counted, pity floor and all, when the party comes home, exactly as if
    // the game had been open the whole time.

    exps[zone] = exp;
  });

  // Research progress
  if (activeRes) {
    const rd = RESEARCH[activeRes.id];
    if (rd) {
      const prog = activeRes.prog + (100 / rd.time) * (bonuses?.res || 1) * offlineSec;
      if (prog >= 100) {
        research = [...research, activeRes.id];
        results.researchCompleted = rd.name;
        activeRes = null;
      } else {
        activeRes = { ...activeRes, prog };
      }
    }
  }

  return {
    hadProgress: true,
    offlineTime: formatTime(offlineSec),
    results,
    newState: { bio, slimes, exps, mats, activeRes, research, lastSave: now }
  };
};

