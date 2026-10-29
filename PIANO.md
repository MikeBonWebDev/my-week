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
  informazioni dentro la loro sezione, non notifiche e non puntini rossi altrove.
- **Un file solo, nessun server.** Tutto continua a stare nel registro e nel file di sincronizzazione di oggi.

## 3. Navigazione e Impostazioni

### 3.1 Le sezioni

Ordine fisso: **Settimana, Casa, Cucina, Spese, Dati**. Il registro delle sezioni (`sezioni.js`) le riceve in
quest'ordine; una sezione spenta (§3.4) non si registra nel menu.

Al primo avvio dopo l'aggiornamento non cambia niente di ciò che c'era: l'app riapre sulla sezione dell'ultima volta.

### 3.2 Il menu sul computer

Sullo schermo largo la barra delle sezioni le mostra tutte (sono al massimo cinque): nessun «Altro».

### 3.3 Il menu sul telefono

**Predefinito: la barra di oggi più «Altro».** La barra in basso tiene tre sezioni e una voce **Altro**; Altro apre un
foglio con le sezioni rimaste. Se le sezioni accese sono quattro o meno, Altro non c'è e la barra le mostra tutte.

**[da decidere] Quali tre sezioni stanno nella barra.** Due strade:

- **Fisse, scelte da te (consigliata).** Predefinite: Settimana, Casa, Dati (la barra di oggi, così chi aggiorna non
  trova niente spostato). Nelle Impostazioni si sceglie quali tre. Ragione: la posizione di un pulsante non cambia
  mai se non lo decidi tu; la memoria del dito vale più dell'ottimizzazione.
- **Le più usate.** Come nell'anteprima: la barra mostra le sezioni che apri più spesso, ricalcolate solo quando
  riapri l'app, mai mentre la usi. Ragione più forte: zero configurazione, e Cucina sale da sola se la usi ogni giorno.
  Contro: una barra che si riordina da sola, anche solo alla riapertura, è proprio ciò che chiede attenzione.

**Il menu a ventaglio** (radiale) resta selezionabile nelle Impostazioni: un solo pulsante in basso che si apre a
ventaglio su tutte le sezioni. La scelta barra/ventaglio vale per il dispositivo (non viaggia con il file: si può
volere il ventaglio sul telefono e la barra sul tablet).

La sezione aperta resta marcata (`aria-current="page"`) anche quando sta dentro Altro: la voce Altro si mostra attiva
e il foglio indica quale sezione è aperta.

### 3.4 Impostazioni

Il pulsante in alto a destra diventa un ingranaggio, con etichetta «Impostazioni». Il foglio contiene, in ordine:

| Parte | Che cosa | Vale per |
|---|---|---|
| **Tema** | automatico / chiaro / scuro, come oggi (`FUNZIONI.md` §7) | questo dispositivo |
| **Colore delle faccende** | nessuno / morbido / deciso, come oggi (`i/intensita`) | tutti i dispositivi |
| **Menu del telefono** | barra con Altro / ventaglio; con la barra, quali tre sezioni (se si sceglie la strada «fisse», §3.3) | questo dispositivo |
| **Sezioni** | Cucina e Spese: accesa / spenta. Settimana, Casa e Dati non si spengono | **[da decidere]** tutti i dispositivi o solo questo |
| **Colori** e **Stile** | le palette e lo stile; arrivano dopo i moduli (§12) | — |
| **Versione** | come oggi, in fondo | — |

La Libreria **esce** dalle Impostazioni e va nella sezione Settimana (§4).

**Punteggio:** non c'è. Se mai arriverà, partirà spento e starà qui.

**Sezione spenta:** sparisce dalla barra, da Altro e dal ventaglio. I suoi dati restano nel registro, viaggiano con il
file, finiscono nei CSV. Riaccenderla la ritrova com'era. Se l'app si riapre su una sezione spenta, apre la prima.
Spegnere Spese non spegne gli Alimenti dentro Cucina, e viceversa: i prodotti sono di tutte e due (§5).

## 4. La Libreria nella sezione Settimana

Decisione: la Libreria delle attività sta nella sezione **Settimana**, perché parla delle attività della settimana e
non del funzionamento dell'app.

- **Dove:** un pannello richiudibile in fondo alla sezione Settimana, sotto la lista (o la tabella), chiuso di
  partenza: «Libreria delle attività (N)». Stesso contenuto di oggi: nome modificabile, in quante settimane compare,
  ultima volta usata, «Cancella» solo per le voci mai usate, lo stesso testo di spiegazione.
- **Comportamento:** identico a oggi (`FUNZIONI.md` §6.2). Si sposta, non cambia.
- **Codice:** `js/libreria.js` passa dal gruppo Menu al gruppo **Settimana** (livello 5, come `azioni.js`); la
  disegna `disegnaSettimana` invece di `disegnaAnche` in `guscio.js`. La regola «una sezione non importa un'altra
  sezione» resta: la libreria è parte della Settimana. Da aggiornare `test/struttura.test.js` (gruppi) e i test nel
  browser che aprono il menu per arrivare alla libreria (`pagina.spec.js`).
- **Telefono:** il pannello sta in fondo alla vista del giorno, dopo le schede.

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

