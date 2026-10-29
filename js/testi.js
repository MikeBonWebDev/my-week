// js/testi.js — le parole e le date: come l'app scrive i giorni, le date e i tempi delle faccende.
// Nessun elemento della pagina: solo testo. Lo usano tutte le sezioni, così le stesse cose si dicono ovunque
// con le stesse parole (e una correzione vale dappertutto).
import * as Core from '../core.js';
import { aggiungiGiorni, dataDaChiave, oggiK } from './base.js';

/* ───────── Formati delle date ───────── */
export const fmtNumerica = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
export const fmtBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' });
export const fmtLungo = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
export const fmt = (opzioni) => new Intl.DateTimeFormat('it-IT', opzioni);

// Il titolo della settimana: "12 – 18 ottobre 2026", oppure con mese o anno ripetuti se la settimana li scavalca.
export function etichettaPeriodo(lun) {
  const dom = aggiungiGiorni(lun, 6);
  const lungo = { day: 'numeric', month: 'long' };
  if (lun.getFullYear() !== dom.getFullYear()) {
    const conAnno = { ...lungo, year: 'numeric' };
    return `${fmt(conAnno).format(lun)} – ${fmt(conAnno).format(dom)}`;
  }
  if (lun.getMonth() !== dom.getMonth()) {
    return `${fmt(lungo).format(lun)} – ${fmt(lungo).format(dom)} ${dom.getFullYear()}`;
  }
  return `${lun.getDate()} – ${fmt(lungo).format(dom)} ${dom.getFullYear()}`;
}

/* ───────── Le faccende ───────── */
const fmtGiorno = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
export const ogniGiorni = (n) => (n === 1 ? 'Ogni giorno' : `Ogni ${n} giorni`);

// "oggi", "ieri", "16 giorni fa"
export function daQuando(k) {
  const giorni = Core.giorniTra(k, oggiK);
  return giorni <= 0 ? 'oggi' : giorni === 1 ? 'ieri' : `${giorni} giorni fa`;
}
// "oggi", "ieri", "giovedì 22 ottobre": quando hai saltato il giro
export const quandoSalto = (k) => (Core.giorniTra(k, oggiK) <= 1 ? daQuando(k) : fmtGiorno.format(dataDaChiave(k)));

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
export function testoFatta(f) {
  if (!f.ultima) return 'Mai segnata';
  const giorni = Core.giorniTra(f.ultima, oggiK);
  if (giorni <= 0) return 'Fatta oggi';
  if (giorni === 1) return 'Fatta ieri';
  return `Fatta ${elide(f.ultima) ? 'l’' : 'il '}${giornoMese(f.ultima)}`;
}

// "prossimo giro: domani", "prossimo giro: venerdì 30 ottobre", "giro aperto dal 7 ottobre", "" se mai segnata
export function testoGiro(f) {
  if (!f.scade) return '';
  const giorni = Core.giorniTra(oggiK, f.scade);   // positivo: il giro deve ancora arrivare
  if (giorni === 0) return 'prossimo giro: oggi';
  if (giorni === 1) return 'prossimo giro: domani';
  if (giorni > 1) return `prossimo giro: ${fmtGiorno.format(dataDaChiave(f.scade))}`;
  if (giorni === -1) return 'giro aperto da ieri';
  return `giro aperto ${elide(f.scade) ? 'dall’' : 'dal '}${giornoMese(f.scade)}`;
}
export const conMaiuscola = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// "Fatta il 6 ottobre · ogni 14 giorni · giro aperto dal 20 ottobre", "Mai segnata · ogni 30 giorni",
// "Fatta il 21 settembre · giro saltato ieri · ogni 7 giorni · prossimo giro: mercoledì 28 ottobre"
export function testoCadenza(f) {
  return [testoFatta(f), f.salto ? `giro saltato ${quandoSalto(f.salto)}` : '', ogniGiorni(f.cadenza).toLowerCase(), testoGiro(f)]
    .filter(Boolean).join(' · ');
}

