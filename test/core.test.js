// Test del nucleo (core.js). Si lanciano con:  node --test test/
// Nessuna dipendenza: solo node:test e node:assert.
//
// Oltre agli esempi, ci sono test di PROPRIETÀ: tre dispositivi simulati fanno migliaia di modifiche casuali,
// con orologi diversi e unioni parziali, e alla fine si controlla che valgano le garanzie dell'unione
// (ordine indifferente, idempotenza, file vecchi innocui). Il generatore casuale ha un seme fisso:
// se un test fallisce, il messaggio dice il seme e il caso si riproduce identico.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../core.js');

/* ───────── Attrezzi ───────── */
// Generatore pseudo-casuale con seme (mulberry32): stessi semi, stessi risultati
function casuale(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const scegli = (r, lista) => lista[Math.floor(r() * lista.length)];
// JSON con le chiavi in ordine: due registri uguali danno lo stesso testo
const canonico = (x) => JSON.stringify(x, (k, v) => (v && typeof v === 'object' && !Array.isArray(v)
  ? Object.fromEntries(Object.keys(v).sort().map((c) => [c, v[c]])) : v));
const copia = (reg) => structuredClone(reg);
const unito = (...regs) => { const r = {}; for (const x of regs) Core.unisci(r, x); return r; };

// Un dispositivo con un orologio finto, che si può far avanzare o tenere indietro
function dispositivo(nome, { inizio = 1_760_000_000_000, sfasamento = 0 } = {}) {
  let adesso = inizio + sfasamento;
  const db = Core.crea({ dispositivo: nome, ora: () => adesso });
  db.avanza = (ms) => { adesso += ms; };
  return db;
}

const SETTIMANE = ['2026-09-28', '2026-10-05', '2026-10-12'];
const NOMI = ['Sviluppo', 'sviluppo', '  Sviluppo ', 'Camminare', 'Chitarra', 'Città', 'Citta', 'Leggere', '☕', 'Diario'];
const DETTAGLI = ['', 'Programma A', 'Programma B', '2 km', '8 km'];

// Una modifica casuale su un dispositivo, come la farebbe una persona dalla pagina
function modificaCasuale(r, db) {
  const sett = scegli(r, SETTIMANE);
  const vis = db.vista();
  const presenti = vis.weeks[sett]?.activities ?? [];
  const id = presenti.length ? scegli(r, presenti).id : null;
  const giorno = Math.floor(r() * 7);
  const voce = vis.libreria.length ? scegli(r, vis.libreria) : null;
  switch (Math.floor(r() * 13)) {
    case 0: case 1: return db.aggiungi(sett, scegli(r, NOMI));
    case 2: return id && db.togli(sett, id);
    case 3: case 4: return id && db.spunta(sett, id, giorno, r() < 0.7);
    case 5: return id && db.dettaglio(sett, id, scegli(r, DETTAGLI));
    case 6: return db.riposo(sett, giorno, r() < 0.5);
    case 7: return db.energia(sett, giorno, scegli(r, [null, 'pesa', 'ok', 'leggero']));
    case 8: return voce && (r() < 0.5 ? db.rinomina(voce.id, scegli(r, NOMI) + (r() < 0.5 ? ' bis' : '')) : db.cancella(voce.id));
    // le faccende: cadenza, salto, intensità
    case 9: return voce && db.cadenza(voce.id, scegli(r, [null, 1, 7, 14, 15, 30]));
    case 10: return voce && db.salta(voce.id, scegli(r, [null, '2026-10-01', '2026-10-14', '2026-10-20']));
    case 11: return db.intensita(scegli(r, ['nessuna', 'morbida', 'decisa']));
    default: return db.riprendi(sett, scegli(r, SETTIMANE));
  }
}

// Tre dispositivi (uno con l'orologio un'ora indietro) lavorano e ogni tanto si scambiano file
function simulazione(seme, passi = 400) {
  const r = casuale(seme);
  const dev = [
    dispositivo('telefono'),
    dispositivo('pc', { sfasamento: -3_600_000 }),
    dispositivo('tablet', { sfasamento: 90_000 }),
  ];
  for (let i = 0; i < passi; i++) {
    const db = scegli(r, dev);
    db.avanza(Math.floor(r() * 120_000));
    if (r() < 0.08) {
      const altro = scegli(r, dev);
      if (altro !== db) db.unisci(copia(altro.registro));
    } else {
      modificaCasuale(r, db);
    }
  }
  return dev;
}

/* ───────── Proprietà dell'unione ───────── */
test('proprietà: l’ordine delle unioni non conta (convergenza)', () => {
  for (let seme = 1; seme <= 60; seme++) {
    const [a, b, c] = simulazione(seme).map((d) => d.registro);
    const ordini = [[a, b, c], [c, b, a], [b, a, c], [c, a, b]].map((o) => canonico(unito(...o)));
    for (const o of ordini) assert.equal(o, ordini[0], `seme ${seme}`);
  }
});

test('proprietà: unire due volte lo stesso file non cambia nulla (idempotenza)', () => {
  for (let seme = 100; seme <= 140; seme++) {
    const [a, b] = simulazione(seme).map((d) => d.registro);
    const una = unito(a, b);
    const due = unito(a, b, b, a);
    assert.equal(canonico(due), canonico(una), `seme ${seme}`);
    const conto = Core.unisci(copia(una), b);
    assert.equal(conto.nuove + conto.aggiornate, 0, `seme ${seme}: la seconda unione ha cambiato qualcosa`);
  }
});

test('proprietà: un file vecchio non toglie nulla a chi è andato avanti', () => {
  for (let seme = 200; seme <= 240; seme++) {
    const r = casuale(seme);
    const [tel] = simulazione(seme, 150);
    const vecchio = copia(tel.registro);
    for (let i = 0; i < 150; i++) { tel.avanza(Math.floor(r() * 60_000)); modificaCasuale(r, tel); }
    const prima = canonico(tel.registro);
    const conto = tel.unisci(vecchio);
    assert.equal(canonico(tel.registro), prima, `seme ${seme}`);
    assert.equal(conto.aggiornate + conto.nuove, 0, `seme ${seme}`);
  }
});

test('proprietà: dopo lo scambio dei file, tutti i dispositivi mostrano la stessa tabella', () => {
  for (let seme = 300; seme <= 330; seme++) {
    const dev = simulazione(seme);
    const tutto = unito(...dev.map((d) => d.registro));
    for (const d of dev) d.unisci(copia(tutto));
    const viste = dev.map((d) => canonico(d.vista()));
    assert.equal(viste[1], viste[0], `seme ${seme}`);
    assert.equal(viste[2], viste[0], `seme ${seme}`);
  }
});

test('proprietà: la vista è sempre coerente (niente righe orfane, niente doppioni in una settimana)', () => {
  for (let seme = 400; seme <= 430; seme++) {
    const vis = Core.vista(unito(...simulazione(seme).map((d) => d.registro)));
    const ids = new Set(vis.libreria.map((v) => v.id));
    for (const [k, w] of Object.entries(vis.weeks)) {
      const visti = w.activities.map((a) => a.id);
      assert.equal(new Set(visti).size, visti.length, `seme ${seme}, ${k}: doppione`);
      for (const id of visti) assert.ok(ids.has(id), `seme ${seme}, ${k}: ${id} non è in libreria`);
      for (const id of Object.keys(w.done)) assert.ok(visti.includes(id), `seme ${seme}, ${k}: spunta orfana`);
    }
  }
});

test('proprietà: dopo lo scambio dei file, tutti i dispositivi vedono le stesse faccende', () => {
  for (let seme = 600; seme <= 630; seme++) {
    const dev = simulazione(seme);
    const tutto = unito(...dev.map((d) => d.registro));
    for (const d of dev) d.unisci(copia(tutto));
    const elenchi = dev.map((d) => canonico(Core.faccende(d.registro, '2026-10-22')));
    assert.equal(elenchi[1], elenchi[0], `seme ${seme}`);
    assert.equal(elenchi[2], elenchi[0], `seme ${seme}`);
    for (const f of Core.faccende(tutto, '2026-10-22')) {
      assert.ok(f.calore >= 0 && f.calore <= 1, `seme ${seme}: calore ${f.calore}`);
      assert.ok(f.ultima === null || f.ultima <= '2026-10-22', `seme ${seme}: ultima nel futuro`);
      assert.ok(f.salto === null || f.ultima === null || f.salto > f.ultima, `seme ${seme}: salto prima dell'ultima volta`);
    }
  }
});

test('proprietà: un registro passato per un file e riletto è identico', () => {
  for (let seme = 500; seme <= 520; seme++) {
    const reg = simulazione(seme)[0].registro;
    const riletto = Core.daFile(JSON.parse(JSON.stringify(Core.perFile(reg, 'telefono', '2026-10-14T10:00:00Z'))));
    assert.equal(canonico(riletto), canonico(reg), `seme ${seme}`);
  }
});

/* ───────── Casi precisi ───────── */
test('la stessa voce creata su due dispositivi prima di unirli è una voce sola', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  tel.aggiungi('2026-10-12', 'Sviluppo');
  pc.aggiungi('2026-10-12', '  sviluppo ');
  tel.unisci(copia(pc.registro));
  const vis = tel.vista();
  assert.equal(vis.libreria.length, 1);
  assert.equal(vis.weeks['2026-10-12'].activities.length, 1);
});

