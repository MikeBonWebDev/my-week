// js/settimana.js — la settimana visualizzata e il disegno: tabella (computer) e vista a un giorno (telefono).
import * as Core from '../core.js';
import {
  $, aggiungiGiorni, ATTIVITA_INIZIALI, attivitaDi, bloccoAggiungi, boxRiprendi, boxSuggerimenti, campoNuova, carte,
  chiaveData, chiaveNome, corpo, dataDaChiave, db, FINESTRA, formNuova, GIORNI, inSettimanaCorrente, LIVELLI,
  lunediCorrente, MAX_DETTAGLIO, MAX_FREQUENTI, MAX_RICERCA, NOME_LIVELLO, notaPassata, oggiK, piede,
  rigaIntestazione, riposoGiorno, riposoOggi, scheda, segmenti, state, striscia, telefono, vistaGiorno, visualizzata,
  vociSuggerite
} from './base.js';
import { etichettaPeriodo, fmt, fmtBreve, fmtNumerica, testoCadenza } from './testi.js';
import { nomeRinominabile, segnaCalore } from './pezzi.js';
import { aggiornaPromemoria } from './promemoria.js';

/* ───────── Faccende nella settimana ─────────
   Una voce con una cadenza è una faccenda (vedi core.js, faccende). Nella settimana corrente la sua scheda
   (o la cella del nome, nella tabella) dice da quanto non la fai e, oltre la cadenza, si scalda: data-calore e
   --calore, che stile.css trasforma in colore secondo l'intensità scelta nel menu. Nelle settimane passate no:
   il calore parla di oggi. */
const faccendeDiOggi = () => new Map(Core.faccende(db.registro, oggiK).map((f) => [f.id, f]));
// L'ultima settimana prima di quella corrente che aveva delle attività: da lì si può riprendere la lista
export function settimanaDaRiprendere() {
  const corrente = lunediCorrente();
  return Object.keys(state.weeks).filter((k) => k < corrente && attivitaDi(k).length > 0).sort().pop() ?? null;
}

/* ───────── Disegno della tabella ─────────
   Le funzioni crea… costruiscono gli elementi della tabella con document.createElement e li riempiono
   con textContent, mai con innerHTML: un nome come "<b>Ciao</b>" viene mostrato così com'è, non interpretato
   come HTML. È la difesa più semplice contro l'inserimento di codice (XSS).
   Ogni casella porta con sé, negli attributi data-…, a quale voce e giorno si riferisce:
   quando la tocchi, il gestore dell'evento li legge da lì (el.dataset.id, el.dataset.giorno). */
// Prima riga: "Attività" e i sette giorni con la data. Nome lungo e corto: il CSS mostra quello adatto allo schermo.
function creaIntestazione() {
  const lun = dataDaChiave(visualizzata);
  const angolo = document.createElement('th');
  angolo.scope = 'col';
  angolo.textContent = 'Attività';
  const celle = [angolo];

  GIORNI.forEach((giorno, i) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.dataset.col = String(i);
    const lungo = document.createElement('span');
    lungo.className = 'lungo';
    lungo.textContent = giorno;
    const corto = document.createElement('span');
    corto.className = 'corto';
    corto.setAttribute('aria-hidden', 'true');
    corto.textContent = giorno.slice(0, 3);
    const data = document.createElement('span');
    data.className = 'data';
    data.textContent = fmtBreve.format(aggiungiGiorni(lun, i));
    th.append(lungo, corto, data);
    celle.push(th);
  });
  rigaIntestazione.replaceChildren(...celle);
}

