import test from 'node:test';
import assert from 'node:assert/strict';

import './index.js';
import {
  makeTowerDefense, tickTowerDefense, towerDefenseRewards, makeDefender, makeInvader,
} from './towerDefense.js';
import { LANE_ORDER, POSITION_ORDER, TD_POSITIONS, getWaveManifest } from '../data/towerDefenseData.js';

const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const ROUND = 1600;

const slime = (id, over = {}) => ({
  id,
  name: `Ooze${id}`,
  tier: 'royal',
  biomass: 2000,
  mutations: ['stoneskin', 'sharp', 'pyrolyze'],
  traits: ['hardy'],
  baseStats: { firmness: 40, slipperiness: 25, viscosity: 35 },
  primaryElement: null,
  ...over,
});

/**
 * Defenders that survive a while but cannot one-shot an invader — needed for
 * any test about WHO gets hit rather than how hard.
 */
const feeble = (id) => slime(id, {
  tier: 'royal',
  biomass: 0,
  mutations: [],
  traits: [],
  baseStats: { firmness: 1, slipperiness: 1, viscosity: 1 },
});

/** A full 3×3 garrison. */
const fullBoard = (make = slime) => {
  const slimes = [];
  const placements = {};
  let n = 0;
  LANE_ORDER.forEach(lane => {
    placements[lane] = {};
    POSITION_ORDER.forEach(pos => {
      const id = `s${n++}`;
      slimes.push(make(id));
      placements[lane][pos] = id;
    });
  });
  return { slimes, placements };
};

const run = (td, ctx, maxRounds = 400) => {
  const effects = [];
  for (let i = 0; i < maxRounds && td.phase === 'battle'; i++) {
    effects.push(...tickTowerDefense(td, ROUND, ctx, ROUND).sideEffects);
  }
  return effects;
};

// ═════════════════════════════════════════════════════════════════════════════

test('the wave manifest is readable before committing', () => {
  const manifest = getWaveManifest(0, 10);
  assert.equal(manifest.lanes.length, 3);
  assert.ok(manifest.lanes.every(l => l.composition.every(c => c.def?.name)));
  assert.ok(manifest.lanes.some(l => l.total > 0));
});

test('positions change the slime, not just the label', () => {
  const ctx = { rng: seeded(1) };
  const base  = makeDefender(slime('a'), 'rear', ctx);
  const choke = makeDefender(slime('a'), 'choke', ctx);
  const flank = makeDefender(slime('a'), 'flank', ctx);

  assert.equal(choke.stats.firmness, Math.floor(base.stats.firmness * TD_POSITIONS.choke.firmnessMult));
  assert.equal(flank.critBonus, 1);
  assert.equal(base.procMult, 2);
});

test('a full garrison holds and wins', () => {
  const { slimes, placements } = fullBoard();
  const td = makeTowerDefense(placements, slimes, 5, { rng: seeded(2) });
  run(td, { rng: seeded(2) });
  assert.equal(td.phase, 'victory', `ended ${td.phase} on wave ${td.wave + 1}`);
});

test('an empty board loses every lane', () => {
  const td = makeTowerDefense({}, [], 5, { rng: seeded(3) });
  run(td, { rng: seeded(3) });
  assert.equal(td.phase, 'defeat');
  assert.equal(td.breaches.length, 3);
});

test('a breach costs only that lane, not the run', () => {
  // Garrison two lanes, leave the marsh empty.
  const { slimes, placements } = fullBoard();
  delete placements.marsh;
  const td = makeTowerDefense(placements, slimes, 3, { rng: seeded(4) });
  run(td, { rng: seeded(4) });

  assert.ok(td.breaches.includes('marsh'));
  assert.equal(td.lanes.ravine.breached, false);
  assert.notEqual(td.phase, 'defeat');
});

test('the Choke is the only thing an ordinary invader can reach', () => {
  const { slimes, placements } = fullBoard(feeble);
  const td = makeTowerDefense(placements, slimes, 1, { rng: seeded(5) });

  // March everything to the line, then fight one round.
  LANE_ORDER.forEach(id => td.lanes[id].invaders.forEach(i => { i.march = 0; }));
  for (let i = 0; i < 3; i++) tickTowerDefense(td, ROUND, { rng: seeded(5) }, ROUND);

  const lane = td.lanes.ravine;
  const chokeHurt = lane.slots.choke.hp < lane.slots.choke.maxHp;
  const flankHurt = lane.slots.flank.hp < lane.slots.flank.maxHp;
  assert.ok(chokeHurt, 'the Choke should be taking the hits');
  assert.equal(flankHurt, false, 'the Flank should be untouched behind the Choke');
});

test('a Sapper tunnels past the Choke', () => {
  const { slimes, placements } = fullBoard(feeble);
  const td = makeTowerDefense(placements, slimes, 1, { rng: seeded(6) });

  // One sapper, at the line, in the causeway; nothing anywhere else.
  LANE_ORDER.forEach(id => { td.lanes[id].invaders = []; });
  const sapper = makeInvader('sapper', 0, 'causeway', td.scaling);
  sapper.march = 0;
  td.lanes.causeway.invaders = [sapper];

  for (let i = 0; i < 8; i++) tickTowerDefense(td, ROUND, { rng: seeded(6) }, ROUND);

  // Assert on WHO it engaged rather than on damage — a run of dodges should
  // not read as the rule failing.
  const lane = td.lanes.causeway;
  const chokeName = lane.slots.choke.name;
  const behindNames = [lane.slots.flank.name, lane.slots.rear.name];

  const sapperLines = td.logs.filter(l => l.m.includes('Sapper'));
  assert.ok(sapperLines.length > 0, 'the Sapper never engaged');
  assert.ok(
    sapperLines.some(l => behindNames.some(n => l.m.includes(n))),
    'the Sapper never reached anything behind the Choke');
  assert.ok(
    !sapperLines.some(l => l.m.includes(`${chokeName} dodges`) || l.m.includes(`hits ${chokeName}`)),
    'the Sapper attacked the Choke it is supposed to tunnel past');
});

