const test = require('node:test');
const assert = require('node:assert');
const { evaluate } = require('../src/evaluate');
const { TIERS } = require('../src/tiers');
const { drinks, pools } = require('../data/drinks.json');

test('správný tip je samé exact', () => {
  assert.deepStrictEqual(evaluate(['gin', 'soda'], ['gin', 'soda']), ['exact', 'exact']);
});

test('ingredience na špatném místě je present', () => {
  assert.deepStrictEqual(evaluate(['gin', 'soda', 'cukr'], ['soda', 'gin', 'rum']), ['present', 'present', 'miss']);
});

test('duplicity se počítají jen tolikrát, kolikrát jsou v drinku', () => {
  // v drinku je jedna "ovoce"; exact má přednost, druhá je miss
  assert.deepStrictEqual(evaluate(['gin', 'ovoce', 'cukr'], ['ovoce', 'ovoce', 'ovoce']), ['miss', 'exact', 'miss']);
  // dvě "rum" v drinku, tip má tři
  assert.deepStrictEqual(evaluate(['rum', 'rum', 'soda'], ['soda', 'rum', 'rum']), ['present', 'exact', 'present']);
  assert.deepStrictEqual(evaluate(['rum', 'soda', 'cukr'], ['rum', 'rum', 'rum']), ['exact', 'miss', 'miss']);
});

test('data z tabulky: počty ingrediencí a seznamy odpovídají úrovním', () => {
  assert.strictEqual(drinks.length, 100);
  for (const d of drinks) {
    assert.strictEqual(d.ingredients.length, TIERS[d.tier].ingredientCount, d.name);
    assert.ok(d.ingredients.every((i) => pools[d.tier].includes(i)), d.name);
  }
  assert.strictEqual(new Set(drinks.map((d) => d.id)).size, drinks.length);
});
