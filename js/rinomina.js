// js/rinomina.js — il foglio «Rinomina», che si apre toccando il nome di una voce in qualunque sezione.
// Sta nei comuni perché lo usano la Settimana (schede e tabella) e Casa: un pulsante con data-rinomina="<id>"
// (nomeRinominabile in pezzi.js) basta per aprirlo. Non esporta niente: lo carica guscio.js.
import * as Core from '../core.js';
import { $, chiaveNome, db, esito, MAX_NOME, MESSAGGI, mostraStato, MSG_RISERVATO, settimaneConVoce, state, voce } from './base.js';

/* ───────── Rinomina, dal nome della voce ─────────
   Toccando il nome (scheda del telefono, tabella, Casa) si apre il foglio. Dice cosa succede — il nome cambia in tutte
   le settimane — e non salva un nome vuoto, riservato o già usato da un'altra voce. */
const foglioRinomina = $('#foglio-rinomina');
const campoRinomina = $('#nome-rinomina');
let rinominaId = null;
let rinominaDa = null;   // il pulsante che ha aperto il foglio, per rimettergli il fuoco

function apriRinomina(id, da) {
  const v = voce(id);
  if (!v) return;
  rinominaId = id;
  rinominaDa = da;
  campoRinomina.value = v.name;
  $('#titolo-rinomina').textContent = `Rinomina «${v.name}»`;
  const n = settimaneConVoce(id);
  $('#nota-rinomina').textContent = (n > 1
    ? `Il nome cambia in tutte le ${n} settimane in cui compare, anche nel passato.`
    : 'Il nome cambia ovunque compaia questa voce.')
    + ' Per una nota solo di questa settimana c’è il dettaglio.';
  aggiornaRinomina();
  foglioRinomina.showModal();
  campoRinomina.select();
}

// Il nome scritto si può salvare? Se no, la nota dice perché (e Salva resta spento)
function aggiornaRinomina() {
  const v = voce(rinominaId);
  const nuovo = Core.pulisci(campoRinomina.value, MAX_NOME);
  const doppione = nuovo && state.libreria.find((x) => x.id !== rinominaId && chiaveNome(x.name) === chiaveNome(nuovo));
  let avviso = '';
  if (!nuovo) avviso = MESSAGGI.vuoto();
  else if (Core.eRiservato(nuovo)) avviso = MSG_RISERVATO;
  else if (doppione) avviso = MESSAGGI.esiste(doppione.name);
  $('#avviso-rinomina').textContent = avviso;
  $('#salva-rinomina').disabled = Boolean(avviso) || !v || nuovo === v.name;
}

function salvaRinomina() {
  if ($('#salva-rinomina').disabled) return;
  const id = rinominaId;
  const nuovo = Core.pulisci(campoRinomina.value, MAX_NOME);
  foglioRinomina.close();
  if (esito(db.rinomina(id, nuovo))) {
    mostraStato(`Ora si chiama «${nuovo}».`);
    // il pulsante è stato ridisegnato: il fuoco va su quello nuovo della stessa voce, nella sezione aperta
    [...document.querySelectorAll(`[data-rinomina="${id}"]`)].find((b) => b.offsetParent !== null)?.focus();
  }
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-rinomina]');
  if (b) apriRinomina(b.dataset.rinomina, b);
});
campoRinomina.addEventListener('input', aggiornaRinomina);
campoRinomina.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  salvaRinomina();
});
$('#salva-rinomina').addEventListener('click', salvaRinomina);
$('#annulla-rinomina').addEventListener('click', () => foglioRinomina.close());
$('#chiudi-rinomina').addEventListener('click', () => foglioRinomina.close());
foglioRinomina.addEventListener('click', (e) => { if (e.target === foglioRinomina) foglioRinomina.close(); });
// chiuso senza salvare (Annulla, Esc, ×, sfondo): il fuoco torna sul nome toccato, se c'è ancora
foglioRinomina.addEventListener('close', () => { if (rinominaDa && document.contains(rinominaDa)) rinominaDa.focus(); });
