# CLAUDE.md

Istruzioni per Claude (Claude Code o altri agenti) che lavorano su questo repository.
La documentazione completa del progetto è `README.md` (architettura, dati, unione, test); `LEGGIMI.md` spiega
pubblicazione, installazione e la prova a mano su iPhone. Qui c'è solo ciò che serve per lavorare senza sbagliare.

## Il progetto

«La mia settimana»: tabella settimanale delle attività e faccende di casa, installabile come app (PWA), pensata
per persone neurodivergenti. Pubblicata su GitHub Pages e usata ogni giorno su un telefono Android: un errore su
`main` arriva in produzione.

- JavaScript puro, **nessun passaggio di build**, nessuna dipendenza a runtime, **moduli ES** ovunque: nella pagina
  e in Node (`package.json` ha `"type": "module"`). Le dipendenze di sviluppo servono solo ai test.
- La pagina si apre solo da un server (`npm start` o GitHub Pages): i moduli non funzionano con il doppio clic.
- `core.js` è il nucleo: registro dei dati, regola di unione, faccende. **Niente DOM**: gira anche in Node.
- `js/*.js` è il comportamento della pagina, un modulo per argomento (README §2). `index.html` carica solo
  `js/guscio.js`, il punto di partenza; gli altri arrivano con gli `import`.

## Regole dei moduli

- **Le dipendenze vanno in un verso solo**, per livelli (README §4, controllati da `test/struttura.test.js`):
  `core.js` 0 · `base.js` 1 · `testi.js` e `pezzi.js` 2 · `settimana.js` 3 · `promemoria.js` e `libreria.js` 4 ·
  `azioni.js`, `file.js`, `casa.js` 5 · `guscio.js` 6. Un file importa solo livelli più bassi: niente giri,
  nessuno importa `guscio.js`, `base.js` non importa nessun file della pagina.
- **Dove va cosa.** Parole e date (come si scrive un giorno, «Fatta il…», «giro aperto dal…») in `testi.js`;
  pezzi di interfaccia usati da più sezioni in `pezzi.js`; «oggi» e ciò che ne deriva (`lunediCorrente`,
  `riposoOggi`) in `base.js`. Una sezione non prende niente da un'altra sezione: se serve a due, scende di livello.
- **Il disegno è un elenco.** Chi cambia qualcosa chiama `disegna()` di `base.js`; le parti da disegnare le mette
  in elenco `guscio.js` con `disegnaAnche(...)`. Una sezione nuova esporta la sua funzione di disegno e si aggiunge
  a quell'elenco, senza toccare gli altri file.
- **Un valore che cambia lo cambia solo il suo file**, con una funzione: `rileggi()` e `cambiaOggi()` in `base.js`,
  `mostraSettimana()` e `scegliGiorno()` in `settimana.js`. Gli altri leggono il valore importato (è un collegamento,
  vede sempre il valore attuale), ma non lo assegnano: un `import` non si può riassegnare.
- **Un file di codice nuovo** va aggiunto alla *import map* di `index.html` (con `?v=N`), all'elenco `FILE` di
  `sw.js` e a `LIVELLI` in `test/struttura.test.js`. `pwa.spec.js` e `struttura.test.js` controllano che ci sia.
- Si esporta solo ciò che un altro file usa davvero.
- Un nome usato **senza importarlo** il browser lo scopre solo quando quel codice gira: lo trova prima
  `npm run lint` (ESLint, regola `no-undef`), che legge il codice senza eseguirlo. Anche gli import inutili.
- ESLint ha poche regole, solo errori veri, niente stile (`eslint.config.js`). Non aggiungerne senza parlarne.
- Codice, nomi, commenti, testi dell'interfaccia e messaggi dei test sono **in italiano**.

## Comandi

