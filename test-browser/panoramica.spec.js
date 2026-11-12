// Test nel browser della Panoramica: la prima sezione, che si apre all'avvio. Una card per sezione accesa, in ordine
// fisso, con «aperta…» da questo dispositivo; un solo controllo per card; tornando da una sezione il fuoco va sulla
// sua card (PIANO.md §3.5). Oggi, per i test, è mercoledì 14 ottobre 2026 (aiuti.js).
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import { apri, apriMenu, chiudiMenu, conSezioneFinta, telefono, vaiA } from './aiuti.js';

const card = (p) => p.locator('#card-sezioni .card-sezione');
const sezioniDelleCard = (p) => p.locator('#card-sezioni .apri-card').evaluateAll((bb) => bb.map((b) => b.dataset.sezione));
const piede = (p, nome) => p.locator('.card-sezione', { has: p.locator(`.apri-card[data-sezione="${nome}"]`) }).locator('.piede-card');

test('all’avvio si apre la Panoramica: la data di oggi, una card per sezione, nell’ordine fisso, senza Dati', async ({ browser }) => {
  const p = await apri(await browser.newContext(), undefined, { panoramica: true });
  await expect(p.locator('#titolo-sezione')).toHaveText('Panoramica');
  await expect(p.locator('#sottotitolo')).toHaveText('Mercoledì 14 ottobre');
  await expect(p.locator('#sezioni .sezione-voce[data-sezione="panoramica"]')).toHaveAttribute('aria-current', 'page');
  await expect(p).toHaveTitle('Panoramica · La mia settimana');
  expect(await sezioniDelleCard(p)).toEqual(['settimana', 'casa']);
  // il titolo di ogni card è il nome breve della sezione, quello della barra; un h2 per card
  expect(await p.locator('#card-sezioni h2').allTextContents()).toEqual(['Settimana›', 'Casa›']);
  await expect(piede(p, 'settimana')).toHaveText('mai aperta su questo dispositivo');
  // nessuna azione dentro una card: un solo controllo, il pulsante che apre la sezione
  for (const c of await card(p).all()) await expect(c.locator('button, a, input, select, textarea, [tabindex]')).toHaveCount(1);
  await expect(p.locator('.apri-card[data-sezione="casa"]')).toHaveAccessibleName('Casa');
  await expect(p.locator('.apri-card[data-sezione="casa"]')).toHaveAccessibleDescription('mai aperta su questo dispositivo');
  expect(p.errori).toEqual([]);
});

test('una card si apre toccandola ovunque; tornando, dice «aperta oggi» e il fuoco è su di lei', async ({ browser }) => {
  const p = await apri(await browser.newContext(), undefined, { panoramica: true });
  // non sul titolo: sul fondo della card (il velo del pulsante copre tutta la card, quindi si tocca un punto, non il piede)
  const fondo = await piede(p, 'casa').boundingBox();
  await p.mouse.click(fondo.x + fondo.width / 2, fondo.y + fondo.height / 2);
  await expect(p.locator('#titolo-sezione')).toHaveText('Casa');
  await vaiA(p, 'panoramica');
  await expect(piede(p, 'casa')).toHaveText('aperta oggi');
  await expect(piede(p, 'settimana')).toHaveText('mai aperta su questo dispositivo');
  await expect(p.locator('.apri-card[data-sezione="casa"]')).toBeFocused();
  // da tastiera: Invio sulla card apre la sezione
  await p.locator('.apri-card[data-sezione="settimana"]').press('Enter');
  await expect(p.locator('#titolo-sezione')).toHaveText('La mia settimana');
  expect(p.errori).toEqual([]);
});

