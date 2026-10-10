const { TIERS } = require('./tiers');
const { pools, drinks } = require('../data/drinks.json');

const byName = new Map(drinks.map((d) => [d.name, d]));

const findDrink = (name) => byName.get(name);

// Veřejná data pro klienta – bez správného složení, aby se nedalo opsat z prohlížeče.
function publicCatalog() {
  return {
    tiers: Object.fromEntries(
      Object.entries(TIERS).map(([key, t]) => [key, { ...t, ingredients: pools[key] }])
    ),
    drinks: drinks.map(({ id, name, tier, price }) => ({ id, name, tier, price })),
  };
}

module.exports = { findDrink, publicCatalog, pools };
