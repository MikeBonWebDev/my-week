// Test nel browser del promemoria delle faccende, in cima alla settimana corrente.
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js): la settimana va da lunedì 12 a domenica 18.
'use strict';
const { test, expect } = require('@playwright/test');
const Core = require('../core.js');
const { apri, caricaDati, vaiA } = require('./aiuti');

const TELEFONO = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// Sei faccende; nella settimana del 12 ottobre ci sono solo Lavatrice e Sviluppo (che non è una faccenda).
//   Lenzuola   ogni 7 giorni,  fatta lunedì 21 settembre  → giro aperto dal 28 settembre      (nel promemoria)
//   Bagno      ogni 14 giorni, fatta martedì 29 settembre → giro aperto da ieri, 13 ottobre    (nel promemoria)
//   Piante     ogni 7 giorni,  fatta venerdì 9 ottobre    → prossimo giro venerdì 16 ottobre   (nel promemoria)
//   Frigo      ogni 30 giorni, mai segnata                                                    (nel promemoria, in fondo)
//   Vetri      ogni 30 giorni, fatta giovedì 1° ottobre   → prossimo giro sabato 31 ottobre    (no: dopo domenica)
//   Lavatrice  ogni 7 giorni,  fatta lunedì 12 ottobre    → già nella settimana                (no)
function datiFaccende() {
  let adesso = Date.UTC(2026, 8, 1);
  const db = Core.crea({ dispositivo: 'dprova1', ora: () => (adesso += 60_000) });
  const fatta = (sett, nome, giorno, cadenza) => {
    const { id } = db.aggiungi(sett, nome);
    db.spunta(sett, id, giorno, true);
    db.cadenza(id, cadenza);
    return id;
  };
  fatta('2026-09-21', 'Lenzuola', 0, 7);
  fatta('2026-09-28', 'Bagno', 1, 14);
  fatta('2026-10-05', 'Piante', 4, 7);
  fatta('2026-09-28', 'Vetri', 3, 30);
  fatta('2026-10-12', 'Lavatrice', 0, 7);
  db.nuovaFaccenda('Frigo', 30);
  db.aggiungi('2026-10-12', 'Sviluppo');
  // nella settimana del 5 ottobre c'era anche Lenzuola, senza spunte: serve a riprendere e a navigare indietro
  db.aggiungi('2026-10-05', 'Lenzuola');
  return Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString());
}

const promemoria = (p) => p.locator('#promemoria');
const righe = (p) => p.locator('.promemoria-riga');
const riga = (p, nome) => p.locator('.promemoria-riga', { has: p.locator('.nome-voce', { hasText: new RegExp(`^${nome}$`) }) });
const nomi = (p) => righe(p).locator('.nome-voce').allTextContents();
// All'avvio il promemoria è chiuso: lo si apre toccando il titolo, come farebbe una persona
async function apriPromemoria(p) {
  await p.locator('#promemoria > summary').click();
  await expect(promemoria(p)).toHaveAttribute('open', '');
}

test('il promemoria: giri aperti, in arrivo entro domenica e mai segnate; non le faccende già nella settimana', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, datiFaccende());
  await apriPromemoria(p);
  await expect(promemoria(p)).toBeVisible();
  await expect(p.locator('#titolo-promemoria')).toHaveText('Giri aperti e in arrivo');
  expect(await nomi(p)).toEqual(['Lenzuola', 'Bagno', 'Piante', 'Frigo']);
  await expect(riga(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta il 21 settembre · ogni 7 giorni · giro aperto dal 28 settembre');
  await expect(riga(p, 'Bagno').locator('.riga-cadenza')).toHaveText('Fatta il 29 settembre · ogni 14 giorni · giro aperto da ieri');
  await expect(riga(p, 'Piante').locator('.riga-cadenza')).toHaveText('Fatta il 9 ottobre · ogni 7 giorni · prossimo giro: venerdì 16 ottobre');
  await expect(riga(p, 'Frigo').locator('.riga-cadenza')).toHaveText('Mai segnata · ogni 30 giorni');
  // il colore è quello del calore: Lenzuola è oltre la cadenza, Piante no
  await expect(riga(p, 'Lenzuola')).toHaveAttribute('data-calore', '');
  await expect(riga(p, 'Piante')).not.toHaveAttribute('data-calore', '');
  // due scelte per riga, con un nome che dice di quale faccenda
  await expect(riga(p, 'Bagno').getByRole('button', { name: 'Aggiungi «Bagno» a questa settimana' })).toBeVisible();
  await expect(riga(p, 'Bagno').getByRole('button', { name: 'Salto questo giro di Bagno' })).toBeVisible();
  expect(p.errori).toEqual([]);
});

