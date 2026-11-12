// js/sezioni.js — il registro delle sezioni dell'app e la navigazione tra loro.
// Ogni sezione si descrive con un oggetto (nome, titolo, sottotitolo, elemento, disegna, quandoSiApre) e guscio.js
// le registra all'avvio, nell'ordine in cui compaiono. Da qui in poi una sezione nuova non tocca la navigazione:
// le basta descriversi ed essere registrata. Chi ha bisogno di sapere quando si cambia sezione (il promemoria, per
// esempio) si iscrive con quandoCambiaSezione, invece di farsi chiamare da un'altra sezione.
import { $, disegna, state } from './base.js';

/* ───────── Il registro ─────────
   Una sezione:
     nome          'casa' (lo stesso di data-sezione sul suo pulsante nella barra)
     titolo        «Casa»: il titolo in testa alla pagina, e il nome nella scheda del browser
     sottotitolo   la riga sotto il titolo
     elemento      l'elemento della pagina con il contenuto della sezione (si mostra solo quando è aperta)
     disegna       ridisegna il contenuto; si chiama solo se la sezione è aperta
     quandoSiApre  (facoltativo) cosa fare quando la apri, prima di disegnarla: Casa, per esempio, fissa l'ordine
     spegnibile    (facoltativo) true se si può spegnere dalle Impostazioni. Settimana, Casa e Dati no.

   Una sezione spenta (state.spente, dal registro: i/spenta/<nome>) sparisce dalla navigazione e non si apre; i suoi
   dati restano. Accesa o spenta vale su tutti i dispositivi. */
const registro = new Map();
const NOME_APP = 'La mia settimana';

export function registraSezioni(...sezioni) {
  for (const s of sezioni) registro.set(s.nome, s);
}

const accesa = (s) => Boolean(s) && !(s.spegnibile && state.spente.includes(s.nome));
const primaAccesa = () => [...registro.values()].find(accesa)?.nome;

// Le sezioni accese, nell'ordine del registro: per la navigazione (navigazione.js)
export const sezioniAccese = () => [...registro.values()].filter(accesa).map((s) => ({ nome: s.nome, titolo: s.titolo }));

// Le sezioni che si possono spegnere, nell'ordine del registro, con il loro stato: per le Impostazioni (guscio.js)
export const sezioniSpegnibili = () => [...registro.values()].filter((s) => s.spegnibile)
  .map((s) => ({ nome: s.nome, titolo: s.titolo, accesa: accesa(s) }));

/* ───────── La sezione aperta ─────────
   Una sola alla volta. La scelta resta su questo dispositivo (localStorage), così l'app riapre dove l'avevi
   lasciata. Non è un dato da sincronizzare. */
const CHIAVE_SEZIONE = 'settimana:sezione';
const navSezioni = $('#sezioni');
let aperta = null;
// La sezione aperta adesso (il nome): per la navigazione. Cambia solo da qui, con mostraSezione.
export const sezioneAperta = () => aperta;

// La sezione da aprire all'avvio: quella dell'ultima volta, se esiste ancora ed è accesa; altrimenti la prima accesa.
export function sezioneIniziale() {
  let s = null;
  try { s = localStorage.getItem(CHIAVE_SEZIONE); } catch { /* memoria non accessibile */ }
  return accesa(registro.get(s ?? '')) ? s : primaAccesa();
}

// Chi vuole sapere quando si passa da una sezione all'altra (non quando si riapre la stessa)
const avvisi = [];
export function quandoCambiaSezione(funzione) { avvisi.push(funzione); }

export function mostraSezione(nome) {
  const s = registro.get(nome);
  if (!s) return;
  if (!accesa(s)) { mostraSezione(primaAccesa()); return; }   // spenta: si apre la prima accesa
  const cambia = nome !== aperta;
  aperta = nome;
  try { localStorage.setItem(CHIAVE_SEZIONE, nome); } catch { /* pazienza: si riaprirà sulla prima */ }
  for (const altra of registro.values()) altra.elemento.hidden = altra !== s;
  for (const b of navSezioni.querySelectorAll('[data-sezione]')) {
    if (b.dataset.sezione === nome) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  $('#titolo-sezione').textContent = s.titolo;
  $('#sottotitolo').textContent = s.sottotitolo;
  document.title = s.titolo === NOME_APP ? NOME_APP : `${s.titolo} · ${NOME_APP}`;
  if (cambia) for (const avviso of avvisi) avviso(nome);
  s.quandoSiApre?.();
  disegna();
  if (cambia) window.scrollTo(0, 0);
}

// Una delle parti di disegna() (base.js): ridisegna solo la sezione aperta. Le altre si ridisegnano quando le apri.
// Se la sezione aperta è stata spenta (anche da un altro dispositivo, con un file unito), si passa alla prima accesa.
// Quali pulsanti si vedono lo decide la navigazione (navigazione.js), che si disegna dopo.
export function disegnaSezioneAperta() {
  if (aperta && !accesa(registro.get(aperta))) { mostraSezione(primaAccesa()); return; }
  registro.get(aperta)?.disegna();
}

navSezioni.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sezione]');
  if (b) mostraSezione(b.dataset.sezione);
});
