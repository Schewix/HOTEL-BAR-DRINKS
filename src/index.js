const { exec } = require('child_process');
const config = require('./config');
const { open } = require('./store');
const { createApp } = require('./app');

const url = `http://127.0.0.1:${config.port}`;
const server = createApp(open(config.dataFile)).listen(config.port, () => {
  console.log(`Overlook Hotel – Gold Room běží na ${url}`);
  console.log(`Data se ukládají do ${config.dataFile}`);
  // Ve zabaleném .exe rovnou otevři prohlížeč.
  if (process.pkg && process.platform === 'win32') exec(`start ${url}`);
});

server.on('error', (err) => {
  console.error(err.code === 'EADDRINUSE'
    ? `Port ${config.port} je obsazený. Spusť s jiným portem, např. PORT=8081.`
    : err.message);
  process.exit(1);
});
