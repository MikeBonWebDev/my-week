// ESLint: legge il codice senza eseguirlo e segnala gli errori che i test troverebbero solo facendolo girare.
// Si lancia con  npm run lint  (anche nella CI, prima dei test).
import globals from 'globals';

export default [
  { ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'file-claude/'] },
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    rules: {
      'no-undef': 'error',          // un nome usato senza dichiararlo né importarlo
      'no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', ignoreRestSiblings: true }],   // import o variabili inutili
      'no-redeclare': 'error',      // lo stesso nome dichiarato due volte
      'no-dupe-keys': 'error',      // la stessa chiave due volte in un oggetto
      'no-unreachable': 'error',    // codice dopo un return
    },
  },
  // La pagina (e il nucleo, che gira anche lì): i nomi del browser (document, localStorage…)
  { files: ['core.js', 'js/**/*.js'], languageOptions: { globals: globals.browser } },
  // Il service worker: è uno script classico, con i suoi nomi (self, caches, clients…)
  { files: ['sw.js'], languageOptions: { sourceType: 'script', globals: globals.serviceworker } },
  // Node: test, strumenti, configurazioni. I test nel browser hanno anche codice che gira nella pagina (evaluate)
  { files: ['test/**/*.js', 'strumenti/**/*.js', '*.config.js'], languageOptions: { globals: globals.node } },
  { files: ['test-browser/**/*.js'], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];