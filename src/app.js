const path = require('path');
const express = require('express');
const { TIERS } = require('./tiers');
const { findDrink, publicCatalog, pools } = require('./drinks');
const { evaluate } = require('./evaluate');
const { isLocal, lanUrls } = require('./network');
const config = require('./config');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
// Obsluha (správa týmů, správná řešení) jen z počítače, na kterém appka běží – ne z mobilů hráčů.
const localOnly = (req, res, next) => (isLocal(req) ? next() : res.status(403).json({ error: 'Tohle je jen pro obsluhu na hlavním počítači.' }));
const cleanName = (v) => (typeof v === 'string' ? v.trim().slice(0, 60) : '');

function createApp(store) {
  // Kolik pokusů tým u drinku použil a kolik může celkem (základ + odemčené extra pokusy).
  const progressOf = async (team, drink) => {
    const [used, bonus] = await Promise.all([store.countAttempts(team, drink.name), store.getBonus(team, drink.name)]);
    const { attempts: base, extra } = TIERS[drink.tier];
    return { used, bonus, base, extra, limit: base + bonus };
  };

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/api/catalog', (req, res) => res.json(publicCatalog()));

  app.get('/api/teams', wrap(async (req, res) => res.json(await store.listTeams())));

  app.get('/api/info', localOnly, (req, res) => res.json({ urls: lanUrls(config.port) }));

  app.post('/api/teams', localOnly, wrap(async (req, res) => {
    const name = cleanName(req.body && req.body.name);
    if (!name) return res.status(400).json({ error: 'Zadej jméno týmu.' });
    if (!(await store.addTeam(name))) return res.status(409).json({ error: 'Tým s tímto jménem už existuje.' });
    res.status(201).json({ name });
  }));

  app.delete('/api/teams', localOnly, wrap(async (req, res) => {
    await store.removeAllTeams();
    res.json({ ok: true });
  }));

  app.delete('/api/teams/:name', localOnly, wrap(async (req, res) => {
    if (!(await store.removeTeam(req.params.name))) return res.status(404).json({ error: 'Tým neexistuje.' });
    res.json({ ok: true });
  }));

  // Detail týmu včetně správných řešení – určeno pro obsluhu (admin).
  app.get('/api/teams/:name', localOnly, wrap(async (req, res) => {
    const name = req.params.name;
    if (!(await store.hasTeam(name))) return res.status(404).json({ error: 'Tým neexistuje.' });
    const attempts = await store.listAttempts(name);
    const drinkNames = [...new Set(attempts.map((a) => a.drink))];
    const drinks = await Promise.all(drinkNames.map(async (dn) => {
      const drink = findDrink(dn);
      return { drink: dn, id: drink.id, tier: drink.tier, ...(await progressOf(name, drink)) };
    }));
    res.json({
      name,
      drinks: drinks.sort((a, b) => a.id - b.id),
      attempts: attempts.map((a) => {
        const drink = findDrink(a.drink);
        return { drink: a.drink, id: drink && drink.id, number: a.number, guess: a.guess, solution: a.solution, result: a.result };
      }),
    });
  }));

  // Přidání / odebrání pokusu navíc (delta +1 / -1) – jen obsluha.
  app.post('/api/teams/:name/bonus', localOnly, wrap(async (req, res) => {
    const { drink: drinkName, delta } = req.body || {};
    const drink = findDrink(drinkName);
    if (!drink) return res.status(400).json({ error: 'Neznámý drink.' });
    if (delta !== 1 && delta !== -1) return res.status(400).json({ error: 'Neplatná změna.' });
    if (!(await store.hasTeam(req.params.name))) return res.status(404).json({ error: 'Tým neexistuje.' });
    const p = await progressOf(req.params.name, drink);
    if (delta === 1 && p.bonus >= p.extra) return res.status(409).json({ error: `Víc než ${p.extra} extra pokusy nejdou.` });
    await store.changeBonus(req.params.name, drink.name, delta);
    res.json(await progressOf(req.params.name, drink));
  }));

  // Odemčení extra pokusu na mobilu hráčů – vedoucí zadá heslo (zná ho jen server).
  app.post('/api/extra', wrap(async (req, res) => {
    const { team, drink: drinkName, password } = req.body || {};
    const drink = findDrink(drinkName);
    if (!drink) return res.status(400).json({ error: 'Neznámý drink.' });
    if (typeof team !== 'string' || !(await store.hasTeam(team))) return res.status(400).json({ error: 'Neznámý tým.' });
    const p = await progressOf(team, drink);
    if (p.used < p.limit) return res.status(409).json({ error: 'Tým ještě má nevyužitý pokus.' });
    if (p.bonus >= p.extra) return res.status(409).json({ error: 'Všechny extra pokusy jsou vyčerpané.' });
    if (password !== config.extraPassword) return res.status(403).json({ error: 'Špatné heslo.' });
    await store.changeBonus(team, drink.name, 1);
    res.json(await progressOf(team, drink));
  }));

  // Kolikátý pokus tým u drinku právě dělá.
  app.get('/api/progress', wrap(async (req, res) => {
    const drink = findDrink(req.query.drink);
    if (!drink) return res.status(400).json({ error: 'Neznámý drink.' });
    const p = await progressOf(String(req.query.team), drink);
    res.json({ ...p, ingredientCount: drink.ingredients.length, tier: drink.tier });
  }));

  app.post('/api/guess', wrap(async (req, res) => {
    const { team, drink: drinkName, ingredients } = req.body || {};
    const drink = findDrink(drinkName);
    if (!drink) return res.status(400).json({ error: 'Neznámý drink.' });
    if (typeof team !== 'string' || !(await store.hasTeam(team))) return res.status(400).json({ error: 'Neznámý tým.' });
    const valid = Array.isArray(ingredients)
      && ingredients.length === drink.ingredients.length
      && ingredients.every((i) => pools[drink.tier].includes(i));
    if (!valid) return res.status(400).json({ error: 'Vyber všechny ingredience.' });

    const progress = await progressOf(team, drink);
    if (progress.used >= progress.limit) {
      return res.status(409).json({ error: progress.bonus < progress.extra ? 'Pokusy došly. Extra pokus odemkne vedoucí heslem.' : 'Pokusy došly.' });
    }

    const result = evaluate(drink.ingredients, ingredients);
    const number = progress.used + 1;
    await store.addAttempt({ team, drink: drink.name, number, guess: ingredients, solution: drink.ingredients, result });
    res.json({
      result,
      number,
      attempts: progress.limit,
      base: progress.base,
      extra: progress.extra,
      solved: result.every((r) => r === 'exact'),
    });
  }));

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    console.error(err);
    res.status(503).json({ error: 'Chyba serveru nebo databáze není dostupná.' });
  });

  return app;
}

module.exports = { createApp };
