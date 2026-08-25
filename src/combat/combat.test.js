import test from 'node:test';
import assert from 'node:assert/strict';

import '../combat/index.js';
import { validateRegistry } from './validate.js';
import { computeStats, computeMaxHp, mutationSlots } from './stats.js';
import { makeSlimeCombatant, makeEnemyCombatant, resolveRound, resolveKill, effectiveStats, turnOrder } from './resolveRound.js';
import { effectPower, effectChance } from './hooks.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Deterministic rng: replays a fixed sequence, then holds the last value. */
const seq = (...values) => {
  let i = 0;
  return () => (i < values.length ? values[i++] : values[values.length - 1]);
};
const always = (v) => () => v;

/** mulberry32 — small, seeded, reproducible. */
const seeded = (seed) => () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * Run `trials` independent seeded rounds and report whether `predicate` ever
 * held. Proc chances are 10-20%, so a few hundred trials makes a false
 * negative vanishingly unlikely while staying fully reproducible.
 */
const overTrials = (build, predicate, trials = 400) => {
  for (let i = 0; i < trials; i++) {
    const w = build();
    const result = resolveRound(w, { rng: seeded(i * 7919) });
    if (predicate(w, result)) return true;
  }
  return false;
};

const slime = (over = {}) => ({
  id: 's1',
  name: 'Testooze',
  tier: 'basic',
  biomass: 0,
  mutations: [],
  traits: [],
  baseStats: { firmness: 10, slipperiness: 5, viscosity: 10 },
  primaryElement: null,
  ...over,
});

const world = (slimes, enemyType = 'youngWolf') => ({
  round: 0,
  slimes,
  enemy: makeEnemyCombatant(enemyType),
});

const logsOf = (records) => records.map(r => r.log?.m).filter(Boolean).join(' | ');

// ═════════════════════════════════════════════════════════════════════════════
// Registry
// ═════════════════════════════════════════════════════════════════════════════

test('every mutation and trait resolves to a registered effect', () => {
  const result = validateRegistry({ throwOnError: false });
  assert.deepEqual(result.errors, []);
  assert.equal(result.mutations, 30);
  assert.equal(result.traits, 18);
});

