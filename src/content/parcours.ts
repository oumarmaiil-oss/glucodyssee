/**
 * Le parcours pédagogique : chapitres découpés en étapes. Chaque étape règle le simulateur
 * (patient, repas, traitements, insuline…), met en évidence des organes et place le curseur de l'heure.
 */
import type { Injection, ProfilId, Repas, Traitements } from '../core/moteur.ts';
import type { OrganeId } from './organes.ts';

export type JourneeId = 'type' | 'sauteDej' | 'ramadan';
export const JOURNEES: Record<JourneeId, { nom: string; repas: Repas[] }> = {
  type: { nom: 'Journée type', repas: [{ h: 7.5, g: 50 }, { h: 13.5, g: 100 }, { h: 20.5, g: 70 }] },
  sauteDej: { nom: 'Déjeuner sauté', repas: [{ h: 7.5, g: 50 }, { h: 20.5, g: 70 }] },
  ramadan: { nom: 'Ramadan', repas: [{ h: 5, g: 70 }, { h: 19.5, g: 90 }, { h: 22, g: 40 }] },
};
export const nomRepas = (h: number) => (h < 6 ? 'Sahur' : h < 11 ? 'Petit-déjeuner' : h < 16 ? 'Déjeuner' : h >= 19 && h < 20 ? 'Ndogu' : h < 21.5 ? 'Dîner' : 'Collation');

export type SchemaId = 'aucune' | 'glargine' | 'basalBolus' | 'premix';
export const SCHEMAS: Record<SchemaId, string> = { aucune: 'Aucune', glargine: 'Lente seule', basalBolus: 'Lente + rapides', premix: 'Mélange 30/70 ×2' };
export function injectionsPour(schema: SchemaId, repas: Repas[], profil: ProfilId): Injection[] {
  if (schema === 'glargine') return [{ h: 21, type: 'glargine', u: profil === 't1' ? 20 : 16 }];
  if (schema === 'basalBolus') return [{ h: 21, type: 'glargine', u: 20 }, ...repas.map((r) => ({ h: Math.round((r.h - 0.1) * 60) / 60, type: 'rapideAnalogue' as const, u: Math.max(1, Math.round(r.g / 12.5)) }))];
  if (schema === 'premix') return [{ h: 7.3, type: 'premix30', u: 18 }, { h: 20.3, type: 'premix30', u: 12 }];
  return [];
}

export interface Reglages { profil: ProfilId; journee: JourneeId; tr: Traitements; schema: SchemaId; effort: boolean; ir: boolean; sansBolusMidi?: boolean }
export const REGLAGES_DEPART: Reglages = { profil: 'sain', journee: 'type', tr: {}, schema: 'aucune', effort: false, ir: false };

export interface Etape { titre: string; texte: string; detail: string; reglages: Partial<Reglages>; focus: OrganeId[]; heure?: number; annees?: boolean; /** vue détaillée ouverte à cette étape */ vue?: OrganeId; ilot?: boolean }
export interface Chapitre { id: string; titre: string; pour: string; etapes: Etape[] }

const SAIN: Partial<Reglages> = { profil: 'sain', journee: 'type', tr: {}, schema: 'aucune', effort: false, ir: false };
const T1: Partial<Reglages> = { profil: 't1', journee: 'type', tr: {}, effort: false, ir: false };