test('una voce tolta non ricompare quando arriva il file vecchio dell’altro dispositivo', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  tel.aggiungi('2026-10-12', 'Camminare');
  tel.spunta('2026-10-12', 'camminare', 0, true);
  pc.unisci(copia(tel.registro));          // il PC ha la voce, con la spunta
  tel.avanza(1000);
  tel.togli('2026-10-12', 'camminare');     // poi sul telefono la togli
  tel.unisci(copia(pc.registro));           // e il file del PC, più vecchio, arriva dopo
  assert.deepEqual(tel.vista().weeks['2026-10-12'].activities, []);
  pc.unisci(copia(tel.registro));
  assert.deepEqual(pc.vista().weeks['2026-10-12'].activities, []);
});

test('ogni casella vince per conto suo: modifiche diverse sui due dispositivi si sommano', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  tel.aggiungi('2026-10-12', 'Sviluppo');
  pc.unisci(copia(tel.registro));
  tel.avanza(1000); tel.spunta('2026-10-12', 'sviluppo', 1, true);           // martedì dal telefono
  pc.avanza(2000); pc.dettaglio('2026-10-12', 'sviluppo', 'Programma A');   // dettaglio dal PC
  pc.energia('2026-10-12', 1, 'ok');
  tel.unisci(copia(pc.registro));
  const w = tel.vista().weeks['2026-10-12'];
  assert.equal(w.done.sviluppo[1], true);
  assert.equal(w.activities[0].dettaglio, 'Programma A');
  assert.equal(w.energy[1], 'ok');
});