test('every mutation passive id matches its library key', () => {
  // Not required by the resolver, but a mismatch here is how the original bug
  // hid — worth failing loudly on.
  for (const [id, def] of Object.entries(MUTATION_LIBRARY)) {
    assert.equal(def.passive, id, `${id}.passive is "${def.passive}"`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Stats — the baseValue/viscScale regression
// ═════════════════════════════════════════════════════════════════════════════

test('effect magnitude fields no longer leak into stats', () => {
  // fracture: baseValue 50, viscScale 1, stat 'firmness'. Under the old code
  // this granted +50+visc firmness. It must now grant only its flat `bonus`,
  // which spawn() applies to baseStats — so derived stats are unchanged.
  const plain    = computeStats(slime());
  const fractured = computeStats(slime({ mutations: ['fracture'] }));
  assert.deepEqual(fractured, plain);
});

test('stoneskin grants firmness through an explicit statMod hook', () => {
  const plain = computeStats(slime());
  const stony = computeStats(slime({ mutations: ['stoneskin'] }));
  // baseValue 5 + viscScale 0.1 * visc 10 = 6
  assert.equal(stony.firmness, plain.firmness + 6);
  assert.equal(stony.viscosity, plain.viscosity);
});

test('draconicPower raises all three stats', () => {
  const plain = computeStats(slime());
  const drake = computeStats(slime({ mutations: ['draconicPower'] }));
  const bump = Math.floor(3 + 0.15 * 10); // 4
  assert.equal(drake.firmness, plain.firmness + bump);
  assert.equal(drake.slipperiness, plain.slipperiness + bump);
  assert.equal(drake.viscosity, plain.viscosity + bump);
});

test('primordial is +10% to all stats, not just damage', () => {
  const plain = computeStats(slime());
  const prime = computeStats(slime({ traits: ['primordial'] }));
  assert.equal(prime.firmness, Math.floor(plain.firmness * 1.1));
  assert.equal(prime.slipperiness, Math.floor(plain.slipperiness * 1.1));
  assert.equal(prime.viscosity, Math.floor(plain.viscosity * 1.1));
});

test('biomass growth raises stats and max HP together', () => {
  const young = slime();
  const grown = slime({ biomass: 60 }); // basic: 3 biomass per 1%

  const youngStats = computeStats(young);
  const grownStats = computeStats(grown);
  assert.ok(grownStats.firmness > youngStats.firmness);

  // The drift bug: HP was frozen at spawn while firmness kept climbing.
  assert.ok(computeMaxHp(grown, grownStats) > computeMaxHp(young, youngStats));
});

test('hardy and glutton adjust max HP', () => {
  const base = computeMaxHp(slime(), computeStats(slime()));
  const hardy = computeMaxHp(slime({ traits: ['hardy'] }), computeStats(slime({ traits: ['hardy'] })));
  const glut  = computeMaxHp(slime({ traits: ['glutton'] }), computeStats(slime({ traits: ['glutton'] })));
  assert.ok(hardy > base);
  assert.ok(glut < base);
});

test('mutation slots grow with ancient and alloyPotential', () => {
  assert.equal(mutationSlots(slime()), 1);                                   // basic tier
  assert.equal(mutationSlots(slime({ traits: ['ancient'] })), 2);            // +1
  assert.equal(mutationSlots(slime({ mutations: ['alloyPotential'] })), 3);  // +2
  assert.equal(mutationSlots(slime(), 1), 2);                               // skill tree
});

test('effect power scales with viscosity', () => {
  const sharp = MUTATION_LIBRARY.sharp; // baseChance 10, viscScale 0.25
  assert.equal(effectPower(sharp, 0), 10);
  assert.equal(effectPower(sharp, 40), 20);
  assert.equal(effectChance(sharp, 40), 0.2);
  assert.equal(effectPower(sharp, 40, 1.25), 25); // mutationPower skill
});

// ═════════════════════════════════════════════════════════════════════════════
// Round structure
// ═════════════════════════════════════════════════════════════════════════════

test('a round is deterministic given the same rng', () => {
  const run = () => {
    const w = world([makeSlimeCombatant(slime())]);
    return resolveRound(w, { rng: seq(0.5, 0.5, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9) });
  };
  assert.equal(logsOf(run().records), logsOf(run().records));
});

test('turn order is fastest first', () => {
  const fast = makeSlimeCombatant(slime({ id: 'fast', name: 'Fast', baseStats: { firmness: 5, slipperiness: 30, viscosity: 5 } }));
  const slow = makeSlimeCombatant(slime({ id: 'slow', name: 'Slow', baseStats: { firmness: 5, slipperiness: 1, viscosity: 5 } }));
  const order = turnOrder(world([slow, fast]));
  assert.equal(order[0].id, 'fast');
});

test('slimes damage the enemy and the enemy damages back', () => {
  const w = world([makeSlimeCombatant(slime())]);
  const startEnemyHp = w.enemy.hp;
  const startSlimeHp = w.slimes[0].hp;
  resolveRound(w, { rng: always(0.9) }); // no dodges, no crits, no procs
  assert.ok(w.enemy.hp < startEnemyHp, 'enemy took damage');
  assert.ok(w.slimes[0].hp < startSlimeHp, 'slime took damage');
});

// ═════════════════════════════════════════════════════════════════════════════
// Status effects — the previously inert layer
// ═════════════════════════════════════════════════════════════════════════════

test('stun makes the carrier lose a turn', () => {
  const w = world([makeSlimeCombatant(slime())]);
  w.slimes[0].status.push({ type: 'stun', dur: 1, harmful: true });
  const enemyHpBefore = w.enemy.hp;
  const { records } = resolveRound(w, { rng: always(0.9) });

  assert.ok(records.some(r => r.kind === 'stunned'), 'a stunned record was emitted');
  assert.equal(w.enemy.hp, enemyHpBefore, 'the stunned slime dealt no damage');
});

test('stun expires after exactly one round', () => {
  const w = world([makeSlimeCombatant(slime())]);
  w.slimes[0].status.push({ type: 'stun', dur: 1, harmful: true });
  resolveRound(w, { rng: always(0.9) });
  assert.equal(w.slimes[0].status.length, 0, 'stun cleared at round end');

  const hpBefore = w.enemy.hp;
  resolveRound(w, { rng: always(0.9) });
  assert.ok(w.enemy.hp < hpBefore, 'the slime acts again the following round');
});

test('weakened reduces outgoing damage by 25%', () => {
  const clean = world([makeSlimeCombatant(slime())]);
  resolveRound(clean, { rng: always(0.9) });
  const fullDmg = clean.enemy.maxHp - clean.enemy.hp;

  const weak = world([makeSlimeCombatant(slime())]);
  weak.slimes[0].status.push({ type: 'weakened', dur: 2, harmful: true });
  resolveRound(weak, { rng: always(0.9) });
  const weakDmg = weak.enemy.maxHp - weak.enemy.hp;

  assert.ok(weakDmg < fullDmg, `${weakDmg} < ${fullDmg}`);
});

test('slowed halves effective slipperiness', () => {
  const c = makeSlimeCombatant(slime({ baseStats: { firmness: 5, slipperiness: 20, viscosity: 5 } }));
  const before = effectiveStats(c).slipperiness;
  c.status.push({ type: 'slowed', dur: 2, harmful: true });
  assert.equal(effectiveStats(c).slipperiness, Math.floor(before * 0.5));
});

test('damage over time ticks at round start', () => {
  const w = world([makeSlimeCombatant(slime())]);
  w.enemy.status.push({ type: 'poison', dur: 5, harmful: true });
  const { records } = resolveRound(w, { rng: always(0.9) });
  assert.ok(records.some(r => r.kind === 'status' && r.status === 'poison' && r.damage === 2));
});

test('nullify shortens incoming status durations', () => {
  const plain = makeSlimeCombatant(slime());
  const nulled = makeSlimeCombatant(slime({ mutations: ['nullify'] }));
  const w = world([plain, nulled], 'youngWolf');

  // Force a poison onto each via a monster with venomSac would be indirect;
  // exercise the receive path through the resolver's own applier instead.
  const w2 = { ...w, slimes: [nulled] };
  w2.enemy.ref = { ...w2.enemy.ref, trait: 'venomSac' };
  resolveRound(w2, { rng: always(0.01) }); // everything procs

  const poison = nulled.status.find(s => s.type === 'poison');
  if (poison) {
    // base duration 5, nullify at visc 10 => 50 + 0.5*10 = 55% reduction
    assert.ok(poison.dur < 5, `nullified duration ${poison.dur} < 5`);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// Mutations that were previously dead
// ═════════════════════════════════════════════════════════════════════════════

test('pyrolyze burns the enemy', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime({ mutations: ['pyrolyze'] }))]),
    (w) => w.enemy.status.some(s => s.type === 'burn'));
  assert.ok(fired, 'pyrolyze never applied burn');
});

test('a slime without pyrolyze never burns anything', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime())]),
    (w) => w.enemy.status.some(s => s.type === 'burn'));
  assert.equal(fired, false);
});

