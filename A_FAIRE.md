# Glucodyssée : reste à faire

Mis à jour le 17 novembre 2026.

## Mettre en ligne (Dr Sow)
- [ ] **Activer GitHub Actions comme source de Pages** (le seul blocage) : Settings › Pages › « Build and deployment » ›
      Source : **GitHub Actions** (au lieu de « Deploy from a branch », qui publie le code brut et donne une page vide).
      Puis relancer le dernier déploiement (onglet Actions › Re-run jobs). Site : https://oumarmaiil-oss.github.io/glucodyssee/
- [x] Le code est sur GitHub (branche `main`) ; en attendant, un aperçu fonctionne dans l'artefact Claude.
- [ ] **Page GitHub** (⚙ à côté de « About ») : description, lien du site, topics `education`, `medical-education`,
      `diabetes`, `pharmacy`, `senegal`, `threejs`, `react`, `pwa`. Cocher « Issues ».
- [ ] **Google Search Console** : propriété `https://oumarmaiil-oss.github.io/glucodyssee/`, puis le sitemap.
- [ ] **Essai sur un vrai téléphone Android d'entrée de gamme** (vue Corps, atelier, îlot 3D, suivi de molécule).

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
- Profil « type 2 à la limite du diagnostic » (ancien « début ») : à jeun 1,24 g/L et 2 h 1,77 g/L à l'HGPO, donc
  intolérance au glucose selon les normes ; le cas clinique « découverte au bilan » utilise désormais le type 2 installé.
- HGPO : la boisson est absorbée comme un repas (même vidange gastrique) ; la montée réelle est un peu plus rapide.
- Atelier « La clé et la porte » : modèle volontairement très simple (sang, muscle, foie), séparé du moteur calibré.
- Atelier Ramadan : il utilise le moteur calibré ; la dose du soir de l'insuline mélange est réduite de 30 % au sahur
  (les résumés du guide IDF-DAR donnent 25 à 50 %) ; sous glibenclamide, le modèle donne une hypoglycémie longue (min
  0,50 g/L), plus marquée que chez beaucoup de patients réels : c'est le sens de variation qui compte.
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
- [ ] Ramadan : calcul pédagogique du score de risque IDF-DAR. **Non fait volontairement** : les poids des 14 critères
  et les bornes n'ont pas pu être vérifiés sur le document original, et une mise à jour est parue en 2026 ; l'atelier renvoie
  à l'outil officiel. À reprendre avec le PDF officiel en main.
- [ ] Conservation de l'insuline (chaleur, canari), gestes du stylo, kit hypoglycémie.
- [ ] Idées reçues (chapitre 9), relues par des soignants sénégalais.
- [ ] Version wolof du niveau « Découvrir » (traduction relue par un soignant locuteur natif).
- [ ] Liens croisés avec Hémodyssée (`?patho=diabete`), noyau commun (Contact, Installer, voix off, service worker).

## Fait le 17 novembre 2026
- Vue Corps lisible : flux de glucose chiffrés (g/heure) et bilan entrées/sorties ; une forme par substance ;
  le repas entre (bouchées), l'estomac se vide, l'intestin coupe l'amidon en glucose.
- Interaction : suivre une molécule de glucose ou d'insuline ; ateliers guidés « La clé et la porte » et « Jeûner en
  sécurité » (Ramadan, moteur calibré) ; « Agir » (sucre,
  collation, repas, marche, insuline) ; bulle au survol de chaque objet de la scène.
- Voyages commentés (glucose, insuline détaillée, défense contre l'hypoglycémie) ; vue « Petits vaisseaux » ;
  chaque maladie décrite dans chaque vue ; liens organe → maladies.
- HGPO 75 g avec lecture selon les normes (ADA/OMS, IADPSG/OMS 2013).
- Sources : 21 références vérifiables, petit document par source dans l'application, `docs/SOURCES.md` produit
  automatiquement ; seuil rénal sous iSGLT2 corrigé (0,70-0,75 g/L) d'après la source.
- Documents : README illustré (10 captures), CONTRIBUTING, A_FAIRE ; 25 tests au vert.

## Fait le 16 novembre 2026
- Application complète sur la base d'Hémodyssée : même structure (`core`, `content`, `render`, `ui`), même
  interface (en-tête, niveaux, vues, panneau Explorer / Maladies et traitements / Évolution, moniteur, lecture guidée,
  voix off, capture photo et vidéo, plein écran, réinitialiser avec annulation, tout retirer, Contact WhatsApp,
  aide à l'installation, fonctionnement hors connexion, signature, licences, déploiement GitHub Pages).
- Moteur de glycémie calibré porté en TypeScript sans changer ses repères (10 tests de calibration au vert), relié
  au terrain et au traitement (`engine.ts`), avec alertes, risques UKPDS et évolution sur 10 ans.
- 5 vues (Corps, Îlot 2D/3D, Cellule muscle/foie, Rein, Courbes 24 h), 16 maladies et situations, 9 classes,
  5 présentations guidées, 8 cas cliniques, fiche PDF ; 22 tests au vert ; testé sur 360 px.