// Una riga di attività: nome, campo del dettaglio, × per toglierla (solo nella settimana corrente), sette caselle.
function creaRiga(attivita) {
  const w = state.weeks[visualizzata];
  const tr = document.createElement('tr');

  const intestazioneRiga = document.createElement('th');
  intestazioneRiga.scope = 'row';
  const contenitore = document.createElement('div');
  contenitore.className = 'riga-nome';

  const testi = document.createElement('div');
  testi.className = 'testi';
  // nelle settimane passate il nome resta testo: si rinomina dalla settimana corrente
  const nome = inSettimanaCorrente() ? nomeRinominabile(attivita.id, attivita.name) : document.createElement('span');
  if (!inSettimanaCorrente()) {
    nome.className = 'nome-voce';
    nome.textContent = attivita.name;
  }

  const dettaglio = document.createElement('input');
  dettaglio.type = 'text';
  dettaglio.className = 'dettaglio';
  dettaglio.value = attivita.dettaglio;
  dettaglio.title = attivita.dettaglio;
  dettaglio.maxLength = MAX_DETTAGLIO;
  dettaglio.placeholder = 'dettaglio (facoltativo)';
  dettaglio.dataset.id = attivita.id;
  dettaglio.setAttribute('aria-label', `Dettaglio di «${attivita.name}» per questa settimana`);
  testi.append(nome);
  if (inSettimanaCorrente() && faccendeTabella.has(attivita.id)) {
    intestazioneRiga.dataset.faccenda = attivita.id;
    const riga = document.createElement('span');
    riga.className = 'riga-cadenza';
    testi.append(riga);
  }
  testi.append(dettaglio);
  contenitore.append(testi);

  if (inSettimanaCorrente()) {
    const elimina = document.createElement('button');
    elimina.type = 'button';
    elimina.className = 'elimina';
    elimina.dataset.id = attivita.id;
    elimina.textContent = '×';
    elimina.setAttribute('aria-label', `Togli «${attivita.name}» da questa settimana`);
    contenitore.append(elimina);
  }

  intestazioneRiga.append(contenitore);
  tr.append(intestazioneRiga);

  GIORNI.forEach((giorno, i) => {
    const td = document.createElement('td');
    td.dataset.col = String(i);

    const etichetta = document.createElement('label');
    etichetta.className = 'cella';
    const casella = document.createElement('input');
    casella.type = 'checkbox';
    casella.dataset.id = attivita.id;
    casella.dataset.giorno = String(i);
    casella.checked = w?.done[attivita.id]?.[i] === true;
    casella.setAttribute('aria-label', `${attivita.name} – ${giorno}`);

    etichetta.append(casella);
    td.append(etichetta);
    tr.append(td);
  });
  return tr;
}

// Una riga che occupa tutta la larghezza con un messaggio ("Nessuna attività, per ora…").
function creaRigaVuota(testoRiga) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 8;
  td.className = 'vuota';
  const span = document.createElement('span');
  span.textContent = testoRiga;
  td.append(span);
  tr.append(td);
  return tr;
}

// L'inizio delle righe in fondo (Energia, Riposo): solo l'intestazione; le celle le aggiunge chi la chiama.
function creaRigaVoce(testoVoce, legenda) {
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.scope = 'row';
  const contenitore = document.createElement('div');
  contenitore.className = 'riga-nome voce';
  const t = document.createElement('span');
  t.className = 'voce-testo';
  t.textContent = testoVoce;
  contenitore.append(t);
  if (legenda) {
    const l = document.createElement('span');
    l.className = 'legenda';
    l.textContent = legenda;
    contenitore.append(l);
  }
  th.append(contenitore);
  tr.append(th);
  return tr;
}

// Riga dell'energia: per ogni giorno tre pulsanti (pesa, ok, leggero). aria-pressed dice quale è scelto,
// sia al CSS (che lo colora) sia ai lettori di schermo.
function creaRigaEnergia() {
  const w = state.weeks[visualizzata];
  const tr = creaRigaVoce('Energia', 'pesa · ok · leggero');
  GIORNI.forEach((giorno, i) => {
    const td = document.createElement('td');
    td.dataset.col = String(i);
    const gruppo = document.createElement('div');
    gruppo.className = 'energia';
    gruppo.setAttribute('role', 'group');
    gruppo.setAttribute('aria-label', `Energia di ${giorno}`);
    for (const livello of LIVELLI) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'en';
      b.dataset.livello = livello;
      b.dataset.giorno = String(i);
      b.title = NOME_LIVELLO[livello];
      b.setAttribute('aria-label', `${giorno}: energia ${NOME_LIVELLO[livello].toLowerCase()}`);
      b.setAttribute('aria-pressed', String(w?.energy[i] === livello));
      gruppo.append(b);
    }
    td.append(gruppo);
    tr.append(td);
  });
  return tr;
}

