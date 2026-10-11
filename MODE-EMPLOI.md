# Journal de backtest : mode d'emploi

L'app sert à une seule chose : savoir, chiffres en main, si ta stratégie tient debout
**avant** de risquer de l'argent ou un challenge. Tu rejoues le marché dans le
**Bar Replay** de TradingView, et tu notes ici chaque setup que ta stratégie aurait pris.

Tout est compté en **R** :

- **+3 R** = la cible d'un 1:3 est touchée
- **-1 R** = le stop est touché
- **0 R** = sortie au point mort (BE)

Les dollars n'apparaissent que dans le simulateur de challenge, où tu choisis combien vaut 1 R.

---

## 1. Ouvrir l'app

- **Sur l'ordinateur :** double-clic sur `index.html` (Chrome ou Edge).
- Tes données restent **dans ce navigateur, à cette adresse**. Le fichier ouvert en double-clic
  et la version en ligne (si elle est publiée) ont chacun leur propre mémoire : on passe de
  l'un à l'autre avec **Sauvegarder** puis **Restaurer une sauvegarde** (boutons en haut à droite).
- **Fais une sauvegarde de temps en temps** (bouton **Sauvegarder** en haut). Vider les données du
  navigateur efface tout.

## 2. Le principe : des campagnes

Une **campagne** = une stratégie testée sur une période, avec des règles qui **ne bougent pas**.
Exemple : « ICT 2022 sur MNQ, janvier à mars 2025 ».

Pour tester un changement de règle (« et si je ne tradais plus contre le biais ? »), tu ne
modifies pas la campagne en cours : bouton **Nouvelle version** dans *Campagnes et stratégies*,
puis tu compares les deux dans l'écran **Comparer**.

