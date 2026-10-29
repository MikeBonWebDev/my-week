// Test nel browser della vista a un giorno (telefono, sotto i 40rem di larghezza):
// striscia dei giorni, energia e riposo, aggiunta in alto, schede, menu dal basso.
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import { creaSeme } from '../strumenti/seme.js';
import {
  MERCOLEDI, LUNEDI_DOPO, apri, caricaDati, conferma, aggiungi, apriMenu, chiudiMenu, vaiA, salvaFile, unisciFile, foto, telefono,
} from './aiuti.js';

/** Apre l'app in un contesto "telefono". */
async function apriTelefono(browser, quando = MERCOLEDI, opzioni = {}) {
  return apri(await browser.newContext({ ...telefono(), ...opzioni }), quando);
}

// Piccoli aiuti per leggere la vista a un giorno
const nomiCarte = (p) => p.locator('#carte .nome-voce').allTextContents();
const carta = (p, nome) => p.locator('.carta', { has: p.locator('.nome-voce', { hasText: new RegExp(`^${nome}$`) }) });
const giorno = (p, i) => p.locator(`.giorno[data-giorno="${i}"]`);

test('sul telefono compare la vista a un giorno, aperta su oggi', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await expect(p.locator('.scheda')).toBeHidden();
  await expect(p.locator('#vista-giorno')).toBeVisible();
  await expect(p.locator('.giorno')).toHaveCount(7);
  expect(await p.locator('.giorno-nome').allTextContents()).toEqual(['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']);
  await expect(giorno(p, 2)).toHaveAttribute('aria-pressed', 'true');            // mercoledì 14: oggi
  await expect(p.locator('#titolo-giorno')).toHaveText('Mercoledì 14 ottobreoggi');
  await expect(giorno(p, 3)).toBeDisabled();                                     // giovedì: futuro
  expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('la riga per aggiungere sta sopra alle attività; i suggerimenti compaiono mentre la usi', async ({ browser }) => {
  const p = await apriTelefono(browser);
  // a settimana vuota i suggerimenti si vedono subito: è quando servono di più
  await expect(p.locator('#titolo-suggerimenti')).toHaveText('Per cominciare:');
  await aggiungi(p, 'Sviluppo');
  await aggiungi(p, 'Camminare');
  expect(await nomiCarte(p)).toEqual(['Sviluppo', 'Camminare']);
  // il campo viene prima delle schede, nell'ordine della pagina
  const primaDelleCarte = await p.evaluate(() =>
    Boolean(document.querySelector('#nuova-attivita').compareDocumentPosition(document.querySelector('#carte')) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(primaDelleCarte).toBe(true);

  await p.locator('#titolo-giorno').click();                     // esco dal campo
  await expect(p.locator('#suggerimenti')).toBeHidden();         // settimana non vuota: suggerimenti nascosti…
  await p.focus('#nuova-attivita');
  await expect(p.locator('#suggerimenti')).toBeVisible();        // …finché non usi il campo
  await p.locator('#voci-suggerite .chip', { hasText: 'Cucinare un pasto' }).click();
  expect(await nomiCarte(p)).toEqual(['Sviluppo', 'Camminare', 'Cucinare un pasto']);
  await expect(p.locator('#nuova-attivita')).toBeFocused();      // la tastiera resta aperta per aggiungerne un'altra
});

test('segnare, energia, riposo e cambio di giorno', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await aggiungi(p, 'Sviluppo');
  await aggiungi(p, 'Camminare');

  // segnare: la scheda si colora, il puntino del giorno si riempie, la striscia lo conta
  await carta(p, 'Sviluppo').locator('input[type=checkbox]').check();
  await expect(carta(p, 'Sviluppo')).toHaveAttribute('data-fatto', '');
  await expect(carta(p, 'Sviluppo').locator('.puntino').nth(2)).toHaveAttribute('data-fatto', '');
  await expect(giorno(p, 2)).toHaveAttribute('aria-label', /1 di 2 attività segnate/);

  // energia: un tocco sceglie, un secondo tocco sullo stesso segmento toglie
  await p.click('.segmento[data-livello="ok"]');
  await expect(p.locator('.segmento[data-livello="ok"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(giorno(p, 2)).toHaveAttribute('data-energia', 'ok');
  await p.click('.segmento[data-livello="ok"]');
  await expect(p.locator('.segmento[aria-pressed="true"]')).toHaveCount(0);
  await p.click('.segmento[data-livello="leggero"]');

  // riposo
  await p.check('#riposo-giorno');
  await expect(giorno(p, 2)).toHaveAttribute('data-riposo', '');

  // un altro giorno: lunedì è vuoto, e segnarlo non tocca mercoledì
  await giorno(p, 0).click();
  await expect(p.locator('#titolo-giorno')).toHaveText('Lunedì 12 ottobre');
  await expect(carta(p, 'Sviluppo').locator('input[type=checkbox]')).not.toBeChecked();
  await expect(p.locator('#riposo-giorno')).not.toBeChecked();
  await carta(p, 'Camminare').locator('input[type=checkbox]').check();
  await giorno(p, 2).click();
  await expect(carta(p, 'Sviluppo').locator('input[type=checkbox]')).toBeChecked();
  await expect(carta(p, 'Camminare').locator('input[type=checkbox]')).not.toBeChecked();
  await expect(carta(p, 'Camminare').locator('.puntino').nth(0)).toHaveAttribute('data-fatto', '');
  await expect(p.locator('.segmento[data-livello="leggero"]')).toHaveAttribute('aria-pressed', 'true');

  // un giorno futuro non si sceglie
  await expect(giorno(p, 4)).toBeDisabled();
  expect(p.errori).toEqual([]);
});

test('dettaglio e «Togli» sulle schede', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await aggiungi(p, 'Sviluppo');
  await aggiungi(p, 'Prova');
  const campo = carta(p, 'Sviluppo').locator('.dettaglio');
  await campo.fill('Programma B');
  await campo.press('Enter');
  await p.reload();
  await expect(carta(p, 'Sviluppo').locator('.dettaglio')).toHaveValue('Programma B');

  await carta(p, 'Prova').locator('.togli').click();
  await conferma(p);
  expect(await nomiCarte(p)).toEqual(['Sviluppo']);
});

test('un tocco lento subito dopo aver aggiunto arriva comunque alla casella: i suggerimenti si chiudono dopo il tocco', async ({ browser }) => {
  // Aggiunta un'attività, il campo resta attivo e sotto ci sono i suggerimenti. Toccando altrove, il campo perde il
  // fuoco già alla pressione del dito e i suggerimenti si chiudevano subito: la pagina si spostava sotto il dito, e
  // il rilascio cadeva altrove. Il clic andava perso. Qui il tocco è lento (pressione e rilascio a 200 ms).
  const p = await apriTelefono(browser);
  await aggiungi(p, 'Sviluppo');
  await expect(p.locator('#suggerimenti')).toBeVisible();
  await carta(p, 'Sviluppo').locator('input[type=checkbox]').click({ delay: 200 });
  await expect(carta(p, 'Sviluppo').locator('input[type=checkbox]')).toBeChecked();
  await expect(p.locator('#suggerimenti')).toBeHidden();             // e dopo il tocco si chiudono
  await aggiungi(p, 'Leggere');
  await carta(p, 'Leggere').getByRole('button', { name: 'Rinomina «Leggere»' }).click({ delay: 200 });
  await expect(p.locator('#foglio-rinomina')).toBeVisible();
});

test('togliendo un’attività, la conferma dice in quali giorni risulta svolta', async ({ browser }) => {
  const p = await apriTelefono(browser);                        // mercoledì 14 ottobre
  await aggiungi(p, 'Sviluppo');
  await aggiungi(p, 'Prova');
  await carta(p, 'Sviluppo').locator('input[type=checkbox]').check();   // mercoledì
  await giorno(p, 0).click();
  await carta(p, 'Sviluppo').locator('input[type=checkbox]').check();   // lunedì

  await carta(p, 'Sviluppo').locator('.togli').click();
  await expect(p.locator('#conferma-testo')).toContainText('Risulta svolta lunedì e mercoledì');
  await p.click('#conferma button[value="annulla"]');           // annullo: non cambia niente
  await expect(carta(p, 'Sviluppo')).toBeVisible();

  await carta(p, 'Prova').locator('.togli').click();
  await expect(p.locator('#conferma-testo')).toContainText('Non ha spunte in questa settimana');
  await conferma(p);
  expect(await nomiCarte(p)).toEqual(['Sviluppo']);

  // togliendola davvero, le spunte non si perdono: restano nello storico e ricompaiono rimettendola
  await carta(p, 'Sviluppo').locator('.togli').click();
  await expect(p.locator('#conferma-testo')).toContainText('le spunte restano nello storico');
  await conferma(p);
  expect(await nomiCarte(p)).toEqual([]);
  await aggiungi(p, 'Sviluppo');
  await expect(carta(p, 'Sviluppo').locator('.puntino[data-fatto]')).toHaveCount(2);   // lunedì e mercoledì
});

test('settimane passate: si consultano e correggono, senza aggiungere né togliere', async ({ browser }) => {
  const p = await apriTelefono(browser, LUNEDI_DOPO);
  await caricaDati(p, creaSeme());
  await p.click('#sett-prec');
  await expect(giorno(p, 0)).toHaveAttribute('aria-pressed', 'true');           // resta lo stesso giorno: lunedì
  expect(await nomiCarte(p)).toEqual(['Sviluppo', 'Diario', 'Chitarra']);
  await expect(carta(p, 'Sviluppo').locator('input[type=checkbox]')).toBeChecked();
  await expect(carta(p, 'Sviluppo').locator('.dettaglio')).toHaveValue('Programma A');
  await expect(p.locator('#form-nuova')).toBeHidden();
  await expect(p.locator('.togli')).toHaveCount(0);
  await p.click('#vai-oggi');
  await expect(p.locator('#titolo-giorno')).toContainText('Lunedì 19 ottobre');
});

test('il menu si apre dal basso, con tema, colore e libreria; il CSV sta nella sezione Dati', async ({ browser }) => {
  const p = await apriTelefono(browser);
  await aggiungi(p, 'Sviluppo');
  await vaiA(p, 'dati');
  const [scaricato] = await Promise.all([p.waitForEvent('download'), p.click('#scarica-settimana')]);
  expect(scaricato.suggestedFilename()).toBe('settimana-2026-10-12.csv');
  await apriMenu(p);
  const menu = await p.locator('#menu').boundingBox();
  expect(Math.round(menu.y + menu.height)).toBe(p.viewportSize().height);         // appoggiato al fondo dello schermo
  expect(await p.locator('#menu h3').allTextContents()).toEqual(['Tema', 'Colore delle faccende']);
  await p.locator('#pannello-libreria summary').click();
  await expect(p.locator('.lib-nome[data-id="sviluppo"]')).toBeVisible();
  await chiudiMenu(p);
});

test('dal telefono al computer: ciò che segni sul telefono arriva nella tabella', async ({ browser }, info) => {
  test.skip(info.project.name === 'iphone', 'serve anche un computer: gira negli altri progetti');
  const tel = await apriTelefono(browser);
  await aggiungi(tel, 'Sviluppo');
  await carta(tel, 'Sviluppo').locator('input[type=checkbox]').check();
  await tel.click('.segmento[data-livello="pesa"]');
  const file = await salvaFile(tel, info.outputPath('tel.json'));

  const pc = await apri(await browser.newContext());
  await unisciFile(pc, file);
  const tabella = await foto(pc);
  expect(tabella.righe).toEqual([{ nome: 'Sviluppo', dettaglio: '', fatto: [false, false, true, false, false, false, false] }]);
  expect(tabella.energia[2]).toBe('pesa');
});

test('stringendo la finestra si passa dalla tabella alla vista a un giorno, e ritorno', async ({ browser }, info) => {
  test.skip(info.project.name === 'iphone', 'parte da un computer: gira negli altri progetti');
  const p = await apri(await browser.newContext());   // computer
  await aggiungi(p, 'Sviluppo');
  await expect(p.locator('.scheda')).toBeVisible();
  await p.setViewportSize({ width: 390, height: 844 });
  await expect(p.locator('#vista-giorno')).toBeVisible();
  await expect(p.locator('.scheda')).toBeHidden();
  expect(await nomiCarte(p)).toEqual(['Sviluppo']);
  await p.setViewportSize({ width: 1200, height: 900 });
  await expect(p.locator('.scheda')).toBeVisible();
  await expect(p.locator('#form-nuova')).toBeVisible();   // il modulo per aggiungere è tornato sotto la tabella
});

for (const schema of ['light', 'dark']) {
  test(`tema ${schema}: niente scorrimento di lato, nessun errore`, async ({ browser }) => {
    const p = await apriTelefono(browser, LUNEDI_DOPO, { colorScheme: schema });
    await caricaDati(p, creaSeme());
    await p.click('#riprendi-settimana');
    await apriMenu(p);
    expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(p.errori).toEqual([]);
  });
}

