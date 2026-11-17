/**
 * Ce que chaque maladie ou situation montre dans chaque vue, dans l'ordre d'intérêt (la première vue est la meilleure).
 * Sert aux boutons « Vue … » des fiches et au bandeau affiché dans la scène, pour que la même maladie
 * se lise de façon cohérente dans le corps, l'îlot, la cellule, le rein et les courbes.
 */
import type { VueVoyage } from './voyages.ts';

export interface VuesPatho { site?: 'muscle' | 'foie'; vues: Partial<Record<VueVoyage, string>> }

export const VUES_PATHO: Record<string, VuesPatho> = {
  t2: { site: 'muscle', vues: {
    cellule: 'Serrures grippées : les portes GLUT4 montent mal, le sucre reste dans le sang ; le foie (bascule « Foie ») freine mal sa production.',
    ilot: 'Une partie des cellules bêta ne fonctionne plus (de moins en moins au fil des années, onglet Évolution).',
    courbe: 'Glycémie du réveil haute, pics élevés après les repas : la courbe sort de la bande verte.',
    corps: 'Sang chargé de sucre, graisse du ventre, muscles qui captent moins.',
    rein: 'Au-dessus de 1,80 g/L après les repas, un peu de sucre passe dans les urines.',
    vaisseau: 'Le sucre haut colle aux parois des petits vaisseaux ; avec les années (onglet Évolution), elles s\'abîment.',
  } },
  hgpo: { vues: {
    courbe: 'La boisson de 75 g à 8 h, puis les lectures à 0, 1 h et 2 h, comparées aux seuils (repères en pointillés).',
    corps: 'Pas de repas : seul le glucose de la boisson entre par l\'intestin, et le pancréas répond.',
    ilot: 'La réponse des cellules bêta au glucose bu : forte chez le sujet sain, faible et retardée dans le type 2.',
  } },
  t1: { site: 'muscle', vues: {
    ilot: 'Les lymphocytes ont détruit les cellules bêta : plus d\'insuline (en 3D, cellules bêta éteintes).',
    corps: 'Pancréas éteint, sang plein de sucre, muscles affamés ; sans insuline, les graisses sont brûlées (acidocétose).',
    cellule: 'Plus de clé : les récepteurs restent vides et les portes GLUT4 fermées.',
    rein: 'Le sucre déborde massivement dans les urines : soif, urines abondantes, amaigrissement.',
    courbe: 'Sans insuline, la courbe reste très haut, hors de la bande verte.',
  } },
  prediabete: { site: 'muscle', vues: {
    courbe: 'Glycémie du réveil entre 1,00 et 1,25 g/L, pics plus marqués.',
    cellule: 'La résistance à l\'insuline commence : serrures un peu grippées.',
    ilot: 'Le pancréas compense encore : les cellules bêta travaillent plus.',
    corps: 'Graisse du ventre, pancréas très sollicité.',
  } },
  gestationnel: { site: 'muscle', vues: {
    courbe: 'Comparez aux objectifs de la grossesse : réveil < 0,95 g/L, < 1,40 g/L une heure après le repas.',
    cellule: 'Les hormones du placenta rendent l\'insuline moins efficace.',
    ilot: 'Le pancréas doit produire plus d\'insuline pour suivre.',
  } },
  hypo: { site: 'foie', vues: {
    courbe: 'La courbe passe sous la ligne rouge : touchez « Resucrer » pour voir la remontée.',
    corps: 'Le cerveau manque de sucre (il clignote) ; alarme du capteur si le son est activé.',
    ilot: 'Sous sulfamide, les cellules bêta libèrent l\'insuline malgré le sucre bas ; les cellules alpha lâchent le glucagon.',
    cellule: 'Le foie (bascule « Foie ») vide ses réserves de glycogène sous l\'effet du glucagon.',
  } },
  acidocetose: { site: 'foie', vues: {
    corps: 'Pas d\'insuline : les graisses partent vers le foie, qui fabrique des corps cétoniques.',
    rein: 'Le sucre et l\'eau partent en masse dans les urines : déshydratation.',
    courbe: 'Glycémie très au-dessus de 2,50 g/L toute la journée.',
    ilot: 'Plus de cellules bêta, glucagon élevé.',
  } },
  repasSaute: { site: 'foie', vues: {
    courbe: 'Plus de pic à midi ; sous sulfamide ou insuline, la courbe descend dans l\'après-midi.',
    cellule: 'Le foie (bascule « Foie ») relâche du sucre pour compenser.',
    ilot: 'Sous sulfamide, l\'îlot continue de libérer de l\'insuline sans repas.',
  } },
  effort: { site: 'muscle', vues: {
    cellule: 'Les portes GLUT4 s\'ouvrent aussi sans insuline (voie de la contraction).',
    corps: 'Les muscles des jambes s\'allument et captent le sucre.',
    courbe: 'Bande verte claire à 17 h : la glycémie baisse pendant et après l\'effort.',
  } },
  ramadan: { site: 'foie', vues: {
    courbe: 'Deux gros repas (sahur, ndogu) : longue descente dans la journée, pic le soir.',
    cellule: 'Pendant le jeûne, le foie (bascule « Foie ») relâche ses réserves.',
    ilot: 'Sous glibenclamide, l\'îlot libère de l\'insuline pendant le jeûne : risque d\'hypoglycémie.',
    corps: 'Repas du sahur et du ndogu dans le voyage du sucre.',
  } },
  irc: { vues: {
    rein: 'Le rein filtre moins (DFG affiché) : sous iSGLT2, moins de sucre éliminé.',
    courbe: 'Sous sulfamide ou insuline, hypoglycémies plus fréquentes : ils sont éliminés plus lentement.',
    corps: 'Reins plus petits et plus pâles.',
  } },
  retino: { vues: { vaisseau: 'Capillaire de la rétine : paroi épaissie, micro-anévrismes, exsudats, puis néovaisseaux (bouton « Les étapes de l\'atteinte »).', corps: 'Taches rouges sur la rétine (yeux).', courbe: 'C\'est l\'excès de sucre au fil des années qui l\'entretient (onglet Évolution).' } },
  nephro: { vues: { vaisseau: 'Capillaire du glomérule : la paroi épaissie laisse passer l\'albumine dans les urines.', rein: 'Glomérule plus pâle, filtration réduite.', corps: 'Reins plus pâles.', courbe: 'L\'exposition au sucre (HbA1c) entretient l\'atteinte.' } },
  neuro: { vues: { vaisseau: 'Le petit vaisseau qui nourrit le nerf s\'abîme : les fibres nerveuses s\'éteignent.', corps: 'Nerfs des jambes qui scintillent, pieds moins sensibles.', courbe: 'L\'exposition au sucre (HbA1c) entretient l\'atteinte.' } },
  pied: { vues: { corps: 'Plaie sous le pied, sur un pied qui ne sent plus.', vaisseau: 'Nerf du pied : les fibres qui portent la sensibilité ont disparu.' } },
  coronaire: { vues: { corps: 'Le cœur est atteint ; les artères se voient en détail dans Hémodyssée.', courbe: 'Le risque d\'infarctus monte avec l\'HbA1c (onglet Évolution).' } },
};

/** Meilleure vue d'une maladie. */
export const meilleureVue = (id: string): VueVoyage => (Object.keys(VUES_PATHO[id]?.vues ?? { corps: '' })[0] as VueVoyage) ?? 'corps';
