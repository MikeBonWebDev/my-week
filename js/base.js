// js/base.js — impostazioni, elementi della pagina, date, dati (caricare, salvare, esito delle azioni).
import * as Core from '../core.js';

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
   la "vista a un giorno". disegnaSettimana() sceglie quale, in base a una media query letta da JavaScript (telefono).

   I FILE (per livelli e gruppi: vedi README §4 e test/struttura.test.js)
     comuni        base.js       impostazioni, elementi, date e oggi, dati e loro letture, salvare, esito, conferma,
                                 disegna
                   testi.js      le parole e le date: «Fatta il 23 settembre», «giro aperto dall'8 ottobre», formati
                   pezzi.js      pezzi di interfaccia comuni: el() per costruire elementi, il nome da rinominare, il calore
                   sezioni.js    il registro delle sezioni e la navigazione
     Settimana     promemoria.js il promemoria delle faccende in cima alla settimana, con le sue scelte
                   settimana.js  la settimana mostrata: tabella e vista a un giorno
                   azioni.js     aggiungere, suggerimenti, spuntare, togliere, energia, riposo, cambiare settimana
     Casa          casa.js       le faccende
     Dati          file.js       ultimo salvataggio e unione, CSV, sincronizzazione
     menu          libreria.js   il pannello «Libreria delle attività»
     avvio         guscio.js     il punto di partenza (l'unico caricato da index.html): registra le sezioni, menu,
                                 avvio, app installabile

   MODULI
   Ogni file è un modulo ES: ciò che vuole condividere lo dichiara con export, ciò che gli serve lo chiede per
   nome con import, in cima al file. Così ogni file ha i suoi nomi (due file possono avere ciascuno il suo
   «foglio»), le dipendenze sono scritte, e se un modulo chiede un nome che non esiste il browser non avvia
   l'app: l'errore lo vedono subito tutti i test, non chi apre per caso quella sezione.
   Le dipendenze vanno in un verso solo, dall'alto verso il basso (vedi README §4): base.js non importa
   nessun file della pagina, e nessun file importa guscio.js. Per questo il disegno è un elenco
   (disegnaAnche, disegna) che guscio.js riempie all'avvio: base.js non deve conoscere chi disegna.
   Un valore che cambia nel tempo (state, oggiK) lo cambia solo il suo file, con una funzione (rileggi,
   cambiaOggi); gli altri lo leggono e vedono sempre il valore attuale.
   I moduli vogliono un server (npm start, oppure GitHub Pages): aprendo index.html con un doppio clic
   la pagina resta vuota.
   ───────────────────────────────────────────────────────────────────────────── */

/* ───────── Impostazioni ───────── */
const CHIAVE = 'settimana:registro';            // il registro dei dati (vedi core.js)
const CHIAVE_DISPOSITIVO = 'settimana:dispositivo';
export const CHIAVE_SYNC = 'settimana:sync';           // quando hai salvato / unito l'ultima volta: solo un'informazione
export const GIORNI = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
export const LIVELLI = ['pesa', 'ok', 'leggero'];
export const NOME_LIVELLO = { pesa: 'Pesa', ok: 'Ok', leggero: 'Leggero' };
export const SEPARATORE = ';';   // Excel in italiano vuole il punto e virgola; metti ',' per il CSV "all'americana"
export const RE_CHIAVE = /^\d{4}-\d{2}-\d{2}$/;
export const MAX_NOME = Core.MAX_NOME;
export const MAX_DETTAGLIO = Core.MAX_DETTAGLIO;
export const FINESTRA = 4;          // settimane: una voce non usata da più di così non compare tra i frequenti
export const MAX_FREQUENTI = 3;     // quanti suggerimenti a campo vuoto
export const MAX_RICERCA = 6;       // quanti suggerimenti mentre scrivi
// Al primo avvio non c'è niente: queste compaiono solo come suggerimenti, finché non ne scegli una.
// (Scriverle subito nei dati le farebbe ricomparire su un dispositivo dopo averle tolte sull'altro.)
export const ATTIVITA_INIZIALI = [
  'Suonare la chitarra',
  'Camminare',
  'Cucinare un pasto',
  'Riordinare un angolo di casa',
  'Scrivere nel diario',
  'Sentire una persona cara',
];

/* ───────── Elementi della pagina ───────── */
export const $ = (selettore) => document.querySelector(selettore);
export const rigaIntestazione = $('#intestazione-tabella');
export const corpo = $('#corpo-tabella');
export const piede = $('#piede-tabella');
export const formNuova = $('#form-nuova');
export const campoNuova = $('#nuova-attivita');
export const boxSuggerimenti = $('#suggerimenti');
export const vociSuggerite = $('#voci-suggerite');
export const notaPassata = $('#nota-passata');
const msgStato = $('#stato');
const dialogo = $('#conferma');
export const listaLibreria = $('#lista-libreria');
export const scheda = $('.scheda');
export const vistaGiorno = $('#vista-giorno');
export const striscia = $('#striscia');
export const segmenti = $('#segmenti');
export const riposoGiorno = $('#riposo-giorno');
export const carte = $('#carte');
export const bloccoAggiungi = $('#blocco-aggiungi');
export const menu = $('#menu');
// true sotto i 40rem: la stessa soglia del CSS. matches cambia da solo se ruoti il telefono o stringi la finestra.
export const telefono = matchMedia('(max-width: 40rem)');

/* ───────── Date (sempre in ora locale, mai UTC) ─────────
   Una settimana si identifica con la data del suo lunedì, scritta come testo 'AAAA-MM-GG' (la "chiave").
   Il testo ha due vantaggi: si confronta e si ordina come una stringa ('2026-10-05' < '2026-10-12'),
   e non porta con sé ore e fusi orari, che con le date sono la fonte classica di errori. */
const due = (n) => String(n).padStart(2, '0');
export const chiaveData = (d) => `${d.getFullYear()}-${due(d.getMonth() + 1)}-${due(d.getDate())}`;
export const dataDaChiave = (k) => { const [a, m, g] = k.split('-').map(Number); return new Date(a, m - 1, g); };
export const aggiungiGiorni = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
export const soloData = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
// getDay() conta da domenica (0) a sabato (6); (getDay() + 6) % 7 conta invece da lunedì (0) a domenica (6),
// cioè quanti giorni sono passati dal lunedì. Togliendoli si arriva al lunedì della stessa settimana.
const lunediDi = (d) => aggiungiGiorni(d, -((d.getDay() + 6) % 7));
const chiaveLunedi = (d) => chiaveData(lunediDi(d));

// Oggi, come 'AAAA-MM-GG'. Cambia solo da qui (cambiaOggi): se la pagina resta aperta oltre la mezzanotte,
// azioni.js se ne accorge e lo sposta.
export let oggiK = chiaveData(soloData());
export function cambiaOggi(k) { oggiK = k; }
// Il lunedì della settimana di oggi
export const lunediCorrente = () => chiaveLunedi(dataDaChiave(oggiK));

/* ───────── Dati ─────────
   I dati veri stanno nel registro del nucleo (core.js). La pagina non li modifica mai direttamente:
   chiede al nucleo (db.aggiungi, db.spunta…), poi ricostruisce la sua "vista", cioè state:
   state = {
     libreria: [{ id, name }],                    // le voci: cosa fai, in generale ("Sviluppo"). Il nome vale ovunque.
     weeks: { 'AAAA-MM-GG' (il lunedì): {
       activities: [{ id, dettaglio, tipo, giorni }], // la lista di QUESTA settimana: voce + cosa nello specifico;
                                                      // tipo 'giorni' | 'settimana' | 'faccenda', giorni = dove si vede
       done: { [id]: [bool × 7] },
       rest: [bool × 7],
       energy: [null | 'pesa' | 'ok' | 'leggero' × 7],
     } }
   } */
export const chiaveNome = Core.chiaveNome;
export const MSG_RISERVATO = '«Riposo» ed «Energia» sono nomi riservati: hanno già la loro riga.';
export const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);

