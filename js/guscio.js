// js/guscio.js — il punto di partenza: carica gli altri moduli, il menu, l’avvio, l’app installabile.
import {
  $, avvisoIniziale, db, disegna, disegnaAnche, esito, menu, mostraStato, rigaIntestazione, state, telefono
} from './base.js';
import { disegnaSettimana } from './settimana.js';
import { aggiornaPromemoria } from './promemoria.js';
import { aggiornaLibreria } from './libreria.js';
import './azioni.js';   // i gestori delle azioni sulla settimana: non esporta niente, basta caricarlo
import { aggiornaSync } from './file.js';
import { disegnaCasa, mostraSezione, sezione } from './casa.js';

/* ───────── Il disegno ─────────
   Le parti della pagina, nell'ordine in cui si ridisegnano (vedi disegnaAnche in base.js). Una sezione nuova
   si aggiunge qui. */
disegnaAnche(disegnaSettimana, aggiornaPromemoria, aggiornaLibreria, aggiornaSync, disegnaCasa);

/* ───────── Il menu ─────────
   Un <dialog> aperto con showModal(): sta sopra alla pagina, che intanto non risponde ai tocchi.
   Si chiude con la ×, con Esc o con un tocco fuori (sullo sfondo). Dentro: tema, colore delle faccende,
   libreria, versione. */
$('#apri-menu').addEventListener('click', () => {
  aggiornaLibreria();
  disegnaScelteMenu();
  mostraVersione();
  menu.showModal();
});

/* ───────── Tema: Automatico (segue il sistema), Chiaro, Scuro ─────────
   Vale per questo dispositivo (localStorage, settimana:tema): si può volere il telefono scuro e il computer chiaro.
   Lo applica <html data-tema>, che stile.css trasforma in color-scheme. Uno script in testa a index.html lo
   applica già prima che la pagina si disegni, per non farla lampeggiare. */
const CHIAVE_TEMA = 'settimana:tema';
const TEMI = [['auto', 'Automatico'], ['chiaro', 'Chiaro'], ['scuro', 'Scuro']];
const COLORE_BARRA = { chiaro: '#f8f3e9', scuro: '#141c19' };   // la barra di sistema del telefono, come lo sfondo

function leggiTema() {
  try {
    const t = localStorage.getItem(CHIAVE_TEMA);
    return t === 'chiaro' || t === 'scuro' ? t : 'auto';
  } catch { return 'auto'; }
}

function applicaTema(tema) {
  if (tema === 'auto') delete document.documentElement.dataset.tema;
  else document.documentElement.dataset.tema = tema;
  // le due righe theme-color di index.html (una per il sistema chiaro, una per lo scuro): con una scelta a mano,
  // tutte e due dicono lo stesso colore
  const [chiaro, scuro] = document.querySelectorAll('meta[name="theme-color"]');
  chiaro?.setAttribute('content', COLORE_BARRA[tema === 'scuro' ? 'scuro' : 'chiaro']);
  scuro?.setAttribute('content', COLORE_BARRA[tema === 'chiaro' ? 'chiaro' : 'scuro']);
}

/* ───────── Colore delle faccende: Nessuno, Morbido, Deciso ─────────
   Vale su tutti i dispositivi: sta nel registro (i/intensita), e passa con il file di sincronizzazione. */
const SCELTE_INTENSITA = [
  ['nessuna', 'Nessuno', 'Solo il testo.'],
  ['morbida', 'Morbido', 'Toni sabbia, leggeri.'],
  ['decisa', 'Deciso', 'Dal giallo all’arancio.'],
];

function disegnaScelteMenu() {
  const tema = leggiTema();
  $('#scelte-tema').replaceChildren(...TEMI.map(([valore, nome]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'scelta';
    b.dataset.tema = valore;
    b.textContent = nome;
    b.setAttribute('aria-pressed', String(tema === valore));
    return b;
  }));

  $('#scelte-intensita').replaceChildren(...SCELTE_INTENSITA.map(([valore, nome, descrizione]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'opzione';
    b.dataset.intensita = valore;
    b.setAttribute('aria-pressed', String(state.intensita === valore));
    const radio = document.createElement('span');
    radio.className = 'radio';
    radio.setAttribute('aria-hidden', 'true');
    const testi = document.createElement('span');
    const t = document.createElement('strong');
    t.textContent = nome;
    const d = document.createElement('small');
    d.textContent = descrizione;
    testi.append(t, d);
    // tre campioni: appena oltre la cadenza, a metà, al massimo. Sono piccole schede con il loro data-calore,
    // dentro un contenitore con la sua data-intensita: lo stesso CSS delle schede vere
    const campioni = document.createElement('span');
    campioni.className = 'campioni';
    campioni.dataset.intensitaCampione = valore;
    campioni.setAttribute('aria-hidden', 'true');
    for (const calore of [0.05, 0.5, 1]) {
      const c = document.createElement('span');
      c.className = 'campione';
      if (valore !== 'nessuna') { c.dataset.calore = ''; c.style.setProperty('--calore', String(calore)); }
      campioni.append(c);
    }
    b.append(radio, testi, campioni);
    return b;
  }));
}

$('#scelte-tema').addEventListener('click', (e) => {
  const b = e.target.closest('.scelta');
  if (!b) return;
  try { localStorage.setItem(CHIAVE_TEMA, b.dataset.tema); } catch { /* pazienza: vale fino alla chiusura */ }
  applicaTema(b.dataset.tema);
  disegnaScelteMenu();
  $(`#scelte-tema [data-tema="${b.dataset.tema}"]`).focus();
});

$('#scelte-intensita').addEventListener('click', (e) => {
  const b = e.target.closest('.opzione');
  if (!b) return;
  if (esito(db.intensita(b.dataset.intensita))) {
    disegnaScelteMenu();
    $(`#scelte-intensita [data-intensita="${b.dataset.intensita}"]`).focus();
  }
});

applicaTema(leggiTema());

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
