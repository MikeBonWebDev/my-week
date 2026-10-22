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
npx playwright install chromium
```

poi `npm run test:browser`.

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
   dopo `?v=` negli indirizzi di stile e script (da `?v=9` a `?v=10`). Devono coincidere: se ti dimentichi,
   `npm run test:browser` te lo dice.
3. Al primo avvio con la rete l’app prende la versione nuova; a volte serve chiuderla e riaprirla.

Gli aggiornamenti non toccano i dati.
