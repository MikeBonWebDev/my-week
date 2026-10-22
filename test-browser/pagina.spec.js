// Test nel browser dell'uso quotidiano: primo avvio, suggerimenti, riprendi, dettagli, libreria, CSV, telefono.
'use strict';
const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const { creaSeme } = require('../strumenti/seme.js');
const {
  LUNEDI_DOPO, apri, caricaDati, nomi, suggerimenti, conferma, scrivi, aggiungi, riga,
  dettaglio, togli, apriMenu, chiudiMenu, apriPannello, foto,
} = require('./aiuti');

// Lo stile e il codice stanno in file separati (stile.css, js/): se uno non arriva, la pagina sembra viva ma non lo è
test('stile e script caricati: aspetto della pagina e nessun errore', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  expect(await p.evaluate(() => getComputedStyle(document.body).backgroundImage)).toContain('gradient');
  expect(await p.evaluate(() => getComputedStyle(document.querySelector('h1')).fontFamily)).toContain('Palatino');
  expect(p.errori).toEqual([]);
});

test.describe('primo avvio', () => {
  test('tabella vuota, sei proposte di esempio, nessun dato scritto finché non scegli', async ({ page: _p, browser }) => {
    const p = await apri(await browser.newContext());
    expect(await nomi(p)).toEqual([]);
    await expect(p.locator('#titolo-suggerimenti')).toHaveText('Per cominciare:');
    expect(await suggerimenti(p)).toHaveLength(6);
    expect(await p.evaluate(() => localStorage.getItem('settimana:registro'))).toBeNull();
    await expect(p.locator('#carica-csv')).toHaveCount(0);   // il CSV non si ricarica più

    await p.locator('#voci-suggerite .chip', { hasText: 'Camminare' }).click();
    expect(await nomi(p)).toEqual(['Camminare']);
    expect(await suggerimenti(p)).toHaveLength(5);            // le altre proposte restano
    // nel registro c'è solo ciò che hai scelto: il nome della voce e la sua presenza nella settimana
    const chiavi = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('settimana:registro')).registro).sort());
    expect(chiavi).toEqual(['s/2026-10-12/m/camminare', 'v/camminare/nome']);
  });

  test('nomi riservati e doppioni vengono rifiutati con un messaggio', async ({ browser }) => {
    const p = await apri(await browser.newContext());
    await aggiungi(p, 'Riposo');
    await expect(p.locator('#stato')).toContainText('riservati');
    await aggiungi(p, 'Sviluppo');
    await aggiungi(p, 'SVILUPPO');
    await expect(p.locator('#stato')).toContainText('già in questa settimana');
    expect(await nomi(p)).toEqual(['Sviluppo']);
  });
});

test.describe('con qualche settimana di storia', () => {
  /** Apre l'app al lunedì 19/10/2026 con le cinque settimane del seme. */
  async function conStoria(browser, opzioni = {}) {
    const p = await apri(await browser.newContext(opzioni), LUNEDI_DOPO);
    await caricaDati(p, creaSeme());
    return p;
  }

  test('frequenti a campo vuoto; mentre scrivi, tutta la libreria', async ({ browser }) => {
    const p = await conStoria(browser);
    expect(await nomi(p)).toEqual([]);                                              // settimana nuova: vuota
    await expect(p.locator('#titolo-suggerimenti')).toHaveText('Frequenti:');
    expect(await suggerimenti(p)).toEqual(['Sviluppo', 'Camminare', 'Chitarra']);   // i più segnati nelle ultime 4 settimane
    await scrivi(p, 'esa');
    expect(await suggerimenti(p)).toEqual(['Esame']);                              // non usata da 7 settimane, ma si trova
    await scrivi(p, 'citta');
    expect(await suggerimenti(p)).toEqual(['Città nuova']);                        // senza accenti
    await scrivi(p, 'zzz');
    await expect(p.locator('#suggerimenti')).toBeHidden();
  });

  test('riprendi copia la lista, non i dettagli; ogni settimana tiene il suo dettaglio', async ({ browser }) => {
    const p = await conStoria(browser);
    await expect(p.locator('#testo-riprendi')).toContainText('3 attività');
    await p.click('#riprendi-settimana');
    expect(await nomi(p)).toEqual(['Sviluppo', 'Diario', 'Chitarra']);
    expect((await foto(p)).righe.map((r) => r.dettaglio)).toEqual(['', '', '']);
    await expect(p.locator('#riprendi')).toBeHidden();

    await dettaglio(p, 'Sviluppo', 'Programma B');
    await p.click('#sett-prec');
    await expect(riga(p, 'Sviluppo').locator('.dettaglio')).toHaveValue('Programma A');
    await p.click('#vai-oggi');
    await expect(riga(p, 'Sviluppo').locator('.dettaglio')).toHaveValue('Programma B');
  });

  test('libreria: rinomina ovunque, rifiuta i doppioni, cancella solo le voci mai usate', async ({ browser }) => {
    const p = await conStoria(browser);
    await p.click('#riprendi-settimana');
    await apriPannello(p, 'Libreria');

    const sviluppo = p.locator('.lib-nome[data-id="sviluppo"]');
    await sviluppo.fill('Sviluppare');
    await sviluppo.press('Enter');
    await conferma(p);                                           // avvisa che vale anche nel passato
    expect((await nomi(p))[0]).toBe('Sviluppare');
    await chiudiMenu(p);
    await p.click('#sett-prec');
    expect((await nomi(p))[0]).toBe('Sviluppare');
    await p.click('#vai-oggi');
    await apriPannello(p, 'Libreria');

    const camminare = p.locator('.lib-nome[data-id="camminare"]');
    await camminare.fill('chitarra');
    await camminare.press('Enter');
    await expect(p.locator('#stato')).toContainText('Esiste già');
    await expect(camminare).toHaveValue('Camminare');

    await expect(p.locator('button[data-azione][data-id="esame"]')).toHaveCount(0);   // usata: non si cancella
    await chiudiMenu(p);
    await aggiungi(p, 'Prova');
    await togli(p, 'Prova');                                     // ora è "mai usata"
    await apriPannello(p, 'Libreria');
    await p.click('button[data-azione="cancella"][data-id="prova"]');
    await conferma(p);
    await expect(p.locator('.lib-nome[data-id="prova"]')).toHaveCount(0);
  });

  test('CSV dello storico: una riga per attività, con il dettaglio della settimana giusta', async ({ browser }) => {
    const p = await conStoria(browser);
    await apriMenu(p);                                           // i CSV stanno nel menu, sezione «Esporta»
    const [scaricato] = await Promise.all([p.waitForEvent('download'), p.click('#scarica-storico')]);
    const righe = fs.readFileSync(await scaricato.path(), 'utf8').replace(/^﻿/, '').split('\r\n').map((r) => r.split(';'));
    expect(righe[0]).toEqual(['Settimana (lunedì)', 'Voce', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica', 'Dettaglio']);
    expect(righe).toContainEqual(['12/10/2026', 'Sviluppo', 'Sì', 'Sì', 'No', 'No', 'No', 'No', 'No', 'Programma A']);
    expect(righe).toContainEqual(['12/10/2026', 'Energia', ...Array(7).fill('Non indicato'), '']);
  });
});
