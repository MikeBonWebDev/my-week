# CLAUDE.md

Istruzioni per Claude (Claude Code o altri agenti) che lavorano su questo repository.
La documentazione completa del progetto è `README.md` (architettura, dati, unione, test); `LEGGIMI.md` spiega
pubblicazione, installazione e la prova a mano su iPhone. Qui c'è solo ciò che serve per lavorare senza sbagliare.

## Il progetto

«La mia settimana»: tabella settimanale delle attività e faccende di casa, installabile come app (PWA), pensata
per persone neurodivergenti. Pubblicata su GitHub Pages e usata ogni giorno su un telefono Android: un errore su
`main` arriva in produzione.

- JavaScript puro, **nessun passaggio di build**, nessuna dipendenza a runtime, script classici (niente moduli ES).
  Le dipendenze di sviluppo servono solo ai test.
- `core.js` è il nucleo: registro dei dati, regola di unione, faccende. **Niente DOM**: gira anche in Node.
- `js/*.js` è il comportamento della pagina, diviso per argomento (vedi README §2).
- Codice, nomi, commenti, testi dell'interfaccia e messaggi dei test sono **in italiano**.

## Comandi

```sh
npm install                       # una volta
npx playwright install            # una volta: Chromium, Firefox, WebKit
npm start                         # server locale: http://localhost:8765/
npm test                          # test del nucleo (Node, pochi secondi)
npm run test:browser              # test nel browser: chromium, firefox, webkit, iphone
npx playwright test --project=webkit test-browser/casa.spec.js   # un motore, un file
```

Il proprietario lavora su Windows (PowerShell, VS Code). I file di testo sono LF (`.gitattributes`).

## Come si lavora qui

- **Commit e push li fa il proprietario, non Claude.** Si lavora direttamente su `main`. Claude modifica i file,
  lancia i test e lascia le modifiche non committate, con un riassunto di cosa ha cambiato e perché.
- Prima di dire che qualcosa è fatto: `npm test` e `npm run test:browser`, **tutti i progetti**, verdi.
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
  `index.html`. Devono coincidere: un test lo verifica. Senza, il telefono continua a usare la copia vecchia.
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
- **`test` ed `expect` si prendono da `./aiuti`, mai da `'@playwright/test'`**: il `test` di `aiuti.js` chiude alla
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
1. Un solo ambito globale condiviso dagli script classici: dipendenze implicite nell'ordine dei `<script>`, nomi
   che possono scontrarsi. In discussione il passaggio ai moduli ES.
2. `js/settimana.js` fa tre mestieri: parole e date (da spostare in un file proprio, le usano anche altre sezioni),
   promemoria (file proprio), disegno della settimana.
3. La navigazione tra sezioni sta in `js/casa.js`: diventa un registro di sezioni in un file proprio.
4. Costruzione del DOM prolissa (`createElement` ripetuti): un piccolo aiuto comune.

## Comunicazione con il proprietario

- In italiano, diretto, senza attenuazioni. Le ipotesi si presentano come ipotesi; l'incertezza si dichiara.
- Quando ci sono più strade, dire quale si consiglia e perché, e la ragione più forte per l'altra.
- Gli errori si dichiarano in modo esplicito e si correggono.
