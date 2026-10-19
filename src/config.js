const path = require('path');

// Zabalené .exe (pkg) ukládá data vedle sebe, jinak do složky projektu.
const baseDir = process.pkg ? path.dirname(process.execPath) : path.join(__dirname, '..');

module.exports = {
  port: Number(process.env.PORT || 8080),
  dataFile: process.env.DATA_FILE || path.join(baseDir, 'bar-data.json'),
  // Heslo, které vedoucí zadá na mobilu hráčů pro odemčení extra pokusu. Zůstává jen na serveru.
  extraPassword: process.env.EXTRA_PASSWORD || 'HotelOverl00k',
};
