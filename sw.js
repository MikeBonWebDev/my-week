'use strict';
/* Service worker di "La mia settimana".
   Serve solo a far funzionare la pagina senza rete e a renderla installabile.
   I tuoi dati non passano mai da qui: stanno nella memoria del browser (localStorage), su questo telefono.

   Strategia:
   - pagina, codice e stile (index.html, core.js, js/*.js, stile.css): prima la rete, così gli aggiornamenti arrivano appena sei online; senza rete, la copia salvata;
   - icone e manifest: prima la copia salvata.
   Quando cambi un file, cambia anche VERSIONE: la vecchia copia viene buttata e si riparte puliti.

   La cache del browser. GitHub Pages dice al browser che ogni file vale 10 minuti (Cache-Control: max-age=600).
   Senza precauzioni, nei 10 minuti dopo un aggiornamento la pagina nuova poteva arrivare insieme agli script
   vecchi, presi dalla cache del browser: una pagina a metà (è successo con i passi 4-5: sezione Dati vuota).
   Tre difese:
   - gli script e lo stile hanno nell'indirizzo il numero di versione («js/casa.js?v=9», vedi index.html):
     per il browser, versione nuova = file nuovo;
   - il service worker chiede sempre al server ({ cache: 'no-cache' }: se il file è lo stesso il server risponde
     "non è cambiato", quindi costa poco);
   - installandosi, scarica i file da capo ('reload'), mai dalla cache del browser. */

const VERSIONE = 'settimana-9';
// Pagina, stile e codice si chiedono con «?v=9» (il numero di VERSIONE): vedi la nota in fondo a index.html.
const V = `?v=${VERSIONE.split('-')[1]}`;
const FILE = [
  './',
  './index.html',
  `./core.js${V}`,
  `./stile.css${V}`,
  `./js/base.js${V}`,
  `./js/settimana.js${V}`,
  `./js/libreria.js${V}`,
  `./js/azioni.js${V}`,
  `./js/file.js${V}`,
  `./js/casa.js${V}`,
  `./js/guscio.js${V}`,
  './manifest.webmanifest',
  './icone/icona-192.png',
  './icone/icona-512.png',
  './icone/icona-maskable-192.png',
  './icone/icona-maskable-512.png',
  './icone/apple-touch-icon.png',
  './icone/favicon-64.png',
];

self.addEventListener('install', (e) => {
  // 'reload': scarica dal server, mai dalla cache del browser, così la copia per l'uso senza rete è tutta della stessa versione
  const freschi = FILE.map((f) => new Request(f, { cache: 'reload' }));
  e.waitUntil(caches.open(VERSIONE).then((c) => c.addAll(freschi)).then(() => self.skipWaiting()));
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
    // 'no-cache': chiede sempre al server se il file è cambiato, invece di fidarsi della cache del browser
    const richiesta = pagina ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
    e.respondWith(
      richiesta
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