```sh
npm install                       # una volta
npx playwright install            # una volta: Chromium, Firefox, WebKit
npm start                         # server locale: http://localhost:8765/
npm run lint                      # ESLint: nomi non importati, import inutili (2 secondi)
npm test                          # test del nucleo (Node, pochi secondi)
npm run test:browser              # test nel browser: chromium, firefox, webkit, iphone
npx playwright test --project=webkit test-browser/casa.spec.js   # un motore, un file
```

Il proprietario lavora su Windows (PowerShell, VS Code). I file di testo sono LF (`.gitattributes`).

## Come si lavora qui

- **Commit e push li fa il proprietario, non Claude.** Si lavora direttamente su `main`. Claude modifica i file,
  lancia i test e lascia le modifiche non committate, con un riassunto di cosa ha cambiato e perché.
- Prima di dire che qualcosa è fatto: `npm run lint`, `npm test` e `npm run test:browser`, **tutti i progetti**, verdi.
  Se un motore non si può lanciare, dirlo esplicitamente.
- Una modifica al comportamento porta con sé il suo test. Un test nuovo deve **saper fallire**: romperlo apposta
  (invertire una condizione, togliere una riga) e controllare che fallisca, poi rimettere com'era (README §11).
- Se cambia il comportamento o la struttura, aggiornare anche `README.md` (e `LEGGIMI.md` se tocca l'uso).
- `file-claude/` è una cartella locale di lavoro (zip, bozze): è ignorata da git, non va toccata né committata.
- **Questo file si tiene allineato.** Quando nella conversazione si decide una regola, una convenzione o un passo del
  piano, si aggiorna qui nella stessa modifica. I file in `.github/` Claude non li può scrivere: si indicano al
  proprietario le righe da cambiare a mano.
- **Niente debiti trascinati.** Prima di aggiungere funzioni si sistema la struttura che le dovrà accogliere:
  il progetto deve essere pronto a ricevere un modulo nuovo senza dover cambiare altro in giro.

## Regole che un test controlla (e che si rompono facilmente)

- **Versione della cache.** A ogni modifica di un file dell'app (`index.html`, `stile.css`, `core.js`, `js/*.js`,
  `manifest.webmanifest`, icone) si alza di uno `VERSIONE` in `sw.js` (`'settimana-N'`) **e** tutti i `?v=N` in
  `index.html`: stile, script di partenza e ogni riga della import map. Devono coincidere: un test lo verifica.
  Senza, il telefono continua a usare la copia vecchia.
- **Il registro non cancella mai.** Chiavi piatte con ultimo-scritto-vince (`v/<id>/nome`, `v/<id>/cad`,
  `s/<lunedì>/m/<id>`, `s/<lunedì>/a/<id>/f/<giorno>`, `e/<giorno>`, `r/<giorno>`, `i/intensita`…). Togliere
  significa scrivere `false`, non eliminare la chiave: altrimenti il file vecchio dell'altro dispositivo la
  rimette. Le tre garanzie dell'unione (ordine indifferente, ripetibile, un file vecchio non toglie niente) sono
  coperte dai test di proprietà in `test/core.test.js`: non indebolirli.
- **Campi di testo almeno a 16px** (1rem): sotto, Safari su iPhone ingrandisce la pagina al tocco.
- **Accessibilità WCAG 2.1 A e AA**, contrasto compreso, in chiaro e in scuro: `accessibilita.spec.js` con axe.

## Principi dell'interfaccia (non negoziabili senza parlarne)

- Niente rosso, niente punteggi, niente parole di colpa o di urgenza («in ritardo», «scaduta», «devi», «tocca»…):
  `colore.spec.js` cerca le parole vietate.
- Linguaggio di calendario, neutro, con date esplicite: «Fatta il 23 settembre», «prossimo giro: venerdì 30
  ottobre», «giro aperto dall'8 ottobre», «Mai segnata».
- La prova: *se la ignoro per tre settimane, cosa mi dice l'app quando la riapro?* Deve informare, non rimproverare.
- Quanto è vecchio un dato si mostra, non si nasconde.
- Prima di cambiare parole dell'interfaccia, proporre le alternative al proprietario: le scelte di lessico sono sue.