// Riga del riposo: una casella per giorno. Una colonna di riposo prende una tinta propria (vedi aggiornaColonne).
function creaRigaRiposo() {
  const w = state.weeks[visualizzata];
  const tr = creaRigaVoce('Giorno di riposo');
  GIORNI.forEach((giorno, i) => {
    const td = document.createElement('td');
    td.dataset.col = String(i);
    const etichetta = document.createElement('label');
    etichetta.className = 'cella';
    const casella = document.createElement('input');
    casella.type = 'checkbox';
    casella.className = 'riposo';
    casella.dataset.giorno = String(i);
    casella.checked = w?.rest[i] === true;
    casella.setAttribute('aria-label', `Riposo – ${giorno}`);
    etichetta.append(casella);
    td.append(etichetta);
    tr.append(td);
  });
  return tr;
}

// Oggi, riposo e giorni futuri si applicano per colonna: si aggiorna senza ridisegnare tutto.
export function aggiornaColonne() {
  const lun = dataDaChiave(visualizzata);
  const w = state.weeks[visualizzata];
  document.querySelectorAll('[data-col]').forEach((el) => {
    const i = Number(el.dataset.col);
    const giornoK = chiaveData(aggiungiGiorni(lun, i));
    const futuro = giornoK > oggiK;
    el.toggleAttribute('data-oggi', giornoK === oggiK);
    el.toggleAttribute('data-futuro', futuro);
    el.toggleAttribute('data-riposo', w?.rest[i] === true);
    el.querySelectorAll('input, button').forEach((c) => { c.disabled = futuro; });
  });
}

// La barra sopra la tabella: periodo, "Settimana scorsa / 3 settimane fa", frecce, "Torna a oggi".
// Nelle settimane passate nasconde il modulo per aggiungere e mostra la nota che lo spiega.
function aggiornaNavigatore() {
  const lun = dataDaChiave(visualizzata);
  const corrente = inSettimanaCorrente();
  const periodo = etichettaPeriodo(lun);
  $('#periodo').textContent = periodo;

  const differenza = Math.round((dataDaChiave(lunediCorrente()) - lun) / (7 * 24 * 3600 * 1000));
  $('#sottoperiodo').textContent = corrente ? 'Questa settimana'
    : differenza === 1 ? 'Settimana scorsa'
    : differenza > 1 ? `${differenza} settimane fa`
    : 'Nel futuro';

  $('#sett-succ').disabled = visualizzata >= lunediCorrente();
  $('#vai-oggi').hidden = corrente;
  formNuova.hidden = !corrente;
  notaPassata.hidden = corrente;
  $('#didascalia').textContent =
    `Attività, energia e riposo per la settimana ${periodo}. Spunta le caselle delle cose fatte.`;
}

// Quanto hai usato ogni voce nelle ultime FINESTRA settimane (corrente compresa): giorni segnati, settimane in lista,
// e l'ultima settimana in cui compare. Le voci fuori dalla finestra non ci sono.
function usoRecente() {
  const corrente = lunediCorrente();
  const inizio = chiaveData(aggiungiGiorni(dataDaChiave(corrente), -7 * FINESTRA));
  const uso = new Map();
  for (const [k, w] of Object.entries(state.weeks)) {
    if (k < inizio || k > corrente) continue;
    for (const a of w.activities) {
      const u = uso.get(a.id) ?? { giorni: 0, settimane: 0, ultima: '' };
      u.giorni += (w.done[a.id] ?? []).filter(Boolean).length;
      u.settimane += 1;
      if (k > u.ultima) u.ultima = k;
      uso.set(a.id, u);
    }
  }
  return uso;
}

