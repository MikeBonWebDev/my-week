# La mia settimana — come procedere

Passi pratici: provarla, pubblicarla, installarla, usarla su più dispositivi, aggiornarla.
**Come funziona** (app e codice) è spiegato in [README.md](README.md).

## 1. Provarla sul computer

Serve [Node.js](https://nodejs.org) 22 o successivo (consigliata la LTS più recente).

```sh
npm start              # apri http://localhost:8765/
npm test               # test del nucleo
```

Per i test nel browser, una volta sola:

```sh
npm install
npx playwright install chromium firefox webkit
```

poi `npm run test:browser`: ogni test gira in Chromium, Firefox e WebKit (il motore di Safari); i test del telefono
anche nel progetto `iphone` (WebKit con il profilo di un iPhone 15). Uno solo, per fare prima:
`npx playwright test --project=chromium`. Gli stessi test girano da soli su GitHub a ogni push (scheda
*Actions*).

## 2. Pubblicarla (GitHub Pages)

Una PWA deve essere servita da un indirizzo **https**. GitHub Pages lo dà gratis.

1. Carica i file in un repository GitHub: nella radice, oppure in una sottocartella del repository portfolio
   (l’app usa solo percorsi relativi, quindi funziona anche lì). Il file `.gitignore` esclude già `node_modules/`
   e i risultati dei test.
2. *Settings → Pages → Build and deployment*: *Deploy from a branch*, ramo `main`, cartella `/ (root)`.
3. Dopo un paio di minuti è su `https://<utente>.github.io/<repository>/` (più l’eventuale sottocartella).

Nel repository c’è solo il codice: i tuoi dati non ci finiscono mai.

## 3. Installarla

- **Android (Chrome):** apri l’indirizzo, poi menu ⋮ → *Installa app*.
- **iPhone (Safari):** apri l’indirizzo, poi *Condividi* → *Aggiungi alla schermata Home*.
  Installa prima e poi usa solo l’icona: l’app installata può avere una memoria separata da quella di Safari.
- **Computer:** usa l’indirizzo https anche lì. `index.html` aperto come file funziona, ma per il browser è un sito
  diverso, con dati diversi.

## 4. Usarla su più dispositivi

1. Sul primo dispositivo: sezione **Dati** → *Salva il file* (sul telefono anche *Invia a…*, che apre il menu
   Condividi, per esempio verso Drive).
2. Sull’altro: sezione **Dati** → *Unisci un file*. La pagina dice quante modifiche porta il file e chiede conferma.
3. Si può fare in qualsiasi ordine e quante volte vuoi: per ogni casella vince la modifica più recente.
   Il file è anche la tua copia di sicurezza.

Da provare presto su un telefono vero: lo scarico e l’invio del file dall’app installata. Su alcuni telefoni,
a schermo intero, un file scaricato si apre in anteprima invece di essere salvato; *Invia a…* evita il problema.

## 5. Aggiornarla

1. Sostituisci i file nel repository.
2. In `sw.js` cambia `VERSIONE` (per esempio da `settimana-9` a `settimana-10`), e in `index.html` il numero
   dopo `?v=`: nello stile, nello script in fondo e in ogni riga della *import map* (da `?v=9` a `?v=10`).
   Devono coincidere: se ti dimentichi, `npm run test:browser` te lo dice. Un file di codice nuovo va aggiunto
   sia alla import map di `index.html` sia all’elenco `FILE` di `sw.js`: anche questo lo controlla un test.
3. Al primo avvio con la rete l’app prende la versione nuova; a volte serve chiuderla e riaprirla.

Gli aggiornamenti non toccano i dati.

## 6. Provarla su un iPhone vero

I test automatici usano il motore di Safari, non iOS. Questa lista copre ciò che solo un iPhone può dire: bastano
una decina di minuti, anche con il telefono di qualcun altro (i dati restano su quel telefono: alla fine si possono
cancellare togliendo l’app e i dati del sito).

1. Apri l’indirizzo in **Safari**: la pagina si vede intera, senza scorrimento di lato; la barra delle sezioni in basso
   non finisce sotto la barra di sistema.
2. **Aggiungi alla schermata Home** e apri l’app dall’icona: si apre a schermo intero, con il nome e l’icona giusti.
3. Aggiungi due attività e segna qualcosa; chiudi l’app (anche dal multitasking) e riaprila: i dati ci sono.
4. Tocca il campo del **dettaglio** e quello per **aggiungere**: la pagina **non** si ingrandisce.
5. Sezione **Dati** → *Salva il file*: dove va a finire? (Di solito nell’app File, in *Download*.)
   Poi *Invia a…*: si apre il menu Condividi, con il file allegato.
6. **Modalità aereo**, poi riapri l’app: funziona lo stesso.
7. Riapri l’indirizzo in **Safari** (non dall’icona): i dati di prima ci sono o no? Su iPhone l’app installata e
   Safari possono avere memorie separate. Non è un errore, ma è bene saperlo: si usa sempre la stessa delle due.

Se qualcosa non va, una foto dello schermo e il punto della lista bastano per capire da dove partire.