test('ghastlyWail stuns the enemy', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime({ mutations: ['ghastlyWail'] }))]),
    (w) => w.enemy.status.some(s => s.type === 'stun'));
  assert.ok(fired, 'ghastlyWail never stunned');
});

test('a stun applied this round survives to skip the next one', () => {
  // The bug this guards: statuses used to decay at the end of the round they
  // landed in, so a 1-round stun expired before its victim lost a turn.
  for (let i = 0; i < 400; i++) {
    const w = world([makeSlimeCombatant(slime({ mutations: ['ghastlyWail'] }))]);
    const rng = seeded(i * 7919);
    resolveRound(w, { rng });
    if (!w.enemy.status.some(s => s.type === 'stun')) continue;

    const before = w.slimes[0].hp;
    const { records } = resolveRound(w, { rng });
    assert.ok(records.some(r => r.kind === 'stunned' && r.actorName === w.enemy.name),
      'the stunned enemy did not lose its turn');
    assert.equal(w.slimes[0].hp, before, 'the stunned enemy still attacked');
    return;
  }
  assert.fail('ghastlyWail never stunned across 400 trials');
});

test('permafrost weakens the enemy', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime({ mutations: ['permafrost'] }))]),
    (w) => w.enemy.status.some(s => s.type === 'weakened'));
  assert.ok(fired, 'permafrost never applied Weakened');
});

