/* ─────────────────────────────────────────────────────────────────────────────
   core.js — il nucleo di «La mia settimana».

   Qui ci sono solo dati e regole: niente pagina, niente browser. La pagina lo usa
   come window.SettimanaCore, i test lo caricano in Node con require().

   L'IDEA
   Ogni dispositivo tiene una copia completa dei dati, in forma di REGISTRO PIATTO:
   tante piccole informazioni indipendenti, ognuna con il suo valore (v), il momento
   dell'ultima modifica (t, millisecondi) e il dispositivo che l'ha fatta (d).

     "v/sviluppo/nome"                → { v: "Sviluppo",    t: …, d: "d4f2a…" }  nome della voce
     "v/sviluppo/del"                 → { v: true,          t: …, d: … }         voce cancellata dalla libreria
     "s/2026-10-12/m/sviluppo"        → { v: true,          t: …, d: … }         la voce è nella lista di quella settimana
     "s/2026-10-12/a/sviluppo/det"    → { v: "Programma A", t: …, d: … }         dettaglio della settimana
     "s/2026-10-12/a/sviluppo/f/2"    → { v: true,          t: …, d: … }         fatto mercoledì (0 = lunedì)
     "s/2026-10-12/r/6"               → { v: true,          t: …, d: … }         domenica di riposo
     "s/2026-10-12/e/2"               → { v: "ok",          t: …, d: … }         energia di mercoledì
     "v/bagno/cad"                    → { v: 14,            t: …, d: … }         faccenda: ogni 14 giorni
     "v/bagno/salto"                  → { v: "2026-10-22",  t: …, d: … }         ultimo «salto questo giro»
     "i/intensita"                    → { v: "morbida",     t: …, d: … }         colore delle faccende

   La tabella che vedi si ricostruisce da qui (vista).

   L'UNIONE
   Quando due copie si incontrano, per ogni chiave vince la modifica più recente
   ("last writer wins"; a parità di momento decide il dispositivo, sempre allo stesso modo).
   Ne seguono tre proprietà, verificate dai test:
     - l'ordine non conta:        unisci(A, B) dà lo stesso risultato di unisci(B, A);
     - ripetere non fa danni:      unire due volte lo stesso file non cambia nulla;
     - i file vecchi sono innocui: un'informazione più vecchia perde sempre.
   Nei libri questo schema si chiama CRDT (un registro LWW per ogni chiave).

   Togliere qualcosa NON cancella la chiave: la porta a false / '' con il suo momento,
   altrimenti la copia dell'altro dispositivo la farebbe ricomparire.

   LE FACCENDE
   Una voce con una cadenza (v/<id>/cad) è una faccenda. "L'ultima volta" non si salva: si ricava
   dalle spunte di tutte le settimane, anche di quelle da cui la voce è stata tolta (faccende).
   ───────────────────────────────────────────────────────────────────────────── */