test('«aperta…» con date di calendario: ieri, il nome del giorno entro la settimana, poi la data', async ({ browser }) => {
  const contesto = await conSezioneFinta(await browser.newContext(), [['orto', 'Orto'], ['serra', 'Serra']]);
  await contesto.addInitScript(() => {
    if (!localStorage.getItem('settimana:aperta')) {
      localStorage.setItem('settimana:aperta', JSON.stringify({
        settimana: '2026-10-13', casa: '2026-10-12', orto: '2026-09-08', serra: '2026-10-01',
      }));
    }
  });
  const p = await apri(contesto, undefined, { panoramica: true });
  expect(await sezioniDelleCard(p)).toEqual(['settimana', 'casa', 'orto', 'serra']);
  await expect(piede(p, 'settimana')).toHaveText('aperta ieri');
  await expect(piede(p, 'casa')).toHaveText('aperta lunedì');
  await expect(piede(p, 'orto')).toHaveText('aperta l’8 settembre');
  await expect(piede(p, 'serra')).toHaveText('aperta il 1° ottobre');
  // le righe vengono dalla sezione (qui quelle finte), solo testo
  await expect(p.locator('.card-sezione', { has: p.locator('[data-sezione="orto"]') }).locator('.righe-card li')).toHaveText(['Le piante.']);
  // nel registro non c'è niente: «aperta…» vale per questo dispositivo
  expect(await p.evaluate(() => localStorage.getItem('settimana:registro') ?? '')).not.toContain('aperta');
  expect(p.errori).toEqual([]);
});

test('a mezzanotte, con la pagina aperta, la Panoramica si ridisegna: un altro giorno, «aperta ieri»', async ({ browser }) => {
  const p = await apri(await browser.newContext(), undefined, { panoramica: true });
  await vaiA(p, 'casa');
  await vaiA(p, 'panoramica');
  await expect(piede(p, 'casa')).toHaveText('aperta oggi');
  await p.clock.fastForward('24:00:00');                                   // il giorno dopo, alle dieci
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));        // la pagina torna in primo piano
  await expect(p.locator('#sottotitolo')).toHaveText('Giovedì 15 ottobre');
  await expect(piede(p, 'casa')).toHaveText('aperta ieri');
  expect(p.errori).toEqual([]);
});

test('una sezione spenta non ha card; riaccesa, la card torna al suo posto', async ({ browser }) => {
  const p = await apri(await conSezioneFinta(await browser.newContext()), undefined, { panoramica: true });
  expect(await sezioniDelleCard(p)).toEqual(['settimana', 'casa', 'orto']);
  await apriMenu(p);
  await p.locator('#scelte-sezioni input[data-sezione="orto"]').uncheck();
  await chiudiMenu(p);
  expect(await sezioniDelleCard(p)).toEqual(['settimana', 'casa']);
  await apriMenu(p);
  await p.locator('#scelte-sezioni input[data-sezione="orto"]').check();
  await chiudiMenu(p);
  expect(await sezioniDelleCard(p)).toEqual(['settimana', 'casa', 'orto']);
  expect(p.errori).toEqual([]);
});

test('telefono: card in colonna larghe quanto la pagina, data visibile, nessuno scorrimento orizzontale a 320 px', async ({ browser }) => {
  const contesto = await conSezioneFinta(await browser.newContext({ ...telefono(), viewport: { width: 320, height: 640 } }),
    [['orto', 'Orto'], ['serra', 'Serra']]);
  await contesto.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => { document.documentElement.style.fontSize = '22px'; });
  });
  const p = await apri(contesto, undefined, { panoramica: true });
  await expect(p.locator('#sottotitolo')).toBeVisible();
  const larghezze = await card(p).evaluateAll((cc) => cc.map((c) => Math.round(c.getBoundingClientRect().width)));
  const pagina = await p.locator('#card-sezioni').evaluate((l) => Math.round(l.getBoundingClientRect().width));
  expect(new Set(larghezze)).toEqual(new Set([pagina]));                    // una colonna sola
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(p.locator('#apri-dati')).toBeVisible();
  expect(p.errori).toEqual([]);
});
