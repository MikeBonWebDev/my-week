// Test nel browser delle sezioni (Settimana, Casa) e della sezione Casa: faccende, cadenza, «Aggiungi a questa settimana».
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js). Nei dati di prova (strumenti/seme.js):
// Chitarra segnata lunedì 12 ottobre, Cucinare lunedì 5 ottobre, Camminare martedì 29 settembre, Leggere mai.
'use strict';
const { test, expect } = require('./aiuti');   // non da '@playwright/test': vedi `test` in aiuti.js
const { creaSeme } = require('../strumenti/seme.js');
const { apri, caricaDati, nomi, apriMenu, salvaFile, unisciFile, telefono } = require('./aiuti');


// Piccoli aiuti per la sezione Casa
const vai = (p, nome) => p.click(`.sezione-voce[data-sezione="${nome}"]`);
const faccenda = (p, nome) => p.locator('.faccenda', { has: p.locator('h2', { hasText: new RegExp(`^${nome}$`) }) });
const titoliFaccende = (p) => p.locator('.faccenda h2').allTextContents();
const scelta = (p, testo) => p.locator('#foglio-faccenda .scelta', { hasText: testo });
const salva = (p) => p.locator('#salva-faccenda');

/** Dalla sezione Casa: «Aggiungi una faccenda» → una voce (o un nome nuovo) → una cadenza → Salva. */
async function nuovaFaccenda(p, { voce, nome, cadenza = 'Ogni 2 settimane', giorni }) {
  await p.click('#nuova-faccenda');
  if (voce) await scelta(p, new RegExp(`^${voce}$`)).click();
  if (nome) await p.fill('#nome-faccenda', nome);
  if (giorni) { await scelta(p, 'Personalizzato').click(); await p.fill('#giorni-faccenda', String(giorni)); }
  else await scelta(p, cadenza).click();
  await salva(p).click();
  await expect(p.locator('#foglio-faccenda')).toBeHidden();
}

test('le sezioni: colonna a sinistra, titolo e sottotitolo cambiano, e l’app riapre dove l’avevi lasciata', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  const colonna = await p.locator('#sezioni').boundingBox();
  expect(colonna.x).toBe(0);
  expect(colonna.height).toBeGreaterThan(600);                                // alta quanto la finestra
  await expect(p.locator('.sezione-voce[data-sezione="settimana"]')).toHaveAttribute('aria-current', 'page');
  await expect(p.locator('#titolo-sezione')).toHaveText('La mia settimana');
  await expect(p.locator('#sottotitolo')).toHaveText('Le attività della settimana, giorno per giorno.');

  await vai(p, 'casa');
  await expect(p.locator('#titolo-sezione')).toHaveText('Casa');
  await expect(p.locator('#sottotitolo')).toHaveText('Le faccende con una cadenza.');
  await expect(p.locator('#sezione-settimana')).toBeHidden();
  await expect(p.locator('.sezione-voce[data-sezione="casa"]')).toHaveAttribute('aria-current', 'page');
  await expect(p.locator('.sezione-voce[data-sezione="settimana"]')).not.toHaveAttribute('aria-current');
  await expect(p.locator('#casa-vuota')).toHaveText('Ancora nessuna faccenda.');

  await p.reload();
  await expect(p.locator('#titolo-sezione')).toHaveText('Casa');              // riapre su Casa
  await vai(p, 'settimana');
  await expect(p.locator('#tabella')).toBeVisible();
  expect(p.errori).toEqual([]);
});

test('una faccenda da una voce che usi già: l’ultima volta viene dalle spunte, anche di settimane passate', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, creaSeme());
  await vai(p, 'casa');
  await p.click('#nuova-faccenda');
  // le voci della libreria, in ordine alfabetico; il numero dei giorni è bloccato finché non scegli «Personalizzato»
  expect(await p.locator('#voci-libere .scelta').allTextContents())
    .toEqual(['Camminare', 'Chitarra', 'Città nuova', 'Cucinare', 'Diario', 'Esame', 'Leggere', 'Sviluppo']);
  await expect(p.locator('#giorni-faccenda')).toBeDisabled();
  await expect(salva(p)).toBeDisabled();                                        // manca la voce
  await scelta(p, /^Cucinare$/).click();
  await expect(scelta(p, /^Cucinare$/)).toHaveAttribute('aria-pressed', 'true');
  await expect(scelta(p, 'Ogni 2 settimane · 14 giorni')).toHaveAttribute('aria-pressed', 'true');   // predefinita
  await scelta(p, 'Ogni settimana · 7 giorni').click();
  await salva(p).click();

  await expect(faccenda(p, 'Cucinare')).toContainText('Fatta il 5 ottobre');
  await expect(faccenda(p, 'Cucinare')).toContainText('Ogni 7 giorni');
  await expect(p.locator('#stato')).toContainText('«Cucinare»: ogni 7 giorni.');

  // una voce mai segnata
  await nuovaFaccenda(p, { voce: 'Leggere', cadenza: 'Ogni mese' });
  await expect(faccenda(p, 'Leggere')).toContainText('Mai segnata');
  await expect(faccenda(p, 'Leggere')).toContainText('Ogni 30 giorni');
  // ormai sono faccende: non sono più tra le voci da scegliere
  await p.click('#nuova-faccenda');
  await expect(scelta(p, /^Cucinare$/)).toHaveCount(0);
  await p.keyboard.press('Escape');
  expect(p.errori).toEqual([]);
});

