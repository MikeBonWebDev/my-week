// js/sezioni.js — il registro delle sezioni dell'app e la navigazione tra loro.
// Ogni sezione si descrive con un oggetto (nome, titolo, sottotitolo, elemento, disegna, quandoSiApre) e guscio.js
// le registra all'avvio, nell'ordine in cui compaiono. Da qui in poi una sezione nuova non tocca la navigazione:
// le basta descriversi ed essere registrata. Chi ha bisogno di sapere quando si cambia sezione (il promemoria, per
// esempio) si iscrive con quandoCambiaSezione, invece di farsi chiamare da un'altra sezione.
import { $, disegna } from './base.js';

/* ───────── Il registro ─────────
   Una sezione:
     nome          'casa' (lo stesso di data-sezione sul suo pulsante nella barra)
     titolo        «Casa»: il titolo in testa alla pagina, e il nome nella scheda del browser
     sottotitolo   la riga sotto il titolo
     elemento      l'elemento della pagina con il contenuto della sezione (si mostra solo quando è aperta)
     disegna       ridisegna il contenuto; si chiama solo se la sezione è aperta
     quandoSiApre  (facoltativo) cosa fare quando la apri, prima di disegnarla: Casa, per esempio, fissa l'ordine */
const registro = new Map();
const NOME_APP = 'La mia settimana';

export function registraSezioni(...sezioni) {
  for (const s of sezioni) registro.set(s.nome, s);
}

/* ───────── La sezione aperta ─────────
   Una sola alla volta. La scelta resta su questo dispositivo (localStorage), così l'app riapre dove l'avevi
   lasciata. Non è un dato da sincronizzare. */
const CHIAVE_SEZIONE = 'settimana:sezione';
const navSezioni = $('#sezioni');
let aperta = null;

// La sezione da aprire all'avvio: quella dell'ultima volta, se esiste ancora; altrimenti la prima registrata.
export function sezioneIniziale() {
  let s = null;
  try { s = localStorage.getItem(CHIAVE_SEZIONE); } catch { /* memoria non accessibile */ }
  return registro.has(s ?? '') ? s : registro.keys().next().value;
}

// Chi vuole sapere quando si passa da una sezione all'altra (non quando si riapre la stessa)
const avvisi = [];
export function quandoCambiaSezione(funzione) { avvisi.push(funzione); }

export function mostraSezione(nome) {
  const s = registro.get(nome);
  if (!s) return;
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
export function disegnaSezioneAperta() {
  registro.get(aperta)?.disegna();
}

navSezioni.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sezione]');
  if (b) mostraSezione(b.dataset.sezione);
});
