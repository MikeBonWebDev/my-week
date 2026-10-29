// Test nel browser della sincronizzazione: due "dispositivi" (due contesti del browser, ognuno con la sua memoria)
// lavorano per conto loro e si scambiano il file. Alla fine devono mostrare la stessa tabella.
import fs from 'node:fs';
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js
import {
  MERCOLEDI, apri, nomi, aggiungi, dettaglio, spunta, togli, vaiA, salvaFile, unisciFile, foto,
} from './aiuti.js';

test('due dispositivi lavorano separati e, scambiandosi il file, tornano uguali', async ({ browser }, info) => {
  // Il PC parte un minuto avanti rispetto al telefono, così il nome scritto dal PC («sviluppo») è il più recente e vince.
  // Ogni pagina ha il suo orologio finto: se partissero alla stessa ora e il PC ci mettesse più del telefono ad aprirsi,
  // il suo orologio resterebbe indietro, vincerebbe «Sviluppo» e il test fallirebbe più avanti.
  const tel = await apri(await browser.newContext());
  const pc = await apri(await browser.newContext(), new Date(MERCOLEDI.getTime() + 60_000));

  // Ognuno lavora per conto suo. La stessa voce, scritta in modo diverso, nasce su entrambi.
  await aggiungi(tel, 'Sviluppo');
  await aggiungi(tel, 'Camminare');
  await spunta(tel, 'Sviluppo', 0);
  await spunta(tel, 'Camminare', 1);
  await dettaglio(tel, 'Sviluppo', 'Programma A');
  await tel.click('.en[data-giorno="1"][data-livello="pesa"]');

  // Il PC lavora per conto suo
  await aggiungi(pc, '  sviluppo ');
  await aggiungi(pc, 'Chitarra');
  await spunta(pc, 'sviluppo', 2);
  await spunta(pc, 'Chitarra', 2);
  await pc.click('.en[data-giorno="2"][data-livello="ok"]');
  await pc.check('#piede-tabella input.riposo[data-giorno="0"]');

  // Il telefono salva il file, il PC lo unisce
  const fileTel1 = await salvaFile(tel, info.outputPath('tel-1.json'));
  expect(await unisciFile(pc, fileTel1)).toContain('modifiche nuove o più recenti');

  const dopo = await foto(pc);
  expect(dopo.righe.map((r) => r.nome.toLowerCase()).sort()).toEqual(['camminare', 'chitarra', 'sviluppo']);   // una sola Sviluppo
  const sviluppo = dopo.righe.find((r) => r.nome.toLowerCase() === 'sviluppo');
  expect(sviluppo.dettaglio).toBe('Programma A');                    // dal telefono
  expect(sviluppo.fatto.slice(0, 3)).toEqual([true, false, true]);   // spunte di entrambi
  expect(dopo.energia.slice(0, 3)).toEqual([null, 'pesa', 'ok']);
  expect(dopo.riposo[0]).toBe(true);
  await expect(pc.locator('.lib-voce')).toHaveCount(3);              // nessun doppione in libreria

  // Il PC corregge il dettaglio e toglie un'attività; il telefono riceve
  await dettaglio(pc, 'sviluppo', 'Programma B');
  await togli(pc, 'Camminare');
  await unisciFile(tel, await salvaFile(pc, info.outputPath('pc-1.json')));
  expect(await foto(tel)).toEqual(await foto(pc));
  expect(await nomi(tel)).not.toContain('Camminare');

  // Riunire il vecchio file del telefono non cambia niente
  const prima = await foto(pc);
  expect(await unisciFile(pc, fileTel1)).toBeNull();
  await expect(pc.locator('#stato')).toContainText('niente da unire');
  expect(await foto(pc)).toEqual(prima);

  // Anche una modifica a una settimana passata arriva
  await tel.click('#sett-prec');
  await expect(tel.locator('#form-nuova')).toBeHidden();             // nel passato non si aggiungono attività
  await tel.click('.en[data-giorno="4"][data-livello="leggero"]');
  await unisciFile(pc, await salvaFile(tel, info.outputPath('tel-2.json')));
  await pc.click('#sett-prec');
  expect((await foto(pc)).energia[4]).toBe('leggero');

  expect([...tel.errori, ...pc.errori]).toEqual([]);
});

test('un file qualsiasi viene rifiutato', async ({ browser }, info) => {
  const p = await apri(await browser.newContext());
  const percorso = info.outputPath('altro.json');
  fs.writeFileSync(percorso, JSON.stringify({ versione: 3, dati: {} }));
  expect(await unisciFile(p, percorso)).toBeNull();
  await expect(p.locator('#stato')).toContainText('non sembra un file di sincronizzazione');
});

test('due schede sullo stesso browser non si cancellano le modifiche a vicenda', async ({ browser }) => {
  const contesto = await browser.newContext();   // stesso contesto = stessa memoria, come due schede
  const s1 = await apri(contesto);
  const s2 = await apri(contesto);
  await aggiungi(s1, 'Leggere');
  await expect.poll(() => nomi(s2)).toContain('Leggere');   // la seconda scheda si aggiorna da sola
  await aggiungi(s2, 'Chitarra');
  await s1.reload();
  await s2.reload();
  expect((await nomi(s1)).sort()).toEqual(['Chitarra', 'Leggere']);
  expect((await nomi(s2)).sort()).toEqual(['Chitarra', 'Leggere']);
});

test('la sezione Dati mostra quando hai salvato e unito un file', async ({ browser }, info) => {
  const p = await apri(await browser.newContext());
  await vaiA(p, 'dati');
  await expect(p.locator('#ultimo-salvataggio')).toHaveText('mai, finora');
  await expect(p.locator('#ultima-unione')).toHaveText('mai, finora');
  await vaiA(p, 'settimana');
  await aggiungi(p, 'Leggere');
  const file = await salvaFile(p, info.outputPath('mio.json'));
  await vaiA(p, 'dati');
  await expect(p.locator('#ultimo-salvataggio')).toContainText('(oggi)');
  const altro = await apri(await browser.newContext());
  expect(await unisciFile(altro, file)).toContain('Porta 3 modifiche');   // nome, presenza nella settimana, giorno
  await vaiA(altro, 'dati');
  await expect(altro.locator('#ultima-unione')).toContainText('(oggi)');
});
