// Test nel browser della settimana giorno per giorno: un'attività vale per i giorni in cui l'hai messa, una
// faccenda resta sulla settimana ma una spunta copre i giorni vicini (meno di una cadenza, prima e dopo).
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js).
import fs from 'node:fs';
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import * as Core from '../core.js';
import {
  apri, caricaDati, aggiungi, riga, conferma, vaiA, salvaFile, unisciFile, suggerimenti, telefono,
} from './aiuti.js';

const nomiCarte = (p) => p.locator('#carte .nome-voce').allTextContents();
const giorno = (p, i) => p.locator(`.giorno[data-giorno="${i}"]`);
const cella = (p, nome, i) => riga(p, nome).locator(`td[data-col="${i}"]`);
// i giorni (0-6) in cui una riga della tabella è attenuata: fuori programma, o coperta da una spunta vicina
const fuori = (p, nome) => riga(p, nome).locator('td[data-fuori]')
  .evaluateAll((celle) => celle.map((c) => Number(c.dataset.col)));

// Due faccende: Bagno ogni 7 giorni e Piante ogni 3, tutte e due fatte lunedì 12; e Leggere, aggiunta prima che
// esistessero i giorni (senza giorno: vale per tutta la settimana)
function datiFaccende() {
  let adesso = Date.UTC(2026, 8, 1);
  const db = Core.crea({ dispositivo: 'dprova1', ora: () => (adesso += 60_000) });
  db.nuovaFaccenda('Bagno', 7);
  db.nuovaFaccenda('Piante', 3);
  for (const n of ['Bagno', 'Piante', 'Leggere']) db.aggiungi('2026-10-12', n);
  db.spunta('2026-10-12', 'bagno', 0, true);
  db.spunta('2026-10-12', 'piante', 0, true);
  return Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString());
}

test('computer: si aggiunge a oggi; gli altri giorni sono attenuati ma si spuntano, e la spunta conta', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await aggiungi(p, 'Sviluppo');
  expect(await fuori(p, 'Sviluppo')).toEqual([0, 1, 3, 4, 5, 6]);           // solo mercoledì in programma
  await cella(p, 'Sviluppo', 0).locator('input').check();                     // fatta anche lunedì, fuori programma
  expect(await fuori(p, 'Sviluppo')).toEqual([1, 3, 4, 5, 6]);
  // togliendola dalla settimana, la conferma dice dove risulta fatta
  await riga(p, 'Sviluppo').hover();
  await cella(p, 'Sviluppo', 2).locator('input').check();
  await riga(p, 'Sviluppo').locator('.elimina').click();
  await expect(p.locator('#conferma-testo')).toContainText('Risulta svolta lunedì e mercoledì');
  await conferma(p);
  await expect(riga(p, 'Sviluppo')).toHaveCount(0);
  // rimessa oggi: le spunte di lunedì e mercoledì tornano, e lunedì si vede di nuovo
  await aggiungi(p, 'Sviluppo');
  await expect(cella(p, 'Sviluppo', 0).locator('input')).toBeChecked();
  expect(await fuori(p, 'Sviluppo')).toEqual([1, 3, 4, 5, 6]);
  expect(p.errori).toEqual([]);
});

test('faccende: la spunta copre i giorni a meno di una cadenza; sul telefono la scheda c’è solo nei giorni scoperti', async ({ browser }) => {
  const pc = await apri(await browser.newContext());
  await caricaDati(pc, datiFaccende());
  expect(await fuori(pc, 'Bagno')).toEqual([1, 2, 3, 4, 5, 6]);                // ogni 7: resta solo lunedì
  expect(await fuori(pc, 'Piante')).toEqual([1, 2]);                           // ogni 3: torna giovedì, al giro
  expect(await fuori(pc, 'Leggere')).toEqual([]);                              // di prima: tutta la settimana

  const tel = await apri(await browser.newContext(telefono()));
  await caricaDati(tel, datiFaccende());
  expect(await nomiCarte(tel)).toEqual(['Leggere']);                           // mercoledì: le due faccende sono coperte
  await giorno(tel, 0).click();
  expect(await nomiCarte(tel)).toEqual(['Bagno', 'Piante', 'Leggere']);       // lunedì, il giorno in cui sono fatte
  await expect(giorno(tel, 0)).toHaveAttribute('aria-label', /2 di 3 attività segnate/);
  // una faccenda già nella settimana non si propone, nemmeno nei giorni in cui è coperta
  await giorno(tel, 2).click();
  await tel.focus('#nuova-attivita');
  expect(await suggerimenti(tel)).not.toContain('Bagno');
  // togliendo la spunta tutto si ricalcola: Bagno torna in ogni giorno
  await giorno(tel, 0).click();
  await tel.locator('.carta', { hasText: 'Bagno' }).locator('input[type=checkbox]').uncheck();
  await giorno(tel, 2).click();
  expect(await nomiCarte(tel)).toContain('Bagno');
  expect(tel.errori).toEqual([]);
});

test('telefono: un’attività di un altro giorno si propone e si aggiunge anche a oggi; il computer la riceve con i suoi giorni', async ({ browser }, info) => {
  const tel = await apri(await browser.newContext(telefono()));
  await giorno(tel, 0).click();
  await aggiungi(tel, 'Sviluppo');                                             // lunedì
  await giorno(tel, 2).click();
  expect(await nomiCarte(tel)).toEqual([]);
  await tel.focus('#nuova-attivita');
  expect(await suggerimenti(tel)).toContain('Sviluppo');
  await tel.locator('#voci-suggerite .chip', { hasText: 'Sviluppo' }).click();
  expect(await nomiCarte(tel)).toEqual(['Sviluppo']);

  const pc = await apri(await browser.newContext());
  await unisciFile(pc, await salvaFile(tel, info.outputPath('tel.json')));
  expect(await fuori(pc, 'Sviluppo')).toEqual([1, 3, 4, 5, 6]);               // lunedì e mercoledì
  expect(pc.errori).toEqual([]);
});

test('CSV: un giorno fuori programma è «—», né Sì né No', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await aggiungi(p, 'Sviluppo');
  await cella(p, 'Sviluppo', 0).locator('input').check();
  await vaiA(p, 'dati');
  const [scaricato] = await Promise.all([p.waitForEvent('download'), p.click('#scarica-settimana')]);
  const righe = fs.readFileSync(await scaricato.path(), 'utf8').replace(/^﻿/, '').split('\r\n').map((r) => r.split(';'));
  expect(righe).toContainEqual(['Sviluppo', 'Sì', '—', 'No', '—', '—', '—', '—', '']);
});