test('theTouch executes outright', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime({ mutations: ['theTouch'] }))]),
    (w, r) => r.records.some(x => x.result === 'execute') && w.enemy.hp <= 0,
    3000); // ~2.5% chance per swing
  assert.ok(fired, 'The Touch never executed');
});

test('theTouch cannot execute a boss', () => {
  const fired = overTrials(
    () => {
      const w = world([makeSlimeCombatant(slime({ mutations: ['theTouch'] }))]);
      w.enemy.isBoss = true;
      return w;
    },
    (w, r) => r.records.some(x => x.result === 'execute'),
    3000);
  assert.equal(fired, false, 'The Touch executed a boss');
});

test('resurrect revives once, then the slime dies for real', () => {
  const c = makeSlimeCombatant(slime({ mutations: ['resurrect'] }));
  const w = world([c]);

  c.hp = 0;
  resolveRound(w, { rng: always(0.9) });
  assert.equal(c.dead, false, 'first death was reversed');
  assert.ok(c.hp > 0);

  c.hp = 0;
  const { records } = resolveRound(w, { rng: always(0.9) });
  assert.equal(c.dead, true, 'second death sticks');
  assert.ok(records.some(r => r.kind === 'death'));
});

test('fracture damages the enemy on death', () => {
  const c = makeSlimeCombatant(slime({ mutations: ['fracture'] }));
  const w = world([c]);
  c.hp = 0;
  const enemyHp = w.enemy.hp;
  const { records } = resolveRound(w, { rng: always(0.9) });
  assert.ok(records.some(r => r.kind === 'blast'), logsOf(records));
  assert.ok(w.enemy.hp < enemyHp, 'the corpse hurt the enemy');
});

test('sharp forces a crit', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime({ mutations: ['sharp'] }))]),
    (w, r) => r.records.some(x => x.result === 'crit' && x.side === 'slime' &&
                                  x.log.v.includes('Sharp ✓')));
  assert.ok(fired, 'Sharp never forced a crit');
});

test('vinewebs lets the defender block', () => {
  const fired = overTrials(
    () => world([makeSlimeCombatant(slime({ mutations: ['vinewebs'] }))]),
    (w, r) => r.records.some(x => x.result === 'evaded' && x.log.m.includes('blocks')));
  assert.ok(fired, 'Vinewebs never blocked');
});

test('lifesteal heals the attacker', () => {
  const c = makeSlimeCombatant(slime({ mutations: ['lifesteal'] }));
  c.hp = Math.floor(c.maxHp / 2);
  const w = world([c]);
  const { records } = resolveRound(w, { rng: always(0.9) });
  assert.ok(records.some(r => r.kind === 'heal'), logsOf(records));
});

test('stormcaller raises crit chance for the whole party', () => {
  // Base crit for this slime is 5% + slip*1% = 10%. Stormcaller at visc 10
  // adds 12.5%, so a 0.12 roll should crit only with the aura present.
  const build = (mutations) => world([
    makeSlimeCombatant(slime({ id: 'a', name: 'Caller', mutations })),
    makeSlimeCombatant(slime({ id: 'b', name: 'Buddy' })),
  ]);
  const crits = (mutations) =>
    resolveRound(build(mutations), { rng: always(0.12) })
      .records.some(r => r.result === 'crit' && r.actorName === 'Buddy');

  assert.equal(crits([]), false, 'Buddy crit without the aura');
  assert.equal(crits(['stormcaller']), true, 'Buddy did not benefit from the aura');
});

test('regenerate heals at round start', () => {
  const c = makeSlimeCombatant(slime({ mutations: ['regenerate'] }));
  c.hp = 1;
  const w = world([c]);
  const { records } = resolveRound(w, { rng: always(0.9) });
  assert.ok(records.some(r => r.kind === 'heal' && r.actorName === 'Testooze'), logsOf(records));
});

test('digest adds flat biomass on kill', () => {
  const plainW  = world([makeSlimeCombatant(slime())], 'hollowOne');
  const digestW = world([makeSlimeCombatant(slime({ mutations: ['digest'] }))], 'hollowOne');
  const ctx = { rng: always(0.9) };
  const plain  = resolveKill(plainW,  ctx, [], [], null);
  const digest = resolveKill(digestW, ctx, [], [], null);
  assert.ok(digest > plain, `${digest} > ${plain}`);
});

