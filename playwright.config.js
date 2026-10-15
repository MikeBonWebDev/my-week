// Configurazione dei test nel browser (Playwright).  Si lanciano con:  npm run test:browser
// Playwright avvia da solo il server statico (strumenti/server.js) e lo spegne alla fine.
'use strict';
const { defineConfig, devices } = require('@playwright/test');

const PORTA = 8765;

module.exports = defineConfig({
  testDir: './test-browser',
  // i test di uno stesso file girano in ordine; file diversi in parallelo
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}/`,
    acceptDownloads: true,
    // Il service worker metterebbe in cache le pagine tra un test e l'altro: lo blocco,
    // tranne nei test della PWA, che lo riattivano (vedi pwa.spec.js).
    serviceWorkers: 'block',
    locale: 'it-IT',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node strumenti/server.js ${PORTA}`,
    url: `http://localhost:${PORTA}/`,
    reuseExistingServer: true,
  },
});