export const CHAPITRES: Chapitre[] = [
  {
    id: 'normal', titre: 'Le voyage du sucre', pour: 'Comment le corps règle la glycémie',
    etapes: [
      { titre: 'Le repas', vue: 'intestin', texte: 'Au déjeuner, les glucides du riz sont digérés en glucose dans l\'intestin.', detail: 'L\'amidon est coupé en glucose. Le riz blanc passe vite dans le sang ; le mil, les légumineuses et les fibres plus lentement.', reglages: SAIN, focus: ['estomac', 'intestin'], heure: 13.6 },
      { titre: 'Le sucre passe dans le sang', texte: 'Le glucose entre dans le sang : la glycémie monte (les points dorés).', detail: 'De 0,80-1,00 g/L à jeun vers 1,20-1,60 g/L après un repas copieux, sans dépasser 1,80 g/L chez le sujet sain.', reglages: SAIN, focus: ['intestin', 'sang'], heure: 14.2 },
      { titre: 'Le pancréas sent le sucre monter', vue: 'pancreas', texte: 'Les cellules bêta du pancréas détectent la hausse du sucre.', detail: 'Les cellules bêta des îlots de Langerhans sont de vrais capteurs de glucose. L\'intestin les prévient aussi par les incrétines (GLP-1, GIP) : c\'est l\'effet incrétine.', reglages: SAIN, focus: ['pancreas'], heure: 14.0 },
      { titre: 'L\'insuline : la clé', vue: 'pancreas', ilot: true, texte: 'Le pancréas libère l\'insuline (les clés bleues) dans le sang.', detail: 'Un pic rapide, puis une sécrétion qui suit la glycémie. Regardez la courbe d\'insuline sous la glycémie.', reglages: SAIN, focus: ['pancreas', 'sang'], heure: 14.3 },
      { titre: 'La clé ouvre la porte', vue: 'muscles', texte: 'L\'insuline ouvre la porte des muscles : le sucre entre et donne de l\'énergie.', detail: 'L\'insuline se fixe sur son récepteur et fait monter les transporteurs GLUT4 à la surface des cellules musculaires et graisseuses.', reglages: SAIN, focus: ['muscles', 'graisse'], heure: 14.6 },
      { titre: 'Le foie fait des réserves', vue: 'foie', texte: 'Le foie met le surplus de sucre en réserve et arrête d\'en produire.', detail: 'Le glucose est stocké en glycogène ; l\'insuline freine la production hépatique de glucose.', reglages: SAIN, focus: ['foie'], heure: 15 },
      { titre: 'La nuit, le foie veille', vue: 'foie', texte: 'Entre les repas et la nuit, le foie libère juste ce qu\'il faut : la glycémie reste stable.', detail: 'L\'insuline baisse, le glucagon (cellules alpha) fait libérer du glucose. Le cerveau, lui, consomme du sucre en continu.', reglages: SAIN, focus: ['foie', 'cerveau'], heure: 3 },
      { titre: 'Le rein garde le sucre', vue: 'reins', texte: 'Les reins filtrent le sang et récupèrent tout le sucre.', detail: 'La réabsorption par les transporteurs SGLT2 fonctionne jusqu\'à environ 1,80 g/L : au-dessus, le sucre passe dans les urines.', reglages: SAIN, focus: ['reins'], heure: 14.5 },
      { titre: 'Une journée équilibrée', texte: 'Toute la journée, la glycémie reste entre 0,70 et 1,80 g/L : 100 % du temps dans la cible.', detail: 'L\'HbA1c (le sucre fixé sur les globules rouges) reflète les 3 derniers mois : autour de 5 % chez le sujet sain.', reglages: SAIN, focus: ['sang'] },
    ],
  },
  {
    id: 't1', titre: 'Le diabète de type 1', pour: 'Quand les clés disparaissent',
    etapes: [
      { titre: 'L\'attaque', vue: 'pancreas', ilot: true, texte: 'Le système immunitaire détruit par erreur les cellules bêta du pancréas.', detail: 'Maladie auto-immune, souvent chez l\'enfant ou le jeune adulte. Quand 80 à 90 % des cellules bêta sont détruites, le diabète apparaît.', reglages: { ...T1, schema: 'aucune' }, focus: ['pancreas'], heure: 13.6 },
      { titre: 'Plus de clés', vue: 'muscles', texte: 'Il n\'y a presque plus d\'insuline : regardez, plus aucune clé bleue dans le sang.', detail: 'Sans insuline, le sucre ne peut plus entrer dans les muscles : les cellules ont faim dans un sang plein de sucre.', reglages: { ...T1, schema: 'aucune' }, focus: ['sang', 'muscles'], heure: 15 },
      { titre: 'Le foie s\'emballe', vue: 'foie', texte: 'Sans insuline pour le freiner, le foie continue de fabriquer du sucre, même la nuit.', detail: 'La production hépatique de glucose double presque. La glycémie dépasse 3 à 5 g/L.', reglages: { ...T1, schema: 'aucune' }, focus: ['foie'], heure: 4 },
      { titre: 'Le rein déborde', vue: 'reins', texte: 'Le sucre passe dans les urines et entraîne l\'eau : soif intense, urines abondantes, amaigrissement.', detail: 'Au-delà de 1,80 g/L, le rein ne peut plus tout récupérer : des centaines de grammes de sucre partent chaque jour dans les urines.', reglages: { ...T1, schema: 'aucune' }, focus: ['reins'], heure: 16 },
      { titre: 'L\'acidocétose', texte: 'Le corps brûle ses graisses et fabrique des corps cétoniques : c\'est l\'acidocétose, une urgence.', detail: 'Haleine fruitée, vomissements, respiration rapide, somnolence. Hospitalisation immédiate : insuline, réhydratation, potassium.', reglages: { ...T1, schema: 'aucune' }, focus: ['graisse', 'cerveau'] },
      { titre: 'L\'insuline remplace les clés', texte: 'Une insuline lente le soir pour la nuit, une insuline rapide avant chaque repas.', detail: 'Schéma « basal-bolus ». La glycémie revient dans la cible. Autre schéma fréquent au Sénégal : mélange 30/70 matin et soir (essayez-le dans le simulateur).', reglages: { ...T1, schema: 'basalBolus' }, focus: ['sang', 'muscles'], heure: 14.3 },
      { titre: 'Oublier le bolus du midi', texte: 'Sans l\'injection rapide du déjeuner, la glycémie dépasse 3 g/L l\'après-midi.', detail: 'L\'insuline lente seule ne couvre pas les repas. Une glycémie élevée persistante doit faire chercher des corps cétoniques.', reglages: { ...T1, schema: 'basalBolus', sansBolusMidi: true }, focus: ['sang'], heure: 16 },
      { titre: 'L\'effort sans collation', vue: 'muscles', texte: 'Une marche rapide de 45 minutes après le déjeuner fait chuter la glycémie : hypoglycémie.', detail: 'Le muscle à l\'effort capte le sucre sans insuline, et devient plus sensible à l\'insuline pendant des heures. On prend une collation ou on réduit la dose.', reglages: { ...T1, schema: 'basalBolus', effort: true }, focus: ['muscles'], heure: 17.5 },
    ],
  },
  {
    id: 't2', titre: 'Le diabète de type 2', pour: 'Des années de silence',
    etapes: [
      { titre: 'Le terrain', texte: 'Surpoids au niveau du ventre, peu d\'activité, diabète dans la famille : le terrain du type 2.', detail: 'La graisse du ventre et la sédentarité rendent les cellules moins sensibles à l\'insuline. L\'âge et l\'hérédité comptent aussi.', reglages: { profil: 'prediabete', journee: 'type', tr: {}, schema: 'aucune', effort: false, ir: false }, focus: ['graisse', 'muscles'] },
      { titre: 'Les serrures se grippent', vue: 'muscles', texte: 'La clé tourne mal : c\'est la résistance à l\'insuline. Le sucre entre moins bien dans les muscles.', detail: 'Résistance musculaire, hépatique et adipeuse. Le pancréas compense en produisant plus d\'insuline : la glycémie reste longtemps presque normale.', reglages: { profil: 'prediabete', journee: 'type', tr: {} }, focus: ['muscles', 'pancreas'], heure: 14.5 },
      { titre: 'Le prédiabète', texte: 'Glycémie à jeun entre 1,00 et 1,25 g/L : c\'est le moment idéal pour agir.', detail: 'Critères ADA : glycémie à jeun 1,00-1,25 g/L ou HbA1c 5,7-6,4 %. Activité physique et perte de poids peuvent retarder ou éviter le diabète.', reglages: { profil: 'prediabete', journee: 'type', tr: {} }, focus: ['sang'], heure: 7.2 },
      { titre: 'Le diabète s\'installe', vue: 'pancreas', ilot: true, texte: 'Le pancréas s\'épuise : glycémie à jeun au-dessus de 1,26 g/L, pics à 3 g/L après les repas. Souvent sans aucun symptôme.', detail: 'Diagnostic : glycémie à jeun ≥ 1,26 g/L à deux reprises, ou HbA1c ≥ 6,5 %, ou ≥ 2,00 g/L avec des symptômes.', reglages: { profil: 't2', journee: 'type', tr: {} }, focus: ['pancreas', 'sang'], heure: 15 },
      { titre: 'Le foie travaille la nuit', vue: 'foie', texte: 'La glycémie du matin est haute : le foie, mal freiné, fabrique trop de sucre la nuit.', detail: 'La production hépatique nocturne de glucose est la principale cause de l\'hyperglycémie à jeun. C\'est la cible de la metformine.', reglages: { profil: 't2', journee: 'type', tr: {} }, focus: ['foie'], heure: 5 },
      { titre: 'Les années passent', texte: 'Sans traitement, le pancréas s\'épuise d\'année en année et l\'HbA1c monte.', detail: 'Dans ce modèle, la fonction des cellules bêta baisse d\'environ 6 % par an (ordre de grandeur de l\'étude UKPDS). Les complications s\'installent : yeux, reins, nerfs, cœur.', reglages: { profil: 't2', journee: 'type', tr: {} }, focus: ['pancreas'], annees: true },
      { titre: 'Premier traitement : la metformine', vue: 'foie', texte: 'La metformine freine le foie : la glycémie du matin baisse.', detail: 'Toujours avec les mesures hygiéno-diététiques. La courbe en pointillés montre le patient sans traitement.', reglages: { profil: 't2', journee: 'type', tr: { metformine: 1 } }, focus: ['foie'], heure: 7.2 },
      { titre: 'Une 2e classe', texte: 'On ajoute un analogue du GLP-1 : il agit ailleurs (pancréas, estomac, cerveau). Les effets s\'additionnent.', detail: 'En cas de maladie cardiovasculaire, d\'insuffisance cardiaque ou rénale, on choisit un aGLP-1 ou un iSGLT2, indépendamment de l\'HbA1c (ADA 2025).', reglages: { profil: 't2', journee: 'type', tr: { metformine: 1, aglp1: 1 } }, focus: ['pancreas', 'estomac', 'cerveau'], heure: 15, annees: true },
    ],
  },
  {
    id: 'trait', titre: 'Les traitements', pour: 'Chaque classe agit à un endroit',
    etapes: [
      { titre: 'Metformine : le foie', vue: 'foie', texte: 'Elle freine la production de sucre par le foie.', detail: 'Environ −1 à −1,5 point d\'HbA1c ; pas d\'hypoglycémie seule ; troubles digestifs au début.', reglages: { profil: 't2', journee: 'type', tr: { metformine: 1 }, schema: 'aucune', effort: false, ir: false }, focus: ['foie'], heure: 7.2 },
      { titre: 'Sulfamide : le pancréas', vue: 'pancreas', ilot: true, texte: 'Il force le pancréas à libérer de l\'insuline, même quand le sucre est bas.', detail: 'Efficace, mais risque d\'hypoglycémie. Préférer le gliclazide au glibenclamide.', reglages: { profil: 't2', journee: 'type', tr: { sulfamide: 1 } }, focus: ['pancreas'], heure: 14.3 },
      { titre: 'iDPP-4 : intestin et pancréas', vue: 'intestin', texte: 'Il fait durer les hormones de l\'intestin : plus d\'insuline seulement quand le sucre monte.', detail: 'Peu d\'hypoglycémie, poids stable, efficacité modérée.', reglages: { profil: 't2', journee: 'type', tr: { idpp4: 1 } }, focus: ['intestin', 'pancreas'], heure: 14.3 },
      { titre: 'aGLP-1 : pancréas, estomac, cerveau', vue: 'pancreas', ilot: true, texte: 'Plus d\'insuline après le repas, estomac plus lent, moins d\'appétit.', detail: 'Parmi les plus puissants, perte de poids, bénéfice cardiovasculaire démontré pour plusieurs molécules.', reglages: { profil: 't2', journee: 'type', tr: { aglp1: 1 } }, focus: ['pancreas', 'estomac', 'cerveau'], heure: 14.3 },
      { titre: 'iSGLT2 : les reins', vue: 'reins', texte: 'Le rein laisse partir du sucre dans les urines : environ 60 à 80 g par jour.', detail: 'Baisse modérée de l\'HbA1c, mais forte protection du cœur et des reins.', reglages: { profil: 't2', journee: 'type', tr: { isglt2: 1 } }, focus: ['reins'], heure: 15 },
      { titre: 'Insuline : remplacer la clé', texte: 'Quand le pancréas est épuisé, on ajoute une insuline lente le soir.', detail: 'Le type 2 évolué garde la metformine ; l\'insuline basale se règle sur la glycémie du matin.', reglages: { profil: 't2evolue', journee: 'type', tr: { metformine: 1 }, schema: 'glargine' }, focus: ['sang', 'foie'], heure: 7.2 },
      { titre: 'Associer, c\'est additionner', texte: 'Metformine + aGLP-1 + iSGLT2 : trois sites d\'action, trois effets qui s\'ajoutent.', detail: 'Chaque classe ajoutée agit à un endroit différent du corps. Regardez les organes qui s\'allument.', reglages: { profil: 't2', journee: 'type', tr: { metformine: 1, aglp1: 1, isglt2: 1 }, schema: 'aucune' }, focus: ['foie', 'pancreas', 'reins'], heure: 15, annees: true },
    ],
  },
  {
    id: 'hypo', titre: 'L\'hypoglycémie', pour: 'La reconnaître, la corriger, l\'éviter',
    etapes: [
      { titre: 'Sous 0,70 g/L', texte: 'Quand la glycémie passe sous 0,70 g/L, c\'est l\'hypoglycémie.', detail: 'Niveau 1 : < 0,70 g/L ; niveau 2 : < 0,54 g/L ; niveau 3 : la personne a besoin de l\'aide d\'un tiers (ADA).', reglages: { profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true }, schema: 'aucune', effort: false, ir: false }, focus: ['sang'], heure: 16 },
      { titre: 'Les signes', vue: 'cerveau', texte: 'Sueurs, tremblements, faim, cœur qui bat vite, puis confusion et malaise.', detail: 'D\'abord les signes d\'alerte (adrénaline), puis ceux du cerveau qui manque de sucre. Certains patients ne sentent plus rien venir.', reglages: { profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true } }, focus: ['cerveau', 'coeur'], heure: 16 },
      { titre: 'La cause la plus fréquente', vue: 'pancreas', ilot: true, texte: 'Un sulfamide (ici le glibenclamide) et un repas sauté : le pancréas continue de libérer de l\'insuline.', detail: 'Autres causes : insuline trop forte, effort imprévu, alcool, rein malade.', reglages: { profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true } }, focus: ['pancreas'], heure: 15 },
      { titre: 'Comparer les traitements', texte: 'Même journée avec un inhibiteur de la DPP-4 : pas d\'hypoglycémie.', detail: 'Son effet dépend du glucose : il ne force pas le pancréas quand le sucre est bas.', reglages: { profil: 't2leger', journee: 'sauteDej', tr: { idpp4: 1 } }, focus: ['intestin', 'pancreas'], heure: 15 },
      { titre: 'La règle des 15', texte: '15 g de sucre rapide (3 morceaux de sucre ou un demi-verre de jus), attendre 15 minutes, recontrôler.', detail: 'Recommencer si toujours sous 0,70 g/L, puis prendre une collation. Glucagon si la personne ne peut pas avaler.', reglages: { profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true } }, focus: ['sang'] },
      { titre: 'Le piège de l\'HbA1c basse', texte: 'Une HbA1c qui paraît parfaite peut cacher des hypoglycémies répétées.', detail: 'D\'où l\'intérêt du temps passé dans la cible et sous 0,70 g/L, mesuré par les capteurs.', reglages: { profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true }, ir: true }, focus: ['reins', 'sang'] },
    ],
  },
  {
    id: 'ramadan', titre: 'Ramadan et vie réelle', pour: 'Jeûner, conserver l\'insuline, bouger',
    etapes: [
      { titre: 'Le jeûne', texte: 'Repas au sahur (5 h) et au ndogu (19 h 30) : environ 14 heures sans manger.', detail: 'Avant le Ramadan, on évalue le risque avec le score IDF-DAR 2021 : faible (0-3), modéré (3,5-6), élevé (> 6).', reglages: { profil: 't2leger', journee: 'ramadan', tr: {}, schema: 'aucune', effort: false, ir: false }, focus: ['sang'], heure: 14 },
      { titre: 'Glibenclamide : danger', texte: 'Sous glibenclamide, la journée de jeûne passe en hypoglycémie.', detail: 'Les recommandations IDF-DAR 2021 conseillent d\'éviter le glibenclamide, de préférer un traitement à faible risque, et de réduire de 25 à 50 % les doses d\'insuline et de sulfamide.', reglages: { profil: 't2leger', journee: 'ramadan', tr: { sulfamide: 1, glibenclamide: true } }, focus: ['pancreas'], heure: 15 },
      { titre: 'Un traitement adapté', texte: 'Avec un inhibiteur de la DPP-4, le jeûne se passe sans hypoglycémie.', detail: 'Rompre le jeûne si la glycémie passe sous 0,70 g/L ou au-dessus de 3,00 g/L, ou en cas de malaise.', reglages: { profil: 't2leger', journee: 'ramadan', tr: { idpp4: 1 } }, focus: ['intestin', 'pancreas'], heure: 15 },
      { titre: 'L\'insuline et la chaleur', texte: 'Réserves au frais (2-8 °C), flacon en cours à température ambiante, jamais au soleil ni au congélateur.', detail: 'Le canari en terre cuite ou une pochette rafraîchissante baissent la température de 3 à 8 °C. L\'insuline humaine tolère bien la chaleur ambiante (revue Cochrane), mais aucune étude n\'a encore testé directement le canari.', reglages: { profil: 't1', journee: 'type', tr: {}, schema: 'premix' }, focus: ['sang'] },
    ],
  },
];

