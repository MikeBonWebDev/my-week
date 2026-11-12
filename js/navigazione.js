// js/navigazione.js — come si arriva alle sezioni. Sul computer: la colonna a sinistra, con tutte le sezioni accese.
// Sul telefono, a scelta (Impostazioni, «Menu del telefono»): la barra in basso con tre posti e «Altro» per le sezioni
// che non ci stanno, oppure un solo pulsante che apre le sezioni a ventaglio.
// Quali sezioni esistono e quali sono accese lo sa il registro (sezioni.js); qui si decide solo dove si vedono.
import { $, telefono } from './base.js';
import { el } from './pezzi.js';
import { mostraSezione, sezioneAperta, sezioniAccese } from './sezioni.js';

/* ───────── Le scelte, per dispositivo ─────────
   Stanno in localStorage, non nel registro: si può volere il ventaglio sul telefono e la barra sul tablet.
     settimana:menu    'barra' (predefinito) oppure 'ventaglio'
     settimana:barra   le sezioni scelte per la barra, per nome: ["settimana","casa","dati"] */
const CHIAVE_MENU = 'settimana:menu';
const CHIAVE_BARRA = 'settimana:barra';
const POSTI = 3;            // le sezioni nella barra, quando c'è «Altro»
const SENZA_ALTRO = 4;      // fino a quattro sezioni accese ci stanno tutte, e «Altro» non serve
const BARRA_PREDEFINITA = ['settimana', 'casa', 'dati'];

function leggiMenu() {
  try { return localStorage.getItem(CHIAVE_MENU) === 'ventaglio' ? 'ventaglio' : 'barra'; } catch { return 'barra'; }
}
function leggiBarra() {
  try {
    const v = JSON.parse(localStorage.getItem(CHIAVE_BARRA));
    if (Array.isArray(v) && v.every((n) => typeof n === 'string')) return v.slice(0, POSTI);
  } catch { /* niente di salvato, o illeggibile */ }
  return BARRA_PREDEFINITA;
}
function salvaScelta(chiave, valore) {
  try { localStorage.setItem(chiave, valore); } catch { /* pazienza: vale fino alla chiusura */ }
}

// Le sezioni nella barra del telefono, nell'ordine fisso del registro. Fino a quattro accese: tutte. Oltre: le tre
// scelte; una scelta spenta (o mancante) lascia il posto alla prima sezione accesa che non c'è già.
function sezioniInBarra(accese) {
  if (accese.length <= SENZA_ALTRO) return accese;
  const scelte = leggiBarra().filter((n) => accese.includes(n));
  for (const n of accese) if (scelte.length < POSTI && !scelte.includes(n)) scelte.push(n);
  return accese.filter((n) => scelte.includes(n));
}

/* ───────── Il disegno ─────────
   Una delle parti di disegna() (base.js), dopo la sezione aperta e il puntino su Dati (guscio.js): mostra i pulsanti
   giusti, e dice ad «Altro» e al pulsante del ventaglio se dentro c'è la sezione aperta o il puntino di Dati. */
const nav = $('#sezioni');
const voceAltro = $('#voce-altro');
const pulsanteVentaglio = $('#apri-ventaglio');
const ventaglio = $('#ventaglio');
const foglioAltro = $('#foglio-altro');

// Il nome breve di una sezione, come lo scrive il suo pulsante nella barra («Settimana», non «La mia settimana»)
const etichetta = (nome) => nav.querySelector(`.sezione-voce[data-sezione="${nome}"]`)?.textContent.trim() ?? '';
const puntinoDati = () => !$('#puntino-dati').hidden;