**[da decidere] Le soglie tra le parole.** Proposta, in confezioni: Finito = 0; Poco = più di 0 e fino a un terzo;
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
con **Pranzo** e **Cena**.

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

**[da decidere] Un piatto o più piatti per pasto.** L'anteprima ne ha uno per Pranzo e uno per Cena. Proposta: uno
solo nella 2.4; se serve «primo e secondo», si scrivono nello stesso nome o si aggiunge dopo.

### 9.2 Il costo

- **Costo stimato di un pasto:** somma, per ogni ingrediente, della parte di confezione per il prezzo di una
  confezione.
- **Costo della settimana:** due righe, «Pasti mangiati» e «Ancora in programma».
- **Un prezzo che manca non blocca:** il costo si calcola con i prezzi che ci sono, e sotto si elencano gli alimenti
  senza prezzo («Senza prezzo: basilico, olio»). Nessun «costo incompleto» in evidenza.

### 9.3 Telefono

Come la Settimana: la striscia dei giorni in alto, il giorno scelto sotto con Pranzo e Cena. Sul computer, i sette
giorni affiancati (o in tabella) **[da decidere nella 2.4 con un'anteprima]**.

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
| `s/<lunedì>/k/<giorno>/<pasto>/nome` | testo | `<pasto>` = `pranzo` / `cena`: il piatto |
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

**[da decidere] `p/<id>/visto`** potrebbe non servire: il «quando l'hai guardato» si può ricavare dal `t` della
correzione e dai movimenti. Serve solo per «È ancora così», che non cambia la quantità. Alternativa: «È ancora così»
riscrive la stessa correzione (`q` con lo stesso valore) — ma allora azzera i movimenti, che è sbagliato se nel
frattempo la stima si era spostata. Proposta: tenere `visto`.

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

**2.1 Impostazioni, navigazione, Libreria**
- Il Menu diventa Impostazioni; Libreria nella Settimana (§4); barra con Altro e ventaglio (§3.3); sezioni accese o
  spente (§3.4), anche se all'inizio non c'è ancora niente da spegnere (si prova con sezioni finte nei test).
- Test: navigazione con Altro e con il ventaglio, tastiera e lettore di schermo (axe), riapertura su una sezione
  spenta, libreria dalla sezione Settimana.

**2.2 Prodotti: Alimenti e Scorte**
- Nucleo: chiavi `p/…`, movimenti, correzione, calcolo della quantità, stati delle scorte.
- Dove si vedono prima che esistano Spese e Cucina: la sezione **Spese** nasce qui con le sole schede Alimenti e
  Scorte; la scheda Spese arriva nella 2.3 **[da decidere: o una sezione provvisoria]**.
- Test di proprietà: movimenti da più dispositivi uniti in ordine qualunque danno sempre la stessa quantità; una
  correzione conta solo i movimenti nati dopo; nessuna quantità negativa a schermo.

**2.3 Spese**
- Spese con prodotti, il mese, i totali per categoria, il CSV «Spese del mese».
- Test: una spesa con alimenti fa salire la quantità; modificarla e toglierla la riporta; una scorta torna «C'è».

**2.4 Cucina**
- Pasti, ingredienti, piatti già fatti, mangiato, costo; CSV «Alimenti e scorte».
- Prima del codice, un'anteprima della vista sul computer (§9.3).
- Test: mangiato e non mangiato muovono gli alimenti; ingredienti cambiati dopo non li toccano; costo con un prezzo
  mancante.

**Poi: i colori.** Le palette (Brace predefinita, Pesca, Salvia, Nebbia, Grafite, Contrasto a 7:1) e lo stile, una
volta sola sui moduli completi. I motivi decorativi dopo ancora.

**CI**, quando arrivano i moduli: un job per motore in parallelo, e il test di accessibilità diviso per sezione.

## 13. Punti da decidere

| # | Punto | Proposta | Dove |
|---|---|---|---|
| 1 | Quali sezioni stanno nella barra del telefono | fisse, scelte nelle Impostazioni; predefinite Settimana, Casa, Dati | §3.3 |
| 2 | Sezioni accese/spente: per tutti i dispositivi o per questo | per tutti (`i/…`): è una scelta su cosa usi, non sullo schermo | §3.4 |
| 3 | Soglie delle parole di quantità | quelle del §6.1 | §6.1 |
| 4 | Categorie di spesa proprie | no nella 2.3, si rivede dopo l'uso | §8.1 |
| 5 | Un piatto o più per pasto | uno nella 2.4 | §9.1 |
| 6 | Cucina sul computer | anteprima prima della 2.4 | §9.3 |
| 7 | `p/<id>/visto` | tenerlo | §10.3 |
| 8 | Il CSV di una sezione spenta | resta | §11 |
| 9 | Dove si vedono Alimenti e Scorte nella 2.2 | la sezione Spese nasce con quelle due schede | §12 |

## 14. Fuori dalla Fase 2

Idee raccolte, non pianificate: grafici delle bollette dai PDF; inserire i prodotti con il codice a barre; tenere
traccia del tempo senza giudizio. Nessuna pubblicità e nessun punteggio, mai.
