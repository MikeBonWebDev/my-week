// Test nel browser della navigazione: sul computer la colonna con tutte le sezioni; sul telefono la barra con tre
// posti (la Panoramica, fissa, più due scelti) e «Altro», oppure il ventaglio (Impostazioni, «Menu del telefono»).
// Dati non c'è: sta in alto, accanto all'ingranaggio. Le sezioni oltre le tre di oggi sono finte, «Orto» e «Serra»
// (conSezioneFinta in aiuti.js): arriveranno Cucina e Spese.
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import { creaSeme } from '../strumenti/seme.js';
import { apri, apriMenu, caricaDati, chiudiMenu, conSezioneFinta, ricarica, telefono, vaiA } from './aiuti.js';

const FINTE = [['orto', 'Orto'], ['serra', 'Serra']];
const inBarra = (p) => p.locator('#sezioni .sezione-voce[data-sezione]:visible')
  .evaluateAll((bb) => bb.map((b) => b.dataset.sezione));
const sezioneAperta = (p) => p.locator('#titolo-sezione');
const apriTelefono = async (browser, finte = FINTE) => apri(await conSezioneFinta(await browser.newContext(telefono()), finte));

test('telefono: con cinque sezioni la barra ne tiene tre e «Altro» le altre; aperta da lì, «Altro» lo dice', async ({ browser }) => {
  const p = await apriTelefono(browser);
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'casa']);
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
  expect(await inBarra(quattro)).toEqual(['panoramica', 'settimana', 'casa', 'orto']);
  await expect(quattro.locator('#voce-altro')).toBeHidden();

  const p = await apriTelefono(browser);
  await apriMenu(p);
  await expect(p.locator('#scelte-barra')).toBeVisible();
  await p.locator('#scelte-sezioni input[data-sezione="orto"]').uncheck();   // quattro accese: ci stanno tutte
  await expect(p.locator('#scelte-barra')).toBeHidden();
  await chiudiMenu(p);
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'casa', 'serra']);
  await expect(p.locator('#voce-altro')).toBeHidden();
  expect([quattro.errori, p.errori]).toEqual([[], []]);
});

test('Impostazioni: le due sezioni accanto alla Panoramica si scelgono, valgono per questo dispositivo e restano', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await apriMenu(p);
  const casella = (nome) => p.locator(`#scelte-barra input[data-barra="${nome}"]`);
  // la Panoramica c'è sempre e non si sceglie; Dati sta in alto
  expect(await p.locator('#scelte-barra input[data-barra]').evaluateAll((cc) => cc.map((c) => c.dataset.barra)))
    .toEqual(['settimana', 'casa', 'orto', 'serra']);
  await expect(casella('orto')).toBeDisabled();                       // due già scelte: prima se ne toglie una
  await casella('casa').uncheck();
  await expect(casella('orto')).toBeEnabled();
  await casella('orto').check();
  await expect(casella('serra')).toBeDisabled();
  await chiudiMenu(p);
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'orto']);   // sempre nell'ordine delle sezioni
  await p.click('#voce-altro');
  expect(await p.locator('#lista-altro [data-sezione]').evaluateAll((bb) => bb.map((b) => b.dataset.sezione)))
    .toEqual(['casa', 'serra']);
  await p.keyboard.press('Escape');

  await p.reload();
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'orto']);
  // un altro dispositivo non ne sa niente: la scelta non sta nel registro
  expect(await p.evaluate(() => localStorage.getItem('settimana:registro') ?? '')).not.toContain('barra');
  expect(p.errori).toEqual([]);
});

test('una sezione scelta per la barra e poi spenta lascia il posto alla prima che manca', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await p.evaluate(() => localStorage.setItem('settimana:barra', JSON.stringify(['orto', 'serra'])));
  await p.reload();
  expect(await inBarra(p)).toEqual(['panoramica', 'orto', 'serra']);
  await apriMenu(p);
  await p.locator('#scelte-sezioni input[data-sezione="serra"]').uncheck();
  await p.locator('#scelte-sezioni input[data-sezione="orto"]').uncheck();
  await chiudiMenu(p);
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'casa']);
  expect(p.errori).toEqual([]);
});

