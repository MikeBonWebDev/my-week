'use strict';
// js/file.js — i file: quando hai salvato e unito l’ultima volta, CSV, sincronizzazione tra dispositivi.
// Script classico, non un modulo: condivide le costanti e le funzioni degli altri file di js/
// (vedi l’elenco in index.html e la nota in base.js).

/* ───────── Quando hai salvato e unito l'ultima volta (solo un'informazione, nessun richiamo) ───────── */
function leggiSync() {
  try {
    const c = JSON.parse(localStorage.getItem(CHIAVE_SYNC));
    return isObj(c) ? c : {};
  } catch { return {}; }
}

// "14 ottobre 2026 (ieri)", oppure "mai, finora".
function descriviData(k) {
  if (typeof k !== 'string' || !RE_CHIAVE.test(k)) return 'mai, finora';
  const giorni = Math.round((dataDaChiave(oggiK) - dataDaChiave(k)) / 86_400_000);
  const quando = giorni <= 0 ? 'oggi' : giorni === 1 ? 'ieri' : `${giorni} giorni fa`;
  return `${fmtLungo.format(dataDaChiave(k))} (${quando})`;
}

function aggiornaSync() {
  const c = leggiSync();
  $('#ultimo-salvataggio').textContent = descriviData(c.salvato);
  $('#ultima-unione').textContent = descriviData(c.unito);
}

// Ricorda che oggi hai salvato ('salvato') o unito ('unito') un file.
function segnaSync(tipo) {
  try {
    localStorage.setItem(CHIAVE_SYNC, JSON.stringify({ ...leggiSync(), [tipo]: oggiK }));
  } catch { /* se non si può scrivere, pazienza: è solo un promemoria */ }
  aggiornaSync();
}

/* ───────── CSV: solo esportazione, per l'analisi ─────────
   Una riga per attività: Voce; sette giorni (Sì/No); Dettaglio.
   Il CSV non si ricarica: non ha i momenti delle modifiche, quindi non saprebbe partecipare all'unione
   e diventerebbe una terza versione dei dati. Per spostare i dati c'è il file di sincronizzazione. */
const valoreCella = (spuntata) => (spuntata === true ? 'Sì' : 'No');

