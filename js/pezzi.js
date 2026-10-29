// js/pezzi.js — pezzi di interfaccia che servono a più sezioni: il nome che si tocca per rinominare, il calore
// di una faccenda.

// Mette (o toglie) il calore su un elemento. Con il riposo, al posto del calore la tinta quieta del riposo.
export function segnaCalore(el, f, { riposo = false } = {}) {
  const caldo = Boolean(f && f.calore > 0 && !riposo);
  el.toggleAttribute('data-calore', caldo);
  if (caldo) el.style.setProperty('--calore', f.calore.toFixed(3));
  else el.style.removeProperty('--calore');
}

/* ───────── Il nome che si tocca per rinominare ─────────
   Il nome di una voce è un pulsante: toccandolo si apre il foglio «Rinomina» (js/libreria.js). La matita accanto
   dice che si può toccare anche a chi non ci prova. */
export function nomeRinominabile(id, nome, classe = 'nome-voce') {
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