test('a Shieldbearer cannot be crit, so Flanks are wasted on it', () => {
  const { slimes, placements } = fullBoard(feeble);
  const td = makeTowerDefense(placements, slimes, 1, { rng: seeded(7) });
  LANE_ORDER.forEach(id => { td.lanes[id].invaders = []; });
  td.lanes.ravine.invaders = [makeInvader('shieldbearer', 0, 'ravine', td.scaling)];
  td.lanes.ravine.invaders[0].march = 0;
  td.lanes.ravine.slots.choke = null; // expose the guaranteed-crit Flank

  for (let i = 0; i < 4; i++) tickTowerDefense(td, ROUND, { rng: seeded(7) }, ROUND);

  const crits = td.logs.filter(l => l.m.includes('CRITS'));
  assert.equal(crits.length, 0, 'a Shieldbearer took a critical hit');
  assert.ok(td.logs.some(l => l.v?.includes('crit-immune')), 'immunity should be visible in the trace');
});

test('a Zealot ignores every status a Rear can apply', () => {
  const { slimes, placements } = fullBoard(
    (id) => slime(id, { biomass: 0, baseStats: { firmness: 1, slipperiness: 1, viscosity: 40 } }));
  const td = makeTowerDefense(placements, slimes, 1, { rng: seeded(8) });
  LANE_ORDER.forEach(id => { td.lanes[id].invaders = []; });
  const zealot = makeInvader('zealot', 0, 'ravine', td.scaling);
  zealot.march = 0;
  td.lanes.ravine.invaders = [zealot];

  for (let i = 0; i < 8; i++) tickTowerDefense(td, ROUND, { rng: seeded(8) }, ROUND);
  assert.equal(zealot.status.length, 0, `zealot picked up ${zealot.status.map(s => s.type)}`);
});

test('the marsh slows its invaders', () => {
  const { slimes, placements } = fullBoard();
  const td = makeTowerDefense(placements, slimes, 1, { rng: seeded(9) });
  assert.ok(td.lanes.marsh.invaders[0].status.some(s => s.type === 'slowed'));

  const marsh = td.lanes.marsh.invaders[0];
  const causeway = td.lanes.causeway.invaders[0];
  const startMarsh = marsh.march;
  const startCauseway = causeway.march;

  for (let i = 0; i < 4; i++) tickTowerDefense(td, ROUND, { rng: seeded(9) }, ROUND);
  assert.ok((startMarsh - marsh.march) < (startCauseway - causeway.march),
    'marsh invaders should advance more slowly');
});

test('victory pays a Prism; only a flawless run pays the Champion Badge', () => {
  const { slimes, placements } = fullBoard();

  const clean = makeTowerDefense(placements, slimes, 5, { rng: seeded(10) });
  run(clean, { rng: seeded(10) });
  const cleanResult = towerDefenseRewards(clean);
  assert.equal(cleanResult.victory, true);
  assert.equal(cleanResult.rewards.prisms, 1);
  assert.equal(cleanResult.flawless, true);
  assert.equal(cleanResult.rewards.materials['Champion Badge'], 1);

  const thin = { ...placements };
  delete thin.marsh;
  const messy = makeTowerDefense(thin, slimes, 3, { rng: seeded(12) });
  run(messy, { rng: seeded(12) });
  const messyResult = towerDefenseRewards(messy);
  if (messyResult.victory) {
    assert.equal(messyResult.flawless, false);
    assert.equal(messyResult.rewards.prisms, 1, 'a breached win still pays a Prism');
    assert.equal(messyResult.rewards.materials['Champion Badge'], undefined);
  }
});

test('defeat costs the deployed slimes and nothing else', () => {
  const { slimes, placements } = fullBoard();
  const weak = slimes.map(s => ({ ...s, tier: 'basic', biomass: 0, mutations: [], traits: [],
                                  baseStats: { firmness: 1, slipperiness: 1, viscosity: 1 } }));
  const td = makeTowerDefense(placements, weak, 20, { rng: seeded(11) });
  const effects = run(td, { rng: seeded(11) });

  const result = towerDefenseRewards(td);
  assert.equal(result.victory, false);
  // No biomass penalty anywhere in the result — losses are slimes, not savings.
  assert.equal(result.rewards.prisms, 0);
  assert.ok(effects.every(e => e.type === 'slimeDeath'));
});

test('losses are reported per lane and position', () => {
  const { slimes, placements } = fullBoard();
  const td = makeTowerDefense(placements, slimes, 8, { rng: seeded(13) });
  run(td, { rng: seeded(13) });
  const result = towerDefenseRewards(td);
  assert.equal(result.survivors.length + result.lost.length, 9);
  result.survivors.concat(result.lost).forEach(entry => {
    assert.ok(LANE_ORDER.includes(entry.lane));
    assert.ok(POSITION_ORDER.includes(entry.position));
  });
});

test('every defense log entry carries a verbose derivation', () => {
  const { slimes, placements } = fullBoard();
  const td = makeTowerDefense(placements, slimes, 5, { rng: seeded(14) });
  run(td, { rng: seeded(14) });
  const missing = td.logs.filter(l => !l.v);
  assert.deepEqual(missing.map(l => l.m), []);
});
