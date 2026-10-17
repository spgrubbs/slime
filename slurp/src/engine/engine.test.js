import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveBattle, fmt, MAX_TRIGGER_DEPTH } from './battle.js';
import { buildPlayer, buildEnemy, levelFor } from './combatant.js';
import { generateMap, ROWS, reachable } from './map.js';
import { newRun, enterNode, finishBattle, absorb, gainEssence, needsReplace, slotCount, serializeRun } from './run.js';
import { ESSENCES } from './content/essences.js';
import { ENEMIES, ACTS } from './content/enemies.js';
import { RELICS } from './content/relics.js';
import { EVENTS } from './content/events.js';
import { newProfile, buyUpgrade, applyRunEnd } from './meta.js';

const runWith = (slotted = [{ id: 'bounce', copies: 1 }], extra = {}) => ({
  gel: 0, relics: [], meta: { upgrades: {} },
  slime: { species: 'gloop', base: { mass: 80, firm: 6, slip: 5, visc: 5 }, hp: 80, slotted, stats: [], maxMassBonus: 0 },
  ...extra,
});

// ── Content integrity ────────────────────────────────────────────────────────

test('every enemy kit and pool references real essences', () => {
  for (const [id, e] of Object.entries(ENEMIES)) {
    for (const [eid] of e.kit) assert.ok(ESSENCES[eid], `${id} kit: ${eid}`);
    const p = e.pool;
    for (const eid of [p.signature, ...(p.shared || []), p.stat, p.element, p.rare, ...(p.boss || [])].filter(Boolean)) {
      assert.ok(ESSENCES[eid], `${id} pool: ${eid}`);
    }
  }
  for (const act of ACTS) for (const id of [...act.normals, ...act.elites, act.boss]) assert.ok(ENEMIES[id], id);
});

test('every slotted essence has a description at every level', () => {
  for (const [id, d] of Object.entries(ESSENCES)) {
    if (d.type === 'stat' || d.type === 'element') continue;
    for (let L = 0; L <= 3; L++) assert.equal(typeof d.desc(L), 'string', `${id} L${L}`);
    if (d.type === 'action') assert.ok(d.cd > 0 && d.hooks?.action, `${id} needs cd + action`);
  }
  for (const [id, r] of Object.entries(RELICS)) assert.ok(r.desc && r.rarity, id);
  for (const [id, e] of Object.entries(EVENTS)) assert.ok(e.choices.length >= 2, id);
});

// ── Battle ───────────────────────────────────────────────────────────────────

test('battles are fully deterministic — no dice in combat', () => {
  const a = resolveBattle(buildPlayer(runWith(), 'vineSpider'), buildEnemy('vineSpider'));
  const b = resolveBattle(buildPlayer(runWith(), 'vineSpider'), buildEnemy('vineSpider'));
  assert.deepEqual(a.records.map(r => r.text), b.records.map(r => r.text));
  assert.equal(a.winner, b.winner);
});

test('crit is a meter: 25% crit means exactly every 4th hit crits', () => {
  const p = buildPlayer(runWith([]), 'pebblet');
  p.critChance = 0.25;
  const e = buildEnemy('pebblet');
  e.maxHp = e.hp = 1e9;
  e.hooks = [];
  const res = resolveBattle(p, e);
  const hits = res.records.filter(r => r.kind === 'hit' && r.actor === 'player');
  const crits = hits.map((h, i) => (h.crit ? i : null)).filter(i => i !== null);
  assert.ok(crits.length > 3);
  assert.deepEqual(crits.slice(0, 3), [3, 7, 11]);
});

test('every battle ends: Salt Rain breaks stalemates', () => {
  const p = buildPlayer(runWith([]), 'pebblet');
  const e = buildEnemy('pebblet');
  // Min damage is 1, so give both sides enormous Mass: only Salt Rain can end this.
  p.firm = 0; e.firm = 0; e.hooks = [];
  p.maxHp = p.hp = 1e6; e.maxHp = e.hp = 1e6;
  const res = resolveBattle(p, e);
  assert.ok(res.winner);
  assert.ok(res.rounds < 60, `took ${res.rounds} rounds`);
  assert.ok(res.records.some(r => /Salt Rain/.test(r.text)));
});

test('runaway trigger chains are truncated, and the battle still plays out', () => {
  // 100%+ crit with Chain Crit would recurse forever without the depth cap.
  const p = buildPlayer(runWith([{ id: 'chainCrit', copies: 1 }]), 'pebblet');
  p.critChance = 2;
  const e = buildEnemy('pebblet');
  e.hooks = []; e.slip = 0; // a dodge would (correctly) break the chain early
  e.maxHp = e.hp = 1e12;
  const res = resolveBattle(p, e);
  assert.ok(res.records.some(r => /Chain limit/.test(r.text)));
  assert.ok(res.winner, 'battle reached a normal ending');
  assert.ok(MAX_TRIGGER_DEPTH >= 32);
});

test('Membrane absorbs damage before Mass', () => {
  const p = buildPlayer(runWith([{ id: 'stoneskin', copies: 6 }]), 'youngWolf');
  const res = resolveBattle(p, buildEnemy('youngWolf'));
  const first = res.records.find(r => r.kind === 'hit' && r.target === 'player');
  assert.ok(first.absorbed > 0);
});

