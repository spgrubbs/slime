// Headless balance harness (GDD §16.7).
//
//   node tools/sim.js [careers=20] [runsPerCareer=60]
//
// A "career" is a fresh profile playing run after run with a simple bot,
// spending Genes between runs. It reports how many runs it takes to first
// beat each act and to win — the shape of the meta-progression curve.

import { newRun, enterNode, finishBattle, absorb, digest, chooseBoon, takeTreasure, usePool, shopBuy, leaveShop,
  chooseEvent, leaveEvent, nextAct, needsReplace, maxMass, levelOfOwned, eventChoiceAllowed } from '../src/engine/run.js';
import { reachable } from '../src/engine/map.js';
import { newProfile, applyRunEnd, metaForRun, nextCost, buyUpgrade, heirloomChoices } from '../src/engine/meta.js';
import { UPGRADES } from '../src/engine/content/upgrades.js';
import { ESSENCES, isSlotted } from '../src/engine/content/essences.js';
import { EVENTS } from '../src/engine/content/events.js';

const careers = Number(process.argv[2] || 20);
const VERBOSE = process.argv.includes('-v');
const runsPer = Number(process.argv[3] || 60);

function botStep(run) {
  const hpPct = run.slime.hp / maxMass(run);
  switch (run.phase) {
    case 'map': {
      const opts = reachable(run.map, run.current);
      const score = (id) => {
        const t = run.map.nodes[id].type;
        if (hpPct < 0.45) return { pool: 5, shop: 3, treasure: 3, event: 2, mystery: 2, fight: 1, elite: 0, boss: 1 }[t];
        return { elite: hpPct > 0.8 ? 5 : 1, fight: 4, mystery: 3, event: 3, treasure: 3, shop: 2, pool: 1, boss: 1 }[t];
      };
      return enterNode(run, [...opts].sort((a, b) => score(b) - score(a))[0]);
    }
    case 'battle': return finishBattle(run);
    case 'absorb': {
      const o = run.pending.options;
      const owned = (id) => run.slime.slotted.find(e => e.id === id);
      const rank = (x) => owned(x.id) && levelOfOwned(run, owned(x.id)) < 2 ? 3 : isSlotted(x.id) && !needsReplace(run, x.id) ? 2 : !isSlotted(x.id) ? 1 : 0;
      const best = o.map((x, i) => [rank(x), i]).sort((a, b) => b[0] - a[0])[0];
      if (!best || best[0] === 0) return digest(run, hpPct < 0.5 ? 'heal' : 'gel');
      return absorb(run, best[1]);
    }
    case 'fusion': return chooseBoon(run, 0);
    case 'treasure': return takeTreasure(run);
    case 'pool': {
      if (hpPct < 0.7 || !run.slime.slotted.length) return usePool(run, 'soak');
      const i = run.slime.slotted.findIndex(e => levelOfOwned(run, e) < 2);
      return i >= 0 ? usePool(run, 'ferment', i) : usePool(run, 'soak');
    }
    case 'shop': {
      const s = run.pending;
      if (hpPct < 0.5 && !s.services.heal.used && run.gel >= s.services.heal.price) return shopBuy(run, 'heal');
      const i = s.essences.findIndex(e => !e.sold && e.price <= run.gel && !needsReplace(run, e.id));
      if (i >= 0) return shopBuy(run, 'essence', i);
      const j = s.relics.findIndex(e => !e.sold && e.price <= run.gel);
      if (j >= 0) return shopBuy(run, 'relic', j);
      return leaveShop(run);
    }
    case 'event': {
      if (run.pending.result) return leaveEvent(run);
      const ev = EVENTS[run.pending.eventId];
      const i = ev.choices.findIndex(c => eventChoiceAllowed(run, c));
      return chooseEvent(run, i);
    }
    case 'actComplete': return nextAct(run);
    default: throw new Error(`bot stuck in ${run.phase}`);
  }
}

function playRun(profile, seed) {
  let run = newRun({ seed, species: 'gloop', salt: 0, meta: metaForRun(profile) });
  let guard = 0;
  while (run.phase !== 'victory' && run.phase !== 'defeat') {
    run = botStep(run);
    if (++guard > 2000) throw new Error('run did not terminate');
  }
  return run;
}

function spend(profile) {
  // Cheapest-first, skipping species unlocks.
  for (;;) {
    const opts = Object.keys(UPGRADES).filter(id => !UPGRADES[id].species)
      .map(id => [id, nextCost(profile, id)]).filter(([, c]) => c !== null && c <= profile.genes)
      .sort((a, b) => a[1] - b[1]);
    if (!opts.length) return profile;
    profile = buyUpgrade(profile, opts[0][0]);
  }
}

const firstAct = [[], [], [], []];
const firstWin = [];
const deaths = {};
for (let c = 0; c < careers; c++) {
  let profile = newProfile();
  const reached = [null, null, null, null];
  let won = null;
  for (let n = 1; n <= runsPer; n++) {
    const run = playRun(profile, `C${c}R${n}`);
    for (let a = 0; a < 4; a++) if (reached[a] === null && (run.act > a || run.stats.won)) reached[a] = n;
    if (run.stats.won && won === null) won = n;
    if (!run.stats.won) { const k = `act${run.act + 1}`; deaths[k] = (deaths[k] || 0) + 1; }
    let genes;
    ({ profile, genes } = applyRunEnd(profile, run, heirloomChoices(run)[0] || null));
    if (VERBOSE && c === 0) console.log(`run ${n}: act ${run.act + 1} floor ${run.stats.floors} kills ${run.stats.kills} genes +${genes} | killed by ${run.battle?.enemyId} | base ${JSON.stringify(run.slime.base)} slots ${run.slime.slotted.map(e=>e.id+':'+e.copies).join(',')}`);
    profile = spend(profile);
  }
  reached.forEach((v, a) => firstAct[a].push(v));
  firstWin.push(won);
}

const med = (xs) => { const v = xs.filter(x => x !== null).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)] : '—'; };
const share = (xs) => `${xs.filter(x => x !== null).length}/${xs.length}`;
console.log(`careers=${careers} runs/career=${runsPer}`);
['Act 1 boss', 'Act 2 boss', 'Act 3 boss', 'Hollow One'].forEach((label, a) =>
  console.log(`${label.padEnd(11)} first beaten at run (median) ${String(med(firstAct[a])).padStart(4)}   careers: ${share(firstAct[a])}`));
console.log('deaths by act:', deaths);
