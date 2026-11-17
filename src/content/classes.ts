/** Classes thérapeutiques : où elles agissent, comment, effets indésirables, précautions. DCI uniquement. */
import type { OrganeId } from './organes.ts';

export type ClasseId = 'metformine' | 'sulfamide' | 'idpp4' | 'aglp1' | 'isglt2' | 'insuline';

export interface Classe {
  id: ClasseId;
  nom: string;
  court: string;
  exemples: string;
  couleur: string;
  sites: OrganeId[];
  ou: string;
  simple: string;
  detail: string;
  indesirables: string[];
  precautions: string;
}

export const CLASSES: Classe[] = [
  {
    id: 'metformine', nom: 'Metformine', court: 'Metformine', exemples: 'metformine', couleur: '#60a5fa', sites: ['foie', 'muscles'],
    ou: 'Foie (et muscles)',
    simple: 'Elle freine la production de sucre par le foie et aide les muscles à mieux utiliser l\'insuline.',
    detail: 'Première intention dans le diabète de type 2, avec les mesures hygiéno-diététiques. Seule, elle ne provoque pas d\'hypoglycémie et ne fait pas grossir. Baisse de l\'HbA1c d\'environ 1 à 1,5 point.',
    indesirables: ['Troubles digestifs au début (prendre au milieu du repas, augmenter progressivement)', 'Carence en vitamine B12 au long cours', 'Acidose lactique : très rare'],
    precautions: 'Dose à réduire quand la fonction rénale baisse, arrêt si elle est très altérée ; suspendre lors d\'un examen avec produit de contraste iodé ou d\'une déshydratation.',
  },
  {
    id: 'sulfamide', nom: 'Sulfamide hypoglycémiant', court: 'Sulfamide', exemples: 'gliclazide, glimépiride, glibenclamide', couleur: '#f472b6', sites: ['pancreas'],
    ou: 'Pancréas',
    simple: 'Il force le pancréas à libérer de l\'insuline, même quand la glycémie est déjà basse.',
    detail: 'Efficace (environ −1 à −1,5 point d\'HbA1c) et peu coûteux, mais il expose à l\'hypoglycémie : repas sauté, effort, sujet âgé, rein malade, jeûne du Ramadan. On préfère le gliclazide au glibenclamide, plus puissant et plus long.',
    indesirables: ['Hypoglycémie', 'Prise de poids modérée'],
    precautions: 'Ne jamais sauter de repas ; prudence chez le sujet âgé et l\'insuffisant rénal ; glibenclamide à éviter au Ramadan (recommandations IDF-DAR 2021).',
  },
  {
    id: 'idpp4', nom: 'Inhibiteur de la DPP-4 (gliptine)', court: 'iDPP-4', exemples: 'sitagliptine, vildagliptine, linagliptine', couleur: '#a78bfa', sites: ['intestin', 'pancreas'],
    ou: 'Intestin → pancréas',
    simple: 'Il fait durer les hormones que l\'intestin envoie au pancréas après le repas : plus d\'insuline, mais seulement quand le sucre monte.',
    detail: 'Il protège les incrétines (GLP-1, GIP) de leur destruction. L\'effet dépend du glucose : très peu d\'hypoglycémie, poids stable. Efficacité modérée (environ −0,5 à −0,8 point).',
    indesirables: ['Généralement bien toléré', 'Pancréatite : rare'],
    precautions: 'Dose à adapter à la fonction rénale, sauf la linagliptine. Bon choix quand le risque d\'hypoglycémie doit être faible (sujet âgé, Ramadan).',
  },
  {
    id: 'aglp1', nom: 'Analogue du GLP-1', court: 'aGLP-1', exemples: 'liraglutide, dulaglutide, sémaglutide', couleur: '#34d399', sites: ['pancreas', 'estomac', 'cerveau'],
    ou: 'Pancréas, estomac, cerveau',
    simple: 'Il imite une hormone de l\'intestin : plus d\'insuline après le repas, un estomac qui se vide plus lentement, moins d\'appétit.',
    detail: 'Parmi les plus puissants (environ −1 à −1,5 point), avec perte de poids. Plusieurs molécules ont démontré une baisse des événements cardiovasculaires. Injection quotidienne ou hebdomadaire ; le sémaglutide existe aussi en comprimé.',
    indesirables: ['Nausées, vomissements au début', 'Troubles digestifs'],
    precautions: 'Augmenter les doses progressivement ; peu d\'hypoglycémie seul, plus avec un sulfamide ou de l\'insuline.',
  },
  {
    id: 'isglt2', nom: 'Inhibiteur du SGLT2 (gliflozine)', court: 'iSGLT2', exemples: 'dapagliflozine, empagliflozine', couleur: '#fb923c', sites: ['reins'],
    ou: 'Reins',
    simple: 'Il fait éliminer du sucre dans les urines : le rein ne le récupère plus en entier.',
    detail: 'Environ 60 à 80 g de glucose éliminés par jour. Baisse modérée de l\'HbA1c (environ −0,5 à −0,8 point), mais forte protection du cœur et des reins (insuffisance cardiaque, maladie rénale), même sans diabète (lien avec Hémodyssée).',
    indesirables: ['Infections génitales (mycoses)', 'Déshydratation, baisse de tension', 'Acidocétose (rare, parfois avec une glycémie normale)'],
    precautions: 'Moins d\'effet sur la glycémie quand le rein est malade, mais la protection rénale persiste ; boire suffisamment ; suspendre en cas de maladie aiguë ou de jeûne prolongé.',
  },
  {
    id: 'insuline', nom: 'Insuline', court: 'Insuline', exemples: 'humaines : ordinaire, NPH, mélange 30/70 ; analogues : glargine, asparte, lispro', couleur: '#7aa2ff', sites: ['sang', 'muscles', 'foie'],
    ou: 'Partout : elle remplace la clé',
    simple: 'Elle remplace la clé qui manque : le sucre entre dans les cellules et le foie arrête d\'en produire.',
    detail: 'Indispensable dans le type 1, nécessaire dans le type 2 quand les comprimés ne suffisent plus. Insuline lente pour la nuit et entre les repas, rapide pour chaque repas, ou mélange 30/70 matin et soir. Sans plafond d\'efficacité.',
    indesirables: ['Hypoglycémie', 'Prise de poids', 'Boules sous la peau si on pique toujours au même endroit'],
    precautions: 'Changer de site d\'injection ; conserver les réserves au frais (2-8 °C), le flacon en cours à température ambiante, jamais au soleil ni au congélateur ; adapter les doses aux repas, à l\'effort et au Ramadan.',
  },
];

export const CLASSE_PAR_ID = Object.fromEntries(CLASSES.map((c) => [c.id, c])) as Record<ClasseId, Classe>;
