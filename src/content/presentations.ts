/**
 * Présentations guidées de 2 à 3 minutes, qui s'enchaînent seules : pour un enseignant, un soignant
 * en éducation thérapeutique, un délégué ou un exposé.
 */
import type { Etat, Traitement } from '../core/types.ts';
import type { ZoneId } from './zones.ts';
import type { PathoActive } from './pathologies.ts';

export type VueScene = 'corps' | 'ilot' | 'cellule' | 'rein' | 'courbe';
export type SiteCellule = 'muscle' | 'foie';

export interface EtapePresentation {
  texte: string;
  detail?: (e: Etat, sans: Etat) => string;
  vue: VueScene;
  zone?: ZoneId | null;
  site?: SiteCellule;
  actives: PathoActive[];
  traitement: Traitement;
  /** Évolution : scénario et année montrés (sinon, aujourd'hui). */
  evo?: { scenario: 'sans' | 'avec'; an: number };
  duree?: number; // ms
}

export interface PresentationGuidee { id: string; titre: string; pour: string; etapes: EtapePresentation[] }

const g = (mg: number) => `${(mg / 100).toFixed(2)} g/L`;
const pc = (x: number) => `${Math.round(x * 100)} %`;
const hb = (e: Etat) => `HbA1c ${e.stats.hba1c.toFixed(1)} %`;

const T1: PathoActive[] = [{ id: 't1', s: 0.7 }];
const T2: PathoActive[] = [{ id: 't2', s: 0.7 }];
const T2L: PathoActive[] = [{ id: 't2', s: 0.4 }];
const HYPO: PathoActive[] = [{ id: 'hypo', s: 0.7 }];
const RAM: PathoActive[] = [{ id: 't2', s: 0.4 }, { id: 'ramadan', s: 0.7 }];

