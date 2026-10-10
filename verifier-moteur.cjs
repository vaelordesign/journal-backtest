/* ============================================================
   Test du moteur de calcul du journal de backtest.

   Ce script n'a PAS sa propre copie de la logique : il decoupe le bloc
   compris entre "DEBUT MOTEUR" et "FIN MOTEUR" dans index.html et le
   rejoue tel quel. Si le test passe, c'est le code livre qui passe.
   Chaque resultat attendu a ete calcule a la main (le calcul est en
   commentaire a cote).

   Utilisation :  node verifier-moteur.cjs
   ============================================================ */
const fs = require('fs');
const path = require('path');

const cible = process.argv[2] || path.join(__dirname, 'index.html');
const source = fs.readFileSync(cible, 'utf8');
const iDebut = source.indexOf('==================== DEBUT MOTEUR');
const iFin = source.indexOf('/* ==================== FIN MOTEUR');
if (iDebut < 0 || iFin < 0) { console.error('Marqueurs DEBUT MOTEUR / FIN MOTEUR introuvables dans ' + cible); process.exit(1); }
const code = source.slice(source.indexOf('*/', iDebut) + 2, iFin);

const M = new Function(code + `
  return { versNombre, lireR, fmtR, fmtNombre, fmtPct, normaliserTexte, dateValide, jourSemaine, ajouterJours, jourOuvrable,
           joursOuvrables, lundiDe, minutesDe, heureNormale, lireSeances, seanceDe, trancheHeure, trancheDemiHeure, SEANCES_DEFAUT,
           pointsDeStop, rDepuisPrix, rrDepuisPrix, rDuTrade, estConforme, nbConfluencesCochees, relationBiais, trancheStop, trancheDuree,
           cleChrono, trierChrono, statsR, tCritique, intervalle95, tradesNecessaires, aleatoire, bootstrapPositif, centile,
           grouperR, analyseConfluences, frequence, issueSimulee, statsRegle, grilleSorties, atteintes, balayageStop,
           simulerChallenge, balayageRisque, eventailR, parserCSV, detecterOrdreDates, separerDateHeure, sensDepuisTexte,
           issueDepuisTexte, colonnesTV, estListeTradesTV, lireListeTradesTV, proposerUnR, devinerColonnes, lireTableurGenerique,
           rTradeJournal, depuisJournal, rDesPartiels, planDe, PLAN_DEFAUT, resumePartiels, partielsImportes, analysePartiels,
           multiplicateurDeduit, calculerTradeTV };
`)();

let echecs = 0, reussites = 0;
function verifier(nom, obtenu, attendu, tolerance) {
  const tol = tolerance === undefined ? 0.0005 : tolerance;
  let ok;
  if (typeof attendu === 'number' && typeof obtenu === 'number') ok = Math.abs(obtenu - attendu) <= tol || (obtenu === attendu);
  else ok = JSON.stringify(obtenu) === JSON.stringify(attendu);
  if (ok) { reussites++; console.log('   OK   ' + nom + '  =  ' + JSON.stringify(obtenu)); }
  else { echecs++; console.log('  ECHEC ' + nom + '  obtenu ' + JSON.stringify(obtenu) + '  attendu ' + JSON.stringify(attendu)); }
}
function titre(t) { console.log('\n' + t); console.log('-'.repeat(t.length)); }
const NB = ' ';
// Generateur "truque" : rend les valeurs dans l'ordre, puis repete la derniere paire.
function suite(valeurs) {
  let i = 0;
  return function () { const v = valeurs[Math.min(i, valeurs.length - 1)]; i++; if (i >= valeurs.length) i = valeurs.length - 2; return v; };
}

/* ------------------------------------------------------------------ */
titre('1. Lecture des nombres et des R');
verifier('versNombre("1 234,56")', M.versNombre('1 234,56'), 1234.56);
verifier('versNombre("$2.25")', M.versNombre('$2.25'), 2.25);
verifier('versNombre("(41.25)")', M.versNombre('(41.25)'), -41.25);
verifier('versNombre("-1 250,00 $")', M.versNombre('-1 250,00 $'), -1250);
verifier('versNombre("1,234") = milliers', M.versNombre('1,234'), 1234);
verifier('versNombre("7694,50") = decimale', M.versNombre('7694,50'), 7694.5);
verifier('versNombre("−3") moins typographique', M.versNombre('−3'), -3);
verifier('versNombre("") = null', M.versNombre(''), null);
verifier('versNombre("TP") = null', M.versNombre('TP'), null);
verifier('lireR("+3")', M.lireR('+3'), 3);
verifier('lireR("1,5")', M.lireR('1,5'), 1.5);
verifier('lireR("2.5R")', M.lireR('2.5R'), 2.5);
verifier('lireR("−0,5 r")', M.lireR('−0,5 r'), -0.5);
verifier('lireR("") = null', M.lireR(''), null);
verifier('lireR("1:3") = NaN', String(M.lireR('1:3')), 'NaN');
verifier('fmtR(3)', M.fmtR(3), '+3' + NB + 'R');
verifier('fmtR(-1)', M.fmtR(-1), '-1' + NB + 'R');
verifier('fmtR(0)', M.fmtR(0), '0' + NB + 'R');
verifier('fmtR(0.45)', M.fmtR(0.45), '+0,45' + NB + 'R');
verifier('fmtR(-0.001) = 0 R', M.fmtR(-0.001), '0' + NB + 'R');
verifier('fmtNombre(12345.678, 1)', M.fmtNombre(12345.678, 1), '12' + NB + '345,7');
verifier('fmtPct(0.4444)', M.fmtPct(0.4444), '44' + NB + '%');

