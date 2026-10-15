// Crea un registro di prova: qualche settimana di storia, costruita con le stesse operazioni che usa la pagina.
// Lo usano i test nel browser. Si può anche lanciare a mano per vederlo:  node strumenti/seme.js > seme.json
'use strict';
const Core = require('../core.js');

/** Restituisce il contenuto di un file di sincronizzazione con cinque settimane di attività (fino al 12/10/2026). */
function creaSeme() {
  let adesso = Date.UTC(2026, 7, 31, 8);
  // orologio finto: ogni operazione avviene un minuto dopo la precedente
  const db = Core.crea({ dispositivo: 'dseme01', ora: () => (adesso += 60_000) });

  // voci: { nome: quanti giorni segnati, a partire da lunedì }
  function settimana(k, voci) {
    for (const [nome, giorni] of Object.entries(voci)) {
      const { id } = db.aggiungi(k, nome);
      for (let i = 0; i < giorni; i++) db.spunta(k, id, i, true);
    }
  }
  settimana('2026-08-31', { Esame: 5, 'Città nuova': 1 });          // fuori dalla finestra delle 4 settimane
  settimana('2026-09-21', { Camminare: 3, Chitarra: 1, Leggere: 0 });
  settimana('2026-09-28', { Camminare: 2, Sviluppo: 4 });
  settimana('2026-10-05', { Sviluppo: 3, Cucinare: 1 });
  settimana('2026-10-12', { Sviluppo: 2, Diario: 1, Chitarra: 1 });
  db.dettaglio('2026-10-12', 'sviluppo', 'Programma A');

  return Core.perFile(db.registro, db.dispositivo, new Date(adesso).toISOString());
}

module.exports = { creaSeme };

// lanciato direttamente (non importato da un test): stampa il file
if (require.main === module) process.stdout.write(JSON.stringify(creaSeme(), null, 2));