test('sulla stessa casella vince l’ultima modifica', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  tel.aggiungi('2026-10-12', 'Sviluppo');
  pc.unisci(copia(tel.registro));
  tel.avanza(1000); tel.dettaglio('2026-10-12', 'sviluppo', 'prima');
  pc.avanza(5000); pc.dettaglio('2026-10-12', 'sviluppo', 'dopo');
  tel.unisci(copia(pc.registro));
  pc.unisci(copia(tel.registro));
  assert.equal(tel.vista().weeks['2026-10-12'].activities[0].dettaglio, 'dopo');
  assert.equal(pc.vista().weeks['2026-10-12'].activities[0].dettaglio, 'dopo');
});

test('con l’orologio indietro, ciò che fai dopo un’unione vince comunque', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc', { sfasamento: -3_600_000 });   // il PC è un'ora indietro
  tel.aggiungi('2026-10-12', 'Sviluppo');
  tel.dettaglio('2026-10-12', 'sviluppo', 'dal telefono');
  pc.unisci(copia(tel.registro));
  pc.avanza(1000);
  pc.dettaglio('2026-10-12', 'sviluppo', 'corretto dal PC');   // fatto DOPO aver visto il telefono
  tel.unisci(copia(pc.registro));
  assert.equal(tel.vista().weeks['2026-10-12'].activities[0].dettaglio, 'corretto dal PC');
});

