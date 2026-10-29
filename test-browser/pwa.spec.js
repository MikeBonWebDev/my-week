// Test nel browser della parte "app": installabilità e funzionamento senza rete.
'use strict';
const { test, expect } = require('./aiuti');   // non da '@playwright/test': vedi `test` in aiuti.js
const { aggiungi, nomi } = require('./aiuti');

// Qui il service worker serve: lo riattivo (nel resto dei test è bloccato, vedi playwright.config.js)
test.use({ serviceWorkers: 'allow' });

test('installabile, e senza rete si apre con i dati', async ({ page, context, browserName }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();   // dopo l'attivazione, la pagina passa sotto il controllo del service worker
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // Chrome stesso dice se la pagina è installabile (protocollo dei DevTools, che c'è solo in Chromium)
  if (browserName === 'chromium') {
    const devtools = await context.newCDPSession(page);
    expect((await devtools.send('Page.getAppManifest')).errors).toEqual([]);
    expect((await devtools.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);
  }

  // Tutti i file dell'elenco di sw.js sono in cache: li conto direttamente da sw.js, così il test non va
  // aggiornato a ogni file nuovo
  const elenco = require('node:fs').readFileSync('sw.js', 'utf8').match(/const FILE = \[([\s\S]*?)\];/)[1].match(/['`][^'`]+['`]/g).length;   // le voci tra apici o tra apici inversi (`./core.js${V}`)
  const inCache = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys())[0]);
    return (await cache.keys()).length;
  });
  expect(inCache).toBe(elenco);
  expect(elenco).toBeGreaterThan(10);
  
  // Gli indirizzi di stile e script in index.html portano il numero di VERSIONE (?v=…): così una versione
  // nuova non può mescolarsi con file vecchi rimasti nella cache del browser. Se cambi VERSIONE, cambia anche quelli.
  const numero = require('node:fs').readFileSync('sw.js', 'utf8').match(/const VERSIONE = 'settimana-(\d+)'/)[1];
  const indirizzi = await page.evaluate(() => [...document.querySelectorAll('script[src], link[rel=stylesheet]')]
    .map((e) => e.getAttribute('src') ?? e.getAttribute('href')));
  expect(indirizzi.length).toBe(9);
  for (const a of indirizzi) expect(a, a).toMatch(new RegExp(`\\?v=${numero}$`));

  // In fondo al menu si legge la versione installata: il nome della cache, cioè VERSIONE di sw.js
  const versione = require('node:fs').readFileSync('sw.js', 'utf8').match(/const VERSIONE = '([^']+)'/)[1];
  await page.click('#apri-menu');
  await expect(page.locator('#versione-app')).toHaveText(`Versione: ${versione}`);
  await page.click('#chiudi-menu');

  await aggiungi(page, 'Sviluppo');
  await context.setOffline(true);
  await page.reload();
  expect(await nomi(page)).toContain('Sviluppo');                  // senza rete: pagina e dati ci sono
  await aggiungi(page, 'Leggere');                                 // e si continua a lavorare
  await context.setOffline(false);
  await page.reload();
  expect(await nomi(page)).toEqual(['Sviluppo', 'Leggere']);
});
