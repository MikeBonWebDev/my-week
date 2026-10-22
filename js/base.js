'use strict';
// js/base.js — impostazioni, elementi della pagina, date, dati (caricare, salvare, esito delle azioni).
// Script classico, non un modulo: condivide le costanti e le funzioni degli altri file di js/
// (vedi l’elenco in index.html e la nota in base.js).

/* ─────────────────────────────────────────────────────────────────────────────
   Il codice della pagina. Le regole sui dati stanno in core.js; qui c'è tutto il resto:
   disegnare la tabella, reagire ai tocchi, salvare, esportare, sincronizzare.

   Il giro di ogni modifica, per esempio una spunta:
     1. il browser segnala l'evento (corpo.addEventListener('change', …));
     2. la pagina chiede al nucleo di registrarla:  db.spunta(settimana, id, giorno, true);
     3. esito(): se il nucleo dice ok, salva() scrive il registro nella memoria del browser
        e state = db.vista() ricostruisce la "vista" (la tabella sotto forma di oggetti);
     4. disegna() rifà la tabella dalla vista (su computer, per le spunte non serve: la casella è già spuntata).

   Due modi di mostrare la stessa settimana: su computer la tabella, su telefono (sotto i 40rem di larghezza)
   la "vista a un giorno". disegna() sceglie quale, in base a una media query letta da JavaScript (telefono).

   I FILE (caricati in quest'ordine da index.html)
     base.js       impostazioni, elementi della pagina, date, dati (caricare, salvare, esito)
     settimana.js  la settimana visualizzata e il disegno: tabella e vista a un giorno
     libreria.js   il pannello «Libreria delle attività»
     azioni.js     aggiungere, suggerimenti, spuntare, togliere, energia, riposo, cambiare settimana
     file.js       ultimo salvataggio e unione, CSV, sincronizzazione
     guscio.js     menu, finestra di conferma, avvio, app installabile

   PERCHÉ FUNZIONA SENZA import/export
   Sono script classici, non moduli. Le costanti e le funzioni scritte "in cima" a uno script classico finiscono
   in un ambito comune a tutta la pagina: guscio.js può chiamare disegna() di settimana.js, e azioni.js può
   assegnare state di base.js. Due regole: un nome si dichiara una volta sola in tutti i file; e il codice che
   gira subito (non dentro una funzione) può usare solo ciò che è definito nei file caricati prima.
   Così non serve nessuno strumento di compilazione, e la pagina si apre anche come file locale (i moduli no).
   ───────────────────────────────────────────────────────────────────────────── */

/* ───────── Impostazioni ───────── */
const Core = window.SettimanaCore;
const CHIAVE = 'settimana:registro';            // il registro dei dati (vedi core.js)
const CHIAVE_DISPOSITIVO = 'settimana:dispositivo';
const CHIAVE_SYNC = 'settimana:sync';           // quando hai salvato / unito l'ultima volta: solo un'informazione
const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const LIVELLI = ['pesa', 'ok', 'leggero'];
const NOME_LIVELLO = { pesa: 'Pesa', ok: 'Ok', leggero: 'Leggero' };
const SEPARATORE = ';';   // Excel in italiano vuole il punto e virgola; metti ',' per il CSV "all'americana"
const RE_CHIAVE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOME = Core.MAX_NOME;
const MAX_DETTAGLIO = Core.MAX_DETTAGLIO;
const FINESTRA = 4;          // settimane: una voce non usata da più di così non compare tra i frequenti
const MAX_FREQUENTI = 3;     // quanti suggerimenti a campo vuoto
const MAX_RICERCA = 6;       // quanti suggerimenti mentre scrivi
// Al primo avvio non c'è niente: queste compaiono solo come suggerimenti, finché non ne scegli una.
// (Scriverle subito nei dati le farebbe ricomparire su un dispositivo dopo averle tolte sull'altro.)
const ATTIVITA_INIZIALI = [
  'Suonare la chitarra',
  'Camminare',
  'Cucinare un pasto',
  'Riordinare un angolo di casa',
  'Scrivere nel diario',
  'Sentire una persona cara',
];