export function disegnaNavigazione() {
  const accese = sezioniAccese().map((s) => s.nome);
  const suTelefono = telefono.matches;
  const aVentaglio = suTelefono && leggiMenu() === 'ventaglio';
  const inBarra = suTelefono ? sezioniInBarra(accese) : accese;
  for (const b of nav.querySelectorAll('.sezione-voce[data-sezione]')) b.hidden = !inBarra.includes(b.dataset.sezione);
  // il CSS nasconde la barra quando c'è il ventaglio (html[data-menu="ventaglio"])
  if (aVentaglio) document.documentElement.dataset.menu = 'ventaglio';
  else delete document.documentElement.dataset.menu;

  // «Altro»: solo con la barra, e solo se qualche sezione accesa non ci sta
  const fuori = accese.filter((n) => !inBarra.includes(n));
  const aperta = sezioneAperta();
  voceAltro.hidden = aVentaglio || !fuori.length;
  if (fuori.includes(aperta)) {
    voceAltro.dataset.attiva = '';
    voceAltro.setAttribute('aria-label', `Altro, sezione aperta: ${etichetta(aperta)}`);
  } else {
    delete voceAltro.dataset.attiva;
    voceAltro.setAttribute('aria-label', 'Altro: le altre sezioni');
  }
  voceAltro.querySelector('.puntino-altro').hidden = !(fuori.includes('dati') && puntinoDati());

  // il pulsante del ventaglio dice dove sei
  pulsanteVentaglio.hidden = !aVentaglio;
  $('#testo-ventaglio').textContent = etichetta(aperta);
  pulsanteVentaglio.setAttribute('aria-label', `Sezioni, sezione aperta: ${etichetta(aperta)}`);
  pulsanteVentaglio.querySelector('.puntino-altro').hidden = !puntinoDati();
  if (!aVentaglio && ventaglio.open) ventaglio.close();
}

/* ───────── Le voci di Altro e del ventaglio ─────────
   Sono copie dei pulsanti della barra (stessa icona, stesso nome, stesso puntino su Dati): la barra resta l'unico
   posto in cui una sezione dichiara il suo pulsante (index.html). Le copie perdono gli id, che devono restare unici. */
function copiaVoce(nome) {
  const b = nav.querySelector(`.sezione-voce[data-sezione="${nome}"]`).cloneNode(true);
  b.hidden = false;
  for (const x of [b, ...b.querySelectorAll('[id]')]) x.removeAttribute('id');
  return b;
}

/* ───────── Altro ─────────
   Un <dialog> che sale dal basso, come le Impostazioni: le sezioni che non stanno nella barra. Il fuoco va sulla
   sezione aperta, se è lì, altrimenti sulla prima. Si chiude con la ×, con Esc, con un tocco fuori o scegliendo. */
voceAltro.addEventListener('click', () => {
  const accese = sezioniAccese().map((s) => s.nome);
  const fuori = accese.filter((n) => !sezioniInBarra(accese).includes(n));
  $('#lista-altro').replaceChildren(...fuori.map(copiaVoce));
  foglioAltro.showModal();
  ($('#lista-altro [aria-current="page"]') ?? $('#lista-altro .sezione-voce'))?.focus();
});
$('#lista-altro').addEventListener('click', (e) => {
  const b = e.target.closest('[data-sezione]');
  if (!b) return;
  foglioAltro.close();
  mostraSezione(b.dataset.sezione);
});
$('#chiudi-altro').addEventListener('click', () => foglioAltro.close());
foglioAltro.addEventListener('click', (e) => { if (e.target === foglioAltro) foglioAltro.close(); });
// Chiuso, il fuoco torna ad «Altro». Il browser lo farebbe da solo, ma solo se il pulsante aveva il fuoco: Safari (e
// WebKit) non dà il fuoco a un pulsante toccato, e il fuoco finirebbe in cima alla pagina.
foglioAltro.addEventListener('close', () => { if (!voceAltro.hidden) voceAltro.focus(); });

/* ───────── Il ventaglio ─────────
   Il pulsante in basso apre un <dialog> a tutto schermo: un velo, le sezioni su un arco, e al posto del pulsante
   «Chiudi». Come gli altri fogli: il fuoco resta dentro finché è aperto, Esc chiude, e il fuoco torna al pulsante.
   All'apertura il fuoco va sulla sezione aperta. Le posizioni sull'arco le calcolo qui (--x, --y in rem): da
   sinistra a destra, nell'ordine del registro. */
