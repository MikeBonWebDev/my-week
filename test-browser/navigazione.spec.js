// Test nel browser della navigazione: sul computer la colonna con tutte le sezioni; sul telefono la barra con tre
// posti e «Altro», oppure il ventaglio (Impostazioni, «Menu del telefono»). Le sezioni oltre le tre di oggi sono
// finte, «Orto» e «Serra» (conSezioneFinta in aiuti.js): arriveranno Cucina e Spese.
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import { creaSeme } from '../strumenti/seme.js';
import { apri, apriMenu, caricaDati, chiudiMenu, conSezioneFinta, telefono, vaiA } from './aiuti.js';

const FINTE = [['orto', 'Orto'], ['serra', 'Serra']];
const inBarra = (p) => p.locator('#sezioni .sezione-voce[data-sezione]:visible')
  .evaluateAll((bb) => bb.map((b) => b.dataset.sezione));
const sezioneAperta = (p) => p.locator('#titolo-sezione');
const apriTelefono = async (browser, finte = FINTE) => apri(await conSezioneFinta(await browser.newContext(telefono()), finte));

test('telefono: con cinque sezioni la barra ne tiene tre e «Altro» le altre; aperta da lì, «Altro» lo dice', async ({ browser }) => {
  const p = await apriTelefono(browser);
  expect(await inBarra(p)).toEqual(['settimana', 'casa', 'dati']);
  await expect(p.locator('#voce-altro')).toBeVisible();
  await expect(p.locator('#voce-altro')).not.toHaveAttribute('data-attiva');

  await p.click('#voce-altro');
  await expect(p.locator('#foglio-altro')).toBeVisible();
  expect(await p.locator('#lista-altro [data-sezione]').evaluateAll((bb) => bb.map((b) => b.textContent.trim())))
    .toEqual(['Orto', 'Serra']);
  await p.locator('#lista-altro [data-sezione="serra"]').click();
  await expect(p.locator('#foglio-altro')).toBeHidden();
  await expect(sezioneAperta(p)).toHaveText('Serra');
  await expect(p.locator('#voce-altro')).toHaveAttribute('data-attiva', '');
  await expect(p.locator('#voce-altro')).toHaveAccessibleName('Altro, sezione aperta: Serra');

  // riaperto, il fuoco va sulla sezione aperta
  await p.click('#voce-altro');
  await expect(p.locator('#lista-altro [data-sezione="serra"]')).toBeFocused();
  await p.keyboard.press('Escape');
  await expect(p.locator('#foglio-altro')).toBeHidden();
  await expect(p.locator('#voce-altro')).toBeFocused();               // anche in Safari, che non dà il fuoco al tocco
  expect(p.errori).toEqual([]);
});

test('con quattro sezioni o meno «Altro» non c’è; spegnendone una, quella che era in Altro torna nella barra', async ({ browser }) => {
  const quattro = await apriTelefono(browser, [['orto', 'Orto']]);
  expect(await inBarra(quattro)).toEqual(['settimana', 'casa', 'dati', 'orto']);
  await expect(quattro.locator('#voce-altro')).toBeHidden();

  const p = await apriTelefono(browser);
  await apriMenu(p);
  await expect(p.locator('#scelte-barra')).toBeVisible();
  await p.locator('#scelte-sezioni input[data-sezione="orto"]').uncheck();   // quattro accese: ci stanno tutte
  await expect(p.locator('#scelte-barra')).toBeHidden();
  await chiudiMenu(p);
  expect(await inBarra(p)).toEqual(['settimana', 'casa', 'dati', 'serra']);
  await expect(p.locator('#voce-altro')).toBeHidden();
  expect([quattro.errori, p.errori]).toEqual([[], []]);
});

test('Impostazioni: le tre sezioni della barra si scelgono, valgono per questo dispositivo e restano', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await apriMenu(p);
  const casella = (nome) => p.locator(`#scelte-barra input[data-barra="${nome}"]`);
  await expect(casella('orto')).toBeDisabled();                       // tre già scelte: prima se ne toglie una
  await casella('dati').uncheck();
  await expect(casella('orto')).toBeEnabled();
  await casella('orto').check();
  await expect(casella('serra')).toBeDisabled();
  await chiudiMenu(p);
  expect(await inBarra(p)).toEqual(['settimana', 'casa', 'orto']);   // sempre nell'ordine delle sezioni
  await p.click('#voce-altro');
  expect(await p.locator('#lista-altro [data-sezione]').evaluateAll((bb) => bb.map((b) => b.dataset.sezione)))
    .toEqual(['dati', 'serra']);
  await p.keyboard.press('Escape');

  await p.reload();
  expect(await inBarra(p)).toEqual(['settimana', 'casa', 'orto']);
  // un altro dispositivo non ne sa niente: la scelta non sta nel registro
  expect(await p.evaluate(() => localStorage.getItem('settimana:registro') ?? '')).not.toContain('barra');
  expect(p.errori).toEqual([]);
});