/* ───────── Elementi della pagina ───────── */
const $ = (selettore) => document.querySelector(selettore);
const rigaIntestazione = $('#intestazione-tabella');
const corpo = $('#corpo-tabella');
const piede = $('#piede-tabella');
const formNuova = $('#form-nuova');
const campoNuova = $('#nuova-attivita');
const boxSuggerimenti = $('#suggerimenti');
const vociSuggerite = $('#voci-suggerite');
const boxRiprendi = $('#riprendi');
const notaPassata = $('#nota-passata');
const msgStato = $('#stato');
const dialogo = $('#conferma');
const listaLibreria = $('#lista-libreria');
const scheda = $('.scheda');
const vistaGiorno = $('#vista-giorno');
const striscia = $('#striscia');
const segmenti = $('#segmenti');
const riposoGiorno = $('#riposo-giorno');
const carte = $('#carte');
const bloccoAggiungi = $('#blocco-aggiungi');
const menu = $('#menu');
// true sotto i 40rem: la stessa soglia del CSS. matches cambia da solo se ruoti il telefono o stringi la finestra.
const telefono = matchMedia('(max-width: 40rem)');

/* ───────── Date (sempre in ora locale, mai UTC) ─────────
   Una settimana si identifica con la data del suo lunedì, scritta come testo 'AAAA-MM-GG' (la "chiave").
   Il testo ha due vantaggi: si confronta e si ordina come una stringa ('2026-10-05' < '2026-10-12'),
   e non porta con sé ore e fusi orari, che con le date sono la fonte classica di errori. */
const due = (n) => String(n).padStart(2, '0');
const chiaveData = (d) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
const dataDaChiave = (k) => { const [a, m, g] = k.split('-').map(Number); return new Date(a, m - 1, g); };
const aggiungiGiorni = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const soloData = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// getDay() conta da domenica (0) a sabato (6); (getDay() + 6) % 7 conta invece da lunedì (0) a domenica (6),
// cioè quanti giorni sono passati dal lunedì. Togliendoli si arriva al lunedì della stessa settimana.
const lunediDi = (d) => aggiungiGiorni(d, -((d.getDay() + 6) % 7));
const chiaveLunedi = (d) => chiaveData(lunediDi(d));

const fmtNumerica = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
const fmtLungo = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
const fmt = (opzioni) => new Intl.DateTimeFormat('it-IT', opzioni);

// Il titolo della settimana: "12 – 18 ottobre 2026", oppure con mese o anno ripetuti se la settimana li scavalca.
function etichettaPeriodo(lun) {
  const dom = aggiungiGiorni(lun, 6);
  const lungo = { day: 'numeric', month: 'long' };
  if (lun.getFullYear() !== dom.getFullYear()) {
    const conAnno = { ...lungo, year: 'numeric' };
    return `${fmt(conAnno).format(lun)} – ${fmt(conAnno).format(dom)}`;
  }
  if (lun.getMonth() !== dom.getMonth()) {
    return `${fmt(lungo).format(lun)} – ${fmt(lungo).format(dom)} ${dom.getFullYear()}`;
  }
  return `${lun.getDate()} – ${fmt(lungo).format(dom)} ${dom.getFullYear()}`;
}

/* ───────── Dati ─────────
   I dati veri stanno nel registro del nucleo (core.js). La pagina non li modifica mai direttamente:
   chiede al nucleo (db.aggiungi, db.spunta…), poi ricostruisce la sua "vista", cioè state:
   state = {
     libreria: [{ id, name }],                    // le voci: cosa fai, in generale ("Sviluppo"). Il nome vale ovunque.
     weeks: { 'AAAA-MM-GG' (il lunedì): {
       activities: [{ id, dettaglio }],            // la lista di QUESTA settimana: voce + cosa nello specifico
       done: { [id]: [bool × 7] },
       rest: [bool × 7],
       energy: [null | 'pesa' | 'ok' | 'leggero' × 7],
     } }
   } */
const chiaveNome = Core.chiaveNome;
const MSG_RISERVATO = '«Riposo» ed «Energia» sono nomi riservati: hanno già la loro riga.';
const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

// Ogni dispositivo ha un suo nome casuale: serve all'unione per decidere i pareggi sempre allo stesso modo.
function idDispositivo() {
  const nuovo = () => 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  try {
    let d = localStorage.getItem(CHIAVE_DISPOSITIVO);
    if (!d || !/^d[a-z0-9]{4,30}$/.test(d)) { d = nuovo(); localStorage.setItem(CHIAVE_DISPOSITIVO, d); }
    return d;
  } catch { return nuovo(); }
}

let avvisoIniziale = '';

// Il registro salvato in questo browser (stesso formato del file di sincronizzazione), oppure null
function leggiSalvato() {
  try {
    const testo = localStorage.getItem(CHIAVE);
    return testo ? Core.daFile(JSON.parse(testo)) : null;
  } catch { return null; }
}

