'use strict';
// js/settimana.js — la settimana visualizzata e il disegno: tabella (computer) e vista a un giorno (telefono).
// Script classico, non un modulo: condivide le costanti e le funzioni degli altri file di js/
// (vedi l’elenco in index.html e la nota in base.js).

/* ───────── Settimana visualizzata ───────── */
let oggiK = chiaveData(soloData());          // data di oggi, come 'AAAA-MM-GG'
let visualizzata = chiaveLunedi(soloData()); // lunedì della settimana che stai guardando

const lunediCorrente = () => chiaveLunedi(dataDaChiave(oggiK));
const inSettimanaCorrente = () => visualizzata === lunediCorrente();

const voce = (id) => state.libreria.find((v) => v.id === id);

// Le attività di una settimana, con il nome preso dalla libreria
const attivitaDi = (k) => (state.weeks[k]?.activities ?? [])
  .map((a) => ({ ...a, name: voce(a.id)?.name }))
  .filter((a) => a.name);

// "Segni" = qualcosa che hai scritto tu: spunte, riposo, energia, dettagli. Una lista di attività da sola non lo è.
const haSegni = (w) => Boolean(w)
  && (Object.keys(w.done).length > 0 || w.rest.includes(true) || w.energy.some((e) => e !== null)
    || w.activities.some((a) => a.dettaglio));
const haContenuto = (w) => Boolean(w) && (w.activities.length > 0 || haSegni(w));
// In quante settimane compare una voce (serve alla libreria: una voce usata non si cancella)
const settimaneConVoce = (id) => Object.values(state.weeks).filter((w) => w.activities.some((a) => a.id === id)).length;

/* ───────── Faccende nella settimana ─────────
   Una voce con una cadenza è una faccenda (vedi core.js, faccende). Nella settimana corrente la sua scheda
   (o la cella del nome, nella tabella) dice da quanto non la fai e, oltre la cadenza, si scalda: data-calore e
   --calore, che stile.css trasforma in colore secondo l'intensità scelta nel menu. Nelle settimane passate no:
   il calore parla di oggi. */
const faccendeDiOggi = () => new Map(Core.faccende(db.registro, oggiK).map((f) => [f.id, f]));
const fmtGiorno = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
const ogniGiorni = (n) => (n === 1 ? 'Ogni giorno' : `Ogni ${n} giorni`);

// "oggi", "ieri", "16 giorni fa"
function daQuando(k) {
  const giorni = Core.giorniTra(k, oggiK);
  return giorni <= 0 ? 'oggi' : giorni === 1 ? 'ieri' : `${giorni} giorni fa`;
}
// "oggi", "ieri", "giovedì 22 ottobre": quando hai saltato il giro
const quandoSalto = (k) => (Core.giorniTra(k, oggiK) <= 1 ? daQuando(k) : fmtGiorno.format(dataDaChiave(k)));

/* Le date delle faccende si scrivono come date, non come conti da fare: «Fatta il 23 settembre», e il giro che ne
   segue, «giro aperto dal 7 ottobre» oppure «prossimo giro: venerdì 30 ottobre». Le parole sono quelle di un
   calendario: niente «scaduta», niente ordini. */
const fmtGiornoMese = fmt({ day: 'numeric', month: 'long' });
const fmtGiornoMeseAnno = fmt({ day: 'numeric', month: 'long', year: 'numeric' });
// "23 settembre", "1° ottobre"; con l'anno, se non è quello di oggi
function giornoMese(k) {
  const d = dataDaChiave(k);
  const testoData = (d.getFullYear() === dataDaChiave(oggiK).getFullYear() ? fmtGiornoMese : fmtGiornoMeseAnno).format(d);
  return d.getDate() === 1 ? testoData.replace(/^1 /, '1° ') : testoData;
}
// Davanti a 8 e 11 l'articolo si elide: «l’8 ottobre», «dall’11 ottobre»
const elide = (k) => [8, 11].includes(dataDaChiave(k).getDate());

