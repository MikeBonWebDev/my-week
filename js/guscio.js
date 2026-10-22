'use strict';
// js/guscio.js — il menu, la finestra di conferma, l’avvio, l’app installabile.
// Script classico, non un modulo: condivide le costanti e le funzioni degli altri file di js/
// (vedi l’elenco in index.html e la nota in base.js).

/* ───────── Il menu ─────────
   Un <dialog> aperto con showModal(): sta sopra alla pagina, che intanto non risponde ai tocchi.
   Si chiude con la ×, con Esc, con un tocco fuori (sullo sfondo) o dopo aver unito un file. */
$('#apri-menu').addEventListener('click', () => {
  aggiornaLibreria();
  aggiornaSync();
  mostraVersione();
  menu.showModal();
});

// La versione installata, in fondo al menu. Si legge dal nome della copia salvata dal service worker,
// che è proprio VERSIONE di sw.js ("settimana-4"): così il numero si aggiorna in un posto solo.
// Senza service worker (pagina aperta come file) non c'è nessuna copia salvata.
async function mostraVersione() {
  const el = $('#versione-app');
  try {
    const numero = (nome) => Number(nome.split('-')[1]);
    // ordino per numero, non come testo: come testo "settimana-10" verrebbe prima di "settimana-9"
    const nomi = ('caches' in window ? await caches.keys() : [])
      .filter((n) => /^settimana-\d+$/.test(n))
      .sort((a, b) => numero(a) - numero(b));
    el.textContent = nomi.length ? `Versione: ${nomi.at(-1)}` : 'Versione: non installata (senza uso offline)';
  } catch {
    el.textContent = 'Versione: non disponibile';
  }
}

$('#chiudi-menu').addEventListener('click', () => menu.close());
menu.addEventListener('click', (e) => { if (e.target === menu) menu.close(); });

/* ───────── Finestra di conferma ───────── */
// Apre la finestra di conferma e restituisce una Promise che si risolve con true (Conferma) o false
// (Annulla, Esc, clic fuori). Chi la usa scrive  const ok = await conferma(…)  e il codice si "ferma" ad aspettare
// la risposta senza bloccare la pagina. I pulsanti stanno in un <form method="dialog">: premerli chiude
// la finestra e mette il loro value in dialogo.returnValue.
function conferma(testoDomanda, etichettaOk) {
  return new Promise((risolvi) => {
    $('#conferma-testo').textContent = testoDomanda;
    $('#conferma-ok').textContent = etichettaOk;
    dialogo.returnValue = '';
    dialogo.addEventListener('close', () => risolvi(dialogo.returnValue === 'ok'), { once: true });
    dialogo.showModal();
  });
}
// un clic sullo sfondo oscurato chiude la finestra senza confermare
dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); });

/* ───────── Avvio ───────── */
// Su schermi stretti la tabella scorre: porto la colonna di oggi al centro, così non devi cercarla.
function mostraOggi() {
  if (telefono.matches) return;   // su telefono non c'è la tabella: oggi è già il giorno mostrato
  const contenitore = $('.scorri');
  const th = rigaIntestazione.querySelector('[data-oggi]');
  if (!th || contenitore.scrollWidth <= contenitore.clientWidth) return;
  const larghezzaNomi = rigaIntestazione.firstElementChild.offsetWidth;
  const spazio = contenitore.clientWidth - larghezzaNomi - th.offsetWidth;
  contenitore.scrollLeft = Math.max(0, th.offsetLeft - larghezzaNomi - spazio / 2);
}
$('#vai-oggi').addEventListener('click', mostraOggi);
// Ruoti il telefono o stringi la finestra oltre la soglia: si passa dall'una all'altra vista.
telefono.addEventListener('change', () => { disegna(); mostraOggi(); });

// Si parte: la sezione dove l'avevi lasciata (di solito la settimana), colonna di oggi in vista,
// eventuale avviso sui dati illeggibili.
mostraSezione(sezione);
mostraOggi();
if (avvisoIniziale) mostraStato(avvisoIniziale, true, 9000);

/* ───────── App installabile (PWA) ─────────
   Il service worker funziona solo su https (o in locale): aperta come file, la pagina resta quella di sempre. */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* senza, la pagina funziona lo stesso, solo non offline */ });
}
// Chiedo al browser di non cancellare i dati quando lo spazio scarseggia. Può dire di no: le copie restano importanti.
navigator.storage?.persist?.().catch(() => {});
