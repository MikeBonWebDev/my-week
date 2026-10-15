// Funzioni d'appoggio per i test nel browser: aprono la pagina a una data fissa e fanno le azioni
// come le farebbe una persona (scrivere, toccare, confermare), così i test si leggono come una storia.
'use strict';
const { expect } = require('@playwright/test');

// Le date di riferimento dei test: un mercoledì e il lunedì successivo (ora locale)
const MERCOLEDI = new Date(2026, 9, 14, 10, 0);
const LUNEDI_DOPO = new Date(2026, 9, 19, 9, 0);

/**
 * Apre l'app in un contesto (= un "dispositivo" con la sua memoria) con l'orologio fermato a `quando`.
 * Raccoglie gli errori JavaScript della pagina in `pagina.errori`, da controllare alla fine.
 */
async function apri(contesto, quando = MERCOLEDI) {
  const pagina = await contesto.newPage();
  pagina.errori = [];
  pagina.on('pageerror', (e) => pagina.errori.push(String(e)));
  await pagina.clock.install({ time: quando });
  await pagina.goto('/');
  return pagina;
}

/** Mette un registro nella memoria del dispositivo e ricarica: la pagina riparte con quei dati. */
async function caricaDati(pagina, fileSync) {
  await pagina.evaluate((d) => localStorage.setItem('settimana:registro', JSON.stringify(d)), fileSync);
  await pagina.reload();
}

/** I nomi delle attività nella tabella, dall'alto in basso. */
const nomi = (p) => p.locator('#corpo-tabella .nome-voce').allTextContents();

/** I suggerimenti sotto «Aggiungi», senza il "+ " iniziale (vuoto se il riquadro è nascosto). */
async function suggerimenti(p) {
  if (!(await p.locator('#suggerimenti').isVisible())) return [];
  return (await p.locator('#voci-suggerite .chip').allTextContents()).map((t) => t.slice(2));
}

/** Preme «Conferma» nella finestra di dialogo e aspetta che si chiuda. */
async function conferma(p) {
  await expect(p.locator('dialog[open]')).toBeVisible();
  // La finestra si chiude subito, ma la pagina prosegue solo all'evento "close", che il browser consegna più tardi.
  // Se il test andasse avanti appena la finestra sparisce, leggerebbe la tabella prima che la pagina l'aggiorni
  // (è successo: un test falliva una volta su venti). Quindi aspetto proprio "close", più un giro per lasciar
  // finire il codice della pagina che lo segue.
  await p.evaluate(() => {
    window.__chiusa = new Promise((fatto) => document.querySelector('#conferma')
      .addEventListener('close', () => setTimeout(fatto, 0), { once: true }));
  });
  await p.click('#conferma-ok');
  await p.evaluate(() => window.__chiusa);
}

async function scrivi(p, testo) { await p.fill('#nuova-attivita', testo); }
async function aggiungi(p, nome) { await scrivi(p, nome); await p.press('#nuova-attivita', 'Enter'); }

/** La riga della tabella di una certa attività. */
const riga = (p, nome) => p.locator('#corpo-tabella tr', { has: p.locator('.nome-voce', { hasText: new RegExp(`^${nome}$`) }) });

async function dettaglio(p, nome, testo) {
  const campo = riga(p, nome).locator('.dettaglio');
  await campo.fill(testo);
  await campo.press('Enter');
}
async function spunta(p, nome, giorno) {
  await riga(p, nome).locator(`input[type=checkbox][data-giorno="${giorno}"]`).check();
}
async function togli(p, nome) {
  await riga(p, nome).hover();
  await riga(p, nome).locator('.elimina').click();
  await conferma(p);
}

/** Apre un pannello in fondo alla pagina («Libreria…», «Sincronizzazione…») se è chiuso. */
async function apriPannello(p, titolo) {
  const pannello = p.locator('details', { has: p.locator('summary', { hasText: titolo }) });
  // attenzione: un pannello aperto ha open="" (stringa vuota, che in JavaScript vale come "falso"): si controlla null
  if ((await pannello.getAttribute('open')) === null) await pannello.locator('summary').click();
}

/** «Salva il file» di sincronizzazione: restituisce il percorso del file scaricato. */
async function salvaFile(p, percorso) {
  await apriPannello(p, 'Sincronizzazione');
  const [scaricato] = await Promise.all([p.waitForEvent('download'), p.click('#salva-sync')]);
  await scaricato.saveAs(percorso);
  return percorso;
}

/**
 * «Unisci un file»: sceglie il file e, se compare la finestra di conferma, conferma.
 * Restituisce il testo della conferma, oppure null se la pagina non l'ha chiesta (niente da unire, file non valido).
 */
async function unisciFile(p, percorso) {
  await apriPannello(p, 'Sincronizzazione');
  await p.setInputFiles('#file-sync', percorso);
  const dialogo = p.locator('dialog[open]');
  try { await dialogo.waitFor({ timeout: 1000 }); } catch { return null; }
  const testo = await p.locator('#conferma-testo').textContent();
  await conferma(p);
  return testo;
}

/** Una "fotografia" della settimana visibile: righe con dettagli e spunte, energia, riposo. Serve a confrontare due dispositivi. */
function foto(p) {
  return p.evaluate(() => ({
    righe: [...document.querySelectorAll('#corpo-tabella tr')].filter((r) => r.querySelector('.nome-voce')).map((r) => ({
      nome: r.querySelector('.nome-voce').textContent,
      dettaglio: r.querySelector('.dettaglio').value,
      fatto: [...r.querySelectorAll('input[type=checkbox]')].map((c) => c.checked),
    })),
    energia: [...document.querySelectorAll('.energia')].map((g) => g.querySelector('[aria-pressed=true]')?.dataset.livello ?? null),
    riposo: [...document.querySelectorAll('input.riposo')].map((c) => c.checked),
  }));
}

module.exports = {
  MERCOLEDI, LUNEDI_DOPO, apri, caricaDati, nomi, suggerimenti, conferma, scrivi, aggiungi, riga,
  dettaglio, spunta, togli, apriPannello, salvaFile, unisciFile, foto,
};
