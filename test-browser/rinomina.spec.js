// Test nel browser del foglio «Rinomina»: si apre toccando il nome di una voce (scheda, tabella, Casa).
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js).
'use strict';
const { test, expect } = require('@playwright/test');
const Core = require('../core.js');
const { apri, caricaDati, aggiungi, vaiA, telefono } = require('./aiuti');


// Sviluppo in tre settimane (anche questa), Leggere solo in questa; Bagno è una faccenda
function dati() {
  let adesso = Date.UTC(2026, 8, 1);
  const db = Core.crea({ dispositivo: 'dprova1', ora: () => (adesso += 60_000) });
  for (const s of ['2026-09-28', '2026-10-05', '2026-10-12']) db.aggiungi(s, 'Sviluppo');
  db.aggiungi('2026-10-12', 'Leggere');
  db.nuovaFaccenda('Bagno', 14);
  return Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString());
}

const foglio = (p) => p.locator('#foglio-rinomina');
const campo = (p) => p.locator('#nome-rinomina');
const salva = (p) => p.locator('#salva-rinomina');

test('telefono: toccando il nome si apre il foglio; Invio salva, e il nome cambia sulla scheda', async ({ browser }) => {
  const p = await apri(await browser.newContext(telefono()));
  await aggiungi(p, 'Ascoltato musca');
  await p.getByRole('button', { name: 'Rinomina «Ascoltato musca»' }).click();
  await expect(foglio(p)).toBeVisible();
  await expect(p.locator('#titolo-rinomina')).toHaveText('Rinomina «Ascoltato musca»');
  await expect(campo(p)).toHaveValue('Ascoltato musca');
  await expect(campo(p)).toBeFocused();
  await expect(p.locator('#nota-rinomina')).toHaveText('Il nome cambia ovunque compaia questa voce. Per una nota solo di questa settimana c’è il dettaglio.');
  await expect(salva(p)).toBeDisabled();                     // stesso nome: niente da salvare
  await campo(p).fill('Ascoltato musica');
  await campo(p).press('Enter');
  await expect(foglio(p)).toBeHidden();
  await expect(p.locator('#stato')).toContainText('Ora si chiama «Ascoltato musica».');
  await expect(p.locator('.carta .nome-voce', { hasText: /^Ascoltato musica$/ })).toBeVisible();
  await expect(p.getByRole('button', { name: 'Rinomina «Ascoltato musica»' })).toBeFocused();
  expect(p.errori).toEqual([]);
});

test('computer: nome vuoto o già usato non si salva, e la nota dice perché; Esc chiude e il fuoco torna al nome', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, dati());
  const nome = p.locator('#corpo-tabella').getByRole('button', { name: 'Rinomina «Sviluppo»' });
  await nome.click();
  await campo(p).fill('leggere');
  await expect(p.locator('#avviso-rinomina')).toHaveText('Esiste già la voce «Leggere».');
  await expect(salva(p)).toBeDisabled();
  await campo(p).fill('   ');
  await expect(p.locator('#avviso-rinomina')).toHaveText('Il nome non può essere vuoto.');
  await expect(salva(p)).toBeDisabled();
  await campo(p).press('Enter');                               // Invio con un nome non valido non fa niente
  await expect(foglio(p)).toBeVisible();
  await p.keyboard.press('Escape');
  await expect(foglio(p)).toBeHidden();
  await expect(nome).toBeFocused();
  await expect(p.locator('#corpo-tabella .nome-voce', { hasText: /^Sviluppo$/ })).toBeVisible();
});

test('una voce usata in più settimane: la nota lo dice, e il nome cambia anche nel passato (dove resta solo testo)', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, dati());
  await p.locator('#corpo-tabella').getByRole('button', { name: 'Rinomina «Sviluppo»' }).click();
  await expect(p.locator('#nota-rinomina')).toHaveText('Il nome cambia in tutte le 3 settimane in cui compare, anche nel passato. Per una nota solo di questa settimana c’è il dettaglio.');
  await campo(p).fill('Portfolio');
  await salva(p).click();
  await expect(p.locator('#corpo-tabella .nome-voce', { hasText: /^Portfolio$/ })).toBeVisible();
  await p.click('#sett-prec');
  await expect(p.locator('#corpo-tabella .nome-voce', { hasText: /^Portfolio$/ })).toBeVisible();
  await expect(p.locator('#corpo-tabella [data-rinomina]')).toHaveCount(0);
});

test('Casa: si rinomina anche dal titolo della scheda della faccenda', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, dati());
  await vaiA(p, 'casa');
  await p.getByRole('button', { name: 'Rinomina «Bagno»' }).click();
  await campo(p).fill('Pulizia bagno');
  await salva(p).click();
  await expect(p.locator('.faccenda h2', { hasText: /^Pulizia bagno$/ })).toBeVisible();
  await expect(p.getByRole('button', { name: 'Rinomina «Pulizia bagno»' })).toBeFocused();
});
