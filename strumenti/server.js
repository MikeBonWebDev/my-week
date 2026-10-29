// Un server statico minimo, senza dipendenze, per provare l'app in locale e per i test nel browser.
// Serve i file di questa cartella su http://localhost:<porta>/ .
// "localhost" conta come sicuro per il browser: il service worker funziona come su https.
//
// Uso:  node strumenti/server.js [porta]      (porta predefinita: 8765)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RADICE = path.resolve(import.meta.dirname, '..');
const PORTA = Number(process.argv[2]) || 8765;
const TIPI = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',   // senza il tipo giusto il browser ignora il foglio di stile
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
};

http.createServer((req, res) => {
  // "/" diventa "/index.html"; la query (?...) non conta
  const richiesto = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(RADICE, richiesto.endsWith('/') ? richiesto + 'index.html' : richiesto);
  // niente file fuori dalla cartella dell'app (per esempio "/../../segreti")
  if (!file.startsWith(RADICE + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, dati) => {
    if (err) { res.writeHead(404).end('Non trovato'); return; }
    res.writeHead(200, { 'Content-Type': TIPI[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(dati);
  });
}).listen(PORTA, '127.0.0.1', () => console.log(`La mia settimana: http://localhost:${PORTA}/`));
