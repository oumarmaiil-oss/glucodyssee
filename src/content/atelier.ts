/**
 * Atelier guidé « La clé et la porte » (vue Cellule, muscle) : l'apprenant règle lui-même l'insuline,
 * la résistance à l'insuline et l'effort, et voit le glucose entrer ou non dans le muscle.
 * Chaque étape donne une consigne ; elle est réussie quand le réglage demandé est fait.
 * Modèle de l'atelier volontairement simplifié (sang, muscle et foie seulement), pour montrer les mécanismes.
 */
import type { ReglageAtelier, StatsAtelier } from '../render/cellule2d.ts';

export interface EtapeAtelier {
  titre: string;
  consigne: string;
  reussi: (r: ReglageAtelier, s: StatsAtelier | null) => boolean;
  explication: string;
}

export const NIVEAUX_INSULINE = [
  { v: 0, nom: 'Aucune' },
  { v: 0.25, nom: 'Un peu' },
  { v: 0.6, nom: 'Normale' },
  { v: 1, nom: 'Beaucoup' },
];

export const ETAPES_ATELIER: EtapeAtelier[] = [
  {
    titre: 'Sans insuline',
    consigne: 'Regardez : le sang (en haut) est plein de glucose, mais les portes GLUT4 restent cachées dans la cellule. Touchez « Suivant ».',
    reussi: () => true,
    explication: 'Sans insuline, le muscle ne laisse presque pas entrer le glucose : il reste dans le sang, et le foie continue d\'en relâcher. La jauge de gauche monte : c\'est ce qui arrive dans le type 1 sans traitement.',
  },
  {
    titre: 'La clé',
    consigne: 'Donnez de l\'insuline : touchez « Normale ».',
    reussi: (r) => r.ins >= 0.6 && !r.res && !r.effort,
    explication: 'Les clés (insuline) se fixent sur les récepteurs, le signal descend (IRS → PI3K → Akt) et les portes GLUT4 montent à la surface : le glucose entre. L\'insuline freine aussi le foie. Le sucre du sang revient dans la normale.',
  },
  {
    titre: 'La serrure grippée',
    consigne: 'Activez « Résistance (type 2) », puis essayez « Beaucoup » d\'insuline.',
    reussi: (r) => r.res && r.ins >= 1,
    explication: 'Avec la même dose, le signal se perd : peu de portes montent et le sucre reste haut. Avec beaucoup d\'insuline, on force davantage de portes : c\'est ce que fait le pancréas au début du type 2 (il produit plus), avant de s\'épuiser.',
  },
  {
    titre: 'L\'effort',
    consigne: 'Mettez l\'insuline sur « Aucune » et activez « Effort ».',
    reussi: (r) => r.ins === 0 && r.effort,
    explication: 'Le muscle qui travaille fait monter ses portes GLUT4 par une autre voie, sans insuline. C\'est pourquoi l\'activité physique aide tant, même en cas de résistance. Sous insuline, elle expose aussi à l\'hypoglycémie.',
  },
  {
    titre: 'Trop d\'insuline',
    consigne: 'Coupez la résistance et l\'effort, mettez « Beaucoup » d\'insuline, et regardez la jauge.',
    reussi: (r, s) => !r.res && !r.effort && r.ins >= 1 && !!s && s.sang < 44,
    explication: 'Trop d\'insuline par rapport au sucre disponible : le glucose quitte le sang plus vite que le foie ne peut en relâcher. Le sucre s\'effondre : c\'est l\'hypoglycémie. Le glucagon relance un peu le foie, mais lentement : il faut resucrer.',
  },
  {
    titre: 'À retenir',
    consigne: 'L\'insuline est la clé qui fait entrer le glucose dans le muscle.',
    reussi: () => true,
    explication: 'Pas de clé (type 1) : le glucose reste dans le sang. Serrure grippée (type 2) : il faut plus de clés. L\'effort ouvre aussi les portes. Trop de clés : hypoglycémie. Rejouez librement avec les boutons.',
  },
];