test('la scelta salvata prima della Panoramica (tre posti, con Dati) vale ancora: restano le due sezioni', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await p.evaluate(() => localStorage.setItem('settimana:barra', JSON.stringify(['settimana', 'orto', 'dati'])));
  await p.reload();
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'orto']);
  expect(p.errori).toEqual([]);
});

test('Dati sta in alto, con il puntino, con la barra e con il ventaglio; non è in «Altro» né tra i petali', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await caricaDati(p, creaSeme());                                     // in uso da più di 30 giorni, mai salvato
  await expect(p.locator('#apri-dati')).toBeVisible();
  await expect(p.locator('#puntino-dati')).toBeVisible();
  await expect(p.locator('#apri-dati')).toHaveAccessibleName('Dati, nuova copia consigliata');
  await p.click('#voce-altro');
  await expect(p.locator('#lista-altro [data-sezione="dati"]')).toHaveCount(0);
  await expect(p.locator('#lista-altro [id]')).toHaveCount(0);        // le copie non ripetono gli id
  await p.keyboard.press('Escape');

  await usaVentaglio(p);
  await p.click('#apri-ventaglio');
  await expect(p.locator('#ventaglio .petalo[data-sezione="dati"]')).toHaveCount(0);
  await p.keyboard.press('Escape');
  await vaiA(p, 'dati');
  await expect(sezioneAperta(p)).toHaveText('Dati');
  await expect(p.locator('#apri-dati')).toHaveAttribute('aria-current', 'page');
  expect(p.errori).toEqual([]);
});

const petali = (p) => p.locator('#ventaglio .petalo').evaluateAll((bb) => bb.map((b) => b.dataset.sezione));
async function usaVentaglio(p) {
  await apriMenu(p);
  await p.click('#scelte-menu-telefono [data-menu="ventaglio"]');
  await chiudiMenu(p);
}

test('ventaglio: il pulsante dice dove sei; aperto diventa «Chiudi», e il fuoco va sulla sezione aperta', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await apriMenu(p);
  await p.click('#scelte-menu-telefono [data-menu="ventaglio"]');
  await expect(p.locator('#scelte-menu-telefono [data-menu="ventaglio"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(p.locator('#scelte-barra')).toBeHidden();             // con il ventaglio non c'è una barra da scegliere
  await chiudiMenu(p);
  await expect(p.locator('#sezioni')).toBeHidden();
  const pulsante = p.locator('#apri-ventaglio');
  await expect(pulsante).toHaveText('Settimana');
  await expect(pulsante).toHaveAccessibleName('Sezioni, sezione aperta: Settimana');
  await expect(pulsante).toHaveAttribute('aria-expanded', 'false');

  await pulsante.click();
  await expect(p.locator('#velo-ventaglio')).toBeVisible();
  // un solo pulsante: lo stesso, che ora dice «Chiudi»
  await expect(p.locator('.pulsante-ventaglio:visible')).toHaveCount(1);
  await expect(pulsante).toHaveText('Chiudi');
  await expect(pulsante).toHaveAttribute('aria-expanded', 'true');
  expect(await petali(p)).toEqual(['panoramica', 'settimana', 'casa', 'orto', 'serra']);   // tutte, anche quelle fuori dalla barra
  await expect(p.locator('#ventaglio .petalo[data-sezione="settimana"]')).toBeFocused();
  await expect(p.locator('#ventaglio .petalo[data-sezione="settimana"]')).toHaveAttribute('aria-current', 'page');
  expect(await p.evaluate(() => document.querySelector('main').inert)).toBe(true);   // la pagina dietro non risponde

  // Tab gira tra i petali e il pulsante, senza uscire: dalla Settimana, quattro passi fino al pulsante, poi da capo
  for (let i = 0; i < 4; i++) await p.keyboard.press('Tab');
  await expect(pulsante).toBeFocused();
  await p.keyboard.press('Tab');
  await expect(p.locator('#ventaglio .petalo[data-sezione="panoramica"]')).toBeFocused();

  // Esc chiude, e il fuoco torna al pulsante (anche in Safari, che non dà il fuoco al tocco)
  await p.keyboard.press('Escape');
  await expect(p.locator('#velo-ventaglio')).toBeHidden();
  await expect(pulsante).toBeFocused();
  await expect(pulsante).toHaveText('Settimana');
  expect(await p.evaluate(() => document.querySelector('main').inert)).toBe(false);
  expect(p.errori).toEqual([]);
});

test('ventaglio: scegliendo un petalo si cambia sezione; il velo e «Chiudi» chiudono; la scelta resta', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await usaVentaglio(p);
  const pulsante = p.locator('#apri-ventaglio');
  await pulsante.click();
  await p.locator('#ventaglio .petalo[data-sezione="orto"]').click();
  await expect(p.locator('#velo-ventaglio')).toBeHidden();
  await expect(sezioneAperta(p)).toHaveText('Orto');
  await expect(pulsante).toHaveText('Orto');

  await pulsante.click();                                             // «Chiudi»
  await expect(p.locator('#velo-ventaglio')).toBeVisible();
  await pulsante.click();
  await expect(p.locator('#velo-ventaglio')).toBeHidden();
  await pulsante.click();
  await p.mouse.click(20, 120);                                       // un tocco sul velo, lontano dai petali
  await expect(p.locator('#velo-ventaglio')).toBeHidden();
  await expect(sezioneAperta(p)).toHaveText('Orto');

  await p.reload();                                                   // vale per il dispositivo: resta il ventaglio
  await expect(pulsante).toBeVisible();
  await expect(pulsante).toHaveText('Panoramica');                    // e si riparte dalla Panoramica
  await expect(p.locator('#sezioni')).toBeHidden();
  expect(p.errori).toEqual([]);
});