(function (radice, fabbrica) {
  const modulo = fabbrica();
  if (typeof module === 'object' && module.exports) module.exports = modulo;
  else radice.SettimanaCore = modulo;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const FORMATO = 'settimana-sync';
  const VERSIONE = 1;
  const LIVELLI = ['pesa', 'ok', 'leggero'];
  const INTENSITA = ['nessuna', 'morbida', 'decisa'];   // quanto si colorano le faccende oltre la cadenza
  const MAX_CADENZA = 365;
  const MAX_NOME = 60;
  const MAX_DETTAGLIO = 200;
  const ID = '[a-z0-9-]{1,48}';
  const SETT = '\\d{4}-\\d{2}-\\d{2}';

  /* ───────── Piccoli attrezzi ───────── */
  const isObj = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
  const isBool = (v) => v === true || v === false;
  const giornoValido = (i) => Number.isInteger(i) && i >= 0 && i < 7;
  const cadenzaValida = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_CADENZA;
  const pulisci = (t, max) => (typeof t === 'string' ? t.replace(/\s+/g, ' ').trim().slice(0, max) : '');
  const chiaveNome = (n) => n.replace(/\s+/g, ' ').trim().toLowerCase();
  // "Riposo" ed "Energia" hanno la loro riga, e nel CSV si distinguono per nome
  const eRiservato = (n) => ['riposo', 'energia'].includes(chiaveNome(n));
  // un valore "vuoto" equivale a una chiave assente: non serve scriverlo se la chiave non c'è
  const ePredefinito = (v) => v === false || v === '' || v === null;

  // La chiave della settimana deve essere un lunedì vero (calcolo in UTC: non dipende dal fuso)
  function eLunedi(k) {
    if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    const [a, m, g] = k.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1, g));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === g && d.getUTCDay() === 1;
  }

  // Una data vera, nella forma AAAA-MM-GG
  function eData(k) {
    if (typeof k !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(k)) return false;
    const [a, m, g] = k.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1, g));
    return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === g;
  }

  // Aritmetica dei giorni, in UTC: le date sono etichette di calendario, il fuso non deve contare
  const GIORNO_MS = 86_400_000;
  const msData = (k) => { const [a, m, g] = k.split('-').map(Number); return Date.UTC(a, m - 1, g); };
  const dataDaMs = (ms) => new Date(ms).toISOString().slice(0, 10);
  const piuGiorni = (k, n) => dataDaMs(msData(k) + n * GIORNO_MS);
  const giorniTra = (da, a) => Math.round((msData(a) - msData(da)) / GIORNO_MS);

  // L'identificativo di una voce si ricava dal nome: "Città nuova" → "citta-nuova".
  // Così la stessa voce creata su due dispositivi, prima di unirli, è una voce sola.
  function slug(nome) {
    const base = chiaveNome(nome).normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, 40).replace(/-+$/, '');
    if (base) return base;
    // nomi senza lettere latine (per esempio solo emoji): un'impronta del nome, sempre uguale per lo stesso nome
    let h = 5381;
    for (const c of chiaveNome(nome)) h = ((h * 33) ^ c.codePointAt(0)) >>> 0;
    return 'x' + h.toString(36);
  }

  /* ───────── Validazione del registro (da memoria locale o da file) ───────── */
  const SCHEMI = [
    [new RegExp(`^v/${ID}/nome$`), (v) => typeof v === 'string' && v.length > 0 && v.length <= MAX_NOME && v === pulisci(v, MAX_NOME) && !eRiservato(v)],
    [new RegExp(`^v/${ID}/del$`), isBool],
    [new RegExp(`^s/${SETT}/m/${ID}$`), isBool],
    [new RegExp(`^s/${SETT}/a/${ID}/det$`), (v) => typeof v === 'string' && v.length <= MAX_DETTAGLIO],
    [new RegExp(`^s/${SETT}/a/${ID}/f/[0-6]$`), isBool],
    [new RegExp(`^s/${SETT}/r/[0-6]$`), isBool],
    [new RegExp(`^s/${SETT}/e/[0-6]$`), (v) => v === null || LIVELLI.includes(v)],
    [new RegExp(`^v/${ID}/cad$`), (v) => v === false || cadenzaValida(v)],
    [new RegExp(`^v/${ID}/salto$`), (v) => v === '' || eData(v)],
    [/^i\/intensita$/, (v) => INTENSITA.includes(v)],
  ];

  // Tiene solo le informazioni ben formate. Le chiavi che questa versione non conosce
  // (per esempio le fasce, quando arriveranno) restano nel registro e viaggiano con lui:
  // una versione vecchia dell'app non le capisce, ma non le perde.
  function valida(grezzo) {
    const reg = {};
    if (!isObj(grezzo)) return reg;
    for (const [k, x] of Object.entries(grezzo)) {
      if (k.length > 200 || !isObj(x) || !Number.isFinite(x.t) || x.t <= 0
        || typeof x.d !== 'string' || !x.d || x.d.length > 40) continue;
      if (k.startsWith('s/') && !eLunedi(k.split('/')[1])) continue;
      const schema = SCHEMI.find(([re]) => re.test(k));
      if (schema) {
        if (!schema[1](x.v)) continue;
      } else {
        const primitivo = x.v === null || ['boolean', 'number', 'string'].includes(typeof x.v);
        if (!primitivo || (typeof x.v === 'string' && x.v.length > MAX_DETTAGLIO) || !/^[a-z]\/[\w/.-]+$/.test(k)) continue;
      }
      reg[k] = { v: x.v, t: x.t, d: x.d };
    }
    return reg;
  }

  /* ───────── Unione ───────── */
  // x vince su y? Prima il momento, poi il dispositivo, poi il valore: sempre la stessa risposta, su ogni dispositivo.
  function vince(x, y) {
    if (x.t !== y.t) return x.t > y.t;
    if (x.d !== y.d) return x.d > y.d;
    return JSON.stringify(x.v) > JSON.stringify(y.v);
  }

  // Unisce sorgente dentro dest. Con applica = false conta soltanto (anteprima).
  function unisci(dest, sorgente, applica = true) {
    const conto = { nuove: 0, aggiornate: 0, piuVecchie: 0, uguali: 0 };
    for (const [k, x] of Object.entries(sorgente)) {
      const y = dest[k];
      if (!y) { conto.nuove++; if (applica) dest[k] = { ...x }; }
      else if (y.t === x.t && y.d === x.d) conto.uguali++;
      else if (vince(x, y)) { conto.aggiornate++; if (applica) dest[k] = { ...x }; }
      else conto.piuVecchie++;
    }
    return conto;
  }

  const massimoT = (reg) => Object.values(reg).reduce((m, x) => Math.max(m, x.t), 0);

  /* ───────── Vista: dal registro alla tabella ─────────
     { libreria: [{ id, name }],
       weeks: { 'AAAA-MM-GG': { activities: [{ id, dettaglio }], done: { id: [bool × 7] }, rest: [bool × 7], energy: [livello|null × 7] } } } */
  function vista(reg) {
    const nomi = {};
    const cancellate = {};
    const grezze = {};
    const usate = new Set();   // voci che fanno parte dello storico: in una lista, o con una spunta
    for (const [k, x] of Object.entries(reg)) {
      const p = k.split('/');
      if (p[0] === 'v' && p.length === 3) {
        if (p[2] === 'nome') nomi[p[1]] = x.v;
        else if (p[2] === 'del') cancellate[p[1]] = x.v;
        continue;
      }
      if (p[0] !== 's') continue;
      // il giorno, dove c'è, deve essere 0-6: una chiave sconosciuta di forma simile non deve finire nella tabella
      const giorno = (i) => (/^[0-6]$/.test(p[i]) ? Number(p[i]) : -1);
      const w = (grezze[p[1]] ??= { membri: [], det: {}, fatto: {}, rest: Array(7).fill(false), energy: Array(7).fill(null) });
      if (p.length === 4 && p[2] === 'm') { if (x.v === true) w.membri.push([p[3], x.t]); }
      else if (p.length === 5 && p[2] === 'a' && p[4] === 'det') w.det[p[3]] = x.v;
      else if (p.length === 6 && p[2] === 'a' && p[4] === 'f' && giorno(5) >= 0) {
        (w.fatto[p[3]] ??= Array(7).fill(false))[giorno(5)] = x.v;
        if (x.v === true) usate.add(p[3]);
      }
      else if (p.length === 4 && p[2] === 'r' && giorno(3) >= 0) w.rest[giorno(3)] = x.v;
      else if (p.length === 4 && p[2] === 'e' && giorno(3) >= 0) w.energy[giorno(3)] = x.v;
    }

    const weeks = {};
    for (const [k, w] of Object.entries(grezze)) {
      // l'ordine delle righe è quello in cui le hai aggiunte alla settimana
      const membri = w.membri.filter(([id]) => typeof nomi[id] === 'string')
        .sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
      const activities = membri.map(([id]) => ({ id, dettaglio: w.det[id] ?? '' }));
      // le spunte di una voce tolta dalla settimana restano nel registro (storico), ma la tabella non le mostra
      const done = {};
      for (const { id } of activities) {
        usate.add(id);
        if (w.fatto[id]?.includes(true)) done[id] = w.fatto[id];
      }
      weeks[k] = { activities, done, rest: w.rest, energy: w.energy };
    }

    // Una voce cancellata su un dispositivo ma usata sull'altro resta: l'uso vince sulla cancellazione.
    const libreria = Object.keys(nomi).sort()
      .filter((id) => cancellate[id] !== true || usate.has(id))
      .map((id) => ({ id, name: nomi[id] }));
    const intensita = INTENSITA.includes(reg['i/intensita']?.v) ? reg['i/intensita'].v : 'morbida';
    return { libreria, weeks, intensita };
  }

  /* ───────── Faccende: da quanto tempo non fai cosa ─────────
     Per ogni voce della libreria con una cadenza, vista dal giorno «oggi» (AAAA-MM-GG):
       ultima      il giorno più recente con una spunta, in qualunque settimana (anche tolta) — o null
       salto       il giorno dell'ultimo «salto questo giro», solo se è dopo l'ultima spunta — o null
       riferimento da qui si conta: il più recente tra ultima e salto — o null se non c'è nessuno dei due
       giorni      giorni passati dal riferimento (null se non c'è)
       scade       il giorno del giro: riferimento + cadenza (null se non c'è un riferimento). Se è passato,
                   il giro è aperto da quel giorno; l'app non conta i giri mancati, ce n'è sempre uno solo
       calore      0 finché la cadenza non è superata; poi cresce fino a 1 dopo un'altra cadenza intera
     L'elenco è in ordine: prima chi ha superato di più la propria cadenza (in proporzione),
     a parità il nome; le faccende mai segnate in fondo. */
  function faccende(reg, oggi) {
    if (!eData(oggi)) throw new Error('oggi deve essere una data AAAA-MM-GG');
    const vis = vista(reg);
    const ultime = {};
    for (const [k, x] of Object.entries(reg)) {
      if (x.v !== true) continue;
      const p = k.split('/');
      if (p.length !== 6 || p[0] !== 's' || p[2] !== 'a' || p[4] !== 'f' || !/^[0-6]$/.test(p[5])) continue;
      const quando = piuGiorni(p[1], Number(p[5]));
      if (quando > oggi) continue;   // una spunta nel futuro (orologio sbagliato) non conta
      if (!ultime[p[3]] || quando > ultime[p[3]]) ultime[p[3]] = quando;
    }
    const elenco = [];
    for (const { id, name } of vis.libreria) {
      const cadenza = reg[`v/${id}/cad`]?.v;
      if (!cadenzaValida(cadenza)) continue;
      const ultima = ultime[id] ?? null;
      const s = reg[`v/${id}/salto`]?.v;
      const salto = eData(s) && s <= oggi && (!ultima || s > ultima) ? s : null;
      const riferimento = salto ?? ultima;
      const giorni = riferimento ? giorniTra(riferimento, oggi) : null;
      const calore = giorni === null ? 0 : Math.max(0, Math.min(1, (giorni - cadenza) / cadenza));
      const scade = riferimento ? piuGiorni(riferimento, cadenza) : null;
      elenco.push({ id, nome: name, cadenza, ultima, salto, riferimento, giorni, scade, calore });
    }
    const peso = (f) => (f.giorni === null ? -1 : f.giorni / f.cadenza);
    return elenco.sort((a, b) => peso(b) - peso(a) || a.nome.localeCompare(b.nome, 'it'));
  }

  // Il lunedì della settimana più vecchia con dei dati: serve a contare da quando si usa l'app
  function primoUso(reg) {
    let primo = null;
    for (const k of Object.keys(reg)) {
      const w = k.split('/')[1];
      if (k.startsWith('s/') && eLunedi(w) && (!primo || w < primo)) primo = w;
    }
    return primo;
  }

  /* ───────── Un dispositivo: registro, orologio, operazioni ───────── */
  const errore = (codice, nome) => ({ ok: false, errore: codice, nome });

  function crea({ dispositivo, registro = {}, ora = () => Date.now() }) {
    if (typeof dispositivo !== 'string' || !dispositivo) throw new Error('serve un identificativo del dispositivo');
    const reg = registro;
    // L'orologio non torna mai indietro: ogni modifica riceve un momento successivo a tutto ciò che questo
    // dispositivo ha già visto, anche se il suo orologio è indietro. Così ciò che fai DOPO un'unione vince
    // sempre su ciò che hai appena unito.
    let ultimo = massimoT(reg);

    function scrivi(k, v) {
      const x = reg[k];
      if (x ? x.v === v : ePredefinito(v)) return false;   // nessun cambiamento: niente da scrivere
      const t = Math.max(Math.floor(ora()), ultimo + 1);
      ultimo = t;
      reg[k] = { v, t, d: dispositivo };
      return true;
    }

    const membro = (vis, sett, id) => Boolean(vis.weeks[sett]?.activities.some((a) => a.id === id));
    const perNome = (vis, nome) => vis.libreria.find((v) => chiaveNome(v.name) === chiaveNome(nome));

    // Primo identificativo libero per questo nome: quello ricavato dal nome, oppure "-2", "-3"…
    // se è già occupato da una voce con un altro nome (per esempio una voce rinominata).
    function idPer(nome) {
      const base = slug(nome);
      for (let i = 1; ; i++) {
        const id = i === 1 ? base : `${base}-${i}`;
        const x = reg[`v/${id}/nome`];
        if (!x || chiaveNome(x.v) === chiaveNome(nome)) return id;
      }
    }

    return {
      registro: reg,
      dispositivo,
      vista: () => vista(reg),
      scrivi,

      unisci(altro, applica = true) {
        const conto = unisci(reg, altro, applica);
        if (applica) ultimo = Math.max(ultimo, massimoT(reg));
        return conto;
      },

      // Aggiunge una voce a una settimana. Se il nome c'è già in libreria (maiuscole e spazi non contano)
      // usa quella voce, altrimenti ne crea una nuova.
      aggiungi(sett, nomeGrezzo) {
        if (!eLunedi(sett)) return errore('settimana');
        const nome = pulisci(nomeGrezzo, MAX_NOME);
        if (!nome) return errore('vuoto');
        if (eRiservato(nome)) return errore('riservato', nome);
        const vis = vista(reg);
        const esistente = perNome(vis, nome);
        if (esistente && membro(vis, sett, esistente.id)) return errore('gia-in-settimana', esistente.name);
        const id = esistente?.id ?? idPer(nome);
        // il nome si scrive solo per una voce davvero nuova: riprendere una voce cancellata non la rinomina
        if (!reg[`v/${id}/nome`]) scrivi(`v/${id}/nome`, nome);
        scrivi(`v/${id}/del`, false);
        scrivi(`s/${sett}/m/${id}`, true);
        return { ok: true, id };
      },

      // Toglie una voce dalla lista di una settimana. Spunte e dettaglio restano nel registro, come storico:
      // la tabella non li mostra, ma contano per «l'ultima volta» delle faccende, e ricompaiono
      // se la voce torna in quella settimana.
      togli(sett, id) {
        if (!membro(vista(reg), sett, id)) return errore('non-trovata');
        scrivi(`s/${sett}/m/${id}`, false);
        return { ok: true };
      },

      // Copia in una settimana vuota la lista di un'altra settimana, senza dettagli né spunte.
      riprendi(sett, fonte) {
        const vis = vista(reg);
        if (!eLunedi(sett)) return errore('settimana');
        if (vis.weeks[sett]?.activities.length) return errore('non-vuota');
        const lista = vis.weeks[fonte]?.activities ?? [];
        for (const a of lista) scrivi(`s/${sett}/m/${a.id}`, true);
        return { ok: true, quante: lista.length };
      },

      spunta(sett, id, giorno, fatto) {
        if (!giornoValido(giorno) || !isBool(fatto)) return errore('valore');
        if (!membro(vista(reg), sett, id)) return errore('non-trovata');
        scrivi(`s/${sett}/a/${id}/f/${giorno}`, fatto);
        return { ok: true };
      },

      dettaglio(sett, id, testo) {
        if (!membro(vista(reg), sett, id)) return errore('non-trovata');
        const valore = pulisci(testo, MAX_DETTAGLIO);
        scrivi(`s/${sett}/a/${id}/det`, valore);
        return { ok: true, valore };
      },

      riposo(sett, giorno, si) {
        if (!eLunedi(sett) || !giornoValido(giorno) || !isBool(si)) return errore('valore');
        scrivi(`s/${sett}/r/${giorno}`, si);
        return { ok: true };
      },

      energia(sett, giorno, livello) {
        if (!eLunedi(sett) || !giornoValido(giorno) || !(livello === null || LIVELLI.includes(livello))) return errore('valore');
        scrivi(`s/${sett}/e/${giorno}`, livello);
        return { ok: true };
      },

      // Il nuovo nome vale in tutte le settimane in cui la voce compare.
      rinomina(id, nomeGrezzo) {
        const vis = vista(reg);
        const voce = vis.libreria.find((v) => v.id === id);
        if (!voce) return errore('non-trovata');
        const nome = pulisci(nomeGrezzo, MAX_NOME);
        if (!nome) return errore('vuoto');
        if (eRiservato(nome)) return errore('riservato', nome);
        const doppione = vis.libreria.find((v) => v.id !== id && chiaveNome(v.name) === chiaveNome(nome));
        if (doppione) return errore('esiste', doppione.name);
        scrivi(`v/${id}/nome`, nome);
        return { ok: true, valore: nome };
      },

      // Solo una voce mai usata si può cancellare: una voce usata (in una lista, o con una spunta) fa parte dello storico.
      cancella(id) {
        const vis = vista(reg);
        if (!vis.libreria.some((v) => v.id === id)) return errore('non-trovata');
        const inLista = Object.values(vis.weeks).some((w) => w.activities.some((a) => a.id === id));
        const conSpunte = Object.entries(reg).some(([k, x]) => x.v === true && /^s\/[^/]+\/a\/[^/]+\/f\/[0-6]$/.test(k) && k.split('/')[3] === id);
        if (inLista || conSpunte) return errore('usata');
        scrivi(`v/${id}/del`, true);
        return { ok: true };
      },

      // Una faccenda nuova dalla sezione Casa, senza metterla in nessuna settimana. Se il nome c'è già in libreria
      // usa quella voce; se quella voce è già una faccenda, non ne cambia la cadenza (si cambia dalla sua scheda).
      nuovaFaccenda(nomeGrezzo, giorni) {
        const nome = pulisci(nomeGrezzo, MAX_NOME);
        if (!nome) return errore('vuoto');
        if (eRiservato(nome)) return errore('riservato', nome);
        if (!cadenzaValida(giorni)) return errore('valore');
        const esistente = perNome(vista(reg), nome);
        if (esistente && cadenzaValida(reg[`v/${esistente.id}/cad`]?.v)) return errore('gia-faccenda', esistente.name);
        const id = esistente?.id ?? idPer(nome);
        if (!reg[`v/${id}/nome`]) scrivi(`v/${id}/nome`, nome);
        scrivi(`v/${id}/del`, false);
        scrivi(`v/${id}/cad`, giorni);
        return { ok: true, id };
      },

      // Dà (o toglie, con null) una cadenza in giorni a una voce della libreria: diventa una faccenda.
      cadenza(id, giorni) {
        if (!vista(reg).libreria.some((v) => v.id === id)) return errore('non-trovata');
        if (giorni !== null && !cadenzaValida(giorni)) return errore('valore');
        scrivi(`v/${id}/cad`, giorni ?? false);
        return { ok: true };
      },

      // «Salto questo giro»: il conteggio riparte da quel giorno, senza segnare la faccenda come fatta.
      // Con null si annulla il salto.
      salta(id, data) {
        if (!vista(reg).libreria.some((v) => v.id === id)) return errore('non-trovata');
        if (data !== null && !eData(data)) return errore('valore');
        scrivi(`v/${id}/salto`, data ?? '');
        return { ok: true };
      },

      // Quanto si colorano le faccende oltre la cadenza: vale su tutti i dispositivi.
      intensita(livello) {
        if (!INTENSITA.includes(livello)) return errore('valore');
        scrivi('i/intensita', livello);
        return { ok: true };
      },
    };
  }

  /* ───────── File di sincronizzazione ───────── */
  const perFile = (reg, dispositivo, salvatoIl) => ({ formato: FORMATO, versione: VERSIONE, salvatoIl, dispositivo, registro: reg });

  // Restituisce il registro validato, oppure null se il file non è un file di sincronizzazione.
  function daFile(dati) {
    if (!isObj(dati) || dati.formato !== FORMATO || !isObj(dati.registro)) return null;
    return valida(dati.registro);
  }

  return {
    FORMATO, VERSIONE, LIVELLI, INTENSITA, MAX_NOME, MAX_DETTAGLIO, MAX_CADENZA,
    crea, unisci, vista, faccende, primoUso, valida, vince, eLunedi, eData, piuGiorni, giorniTra,
    slug, chiaveNome, eRiservato, pulisci, perFile, daFile,
  };
});