/* ------------------------------------------------------------------ */
titre('2. Dates du replay (sans fuseau horaire)');
verifier('2025-02-29 n\'existe pas', M.dateValide('2025-02-29'), false);
verifier('2024-02-29 existe', M.dateValide('2024-02-29'), true);
verifier('12 mars 2025 = mercredi (3)', M.jourSemaine('2025-03-12'), 3);
verifier('28 fev + 1 jour', M.ajouterJours('2025-02-28', 1), '2025-03-01');
verifier('changement d\'heure du 9 mars sans effet', M.ajouterJours('2025-03-08', 1), '2025-03-09');
verifier('vendredi 7 mars -> lundi 10', M.jourOuvrable('2025-03-07', 1), '2025-03-10');
verifier('lundi 10 mars <- vendredi 7', M.jourOuvrable('2025-03-10', -1), '2025-03-07');
verifier('jours de bourse en mars 2025', M.joursOuvrables('2025-03-01', '2025-03-31'), 21);   // 4 semaines pleines + lundi 31
verifier('jours de bourse en 2025', M.joursOuvrables('2025-01-01', '2025-12-31'), 261);       // 52 semaines + mercredi 31 dec
verifier('fin avant debut = 0', M.joursOuvrables('2025-03-10', '2025-03-01'), 0);
verifier('lundi de la semaine du mercredi 12', M.lundiDe('2025-03-12'), '2025-03-10');
verifier('lundi de la semaine du dimanche 16', M.lundiDe('2025-03-16'), '2025-03-10');
verifier('minutesDe("9h30")', M.minutesDe('9h30'), 570);
verifier('minutesDe("25:00") = null', M.minutesDe('25:00'), null);
verifier('heureNormale("9:05")', M.heureNormale('9:05'), '09:05');

/* ------------------------------------------------------------------ */
titre('3. Seances');
const S = M.lireSeances(M.SEANCES_DEFAUT);
verifier('8 seances par defaut', S.length, 8);
verifier('09:30 = NY matin', M.seanceDe('09:30', S), 'NY matin');
verifier('09:29 = avant l\'ouverture', M.seanceDe('09:29', S), 'Avant l\'ouverture');
verifier('12:00 = Midi', M.seanceDe('12:00', S), 'Midi');
verifier('18:00 = Asie', M.seanceDe('18:00', S), 'Asie');
verifier('23:59 = Asie (18:00-00:00 passe minuit)', M.seanceDe('23:59', S), 'Asie');
verifier('00:00 = Nuit', M.seanceDe('00:00', S), 'Nuit');
verifier('02:00 = Londres', M.seanceDe('02:00', S), 'Londres');
verifier('16:00 = Fin de journee', M.seanceDe('16:00', S), 'Fin de journée');
verifier('sans heure', M.seanceDe('', S), 'Heure non notée');
const S2 = M.lireSeances('Test 22:00-02:00\nSilver Bullet 10h-11h\nligne illisible\nAM 9h30 - 11h');
verifier('formats 10h-11h et 9h30 - 11h acceptes', S2.map(s => s.nom + ':' + s.debut + '-' + s.fin), ['Test:1320-120', 'Silver Bullet:600-660', 'AM:570-660']);
verifier('01:00 dans 22:00-02:00', M.seanceDe('01:00', S2), 'Test');
verifier('12:00 hors de toute seance', M.seanceDe('12:00', S2), 'Hors séance');
verifier('tranche d\'une heure', M.trancheHeure('09:42'), '09 h');
verifier('tranche de 30 min', M.trancheDemiHeure('09:42'), '09:30');

/* ------------------------------------------------------------------ */
titre('4. Le R d\'un trade');
verifier('long 100, stop 90, sortie 130 = +3 R', M.rDepuisPrix('long', 100, 90, 130), 3);
verifier('short 100, stop 110, sortie 85 = +1,5 R', M.rDepuisPrix('short', 100, 110, 85), 1.5);
verifier('long sorti au stop = -1 R', M.rDepuisPrix('long', 20000, 19980, 19980), -1);
verifier('stop du mauvais cote = null', M.rDepuisPrix('long', 100, 110, 130), null);
verifier('R:R vise long 100/90/120 = 2', M.rrDepuisPrix('long', 100, 90, 120), 2);
verifier('cible du mauvais cote = null', M.rrDepuisPrix('long', 100, 90, 95), null);
verifier('points de stop', M.pointsDeStop({ entree: 20010.5, stop: 19985.25 }), 25.25);
verifier('TP au R:R vise', M.rDuTrade({ issue: 'tp', rrCible: 3 }), 3);
verifier('TP sans R:R = R ecrit', M.rDuTrade({ issue: 'tp', r: 2.2 }), 2.2);
verifier('SL = -1', M.rDuTrade({ issue: 'sl', r: 5 }), -1);
verifier('BE = 0', M.rDuTrade({ issue: 'be' }), 0);
verifier('Autre = R ecrit', M.rDuTrade({ issue: 'autre', r: -0.4 }), -0.4);
verifier('Autre sans R = null', M.rDuTrade({ issue: 'autre' }), null);
const CF = [{ id: 'a', nom: 'Sweep', obligatoire: true }, { id: 'b', nom: 'BOS', obligatoire: true }, { id: 'c', nom: 'SMT', obligatoire: false }];
verifier('dans le plan', M.estConforme({ confl: { a: true, b: true } }, CF), true);
verifier('hors plan (BOS manque)', M.estConforme({ confl: { a: true, c: true } }, CF), false);
verifier('aucune etape obligatoire = toujours dans le plan', M.estConforme({ confl: {} }, [{ id: 'z', obligatoire: false }]), true);
verifier('3 etapes cochees', M.nbConfluencesCochees({ confl: { a: true, b: true, c: true, x: true } }, CF), 3);
verifier('long + biais haussier', M.relationBiais({ sens: 'long', biais: 'haussier' }), 'Dans le sens du biais');
verifier('short + biais haussier', M.relationBiais({ sens: 'short', biais: 'haussier' }), 'Contre le biais');
verifier('tranche de stop 25 pts', M.trancheStop(25), '20 à 30 pts');
verifier('tranche de duree 45 min', M.trancheDuree(45), '30 à 60 min');