Ta stratégie **ICT 2022 (tes 5 étapes)** est déjà prête, avec les 5 étapes obligatoires
(sweep, BOS ou iFVG, FVG ou EQH/EQL, iFVG en 1 min, cible sur la liquidité opposée) et
5 confluences en plus (killzone, biais HTF, premium/discount, SMT, pas d'annonce).
Tu peux tout modifier dans *Campagnes et stratégies*.

## 3. Une séance de backtest, pas à pas

1. Ouvre TradingView, ton graphique MNQ, et lance le **Bar Replay** sur le jour indiqué
   par l'app (écran **Séance de replay**).
2. Fais avancer le replay. Dès qu'un setup valide apparaît, **avant de regarder la suite**,
   clique **+ Trade** (ou touche **N**).
3. Remplis la fiche : heure, Long ou Short, les étapes présentes, la qualité (D à A+).
4. Laisse avancer le replay jusqu'à la sortie, puis choisis le résultat :
   **TP**, **SL -1**, **BE 0**, **TP1 TP2 TP3** (sorties partielles, voir plus bas)
   ou **Autre** (tu écris le R, par exemple 1,5).
5. Note aussi jusqu'où le prix est allé (voir plus bas, MFE et MAE).
6. Capture : dans TradingView, l'appareil photo en haut à droite, **Copier l'image**
   (Ctrl+Maj+S), puis **Ctrl+V** dans la fiche.
7. **Ctrl+Entrée** enregistre.
8. Fin de la journée de replay : **Jour terminé** (touche **J**). Même s'il n'y a eu
   **aucun setup** : c'est important, c'est ce qui permet de savoir combien de trades par
   semaine ta stratégie donne vraiment.

Raccourcis de l'écran Séance : **N** nouveau trade, **J** jour terminé et suivant,
**S** sauter le jour (férié, données manquantes), **P** jour précédent.

### MFE et MAE (deux cases qui valent de l'or)

- **MFE, max en ta faveur :** jusqu'où le prix est allé dans ton sens, en R, **avant de
  toucher ton stop** (ou avant la fin de la séance). Après un TP, laisse le replay avancer
  quelques bougies pour le noter : s'il est allé jusqu'à 4,2 R, écris 4,2.
- **MAE, max contre toi :** la pire distance contre toi avant la sortie. 1 = ton stop.
  Un trade stoppé reçoit 1 tout seul.

Avec ces deux chiffres, l'écran **Cible et stop** rejoue tous tes trades avec d'autres
cibles, une mise au point mort, un partiel ou un stop plus serré.

### Sorties partielles : TP1, TP2, TP3

Si tu sors une part de ta position à chaque TP, choisis **TP1 TP2 TP3** dans la fiche.

- Ton plan est proposé tout seul : par défaut TP1 à 1 R (50 %), TP2 à 2 R (25 %),
  TP3 à 3 R (25 %), et le stop monte au point mort une fois TP1 touché.
  Change-le une fois pour toutes dans **Campagnes et stratégies** (bouton Modifier de la
  stratégie, partie « Plan de sorties partielles »).
- Pour chaque TP, clique **Touché** ou **Raté**. Toucher TP2, c'est forcément avoir touché TP1 :
  l'app coche TP1 toute seule.
- En dessous, dis où sont sorties les parts qui ont raté leur TP : **Stop -1**, **BE 0**, ou
  **Autre** (sortie à la main, par exemple 0,5 R).
- L'app fait le calcul : TP1 et TP2 touchés, TP3 raté, reste au point mort
  = 0,5 x 1 + 0,25 x 2 + 0,25 x 0 = **+1 R**.
- Si tu as rempli l'entrée et le stop (partie « Prix »), le prix de chaque TP s'affiche à côté.

Ce que ça t'apprend :

- **Analyses**, carte « Tes sorties partielles » : combien de fois tu touches TP1, TP2, TP3,
  et ce qu'aurait donné tout sortir à un seul TP.
- **Cible et stop**, carte « Ton plan de sorties partielles, rejoué » : ton plan appliqué à
  tous tes trades grâce au MFE, contre la même chose sans BE, ou tout à TP1, TP2, TP3.
  Les partiels baissent souvent le pire recul mais aussi l'espérance : là, tu le vois en chiffres.

### La case « Douteux »

Le replay montre parfois ce qu'on n'aurait pas vu sur le moment. Si tu n'es pas sûr que
tu aurais pris le trade en direct, coche **Douteux**. La case « Sans les trades douteux »
du bandeau montre ensuite ce que donne ta stratégie sans eux.

## 4. Ce que chaque écran te dit

| Écran | La question à laquelle il répond |
|---|---|
| **Séance de replay** | Où j'en suis : jour en cours, trades du jour, avancement, ta checklist |
| **Tableau de bord** | Ma stratégie gagne-t-elle ? Est-ce prouvé ou de la chance ? À quoi m'attendre sur 100 trades ? |
| **Calendrier** | Quels jours du replay ont été testés, et ce qu'ils ont donné |
| **Trades** | La liste complète, triable, avec recherche et export Excel |
| **Analyses** | Quelle étape, quelle séance, quel jour, quelle qualité de setup rapportent vraiment |
| **Laboratoire** | Et si je ne prenais que les trades de NY matin, avec SMT, qualité A ou mieux ? |
| **Cible et stop** | Quelle cible, quelle mise au BE, quel partiel, quel stop rapportent le plus |
| **Simulateur de challenge** | Mes chances de passer le challenge FundedNext, et le bon risque par trade |
| **Galerie** | Toutes tes captures côte à côte : gagnants d'un côté, perdants de l'autre |
| **Comparer** | Version 1 contre version 2, et ton backtest contre ton trading réel |
| **Import** | Ramener une liste de trades TradingView, un tableau Excel, ou les rejeux du journal |

Le **bandeau** en haut des écrans d'analyse choisit la campagne, les dates du replay, et
deux filtres : « seulement les trades dans le plan » et « sans les trades douteux ».

### Lire le tableau de bord sans se raconter d'histoires

- **Espérance par trade** : ce que rapporte un trade en moyenne. Au-dessus de +0,2 R, une
  stratégie est rentable ; +0,5 R, c'est fort.
- **Fourchette à 95 %** : là où se trouve probablement ta *vraie* espérance. Si elle
  contient zéro, ce n'est pas encore prouvé, même si le total est positif.
- **Trades pour en être sûr** : combien il en faudrait au même rythme pour que la fourchette
  ne touche plus zéro.
- **Sous 30 trades, presque tout peut être de la chance.** Vise 100.

### Le Laboratoire et le piège de la sur-optimisation

Plus tu filtres, plus tu trouves des combinaisons géniales... par hasard. Le Laboratoire
coupe donc tes trades en deux moitiés (avant et après le trade du milieu) : une vraie règle
améliore **les deux** moitiés. Si le filtre tient, le bouton **Tester ce filtre sur une
nouvelle période** crée une campagne pour le vérifier sur des jours jamais rejoués.
C'est seulement là qu'il devient une règle.

### Le simulateur de challenge

Il rejoue des milliers de challenges en tirant au hasard dans **tes** journées testées
(avec leur nombre de trades, zéro compris) et dans **tes** résultats en R.

- Les modèles FundedNext (Legacy, Rapid, Flex, Bolt) ont été relevés le 8 octobre 2026 sur
  des sites qui comparent les prop firms. **Vérifie-les sur fundednext.com** : les règles
  changent souvent. Tout est modifiable à la main.
- **Prudence (R retirés à chaque trade)** : le réel fait presque toujours moins bien que le
  backtest. Mets 0,1 à 0,2 R, ou mieux : l'écran Comparer mesure ton vrai écart et peut
  le mettre ici d'un clic.
- Le tableau **Le bon risque par trade** montre tes chances pour 100 $, 150 $... jusqu'à
  1 000 $ par trade.

## 5. Importer tes trades (onglet Import du menu)

Attention : c'est l'onglet **Import** du menu. Le bouton « Restaurer une sauvegarde » en haut à droite sert
à remettre une sauvegarde de l'app (.json) ; si tu lui donnes quand même une liste de trades, l'app la
renvoie toute seule vers l'onglet Import. Tu peux aussi glisser ton fichier n'importe où dans l'app.

### Le plus simple : trader dans le Replay Trading de TradingView

Au lieu de remplir une fiche par trade, tu peux passer tes ordres directement dans le
Bar Replay de TradingView (boutons Acheter / Vendre en haut à gauche, puis tes TP et ton SL
glissés sur le graphique), et importer la séance d'un coup.

1. Lance le Bar Replay, puis **Replay Trading** dans le panneau du bas.
2. Trade normalement, avec tes sorties partielles TP1, TP2, TP3.
3. À la fin de la séance, **avant de fermer le replay** (TradingView efface tout ensuite) :
   panneau Replay Trading, onglet **Liste des trades**, bouton d'export.
4. Glisse le fichier dans l'écran **Import** de l'app.
5. Le fichier ne contient pas ton **stop** (ton stop loss : le prix où tu sortais en perte si le
   marché partait contre toi, la ligne SL sur ton graphique). Écris-le dans la colonne **Ton stop**,
   en prix (21 330,25) ou en points (35) ; Entrée passe au trade suivant. C'est lui qui fixe la taille
   de 1 R : sans lui, impossible de savoir si +650 $ vaut +1 R ou +3 R.
   Si tu risques toujours le même montant, tu peux plutôt écrire combien vaut 1 R en dollars.
   **Si le prix est allé plus loin contre toi que ce stop** (le fichier le dit, colonne « Adverse
   excursion »), ton stop aurait sauté : l'app compte le trade **-1 R**, et te montre ce qu'auraient
   donné les sorties réelles. C'est la règle d'un backtest honnête.
6. **Importer.** Les sorties partielles d'un même trade sont regroupées en un seul trade, et
   chaque sortie est reconnue d'après son prix et le type d'ordre :
   - **TP1, TP2, TP3** : les sorties en gain par ordre limite, du prix le plus proche au plus loin ;
   - **BE** : une sortie au prix d'entrée (ton stop remonté au point mort après un TP) ;
   - **Stop suiveur** : une sortie en gain par ordre stop, ou plus basse qu'un TP déjà pris
     (un TP plus bas aurait été touché avant) ;
   - **Clôture** : une position fermée à la main ; **SL** : une sortie à ton stop.

   Le résultat en R de chaque sortie et du trade entier se calcule avec ton stop. Le Run-up devient
   le MFE et le Drawdown le MAE.
7. Les étapes obligatoires sont cochées si tu laisses la case « Je n'ai pris que des setups
   valides ». Il te reste la qualité, le biais et la capture : écran **Trades**, filtre
   « À compléter ».

Les jours sans trade ne sont pas dans le fichier : pense à les marquer dans la séance
(bouton Jour terminé), sinon la fréquence sera surestimée.

### Les autres imports

- **Testeur de stratégie TradingView** (un script Pine en mode strategy) : même onglet
  **Liste des trades**, même import. Les exports en anglais et en français sont reconnus.
- **Ton propre tableau** (Google Sheets, Excel, Notion) : enregistre-le en CSV ou en .xlsx,
  glisse-le, et choisis quelle colonne est la date, le sens, le résultat...
  Il faut une date, un sens, et un résultat (en R, ou TP / SL / BE, ou les prix).
- **Les rejeux déjà notés dans ton journal de trading** (trades cochés « Backtest ») :
  bouton dans l'écran Import.

Un même fichier peut être réimporté sans risque : les trades déjà là sont reconnus.

## 6. Backtest contre réel

L'écran **Comparer** lit ton journal de trading (sans jamais le modifier) et compare ton
espérance en replay à ton espérance en vrai. L'écart, c'est ton **écart d'exécution**.

Pour que ça marche, il faut que les deux apps soient à la **même adresse** (les deux en
ligne sur vaelordesign.github.io, ou les deux en fichier sur l'ordinateur). Sinon, choisis
une sauvegarde du journal (bouton Exporter du journal) dans l'écran Comparer.

Seuls les trades réels qui ont un R comptent : le R écrit à la main dans le journal, ou
calculé depuis le stop prévu.

## 7. Partager une campagne

Bouton **Partager** en haut : un lien qui contient les résultats d'une campagne (pas tes
captures, pas tes autres campagnes). Celui qui l'ouvre voit les écrans d'analyse en lecture
seule. Aucun serveur : les données sont dans le lien lui-même, après le #, et ne sont jamais
envoyées. Le lien ne marche pour quelqu'un d'autre que si l'app est en ligne.

## 8. Vérifier les calculs

- Dans l'app : **Réglages**, bouton **Lancer le test**.
- Le test complet (275 vérifications, chaque résultat calculé à la main) :

```
node verifier-moteur.cjs
```

Le script ne recopie pas la logique : il découpe le bloc entre `DEBUT MOTEUR` et
`FIN MOTEUR` dans `index.html` et le rejoue. Si tu modifies un calcul, relance-le.
