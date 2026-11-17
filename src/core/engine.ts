/**
 * Moteur de Glucodyssée : relie le terrain (maladies, situations) et le traitement (classes et doses)
 * au moteur de glycémie calibré (moteur.ts), puis calcule les alertes, les effets à surveiller,
 * les risques et l'évolution sur 10 ans.
 *
 * Repères (références dans l'application, rubrique « Sources des chiffres ») :
 *  - HbA1c estimée à partir de la glycémie moyenne : formule ADAG (Nathan et al., Diabetes Care 2008) ;
 *  - temps dans la cible 0,70-1,80 g/L (consensus international, Battelino et al., Diabetes Care 2019) ;
 *  - risque relatif par point d'HbA1c en plus : complications microvasculaires ×1/0,63, infarctus ×1/0,86
 *    (UKPDS 35, Stratton et al., BMJ 2000 ; association observationnelle, sans seuil, plus bas sous 6 %) ;
 *  - perte de la fonction bêta dans le type 2 : environ 4 à 6 % par an (ordre de grandeur UKPDS).
 */
import type { Alerte, ClasseId, Etat, Repas, Terrain, Traitement } from './types.ts';
import { PROFILS, simuler, type Injection, type Profil } from './moteur.ts';

export const REPAS_JOUR: Repas[] = [
  { h: 7.5, g: 50, nom: 'Petit-déjeuner' },
  { h: 13.5, g: 100, nom: 'Déjeuner' },
  { h: 20.5, g: 70, nom: 'Dîner' },
];
/** Ramadan : sahur avant l'aube, ndogu (rupture du jeûne) au coucher du soleil, puis un dîner léger. */
export const REPAS_RAMADAN: Repas[] = [
  { h: 5, g: 70, nom: 'Sahur' },
  { h: 19.5, g: 90, nom: 'Ndogu (rupture du jeûne)' },
  { h: 22, g: 40, nom: 'Dîner' },
];

export const TERRAIN_SAIN: Terrain = {
  type: 'aucun', ...pick(PROFILS.sain), rein: 1, repas: REPAS_JOUR, collations: [], efforts: [], ramadan: false, repasSaute: false,
  retino: 0, nephro: 0, neuro: 0, pied: 0, coronaire: 0,
};

function pick(p: Profil) { return { beta: p.beta, si: p.si, sl: p.sl, inc: p.inc }; }

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Débit de filtration glomérulaire indicatif (mL/min/1,73 m²) à partir de la fonction rénale relative. */
export const dfg = (rein: number) => Math.round(rein * 90);
export const insuffisanceRenale = (t: Terrain) => t.rein < 0.65;

/** Repas effectifs de la journée (Ramadan, repas sauté). */
export function repasDuJour(t: Terrain): Repas[] {
  let r = t.ramadan ? REPAS_RAMADAN : t.repas;
  if (t.repasSaute && !t.ramadan) r = r.filter((x) => x.nom !== 'Déjeuner');
  return [...r, ...(t.collations ?? [])].sort((a, b) => a.h - b.h);
}

/** Doses d'insuline « standard » (dose 1) selon le profil, adulte de 70 kg. */
const U_BASALE = (t: Terrain) => (t.type === 't1' ? 20 : 14);
const MELANGE = (t: Terrain) => (t.type === 't1' ? { matin: 12, soir: 8 } : { matin: 16, soir: 10 });
const RATIO_GLUCIDES = 12; // 1 unité d'analogue rapide pour 12 g de glucides (repère du schéma basal-bolus)

/** Traduit les classes et les doses en injections et en traitements du moteur. */
export function injectionsPour(t: Terrain, tr: Traitement, fraction = 1): Injection[] {
  const inj: Injection[] = [];
  const d = (c: ClasseId) => (tr[c] ?? 0) * fraction;
  if (d('basale') > 0) inj.push({ h: 21, type: 'glargine', u: Math.round(U_BASALE(t) * d('basale')) });
  if (d('rapide') > 0) for (const r of repasDuJour(t).filter((x) => !(t.collations ?? []).includes(x))) inj.push({ h: r.h - 0.1, type: 'rapideAnalogue', u: Math.max(1, Math.round((r.g / RATIO_GLUCIDES) * d('rapide'))) });
  if (d('melange') > 0) {
    const m = MELANGE(t);
    // Ramadan : la dose du matin passe au ndogu, celle du soir au sahur (guide IDF-DAR).
    inj.push({ h: t.ramadan ? 19.4 : 7.4, type: 'premix30', u: Math.round(m.matin * d('melange')) });
    inj.push({ h: t.ramadan ? 4.9 : 20.4, type: 'premix30', u: Math.round(m.soir * d('melange')) });
  }
  return inj;
}