export const PRESENTATIONS: PresentationGuidee[] = [
  {
    id: 'voyage', titre: 'Le voyage du sucre', pour: 'Du repas à la cellule, chez le sujet sain',
    etapes: [
      { vue: 'corps', zone: 'estomac', actives: [], traitement: {}, texte: 'Le repas est digéré : l\'amidon devient du glucose.', detail: () => 'Riz, mil, pain, manioc : leurs glucides sont coupés en glucose dans l\'intestin.' },
      { vue: 'corps', zone: 'veinePorte', actives: [], traitement: {}, texte: 'Le glucose passe dans le sang, d\'abord par le foie.', detail: (e) => `Après le repas, la glycémie monte jusqu'à ${g(e.stats.max)} puis redescend.` },
      { vue: 'ilot', zone: 'ilot', actives: [], traitement: {}, texte: 'Le pancréas sent le sucre monter et libère l\'insuline.', detail: () => 'Les cellules bêta (en bleu) fabriquent l\'insuline, les cellules alpha (en violet) le glucagon.' },
      { vue: 'cellule', site: 'muscle', zone: 'muscles', actives: [], traitement: {}, texte: 'L\'insuline est la clé : elle ouvre les portes des muscles.', detail: () => 'Le récepteur fait monter les transporteurs GLUT4 à la surface : le glucose entre.' },
      { vue: 'cellule', site: 'foie', zone: 'foie', actives: [], traitement: {}, texte: 'Le foie met le surplus en réserve, et le relâche la nuit.', detail: () => 'Glycogène après le repas ; à jeun, le glucagon fait libérer du glucose.' },
      { vue: 'rein', zone: 'reins', actives: [], traitement: {}, texte: 'Le rein filtre le sang et récupère tout le sucre.', detail: () => 'Jusqu\'à environ 1,80 g/L, aucun sucre ne passe dans les urines.' },
      { vue: 'courbe', zone: 'sang', actives: [], traitement: {}, texte: 'Toute la journée, la glycémie reste dans la bande verte.', detail: (e) => `${pc(e.stats.tir)} du temps entre 0,70 et 1,80 g/L · ${hb(e)}.` },
    ],
  },
  {
    id: 't1', titre: 'Le type 1', pour: 'Plus de clé : l\'insuline remplace',
    etapes: [
      { vue: 'ilot', zone: 'ilot', actives: T1, traitement: {}, texte: 'Le système immunitaire a détruit les cellules bêta.', detail: () => 'Les lymphocytes (en rouge) ont attaqué l\'îlot : il n\'y a plus d\'insuline.' },
      { vue: 'cellule', site: 'muscle', zone: 'muscles', actives: T1, traitement: {}, texte: 'Sans clé, les portes des muscles restent fermées.', detail: () => 'Les cellules ont faim au milieu d\'un sang plein de sucre.' },
      { vue: 'corps', zone: 'reins', actives: T1, traitement: {}, texte: 'Le sucre s\'accumule et déborde dans les urines.', detail: (e) => `Glycémie jusqu'à ${g(e.stats.max)} ; ${Math.round(e.urine)} g de sucre perdus par jour dans les urines : soif, amaigrissement.` },
      { vue: 'corps', zone: 'graisse', actives: T1, traitement: {}, texte: 'Les graisses sont brûlées : danger d\'acidocétose.', detail: () => 'Le foie fabrique des corps cétoniques : c\'est une urgence.' },
      { vue: 'courbe', zone: 'sang', actives: T1, traitement: { basale: 1, rapide: 1 }, texte: 'Insuline lente + insuline rapide avant chaque repas.', detail: (e) => `Schéma basal-bolus : ${pc(e.stats.tir)} du temps dans la cible, ${hb(e)}.`, duree: 8000 },
      { vue: 'cellule', site: 'muscle', zone: 'muscles', actives: T1, traitement: { basale: 1, rapide: 1 }, texte: 'Les clés sont revenues : les muscles se nourrissent.', detail: () => 'L\'insuline injectée remplace celle du pancréas. Elle ne s\'arrête jamais.' },
    ],
  },
  {
    id: 't2', titre: 'Le type 2', pour: 'Des années de silence',
    etapes: [
      { vue: 'cellule', site: 'muscle', zone: 'muscles', actives: T2L, traitement: {}, texte: 'Les serrures sont grippées : c\'est la résistance à l\'insuline.', detail: () => 'Muscles, foie et graisse répondent mal à l\'insuline.' },
      { vue: 'ilot', zone: 'ilot', actives: T2L, traitement: {}, texte: 'Le pancréas compense… puis s\'épuise.', detail: () => 'La fonction des cellules bêta baisse d\'environ 4 à 6 % par an.' },
      { vue: 'courbe', zone: 'sang', actives: T2L, traitement: {}, texte: 'Le diabète s\'installe, souvent sans rien sentir.', detail: (e) => `Glycémie du réveil ${g(e.stats.aJeun)} · ${hb(e)}.` },
      { vue: 'ilot', zone: 'ilot', actives: T2L, traitement: {}, evo: { scenario: 'sans', an: 10 }, texte: 'Sans traitement, en 10 ans, les cellules bêta s\'éteignent.', detail: (e) => `${hb(e)} au bout de 10 ans.` },
      { vue: 'corps', zone: 'yeux', actives: T2L, traitement: {}, evo: { scenario: 'sans', an: 10 }, texte: 'Les petits vaisseaux s\'abîment : yeux, reins, nerfs.', detail: () => 'Chaque point d\'HbA1c en plus : environ 60 % de complications microvasculaires en plus (UKPDS).' },
      { vue: 'cellule', site: 'foie', zone: 'foie', actives: T2L, traitement: { metformine: 1 }, texte: 'La metformine freine le foie.', detail: (e, s) => `Glycémie du réveil ${g(s.stats.aJeun)} → ${g(e.stats.aJeun)}.` },
      { vue: 'courbe', zone: 'sang', actives: T2L, traitement: { metformine: 1, isglt2: 1 }, texte: 'Une 2e classe s\'ajoute si l\'objectif n\'est pas atteint.', detail: (e, s) => `Ici un iSGLT2 : ${hb(s)} → ${hb(e)}.` },
      { vue: 'corps', zone: 'yeux', actives: T2L, traitement: { metformine: 1, isglt2: 1 }, evo: { scenario: 'avec', an: 10 }, texte: 'Sur 10 ans, beaucoup moins de complications.', detail: (e, s) => `Risque microvasculaire ×${s.risques.micro.toFixed(1)} sans traitement → ×${e.risques.micro.toFixed(1)}.` },
    ],
  },
  {
    id: 'hypo', titre: 'L\'hypoglycémie', pour: 'Repas sauté sous sulfamide',
    etapes: [
      { vue: 'courbe', zone: 'sang', actives: HYPO, traitement: { glibenclamide: 1 }, texte: 'Sous glibenclamide, le déjeuner est sauté.', detail: (e) => `La glycémie descend jusqu'à ${g(e.stats.min)} : sous 0,70 g/L, c'est l'hypoglycémie.` },
      { vue: 'ilot', zone: 'ilot', actives: HYPO, traitement: { glibenclamide: 1 }, texte: 'Le sulfamide force le pancréas, même quand le sucre est bas.', detail: () => 'Les canaux K-ATP restent fermés : l\'insuline continue de couler.' },
      { vue: 'corps', zone: 'cerveau', actives: HYPO, traitement: { glibenclamide: 1 }, texte: 'Le cerveau manque de sucre : sueurs, tremblements, confusion.', detail: () => 'Les cellules alpha libèrent le glucagon et le foie ses réserves, mais pas assez vite.' },
      { vue: 'courbe', zone: 'sang', actives: HYPO, traitement: { sulfamide: 1 }, texte: 'Avec le gliclazide, la même journée est moins risquée.', detail: (e) => `Minimum ${g(e.stats.min)}.` },
      { vue: 'courbe', zone: 'sang', actives: HYPO, traitement: { idpp4: 1 }, texte: 'Avec un iDPP-4, pas d\'hypoglycémie.', detail: (e) => `Minimum ${g(e.stats.min)} : il n'agit que quand le sucre monte.` },
      { vue: 'courbe', zone: 'sang', actives: HYPO, traitement: { glibenclamide: 1 }, texte: 'Règle des 15 : 15 g de sucre, contrôle après 15 minutes.', detail: () => 'Trois morceaux de sucre ou un demi-verre de jus ; recommencer si < 0,70 g/L, puis une collation.' },
    ],
  },
  {
    id: 'ramadan', titre: 'Ramadan', pour: 'Sahur, ndogu et traitements',
    etapes: [
      { vue: 'courbe', zone: 'sang', actives: RAM, traitement: { metformine: 1 }, texte: 'Pendant le Ramadan : sahur avant l\'aube, ndogu au coucher du soleil.', detail: (e) => `Sous metformine, pas d'hypoglycémie (minimum ${g(e.stats.min)}).` },
      { vue: 'courbe', zone: 'sang', actives: RAM, traitement: { glibenclamide: 1 }, texte: 'Le glibenclamide expose à l\'hypoglycémie dans la journée.', detail: (e) => `Minimum ${g(e.stats.min)} : à éviter pendant le jeûne (guide IDF-DAR).` },
      { vue: 'courbe', zone: 'sang', actives: RAM, traitement: { idpp4: 1, metformine: 1 }, texte: 'Metformine + iDPP-4 : un choix plus sûr.', detail: (e) => `Minimum ${g(e.stats.min)}, ${pc(e.stats.tir)} du temps dans la cible.` },
      { vue: 'corps', zone: 'sang', actives: RAM, traitement: { idpp4: 1, metformine: 1 }, texte: 'Contrôler sa glycémie ne rompt pas le jeûne.', detail: () => 'Rompre le jeûne si < 0,70 g/L, > 3,00 g/L ou en cas de malaise. Bien boire entre ndogu et sahur.' },
    ],
  },
];

export const PRESENTATION_PAR_ID = Object.fromEntries(PRESENTATIONS.map((p) => [p.id, p])) as Record<string, PresentationGuidee>;