test('una voce cancellata su un dispositivo ma usata sull’altro resta in libreria', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  tel.aggiungi('2026-10-12', 'Leggere');
  tel.togli('2026-10-12', 'leggere');
  pc.unisci(copia(tel.registro));
  tel.avanza(1000); assert.equal(tel.cancella('leggere').ok, true);        // mai usata sul telefono: la cancello
  pc.avanza(500); pc.aggiungi('2026-10-05', 'Leggere');                     // ma sul PC la uso
  tel.unisci(copia(pc.registro));
  assert.ok(tel.vista().libreria.some((v) => v.id === 'leggere'));
  assert.equal(tel.cancella('leggere').errore, 'usata');
});

test('riaggiungere una voce cancellata la fa tornare, con lo stesso identificativo', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-12', 'Leggere');
  tel.togli('2026-10-12', 'leggere');
  tel.cancella('leggere');
  assert.equal(tel.vista().libreria.length, 0);
  tel.avanza(10);
  assert.equal(tel.aggiungi('2026-10-12', 'leggere').id, 'leggere');
  assert.deepEqual(tel.vista().libreria, [{ id: 'leggere', name: 'Leggere' }]);
});

test('una voce rinominata libera il nome: crearlo di nuovo dà una voce distinta', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-12', 'Sviluppo');
  tel.rinomina('sviluppo', 'Programmazione');
  const r = tel.aggiungi('2026-10-12', 'Sviluppo');
  assert.equal(r.id, 'sviluppo-2');
  assert.deepEqual(tel.vista().weeks['2026-10-12'].activities.map((a) => a.id), ['sviluppo', 'sviluppo-2']);
});

test('riprendi: copia la lista nello stesso ordine, senza dettagli né spunte', () => {
  const tel = dispositivo('telefono');
  for (const n of ['Chitarra', 'Sviluppo', 'Camminare']) tel.aggiungi('2026-10-05', n);
  tel.dettaglio('2026-10-05', 'sviluppo', 'Programma A');
  tel.spunta('2026-10-05', 'chitarra', 0, true);
  assert.equal(tel.riprendi('2026-10-12', '2026-10-05').quante, 3);
  const w = tel.vista().weeks['2026-10-12'];
  assert.deepEqual(w.activities, [
    { id: 'chitarra', dettaglio: '' }, { id: 'sviluppo', dettaglio: '' }, { id: 'camminare', dettaglio: '' }]);
  assert.deepEqual(w.done, {});
  assert.equal(tel.riprendi('2026-10-12', '2026-10-05').errore, 'non-vuota');
});

test('regole su nomi e valori', () => {
  const tel = dispositivo('telefono');
  assert.equal(tel.aggiungi('2026-10-12', '   ').errore, 'vuoto');
  assert.equal(tel.aggiungi('2026-10-12', 'riposo').errore, 'riservato');
  assert.equal(tel.aggiungi('2026-10-13', 'Sviluppo').errore, 'settimana');   // non è un lunedì
  tel.aggiungi('2026-10-12', 'Sviluppo');
  assert.equal(tel.aggiungi('2026-10-12', 'SVILUPPO').errore, 'gia-in-settimana');
  tel.aggiungi('2026-10-12', 'Camminare');
  assert.equal(tel.rinomina('camminare', 'sviluppo').errore, 'esiste');
  assert.equal(tel.rinomina('camminare', 'Energia').errore, 'riservato');
  assert.equal(tel.spunta('2026-10-12', 'camminare', 7, true).errore, 'valore');
  assert.equal(tel.spunta('2026-10-12', 'leggere', 0, true).errore, 'non-trovata');
  assert.equal(tel.energia('2026-10-12', 0, 'stanco').errore, 'valore');
  assert.equal(tel.dettaglio('2026-10-12', 'camminare', 'x'.repeat(500)).valore.length, Core.MAX_DETTAGLIO);
});

