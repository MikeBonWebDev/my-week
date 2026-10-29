// js/pezzi.js — pezzi di interfaccia che servono a più sezioni: il costruttore di elementi el(), il nome che si
// tocca per rinominare, il calore di una faccenda.

/* ───────── Costruire elementi: el() ─────────
   Un elemento in una riga sola, invece di una riga per ogni attributo:

     el('button', { type: 'button', class: 'en', dataset: { giorno: 2 }, aria: { pressed: false }, testo: 'Ok' })

   Le opzioni:
     class         la classe (className)
     testo         il testo (textContent: mai HTML, quindi un nome come "<b>Ciao</b>" si vede così com'è)
     dataset       gli attributi data-…; true = attributo vuoto (data-oggi=""), false/null = assente
     aria          gli attributi aria-…; i valori diventano testo (aria-pressed="false" resta, serve)
     attr          altri attributi; true = vuoto, false/null = assente
     stile         proprietà CSS, anche variabili ('--pieno': 0.5)
     tutto il resto  proprietà dell'elemento così come sono: type, value, checked, disabled, title, scope…
   Poi i figli: elementi o testi; null, undefined e false si saltano (comodo con cond && el(…)); gli elenchi si
   appiattiscono. Le opzioni si applicano nell'ordine in cui le scrivi: per un input, type prima di value. */
export function el(tag, opzioni = {}, ...figli) {
  const e = document.createElement(tag);
  for (const [chiave, valore] of Object.entries(opzioni)) {
    if (valore === undefined) continue;
    if (chiave === 'class') e.className = valore;
    else if (chiave === 'testo') e.textContent = valore;
    else if (chiave === 'dataset') {
      for (const [k, v] of Object.entries(valore)) if (presente(v)) e.dataset[k] = v === true ? '' : String(v);
    } else if (chiave === 'aria') {
      for (const [k, v] of Object.entries(valore)) if (v !== null && v !== undefined) e.setAttribute(`aria-${k}`, String(v));
    } else if (chiave === 'attr') {
      for (const [k, v] of Object.entries(valore)) if (presente(v)) e.setAttribute(k, v === true ? '' : String(v));
    } else if (chiave === 'stile') {
      for (const [k, v] of Object.entries(valore)) e.style.setProperty(k, String(v));
    } else e[chiave] = valore;
  }
  e.append(...figli.flat(Infinity).filter(presente));
  return e;
}
const presente = (v) => v !== false && v !== null && v !== undefined;

// Lo stesso per i disegni SVG, che vivono in un altro "spazio dei nomi": qui gli attributi sono tutti attributi.
const SVG = 'http://www.w3.org/2000/svg';
export function svg(tag, attributi = {}, ...figli) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attributi)) e.setAttribute(k, String(v));
  e.append(...figli);
  return e;
}

// Mette (o toglie) il calore su un elemento. Con il riposo, al posto del calore la tinta quieta del riposo.
export function segnaCalore(elemento, f, { riposo = false } = {}) {
  const caldo = Boolean(f && f.calore > 0 && !riposo);
  elemento.toggleAttribute('data-calore', caldo);
  if (caldo) elemento.style.setProperty('--calore', f.calore.toFixed(3));
  else elemento.style.removeProperty('--calore');
}

/* ───────── Il nome che si tocca per rinominare ─────────
   Il nome di una voce è un pulsante: toccandolo si apre il foglio «Rinomina» (js/libreria.js). La matita accanto
   dice che si può toccare anche a chi non ci prova. */
export function nomeRinominabile(id, nome, classe = 'nome-voce') {
  return el('button', {
    type: 'button', class: `${classe} rinomina-voce`, dataset: { rinomina: id }, aria: { label: `Rinomina «${nome}»` },
  },
    el('span', { testo: nome }),
    svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'matita' },
      svg('path', { d: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3' })));
}
