// La struttura del codice della pagina: chi può importare chi. Non apre il browser: legge gli import dei file.
// Le dipendenze vanno in un verso solo (README §4). Ogni file ha un livello, e può importare solo file di
// livello più basso: così non nascono giri (A importa B che importa A) e un pezzo comune non finisce per
// dipendere da una sezione. Un file nuovo in js/ va messo qui, al suo livello e nel suo gruppo: il primo test lo chiede.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RADICE = path.resolve(import.meta.dirname, '..');

// livello e gruppo di ogni file. «comune» = serve a tutte le sezioni; gli altri gruppi sono le sezioni dell'app
// (più il menu). Una sezione può usare i file comuni e i suoi, mai quelli di un'altra sezione.
const FILE = {
  'core.js': [0, 'comune'],            // il nucleo: nessun browser
  'js/base.js': [1, 'comune'],         // elementi, date e oggi, dati e loro letture, salvare, esito, conferma, disegna
  'js/testi.js': [2, 'comune'],        // parole e date
  'js/pezzi.js': [2, 'comune'],        // pezzi di interfaccia
  'js/sezioni.js': [2, 'comune'],      // il registro delle sezioni e la navigazione
  'js/promemoria.js': [3, 'settimana'],
  'js/settimana.js': [4, 'settimana'],
  'js/azioni.js': [5, 'settimana'],
  'js/libreria.js': [5, 'menu'],
  'js/casa.js': [5, 'casa'],
  'js/file.js': [5, 'dati'],
  'js/guscio.js': [6, 'avvio'],        // il punto di partenza: può importare tutto, nessuno importa lui
};
const livello = (f) => FILE[f][0];
const gruppo = (f) => FILE[f][1];

const leggi = (file) => fs.readFileSync(path.join(RADICE, file), 'utf8');
const daRadice = (file, relativo) => path.relative(RADICE, path.resolve(path.dirname(path.join(RADICE, file)), relativo))
  .replaceAll('\\', '/');

// Gli import di un file: [{ da: 'js/base.js', nomi: ['$', 'db'] }] (nomi vuoto per import * as e import './x.js')
function importati(file) {
  return [...leggi(file).matchAll(/^import\s+(?:\{([^}]*)\}\s+from\s+|[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)]
    .map((m) => ({
      da: daRadice(file, m[2]),
      nomi: (m[1] ?? '').split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean),   // «a as b» → a
    }));
}

// I nomi che un file esporta: export function/const/let/class …, ed export { … } (core.js)
function esportati(file) {
  const testo = leggi(file);
  const nomi = [...testo.matchAll(/^export (?:async )?(?:function|const|let|class) ([\w$]+)/gm)].map((m) => m[1]);
  for (const m of testo.matchAll(/^export \{([^}]*)\}/gm)) nomi.push(...m[1].split(',').map((n) => n.trim()).filter(Boolean));
  return new Set(nomi);
}

test('ogni file di codice ha un livello e un gruppo', () => {
  const codice = ['core.js', ...fs.readdirSync(path.join(RADICE, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
  assert.deepEqual(codice.filter((f) => !(f in FILE)), [], 'file senza livello: aggiungili a FILE, qui');
});

test('ogni import va verso un livello più basso', () => {
  const sbagliati = [];
  for (const file of Object.keys(FILE)) {
    for (const { da } of importati(file)) {
      if (!(da in FILE)) sbagliati.push(`${file} importa ${da}, che non ha un livello`);
      else if (livello(da) >= livello(file)) sbagliati.push(`${file} (livello ${livello(file)}) importa ${da} (livello ${livello(da)})`);
    }
  }
  assert.deepEqual(sbagliati, []);
});

test('una sezione non importa niente da un\'altra sezione: ciò che serve a due sta nei file comuni', () => {
  const sbagliati = [];
  for (const file of Object.keys(FILE)) {
    if (gruppo(file) === 'avvio') continue;
    for (const { da } of importati(file)) {
      if (gruppo(da) !== 'comune' && gruppo(da) !== gruppo(file)) sbagliati.push(`${file} (${gruppo(file)}) importa ${da} (${gruppo(da)})`);
    }
  }
  assert.deepEqual(sbagliati, []);
});

test('ogni nome importato esiste davvero nel file da cui lo si prende', () => {
  // il browser lo scoprirebbe all'avvio (e l'app non partirebbe); qui si vede subito quale nome e dove
  const mancanti = [];
  for (const file of Object.keys(FILE)) {
    for (const { da, nomi } of importati(file)) {
      const ci = esportati(da);
      for (const n of nomi) if (!ci.has(n)) mancanti.push(`${file}: «${n}» non è esportato da ${da}`);
    }
  }
  assert.deepEqual(mancanti, []);
});