/* ------------------------------------------------------------------ */
titre('5. Statistiques en R (10 trades : 3 -1 -1 3 0 -1 3 -1 2 -1)');
const EX = [3, -1, -1, 3, 0, -1, 3, -1, 2, -1].map((r, i) => ({ id: 'x' + i, date: '2025-03-' + String(3 + i).padStart(2, '0'), heure: '09:45', issue: 'autre', r: r, cree: i }));
// on melange l'ordre : le calcul doit retrier dans l'ordre du replay
const s = M.statsR(EX.slice().reverse());
verifier('total = 11 - 5', s.total, 6);
verifier('esperance = 6 / 10', s.moyenne, 0.6);
verifier('mediane = (-1 + 0) / 2', s.mediane, -0.5);
verifier('gagnants / perdants / BE', [s.nbG, s.nbP, s.nbBE], [4, 5, 1]);
verifier('reussite = 4 / 9 (BE exclu)', s.tauxReussite, 4 / 9);
verifier('gain moyen 11 / 4', s.moyG, 2.75);
verifier('perte moyenne', s.moyP, -1);
verifier('facteur de profit 11 / 5', s.facteurProfit, 2.2);
verifier('pire recul (3 -> 1)', s.ddMax, 2);
verifier('le recul part du trade 1 et finit au trade 3', [s.ddDebut, s.ddFin], [0, 2]);
verifier('pire serie de pertes', s.serieP, 2);
verifier('meilleure serie de gains', s.serieG, 1);
verifier('ecart-type (somme des carres 32,4 / 9)', s.ecartType, Math.sqrt(3.6));
verifier('SQN = racine(10) x 0,6 / 1,897', s.sqn, 1.0);
verifier('seuil de rentabilite 1 / (1 + 2,75)', s.seuilRentabilite, 1 / 3.75);
verifier('courbe : dernier cumul', s.courbe[9].cumul, 6);
verifier('courbe dans l\'ordre du replay', s.courbe[0].id, 'x0');
verifier('meilleur et pire', [s.meilleur.r, s.pire.r, s.pire.id], [3, -1, 'x1']);
const vide = M.statsR([]);
verifier('aucun trade', [vide.nb, vide.moyenne, vide.tauxReussite, vide.facteurProfit], [0, null, null, null]);
verifier('que des gagnants : facteur infini', M.statsR([{ issue: 'tp', rrCible: 2, date: '2025-01-02' }]).facteurProfit, Infinity);
verifier('trade sans R mis de cote', M.statsR([{ issue: 'autre', date: '2025-01-02' }, { issue: 'sl', date: '2025-01-03' }]).nbSansR, 1);
verifier('ordre : sans heure apres les heures du meme jour',
  M.trierChrono([{ id: 'b', date: '2025-01-02', heure: '' }, { id: 'a', date: '2025-01-02', heure: '10:00' }, { id: 'c', date: '2025-01-01', heure: '15:00' }]).map(t => t.id), ['c', 'a', 'b']);

/* ------------------------------------------------------------------ */
titre('6. Fiabilite de l\'echantillon');
const ic = M.intervalle95(s.valeurs);
verifier('t critique a 9 degres', M.tCritique(9), 2.262);
verifier('t critique a 35 degres (prudent : celui de 30)', M.tCritique(35), 2.042);
verifier('t critique au-dela de 120', M.tCritique(500), 1.96);
verifier('erreur standard 1,897 / racine(10)', ic.erreur, 0.6);
verifier('bas de la fourchette 0,6 - 2,262 x 0,6', ic.bas, 0.6 - 2.262 * 0.6);
verifier('haut de la fourchette', ic.haut, 0.6 + 2.262 * 0.6);
verifier('statistique t', ic.tStat, 1);
verifier('trades necessaires (1,96 x 1,897 / 0,6)^2 = 38,4', M.tradesNecessaires(0.6, Math.sqrt(3.6)), 39);
verifier('esperance negative : pas de chiffre', M.tradesNecessaires(-0.2, 1), null);
const r1 = M.aleatoire(42), r2 = M.aleatoire(42);
verifier('meme graine, memes tirages', [r1(), r1(), r1()].join(), [r2(), r2(), r2()].join());
verifier('tirages entre 0 et 1', [0, 0, 0, 0, 0].map(() => r1()).every(x => x >= 0 && x < 1), true);
verifier('bootstrap de gagnants seulement = 100 %', M.bootstrapPositif([1, 2, 0.5], 500, M.aleatoire(1)), 1);
verifier('bootstrap de perdants seulement = 0 %', M.bootstrapPositif([-1, -1, -0.5], 500, M.aleatoire(1)), 0);
const bp = M.bootstrapPositif(s.valeurs, 4000, M.aleatoire(7));
verifier('bootstrap de l\'exemple : environ 84 % (t = 1)', bp, 0.84, 0.04);
verifier('centile 50 de 1..5', M.centile([1, 2, 3, 4, 5], 0.5), 3);
verifier('centile 25 de 1..4', M.centile([1, 2, 3, 4], 0.25), 1.75);

/* ------------------------------------------------------------------ */
titre('7. Regroupements et frequence');
const G = M.grouperR([{ tags: ['A', 'B'], issue: 'sl', date: '2025-01-02' }, { tags: ['A'], issue: 'tp', rrCible: 3, date: '2025-01-03' }, { tags: [], issue: 'be', date: '2025-01-03' }],
  t => t.tags.length ? t.tags : 'aucune', ['B', 'A']);