test('identificativi dal nome', () => {
  assert.equal(Core.slug('Città nuova'), 'citta-nuova');
  assert.equal(Core.slug('  Scrivere   nel diario! '), 'scrivere-nel-diario');
  assert.equal(Core.slug('☕'), Core.slug('☕'));
  assert.match(Core.slug('☕'), /^x[a-z0-9]+$/);
  assert.ok(Core.slug('a'.repeat(100)).length <= 40);
});

test('niente scritture inutili: rimettere lo stesso valore non cambia il registro', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-12', 'Sviluppo');
  const prima = canonico(tel.registro);
  tel.avanza(1000);
  tel.dettaglio('2026-10-12', 'sviluppo', '');
  tel.spunta('2026-10-12', 'sviluppo', 3, false);
  tel.energia('2026-10-12', 3, null);
  tel.aggiungi('2026-09-28', 'Sviluppo'); tel.togli('2026-09-28', 'sviluppo');
  tel.riposo('2026-10-12', 0, false);
  const dopo = Object.keys(tel.registro).filter((k) => !k.startsWith('s/2026-09-28'));
  assert.deepEqual(dopo.sort(), Object.keys(JSON.parse(prima)).sort());
});

test('validazione: scarta ciò che è malformato, conserva le chiavi sconosciute ma ben fatte', () => {
  const e = (v, t = 1) => ({ v, t, d: 'pc' });
  const reg = Core.valida({
    'v/sviluppo/nome': e('Sviluppo'),
    'v/x/nome': e('Riposo'),                        // nome riservato
    'v/y/nome': e(''),                              // vuoto
    's/2026-10-13/r/0': e(true),                    // non è un lunedì
    's/2026-10-12/e/0': e('stanco'),                // livello sconosciuto
    's/2026-10-12/m/sviluppo': e(true),
    's/2026-10-12/a/sviluppo/f/9': e(true),         // giorno inesistente: chiave sconosciuta, tenuta ma ignorata
    's/2026-10-12/a/sviluppo/f/2/mattina': e(true), // le fasce di domani: tenute, ignorate dalla vista di oggi
    's/2026-10-12/a/sviluppo/f/1': { v: true, t: 'ieri', d: 'pc' },   // momento non valido
    's/2026-10-12/a/sviluppo/f/0': { v: true, t: 5 },                 // dispositivo mancante
    'V/strano': e(true),                            // forma di chiave non ammessa
  });
  assert.deepEqual(Object.keys(reg).sort(), [
    's/2026-10-12/a/sviluppo/f/2/mattina', 's/2026-10-12/a/sviluppo/f/9', 's/2026-10-12/m/sviluppo', 'v/sviluppo/nome']);
  assert.deepEqual(Core.vista(reg).weeks['2026-10-12'].done, {});
  assert.equal(Core.daFile({ formato: 'altro', registro: {} }), null);
  assert.equal(Core.daFile({ versione: 2, activities: [] }), null);
});

/* ───────── Faccende ───────── */
const OGGI = '2026-10-22';   // un giovedì

test('cadenza: si dà, si cambia, si toglie; valori non validi rifiutati', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-19', 'Pulizia bagno');
  assert.equal(tel.cadenza('pulizia-bagno', 14).ok, true);
  assert.deepEqual(Core.faccende(tel.registro, OGGI).map((f) => [f.id, f.cadenza]), [['pulizia-bagno', 14]]);
  for (const v of [0, 366, 2.5, -3, '14', NaN]) assert.equal(tel.cadenza('pulizia-bagno', v).errore, 'valore', String(v));
  assert.equal(tel.cadenza('nessuna-voce', 7).errore, 'non-trovata');
  tel.cadenza('pulizia-bagno', null);
  assert.deepEqual(Core.faccende(tel.registro, OGGI), []);
  assert.equal(tel.registro['v/pulizia-bagno/cad'].v, false);   // tolta, non cancellata: l'altro dispositivo la vedrà sparire
});