// "Fatta oggi", "Fatta ieri", "Fatta il 23 settembre", "Fatta l’8 ottobre", "Mai segnata"
function testoFatta(f) {
  if (!f.ultima) return 'Mai segnata';
  const giorni = Core.giorniTra(f.ultima, oggiK);
  if (giorni <= 0) return 'Fatta oggi';
  if (giorni === 1) return 'Fatta ieri';
  return `Fatta ${elide(f.ultima) ? 'l’' : 'il '}${giornoMese(f.ultima)}`;
}

// "prossimo giro: domani", "prossimo giro: venerdì 30 ottobre", "giro aperto dal 7 ottobre", "" se mai segnata
function testoGiro(f) {
  if (!f.scade) return '';
  const giorni = Core.giorniTra(oggiK, f.scade);   // positivo: il giro deve ancora arrivare
  if (giorni === 0) return 'prossimo giro: oggi';
  if (giorni === 1) return 'prossimo giro: domani';
  if (giorni > 1) return `prossimo giro: ${fmtGiorno.format(dataDaChiave(f.scade))}`;
  if (giorni === -1) return 'giro aperto da ieri';
  return `giro aperto ${elide(f.scade) ? 'dall’' : 'dal '}${giornoMese(f.scade)}`;
}
const conMaiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// "Fatta il 6 ottobre · ogni 14 giorni · giro aperto dal 20 ottobre", "Mai segnata · ogni 30 giorni",
// "Fatta il 21 settembre · giro saltato ieri · ogni 7 giorni · prossimo giro: mercoledì 28 ottobre"
function testoCadenza(f) {
  return [testoFatta(f), f.salto ? `giro saltato ${quandoSalto(f.salto)}` : '', ogniGiorni(f.cadenza).toLowerCase(), testoGiro(f)]
    .filter(Boolean).join(' · ');
}

// Mette (o toglie) il calore su un elemento. Con il riposo, al posto del calore la tinta quieta del riposo.
function segnaCalore(el, f, { riposo = false } = {}) {
  const caldo = Boolean(f && f.calore > 0 && !riposo);
  el.toggleAttribute('data-calore', caldo);
  if (caldo) el.style.setProperty('--calore', f.calore.toFixed(3));
  else el.style.removeProperty('--calore');
}

// L'ultima settimana prima di quella corrente che aveva delle attività: da lì si può riprendere la lista
function settimanaDaRiprendere() {
  const corrente = lunediCorrente();
  return Object.keys(state.weeks).filter((k) => k < corrente && attivitaDi(k).length > 0).sort().pop() ?? null;
}

/* ───────── Promemoria delle faccende ─────────
   In cima alla settimana corrente: le faccende che non sono nella settimana e hanno un giro aperto o in arrivo
   entro domenica, più quelle mai segnate (sono proprio quelle che si rischia di dimenticare). Per ognuna, due
   scelte: «Aggiungi» (entra nella settimana) e «Salto questo giro» (il conteggio riparte da oggi). Senza scelta
   la riga resta lì: è un'informazione, non una richiesta. Il promemoria non scrive niente da solo. */
const boxPromemoria = $('#promemoria');
const listaPromemoria = $('#lista-promemoria');
// le faccende saltate da qui restano nel promemoria con «Annulla», finché non cambi sezione o ricarichi
const saltatiDalPromemoria = new Set();