verifier('ordre impose puis le reste', G.map(g => g.cle), ['B', 'A', 'aucune']);
verifier('un trade compte dans chaque etiquette', G.map(g => g.stats.total), [-1, 2, 0]);
const AC = M.analyseConfluences([
  { confl: { a: true }, issue: 'tp', rrCible: 3, date: '2025-01-02' },
  { confl: { a: true }, issue: 'sl', date: '2025-01-03' },
  { confl: {}, issue: 'sl', date: '2025-01-04' }], CF);
verifier('avec le sweep : +1 R par trade', AC[0].avec.moyenne, 1);
verifier('sans le sweep : -1 R', AC[0].sans.moyenne, -1);
verifier('ecart du sweep', AC[0].ecart, 2);
const fr = M.frequence(
  [{ campagneId: 'c', date: '2025-01-02' }, { campagneId: 'c', date: '2025-01-02' }, { campagneId: 'c', date: '2025-01-03' }],
  ['c|2025-01-02', 'c|2025-01-03', 'c|2025-01-06', 'c|2025-01-07', 'c|2025-01-08']);
verifier('5 jours testes dont 3 vides', [fr.nbJours, fr.joursAvecTrade], [5, 2]);
verifier('trades par jour 3 / 5', fr.parJour, 0.6);
verifier('trades par semaine 5 x 0,6', fr.parSemaine, 3);
verifier('distribution des jours', fr.distribution, { 0: 3, 1: 1, 2: 1 });
verifier('liste pour la simulation', fr.listeParJour.slice().sort(), [0, 0, 0, 1, 2]);

/* ------------------------------------------------------------------ */
titre('8. Cible et stop rejoues avec le MFE et le MAE');
const MF = [0.5, 1.2, 2.5, 3.5, 0.2, 4.0].map((m, i) => ({ id: 'm' + i, date: '2025-02-0' + (i + 1), mfe: m, issue: 'autre', r: 0, cree: i }));
verifier('cible 2 avec MFE 2,4 = +2', M.issueSimulee({ mfe: 2.4 }, { cible: 2, be: null }), 2);
verifier('cible 3, BE a 1, MFE 1,8 = 0', M.issueSimulee({ mfe: 1.8 }, { cible: 3, be: 1 }), 0);
verifier('stop a 70 %, MAE 0,8 = stoppe', M.issueSimulee({ mfe: 3, mae: 0.8 }, { cible: 2, be: null, stopFrac: 0.7 }), -1);
verifier('stop a 50 %, MAE 0,3, MFE 1,2 -> 2,4 nouveaux R', M.issueSimulee({ mfe: 1.2, mae: 0.3 }, { cible: 2, be: null, stopFrac: 0.5 }), 2);
verifier('stop serre sans MAE = inutilisable', M.issueSimulee({ mfe: 3 }, { cible: 2, be: null, stopFrac: 0.7 }), null);
verifier('sans MFE = inutilisable', M.issueSimulee({}, { cible: 2, be: null }), null);
verifier('cible 2 : -1 -1 +2 +2 -1 +2', M.statsRegle(MF, { cible: 2, be: null }).total, 3);
verifier('cible 2, BE a 1 : -1 0 2 2 -1 2', M.statsRegle(MF, { cible: 2, be: 1 }).total, 4);
verifier('cible 3 : -1 -1 -1 3 -1 3', M.statsRegle(MF, { cible: 3, be: null }).total, 2);
verifier('partiel 50 % a 1 R, reste vise 3 R au BE', M.statsRegle(MF, { cible: 3, be: null, partiel: { a: 1, part: 0.5 } }).total, 3);   // -1 +0,5 +0,5 +2 -1 +2
const GS = M.grilleSorties(MF.concat([{ id: 'sans', date: '2025-02-09', issue: 'sl' }]), [1, 2, 3], [null, 1]);
verifier('grille : 6 trades avec MFE, 1 sans', [GS.nb, GS.nbSansMfe], [6, 1]);
verifier('BE a 1 avec cible 1 = case vide', GS.lignes[1].cellules[0].stats, null);
verifier('cible 1 sans BE : 4 x 1 - 2', GS.lignes[0].cellules[0].stats.total, 2);
verifier('meilleur reglage : cible 2, BE a 1 (premier a 0,667)', [GS.meilleur.cible, GS.meilleur.be], [2, 1]);
verifier('esperance du meilleur 4 / 6', GS.meilleur.stats.moyenne, 4 / 6);
verifier('part qui atteint 1, 2, 3 R', M.atteintes(MF, [1, 2, 3]).map(a => a.nb), [4, 3, 2]);
const BS = M.balayageStop([{ mfe: 1.2, mae: 0.3, date: '2025-01-01' }, { mfe: 2.5, mae: 0.6, date: '2025-01-02' }, { mfe: 0.4, mae: 1, date: '2025-01-03' }], 2, [0.5, 1]);
verifier('stop a 50 % : +2 -1 -1', BS[0].stats.total, 0);
verifier('stop d\'origine : -1 +2 -1', BS[1].stats.total, 0);

/* ------------------------------------------------------------------ */
titre('9. Simulateur de challenge');
const BASE = { capital: 50000, risque: 500, frais: 0, objectif: 3000, perteMax: 2000, suiveuse: true, bloqueAuDepart: false,
               perteJour: null, perteJourElimine: false, constance: null, joursMin: 0, joursMax: 50, maxTradesJour: null, stopJourR: null, decoteR: 0, nSim: 20 };
