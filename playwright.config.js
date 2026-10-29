// Configurazione dei test nel browser (Playwright).  Si lanciano con:  npm run test:browser
// Playwright avvia da solo il server statico (strumenti/server.js) e lo spegne alla fine.
import { defineConfig, devices } from '@playwright/test';

const PORTA = 8765;
// Su GitHub (CI) i test girano su una macchina pulita: niente server già acceso da riusare, due test alla volta
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './test-browser',
  // i test di uno stesso file girano in ordine; file diversi in parallelo
  fullyParallel: false,
  // in CI un test.only dimenticato fa fallire tutto, invece di saltare in silenzio gli altri test
  forbidOnly: CI,
  workers: CI ? 2 : undefined,
  reporter: CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORTA}/`,
    acceptDownloads: true,
    // Il service worker metterebbe in cache le pagine tra un test e l'altro: lo blocco,
    // tranne nei test della PWA, che lo riattivano (vedi pwa.spec.js).
    serviceWorkers: 'block',
    locale: 'it-IT',
    // in CI, per un test fallito, la registrazione passo per passo (schermate, DOM, rete) finisce nel rapporto:
    // si apre da «Artifacts › rapporto-playwright» e dice cosa stava facendo la pagina quando si è fermata
    trace: CI ? 'retain-on-failure' : 'off',
  },
  // Tre motori: Chromium (Chrome, Edge, Android), Firefox, WebKit (il motore di Safari, anche su iPhone).
  // In più «iphone»: WebKit con il profilo di un iPhone 15 (schermo, densità, tocco, Safari mobile), solo per i test
  // del telefono e delle regole di iOS. Non è iOS: è il motore di Safari che si comporta da telefono.
  // Uno solo:  npx playwright test --project=firefox
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'iphone', testMatch: /(telefono|ios)\.spec\.js$/, use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: `node strumenti/server.js ${PORTA}`,
    url: `http://localhost:${PORTA}/`,
    reuseExistingServer: !CI,
  },
});
