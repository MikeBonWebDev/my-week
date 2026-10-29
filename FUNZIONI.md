# Che cosa fa l'app

Il comportamento di «La mia settimana» **com'è adesso**, sezione per sezione: che cosa si vede, che cosa succede a
ogni tocco, quali regole valgono. È il riferimento per dire se l'app fa la cosa giusta.

- **Questo documento è vivo.** Descrive solo ciò che esiste nel codice. Quando una fase del piano (`PIANO.md`) è
  finita, ciò che ha aggiunto o cambiato entra qui, nella stessa modifica, ed esce dal piano.
- **Se il codice e questo documento non coincidono**, uno dei due è sbagliato: si decide quale, e si corregge. Le
  differenze già note sono nel §12.
- Gli altri documenti: `README.md` spiega *come è fatta* l'app (architettura, codice, test); `DATI.md` è il glossario
  dei dati; `LEGGIMI.md` dice come pubblicarla e installarla; `PIANO.md` è ciò che verrà; `CLAUDE.md` contiene le
  regole per chi ci lavora.

Aggiornato alla versione `settimana-19` (ottobre 2026), ricavato dal codice e dai test.

## Indice

1. [Le parole dell'app](#1-le-parole-dellapp)
2. [Com'è fatta: sezioni, computer e telefono](#2-comè-fatta-sezioni-computer-e-telefono)
3. [Settimana](#3-settimana)
4. [Il promemoria delle faccende](#4-il-promemoria-delle-faccende)
5. [Casa](#5-casa)
6. [Rinominare e la Libreria](#6-rinominare-e-la-libreria)
7. [Il menu](#7-il-menu)
8. [Dati](#8-dati)
9. [Più dispositivi, più schede](#9-più-dispositivi-più-schede)
10. [App installabile e senza rete](#10-app-installabile-e-senza-rete)
11. [Messaggi](#11-messaggi)
12. [Differenze note tra codice e intenzione](#12-differenze-note-tra-codice-e-intenzione)

## 1. Le parole dell'app

| Parola | Che cos'è |
|---|---|
| **Voce** | qualcosa che fai, in generale («Sviluppo», «Camminare»). Ha un nome, che vale ovunque. L'insieme delle voci è la **libreria** |
| **Attività** | una voce dentro una settimana. Può avere un **dettaglio** solo di quella settimana («Programma A») |
| **Settimana** | da lunedì a domenica. Si identifica con il suo lunedì |
| **Spunta** | «fatta quel giorno». Una casella per attività e per giorno |
| **In programma** | i giorni in cui un'attività si vede (§3.4) |
| **Faccenda** | una voce con una **cadenza**: ogni quanti giorni (da 1 a 365) |
| **Giro** | per una faccenda, il momento in cui tocca di nuovo: l'ultima volta più la cadenza. Un giro è **aperto** se quel giorno è passato. Ce n'è sempre uno solo: i giri mancati non si contano |
| **Calore** | quanto una faccenda è oltre la sua cadenza, da 0 a 1 (§5.3) |
| **Salto questo giro** | il conteggio di una faccenda riparte da oggi, senza segnarla come fatta (§5.4) |
| **Energia** | per ogni giorno: Pesa, Ok o Leggero, oppure niente |
| **Giorno di riposo** | un giorno segnato come riposo: cambia la tinta, non i conteggi |
| **Nomi riservati** | «Riposo» ed «Energia»: hanno già la loro riga, non possono essere voci |

Un nome di voce è lungo al massimo 60 caratteri, un dettaglio 200. Gli spazi in più si tolgono; maiuscole e spazi
non contano per riconoscere una voce («sviluppo » è «Sviluppo»).

## 2. Com'è fatta: sezioni, computer e telefono

**Tre sezioni:** Settimana, Casa, Dati. Una sola è aperta alla volta. Il titolo in alto e il sottotitolo cambiano con
la sezione:

| Sezione | Titolo | Sottotitolo |
|---|---|---|
| Settimana | La mia settimana | Le attività della settimana, giorno per giorno. |
| Casa | Casa | Le faccende con una cadenza. |
| Dati | Dati | Copie, altri dispositivi, CSV. |

- **Computer** (schermo largo): le sezioni sono in una colonna a sinistra. **Telefono** (sotto i 40rem, circa 640
  pixel): sono in una barra in basso, sempre visibile.
- L'app **riapre sulla sezione dell'ultima volta**, su quel dispositivo.
- Il pulsante **Menu** in alto a destra apre il menu (§7).
- I messaggi brevi («Salvato», gli errori) compaiono in sovrimpressione, sopra a tutto, e spariscono da soli: dopo
  1,5 secondi, gli errori dopo 6.
- Le domande che chiedono conferma usano una finestra con **Annulla** e un pulsante che dice l'azione («Togli»,
  «Unisci»…). Esc o un tocco fuori equivalgono ad Annulla.
- Ruotando il telefono o stringendo la finestra oltre la soglia, si passa da una vista all'altra senza perdere niente.

## 3. Settimana

### 3.1 Quale settimana

In alto: il periodo («12 – 18 ottobre 2026») e sotto «Questa settimana», «Settimana scorsa» o «N settimane fa».

- **‹ ›** vanno alla settimana prima e dopo. Non si va oltre la settimana corrente: il futuro non si guarda.
- **Torna a oggi** compare quando guardi un'altra settimana.
- Se la pagina resta aperta oltre la mezzanotte, «oggi» si sposta da solo (al rientro nella pagina, o entro un
  minuto); se stavi guardando la settimana corrente, segui il cambio.

**Settimane passate:** si consultano e si correggono (spunte, dettagli, energia, riposo), ma le attività **non si
aggiungono né si tolgono**: il modulo per aggiungere sparisce e una nota lo spiega. Nelle settimane passate i nomi
non si toccano per rinominare e le faccende non si scaldano.

**Giorni futuri** della settimana corrente: caselle, energia e riposo sono spenti; sul telefono il giorno non si
sceglie.

### 3.2 Computer: la tabella

Una riga per attività, nell'ordine in cui le hai aggiunte; una colonna per giorno, con la data; la colonna di oggi è
evidenziata e, se la tabella scorre di lato, all'avvio si porta al centro.

Ogni riga ha: il nome (nella settimana corrente si tocca per rinominare, §6.1), per una faccenda la riga della
cadenza (§5.2), il campo del **dettaglio**, la **×** per togliere l'attività (solo nella settimana corrente), le
sette caselle.

In fondo due righe fisse:
- **Energia**: per ogni giorno tre pulsanti, pesa · ok · leggero. Toccare il livello già scelto lo toglie.
- **Giorno di riposo**: una casella per giorno. Una colonna di riposo prende una tinta propria.

Settimana vuota: «Nessuna attività, per ora: aggiungine una qui sotto.» (corrente) oppure «In questa settimana non
c'erano attività.» (passata).

### 3.3 Telefono: un giorno alla volta

- **La striscia dei giorni** in alto: per ogni giorno l'abbreviazione, il numero, una barretta che si riempie con la
  quota di attività segnate quel giorno, e il segno dell'energia e del riposo. Un tocco sceglie il giorno.
- **Il giorno mostrato:** nella settimana corrente, all'inizio, oggi; nelle settimane passate, la domenica. Cambiando
  settimana resta lo stesso giorno della settimana, se non è nel futuro. «Torna a oggi» riporta su oggi.
- **La giornata:** il titolo («Mercoledì 14 ottobre», con «oggi»), l'energia (Pesa / Ok / Leggero, un secondo tocco
  toglie la scelta), l'interruttore **Giorno di riposo**.
- **Il modulo per aggiungere** sta sopra le schede (§3.5).
- **Le schede**, una per attività in programma quel giorno (§3.4): nome, riga della cadenza se è una faccenda,
  dettaglio, sette puntini della settimana (il giorno scelto marcato), il pulsante per togliere (§3.7), e a destra la
  casella del giorno. Una scheda segnata quel giorno è verde; altrimenti, in un giorno di riposo prende la tinta del
  riposo; altrimenti, una faccenda oltre la cadenza si scalda.
- Giorno vuoto: «Nessuna attività in questo giorno, per ora: aggiungine una qui sopra.» oppure «In questo giorno non
  c'erano attività.»

### 3.4 In quali giorni si vede un'attività

La regola: **un vuoto non deve seguirti.** Una casella vuota resta solo dove l'attività era davvero in programma.

| Tipo | Come nasce | Si vede |
|---|---|---|
| **Per giorni** | aggiunta a un giorno (il modo normale) | nei giorni in cui l'hai messa, e in ogni giorno in cui è segnata (una spunta fuori programma vale lo stesso) |
| **Di settimana** | aggiunta prima che esistessero i giorni (dati vecchi), oppure una faccenda a cui hai tolto la cadenza mentre era nella settimana | tutti i giorni |
| **Faccenda** | una voce con cadenza nella settimana | in ogni giorno, tranne quelli **coperti**: un giorno è coperto se c'è una spunta, in qualunque settimana, a meno di una cadenza di distanza, prima o dopo. Il giorno della spunta resta visibile |

Esempio: «Bagno» ogni 7 giorni, fatto lunedì: da martedì a domenica è coperto. «Piante» ogni 3 giorni, fatte lunedì:
martedì e mercoledì coperti, da giovedì di nuovo visibili.

- **Computer:** i giorni fuori programma (o coperti) si vedono **attenuati**, con la casella tratteggiata, ma restano
  spuntabili. Una spunta aggiorna subito gli attenuati della riga, senza ridisegnare la tabella.
- **Telefono:** la scheda c'è solo nei giorni in cui l'attività si vede. La striscia conta per ogni giorno solo
  quelle.
- Un'attività per giorni che non ha più nessun giorno (tutti tolti) non si vede, ed esce dalla settimana.

### 3.5 Aggiungere

Solo nella settimana corrente. Si scrive il nome e Invio (o **Aggiungi**, o **+** sul telefono), oppure si tocca un
suggerimento.

- **Dove va:** sul telefono nel giorno mostrato, sul computer **oggi**.
- Se il nome è già nella libreria (maiuscole e spazi non contano), si usa quella voce; altrimenti nasce una voce
  nuova.
- **Già nella settimana per altri giorni** → si aggiunge anche a questo giorno.
- **Già in questo giorno** → messaggio «… è già in questo giorno.»
- **Una faccenda** va sempre sulla settimana intera, qualunque sia il giorno; se c'è già → «… è già in questa
  settimana.»
- Nome vuoto o riservato → messaggio, niente cambia.

### 3.6 Suggerimenti

Sotto il campo, come pulsanti «+ Nome».

- **A campo vuoto, «Frequenti:»** le 3 voci più usate nelle ultime 4 settimane (prima i giorni segnati, poi le
  settimane in cui compaiono, poi la più recente). Una voce non usata da più di 4 settimane non compare qui.
- **Mentre scrivi, «Nella libreria:»** fino a 6 voci di tutta la libreria, anche vecchie. Maiuscole e accenti non
  contano; prima le voci che iniziano con il testo, poi quelle che lo contengono.
- **Esclusi:** le voci già presenti nel giorno in cui aggiungeresti. Un'attività per giorni presente in *altri*
  giorni si propone ancora (aggiungerla la mette anche qui); una faccenda già nella settimana no.
- **«Per cominciare:»** nella prima settimana d'uso (nessuna settimana passata con attività), a campo vuoto, sei
  esempi: Suonare la chitarra, Camminare, Cucinare un pasto, Riordinare un angolo di casa, Scrivere nel diario,
  Sentire una persona cara. Non sono scritti nei dati finché non ne scegli uno.
- **Sul telefono** i suggerimenti compaiono solo mentre usi il campo, o se la settimana è ancora vuota. Toccare un
  suggerimento non chiude la tastiera.

### 3.7 Spuntare, dettaglio, togliere

- **Spunta:** un tocco sulla casella. Si toglie allo stesso modo.
- **Dettaglio:** il campo sotto il nome. Si salva uscendo dal campo o con Invio. Vale solo per quella settimana.
- **Togliere dalla settimana** (× sul computer, «Togli dalla settimana» sul telefono per le attività di settimana e
  le faccende): chiede conferma e dice in quali giorni risulta svolta. **Le spunte non si perdono**: restano nello
  storico, contano per le faccende, e ricompaiono se rimetti la voce in quella settimana. La voce resta nella
  libreria; le altre settimane non cambiano. Anche i giorni in programma si tolgono: rimessa, torna solo nel giorno
  in cui la rimetti.
- **Togliere da un giorno** (telefono, «Togli da questo giorno», solo per le attività per giorni): senza conferma,
  perché si rimette con un tocco dai suggerimenti. In un giorno in cui è segnata il pulsante non c'è: prima si toglie
  la spunta. Se era l'ultimo giorno, l'attività esce dalla settimana («… è uscita dalla settimana.»).

## 4. Il promemoria delle faccende

In cima alla **settimana corrente** (sul telefono sopra il giorno), un riquadro chiuso: «Giri aperti e in arrivo» con
il numero. Si apre toccando il titolo; riaprendo l'app torna chiuso. Non c'è se non ha niente da proporre, e non c'è
nelle settimane passate.

- **Chi c'è:** le faccende che **non sono nella settimana** e hanno il giro aperto o in arrivo entro domenica, più
  quelle mai segnate. In ordine: prima il giro aperto da più tempo, poi quelli in arrivo, le mai segnate in fondo.
- **Ogni riga:** nome, riga della cadenza, e due scelte:
  - **Aggiungi**: la faccenda entra nella settimana ed esce dal promemoria;
  - **Salto questo giro** (§5.4): la riga resta, con «Giro saltato oggi: il conteggio riparte da qui.» e **Annulla**,
    finché non cambi sezione o ricarichi.
- Senza scelta la riga resta lì: è un'informazione, non una richiesta. Il promemoria non scrive niente da solo.

## 5. Casa

### 5.1 L'elenco

Una scheda per faccenda. «Ancora nessuna faccenda.» se non ce ne sono. In alto **Aggiungi una faccenda**.

**L'ordine** si decide quando apri la sezione: prima chi ha superato di più la propria cadenza (in proporzione), a
parità il nome; le mai segnate in fondo. Mentre guardi non si muove; una faccenda nuova va in fondo. Riaprendo la
sezione si riordina.

### 5.2 Una scheda

- Il nome (si tocca per rinominare).
- **Quando:** «Fatta oggi», «Fatta ieri», «Fatta il 23 settembre», «Fatta l'8 ottobre», oppure «Mai segnata».
  L'ultima volta viene dalle spunte di **tutte** le settimane, anche quelle da cui la voce è stata tolta. Una spunta
  nel futuro (orologio sbagliato) non conta.
- **Ogni quanto:** «Ogni giorno», «Ogni 14 giorni».
- **Il giro:** «Prossimo giro: oggi / domani / venerdì 30 ottobre», oppure «Giro aperto da ieri / dal 7 ottobre /
  dall'11 ottobre». Per una mai segnata, niente.
- Le date hanno l'anno solo se non è quello di oggi; il primo del mese è «1°».
- Pulsanti: **+ Aggiungi a questa settimana** (o la scritta «Già in questa settimana»), **Salto questo giro** (non
  se il conteggio parte già da oggi), **Cadenza**.

La riga della cadenza nella Settimana mette insieme le stesse cose: «Fatta il 6 ottobre · ogni 14 giorni · giro
aperto dal 20 ottobre».

### 5.3 Il calore

Entro la cadenza, niente. Oltre, la scheda **si scalda**: da 0 appena superata a 1 dopo un'altra cadenza intera, e
lì si ferma. L'intensità del colore si sceglie nel menu (§7). **Mai il rosso.**

Precedenze: una scheda **fatta** quel giorno è verde e basta; in un **giorno di riposo** le schede prendono la tinta
quieta del riposo, senza calore (il conteggio non cambia: il riposo descrive te, non la casa). In Casa, nel
promemoria e nella tabella conta se è di riposo **oggi**; sulle schede del telefono, il giorno mostrato;
nelle **settimane passate** niente calore. Il calore si vede in Casa, nel promemoria e sulle faccende della
settimana corrente (schede del telefono, nome nella tabella).

### 5.4 Salto questo giro

Il conteggio (e il calore) riparte da oggi; l'ultima volta mostrata resta quella vera. Sulla scheda: «Giro saltato
oggi.» (poi «ieri», poi la data) con **Annulla**, finché non segni di nuovo la faccenda. Un salto più vecchio
dell'ultima spunta non conta più.

### 5.5 Il foglio della faccenda

**Aggiungi una faccenda:** una voce che usi già (tra quelle che non sono ancora faccende) **oppure** un nome nuovo;
poi **Ogni quanto**: «Ogni settimana · 7 giorni», «Ogni 2 settimane · 14 giorni», «Ogni mese · 30 giorni»,
«Personalizzato» (un intero da 1 a 365; predefinito 14). Finché qualcosa non va, **Salva** resta spento e una riga
dice perché («Un numero intero, da 1 a 365.»; se il nome è già una faccenda: «… è già in Casa, ogni N giorni. La
cadenza si cambia dalla sua scheda.»). Una faccenda nuova **non entra in nessuna settimana**.

**Cadenza** (da una scheda): stesse scelte, più **Togli la cadenza**: la voce non è più una faccenda ed esce da Casa;
«la voce e le sue spunte restano».

Il foglio prende il fuoco, Esc lo chiude e il fuoco torna al pulsante che l'aveva aperto.

## 6. Rinominare e la Libreria

### 6.1 Rinominare

Toccando il nome di una voce (scheda del telefono, tabella della settimana corrente, scheda di Casa) si apre il
foglio **Rinomina**. Il nome nuovo vale **in tutte le settimane, anche nel passato**; la nota lo dice («Il nome
cambia in tutte le N settimane in cui compare, anche nel passato.») e ricorda che per una nota di una settimana sola
c'è il dettaglio. Non si salva un nome vuoto, riservato o già usato da un'altra voce: Salva resta spento e la nota
dice perché.

### 6.2 La Libreria

Oggi sta nel **menu** (§7), in un pannello richiudibile «Libreria delle attività (N)». Per ogni voce, in ordine
alfabetico: il nome, modificabile sul posto; «in N settimane · ultima: 12 ott», oppure «mai usata»; **Cancella**
solo per le voci mai usate.

- Rinominare da qui: se la voce compare in qualche settimana, prima una conferma che dice che il nome cambia
  ovunque, anche nel passato, e suggerisce di creare una voce nuova se si vuole cambiare solo da qui in avanti.
- Cancellare chiede conferma. Una voce usata **non si cancella**: fa parte dello storico (ma vedi §12).
- Libreria vuota: «La libreria è vuota: si riempie da sola quando aggiungi un'attività alla settimana.»
- Le voci nascono da sole quando le aggiungi a una settimana o crei una faccenda.

## 7. Il menu

Il pulsante **Menu** in alto a destra. Sul computer un pannello al centro, sul telefono sale dal basso. Si chiude con
×, Esc o un tocco fuori.

| Parte | Scelte | Vale per |
|---|---|---|
| **Tema** | Automatico (segue il sistema), Chiaro, Scuro | questo dispositivo |
| **Colore delle faccende** | Nessuno («Solo il testo.»), Morbido («Toni sabbia, leggeri.», predefinito), Deciso («Dal giallo all'arancio.»), con tre campioni ciascuno | tutti i dispositivi (viaggia con il file) |
| **Libreria delle attività** | §6.2 | — |
| **Versione** | «Versione: settimana-19», oppure «non installata (senza uso offline)» | — |

## 8. Dati

### 8.1 Dove sono

«Solo su questo dispositivo, nella memoria del browser. Non c'è un account né un server.» Sotto: **Ultimo file salvato
da qui** e **Ultima unione su questo dispositivo**, come «14 ottobre 2026 (ieri)» oppure «mai, finora».

### 8.2 L'invito alla copia

Se l'ultima copia salvata ha **più di 30 giorni** (o, se non ce n'è mai stata una, se usi l'app da più di 30 giorni):
un puntino sulla voce **Dati** della barra (per i lettori di schermo: «Dati, nuova copia consigliata») e in cima alla
sezione «L'ultima copia dei dati è di N giorni fa.» / «Non c'è ancora una copia dei dati.», «Conviene salvarne una
nuova, per sicurezza.», con **Salva il file**. Niente altro: nessuna notifica, nessun numero sul puntino. Salvando
spariscono.

### 8.3 Copia e altri dispositivi

- **Salva il file:** un file `settimana-sync-AAAA-MM-GG.json` con tutti i dati. Dove il browser lo permette (Chrome ed
  Edge su computer) si apre «Salva con nome» e la cartella la scegli tu; chiuderlo senza salvare non è un errore e la
  copia non risulta fatta. Altrimenti va nei download (sul telefono, la cartella Download). Una riga dice dove finirà.
- **Invia a…** (solo sul telefono, dove il sistema lo permette): lo stesso file, mandato con il menu Condividi (Drive,
  email…). Conta come copia salvata.
- **Unisci un file:** scegli un file di sincronizzazione. L'app controlla che lo sia («Non riesco a usare questo
  file…» altrimenti; oltre 20 MB lo rifiuta), calcola **senza toccare niente** quante modifiche porterebbe e chiede
  conferma: quando è stato salvato, quante modifiche nuove o più recenti porta, quante sono più vecchie e restano le
  tue. Se non porta niente: «Qui c'è già tutto quello che contiene il file: niente da unire.» Dopo l'unione si torna
  alla settimana corrente.
- **«Come funziona tra più dispositivi»:** una spiegazione chiusa, in tre passi, più l'avviso che svuotare i dati del
  browser o disinstallare l'app cancella i dati di quel dispositivo, non i file salvati.

### 8.4 CSV

Solo da leggere (Excel, Fogli), non si ricaricano. Separatore `;`, lettere accentate conservate.

- **Scarica la settimana:** la settimana mostrata in Settimana. Una riga per attività: nome, sette giorni, dettaglio.
  Ogni giorno è **Sì**, **No**, oppure **—** se l'attività quel giorno non era in programma e non è segnata. Poi la
  riga **Riposo** (Sì/No) e la riga **Energia** (Pesa, Ok, Leggero o «Non indicato»). Le date stanno
  nell'intestazione.
- **Scarica lo storico:** tutte le settimane con qualcosa dentro, in ordine, con il lunedì nella prima colonna. Se non
  ce n'è nessuna: «Non c'è ancora nessuna settimana con dati.»
- Un testo che inizia con `=`, `+`, `-` o `@` riceve un apostrofo davanti, perché Excel non lo scambi per una formula.

## 9. Più dispositivi, più schede

- **Ogni dispositivo ha tutti i dati.** Si scambiano solo con il file (§8.3). Fino all'unione un dispositivo non sa
  cosa hai fatto sull'altro.
- **Unire non cancella mai e non perde niente di più recente.** Ogni informazione (una spunta, un nome, un riposo…)
  vince per conto suo: vale la modifica più recente. Modifiche diverse sui due dispositivi si sommano. L'ordine delle
  unioni non conta; unire due volte lo stesso file non cambia niente; un file vecchio non toglie niente.
- **Togliere viaggia:** una voce tolta su un dispositivo non ricompare quando arriva il file vecchio dell'altro.
- **La stessa voce creata su due dispositivi** prima di unirli è una voce sola.
- **Una voce cancellata su un dispositivo ma usata sull'altro resta:** l'uso vince sulla cancellazione.
- **Ciò che fai dopo un'unione vince**, anche se l'orologio del dispositivo è indietro.
- **Due schede dello stesso browser** non si cancellano le modifiche a vicenda: ognuna riceve quelle dell'altra (se
  stai scrivendo in un campo, appena hai finito).
- **Versioni diverse dell'app** possono scambiarsi il file: una versione vecchia non mostra le informazioni che non
  conosce, ma non le perde.

## 10. App installabile e senza rete

- Si installa come app (Android, computer; iPhone dal menu Condividi di Safari, non ancora provato su un iPhone vero).
- **Senza rete si apre**, con i dati. Con la rete prende sempre la versione più recente.
- **Gli aggiornamenti non toccano i dati.**
- All'avvio l'app chiede al browser di non cancellare i dati quando lo spazio scarseggia; il browser può rifiutare,
  per questo la copia su file resta importante.
- Se i dati salvati nel browser sono rovinati: l'app ne tiene una copia a parte, riparte da zero e lo dice («I dati
  salvati non erano leggibili: ne ho tenuto una copia a parte e sono ripartito da zero.»).
- Se il browser non permette di salvare: «Qui non riesco a salvare: il browser blocca la memoria locale, oppure è
  piena.»

## 11. Messaggi

Le frasi di errore, tutte senza colpa né urgenza:

| Quando | Messaggio |
|---|---|
| nome vuoto | Il nome non può essere vuoto. |
| «Riposo» o «Energia» | «Riposo» ed «Energia» sono nomi riservati: hanno già la loro riga. |
| già nella settimana | «Nome» è già in questa settimana. |
| già nel giorno | «Nome» è già in questo giorno. |
| togliere da un giorno segnato | In questo giorno è segnata: per toglierla da qui, togli prima la spunta. |
| rinominare con un nome esistente | Esiste già la voce «Nome». |
| cancellare una voce usata | Questa voce compare nello storico: non si può cancellare. |
| faccenda con un nome già faccenda | «Nome» è già in Casa: la cadenza si cambia dalla sua scheda. |
| qualunque altro rifiuto | Non è andata: ho ricaricato la tabella, riprova. |

Le parole di colpa o di urgenza («in ritardo», «scaduta», «devi»…) non compaiono in nessuna sezione: un test lo
controlla.

## 12. Differenze note tra codice e intenzione

Trovate scrivendo questo documento (ottobre 2026). Ognuna va decisa: si corregge il codice, oppure si accetta e si
scrive qui come comportamento.

1. **Libreria: «mai usata» e Cancella per una voce che ha delle spunte.** Se una voce è stata segnata in una
   settimana e poi tolta da quella settimana, la Libreria la conta in 0 settimane: mostra «mai usata» e il pulsante
   Cancella; la conferma dice «Non compare in nessuna settimana, quindi non si perde niente»; poi il nucleo rifiuta
   («Questa voce compare nello storico: non si può cancellare.»). La regola del nucleo è giusta (le spunte sono
   storia); la Libreria conta solo le liste. Correzione proposta: la Libreria usa la stessa regola del nucleo, e per
   quella voce scrive per esempio «segnata, poi tolta» senza Cancella.
2. ~~`README.md` in ritardo in due punti~~ (la scheda di Casa descritta come «Fatta 16 giorni fa (martedì 6
   ottobre)», e `aggiornaFaccendeTabella()` che ora si chiama `aggiornaTabellaSulPosto()`): corretto insieme a questo
   documento.
