/**
 * Catalogue des maladies et situations. Chaque fiche suit le même plan qu'Hémodyssée :
 * ce qui se passe → ce qu'on voit → les conséquences → le traitement proposé → l'arrêt.
 * Les textes existent en trois niveaux : 1 Découvrir, 2 Comprendre, 3 Approfondir.
 */
import type { ClasseId, Niveau, Terrain, Traitement, TypeDiabete } from '../core/types.ts';
import { PROFILS, type Profil } from '../core/moteur.ts';
import type { ZoneId } from './zones.ts';

export type Famille = 'diabetes' | 'aigues' | 'situations' | 'complications';

export const FAMILLES: Record<Famille, string> = {
  diabetes: 'Les diabètes',
  aigues: 'Urgences',
  situations: 'Situations de la vie',
  complications: 'Complications',
};

export interface Pathologie {
  id: string;
  nom: string;
  court: string;
  famille: Famille;
  zones: ZoneId[];
  niveauMin: Niveau;
  /** s = sévérité 0,4 / 0,7 / 1 (si la fiche a des niveaux de sévérité). */
  appliquer: (t: Terrain, s: number) => void;
  /** Noms des trois niveaux de sévérité (sinon : pas de choix de sévérité). */
  severites?: [string, string, string];
  texte: Record<Niveau, string>;
  voir: string;
  consequences: string[];
  traitement: { propose: Traitement; retirer?: ClasseId[]; texte: string; nonMedicamenteux?: string };
  /** Traitement appliqué avec la fiche pour montrer la situation (ex. : le glibenclamide qui cause l'hypoglycémie). */
  demo?: Traitement;
  arret?: string;
}

export interface PathoActive { id: string; s: number }

export const SEVERITES = [
  { v: 0.4, nom: 'Légère' },
  { v: 0.7, nom: 'Modérée' },
  { v: 1, nom: 'Sévère' },
];

const profil = (t: Terrain, p: Profil, type: TypeDiabete) => { t.beta = p.beta; t.si = p.si; t.sl = p.sl; t.inc = p.inc; t.type = type; };
const max = (a: number, b: number) => Math.max(a, b);
export const TYPES_DIABETE = ['prediabete', 't1', 't2', 'gestationnel', 'acidocetose'];

