// Převede data/drinky.xlsx na data/drinks.json (spuštění: npm run import).
const path = require('path');
const fs = require('fs');
const ExcelJS = require('exceljs');
const { TIERS } = require('../src/tiers');

const XLSX_FILE = path.join(__dirname, '../data/drinky.xlsx');
const OUT_FILE = path.join(__dirname, '../data/drinks.json');

const SHEETS = { basic: 'Drink Basic', premium: 'Drink Premium', deluxe: 'Drink Deluxe' };
const ALL_SHEET = 'Všechny drinky';

const text = (cell) => String(cell.value ?? '').trim();

// Řádek drinku: sloupec B = název, pak ingredience, na konci číselná cena.
function readTier(ws, tier) {
  const count = TIERS[tier].ingredientCount;
  const drinks = [];
  ws.eachRow((row) => {
    const name = text(row.getCell(2));
    const price = row.getCell(3 + count).value;
    if (!name || typeof price !== 'number') return; // hlavičky a prázdné řádky
    const ingredients = [];
    for (let i = 0; i < count; i++) ingredients.push(text(row.getCell(3 + i)));
    drinks.push({ name, tier, price, ingredients });
  });
  return drinks;
}

// Seznam ingrediencí v tabulce "Všechny drinky" (sloupce L–N pod hlavičkou).
function readPools(ws) {
  const pools = {};
  let headerRow;
  ws.eachRow((row, n) => {
    if (text(row.getCell(12)).toUpperCase().startsWith('BASIC')) headerRow = n;
  });
  if (!headerRow) throw new Error('V listu "' + ALL_SHEET + '" chybí seznam ingrediencí.');
  ['basic', 'premium', 'deluxe'].forEach((tier, i) => {
    pools[tier] = [];
    for (let n = headerRow + 1; n <= ws.rowCount; n++) {
      const v = text(ws.getRow(n).getCell(12 + i));
      if (!v) break;
      pools[tier].push(v);
    }
  });
  return {
    basic: pools.basic,
    premium: [...pools.basic, ...pools.premium],
    deluxe: [...pools.basic, ...pools.premium, ...pools.deluxe],
  };
}

// Pořadová čísla drinků (abecedně) podle listu "Všechny drinky".
function readIds(ws) {
  const ids = new Map();
  ws.eachRow((row) => {
    const id = row.getCell(1).value;
    const name = text(row.getCell(2));
    if (typeof id === 'number' && name) ids.set(name, id);
  });
  return ids;
}

async function main() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(XLSX_FILE);
  const sheet = (name) => {
    const ws = wb.getWorksheet(name);
    if (!ws) throw new Error('V souboru chybí list "' + name + '".');
    return ws;
  };

  const pools = readPools(sheet(ALL_SHEET));
  const ids = readIds(sheet(ALL_SHEET));
  const drinks = Object.keys(SHEETS).flatMap((tier) => readTier(sheet(SHEETS[tier]), tier));

  const seen = new Set();
  for (const d of drinks) {
    if (seen.has(d.name)) throw new Error('Duplicitní drink: ' + d.name);
    seen.add(d.name);
    const bad = d.ingredients.filter((i) => !pools[d.tier].includes(i));
    if (bad.length) throw new Error(d.name + ': ingredience mimo seznam úrovně: ' + bad.join(', '));
    if (!ids.has(d.name)) throw new Error(d.name + ' chybí v listu "' + ALL_SHEET + '".');
  }
  drinks.forEach((d) => { d.id = ids.get(d.name); });
  drinks.sort((a, b) => a.id - b.id);

  fs.writeFileSync(OUT_FILE, JSON.stringify({ pools, drinks }, null, 2) + '\n');
  const perTier = Object.keys(SHEETS).map((t) => t + ': ' + drinks.filter((d) => d.tier === t).length);
  console.log('Uloženo ' + drinks.length + ' drinků (' + perTier.join(', ') + ') do data/drinks.json');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
