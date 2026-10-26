'use strict';
// js/azioni.js — le azioni sulla settimana: aggiungere, suggerimenti, spuntare, togliere, energia, riposo, cambiare settimana.
// Script classico, non un modulo: condivide le costanti e le funzioni degli altri file di js/
// (vedi l’elenco in index.html e la nota in base.js).

/* ───────── Azioni: attività della settimana ─────────
   I gestori degli eventi sono pochi e stanno sui contenitori (corpo, piede, listaLibreria), non su ogni casella:
   un evento "risale" dall'elemento toccato fino ai suoi antenati, quindi un solo gestore sul corpo della tabella
   riceve i tocchi di tutte le caselle, anche di quelle create dopo. Si chiama "delega degli eventi".
   Dentro, e.target è l'elemento toccato; matches() e closest() dicono di che elemento si tratta. */
// Aggiunge una voce alla settimana corrente (il nucleo riconosce i nomi già in libreria).
function aggiungiAllaSettimana(nome) {
  if (!inSettimanaCorrente() || !Core.pulisci(nome, MAX_NOME)) return false;
  return esito(db.aggiungi(visualizzata, nome));
}

// Invio nel campo o pulsante «Aggiungi». preventDefault() impedisce al modulo di ricaricare la pagina.
formNuova.addEventListener('submit', (e) => {
  e.preventDefault();
  if (aggiungiAllaSettimana(campoNuova.value)) {
    campoNuova.value = '';
    aggiornaSuggerimenti();
    campoNuova.focus();
  }
});

campoNuova.addEventListener('input', aggiornaSuggerimenti);

// "attivo" = stai usando il campo: su telefono è il momento di mostrare i suggerimenti.
formNuova.addEventListener('focusin', () => { formNuova.classList.add('attivo'); aggiornaSuggerimenti(); });
// Un dito (o il mouse) premuto in questo momento? Lo segue la pagina intera, prima di chiunque altro (capture).
let premuto = false;
document.addEventListener('pointerdown', () => { premuto = true; }, true);
for (const tipo of ['pointerup', 'pointercancel']) document.addEventListener(tipo, () => { premuto = false; }, true);

formNuova.addEventListener('focusout', () => {
  const chiudi = () => {
    // se il fuoco è solo passato a un altro elemento del modulo, non chiudo niente
    if (formNuova.contains(document.activeElement)) return;
    formNuova.classList.remove('attivo');
    aggiornaSuggerimenti();
  };
  // Il campo perde il fuoco già quando il dito si appoggia altrove. Se chiudessi subito i suggerimenti, la pagina si
  // sposterebbe sotto il dito e il rilascio cadrebbe su un'altra cosa: il tocco andrebbe perso. Quindi, a dito
  // premuto, aspetto il rilascio (e il clic che lo segue); altrimenti, solo un attimo.
  if (premuto) document.addEventListener('pointerup', () => setTimeout(chiudi, 0), { once: true, capture: true });
  else setTimeout(chiudi, 0);
});
// Premendo un suggerimento il campo non perde il fuoco (preventDefault su pointerdown): la tastiera resta aperta
// e il clic arriva comunque al suggerimento.
boxSuggerimenti.addEventListener('pointerdown', (e) => { if (e.target.closest('.chip')) e.preventDefault(); });

// Tocco su un suggerimento ("+ Sviluppo"): aggiunge quella voce.
boxSuggerimenti.addEventListener('click', (e) => {
  const b = e.target.closest('.chip');
  if (b && aggiungiAllaSettimana(b.dataset.nome)) {
    campoNuova.value = '';
    aggiornaSuggerimenti();
  }
});

$('#riprendi-settimana').addEventListener('click', () => {
  const fonte = settimanaDaRiprendere();
  if (!fonte || !inSettimanaCorrente()) return;
  esito(db.riprendi(visualizzata, fonte));
});

// Una casella spuntata o tolta, oppure un dettaglio modificato ("change" arriva quando esci dal campo).
// Lo stesso gestore serve la tabella (corpo) e le schede del telefono (carte).
// Su telefono, dopo una spunta, ridisegno: cambiano anche la striscia, il colore della scheda, i puntini.
function suCambio(e) {
  const el = e.target;

  if (el.matches('input[type="checkbox"]')) {
    const { id, giorno } = el.dataset;
    // su computer la casella è già spuntata: aggiorno solo testo e calore della faccenda, se lo è
    if (esito(db.spunta(visualizzata, id, Number(giorno), el.checked), { ridisegna: telefono.matches }) && !telefono.matches) {
      aggiornaFaccendeTabella();
    }
    return;
  }

  if (el.matches('.dettaglio')) {
    const r = db.dettaglio(visualizzata, el.dataset.id, el.value);
    if (esito(r, { ridisegna: false })) { el.value = r.valore; el.title = r.valore; }
  }
}

// Invio nel campo del dettaglio lo conferma (esce dal campo, e così parte "change").
function suTasto(e) {
  if (e.key === 'Enter' && e.target.matches('.dettaglio')) { e.preventDefault(); e.target.blur(); }
}

