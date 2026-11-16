/** Classes thérapeutiques : mécanisme, site d'action, effet visible, effets indésirables, précautions, arrêt. */
import type { ClasseId, Niveau } from '../core/types.ts';
import type { ZoneId } from './zones.ts';

export type GroupeClasse = 'comprimes' | 'injectables' | 'insulines';

export const GROUPES: Record<GroupeClasse, string> = {
  comprimes: 'Comprimés',
  injectables: 'Injectables non insuliniques',
  insulines: 'Insulines',
};

export interface Classe {
  id: ClasseId;
  nom: string;
  court: string;
  exemples: string; // DCI (dénominations communes)
  groupe: GroupeClasse;
  couleur: string;
  cible: string; // où elle agit (affiché sur le schéma)
  zone: ZoneId; // site d'action qui s'allume dans la scène
  mecanisme: Record<Niveau, string>;
  effetVisible: string;
  indesirables: string[];
  precautions: string; // rein, Ramadan, hypoglycémie
  arret: string;
}

export const CLASSES: Classe[] = [
  {
    id: 'metformine', nom: 'Metformine (biguanide)', court: 'Metformine', exemples: 'metformine', groupe: 'comprimes', couleur: '#34d399', cible: 'Foie (et muscles)', zone: 'foie',
    mecanisme: {
      1: 'Elle freine le foie, qui fabrique trop de sucre, surtout la nuit. Elle ne fait pas baisser le sucre trop bas quand on la prend seule.',
      2: 'Elle réduit la production de glucose par le foie et améliore un peu la sensibilité à l\'insuline. Traitement de première intention du type 2 (avec les mesures d\'hygiène de vie), sauf contre-indication.',
      3: 'Mécanisme complexe (énergie de la cellule hépatique, voie AMPK, intestin). Baisse de l\'HbA1c d\'environ 1 point en monothérapie, sans hypoglycémie ni prise de poids. Peu coûteuse, très disponible.',
    },
    effetVisible: 'Le foie relâche moins de sucre la nuit : la glycémie du réveil baisse.',
    indesirables: ['Troubles digestifs au début (diarrhée, nausées) : commencer à petite dose, pendant le repas', 'Carence en vitamine B12 à long terme', 'Acidose lactique (très rare), surtout si le rein est très altéré'],
    precautions: 'Rein : pleine dose si DFG ≥ 45, 1 000 mg/j au maximum entre 30 et 44, contre-indiquée sous 30. Arrêt temporaire avant une injection de produit de contraste iodé si le rein est fragile. Ramadan : sans risque d\'hypoglycémie, la dose est répartie entre sahur et ndogu.',
    arret: 'La glycémie remonte en quelques jours, surtout celle du réveil.',
  },
  {
    id: 'sulfamide', nom: 'Sulfamide hypoglycémiant (gliclazide, glimépiride)', court: 'Sulfamide', exemples: 'gliclazide, glimépiride', groupe: 'comprimes', couleur: '#60a5fa', cible: 'Cellules bêta du pancréas', zone: 'ilot',
    mecanisme: {
      1: 'Il pousse le pancréas à libérer de l\'insuline, même quand le sucre est déjà bas : il marche bien, mais il peut provoquer des hypoglycémies.',
      2: 'Il ferme les canaux potassiques (K-ATP) des cellules bêta, ce qui déclenche la libération d\'insuline indépendamment de la glycémie. Il faut donc des cellules bêta encore fonctionnelles : inutile dans le type 1.',
      3: 'Liaison à la sous-unité SUR1 du canal K-ATP. Baisse de l\'HbA1c d\'environ 1 point. Le gliclazide expose à moins d\'hypoglycémies que le glibenclamide. Efficacité qui s\'épuise avec la perte progressive de la fonction bêta.',
    },
    effetVisible: 'Les cellules bêta libèrent de l\'insuline en continu, même la nuit et entre les repas.',
    indesirables: ['Hypoglycémies (surtout repas sauté, effort, sujet âgé, rein malade)', 'Prise de poids'],
    precautions: 'Toujours manger après la prise. Rein : prudence, préférer le gliclazide à dose adaptée. Ramadan : dose souvent réduite et décalée au ndogu (guide IDF-DAR).',
    arret: 'La glycémie remonte en quelques jours.',
  },
  {
    id: 'glibenclamide', nom: 'Glibenclamide (sulfamide ancien)', court: 'Glibenclamide', exemples: 'glibenclamide', groupe: 'comprimes', couleur: '#f87171', cible: 'Cellules bêta du pancréas', zone: 'ilot',
    mecanisme: {
      1: 'Un sulfamide plus ancien et plus fort, qui agit plus longtemps : il provoque plus souvent des hypoglycémies, parfois longues.',
      2: 'Même mécanisme que les autres sulfamides, mais action plus puissante et plus prolongée, avec des produits de dégradation actifs éliminés par le rein. D\'où des hypoglycémies plus fréquentes et plus longues.',
      3: 'À éviter chez le sujet âgé, l\'insuffisant rénal et pendant le Ramadan (risque d\'hypoglycémie le plus élevé de la classe). Il figure ici pour comprendre pourquoi on préfère le gliclazide.',
    },
    effetVisible: 'Libération d\'insuline forte et continue : la glycémie peut tomber sous 0,70 g/L si un repas manque.',
    indesirables: ['Hypoglycémies fréquentes et prolongées (surveillance de plusieurs heures après resucrage)', 'Prise de poids'],
    precautions: 'Déconseillé : sujet âgé, rein malade, Ramadan. Une hypoglycémie sous glibenclamide peut récidiver après le resucrage : surveillance prolongée.',
    arret: 'L\'effet persiste encore un moment après l\'arrêt (action prolongée).',
  },
  {
    id: 'idpp4', nom: 'Inhibiteur de la DPP-4 (gliptine)', court: 'iDPP-4', exemples: 'sitagliptine, vildagliptine, linagliptine', groupe: 'comprimes', couleur: '#a78bfa', cible: 'Incrétines (intestin → pancréas)', zone: 'intestin',
    mecanisme: {
      1: 'Il renforce un signal naturel de l\'intestin qui prévient le pancréas au moment du repas. Il n\'agit que si le sucre monte : pas d\'hypoglycémie quand on le prend seul.',
      2: 'Il bloque l\'enzyme DPP-4 qui détruit le GLP-1 et le GIP. Ces incrétines durent plus longtemps : plus d\'insuline et moins de glucagon, seulement quand la glycémie est élevée.',
      3: 'Baisse de l\'HbA1c d\'environ 0,5 à 0,8 point, neutre sur le poids, très bien toléré. Dose à adapter au rein (sauf linagliptine). Pas d\'intérêt à l\'associer à un aGLP-1 (même voie).',
    },
    effetVisible: 'Le pancréas répond mieux au repas ; le glucagon baisse quand le sucre est haut.',
    indesirables: ['Bien toléré dans l\'ensemble', 'Rares : pancréatite, douleurs articulaires'],
    precautions: 'Rein : dose adaptée (sauf linagliptine). Ramadan : faible risque d\'hypoglycémie, souvent préféré aux sulfamides.',
    arret: 'La glycémie après les repas remonte en quelques jours.',
  },
  {
    id: 'aglp1', nom: 'Agoniste du récepteur du GLP-1 (aGLP-1)', court: 'aGLP-1', exemples: 'liraglutide, dulaglutide, sémaglutide', groupe: 'injectables', couleur: '#f472b6', cible: 'Pancréas, estomac, cerveau (satiété)', zone: 'estomac',
    mecanisme: {
      1: 'Une injection qui imite une hormone de l\'intestin : le pancréas libère l\'insuline quand il faut, l\'estomac se vide plus lentement et on a moins faim.',
      2: 'Il active le récepteur du GLP-1 à des concentrations bien plus fortes que l\'hormone naturelle : plus d\'insuline et moins de glucagon quand la glycémie est haute, vidange gastrique ralentie, satiété. Perte de poids.',
      3: 'Baisse de l\'HbA1c parmi les plus fortes des non-insulines (environ 1 à 1,5 point). Bénéfice cardiovasculaire démontré pour plusieurs molécules (LEADER, SUSTAIN-6, REWIND). Injection quotidienne ou hebdomadaire. Contre-indiqué en cas d\'antécédent de cancer médullaire de la thyroïde.',
    },
    effetVisible: 'Le repas arrive plus lentement dans le sang ; le pic après le repas s\'écrête.',
    indesirables: ['Nausées, vomissements, diarrhée au début (augmenter la dose progressivement)', 'Perte d\'appétit, perte de poids', 'Rares : pancréatite, calculs de la vésicule'],
    precautions: 'Faible risque d\'hypoglycémie seul (plus élevé avec un sulfamide ou l\'insuline). Coût et conservation au froid à anticiper.',
    arret: 'La glycémie et l\'appétit reviennent en quelques semaines ; le poids perdu tend à être repris.',
  },
  {
    id: 'isglt2', nom: 'Inhibiteur de SGLT2 (gliflozine)', court: 'iSGLT2', exemples: 'dapagliflozine, empagliflozine', groupe: 'comprimes', couleur: '#fbbf24', cible: 'Reins (tubule proximal)', zone: 'reins',
    mecanisme: {
      1: 'Il fait éliminer le sucre en trop par les urines. Il protège aussi le cœur et les reins, même chez les non-diabétiques.',
      2: 'Il bloque SGLT2, le transporteur qui récupère le glucose filtré par le rein : le seuil rénal baisse et 50 à 100 g de glucose partent dans les urines chaque jour, sans insuline.',
      3: 'Baisse de l\'HbA1c d\'environ 0,5 à 0,8 point, moindre si le rein est altéré. Bénéfice démontré sur l\'insuffisance cardiaque et la maladie rénale indépendamment de l\'HbA1c (EMPA-REG, DAPA-HF, DAPA-CKD, CREDENCE). Perte de poids et légère baisse de la PA.',
    },
    effetVisible: 'Le rein laisse passer le sucre dans les urines dès 0,70 à 0,90 g/L au lieu de 1,80 g/L.',
    indesirables: ['Mycoses génitales (hygiène)', 'Déshydratation, hypotension : bien boire', 'Acidocétose rare, parfois avec une glycémie presque normale'],
    precautions: 'Rein : moins efficace sur la glycémie quand le DFG baisse, mais garde la protection rénale (débutable jusqu\'à un DFG de 20). Arrêt temporaire en cas de maladie aiguë, de jeûne prolongé ou d\'opération. Ramadan : bien s\'hydrater entre ndogu et sahur.',
    arret: 'La glycémie remonte ; la protection du cœur et des reins disparaît.',
  },
  {
    id: 'basale', nom: 'Insuline lente (basale)', court: 'Insuline lente', exemples: 'glargine, détémir, dégludec ; NPH (insuline humaine intermédiaire)', groupe: 'insulines', couleur: '#22d3ee', cible: 'Foie, muscles, graisse', zone: 'muscles',
    mecanisme: {
      1: 'Une injection par jour qui remplace l\'insuline de fond, celle dont le corps a besoin même sans manger, la nuit et entre les repas.',
      2: 'Elle freine la production de glucose par le foie la nuit et entre les repas. Indispensable dans le type 1 ; dans le type 2, on l\'ajoute quand les comprimés ne suffisent plus, en ajustant la dose sur la glycémie du réveil.',
      3: 'Dose de départ habituelle dans le type 2 : environ 10 unités ou 0,1 à 0,2 U/kg le soir, puis augmentation progressive. Les analogues lents (glargine) ont un profil plat ; la NPH, plus disponible, a un pic et dure moins longtemps. Ici : glargine le soir.',
    },
    effetVisible: 'Insuline injectée : le foie se calme la nuit, la glycémie du réveil baisse.',
    indesirables: ['Hypoglycémies, surtout la nuit si la dose est trop forte', 'Prise de poids', 'Lipodystrophies si on pique toujours au même endroit'],
    precautions: 'Changer de site d\'injection à chaque fois. Réserve au frais (2-8 °C) ; le stylo ou flacon en cours se garde à température ambiante, à l\'abri de la chaleur et du soleil. Ramadan : dose souvent réduite (guide IDF-DAR).',
    arret: 'Type 1 : l\'arrêt est dangereux (acidocétose en quelques heures). Type 2 : la glycémie remonte.',
  },
  {
    id: 'rapide', nom: 'Insuline rapide (des repas)', court: 'Insuline rapide', exemples: 'asparte, lispro, glulisine ; insuline humaine ordinaire', groupe: 'insulines', couleur: '#38bdf8', cible: 'Muscles, graisse, foie', zone: 'muscles',
    mecanisme: {
      1: 'Une injection juste avant chaque repas, pour faire entrer le sucre du repas dans les cellules.',
      2: 'Elle couvre le pic du repas. Associée à l\'insuline lente, elle forme le schéma « basal-bolus » du type 1. La dose dépend de la quantité de glucides du repas.',
      3: 'Ici : 1 unité pour 12 g de glucides (dose standard), analogue rapide injecté juste avant le repas. Sans insuline lente, elle ne suffit pas dans le type 1 (la nuit n\'est pas couverte).',
    },
    effetVisible: 'Le sucre du repas entre dans les muscles : le pic après le repas est plus bas.',
    indesirables: ['Hypoglycémie si le repas est sauté ou plus petit que prévu, ou après un effort', 'Prise de poids'],
    precautions: 'Pas de repas, pas d\'insuline rapide. Adapter la dose à l\'effort prévu.',
    arret: 'Les glycémies après les repas remontent fortement.',
  },
  {
    id: 'melange', nom: 'Insuline mélange 30/70 (humaine)', court: 'Insuline mélange', exemples: 'insuline humaine biphasique 30/70 (30 % rapide, 70 % NPH)', groupe: 'insulines', couleur: '#2dd4bf', cible: 'Muscles, graisse, foie', zone: 'muscles',
    mecanisme: {
      1: 'Deux injections par jour, matin et soir, qui contiennent à la fois de l\'insuline rapide et de l\'insuline intermédiaire.',
      2: 'Schéma simple et peu coûteux, très utilisé (insuline humaine, souvent subventionnée). Moins souple que le basal-bolus : les repas doivent être réguliers, sinon hypoglycémie ou hyperglycémie.',
      3: 'La partie NPH donne un pic quelques heures après l\'injection, d\'où un risque d\'hypoglycémie en fin de matinée et la nuit. Dans le type 1, le basal-bolus donne en général un meilleur équilibre. Ramadan : la dose du matin passe au ndogu, celle du soir (réduite) au sahur.',
    },
    effetVisible: 'Deux vagues d\'insuline par jour : elles couvrent les repas si leurs horaires sont réguliers.',
    indesirables: ['Hypoglycémies (fin de matinée, nuit)', 'Prise de poids'],
    precautions: 'Bien rouler le flacon ou le stylo avant l\'injection (suspension). Repas à heures régulières.',
    arret: 'Type 1 : dangereux (acidocétose). Type 2 : la glycémie remonte.',
  },
];

export const CLASSE_PAR_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c])) as Record<ClasseId, Classe>;

export const DOSES = [
  { v: 0.5, nom: 'Demi-dose' },
  { v: 1, nom: 'Dose standard' },
  { v: 2, nom: 'Dose forte' },
];

export const INSULINES_IDS: ClasseId[] = ['basale', 'rapide', 'melange'];
