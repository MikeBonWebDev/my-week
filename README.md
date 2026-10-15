# La mia settimana — come funziona

Questo documento spiega **come è fatta l’applicazione e perché**. È pensato per studiarla: si può leggere dall’inizio
alla fine, oppure usare come mappa mentre si legge il codice.
Per pubblicarla, installarla e usarla c’è [LEGGIMI.md](LEGGIMI.md).

## Indice

1. [Cosa fa, in breve](#1-cosa-fa-in-breve)
2. [I file](#2-i-file)
3. [Provarla sul tuo computer](#3-provarla-sul-tuo-computer)
4. [L’architettura in un disegno](#4-larchitettura-in-un-disegno)
5. [Il viaggio di una spunta](#5-il-viaggio-di-una-spunta)
6. [I dati: registro e vista](#6-i-dati-registro-e-vista)
7. [L’unione tra dispositivi](#7-lunione-tra-dispositivi)
8. [La pagina: index.html](#8-la-pagina-indexhtml)
9. [Libreria, suggerimenti, «Riprendi»](#9-libreria-suggerimenti-riprendi)
10. [L’app installabile: manifest e service worker](#10-lapp-installabile-manifest-e-service-worker)
11. [I test](#11-i-test)
12. [Limiti e scelte consapevoli](#12-limiti-e-scelte-consapevoli)
13. [Da C# a JavaScript: un piccolo dizionario](#13-da-c-a-javascript-un-piccolo-dizionario)
14. [Un percorso per studiarla](#14-un-percorso-per-studiarla)

---

## 1. Cosa fa, in breve

Una tabella settimanale: in riga le attività, in colonna i giorni. Per ogni attività e giorno una casella
"fatto". In fondo due righe di servizio: l’**energia** del giorno (pesa · ok · leggero) e il **giorno di riposo**.
Sul telefono la stessa settimana si mostra **un giorno alla volta**, con i sette giorni in una striscia in alto.

- Ogni settimana ha **la sua lista** di attività, indipendente dalle altre.
- Le attività vengono da una **libreria di voci** ("Sviluppo", "Camminare"…); ogni attività, in ogni settimana,
  ha un **dettaglio** facoltativo ("Programma A").
- Esporta **CSV** per l’analisi.
- Si installa come **app** (PWA) e funziona **senza rete**.
- **Non ha server.** I dati stanno nella memoria del browser di ogni dispositivo; per allinearli si usa un
  **file di sincronizzazione** che porti tu (per esempio via Google Drive).

Tecnologie: HTML, CSS e JavaScript "puri", senza framework né librerie. Nessuna fase di build: i file che leggi
sono quelli che il browser esegue.

## 2. I file

```
settimana-pwa/
├── index.html            la pagina: struttura (HTML), aspetto (CSS), comportamento (JavaScript)
├── core.js               il nucleo: dati, regola di unione, operazioni. Nessun browser: gira anche in Node
├── sw.js                 il service worker: copia dei file per l'uso senza rete
├── manifest.webmanifest  nome, colori e icone dell'app installata
├── icone/                icone per Android, iPhone, scheda del browser
├── test/
│   └── core.test.js      test del nucleo (Node, senza dipendenze)
├── test-browser/         test nel browser vero (Playwright)
│   ├── aiuti.js          azioni comuni: aggiungi, spunta, salva file, unisci…
│   ├── pagina.spec.js    uso quotidiano su computer: primo avvio, suggerimenti, libreria, CSV
│   ├── telefono.spec.js  la vista a un giorno: striscia, energia, schede, menu dal basso
│   ├── sincronizzazione.spec.js   due "dispositivi" che si scambiano il file
│   └── pwa.spec.js       installabilità e funzionamento senza rete
├── strumenti/
│   ├── server.js         server statico minimo per provare l'app in locale
│   └── seme.js           genera dati di prova (cinque settimane di storia)
├── playwright.config.js  configurazione dei test nel browser
├── package.json          comandi (npm test, npm run test:browser, npm start) e dipendenze di sviluppo
├── README.md             questo documento
└── LEGGIMI.md            come pubblicarla, installarla, usarla
```

L’app vera e propria sono i primi cinque elementi. Il resto serve a sviluppare e verificare.

## 3. Provarla sul tuo computer

Serve [Node.js](https://nodejs.org) 22 o successivo (consigliata la LTS più recente).

```sh
npm install                       # una volta: scarica Playwright (serve solo ai test nel browser)
npx playwright install chromium   # una volta: scarica il browser usato dai test
npm start                         # avvia il server: apri http://localhost:8765/
npm test                          # test del nucleo (pochi secondi)
npm run test:browser              # test nel browser (circa 20 secondi)
```

Si può anche aprire `index.html` con un doppio clic: funziona, ma senza service worker, e il browser lo tratta
come un sito diverso da `localhost` (quindi con dati separati).

## 4. L’architettura in un disegno

```
                         ┌──────────────────────────── un dispositivo ────────────────────────────┐
                         │                                                                         │
   tu ── tocchi ──►  index.html  ── db.spunta(…) ──►  core.js  ── registro ──►  localStorage
                     (pagina)   ◄── db.vista() ────  (nucleo)                  (memoria del browser)
                         │                               ▲
                         │  «Salva il file»              │  «Unisci un file»
                         ▼                               │
                  settimana-sync-….json  ── Drive, email… ──►  l'altro dispositivo
                         │
   sw.js (service worker): tiene una copia di index.html, core.js, icone… per aprire l'app senza rete
```

Tre idee reggono tutto:

1. **Separare le regole dalla grafica.** `core.js` non sa niente di pagine, pulsanti o browser: riceve richieste
   ("aggiungi questa voce a questa settimana") e risponde. Per questo si può testare in Node, velocemente e a fondo.
2. **Una sola fonte di verità.** I dati veri sono il *registro* del nucleo. La tabella che vedi è sempre ricostruita
   da lì; la pagina non tiene copie "sue" da tenere allineate.
3. **Nessun server, ma unione sicura.** Ogni dispositivo lavora da solo. Quando si incontrano (tramite il file),
   una regola semplice decide, informazione per informazione, quale versione tenere.

## 5. Il viaggio di una spunta

Seguiamo cosa succede quando segni "Sviluppo" di mercoledì. È il modo migliore per capire come i pezzi si parlano.

**1. Il browser segnala l’evento.** Su computer la casella sta dentro `<tbody id="corpo-tabella">`, su telefono
dentro l’elenco delle schede `<ul id="carte">`. Non c’è un gestore su ogni casella: ce n’è uno solo, `suCambio`,
collegato a entrambi i contenitori (delega degli eventi, vedi §8):

```js
function suCambio(e) {
  const el = e.target;                                   // l'elemento toccato
  if (el.matches('input[type="checkbox"]')) {
    const { id, giorno } = el.dataset;                   // data-id="sviluppo" data-giorno="2"
    esito(db.spunta(visualizzata, id, Number(giorno), el.checked), { ridisegna: telefono.matches });
    return;
  }
  …
}
for (const contenitore of [corpo, carte]) contenitore.addEventListener('change', suCambio);   // (semplificato)
```

**2. Il nucleo registra.** `db.spunta` controlla che la richiesta abbia senso (giorno 0-6, voce presente in quella
settimana) e scrive **una** informazione nel registro:

```js
scrivi(`s/${sett}/a/${id}/f/${giorno}`, fatto);   // "s/2026-10-12/a/sviluppo/f/2" → true
```

`scrivi` aggiunge il momento della modifica e il dispositivo (vedi §7):
`{ v: true, t: 1760436000123, d: "d4f2a91bc" }`.

**3. La pagina salva e ricostruisce la vista.** `esito()` riceve la risposta del nucleo (`{ ok: true }` oppure
`{ ok: false, errore: '…' }`). Se è ok chiama `salva()`, che scrive il registro in `localStorage`, e ricalcola
`state = db.vista()`.

**4. Si ridisegna (se serve).** Sulla tabella, per una spunta non serve: la casella è già spuntata, l’ha fatto il
browser. Sul telefono sì, perché cambiano anche la striscia dei giorni, il colore della scheda e i puntini.
Per aggiungere o togliere un’attività `disegna()` rifà sempre tutto dalla vista.

Ogni altra azione (dettaglio, energia, riposo, aggiungi, togli, rinomina…) fa lo stesso giro.

## 6. I dati: registro e vista

I dati esistono in due forme, ognuna adatta a un compito.

### Il registro: per salvare e unire

Un oggetto **piatto**: tante chiavi indipendenti, ognuna con valore (`v`), momento (`t`, millisecondi dal 1970)
e dispositivo (`d`).

| Chiave | Valore | Significato |
|---|---|---|
| `v/sviluppo/nome` | `"Sviluppo"` | il nome della voce `sviluppo` |
| `v/sviluppo/del` | `true` | la voce è stata cancellata dalla libreria |
| `s/2026-10-12/m/sviluppo` | `true` / `false` | la voce è (o non è più) nella lista della settimana del 12/10 |
| `s/2026-10-12/a/sviluppo/det` | `"Programma A"` | il dettaglio di quella voce in quella settimana |
| `s/2026-10-12/a/sviluppo/f/2` | `true` / `false` | fatto il giorno 2 (0 = lunedì, quindi mercoledì) |
| `s/2026-10-12/r/6` | `true` / `false` | domenica è giorno di riposo |
| `s/2026-10-12/e/2` | `"pesa"` / `"ok"` / `"leggero"` / `null` | energia di mercoledì |

`v` sta per *voce*, `s` per *settimana*, `m` per *membro* (della lista), `a` per *attività*, `f` per *fatto*,
`r` per *riposo*, `e` per *energia*.

Perché piatto? Perché così l’unione di due registri è un ciclo su chiavi, che non deve sapere niente di settimane o
attività (§7). Quando arriveranno le fasce orarie saranno semplicemente chiavi nuove
(per esempio `…/f/2/mattina`), e l’unione non cambierà di una riga.

Un valore "vuoto" (`false`, `''`, `null`) equivale a una chiave assente: `scrivi` non lo registra se la chiave non
c’è già. Così il registro contiene solo ciò che hai davvero fatto.

### La vista: per disegnare

`Core.vista(registro)` legge tutte le chiavi e costruisce la forma comoda per la pagina:

```js
{
  libreria: [{ id: 'sviluppo', name: 'Sviluppo' }, …],
  weeks: {
    '2026-10-12': {
      activities: [{ id: 'sviluppo', dettaglio: 'Programma A' }, …],   // in ordine di aggiunta
      done:   { sviluppo: [true, false, true, false, false, false, false] },
      rest:   [false, false, false, false, false, false, true],
      energy: [null, 'pesa', 'ok', null, null, null, null],
    },
  },
}
```

La vista non si salva mai: si ricalcola ogni volta (bastano pochi millisecondi).

### Dove stanno i dati nel browser

`localStorage` è una piccola memoria chiave → testo che il browser tiene **per sito**. L’app usa tre chiavi:

| Chiave | Contenuto |
|---|---|
| `settimana:registro` | il registro, nello stesso formato del file di sincronizzazione |
| `settimana:dispositivo` | il nome casuale di questo dispositivo (per esempio `d4f2a91bc…`) |
| `settimana:sync` | quando hai salvato e unito un file l’ultima volta (solo informativo) |

`localStorage` non si sincronizza tra dispositivi, nemmeno con lo stesso account del browser: è *local*, appunto.
Ed è diverso per ogni indirizzo: `file://…/index.html`, `localhost` e `github.io` sono tre memorie distinte.

## 7. L’unione tra dispositivi

È il cuore del progetto. Il problema: telefono e computer lavorano ciascuno per conto suo; quando si scambiano i
dati, cosa tenere?

### La regola

**Per ogni chiave, vince la modifica più recente.** A parità di momento decide il nome del dispositivo, poi il
valore: criteri arbitrari ma uguali per tutti, così ogni dispositivo arriva alla stessa decisione.

```js
function vince(x, y) {
  if (x.t !== y.t) return x.t > y.t;
  if (x.d !== y.d) return x.d > y.d;
  return JSON.stringify(x.v) > JSON.stringify(y.v);
}

function unisci(dest, sorgente, applica = true) {
  const conto = { nuove: 0, aggiornate: 0, piuVecchie: 0, uguali: 0 };
  for (const [k, x] of Object.entries(sorgente)) {
    const y = dest[k];
    if (!y) { conto.nuove++; if (applica) dest[k] = { ...x }; }                       // chiave che qui non c'era
    else if (y.t === x.t && y.d === x.d) conto.uguali++;                                // stessa identica modifica
    else if (vince(x, y)) { conto.aggiornate++; if (applica) dest[k] = { ...x }; }     // quella del file è più recente
    else conto.piuVecchie++;                                                            // resta quella di qui
  }
  return conto;
}
```

Con `applica = false` non cambia niente e conta soltanto: la pagina lo usa per l’anteprima ("Porta 6 modifiche
nuove o più recenti…") prima di chiederti conferma.

Il nome tecnico di questo schema è **CRDT** (*Conflict-free Replicated Data Type*), nella forma più semplice:
un registro *last-writer-wins* (LWW) per ogni chiave. Non serve conoscere la teoria per capirlo: è la regola qui sopra.

### Le tre garanzie

Dalla regola seguono tre proprietà, ed è grazie a loro che "qual è il file giusto?" smette di essere una domanda:

- **L’ordine non conta.** Unire A e poi B dà lo stesso risultato di B e poi A: per ogni chiave vince sempre la stessa
  versione, comunque arrivi.
- **Ripetere non fa danni.** Unire due volte lo stesso file: la seconda volta ogni chiave risulta "uguale", nulla cambia.
- **I file vecchi sono innocui.** Un file vecchio contiene solo modifiche più vecchie, che perdono.

I test le verificano su migliaia di casi casuali (§11).

### Togliere senza cancellare

Se togliendo un’attività la sua chiave venisse **cancellata**, alla prossima unione l’altro dispositivo (che ha
ancora `m/… = true`) la riporterebbe indietro: la chiave "non c’è" non può vincere contro "c’è". Per questo togliere
**scrive** `false` con il suo momento: è una modifica come le altre, e vince se è più recente.
Questi valori-segnale si chiamano in gergo *tombstone* ("lapidi").

### L’orologio che non torna indietro

"Più recente" dipende dall’orologio del dispositivo, e gli orologi non sono perfetti. Esempio: il PC è indietro di
un’ora. Unisci il file del telefono, poi correggi un dettaglio sul PC. Con l’ora del PC, la tua correzione
risulterebbe *più vecchia* di ciò che hai appena unito, e perderebbe alla prossima unione.

Per evitarlo, `scrivi` dà a ogni modifica un momento **successivo a tutto ciò che il dispositivo ha già visto**:

```js
const t = Math.max(Math.floor(ora()), ultimo + 1);   // l'ora del dispositivo, ma mai prima dell'ultimo momento visto
ultimo = t;
```

`ultimo` parte dal momento più grande presente nel registro e si aggiorna a ogni unione. Così ciò che fai *dopo*
un’unione vince sempre su ciò che hai unito. (È un’idea che viene dagli orologi logici di Lamport.)

### Identificativi ricavati dal nome

Se crei "Sviluppo" sul telefono e, prima di unire, "sviluppo" sul PC, con identificativi casuali avresti due voci
diverse con lo stesso nome. Invece l’identificativo si ricava dal nome:

```js
Core.slug('Città nuova')   // → 'citta-nuova'  (minuscole, senza accenti, spazi → trattini)
Core.slug('☕')            // → 'x…'  (nessuna lettera latina: un'impronta del nome, sempre la stessa)
```

Così le due creazioni producono le stesse chiavi e all’unione diventano una voce sola. Il nome mostrato è quello
scritto per ultimo. Se l’identificativo è già occupato da una voce con un *altro* nome (per esempio una voce
rinominata), si usa `-2`, `-3`… (`idPer` in `core.js`).

### Altre regole

- **L’uso vince sulla cancellazione.** Se cancelli una voce mai usata sul telefono ma intanto la usi sul PC, dopo
  l’unione resta: una voce che compare in una settimana non sparisce dalla libreria (`vista`).
- **Le chiavi sconosciute si conservano.** `valida` scarta ciò che è malformato ma tiene le chiavi che non conosce,
  se hanno una forma sensata. Una versione vecchia dell’app non le capisce, ma unendo non le perde.
- **L’ordine delle righe** in una settimana è quello di aggiunta: è il momento della chiave `m/…`.

## 8. La pagina: index.html

Un solo file con tre parti: HTML (struttura), CSS (aspetto), JavaScript (comportamento). Il JavaScript è diviso in
sezioni, segnate da commenti `/* ───── … ───── */`, nell’ordine: impostazioni → date → dati → disegno → azioni →
CSV → sincronizzazione → menu → avvio. In testa allo script c’è un riassunto del giro di una modifica.

### Due viste della stessa settimana

| | Computer (più largo di 40rem, circa 640 pixel) | Telefono |
|---|---|---|
| Come si vede | la tabella: attività × sette giorni | un giorno alla volta |
| Scegliere il giorno | tutti visibili insieme | striscia dei sette giorni in alto (barra = quota di attività segnate, puntino = energia) |
| Energia | tre puntini per ogni giorno | una barra con tre segmenti: Pesa, Ok, Leggero |
| Attività | righe della tabella | schede: nome, dettaglio, sette puntini della settimana, «Togli», interruttore grande |
| Aggiungere | sotto la tabella | in cima, sopra le schede; i suggerimenti compaiono quando usi il campo |

Quale vista mostrare lo decide JavaScript con `matchMedia('(max-width: 40rem)')`, la stessa soglia del CSS:
`disegna()` chiama `disegnaTabella()` oppure `disegnaGiorno()` e nasconde l’altra. Se ruoti il telefono o stringi la
finestra, l’evento `change` della media query ridisegna. Il modulo per aggiungere è uno solo: `disegna()` lo sposta
dove serve con `append` (spostare un elemento non gli toglie i gestori degli eventi). Le caselle delle schede hanno
gli stessi `data-id` e `data-giorno` della tabella, quindi i gestori sono gli stessi.

Nella vista a un giorno `giornoScelto` ricorda il giorno mostrato: oggi nella settimana corrente; passando a un’altra
settimana resta lo stesso giorno della settimana, se non è nel futuro (`giornoMostrato`).

### Il menu

CSV, sincronizzazione e libreria stanno in un `<dialog id="menu">`, aperto dal pulsante in alto a destra con
`showModal()`: sta sopra alla pagina, che intanto non risponde ai tocchi. Su computer è un pannello al centro, su
telefono sale dal basso (stesso elemento, CSS diverso). Si chiude con la ×, con Esc, con un tocco fuori, e da solo
dopo aver unito un file, così vedi subito il risultato.

### Concetti del web usati

Qui sotto, con dove trovarli:

**DOM e disegno.** Il DOM è l’albero degli elementi della pagina, che JavaScript può leggere e modificare. Le funzioni
`creaRiga`, `creaRigaEnergia`… costruiscono elementi con `document.createElement` e li mettono nella tabella con
`replaceChildren`. Il testo si inserisce con `textContent`, mai con `innerHTML`: un nome come `<b>ciao</b>` viene
mostrato così com’è invece di essere interpretato come HTML. È la difesa più semplice contro l’inserimento di
codice (XSS).

**Ridisegnare tutto.** `disegna()` rifà l’intera tabella dalla vista. Con poche decine di righe costa pochissimo, e
garantisce che ciò che vedi venga solo dai dati. È lo stesso principio dei framework come React o Blazor
(l’interfaccia è funzione dello stato), fatto a mano.

**Attributi `data-…`.** Ogni casella porta `data-id` e `data-giorno`; in JavaScript si leggono con `el.dataset.id`.
Così il gestore sa a cosa si riferisce un tocco senza cercarlo.

**Delega degli eventi.** Un evento "risale" dall’elemento toccato fino ai suoi antenati (*bubbling*). Per questo basta
un gestore su `corpo` (il `<tbody>`) e uno su `carte` (la `<ul>` delle schede) per ricevere i tocchi di tutte le
caselle, anche di quelle create dopo. Dentro il gestore, `e.target` è l’elemento toccato; `matches()` e `closest()`
dicono di che elemento si tratta.

**Suggerimenti senza chiudere la tastiera.** Toccando un suggerimento, il campo di testo perderebbe il fuoco e sul
telefono la tastiera si chiuderebbe. Un `preventDefault()` sull’evento `pointerdown` dei suggerimenti lo impedisce:
il fuoco resta nel campo e il clic arriva comunque al pulsante.

**Il messaggio di stato come popover.** "Salvato" e gli errori compaiono in un avviso in basso (`#stato`). È un
*popover* (`popover="manual"`, `showPopover()`): il browser lo mette nello strato più alto della pagina, sopra anche
al menu aperto. Dove i popover non esistono, resta un normale elemento in sovrimpressione.

**La finestra di conferma e `await`.** `conferma(testo)` apre un `<dialog>` e restituisce una **Promise**, cioè un
risultato che arriverà più tardi. Chi la usa scrive `const ok = await conferma(…)`: la funzione si "ferma" fino alla
risposta, senza bloccare la pagina. È lo stesso `async/await` di C#, con `Promise` al posto di `Task`.

**`localStorage` e più schede.** `salva()`, prima di scrivere, unisce ciò che c’è già in memoria: se un’altra scheda
dello stesso browser ha salvato nel frattempo, le sue modifiche non si perdono. In più l’evento `storage` avvisa una
scheda quando un’altra ha scritto: la pagina unisce e ridisegna (aspettando, se stai scrivendo in un campo).

**Scaricare un file creato al momento.** `scarica()` trasforma il testo in un `Blob` (un file in memoria), gli dà un
indirizzo temporaneo con `URL.createObjectURL` e "clicca" un link invisibile con l’attributo `download`.

**Condividere un file.** Sul telefono, «Invia a…» usa `navigator.share({ files })`: apre il menu Condividi del
sistema (Drive, email…). Il pulsante compare solo se il browser lo supporta e lo schermo è touch.

**Date.** Una settimana si identifica con la data del lunedì come testo `'AAAA-MM-GG'`: si ordina come una stringa e
non porta con sé ore e fusi orari. `lunediDi` usa `(getDay() + 6) % 7` per contare i giorni dal lunedì (`getDay()`
conta dalla domenica). Le date si mostrano con `Intl.DateTimeFormat('it-IT', …)`. La pagina controlla ogni minuto
se è cambiato il giorno (`controllaGiorno`), così a mezzanotte "oggi" si sposta da solo.

**CSS.** I colori sono variabili (`--accento`, `--fatto`…) definite con `light-dark(chiaro, scuro)`: il tema segue
quello del sistema. La colonna dei nomi resta ferma quando la tabella scorre (`position: sticky`). Sotto i 40rem una
`@media` adatta intestazione, modulo e menu al telefono. La striscia dei giorni è una griglia a sette colonne uguali
(`grid-template-columns: repeat(7, 1fr)`); la barra di ogni giorno si riempie con un gradiente che legge la variabile
`--pieno` (da 0 a 1), impostata dal codice. Su iPhone `env(safe-area-inset-…)` tiene il contenuto lontano da tacca e
barra in basso. Chi preferisce meno animazioni (impostazione del sistema) le ha quasi azzerate
(`prefers-reduced-motion`).

**Accessibilità.** I pulsanti dell’energia e i giorni della striscia usano `aria-pressed`; le caselle hanno
`aria-label` ("Sviluppo – Mercoledì"); ogni giorno della striscia dice quante attività sono segnate ("Mer 21 ott:
1 di 3 attività segnate"); i messaggi di stato stanno in una regione `aria-live` che i lettori di schermo annunciano.
Sul telefono i bersagli dei tocchi sono di almeno 44 pixel, la misura consigliata da Apple e Google.

**CSV.** Separatore `;` (Excel in italiano), un carattere BOM (`\uFEFF`) all’inizio perché Excel riconosca le
lettere accentate, e un apostrofo davanti ai testi che iniziano con `=`, `+`, `-`, `@` perché Excel non li scambi per
formule (`campoCsv`). Il CSV si può solo **esportare**: non ha i momenti delle modifiche, quindi non potrebbe
partecipare all’unione e diventerebbe una terza versione dei dati.

## 9. Libreria, suggerimenti, «Riprendi»

- **Libreria.** Le voci nascono quando le aggiungi a una settimana. Rinominare una voce vale ovunque, anche nel
  passato (la pagina lo dice prima). Una voce già usata non si cancella, perché fa parte dello storico; una voce
  mai usata sì.
- **Suggerimenti a campo vuoto ("Frequenti").** Le 3 voci più segnate nelle ultime 4 settimane (`FINESTRA`,
  `MAX_FREQUENTI`), escluse quelle già nella settimana. Ordine: giorni segnati, poi settimane in cui compaiono, poi
  la più recente. Le voci non usate da più di 4 settimane spariscono da qui da sole.
- **Mentre scrivi ("Nella libreria").** Tutta la libreria, comprese le voci vecchie. La ricerca ignora maiuscole e
  accenti (`perRicerca`); vengono prima le voci che *iniziano* con il testo, poi quelle che lo *contengono*.
- **Sul telefono** i suggerimenti compaiono solo mentre usi il campo, oppure quando la settimana è ancora vuota:
  altrimenti occuperebbero spazio sopra le schede ogni volta che apri l’app.
- **Per cominciare.** Nella prima settimana d’uso compaiono sei attività di esempio, finché non le scegli. Non sono
  scritte nei dati: lo diventano solo quando ne tocchi una. Altrimenti, togliendole su un dispositivo, ricomparirebbero
  dall’altro.
- **Riprendi.** Se la settimana corrente è vuota, propone di copiare la lista dell’ultima settimana che ne aveva una,
  senza dettagli né spunte (`db.riprendi`).

## 10. L’app installabile: manifest e service worker

Una **PWA** (*Progressive Web App*) è un sito che il browser permette di installare come app. Servono tre cose:

1. **https** (o `localhost`): il browser lo pretende.
2. **Un manifest** (`manifest.webmanifest`): nome, colori, icone, modalità a schermo intero (`"display": "standalone"`).
   È collegato dalla pagina con `<link rel="manifest">`.
3. **Un service worker** (`sw.js`): uno script che il browser tiene attivo a parte e che può rispondere alle richieste
   di rete al posto del server.

Il service worker di quest’app fa una cosa sola: tiene una copia dei file per aprire l’app senza rete.

- All’**installazione** scarica in cache l’elenco `FILE`.
- All’**attivazione** cancella le cache delle versioni precedenti (quelle con un altro valore di `VERSIONE`).
- Per ogni **richiesta**:
  - pagina e script (`index.html`, `core.js`): **prima la rete**, e se manca la copia salvata. Così pagina e nucleo
    arrivano sempre aggiornati e sempre insieme;
  - icone e manifest: **prima la copia salvata**.

I dati non passano mai dal service worker: stanno in `localStorage`. Gli aggiornamenti dell’app non li toccano.
All’avvio la pagina chiede anche `navigator.storage.persist()`, cioè di non cancellare i dati quando lo spazio
scarseggia; il browser può rifiutare, e per questo il file di sincronizzazione resta anche la copia di sicurezza.

## 11. I test

Ci sono due livelli di test, e servono a cose diverse.

### Test del nucleo (`npm test`)

`test/core.test.js`, con il test runner incluso in Node (`node:test`), senza dipendenze. Il nucleo non ha bisogno di
un browser, quindi questi test sono veloci (qualche secondo, quasi tutto per i test di proprietà) e possono provare
moltissimi casi.

- **Test su esempi**: un caso preciso e il risultato atteso. Per esempio "una voce tolta non ricompare quando arriva il
  file vecchio dell’altro dispositivo", oppure "con l’orologio indietro, ciò che fai dopo un’unione vince comunque".
- **Test di proprietà**: invece di un esempio, una *regola che deve valere sempre*. Tre dispositivi simulati (uno con
  l’orologio un’ora indietro) fanno centinaia di modifiche casuali e qualche unione parziale; poi si controlla che
  l’ordine delle unioni non conti, che ripetere un’unione non cambi niente, che un file vecchio non tolga niente, che
  la vista sia coerente. Si ripete con decine di semi diversi.

Il generatore casuale ha un **seme** fisso (`casuale(seme)`): stesso seme, stessa sequenza. Se un test fallisce, il
messaggio dice il seme, e il caso si riproduce identico.

**I test sanno fallire?** Un test che passa sempre non dimostra niente. Una verifica semplice: rompere apposta il
codice e vedere se i test se ne accorgono (in gergo *mutation testing*). Prova:

1. in `core.js`, in `vince`, cambia `x.t > y.t` in `x.t < y.t` (vince il più vecchio);
2. lancia `npm test`: devono fallire diversi test;
3. rimetti com’era.

Altri esperimenti: togliere `ultimo + 1` da `scrivi`; in `togli`, cancellare la chiave invece di scrivere `false`.

### Test nel browser (`npm run test:browser`)

`test-browser/`, con [Playwright](https://playwright.dev): apre un Chromium vero, carica l’app da `strumenti/server.js`
e la usa come una persona (scrive, tocca, conferma, scarica). Le azioni ricorrenti stanno in `aiuti.js`, così i test
si leggono come una storia.

- **Due dispositivi = due contesti.** Un *contesto* di Playwright è come un profilo separato del browser, con la sua
  memoria. Nel test di sincronizzazione telefono e PC lavorano separati, si scambiano il file salvato e alla fine
  devono mostrare la stessa tabella (`foto()` la fotografa per confrontarla).
- **Telefono simulato.** `telefono.spec.js` apre contesti larghi 390 pixel, con tocco: verifica la vista a un giorno,
  il passaggio tra le due viste stringendo la finestra, e che ciò che segni sul telefono arrivi nella tabella del
  computer dopo l’unione.
- **Orologio fermo.** `page.clock.install({ time })` fissa la data: i test girano "mercoledì 14 ottobre 2026" in
  qualunque giorno li lanci.
- **Service worker bloccato**, tranne in `pwa.spec.js`, che verifica installabilità (lo chiede a Chrome stesso) e
  funzionamento senza rete (`context.setOffline(true)`).

Una lezione vera da questi test: un test falliva **una volta su venti**. La finestra di conferma spariva subito, ma
la pagina proseguiva solo all’evento `close`, che il browser consegna un attimo dopo; il test a volte leggeva la tabella
in quell’attimo. La correzione (in `conferma()` di `aiuti.js`) aspetta proprio quell’evento. Regola generale: nei test
nel browser si aspetta **un segnale preciso**, mai un tempo fisso. Un test che fallisce ogni tanto (*flaky*) va
capito, non rilanciato finché passa.

## 12. Limiti e scelte consapevoli

- **Il trasporto del file è manuale.** Ricordarsi di salvare e unire è un piccolo rituale. Un passo successivo
  possibile: Google Drive automatico, con lo stesso nucleo; cambierebbe solo chi trasporta il file.
- **Fino all’unione, un dispositivo non sa cosa hai fatto sull’altro.** È il prezzo di non avere un server.
- **Un caso raro non è coperto, ed è visibile:** se rinomini una voce su un dispositivo e ricrei il vecchio nome
  sull’altro prima di unire, vince il nome scritto per ultimo. Lo stesso per le maiuscole: se crei "Sviluppo" e
  poi, sull’altro dispositivo, "sviluppo", resta quello scritto per ultimo.
- **Gli orologi.** Due modifiche alla stessa casella su due dispositivi, a pochi secondi l’una dall’altra e prima di
  unire, si risolvono con gli orologi dei dispositivi. Per una persona sola è un caso quasi impossibile.
- **Lo spazio.** Ogni informazione porta con sé momento e dispositivo. Stima, non misurata: qualche kilobyte a
  settimana, quindi alcuni MB in molti anni. `localStorage` di solito ne concede circa 5. Se servirà: compattare il
  registro o passare a IndexedDB.
- **Provata solo in Chromium.** Firefox e Safari non sono coperti dai test automatici.

## 13. Da C# a JavaScript: un piccolo dizionario

| In questo codice | In C# / .NET |
|---|---|
| `const` / `let` | variabile non riassegnabile / riassegnabile (`readonly` locale non esiste; `const` di JS non rende immutabile l’oggetto) |
| `(x) => x * 2` | lambda `x => x * 2` |
| `Promise`, `async`/`await` | `Task`, `async`/`await` |
| `obj?.campo ?? 'predefinito'` | identici: `?.` e `??` |
| `` `Ciao ${nome}` `` | `$"Ciao {nome}"` |
| `{ ...x }` | copia superficiale di un oggetto (come un `with` sui `record`) |
| `const { id, giorno } = el.dataset` | deconstruction: `var (id, giorno) = …` |
| `module.exports = { … }` / `require('…')` | `public` + `using` di un altro assembly |
| `structuredClone(x)` | copia profonda |
| `Object.entries(o)` | enumerare un `Dictionary` come coppie chiave/valore |
| `Array.prototype.map/filter/some` | LINQ `Select/Where/Any` |
| `addEventListener('click', f)` | `button.Click += f` |
| `localStorage` | una piccola tabella chiave/valore persistente, per sito |
| `'use strict'` | modalità rigorosa: certi errori silenziosi diventano eccezioni |

Due differenze da tenere a mente. **Tipi**: JavaScript non li controlla; per questo il nucleo valida tutto ciò che
arriva da fuori (`valida`, `daFile`) e i test fanno da rete di sicurezza. **`==` contro `===`**: qui si usa sempre
`===`, che non converte i tipi (`0 == ''` è vero, `0 === ''` è falso).

La struttura di `core.js` è un *modulo UMD* minimo: la funzione in fondo restituisce l’oggetto con le funzioni
pubbliche; l’involucro in cima lo assegna a `module.exports` se c’è Node, altrimenti a `window.SettimanaCore`.
Così lo stesso file funziona in entrambi.

## 14. Un percorso per studiarla

**Ordine di lettura consigliato**

1. Questo README, §4 e §5: il quadro e il giro di una modifica.
2. `core.js`, dall’alto: il commento iniziale, poi `scrivi`, `vince`, `unisci`, `vista`, le operazioni.
3. `test/core.test.js`: i test su esempi in fondo al file, poi i test di proprietà in cima.
4. `index.html`, lo script: la panoramica in testa, poi le sezioni "Dati" e "Azioni".
5. `test-browser/sincronizzazione.spec.js` e `telefono.spec.js`, con `aiuti.js` accanto.
6. `sw.js` e il §10.

**Esperimenti, dal più facile**

1. Cambia `FINESTRA` da 4 a 2 settimane e guarda come cambiano i "Frequenti" (`npm start`, poi carica i dati di
   prova incollando in console `localStorage.setItem('settimana:registro', JSON.stringify(<contenuto di npm run seme>))`).
2. Fai la prova di mutazione del §11 e leggi quali test falliscono e perché.
3. Scrivi un test del nucleo nuovo: "spuntare e poi togliere la spunta lascia la casella vuota anche dopo un’unione
   con un file in cui era spuntata".
4. Aggiungi una quarta riga di servizio (per esempio "Umore") seguendo il modello dell’energia: chiave nuova nel
   registro (`s/…/u/<giorno>`), schema in `valida`, lettura in `vista`, operazione in `crea`, riga in pagina, test.
5. Progetta le **fasce orarie** (mattina, pomeriggio, sera): quali chiavi useresti? Cosa succede a un dispositivo con
   la versione vecchia dell’app quando riceve quelle chiavi? (Indizio: §7, "Le chiavi sconosciute si conservano".)
