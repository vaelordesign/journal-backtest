# Journal de backtest

Le compagnon du [journal de trading](https://vaelordesign.github.io/journal-trading/) :
tu rejoues le marché dans le Bar Replay de TradingView, tu notes chaque setup, et l'app te dit
si ta stratégie tient debout, en R.

Un seul fichier `index.html` : aucun compte, aucun serveur, aucune donnée qui sort du navigateur.

## Ce qu'il fait

- **Séance de replay** : le jour du replay en cours, + Trade (N), Jour terminé (J), les jours
  sans setup comptés, ta checklist sous les yeux, l'avancement de la campagne.
- **Fiche de trade rapide** : TP / SL / BE / sorties partielles TP1 TP2 TP3 / Autre, R:R visé, MFE et MAE, étapes de la
  stratégie (obligatoires ou non), qualité D à A+, biais du jour, étiquettes, case « douteux »,
  captures collées au Ctrl+V, prix facultatifs (le R se calcule seul).
- **Campagnes** : une stratégie sur une période, des règles figées, des versions à comparer.
- **Tableau de bord** : total, espérance, réussite, facteur de profit, pire recul, séries,
  SQN, trades par semaine, courbe en R, fourchette à 95 %, tirages au hasard, trades
  nécessaires, et l'éventail des 100 prochains trades.
- **Analyses** : chaque étape avec et sans, nombre d'étapes, dans le plan ou non, séance,
  jour, demi-heure, sens, biais, qualité, R:R, taille du stop, durée, étiquettes, mois.
- **Laboratoire** : filtres « et si je ne prenais que... », comparés à l'ensemble, avec le
  test des deux moitiés contre la sur-optimisation.
- **Cible et stop** : jusqu'où vont tes trades, grille cible x mise au BE, partiels, stop
  plus serré, rejoués avec le MFE et le MAE.
- **Simulateur de challenge** : Monte-Carlo sur tes journées et tes trades, règles
  FundedNext (perte max suiveuse, perte du jour, constance), balayage du risque par trade.
- **Comparer** : campagnes côte à côte, et backtest contre trading réel (lecture seule du
  journal de trading).
- **Import** : liste des trades du Replay Trading ou du testeur de stratégie TradingView (anglais ou français),
  sorties partielles regroupées en un trade, R exact avec le prix du stop,
  tout tableau CSV ou Excel, les rejeux déjà notés dans le journal.
- **Galerie**, **calendrier du replay**, **export CSV**, **sauvegarde JSON**, **lien de
  partage** en lecture seule.

Mode d'emploi complet : [MODE-EMPLOI.md](MODE-EMPLOI.md).

## Vérification

```
node verifier-moteur.cjs
```

261 vérifications du moteur de calcul, rejouées sur le code livré dans `index.html`.

Test de bout en bout dans un vrai Chrome (137 vérifications, ordinateur et téléphone) :
servir le dossier `Typing` sur le port 8772, puis `node tests/test-ui.cjs`.
