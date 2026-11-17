/**
 * Atelier guidé « Jeûner en sécurité » (Ramadan) : un patient de type 2 jeûne ; l'apprenant choisit le traitement
 * et les horaires d'insuline, et voit sur la courbe de la journée (moteur calibré) s'il faudrait rompre le jeûne.
 * Repères : guide IDF-DAR 2021 (éviter le glibenclamide ; insuline mélange : dose du matin au ndogu, dose du soir
 * réduite au sahur ; rompre le jeûne sous 0,70 g/L, au-dessus de 3,00 g/L ou en cas de malaise).
 * Le score de risque IDF-DAR (14 critères) n'est pas reproduit ici : il se calcule avec l'outil officiel.
 */
import type { Etat, Traitement } from '../core/types.ts';

export type ChoixRamadan = 'metf' | 'glib' | 'glic' | 'glicDemi' | 'idpp4' | 'melange';

export const CHOIX_RAMADAN: { id: ChoixRamadan; nom: string; tr: Traitement }[] = [
  { id: 'metf', nom: 'Metformine seule', tr: { metformine: 1 } },
  { id: 'glib', nom: '+ glibenclamide', tr: { metformine: 1, glibenclamide: 1 } },
  { id: 'glic', nom: '+ gliclazide', tr: { metformine: 1, sulfamide: 1 } },
  { id: 'glicDemi', nom: '+ gliclazide ½', tr: { metformine: 1, sulfamide: 0.5 } },
  { id: 'idpp4', nom: '+ iDPP-4', tr: { metformine: 1, idpp4: 1 } },
  { id: 'melange', nom: '+ insuline mélange', tr: { metformine: 1, melange: 1 } },
];

export interface ReglageRamadan { choix: ChoixRamadan; habituels: boolean }

export interface BilanJeune { min: number; heureMin: number; max: number; hypo: boolean; trop: boolean; rompre: string | null }

/** Bilan d'une journée de jeûne : minimum entre le sahur et le ndogu, maximum de la journée, faut-il rompre le jeûne ? */
export function bilanJeune(e: Etat): BilanJeune {
  let min = Infinity, heureMin = 0, debutHypo = -1;
  for (let m = 5.5 * 60; m < 19.5 * 60; m++) { if (e.G[m] < min) { min = e.G[m]; heureMin = m; } if (debutHypo < 0 && e.G[m] < 70) debutHypo = m; }
  const max = e.stats.max, hypo = debutHypo >= 0, trop = max > 300;
  const hh = (m: number) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`;
  return { min, heureMin, max, hypo, trop, rompre: hypo ? `Rompre le jeûne vers ${hh(debutHypo)} : glycémie sous 0,70 g/L` : trop ? 'Glycémie au-dessus de 3,00 g/L : rompre le jeûne' : null };
}

export interface EtapeRamadan { titre: string; consigne: string; reussi: (r: ReglageRamadan, b: BilanJeune) => boolean; explication: string }

export const ETAPES_RAMADAN: EtapeRamadan[] = [
  {
    titre: 'Le jeûne sous metformine', consigne: 'M. F., diabétique de type 2, jeûne du sahur (5 h) au ndogu (19 h 30). Choisissez « Metformine seule ».',
    reussi: (r) => r.choix === 'metf',
    explication: 'La metformine n\'expose pas à l\'hypoglycémie : la glycémie descend doucement dans la journée sans passer sous 0,70 g/L, puis remonte après le ndogu. La dose est répartie entre le sahur et le ndogu.',
  },
  {
    titre: 'Le piège du glibenclamide', consigne: 'Ajoutez le glibenclamide (« + glibenclamide »).',
    reussi: (r, b) => r.choix === 'glib' && b.hypo,
    explication: 'Il force le pancréas à libérer de l\'insuline même sans repas : la glycémie passe sous 0,70 g/L pendant le jeûne, il faudrait le rompre. Le guide IDF-DAR conseille de l\'éviter pendant le Ramadan.',
  },
  {
    titre: 'Un choix plus sûr', consigne: 'Remplacez-le par « + gliclazide ½ » ou « + iDPP-4 ». Essayez aussi le gliclazide à dose pleine.',
    reussi: (r, b) => (r.choix === 'glicDemi' || r.choix === 'idpp4') && !b.hypo,
    explication: 'Pas d\'hypoglycémie : l\'iDPP-4 n\'agit que quand le sucre monte ; le gliclazide se prend au ndogu, à dose réduite. À dose pleine, le gliclazide expose encore au risque chez ce patient.',
  },
  {
    titre: 'L\'insuline aux horaires habituels', consigne: 'Choisissez « + insuline mélange » et cochez « Horaires habituels » (injection du matin sans petit-déjeuner).',
    reussi: (r, b) => r.choix === 'melange' && r.habituels && b.hypo,
    explication: 'La dose du matin, injectée alors qu\'il ne mange pas, agit en plein jeûne : la glycémie passe sous 0,70 g/L dans la matinée (au plus bas vers 11 h). Il faudrait rompre le jeûne.',
  },
  {
    titre: 'Adapter comme le guide', consigne: 'Passez aux « Horaires adaptés » : dose du matin au ndogu, dose du soir réduite au sahur.',
    reussi: (r, b) => r.choix === 'melange' && !r.habituels && !b.hypo,
    explication: 'La journée de jeûne se passe sans hypoglycémie. La dose du soir est réduite (de 25 à 50 % dans les résumés du guide IDF-DAR ; 30 % ici), puis ajustée tous les 3 jours selon les glycémies.',
  },
  {
    titre: 'À retenir', consigne: 'Jeûner avec un diabète se prépare avec le médecin, quelques semaines avant le Ramadan.',
    reussi: () => true,
    explication: 'Contrôler sa glycémie ne rompt pas le jeûne. Rompre le jeûne sous 0,70 g/L, au-dessus de 3,00 g/L ou en cas de malaise. Éviter le glibenclamide, adapter l\'insuline et les sulfamides, bien boire entre ndogu et sahur. Le niveau de risque se calcule avec l\'outil IDF-DAR officiel (14 critères).',
  },
];
