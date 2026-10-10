const path = require('path');
const express = require('express');
const { TIERS } = require('./tiers');
const { findDrink, publicCatalog, pools } = require('./drinks');
const { evaluate } = require('./evaluate');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const cleanName = (v) => (typeof v === 'string' ? v.trim().slice(0, 60) : '');

function createApp(store) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '../public')));

  app.get('/api/catalog', (req, res) => res.json(publicCatalog()));

  app.get('/api/teams', wrap(async (req, res) => res.json(await store.listTeams())));

  app.post('/api/teams', wrap(async (req, res) => {
    const name = cleanName(req.body && req.body.name);
    if (!name) return res.status(400).json({ error: 'Zadej jméno týmu.' });
    if (!(await store.addTeam(name))) return res.status(409).json({ error: 'Tým s tímto jménem už existuje.' });
    res.status(201).json({ name });
  }));

  app.delete('/api/teams', wrap(async (req, res) => {
    await store.removeAllTeams();
    res.json({ ok: true });
  }));

  app.delete('/api/teams/:name', wrap(async (req, res) => {
    if (!(await store.removeTeam(req.params.name))) return res.status(404).json({ error: 'Tým neexistuje.' });
    res.json({ ok: true });
  }));

  // Detail týmu včetně správných řešení – určeno pro obsluhu (admin).
  app.get('/api/teams/:name', wrap(async (req, res) => {
    const name = req.params.name;
    if (!(await store.hasTeam(name))) return res.status(404).json({ error: 'Tým neexistuje.' });
    const attempts = await store.listAttempts(name);
    res.json({
      name,
      attempts: attempts.map((a) => {
        const drink = findDrink(a.drink);
        return { drink: a.drink, id: drink && drink.id, number: a.number, guess: a.guess, solution: a.solution, result: a.result };
      }),
    });
  }));

  // Kolikátý pokus tým u drinku právě dělá.
  app.get('/api/progress', wrap(async (req, res) => {
    const drink = findDrink(req.query.drink);
    if (!drink) return res.status(400).json({ error: 'Neznámý drink.' });
    const used = await store.countAttempts(String(req.query.team), drink.name);
    res.json({ used, attempts: TIERS[drink.tier].attempts, ingredientCount: drink.ingredients.length, tier: drink.tier });
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

    const result = evaluate(drink.ingredients, ingredients);
    const number = (await store.countAttempts(team, drink.name)) + 1;
    await store.addAttempt({ team, drink: drink.name, number, guess: ingredients, solution: drink.ingredients, result });
    res.json({
      result,
      number,
      attempts: TIERS[drink.tier].attempts,
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
