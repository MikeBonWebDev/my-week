// js/casa.js — le sezioni dell'app (Settimana, Casa, Dati) e la sezione Casa: le faccende, e da quanto tempo non le fai.
import * as Core from '../core.js';
import { $, dataDaChiave, db, disegna, esito, mostraStato, oggiK, state } from './base.js';
import {
  conMaiuscola, lunediCorrente, nomeRinominabile, ogniGiorni, quandoSalto, saltatiDalPromemoria, segnaCalore,
  testoFatta, testoGiro
} from './settimana.js';

/* ───────── Le sezioni ─────────
   Una sola pagina, tre sezioni: se ne mostra una. La scelta resta su questo dispositivo
   (localStorage), così l'app riapre dove l'avevi lasciata. Non è un dato da sincronizzare. */
const CHIAVE_SEZIONE = 'settimana:sezione';
const SEZIONI = {
  settimana: { titolo: 'La mia settimana', sottotitolo: 'Le attività della settimana, giorno per giorno.' },
  casa: { titolo: 'Casa', sottotitolo: 'Le faccende con una cadenza.' },
  dati: { titolo: 'Dati', sottotitolo: 'Copie, altri dispositivi, CSV.' },
};
const navSezioni = $('#sezioni');
const sezioneSettimana = $('#sezione-settimana');
const sezioneCasa = $('#sezione-casa');
const sezioneDati = $('#sezione-dati');

function leggiSezione() {
  try {
    const s = localStorage.getItem(CHIAVE_SEZIONE);
    return Object.hasOwn(SEZIONI, s ?? '') ? s : 'settimana';
  } catch { return 'settimana'; }
}
export let sezione = leggiSezione();