// All'avvio: il registro salvato, oppure uno vuoto. Se i dati salvati sono rovinati non li butto:
// li copio a parte (si possono recuperare a mano) e riparto da zero, avvisando.
function caricaRegistro() {
  try {
    const testo = localStorage.getItem(CHIAVE);
    if (!testo) return {};
    const reg = leggiSalvato();
    if (reg) return reg;
    try { localStorage.setItem(CHIAVE + ':illeggibile', testo); } catch { /* pazienza */ }
    avvisoIniziale = 'I dati salvati non erano leggibili: ne ho tenuto una copia a parte e sono ripartito da zero.';
  } catch { /* memoria locale non accessibile */ }
  return {};
}

const db = Core.crea({ dispositivo: idDispositivo(), registro: caricaRegistro() });
let state = db.vista();

// Il messaggino accanto ai pulsanti ("Salvato", errori). Sparisce da solo; gli errori restano più a lungo.
let timerStato;
// È un popover: showPopover() lo porta nello strato più alto, sopra anche al menu aperto. Lo riapro a ogni
// messaggio perché finisca sopra all'ultima cosa aperta. Dove il browser non conosce i popover, resta un
// normale elemento in sovrimpressione.
const conPopover = typeof msgStato.showPopover === 'function';
function mostraStato(testoMsg, errore = false, durata = null) {
  msgStato.textContent = testoMsg;
  msgStato.classList.toggle('errore', errore);
  if (conPopover) {
    try {
      if (msgStato.matches(':popover-open')) msgStato.hidePopover();
      msgStato.showPopover();
    } catch { /* niente: il messaggio resta comunque nel documento */ }
  }
  msgStato.classList.add('visibile');
  clearTimeout(timerStato);
  timerStato = setTimeout(() => {
    msgStato.classList.remove('visibile');
    // tolgo il popover dopo la dissolvenza
    timerStato = setTimeout(() => { if (conPopover) { try { msgStato.hidePopover(); } catch { /* già chiuso */ } } }, 400);
  }, durata ?? (errore ? 6000 : 1500));
}

// Salva il registro. Prima unisce quello che c'è già in memoria: se un'altra scheda di questo browser
// ha scritto nel frattempo, le sue modifiche non si perdono.
function salva(silenzioso = false) {
  try {
    const altrove = leggiSalvato();
    if (altrove) db.unisci(altrove);
    localStorage.setItem(CHIAVE, JSON.stringify(Core.perFile(db.registro, db.dispositivo, new Date().toISOString())));
    if (!silenzioso) mostraStato('Salvato');
  } catch {
    mostraStato('Qui non riesco a salvare: il browser blocca la memoria locale, oppure è piena.', true);
  }
}

const MESSAGGI = {
  vuoto: () => 'Il nome non può essere vuoto.',
  riservato: () => MSG_RISERVATO,
  'gia-in-settimana': (n) => `«${n}» è già in questa settimana.`,
  esiste: (n) => `Esiste già la voce «${n}».`,
  usata: () => 'Questa voce compare nello storico: non si può cancellare.',
};

// Dopo ogni richiesta al nucleo: se è andata, salvo e ricostruisco la vista; se no, dico perché.
function esito(r, { ridisegna = true } = {}) {
  if (!r.ok) {
    mostraStato(MESSAGGI[r.errore]?.(r.nome) ?? 'Non è andata: ho ricaricato la tabella, riprova.', true);
    state = db.vista();
    disegna();
    return false;
  }
  salva();
  state = db.vista();
  if (ridisegna) disegna();
  return true;
}

// Un'altra scheda di questo browser ha salvato: unisco le sue modifiche e aggiorno la tabella.
// Se stai scrivendo in un campo, aspetto che tu abbia finito.
window.addEventListener('storage', (e) => {
  if (e.key !== CHIAVE || !e.newValue) return;
  let reg = null;
  try { reg = Core.daFile(JSON.parse(e.newValue)); } catch { /* ignoro */ }
  if (!reg) return;
  const conto = db.unisci(reg);
  if (conto.nuove + conto.aggiornate === 0) return;
  const ridisegna = () => { state = db.vista(); disegna(); };
  const attivo = document.activeElement;
  if (attivo?.matches?.('input[type="text"]')) attivo.addEventListener('blur', () => setTimeout(ridisegna), { once: true });
  else ridisegna();
});