// Senza accenti né maiuscole: "liberta" trova "Libertà"
const perRicerca = (t) => chiaveNome(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Sotto il campo "Aggiungi".
// Campo vuoto: le voci più frequenti delle ultime settimane (al massimo MAX_FREQUENTI).
// Mentre scrivi: tutta la libreria, anche le voci che non usi da tempo.
export function aggiornaSuggerimenti() {
  const corrente = inSettimanaCorrente();
  const presenti = new Set((state.weeks[visualizzata]?.activities ?? []).map((a) => a.id));
  const candidate = corrente ? state.libreria.filter((v) => !presenti.has(v.id)) : [];
  const uso = usoRecente();
  const zero = { giorni: 0, settimane: 0, ultima: '' };
  const perFrequenza = (a, b) => {
    const ua = uso.get(a.id) ?? zero;
    const ub = uso.get(b.id) ?? zero;
    return ub.giorni - ua.giorni || ub.settimane - ua.settimane
      || ub.ultima.localeCompare(ua.ultima) || a.name.localeCompare(b.name, 'it');
  };

  const cerca = perRicerca(campoNuova.value);
  let voci;
  if (cerca) {
    const inizia = (v) => (perRicerca(v.name).startsWith(cerca) ? 0 : 1);
    voci = candidate.filter((v) => perRicerca(v.name).includes(cerca))
      .sort((a, b) => inizia(a) - inizia(b) || perFrequenza(a, b))
      .slice(0, MAX_RICERCA);
    $('#titolo-suggerimenti').textContent = 'Nella libreria:';
  } else {
    voci = candidate.filter((v) => uso.has(v.id)).sort(perFrequenza).slice(0, MAX_FREQUENTI);
    $('#titolo-suggerimenti').textContent = 'Frequenti:';
    // Prima settimana d'uso (nessuna settimana passata da riprendere): proposte di esempio, finché non le scegli
    if (corrente && !voci.length && !settimanaDaRiprendere()) {
      const nomi = new Set(state.libreria.map((v) => chiaveNome(v.name)));
      voci = ATTIVITA_INIZIALI.filter((n) => !nomi.has(chiaveNome(n))).map((name) => ({ name }));
      $('#titolo-suggerimenti').textContent = 'Per cominciare:';
    }
  }

  vociSuggerite.replaceChildren(...voci.map((v) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.nome = v.name;
    b.textContent = `+ ${v.name}`;
    b.setAttribute('aria-label', `Aggiungi «${v.name}» a questa settimana`);
    return b;
  }));
  // Su telefono i suggerimenti occupano spazio prezioso: compaiono mentre usi il campo, oppure se la settimana
  // è ancora vuota (è il momento in cui servono di più).
  const settimanaVuota = !(state.weeks[visualizzata]?.activities.length);
  const mostra = !telefono.matches || formNuova.classList.contains('attivo') || settimanaVuota;
  boxSuggerimenti.hidden = voci.length === 0 || !mostra;
}

// Settimana corrente ancora vuota: proposta di riprendere la lista della settimana precedente.
function aggiornaRiprendi() {
  const vuota = !(state.weeks[visualizzata]?.activities.length);
  const fonte = inSettimanaCorrente() && vuota ? settimanaDaRiprendere() : null;
  boxRiprendi.hidden = !fonte;
  if (fonte) {
    const n = attivitaDi(fonte).length;
    $('#testo-riprendi').textContent = `Questa settimana è ancora vuota. Puoi riprendere le ${n === 1 ? 'attività' : `${n} attività`} `
      + `della settimana del ${fmtNumerica.format(dataDaChiave(fonte))}, senza i dettagli, oppure scegliere da capo.`;
  }
}

// Le faccende della tabella: testo della cadenza e calore, aggiornati sul posto (dopo una spunta o un riposo
// la tabella non si ridisegna, per non far perdere il fuoco alla casella appena toccata).
let faccendeTabella = new Map();
export function aggiornaFaccendeTabella() {
  faccendeTabella = faccendeDiOggi();
  const riposo = inSettimanaCorrente() && riposoOggi();
  corpo.querySelectorAll('th[data-faccenda]').forEach((th) => {
    const f = faccendeTabella.get(th.dataset.faccenda);
    th.querySelector('.riga-cadenza').textContent = f ? testoCadenza(f) : '';
    segnaCalore(th, f, { riposo });
  });
}

// La tabella della settimana (computer).
function disegnaTabella() {
  faccendeTabella = faccendeDiOggi();
  creaIntestazione();
  const attivita = attivitaDi(visualizzata);
  corpo.replaceChildren(...(attivita.length
    ? attivita.map(creaRiga)
    : [creaRigaVuota(inSettimanaCorrente()
        ? 'Nessuna attività, per ora: aggiungine una qui sotto.'
        : 'In questa settimana non c’erano attività.')]));
  piede.replaceChildren(creaRigaEnergia(), creaRigaRiposo());
  aggiornaColonne();
  aggiornaFaccendeTabella();
}

/* ───────── Vista a un giorno (telefono) ───────── */
// Il giorno mostrato, da 0 (lunedì) a 6. null = "scegli tu": oggi nella settimana corrente, domenica nelle altre.
// Passando da una settimana all'altra resta lo stesso giorno della settimana, se non è nel futuro.
let giornoScelto = null;
export function scegliGiorno(g) { giornoScelto = g; }

