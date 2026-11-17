# Sources de Glucodyssée

> Fichier produit automatiquement par `npm run docs:sources` à partir de `src/content/sources.ts` : ne pas modifier à la main.
> Dans l'application : pied de page « Sources des chiffres », ou puces « Sources » sous chaque fiche.

Liens : DOI ou PubMed quand ils ont été vérifiés, sinon une recherche PubMed par le titre exact.

## Sommaire

- [Modèle minimal (Bergman 1979)](#bergman) · Modèle
- [Modèle de repas (Dalla Man 2007)](#dallaman) · Modèle
- [HbA1c et glycémie moyenne (ADAG 2008)](#adag) · Étude
- [Temps dans la cible (Battelino 2019)](#tir) · Consensus
- [HbA1c et complications (UKPDS 35)](#ukpds35) · Étude
- [Diabète de type 2 progressif (UKPDS 16)](#ukpds16) · Essai clinique
- [Standards of Care (ADA)](#ada) · Recommandation
- [Les 3 niveaux d'hypoglycémie (ADA)](#adahypo) · Recommandation
- [Diabète et rein (ADA/KDIGO 2022)](#adakdigo) · Consensus
- [Diabète et Ramadan (IDF-DAR 2021)](#idfdar) · Recommandation
- [Diabète gestationnel (IADPSG 2010)](#iadpsg) · Consensus
- [Prévention du diabète (DPP 2002)](#dpp) · Essai clinique
- [Composition de l'îlot humain (Cabrera 2006)](#cabrera) · Physiologie
- [Seuil rénal sous iSGLT2 (Sha 2015)](#sglt2) · Essai clinique
- [Liraglutide et cœur (LEADER 2016)](#leader) · Essai clinique
- [Sémaglutide et cœur (SUSTAIN-6 2016)](#sustain6) · Essai clinique
- [Dulaglutide et cœur (REWIND 2019)](#rewind) · Essai clinique
- [Empagliflozine et cœur (EMPA-REG 2015)](#empareg) · Essai clinique
- [Dapagliflozine et insuffisance cardiaque (DAPA-HF 2019)](#dapahf) · Essai clinique
- [Dapagliflozine et rein (DAPA-CKD 2020)](#dapackd) · Essai clinique
- [Canagliflozine et rein (CREDENCE 2019)](#credence) · Essai clinique

## <a id="bergman"></a>Modèle minimal (Bergman 1979)

*Modèle* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Quantitative%20estimation%20of%20insulin%20sensitivity%20Bergman%201979)

> Bergman RN, Ider YZ, Bowden CR, Cobelli C. Quantitative estimation of insulin sensitivity. Am J Physiol. 1979;236(6):E667-77.

**Ce que Glucodyssée en tire**

- Structure du moteur : la glycémie dépend de la production du foie, de la captation sans insuline et de la captation proportionnelle à l'insuline active.
- Notions de sensibilité à l'insuline et d'« efficacité du glucose ».

**Où le voir**

- Tout le moteur (src/core/moteur.ts) : courbes, chiffres, vues.

**Limites** : Glucodyssée en garde l'esprit, pas les équations exactes : le moteur est simplifié et calibré sur des repères cliniques.

## <a id="dallaman"></a>Modèle de repas (Dalla Man 2007)

*Modèle* · [ouvrir la source](https://doi.org/10.1109/TBME.2007.893506)

> Dalla Man C, Rizza RA, Cobelli C. Meal simulation model of the glucose-insulin system. IEEE Trans Biomed Eng. 2007;54(10):1740-9. doi:10.1109/TBME.2007.893506

**Ce que Glucodyssée en tire**

- Digestion en deux étapes (estomac puis intestin) et apparition progressive du glucose du repas dans le sang.
- Le foie voit plus d'insuline venue du pancréas que les muscles.

**Où le voir**

- Vue Corps : les bouchées dans l'estomac, puis le glucose qui part de l'intestin.
- Vue Courbes : forme des pics après les repas.

**Limites** : Ce modèle (base du simulateur UVA/Padova) est bien plus détaillé ; Glucodyssée en reprend une version très simplifiée.

## <a id="adag"></a>HbA1c et glycémie moyenne (ADAG 2008)

*Étude* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Translating%20the%20A1C%20assay%20into%20estimated%20average%20glucose%20values)

> Nathan DM, Kuenen J, Borg R, Zheng H, Schoenfeld D, Heine RJ; ADAG Study Group. Translating the A1C assay into estimated average glucose values. Diabetes Care. 2008;31(8):1473-8.

**Ce que Glucodyssée en tire**

- HbA1c estimée à partir de la glycémie moyenne : glycémie moyenne (mg/dL) = 28,7 × HbA1c − 46,7.
- Une HbA1c de 7 % correspond à environ 1,54 g/L de moyenne.

**Où le voir**

- Bandeau des chiffres (HbA1c estimée), vue Courbes, encart des globules rouges (vue Corps), onglet Évolution.

**Limites** : Relation statistique (R² = 0,84) ; faussée par les anémies, les hémoglobinopathies (drépanocytose) et les transfusions. Glucodyssée l'applique à une journée type et plafonne l'affichage à « > 14 % ».

**Fiches qui la citent** : Diabète de type 2, Diabète de type 1.

## <a id="tir"></a>Temps dans la cible (Battelino 2019)

*Consensus* · [ouvrir la source](https://doi.org/10.2337/dci19-0028)

> Battelino T, Danne T, Bergenstal RM, et al. Clinical targets for continuous glucose monitoring data interpretation: recommendations from the International Consensus on Time in Range. Diabetes Care. 2019;42(8):1593-1603. doi:10.2337/dci19-0028

**Ce que Glucodyssée en tire**

- Bande cible 0,70-1,80 g/L, à tenir plus de 70 % du temps ; moins de 25 % au-dessus de 1,80 g/L.
- Objectifs sous la cible : moins de 4 % du temps sous 0,70 g/L et moins de 1 % sous 0,54 g/L (à reconfirmer sur l'article).

**Où le voir**

- Vue Courbes (bande verte), bandeau des chiffres, évaluation des traitements, capteur sous la scène.

**Fiches qui la citent** : Diabète de type 2, Diabète de type 1.

## <a id="ukpds35"></a>HbA1c et complications (UKPDS 35)

*Étude* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/10938048/)

> Stratton IM, Adler AI, Neil HA, et al. Association of glycaemia with macrovascular and microvascular complications of type 2 diabetes (UKPDS 35): prospective observational study. BMJ. 2000;321(7258):405-12. PMID 10938048

**Ce que Glucodyssée en tire**

- Par point d'HbA1c en moins : −37 % de complications microvasculaires, −14 % d'infarctus, −21 % de décès liés au diabète.
- Pas de seuil : le risque le plus bas est sous 6 %.

**Où le voir**

- Jauges de risque (fiches), onglet Évolution (avec l'HbA1c moyenne depuis le début, comme l'étude), vue Petits vaisseaux.

**Limites** : Étude observationnelle : ce sont des associations, pas des effets démontrés par un essai. Glucodyssée les montre comme des ordres de grandeur.

**Fiches qui la citent** : Diabète de type 2, Rétinopathie diabétique, Néphropathie diabétique, Neuropathie diabétique.

## <a id="ukpds16"></a>Diabète de type 2 progressif (UKPDS 16)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=U.K.%20prospective%20diabetes%20study%2016.%20Overview%20of%206%20years%20therapy%20of%20type%20II%20diabetes%3A%20a%20progressive%20disease)

> UK Prospective Diabetes Study Group. U.K. prospective diabetes study 16. Overview of 6 years' therapy of type II diabetes: a progressive disease. Diabetes. 1995;44(11):1249-58.

**Ce que Glucodyssée en tire**

- La fonction des cellules bêta continue de baisser au fil des années dans le type 2 (ordre de grandeur retenu : environ 4 à 6 % par an).

**Où le voir**

- Onglet Évolution (courbe de la fonction bêta), vue Îlot (cellules bêta qui s'éteignent).

**Limites** : Le chiffre de 6 % par an est un ordre de grandeur choisi pour rendre l'évolution lisible.

**Fiches qui la citent** : Diabète de type 2.

## <a id="ada"></a>Standards of Care (ADA)

*Recommandation* · [ouvrir la source](https://professional.diabetes.org/standards-of-care)

> American Diabetes Association Professional Practice Committee. Standards of Care in Diabetes — 2025 et 2026. Diabetes Care (supplément annuel).

**Ce que Glucodyssée en tire**

- Critères du diagnostic (glycémie à jeun ≥ 1,26 g/L, HbA1c ≥ 6,5 %…), prédiabète, objectifs (souvent HbA1c < 7 %, individualisé).
- Stratégie du type 2 : metformine, puis 2e classe ; iSGLT2 ou aGLP-1 en cas de maladie cardiovasculaire, d'insuffisance cardiaque ou rénale.
- Activité physique (150 minutes par semaine), dépistage des complications (fond d'œil, pieds, rein).

**Où le voir**

- Fiches des maladies, évaluation des traitements, cas cliniques, zones (yeux, nerfs, pieds).

**Limites** : Les seuils et la stratégie ont été vérifiés sur des résumés des éditions 2025-2026 ; à reconfirmer dans le texte en vigueur.

**Fiches qui la citent** : Hyperglycémie provoquée par voie orale (HGPO), Diabète de type 2, Diabète de type 1, Prédiabète, Diabète gestationnel, Hypoglycémie, Acidocétose diabétique, Repas sauté, Activité physique, Rétinopathie diabétique, Neuropathie diabétique, Pied diabétique (plaie), Diabète et maladie cardiovasculaire, Metformine, Sulfamide, Glibenclamide, iDPP-4, Insuline lente, Insuline rapide, Insuline mélange.

## <a id="adahypo"></a>Les 3 niveaux d'hypoglycémie (ADA)

*Recommandation* · [ouvrir la source](https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf)

> American Diabetes Association. Hypoglycemia (low blood glucose) : classification en 3 niveaux, fiche pour les professionnels, 2025.

**Ce que Glucodyssée en tire**

- Niveau 1 : < 0,70 g/L ; niveau 2 : < 0,54 g/L ; niveau 3 : besoin de l'aide d'une autre personne.
- Resucrage par 15 g de sucre rapide, contrôle après 15 minutes.

**Où le voir**

- Fiche Hypoglycémie, bouton « Resucrer », voyage « Défense contre l'hypoglycémie », alertes, atelier « La clé et la porte ».

**Fiches qui la citent** : Hypoglycémie.

## <a id="adakdigo"></a>Diabète et rein (ADA/KDIGO 2022)

*Consensus* · [ouvrir la source](https://doi.org/10.2337/dci22-0027)

> de Boer IH, Khunti K, Sadusky T, et al. Diabetes management in chronic kidney disease: a consensus report by the American Diabetes Association (ADA) and Kidney Disease: Improving Global Outcomes (KDIGO). Diabetes Care. 2022;45(12):3075-90. doi:10.2337/dci22-0027

**Ce que Glucodyssée en tire**

- Metformine : dose réduite (1 000 mg/j) quand le DFG est entre 30 et 44, arrêt sous 30.
- iSGLT2 débutables jusqu'à un DFG de 20 pour protéger le rein ; bloqueurs du système rénine-angiotensine en cas d'albuminurie.

**Où le voir**

- Fiches Maladie rénale chronique et Néphropathie, alertes sur la metformine, cas clinique « Femme de 66 ans, créatinine en hausse ».

**Fiches qui la citent** : Maladie rénale chronique, Néphropathie diabétique, Metformine, iDPP-4.

## <a id="idfdar"></a>Diabète et Ramadan (IDF-DAR 2021)

*Recommandation* · [ouvrir la source](https://idf.org/about-diabetes/resources/diabetes-and-ramadan-practical-guidelines-2021/)

> International Diabetes Federation, DAR International Alliance. Diabetes and Ramadan: Practical Guidelines 2021. Diabetes Res Clin Pract. 2022;185:109185. doi:10.1016/j.diabres.2021.109185

**Ce que Glucodyssée en tire**

- Éviter le glibenclamide ; réduire et décaler les doses d'insuline et de sulfamide (mélange : dose du matin au ndogu, dose du soir réduite au sahur).
- Rompre le jeûne si la glycémie passe sous 0,70 g/L ou au-dessus de 3,00 g/L, ou en cas de malaise.

**Où le voir**

- Fiche Ramadan, présentation guidée « Ramadan », alertes, cas clinique « Homme de 48 ans qui souhaite jeûner ».

**Limites** : Vérifié sur des résumés concordants ; le score de risque IDF-DAR n'est pas encore intégré (il faut d'abord relire le PDF officiel).

**Fiches qui la citent** : Ramadan, Glibenclamide, Insuline lente, Insuline mélange.

## <a id="iadpsg"></a>Diabète gestationnel (IADPSG 2010)

*Consensus* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=International%20association%20of%20diabetes%20and%20pregnancy%20study%20groups%20recommendations%20on%20the%20diagnosis%20and%20classification%20of%20hyperglycemia%20in%20pregnancy)

> International Association of Diabetes and Pregnancy Study Groups Consensus Panel. Recommendations on the diagnosis and classification of hyperglycemia in pregnancy. Diabetes Care. 2010;33(3):676-82.

**Ce que Glucodyssée en tire**

- HGPO 75 g entre 24 et 28 semaines : diabète gestationnel si à jeun ≥ 0,92 g/L, 1 h ≥ 1,80 g/L ou 2 h ≥ 1,53 g/L (repris par l'OMS en 2013).

**Où le voir**

- Fiche Diabète gestationnel, cas clinique « Femme de 31 ans enceinte de 26 semaines ».

**Fiches qui la citent** : Hyperglycémie provoquée par voie orale (HGPO), Diabète gestationnel.

## <a id="dpp"></a>Prévention du diabète (DPP 2002)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Reduction%20in%20the%20incidence%20of%20type%202%20diabetes%20with%20lifestyle%20intervention%20or%20metformin)

> Diabetes Prevention Program Research Group. Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin. N Engl J Med. 2002;346(6):393-403.

**Ce que Glucodyssée en tire**

- Chez les personnes à risque : −58 % de diabète avec les mesures d'hygiène de vie, −31 % avec la metformine.

**Où le voir**

- Fiche Prédiabète et son évaluation.

**Fiches qui la citent** : Prédiabète.

## <a id="cabrera"></a>Composition de l'îlot humain (Cabrera 2006)

*Physiologie* · [ouvrir la source](https://pmc.ncbi.nlm.nih.gov/articles/PMC1413730/)

> Cabrera O, Berman DM, Kenyon NS, et al. The unique cytoarchitecture of human pancreatic islets has implications for islet cell function. Proc Natl Acad Sci USA. 2006;103(7):2334-9. PMCID PMC1413730

**Ce que Glucodyssée en tire**

- Chez l'humain, les cellules sont mélangées dans l'îlot : environ 55 % de bêta, 35 % d'alpha, 10 % de delta, avec une forte variabilité.

**Où le voir**

- Vue Îlot en 2D et en 3D (proportions des cellules), fiche de la zone « Îlot de Langerhans ».

**Limites** : Les pourcentages 55/35/10 sont cités par des articles secondaires ; le tableau original n'a pas été relu.

## <a id="sglt2"></a>Seuil rénal sous iSGLT2 (Sha 2015)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/25421015/)

> Sha S, Polidori D, Farrell K, et al. Pharmacodynamic differences between canagliflozin and dapagliflozin: results of a randomized, double-blind, crossover study. Diabetes Obes Metab. 2015;17(2):188-97. PMID 25421015

**Ce que Glucodyssée en tire**

- Les iSGLT2 abaissent le seuil rénal du glucose (vers 3,8-4,2 mmol/L, soit environ 0,70-0,75 g/L) et font éliminer environ 40 à 50 g de glucose par jour chez le sujet non diabétique.

**Où le voir**

- Vue Rein (seuil affiché), glucose urinaire du bandeau, fiche de l'iSGLT2.

**Limites** : Étude chez des volontaires sains ; chez le diabétique hyperglycémique, le glucose urinaire est plus élevé (le moteur donne 50 à 110 g/jour).

**Fiches qui la citent** : iSGLT2.

## <a id="leader"></a>Liraglutide et cœur (LEADER 2016)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Liraglutide%20and%20cardiovascular%20outcomes%20in%20type%202%20diabetes)

> Marso SP, Daniels GH, Brown-Frandsen K, et al. Liraglutide and cardiovascular outcomes in type 2 diabetes. N Engl J Med. 2016;375(4):311-22.

**Ce que Glucodyssée en tire**

- Bénéfice cardiovasculaire démontré pour un aGLP-1 chez le diabétique de type 2 à haut risque.

**Où le voir**

- Fiche aGLP-1, fiche « Diabète et maladie cardiovasculaire », cas clinique après un infarctus.

**Fiches qui la citent** : Diabète et maladie cardiovasculaire, aGLP-1.

## <a id="sustain6"></a>Sémaglutide et cœur (SUSTAIN-6 2016)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Semaglutide%20and%20cardiovascular%20outcomes%20in%20patients%20with%20type%202%20diabetes)

> Marso SP, Bain SC, Consoli A, et al. Semaglutide and cardiovascular outcomes in patients with type 2 diabetes. N Engl J Med. 2016;375(19):1834-44.

**Ce que Glucodyssée en tire**

- Réduction des événements cardiovasculaires sous sémaglutide ; aggravation précoce possible d'une rétinopathie avancée quand l'HbA1c baisse vite.

**Où le voir**

- Fiche aGLP-1, fiche Rétinopathie (niveau Approfondir).

**Fiches qui la citent** : Rétinopathie diabétique, Diabète et maladie cardiovasculaire, aGLP-1.

## <a id="rewind"></a>Dulaglutide et cœur (REWIND 2019)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Dulaglutide%20and%20cardiovascular%20outcomes%20in%20type%202%20diabetes%20(REWIND))

> Gerstein HC, Colhoun HM, Dagenais GR, et al. Dulaglutide and cardiovascular outcomes in type 2 diabetes (REWIND): a double-blind, randomised placebo-controlled trial. Lancet. 2019;394(10193):121-30.

**Ce que Glucodyssée en tire**

- Bénéfice cardiovasculaire du dulaglutide, y compris chez des patients surtout en prévention primaire.

**Où le voir**

- Fiche aGLP-1, fiche « Diabète et maladie cardiovasculaire ».

**Fiches qui la citent** : Diabète et maladie cardiovasculaire, aGLP-1.

## <a id="empareg"></a>Empagliflozine et cœur (EMPA-REG 2015)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Empagliflozin%2C%20cardiovascular%20outcomes%2C%20and%20mortality%20in%20type%202%20diabetes)

> Zinman B, Wanner C, Lachin JM, et al. Empagliflozin, cardiovascular outcomes, and mortality in type 2 diabetes. N Engl J Med. 2015;373(22):2117-28.

**Ce que Glucodyssée en tire**

- Réduction de la mortalité cardiovasculaire et des hospitalisations pour insuffisance cardiaque sous iSGLT2.

**Où le voir**

- Fiche iSGLT2, fiche « Diabète et maladie cardiovasculaire ».

**Fiches qui la citent** : Diabète et maladie cardiovasculaire, iSGLT2.

## <a id="dapahf"></a>Dapagliflozine et insuffisance cardiaque (DAPA-HF 2019)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Dapagliflozin%20in%20patients%20with%20heart%20failure%20and%20reduced%20ejection%20fraction)

> McMurray JJV, Solomon SD, Inzucchi SE, et al. Dapagliflozin in patients with heart failure and reduced ejection fraction. N Engl J Med. 2019;381(21):1995-2008.

**Ce que Glucodyssée en tire**

- Bénéfice dans l'insuffisance cardiaque, avec ou sans diabète.

**Où le voir**

- Fiche iSGLT2.

**Fiches qui la citent** : iSGLT2.

## <a id="dapackd"></a>Dapagliflozine et rein (DAPA-CKD 2020)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Dapagliflozin%20in%20patients%20with%20chronic%20kidney%20disease)

> Heerspink HJL, Stefánsson BV, Correa-Rotter R, et al. Dapagliflozin in patients with chronic kidney disease. N Engl J Med. 2020;383(15):1436-46.

**Ce que Glucodyssée en tire**

- Ralentissement de la maladie rénale chronique, avec ou sans diabète.

**Où le voir**

- Fiche iSGLT2, fiches Maladie rénale chronique et Néphropathie.

**Fiches qui la citent** : Néphropathie diabétique, iSGLT2.

## <a id="credence"></a>Canagliflozine et rein (CREDENCE 2019)

*Essai clinique* · [ouvrir la source](https://pubmed.ncbi.nlm.nih.gov/?term=Canagliflozin%20and%20renal%20outcomes%20in%20type%202%20diabetes%20and%20nephropathy)

> Perkovic V, Jardine MJ, Neal B, et al. Canagliflozin and renal outcomes in type 2 diabetes and nephropathy. N Engl J Med. 2019;380(24):2295-306.

**Ce que Glucodyssée en tire**

- Protection rénale démontrée chez le diabétique de type 2 avec néphropathie.

**Où le voir**

- Fiche iSGLT2, fiche Néphropathie.

**Fiches qui la citent** : Néphropathie diabétique, iSGLT2.
