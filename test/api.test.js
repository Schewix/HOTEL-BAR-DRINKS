const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { createApp } = require('../src/app');
const { open } = require('../src/store');
const { drinks } = require('../data/drinks.json');
const config = require('../src/config');

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

test('obsluha je dostupná jen z lokálního počítače', () => {
  const { isLocal } = require('../src/network');
  const req = (address) => ({ socket: { remoteAddress: address } });
  assert.ok(isLocal(req('127.0.0.1')));
  assert.ok(isLocal(req('::1')));
  assert.ok(isLocal(req('::ffff:127.0.0.1')));
  assert.ok(!isLocal(req('192.168.137.25')));
  assert.ok(!isLocal(req('::ffff:192.168.137.25')));
});

test('limit pokusů podle úrovně: basic 5, premium 6, deluxe 7 + 2 extra', async () => {
  await withServer(async (call) => {
    await call('POST', '/api/teams', { name: 'Sova' });
    for (const [tier, base] of [['basic', 5], ['premium', 6], ['deluxe', 7]]) {
      const drink = drinks.find((d) => d.tier === tier);
      const p = (await call('GET', `/api/progress?team=Sova&drink=${encodeURIComponent(drink.name)}`)).body;
      assert.deepStrictEqual([p.base, p.extra, p.limit], [base, 2, base]);
    }
  });
});

test('extra pokus se odemkne jen správným heslem, nejvýš 2', async () => {
  await withServer(async (call) => {
    await call('POST', '/api/teams', { name: 'Sova' });
    const drink = drinks.find((d) => d.tier === 'basic'); // 5 + 2 pokusy
    const wrong = drink.ingredients.map(() => 'soda');
    const guess = () => call('POST', '/api/guess', { team: 'Sova', drink: drink.name, ingredients: wrong });
    const unlock = (password) => call('POST', '/api/extra', { team: 'Sova', drink: drink.name, password });

    // dokud má tým nevyužitý pokus, extra se neodemyká
    assert.strictEqual((await unlock(config.extraPassword)).status, 409);
    for (let i = 0; i < 5; i++) assert.strictEqual((await guess()).status, 200);
    assert.strictEqual((await guess()).status, 409);

    assert.strictEqual((await unlock('spatne')).status, 403);
    assert.strictEqual((await unlock()).status, 403);
    assert.strictEqual((await guess()).status, 409);

    for (const n of [6, 7]) {
      const ok = await unlock(config.extraPassword);
      assert.deepStrictEqual([ok.status, ok.body.limit], [200, n]);
      // druhé odemčení bez využití pokusu nejde
      assert.strictEqual((await unlock(config.extraPassword)).status, 409);
      const g = await guess();
      assert.deepStrictEqual([g.status, g.body.number, g.body.base, g.body.extra], [200, n, 5, 2]);
    }
    assert.strictEqual((await unlock(config.extraPassword)).status, 409);
    assert.strictEqual((await guess()).status, 409);
  });
});

test('obsluha může extra pokus přidat i odebrat (nejvýš 2)', async () => {
  await withServer(async (call) => {
    await call('POST', '/api/teams', { name: 'Sova' });
    const drink = drinks.find((d) => d.tier === 'basic');
    const change = (delta) => call('POST', '/api/teams/Sova/bonus', { drink: drink.name, delta });
    assert.deepStrictEqual([(await change(1)).body.bonus, (await change(1)).body.limit], [1, 7]);
    assert.strictEqual((await change(1)).status, 409);
    await change(-1);
    await change(-1);
    assert.strictEqual((await change(-1)).body.bonus, 0);
    assert.strictEqual((await call('POST', '/api/teams/Sova/bonus', { drink: drink.name, delta: 5 })).status, 400);
  });
});

test('heslo není v kódu posílaném hráčům', () => {
  for (const f of fs.readdirSync(path.join(__dirname, '../public'))) {
    assert.ok(!fs.readFileSync(path.join(__dirname, '../public', f), 'utf8').includes(config.extraPassword), f);
  }
});
