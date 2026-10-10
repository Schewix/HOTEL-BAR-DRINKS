const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../src/app');
const { open } = require('../src/store');
const { drinks } = require('../data/drinks.json');

async function withServer(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-'));
  const server = createApp(open(path.join(dir, 'data.json'))).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, path, body) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
  try { await fn(call); } finally { server.close(); fs.rmSync(dir, { recursive: true, force: true }); }
}

test('katalog neprozrazuje řešení', async () => {
  await withServer(async (call) => {
    const { status, body } = await call('GET', '/api/catalog');
    assert.strictEqual(status, 200);
    assert.strictEqual(body.drinks.length, 100);
    assert.ok(body.drinks.every((d) => !('ingredients' in d)));
  });
});

test('týmy: přidání, duplicita, prázdné jméno', async () => {
  await withServer(async (call) => {
    assert.strictEqual((await call('POST', '/api/teams', { name: ' Sova ' })).status, 201);
    assert.strictEqual((await call('POST', '/api/teams', { name: 'Sova' })).status, 409);
    assert.strictEqual((await call('POST', '/api/teams', { name: '  ' })).status, 400);
    assert.deepStrictEqual((await call('GET', '/api/teams')).body, ['Sova']);
  });
});

test('hra: tip se vyhodnotí a uloží, správný tip je solved', async () => {
  await withServer(async (call) => {
    await call('POST', '/api/teams', { name: 'Sova' });
    const drink = drinks.find((d) => d.tier === 'basic');
    const wrong = await call('POST', '/api/guess', { team: 'Sova', drink: drink.name, ingredients: drink.ingredients.map(() => 'soda') });
    assert.strictEqual(wrong.status, 200);
    assert.strictEqual(wrong.body.number, 1);
    const right = await call('POST', '/api/guess', { team: 'Sova', drink: drink.name, ingredients: drink.ingredients });
    assert.strictEqual(right.body.number, 2);
    assert.strictEqual(right.body.solved, true);
    const detail = await call('GET', '/api/teams/Sova');
    assert.strictEqual(detail.body.attempts.length, 2);
  });
});

test('hra: neplatný vstup se odmítne', async () => {
  await withServer(async (call) => {
    await call('POST', '/api/teams', { name: 'Sova' });
    const drink = drinks.find((d) => d.tier === 'basic');
    assert.strictEqual((await call('POST', '/api/guess', { team: 'Sova', drink: 'Nic', ingredients: [] })).status, 400);
    assert.strictEqual((await call('POST', '/api/guess', { team: 'Nikdo', drink: drink.name, ingredients: drink.ingredients })).status, 400);
    // koňak je jen v úrovni deluxe
    assert.strictEqual((await call('POST', '/api/guess', { team: 'Sova', drink: drink.name, ingredients: drink.ingredients.map(() => 'koňak') })).status, 400);
    assert.strictEqual((await call('POST', '/api/guess', { team: 'Sova', drink: drink.name, ingredients: ['gin'] })).status, 400);
  });
});

test('data přežijí restart (uložení do souboru)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bar-'));
  const file = path.join(dir, 'sub', 'data.json');
  return open(file).addTeam('Sova').then(async () => {
    assert.deepStrictEqual(await open(file).listTeams(), ['Sova']);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