test('number formatting', () => {
  assert.equal(fmt(999), '999');
  assert.equal(fmt(12500), '12.5K');
  assert.equal(fmt(3.4e9), '3.4B');
  assert.equal(fmt(Infinity), '∞');
});

// ── Map ──────────────────────────────────────────────────────────────────────

test('map constraints hold over many seeds', () => {
  for (let s = 0; s < 300; s++) {
    const m = generateMap(`seed${s}`, s % 3);
    const nodes = Object.values(m.nodes);
    assert.ok(m.start.length >= 2, 'row 1 branches');
    for (const n of nodes) {
      if (n.row === 0) assert.equal(n.type, 'fight');
      if (n.row === 6) assert.equal(n.type, 'treasure');
      if (n.row === ROWS - 1) assert.equal(n.type, 'pool');
      if (n.row < 4) assert.ok(!['elite', 'pool'].includes(n.type), `${n.id} ${n.type}`);
      if (n.row < ROWS) assert.ok(n.next.length > 0, `${n.id} dead end`);
      for (const nx of n.next) {
        if (['elite', 'shop', 'pool'].includes(n.type) && n.row < ROWS - 2) assert.notEqual(m.nodes[nx].type, n.type, `${n.id}→${nx}`);
      }
    }
    assert.ok(nodes.filter(n => n.type === 'elite').length >= 2, `seed${s} elites`);
    assert.deepEqual(generateMap(`seed${s}`, s % 3), m, 'same seed, same map');
  }
});

// ── Absorption & fusion ──────────────────────────────────────────────────────

test('fusion levels at 3 and 6 copies', () => {
  assert.equal(levelFor({ copies: 1 }), 0);
  assert.equal(levelFor({ copies: 3 }), 1);
  assert.equal(levelFor({ copies: 5 }), 1);
  assert.equal(levelFor({ copies: 6 }), 2);
  assert.equal(levelFor({ copies: 2 }, [1, 2, 4]), 1, 'Prismjelly thresholds');
});

test('gaining copies queues a Fusion Burst at each new level', () => {
  const run = newRun({ seed: 'F', species: 'gloop' });
  gainEssence(run, 'bounce', 2);
  assert.equal(run.fusionQueue.length, 1);
  gainEssence(run, 'bounce', 3);
  assert.equal(run.fusionQueue.length, 2);
  assert.deepEqual(run.fusionQueue.map(f => f.level), [1, 2]);
});

test('full slots require choosing an essence to expel', () => {
  const run = newRun({ seed: 'S', species: 'gloop' });
  while (run.slime.slotted.length < slotCount(run)) gainEssence(run, ['fangs', 'harden', 'jiggle', 'glimmer'][run.slime.slotted.length - 1], 1);
  assert.ok(needsReplace(run, 'pounce'));
  assert.throws(() => gainEssence(run, 'pounce', 1));
  const gel = run.gel;
  gainEssence(run, 'pounce', 1, 1);
  assert.ok(run.slime.slotted.some(e => e.id === 'pounce'));
  assert.ok(run.gel > gel, 'expelled essence pays out as a Husk');
});

// ── Run flow ─────────────────────────────────────────────────────────────────

test('a fight node resolves into a battle and then an absorb offer from that enemy', () => {
  let run = newRun({ seed: 'FLOW', species: 'gloop', meta: { upgrades: { denseCore: 10, thickMembrane: 10 } } });
  run = enterNode(run, reachable(run.map, null)[0]);
  assert.equal(run.phase, 'battle');
  assert.ok(run.battle.records.length > 0);
  run = finishBattle(run);
  assert.equal(run.phase, 'absorb');
  const pool = ENEMIES[run.pending.enemyId].pool;
  const allowed = new Set([pool.signature, ...(pool.shared || []), pool.stat, pool.element].filter(Boolean));
  for (const o of run.pending.options) assert.ok(allowed.has(o.id), `${o.id} came from the enemy`);
  const before = run.slime.slotted.length + run.slime.stats.length;
  run = absorb(run, 0);
  assert.equal(run.slime.slotted.length + run.slime.stats.length, before + 1);
});

test('same seed and same choices replay the same run; saves are JSON', () => {
  const play = () => {
    let run = newRun({ seed: 'REPLAY', species: 'gloop', meta: { upgrades: { denseCore: 5 } } });
    for (let i = 0; i < 6 && run.phase !== 'defeat'; i++) {
      if (run.phase === 'map') run = enterNode(run, reachable(run.map, run.current)[0]);
      if (run.phase === 'battle') run = finishBattle(run);
      if (run.phase === 'absorb') run = absorb(run, 0);
    }
    return run;
  };
  const a = play();
  const b = play();
  assert.equal(serializeRun(a), serializeRun(b));
  assert.doesNotThrow(() => JSON.parse(serializeRun(a)));
});

// ── Meta ─────────────────────────────────────────────────────────────────────

test('runs bank Genes and upgrades are permanent stat gains', () => {
  let p = newProfile();
  const run = newRun({ seed: 'M', species: 'gloop' });
  run.stats.floors = 10; run.stats.kills = 6;
  ({ profile: p } = applyRunEnd(p, run));
  assert.ok(p.genes > 0);
  p = buyUpgrade(p, 'denseCore');
  const upgraded = newRun({ seed: 'M', species: 'gloop', meta: { upgrades: p.upgrades } });
  assert.equal(upgraded.slime.base.firm, run.slime.base.firm + 1);
});
