const fs = require('fs');
const path = require('path');

// Jednoduché úložiště v jednom JSON souboru (týmy a pokusy). Pro desítky týmů bohatě stačí
// a nepotřebuje žádnou databázi.
function open(file) {
  let data = { teams: [], attempts: [], bonuses: [] };
  try {
    data = Object.assign(data, JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch (err) {
    if (err.code !== 'ENOENT') throw new Error(`Soubor s daty ${file} nejde přečíst: ${err.message}`);
  }

  // Zápis přes dočasný soubor, aby se při vypnutí uprostřed zápisu data nepoškodila.
  const save = () => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, file);
  };

  return {
    listTeams: async () => data.teams.map((t) => t.name).sort((a, b) => a.localeCompare(b, 'cs')),
    hasTeam: async (name) => data.teams.some((t) => t.name === name),
    // Vrací false, pokud tým už existuje.
    addTeam: async (name) => {
      if (data.teams.some((t) => t.name === name)) return false;
      data.teams.push({ name, createdAt: new Date().toISOString() });
      save();
      return true;
    },
    removeTeam: async (name) => {
      const before = data.teams.length;
      data.teams = data.teams.filter((t) => t.name !== name);
      data.attempts = data.attempts.filter((a) => a.team !== name);
      data.bonuses = data.bonuses.filter((b) => b.team !== name);
      save();
      return data.teams.length < before;
    },
    removeAllTeams: async () => {
      data.teams = [];
      data.attempts = [];
      data.bonuses = [];
      save();
    },
    countAttempts: async (team, drink) => data.attempts.filter((a) => a.team === team && a.drink === drink).length,
    addAttempt: async (attempt) => {
      data.attempts.push({ ...attempt, createdAt: new Date().toISOString() });
      save();
    },
    // Pokusy navíc, které tým u drinku získal za splněný úkol.
    getBonus: async (team, drink) => {
      const b = data.bonuses.find((x) => x.team === team && x.drink === drink);
      return b ? b.count : 0;
    },
    // Změní počet pokusů navíc o delta (nejméně 0), vrátí nový počet.
    changeBonus: async (team, drink, delta) => {
      let b = data.bonuses.find((x) => x.team === team && x.drink === drink);
      if (!b) data.bonuses.push((b = { team, drink, count: 0 }));
      b.count = Math.max(0, b.count + delta);
      save();
      return b.count;
    },
    listAttempts: async (team) => data.attempts.filter((a) => a.team === team).reverse(),
  };
}

module.exports = { open };