export function mostraSezione(nome) {
  const cambia = nome !== sezione;
  sezione = nome;
  try { localStorage.setItem(CHIAVE_SEZIONE, nome); } catch { /* pazienza: si riaprirà sulla settimana */ }
  sezioneSettimana.hidden = nome !== 'settimana';
  sezioneCasa.hidden = nome !== 'casa';
  sezioneDati.hidden = nome !== 'dati';
  for (const b of navSezioni.querySelectorAll('[data-sezione]')) {
    if (b.dataset.sezione === nome) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  $('#titolo-sezione').textContent = SEZIONI[nome].titolo;
  $('#sottotitolo').textContent = SEZIONI[nome].sottotitolo;
  document.title = nome === 'settimana' ? 'La mia settimana' : `${SEZIONI[nome].titolo} · La mia settimana`;
  if (cambia) saltatiDalPromemoria.clear();   // il promemoria della settimana riparte pulito (settimana.js)
  // L'ordine di Casa si decide quando la apri, e poi non si muove mentre la guardi
  if (nome === 'casa') ordineCasa = Core.faccende(db.registro, oggiK).map((f) => f.id);
  disegna();
  if (cambia) window.scrollTo(0, 0);
}

navSezioni.addEventListener('click', (e) => {
  const b = e.target.closest('[data-sezione]');
  if (b) mostraSezione(b.dataset.sezione);
});

/* ───────── La sezione Casa ─────────
   Le faccende sono le voci della libreria con una cadenza (v/<id>/cad nel registro). Tutto quello che si vede
   — l'ultima volta, l'ordine — lo calcola il nucleo con Core.faccende(registro, oggi): qui si disegna e basta. */
const listaFaccende = $('#faccende');
const casaVuota = $('#casa-vuota');
let ordineCasa = [];

const inQuestaSettimana = (id) => Boolean(state.weeks[lunediCorrente()]?.activities.some((a) => a.id === id));

export function disegnaCasa() {
  if (sezioneCasa.hidden) return;
  const perId = new Map(Core.faccende(db.registro, oggiK).map((f) => [f.id, f]));
  // l'ordine di quando hai aperto la sezione; una faccenda nuova va in fondo
  ordineCasa = ordineCasa.filter((id) => perId.has(id));
  for (const id of perId.keys()) if (!ordineCasa.includes(id)) ordineCasa.push(id);

  // oggi è un giorno di riposo? Allora le schede si ammorbidiscono, senza calore (il conteggio non cambia)
  const iOggi = (dataDaChiave(oggiK).getDay() + 6) % 7;
  const riposoOggi = state.weeks[lunediCorrente()]?.rest[iOggi] === true;
  listaFaccende.replaceChildren(...ordineCasa.map((id) => cartaFaccenda(perId.get(id), riposoOggi)));
  casaVuota.hidden = perId.size > 0;
}

function cartaFaccenda(f, riposoOggi) {
  const li = document.createElement('li');
  li.className = 'faccenda';
  li.dataset.id = f.id;
  li.toggleAttribute('data-riposo', riposoOggi);
  segnaCalore(li, f, { riposo: riposoOggi });

  const titolo = document.createElement('h2');
  titolo.append(nomeRinominabile(f.id, f.nome, 'nome-faccenda'));

  const dati = document.createElement('p');
  dati.className = 'faccenda-dati';
  // "Fatta il 6 ottobre", "Ogni 14 giorni", "Giro aperto dal 20 ottobre" (testoFatta e testoGiro: settimana.js)
  const ultima = document.createElement('span');
  ultima.textContent = testoFatta(f);
  const ogni = document.createElement('span');
  ogni.className = 'ogni';
  ogni.textContent = ogniGiorni(f.cadenza);
  dati.append(ultima, ogni);
  if (f.scade) {
    const giro = document.createElement('span');
    giro.className = 'giro-testo';
    giro.textContent = conMaiuscola(testoGiro(f));
    dati.append(giro);
  }

  // Il salto: resta scritto finché non la segni di nuovo, e si può annullare
  let saltato = null;
  if (f.salto) {
    saltato = document.createElement('p');
    saltato.className = 'saltato';
    const t = document.createElement('span');
    t.textContent = `Giro saltato ${quandoSalto(f.salto)}.`;
    const annulla = bottoneAzione('Annulla', 'link-azione', 'annulla-salto', f);
    annulla.setAttribute('aria-label', `Annulla il salto di ${f.nome}`);
    saltato.append(t, annulla);
  }

  const azioni = document.createElement('div');
  azioni.className = 'faccenda-azioni';
  if (inQuestaSettimana(f.id)) {
    const gia = document.createElement('span');
    gia.className = 'gia';
    gia.textContent = 'Già in questa settimana';
    azioni.append(gia);
  } else {
    azioni.append(bottoneAzione('+ Aggiungi a questa settimana', 'pulsante piccolo', 'aggiungi', f));
  }
  // «Salto questo giro» solo se il conteggio non parte già da oggi (fatta oggi, o saltata oggi)
  if (f.giorni === null || f.giorni > 0) {
    const salta = bottoneAzione('Salto questo giro', 'pulsante secondario piccolo', 'salta', f);
    salta.setAttribute('aria-label', `Salto questo giro di ${f.nome}`);
    azioni.append(salta);
  }
  const cadenza = bottoneAzione('Cadenza', 'link-azione', 'cadenza', f);
  cadenza.setAttribute('aria-label', `Cadenza di ${f.nome}`);
  azioni.append(cadenza);

  li.append(titolo, dati);
  if (saltato) li.append(saltato);
  li.append(azioni);
  return li;
}

function bottoneAzione(testo, classe, azione, f) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.textContent = testo;
  b.dataset.azione = azione;
  b.dataset.id = f.id;
  return b;
}