export const PATHOLOGIES: Pathologie[] = [
  // ── Les diabètes ──
  {
    id: 't2', nom: 'Diabète de type 2', court: 'Type 2', famille: 'diabetes', zones: ['muscles', 'foie', 'pancreas', 'ilot', 'graisse', 'sang'], niveauMin: 1,
    severites: ['Début', 'Installé', 'Évolué'],
    appliquer: (t, s) => profil(t, s <= 0.4 ? PROFILS.t2leger : s >= 1 ? PROFILS.t2evolue : PROFILS.t2, 't2'),
    texte: {
      1: 'Les portes des cellules répondent mal à la clé (l\'insuline) : c\'est la résistance à l\'insuline. Le pancréas compense pendant des années, puis s\'épuise. Le sucre reste dans le sang, souvent sans aucun signe.',
      2: 'Deux anomalies s\'associent : l\'insulinorésistance (muscles, foie, graisse) et une sécrétion d\'insuline qui devient insuffisante. Le foie produit trop de glucose la nuit. Le surpoids abdominal, la sédentarité et l\'hérédité en sont les principaux facteurs. Le diagnostic est souvent tardif.',
      3: 'La fonction des cellules bêta décline d\'environ 4 à 6 % par an (UKPDS), d\'où l\'escalade progressive du traitement. L\'effet incrétine est diminué, le glucagon mal freiné. Critères : glycémie à jeun ≥ 1,26 g/L à deux reprises, HbA1c ≥ 6,5 %, ou glycémie ≥ 2,00 g/L 2 h après 75 g de glucose (ADA).',
    },
    voir: 'Le sang reste chargé de sucre ; les muscles en captent moins ; le foie continue d\'en relâcher la nuit ; les cellules bêta s\'éteignent au fil des années (vue Îlot).',
    consequences: ['Complications des petits vaisseaux : yeux, reins, nerfs', 'Infarctus, AVC, artérite des jambes (voir Hémodyssée)', 'Pied diabétique', 'Infections plus fréquentes'],
    traitement: {
      propose: { metformine: 1 },
      texte: 'Mesures d\'hygiène de vie + metformine en première intention. Si l\'objectif n\'est pas atteint : ajouter une 2e classe (sulfamide, iDPP-4, aGLP-1, iSGLT2), puis l\'insuline. En cas de maladie cardiovasculaire, d\'insuffisance cardiaque ou rénale : iSGLT2 ou aGLP-1 d\'emblée, quel que soit l\'HbA1c (ADA).',
      nonMedicamenteux: 'Activité physique (au moins 150 minutes par semaine), perte de poids si surpoids, moins de boissons sucrées, portions de riz et de pain adaptées, arrêt du tabac.',
    },
    arret: 'La glycémie remonte en quelques jours ou semaines. L\'exposition au sucre reprend sa progression, et avec elle le risque de complications.',
  },
  {
    id: 't1', nom: 'Diabète de type 1', court: 'Type 1', famille: 'diabetes', zones: ['pancreas', 'ilot', 'muscles', 'graisse', 'sang'], niveauMin: 1,
    appliquer: (t) => profil(t, PROFILS.t1, 't1'),
    texte: {
      1: 'Le système immunitaire détruit les cellules qui fabriquent l\'insuline. Il n\'y a plus de clé : le sucre ne peut plus entrer dans les cellules. L\'insuline doit être injectée tous les jours, toute la vie.',
      2: 'Maladie auto-immune, le plus souvent chez l\'enfant, l\'adolescent ou l\'adulte jeune. Début souvent rapide : soif, urines abondantes, amaigrissement, fatigue. Sans insuline, les graisses sont brûlées en masse et le foie fabrique des corps cétoniques : c\'est l\'acidocétose, une urgence.',
      3: 'Destruction auto-immune des cellules bêta (anticorps anti-GAD, anti-IA2, anti-ZnT8). Le traitement de référence est le schéma basal-bolus (ou la pompe) ; le mélange 2 fois par jour est plus simple mais moins souple. Les comprimés du type 2 n\'ont pas leur place.',
    },
    voir: 'Plus de cellules bêta dans l\'îlot (vue Îlot) ; plus d\'insuline dans le sang ; les muscles affamés au milieu d\'un sang plein de sucre ; le sucre déborde dans les urines.',
    consequences: ['Acidocétose sans insuline (urgence vitale)', 'Hypoglycémies sous insuline', 'Complications des yeux, des reins, des nerfs à long terme'],
    traitement: {
      propose: { basale: 1, rapide: 1 },
      texte: 'Insuline à vie : schéma basal-bolus (insuline lente une fois par jour + insuline rapide avant chaque repas), adapté aux repas et à l\'effort. Le mélange 30/70 deux fois par jour est une alternative si les repas sont réguliers.',
      nonMedicamenteux: 'Autosurveillance de la glycémie (ou capteur), compter les glucides, avoir toujours du sucre sur soi, éducation thérapeutique de l\'enfant et de la famille.',
    },
    arret: 'Sans insuline, l\'acidocétose s\'installe en quelques heures à quelques jours : c\'est une urgence vitale. On n\'arrête jamais l\'insuline, même si on ne mange pas (on adapte la dose).',
  },
  {
    id: 'prediabete', nom: 'Prédiabète', court: 'Prédiabète', famille: 'diabetes', zones: ['muscles', 'pancreas', 'sang'], niveauMin: 1,
    appliquer: (t) => profil(t, PROFILS.prediabete, 'prediabete'),
    texte: {
      1: 'Le sucre est un peu trop haut, pas encore au niveau du diabète. C\'est le meilleur moment pour agir : bouger plus et manger mieux peut éviter ou retarder le diabète.',
      2: 'Glycémie à jeun entre 1,00 et 1,25 g/L (ADA ; 1,10 à 1,25 pour l\'OMS) ou HbA1c entre 5,7 et 6,4 %. La résistance à l\'insuline est là, le pancréas compense encore.',
      3: 'Dans l\'étude DPP (NEJM 2002), les mesures d\'hygiène de vie ont réduit l\'apparition du diabète de 58 %, la metformine de 31 %. La metformine se discute surtout chez les plus à risque (obésité importante, moins de 60 ans, antécédent de diabète gestationnel).',
    },
    voir: 'Glycémie du réveil un peu haute, pics après les repas plus marqués, pancréas qui travaille plus.',
    consequences: ['Évolution fréquente vers le diabète de type 2', 'Risque cardiovasculaire déjà augmenté'],
    traitement: {
      propose: {},
      texte: 'Mesures d\'hygiène de vie en priorité : activité physique régulière et perte de 5 à 7 % du poids si surpoids. Contrôle de la glycémie chaque année.',
      nonMedicamenteux: 'Marcher 30 minutes par jour, réduire les boissons sucrées, les portions et le grignotage.',
    },
  },
  {
    id: 'gestationnel', nom: 'Diabète gestationnel', court: 'Gestationnel', famille: 'diabetes', zones: ['sang', 'muscles', 'pancreas'], niveauMin: 2,
    appliquer: (t) => profil(t, PROFILS.prediabete, 'gestationnel'),
    texte: {
      1: 'Pendant la grossesse, les hormones du placenta rendent l\'insuline moins efficace. Si le pancréas ne suit pas, le sucre monte : c\'est le diabète gestationnel. Il disparaît en général après l\'accouchement.',
      2: 'Dépisté entre 24 et 28 semaines par une HGPO à 75 g : diabète gestationnel si glycémie à jeun ≥ 0,92 g/L, ou ≥ 1,80 g/L à 1 h, ou ≥ 1,53 g/L à 2 h (critères IADPSG/OMS 2013). Risques : gros bébé, accouchement difficile, hypoglycémie du nouveau-né.',
      3: 'Objectifs (ADA) : glycémie à jeun < 0,95 g/L, < 1,40 g/L 1 h après le repas ou < 1,20 g/L 2 h après. Diététique d\'abord ; insuline si les objectifs ne sont pas atteints. Risque élevé de diabète de type 2 plus tard : dépistage après l\'accouchement puis régulier.',
    },
    voir: 'Glycémie du réveil et pics après les repas au-dessus des objectifs de la grossesse.',
    consequences: ['Macrosomie (gros bébé), accouchement difficile', 'Hypoglycémie du nouveau-né', 'Diabète de type 2 plus tard chez la mère'],
    traitement: {
      propose: {},
      texte: 'Diététique (répartition des glucides sur la journée), activité physique adaptée, autosurveillance. Insuline si les objectifs ne sont pas atteints (traitement de référence pendant la grossesse).',
      nonMedicamenteux: 'Fractionner les repas, éviter les boissons sucrées, marcher après les repas.',
    },
  },
  // ── Urgences ──
  {
    id: 'hypo', nom: 'Hypoglycémie', court: 'Hypoglycémie', famille: 'aigues', zones: ['cerveau', 'sang', 'ilot', 'foie'], niveauMin: 1,
    appliquer: (t) => { if (t.type === 'aucun') profil(t, PROFILS.t2leger, 't2'); t.repasSaute = true; },
    demo: { glibenclamide: 1 },
    texte: {
      1: 'Le sucre descend trop bas, sous 0,70 g/L. Sueurs, tremblements, faim, cœur qui bat vite, puis confusion. La cause la plus fréquente : un médicament qui baisse le sucre et un repas sauté.',
      2: 'Niveau 1 : < 0,70 g/L ; niveau 2 : < 0,54 g/L ; niveau 3 : malaise sévère qui nécessite l\'aide d\'une autre personne (ADA). Causes : sulfamides (surtout glibenclamide), insuline, repas sauté, effort, alcool, rein malade.',
      3: 'Le corps se défend : le glucagon et l\'adrénaline font libérer du glucose par le foie. Cette défense est émoussée après des hypoglycémies répétées et dans le type 1 ancien. Une HbA1c « trop belle » peut cacher des hypoglycémies : d\'où l\'intérêt du temps passé sous 0,70 g/L.',
    },
    voir: 'La courbe passe sous la ligne rouge ; le cerveau manque de sucre ; les cellules alpha lâchent le glucagon ; le foie relâche ses réserves. Touchez « Resucrer » pour voir la remontée.',
    consequences: ['Malaise, chute, accident (route, travail)', 'Perte de connaissance, convulsions (niveau 3)', 'Troubles du rythme cardiaque chez le sujet fragile', 'Peur des hypoglycémies, qui pousse à mal suivre le traitement'],
    traitement: {
      propose: { idpp4: 1 }, retirer: ['glibenclamide'],
      texte: 'Tout de suite : règle des 15. 15 g de sucre rapide (3 morceaux de sucre, un demi-verre de jus ou de soda), contrôle après 15 minutes, recommencer si < 0,70 g/L, puis une collation. Si la personne ne peut pas avaler : glucagon, ou glucose en veine. Ensuite : trouver la cause et changer de traitement (ici, remplacer le glibenclamide par un iDPP-4 ou le gliclazide).',
      nonMedicamenteux: 'Toujours avoir du sucre sur soi ; ne pas sauter de repas sous sulfamide ou insuline ; prévenir l\'entourage ; contrôler sa glycémie avant de conduire.',
    },
  },
  {
    id: 'acidocetose', nom: 'Acidocétose diabétique', court: 'Acidocétose', famille: 'aigues', zones: ['graisse', 'foie', 'reins', 'sang'], niveauMin: 2,
    appliquer: (t) => profil(t, PROFILS.t1, 't1'),
    texte: {
      1: 'Sans insuline, le corps brûle ses graisses et fabrique des déchets acides. Soif intense, urines abondantes, nausées, respiration rapide, puis coma. C\'est une urgence : il faut aller à l\'hôpital.',
      2: 'Carence profonde en insuline (type 1 révélé ou insuline arrêtée, infection) : glycémie souvent > 2,50 g/L, corps cétoniques dans le sang et les urines, acidose, déshydratation importante.',
      3: 'Traitement hospitalier : réhydratation, insuline en perfusion, surveillance et apport de potassium, recherche du facteur déclenchant. Les iSGLT2 peuvent provoquer une acidocétose avec une glycémie presque normale (« euglycémique »). Le moteur signale l\'acidocétose mais ne simule pas les corps cétoniques.',
    },
    voir: 'Pas d\'insuline dans le sang : le sucre s\'accumule, déborde dans les urines, et les graisses sont libérées (vue Corps).',
    consequences: ['Déshydratation, coma', 'Troubles du potassium', 'Décès sans traitement'],
    traitement: {
      propose: { basale: 1, rapide: 1 },
      texte: 'Urgence hospitalière (réhydratation, insuline en perfusion, potassium). Ensuite, schéma d\'insuline sous la peau et éducation : ne jamais arrêter l\'insuline lente, même sans manger ; contrôler les corps cétoniques si la glycémie dépasse 2,50 g/L.',
    },
    arret: 'L\'arrêt de l\'insuline est la première cause d\'acidocétose chez le patient de type 1 connu.',
  },
  // ── Situations de la vie ──
  {
    id: 'repasSaute', nom: 'Repas sauté', court: 'Repas sauté', famille: 'situations', zones: ['sang', 'foie'], niveauMin: 1,
    appliquer: (t) => { t.repasSaute = true; },
    texte: {
      1: 'Le déjeuner est sauté. Sans traitement, le foie compense. Mais sous sulfamide ou insuline, le sucre peut tomber trop bas.',
      2: 'Le foie libère du glucose pour maintenir la glycémie. Les médicaments qui stimulent l\'insuline sans tenir compte du sucre (sulfamides) ou l\'insuline elle-même empêchent cette compensation.',
      3: 'Comparez glibenclamide, gliclazide et iDPP-4 sur la même journée : le risque d\'hypoglycémie suit l\'ordre glibenclamide > gliclazide > iDPP-4.',
    },
    voir: 'Plus de pic à midi ; sous sulfamide, la courbe descend dans l\'après-midi.',
    consequences: ['Hypoglycémie sous sulfamide ou insuline'],
    traitement: { propose: {}, texte: 'Sous sulfamide ou insuline rapide : ne pas sauter de repas, ou ne pas prendre la dose correspondante (insuline rapide).' },
  },
  {
    id: 'effort', nom: 'Activité physique', court: 'Effort', famille: 'situations', zones: ['muscles'], niveauMin: 1,
    appliquer: (t) => { t.efforts = [{ h: 17, duree: 45, intensite: 0.6 }]; },
    texte: {
      1: 'Une marche rapide de 45 minutes en fin d\'après-midi. Les muscles consomment du sucre, même sans insuline, et deviennent plus sensibles à l\'insuline pendant plusieurs heures.',
      2: 'La contraction fait entrer le glucose dans le muscle par une voie indépendante de l\'insuline. C\'est un pilier du traitement du type 2. Sous insuline ou sulfamide, prévoir une collation ou réduire la dose.',
      3: 'Recommandation : au moins 150 minutes par semaine d\'activité d\'intensité modérée, plus du renforcement musculaire, et limiter le temps assis (ADA). Risque d\'hypoglycémie retardée la nuit après un effort important sous insuline.',
    },
    voir: 'Les muscles des jambes s\'allument et captent du sucre ; la courbe baisse pendant et après l\'effort.',
    consequences: ['Meilleure sensibilité à l\'insuline', 'Hypoglycémie possible sous insuline ou sulfamide'],
    traitement: { propose: {}, texte: 'Encourager l\'activité régulière. Sous insuline : adapter la dose ou prévoir une collation ; avoir du sucre sur soi.' },
  },
  {
    id: 'ramadan', nom: 'Ramadan', court: 'Ramadan', famille: 'situations', zones: ['sang', 'foie'], niveauMin: 1,
    appliquer: (t) => { t.ramadan = true; },
    texte: {
      1: 'Pendant le Ramadan, on mange au sahur (avant l\'aube) et au ndogu (au coucher du soleil). La longue journée sans manger expose à l\'hypoglycémie sous certains traitements, et les repas du soir aux glycémies hautes.',
      2: 'Consultation avant le Ramadan pour évaluer le risque et adapter le traitement. Éviter le glibenclamide ; réduire souvent les doses d\'insuline et de sulfamide ; contrôler la glycémie dans la journée (ça ne rompt pas le jeûne). Rompre le jeûne si la glycémie passe sous 0,70 g/L ou au-dessus de 3,00 g/L, ou en cas de malaise.',
      3: 'Le guide IDF-DAR 2021 classe le risque (faible, modéré, élevé) selon le type de diabète, le traitement, les complications et les antécédents. Insuline mélange : la dose du matin au ndogu, celle du soir réduite au sahur. Metformine, iDPP-4, iSGLT2 (en buvant assez) exposent peu à l\'hypoglycémie.',
    },
    voir: 'Deux gros repas (sahur, ndogu) ; une longue descente pendant la journée ; un pic le soir.',
    consequences: ['Hypoglycémie dans la journée (surtout glibenclamide, insuline)', 'Hyperglycémie après le ndogu', 'Déshydratation'],
    traitement: { propose: {}, retirer: ['glibenclamide'], texte: 'Adapter le traitement avec le médecin avant le Ramadan : remplacer le glibenclamide (gliclazide ou iDPP-4), réduire et décaler les doses d\'insuline, contrôler la glycémie.' },
  },
  {
    id: 'irc', nom: 'Maladie rénale chronique', court: 'Rein malade', famille: 'situations', zones: ['reins'], niveauMin: 2,
    severites: ['DFG 45-59', 'DFG 30-44', 'DFG 15-29'],
    appliquer: (t, s) => { t.rein = Math.min(t.rein, 0.9 - 0.65 * s); },
    texte: {
      1: 'Quand le rein filtre mal, certains médicaments s\'accumulent dans le sang : les doses doivent être adaptées, et certains sont à éviter.',
      2: 'Les sulfamides (surtout le glibenclamide) et l\'insuline sont éliminés plus lentement : risque d\'hypoglycémie. La metformine se réduit puis s\'arrête quand le DFG baisse. Les iSGLT2 baissent moins la glycémie mais protègent le rein.',
      3: 'KDIGO/ADA 2022 : metformine pleine dose si DFG ≥ 45, 1 000 mg/j entre 30 et 44, arrêt sous 30 ; iSGLT2 débutables jusqu\'à un DFG de 20 pour la protection rénale ; iDPP-4 à adapter (sauf linagliptine) ; aGLP-1 utilisables. Bloquer aussi le système rénine-angiotensine en cas d\'albuminurie (voir Hémodyssée).',
    },
    voir: 'Le rein (vue Rein) filtre moins : moins de glucose éliminé sous iSGLT2 ; l\'insuline et les sulfamides durent plus longtemps.',
    consequences: ['Hypoglycémies sous sulfamide ou insuline', 'Accumulation de la metformine si DFG très bas'],
    traitement: { propose: { isglt2: 1 }, retirer: ['glibenclamide'], texte: 'Protéger le rein : iSGLT2 (et IEC ou ARA II si albuminurie, voir Hémodyssée). Adapter les doses : metformine selon le DFG, pas de glibenclamide, iDPP-4 à dose réduite.' },
  },
  // ── Complications ──
  {
    id: 'retino', nom: 'Rétinopathie diabétique', court: 'Rétinopathie', famille: 'complications', zones: ['yeux'], niveauMin: 2,
    severites: ['Débutante', 'Modérée', 'Proliférante'],
    appliquer: (t, s) => { t.retino = max(t.retino, 0.3 + 0.7 * s); },
    texte: {
      1: 'Les petits vaisseaux de la rétine s\'abîment. Au début on voit bien : seul le fond d\'œil la découvre. Sans traitement, elle peut rendre aveugle.',
      2: 'Micro-anévrismes et petites hémorragies, puis zones privées de sang et nouveaux vaisseaux fragiles. L\'équilibre du sucre et de la tension la ralentit ; le laser et les injections dans l\'œil traitent les formes graves.',
      3: 'Dans l\'UKPDS, chaque point d\'HbA1c en moins est associé à environ 37 % de complications microvasculaires en moins. Une baisse très rapide de l\'HbA1c peut aggraver transitoirement une rétinopathie avancée : surveillance ophtalmologique rapprochée.',
    },
    voir: 'Petites taches rouges sur la rétine (vue Corps, yeux).',
    consequences: ['Baisse de la vision, cécité', 'Œdème maculaire'],
    traitement: { propose: {}, texte: 'Équilibrer la glycémie (progressivement) et la tension. Fond d\'œil régulier, laser ou injections si besoin.' },
  },
  {
    id: 'nephro', nom: 'Néphropathie diabétique', court: 'Néphropathie', famille: 'complications', zones: ['reins'], niveauMin: 2,
    severites: ['Albuminurie', 'DFG 30-44', 'DFG 15-29'],
    appliquer: (t, s) => { t.nephro = max(t.nephro, 0.3 + 0.7 * s); t.rein = Math.min(t.rein, s <= 0.4 ? 0.85 : 0.9 - 0.65 * s); },
    texte: {
      1: 'Le filtre du rein s\'abîme : il laisse passer des protéines dans les urines, puis il filtre de moins en moins bien.',
      2: 'D\'abord une albuminurie (protéines dans les urines), puis une baisse du DFG. Le contrôle du sucre et de la tension la ralentit. iSGLT2 et bloqueurs du système rénine-angiotensine protègent le rein.',
      3: 'KDIGO/ADA 2022 : metformine (selon le DFG) + iSGLT2 en première ligne chez le diabétique de type 2 avec maladie rénale ; IEC ou ARA II à dose maximale tolérée en cas d\'albuminurie ; aGLP-1 si l\'objectif n\'est pas atteint. Dépistage annuel : albuminurie et créatinine.',
    },
    voir: 'Reins plus pâles ; le rein filtre moins (vue Rein).',
    consequences: ['Insuffisance rénale, dialyse', 'Risque cardiovasculaire très augmenté'],
    traitement: { propose: { metformine: 1, isglt2: 1 }, retirer: ['glibenclamide'], texte: 'Metformine (si le DFG le permet) + iSGLT2. IEC ou ARA II si albuminurie, contrôle de la tension (voir Hémodyssée). Doses adaptées au DFG.' },
  },
  {
    id: 'neuro', nom: 'Neuropathie diabétique', court: 'Neuropathie', famille: 'complications', zones: ['nerfs', 'pieds'], niveauMin: 2,
    appliquer: (t, s) => { t.neuro = max(t.neuro, 0.3 + 0.7 * s); },
    texte: {
      1: 'Les nerfs des pieds sont abîmés : fourmillements, brûlures la nuit, puis le pied ne sent plus rien. Une blessure peut passer inaperçue.',
      2: 'Neuropathie « en chaussettes », symétrique. Les douleurs se traitent (médicaments spécifiques) ; la perte de sensibilité impose une prévention stricte des plaies du pied.',
      3: 'Dépistage annuel au monofilament et au diapason. Formes végétatives : hypotension orthostatique, gastroparésie, troubles vésicaux et érectiles, hypoglycémies non ressenties.',
    },
    voir: 'Nerfs des jambes qui scintillent (fourmillements), pieds moins sensibles (vue Corps).',
    consequences: ['Plaies du pied non ressenties', 'Douleurs chroniques', 'Chutes'],
    traitement: { propose: {}, texte: 'Équilibrer la glycémie, examiner les pieds tous les jours, chaussures adaptées. Traiter la douleur si besoin.' },
  },
  {
    id: 'pied', nom: 'Pied diabétique (plaie)', court: 'Pied diabétique', famille: 'complications', zones: ['pieds', 'nerfs'], niveauMin: 2,
    appliquer: (t, s) => { t.pied = max(t.pied, 0.4 + 0.6 * s); t.neuro = max(t.neuro, 0.6); },
    texte: {
      1: 'Une petite plaie sous le pied, non ressentie, qui s\'infecte et ne guérit pas : c\'est la porte d\'entrée de l\'amputation. Toute plaie du pied est une urgence.',
      2: 'Le mal perforant plantaire apparaît sur une zone d\'appui, chez un pied insensible. L\'artérite et l\'infection aggravent le pronostic. Il faut décharger le pied (ne plus appuyer dessus), soigner, rechercher l\'infection et l\'artérite.',
      3: 'Prise en charge multidisciplinaire : décharge stricte, débridement, antibiotiques si infection, revascularisation si artérite (voir Hémodyssée, artères des jambes). Prévention : examen des pieds à chaque consultation chez le patient à risque.',
    },
    voir: 'Plaie sous le pied (vue Corps).',
    consequences: ['Infection, ostéite', 'Amputation'],
    traitement: { propose: {}, texte: 'Urgence : décharge, soins locaux, recherche d\'infection et d\'artérite ; équilibrer la glycémie (souvent par insuline en cas d\'infection).' },
  },
  {
    id: 'coronaire', nom: 'Diabète et maladie cardiovasculaire', court: 'Cœur', famille: 'complications', zones: ['coeur'], niveauMin: 2,
    appliquer: (t) => { t.coronaire = 1; },
    texte: {
      1: 'Le diabète abîme aussi les grosses artères : infarctus, AVC, artérite des jambes. Certains médicaments du diabète protègent le cœur.',
      2: 'Chez un diabétique de type 2 avec maladie cardiovasculaire, on choisit un aGLP-1 ou un iSGLT2 au bénéfice démontré, quel que soit l\'HbA1c. Le contrôle de la tension, du LDL et l\'arrêt du tabac sont indispensables.',
      3: 'Bénéfices démontrés : aGLP-1 (LEADER, SUSTAIN-6, REWIND) sur les événements athéromateux ; iSGLT2 (EMPA-REG OUTCOME, DAPA-HF) surtout sur l\'insuffisance cardiaque et le rein. Objectif de LDL plus bas (voir Hémodyssée).',
    },
    voir: 'Le cœur s\'allume ; les risques d\'infarctus montent avec l\'HbA1c.',
    consequences: ['Infarctus, AVC', 'Insuffisance cardiaque'],
    traitement: { propose: { metformine: 1, aglp1: 1 }, texte: 'Metformine + aGLP-1 (ou iSGLT2, surtout en cas d\'insuffisance cardiaque ou rénale). Tension, statine, antiagrégant si indiqué : voir Hémodyssée.' },
  },
];

export const PATHO_PAR_ID = Object.fromEntries(PATHOLOGIES.map((p) => [p.id, p])) as Record<string, Pathologie>;

/** Construit le terrain à partir du terrain sain et des maladies appliquées (dans l'ordre). */
export function construireTerrain(base: Terrain, actives: PathoActive[]): Terrain {
  const t: Terrain = { ...base, repas: [...base.repas], collations: [...base.collations], efforts: [...base.efforts] };
  // Les types de diabète d'abord, puis le reste.
  const ordre = [...actives].sort((a, b) => Number(!TYPES_DIABETE.includes(a.id)) - Number(!TYPES_DIABETE.includes(b.id)));
  for (const a of ordre) PATHO_PAR_ID[a.id]?.appliquer(t, a.s);
  // Une complication suppose un diabète : type 2 par défaut.
  if (t.type === 'aucun' && actives.some((a) => PATHO_PAR_ID[a.id]?.famille === 'complications')) profil(t, PROFILS.t2, 't2');
  return t;
}
