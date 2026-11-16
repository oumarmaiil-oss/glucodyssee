# Glucodyssée : reste à faire

Mis à jour le 16 novembre 2026.

## Mettre en ligne (Dr Sow)
- [ ] **Envoyer le code sur GitHub** : la session Claude n'a pas le droit d'écrire dans ce dépôt (application GitHub
      Claude non installée sur le compte). Soit installer l'application Claude sur le dépôt
      (https://github.com/apps/claude) puis demander à Claude de pousser, soit pousser soi-même le dossier fourni.
- [ ] **Activer GitHub Pages** : Settings › Pages › Source : « GitHub Actions ». Le site sera alors publié
      automatiquement à chaque modification : https://oumarmaiil-oss.github.io/glucodyssee/
- [ ] **Page GitHub** (⚙ à côté de « About ») : description, lien du site, topics `education`, `medical-education`,
      `diabetes`, `pharmacy`, `senegal`, `threejs`, `react`, `pwa`. Cocher « Issues ».
- [ ] **Google Search Console** : ajouter la propriété `https://oumarmaiil-oss.github.io/glucodyssee/`, puis soumettre
      le sitemap. GoatCounter : le même compteur qu'Hémodyssée est utilisé (les pages sont distinguées par l'adresse).
- [ ] **Essai sur un vrai téléphone Android d'entrée de gamme** (îlot 3D, vue Corps, présentation « Le type 2 »).

## À vérifier sur les sources originales (je ne les ai pas toutes confirmées)
- [ ] Temps sous la cible : < 4 % sous 0,70 g/L et < 1 % sous 0,54 g/L (Battelino 2019) : cité partout, à reconfirmer
      sur l'article original (la recherche n'a confirmé que « > 70 % dans la cible » et « < 25 % au-dessus de 1,80 »).
- [ ] Guide IDF-DAR 2021 : décalage de l'insuline mélange (dose du matin au ndogu, dose du soir réduite au sahur),
      réduction des sulfamides et de l'insuline, seuils pour rompre le jeûne (< 0,70 ou > 3,00 g/L) : vérifiés sur des
      résumés concordants, à confirmer sur le PDF officiel.
- [ ] Metformine et DFG : pleine dose si DFG ≥ 45, 1 000 mg/j entre 30 et 44, arrêt sous 30 (consensus ADA/KDIGO 2022) :
      à confirmer avec les Standards ADA 2026 et le RCP en vigueur au Sénégal.
- [ ] Repère « une assiette de riz cuit (≈ 200 g) ≈ 55 g de glucides » (≈ 28 g pour 100 g de riz blanc cuit) :
      à remplacer par la table FAO/INFOODS d'Afrique de l'Ouest quand l'assiette sénégalaise sera faite.
- [ ] Disponibilité réelle des molécules au Sénégal (DCI mises en avant dans `src/content/classes.ts`).

## Limites connues du modèle (affichées ou à afficher)
- Doses « standard » d'insuline choisies pour la pédagogie (adulte de 70 kg) : type 1 glargine 20 U + rapide 1 U pour
  12 g de glucides, mélange 30/70 12 U + 8 U ; type 2 glargine 14 U, mélange 16 U + 10 U. **À valider** par un
  diabétologue ; elles ne servent jamais à calculer une dose réelle.
- Sujet sain après un repas de 100 g de glucides : pic à 1,71 g/L, un peu haut ? À comparer aux données de capteurs
  chez des sujets non diabétiques. Sujet sain sous metformine : glycémie du réveil vers 0,75-0,80 g/L (sans
  hypoglycémie) : l'effet chez le non-diabétique est probablement surestimé.
- Type 1 sans insuline : glycémie jusqu'à 8 g/L (pas de corps cétoniques ni de déshydratation dans le modèle) ;
  l'HbA1c affichée est plafonnée à « > 14 % » et une alerte d'acidocétose s'affiche.
- Glucagon : indice pédagogique (relancé par l'hypoglycémie, freiné par l'insuline et les incrétines), pas une concentration.
- Complications visibles dans la scène au fil des années : représentation pédagogique ; seuls les risques relatifs
  (UKPDS 35) sont chiffrés.

## Prochains lots (cahier des charges, chapitre 10)
- [ ] L'assiette sénégalaise (plats, portions, boissons sucrées) avec la table FAO/INFOODS.
- [ ] Ramadan : calcul pédagogique du score de risque IDF-DAR (après vérification du PDF).
- [ ] Conservation de l'insuline (chaleur, canari), gestes du stylo, kit hypoglycémie.
- [ ] Idées reçues (chapitre 9), relues par des soignants sénégalais.
- [ ] Version wolof du niveau « Découvrir » (traduction relue par un soignant locuteur natif).
- [ ] Liens croisés avec Hémodyssée (`?patho=diabete`), noyau commun (Contact, Installer, voix off, service worker).

## Fait le 16 novembre 2026
- Application complète sur la base d'Hémodyssée : même structure (`core`, `content`, `render`, `ui`), même
  interface (en-tête, niveaux, vues, panneau Explorer / Maladies et traitements / Évolution, moniteur, lecture guidée,
  voix off, capture photo et vidéo, plein écran, réinitialiser avec annulation, tout retirer, Contact WhatsApp,
  aide à l'installation, fonctionnement hors connexion, signature, licences, déploiement GitHub Pages).
- Moteur de glycémie calibré porté en TypeScript sans changer ses repères (10 tests de calibration au vert), relié
  au terrain et au traitement (`engine.ts`), avec alertes, risques UKPDS et évolution sur 10 ans.
- 5 vues (Corps, Îlot 2D/3D, Cellule muscle/foie, Rein, Courbes 24 h), 16 maladies et situations, 9 classes,
  5 présentations guidées, 8 cas cliniques, fiche PDF ; 22 tests au vert ; testé sur 360 px.
