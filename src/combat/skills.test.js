import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import './index.js';
import { SKILL_TREES, getSkillEffects, canPurchaseSkill } from '../data/skillTreeData.js';

const ROOT_SKILLS = new Set(['expeditionBasics', 'hiveFoundation', 'combatTraining']);

const allSkills = () =>
  Object.values(SKILL_TREES).flatMap(t => Object.values(t.skills));

// Everything a skill id could plausibly be read in.
const SOURCES = [
  'src/combat/resolveRound.js', 'src/combat/expedition.js', 'src/combat/caravan.js',
  'src/combat/stats.js', 'src/combat/effects.js', 'src/combat/wardenMechanics.js',
  'src/HiveQueenV4.jsx',
];
const sourceText = SOURCES
  .map(f => fs.readFileSync(path.join(process.cwd(), f), 'utf8'))
  .join('\n');

test('every passive skill is actually read somewhere', () => {
  // This repo has already shipped a whole layer of content that silently did
  // nothing (all 30 mutation passives). A skill point spent on a passive the
  // code never checks is the same bug wearing a different hat.
  const dead = allSkills()
    .filter(s => s.effect.type === 'passive' && !ROOT_SKILLS.has(s.id))
    .filter(s => !sourceText.includes(`'${s.id}'`))
    .map(s => s.id);
  assert.deepEqual(dead, [], `passives nothing reads: ${dead.join(', ')}`);
});

test('the tree is overwhelmingly rules, not numbers', () => {
  // The design rule: a skill should change how something works, not how big a
  // number is. Flat bonuses are allowed only for capacity.
  const CAPACITY = new Set(['maxJelly', 'ranchSlots', 'mutationSlots', 'defenseSlots', 'rareSpawn']);
  const skills = allSkills();
  const bonuses = skills.filter(s => s.effect.type === 'bonus');
  for (const s of bonuses) {
    assert.ok(CAPACITY.has(s.effect.stat),
      `"${s.id}" is a flat ${s.effect.stat} bonus — make it a rule or a capacity`);
  }
  assert.ok(bonuses.length / skills.length < 0.2,
    `${bonuses.length}/${skills.length} skills are flat numbers`);
});

test('no skill still gates a zone', () => {
  // Zones are bought with Warden Seals through Tendrils (§17). A skill that
  // also unlocked one would be a second, contradictory spine.
  for (const s of allSkills()) {
    assert.equal(s.effect.zone, undefined, `${s.id} still unlocks a zone`);
  }
});

test('every prerequisite exists and no skill requires itself', () => {
  const ids = new Set(allSkills().map(s => s.id));
  for (const s of allSkills()) {
    for (const r of s.requires) {
      assert.ok(ids.has(r), `${s.id} requires missing skill "${r}"`);
      assert.notEqual(r, s.id, `${s.id} requires itself`);
    }
  }
});

test('every skill is reachable from a free root', () => {
  const byId = Object.fromEntries(allSkills().map(s => [s.id, s]));
  const reach = (id, seen = new Set()) => {
    if (seen.has(id)) return false;      // a cycle is not a path to a root
    seen.add(id);
    const s = byId[id];
    if (!s.requires.length) return s.cost === 0;
    return s.requires.every(r => reach(r, new Set(seen)));
  };
  for (const s of allSkills()) {
    assert.ok(reach(s.id), `${s.id} cannot be reached from a root skill`);
  }
});

test('roots are free and everything else costs points', () => {
  for (const s of allSkills()) {
    if (ROOT_SKILLS.has(s.id)) assert.equal(s.cost, 0, `${s.id} should be free`);
    else assert.ok(s.cost > 0, `${s.id} is free but is not a root`);
  }
});

test('purchasing respects prerequisites and the points you have', () => {
  const tree = 'expedition';
  assert.equal(canPurchaseSkill('vanguard', tree, ['expeditionBasics'], 99), false,
    'vanguard needs secondWind first');
  assert.equal(canPurchaseSkill('secondWind', tree, ['expeditionBasics'], 99), true);
  assert.equal(canPurchaseSkill('secondWind', tree, ['expeditionBasics'], 0), false,
    'no points, no purchase');
});

test('a capstone raising two capacities credits both', () => {
  const eff = getSkillEffects(['economyMastery']);
  assert.ok(eff.bonuses.maxJelly > 0, 'maxJelly credited');
  assert.ok(eff.bonuses.ranchSlots > 0, 'the `also` capacity is credited too');
});

test('skill ids are unique across all three trees', () => {
  const ids = allSkills().map(s => s.id);
  assert.equal(new Set(ids).size, ids.length, 'duplicate skill id');
});