// La × di una riga (tabella) o "Togli" di una scheda (telefono): chiede conferma e toglie l'attività da questa settimana.
async function suTogli(e) {
  const bottone = e.target.closest('.elimina, .togli');
  if (!bottone || !inSettimanaCorrente()) return;
  const id = bottone.dataset.id;
  const v = voce(id);
  if (!v) return;

  // In quali giorni di questa settimana l'attività risulta svolta. Togliendola, le spunte non si perdono:
  // restano nel registro come storico (vedi togli in core.js) e ricompaiono se la rimetti.
  const svolta = (state.weeks[visualizzata]?.done[id] ?? [])
    .map((fatto, i) => (fatto ? GIORNI[i].toLowerCase() : null))
    .filter(Boolean);
  const spunte = svolta.length
    ? `Risulta svolta ${elencoGiorni(svolta)}: le spunte restano nello storico e ricompaiono se la rimetti in questa settimana.`
    : 'Non ha spunte in questa settimana.';

  const ok = await conferma(
    `Vuoi togliere «${v.name}» da tutta la settimana? ${spunte} `
    + 'La voce resta nella libreria e le altre settimane non cambiano.',
    'Togli');
  if (!ok) return;

  esito(db.togli(visualizzata, id));
}

// "lunedì", "lunedì e giovedì", "lunedì, martedì e giovedì"
function elencoGiorni(giorni) {
  return giorni.length === 1 ? giorni[0] : `${giorni.slice(0, -1).join(', ')} e ${giorni.at(-1)}`;
}

for (const contenitore of [corpo, carte]) {
  contenitore.addEventListener('change', suCambio);
  contenitore.addEventListener('keydown', suTasto);
  contenitore.addEventListener('click', suTogli);
}

/* ───────── Azioni: energia e riposo ───────── */
// Una casella di riposo (tabella).
piede.addEventListener('change', (e) => {
  const el = e.target;
  if (!el.matches('input.riposo')) return;
  if (esito(db.riposo(visualizzata, Number(el.dataset.giorno), el.checked), { ridisegna: false })) {
    aggiornaColonne();
    aggiornaFaccendeTabella();   // con il riposo oggi, le faccende perdono il calore
  }
});

// Il livello di energia dopo un tocco su `livello`: un secondo tocco sullo stesso livello toglie la scelta.
function energiaDopoTocco(giorno, livello) {
  const attuale = state.weeks[visualizzata]?.energy[giorno] ?? null;
  return attuale === livello ? null : livello;
}

// Un pulsante di energia (tabella): aggiorno solo i tre pulsanti di quel giorno.
piede.addEventListener('click', (e) => {
  const b = e.target.closest('.en');
  if (!b || b.disabled) return;
  const i = Number(b.dataset.giorno);
  const nuovo = energiaDopoTocco(i, b.dataset.livello);
  if (!esito(db.energia(visualizzata, i, nuovo), { ridisegna: false })) return;
  b.parentElement.querySelectorAll('.en').forEach((x) => {
    x.setAttribute('aria-pressed', String(x.dataset.livello === nuovo));
  });
});

// Telefono: un segmento dell'energia, il riposo, un giorno della striscia.
segmenti.addEventListener('click', (e) => {
  const b = e.target.closest('.segmento');
  if (!b) return;
  const i = Number(b.dataset.giorno);
  esito(db.energia(visualizzata, i, energiaDopoTocco(i, b.dataset.livello)));
});
riposoGiorno.addEventListener('change', () => {
  esito(db.riposo(visualizzata, Number(riposoGiorno.dataset.giorno), riposoGiorno.checked));
});
striscia.addEventListener('click', (e) => {
  const b = e.target.closest('.giorno');
  if (!b || b.disabled) return;
  giornoScelto = Number(b.dataset.giorno);
  disegna();
});

/* ───────── Azioni: cambiare settimana ───────── */
// Mostra un'altra settimana (chiave = il suo lunedì).
function vaiA(chiave) {
  visualizzata = chiave;
  disegna();
}
$('#sett-prec').addEventListener('click', () => vaiA(chiaveData(aggiungiGiorni(dataDaChiave(visualizzata), -7))));
$('#sett-succ').addEventListener('click', () => {
  if (visualizzata < lunediCorrente()) vaiA(chiaveData(aggiungiGiorni(dataDaChiave(visualizzata), 7)));
});
$('#vai-oggi').addEventListener('click', () => { giornoScelto = null; vaiA(lunediCorrente()); });

// Se la pagina resta aperta oltre la mezzanotte, "oggi" si sposta da solo.
function controllaGiorno() {
  const nuovo = chiaveData(soloData());
  if (nuovo === oggiK) return;
  const guardavoLaCorrente = inSettimanaCorrente();
  oggiK = nuovo;
  if (guardavoLaCorrente) { visualizzata = lunediCorrente(); giornoScelto = null; }
  disegna();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden) controllaGiorno(); });
window.addEventListener('focus', controllaGiorno);
setInterval(controllaGiorno, 60_000);

/* ───────── Azioni: il promemoria delle faccende ───────── */
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
