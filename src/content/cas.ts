/**
 * Cas cliniques d'entraînement : une situation, deux questions (diagnostic puis conduite à tenir),
 * une correction expliquée. Repères : ADA Standards of Care, KDIGO/ADA 2022, guide IDF-DAR 2021, IADPSG/OMS 2013.
 */
import type { Traitement } from '../core/types.ts';
import type { ZoneId } from './zones.ts';
import type { PathoActive } from './pathologies.ts';

export interface Option { t: string; ok?: boolean; pourquoi: string }
export interface Question { q: string; options: Option[] }
export interface CasClinique {
  id: string;
  accroche: string; // titre neutre, qui ne donne pas la réponse
  vignette: string;
  examen: string[];
  pathos: PathoActive[];
  zone: ZoneId | null;
  questions: [Question, Question];
  traitement?: Traitement; // montré dans la simulation à la fin
  aRetenir: string;
}

export const CAS: CasClinique[] = [
  {
    id: 'ado', accroche: 'Adolescent de 14 ans, fatigué et amaigri',
    vignette: 'A., 14 ans, a perdu 5 kg en un mois. Il boit beaucoup, se lève la nuit pour uriner. Depuis hier, il vomit et respire vite.',
    examen: ['Glycémie capillaire 4,20 g/L', 'Bandelette urinaire : glucose +++, corps cétoniques +++', 'Haleine qui sent la pomme, déshydratation'],
    pathos: [{ id: 'acidocetose', s: 0.7 }], zone: 'graisse',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Diabète de type 1 révélé par une acidocétose', ok: true, pourquoi: 'Jeune âge, début rapide, amaigrissement, cétose importante : carence profonde en insuline.' },
        { t: 'Diabète de type 2', pourquoi: 'Peu probable : début brutal, amaigrissement et cétose évoquent une carence absolue en insuline.' },
        { t: 'Gastro-entérite simple', pourquoi: 'Non : la glycémie à 4,20 g/L et la cétose orientent vers un diabète décompensé.' },
        { t: 'Hypoglycémie', pourquoi: 'Non : la glycémie est très haute.' },
      ] },
      { q: 'Que faire ?', options: [
        { t: 'Hospitalisation en urgence : réhydratation, insuline en perfusion, potassium', ok: true, pourquoi: 'L\'acidocétose est une urgence vitale. Ensuite, schéma basal-bolus et éducation.' },
        { t: 'Metformine et contrôle dans une semaine', pourquoi: 'Non : la metformine n\'a pas sa place dans le type 1, et c\'est une urgence.' },
        { t: 'Sulfamide pour stimuler le pancréas', pourquoi: 'Non : il n\'y a plus de cellules bêta à stimuler.' },
        { t: 'Régime sans sucre seul', pourquoi: 'Non : sans insuline, l\'acidocétose s\'aggrave.' },
      ] },
    ],
    traitement: { basale: 1, rapide: 1 },
    aRetenir: 'Jeune + amaigrissement + soif + cétose = type 1 jusqu\'à preuve du contraire. Acidocétose : urgence hospitalière, puis insuline à vie (basal-bolus).',
  },
  {
    id: 'decouverte', accroche: 'Homme de 52 ans, bilan de médecine du travail',
    vignette: 'M. N., 52 ans, commerçant, ne se plaint de rien. Tour de taille 104 cm, son père était diabétique.',
    examen: ['Glycémie à jeun 1,42 g/L, contrôlée à 1,38 g/L', 'HbA1c 7,6 %', 'Créatinine normale, pas d\'albumine dans les urines'],
    pathos: [{ id: 't2', s: 0.4 }], zone: 'foie',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Diabète de type 2', ok: true, pourquoi: 'Glycémie à jeun ≥ 1,26 g/L à deux reprises et HbA1c ≥ 6,5 %, terrain typique.' },
        { t: 'Prédiabète', pourquoi: 'Non : le prédiabète s\'arrête à 1,25 g/L à jeun et 6,4 % d\'HbA1c.' },
        { t: 'Diabète de type 1', pourquoi: 'Peu probable : âge, surpoids abdominal, hérédité, aucun symptôme.' },
        { t: 'Glycémie normale pour l\'âge', pourquoi: 'Non : les seuils ne changent pas avec l\'âge.' },
      ] },
      { q: 'Quel traitement de départ ?', options: [
        { t: 'Hygiène de vie + metformine, en augmentant progressivement la dose', ok: true, pourquoi: 'Première intention du type 2 sans contre-indication. Objectif d\'HbA1c habituel < 7 %.' },
        { t: 'Glibenclamide à forte dose', pourquoi: 'Non : risque d\'hypoglycémie, et ce n\'est pas la première intention.' },
        { t: 'Insuline d\'emblée', pourquoi: 'Pas ici : réservée aux HbA1c très élevées, aux symptômes importants ou à la cétose.' },
        { t: 'Rien, revoir dans un an', pourquoi: 'Non : le diabète est confirmé, l\'exposition au sucre abîme déjà les vaisseaux.' },
      ] },
    ],
    traitement: { metformine: 1 },
    aRetenir: 'Type 2 découvert au bilan : hygiène de vie + metformine, objectif individualisé (souvent < 7 %), bilan des complications dès le diagnostic.',
  },
  {
    id: 'malaise', accroche: 'Femme de 72 ans, malaise en début d\'après-midi',
    vignette: 'Mme D., 72 ans, diabétique sous glibenclamide, n\'a pas déjeuné (elle n\'avait pas faim). Sa fille la trouve en sueur et confuse vers 16 h.',
    examen: ['Glycémie capillaire 0,48 g/L', 'Elle peut encore avaler', 'Créatinine un peu élevée (DFG ≈ 50)'],
    pathos: [{ id: 'hypo', s: 0.7 }, { id: 'irc', s: 0.4 }], zone: 'cerveau',
    questions: [
      { q: 'Que se passe-t-il ?', options: [
        { t: 'Hypoglycémie sous sulfamide, favorisée par le repas sauté et le rein', ok: true, pourquoi: 'Glycémie < 0,54 g/L (niveau 2), glibenclamide, repas sauté, rein fragile.' },
        { t: 'AVC', pourquoi: 'Toujours vérifier la glycémie devant une confusion : ici elle explique tout.' },
        { t: 'Déshydratation simple', pourquoi: 'Non : la glycémie à 0,48 g/L est la cause.' },
        { t: 'Hyperglycémie', pourquoi: 'Non : la glycémie est basse.' },
      ] },
      { q: 'Quelle conduite ?', options: [
        { t: 'Règle des 15, surveillance prolongée, puis remplacer le glibenclamide (iDPP-4 ou gliclazide)', ok: true, pourquoi: '15 g de sucre, contrôle à 15 min, collation. Sous glibenclamide, l\'hypoglycémie peut récidiver : surveillance de plusieurs heures. Ensuite, changer de traitement.' },
        { t: 'Sucre puis reprendre le même traitement', pourquoi: 'Non : la cause reste là, le risque de récidive est majeur chez la personne âgée.' },
        { t: 'Doubler le glibenclamide le soir pour compenser', pourquoi: 'Non : cela aggraverait le risque.' },
        { t: 'Insuline rapide', pourquoi: 'Non : l\'insuline fait encore baisser la glycémie.' },
      ] },
    ],
    traitement: { idpp4: 1 },
    aRetenir: 'Toute confusion chez un diabétique traité : glycémie d\'abord. Le glibenclamide est à éviter chez le sujet âgé et l\'insuffisant rénal.',
  },
  {
    id: 'infarctus', accroche: 'Homme de 61 ans, suivi après un infarctus',
    vignette: 'M. S., 61 ans, diabétique de type 2 depuis 8 ans, a fait un infarctus il y a un an. Il prend de la metformine.',
    examen: ['HbA1c 8,1 % sous metformine pleine dose', 'DFG 75', 'PA 128/78 mmHg, LDL 0,62 g/L sous statine'],
    pathos: [{ id: 't2', s: 0.7 }, { id: 'coronaire', s: 0.7 }], zone: 'coeur',
    questions: [
      { q: 'Qu\'est-ce qui guide le choix du 2e traitement ?', options: [
        { t: 'La maladie cardiovasculaire : un traitement au bénéfice cardiovasculaire démontré', ok: true, pourquoi: 'ADA : aGLP-1 ou iSGLT2 au bénéfice démontré chez le patient avec maladie cardiovasculaire, quel que soit l\'HbA1c.' },
        { t: 'Uniquement le prix', pourquoi: 'Le coût compte, mais le bénéfice cardiovasculaire prime ici.' },
        { t: 'L\'HbA1c seule', pourquoi: 'Non : l\'antécédent d\'infarctus oriente le choix indépendamment de l\'HbA1c.' },
        { t: 'Rien : la metformine suffit', pourquoi: 'Non : l\'HbA1c est au-dessus de l\'objectif.' },
      ] },
      { q: 'Quel ajout ?', options: [
        { t: 'Un aGLP-1 (ou un iSGLT2)', ok: true, pourquoi: 'Baisse de l\'HbA1c et réduction des événements cardiovasculaires (LEADER, SUSTAIN-6, REWIND ; EMPA-REG OUTCOME).' },
        { t: 'Glibenclamide', pourquoi: 'Pas de bénéfice cardiovasculaire, risque d\'hypoglycémie.' },
        { t: 'iDPP-4 + aGLP-1', pourquoi: 'Même voie : l\'association n\'apporte rien.' },
        { t: 'Arrêter la metformine', pourquoi: 'Non : elle reste utile et bien tolérée.' },
      ] },
    ],
    traitement: { metformine: 1, aglp1: 1 },
    aRetenir: 'Diabète de type 2 + maladie cardiovasculaire : aGLP-1 ou iSGLT2 au bénéfice démontré, en plus de la metformine. Tension et LDL : voir Hémodyssée.',
  },
  {
    id: 'rein', accroche: 'Femme de 66 ans, créatinine en hausse',
    vignette: 'Mme B., 66 ans, diabétique de type 2, sous metformine 1 000 mg × 2 et glibenclamide. Bilan de contrôle.',
    examen: ['DFG 38 mL/min/1,73 m²', 'Albuminurie élevée', 'HbA1c 7,4 % ; deux malaises en fin de matinée ce mois-ci'],
    pathos: [{ id: 't2', s: 0.7 }, { id: 'nephro', s: 0.7 }], zone: 'reins',
    questions: [
      { q: 'Quels problèmes de traitement ?', options: [
        { t: 'Metformine trop forte pour le DFG et glibenclamide qui s\'accumule', ok: true, pourquoi: 'DFG 30-44 : 1 000 mg/j de metformine au maximum. Le glibenclamide s\'accumule : hypoglycémies.' },
        { t: 'Aucun : l\'HbA1c est correcte', pourquoi: 'Non : les malaises et le DFG imposent d\'adapter.' },
        { t: 'Il faut arrêter tous les traitements', pourquoi: 'Non : il faut les adapter.' },
        { t: 'Il manque de l\'insuline', pourquoi: 'Pas nécessairement : l\'HbA1c est proche de l\'objectif.' },
      ] },
      { q: 'Quel schéma proposer ?', options: [
        { t: 'Metformine 1 000 mg/j + iSGLT2 ; arrêter le glibenclamide ; IEC ou ARA II (albuminurie)', ok: true, pourquoi: 'KDIGO/ADA 2022 : metformine adaptée + iSGLT2 en première ligne dans la maladie rénale du type 2, blocage du système rénine-angiotensine.' },
        { t: 'Garder tout et ajouter un sulfamide de plus', pourquoi: 'Non : risque d\'hypoglycémie majeur.' },
        { t: 'Arrêter la metformine et garder le glibenclamide', pourquoi: 'Non : c\'est le glibenclamide qui est le plus dangereux ici.' },
        { t: 'iSGLT2 contre-indiqué', pourquoi: 'Non : il se débute jusqu\'à un DFG de 20 pour la protection rénale.' },
      ] },
    ],
    traitement: { metformine: 0.5, isglt2: 1 },
    aRetenir: 'Rein malade : adapter la metformine au DFG, éviter le glibenclamide, iSGLT2 pour protéger le rein.',
  },
  {
    id: 'ramadan', accroche: 'Homme de 48 ans qui souhaite jeûner',
    vignette: 'M. F., 48 ans, diabétique de type 2 sous insuline mélange 30/70 matin et soir et metformine, veut faire le Ramadan qui commence dans un mois.',
    examen: ['HbA1c 7,8 %', 'Pas d\'hypoglycémie sévère l\'an dernier', 'Il travaille sur un chantier'],
    pathos: [{ id: 't2', s: 1 }, { id: 'ramadan', s: 0.7 }], zone: 'sang',
    questions: [
      { q: 'Quel est son niveau de risque pendant le jeûne ?', options: [
        { t: 'Élevé : insuline mélange 2 fois par jour, travail physique', ok: true, pourquoi: 'Le guide IDF-DAR 2021 attribue beaucoup de points au mélange plusieurs fois par jour ; l\'effort physique ajoute du risque.' },
        { t: 'Nul : il n\'a pas eu d\'hypoglycémie sévère', pourquoi: 'Non : le traitement par insuline mélange suffit à le placer à risque.' },
        { t: 'Faible car sous metformine', pourquoi: 'La metformine seule expose peu, mais l\'insuline change tout.' },
        { t: 'Le jeûne est toujours interdit', pourquoi: 'Non : la décision se prend avec lui, selon le risque, après information.' },
      ] },
      { q: 'Quels conseils ?', options: [
        { t: 'Dose du matin au ndogu, dose du soir réduite au sahur ; glycémies dans la journée ; rompre si < 0,70 ou > 3,00 g/L', ok: true, pourquoi: 'Adaptation recommandée par le guide IDF-DAR ; contrôler la glycémie ne rompt pas le jeûne.' },
        { t: 'Garder les mêmes doses aux mêmes heures', pourquoi: 'Non : l\'injection du matin sans repas expose à l\'hypoglycémie dans la journée.' },
        { t: 'Arrêter l\'insuline pendant tout le mois', pourquoi: 'Non : glycémies très hautes après le ndogu.' },
        { t: 'Ne jamais contrôler la glycémie pour ne pas rompre le jeûne', pourquoi: 'Non : la glycémie capillaire ne rompt pas le jeûne.' },
      ] },
    ],
    traitement: { melange: 0.5, metformine: 1 },
    aRetenir: 'Ramadan sous insuline : consultation avant le jeûne, adaptation des horaires et des doses, autosurveillance, règles pour rompre le jeûne (< 0,70 ou > 3,00 g/L, malaise).',
  },
  {
    id: 'grossesse', accroche: 'Femme de 31 ans enceinte de 26 semaines',
    vignette: 'Mme K., 31 ans, deuxième grossesse. Elle a pris 9 kg ; son premier bébé pesait 4,3 kg.',
    examen: ['HGPO 75 g : à jeun 0,98 g/L ; 1 h 1,86 g/L ; 2 h 1,58 g/L', 'PA normale'],
    pathos: [{ id: 'gestationnel', s: 0.7 }], zone: 'sang',
    questions: [
      { q: 'Quel est le diagnostic ?', options: [
        { t: 'Diabète gestationnel', ok: true, pourquoi: 'Seuils IADPSG/OMS 2013 dépassés : à jeun ≥ 0,92, 1 h ≥ 1,80, 2 h ≥ 1,53 g/L (une seule valeur suffit).' },
        { t: 'Glycémie normale de la grossesse', pourquoi: 'Non : les trois valeurs dépassent les seuils.' },
        { t: 'Diabète de type 1', pourquoi: 'Rien ne l\'évoque.' },
        { t: 'Hypoglycémie', pourquoi: 'Non.' },
      ] },
      { q: 'Quelle prise en charge ?', options: [
        { t: 'Diététique, activité, autosurveillance ; insuline si les objectifs ne sont pas atteints', ok: true, pourquoi: 'Objectifs ADA : à jeun < 0,95, 1 h < 1,40 ou 2 h < 1,20 g/L. Insuline = référence si besoin.' },
        { t: 'Glibenclamide', pourquoi: 'Non : l\'insuline est préférée pendant la grossesse.' },
        { t: 'iSGLT2', pourquoi: 'Non : pas pendant la grossesse.' },
        { t: 'Rien : ça passera après l\'accouchement', pourquoi: 'Non : risques pour le bébé et la mère dès maintenant.' },
      ] },
    ],
    aRetenir: 'Diabète gestationnel : diététique d\'abord, insuline si besoin ; dépister le diabète de type 2 après l\'accouchement, puis régulièrement.',
  },
  {
    id: 'pied', accroche: 'Homme de 58 ans, une plaie sous le pied',
    vignette: 'M. G., 58 ans, diabétique depuis 15 ans, montre une plaie sous l\'avant-pied qu\'il « ne sent pas ». Il marche souvent pieds nus.',
    examen: ['Plaie de 1 cm, propre, sur une zone d\'appui', 'Monofilament non perçu aux deux pieds', 'Pouls du pied perçus ; HbA1c 9,2 %'],
    pathos: [{ id: 't2', s: 0.7 }, { id: 'pied', s: 0.7 }], zone: 'pieds',
    questions: [
      { q: 'Quel est le mécanisme principal ?', options: [
        { t: 'Neuropathie : le pied ne sent plus, la plaie se forme sur l\'appui', ok: true, pourquoi: 'Mal perforant plantaire sur pied insensible (monofilament non perçu).' },
        { t: 'Simple ampoule sans gravité', pourquoi: 'Non : toute plaie du pied diabétique est une urgence.' },
        { t: 'Allergie', pourquoi: 'Non.' },
        { t: 'Hypoglycémie', pourquoi: 'Non.' },
      ] },
      { q: 'Que faire en premier ?', options: [
        { t: 'Décharge (ne plus appuyer), soins, recherche d\'infection et d\'artérite, équilibre glycémique', ok: true, pourquoi: 'La décharge est la clé de la cicatrisation ; l\'infection et l\'artérite changent la prise en charge.' },
        { t: 'Pommade et continuer à marcher', pourquoi: 'Non : sans décharge, la plaie ne guérit pas.' },
        { t: 'Antibiotiques seuls', pourquoi: 'Seulement s\'il y a une infection, et jamais sans décharge.' },
        { t: 'Revoir dans 3 mois', pourquoi: 'Non : risque d\'infection et d\'amputation.' },
      ] },
    ],
    traitement: { metformine: 1, basale: 1 },
    aRetenir: 'Pied diabétique : examen des pieds à chaque consultation à risque, chaussures adaptées, jamais pieds nus. Toute plaie = urgence (décharge).',
  },
];
