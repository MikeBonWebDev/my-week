// Test nel browser del passo 4 e del salto: il calore delle faccende, l'intensità, il tema, il riposo che ammorbidisce,
// «Salto questo giro». Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js).
'use strict';
const { test, expect } = require('@playwright/test');
const Core = require('../core.js');
const { apri, caricaDati, apriMenu, chiudiMenu, vaiA, salvaFile, unisciFile } = require('./aiuti');

const TELEFONO = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

// Tre faccende nella settimana del 12 ottobre, con un orologio finto (ogni operazione un minuto dopo):
//   Bagno      ogni 14 giorni, fatta martedì 29 settembre  → 15 giorni: appena oltre (calore 1/14)
//   Lenzuola   ogni 7 giorni,  fatta lunedì 21 settembre   → 23 giorni: al massimo (calore 1)
//   Lavatrice  ogni 7 giorni,  fatta lunedì 12 ottobre     → 2 giorni: dentro la cadenza (niente calore)
//   Sviluppo   non è una faccenda
function datiFaccende() {
  let adesso = Date.UTC(2026, 8, 1);
  const db = Core.crea({ dispositivo: 'dprova1', ora: () => (adesso += 60_000) });
  const fatta = (sett, nome, giorno, cadenza) => {
    const { id } = db.aggiungi(sett, nome);
    db.spunta(sett, id, giorno, true);
    db.cadenza(id, cadenza);
    return id;
  };
  fatta('2026-09-28', 'Bagno', 1, 14);
  fatta('2026-09-21', 'Lenzuola', 0, 7);
  fatta('2026-10-12', 'Lavatrice', 0, 7);
  for (const n of ['Bagno', 'Lenzuola', 'Sviluppo']) db.aggiungi('2026-10-12', n);
  return Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString());
}

const carta = (p, nome) => p.locator('.carta', { has: p.locator('.nome-voce', { hasText: new RegExp(`^${nome}$`) }) });
const nomeInTabella = (p, nome) => p.locator('#corpo-tabella th', { has: p.locator('.nome-voce', { hasText: new RegExp(`^${nome}$`) }) });
const faccenda = (p, nome) => p.locator('.faccenda', { has: p.locator('h2', { hasText: new RegExp(`^${nome}$`) }) });
const sfondo = (l) => l.evaluate((e) => getComputedStyle(e).backgroundColor);
const calore = (l) => l.evaluate((e) => (e.hasAttribute('data-calore') ? Number(e.style.getPropertyValue('--calore')) : 0));

