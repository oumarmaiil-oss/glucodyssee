/**
 * Les sources de Glucodyssée : chaque référence dit ce que l'application en tire, où on le voit, et ses limites.
 * Liens : DOI ou PubMed quand ils ont été vérifiés, sinon une recherche PubMed par le titre exact (toujours valable).
 * Ce fichier sert aussi à produire docs/SOURCES.md (npm run docs:sources).
 */

export type TypeSource = 'Modèle' | 'Recommandation' | 'Consensus' | 'Essai clinique' | 'Étude' | 'Physiologie';

export interface Source {
  id: string;
  court: string;
  type: TypeSource;
  citation: string;
  lien: string;
  tire: string[]; // ce que l'application en tire
  ou: string[]; // où on le voit dans l'application
  limites?: string;
}

const pubmed = (titre: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(titre)}`;

export const SOURCES: Source[] = [
  {
    id: 'bergman', court: 'Modèle minimal (Bergman 1979)', type: 'Modèle',
    citation: 'Bergman RN, Ider YZ, Bowden CR, Cobelli C. Quantitative estimation of insulin sensitivity. Am J Physiol. 1979;236(6):E667-77.',
    lien: pubmed('Quantitative estimation of insulin sensitivity Bergman 1979'),
    tire: ['Structure du moteur : la glycémie dépend de la production du foie, de la captation sans insuline et de la captation proportionnelle à l\'insuline active.', 'Notions de sensibilité à l\'insuline et d\'« efficacité du glucose ».'],
    ou: ['Tout le moteur (src/core/moteur.ts) : courbes, chiffres, vues.'],
    limites: 'Glucodyssée en garde l\'esprit, pas les équations exactes : le moteur est simplifié et calibré sur des repères cliniques.',
  },
  {
    id: 'dallaman', court: 'Modèle de repas (Dalla Man 2007)', type: 'Modèle',
    citation: 'Dalla Man C, Rizza RA, Cobelli C. Meal simulation model of the glucose-insulin system. IEEE Trans Biomed Eng. 2007;54(10):1740-9. doi:10.1109/TBME.2007.893506',
    lien: 'https://doi.org/10.1109/TBME.2007.893506',
    tire: ['Digestion en deux étapes (estomac puis intestin) et apparition progressive du glucose du repas dans le sang.', 'Le foie voit plus d\'insuline venue du pancréas que les muscles.'],
    ou: ['Vue Corps : les bouchées dans l\'estomac, puis le glucose qui part de l\'intestin.', 'Vue Courbes : forme des pics après les repas.'],
    limites: 'Ce modèle (base du simulateur UVA/Padova) est bien plus détaillé ; Glucodyssée en reprend une version très simplifiée.',
  },
  {
    id: 'adag', court: 'HbA1c et glycémie moyenne (ADAG 2008)', type: 'Étude',
    citation: 'Nathan DM, Kuenen J, Borg R, Zheng H, Schoenfeld D, Heine RJ; ADAG Study Group. Translating the A1C assay into estimated average glucose values. Diabetes Care. 2008;31(8):1473-8.',
    lien: pubmed('Translating the A1C assay into estimated average glucose values'),
    tire: ['HbA1c estimée à partir de la glycémie moyenne : glycémie moyenne (mg/dL) = 28,7 × HbA1c − 46,7.', 'Une HbA1c de 7 % correspond à environ 1,54 g/L de moyenne.'],
    ou: ['Bandeau des chiffres (HbA1c estimée), vue Courbes, encart des globules rouges (vue Corps), onglet Évolution.'],
    limites: 'Relation statistique (R² = 0,84) ; faussée par les anémies, les hémoglobinopathies (drépanocytose) et les transfusions. Glucodyssée l\'applique à une journée type et plafonne l\'affichage à « > 14 % ».',
  },
  {
    id: 'tir', court: 'Temps dans la cible (Battelino 2019)', type: 'Consensus',
    citation: 'Battelino T, Danne T, Bergenstal RM, et al. Clinical targets for continuous glucose monitoring data interpretation: recommendations from the International Consensus on Time in Range. Diabetes Care. 2019;42(8):1593-1603. doi:10.2337/dci19-0028',
    lien: 'https://doi.org/10.2337/dci19-0028',
    tire: ['Bande cible 0,70-1,80 g/L, à tenir plus de 70 % du temps ; moins de 25 % au-dessus de 1,80 g/L.', 'Objectifs sous la cible : moins de 4 % du temps sous 0,70 g/L et moins de 1 % sous 0,54 g/L (à reconfirmer sur l\'article).'],
    ou: ['Vue Courbes (bande verte), bandeau des chiffres, évaluation des traitements, capteur sous la scène.'],
  },
  {
    id: 'ukpds35', court: 'HbA1c et complications (UKPDS 35)', type: 'Étude',
    citation: 'Stratton IM, Adler AI, Neil HA, et al. Association of glycaemia with macrovascular and microvascular complications of type 2 diabetes (UKPDS 35): prospective observational study. BMJ. 2000;321(7258):405-12. PMID 10938048',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/10938048/',
    tire: ['Par point d\'HbA1c en moins : −37 % de complications microvasculaires, −14 % d\'infarctus, −21 % de décès liés au diabète.', 'Pas de seuil : le risque le plus bas est sous 6 %.'],
    ou: ['Jauges de risque (fiches), onglet Évolution (avec l\'HbA1c moyenne depuis le début, comme l\'étude), vue Petits vaisseaux.'],
    limites: 'Étude observationnelle : ce sont des associations, pas des effets démontrés par un essai. Glucodyssée les montre comme des ordres de grandeur.',
  },
  {
    id: 'ukpds16', court: 'Diabète de type 2 progressif (UKPDS 16)', type: 'Essai clinique',
    citation: 'UK Prospective Diabetes Study Group. U.K. prospective diabetes study 16. Overview of 6 years\' therapy of type II diabetes: a progressive disease. Diabetes. 1995;44(11):1249-58.',
    lien: pubmed('U.K. prospective diabetes study 16. Overview of 6 years therapy of type II diabetes: a progressive disease'),
    tire: ['La fonction des cellules bêta continue de baisser au fil des années dans le type 2 (ordre de grandeur retenu : environ 4 à 6 % par an).'],
    ou: ['Onglet Évolution (courbe de la fonction bêta), vue Îlot (cellules bêta qui s\'éteignent).'],
    limites: 'Le chiffre de 6 % par an est un ordre de grandeur choisi pour rendre l\'évolution lisible.',
  },
  {
    id: 'ada', court: 'Standards of Care (ADA)', type: 'Recommandation',
    citation: 'American Diabetes Association Professional Practice Committee. Standards of Care in Diabetes — 2025 et 2026. Diabetes Care (supplément annuel).',
    lien: 'https://professional.diabetes.org/standards-of-care',
    tire: ['Critères du diagnostic (glycémie à jeun ≥ 1,26 g/L, HbA1c ≥ 6,5 %…), prédiabète, objectifs (souvent HbA1c < 7 %, individualisé).', 'Stratégie du type 2 : metformine, puis 2e classe ; iSGLT2 ou aGLP-1 en cas de maladie cardiovasculaire, d\'insuffisance cardiaque ou rénale.', 'Activité physique (150 minutes par semaine), dépistage des complications (fond d\'œil, pieds, rein).'],
    ou: ['Fiches des maladies, évaluation des traitements, cas cliniques, zones (yeux, nerfs, pieds).'],
    limites: 'Les seuils et la stratégie ont été vérifiés sur des résumés des éditions 2025-2026 ; à reconfirmer dans le texte en vigueur.',
  },
  {
    id: 'adahypo', court: 'Les 3 niveaux d\'hypoglycémie (ADA)', type: 'Recommandation',
    citation: 'American Diabetes Association. Hypoglycemia (low blood glucose) : classification en 3 niveaux, fiche pour les professionnels, 2025.',
    lien: 'https://professional.diabetes.org/sites/dpro/files/2025-05/hypoglycemia-hcp-5-27-25.pdf',
    tire: ['Niveau 1 : < 0,70 g/L ; niveau 2 : < 0,54 g/L ; niveau 3 : besoin de l\'aide d\'une autre personne.', 'Resucrage par 15 g de sucre rapide, contrôle après 15 minutes.'],
    ou: ['Fiche Hypoglycémie, bouton « Resucrer », voyage « Défense contre l\'hypoglycémie », alertes, atelier « La clé et la porte ».'],
  },
  {
    id: 'adakdigo', court: 'Diabète et rein (ADA/KDIGO 2022)', type: 'Consensus',
    citation: 'de Boer IH, Khunti K, Sadusky T, et al. Diabetes management in chronic kidney disease: a consensus report by the American Diabetes Association (ADA) and Kidney Disease: Improving Global Outcomes (KDIGO). Diabetes Care. 2022;45(12):3075-90. doi:10.2337/dci22-0027',
    lien: 'https://doi.org/10.2337/dci22-0027',
    tire: ['Metformine : dose réduite (1 000 mg/j) quand le DFG est entre 30 et 44, arrêt sous 30.', 'iSGLT2 débutables jusqu\'à un DFG de 20 pour protéger le rein ; bloqueurs du système rénine-angiotensine en cas d\'albuminurie.'],
    ou: ['Fiches Maladie rénale chronique et Néphropathie, alertes sur la metformine, cas clinique « Femme de 66 ans, créatinine en hausse ».'],
  },
  {
    id: 'idfdar', court: 'Diabète et Ramadan (IDF-DAR 2021)', type: 'Recommandation',
    citation: 'International Diabetes Federation, DAR International Alliance. Diabetes and Ramadan: Practical Guidelines 2021. Diabetes Res Clin Pract. 2022;185:109185. doi:10.1016/j.diabres.2021.109185',
    lien: 'https://idf.org/about-diabetes/resources/diabetes-and-ramadan-practical-guidelines-2021/',
    tire: ['Éviter le glibenclamide ; réduire et décaler les doses d\'insuline et de sulfamide (mélange : dose du matin au ndogu, dose du soir réduite au sahur).', 'Rompre le jeûne si la glycémie passe sous 0,70 g/L ou au-dessus de 3,00 g/L, ou en cas de malaise.'],
    ou: ['Fiche Ramadan, présentation guidée « Ramadan », alertes, cas clinique « Homme de 48 ans qui souhaite jeûner ».'],
    limites: 'Vérifié sur des résumés concordants ; le score de risque IDF-DAR n\'est pas encore intégré (il faut d\'abord relire le PDF officiel).',
  },
  {
    id: 'iadpsg', court: 'Diabète gestationnel (IADPSG 2010)', type: 'Consensus',
    citation: 'International Association of Diabetes and Pregnancy Study Groups Consensus Panel. Recommendations on the diagnosis and classification of hyperglycemia in pregnancy. Diabetes Care. 2010;33(3):676-82.',
    lien: pubmed('International association of diabetes and pregnancy study groups recommendations on the diagnosis and classification of hyperglycemia in pregnancy'),
    tire: ['HGPO 75 g entre 24 et 28 semaines : diabète gestationnel si à jeun ≥ 0,92 g/L, 1 h ≥ 1,80 g/L ou 2 h ≥ 1,53 g/L (repris par l\'OMS en 2013).'],
    ou: ['Fiche Diabète gestationnel, cas clinique « Femme de 31 ans enceinte de 26 semaines ».'],
  },
  {
    id: 'dpp', court: 'Prévention du diabète (DPP 2002)', type: 'Essai clinique',
    citation: 'Diabetes Prevention Program Research Group. Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin. N Engl J Med. 2002;346(6):393-403.',
    lien: pubmed('Reduction in the incidence of type 2 diabetes with lifestyle intervention or metformin'),
    tire: ['Chez les personnes à risque : −58 % de diabète avec les mesures d\'hygiène de vie, −31 % avec la metformine.'],
    ou: ['Fiche Prédiabète et son évaluation.'],
  },
  {
    id: 'cabrera', court: 'Composition de l\'îlot humain (Cabrera 2006)', type: 'Physiologie',
    citation: 'Cabrera O, Berman DM, Kenyon NS, et al. The unique cytoarchitecture of human pancreatic islets has implications for islet cell function. Proc Natl Acad Sci USA. 2006;103(7):2334-9. PMCID PMC1413730',
    lien: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1413730/',
    tire: ['Chez l\'humain, les cellules sont mélangées dans l\'îlot : environ 55 % de bêta, 35 % d\'alpha, 10 % de delta, avec une forte variabilité.'],
    ou: ['Vue Îlot en 2D et en 3D (proportions des cellules), fiche de la zone « Îlot de Langerhans ».'],
    limites: 'Les pourcentages 55/35/10 sont cités par des articles secondaires ; le tableau original n\'a pas été relu.',
  },
  {
    id: 'sglt2', court: 'Seuil rénal sous iSGLT2 (Sha 2015)', type: 'Essai clinique',
    citation: 'Sha S, Polidori D, Farrell K, et al. Pharmacodynamic differences between canagliflozin and dapagliflozin: results of a randomized, double-blind, crossover study. Diabetes Obes Metab. 2015;17(2):188-97. PMID 25421015',
    lien: 'https://pubmed.ncbi.nlm.nih.gov/25421015/',
    tire: ['Les iSGLT2 abaissent le seuil rénal du glucose (vers 3,8-4,2 mmol/L, soit environ 0,70-0,75 g/L) et font éliminer environ 40 à 50 g de glucose par jour chez le sujet non diabétique.'],
    ou: ['Vue Rein (seuil affiché), glucose urinaire du bandeau, fiche de l\'iSGLT2.'],
    limites: 'Étude chez des volontaires sains ; chez le diabétique hyperglycémique, le glucose urinaire est plus élevé (le moteur donne 50 à 110 g/jour).',
  },
  {
    id: 'leader', court: 'Liraglutide et cœur (LEADER 2016)', type: 'Essai clinique',
    citation: 'Marso SP, Daniels GH, Brown-Frandsen K, et al. Liraglutide and cardiovascular outcomes in type 2 diabetes. N Engl J Med. 2016;375(4):311-22.',
    lien: pubmed('Liraglutide and cardiovascular outcomes in type 2 diabetes'),
    tire: ['Bénéfice cardiovasculaire démontré pour un aGLP-1 chez le diabétique de type 2 à haut risque.'],
    ou: ['Fiche aGLP-1, fiche « Diabète et maladie cardiovasculaire », cas clinique après un infarctus.'],
  },
  {
    id: 'sustain6', court: 'Sémaglutide et cœur (SUSTAIN-6 2016)', type: 'Essai clinique',
    citation: 'Marso SP, Bain SC, Consoli A, et al. Semaglutide and cardiovascular outcomes in patients with type 2 diabetes. N Engl J Med. 2016;375(19):1834-44.',
    lien: pubmed('Semaglutide and cardiovascular outcomes in patients with type 2 diabetes'),
    tire: ['Réduction des événements cardiovasculaires sous sémaglutide ; aggravation précoce possible d\'une rétinopathie avancée quand l\'HbA1c baisse vite.'],
    ou: ['Fiche aGLP-1, fiche Rétinopathie (niveau Approfondir).'],
  },
  {
    id: 'rewind', court: 'Dulaglutide et cœur (REWIND 2019)', type: 'Essai clinique',
    citation: 'Gerstein HC, Colhoun HM, Dagenais GR, et al. Dulaglutide and cardiovascular outcomes in type 2 diabetes (REWIND): a double-blind, randomised placebo-controlled trial. Lancet. 2019;394(10193):121-30.',
    lien: pubmed('Dulaglutide and cardiovascular outcomes in type 2 diabetes (REWIND)'),
    tire: ['Bénéfice cardiovasculaire du dulaglutide, y compris chez des patients surtout en prévention primaire.'],
    ou: ['Fiche aGLP-1, fiche « Diabète et maladie cardiovasculaire ».'],
  },
  {
    id: 'empareg', court: 'Empagliflozine et cœur (EMPA-REG 2015)', type: 'Essai clinique',
    citation: 'Zinman B, Wanner C, Lachin JM, et al. Empagliflozin, cardiovascular outcomes, and mortality in type 2 diabetes. N Engl J Med. 2015;373(22):2117-28.',
    lien: pubmed('Empagliflozin, cardiovascular outcomes, and mortality in type 2 diabetes'),
    tire: ['Réduction de la mortalité cardiovasculaire et des hospitalisations pour insuffisance cardiaque sous iSGLT2.'],
    ou: ['Fiche iSGLT2, fiche « Diabète et maladie cardiovasculaire ».'],
  },
  {
    id: 'dapahf', court: 'Dapagliflozine et insuffisance cardiaque (DAPA-HF 2019)', type: 'Essai clinique',
    citation: 'McMurray JJV, Solomon SD, Inzucchi SE, et al. Dapagliflozin in patients with heart failure and reduced ejection fraction. N Engl J Med. 2019;381(21):1995-2008.',
    lien: pubmed('Dapagliflozin in patients with heart failure and reduced ejection fraction'),
    tire: ['Bénéfice dans l\'insuffisance cardiaque, avec ou sans diabète.'],
    ou: ['Fiche iSGLT2.'],
  },
  {
    id: 'dapackd', court: 'Dapagliflozine et rein (DAPA-CKD 2020)', type: 'Essai clinique',
    citation: 'Heerspink HJL, Stefánsson BV, Correa-Rotter R, et al. Dapagliflozin in patients with chronic kidney disease. N Engl J Med. 2020;383(15):1436-46.',
    lien: pubmed('Dapagliflozin in patients with chronic kidney disease'),
    tire: ['Ralentissement de la maladie rénale chronique, avec ou sans diabète.'],
    ou: ['Fiche iSGLT2, fiches Maladie rénale chronique et Néphropathie.'],
  },
  {
    id: 'credence', court: 'Canagliflozine et rein (CREDENCE 2019)', type: 'Essai clinique',
    citation: 'Perkovic V, Jardine MJ, Neal B, et al. Canagliflozin and renal outcomes in type 2 diabetes and nephropathy. N Engl J Med. 2019;380(24):2295-306.',
    lien: pubmed('Canagliflozin and renal outcomes in type 2 diabetes and nephropathy'),
    tire: ['Protection rénale démontrée chez le diabétique de type 2 avec néphropathie.'],
    ou: ['Fiche iSGLT2, fiche Néphropathie.'],
  },
];

export const SOURCE_PAR_ID = Object.fromEntries(SOURCES.map((s) => [s.id, s])) as Record<string, Source>;

/** Sources de chaque fiche (maladie ou classe de traitement). */
export const SOURCES_FICHE: Record<string, string[]> = {
  hgpo: ['ada', 'iadpsg'],
  t2: ['ada', 'ukpds16', 'ukpds35', 'adag', 'tir'], t1: ['ada', 'tir', 'adag'], prediabete: ['ada', 'dpp'], gestationnel: ['iadpsg', 'ada'],
  hypo: ['adahypo', 'ada'], acidocetose: ['ada'], repasSaute: ['ada'], effort: ['ada'], ramadan: ['idfdar'], irc: ['adakdigo'],
  retino: ['ukpds35', 'sustain6', 'ada'], nephro: ['adakdigo', 'ukpds35', 'dapackd', 'credence'], neuro: ['ukpds35', 'ada'], pied: ['ada'],
  coronaire: ['leader', 'sustain6', 'rewind', 'empareg', 'ada'],
  metformine: ['ada', 'adakdigo'], sulfamide: ['ada'], glibenclamide: ['idfdar', 'ada'], idpp4: ['ada', 'adakdigo'],
  aglp1: ['leader', 'sustain6', 'rewind'], isglt2: ['empareg', 'dapahf', 'dapackd', 'credence', 'sglt2'],
  basale: ['ada', 'idfdar'], rapide: ['ada'], melange: ['ada', 'idfdar'],
};
