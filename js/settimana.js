// js/settimana.js — la settimana visualizzata e il disegno: tabella (computer) e vista a un giorno (telefono).
import * as Core from '../core.js';
import {
  $, aggiungiGiorni, ATTIVITA_INIZIALI, attivitaDi, bloccoAggiungi, boxSuggerimenti, campoNuova, carte, chiaveData,
  chiaveNome, corpo, dataDaChiave, db, FINESTRA, formNuova, GIORNI, inSettimanaCorrente, LIVELLI, lunediCorrente,
  MAX_DETTAGLIO, MAX_FREQUENTI, MAX_RICERCA, NOME_LIVELLO, notaPassata, oggiK, piede, rigaIntestazione, riposoGiorno,
  riposoOggi, scheda, segmenti, state, striscia, telefono, vistaGiorno, visualizzata, vociSuggerite
} from './base.js';
import { etichettaPeriodo, fmt, fmtBreve, testoCadenza } from './testi.js';
import { el, nomeRinominabile, segnaCalore } from './pezzi.js';
import { aggiornaPromemoria } from './promemoria.js';

/* ───────── Faccende nella settimana ─────────
   Una voce con una cadenza è una faccenda (vedi core.js, faccende). Nella settimana corrente la sua scheda
   (o la cella del nome, nella tabella) dice da quanto non la fai e, oltre la cadenza, si scalda: data-calore e
   --calore, che stile.css trasforma in colore secondo l'intensità scelta nel menu. Nelle settimane passate no:
   il calore parla di oggi. */
const faccendeDiOggi = () => new Map(Core.faccende(db.registro, oggiK).map((f) => [f.id, f]));
// C'è una settimana prima di quella corrente con delle attività? Se no, è la prima settimana d'uso
const haStoria = () => Object.keys(state.weeks).some((k) => k < lunediCorrente() && attivitaDi(k).length > 0);

/* ───────── Disegno della tabella ─────────
   Le funzioni crea… costruiscono gli elementi della tabella con el() (pezzi.js) e li riempiono con
   textContent, mai con innerHTML: un nome come "<b>Ciao</b>" viene mostrato così com'è, non interpretato
   come HTML. È la difesa più semplice contro l'inserimento di codice (XSS).
   Ogni casella porta con sé, negli attributi data-…, a quale voce e giorno si riferisce:
   quando la tocchi, il gestore dell'evento li legge da lì (elemento.dataset.id, elemento.dataset.giorno). */
// Prima riga: "Attività" e i sette giorni con la data. Nome lungo e corto: il CSS mostra quello adatto allo schermo.
function creaIntestazione() {
  const lun = dataDaChiave(visualizzata);
  rigaIntestazione.replaceChildren(
    el('th', { scope: 'col', testo: 'Attività' }),
    ...GIORNI.map((giorno, i) => el('th', { scope: 'col', dataset: { col: i } },
      el('span', { class: 'lungo', testo: giorno }),
      el('span', { class: 'corto', aria: { hidden: 'true' }, testo: giorno.slice(0, 3) }),
      el('span', { class: 'data', testo: fmtBreve.format(aggiungiGiorni(lun, i)) }))),
  );
}

// Il nome di una voce: nella settimana corrente si tocca per rinominarla; nelle settimane passate resta testo
const nomeDellaVoce = (attivita) => (inSettimanaCorrente()
  ? nomeRinominabile(attivita.id, attivita.name)
  : el('span', { class: 'nome-voce', testo: attivita.name }));

// Una riga di attività: nome, campo del dettaglio, × per toglierla (solo nella settimana corrente), sette caselle.
function creaRiga(attivita) {
  const w = state.weeks[visualizzata];
  const corrente = inSettimanaCorrente();
  const faccenda = corrente && faccendeTabella.has(attivita.id);
  return el('tr', {},
    el('th', { scope: 'row', dataset: { faccenda: faccenda && attivita.id } },
      el('div', { class: 'riga-nome' },
        el('div', { class: 'testi' },
          nomeDellaVoce(attivita),
          faccenda && el('span', { class: 'riga-cadenza' }),   // il testo lo mette aggiornaTabellaSulPosto
          el('input', {
            type: 'text', class: 'dettaglio', value: attivita.dettaglio, title: attivita.dettaglio,
            maxLength: MAX_DETTAGLIO, placeholder: 'dettaglio (facoltativo)', dataset: { id: attivita.id },
            aria: { label: `Dettaglio di «${attivita.name}» per questa settimana` },
          })),
        corrente && el('button', {
          type: 'button', class: 'elimina', dataset: { id: attivita.id }, testo: '×',
          aria: { label: `Togli «${attivita.name}» da questa settimana` },
        }))),
    // un giorno in cui l'attività non è in programma (o, per una faccenda, è coperta da una spunta vicina) si vede
    // attenuato, ma resta spuntabile: fatta fuori programma, vale lo stesso
    ...GIORNI.map((giorno, i) => el('td', { dataset: { col: i, fuori: !attivita.giorni[i] } },
      el('label', { class: 'cella' },
        el('input', {
          type: 'checkbox', dataset: { id: attivita.id, giorno: i }, checked: w?.done[attivita.id]?.[i] === true,
          aria: { label: `${attivita.name} – ${giorno}` },
        })))),
  );
}