let ch = M.simulerChallenge([2], [1], BASE, M.aleatoire(1));
verifier('+1 000 $ par jour : reussi le 3e jour', [ch.reussite, ch.joursMedianReussite], [1, 3]);
ch = M.simulerChallenge([-1], [1], BASE, M.aleatoire(1));
verifier('-500 $ par jour : perdu le 4e jour (50 000 - 2 000)', [ch.echec, ch.joursMedianEchec], [1, 4]);
ch = M.simulerChallenge([2], [0], BASE, M.aleatoire(1));
verifier('aucun trade : jamais fini', ch.inacheve, 1);
ch = M.simulerChallenge([2], [1], Object.assign({}, BASE, { frais: 1000 }), M.aleatoire(1));
verifier('les frais mangent tout le gain', ch.inacheve, 1);
ch = M.simulerChallenge([2], [1], Object.assign({}, BASE, { decoteR: 1 }), M.aleatoire(1));
verifier('prudence de 1 R : +500 $ par jour, reussi le 6e jour', ch.joursMedianReussite, 6);
// regle de constance 40 % : +2 000 $ par jour. Jour 2 : 4 000 $ mais le meilleur jour (2 000) depasse 40 % (1 600) ;
// jour 3 : 6 000 $, 40 % = 2 400, c'est bon.
ch = M.simulerChallenge([5], [1], Object.assign({}, BASE, { risque: 400, constance: 0.4 }), M.aleatoire(1));
verifier('constance : reussi le 3e jour au lieu du 2e', [ch.joursMedianReussite, ch.bloqueParConstance], [3, 20]);
ch = M.simulerChallenge([2], [1], Object.assign({}, BASE, { joursMin: 5 }), M.aleatoire(1));
verifier('5 jours minimum', ch.joursMedianReussite, 5);
// perte max du jour : 3 trades a -400 $, limite 1 000 $
ch = M.simulerChallenge([-1], [3], Object.assign({}, BASE, { risque: 400, perteJour: 1000, perteJourElimine: true }), M.aleatoire(1));
verifier('perte du jour eliminatoire : perdu le 1er jour', [ch.echec, ch.joursMedianEchec, ch.causes.perteJour], [1, 1, 20]);
ch = M.simulerChallenge([-1], [3], Object.assign({}, BASE, { risque: 400, perteJour: 1000, perteJourElimine: false }), M.aleatoire(1));
verifier('perte du jour non eliminatoire : la perte max tombe le 2e jour', [ch.joursMedianEchec, ch.causes.plancher], [2, 20]);
ch = M.simulerChallenge([-1], [5], Object.assign({}, BASE, { risque: 400, stopJourR: 2 }), M.aleatoire(1));
verifier('arret apres 2 R perdus : 800 $ par jour, perdu le 3e jour', ch.joursMedianEchec, 3);
ch = M.simulerChallenge([-1], [5], Object.assign({}, BASE, { risque: 400, maxTradesJour: 1 }), M.aleatoire(1));
verifier('1 trade max par jour : perdu le 5e jour', ch.joursMedianEchec, 5);
// plancher qui suit le solde : tirages truques. rs = [3, -1] : 0,1 -> +3 R, 0,9 -> -1 R.
// Jours 1 et 2 a +1 500 $ (53 000), puis -500 $ par jour.
const seq = [0.5, 0.1, 0.5, 0.1, 0.5, 0.9];
const T = Object.assign({}, BASE, { objectif: 100000, joursMax: 20, nSim: 1 });
ch = M.simulerChallenge([3, -1], [1], T, suite(seq));
verifier('plancher suiveur : 53 000 - 2 000 = 51 000, touche le 6e jour', ch.joursMedianEchec, 6);
ch = M.simulerChallenge([3, -1], [1], Object.assign({}, T, { bloqueAuDepart: true }), suite(seq));
verifier('plancher bloque a 50 000 : touche le 8e jour', ch.joursMedianEchec, 8);
ch = M.simulerChallenge([3, -1], [1], Object.assign({}, T, { suiveuse: false }), suite(seq));
verifier('plancher fixe a 48 000 : touche le 12e jour', ch.joursMedianEchec, 12);
const BR = M.balayageRisque([2], [1], BASE, [250, 1000], 3);
verifier('balayage : 250 $ = 6 jours, 1 000 $ = 2 jours', BR.map(x => x.sim.joursMedianReussite), [6, 2]);
const pile = M.simulerChallenge([3, -1, -1, 2, 0.5], [0, 1, 1, 2], Object.assign({}, BASE, { nSim: 500, joursMax: 120 }), M.aleatoire(9));
verifier('les trois issues font 100 %', pile.reussite + pile.echec + pile.inacheve, 1);
verifier('meme graine, meme resultat', M.simulerChallenge([3, -1, -1, 2, 0.5], [0, 1, 1, 2], Object.assign({}, BASE, { nSim: 500, joursMax: 120 }), M.aleatoire(9)).reussite, pile.reussite);
const ev = M.eventailR([1], 100, 50, M.aleatoire(1));
verifier('eventail de gains surs : 100 R, aucun recul', [ev.finalMedian, ev.ddMedian, ev.serieMediane, ev.partFinalNegatif], [100, 0, 0, 0]);
verifier('eventail : bande du 10e trade', [ev.bandes[9].p5, ev.bandes[9].p95], [10, 10]);
const ev2 = M.eventailR([-1], 20, 10, M.aleatoire(1));
verifier('eventail de pertes sures : serie de 20', [ev2.serieMediane, ev2.dd95, ev2.partSeries[10]], [20, 20, 1]);