listaFaccende.addEventListener('click', (e) => {
  const b = e.target.closest('button[data-azione]');
  if (!b) return;
  const f = Core.faccende(db.registro, oggiK).find((x) => x.id === b.dataset.id);
  if (!f) return;
  if (b.dataset.azione === 'cadenza') apriCadenza(f);
  // Saltare il giro: il conteggio riparte da oggi, senza segnarla come fatta. Il fuoco va su «Annulla».
  if (b.dataset.azione === 'salta' && esito(db.salta(f.id, oggiK))) {
    mostraStato(`«${f.nome}»: giro saltato.`);
    listaFaccende.querySelector(`li[data-id="${f.id}"] [data-azione="annulla-salto"]`)?.focus();
  }
  if (b.dataset.azione === 'annulla-salto' && esito(db.salta(f.id, null))) {
    listaFaccende.querySelector(`li[data-id="${f.id}"] [data-azione="cadenza"]`)?.focus();
  }
  if (b.dataset.azione === 'aggiungi' && esito(db.aggiungi(lunediCorrente(), f.nome))) {
    mostraStato(`«${f.nome}» è in questa settimana.`);
    // il bottone è stato ridisegnato: il fuoco va su «Cadenza» della stessa faccenda, non si perde
    listaFaccende.querySelector(`li[data-id="${f.id}"] [data-azione="cadenza"]`)?.focus();
  }
});

/* ───────── Il foglio della faccenda: nuova, oppure la sua cadenza ───────── */
const foglioFaccenda = $('#foglio-faccenda');
const campoNomeFaccenda = $('#nome-faccenda');
const campoGiorni = $('#giorni-faccenda');
const CADENZE = [[7, 'Ogni settimana · 7 giorni'], [14, 'Ogni 2 settimane · 14 giorni'], [30, 'Ogni mese · 30 giorni']];

// Cosa sta facendo il foglio: { modo: 'nuova' | 'modifica', id (in modifica), voce (voce scelta, in nuova), personalizzato }
let foglio = null;

function apriNuovaFaccenda() {
  foglio = { modo: 'nuova', voce: null, personalizzato: false };
  $('#titolo-faccenda').textContent = 'Aggiungi una faccenda';
  campoNomeFaccenda.value = '';
  campoGiorni.value = '14';
  aggiornaFoglio();
  foglioFaccenda.showModal();
}

function apriCadenza(f) {
  foglio = { modo: 'modifica', id: f.id, nome: f.nome, personalizzato: !CADENZE.some(([n]) => n === f.cadenza) };
  $('#titolo-faccenda').textContent = `Cadenza di «${f.nome}»`;
  campoGiorni.value = String(f.cadenza);
  aggiornaFoglio();
  foglioFaccenda.showModal();
}

// Il numero di giorni scritto, se è valido (intero da 1 a 365); altrimenti null
function giorniScelti() {
  const t = campoGiorni.value.trim();
  const n = Number(t);
  return t !== '' && Number.isInteger(n) && n >= 1 && n <= Core.MAX_CADENZA ? n : null;
}

// La faccenda che ha già il nome scritto nel campo, se esiste: da qui non se ne cambia la cadenza
function faccendaConNome() {
  const nome = Core.chiaveNome(campoNomeFaccenda.value);
  return nome ? Core.faccende(db.registro, oggiK).find((f) => Core.chiaveNome(f.nome) === nome) ?? null : null;
}

// Ridisegna il foglio dallo stato: scelte, campo dei giorni, nota, pulsanti
function aggiornaFoglio() {
  const nuova = foglio.modo === 'nuova';
  $('#gruppo-voci').hidden = !nuova;
  $('#togli-cadenza').hidden = nuova;
  $('#nota-togli-cadenza').hidden = nuova;

  if (nuova) {
    // le voci della libreria che non sono ancora faccende
    const faccende = new Set(Core.faccende(db.registro, oggiK).map((f) => f.id));
    const libere = state.libreria.filter((v) => !faccende.has(v.id)).sort((a, b) => a.name.localeCompare(b.name, 'it'));
    $('#voci-libere').replaceChildren(...libere.map((v) => scelta(v.name, foglio.voce === v.id, { voce: v.id })));
    $('#voci-libere').hidden = libere.length === 0;
    $('#etichetta-voci').hidden = libere.length === 0;
  }

  const n = Number(campoGiorni.value);
  $('#scelte-cadenza').replaceChildren(
    ...CADENZE.map(([giorni, testo]) => scelta(testo, !foglio.personalizzato && n === giorni, { giorni })),
    scelta('Personalizzato', foglio.personalizzato, { personalizzato: '1' }),
  );
  campoGiorni.disabled = !foglio.personalizzato;

  const giorni = giorniScelti();
  const gia = nuova ? faccendaConNome() : null;
  let nota = '';
  if (giorni === null) nota = 'Un numero intero, da 1 a 365.';
  else if (gia) nota = `«${gia.nome}» è già in Casa, ${ogniGiorni(gia.cadenza).toLowerCase()}. La cadenza si cambia dalla sua scheda.`;
  $('#nota-faccenda').textContent = nota;

  const haNome = nuova ? Boolean(foglio.voce || campoNomeFaccenda.value.trim()) : true;
  $('#salva-faccenda').disabled = giorni === null || Boolean(gia) || !haNome;
}