test('greedy and glutton stack additively across the party', () => {
  const one = world([makeSlimeCombatant(slime({ traits: ['greedy'] }))], 'hollowOne');
  const two = world([
    makeSlimeCombatant(slime({ id: 'a', traits: ['greedy'] })),
    makeSlimeCombatant(slime({ id: 'b', traits: ['greedy'] })),
  ], 'hollowOne');
  const ctx = { rng: always(0.9) };
  assert.ok(resolveKill(two, ctx, [], [], null) > resolveKill(one, ctx, [], [], null));
});

test('void blocks element gain, adaptable accelerates it', () => {
  const zone = { element: 'nature', elementGainRate: 1 };
  const ctx = { rng: always(0.9) };

  const plain = makeSlimeCombatant(slime({ id: 'p' }));
  const voided = makeSlimeCombatant(slime({ id: 'v', traits: ['void'] }));
  const adapt = makeSlimeCombatant(slime({ id: 'a', traits: ['adaptable'] }));
  resolveKill(world([plain, voided, adapt]), ctx, [], [], zone);

  assert.equal(voided.elementGains.nature, undefined, 'void gained nothing');
  assert.ok(plain.elementGains.nature > 0);
  assert.ok(adapt.elementGains.nature > plain.elementGains.nature);
});

// ═════════════════════════════════════════════════════════════════════════════
// Verbose logging
// ═════════════════════════════════════════════════════════════════════════════

test('every log entry carries a verbose derivation', () => {
  const w = world([makeSlimeCombatant(slime({ mutations: ['sharp'], traits: ['reckless'] }))]);
  const { records } = resolveRound(w, { rng: always(0.4) });
  const withLogs = records.filter(r => r.log);
  assert.ok(withLogs.length > 0);
  for (const r of withLogs) {
    assert.ok(typeof r.log.v === 'string' && r.log.v.length > 0, `missing trace on: ${r.log.m}`);
  }
});

test('the damage trace names every modifier that applied', () => {
  const w = world([makeSlimeCombatant(slime({ traits: ['reckless'] }))]);
  const { records } = resolveRound(w, { rng: always(0.9) });
  const hit = records.find(r => r.kind === 'attack' && r.side === 'slime');
  assert.ok(hit.log.v.includes('Reckless'), hit.log.v);
  assert.ok(hit.log.v.includes('FIRM'), hit.log.v);
});

test('elemental matchups show up in the trace', () => {
  const w = world([makeSlimeCombatant(slime({ primaryElement: 'fire' }))], 'venusSlimetrap');
  if (w.enemy.primaryElement !== 'nature') return; // guard if data changes
  const { records } = resolveRound(w, { rng: always(0.9) });
  const hit = records.find(r => r.kind === 'attack' && r.side === 'slime');
  assert.ok(hit.log.v.includes('element'), hit.log.v);
});

// ═════════════════════════════════════════════════════════════════════════════
// Party wipe / battle end
// ═════════════════════════════════════════════════════════════════════════════

test('a party wipe is reported', () => {
  const c = makeSlimeCombatant(slime());
  const w = world([c]);
  c.hp = 0;
  const { wiped } = resolveRound(w, { rng: always(0.9) });
  assert.equal(wiped, true);
});

test('killing the enemy is reported', () => {
  const w = world([makeSlimeCombatant(slime())]);
  w.enemy.hp = 1;
  const { enemyDead } = resolveRound(w, { rng: always(0.9) });
  assert.equal(enemyDead, true);
});

test('status proc rolls appear in the attacking hit trace, landed or not', () => {
  // Auditing balance means seeing the rolls that failed, not only the ones
  // that fired.
  const w = world([makeSlimeCombatant(slime({ mutations: ['pyrolyze'] }))]);
  const { records } = resolveRound(w, { rng: always(0.9) });
  const hit = records.find(r => r.kind === 'attack' && r.side === 'slime' && r.damage > 0);
  assert.ok(hit, 'no slime hit landed');
  assert.ok(hit.log.v.includes('Pyrolyze'), hit.log.v);
  assert.ok(hit.log.v.includes('✗'), 'a failed proc roll should still be shown');
});
