// Le regole di Safari su iPhone, applicate alla nostra app. iOS non si può far girare qui: si mettono però l'app
// nelle stesse condizioni (documentate da Apple e dal team di WebKit) e si controlla che si comporti bene.
// Girano in tutti i motori; nel progetto «iphone» con il profilo di un iPhone 15 (WebKit, schermo e tocco).
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js).
'use strict';
const fs = require('node:fs');
const { test, expect } = require('./aiuti');   // non da '@playwright/test': vedi `test` in aiuti.js
const { creaSeme } = require('../strumenti/seme.js');
const { apri, caricaDati, vaiA, salvaFile, unisciFile, apriMenu, telefono } = require('./aiuti');

const nomiCarte = (p) => p.locator('#carte .nome-voce').allTextContents();

test('memoria svuotata da Safari: l’app riparte pulita, senza errori, e un file salvato rimette tutto', async ({ browser }, info) => {
  // Safari può cancellare i dati di un sito che non apri da un po'. Il rimedio è il file di sincronizzazione.
  const p = await apri(await browser.newContext(telefono()));
  await caricaDati(p, creaSeme());
  const prima = await nomiCarte(p);
  expect(prima.length).toBeGreaterThan(0);
  const file = await salvaFile(p, info.outputPath('copia.json'));

  await p.evaluate(() => localStorage.clear());
  await p.reload();
  expect(await nomiCarte(p)).toEqual([]);
  await expect(p.locator('#carte')).toContainText('Nessuna attività, per ora');

  expect(await unisciFile(p, file)).toContain('Unisco il file');
  expect(await nomiCarte(p)).toEqual(prima);
  expect(p.errori).toEqual([]);
});

test('niente «Salva con nome», ma il menu Condividi: «Invia a…» manda il file di sincronizzazione', async ({ browser, browserName }) => {
  // Su iPhone il file si manda con Condividi (per esempio a File o a Drive). Qui Condividi è finto: ricorda cosa riceve.
  test.skip(browserName === 'firefox', 'Firefox non emula un puntatore «grossolano» (il dito): «Invia a…» lì non compare');
  const contesto = await browser.newContext(telefono());
  await contesto.addInitScript(() => {
    navigator.canShare = () => true;
    navigator.share = async ({ files }) => { window.__condiviso = { nome: files[0].name, testo: await files[0].text() }; };
  });
  const p = await apri(contesto);
  await caricaDati(p, creaSeme());
  await vaiA(p, 'dati');
  await expect(p.locator('#azione-invia')).toBeVisible();
  await expect(p.locator('#dove-file')).toContainText('Per scegliere dove metterlo, usa «Invia a…».');
  await p.click('#invia-sync');
  await expect(p.locator('#stato')).toContainText('File inviato');
  const condiviso = await p.evaluate(() => window.__condiviso);
  expect(condiviso.nome).toBe('settimana-sync-2026-10-14.json');
  expect(JSON.parse(condiviso.testo).formato).toBe('settimana-sync');
  await expect(p.locator('#ultimo-salvataggio')).toContainText('(oggi)');
});

test('sul telefono ogni campo ha il testo di almeno 16 pixel: Safari non ingrandisce la pagina quando lo tocchi', async ({ browser }) => {
  // Su iPhone, toccando un campo con il testo più piccolo di 16 pixel, Safari ingrandisce la pagina e non torna da
  // solo com'era. Si controllano tutti i campi della pagina, anche quelli dei fogli chiusi e del menu.
  const p = await apri(await browser.newContext(telefono()));
  await caricaDati(p, creaSeme());
  await apriMenu(p);
  await p.locator('#pannello-libreria summary').click();
  const piccoli = await p.evaluate(() => [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea, select')]
    .map((el) => ({ campo: el.id || el.className || el.name || el.tagName, px: parseFloat(getComputedStyle(el).fontSize) }))
    .filter((c) => c.px < 16));
  expect(piccoli).toEqual([]);
});

test('le zone sicure: barra in basso, pagina e messaggi lasciano spazio alla tacca e alla barra di sistema', async () => {
  // Con viewport-fit=cover la pagina arriva fino ai bordi dello schermo: tocca a lei lasciare libere le zone
  // occupate da tacca e barra di sistema (env(safe-area-inset-…)). Un browser per computer non ha zone sicure,
  // quindi qui si controlla che le regole ci siano, e che nessuno le tolga per sbaglio.
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('stile.css', 'utf8');
  expect(html).toMatch(/<meta name="viewport" content="[^"]*viewport-fit=cover/);
  for (const lato of ['top', 'bottom', 'left', 'right']) expect(css, lato).toContain(`env(safe-area-inset-${lato})`);
  // la barra delle sezioni sul telefono, i messaggi e il fondo della pagina
  expect((css.match(/env\(safe-area-inset-bottom\)/g) ?? []).length).toBeGreaterThanOrEqual(4);
});