function scelta(testo, premuta, dati) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'scelta';
  b.textContent = testo;
  b.setAttribute('aria-pressed', String(premuta));
  Object.assign(b.dataset, dati);
  return b;
}

// Le scelte si ridisegnano a ogni tocco: il fuoco torna sulla scelta equivalente, così da tastiera non si perde
function rimettiFuoco(gruppo, selettore) {
  gruppo.querySelector(selettore)?.focus();
}

$('#voci-libere').addEventListener('click', (e) => {
  const b = e.target.closest('.scelta');
  if (!b) return;
  foglio.voce = foglio.voce === b.dataset.voce ? null : b.dataset.voce;
  campoNomeFaccenda.value = '';
  aggiornaFoglio();
  rimettiFuoco($('#voci-libere'), `[data-voce="${b.dataset.voce}"]`);
});

$('#scelte-cadenza').addEventListener('click', (e) => {
  const b = e.target.closest('.scelta');
  if (!b) return;
  if (b.dataset.personalizzato) {
    foglio.personalizzato = true;
    aggiornaFoglio();
    campoGiorni.focus();
    campoGiorni.select();
    return;
  }
  foglio.personalizzato = false;
  campoGiorni.value = b.dataset.giorni;
  aggiornaFoglio();
  rimettiFuoco($('#scelte-cadenza'), `[data-giorni="${b.dataset.giorni}"]`);
});

campoNomeFaccenda.addEventListener('input', () => { foglio.voce = null; aggiornaFoglio(); });
campoGiorni.addEventListener('input', aggiornaFoglio);
// Invio nei campi salva, se si può
for (const campo of [campoNomeFaccenda, campoGiorni]) {
  campo.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (!$('#salva-faccenda').disabled) salvaFaccenda();
  });
}

function salvaFaccenda() {
  const giorni = giorniScelti();
  if (giorni === null) return;
  let r;
  let nome;
  if (foglio.modo === 'modifica') {
    r = db.cadenza(foglio.id, giorni);
    nome = foglio.nome;
  } else if (foglio.voce) {
    r = db.cadenza(foglio.voce, giorni);
    nome = state.libreria.find((v) => v.id === foglio.voce)?.name;
  } else {
    r = db.nuovaFaccenda(campoNomeFaccenda.value, giorni);
    nome = Core.pulisci(campoNomeFaccenda.value, Core.MAX_NOME);
  }
  foglioFaccenda.close();
  if (esito(r)) mostraStato(`«${nome}»: ${ogniGiorni(giorni).toLowerCase()}.`);
}

$('#salva-faccenda').addEventListener('click', salvaFaccenda);
$('#togli-cadenza').addEventListener('click', () => {
  const { id, nome } = foglio;
  foglioFaccenda.close();
  if (esito(db.cadenza(id, null))) mostraStato(`«${nome}» non ha più una cadenza.`);
});
$('#annulla-faccenda').addEventListener('click', () => foglioFaccenda.close());
$('#chiudi-faccenda').addEventListener('click', () => foglioFaccenda.close());
// un clic sullo sfondo oscurato chiude il foglio, come per il menu
foglioFaccenda.addEventListener('click', (e) => { if (e.target === foglioFaccenda) foglioFaccenda.close(); });
$('#nuova-faccenda').addEventListener('click', apriNuovaFaccenda);