function faccendeDaProporre() {
  if (!inSettimanaCorrente()) return [];
  const domenica = chiaveData(aggiungiGiorni(dataDaChiave(visualizzata), 6));
  const presenti = new Set((state.weeks[visualizzata]?.activities ?? []).map((a) => a.id));
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

function aggiornaPromemoria() {
  const elenco = faccendeDaProporre();
  boxPromemoria.hidden = elenco.length === 0;
  $('#conta-promemoria').textContent = String(elenco.length);
  const iOggi = (dataDaChiave(oggiK).getDay() + 6) % 7;
  const riposoOggi = state.weeks[lunediCorrente()]?.rest[iOggi] === true;
  listaPromemoria.replaceChildren(...elenco.map((f) => rigaPromemoria(f, riposoOggi)));
}

function rigaPromemoria(f, riposoOggi) {
  const li = document.createElement('li');
  li.className = 'promemoria-riga';
  li.dataset.id = f.id;
  const saltato = saltatiDalPromemoria.has(f.id);
  if (!saltato) {
    li.toggleAttribute('data-riposo', riposoOggi);
    segnaCalore(li, f, { riposo: riposoOggi });
  }
  const testi = document.createElement('div');
  testi.className = 'promemoria-testi';
  const nome = document.createElement('span');
  nome.className = 'nome-voce';
  nome.textContent = f.nome;
  const riga = document.createElement('span');
  riga.className = 'riga-cadenza';
  riga.textContent = saltato ? 'Giro saltato oggi: il conteggio riparte da qui.' : testoCadenza(f);
  testi.append(nome, riga);

  const azioni = document.createElement('div');
  azioni.className = 'promemoria-azioni';
  const bottone = (testo, classe, azione, etichetta) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = testo;
    b.dataset.azione = azione;
    b.dataset.id = f.id;
    b.setAttribute('aria-label', etichetta);
    return b;
  };
  if (saltato) {
    azioni.append(bottone('Annulla', 'link-azione', 'annulla-salto', `Annulla il salto di ${f.nome}`));
  } else {
    azioni.append(
      bottone('Aggiungi', 'pulsante piccolo', 'aggiungi', `Aggiungi «${f.nome}» a questa settimana`),
      bottone('Salto questo giro', 'pulsante secondario piccolo', 'salta', `Salto questo giro di ${f.nome}`),
    );
  }
  li.append(testi, azioni);
  return li;
}

/* ───────── Il nome che si tocca per rinominare ─────────
   Il nome di una voce è un pulsante: toccandolo si apre il foglio «Rinomina» (js/libreria.js). La matita accanto
   dice che si può toccare anche a chi non ci prova. */
function nomeRinominabile(id, nome, classe = 'nome-voce') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `${classe} rinomina-voce`;
  b.dataset.rinomina = id;
  b.setAttribute('aria-label', `Rinomina «${nome}»`);
  const testo = document.createElement('span');
  testo.textContent = nome;
  b.append(testo, matita());
  return b;
}
function matita() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('class', 'matita');
  const p = document.createElementNS(NS, 'path');
  p.setAttribute('d', 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3');
  svg.append(p);
  return svg;
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
function aggiornaColonne() {
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
function aggiornaSuggerimenti() {
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
function aggiornaFaccendeTabella() {
  faccendeTabella = faccendeDiOggi();
  const iOggi = (dataDaChiave(oggiK).getDay() + 6) % 7;
  const riposoOggi = inSettimanaCorrente() && state.weeks[visualizzata]?.rest[iOggi] === true;
  corpo.querySelectorAll('th[data-faccenda]').forEach((th) => {
    const f = faccendeTabella.get(th.dataset.faccenda);
    th.querySelector('.riga-cadenza').textContent = f ? testoCadenza(f) : '';
    segnaCalore(th, f, { riposo: riposoOggi });
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

// Ridisegna tutto dalla vista (state). Rifare la tabella intera costa pochissimo (poche decine di righe)
// e ha un grande vantaggio: ciò che vedi viene sempre e solo dai dati, non può restare indietro.
function disegna() {
  // l'intensità del colore delle faccende (menu): vale su tutti i dispositivi, quindi sta nei dati
  document.documentElement.dataset.intensita = state.intensita;
  const suTelefono = telefono.matches;
  scheda.hidden = suTelefono;
  vistaGiorno.hidden = !suTelefono;
  // il blocco per aggiungere è uno solo: lo sposto dove serve (spostare un elemento non perde i suoi gestori)
  const posto = suTelefono ? $('#posto-aggiungi') : scheda;
  if (bloccoAggiungi.parentElement !== posto) posto.append(bloccoAggiungi);
  if (suTelefono) disegnaGiorno(); else disegnaTabella();
  aggiornaNavigatore();
  aggiornaPromemoria();
  aggiornaSuggerimenti();
  aggiornaRiprendi();
  aggiornaLibreria();
  aggiornaSync();
  disegnaCasa();   // js/casa.js: se la sezione Casa è aperta, si aggiorna anche lei
}