// Una riga che occupa tutta la larghezza con un messaggio ("Nessuna attività, per ora…").
function creaRigaVuota(testoRiga) {
  return el('tr', {}, el('td', { colSpan: 8, class: 'vuota' }, el('span', { testo: testoRiga })));
}

// Le righe in fondo (Energia, Riposo): l'intestazione con il nome (e la legenda), poi una cella per giorno.
function creaRigaVoce(testoVoce, legenda, cella) {
  return el('tr', {},
    el('th', { scope: 'row' },
      el('div', { class: 'riga-nome voce' },
        el('span', { class: 'voce-testo', testo: testoVoce }),
        legenda && el('span', { class: 'legenda', testo: legenda }))),
    ...GIORNI.map((giorno, i) => el('td', { dataset: { col: i } }, cella(giorno, i))),
  );
}

// Riga dell'energia: per ogni giorno tre pulsanti (pesa, ok, leggero). aria-pressed dice quale è scelto,
// sia al CSS (che lo colora) sia ai lettori di schermo.
function creaRigaEnergia() {
  const w = state.weeks[visualizzata];
  return creaRigaVoce('Energia', 'pesa · ok · leggero', (giorno, i) =>
    el('div', { class: 'energia', attr: { role: 'group' }, aria: { label: `Energia di ${giorno}` } },
      LIVELLI.map((livello) => el('button', {
        type: 'button', class: 'en', dataset: { livello, giorno: i }, title: NOME_LIVELLO[livello],
        aria: { label: `${giorno}: energia ${NOME_LIVELLO[livello].toLowerCase()}`, pressed: w?.energy[i] === livello },
      }))));
}

// Riga del riposo: una casella per giorno. Una colonna di riposo prende una tinta propria (vedi aggiornaColonne).
function creaRigaRiposo() {
  const w = state.weeks[visualizzata];
  return creaRigaVoce('Giorno di riposo', null, (giorno, i) =>
    el('label', { class: 'cella' },
      el('input', {
        type: 'checkbox', class: 'riposo', dataset: { giorno: i }, checked: w?.rest[i] === true,
        aria: { label: `Riposo – ${giorno}` },
      })));
}