test('un nome nuovo, «Personalizzato» e i valori non validi', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await vai(p, 'casa');
  await p.click('#nuova-faccenda');
  await p.fill('#nome-faccenda', 'Pulire i vetri');
  await scelta(p, 'Personalizzato').click();
  await expect(p.locator('#giorni-faccenda')).toBeEnabled();
  await expect(p.locator('#giorni-faccenda')).toBeFocused();
  for (const v of ['0', '400', '', '2.5', '-3']) {
    await p.fill('#giorni-faccenda', v);
    await expect(salva(p), `giorni = «${v}»`).toBeDisabled();
    await expect(p.locator('#nota-faccenda')).toHaveText('Un numero intero, da 1 a 365.');
  }
  await p.fill('#giorni-faccenda', '15');
  await expect(p.locator('#nota-faccenda')).toHaveText('');
  await p.press('#giorni-faccenda', 'Enter');                                   // Invio salva
  await expect(faccenda(p, 'Pulire i vetri')).toContainText('Ogni 15 giorni');
  await expect(faccenda(p, 'Pulire i vetri')).toContainText('Mai segnata');

  // lo stesso nome (maiuscole e spazi non contano): non si duplica e la cadenza non cambia
  await p.click('#nuova-faccenda');
  await p.fill('#nome-faccenda', '  pulire I VETRI ');
  await scelta(p, 'Ogni settimana').click();
  await expect(salva(p)).toBeDisabled();
  await expect(p.locator('#nota-faccenda')).toHaveText('«Pulire i vetri» è già in Casa, ogni 15 giorni. La cadenza si cambia dalla sua scheda.');
  await p.click('#annulla-faccenda');
  expect(await titoliFaccende(p)).toEqual(['Pulire i vetri']);
  await expect(faccenda(p, 'Pulire i vetri')).toContainText('Ogni 15 giorni');

  // nella settimana non è comparsa: una faccenda nuova non entra da sola nella lista
  await vai(p, 'settimana');
  expect(await nomi(p)).toEqual([]);
});

test('cadenza: si cambia dalla scheda, e togliendola la voce esce da Casa', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, creaSeme());
  await vai(p, 'casa');
  await nuovaFaccenda(p, { voce: 'Camminare' });
  await faccenda(p, 'Camminare').getByRole('button', { name: 'Cadenza di Camminare' }).click();
  await expect(p.locator('#titolo-faccenda')).toHaveText('Cadenza di «Camminare»');
  await expect(p.locator('#gruppo-voci')).toBeHidden();
  await expect(scelta(p, 'Ogni 2 settimane')).toHaveAttribute('aria-pressed', 'true');
  await scelta(p, 'Personalizzato').click();
  await p.fill('#giorni-faccenda', '10');
  await salva(p).click();
  await expect(faccenda(p, 'Camminare')).toContainText('Ogni 10 giorni');

  // riaprendo, una cadenza che non è tra le predefinite apre su «Personalizzato»
  await faccenda(p, 'Camminare').getByRole('button', { name: 'Cadenza di Camminare' }).click();
  await expect(scelta(p, 'Personalizzato')).toHaveAttribute('aria-pressed', 'true');
  await expect(p.locator('#giorni-faccenda')).toHaveValue('10');
  await p.click('#togli-cadenza');
  await expect(p.locator('#stato')).toContainText('«Camminare» non ha più una cadenza.');
  await expect(faccenda(p, 'Camminare')).toHaveCount(0);
  await p.click('#nuova-faccenda');
  await expect(scelta(p, /^Camminare$/)).toHaveCount(1);                        // è tornata tra le voci libere
});

test('«+ Aggiungi a questa settimana»: la faccenda entra nella lista, e la scheda lo dice', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await vai(p, 'casa');
  await nuovaFaccenda(p, { nome: 'Pulizia bagno' });
  await faccenda(p, 'Pulizia bagno').getByRole('button', { name: '+ Aggiungi a questa settimana' }).click();
  await expect(faccenda(p, 'Pulizia bagno')).toContainText('Già in questa settimana');
  await expect(faccenda(p, 'Pulizia bagno').getByRole('button', { name: '+ Aggiungi a questa settimana' })).toHaveCount(0);
  await expect(faccenda(p, 'Pulizia bagno').getByRole('button', { name: 'Cadenza di Pulizia bagno' })).toBeFocused();
  await vai(p, 'settimana');
  expect(await nomi(p)).toEqual(['Pulizia bagno']);
  // segnata oggi, in Casa risulta «Fatta oggi»
  await p.locator('#corpo-tabella input[type=checkbox][data-giorno="2"]').check();
  await vai(p, 'casa');
  await expect(faccenda(p, 'Pulizia bagno')).toContainText('Fatta oggi');
});