// Ogni dispositivo ha un suo nome casuale: serve all'unione per decidere i pareggi sempre allo stesso modo.
function idDispositivo() {
  const nuovo = () => 'd' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  try {
    let d = localStorage.getItem(CHIAVE_DISPOSITIVO);
    if (!d || !/^d[a-z0-9]{4,30}$/.test(d)) { d = nuovo(); localStorage.setItem(CHIAVE_DISPOSITIVO, d); }
    return d;
  } catch { return nuovo(); }
}

export let avvisoIniziale = '';

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

export const db = Core.crea({ dispositivo: idDispositivo(), registro: caricaRegistro() });
export let state = db.vista();
// Ricostruisce la vista dal registro, dopo ogni modifica. È l'unico modo di cambiare state.
export function rileggi() { state = db.vista(); }
// Oggi è un giorno di riposo? (lo usano Casa e il promemoria: le schede si ammorbidiscono, senza calore)
export const riposoOggi = () => state.weeks[lunediCorrente()]?.rest[(dataDaChiave(oggiK).getDay() + 6) % 7] === true;

/* ───────── La settimana mostrata e le letture dei dati ─────────
   Qui e non in settimana.js perché servono a più sezioni: Dati esporta in CSV la settimana che stavi guardando,
   la libreria conta in quante settimane compare una voce. */
// Il lunedì della settimana che stai guardando. Cambia solo da qui: mostraSettimana.
export let visualizzata = chiaveLunedi(soloData());
export function mostraSettimana(k) { visualizzata = k; }

export const inSettimanaCorrente = () => visualizzata === lunediCorrente();

export const voce = (id) => state.libreria.find((v) => v.id === id);

// Le attività di una settimana, con il nome preso dalla libreria
export const attivitaDi = (k) => (state.weeks[k]?.activities ?? [])
  .map((a) => ({ ...a, name: voce(a.id)?.name }))
  .filter((a) => a.name);