// Oggi, riposo e giorni futuri si applicano per colonna: si aggiorna senza ridisegnare tutto.
export function aggiornaColonne() {
  const lun = dataDaChiave(visualizzata);
  const w = state.weeks[visualizzata];
  document.querySelectorAll('[data-col]').forEach((cella) => {
    const i = Number(cella.dataset.col);
    const giornoK = chiaveData(aggiungiGiorni(lun, i));
    const futuro = giornoK > oggiK;
    cella.toggleAttribute('data-oggi', giornoK === oggiK);
    cella.toggleAttribute('data-futuro', futuro);
    cella.toggleAttribute('data-riposo', w?.rest[i] === true);
    cella.querySelectorAll('input, button').forEach((c) => { c.disabled = futuro; });
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
  // già presenti: un'attività per giorni conta solo se è già nel giorno in cui aggiungeresti (negli altri giorni si
  // propone); una faccenda, o un'attività di prima, sta sulla settimana intera
  const g = giornoPerAggiungere();
  const presenti = new Set((state.weeks[visualizzata]?.activities ?? [])
    .filter((a) => a.tipo !== 'giorni' || a.giorni[g]).map((a) => a.id));
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
    if (corrente && !voci.length && !haStoria()) {
      const nomi = new Set(state.libreria.map((v) => chiaveNome(v.name)));
      voci = ATTIVITA_INIZIALI.filter((n) => !nomi.has(chiaveNome(n))).map((name) => ({ name }));
      $('#titolo-suggerimenti').textContent = 'Per cominciare:';
    }
  }

  vociSuggerite.replaceChildren(...voci.map((v) => el('button', {
    type: 'button', class: 'chip', dataset: { nome: v.name }, testo: `+ ${v.name}`,
    aria: { label: `Aggiungi «${v.name}» ${dove(g)}` },
  })));
  // Su telefono i suggerimenti occupano spazio prezioso: compaiono mentre usi il campo, oppure se la settimana
  // è ancora vuota (è il momento in cui servono di più).
  const settimanaVuota = !(state.weeks[visualizzata]?.activities.length);
  const mostra = !telefono.matches || formNuova.classList.contains('attivo') || settimanaVuota;
  boxSuggerimenti.hidden = voci.length === 0 || !mostra;
}

// La tabella sul posto: dopo una spunta o un riposo non si ridisegna, per non far perdere il fuoco alla casella appena
// toccata. Si aggiornano il testo della cadenza e il calore delle faccende, e i giorni attenuati, che una spunta può
// cambiare (un giorno fuori programma, segnato, diventa normale; una faccenda segnata copre i giorni vicini).
let faccendeTabella = new Map();
export function aggiornaTabellaSulPosto() {
  faccendeTabella = faccendeDiOggi();
  const riposo = inSettimanaCorrente() && riposoOggi();
  corpo.querySelectorAll('th[data-faccenda]').forEach((th) => {
    const f = faccendeTabella.get(th.dataset.faccenda);
    th.querySelector('.riga-cadenza').textContent = f ? testoCadenza(f) : '';
    segnaCalore(th, f, { riposo });
  });
  const perId = new Map(attivitaDi(visualizzata).map((a) => [a.id, a]));
  corpo.querySelectorAll('td[data-col] input[data-id]').forEach((casella) => {
    const a = perId.get(casella.dataset.id);
    casella.closest('td').toggleAttribute('data-fuori', Boolean(a) && !a.giorni[Number(casella.dataset.giorno)]);
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
  aggiornaTabellaSulPosto();
}

/* ───────── Vista a un giorno (telefono) ───────── */
// Il giorno mostrato, da 0 (lunedì) a 6. null = "scegli tu": oggi nella settimana corrente, domenica nelle altre.
// Passando da una settimana all'altra resta lo stesso giorno della settimana, se non è nel futuro.
let giornoScelto = null;
export function scegliGiorno(g) { giornoScelto = g; }

// Il giorno a cui va un'attività aggiunta adesso: sul telefono quello mostrato, sul computer oggi
export function giornoPerAggiungere() {
  return telefono.matches ? giornoMostrato() : (dataDaChiave(oggiK).getDay() + 6) % 7;
}
// "a oggi", "a lunedì": dove finisce, detto per esteso (per i pulsanti e i messaggi)
export const dove = (g) => (chiaveData(aggiungiGiorni(dataDaChiave(visualizzata), g)) === oggiK ? 'a oggi' : `a ${GIORNI[g].toLowerCase()}`);

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
  const tutte = attivitaDi(visualizzata);
  const delGiorno = (i) => tutte.filter((a) => a.giorni[i]);
  const attivita = delGiorno(g);
  const data = aggiungiGiorni(lun, g);

  // La striscia: per ogni giorno abbreviazione, numero, barra (quota di attività segnate), puntino dell'energia
  striscia.replaceChildren(...GIORNI.map((nome, i) => {
    const giorno = aggiungiGiorni(lun, i);
    const giornoK = chiaveData(giorno);
    const quelGiorno = delGiorno(i);
    const fatti = quelGiorno.filter((a) => w?.done[a.id]?.[i]).length;
    return el('button', {
      type: 'button', class: 'giorno', disabled: giornoK > oggiK,
      dataset: { giorno: i, oggi: giornoK === oggiK, riposo: w?.rest[i] === true, energia: w?.energy[i] },
      aria: { pressed: i === g, label: `${nome} ${fmtBreve.format(giorno)}: ${fatti} di ${quelGiorno.length} attività segnate` },
      stile: { '--pieno': quelGiorno.length ? fatti / quelGiorno.length : 0 },
    },
    el('span', { class: 'giorno-nome', testo: nome.slice(0, 3) }),
    el('span', { class: 'giorno-num', testo: giorno.getDate() }),
    el('span', { class: 'giorno-barra' }));
  }));

  // La giornata: titolo, energia, riposo
  const titolo = $('#titolo-giorno');
  titolo.textContent = `${GIORNI[g]} ${fmt({ day: 'numeric', month: 'long' }).format(data)}`;
  if (chiaveData(data) === oggiK) titolo.append(el('small', { testo: 'oggi' }));
  segmenti.replaceChildren(...LIVELLI.map((livello) => el('button', {
    type: 'button', class: 'segmento', dataset: { livello, giorno: g }, testo: NOME_LIVELLO[livello],
    aria: { pressed: w?.energy[g] === livello },
  })));
  $('.giornata').toggleAttribute('data-riposo', w?.rest[g] === true);
  riposoGiorno.dataset.giorno = String(g);
  riposoGiorno.checked = w?.rest[g] === true;
  riposoGiorno.setAttribute('aria-label', `Giorno di riposo – ${GIORNI[g]}`);

  // Le schede delle attività
  const faccende = inSettimanaCorrente() ? faccendeDiOggi() : new Map();
  carte.replaceChildren(...(attivita.length
    ? attivita.map((a) => creaCarta(a, g, faccende.get(a.id)))
    : [creaCartaVuota(inSettimanaCorrente()
        ? 'Nessuna attività in questo giorno, per ora: aggiungine una qui sopra.'
        : 'In questo giorno non c’erano attività.')]));
}

// Una scheda: nome, dettaglio, sette puntini della settimana, "Togli"; a destra l'interruttore del giorno scelto.
// Le caselle hanno gli stessi data-id e data-giorno della tabella: i gestori degli eventi sono gli stessi.
// f: la faccenda, se la voce ne è una (solo nella settimana corrente). Fatta quel giorno, la scheda è verde;
// altrimenti, in un giorno di riposo prende la tinta del riposo; altrimenti, oltre la cadenza, si scalda.
function creaCarta(attivita, g, f) {
  const w = state.weeks[visualizzata];
  const fatto = w?.done[attivita.id] ?? [];
  const riposo = w?.rest[g] === true && fatto[g] !== true;
  const li = el('li', { class: 'carta', dataset: { fatto: fatto[g] === true, riposo } },
    el('div', { class: 'carta-testi' },
      nomeDellaVoce(attivita),
      f && el('span', { class: 'riga-cadenza', testo: testoCadenza(f) }),
      el('input', {
        type: 'text', class: 'dettaglio', value: attivita.dettaglio, maxLength: MAX_DETTAGLIO,
        placeholder: 'Aggiungi un dettaglio', dataset: { id: attivita.id },
        aria: { label: `Dettaglio di «${attivita.name}» per questa settimana` },
      }),
      el('div', { class: 'carta-piede' },
        // la stessa informazione è nella striscia e nelle schede degli altri giorni: per i lettori di schermo, nascosta
        el('span', { class: 'puntini', aria: { hidden: 'true' } },
          GIORNI.map((_, i) => el('span', { class: 'puntino', dataset: { fatto: fatto[i] === true, scelto: i === g } }))),
        inSettimanaCorrente() && bottoneTogli(attivita, g, fatto[g] === true))),
    el('label', { class: 'carta-spunta' },
      el('input', {
        type: 'checkbox', dataset: { id: attivita.id, giorno: g }, checked: fatto[g] === true,
        aria: { label: `${attivita.name} – ${GIORNI[g]}` },
      })));
  if (fatto[g] !== true) segnaCalore(li, f, { riposo });
  return li;
}

// Su una scheda: un'attività per giorni si toglie da quel giorno (non se lì è segnata: la spunta è storia);
// le altre, dalla settimana
function bottoneTogli(attivita, g, fattaQui) {
  if (attivita.tipo !== 'giorni') {
    return el('button', {
      type: 'button', class: 'togli', dataset: { id: attivita.id }, testo: 'Togli dalla settimana',
      aria: { label: `Togli «${attivita.name}» da questa settimana` },
    });
  }
  if (fattaQui) return null;
  return el('button', {
    type: 'button', class: 'togli togli-giorno', dataset: { id: attivita.id, giorno: g }, testo: 'Togli da questo giorno',
    aria: { label: `Togli «${attivita.name}» da ${GIORNI[g].toLowerCase()}` },
  });
}

function creaCartaVuota(testo) {
  return el('li', { class: 'carta-vuota', testo });
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
}

// La sezione Settimana, come la vede il registro delle sezioni (sezioni.js; la registra guscio.js)
export const sezioneSettimana = {
  nome: 'settimana',
  titolo: 'La mia settimana',
  sottotitolo: 'Le attività della settimana, giorno per giorno.',
  elemento: $('#sezione-settimana'),
  disegna: disegnaSettimana,
};
