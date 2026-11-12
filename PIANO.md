# Il piano — Fase 2

Che cosa farà l'app alla fine della Fase 2, sezione per sezione, e con quali dati. È il riferimento **da verificare
prima del codice e da seguire durante**: se il codice deve allontanarsene, si cambia prima questo documento.

Ciò che l'app fa **oggi** è in `FUNZIONI.md`. Quando una fase di questo piano è finita, ciò che ha aggiunto o
cambiato entra in `FUNZIONI.md`, nella stessa modifica, ed esce da qui. Quando la Fase 2 è tutta in `FUNZIONI.md`,
questo file riparte con il piano della fase successiva.

Le chiavi del registro proposte qui (§10) entrano in `DATI.md` solo quando esistono davvero nel codice, una fase per
volta. Fino ad allora sono una proposta.

Base: l'anteprima della Fase 2 (ottobre 2026) e le decisioni scritte in `CLAUDE.md`. I punti ancora da decidere sono
raccolti nel §13 e segnati nel testo con **[da decidere]**.

## Indice

1. [Che cosa aggiunge](#1-che-cosa-aggiunge)
2. [Principi](#2-principi)
3. [Navigazione e Impostazioni](#3-navigazione-e-impostazioni)
4. [La Libreria nella sezione Settimana](#4-la-libreria-nella-sezione-settimana)
5. [I prodotti: un elenco solo per Alimenti e Scorte](#5-i-prodotti-un-elenco-solo-per-alimenti-e-scorte)
6. [Alimenti](#6-alimenti)
7. [Scorte](#7-scorte)
8. [Spese](#8-spese)
9. [Cucina: i pasti](#9-cucina-i-pasti)
10. [I dati: chiavi nuove](#10-i-dati-chiavi-nuove)
11. [Dati: sincronizzazione e CSV](#11-dati-sincronizzazione-e-csv)
12. [Ordine dei lavori, test e CI](#12-ordine-dei-lavori-test-e-ci)
13. [Punti da decidere](#13-punti-da-decidere)
14. [Fuori dalla Fase 2](#14-fuori-dalla-fase-2)

## 1. Che cosa aggiunge

| Sezione | Oggi | Dopo la Fase 2 |
|---|---|---|
| **Settimana** | attività, giorni, riposo, energia | uguale, più la **Libreria delle attività** (§4) |
| **Casa** | faccende con cadenza | uguale |
| **Cucina** | — | **nuova**: i pasti della settimana (Pasti) e cosa c'è in casa da mangiare (Alimenti) |
| **Spese** | — | **nuova**: quanto, per cosa, quando (Spese), più Alimenti e Scorte |
| **Dati** | file di sincronizzazione, CSV | uguale, con due CSV nuovi |
| **Impostazioni** | il «Menu» in alto a destra: tema, colore delle faccende, libreria | si chiama Impostazioni (ingranaggio): tema, colore delle faccende, menu del telefono, sezioni accese o spente; poi i colori |

I sottotitoli delle sezioni nuove, dall'anteprima:

- Cucina: «I pasti della settimana e quello che c'è in casa.»
- Spese: «Quanto, per cosa, quando. E cosa c'è in casa.»

Le frasi di principio, una per parte (si mostrano dove serve, non tutte insieme):
«Una settimana, non una gara.» · «La casa non dà voti.» · «Cosa mangi. Non cosa dovresti.» · «Stime, non sentenze.» ·
«Numeri, non giudizi.» · «Il detersivo non avvisa. Guardi tu.» · «Tuoi. Solo tuoi. Punto.»

## 2. Principi

Valgono quelli di `CLAUDE.md` (in particolare «Un vuoto non deve seguirti»). In più, per le parti nuove:

- **Stime, non sentenze.** Le quantità degli alimenti sono stimate dai movimenti (spese e pasti) e si correggono a
  mano con un tocco. L'app non pretende di sapere cosa c'è nel frigo: propone, e tu correggi.
- **Niente budget, niente confronti, niente punteggi.** Le spese mostrano totali per categoria e per mese, nient'altro:
  nessun limite da rispettare, nessun «hai speso più del mese scorso», nessuna barra rossa.
- **Niente è obbligatorio oltre il minimo.** Una spesa è un importo e una categoria; i prodotti sono facoltativi. Un
  pasto è un nome; gli ingredienti sono facoltativi. Un prezzo che manca non blocca niente: si elenca, e basta.
- **Le sezioni nuove si spengono.** Chi non vuole Cucina o Spese le spegne nelle Impostazioni: spariscono dal menu, i
  dati restano e continuano a viaggiare con il file.
- **Nessuna parte dà ordini.** Gli avvisi (alimento non aggiornato da tempo, scorta che sta finendo) sono
  informazioni dentro la loro sezione, non notifiche e non puntini rossi altrove. Unica eccezione, la Panoramica
  (§3.5.2 C5), con lo stesso tono.
- **Un file solo, nessun server.** Tutto continua a stare nel registro e nel file di sincronizzazione di oggi.

## 3. Navigazione e Impostazioni

### 3.1 Le sezioni

Ordine fisso: **Settimana, Casa, Cucina, Spese, Dati**. Il registro delle sezioni (`sezioni.js`) le riceve in
quest'ordine; una sezione spenta non compare nella navigazione (`FUNZIONI.md` §7).

Al primo avvio dopo l'aggiornamento non cambia niente di ciò che c'era: l'app riapre sulla sezione dell'ultima volta.

### 3.2–3.4 Navigazione e Impostazioni

**Fatto** (`settimana-20`, `-21`, `-22`, novembre 2026): la colonna sul computer con tutte le sezioni; sul telefono la
barra con tre posti scelti nelle Impostazioni (predefiniti Settimana, Casa, Dati) e «Altro» oltre le quattro sezioni,
oppure il ventaglio (con la Home Dati va in alto e i predefiniti della barra cambiano: §3.5.1); le Impostazioni con Tema, Colore delle faccende, Sezioni accese o spente (`i/spenta/<nome>`),
Menu del telefono e Versione. Il comportamento è descritto in `FUNZIONI.md` §2 e §7; le chiavi in `DATI.md`.

Resta da fare qui, quando arrivano: **Colori** e **Stile** nelle Impostazioni (dopo i moduli, §12). **Punteggio:** non
c'è; se mai arriverà, partirà spento e starà nelle Impostazioni. Spegnere Spese non spegne gli Alimenti dentro Cucina,
e viceversa: i prodotti sono di tutte e due (§5).

## 3.5 La Panoramica (la «Home»)

Decisa a novembre 2026, **prima della 2.2**: è struttura, e ogni sezione nuova nasce con la sua card. Anteprime:
«Home della settimana» e «Panoramica della settimana» (novembre 2026). **Il nome è «Panoramica»** (deciso: «Home»
collideva con «Casa»); nel codice la sezione si chiama `panoramica`. Nel resto del piano «Home» vuol dire questa.

### 3.5.1 Decisioni (novembre 2026)

- Una sezione in più, **la prima**: si apre **sempre all'avvio** (oggi l'app riapre sull'ultima sezione).
- **Card in ordine fisso**, lo stesso ordine ovunque (card, barra, «Altro», ventaglio, colonna del computer): quello
  del §3.1. Ogni card ha una riga «aperta oggi / ieri / lunedì / il 31 ottobre». Niente riordino dall'uso: la
  posizione non cambia sotto il pollice.
- **La barra del telefono la sceglie il proprietario** (rivisto lo stesso giorno: le cinque sezioni lavorano insieme,
  una barra fissa direbbe che l'app gira intorno a due). Al massimo tre posti più «Altro», mai riordinati dall'uso.
  Resta la scelta dei posti nelle Impostazioni della 2.1 (`settimana:barra`). Predefiniti: Panoramica, Settimana,
  Cucina; finché la Cucina non c'è (2.4), Panoramica, Settimana, Casa. **La Panoramica è fissa** al primo posto
  (deciso); si scelgono le altre due.
- **Dati esce dalla navigazione** e va **in alto**, nell'intestazione accanto all'ingranaggio, con il suo puntino:
  si vede da ogni sezione. È uno strumento come le Impostazioni, non una sezione: **non ha card**.

### 3.5.2 Regole agnostiche (decise a novembre 2026)

Valgono per la Home e per ogni card, qualunque sia la sezione. Si decidono prima del codice della struttura.

**Struttura**
- H1. **Una colonna** di card, sul telefono e sul computer (deciso con l'anteprima): lo stesso ordine di lettura
  ovunque. Nessun carosello, nessuna card nascosta: tutte visibili scorrendo.
- H2. Una card per sezione **accesa** che dichiara una card; una sezione spenta non ha card. Nessuna card «aggiungi».
- H3. La Home non ha dati propri nel registro: ogni card legge i dati della sua sezione. L'unico dato nuovo è
  quando una sezione è stata aperta, **nel browser** (`settimana:aperta`, per dispositivo: «aperta ieri su questo
  telefono»).

**Il contratto di una card**
- C1. Il descrittore di sezione ha un campo facoltativo `scheda(db, oggi)` che restituisce **solo testo**: un titolo
  breve e da zero a tre righe. Niente HTML: il disegno è della Home, uguale per tutte. Così la card si prova in Node.
- C2. **La card non ha azioni**: è un riepilogo, interattiva solo in quanto porta alla sezione. Nessuna spunta dalla
  Home: una card con controlli dentro ha più bersagli e più errori di tocco, e la Home diventerebbe una seconda copia
  della sezione.
- C3. Al massimo tre righe; il testo va a capo, non si tronca con «…».
- C4. Stato vuoto calmo: se non c'è niente da dire, una riga neutra («Niente in programma oggi»), mai una card vuota
  e mai un invito a fare.
- C5. Il linguaggio della sezione: date esplicite, niente pagelle, niente conteggi di ciò che manca, niente rosso.
  La prova di sempre: *se la ignoro per tre settimane, cosa mi dice?* **La Home è l'unico altrove ammesso** per gli
  avvisi del §2, e solo con lo stesso tono neutro della sezione.

**Frequenza**
- F1. Le card si ricalcolano **quando si disegna la Home**: all'avvio, al ritorno da una sezione, quando la pagina
  torna visibile (anche a cambio di giorno), quando arrivano dati da un altro dispositivo. **Nessun timer.**
- F2. Il conto è quello che fa la sezione (stesse funzioni del nucleo): la card non ricalcola a modo suo.

**Accessibilità**
- A1. Un `h1` per la Home, un `h2` per ogni card; ogni card è un `article` con **un solo controllo**, il titolo come
  pulsante, che con un velo trasparente rende toccabile tutta la card. Lo screen reader legge titolo e righe.
- A2. Ordine del fuoco: le card nell'ordine in cui si vedono; tornando alla Home dalla sezione, il fuoco va sulla card
  da cui si era partiti.
- A3. Bersaglio di tocco: tutta la card, almeno 48 px di altezza. Contrasto come il resto dell'app, in chiaro e scuro;
  carattere a 200 % senza scorrimento orizzontale (prova a 320 px, come per la navigazione).

### 3.5.3 Come si lavora

1. Si decidono le regole del §3.5.2 (fatto).
2. **La struttura nel codice** (fatto, `settimana-24`, novembre 2026; in `FUNZIONI.md` §2.1): la sezione, `scheda`
   nel descrittore, la Panoramica fissa nella barra, Dati in alto, le card con il solo titolo e la riga «aperta…».
   Confrontata con l'anteprima: card, colori, spazi e barra coincidono; restano diversi, voluti, il titolo e i
   pulsanti in alto, che sono quelli dell'app (sul computer con il nome accanto all'icona).
3. **Una card alla volta**: Settimana, poi Casa. Per ognuna: analisi della sezione, i candidati (cosa mostrare, come,
   perché), la decisione, il codice, il confronto con l'anteprima. Poi la successiva.
4. Spese (2.2) e Cucina (2.4) **chiudono con la propria card**, con lo stesso procedimento.

## 4. La Libreria nella sezione Settimana

**Fatto** (`settimana-20`, novembre 2026): il pannello sta in fondo alla sezione Settimana, e «usata» segue la regola
del nucleo («tolta dalle settimane · ultima spunta: 13 ott» per una voce segnata e poi tolta, senza Cancella). Il
comportamento è descritto in `FUNZIONI.md` §6.2. Nel codice: `libreria.js` è nel gruppo Settimana (livello 3) e lo
disegna `disegnaSettimana`; il foglio «Rinomina», che usano anche le altre sezioni, è uscito in `rinomina.js`, nei
comuni.

## 5. I prodotti: un elenco solo per Alimenti e Scorte

Alimenti e Scorte sono due viste dello **stesso elenco di prodotti**. Un prodotto ha:

| Campo | Valori | Note |
|---|---|---|
| nome | testo, come i nomi delle voci | l'identificativo si ricava dal nome (`slug`), come per le voci |
| tipo | **alimento** o **scorta** | decide in quale vista compare |
| dove | alimento: Dispensa / Frigo / Freezer · scorta: Bagno / Pulizie / Altro | il gruppo in cui compare |
| confezione | testo libero facoltativo («500 g», «6 rotoli») | solo da leggere: l'app non fa conti con i grammi |
| prezzo di una confezione | in euro, facoltativo | l'ultimo noto: lo aggiorna una spesa con il prezzo, o lo scrivi a mano |

Un prodotto entra nell'elenco in tre modi: aggiunto a mano (Aggiungi un alimento / una scorta), da una spesa con i
prodotti (§8), da un ingrediente di un pasto (§9) che non c'era.

**Cancellare un prodotto:** solo se non compare in nessuna spesa e in nessun pasto (come le voci della libreria: ciò
che è nello storico non si cancella). Un prodotto che non compri più si lascia a «Finito»: sta nel gruppo dei finiti
e non disturba.

## 6. Alimenti

Si vedono in **Cucina → Alimenti** e in **Spese → Alimenti** (la stessa lista: in Cucina per decidere cosa mangiare,
in Spese accanto a ciò che compri).

### 6.1 Quantità

Le quantità si mostrano a parole, mai con un numero: **Finito · Poco · Metà · Una confezione · Due o più**.

Sotto c'è un numero (in sessantesimi di confezione, §10.2), ricavato così:

> quantità = ultima correzione a mano + entrate (spese) − uscite (pasti mangiati) registrate **dopo** quella correzione

- **Entrano** con le spese che hanno i prodotti: «2 confezioni di pasta» aggiunge due confezioni.
- **Escono** con i pasti segnati come mangiati: «pasta, un quarto» toglie un quarto di confezione.
- **Si correggono a mano**: «Correggi» apre le cinque parole e scegli quella vera. La correzione azzera il conto:
  da lì in poi contano solo i movimenti nuovi.
- **«È ancora così»** conferma la stima senza cambiarla: serve solo a dire «l'ho guardato oggi» (§6.3).

Non si va mai sotto zero: una quantità negativa si mostra «Finito».

**Le parole e le soglie** (decise a novembre 2026: cinque parole). In confezioni: Finito = 0; Poco = più di 0 e fino a un terzo;
Metà = oltre un terzo e meno di tre quarti; Una confezione = da tre quarti a meno di una e mezza; Due o più = da una e
mezza in su. Una correzione scrive il valore centrale della parola scelta: Finito 0, Poco ¼, Metà ½, Una 1, Due 2.

### 6.2 Gruppi

Raggruppati per **dove** (Dispensa, Frigo, Freezer), più un gruppo **Finiti** in fondo, chiuso di partenza, con il
pulsante «Ne ho ancora» (che è una correzione: chiede quanto).

Ogni riga: nome, quantità a parole, confezione se c'è, «Correggi». Nessun colore che giudica (niente rosso per
«Poco»).

### 6.3 Da quanto non li guardi

Un alimento è **aggiornato** l'ultima volta che: l'hai corretto, hai detto «È ancora così», è entrato con una spesa o
è uscito con un pasto. Se in un gruppo il più vecchio non è aggiornato da **14 giorni o più**, in testa al gruppo
compare una riga sola, informativa:

> Il più vecchio: Yogurt, 18 giorni fa.

Un tocco porta all'alimento. Nessun avviso fuori dalla sezione, nessun conteggio di «quanti sono vecchi».

## 7. Scorte

Si vedono in **Spese → Scorte**. Detersivi, sapone, carta e il resto: non calano da soli, li aggiorni tu.

- **Tre stati, niente quantità:** **C'è · Sta finendo · Finito.** Un tocco sulla scorta cambia lo stato.
- **Gruppi** per dove: Bagno, Pulizie, Altro.
- **Da ricomprare:** in testa, la lista delle scorte «Sta finendo» o «Finito». È solo una lista da leggere (o da
  copiare a mano sulla lista della spesa); non avvisa altrove.
- Una spesa che contiene una scorta la rimette a **C'è**.

«Il detersivo non avvisa. Guardi tu.»

## 8. Spese

**Spese → Spese.** Il mese corrente, con ‹ › per gli altri mesi.

### 8.1 Una spesa

| Campo | Obbligatorio | Valori |
|---|---|---|
| **Importo** | sì | euro, con i centesimi, più di zero |
| **Categoria** | sì | Supermercato · Uscite · Casa · Trasporti |
| **Quando** | sì (predefinito: oggi) | Oggi · Ieri · un giorno del mese |
| **Nota** | no | testo breve |
| **Prodotti** | no | righe: prodotto, quanti (confezioni), prezzo cad. (facoltativo) |

Sui prodotti:

- Ogni riga sceglie un prodotto esistente o ne crea uno nuovo: «Alimento» oppure «Altro: va nelle scorte».
- Una riga di **alimento** fa entrare quelle confezioni negli Alimenti (§6.1); una riga di **scorta** rimette la scorta
  a «C'è» (§7). Una riga con il prezzo aggiorna il prezzo di una confezione del prodotto (§5).
- **«Usa la somma come importo»**: se le righe hanno i prezzi, un tocco mette la loro somma nell'importo. Non è
  automatico: l'importo è quello dello scontrino, i prodotti possono essere solo alcuni.
- Senza prodotti la spesa conta lo stesso; solo, alimenti e scorte non lo sanno.

Modificare una spesa aggiorna i suoi movimenti (se cambi «2 confezioni» in «3», gli alimenti ne vedono 3).
**Togliere una spesa** chiede conferma e annulla anche i suoi movimenti.

**[da decidere] Le categorie.** Le quattro dell'anteprima sono fisse. Si possono aggiungere categorie proprie? La
proposta è: fisse nella 2.3, si rivede dopo l'uso.

### 8.2 Il mese

- **Per categoria:** una riga per categoria con il totale del mese; un tocco apre le spese di quella categoria (data,
  importo, nota, prodotti). Una categoria senza spese: «Nessuna spesa in questa categoria, a ottobre.»
- **In tutto, a ottobre:** il totale.
- Nient'altro: niente budget, niente confronto con altri mesi, niente grafici di andamento. «Numeri, non giudizi.»

## 9. Cucina: i pasti

**Cucina → Pasti.** La settimana corrente (la stessa settimana mostrata nella sezione Settimana), giorno per giorno,
con **cinque momenti** (deciso a novembre 2026), sempre in quest'ordine:

| Momento | Chiave | Etichetta proposta |
|---|---|---|
| colazione | `colazione` | Colazione |
| merenda di metà mattina | `mattina` | Metà mattina |
| pranzo | `pranzo` | Pranzo |
| merenda del pomeriggio | `pomeriggio` | Merenda |
| cena | `cena` | Cena |

Le etichette sono una proposta: **le parole le sceglie Michele** (§13). Le chiavi restano quelle, qualunque etichetta
si scelga.

**Nessun momento è obbligatorio.** Un momento vuoto è solo vuoto: niente «saltato», niente conteggi di quanti
momenti sono pieni, niente segni sulla striscia dei giorni per i vuoti. Una merenda che non fai non ha bisogno di
essere spiegata.

### 9.1 Un pasto

- **Il piatto:** un nome («Pasta al pomodoro»). Basta questo.
- **Ingredienti, a occhio:** facoltativi. Ognuno è un alimento con una parte di confezione: **un decimo, un quinto,
  un quarto, un terzo, metà, intera** (e più confezioni intere). Niente grammi. Si aggiungono dagli Alimenti; un
  ingrediente nuovo crea l'alimento.
- **Piatti già fatti:** scrivendo il nome, l'app propone i piatti già fatti; sceglierne uno copia i suoi ingredienti
  (dall'ultima volta che l'hai fatto). Non c'è un ricettario a parte: i piatti già fatti sono i pasti passati.
- **Mangiato:** una spunta. Segnare un pasto come mangiato fa **uscire** i suoi ingredienti dagli Alimenti; togliere
  la spunta li fa rientrare. Cambiare gli ingredienti di un pasto già mangiato non tocca gli alimenti (lo dice una
  riga sotto il pasto); per correggere, si toglie la spunta e si rimette.
- **Togli il pasto:** con conferma se è già segnato come mangiato (e allora i suoi ingredienti rientrano).

**[da decidere] Un piatto o più piatti per pasto.** L'anteprima ne aveva uno per Pranzo e uno per Cena. Proposta: uno
per momento nella 2.4; se serve «primo e secondo», si scrivono nello stesso nome o si aggiunge dopo.

### 9.2 Il costo

- **Costo stimato di un pasto:** somma, per ogni ingrediente, della parte di confezione per il prezzo di una
  confezione.
- **Costo della settimana:** due righe, «Pasti mangiati» e «Ancora in programma».
- **Un prezzo che manca non blocca:** il costo si calcola con i prezzi che ci sono, e sotto si elencano gli alimenti
  senza prezzo («Senza prezzo: basilico, olio»). Nessun «costo incompleto» in evidenza.

### 9.3 Telefono

Come la Settimana: la striscia dei giorni in alto, il giorno scelto sotto con i cinque momenti. Sul computer, i sette
giorni affiancati (o in tabella) **[da decidere nella 2.4 con un'anteprima]**: con cinque momenti sono 35 caselle, e
una tabella così piena va provata prima di sceglierla (un'alternativa: un giorno alla volta anche sul computer).

## 10. I dati: chiavi nuove

Tutto nel registro di oggi (`{v,t,d}` per chiave, l'ultimo scritto vince). Due problemi nuovi, e come si risolvono.

### 10.1 Quantità: movimenti, non un numero

Se la quantità di un alimento fosse una chiave sola (`quantità = 2`), due dispositivi che la cambiano prima di unirsi
si sovrascriverebbero: mangi un quarto di pasta sul telefono, ne compri due confezioni sul computer, e dopo l'unione
resta uno solo dei due cambiamenti. Per questo **ogni entrata e ogni uscita è una chiave a sé** (un movimento), con un
identificativo che non si ripete su nessun dispositivo; la quantità si calcola sommando. Due movimenti non si toccano
mai, come le spunte di due giorni diversi.

**Identificativo di un movimento, di una spesa, di una riga:** `<momento in base 36>-<dispositivo>`, scritto una volta
alla creazione e mai cambiato. Contiene il momento di nascita: serve a sapere se un movimento è **dopo** l'ultima
correzione (§6.1). Esempio: `mgq3k2a1-d4f2a91bc`.

La correzione invece è una chiave sola (vince l'ultima): è giusto così, perché «ho guardato: è metà» annulla tutto ciò
che c'era prima. Conta solo i movimenti nati dopo il momento della correzione (il suo `t`).

Limite dichiarato: «dopo» si giudica con gli orologi dei dispositivi. Se l'orologio del telefono è molto indietro,
un movimento fatto lì può essere contato o no in modo sbagliato. È una stima; la prossima correzione rimette a posto.

### 10.2 Unità: sessantesimi di confezione

Le parti ammesse (un decimo, un quinto, un quarto, un terzo, metà, intera) diventano numeri interi se l'unità è un
**sessantesimo di confezione**: 6, 12, 15, 20, 30, 60. Niente virgole nel registro, niente errori di arrotondamento
nelle somme. Lo schermo non mostra mai questi numeri.

### 10.3 Le chiavi

Nuovi primi segmenti: **`p`** (prodotto) e **`u`** (spesa: «uscita»; `s` è già la settimana). I pasti stanno dentro
la settimana, con **`k`** (cucina). Tutte rispettano la forma che `valida()` conserva anche nelle versioni vecchie
dell'app (`lettera/segmenti`, valore semplice): un telefono non ancora aggiornato non le mostra ma non le perde.

| Chiave | Valore | Che cosa |
|---|---|---|
| `i/spenta/<nome>` | `true` / `false` | **2.1:** la sezione `<nome>` (`cucina`, `spese`) è spenta (§3.4) |
| `p/<id>/nome` | testo | il nome del prodotto |
| `p/<id>/tipo` | `"alimento"` / `"scorta"` | in quale vista compare |
| `p/<id>/dove` | `"dispensa"` `"frigo"` `"freezer"` / `"bagno"` `"pulizie"` `"altro"` | il gruppo |
| `p/<id>/conf` | testo breve | la confezione, solo da leggere |
| `p/<id>/prezzo` | intero, centesimi, o `null` | prezzo di una confezione |
| `p/<id>/del` | `true` / `false` | cancellato (solo se mai usato) |
| `p/<id>/q` | intero ≥ 0, sessantesimi | **alimento:** l'ultima correzione a mano |
| `p/<id>/visto` | `AAAA-MM-GG` | **alimento:** «È ancora così» o correzione, per §6.3 |
| `p/<id>/mov/<mid>` | intero (± sessantesimi) o `null` | **alimento:** un movimento; `null` = annullato |
| `p/<id>/stato` | `"c"` / `"sf"` / `"f"` | **scorta:** C'è / Sta finendo / Finito |
| `u/<sid>/euro` | intero > 0, centesimi | l'importo |
| `u/<sid>/cat` | `"supermercato"` `"uscite"` `"casa"` `"trasporti"` | la categoria |
| `u/<sid>/data` | `AAAA-MM-GG` | il giorno della spesa |
| `u/<sid>/nota` | testo breve | facoltativa |
| `u/<sid>/del` | `true` / `false` | spesa tolta |
| `u/<sid>/r/<n>/p` | id di un prodotto | riga `n` (0, 1, 2…): il prodotto |
| `u/<sid>/r/<n>/n` | intero ≥ 1 | quante confezioni |
| `u/<sid>/r/<n>/c` | intero, centesimi, o `null` | prezzo cad. |
| `s/<lunedì>/k/<giorno>/<pasto>/nome` | testo | `<pasto>` = `colazione` / `mattina` / `pranzo` / `pomeriggio` / `cena` (§9): il piatto |
| `s/<lunedì>/k/<giorno>/<pasto>/i/<pid>` | intero > 0, sessantesimi, o `null` | un ingrediente; `null` = tolto |
| `s/<lunedì>/k/<giorno>/<pasto>/m` | id di movimento o `''` | mangiato: l'identificativo usato per i suoi movimenti |

Come si collegano:

- **Riga di spesa → movimento.** La riga `n` della spesa `<sid>` di un alimento scrive
  `p/<pid>/mov/<sid>-<n>` = confezioni × 60. Modificarla riscrive lo stesso movimento; togliere la spesa scrive
  `null`. Il momento di nascita è quello della spesa (è nel `<sid>`).
- **Pasto mangiato → movimenti.** Segnarlo genera un identificativo `<mid>`, lo scrive in `…/m` e scrive per ogni
  ingrediente `p/<pid>/mov/<mid>` = −parte. Togliere la spunta scrive `null` su quei movimenti e `''` in `…/m`. Così
  gli ingredienti cambiati dopo non toccano i movimenti già scritti.
- **Riga di spesa di una scorta:** nessun movimento, scrive `p/<pid>/stato` = `"c"`.
- **Riga con prezzo:** scrive anche `p/<pid>/prezzo` (vince l'ultima, come sempre).

**`p/<id>/visto` resta** (deciso a novembre 2026). Serve a «È ancora così», che dice «l'ho guardato oggi» senza
cambiare la quantità. L'alternativa scartata: riscrivere la stessa correzione (`q` con lo stesso valore), che però
azzera i movimenti, ed è sbagliato se nel frattempo la stima si era spostata.

### 10.4 Quanto cresce il registro

Una spesa con due prodotti sono circa dieci chiavi; un pasto con tre ingredienti circa cinque, più tre movimenti.
A occhio, un anno d'uso quotidiano aggiunge qualche centinaio di kilobyte: il limite di `localStorage` (circa 5 MB) è
lontano. Non è prevista una compattazione; si misura alla fine della 2.4 e se ne riparla se serve.

## 11. Dati: sincronizzazione e CSV

- **Il file di sincronizzazione non cambia formato.** Spese, pasti, alimenti e scorte vanno nello stesso file della
  settimana e della casa. Salva, Invia a e Unisci restano come sono. La `versione` del file resta 1: le chiavi nuove
  sono chiavi in più, e le versioni vecchie le conservano (§10.3).
- **Due CSV nuovi** nella sezione Dati, con lo stesso stile di quelli di oggi (`;`, BOM, date italiane):
  - **Spese del mese** — una riga per spesa (data, categoria, importo, nota) e una riga per ogni prodotto segnato
    (prodotto, quanti, prezzo cad.), sotto la sua spesa. Il mese è quello scelto nella sezione Spese.
  - **Alimenti e scorte** — una riga per prodotto: nome, tipo, dove, quantità a parole o stato, confezione, ultimo
    prezzo, ultimo aggiornamento.
- Una sezione spenta non toglie il suo CSV (i dati ci sono ancora) **[da decidere: o lo nasconde]**.
- `DATI.md` riceve le chiavi della §10.3 fase per fase, quando esistono.

## 12. Ordine dei lavori, test e CI

Una fase per volta: test verdi e push tra l'una e l'altra, `CLAUDE.md` e `DATI.md` aggiornati nella stessa fase.

**2.1 Impostazioni, navigazione, Libreria: fatta** (`settimana-20`, `-21`, `-22`, novembre 2026), in tre passi:
la Libreria nella Settimana; il Menu diventa Impostazioni, con le sezioni accese o spente; la navigazione (barra con
Altro, ventaglio, Menu del telefono). Si prova con sezioni finte, «Orto» e «Serra» (`conSezioneFinta` in `aiuti.js`).

**Home** (prima della 2.2): regole, struttura, poi una card alla volta (§3.5.3).
- Test: la Home si apre all'avvio; le card seguono l'ordine del §3.1 e saltano le sezioni spente; una card per sezione
  finta; Dati dall'intestazione con il puntino; le funzioni `scheda` provate in Node.

**2.2 Prodotti: Alimenti e Scorte**
- Nucleo: chiavi `p/…`, movimenti, correzione, calcolo della quantità, stati delle scorte.
- Dove si vedono prima che esistano Spese e Cucina: la sezione **Spese** nasce qui con le sole schede Alimenti e
  Scorte (deciso a novembre 2026); la scheda Spese arriva nella 2.3, gli Alimenti dentro Cucina nella 2.4.
- Test di proprietà: movimenti da più dispositivi uniti in ordine qualunque danno sempre la stessa quantità; una
  correzione conta solo i movimenti nati dopo; nessuna quantità negativa a schermo.
- Chiude con la card della sezione Spese nella Home (§3.5.3).

**2.3 Spese**
- Spese con prodotti, il mese, i totali per categoria, il CSV «Spese del mese».
- Test: una spesa con alimenti fa salire la quantità; modificarla e toglierla la riporta; una scorta torna «C'è».

**2.4 Cucina**
- Pasti, ingredienti, piatti già fatti, mangiato, costo; CSV «Alimenti e scorte».
- Prima del codice, un'anteprima della vista sul computer (§9.3).
- Chiude con la card della Cucina, che diventa predefinita nella barra al posto di Casa (§3.5.1).
- Test: mangiato e non mangiato muovono gli alimenti; ingredienti cambiati dopo non li toccano; costo con un prezzo
  mancante.

**Poi: i colori e lo stile.** Le palette (Brace predefinita, Pesca, Salvia, Nebbia, Grafite, Contrasto a 7:1) e lo
stile **Grezzo/Quieto** (dall'anteprima: Grezzo = bordi netti, titoli in maiuscolo, una frase per sezione, le frasi
del §1; Quieto = angoli morbidi, ombre leggere, nessuna frase), insieme e una volta sola sui moduli completi (confermato
a novembre 2026). Prima del codice, un'anteprima. I motivi decorativi dopo ancora.

**CI**, quando arrivano i moduli: un job per motore in parallelo, e il test di accessibilità diviso per sezione.

## 13. Punti da decidere

Si chiudono prima della fase che li usa, non tutti insieme.

**Decisi** (novembre 2026):

| Punto | Decisione | Dove |
|---|---|---|
| Quali sezioni stanno nella barra del telefono | tre posti scelti nelle Impostazioni, più «Altro»; predefiniti Panoramica, Settimana, Cucina (Casa fino alla 2.4) | §3.5.1 |
| Panoramica sul computer | una colonna, come sul telefono | §3.5.2 H1 |
| Ordine delle card della Home | fisso, lo stesso ovunque, con «aperta ieri» | §3.5.1 |
| Dati | in alto, accanto all'ingranaggio, con il puntino; niente card | §3.5.1 |
| Nome della Home | «Panoramica» | §3.5 |
| La Panoramica nella barra | fissa al primo posto, più due posti scelti | §3.5.1 |
| Regole della Home | card senza azioni; la Home unico altrove ammesso; «aperta…» nel browser; le altre del §3.5.2 | §3.5.2 |
| Sezioni accese/spente | valgono su tutti i dispositivi (`i/spenta/<nome>`) | §3.4 |
| I momenti dei pasti | cinque: colazione, metà mattina, pranzo, merenda del pomeriggio, cena | §9 |
| Ordine delle fasi | quello del §12; la Cucina non serve prima | §12 |
| La Libreria che dice «mai usata» per una voce con spunte | si corregge dentro la 2.1: «tolta dalle settimane · ultima spunta: 12 ott» | §4 |
| Dove si vedono Alimenti e Scorte nella 2.2 | la sezione Spese nasce con quelle due schede | §12 |
| Le parole di quantità | cinque: Finito · Poco · Metà · Una confezione · Due o più, con le soglie del §6.1 | §6.1 |
| `p/<id>/visto` | resta: «È ancora così» non tocca la quantità | §10.3 |

**Aperti:**

| # | Punto | Proposta | Si decide prima di | Dove |
|---|---|---|---|---|
| 1 | Categorie di spesa proprie | no nella 2.3, si rivede dopo l'uso | 2.3 | §8.1 |
| 2 | Il CSV di una sezione spenta | resta | 2.3 | §11 |
| 3 | Un piatto o più per pasto | uno per momento nella 2.4 | 2.4 | §9.1 |
| 4 | Cucina sul computer | anteprima prima della 2.4 | 2.4 | §9.3 |
| 5 | Le etichette dei cinque momenti | Colazione, Metà mattina, Pranzo, Merenda, Cena | 2.4 | §9 |

## 14. Fuori dalla Fase 2

Idee raccolte, non pianificate: grafici delle bollette dai PDF; inserire i prodotti con il codice a barre; tenere
traccia del tempo senza giudizio. Nessuna pubblicità e nessun punteggio, mai.

**Da discutere dopo la Fase 2: le calorie** (proposta di Michele, novembre 2026). Una parte che, dato un minimo
giornaliero, dica se ciò che è segnato in Cucina basta. Si appoggerebbe ai pasti e agli alimenti della 2.4; va
discussa per intero prima di entrare nel piano, anche rispetto ai principi del §2.