const RAGGIO = 9;   // rem, dal centro del pulsante: con cinque sezioni, tra l'una e l'altra resta spazio
pulsanteVentaglio.addEventListener('click', () => {
  const accese = sezioniAccese().map((s) => s.nome);
  const n = accese.length;
  $('#voci-ventaglio').replaceChildren(...accese.map((nome, i) => {
    const angolo = Math.PI * (n === 1 ? 0.5 : 0.92 - (0.84 * i) / (n - 1));   // da 166° a 14°
    const voce = copiaVoce(nome);
    voce.style.setProperty('--x', `${(Math.cos(angolo) * RAGGIO).toFixed(2)}rem`);
    voce.style.setProperty('--y', `${(-Math.sin(angolo) * RAGGIO).toFixed(2)}rem`);
    return voce;
  }));
  ventaglio.showModal();
  ($('#voci-ventaglio [aria-current="page"]') ?? $('#voci-ventaglio .sezione-voce'))?.focus();
});
// Chiuso, il fuoco torna al pulsante del ventaglio: come per «Altro», in Safari il browser non lo farebbe da solo
ventaglio.addEventListener('close', () => { if (!pulsanteVentaglio.hidden) pulsanteVentaglio.focus(); });
ventaglio.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sezione]');
  ventaglio.close();                        // una sezione, «Chiudi» o un tocco sul velo: si chiude comunque
  if (b) mostraSezione(b.dataset.sezione);
});

/* ───────── Le Impostazioni: «Menu del telefono» ─────────
   Solo sul telefono (sul computer la colonna mostra tutto). Barra o ventaglio; con la barra, se le sezioni accese
   sono più di quattro, quali tre stanno nella barra: con tre segnate le altre caselle si spengono, finché non ne
   togli una. La chiama guscio.js quando apre le Impostazioni. */
export function disegnaSceltaMenuTelefono() {
  $('#parte-menu-telefono').hidden = !telefono.matches;
  const menu = leggiMenu();
  $('#scelte-menu-telefono').replaceChildren(...[['barra', 'Barra'], ['ventaglio', 'Ventaglio']].map(([valore, nome]) => el('button', {
    type: 'button', class: 'scelta', dataset: { menu: valore }, testo: nome, aria: { pressed: menu === valore },
  })));

  const accese = sezioniAccese();
  const scegliBarra = menu === 'barra' && accese.length > SENZA_ALTRO;
  $('#scelte-barra').hidden = !scegliBarra;
  const scelte = leggiBarra().filter((n) => accese.some((s) => s.nome === n));
  $('#scelte-barra').replaceChildren($('#etichetta-barra'), ...(scegliBarra ? accese : []).map(({ nome }) => {
    const dentro = scelte.includes(nome);
    return el('label', { class: 'interruttore' },
      el('input', { type: 'checkbox', checked: dentro, disabled: !dentro && scelte.length >= POSTI, dataset: { barra: nome } }),
      el('span', { testo: etichetta(nome) }));
  }));
  $('#nota-menu-telefono').textContent = menu === 'ventaglio'
    ? 'Un solo pulsante in basso: le sezioni si aprono a ventaglio sopra di lui.'
    : scegliBarra
      ? 'Le altre sezioni stanno in «Altro». Per cambiarne una, prima togline una dalla barra. Vale per questo dispositivo.'
      : 'Le sezioni stanno tutte nella barra in basso. Vale per questo dispositivo.';
}

$('#scelte-menu-telefono').addEventListener('click', (e) => {
  const b = e.target.closest('[data-menu]');
  if (!b) return;
  salvaScelta(CHIAVE_MENU, b.dataset.menu);
  disegnaNavigazione();
  disegnaSceltaMenuTelefono();
  $(`#scelte-menu-telefono [data-menu="${b.dataset.menu}"]`).focus();
});

$('#scelte-barra').addEventListener('change', (e) => {
  const casella = e.target.closest('input[data-barra]');
  if (!casella) return;
  const accese = sezioniAccese().map((s) => s.nome);
  const scelte = leggiBarra().filter((n) => accese.includes(n) && n !== casella.dataset.barra);
  if (casella.checked) scelte.push(casella.dataset.barra);
  salvaScelta(CHIAVE_BARRA, JSON.stringify(accese.filter((n) => scelte.includes(n)).slice(0, POSTI)));
  disegnaNavigazione();
  disegnaSceltaMenuTelefono();
  $(`#scelte-barra [data-barra="${casella.dataset.barra}"]`).focus();
});

