# Overlook Hotel – Gold Room: hra na hádání drinků

Webová aplikace pro rychlé vyhodnocování hry v baru hotelu Overlook (Gold Room). Tým dostane název drinku
a hádá jeho ingredience (jako Mastermind). Aplikace každý tip vyhodnotí a eviduje pokusy týmů.

Drinky, jejich složení a ceny se berou z tabulky [`data/drinky.xlsx`](data/drinky.xlsx):

| Úroveň  | Počet drinků | Ingrediencí | Pokusů      |
| ------- | ------------ | ----------- | ----------- |
| Basic   | 50           | 4           | 5 + 2 extra |
| Premium | 30           | 5           | 6 + 2 extra |
| Deluxe  | 20           | 6           | 7 + 2 extra |

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

Volitelné proměnné prostředí: `PORT` (8080), `DATA_FILE` (`bar-data.json`), `EXTRA_PASSWORD` (`HotelOverl00k`).
Nová hra = smazat týmy v Obsluze (nebo smazat `bar-data.json`). Auto-reload: `npm run dev`.

## Hra na více zařízeních (vedoucí + mobily hráčů)

Appka běží na notebooku vedoucího, hráči hádají ze svých mobilů v prohlížeči.

1. Notebook a mobily musí být ve stejné síti. Nejjednodušší je hotspot:
   - Windows: *Nastavení → Síť a internet → Mobilní hotspot* → zapnout,
   - nebo hotspot z mobilu vedoucího (notebook se na něj připojí jako na wifi).
2. Spusť appku (`hotel-bar.exe` / `start.bat`). Při prvním spuštění Windows zeptá na firewall –
   povol **soukromé sítě**.
3. Na stránce **Obsluha** (na notebooku) je vidět adresa, např. `http://192.168.137.1:8080`.
   Hráči ji otevřou v mobilu, vyberou tým a drink a hádají.

Obsluha (týmy, správná řešení, mazání) je dostupná **jen z notebooku, na kterém appka běží**
(`http://127.0.0.1:8080`). Mobily hráčů se k ní nedostanou, takže nemůžou vidět řešení.

## Sestavení Windows .exe

```bash
npm install
npm run build:exe   # vznikne dist/hotel-bar.exe
```

Na GitHubu se `.exe` staví samo: po pushi tagu `v*` (např. `git tag v1.0.0 && git push --tags`)
workflow `Windows exe` vytvoří Release s přiloženým `hotel-bar.exe`.

## Pokusy a extra pokusy

Každý drink má základní pokusy podle úrovně (Basic 5, Premium 6, Deluxe 7) a k tomu 2 extra pokusy.
Po vyčerpání základních pokusů ukáže mobil hráčů obrazovku **„Vložte heslo pro extra pokus“**: hráč
předá vedoucímu kartičku extra pokusu a vedoucí zadá heslo. Heslo se zadává před každým extra pokusem
zvlášť a platí jen pro daný drink. Po obou extra pokusech je drink pro tým uzavřený.

Heslo se ověřuje na serveru, do prohlížeče hráčů se neposílá. Výchozí heslo je `HotelOverl00k`, změní se
v [`src/config.js`](src/config.js) nebo proměnnou prostředí `EXTRA_PASSWORD` (např.
`EXTRA_PASSWORD=tajne npm start`). Počty pokusů jsou v [`src/tiers.js`](src/tiers.js).

Vedoucí může extra pokus přidat nebo odebrat i bez hesla: **Obsluha → tým → „+1 extra“ / „−“**.

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