test('l’ultima volta viene dalle spunte di tutte le settimane; mai segnata = neutra', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-05', 'Pulizia bagno');
  tel.spunta('2026-10-05', 'pulizia-bagno', 1, true);   // martedì 6 ottobre
  tel.aggiungi('2026-10-19', 'Pulire il frigo');
  tel.cadenza('pulizia-bagno', 14);
  tel.cadenza('pulire-il-frigo', 30);
  const [bagno, frigo] = Core.faccende(tel.registro, OGGI);
  assert.equal(bagno.ultima, '2026-10-06');
  assert.equal(bagno.giorni, 16);
  assert.equal(bagno.calore, 2 / 14);
  assert.deepEqual([frigo.ultima, frigo.giorni, frigo.calore], [null, null, 0]);
});

test('calore: zero entro la cadenza, poi cresce, e si ferma a 1 dopo un’altra cadenza', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-09-21', 'Lenzuola');
  tel.cadenza('lenzuola', 7);
  const calore = (oggi) => Core.faccende(tel.registro, oggi)[0].calore;
  tel.spunta('2026-09-21', 'lenzuola', 0, true);   // lunedì 21 settembre
  assert.equal(calore('2026-09-28'), 0);           // 7 giorni: ancora dentro
  assert.equal(calore('2026-09-29'), 1 / 7);
  assert.equal(calore('2026-10-05'), 1);           // 14 giorni: massimo
  assert.equal(calore('2026-12-01'), 1);           // e non va oltre
});

test('ordine delle faccende: chi ha superato di più la cadenza prima, le mai segnate in fondo', () => {
  const tel = dispositivo('telefono');
  for (const [nome, cad, sett, g] of [['Lavatrice', 7, '2026-10-19', 0], ['Piante', 7, '2026-10-12', 0], ['Lenzuola', 14, '2026-09-21', 2], ['Bagno', 14, '2026-10-05', 1]]) {
    tel.aggiungi(sett, nome); tel.spunta(sett, Core.slug(nome), g, true); tel.cadenza(Core.slug(nome), cad);
  }
  tel.aggiungi('2026-10-19', 'Frigo'); tel.cadenza('frigo', 30);
  tel.aggiungi('2026-10-19', 'Aria'); tel.cadenza('aria', 30);
  assert.deepEqual(Core.faccende(tel.registro, OGGI).map((f) => f.id), ['lenzuola', 'piante', 'bagno', 'lavatrice', 'aria', 'frigo']);
});

test('salto: fa ripartire il conteggio senza toccare l’ultima volta; un salto più vecchio dell’ultima spunta non conta', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-09-21', 'Lenzuola'); tel.spunta('2026-09-21', 'lenzuola', 2, true); tel.cadenza('lenzuola', 14);
  assert.equal(tel.salta('lenzuola', OGGI).ok, true);
  let f = Core.faccende(tel.registro, OGGI)[0];
  assert.deepEqual([f.ultima, f.salto, f.riferimento, f.giorni, f.calore], ['2026-09-23', OGGI, OGGI, 0, 0]);
  f = Core.faccende(tel.registro, '2026-10-23')[0];   // il giorno dopo: il salto è ancora lì, «ieri»
  assert.deepEqual([f.salto, f.giorni], [OGGI, 1]);
  tel.aggiungi('2026-10-19', 'Lenzuola');
  tel.spunta('2026-10-19', 'lenzuola', 4, true);       // poi la fai, venerdì 23
  f = Core.faccende(tel.registro, '2026-10-24')[0];
  assert.deepEqual([f.ultima, f.salto, f.giorni], ['2026-10-23', null, 1]);
  tel.salta('lenzuola', null);
  assert.equal(tel.registro['v/lenzuola/salto'].v, '');
  assert.equal(tel.salta('lenzuola', '2026-02-30').errore, 'valore');
  assert.equal(tel.salta('nessuna', OGGI).errore, 'non-trovata');
});

test('una spunta nel futuro (orologio sbagliato) non è «l’ultima volta»', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-19', 'Bagno'); tel.cadenza('bagno', 7);
  tel.spunta('2026-10-19', 'bagno', 6, true);   // domenica 25: dopo «oggi»
  assert.equal(Core.faccende(tel.registro, OGGI)[0].ultima, null);
  assert.throws(() => Core.faccende(tel.registro, '22/10/2026'));
});

