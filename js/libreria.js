// js/libreria.js — il pannello «Libreria delle attività», in fondo alla sezione Settimana.
// Lo disegna disegnaSettimana (settimana.js): il pannello si vede solo lì.
import * as Core from '../core.js';
import {
  $, chiaveNome, conferma, dataDaChiave, db, esito, listaLibreria, MAX_NOME, MESSAGGI, mostraStato, MSG_RISERVATO,
  settimaneConVoce, state, voce
} from './base.js';
import { fmtBreve } from './testi.js';
import { el } from './pezzi.js';

/* ───────── Libreria ─────────
   Ogni voce con nome modificabile e una riga che dice quanto è usata:
     in una o più liste       «in 3 settimane · ultima: 12 ott» (il lunedì dell'ultima settimana in cui compare)
     solo con delle spunte    «tolta dalle settimane · ultima spunta: 12 ott»: segnata, poi tolta da ogni settimana
     né l'una né l'altra      «mai usata», e il pulsante Cancella
   «Usata» segue la regola del nucleo (Core.ultimeSpunte, la stessa di cancella()): una voce con una spunta fa parte
   dello storico anche se non è più in nessuna lista, e non si cancella. */
const infoVoce = (usate, ultimaLista, ultimaSpunta) => {
  if (usate) return `in ${usate} ${usate === 1 ? 'settimana' : 'settimane'} · ultima: ${fmtBreve.format(dataDaChiave(ultimaLista))}`;
  if (ultimaSpunta) return `tolta dalle settimane · ultima spunta: ${fmtBreve.format(dataDaChiave(ultimaSpunta))}`;
  return 'mai usata';
};
// Una voce si può cancellare solo se non è in nessuna lista e non ha nessuna spunta
const cancellabile = (id) => settimaneConVoce(id) === 0 && !(id in Core.ultimeSpunte(db.registro));

export function aggiornaLibreria() {
  const voci = [...state.libreria].sort((a, b) => a.name.localeCompare(b.name, 'it'));
  $('#conta-libreria').textContent = `(${voci.length})`;
  if (!voci.length) {
    listaLibreria.replaceChildren(el('li', {
      class: 'lib-vuota', testo: 'La libreria è vuota: si riempie da sola quando aggiungi un’attività alla settimana.',
    }));
    return;
  }
  const spunte = Core.ultimeSpunte(db.registro);
  listaLibreria.replaceChildren(...voci.map((v) => {
    const usate = settimaneConVoce(v.id);
    const ultima = Object.keys(state.weeks).filter((k) => state.weeks[k].activities.some((a) => a.id === v.id)).sort().pop();
    return el('li', { class: 'lib-voce' },
      el('input', {
        type: 'text', class: 'lib-nome', value: v.name, maxLength: MAX_NOME, dataset: { id: v.id },
        aria: { label: `Nome della voce «${v.name}»` },
      }),
      el('span', { class: 'lib-info', testo: infoVoce(usate, ultima, spunte[v.id]) }),
      // solo una voce mai usata (niente liste, niente spunte) si può cancellare
      !usate && !spunte[v.id] && el('button', {
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
  if (b.dataset.azione !== 'cancella' || !cancellabile(v.id)) return;   // una voce usata fa parte dello storico
  const ok = await conferma(`Cancellare «${v.name}» dalla libreria? Non compare in nessuna settimana, quindi non si perde niente.`, 'Cancella');
  if (!ok) return;
  esito(db.cancella(v.id));
});
