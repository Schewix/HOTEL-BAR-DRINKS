const os = require('os');

const LOCAL = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const isLocal = (req) => LOCAL.has(req.socket.remoteAddress);

// Adresy notebooku v lokální síti (wifi / hotspot), na které se mohou připojit hráči.
function lanUrls(port) {
  const urls = [];
  for (const addrs of Object.values(os.networkInterfaces())) {
    for (const a of addrs || []) {
      if (a.family === 'IPv4' && !a.internal) urls.push(`http://${a.address}:${port}`);
    }
  }
  return urls;
}

module.exports = { isLocal, lanUrls };