const NOM_INJ: Record<string, string> = { glargine: 'Insuline lente', rapideAnalogue: 'Insuline rapide', premix30: 'Insuline mélange 30/70' };

export interface OptionsCalcul {
  /** Part de l'effet du traitement (0 = aucun, 1 = complet), pour l'évolution et l'arrêt. */
  fraction?: number;
}

/** Calcule la journée type (régime établi) pour un terrain et un traitement. */
export function calculer(t: Terrain, tr: Traitement = {}, opt: OptionsCalcul = {}): Etat {
  const fraction = opt.fraction ?? 1;
  const d = (c: ClasseId) => (tr[c] ?? 0) * fraction;
  const ir = insuffisanceRenale(t);
  const injections = injectionsPour(t, tr, fraction);
  const su = d('sulfamide') + d('glibenclamide');
  const s = simuler({
    profil: { beta: t.beta, si: t.si, sl: t.sl, inc: t.inc },
    repas: repasDuJour(t),
    traitements: { metformine: d('metformine'), sulfamide: su, glibenclamide: d('glibenclamide') > 0, idpp4: d('idpp4'), aglp1: d('aglp1'), isglt2: d('isglt2') },
    injections, efforts: t.efforts, insuffisanceRenale: ir,
  });
  const f32 = (a: number[]) => Float32Array.from(a);
  const stats = s.stats;
  const insulineMoy = s.I.reduce((a, b) => a + b, 0) / s.I.length;
  const hb = Math.min(stats.hba1c, 14);
  const micro = Math.pow(1 / 0.63, Math.max(0, hb - 6));
  const coronaire = Math.pow(1 / 0.86, Math.max(0, hb - 6)) * (1 + 1.5 * t.coronaire);
  const insulinePrise = d('basale') + d('melange') > 0;
  const cetose = t.type === 't1' && !insulinePrise ? 1 : t.type === 't1' && d('isglt2') > 0 ? 0.35 : 0;
  const hypo = clamp(stats.tbr70 / 0.04 + stats.tbr54 / 0.01, 0, 1);
  const etat: Etat = {
    G: f32(s.G), I: f32(s.I), S: f32(s.S), Ra: f32(s.Ra), PGE: f32(s.PGE), Uins: f32(s.Uins), Ucer: f32(s.Ucer), Urein: f32(s.Urein), Ueff: f32(s.Ueff), glucagon: f32(s.glucagon),
    stats, urine: s.urine, insulineMoy,
    risques: { hypo, micro, coronaire, cetose },
    effets: [], alertes: [], terrain: t, traitement: tr, fraction,
    injections: injections.map((i) => ({ h: i.h, nom: NOM_INJ[i.type] ?? i.type, u: i.u })),
  };
  const { effets, alertes } = surveiller(t, tr, etat, fraction);
  etat.effets = effets; etat.alertes = alertes;
  return etat;
}

