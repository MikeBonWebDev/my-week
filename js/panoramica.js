// js/panoramica.js — la Panoramica: la prima sezione, quella che si apre all'avvio. Una card per sezione accesa, in
// colonna, nell'ordine fisso del registro (PIANO.md §3.5). Ogni card è un riepilogo: si legge, e toccandola si va
// alla sezione. Nessuna azione dentro le card.
// La Panoramica non conosce le sezioni: le legge dal registro (sezioni.js). Ogni sezione dichiara la sua card con la
// funzione `scheda` del suo descrittore, che restituisce solo testo; il disegno è uno, qui, uguale per tutte.
import { $ } from './base.js';
import { el } from './pezzi.js';
import { apertaIl, mostraSezione, schedeAccese } from './sezioni.js';
import { oggiPerEsteso, testoAperta } from './testi.js';

const RIGHE_MASSIME = 3;   // una card dice al massimo tre righe (§3.5.2, C3)
const lista = $('#card-sezioni');

// Icona e nome breve di una sezione: si copiano dal suo pulsante nella barra, l'unico posto in cui una sezione
// dichiara come si presenta (index.html). «Settimana», non «La mia settimana».
function presentazione(nome) {
  const voce = $(`#sezioni .sezione-voce[data-sezione="${nome}"]`);
  return { icona: voce?.querySelector('svg')?.cloneNode(true) ?? null, nome: voce?.textContent.trim() ?? nome };
}

/* Una card (§3.5.2): un articolo con il suo titolo h2; dentro il titolo l'unico controllo, il pulsante che apre la
   sezione, che con un velo trasparente (stile.css) rende toccabile tutta la card. Sotto, le righe della sezione e da
   quando non la apri su questo dispositivo. Il pulsante è descritto dalle righe: il lettore di schermo le legge. */
function card({ nome, scheda }) {
  const { icona, nome: titolo } = presentazione(nome);
  const righe = (scheda() ?? []).filter((r) => typeof r === 'string' && r).slice(0, RIGHE_MASSIME);
  const idTitolo = `card-titolo-${nome}`;
  const idTesto = `card-testo-${nome}`;
  return el('li', {},
    el('article', { class: 'card-sezione', aria: { labelledby: idTitolo } },
      el('h2', { class: 'titolo-card', id: idTitolo },
        el('button', { type: 'button', class: 'apri-card', dataset: { sezione: nome }, aria: { describedby: idTesto } },
          icona,
          el('span', { testo: titolo }),
          el('span', { class: 'freccia', testo: '›', aria: { hidden: 'true' } }))),
      el('div', { id: idTesto },
        righe.length ? el('ul', { class: 'righe-card' }, righe.map((r) => el('li', { testo: r }))) : null,
        el('p', { class: 'piede-card', testo: testoAperta(apertaIl(nome)) }))));
}

// Si ridisegna ogni volta che si disegna la pagina con la Panoramica aperta: all'avvio, tornando da una sezione, quando
// cambiano i dati (anche da un file unito), quando la pagina torna visibile oltre la mezzanotte. Nessun timer (§3.5.2, F1).
function disegnaPanoramica() {
  lista.replaceChildren(...schedeAccese().map(card));
  $('#sottotitolo').textContent = oggiPerEsteso();
}

// Tornando da una sezione, il fuoco va sulla sua card: chi usa la tastiera o un lettore di schermo riparte da lì
// (§3.5.2, A2). All'avvio no: non si arriva da nessuna parte.
function dopoApertura(precedente) {
  lista.querySelector(`.apri-card[data-sezione="${precedente}"]`)?.focus();
}

lista.addEventListener('click', (e) => {
  const b = e.target.closest('.apri-card');
  if (b) mostraSezione(b.dataset.sezione);
});

// La Panoramica, come la vede il registro delle sezioni (sezioni.js; la registra guscio.js, per prima)
export const sezionePanoramica = {
  nome: 'panoramica',
  titolo: 'Panoramica',
  get sottotitolo() { return oggiPerEsteso(); },
  elemento: $('#sezione-panoramica'),
  disegna: disegnaPanoramica,
  dopoApertura,
};
