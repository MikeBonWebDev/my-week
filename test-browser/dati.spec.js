// Test nel browser della sezione Dati: stato, puntino e invito alla copia, «Salva con nome», CSV, unione.
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js).
'use strict';
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { creaSeme } = require('../strumenti/seme.js');
const { apri, caricaDati, aggiungi, apriMenu, vaiA, salvaFile, unisciFile, telefono } = require('./aiuti');


// Una data di ultimo salvataggio già scritta nella memoria del dispositivo, prima che la pagina si apra
const conUltimoSalvataggio = (contesto, data) => contesto.addInitScript((d) => {
  if (!localStorage.getItem('settimana:sync')) localStorage.setItem('settimana:sync', JSON.stringify({ salvato: d }));
}, data);

const puntino = (p) => p.locator('#puntino-dati');

test('la sezione Dati: dove sono, le azioni con la loro frase, la spiegazione chiusa', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await vaiA(p, 'dati');
  await expect(p.locator('#titolo-sezione')).toHaveText('Dati');
  await expect(p.locator('#sottotitolo')).toHaveText('Copie, altri dispositivi, CSV.');
  await expect(p.locator('#sezione-dati')).toContainText('Solo su questo dispositivo, nella memoria del browser.');
  await expect(p.locator('#dove-file')).toHaveText('Il file va nella cartella dei download del browser.');
  await expect(p.locator('#azione-invia')).toBeHidden();                          // sul computer non c'è «Invia a…»
  await expect(p.locator('.spiegazione')).not.toHaveAttribute('open');
  await p.locator('.spiegazione summary').click();
  await expect(p.locator('.spiegazione')).toContainText('Unire due volte lo stesso file non cambia niente.');
  // senza dati non c'è niente da mettere al sicuro: niente puntino, niente invito
  await expect(puntino(p)).toBeHidden();
  await expect(p.locator('#invito-copia')).toBeHidden();
  // e il menu non ha più sincronizzazione ed esportazione
  await apriMenu(p);
  await expect(p.locator('#menu #salva-sync, #menu #scarica-settimana')).toHaveCount(0);
});

test('sul telefono: la riga dice della cartella Download', async ({ browser }) => {
  const p = await apri(await browser.newContext(telefono()));
  await vaiA(p, 'dati');
  await expect(p.locator('#dove-file')).toContainText('Il file va nella cartella Download del telefono.');
});

test('mai salvato, ma in uso da più di 30 giorni: puntino e invito; salvando spariscono', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, creaSeme());                                                // dati dal 31 agosto
  await expect(puntino(p)).toBeVisible();
  await expect(p.locator('.sezione-voce[data-sezione="dati"]')).toHaveAccessibleName('Dati, nuova copia consigliata');
  await vaiA(p, 'dati');
  await expect(p.locator('#invito-titolo')).toHaveText('Non c’è ancora una copia dei dati.');
  const [scaricato] = await Promise.all([p.waitForEvent('download'), p.click('#salva-sync-invito')]);
  expect(scaricato.suggestedFilename()).toBe('settimana-sync-2026-10-14.json');
  await expect(p.locator('#invito-copia')).toBeHidden();
  await expect(puntino(p)).toBeHidden();
  await expect(p.locator('#ultimo-salvataggio')).toContainText('(oggi)');
});

test('ultima copia 35 giorni fa: puntino e invito; 30 giorni: ancora niente', async ({ browser }) => {
  const vecchia = await browser.newContext();
  await conUltimoSalvataggio(vecchia, '2026-09-09');
  const p = await apri(vecchia);
  await aggiungi(p, 'Sviluppo');
  await expect(puntino(p)).toBeVisible();
  await vaiA(p, 'dati');
  await expect(p.locator('#invito-titolo')).toHaveText('L’ultima copia dei dati è di 35 giorni fa.');

  const recente = await browser.newContext();
  await conUltimoSalvataggio(recente, '2026-09-14');
  const q = await apri(recente);
  await aggiungi(q, 'Sviluppo');
  await expect(puntino(q)).toBeHidden();
});

test('«Salva con nome», dove il browser lo offre: il file va dove scegli tu', async ({ browser }) => {
  const contesto = await browser.newContext();
  // un «Salva con nome» finto: ricorda il nome proposto e il testo scritto, come farebbe il vero
  await contesto.addInitScript(() => {
    window.showSaveFilePicker = async (opzioni) => {
      window.__proposto = opzioni.suggestedName;
      return { createWritable: async () => ({ write: async (t) => { window.__scritto = t; }, close: async () => {} }) };
    };
  });
  const p = await apri(contesto, undefined, { salvaConNome: true });
  await aggiungi(p, 'Leggere');
  await vaiA(p, 'dati');
  await expect(p.locator('#dove-file')).toHaveText('Si apre «Salva con nome»: la cartella la scegli tu.');
  await p.click('#salva-sync');
  await expect(p.locator('#ultimo-salvataggio')).toContainText('(oggi)');
  expect(await p.evaluate(() => window.__proposto)).toBe('settimana-sync-2026-10-14.json');
  const scritto = JSON.parse(await p.evaluate(() => window.__scritto));
  expect(scritto.formato).toBe('settimana-sync');
  expect(Object.keys(scritto.registro)).toContain('v/leggere/nome');
});

test('«Salva con nome» chiuso senza salvare: nessun errore, e la copia non risulta fatta', async ({ browser }) => {
  const contesto = await browser.newContext();
  await contesto.addInitScript(() => {
    window.showSaveFilePicker = async () => { throw new DOMException('chiuso', 'AbortError'); };
  });
  const p = await apri(contesto, undefined, { salvaConNome: true });
  await vaiA(p, 'dati');
  await p.click('#salva-sync');
  await expect(p.locator('#ultimo-salvataggio')).toHaveText('mai, finora');
  await expect(p.locator('#stato')).not.toHaveClass(/errore/);
  expect(p.errori).toEqual([]);
});

test('i CSV dalla sezione Dati, e un’unione che lascia dove eri', async ({ browser }, info) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, creaSeme());
  await vaiA(p, 'dati');
  const [settimana] = await Promise.all([p.waitForEvent('download'), p.click('#scarica-settimana')]);
  expect(settimana.suggestedFilename()).toBe('settimana-2026-10-12.csv');
  const [storico] = await Promise.all([p.waitForEvent('download'), p.click('#scarica-storico')]);
  expect(fs.readFileSync(await storico.path(), 'utf8')).toContain('Settimana (lunedì)');

  const altro = await apri(await browser.newContext());
  await vaiA(altro, 'dati');
  expect(await unisciFile(altro, await salvaFile(p, info.outputPath('p.json')))).toContain('Unisco il file');
  await expect(altro.locator('.sezione-voce[data-sezione="dati"]')).toHaveAttribute('aria-current', 'page');
  await expect(altro.locator('#ultima-unione')).toContainText('(oggi)');
});