/** Effets indésirables visibles, associations à éviter et signaux d'alerte. */
function surveiller(t: Terrain, tr: Traitement, e: Etat, fraction: number): { effets: string[]; alertes: Alerte[] } {
  const effets: string[] = [];
  const alertes: Alerte[] = [];
  const on = (c: ClasseId) => (tr[c] ?? 0) > 0 && fraction > 0.3;
  const st = e.stats;
  const g = (mg: number) => (mg / 100).toFixed(2).replace('.', ',');
  const insuline = on('basale') || on('rapide') || on('melange');
  const sulfa = on('sulfamide') || on('glibenclamide');
  const DFG = dfg(t.rein);

  // Urgences et signaux glycémiques.
  if (e.risques.cetose >= 1) alertes.push({ niveau: 'danger', texte: 'Diabète de type 1 sans insuline lente : risque d\'acidocétose, urgence vitale. L\'insuline ne s\'arrête jamais dans le type 1.' });
  if (st.tbr54 > 0) alertes.push({ niveau: 'danger', texte: `Hypoglycémie de niveau 2 (minimum ${g(st.min)} g/L, sous 0,54) : risque de malaise grave. Resucrer, puis revoir le traitement.` });
  else if (st.tbr70 > 0) alertes.push({ niveau: 'attention', texte: `Hypoglycémie de niveau 1 (minimum ${g(st.min)} g/L, sous 0,70) : 15 g de sucre, contrôle 15 minutes après.` });
  if (st.max >= 300 && e.risques.cetose < 1) alertes.push({ niveau: 'danger', texte: `Glycémie très élevée (jusqu'à ${g(st.max)} g/L) : soif, urines abondantes, déshydratation ; chercher une cause (infection, oubli de traitement).` });

  // Associations et terrains à risque.
  if (on('glibenclamide') && ir(t)) alertes.push({ niveau: 'danger', texte: `Glibenclamide et rein malade (DFG ≈ ${DFG}) : il s'accumule, hypoglycémies profondes et prolongées. Préférer le gliclazide (dose adaptée) ou un iDPP-4.` });
  if (on('glibenclamide') && t.ramadan) alertes.push({ niveau: 'danger', texte: 'Glibenclamide pendant le Ramadan : à éviter (risque élevé d\'hypoglycémie, guide IDF-DAR). Préférer le gliclazide ou un iDPP-4.' });
  if (on('sulfamide') && on('glibenclamide')) alertes.push({ niveau: 'danger', texte: 'Deux sulfamides en même temps : association illogique, risque d\'hypoglycémie.' });
  if (on('idpp4') && on('aglp1')) alertes.push({ niveau: 'attention', texte: 'iDPP-4 + aGLP-1 : même voie (les incrétines), l\'association n\'apporte pas de bénéfice. Garder l\'aGLP-1.' });
  if (sulfa && insuline) alertes.push({ niveau: 'attention', texte: 'Sulfamide + insuline : le risque d\'hypoglycémie s\'additionne. On réduit ou on arrête souvent le sulfamide quand on ajoute l\'insuline.' });
  if (on('melange') && (on('basale') || on('rapide'))) alertes.push({ niveau: 'attention', texte: 'Insuline mélange avec un autre schéma d\'insuline : choisir l\'un ou l\'autre (mélange 2 fois par jour, ou basal-bolus).' });
  if (on('metformine') && DFG < 30) alertes.push({ niveau: 'danger', texte: `Metformine contre-indiquée quand le DFG est sous 30 (ici ≈ ${DFG}) : risque d'acidose lactique.` });
  else if (on('metformine') && DFG < 45) alertes.push({ niveau: (tr.metformine ?? 0) > 1 ? 'danger' : 'attention', texte: `DFG ≈ ${DFG} (entre 30 et 44) : metformine à dose réduite (1 000 mg par jour au maximum).` });
  if (on('isglt2') && DFG < 45) alertes.push({ niveau: 'info', texte: `DFG ≈ ${DFG} : l'iSGLT2 baisse moins la glycémie, mais il garde sa protection du rein et du cœur (débutable jusqu'à un DFG de 20).` });
  if (on('idpp4') && ir(t)) alertes.push({ niveau: 'info', texte: 'Rein malade : dose de l\'iDPP-4 à adapter (sauf linagliptine).' });
  if (t.type === 't1') {
    if (sulfa) alertes.push({ niveau: 'info', texte: 'Type 1 : le sulfamide n\'a aucun effet, il n\'y a plus de cellules bêta à stimuler.' });
    if (on('isglt2')) alertes.push({ niveau: 'attention', texte: 'Type 1 et iSGLT2 : risque d\'acidocétose, parfois avec une glycémie presque normale. Pas d\'indication ici.' });
  }
  if (t.ramadan && (insuline || sulfa)) alertes.push({ niveau: 'attention', texte: 'Ramadan sous insuline ou sulfamide : consultation avant le jeûne ; les doses sont souvent réduites (guide IDF-DAR). Rompre le jeûne si la glycémie passe sous 0,70 ou au-dessus de 3,00 g/L.' });
  if (t.type === 'gestationnel' && (on('sulfamide') || on('glibenclamide') || on('idpp4') || on('aglp1') || on('isglt2'))) alertes.push({ niveau: 'attention', texte: 'Grossesse : l\'insuline est le traitement de référence quand les mesures diététiques ne suffisent pas.' });

  // Effets à surveiller.
  if (on('metformine')) effets.push('Troubles digestifs au début (metformine) ; vitamine B12 à surveiller');
  if (sulfa) effets.push(`Hypoglycémies et prise de poids (${on('glibenclamide') ? 'glibenclamide' : 'sulfamide'})`);
  if (on('aglp1')) effets.push('Nausées en début de traitement, perte de poids (aGLP-1)');
  if (on('isglt2')) effets.push(`Glucose dans les urines (≈ ${Math.round(e.urine)} g/jour) : mycoses génitales possibles, bien boire (iSGLT2)`);
  if (insuline) effets.push('Hypoglycémies et prise de poids possibles (insuline) ; changer de site d\'injection à chaque fois');
  return { effets, alertes };
}
const ir = insuffisanceRenale;

