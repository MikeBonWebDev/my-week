// js/promemoria.js — il promemoria delle faccende, in cima alla settimana corrente: cosa proporre, le righe, le scelte.
import * as Core from '../core.js';
import {
  $, aggiungiGiorni, chiaveData, dataDaChiave, db, esito, lunediCorrente, mostraStato, oggiK, riposoOggi, state
} from './base.js';
import { testoCadenza } from './testi.js';
import { el, segnaCalore } from './pezzi.js';
import { quandoCambiaSezione } from './sezioni.js';

/* ───────── Promemoria delle faccende ─────────
   In cima alla settimana corrente: le faccende che non sono nella settimana e hanno un giro aperto o in arrivo
   entro domenica, più quelle mai segnate (sono proprio quelle che si rischia di dimenticare). Per ognuna, due
   scelte: «Aggiungi» (entra nella settimana) e «Salto questo giro» (il conteggio riparte da oggi). Senza scelta
   la riga resta lì: è un'informazione, non una richiesta. Il promemoria non scrive niente da solo. */
const boxPromemoria = $('#promemoria');
const listaPromemoria = $('#lista-promemoria');
// le faccende saltate da qui restano nel promemoria con «Annulla», finché non cambi sezione o ricarichi
const saltatiDalPromemoria = new Set();
quandoCambiaSezione(() => saltatiDalPromemoria.clear());

// k = il lunedì della settimana mostrata: il promemoria c'è solo nella settimana corrente
function faccendeDaProporre(k) {
  if (k !== lunediCorrente()) return [];
  const domenica = chiaveData(aggiungiGiorni(dataDaChiave(k), 6));
  const presenti = new Set((state.weeks[k]?.activities ?? []).map((a) => a.id));
  const tutte = Core.faccende(db.registro, oggiK);
  // un salto annullato altrove (in Casa), o una faccenda entrata nella settimana: niente più «Annulla» qui
  for (const id of saltatiDalPromemoria) {
    const f = tutte.find((x) => x.id === id);
    if (!f || f.salto !== oggiK || presenti.has(id)) saltatiDalPromemoria.delete(id);
  }
  return tutte
    .filter((f) => !presenti.has(f.id) && (saltatiDalPromemoria.has(f.id) || f.scade === null || f.scade <= domenica))
    // prima il giro aperto da più tempo, poi quelli in arrivo; le mai segnate in fondo
    .sort((a, b) => (a.scade === null) - (b.scade === null)
      || (a.scade ?? '').localeCompare(b.scade ?? '') || a.nome.localeCompare(b.nome, 'it'));
}

// Lo chiama il disegno della settimana, con il lunedì della settimana mostrata
export function aggiornaPromemoria(k) {
  const elenco = faccendeDaProporre(k);
  boxPromemoria.hidden = elenco.length === 0;
  $('#conta-promemoria').textContent = String(elenco.length);
  const riposo = riposoOggi();
  listaPromemoria.replaceChildren(...elenco.map((f) => rigaPromemoria(f, riposo)));
}

function rigaPromemoria(f, riposo) {
  const saltato = saltatiDalPromemoria.has(f.id);
  const bottone = (testo, classe, azione, etichetta) => el('button', {
    type: 'button', class: classe, testo, dataset: { azione, id: f.id }, aria: { label: etichetta },
  });
  const li = el('li', { class: 'promemoria-riga', dataset: { id: f.id, riposo: !saltato && riposo } },
    el('div', { class: 'promemoria-testi' },
      el('span', { class: 'nome-voce', testo: f.nome }),
      el('span', { class: 'riga-cadenza', testo: saltato ? 'Giro saltato oggi: il conteggio riparte da qui.' : testoCadenza(f) })),
    el('div', { class: 'promemoria-azioni' }, saltato
      ? bottone('Annulla', 'link-azione', 'annulla-salto', `Annulla il salto di ${f.nome}`)
      : [
        bottone('Aggiungi', 'pulsante piccolo', 'aggiungi', `Aggiungi «${f.nome}» a questa settimana`),
        bottone('Salto questo giro', 'pulsante secondario piccolo', 'salta', `Salto questo giro di ${f.nome}`),
      ]));
  if (!saltato) segnaCalore(li, f, { riposo });
  return li;
}

/* ───────── Le scelte del promemoria ───────── */
listaPromemoria.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-azione]');
  if (!b) return;
  const f = Core.faccende(db.registro, oggiK).find((x) => x.id === b.dataset.id);
  if (!f) return;
  const fuoco = (selettore) => listaPromemoria.querySelector(selettore)?.focus();
  if (b.dataset.azione === 'aggiungi' && esito(db.aggiungi(lunediCorrente(), f.nome))) {
    mostraStato(`«${f.nome}» è in questa settimana.`);
    // la riga è sparita: il fuoco va sulla prima scelta rimasta, se ce n'è una
    fuoco('button');
  }
  if (b.dataset.azione === 'salta') {
    saltatiDalPromemoria.add(f.id);
    if (esito(db.salta(f.id, oggiK))) {
      mostraStato(`«${f.nome}»: giro saltato.`);
      fuoco(`li[data-id="${f.id}"] [data-azione="annulla-salto"]`);
    } else saltatiDalPromemoria.delete(f.id);
  }
  if (b.dataset.azione === 'annulla-salto') {
    saltatiDalPromemoria.delete(f.id);
    if (esito(db.salta(f.id, null))) fuoco(`li[data-id="${f.id}"] [data-azione="salta"]`);
  }
});
