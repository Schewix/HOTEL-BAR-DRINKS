const fs = require('fs');
const path = require('path');

// Jednoduché úložiště v jednom JSON souboru (týmy a pokusy). Pro desítky týmů bohatě stačí
// a nepotřebuje žádnou databázi.
function open(file) {
  let data = { teams: [], attempts: [] };
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
      save();
      return data.teams.length < before;
    },
    removeAllTeams: async () => {
      data.teams = [];
      data.attempts = [];
      save();
    },
    countAttempts: async (team, drink) => data.attempts.filter((a) => a.team === team && a.drink === drink).length,
    addAttempt: async (attempt) => {
      data.attempts.push({ ...attempt, createdAt: new Date().toISOString() });
      save();
    },
    listAttempts: async (team) => data.attempts.filter((a) => a.team === team).reverse(),
  };
}

module.exports = { open };
