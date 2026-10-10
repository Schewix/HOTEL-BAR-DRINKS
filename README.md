# Overlook Hotel – Gold Room: hra na hádání drinků

Webová aplikace pro rychlé vyhodnocování hry v baru hotelu Overlook (Gold Room). Tým dostane název drinku
a hádá jeho ingredience (jako Mastermind). Aplikace každý tip vyhodnotí a eviduje pokusy týmů.

Drinky, jejich složení a ceny se berou z tabulky [`data/drinky.xlsx`](data/drinky.xlsx):

| Úroveň  | Počet drinků | Ingrediencí | Pokusů |
| ------- | ------------ | ----------- | ------ |
| Basic   | 50           | 4           | 8      |
| Premium | 30           | 5           | 9      |
| Deluxe  | 20           | 6           | 10     |

Počet pokusů v tabulce není, nastavuje se v [`src/tiers.js`](src/tiers.js).

## Vyhodnocení tipu

- **Správně** – ingredience je na správném místě
- **Jinde** – ingredience v drinku je, ale na jiném místě
- **Není** – ingredience v drinku není (nebo už je „spotřebovaná“ jinde)

## Spuštění

### Windows – jedno .exe (nejjednodušší)

Stáhni `hotel-bar.exe` z [Releases](../../releases) a spusť ho dvojklikem. Otevře se prohlížeč
na http://127.0.0.1:8080. Nic dalšího se neinstaluje; týmy a pokusy se ukládají do
`bar-data.json` vedle programu. Windows může při prvním spuštění zobrazit varování
SmartScreen (program není podepsaný) – zvol „Další informace“ → „Přesto spustit“.

### Windows – ze zdrojáků

Nainstaluj [Node.js](https://nodejs.org) a spusť `start.bat`.

### macOS / Linux

```bash
npm install
npm start
```

Otevři http://127.0.0.1:8080. V sekci **Obsluha** přidej týmy, pak můžeš hrát.
Správná řešení vidí jen obsluha na detailu týmu, klient je nedostává.

Volitelné proměnné prostředí: `PORT` (8080), `DATA_FILE` (`bar-data.json`).
Nová hra = smazat týmy v Obsluze (nebo smazat `bar-data.json`). Auto-reload: `npm run dev`.

## Sestavení Windows .exe

```bash
npm install
npm run build:exe   # vznikne dist/hotel-bar.exe
```

Na GitHubu se `.exe` staví samo: po pushi tagu `v*` (např. `git tag v1.0.0 && git push --tags`)
workflow `Windows exe` vytvoří Release s přiloženým `hotel-bar.exe`.

## Změna drinků

1. Uprav `data/drinky.xlsx` (listy `Drink Basic`, `Drink Premium`, `Drink Deluxe` a seznam
   ingrediencí s číslováním v listu `Všechny drinky`).
2. Spusť `npm run import` – přegeneruje `data/drinks.json` a zkontroluje, že každý drink
   používá jen ingredience své úrovně.
3. Spusť `npm test`.

## Testy

```bash
npm test
```

Testy používají dočasný soubor, nic dalšího nepotřebují.
