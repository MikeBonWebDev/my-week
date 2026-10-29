// Regole sui file dei test stessi, controllate senza aprire il browser.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from './aiuti.js';   // non da '@playwright/test': vedi `test` in aiuti.js

test('ogni file di test prende `test` da aiuti.js, che chiude i contesti alla fine di ogni test', () => {
  const cartella = import.meta.dirname;
  const diretti = fs.readdirSync(cartella)
    .filter((f) => f.endsWith('.spec.js'))
    .filter((f) => /from ['"]@playwright\/test['"]/.test(fs.readFileSync(path.join(cartella, f), 'utf8')));
  expect(diretti).toEqual([]);
});
