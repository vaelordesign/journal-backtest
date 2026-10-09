// Lancer : demarrer le serveur local (config journal-backtest du launch.json de Typing, port 8772,
// qui sert tout le dossier Typing), puis : node tests/test-ui.cjs
// Test de bout en bout du journal de backtest dans un vrai Chrome (headless).
const path = require('path');
const fs = require('fs');
const { lancer, attendre } = require('./cdp.cjs');

const ICI = __dirname;
const SHOTS = path.join(ICI, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });
const URL_APP = 'http://localhost:8772/journal-backtest/index.html';

let ok = 0, ko = 0;
function verif(nom, cond, detail) {
  if (cond) { ok++; console.log('  OK   ' + nom); }
  else { ko++; console.log('  ECHEC ' + nom + (detail !== undefined ? '  -> ' + JSON.stringify(detail) : '')); }
}

(async () => {
  const c = await lancer({ profil: path.join(require('os').tmpdir(), 'journal-backtest-profil-test'), neuf: true, port: 9341 });
  try {
    await c.aller(URL_APP);
    console.log('\n1. Premier lancement');
    verif('accueil affiche', await c.ev('return !!document.querySelector("#acCreer")'));
    verif('strategie ICT 2022 creee', await c.ev('return E.strategies.length === 1 && E.strategies[0].confluences.length === 10'));
    await c.ev('document.querySelector("#acDebut").value = "2025-01-01"; document.querySelector("#acFin").value = "2025-03-31"; document.querySelector("#acCreer").click(); await new Promise(r => setTimeout(r, 300));');
    verif('campagne creee', await c.ev('return E.campagnes.length === 1'));
    verif('1er janvier ferie ? non : on commence le 1er jour ouvrable (mer. 1er janv.)', await c.ev('return E.campagnes[0].jourCourant'), await c.ev('return E.campagnes[0].jourCourant'));
    verif('jour courant = 2025-01-01 (mercredi)', (await c.ev('return E.campagnes[0].jourCourant')) === '2025-01-01');
    verif('ecran seance avec boutons', await c.ev('return !!document.querySelector("#seNouveau") && !!document.querySelector("#seTermine")'));
    await c.capture(path.join(SHOTS, '01-seance-vide.png'));

    console.log('\n2. Saisie d\'un trade au clic');
    await c.ev('document.querySelector("#seNouveau").click(); await new Promise(r => setTimeout(r, 300));');
    verif('fiche ouverte', await c.ev('return !!document.querySelector("#ftEnregistrer")'));
    await c.ev(`
      var m = document.querySelector('#modale');
      var h = m.querySelector('#ftHeure'); h.value = '09:45'; h.dispatchEvent(new Event('input'));
      m.querySelector('#ftSens button[data-v="long"]').click();
      m.querySelector('#ftBiais button[data-v="haussier"]').click();
      m.querySelector('#ftIssue button[data-v="tp"]').click();
      var mf = m.querySelector('#ftMfe'); mf.value = '4,2'; mf.dispatchEvent(new Event('input'));
      Array.prototype.slice.call(m.querySelectorAll('#ftConfl input')).slice(0, 5).forEach(function(i){ i.checked = true; i.dispatchEvent(new Event('change')); });
      m.querySelector('#ftQualite button[data-v="A"]').click();
    `);
    verif('apercu = +3 R', (await c.ev('return document.querySelector("#ftApercu").textContent')) === '+3 R', await c.ev('return document.querySelector("#ftApercu").textContent'));
    verif('seance deduite : NY matin', (await c.ev('return document.querySelector("#ftSeance").textContent')).indexOf('NY matin') === 0);
    verif('dans le plan', (await c.ev('return document.querySelector("#ftPlan").textContent')).indexOf('Dans le plan') === 0);
    // une capture collee au Ctrl+V
    await c.ev(`
      var cv = document.createElement('canvas'); cv.width = 320; cv.height = 200;
      var x = cv.getContext('2d'); x.fillStyle = '#26a69a'; x.fillRect(0, 0, 320, 200); x.fillStyle = '#fff'; x.fillText('capture test', 20, 100);
      var b = await new Promise(r => cv.toBlob(r, 'image/png'));
      var dt = new DataTransfer(); dt.items.add(new File([b], 'capture.png', { type: 'image/png' }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      await new Promise(r => setTimeout(r, 600));
    `);
    verif('capture collee visible', await c.ev('return document.querySelectorAll("#ftPhotos .galerie img").length === 1'));
    await c.capture(path.join(SHOTS, '02-fiche-trade.png'), true);
    await c.ev('document.querySelector("#ftEnregistrer").click(); await new Promise(r => setTimeout(r, 500));');
    verif('trade enregistre', await c.ev('return E.trades.length === 1 && rDuTrade(E.trades[0]) === 3 && E.trades[0].mfe === 4.2'));
    verif('capture comptee', await c.ev('return E.trades[0].nbImages === 1'));
    verif('etapes cochees', await c.ev('return Object.keys(E.trades[0].confl).length === 5 && conforme(E.trades[0])'));

    console.log('\n3. Clavier : J, N, Ctrl+Entree');
    await c.ev('document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true })); await new Promise(r => setTimeout(r, 400));');
    verif('J : jour marque teste', await c.ev('return !!jourDe(E.campagnes[0].id, "2025-01-01").teste'));
    verif('J : passe au jeudi 2 janvier', (await c.ev('return E.campagnes[0].jourCourant')) === '2025-01-02');
    await c.ev('document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true })); await new Promise(r => setTimeout(r, 300));');
    await c.ev('document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "j", bubbles: true })); await new Promise(r => setTimeout(r, 300));');
    verif('vendredi 3 -> lundi 6 janvier', (await c.ev('return E.campagnes[0].jourCourant')) === '2025-01-06');
    await c.ev('document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "n", bubbles: true })); await new Promise(r => setTimeout(r, 300));');
    verif('N : fiche ouverte sur le 6 janvier', (await c.ev('return document.querySelector("#ftDate").value')) === '2025-01-06');
    await c.ev(`
      var m = document.querySelector('#modale');
      var h = m.querySelector('#ftHeure'); h.value = '03:10'; h.dispatchEvent(new Event('input'));
      m.querySelector('#ftSens button[data-v="short"]').click();
      m.querySelector('#ftIssue button[data-v="sl"]').click();
      var mf = m.querySelector('#ftMfe'); mf.value = '0,7'; mf.dispatchEvent(new Event('input'));
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
    `);
    verif('Ctrl+Entree enregistre un SL', await c.ev('return E.trades.length === 2 && E.trades[1].issue === "sl" && rDuTrade(E.trades[1]) === -1'));
    verif('SL : MAE mis a 1 tout seul', await c.ev('return E.trades[1].mae === 1'));
    verif('SL de nuit : seance Londres', (await c.ev('return seanceDuTrade(E.trades[1])')) === 'Londres');
    verif('hors plan (aucune etape cochee)', await c.ev('return !conforme(E.trades[1])'));
    // une fiche abandonnee ne laisse pas de capture orpheline
    await c.ev(`
      document.querySelector('#seNouveau').click(); await new Promise(r => setTimeout(r, 300));
      var cv = document.createElement('canvas'); cv.width = 50; cv.height = 50;
      var b = await new Promise(r => cv.toBlob(r, 'image/png'));
      var dt = new DataTransfer(); dt.items.add(new File([b], 'x.png', { type: 'image/png' }));
      document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
      await new Promise(r => setTimeout(r, 500));
      document.querySelector('#modale [data-fermer]').click();
      await new Promise(r => setTimeout(r, 400));
    `);
    verif('fiche abandonnee : capture effacee', (await c.ev('return (await dbTous("images")).length')) === 1);
    // validation : pas de sens -> refus
    await c.ev(`document.querySelector('#seNouveau').click(); await new Promise(r => setTimeout(r, 300));
      document.querySelector('#modale #ftIssue button[data-v="be"]').click(); document.querySelector('#ftEnregistrer').click(); await new Promise(r => setTimeout(r, 200));`);
    verif('refus sans sens', await c.ev('return E.trades.length === 2 && !!document.querySelector("#ftEnregistrer")'));
    await c.ev('fermerModale();');

    console.log('\n4. Modification, suppression avec confirmation par-dessus la fiche');
    await c.ev('formulaireTrade(E.trades[1].id); await new Promise(r => setTimeout(r, 300));');
    await c.ev('document.querySelector("#ftSupprimer").click(); await new Promise(r => setTimeout(r, 200));');
    verif('la confirmation s\'ouvre par-dessus, la fiche reste derriere', await c.ev('return document.querySelectorAll(".voile").length === 2 && !!document.querySelector("#ftEnregistrer")'));
    await c.ev('document.querySelectorAll(".voile")[1].querySelector("[data-non]").click(); await new Promise(r => setTimeout(r, 200));');
    verif('annuler : rien supprime, fiche toujours la', await c.ev('return E.trades.length === 2 && !!document.querySelector("#ftEnregistrer")'));
    await c.ev('document.querySelector("#ftSupprimer").click(); await new Promise(r => setTimeout(r, 200)); document.querySelectorAll(".voile")[1].querySelector("[data-oui]").click(); await new Promise(r => setTimeout(r, 400));');
    verif('supprime', await c.ev('return E.trades.length === 1 && document.querySelector("#voile").hidden'));

    console.log('\n5. Un vrai jeu de donnees : 3 mois de replay');
    const nb = await c.ev(`
      var rng = aleatoire(2025);
      var camp = E.campagnes[0];
      var trades = [], jours = [];
      var d = '2025-01-07';
      var tags = E.reglages.etiquettes;
      var seances = [['09:35', 0.45], ['10:05', 0.25], ['03:15', 0.15], ['13:45', 0.10], ['12:20', 0.05]];
      while (d <= '2025-03-31') {
        if (!estWeekend(d)) {
          var n = [0, 0, 1, 1, 1, 2, 2, 3][Math.floor(rng() * 8)];
          jours.push({ cle: camp.id + '|' + d, campagneId: camp.id, date: d, teste: true, note: '', cree: Date.now() });
          for (var k = 0; k < n; k++) {
            var u = rng(), acc = 0, h = '09:35';
            for (var s = 0; s < seances.length; s++) { acc += seances[s][1]; if (u < acc) { h = seances[s][0]; break; } }
            var q = QUALITES[Math.floor(rng() * 5)];
            var confl = {};
            ['c-sweep', 'c-bos', 'c-fvg', 'c-ifvg1', 'c-cible'].forEach(function(id){ if (rng() < 0.88) confl[id] = true; });
            ['c-kz', 'c-htf', 'c-pd', 'c-smt', 'c-news'].forEach(function(id){ if (rng() < 0.5) confl[id] = true; });
            var pGain = 0.30 + (q === 'A' || q === 'A+' ? 0.12 : 0) + (confl['c-smt'] ? 0.08 : 0) + (h === '09:35' || h === '10:05' ? 0.05 : -0.05);
            var x = rng(), issue, mfe, mae;
            if (x < pGain) { issue = 'tp'; mfe = 3 + rng() * 2.5; mae = rng() * 0.8; }
            else if (x < pGain + 0.07) { issue = 'be'; mfe = 1 + rng() * 1.5; mae = rng() * 0.9; }
            else { issue = 'sl'; mfe = rng() * 2.2; mae = 1; }
            var sens = rng() < 0.5 ? 'long' : 'short';
            var entree = 20000 + Math.round(rng() * 2000) / 4, dist = 10 + Math.round(rng() * 50);
            trades.push({ id: 't-test-' + trades.length, campagneId: camp.id, date: d, heure: h, sens: sens, issue: issue, rrCible: 3,
              r: issue === 'tp' ? 3 : issue === 'sl' ? -1 : 0, mfe: Math.round(mfe * 100) / 100, mae: Math.round(mae * 100) / 100,
              entree: rng() < 0.6 ? entree : null, stop: null, cible: null, sortie: null, duree: Math.round(5 + rng() * 90),
              symbole: 'MNQ', confl: confl, qualite: q, biais: ['haussier', 'baissier', 'neutre', ''][Math.floor(rng() * 4)],
              tags: rng() < 0.6 ? [tags[Math.floor(rng() * tags.length)]] : [], notes: rng() < 0.3 ? 'Note de test ' + trades.length : '',
              liens: [], douteux: rng() < 0.06, nbImages: 0, source: 'test', cree: Date.now() + trades.length });
            var t = trades[trades.length - 1];
            if (t.entree !== null) { t.stop = sens === 'long' ? t.entree - dist : t.entree + dist; }
          }
        }
        d = ajouterJours(d, 1);
      }
      await dbMettreLot('trades', trades);
      await dbMettreLot('jours', jours);
      await chargerTout();
      rendre();
      return E.trades.length;
    `);
    verif('jeu de donnees charge (' + nb + ' trades)', nb > 60, nb);

    console.log('\n6. Chaque ecran, sur ordinateur');
    const ecrans = ['seance', 'bord', 'calendrier', 'trades', 'analyses', 'labo', 'sorties', 'simulateur', 'galerie', 'comparer', 'campagnes', 'import', 'reglages'];
    for (let i = 0; i < ecrans.length; i++) {
      const e = ecrans[i];
      const avant = c.erreurs.length;
      await c.ev('allerA("' + e + '"); await new Promise(r => setTimeout(r, ' + (e === 'simulateur' || e === 'galerie' ? 1200 : 350) + '));');
      const info = await c.ev('var s = document.querySelector("#ec-' + e + '"); return { long: s.innerText.length, deborde: document.documentElement.scrollWidth > document.documentElement.clientWidth, actif: s.classList.contains("actif") };');
      verif('ecran ' + e + ' : rendu, sans erreur, sans debordement', info.actif && info.long > 80 && !info.deborde && c.erreurs.length === avant, { info, erreurs: c.erreurs.slice(avant) });
      await c.capture(path.join(SHOTS, 'pc-' + String(i + 1).padStart(2, '0') + '-' + e + '.png'), true);
    }

    console.log('\n7. Contenu des ecrans');
    await c.ev('allerA("bord"); await new Promise(r => setTimeout(r, 300));');
    const bord = await c.ev('return document.querySelector("#ec-bord").textContent');
    verif('tableau de bord : fourchette et verdict', bord.indexOf('Fourchette') >= 0 && /Trop tôt|positive|perd|Pas encore prouvé/.test(bord));
    verif('tableau de bord : 100 prochains trades', bord.indexOf('100 prochains trades') >= 0);
    verif('courbe : un point cliquable par trade', await c.ev('return document.querySelectorAll("#ec-bord svg rect[data-trade]").length === E.trades.length'));
    await c.ev('document.querySelector("#ec-bord svg rect[data-trade]").dispatchEvent(new MouseEvent("click", { bubbles: true })); await new Promise(r => setTimeout(r, 300));');
    verif('clic sur la courbe ouvre le trade', await c.ev('return !!document.querySelector("#ftEnregistrer")'));
    await c.ev('fermerModale();');
    await c.ev('allerA("analyses"); await new Promise(r => setTimeout(r, 300));');
    const an = await c.ev('return document.querySelector("#ec-analyses").innerText');
    verif('analyses : etapes, seances, qualite', an.indexOf('1. Liquidity sweep') >= 0 && an.indexOf('NY matin') >= 0 && an.indexOf('A+') >= 0);
    await c.ev('allerA("labo"); await new Promise(r => setTimeout(r, 200)); var i = document.querySelector("[data-groupe=seances] input[value=\'NY matin\']"); i.checked = true; i.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 300));');
    const labo = await c.ev('return document.querySelector("#ec-labo").innerText');
    verif('laboratoire : filtre NY matin decrit et verdict', labo.indexOf('séance NY matin') >= 0 && /deux moitiés|Trop peu|n'améliore pas/.test(labo));
    await c.capture(path.join(SHOTS, 'labo-filtre.png'), true);
    await c.ev('allerA("sorties"); await new Promise(r => setTimeout(r, 300));');
    verif('cible et stop : grille de 4 lignes + 2 partiels', await c.ev('return document.querySelectorAll("#ec-sorties table.chaleur tbody tr").length === 6'));
    verif('cible et stop : une case meilleure', await c.ev('return document.querySelectorAll("#ec-sorties td.meilleur").length === 1'));
    verif('cible et stop : stop plus serre calcule', await c.ev('return document.querySelector("#ec-sorties").innerText.indexOf("Ton stop actuel") >= 0'));
    await c.ev('allerA("simulateur"); await new Promise(r => setTimeout(r, 1200));');
    const sim = await c.ev('return document.querySelector("#siResultats").innerText');
    verif('simulateur : pourcentages et balayage du risque', sim.indexOf('des challenges réussis') >= 0 && sim.indexOf('le meilleur') >= 0, sim.slice(0, 300));
    const t0 = Date.now();
    await c.ev('var i = document.querySelector("#siRisque"); i.value = "400"; i.dispatchEvent(new Event("input")); await new Promise(r => setTimeout(r, 900));');
    verif('simulateur : le risque change, reglage garde', (await c.ev('return E.reglages.simul.risque')) === 400);
    const duree = await c.ev('var t = performance.now(); simulerChallenge(statsR(tradesFiltres()).valeurs, frequence(tradesFiltres(), joursTestesFiltres()).listeParJour, E.reglages.simul, aleatoire(1)); return Math.round(performance.now() - t);');
    verif('simulation de 3 000 challenges en moins de 300 ms (' + duree + ' ms)', duree < 300, duree);
    await c.ev('var s = document.querySelector("#siPreset"); s.value = "fn-flex-50"; s.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 900));');
    verif('modele Flex : objectif 2 500, perte max 1 500', await c.ev('return E.reglages.simul.objectif === 2500 && E.reglages.simul.perteMax === 1500'));
    await c.capture(path.join(SHOTS, 'simulateur.png'), true);

    console.log('\n8. Filtres du bandeau');
    const n0 = await c.ev('return tradesFiltres().length');
    await c.ev('allerA("bord"); var x = document.querySelector("#filtreConformes"); x.checked = true; x.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 200));');
    const n1 = await c.ev('return tradesFiltres().length');
    verif('dans le plan : moins de trades', n1 < n0 && n1 > 0, [n0, n1]);
    await c.ev('var x = document.querySelector("#filtreConformes"); x.checked = false; x.dispatchEvent(new Event("change")); var d = document.querySelector("#filtreDebut"); d.value = "2025-02-01"; d.dispatchEvent(new Event("change")); await new Promise(r => setTimeout(r, 200));');
    verif('date de debut', await c.ev('return tradesFiltres().every(t => t.date >= "2025-02-01")'));
    await c.ev('document.querySelector("#filtreToutes").click(); await new Promise(r => setTimeout(r, 200));');

    console.log('\n9. Import d\'une liste de trades TradingView');
    const csv = 'Trade #,Type,Date/Time,Signal,Price USD,Position size (qty),Net P&L USD,Net P&L %,Run-up USD,Drawdown USD\\n' +
      '2,Exit short,2025-04-02 11:15,SL,20060,1,-250,-1.2,150,-250\\n2,Entry short,2025-04-02 10:50,Short,20010,1,-250,-1.2,150,-250\\n' +
      '1,Exit long,2025-04-01 10:05,TP,20100,1,750,3.7,900,-50\\n1,Entry long,2025-04-01 09:41,Long,19950,1,750,3.7,900,-50';
    await c.ev('allerA("import"); await recevoirFichierImport(new File(["' + csv + '"], "liste-trades.csv", { type: "text/csv" })); await new Promise(r => setTimeout(r, 300));');
    verif('fichier reconnu, 1 R propose = 250', await c.ev('return IMPORT && IMPORT.type === "tv" && IMPORT.unR === 250'));
    const avantImp = await c.ev('return E.trades.length');
    await c.ev('document.querySelector("#imOk").click(); await new Promise(r => setTimeout(r, 500));');
    verif('2 trades importes en R', await c.ev('return E.trades.length === ' + (avantImp + 2) + ' && E.trades.some(t => t.source === "tv-strategie" && t.r === 3 && t.mfe === 3.6)'));
    await c.ev('allerA("import"); await recevoirFichierImport(new File(["' + csv + '"], "liste-trades.csv", { type: "text/csv" })); await new Promise(r => setTimeout(r, 300));');
    verif('reimport : les doublons sont reconnus', await c.ev('return document.querySelector("#imOk").disabled === true && document.querySelector("#imConfig").innerText.indexOf("déjà importé") >= 0'));
    await c.ev('IMPORT = null;');
    const gen = 'Date;Direction;Résultat;MFE\\n05/05/2025;Long;TP;3,5\\n06/05/2025;Short;-1;0,4';
    await c.ev('allerA("import"); await recevoirFichierImport(new File(["' + gen + '"], "mon-tableau.csv")); await new Promise(r => setTimeout(r, 300));');
    verif('tableau quelconque : choix des colonnes proposes', await c.ev('return IMPORT.type === "gen" && document.querySelectorAll("#imConfig select[data-champ]").length === 15'));
    await c.capture(path.join(SHOTS, 'import-tableau.png'), true);
    await c.ev('document.querySelector("#imOk").click(); await new Promise(r => setTimeout(r, 500));');
    verif('tableau quelconque importe (TP au R:R de la strategie)', await c.ev('return E.trades.some(t => t.date === "2025-05-05" && rDuTrade(t) === 3) && E.trades.some(t => t.date === "2025-05-06" && rDuTrade(t) === -1)'));

    console.log('\n10. Comparer : nouvelle version et journal reel');
    await c.ev('allerA("campagnes"); await new Promise(r => setTimeout(r, 200)); document.querySelector("[data-version]").click(); await new Promise(r => setTimeout(r, 200)); document.querySelector("#nvOk").click(); await new Promise(r => setTimeout(r, 300)); document.querySelector("#fcOk").click(); await new Promise(r => setTimeout(r, 400));');
    verif('nouvelle version creee avec sa strategie copiee', await c.ev('return E.campagnes.length === 2 && E.strategies.length === 2 && E.campagnes[1].parentId === E.campagnes[0].id && E.campagnes[1].strategieId !== E.campagnes[0].strategieId'));
    verif('la nouvelle version devient la campagne active', await c.ev('return E.reglages.campagneActive === E.campagnes[1].id'));
    await c.ev('allerA("comparer"); await new Promise(r => setTimeout(r, 300)); document.querySelector("#coLire").click(); await new Promise(r => setTimeout(r, 500));');
    verif('pas de journal a cette adresse : message clair', (await c.ev('return document.querySelector("#coErreur").innerText')).indexOf('même adresse') >= 0);
    verif('et la base du journal N\'A PAS ete creee', await c.ev('return !(await indexedDB.databases()).some(d => d.name === "journal-trading")'));
    // on fabrique un faux journal de trading a la meme adresse
    await c.ev(`
      await new Promise(function(res){
        var r = indexedDB.open('journal-trading', 1);
        r.onupgradeneeded = function(e){ e.target.result.createObjectStore('trades', { keyPath: 'cle' }); };
        r.onsuccess = function(){
          var db = r.result, tx = db.transaction('trades', 'readwrite'), s = tx.objectStore('trades');
          for (var i = 0; i < 24; i++) s.put({ cle: 'MNQ#' + i, ouverture: new Date(2026, 8, 20 + (i % 9), i % 3 ? 9 : 3, 40).getTime(), sens: i % 2 ? 'long' : 'short',
            rManuel: [3, -1, -1, 0, -1, 3, -1, -1][i % 8], symbole: 'MNQ', simule: false, net: 0 });
          s.put({ cle: 'MNQ#bt', ouverture: new Date(2025, 0, 8, 9, 50).getTime(), sens: 'long', rManuel: 2, symbole: 'MNQ', simule: true, notes: 'rejeu', tags: ['Sweep Asie'] });
          s.put({ cle: 'MNQ#sansR', ouverture: new Date(2026, 8, 30, 9, 50).getTime(), sens: 'long', symbole: 'MNQ', simule: false, net: 100 });
          tx.oncomplete = function(){ db.close(); res(); };
        };
      });
      E.reel = null; rendre(); await new Promise(r => setTimeout(r, 200));
      document.querySelector('#coLire').click(); await new Promise(r => setTimeout(r, 600));
    `);
    const cmp = await c.ev('return document.querySelector("#ec-comparer").innerText');
    verif('journal lu : 25 trades reels, 1 sans R', cmp.indexOf('25') >= 0 && /1 sans R/.test(cmp), cmp.slice(cmp.indexOf('Backtest :'), cmp.indexOf('Backtest :') + 300));
    verif('ecart d\'execution annonce', /de moins par trade|aussi bien/.test(cmp));
    await c.capture(path.join(SHOTS, 'comparer.png'), true);
    await c.ev('allerA("import"); await new Promise(r => setTimeout(r, 200)); var b = document.querySelector("#imLireJournal"); if (b) b.click(); await new Promise(r => setTimeout(r, 500));');
    verif('import des trades backtest du journal propose', (await c.ev('return document.querySelector("#imJournal").textContent')).split(' ').join(' ').indexOf('1 trade backtest trouvé') >= 0);
    await c.ev('document.querySelector("#imJOk").click(); await new Promise(r => setTimeout(r, 400));');
    verif('trade backtest du journal importe', await c.ev('return E.trades.some(t => t.source === "journal" && t.r === 2 && t.date === "2025-01-08")'));

    console.log('\n11. Sauvegarde et restauration');
    const sauv = await c.ev(`
      var capt = null;
      var vrai = telecharger;
      telecharger = function(nom, contenu){ capt = { nom: nom, contenu: contenu }; return 0; };
      await exporterTout(true);
      telecharger = vrai;
      window.__sauvegarde = capt.contenu;
      var p = JSON.parse(capt.contenu);
      return { nom: capt.nom, trades: p.trades.length, images: p.images.length, campagnes: p.campagnes.length };
    `);
    verif('sauvegarde complete', sauv.trades > 60 && sauv.images === 1 && sauv.campagnes === 2, sauv);
    const nbT = await c.ev('return E.trades.length');
    await c.ev(`
      for (var i = 0; i < MAGASINS.length; i++) await dbVider(MAGASINS[i]);
      await chargerTout(); rendre();
      var p = importerSauvegarde(new File([window.__sauvegarde], 'sauv.json'));
      await new Promise(r => setTimeout(r, 200));
      document.querySelectorAll('.voile')[document.querySelectorAll('.voile').length - 1].querySelector('[data-oui]').click();
      await p; await new Promise(r => setTimeout(r, 300));
    `);
    verif('restauration : tout revient', await c.ev('return E.trades.length === ' + nbT + ' && E.campagnes.length === 2'));
    verif('restauration : la capture revient', (await c.ev('return (await dbTous("images")).length')) === 1);

    console.log('\n12. Galerie');
    await c.ev('E.filtre.campagne = ""; allerA("galerie"); await new Promise(r => setTimeout(r, 800));');
    verif('galerie : la capture apparait', await c.ev('return document.querySelectorAll("#gaMur .tuile img").length === 1'));

    console.log('\n13. Lien de partage et rapport en lecture seule');
    await c.ev('E.filtre.campagne = E.campagnes[0].id; formulairePartage(); await new Promise(r => setTimeout(r, 600));');
    const lien = await c.ev('return document.querySelector("#paLien").value');
    verif('lien cree (' + lien.length + ' caracteres)', lien.indexOf('#rapport=g') > 0 && lien.length < 20000, lien.length);
    await c.ev('fermerModale();');
    await c.aller('about:blank');
    await c.aller(lien);
    await attendre(800);
    const rap = await c.ev('return { titre: document.title, nav: document.querySelectorAll("#nav button").length, bord: document.querySelector("#ec-bord").innerText.length, ro: document.body.innerText.indexOf("lecture seule") >= 0, n: E.trades.length }');
    verif('rapport ouvert en lecture seule', rap.ro && rap.nav === 7 && rap.bord > 200, rap);
    for (const e of ['calendrier', 'trades', 'analyses', 'labo', 'sorties', 'simulateur']) {
      const avant = c.erreurs.length;
      await c.ev('allerA("' + e + '"); await new Promise(r => setTimeout(r, ' + (e === 'simulateur' ? 1000 : 300) + '));');
      verif('rapport : ecran ' + e + ' sans erreur', c.erreurs.length === avant, c.erreurs.slice(avant));
    }
    await c.ev('allerA("trades"); await new Promise(r => setTimeout(r, 200)); document.querySelector("#ec-trades tr[data-trade]").click(); await new Promise(r => setTimeout(r, 300));');
    verif('rapport : un trade s\'ouvre en lecture seule', await c.ev('return !document.querySelector("#ftEnregistrer") && document.querySelector("#modale").textContent.indexOf("Étapes présentes") >= 0'));
    verif('rapport : la base du visiteur n\'est pas ouverte', await c.ev('return DB === null'));
    await c.capture(path.join(SHOTS, 'rapport.png'), true);
    await c.ev('fermerModale(); allerA("analyses");');
    verif('rapport : l\'adresse garde le code du rapport', (await c.ev('return location.hash')).indexOf('#rapport=g') === 0 && (await c.ev('return location.hash')).indexOf('&ecran=analyses') > 0);
    await c.ev('location.hash = "#seance";');
    await attendre(1500);
    verif('sortie du rapport : retour a son propre journal', await c.ev('return !E.rapport && DB !== null && E.campagnes.length === 2 && E.ecran === "seance"'));

    console.log('\n14. Sur telephone (390 px)');
    await c.aller('about:blank');
    await c.aller(URL_APP + '#seance');
    await c.taille(390, 844, true);
    await c.aller(URL_APP + '#seance');
    for (let i = 0; i < ecrans.length; i++) {
      const e = ecrans[i];
      const avant = c.erreurs.length;
      await c.ev('allerA("' + e + '"); await new Promise(r => setTimeout(r, ' + (e === 'simulateur' || e === 'galerie' ? 1200 : 350) + '));');
      const info = await c.ev('return { l: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }');
      verif('telephone : ' + e + ' sans debordement (' + info.l + ' / ' + info.c + ')', info.l <= info.c && c.erreurs.length === avant, { info, erreurs: c.erreurs.slice(avant) });
      await c.capture(path.join(SHOTS, 'tel-' + String(i + 1).padStart(2, '0') + '-' + e + '.png'), true);
    }
    await c.ev('allerA("seance"); await new Promise(r => setTimeout(r, 300)); document.querySelector("#seNouveau").click(); await new Promise(r => setTimeout(r, 400));');
    const fiche = await c.ev('return { l: document.documentElement.scrollWidth, m: document.querySelector("#modale").scrollWidth, c: document.documentElement.clientWidth }');
    verif('telephone : fiche du trade sans debordement', fiche.m <= fiche.c && fiche.l <= fiche.c, fiche);
    await c.capture(path.join(SHOTS, 'tel-fiche.png'));
    await c.taille(0);

    console.log('\n15. Test dans la page (Reglages)');
    await c.aller(URL_APP + '#reglages');
    await c.ev('document.querySelector("#reTest").click(); await new Promise(r => setTimeout(r, 300));');
    const at = await c.ev('return document.querySelector("#reTestSortie").innerText');
    verif('test de la page : tout passe', /(\d+) \/ \1 vérifications/.test(at), at.slice(0, 80));

    console.log('\nErreurs JavaScript vues pendant tout le test : ' + c.erreurs.length);
    c.erreurs.forEach(e => console.log('   ' + e));
    if (c.erreurs.length) ko++;
  } catch (e) {
    ko++;
    console.log('ARRET : ' + e.message);
    console.log(c.erreurs.join('\n'));
  } finally {
    await c.fermer();
  }
  console.log('\n' + (ko ? 'ECHECS : ' + ko : 'TOUT EST BON') + ' (' + ok + ' reussites)');
  process.exit(ko ? 1 : 0);
})();
