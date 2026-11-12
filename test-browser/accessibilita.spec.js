// Accessibilità: axe-core controlla le regole WCAG 2.1 (livelli A e AA) su ogni sezione e ogni foglio,
// su computer e telefono, in chiaro e in scuro, con il colore delle faccende Morbido e Deciso.
// Oggi, per i test, è mercoledì 14 ottobre 2026 (vedi aiuti.js).
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import AxeBuilder from '@axe-core/playwright';
import * as Core from '../core.js';
import { apri, caricaDati, vaiA, apriMenu, chiudiMenu, telefono, conSezioneFinta } from './aiuti.js';

// Dati che accendono tutto ciò che ha un colore: faccende oltre la cadenza, una saltata, una mai segnata,
// il promemoria, spunte, energia, un giorno di riposo
function dati(intensita) {
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
  const piante = fatta('2026-10-05', 'Piante', 4, 7);
  db.salta(piante, '2026-10-13');
  db.nuovaFaccenda('Frigo', 30);
  for (const n of ['Sviluppo', 'Lenzuola', 'Leggere']) db.aggiungi('2026-10-12', n);
  db.spunta('2026-10-12', 'sviluppo', 0, true);
  db.energia('2026-10-12', 0, 'ok');
  db.riposo('2026-10-12', 1, true);
  db.intensita(intensita);
  return Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString());
}

// Le regole WCAG 2.0 e 2.1, livelli A e AA. Restituisce le violazioni in una forma leggibile nel messaggio d'errore.
// Prima aspetta che finiscano le transizioni (getAnimations le elenca tutte): un colore a metà strada non è un colore
// vero. Il movimento ridotto le accorcia già, ma non tutti i motori lo emulano allo stesso modo.
async function controlla(p) {
  await p.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))));
  const { violations } = await new AxeBuilder({ page: p }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  // per il contrasto, anche i colori e il rapporto misurati: dicono subito se è un difetto vero o una misura storta
  const dettagli = (n) => {
    const d = n.any?.[0]?.data;
    return d?.contrastRatio ? ` (${d.fgColor} su ${d.bgColor}: ${d.contrastRatio}:1)` : '';
  };
  return violations.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ') + dettagli(n)).join(' | ')}`);
}

// Le viste da controllare, in tre gruppi: ognuno è un test a sé, che parte da una pagina appena aperta. Un test solo
// per tutte le viste durava già quasi 30 secondi in Firefox, e ogni sezione nuova lo avrebbe allungato (CLAUDE.md, CI).
const gruppi = {
  settimana: [
    ['promemoria aperto', async (p) => { await p.locator('#promemoria > summary').click(); }],
    ['libreria aperta', async (p) => { await p.locator('#pannello-libreria > summary').click(); }],
  ],
  casa: [
    ['casa', async (p) => { await vaiA(p, 'casa'); }],
    ['foglio della faccenda', async (p) => { await p.click('#nuova-faccenda'); await expect(p.locator('#foglio-faccenda')).toBeVisible(); }],
    ['rinomina', async (p) => {
      await p.keyboard.press('Escape');
      await p.locator('[data-rinomina]:visible').first().click();
      await expect(p.locator('#foglio-rinomina')).toBeVisible();
    }],
  ],
  'dati e impostazioni': [
    ['dati', async (p) => { await vaiA(p, 'dati'); }],
    ['impostazioni', async (p) => { await apriMenu(p); await expect(p.locator('#parte-sezioni')).toBeVisible(); }],
  ],
  // solo sul telefono: «Altro» e il ventaglio esistono solo lì
  navigazione: [
    ['altro', async (p) => { await p.click('#voce-altro'); await expect(p.locator('#foglio-altro')).toBeVisible(); }],
    ['ventaglio', async (p) => {
      await p.keyboard.press('Escape');
      await apriMenu(p);
      await p.click('#scelte-menu-telefono [data-menu="ventaglio"]');
      await chiudiMenu(p);
      await p.click('#apri-ventaglio');
      await expect(p.locator('#velo-ventaglio')).toBeVisible();
    }],
  ],
};

for (const [gruppo, viste] of Object.entries(gruppi)) {
  for (const dispositivo of gruppo === 'navigazione' ? ['telefono'] : ['computer', 'telefono']) {
    for (const schema of ['light', 'dark']) {
      for (const intensita of ['morbida', 'decisa']) {
        test(`${gruppo}, ${dispositivo}, tema ${schema}, colore ${intensita}: nessuna violazione WCAG A/AA`, async ({ browser }) => {
          // movimento ridotto: senza, axe misurerebbe i colori a metà di una transizione (per esempio la voce della
          // barra appena toccata, che sta passando dal chiaro allo scuro) e segnalerebbe un contrasto che non esiste
          const contesto = await browser.newContext({
            ...(dispositivo === 'telefono' ? telefono() : {}), colorScheme: schema, reducedMotion: 'reduce',
          });
          // con due sezioni finte da spegnere: così si controllano anche la parte «Sezioni» delle Impostazioni e,
          // con cinque sezioni, «Altro»
          const p = await apri(await conSezioneFinta(contesto, [['orto', 'Orto'], ['serra', 'Serra']]));
          await caricaDati(p, dati(intensita));
          // Le transizioni spente del tutto: si controllano i colori finali, non i passaggi. In WebKit il movimento
          // ridotto non basta, e una transizione poteva non essere ancora partita quando axe guardava (testo del colore
          // vecchio su sfondo del colore nuovo: «#e5ece7 su #86b394»). Uno stile aggiunto solo qui, nella pagina del test.
          await p.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });
          await expect(p.locator('#promemoria')).toBeVisible();
          const trovate = [];
          for (const [nome, vai] of viste) {
            await vai(p);
            for (const v of await controlla(p)) trovate.push(`${nome} → ${v}`);
          }
          expect(trovate).toEqual([]);
          expect(p.errori).toEqual([]);
        });
      }
    }
  }
}