test('telefono: le schede delle faccende dicono da quanto e, oltre la cadenza, si scaldano', async ({ browser }) => {
  const p = await apri(await browser.newContext(TELEFONO));
  await caricaDati(p, datiFaccende());
  await expect(carta(p, 'Bagno').locator('.riga-cadenza')).toHaveText('Fatta il 29 settembre · ogni 14 giorni · giro aperto da ieri');
  await expect(carta(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta il 21 settembre · ogni 7 giorni · giro aperto dal 28 settembre');
  await expect(carta(p, 'Lavatrice').locator('.riga-cadenza')).toHaveText('Fatta il 12 ottobre · ogni 7 giorni · prossimo giro: lunedì 19 ottobre');
  await expect(carta(p, 'Sviluppo').locator('.riga-cadenza')).toHaveCount(0);       // non è una faccenda
  expect(await calore(carta(p, 'Bagno'))).toBeCloseTo(1 / 14, 3);
  expect(await calore(carta(p, 'Lenzuola'))).toBe(1);
  expect(await calore(carta(p, 'Lavatrice'))).toBe(0);
  expect(await sfondo(carta(p, 'Lenzuola'))).not.toBe(await sfondo(carta(p, 'Sviluppo')));
  expect(await sfondo(carta(p, 'Lavatrice'))).toBe(await sfondo(carta(p, 'Sviluppo')));

  // segnata oggi: torna neutra, verde come ogni attività fatta, e dice «oggi»
  await carta(p, 'Lenzuola').locator('input[type=checkbox]').check();
  await expect(carta(p, 'Lenzuola')).toHaveAttribute('data-fatto', '');
  await expect(carta(p, 'Lenzuola')).not.toHaveAttribute('data-calore');
  await expect(carta(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta oggi · ogni 7 giorni · prossimo giro: mercoledì 21 ottobre');
  expect(p.errori).toEqual([]);
});

test('computer: la cella del nome si scalda, e una spunta la aggiorna senza ridisegnare la tabella', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, datiFaccende());
  await expect(nomeInTabella(p, 'Bagno').locator('.riga-cadenza')).toHaveText('Fatta il 29 settembre · ogni 14 giorni · giro aperto da ieri');
  expect(await calore(nomeInTabella(p, 'Lenzuola'))).toBe(1);
  const casella = p.locator('#corpo-tabella input[type=checkbox][data-id="lenzuola"][data-giorno="2"]');
  await casella.focus();
  await p.keyboard.press('Space');
  await expect(nomeInTabella(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta oggi · ogni 7 giorni · prossimo giro: mercoledì 21 ottobre');
  expect(await calore(nomeInTabella(p, 'Lenzuola'))).toBe(0);
  await expect(casella).toBeFocused();                                              // la casella è ancora quella
});

test('le settimane passate non si scaldano: il calore parla di oggi', async ({ browser }) => {
  const p = await apri(await browser.newContext(TELEFONO));
  await caricaDati(p, datiFaccende());
  await p.click('#sett-prec');
  await expect(p.locator('.carta[data-calore]')).toHaveCount(0);
  await expect(p.locator('.riga-cadenza')).toHaveCount(0);
});

test('intensità: Morbido predefinito, Nessuno toglie il colore, Deciso; vale anche sull’altro dispositivo', async ({ browser }, info) => {
  const p = await apri(await browser.newContext(TELEFONO));
  await caricaDati(p, datiFaccende());
  const neutra = await sfondo(carta(p, 'Sviluppo'));
  await expect(p.locator('html')).toHaveAttribute('data-intensita', 'morbida');
  const morbida = await sfondo(carta(p, 'Lenzuola'));
  expect(morbida).not.toBe(neutra);

  await apriMenu(p);
  await expect(p.locator('.opzione[data-intensita="morbida"]')).toHaveAttribute('aria-pressed', 'true');
  await p.click('.opzione[data-intensita="nessuna"]');
  await expect(p.locator('.opzione[data-intensita="nessuna"]')).toHaveAttribute('aria-pressed', 'true');
  await chiudiMenu(p);
  await expect.poll(() => sfondo(carta(p, 'Lenzuola'))).toBe(neutra);             // solo il testo
  await expect(carta(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta il 21 settembre · ogni 7 giorni · giro aperto dal 28 settembre');

  await apriMenu(p);
  await p.click('.opzione[data-intensita="decisa"]');
  await chiudiMenu(p);
  await expect.poll(() => sfondo(carta(p, 'Lenzuola'))).not.toBe(morbida);
  await p.reload();
  await expect(p.locator('html')).toHaveAttribute('data-intensita', 'decisa');      // resta

  const pc = await apri(await browser.newContext());
  await unisciFile(pc, await salvaFile(p, info.outputPath('tel.json')));
  await expect(pc.locator('html')).toHaveAttribute('data-intensita', 'decisa');     // e viaggia con il file
});

test('riposo oggi: le schede si ammorbidiscono, il conteggio non cambia, e una scheda fatta resta verde', async ({ browser }) => {
  const p = await apri(await browser.newContext(TELEFONO));
  await caricaDati(p, datiFaccende());
  await carta(p, 'Lavatrice').locator('input[type=checkbox]').check();
  await p.check('#riposo-giorno');
  await expect(p.locator('.giornata')).toHaveAttribute('data-riposo', '');
  await expect(carta(p, 'Lenzuola')).toHaveAttribute('data-riposo', '');
  await expect(carta(p, 'Lenzuola')).not.toHaveAttribute('data-calore');
  await expect(carta(p, 'Sviluppo')).toHaveAttribute('data-riposo', '');             // tutte, non solo le faccende
  await expect(carta(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta il 21 settembre · ogni 7 giorni · giro aperto dal 28 settembre');
  await expect(carta(p, 'Lavatrice')).toHaveAttribute('data-fatto', '');
  await expect(carta(p, 'Lavatrice')).not.toHaveAttribute('data-riposo');
  // anche in Casa
  await vaiA(p, 'casa');
  await expect(faccenda(p, 'Lenzuola')).toHaveAttribute('data-riposo', '');
  await expect(faccenda(p, 'Lenzuola')).not.toHaveAttribute('data-calore');
  // un altro giorno, non di riposo: il calore torna
  await vaiA(p, 'settimana');
  await p.click('.giorno[data-giorno="0"]');
  await expect(carta(p, 'Lenzuola')).toHaveAttribute('data-calore', '');
});

test('computer: riposo oggi toglie il calore ai nomi, e la tabella resta intatta', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, datiFaccende());
  await p.check('#piede-tabella input.riposo[data-giorno="2"]');
  await expect(nomeInTabella(p, 'Lenzuola')).not.toHaveAttribute('data-calore');
  const display = await p.locator('#piede-tabella td').evaluateAll((tds) => tds.map((td) => getComputedStyle(td).display));
  expect(new Set(display)).toEqual(new Set(['table-cell']));
  await p.uncheck('#piede-tabella input.riposo[data-giorno="2"]');
  await expect(nomeInTabella(p, 'Lenzuola')).toHaveAttribute('data-calore', '');
});

test('tema: Scuro e Chiaro valgono su questo dispositivo e restano; Automatico segue il sistema', async ({ browser }) => {
  const contesto = await browser.newContext({ colorScheme: 'dark' });
  const p = await apri(contesto);
  const scheda = () => p.evaluate(() => getComputedStyle(document.querySelector('.scheda')).backgroundColor);
  expect(await scheda()).toBe('rgb(32, 43, 39)');                                   // il sistema è scuro
  await apriMenu(p);
  await expect(p.locator('#scelte-tema [data-tema="auto"]')).toHaveAttribute('aria-pressed', 'true');
  await p.click('#scelte-tema [data-tema="chiaro"]');
  await expect(p.locator('html')).toHaveAttribute('data-tema', 'chiaro');
  await expect(p.locator('#scelte-tema [data-tema="chiaro"]')).toBeFocused();
  await chiudiMenu(p);
  expect(await scheda()).toBe('rgb(255, 253, 248)');
  expect(await p.locator('meta[name="theme-color"]').evaluateAll((m) => m.map((x) => x.content))).toEqual(['#f8f3e9', '#f8f3e9']);
  await p.reload();
  await expect(p.locator('html')).toHaveAttribute('data-tema', 'chiaro');            // resta, anche prima di disegnare
  await apriMenu(p);
  await p.click('#scelte-tema [data-tema="auto"]');
  await expect(p.locator('html')).not.toHaveAttribute('data-tema');
  expect(await scheda()).toBe('rgb(32, 43, 39)');
  // un altro dispositivo non ne sa niente
  const altro = await apri(await browser.newContext({ colorScheme: 'light' }));
  await expect(altro.locator('html')).not.toHaveAttribute('data-tema');
});

test('salto: il conteggio riparte, l’ultima volta resta vera, si può annullare; nei giorni dopo resta scritto', async ({ browser }) => {
  const contesto = await browser.newContext(TELEFONO);
  const p = await apri(contesto);
  await caricaDati(p, datiFaccende());
  await vaiA(p, 'casa');
  expect(await calore(faccenda(p, 'Lenzuola'))).toBe(1);
  await faccenda(p, 'Lenzuola').getByRole('button', { name: 'Salto questo giro di Lenzuola' }).click();
  await expect(faccenda(p, 'Lenzuola')).toContainText('Giro saltato oggi.');
  await expect(faccenda(p, 'Lenzuola')).toContainText('Fatta il 21 settembre');
  await expect(faccenda(p, 'Lenzuola').getByRole('button', { name: /Salto questo giro/ })).toHaveCount(0);
  await expect(faccenda(p, 'Lenzuola').getByRole('button', { name: 'Annulla il salto di Lenzuola' })).toBeFocused();
  expect(await calore(faccenda(p, 'Lenzuola'))).toBe(0);
  await vaiA(p, 'settimana');
  await expect(carta(p, 'Lenzuola').locator('.riga-cadenza')).toHaveText('Fatta il 21 settembre · giro saltato oggi · ogni 7 giorni · prossimo giro: mercoledì 21 ottobre');

  // annullare: torna com'era
  await vaiA(p, 'casa');
  await faccenda(p, 'Lenzuola').getByRole('button', { name: 'Annulla il salto di Lenzuola' }).click();
  await expect(faccenda(p, 'Lenzuola')).not.toContainText('Giro saltato');
  expect(await calore(faccenda(p, 'Lenzuola'))).toBe(1);

  // di nuovo, e poi si guarda domani e dopodomani (stessa memoria, orologio più avanti)
  await faccenda(p, 'Lenzuola').getByRole('button', { name: 'Salto questo giro di Lenzuola' }).click();
  const domani = await apri(contesto, new Date(2026, 9, 15, 10, 0));
  await vaiA(domani, 'casa');
  await expect(faccenda(domani, 'Lenzuola')).toContainText('Giro saltato ieri.');
  await expect(faccenda(domani, 'Lenzuola')).toContainText('Fatta il 21 settembre');
  const dopo = await apri(contesto, new Date(2026, 9, 16, 10, 0));
  await vaiA(dopo, 'casa');
  await expect(faccenda(dopo, 'Lenzuola')).toContainText('Giro saltato mercoledì 14 ottobre.');
});

test('fatta oggi: niente «Salto questo giro»', async ({ browser }) => {
  const p = await apri(await browser.newContext(TELEFONO));
  await caricaDati(p, datiFaccende());
  await carta(p, 'Bagno').locator('input[type=checkbox]').check();
  await vaiA(p, 'casa');
  await expect(faccenda(p, 'Bagno')).toContainText('Fatta oggi');
  await expect(faccenda(p, 'Bagno').getByRole('button', { name: /Salto/ })).toHaveCount(0);
  await expect(faccenda(p, 'Lenzuola').getByRole('button', { name: /Salto/ })).toHaveCount(1);
});

test.describe('le parole', () => {
  // Le regole del documento funzionale: niente rosso, niente parole di colpa, nessuna frase che rassicura
  test('nessuna parola di colpa in nessuna sezione', async ({ browser }) => {
    const p = await apri(await browser.newContext(TELEFONO));
    await caricaDati(p, datiFaccende());
    const testi = [];
    for (const s of ['settimana', 'casa', 'dati']) { await vaiA(p, s); testi.push(await p.locator('body').innerText()); }
    await apriMenu(p);
    testi.push(await p.locator('#menu').innerText());
    for (const parola of ['in ritardo', 'scadut', 'dimentica', 'devi ', 'dovresti', 'non preoccuparti', 'con calma']) {
      expect(testi.join('\n').toLowerCase(), parola).not.toContain(parola);
    }
  });
});