// ─────────────────────────── Évolution dans le temps ───────────────────────────

export type Scenario = 'sans' | 'avec' | 'arret';

export interface PointEvolution {
  an: number;
  hba1c: number;
  aJeun: number; // g/L
  beta: number; // fonction bêta (0..100 %)
  tir: number; // %
  tbr70: number; // %
  moyHba1c: number; // HbA1c moyenne depuis le début (« updated mean » de l'UKPDS)
  micro: number; // risque relatif microvasculaire
  coro: number; // risque relatif d'infarctus
}

export const PAS_ANS = 0.25;
export const DUREE_ANS = 10;
export const N_POINTS = Math.round(DUREE_ANS / PAS_ANS) + 1;
export const indexAn = (an: number) => clamp(Math.round(an / PAS_ANS), 0, N_POINTS - 1);

/** Part de l'effet du traitement à l'année `an` (effet complet en quelques semaines, dissipé en quelques semaines après l'arrêt). */
export function fractionAu(an: number, scenario: Scenario, arret: number): number {
  if (scenario === 'sans' || an <= 0) return 0;
  if (scenario === 'avec' || an < arret) return 1;
  return 0;
}

/** Fonction bêta après `an` années : baisse d'environ 6 % par an dans le type 2 (UKPDS). */
export const betaAu = (t: Terrain, an: number) => (t.type === 't2' ? t.beta * Math.pow(0.94, an) : t.beta);

/**
 * Simule l'évolution sur 10 ans (pas de 3 mois) : la fonction bêta baisse dans le type 2 ; l'HbA1c moyenne
 * depuis le début fait évoluer les risques de complications (relations de l'UKPDS 35).
 * Les complications visibles (yeux, reins, nerfs, cœur) s'installent avec l'excès de risque et le temps
 * (représentation pédagogique, pas une prédiction).
 */
export function evoluer(base: Terrain, tr: Traitement, scenario: Scenario, arret = 5): { points: PointEvolution[]; terrains: Terrain[]; fractions: number[] } {
  const points: PointEvolution[] = [], terrains: Terrain[] = [], fractions: number[] = [];
  let somme = 0;
  for (let k = 0; k < N_POINTS; k++) {
    const an = k * PAS_ANS;
    const f = fractionAu(an, scenario, arret);
    const t0: Terrain = { ...base, beta: betaAu(base, an) };
    const e = calculer(t0, tr, { fraction: f });
    const hb = Math.min(e.stats.hba1c, 14);
    somme += hb;
    const moy = somme / (k + 1);
    const micro = Math.pow(1 / 0.63, Math.max(0, moy - 6));
    const coro = Math.pow(1 / 0.86, Math.max(0, moy - 6)) * (1 + 1.5 * base.coronaire);
    const atteinte = (rr: number) => clamp(((rr - 1) * an) / 25, 0, 1);
    const tv: Terrain = {
      ...t0,
      retino: Math.max(base.retino, atteinte(micro)), nephro: Math.max(base.nephro, atteinte(micro) * 0.8),
      neuro: Math.max(base.neuro, atteinte(micro) * 0.9), coronaire: base.coronaire,
    };
    terrains.push(tv); fractions.push(f);
    points.push({
      an, hba1c: hb, aJeun: e.stats.aJeun / 100, beta: t0.beta * 100, tir: e.stats.tir * 100, tbr70: e.stats.tbr70 * 100,
      moyHba1c: moy, micro, coro,
    });
  }
  return { points, terrains, fractions };
}