function campoCsv(valore) {
  let t = String(valore);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;   // evita che Excel scambi un testo per una formula
  const daProteggere = t.includes(SEPARATORE) || /["\r\n]/.test(t);
  return daProteggere ? `"${t.replaceAll('"', '""')}"` : t;
}

// Le righe di una settimana: una per attività (nome, sette Sì/No, dettaglio), poi Riposo ed Energia.
function righeSettimana(k) {
  const w = state.weeks[k];
  const righe = attivitaDi(k).map((a) =>
    [a.name, ...GIORNI.map((_, i) => valoreCella(w?.done[a.id]?.[i] === true)), a.dettaglio]);
  righe.push(['Riposo', ...GIORNI.map((_, i) => valoreCella(w?.rest[i] === true)), '']);
  righe.push(['Energia', ...GIORNI.map((_, i) => NOME_LIVELLO[w?.energy[i]] ?? 'Non indicato'), '']);
  return righe;
}

// BOM (U+FEFF) = segnale UTF-8 per Excel, così le lettere accentate non si rovinano
const righeInCsv = (righe) => '\uFEFF' + righe.map((r) => r.map(campoCsv).join(SEPARATORE)).join('\r\n');

// CSV di una sola settimana: le date vanno nell'intestazione, accanto ai giorni.
function csvSettimana(k) {
  const lun = dataDaChiave(k);
  const intestazione = ['Voce', ...GIORNI.map((g, i) => `${g} ${fmtNumerica.format(aggiungiGiorni(lun, i))}`), 'Dettaglio'];
  return righeInCsv([intestazione, ...righeSettimana(k)]);
}

// CSV di tutte le settimane con qualcosa dentro, in ordine; la prima colonna dice di quale settimana è la riga.
function csvStorico() {
  const chiavi = Object.keys(state.weeks).filter((k) => haContenuto(state.weeks[k])).sort();
  if (!chiavi.length) return null;
  const righe = [['Settimana (lunedì)', 'Voce', ...GIORNI, 'Dettaglio']];
  for (const k of chiavi) {
    const lunedi = fmtNumerica.format(dataDaChiave(k));
    for (const r of righeSettimana(k)) righe.push([lunedi, ...r]);
  }
  return righeInCsv(righe);
}

// Fa scaricare un file creato al momento: il testo diventa un Blob (un file in memoria), il Blob riceve
// un indirizzo temporaneo, un link invisibile con l'attributo download lo "clicca". Poi l'indirizzo si libera.
function scarica(nomeFile, contenuto, tipo) {
  const blob = new Blob([contenuto], { type: tipo });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeFile;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

$('#scarica-settimana').addEventListener('click', () => {
  scarica(`settimana-${visualizzata}.csv`, csvSettimana(visualizzata), 'text/csv;charset=utf-8');
  mostraStato('CSV scaricato');
});

$('#scarica-storico').addEventListener('click', () => {
  const csv = csvStorico();
  if (!csv) { mostraStato('Non c’è ancora nessuna settimana con dati.'); return; }
  scarica(`storico-${oggiK}.csv`, csv, 'text/csv;charset=utf-8');
  mostraStato('Storico scaricato');
});

/* ───────── Sincronizzazione tra dispositivi ─────────
   Il file di sincronizzazione è il registro intero, nello stesso formato in cui sta nella memoria del browser.
   Unire un file = Core.unisci: per ogni informazione vince la più recente (vedi core.js). */
const nomeFileSync = () => `settimana-sync-${oggiK}.json`;
const contenutoSync = () => JSON.stringify(Core.perFile(db.registro, db.dispositivo, new Date().toISOString()));

$('#salva-sync').addEventListener('click', () => {
  scarica(nomeFileSync(), contenutoSync(), 'application/json');
  segnaSync('salvato');
  mostraStato('File di sincronizzazione salvato');
});

// Sul telefono: il menu "Condividi" del sistema, per mandare il file direttamente a Drive (o dove vuoi).
const puoInviare = (() => {
  try {
    return matchMedia('(pointer: coarse)').matches
      && Boolean(navigator.canShare?.({ files: [new File(['{}'], 'prova.json', { type: 'application/json' })] }));
  } catch { return false; }
})();
$('#invia-sync').hidden = !puoInviare;
$('#invia-sync').addEventListener('click', async () => {
  try {
    const file = new File([contenutoSync()], nomeFileSync(), { type: 'application/json' });
    await navigator.share({ files: [file], title: 'La mia settimana' });
    segnaSync('salvato');
    mostraStato('File inviato');
  } catch (err) {
    if (err?.name !== 'AbortError') mostraStato('L’invio non è riuscito: usa «Salva il file».', true);
  }
});

$('#unisci-sync').addEventListener('click', () => $('#file-sync').click());

// «Unisci un file»: leggo il file, controllo che sia un file di sincronizzazione valido, calcolo in anteprima
// cosa cambierebbe (senza toccare niente), chiedo conferma, e solo allora unisco, salvo e ridisegno.
$('#file-sync').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) { mostraStato('Il file è troppo grande per essere un mio file di sincronizzazione.', true); return; }

  let dati = null;
  let reg = null;
  try {
    dati = JSON.parse(await file.text());
    reg = Core.daFile(dati);
  } catch { /* resta null */ }
  if (!reg) { mostraStato('Non riesco a usare questo file: non sembra un file di sincronizzazione di questa app.', true); return; }

  const conto = db.unisci(reg, false);   // prima solo un'anteprima
  if (conto.nuove + conto.aggiornate === 0) {
    segnaSync('unito');
    mostraStato('Qui c’è già tutto quello che contiene il file: niente da unire.', false, 4000);
    return;
  }
  const salvatoIl = new Date(dati.salvatoIl);
  const quando = Number.isNaN(salvatoIl.getTime()) ? ''
    : ` Il file è stato salvato il ${fmtLungo.format(salvatoIl)} alle ${fmt({ hour: '2-digit', minute: '2-digit' }).format(salvatoIl)}.`;
  const n = conto.nuove + conto.aggiornate;
  const ok = await conferma(
    `Unisco il file a questo dispositivo?${quando} `
    + `Porta ${n} ${n === 1 ? 'modifica nuova o più recente' : 'modifiche nuove o più recenti'} di quelle che hai qui`
    + (conto.piuVecchie ? `; altre ${conto.piuVecchie} sono più vecchie e restano le tue.` : '.')
    + ' Non perdi niente di più recente.',
    'Unisci');
  if (!ok) return;

  db.unisci(reg);
  salva(true);
  menu.close();   // chiudo il menu: così vedi subito la settimana con i dati uniti
  state = db.vista();
  visualizzata = lunediCorrente();
  disegna();
  segnaSync('unito');
  mostraStato('File unito');
});
