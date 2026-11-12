// Test nel browser delle Impostazioni: l'ingranaggio in alto a destra, e le sezioni accese o spente.
// Le sezioni che si spengono (Cucina, Spese) arrivano con la Fase 2: qui si prova con una sezione finta, «Orto»
// (conSezioneFinta in aiuti.js).
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import { apri, apriMenu, chiudiMenu, conSezioneFinta, salvaFile, unisciFile, vaiA } from './aiuti.js';

const voce = (p, nome) => p.locator(`.sezione-voce[data-sezione="${nome}"]`);
const casella = (p, nome) => p.locator(`#scelte-sezioni input[data-sezione="${nome}"]`);

test('l’ingranaggio apre le Impostazioni; senza sezioni da spegnere la parte «Sezioni» non c’è', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await expect(p.locator('#apri-menu')).toHaveAccessibleName('Impostazioni');
  await apriMenu(p);
  await expect(p.locator('#titolo-menu')).toHaveText('Impostazioni');
  await expect(p.locator('#parte-sezioni')).toBeHidden();
  await chiudiMenu(p);
  expect(p.errori).toEqual([]);
});

test('una sezione spenta sparisce dalla barra, non si riapre, e riaccesa torna com’era', async ({ browser }) => {
  const contesto = await conSezioneFinta(await browser.newContext());
  const p = await apri(contesto);
  await vaiA(p, 'orto');
  await expect(p.locator('#titolo-sezione')).toHaveText('Orto');

  await apriMenu(p);
  await expect(p.locator('#parte-sezioni')).toBeVisible();
  await expect(casella(p, 'orto')).toBeChecked();
  await casella(p, 'orto').uncheck();                                   // spenta mentre era aperta
  await chiudiMenu(p);
  await expect(voce(p, 'orto')).toBeHidden();
  await expect(voce(p, 'settimana')).toHaveAttribute('aria-current', 'page');   // si passa alla prima accesa
  await expect(p.locator('#sezione-orto')).toBeHidden();

  // riaprendo l'app resta spenta, e non si riapre su di lei anche se era l'ultima aperta
  await p.evaluate(() => localStorage.setItem('settimana:sezione', 'orto'));
  await p.reload();
  await expect(voce(p, 'orto')).toBeHidden();
  await expect(voce(p, 'settimana')).toHaveAttribute('aria-current', 'page');

  await apriMenu(p);
  await casella(p, 'orto').check();                                     // riaccesa
  await chiudiMenu(p);
  await expect(voce(p, 'orto')).toBeVisible();
  await vaiA(p, 'orto');
  await expect(p.locator('#sezione-orto')).toHaveText('Le piante.');
  expect(p.errori).toEqual([]);
});

test('spenta su un dispositivo, spenta anche sull’altro dopo aver unito il file', async ({ browser }, info) => {
  const tel = await apri(await conSezioneFinta(await browser.newContext()));
  await apriMenu(tel);
  await casella(tel, 'orto').uncheck();
  await chiudiMenu(tel);
  const file = await salvaFile(tel, info.outputPath('tel.json'));

  const pc = await apri(await conSezioneFinta(await browser.newContext()));
  await expect(voce(pc, 'orto')).toBeVisible();
  await unisciFile(pc, file);
  await expect(voce(pc, 'orto')).toBeHidden();
  expect([tel.errori, pc.errori]).toEqual([[], []]);
});
