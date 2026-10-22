'use strict';
/* Service worker di "La mia settimana".
   Serve solo a far funzionare la pagina senza rete e a renderla installabile.
   I tuoi dati non passano mai da qui: stanno nella memoria del browser (localStorage), su questo telefono.

   Strategia:
   - pagina, codice e stile (index.html, core.js, js/*.js, stile.css): prima la rete, così gli aggiornamenti arrivano appena sei online; senza rete, la copia salvata;
   - icone e manifest: prima la copia salvata.
   Quando cambi un file, cambia anche VERSIONE: la vecchia copia viene buttata e si riparte puliti. */

const VERSIONE = 'settimana-7';
const FILE = [
  './',
  './index.html',
  './core.js',
  './stile.css',
  './js/base.js',
  './js/settimana.js',
  './js/libreria.js',
  './js/azioni.js',
  './js/file.js',
  './js/casa.js',
  './js/guscio.js',
  './manifest.webmanifest',
  './icone/icona-192.png',
  './icone/icona-512.png',
  './icone/icona-maskable-192.png',
  './icone/icona-maskable-512.png',
  './icone/apple-touch-icon.png',
  './icone/favicon-64.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(chiavi.filter((k) => k !== VERSIONE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Pagina, codice e stile: prima la rete, così arrivano sempre insieme e aggiornati.
  const pagina = req.mode === 'navigate';
  const percorso = new URL(req.url).pathname;
  if (pagina || percorso.endsWith('.js') || percorso.endsWith('.css')) {
    const chiave = pagina ? './index.html' : req;
    e.respondWith(
      fetch(req)
        .then((risposta) => {
          if (risposta.ok) {
            const copia = risposta.clone();
            caches.open(VERSIONE).then((c) => c.put(chiave, copia));
          }
          return risposta;
        })
        .catch(() => caches.match(chiave).then((r) => r ?? caches.match('./'))),
    );
    return;
  }

  e.respondWith(caches.match(req).then((r) => r ?? fetch(req)));
});
