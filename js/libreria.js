// js/libreria.js — il pannello «Libreria delle attività» del menu.
import * as Core from '../core.js';
import {
  $, chiaveNome, conferma, dataDaChiave, db, esito, listaLibreria, MAX_NOME, MESSAGGI, mostraStato, MSG_RISERVATO,
  settimaneConVoce, state, voce
} from './base.js';
import { fmtBreve } from './testi.js';
import { el } from './pezzi.js';

/* ───────── Libreria ───────── */
// Il pannello «Libreria delle attività»: ogni voce con nome modificabile, in quante settimane compare,
// l'ultima volta che l'hai usata e, solo se non l'hai mai usata, il pulsante per cancellarla.
export function aggiornaLibreria() {
  const voci = [...state.libreria].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  $('#conta-libreria').textContent = `(${voci.length})`;
  if (!voci.length) {
    listaLibreria.replaceChildren(el('li', {
      class: 'lib-vuota', testo: 'La libreria è vuota: si riempie da sola quando aggiungi un’attività alla settimana.',
    }));
    return;
  }
  listaLibreria.replaceChildren(...voci.map((v) => {
    const usate = settimaneConVoce(v.id);
    const ultima = Object.keys(state.weeks).filter((k) => state.weeks[k].activities.some((a) => a.id === v.id)).sort().pop();
    return el('li', { class: 'lib-voce' },
      el('input', {
        type: 'text', class: 'lib-nome', value: v.name, maxLength: MAX_NOME, dataset: { id: v.id },
        aria: { label: `Nome della voce «${v.name}»` },
      }),
      el('span', {
        class: 'lib-info',
        testo: usate
          ? `in ${usate} ${usate === 1 ? 'settimana' : 'settimane'} · ultima: ${fmtBreve.format(dataDaChiave(ultima))}`
          : 'mai usata',
      }),
      // solo una voce mai usata si può cancellare
      !usate && el('button', {
        type: 'button', class: 'pulsante secondario piccolo', dataset: { id: v.id, azione: 'cancella' }, testo: 'Cancella',
        aria: { label: `Cancella «${v.name}» dalla libreria` },
      }));
  }));
}

// Rinominare una voce. I controlli (vuoto, riservato, doppione) li rifà anche il nucleo; qui li anticipo
// per non chiedere conferma di una cosa che poi verrebbe rifiutata.
listaLibreria.addEventListener('change', async (e) => {
  const campo = e.target;
  if (!campo.matches('.lib-nome')) return;
  const v = voce(campo.dataset.id);
  if (!v) return;
  const nuovo = Core.pulisci(campo.value, MAX_NOME);
  if (!nuovo || nuovo === v.name) { campo.value = v.name; return; }
  const doppione = state.libreria.find((x) => x.id !== v.id && chiaveNome(x.name) === chiaveNome(nuovo));
  if (doppione || Core.eRiservato(nuovo)) {
    campo.value = v.name;
    mostraStato(doppione ? MESSAGGI.esiste(doppione.name) : MSG_RISERVATO, true);
    return;
  }
  const usate = settimaneConVoce(v.id);
  if (usate > 0) {
    const ok = await conferma(
      `Il nuovo nome «${nuovo}» varrà in tutte le ${usate === 1 ? 'settimane: 1' : `${usate} settimane`} in cui compare «${v.name}», anche nel passato. `
      + 'Se invece vuoi una voce diversa da qui in avanti, aggiungi una voce nuova e lascia questa com’è.',
      'Rinomina');
    if (!ok) { campo.value = v.name; return; }
  }
  esito(db.rinomina(v.id, nuovo));
});

// Invio conferma il nome. preventDefault serve: senza, lo stesso Invio arriverebbe alla finestra di conferma
// appena aperta e premerebbe "Annulla".
listaLibreria.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.matches('.lib-nome')) { e.preventDefault(); e.target.blur(); }
});

// Cancellare una voce mai usata (il pulsante esiste solo per quelle).
listaLibreria.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-azione]');
  if (!b) return;
  const v = voce(b.dataset.id);
  if (!v) return;
  if (b.dataset.azione !== 'cancella' || settimaneConVoce(v.id) > 0) return;   // una voce usata fa parte dello storico
  const ok = await conferma(`Cancellare «${v.name}» dalla libreria? Non compare in nessuna settimana, quindi non si perde niente.`, 'Cancella');
  if (!ok) return;
  esito(db.cancella(v.id));
});

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