test('togli: le spunte e il dettaglio restano come storico, e ricompaiono rimettendo la voce', () => {
  const tel = dispositivo('telefono');
  tel.aggiungi('2026-10-19', 'Sviluppo');
  tel.spunta('2026-10-19', 'sviluppo', 0, true);
  tel.dettaglio('2026-10-19', 'sviluppo', 'Programma B');
  tel.cadenza('sviluppo', 7);
  tel.togli('2026-10-19', 'sviluppo');
  const w = tel.vista().weeks['2026-10-19'];
  assert.deepEqual([w.activities, w.done], [[], {}]);                       // la tabella non le mostra
  assert.equal(Core.faccende(tel.registro, OGGI)[0].ultima, '2026-10-19');   // ma contano
  assert.equal(tel.cancella('sviluppo').errore, 'usata');                    // e la voce fa parte dello storico
  tel.aggiungi('2026-10-19', 'Sviluppo');
  const dopo = tel.vista().weeks['2026-10-19'];
  assert.deepEqual(dopo.activities, [{ id: 'sviluppo', dettaglio: 'Programma B' }]);
  assert.equal(dopo.done.sviluppo[0], true);
});

test('intensità: predefinita «morbida», si sincronizza, rifiuta valori sconosciuti', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  assert.equal(tel.vista().intensita, 'morbida');
  assert.equal(tel.intensita('rossa').errore, 'valore');
  tel.intensita('decisa');
  pc.unisci(copia(tel.registro));
  assert.equal(pc.vista().intensita, 'decisa');
});

test('cadenza e salto viaggiano tra dispositivi, e vince l’ultima modifica', () => {
  const tel = dispositivo('telefono');
  const pc = dispositivo('pc');
  tel.aggiungi('2026-10-19', 'Bagno'); tel.cadenza('bagno', 14);
  pc.unisci(copia(tel.registro));
  pc.avanza(1000); pc.cadenza('bagno', 15);
  tel.avanza(500); tel.salta('bagno', OGGI);
  tel.unisci(copia(pc.registro)); pc.unisci(copia(tel.registro));
  for (const d of [tel, pc]) assert.deepEqual(Core.faccende(d.registro, OGGI).map((f) => [f.cadenza, f.salto]), [[15, OGGI]]);
});

test('primo uso: il lunedì della settimana più vecchia con dei dati', () => {
  const tel = dispositivo('telefono');
  assert.equal(Core.primoUso(tel.registro), null);
  tel.aggiungi('2026-10-12', 'Sviluppo');
  tel.riposo('2026-09-28', 6, true);
  assert.equal(Core.primoUso(tel.registro), '2026-09-28');
});

test('validazione delle chiavi nuove', () => {
  const e = (v) => ({ v, t: 1, d: 'pc' });
  const reg = Core.valida({
    'v/a/cad': e(14), 'v/b/cad': e(false), 'v/c/cad': e(0), 'v/d/cad': e(2.5), 'v/e/cad': e('14'),
    'v/a/salto': e('2026-10-22'), 'v/b/salto': e(''), 'v/c/salto': e('2026-02-30'), 'v/d/salto': e(true),
    'i/intensita': e('decisa'),
  });
  assert.deepEqual(Object.keys(reg).sort(), ['i/intensita', 'v/a/cad', 'v/a/salto', 'v/b/cad', 'v/b/salto']);
  assert.equal(Core.vista(Core.valida({ 'i/intensita': e('rossa') })).intensita, 'morbida');
});

test('date: aritmetica in giorni di calendario', () => {
  assert.equal(Core.piuGiorni('2026-10-19', 3), '2026-10-22');
  assert.equal(Core.piuGiorni('2026-03-28', 2), '2026-03-30');   // cambio dell'ora legale: non conta
  assert.equal(Core.giorniTra('2026-10-06', '2026-10-22'), 16);
  assert.equal(Core.eData('2026-02-29'), false);
  assert.equal(Core.eData('2028-02-29'), true);
});