/* ------------------------------------------------------------------ */
titre('10. Lecture des dates et du sens dans les fichiers');
verifier('"2025-03-12 09:42"', M.separerDateHeure('2025-03-12 09:42'), { date: '2025-03-12', heure: '09:42' });
verifier('"2025-03-12T09:42:13"', M.separerDateHeure('2025-03-12T09:42:13'), { date: '2025-03-12', heure: '09:42' });
verifier('"2025-3-5" sans heure', M.separerDateHeure('2025-3-5'), { date: '2025-03-05', heure: '' });
verifier('"12/03/2025 09:42" en francais', M.separerDateHeure('12/03/2025 09:42', 'jm'), { date: '2025-03-12', heure: '09:42' });
verifier('"03/12/2025 9:42 PM" en anglais', M.separerDateHeure('03/12/2025 9:42 PM', 'mj'), { date: '2025-03-12', heure: '21:42' });
verifier('"12:15 AM" = 00:15', M.separerDateHeure('03/12/2025 12:15 AM', 'mj').heure, '00:15');
verifier('"31/12/2025" malgre l\'ordre anglais', M.separerDateHeure('31/12/2025', 'mj').date, '2025-12-31');
verifier('numero de serie Excel 45728,404167', M.separerDateHeure(45728.404166667), { date: '2025-03-12', heure: '09:42' });
verifier('"2025-02-30" refuse', M.separerDateHeure('2025-02-30'), null);
verifier('texte quelconque refuse', M.separerDateHeure('hier'), null);
verifier('colonne anglaise reconnue', M.detecterOrdreDates(['03/25/2025', '04/01/2025']), 'mj');
verifier('colonne francaise reconnue', M.detecterOrdreDates(['25/03/2025', '01/04/2025']), 'jm');
verifier('colonne ambigue = francais', M.detecterOrdreDates(['03/04/2025']), 'jm');
verifier('sens', ['Buy', 'Sell', 'Entry long', 'Exit short', 'Entrée long', 'Sortie short', 'L', 'S', 'bear', 'loss', ''].map(M.sensDepuisTexte),
  ['long', 'short', 'long', 'short', 'long', 'short', 'long', 'short', 'short', null, null]);
verifier('issue', ['TP', 'Win', 'SL', 'Loss', 'BE', 'breakeven', 'x'].map(M.issueDepuisTexte), ['tp', 'tp', 'sl', 'sl', 'be', 'be', null]);

/* ------------------------------------------------------------------ */
titre('11. Liste des trades du testeur de strategie TradingView');
const CSV_TV =
`Trade #,Type,Date/Time,Signal,Price USD,Position size (qty),Position size (value),Net P&L USD,Net P&L %,Run-up USD,Run-up %,Drawdown USD,Drawdown %,Cumulative P&L USD,Cumulative P&L %
3,Exit short,2025-03-14 10:30,Open,19800,1,19800,100,0.5,100,0.5,0,0,600,1.2
3,Entry short,2025-03-14 10:02,Short,19850,1,19850,100,0.5,100,0.5,0,0,600,1.2
2,Exit short,2025-03-13 11:15,SL,20060,1,20060,-250,-1.2,150,0.7,-250,-1.2,500,1
2,Entry short,2025-03-13 10:50,Short,20010,1,20010,-250,-1.2,150,0.7,-250,-1.2,500,1
1,Exit long,2025-03-12 10:05,TP,20100,1,20100,750,3.7,900,4.5,-50,-0.2,750,1.5
1,Entry long,2025-03-12 09:41,Long,19950,1,19950,750,3.7,900,4.5,-50,-0.2,750,1.5`;
const LTV = M.parserCSV(CSV_TV);
const c = M.colonnesTV(LTV[0]);
verifier('colonnes reconnues (les % ecartes)', [c.num, c.type, c.date, c.signal, c.prix, c.qte, c.profit, c.runup, c.drawdown], [0, 1, 2, 3, 4, 5, 7, 9, 11]);
verifier('format reconnu', M.estListeTradesTV(LTV[0]), true);
verifier('un tableau quelconque n\'est pas reconnu', M.estListeTradesTV(['Date', 'Sens', 'R']), false);
const tv = M.lireListeTradesTV(LTV, 250);
verifier('2 trades lus, le trade encore ouvert ecarte', [tv.trades.length, tv.ignores.length, tv.ignores[0].raison], [2, 1, 'trade encore ouvert']);
const t2 = tv.trades.filter(t => t.numTV === '2')[0], t1 = tv.trades.filter(t => t.numTV === '1')[0];
verifier('trade 1 : long, 12 mars 09:41', [t1.sens, t1.date, t1.heure], ['long', '2025-03-12', '09:41']);
verifier('trade 1 : 750 $ / 250 $ = +3 R', t1.r, 3);
verifier('trade 1 : MFE 900 / 250', t1.mfe, 3.6);
verifier('trade 1 : MAE 50 / 250', t1.mae, 0.2);
verifier('trade 1 : prix et duree', [t1.entree, t1.sortie, t1.duree], [19950, 20100, 24]);
verifier('trade 2 : short a -1 R, MAE 1', [t2.sens, t2.r, t2.mae, t2.mfe], ['short', -1, 1, 0.6]);
verifier('1 R propose = perte mediane', M.proposerUnR(tv.pertes), 250);
verifier('sans 1 R : pas de R', M.lireListeTradesTV(LTV, 0).trades[0].r, null);
const CSV_TV_FR =
`N° de trade;Type;Signal;Date/Heure;Prix USD;Contrats;Profit USD;Profit %;Run-up USD;Drawdown USD
1;Sortie long;TP;12/03/2025 10:05;20100;2;1 000,00;2,5;1 200,00;-100,00
1;Entrée long;Long;12/03/2025 09:41;19950;2;1 000,00;2,5;1 200,00;-100,00`;
const tvfr = M.lireListeTradesTV(M.parserCSV(CSV_TV_FR), 500);
verifier('version francaise : point-virgule, virgule decimale, jour/mois', [tvfr.trades.length, tvfr.trades[0].date, tvfr.trades[0].sens, tvfr.trades[0].r, tvfr.trades[0].mfe], [1, '2025-03-12', 'long', 2, 2.4]);

