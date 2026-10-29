// La struttura del codice della pagina: chi può importare chi. Non apre il browser: legge gli import dei file.
// Le dipendenze vanno in un verso solo (README §4). Ogni file ha un livello, e può importare solo file di
// livello più basso: così non nascono giri (A importa B che importa A) e un pezzo comune non finisce per
// dipendere da una sezione. Un file nuovo in js/ va messo qui, al suo livello: il primo test lo chiede.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const RADICE = path.resolve(import.meta.dirname, '..');

const LIVELLI = {
  'core.js': 0,              // il nucleo: nessun browser
  'js/base.js': 1,           // elementi, date e oggi, dati, salvare, esito, conferma, disegna
  'js/testi.js': 2,          // parole e date: per tutte le sezioni
  'js/pezzi.js': 2,          // pezzi di interfaccia comuni
  'js/settimana.js': 3,      // la settimana e il suo disegno
  'js/promemoria.js': 4,     // parti della sezione Settimana costruite sopra la settimana
  'js/libreria.js': 4,
  'js/azioni.js': 5,         // le sezioni e le loro azioni
  'js/file.js': 5,
  'js/casa.js': 5,
  'js/guscio.js': 6,         // il punto di partenza: può importare tutto, nessuno importa lui
};

// I file importati da un file, come percorsi dalla radice ('js/base.js', 'core.js')
function importati(file) {
  const testo = fs.readFileSync(path.join(RADICE, file), 'utf8');
  return [...testo.matchAll(/^import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/gm)]
    .map((m) => path.relative(RADICE, path.resolve(path.dirname(path.join(RADICE, file)), m[1])).replaceAll('\\', '/'));
}

test('ogni file di codice ha un livello', () => {
  const codice = ['core.js', ...fs.readdirSync(path.join(RADICE, 'js')).filter((f) => f.endsWith('.js')).map((f) => `js/${f}`)];
  assert.deepEqual(codice.filter((f) => !(f in LIVELLI)), [], 'file senza livello: aggiungili a LIVELLI, qui');
});

test('ogni import va verso un livello più basso', () => {
  const sbagliati = [];
  for (const [file, livello] of Object.entries(LIVELLI)) {
    for (const dipendenza of importati(file)) {
      if (!(dipendenza in LIVELLI)) sbagliati.push(`${file} importa ${dipendenza}, che non ha un livello`);
      else if (LIVELLI[dipendenza] >= livello) sbagliati.push(`${file} (livello ${livello}) importa ${dipendenza} (livello ${LIVELLI[dipendenza]})`);
    }
  }
  assert.deepEqual(sbagliati, []);
});

test('Casa non dipende dalla settimana: prende parole e pezzi comuni da testi.js e pezzi.js', () => {
  assert.ok(!importati('js/casa.js').includes('js/settimana.js'));
});