function giornoMostrato() {
  const lun = dataDaChiave(visualizzata);
  const futuro = (i) => chiaveData(aggiungiGiorni(lun, i)) > oggiK;
  if (giornoScelto === null || futuro(giornoScelto)) {
    giornoScelto = inSettimanaCorrente() ? (dataDaChiave(oggiK).getDay() + 6) % 7 : 6;
  }
  return giornoScelto;
}

function disegnaGiorno() {
  const g = giornoMostrato();
  const lun = dataDaChiave(visualizzata);
  const w = state.weeks[visualizzata];
  const attivita = attivitaDi(visualizzata);
  const data = aggiungiGiorni(lun, g);

  // La striscia: per ogni giorno abbreviazione, numero, barra (quota di attività segnate), puntino dell'energia
  striscia.replaceChildren(...GIORNI.map((nome, i) => {
    const giornoK = chiaveData(aggiungiGiorni(lun, i));
    const fatti = attivita.filter((a) => w?.done[a.id]?.[i]).length;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'giorno';
    b.dataset.giorno = String(i);
    b.disabled = giornoK > oggiK;
    b.toggleAttribute('data-oggi', giornoK === oggiK);
    b.toggleAttribute('data-riposo', w?.rest[i] === true);
    if (w?.energy[i]) b.dataset.energia = w.energy[i];
    b.setAttribute('aria-pressed', String(i === g));
    b.style.setProperty('--pieno', attivita.length ? String(fatti / attivita.length) : '0');
    b.setAttribute('aria-label', `${nome} ${fmtBreve.format(aggiungiGiorni(lun, i))}: ${fatti} di ${attivita.length} attività segnate`);
    const n = document.createElement('span');
    n.className = 'giorno-nome';
    n.textContent = nome.slice(0, 3);
    const num = document.createElement('span');
    num.className = 'giorno-num';
    num.textContent = String(aggiungiGiorni(lun, i).getDate());
    const barra = document.createElement('span');
    barra.className = 'giorno-barra';
    b.append(n, num, barra);
    return b;
  }));

  // La giornata: titolo, energia, riposo
  const titolo = $('#titolo-giorno');
  titolo.textContent = `${GIORNI[g]} ${fmt({ day: 'numeric', month: 'long' }).format(data)}`;
  if (chiaveData(data) === oggiK) {
    const oggi = document.createElement('small');
    oggi.textContent = 'oggi';
    titolo.append(oggi);
  }
  segmenti.replaceChildren(...LIVELLI.map((livello) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'segmento';
    b.dataset.livello = livello;
    b.dataset.giorno = String(g);
    b.textContent = NOME_LIVELLO[livello];
    b.setAttribute('aria-pressed', String(w?.energy[g] === livello));
    return b;
  }));
  $('.giornata').toggleAttribute('data-riposo', w?.rest[g] === true);
  riposoGiorno.dataset.giorno = String(g);
  riposoGiorno.checked = w?.rest[g] === true;
  riposoGiorno.setAttribute('aria-label', `Giorno di riposo – ${GIORNI[g]}`);

  // Le schede delle attività
  const faccende = inSettimanaCorrente() ? faccendeDiOggi() : new Map();
  carte.replaceChildren(...(attivita.length
    ? attivita.map((a) => creaCarta(a, g, faccende.get(a.id)))
    : [creaCartaVuota(inSettimanaCorrente()
        ? 'Nessuna attività, per ora: aggiungine una qui sopra.'
        : 'In questa settimana non c’erano attività.')]));
}