/* ------------------------------------------------------------------ */
titre('12. Tableau quelconque (Google Sheets, Excel...)');
const CSV_G =
`Date;Heure;Direction;Résultat;RR;MFE;Setup;Notes
12/03/2025;09:42;Long;2,5R;3;3,1;Sweep Asie, Silver Bullet;ok
13/03/2025;10:05;Short;SL;3;0,4;;
14/03/2025;;Buy;TP;;;;
15/03/2025;11:00;Short;??;;;;`;
const LG = M.parserCSV(CSV_G);
const map = M.devinerColonnes(LG[0]);
verifier('colonnes devinees', [map.date, map.heure, map.sens, map.r, map.rr, map.mfe, map.setup, map.notes, map.issue], [0, 1, 2, 3, 4, 5, 6, 7, -1]);
const g = M.lireTableurGenerique(LG, map, { rrDefaut: 2 });
verifier('3 trades lus, 1 ecarte', [g.trades.length, g.ignores.length], [3, 1]);
verifier('ligne 1 : +2,5 R, MFE 3,1, 2 etiquettes', [g.trades[0].issue, g.trades[0].r, g.trades[0].mfe, g.trades[0].tags.length, g.trades[0].rrCible], ['autre', 2.5, 3.1, 2, 3]);
verifier('ligne 2 : SL = -1 R', [g.trades[1].issue, M.rDuTrade(g.trades[1]), g.trades[1].sens], ['sl', -1, 'short']);
verifier('ligne 3 : TP au R:R par defaut', [g.trades[2].issue, M.rDuTrade(g.trades[2]), g.trades[2].sens, g.trades[2].heure], ['tp', 2, 'long', '']);
const LP = M.parserCSV('date,side,entry,stop,exit\n2025-03-12 09:42,short,100,110,85');
const gp = M.lireTableurGenerique(LP, M.devinerColonnes(LP[0]), {});
verifier('R calcule depuis les prix', [gp.trades.length, gp.trades[0] && gp.trades[0].r], [1, 1.5]);

/* ------------------------------------------------------------------ */
titre('13. Trades du journal reel');
verifier('R ecrit a la main', M.rTradeJournal({ rManuel: 2 }), 2);
verifier('R depuis le stop prevu : 160 $ / (20 pts x 2 x 2 $)', M.rTradeJournal({ prixEntree: 20000, stopPrevu: 19980, qte: 2, multiplicateur: 2, net: 160 }), 2);
verifier('sans stop ni R', M.rTradeJournal({ net: 100 }), null);
const dj = M.depuisJournal({ cle: 'MNQ#1', ouverture: new Date(2026, 8, 25, 9, 45).getTime(), sens: 'short', rManuel: -1, symbole: 'MNQ' });
verifier('conversion d\'un trade du journal', [dj.date, dj.heure, dj.sens, dj.r, dj.id], ['2026-09-25', '09:45', 'short', -1, 'reel-MNQ#1']);

/* ------------------------------------------------------------------ */
titre('14. Sorties partielles TP1 / TP2 / TP3');
const P3 = [{ r: 1, pct: 50, touche: true }, { r: 2, pct: 25, touche: true }, { r: 3, pct: 25, touche: false }];
verifier('TP1 et TP2 touches, reste au BE : 0,5 + 0,5 + 0', M.rDesPartiels(P3, 0), 1);
verifier('meme chose, reste au stop : 0,5 + 0,5 - 0,25', M.rDesPartiels(P3, -1), 0.75);
verifier('rien touche, tout au stop', M.rDesPartiels(P3.map(x => Object.assign({}, x, { touche: false })), -1), -1);
verifier('tout touche : 0,5 + 0,5 + 0,75', M.rDesPartiels(P3.map(x => Object.assign({}, x, { touche: true })), 0), 1.75);
verifier('reste sorti a la main a +1,7 R', M.rDesPartiels([{ r: 1, pct: 50, touche: true }, { r: 3, pct: 50, touche: false }], 1.7), 1.35);
verifier('parts qui ne font pas 100 % = inconnu', M.rDesPartiels([{ r: 1, pct: 50, touche: true }, { r: 2, pct: 30, touche: true }], 0), null);
verifier('TP rate sans reste choisi = inconnu', M.rDesPartiels(P3, null), null);
verifier('rDuTrade d\'un trade a partiels', M.rDuTrade({ issue: 'partiels', partiels: P3, resteR: 0 }), 1);
verifier('resume des TP', M.resumePartiels({ issue: 'partiels', partiels: P3 }), 'TP1 ✓ · TP2 ✓ · TP3 ✗');
verifier('plan par defaut si la strategie n\'en a pas', M.planDe({}).niveaux.length, 3);
// le plan rejoue avec le MFE : 50 % a 1 R, 25 % a 2 R, 25 % a 3 R, BE apres TP1
const PL = { niveaux: [{ r: 1, pct: 50 }, { r: 2, pct: 25 }, { r: 3, pct: 25 }], beApresTp1: true };
verifier('plan, MFE 2,4 : 0,5 + 0,5 + 0', M.issueSimulee({ mfe: 2.4 }, { plan: PL }), 1);
verifier('plan, MFE 0,8 : tout au stop', M.issueSimulee({ mfe: 0.8 }, { plan: PL }), -1);
verifier('plan, MFE 3,2 : tout pris', M.issueSimulee({ mfe: 3.2 }, { plan: PL }), 1.75);
verifier('plan sans BE, MFE 1,5 : 0,5 - 0,5', M.issueSimulee({ mfe: 1.5 }, { plan: { niveaux: PL.niveaux, beApresTp1: false } }), 0);
const AP = M.analysePartiels([
  { id: 'a', date: '2025-01-02', issue: 'partiels', resteR: 0, partiels: [{ r: 1, pct: 50, touche: true }, { r: 2, pct: 25, touche: true }, { r: 3, pct: 25, touche: false }] },
  { id: 'b', date: '2025-01-03', issue: 'partiels', resteR: -1, partiels: [{ r: 1, pct: 50, touche: false }, { r: 2, pct: 25, touche: false }, { r: 3, pct: 25, touche: false }] },
  { id: 'c', date: '2025-01-06', issue: 'partiels', resteR: 0, partiels: [{ r: 1, pct: 50, touche: true }, { r: 2, pct: 25, touche: true }, { r: 3, pct: 25, touche: true }] },
  { id: 'd', date: '2025-01-07', issue: 'tp', rrCible: 3 }]);