test('ventaglio: su uno schermo stretto e con il carattere grande nessun petalo esce dallo schermo', async ({ browser }) => {
  // 320 px di larghezza (il telefono più stretto da considerare) e il carattere ingrandito come in Android
  const contesto = await conSezioneFinta(await browser.newContext({ ...telefono(), viewport: { width: 320, height: 640 } }), FINTE);
  await contesto.addInitScript(() => {
    localStorage.setItem('settimana:menu', 'ventaglio');
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '22px'; });
  });
  const p = await apri(contesto, undefined, { panoramica: true });   // con il ventaglio la barra non c'è
  await p.click('#apri-ventaglio');
  await expect(p.locator('#ventaglio .petalo')).toHaveCount(5);
  // a fine animazione: i rettangoli dei petali, a confronto con lo schermo
  await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  const fuori = await p.locator('#ventaglio .petalo').evaluateAll((bb) => bb.map((b) => b.getBoundingClientRect())
    .filter((r) => r.left < 0 || r.right > innerWidth || r.top < 0).length);
  expect(fuori).toBe(0);
  expect(p.errori).toEqual([]);
});

test('computer: tutte le sezioni nella colonna, niente «Altro», niente ventaglio né «Menu del telefono»', async ({ browser }) => {
  const p = await apri(await conSezioneFinta(await browser.newContext(), FINTE));
  await p.evaluate(() => localStorage.setItem('settimana:menu', 'ventaglio'));   // scelto, ma qui non conta
  await ricarica(p);
  expect(await inBarra(p)).toEqual(['panoramica', 'settimana', 'casa', 'orto', 'serra']);
  await expect(p.locator('#voce-altro')).toBeHidden();
  await expect(p.locator('#apri-ventaglio')).toBeHidden();
  await apriMenu(p);
  await expect(p.locator('#parte-menu-telefono')).toBeHidden();
  await chiudiMenu(p);
  await vaiA(p, 'serra');
  await expect(sezioneAperta(p)).toHaveText('Serra');
  expect(p.errori).toEqual([]);
});