// Una scheda: nome, dettaglio, sette puntini della settimana, "Togli"; a destra l'interruttore del giorno scelto.
// Le caselle hanno gli stessi data-id e data-giorno della tabella: i gestori degli eventi sono gli stessi.
// f: la faccenda, se la voce ne è una (solo nella settimana corrente). Fatta quel giorno, la scheda è verde;
// altrimenti, in un giorno di riposo prende la tinta del riposo; altrimenti, oltre la cadenza, si scalda.
function creaCarta(attivita, g, f) {
  const w = state.weeks[visualizzata];
  const fatto = w?.done[attivita.id] ?? [];
  const li = document.createElement('li');
  li.className = 'carta';
  li.toggleAttribute('data-fatto', fatto[g] === true);
  const riposo = w?.rest[g] === true && fatto[g] !== true;
  li.toggleAttribute('data-riposo', riposo);
  if (fatto[g] !== true) segnaCalore(li, f, { riposo });

  const testi = document.createElement('div');
  testi.className = 'carta-testi';
  const nome = inSettimanaCorrente() ? nomeRinominabile(attivita.id, attivita.name) : document.createElement('span');
  if (!inSettimanaCorrente()) {
    nome.className = 'nome-voce';
    nome.textContent = attivita.name;
  }
  const dettaglio = document.createElement('input');
  dettaglio.type = 'text';
  dettaglio.className = 'dettaglio';
  dettaglio.value = attivita.dettaglio;
  dettaglio.maxLength = MAX_DETTAGLIO;
  dettaglio.placeholder = 'Aggiungi un dettaglio';
  dettaglio.dataset.id = attivita.id;
  dettaglio.setAttribute('aria-label', `Dettaglio di «${attivita.name}» per questa settimana`);

  const piedeCarta = document.createElement('div');
  piedeCarta.className = 'carta-piede';
  const puntini = document.createElement('span');
  puntini.className = 'puntini';
  puntini.setAttribute('aria-hidden', 'true');   // la stessa informazione è nella striscia e nelle schede degli altri giorni
  for (let i = 0; i < 7; i++) {
    const p = document.createElement('span');
    p.className = 'puntino';
    p.toggleAttribute('data-fatto', fatto[i] === true);
    p.toggleAttribute('data-scelto', i === g);
    puntini.append(p);
  }
  piedeCarta.append(puntini);
  if (inSettimanaCorrente()) {
    const togli = document.createElement('button');
    togli.type = 'button';
    togli.className = 'togli';
    togli.dataset.id = attivita.id;
    togli.textContent = 'Togli dalla settimana';
    togli.setAttribute('aria-label', `Togli «${attivita.name}» da questa settimana`);
    piedeCarta.append(togli);
  }
  testi.append(nome);
  if (f) {
    const riga = document.createElement('span');
    riga.className = 'riga-cadenza';
    riga.textContent = testoCadenza(f);
    testi.append(riga);
  }
  testi.append(dettaglio, piedeCarta);

  const etichetta = document.createElement('label');
  etichetta.className = 'carta-spunta';
  const casella = document.createElement('input');
  casella.type = 'checkbox';
  casella.dataset.id = attivita.id;
  casella.dataset.giorno = String(g);
  casella.checked = fatto[g] === true;
  casella.setAttribute('aria-label', `${attivita.name} – ${GIORNI[g]}`);
  etichetta.append(casella);

  li.append(testi, etichetta);
  return li;
}

function creaCartaVuota(testo) {
  const li = document.createElement('li');
  li.className = 'carta-vuota';
  li.textContent = testo;
  return li;
}

// Ridisegna la settimana dalla vista (state). Rifare la tabella intera costa pochissimo (poche decine di righe)
// e ha un grande vantaggio: ciò che vedi viene sempre e solo dai dati, non può restare indietro.
// Si chiama solo quando la sezione Settimana è aperta (sezioni.js).
function disegnaSettimana() {
  const suTelefono = telefono.matches;
  scheda.hidden = suTelefono;
  vistaGiorno.hidden = !suTelefono;
  // il blocco per aggiungere è uno solo: lo sposto dove serve (spostare un elemento non perde i suoi gestori)
  const posto = suTelefono ? $('#posto-aggiungi') : scheda;
  if (bloccoAggiungi.parentElement !== posto) posto.append(bloccoAggiungi);
  if (suTelefono) disegnaGiorno(); else disegnaTabella();
  aggiornaNavigatore();
  aggiornaPromemoria(visualizzata);
  aggiornaSuggerimenti();
  aggiornaRiprendi();
}

// La sezione Settimana, come la vede il registro delle sezioni (sezioni.js; la registra guscio.js)
export const sezioneSettimana = {
  nome: 'settimana',
  titolo: 'La mia settimana',
  sottotitolo: 'Le attività della settimana, giorno per giorno.',
  elemento: $('#sezione-settimana'),
  disegna: disegnaSettimana,
};