verifier('analyse : 3 trades a partiels', AP.nb, 3);
verifier('TP1 touche 2 fois sur 3', [AP.touches[0].nbTouche, AP.touches[0].nb], [2, 3]);
verifier('TP3 touche 1 fois sur 3', AP.touches[2].nbTouche, 1);
verifier('ton plan reel : 1 - 1 + 1,75', AP.plan.total, 1.75);
verifier('tout a TP1 : 1 - 1 + 1', AP.toutA[0].stats.total, 1);
verifier('tout a TP3 : 0 (BE) - 1 + 3', AP.toutA[2].stats.total, 2);

titre('15. Replay Trading de TradingView : sorties partielles regroupees');
// Long 4 MNQ a 20 000, stop 19 980 (20 points = 1 R = 160 $). TradingView coupe le trade en 3 lignes :
// 2 contrats a 20 020 (+1 R, +80 $), 1 a 20 040 (+2 R, +80 $), 1 ramene au point mort (0 $).
// Le prix est monte a 20 050 (50 points = 2,5 R) et descendu a 19 990 (10 points = 0,5 R).
const CSV_P =
`Trade #,Type,Date/Time,Signal,Price USD,Position size (qty),Net P&L USD,Run-up USD,Drawdown USD
4,Exit short,2025-03-13 10:20,SL,20110,1,-20,0,-20
4,Entry short,2025-03-13 10:00,Short,20100,1,-20,0,-20
3,Exit long,2025-03-12 10:30,Close position,20000,1,0,100,-20
3,Entry long,2025-03-12 09:41,Long,20000,1,0,100,-20
2,Exit long,2025-03-12 10:12,TP2,20040,1,80,80,-20
2,Entry long,2025-03-12 09:41,Long,20000,1,80,80,-20
1,Exit long,2025-03-12 09:55,TP1,20020,2,80,80,-40
1,Entry long,2025-03-12 09:41,Long,20000,2,80,80,-40`;
const LP3 = M.parserCSV(CSV_P);
const cleA = '2025-03-12 09:41|long|20000', cleB = '2025-03-13 10:00|short|20100';
let rp = M.lireListeTradesTV(LP3, 0, { [cleA]: 19980, [cleB]: 20110 });
verifier('8 lignes, 4 morceaux, 2 trades', rp.trades.length, 2);
const A = rp.trades[0], B = rp.trades[1];
verifier('le trade a 3 sorties, dans l\'ordre du temps', [A.cle, A.sorties.length, A.sorties.map(x => x.prix), A.numTV], [cleA, 3, [20020, 20040, 20000], '1+2+3']);
verifier('4 contrats, 160 $ de profit', [A.qte, A.profit], [4, 160]);
verifier('2 $ le point retrouve dans le fichier (MNQ)', A.multiplicateur, 2);
verifier('avec le stop : sorties a +1, +2 et 0 R', A.partiels.map(x => x.r), [1, 2, 0]);
verifier('parts de 50, 25 et 25 %', A.partiels.map(x => x.pct), [50, 25, 25]);
verifier('resultat +1 R, issue partiels', [A.r, A.issue, A.mode], [1, 'partiels', 'stop']);
verifier('rDuTrade le retrouve depuis les parts', M.rDuTrade({ issue: A.issue, partiels: A.partiels, resteR: null }), 1);
verifier('MFE 50 / 20 points = 2,5 R', A.mfe, 2.5);
verifier('MAE 10 / 20 points = 0,5 R', A.mae, 0.5);
verifier('duree 09:41 -> 10:30', A.duree, 49);
verifier('le trade a une seule sortie reste simple', [B.issue, B.r, B.partiels, B.mfe, B.mae], ['autre', -1, null, 0, 1]);
verifier('un trade importe se resume en sorties', M.resumePartiels({ issue: 'partiels', partiels: A.partiels }), '3 sorties');
rp = M.lireListeTradesTV(LP3, 160);
verifier('sans stop, 1 R = 160 $ : memes niveaux', [rp.trades[0].partiels.map(x => x.r), rp.trades[0].r, rp.trades[0].mfe], [[1, 2, 0], 1, 2.5]);
rp = M.lireListeTradesTV(LP3, 200);
verifier('1 R = 200 $ : 160 / 200', rp.trades[0].r, 0.8);
rp = M.lireListeTradesTV(LP3, 0, { [cleA]: 20010 });
verifier('stop du mauvais cote : pas de R', rp.trades[0].r, null);
rp = M.lireListeTradesTV(LP3, 0);
verifier('ni stop ni 1 R : pas de R, mais le trade est lu', [rp.trades.length, rp.trades[0].r, rp.trades[0].sorties.length], [2, null, 3]);
verifier('1 R propose = perte mediane des trades entiers', M.proposerUnR(rp.pertes), 20);
verifier('multiplicateur ES 50 $ reconnu malgre 1 % de frais', M.multiplicateurDeduit([{ prix: 5010, qte: 1, profit: 495 }], 5000), 50);
verifier('multiplicateur inconnu sans mouvement', M.multiplicateurDeduit([{ prix: 5000, qte: 1, profit: 0 }], 5000), null);

/* ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(60));
console.log((echecs ? 'ECHEC : ' : 'TOUT EST BON : ') + reussites + ' verifications reussies, ' + echecs + ' en echec.');
process.exit(echecs ? 1 : 0);