// "Segni" = qualcosa che hai scritto tu: spunte, riposo, energia, dettagli. Una lista di attività da sola non lo è.
const haSegni = (w) => Boolean(w)
  && (Object.keys(w.done).length > 0 || w.rest.includes(true) || w.energy.some((e) => e !== null)
    || w.activities.some((a) => a.dettaglio));
export const haContenuto = (w) => Boolean(w) && (w.activities.length > 0 || haSegni(w));
// In quante settimane compare una voce (serve alla libreria: una voce usata non si cancella)
export const settimaneConVoce = (id) => Object.values(state.weeks).filter((w) => w.activities.some((a) => a.id === id)).length;

/* ───────── Il disegno ─────────
   disegna() rifà tutto ciò che si vede, dalla vista. Le parti da disegnare le mette in elenco guscio.js all'avvio,
   con disegnaAnche: la sezione aperta (sezioni.js), la libreria del menu, il puntino sulla voce Dati. Così chi
   chiede di ridisegnare non deve sapere chi disegna cosa, e base.js non deve conoscere nessuna sezione. */
const parti = [];
export function disegnaAnche(...funzioni) { parti.push(...funzioni); }
export function disegna() {
  // l'intensità del colore delle faccende (menu): vale per tutta la pagina e su tutti i dispositivi (sta nei dati)
  document.documentElement.dataset.intensita = state.intensita;
  for (const f of parti) f();
}

// Il messaggino accanto ai pulsanti ("Salvato", errori). Sparisce da solo; gli errori restano più a lungo.
let timerStato;
// È un popover: showPopover() lo porta nello strato più alto, sopra anche al menu aperto. Lo riapro a ogni
// messaggio perché finisca sopra all'ultima cosa aperta. Dove il browser non conosce i popover, resta un
// normale elemento in sovrimpressione.
const conPopover = typeof msgStato.showPopover === 'function';
export function mostraStato(testoMsg, errore = false, durata = null) {
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

/* ───────── Finestra di conferma ───────── */
// Apre la finestra di conferma e restituisce una Promise che si risolve con true (Conferma) o false
// (Annulla, Esc, clic fuori). Chi la usa scrive  const ok = await conferma(…)  e il codice si "ferma" ad aspettare
// la risposta senza bloccare la pagina. I pulsanti stanno in un <form method="dialog">: premerli chiude
// la finestra e mette il loro value in dialogo.returnValue.
export function conferma(testoDomanda, etichettaOk) {
  return new Promise((risolvi) => {
    $('#conferma-testo').textContent = testoDomanda;
    $('#conferma-ok').textContent = etichettaOk;
    dialogo.returnValue = '';
    dialogo.addEventListener('close', () => risolvi(dialogo.returnValue === 'ok'), { once: true });
    dialogo.showModal();
  });
}
// un clic sullo sfondo oscurato chiude la finestra senza confermare
dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });

// Salva il registro. Prima unisce quello che c'è già in memoria: se un'altra scheda di questo browser
// ha scritto nel frattempo, le sue modifiche non si perdono.
export function salva(silenzioso = false) {
  try {
    const altrove = leggiSalvato();
    if (altrove) db.unisci(altrove);
    localStorage.setItem(CHIAVE, JSON.stringify(Core.perFile(db.registro, db.dispositivo, new Date().toISOString())));
    if (!silenzioso) mostraStato('Salvato');
  } catch {
    mostraStato('Qui non riesco a salvare: il browser blocca la memoria locale, oppure è piena.', true);
  }
}

export const MESSAGGI = {
  vuoto: () => 'Il nome non può essere vuoto.',
  riservato: () => MSG_RISERVATO,
  'gia-in-settimana': (n) => `«${n}» è già in questa settimana.`,
  'gia-nel-giorno': (n) => `«${n}» è già in questo giorno.`,
  fatta: () => 'In questo giorno è segnata: per toglierla da qui, togli prima la spunta.',
  esiste: (n) => `Esiste già la voce «${n}».`,
  usata: () => 'Questa voce compare nello storico: non si può cancellare.',
  'gia-faccenda': (n) => `«${n}» è già in Casa: la cadenza si cambia dalla sua scheda.`,
};

// Dopo ogni richiesta al nucleo: se è andata, salvo e ricostruisco la vista; se no, dico perché.
export function esito(r, { ridisegna = true } = {}) {
  if (!r.ok) {
    mostraStato(MESSAGGI[r.errore]?.(r.nome) ?? 'Non è andata: ho ricaricato la tabella, riprova.', true);
    rileggi();
    disegna();
    return false;
  }
  salva();
  rileggi();
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
  const ridisegna = () => { rileggi(); disegna(); };
  const attivo = document.activeElement;
  if (attivo?.matches?.('input[type="text"]')) attivo.addEventListener('blur', () => setTimeout(ridisegna), { once: true });
  else ridisegna();
});
