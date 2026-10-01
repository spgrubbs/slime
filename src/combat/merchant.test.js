import test from 'node:test';
import assert from 'node:assert/strict';

import {
  rollMerchantDeals, merchantVisit, materialValue, tradableMaterials, canTakeDeal,
  MERCHANT_CYCLE_MS, MERCHANT_STAY_MS, MATERIAL_TABLE,
} from '../data/merchantData.js';
import { ALL_SEALS, ALL_HEARTS } from '../data/wardenData.js';
import { MONSTER_TYPES } from '../data/monsterData.js';
import { MUTATION_LIBRARY } from '../data/traitData.js';
import { ZONES } from '../data/zoneData.js';

const forestOnly = { forestTendril: 1 };
const pile = { 'Wolf Fang': 60, 'Wolf Pelt': 30, 'Spider Silk': 9, 'Vine Weave': 2 };

const zoneOfMat = (mat) => MATERIAL_TABLE[mat]?.zone;
const zoneOfMutagen = (id) =>
  Object.keys(ZONES).find(z => ZONES[z].monsters.includes(MUTATION_LIBRARY[id].monster));

test('Seals and Cores are never on the stall', () => {
  for (const m of [...ALL_SEALS, ...ALL_HEARTS]) assert.equal(materialValue(m), 0, m);
  for (let v = 0; v < 50; v++) {
    const deals = rollMerchantDeals({ visit: v, mats: { ...pile, 'Heartwood Seal': 5 }, builds: forestOnly, mutationsUnlocked: true });
    for (const d of deals) {
      assert.ok(!ALL_SEALS.includes(d.give.id) && !ALL_SEALS.includes(d.get.id));
      assert.ok(!ALL_HEARTS.includes(d.give.id) && !ALL_HEARTS.includes(d.get.id));
    }
  }
});

test('he only sells what grows where your Tendrils reach', () => {
  for (let v = 0; v < 50; v++) {
    const deals = rollMerchantDeals({ visit: v, mats: pile, mutagens: { sharp: 3 }, builds: forestOnly, mutationsUnlocked: true });
    for (const d of deals) {
      if (d.get.kind === 'mat') assert.equal(zoneOfMat(d.get.id), 'forest', d.get.id);
      else assert.equal(zoneOfMutagen(d.get.id), 'forest', d.get.id);
    }
  }
});

test('every material a monster drops has a value', () => {
  for (const m of Object.values(MONSTER_TYPES)) {
    for (const mat of m.mats || []) assert.ok(materialValue(mat) > 0, mat);
  }
});

test('deeper zones are worth more', () => {
  assert.ok(materialValue('Carp Fin') > materialValue('Wolf Fang'));
  assert.ok(materialValue('Void Fiber') > materialValue('Carp Fin'));
});

test('the peddler never trades at a profit to you', () => {
  for (let v = 0; v < 50; v++) {
    for (const d of rollMerchantDeals({ visit: v, mats: pile, builds: forestOnly })) {
      if (d.give.kind !== 'mat' || d.get.kind !== 'mat') continue;
      assert.ok(d.give.qty * materialValue(d.give.id) >= d.get.qty * materialValue(d.get.id), JSON.stringify(d));
    }
  }
});

test('surplus is offered against what the next Tendril needs', () => {
  const deals = rollMerchantDeals({ visit: 3, mats: pile, builds: forestOnly });
  const gets = deals.map(d => d.get.id);
  // Provoke wants Vine Weave and Earthite, and the player is short of both.
  assert.ok(gets.includes('Earthite') || gets.includes('Vine Weave'), gets.join(', '));
});

test('a deal is only takeable with the goods in hand', () => {
  const deal = { give: { kind: 'mat', id: 'Wolf Fang', qty: 10 }, get: { kind: 'mat', id: 'Earthite', qty: 7 } };
  assert.ok(canTakeDeal(deal, { mats: { 'Wolf Fang': 10 } }));
  assert.ok(!canTakeDeal(deal, { mats: { 'Wolf Fang': 9 } }));
});

test('he comes on a rhythm and leaves between visits', () => {
  const first = 1_000_000;
  assert.ok(merchantVisit(first, first + 1000).present);
  assert.ok(!merchantVisit(first, first + MERCHANT_STAY_MS + 1000).present);
  const back = merchantVisit(first, first + MERCHANT_CYCLE_MS + 1000);
  assert.ok(back.present);
  assert.equal(back.index, 1);
});

test('the same visit always rolls the same stall', () => {
  const a = rollMerchantDeals({ visit: 9, mats: pile, builds: forestOnly, mutationsUnlocked: true });
  const b = rollMerchantDeals({ visit: 9, mats: pile, builds: forestOnly, mutationsUnlocked: true });
  assert.deepEqual(a, b);
});

test('the road is only for players who raid it', () => {
  assert.ok(!tradableMaterials({ builds: forestOnly }).includes('Human Bone'));
  assert.ok(tradableMaterials({ builds: forestOnly, caravanUnlocked: true }).includes('Human Bone'));
});