/** Scénarios du simulateur libre. */
export const SCENARIOS: { id: string; nom: string; texte: string; reglages: Reglages }[] = [
  { id: 'normal', nom: 'Le voyage normal', texte: 'Chez le sujet sain, la glycémie monte après chaque repas puis redescend en 2 à 3 heures.', reglages: { ...REGLAGES_DEPART } },
  { id: 't2', nom: 'Type 2 découvert', texte: 'Glycémie à jeun au-dessus de 1,26 g/L, pics après les repas, souvent sans symptôme.', reglages: { ...REGLAGES_DEPART, profil: 't2' } },
  { id: 'metf', nom: 'Metformine puis 2e classe', texte: 'Ajoutez ensuite un aGLP-1 ou un iSGLT2 : leurs effets s\'additionnent.', reglages: { ...REGLAGES_DEPART, profil: 't2', tr: { metformine: 1 } } },
  { id: 'sulfa', nom: 'Sulfamide et repas sauté', texte: 'Le glibenclamide fait passer la journée sans déjeuner en hypoglycémie. Comparez avec le gliclazide, puis un iDPP-4.', reglages: { ...REGLAGES_DEPART, profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true } } },
  { id: 'ramadan', nom: 'Ramadan', texte: 'Sahur à 5 h, ndogu à 19 h 30 : sous glibenclamide, hypoglycémie pendant le jeûne.', reglages: { ...REGLAGES_DEPART, profil: 't2leger', journee: 'ramadan', tr: { sulfamide: 1, glibenclamide: true } } },
  { id: 't1', nom: 'Type 1 : lente + rapides', texte: 'Une insuline lente pour la nuit, une rapide pour chaque repas.', reglages: { ...REGLAGES_DEPART, profil: 't1', schema: 'basalBolus' } },
  { id: 't1oubli', nom: 'Type 1 : oubli du bolus', texte: 'Sans la rapide du déjeuner, la glycémie dépasse 3 g/L.', reglages: { ...REGLAGES_DEPART, profil: 't1', schema: 'basalBolus', sansBolusMidi: true } },
  { id: 't1effort', nom: 'Type 1 : effort', texte: '45 minutes de marche rapide à 16 h sans collation : hypoglycémie.', reglages: { ...REGLAGES_DEPART, profil: 't1', schema: 'basalBolus', effort: true } },
  { id: 'rein', nom: 'Rein malade et sulfamide', texte: 'Le sulfamide s\'accumule : hypoglycémie profonde.', reglages: { ...REGLAGES_DEPART, profil: 't2leger', journee: 'sauteDej', tr: { sulfamide: 1, glibenclamide: true }, ir: true } },
];