## Test nel browser: le lezioni già pagate

- **Si aspetta un segnale preciso, mai un tempo fisso** (`waitForTimeout` no). Esempio in `conferma()` di
  `aiuti.js`: si aspetta l'evento `close` della finestra.
- Un test che fallisce ogni tanto va **capito**, non rilanciato. Niente `retries` nella configurazione.
- Orologio fermo: `apri()` installa `page.clock` a **mercoledì 14 ottobre 2026** (`MERCOLEDI`). Per due
  "dispositivi" con orari diversi si passa un'ora di partenza diversa ad `apri()`, non `clock.fastForward`.
- Telefono: usare `telefono()` di `aiuti.js` per le opzioni del contesto (Firefox non supporta `isMobile`;
  il progetto `iphone` usa il profilo di iPhone 15). Il progetto `iphone` esegue solo `telefono|ios` spec.
- **`test` ed `expect` si prendono da `./aiuti.js`, mai da `'@playwright/test'`**: il `test` di `aiuti.js` chiude alla
  fine di ogni test i contesti creati con `browser.newContext()`, che Playwright lascerebbe aperti (in WebKit, in CI,
  rallentavano ogni test più del precedente). `regole.spec.js` lo controlla.
- Un test lento non si cura con `test.slow()` o timeout più lunghi prima di aver capito dove va il tempo.
- In CI, un test fallito lascia la traccia nel rapporto (`trace: 'retain-on-failure'`): si apre trascinando
  `trace.zip` su trace.playwright.dev.

## CI

`.github/workflows/test.yml`: a ogni push, nucleo e browser nei tre motori su Ubuntu. L'installazione dei browser
ha tentativi ripetuti e cache, perché i mirror apt a volte si bloccano. GitHub Pages ha un suo workflow separato.
Limiti: 45 minuti il job, 30 lo step dei test nel browser (ottobre 2026: circa 6 minuti in tutto, WebKit il più
lento). Quando arrivano i moduli della Fase 2: un job per motore (in parallelo) e il test di accessibilità diviso
per sezione, perché oggi visita tutte le viste in un solo test e con altre sezioni supererebbe i 30 secondi.

## Piano in corso

Fase 1 chiusa (tre motori più iphone, axe, CI verde). Fase 2: Impostazioni e navigazione, poi Alimenti e Scorte
(prodotti condivisi, quantità come eventi di movimento), Spese, Cucina, colori. Prima, la **Fase 2.0**: togliere i
debiti di struttura, poi il documento funzionale della Fase 2.

Debiti da togliere nella 2.0, in quest'ordine, uno per volta (test verdi e push tra l'uno e l'altro):
1. ~~Un solo ambito globale condiviso dagli script classici.~~ Fatto: moduli ES, dipendenze in un verso solo,
   import map versionata (`settimana-15`).
2. ~~`js/settimana.js` fa tre mestieri.~~ Fatto: `testi.js`, `pezzi.js`, `promemoria.js`, livelli controllati da
   `test/struttura.test.js` (`settimana-16`). Resta da sistemare nel 3: Casa importa `promemoria.js` solo per
   `dimenticaSalti()` al cambio di sezione; con il registro delle sezioni diventa un avviso «sezione cambiata».
3. La navigazione tra sezioni sta in `js/casa.js`: diventa un registro di sezioni in un file proprio.
4. Costruzione del DOM prolissa (`createElement` ripetuti): un piccolo aiuto comune.

## Comunicazione con il proprietario

- In italiano, diretto, senza attenuazioni. Le ipotesi si presentano come ipotesi; l'incertezza si dichiara.
- Quando ci sono più strade, dire quale si consiglia e perché, e la ragione più forte per l'altra.
- Gli errori si dichiarano in modo esplicito e si correggono.