test('l’ordine di Casa: chi è più oltre la cadenza prima; non si muove mentre la guardi', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await caricaDati(p, creaSeme());
  await vai(p, 'casa');
  await nuovaFaccenda(p, { voce: 'Chitarra', cadenza: 'Ogni settimana' });      // 2 giorni su 7
  await nuovaFaccenda(p, { voce: 'Camminare', cadenza: 'Ogni settimana' });     // 15 giorni su 7
  await nuovaFaccenda(p, { voce: 'Leggere', cadenza: 'Ogni settimana' });       // mai
  expect(await titoliFaccende(p)).toEqual(['Chitarra', 'Camminare', 'Leggere']);   // nell'ordine in cui le hai aggiunte
  await vai(p, 'settimana');
  await vai(p, 'casa');                                                          // riaprendo, si riordina
  expect(await titoliFaccende(p)).toEqual(['Camminare', 'Chitarra', 'Leggere']);
});

test('tastiera: il foglio prende il fuoco, Esc lo chiude, il fuoco torna al pulsante', async ({ browser }) => {
  const p = await apri(await browser.newContext());
  await vai(p, 'casa');
  await p.focus('#nuova-faccenda');
  await p.keyboard.press('Enter');
  await expect(p.locator('#foglio-faccenda')).toBeVisible();
  expect(await p.evaluate(() => document.activeElement.closest('#foglio-faccenda') !== null)).toBe(true);
  await p.keyboard.press('Escape');
  await expect(p.locator('#foglio-faccenda')).toBeHidden();
  await expect(p.locator('#nuova-faccenda')).toBeFocused();
});

test('una faccenda creata sul telefono arriva sul computer con il file', async ({ browser }, info) => {
  const tel = await apri(await browser.newContext(telefono()));
  await vai(tel, 'casa');
  await nuovaFaccenda(tel, { nome: 'Lenzuola', giorni: 15 });
  const file = await salvaFile(tel, info.outputPath('tel.json'));
  const pc = await apri(await browser.newContext());
  await unisciFile(pc, file);
  await vai(pc, 'casa');
  await expect(faccenda(pc, 'Lenzuola')).toContainText('Ogni 15 giorni');
});

test('finestra media (700 px): colonna e contenuto restano affiancati, la tabella abbrevia i giorni', async ({ browser }) => {
  const p = await apri(await browser.newContext({ viewport: { width: 700, height: 900 } }));
  const colonna = await p.locator('#sezioni').boundingBox();
  const contenuto = await p.locator('main').boundingBox();
  expect(contenuto.x).toBeGreaterThanOrEqual(colonna.x + colonna.width);   // accanto, non sotto
  expect(contenuto.y).toBeLessThan(100);
  await expect(p.locator('thead th[data-col="2"] .corto')).toBeVisible();   // «Mer» invece di «Mercoledì»
  expect(await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBe(0);
});

test.describe('telefono', () => {
  test('la barra in basso: sempre visibile, l’avviso le sta sopra, il menu le passa davanti', async ({ browser }) => {
    const p = await apri(await browser.newContext(telefono()));
    const barra = await p.locator('#sezioni').boundingBox();
    expect(Math.round(barra.y + barra.height)).toBe(844);                        // appoggiata al fondo
    await expect(p.locator('.marchio')).toBeHidden();
    await vai(p, 'casa');
    await nuovaFaccenda(p, { nome: 'Pulizia bagno' });
    const avviso = await p.locator('#stato').boundingBox();
    expect(avviso.y + avviso.height).toBeLessThanOrEqual(barra.y);
    await apriMenu(p);
    const menu = await p.locator('#menu').boundingBox();
    expect(Math.round(menu.y + menu.height)).toBe(844);                          // il menu copre la barra
  });

  for (const [larghezza, schema] of [[320, 'light'], [360, 'dark'], [390, 'light']]) {
    test(`${larghezza} px, tema ${schema}: niente scorrimento di lato, in nessuna delle due sezioni`, async ({ browser }) => {
      const p = await apri(await browser.newContext({ ...telefono(), viewport: { width: larghezza, height: 740 }, colorScheme: schema }));
      await caricaDati(p, creaSeme());
      const largo = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(await largo()).toBe(0);
      await vai(p, 'casa');
      await nuovaFaccenda(p, { voce: 'Cucinare' });
      expect(await largo()).toBe(0);
      expect(p.errori).toEqual([]);
    });
  }
});