test('«Aggiungi»: la faccenda entra nella settimana ed esce dal promemoria; il fuoco resta nel promemoria', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, datiFaccende());
  await apriPromemoria(p);
  await riga(p, 'Bagno').getByRole('button', { name: /^Aggiungi/ }).click();
  await expect(p.locator('#stato')).toContainText('«Bagno» è in questa settimana.');
  expect(await nomi(p)).toEqual(['Lenzuola', 'Piante', 'Frigo']);
  await expect(p.locator('#corpo-tabella .nome-voce', { hasText: /^Bagno$/ })).toBeVisible();
  await expect(p.locator('#corpo-tabella th', { has: p.locator('.nome-voce', { hasText: /^Bagno$/ }) }).locator('.riga-cadenza'))
    .toHaveText('Fatta il 29 settembre · ogni 14 giorni · giro aperto da ieri');
  await expect(righe(p).first().getByRole('button', { name: /^Aggiungi/ })).toBeFocused();
  // aggiunte tutte, il promemoria sparisce
  for (const n of ['Lenzuola', 'Piante', 'Frigo']) await riga(p, n).getByRole('button', { name: /^Aggiungi/ }).click();
  await expect(promemoria(p)).toBeHidden();
});

test('«Salto questo giro»: la riga resta con «Annulla»; annullando torna com’era; cambiando sezione esce', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, datiFaccende());
  await apriPromemoria(p);
  await riga(p, 'Lenzuola').getByRole('button', { name: 'Salto questo giro di Lenzuola' }).click();
  await expect(p.locator('#stato')).toContainText('«Lenzuola»: giro saltato.');
  await expect(riga(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Giro saltato oggi: il conteggio riparte da qui.');
  await expect(riga(p, 'Lenzuola').getByRole('button', { name: 'Annulla il salto di Lenzuola' })).toBeFocused();
  await expect(riga(p, 'Lenzuola')).not.toHaveAttribute('data-calore', '');

  // annullando, la riga torna con le due scelte e il fuoco va su «Salto questo giro»
  await riga(p, 'Lenzuola').getByRole('button', { name: 'Annulla il salto di Lenzuola' }).click();
  await expect(riga(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta il 21 settembre · ogni 7 giorni · giro aperto dal 28 settembre');
  await expect(riga(p, 'Lenzuola').getByRole('button', { name: 'Salto questo giro di Lenzuola' })).toBeFocused();

  // saltata di nuovo: in Casa risulta, e tornando alla settimana non c'è più (il prossimo giro è mercoledì 21)
  await riga(p, 'Lenzuola').getByRole('button', { name: 'Salto questo giro di Lenzuola' }).click();
  await vaiA(p, 'casa');
  const scheda = p.locator('.faccenda', { has: p.locator('h2', { hasText: /^Lenzuola$/ }) });
  await expect(scheda).toContainText('Giro saltato oggi.');
  await expect(scheda).toContainText('Prossimo giro: mercoledì 21 ottobre');
  await vaiA(p, 'settimana');
  expect(await nomi(p)).toEqual(['Bagno', 'Piante', 'Frigo']);
});

test('solo nella settimana corrente; senza faccende da proporre non c’è', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await expect(promemoria(p)).toBeHidden();   // nessun dato
  await caricaDati(p, datiFaccende());
  await expect(promemoria(p)).toBeVisible();
  await p.click('#sett-prec');
  await expect(p.locator('#sottoperiodo')).toHaveText('Settimana scorsa');
  await expect(promemoria(p)).toBeHidden();
  await p.click('#vai-oggi');
  await expect(promemoria(p)).toBeVisible();
});

test('sul telefono: il promemoria sta sopra il giorno scelto, e le scelte funzionano allo stesso modo', async ({ browser }) => {
  const p = await apri(await browser.newContext(TELEFONO));
  await caricaDati(p, datiFaccende());
  await apriPromemoria(p);
  await expect(promemoria(p)).toBeVisible();
  const sopra = await p.evaluate(() => document.querySelector('#promemoria').getBoundingClientRect().bottom
    <= document.querySelector('#striscia').getBoundingClientRect().top);
  expect(sopra).toBe(true);
  await riga(p, 'Frigo').getByRole('button', { name: /^Aggiungi/ }).click();
  await expect(p.locator('.carta .nome-voce', { hasText: /^Frigo$/ })).toBeVisible();
  await expect(p.locator('.carta', { has: p.locator('.nome-voce', { hasText: /^Frigo$/ }) }).locator('.riga-cadenza'))
    .toHaveText('Mai segnata · ogni 30 giorni');
  // nessuna pagina più larga dello schermo
  expect(await p.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('le date: «l’8», «dall’11», il 1° del mese, e l’anno quando non è questo', async ({ browser }) => {
  let adesso = Date.UTC(2025, 10, 1);
  const db = Core.crea({ dispositivo: 'dprova1', ora: () => (adesso += 60_000) });
  const fatta = (sett, nome, giorno, cadenza) => {
    const { id } = db.aggiungi(sett, nome);
    db.spunta(sett, id, giorno, true);
    db.cadenza(id, cadenza);
  };
  fatta('2026-10-05', 'Tende', 3, 3);        // fatta giovedì 8 ottobre, giro aperto dall'11 ottobre
  fatta('2026-09-28', 'Cantina', 3, 60);     // fatta giovedì 1° ottobre, prossimo giro lunedì 30 novembre (dopo domenica)
  fatta('2025-12-29', 'Garage', 3, 180);     // fatta giovedì 1° gennaio 2026, giro aperto dal 30 giugno
  fatta('2025-11-17', 'Soffitta', 3, 30);    // fatta giovedì 20 novembre 2025
  const p = await apri(await browser.newContext());
  await caricaDati(p, Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString()));
  await apriPromemoria(p);
  await expect(riga(p, 'Tende').locator('.riga-cadenza')).toHaveText('Fatta l’8 ottobre · ogni 3 giorni · giro aperto dall’11 ottobre');
  await expect(riga(p, 'Garage').locator('.riga-cadenza')).toHaveText('Fatta il 1° gennaio · ogni 180 giorni · giro aperto dal 30 giugno');
  await expect(riga(p, 'Soffitta').locator('.riga-cadenza')).toHaveText('Fatta il 20 novembre 2025 · ogni 30 giorni · giro aperto dal 20 dicembre 2025');
  await expect(riga(p, 'Cantina')).toHaveCount(0);
  await vaiA(p, 'casa');
  await expect(p.locator('.faccenda', { has: p.locator('h2', { hasText: /^Cantina$/ }) }))
    .toContainText('Fatta il 1° ottobre');
  await expect(p.locator('.faccenda', { has: p.locator('h2', { hasText: /^Cantina$/ }) }))
    .toContainText('Prossimo giro: lunedì 30 novembre');
});

test('all’avvio è chiuso, con il numero dei giri; si apre toccando il titolo; riaprendo l’app torna chiuso', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, datiFaccende());
  await expect(promemoria(p)).toBeVisible();
  await expect(promemoria(p)).not.toHaveAttribute('open', '');
  await expect(p.locator('#promemoria > summary')).toHaveText('Giri aperti e in arrivo 4');
  await expect(righe(p).first()).toBeHidden();
  // si apre anche da tastiera
  await p.locator('#promemoria > summary').press('Enter');
  await expect(righe(p).first()).toBeVisible();
  await p.reload();
  await expect(promemoria(p)).not.toHaveAttribute('open', '');
  await expect(righe(p).first()).toBeHidden();
});
