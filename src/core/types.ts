/** Types partagés par le moteur, le contenu et les rendus. */

export type Niveau = 1 | 2 | 3;

/** Type de diabète simulé (un seul à la fois). */
export type TypeDiabete = 'aucun' | 'prediabete' | 't1' | 't2' | 'gestationnel';

export interface Repas { h: number; g: number; nom: string }
export interface Effort { h: number; duree: number; intensite: number }

/** Le « terrain » : l'état du patient avant traitement (maladies et situations appliquées). */
export interface Terrain {
  type: TypeDiabete;
  beta: number; // fonction des cellules bêta (1 = normale, 0 = détruites)
  si: number; // sensibilité des muscles et de la graisse à l'insuline (1 = normale)
  sl: number; // sensibilité du foie à l'insuline (1 = normale)
  inc: number; // effet incrétine (1 = normal)
  rein: number; // fonction rénale relative (1 = normale ; < 0,6 = insuffisance rénale)
  repas: Repas[];
  collations: Repas[]; // resucrages et collations ajoutés à la main
  injectionsPlus?: { h: number; u: number }[]; // injections d'insuline rapide ajoutées à la main
  efforts: Effort[];
  ramadan: boolean;
  repasSaute: boolean;
  hgpo?: boolean; // épreuve d'HGPO : 75 g de glucose à 8 h, à jeun, sans autre repas avant 10 h
  // Complications installées (0..1), pour l'affichage et l'évaluation.
  retino: number;
  nephro: number;
  neuro: number;
  pied: number;
  coronaire: number;
}

export type ClasseId =
  | 'metformine' | 'sulfamide' | 'glibenclamide' | 'idpp4' | 'aglp1' | 'isglt2'
  | 'basale' | 'rapide' | 'melange';

/** Doses par classe : 0 = absent, 0,5 = demi-dose, 1 = dose standard, 2 = dose double. */
export type Traitement = Partial<Record<ClasseId, number>>;

export interface Alerte { niveau: 'info' | 'attention' | 'danger'; texte: string }

export interface Stats {
  moyenne: number; // mg/dL
  hba1c: number; // % (formule ADAG)
  tir: number; // part du temps entre 70 et 180 mg/dL
  tbr70: number; // part du temps < 70 mg/dL
  tbr54: number; // part du temps < 54 mg/dL
  tar180: number;
  tar250: number;
  min: number;
  max: number;
  aJeun: number; // glycémie au réveil (mg/dL)
}

export interface Risques {
  hypo: number; // risque d'hypoglycémie (0..1, à partir du temps passé sous 0,70 et 0,54 g/L)
  micro: number; // risque relatif de complications microvasculaires (yeux, reins, nerfs)
  coronaire: number; // risque relatif d'infarctus
  cetose: number; // risque d'acidocétose (0..1)
}

/** Résultat du moteur : une journée type en régime établi, minute par minute. */
export interface Etat {
  G: Float32Array; // glycémie (mg/dL), 1440 valeurs
  I: Float32Array; // insuline périphérique (µU/mL)
  S: Float32Array; // sécrétion d'insuline par le pancréas (µU/mL/min)
  Ra: Float32Array; // glucose des repas qui arrive dans le sang (mg/kg/min)
  PGE: Float32Array; // production de glucose par le foie (mg/kg/min)
  Uins: Float32Array; // captation par les muscles et la graisse (mg/kg/min)
  Ucer: Float32Array; // captation par le cerveau (mg/kg/min)
  Urein: Float32Array; // glucose perdu dans les urines (mg/kg/min)
  Ueff: Float32Array; // captation liée à l'effort (mg/kg/min)
  glucagon: Float32Array; // indice relatif de sécrétion de glucagon (1 = jeûne normal)
  stats: Stats;
  urine: number; // glucose urinaire (g/jour)
  insulineMoy: number; // insuline moyenne (µU/mL)
  risques: Risques;
  effets: string[];
  alertes: Alerte[];
  terrain: Terrain; // terrain effectif
  traitement: Traitement;
  fraction: number; // part de l'effet du traitement (0..1)
  injections: { h: number; nom: string; u: number }[];
}
