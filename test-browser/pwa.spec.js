// Test nel browser della parte "app": installabilità e funzionamento senza rete.
import fs from 'node:fs';
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import { aggiungi, nomi } from './aiuti.js';

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
  const elenco = fs.readFileSync('sw.js', 'utf8').match(/const FILE = \[([\s\S]*?)\];/)[1].match(/['`][^'`]+['`]/g).length;   // le voci tra apici o tra apici inversi (`./core.js${V}`)
  const inCache = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys())[0]);
    return (await cache.keys()).length;
  });
  expect(inCache).toBe(elenco);
  expect(elenco).toBeGreaterThan(10);
  
  // Gli indirizzi di stile e codice portano il numero di VERSIONE (?v=…): così una versione nuova non può
  // mescolarsi con file vecchi rimasti nella cache del browser. Se cambi VERSIONE, cambia anche quelli.
  // Il codice è fatto di moduli: index.html carica solo guscio.js, gli altri arrivano con gli import, che non
  // portano il numero. Lo aggiunge la import map di index.html: ogni file di codice deve esserci, con il numero
  // giusto, e deve essere anche nell'elenco di sw.js (altrimenti senza rete mancherebbe).
  const numero = fs.readFileSync('sw.js', 'utf8').match(/const VERSIONE = 'settimana-(\d+)'/)[1];
  const { indirizzi, mappa } = await page.evaluate(() => ({
    indirizzi: [...document.querySelectorAll('script[src], link[rel=stylesheet]')]
      .map((e) => e.getAttribute('src') ?? e.getAttribute('href')),
    mappa: JSON.parse(document.querySelector('script[type=importmap]').textContent).imports,
  }));
  expect(indirizzi).toEqual([`stile.css?v=${numero}`, `js/guscio.js?v=${numero}`]);
  const codice = ['core.js', ...fs.readdirSync('js').filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
  expect(Object.keys(mappa).sort()).toEqual(codice.map((f) => `./${f}`).sort());
  for (const [da, a] of Object.entries(mappa)) expect(a, da).toBe(`${da}?v=${numero}`);
  const elencoSw = fs.readFileSync('sw.js', 'utf8').match(/const FILE = \[([\s\S]*?)\];/)[1];
  for (const f of codice) expect(elencoSw, f).toContain('`./' + f + '${V}`');   // per esempio `./js/casa.js${V}`

  // In fondo al menu si legge la versione installata: il nome della cache, cioè VERSIONE di sw.js
  const versione = fs.readFileSync('sw.js', 'utf8').match(/const VERSIONE = '([^']+)'/)[1];
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
