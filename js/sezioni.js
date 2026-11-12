// js/sezioni.js — il registro delle sezioni dell'app e la navigazione tra loro.
// Ogni sezione si descrive con un oggetto (nome, titolo, sottotitolo, elemento, disegna…) e guscio.js
// le registra all'avvio, nell'ordine in cui compaiono. Da qui in poi una sezione nuova non tocca la navigazione:
// le basta descriversi ed essere registrata. Chi ha bisogno di sapere quando si cambia sezione (il promemoria, per
// esempio) si iscrive con quandoCambiaSezione, invece di farsi chiamare da un'altra sezione.
import { $, disegna, oggiK, RE_CHIAVE, state } from './base.js';

/* ───────── Il registro ─────────
   Una sezione:
     nome          'casa' (lo stesso di data-sezione sul suo pulsante nella barra)
     titolo        «Casa»: il titolo in testa alla pagina, e il nome nella scheda del browser
     sottotitolo   la riga sotto il titolo
     elemento      l'elemento della pagina con il contenuto della sezione (si mostra solo quando è aperta)
     disegna       ridisegna il contenuto; si chiama solo se la sezione è aperta
     quandoSiApre  (facoltativo) cosa fare quando la apri, prima di disegnarla: Casa, per esempio, fissa l'ordine
     dopoApertura  (facoltativo) cosa fare quando ci arrivi da un'altra sezione, dopo il disegno e dopo che la pagina
                   è tornata in cima: riceve il nome della sezione da cui arrivi (la Panoramica rimette il fuoco
                   sulla sua card)
     scheda        (facoltativo) la card della sezione nella Panoramica: una funzione senza argomenti che restituisce
                   solo testo, da zero a tre righe (PIANO.md §3.5.2). Senza scheda, niente card.
     spegnibile    (facoltativo) true se si può spegnere dalle Impostazioni. Panoramica, Settimana, Casa e Dati no.
     strumento     (facoltativo) true per Dati: si apre dal suo pulsante in alto, accanto all'ingranaggio, e non sta
                   nella navigazione (colonna, barra, «Altro», ventaglio)

   Una sezione spenta (state.spente, dal registro: i/spenta/<nome>) sparisce dalla navigazione e non si apre; i suoi
   dati restano. Accesa o spenta vale su tutti i dispositivi. */
const registro = new Map();
const NOME_APP = 'La mia settimana';

export function registraSezioni(...sezioni) {
  for (const s of sezioni) registro.set(s.nome, s);
}

const accesa = (s) => Boolean(s) && !(s.spegnibile && state.spente.includes(s.nome));
const primaAccesa = () => [...registro.values()].find(accesa)?.nome;

// Le sezioni accese della navigazione, nell'ordine del registro (Dati, che è uno strumento, no): per navigazione.js
export const sezioniAccese = () => [...registro.values()].filter((s) => accesa(s) && !s.strumento)
  .map((s) => ({ nome: s.nome, titolo: s.titolo }));

// Le sezioni accese con una card, nell'ordine del registro: per la Panoramica (panoramica.js)
export const schedeAccese = () => [...registro.values()].filter((s) => accesa(s) && s.scheda)
  .map((s) => ({ nome: s.nome, scheda: s.scheda }));

// Le sezioni che si possono spegnere, nell'ordine del registro, con il loro stato: per le Impostazioni (guscio.js)
export const sezioniSpegnibili = () => [...registro.values()].filter((s) => s.spegnibile)
  .map((s) => ({ nome: s.nome, titolo: s.titolo, accesa: accesa(s) }));

/* ───────── La sezione aperta ─────────
   Una sola alla volta. All'avvio si apre sempre la prima del registro, la Panoramica (PIANO.md §3.5.1).

   Quando hai aperto l'ultima volta ogni sezione resta su questo dispositivo (localStorage, settimana:aperta: un oggetto
   { nome: 'AAAA-MM-GG' }): la Panoramica lo scrive sotto le card, «aperta ieri». Non è un dato da sincronizzare:
   dice cosa hai aperto su questo telefono. */
const CHIAVE_APERTA = 'settimana:aperta';
const navSezioni = $('#sezioni');
const testata = $('.testata');
let aperta = null;
// La sezione aperta adesso (il nome): per la navigazione. Cambia solo da qui, con mostraSezione.
export const sezioneAperta = () => aperta;

// La sezione da aprire all'avvio: la prima accesa, cioè la Panoramica.
export const sezioneIniziale = () => primaAccesa();

function leggiAperte() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE_APERTA));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
  } catch { return {}; }
}
// Il giorno in cui hai aperto una sezione l'ultima volta su questo dispositivo ('AAAA-MM-GG'), oppure null
export function apertaIl(nome) {
  const k = leggiAperte()[nome];
  return typeof k === 'string' && RE_CHIAVE.test(k) ? k : null;
}
function segnaAperta(nome) {
  try { localStorage.setItem(CHIAVE_APERTA, JSON.stringify({ ...leggiAperte(), [nome]: oggiK })); } catch { /* pazienza */ }
}

// Chi vuole sapere quando si passa da una sezione all'altra (non quando si riapre la stessa)
const avvisi = [];
export function quandoCambiaSezione(funzione) { avvisi.push(funzione); }

export function mostraSezione(nome) {
  const s = registro.get(nome);
  if (!s) return;
  if (!accesa(s)) { mostraSezione(primaAccesa()); return; }   // spenta: si apre la prima accesa
  const cambia = nome !== aperta;
  const precedente = aperta;
  aperta = nome;
  segnaAperta(nome);
  for (const altra of registro.values()) altra.elemento.hidden = altra !== s;
  for (const b of [...navSezioni.querySelectorAll('[data-sezione]'), ...testata.querySelectorAll('[data-sezione]')]) {
    if (b.dataset.sezione === nome) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  $('#titolo-sezione').textContent = s.titolo;
  $('#sottotitolo').textContent = s.sottotitolo;
  document.title = s.titolo === NOME_APP ? NOME_APP : `${s.titolo} · ${NOME_APP}`;
  if (cambia) for (const avviso of avvisi) avviso(nome);
  s.quandoSiApre?.();
  disegna();
  if (!cambia) return;
  window.scrollTo(0, 0);
  s.dopoApertura?.(precedente);
}

// Una delle parti di disegna() (base.js): ridisegna solo la sezione aperta. Le altre si ridisegnano quando le apri.
// Se la sezione aperta è stata spenta (anche da un altro dispositivo, con un file unito), si passa alla prima accesa.
// Quali pulsanti si vedono lo decide la navigazione (navigazione.js), che si disegna dopo.
export function disegnaSezioneAperta() {
  if (aperta && !accesa(registro.get(aperta))) { mostraSezione(primaAccesa()); return; }
  registro.get(aperta)?.disegna();
}

// I pulsanti delle sezioni: nella colonna o barra, e Dati in alto
for (const contenitore of [navSezioni, testata]) {
  contenitore.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sezione]');
    if (b) mostraSezione(b.dataset.sezione);
  });
}
