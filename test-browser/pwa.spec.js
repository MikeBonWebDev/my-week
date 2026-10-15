// Test nel browser della parte "app": installabilità e funzionamento senza rete.
'use strict';
const { test, expect } = require('@playwright/test');
const { aggiungi, nomi } = require('./aiuti');

// Qui il service worker serve: lo riattivo (nel resto dei test è bloccato, vedi playwright.config.js)
test.use({ serviceWorkers: 'allow' });

test('installabile, e senza rete si apre con i dati', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();   // dopo l'attivazione, la pagina passa sotto il controllo del service worker
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);

  // Chrome stesso dice se la pagina è installabile (protocollo dei DevTools)
  const devtools = await context.newCDPSession(page);
  expect((await devtools.send('Page.getAppManifest')).errors).toEqual([]);
  expect((await devtools.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([]);

  // Tutti i file dell'elenco di sw.js sono in cache
  const inCache = await page.evaluate(async () => {
    const cache = await caches.open((await caches.keys())[0]);
    return (await cache.keys()).length;
  });
  expect(inCache).toBe(10);

  await aggiungi(page, 'Sviluppo');
  await context.setOffline(true);
  await page.reload();
  expect(await nomi(page)).toContain('Sviluppo');                  // senza rete: pagina e dati ci sono
  await aggiungi(page, 'Leggere');                                 // e si continua a lavorare
  await context.setOffline(false);
  await page.reload();
  expect(await nomi(page)).toEqual(['Sviluppo', 'Leggere']);
});