test('una sezione scelta per la barra e poi spenta lascia il posto alla prima che manca', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await p.evaluate(() => localStorage.setItem('settimana:barra', JSON.stringify(['settimana', 'orto', 'serra'])));
  await p.reload();
  expect(await inBarra(p)).toEqual(['settimana', 'orto', 'serra']);
  await apriMenu(p);
  await p.locator('#scelte-sezioni input[data-sezione="serra"]').uncheck();
  await p.locator('#scelte-sezioni input[data-sezione="orto"]').uncheck();
  await chiudiMenu(p);
  expect(await inBarra(p)).toEqual(['settimana', 'casa', 'dati']);
  expect(p.errori).toEqual([]);
});

test('il puntino di Dati si vede su «Altro» quando Dati sta lì dentro', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await caricaDati(p, creaSeme());                                     // in uso da più di 30 giorni, mai salvato
  await expect(p.locator('#puntino-dati')).toBeVisible();
  await expect(p.locator('#voce-altro .puntino-altro')).toBeHidden();   // Dati è nella barra
  await p.evaluate(() => localStorage.setItem('settimana:barra', JSON.stringify(['settimana', 'casa', 'orto'])));
  await p.reload();
  await expect(p.locator('#voce-altro .puntino-altro')).toBeVisible();
  await p.click('#voce-altro');
  await expect(p.locator('#lista-altro [data-sezione="dati"] .puntino-dati')).toBeVisible();
  await expect(p.locator('#lista-altro [id]')).toHaveCount(0);        // le copie non ripetono gli id
  expect(p.errori).toEqual([]);
});

test('ventaglio: il pulsante dice dove sei; si apre sulla sezione aperta, Esc chiude, scegliendo si cambia sezione', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await apriMenu(p);
  await p.click('#scelte-menu-telefono [data-menu="ventaglio"]');
  await expect(p.locator('#scelte-menu-telefono [data-menu="ventaglio"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(p.locator('#scelte-barra')).toBeHidden();             // con il ventaglio non c'è una barra da scegliere
  await chiudiMenu(p);
  await expect(p.locator('#sezioni')).toBeHidden();
  const pulsante = p.locator('#apri-ventaglio');
  await expect(pulsante).toBeVisible();
  await expect(pulsante).toHaveText('Settimana');
  await expect(pulsante).toHaveAccessibleName('Sezioni, sezione aperta: Settimana');

  await pulsante.click();
  await expect(p.locator('#ventaglio')).toBeVisible();
  expect(await p.locator('#voci-ventaglio [data-sezione]').evaluateAll((bb) => bb.map((b) => b.dataset.sezione)))
    .toEqual(['settimana', 'casa', 'dati', 'orto', 'serra']);           // tutte, anche quelle fuori dalla barra
  await expect(p.locator('#voci-ventaglio [data-sezione="settimana"]')).toBeFocused();
  await p.keyboard.press('Escape');
  await expect(p.locator('#ventaglio')).toBeHidden();
  await expect(pulsante).toBeFocused();

  await pulsante.click();
  await p.locator('#voci-ventaglio [data-sezione="orto"]').click();
  await expect(p.locator('#ventaglio')).toBeHidden();
  await expect(sezioneAperta(p)).toHaveText('Orto');
  await expect(pulsante).toHaveText('Orto');

  // vale per il dispositivo: riaprendo resta il ventaglio
  await p.reload();
  await expect(p.locator('#apri-ventaglio')).toBeVisible();
  await expect(p.locator('#sezioni')).toBeHidden();
  expect(p.errori).toEqual([]);
});

test('computer: tutte le sezioni nella colonna, niente «Altro», niente ventaglio né «Menu del telefono»', async ({ browser }) => {
  const p = await apri(await conSezioneFinta(await browser.newContext(), FINTE));
  await p.evaluate(() => localStorage.setItem('settimana:menu', 'ventaglio'));   // scelto, ma qui non conta
  await p.reload();
  expect(await inBarra(p)).toEqual(['settimana', 'casa', 'dati', 'orto', 'serra']);
  await expect(p.locator('#voce-altro')).toBeHidden();
  await expect(p.locator('#apri-ventaglio')).toBeHidden();
  await apriMenu(p);
  await expect(p.locator('#parte-menu-telefono')).toBeHidden();
  await chiudiMenu(p);
  await vaiA(p, 'serra');
  await expect(sezioneAperta(p)).toHaveText('Serra');
  expect(p.errori).toEqual([]);
});
