// Regole sui file dei test stessi, controllate senza aprire il browser.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('./aiuti');   // non da '@playwright/test': vedi `test` in aiuti.js

test('ogni file di test prende `test` da aiuti.js, che chiude i contesti alla fine di ogni test', () => {
  const cartella = __dirname;
  const diretti = fs.readdirSync(cartella)
    .filter((f) => f.endsWith('.spec.js'))
    .filter((f) => /require\(['"]@playwright\/test['"]\)/.test(fs.readFileSync(path.join(cartella, f), 'utf8')));
  expect(diretti).toEqual([]);
});
