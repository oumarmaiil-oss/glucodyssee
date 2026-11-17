/**
 * Évaluation du traitement choisi pour chaque maladie ou situation simulée :
 * ce qui est réglé, ce qui manque, ce qui est déconseillé.
 * Repères : ADA Standards of Care (objectifs individualisés, souvent HbA1c < 7 %), consensus
 * international sur le temps dans la cible (Battelino 2019), KDIGO/ADA 2022 (rein), guide IDF-DAR 2021 (Ramadan).
 */
import type { ClasseId, Etat, Traitement } from './types.ts';
import { PATHO_PAR_ID, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';
import { dfg } from './engine.ts';

export interface Point { ok: boolean; texte: string }

const on = (tr: Traitement, c: ClasseId) => (tr[c] ?? 0) > 0;
const nom = (c: ClasseId) => CLASSE_PAR_ID[c].court;
const gl = (mg: number) => (mg / 100).toFixed(2).replace('.', ',');
const pc = (x: number) => `${Math.round(x * 100)} %`;
const NON_INSULINES: ClasseId[] = ['metformine', 'sulfamide', 'glibenclamide', 'idpp4', 'aglp1', 'isglt2'];
const INSULINES: ClasseId[] = ['basale', 'rapide', 'melange'];

export function evaluerPathologie(id: string, actives: PathoActive[], e: Etat, tr: Traitement): Point[] {
  const P: Point[] = [];
  const st = e.stats;
  const t = e.terrain;
  const ids = actives.map((a) => a.id);
  const insuline = INSULINES.some((c) => on(tr, c));
  const nbClasses = NON_INSULINES.filter((c) => on(tr, c)).length + (insuline ? 1 : 0);
  const hypos = () => {
    if (st.tbr54 > 0) P.push({ ok: false, texte: `Hypoglycémies de niveau 2 (minimum ${gl(st.min)} g/L) : réduire ou changer le traitement qui en est la cause.` });
    else if (st.tbr70 > 0.04) P.push({ ok: false, texte: `${pc(st.tbr70)} du temps sous 0,70 g/L (objectif < 4 %) : traitement trop fort ou mal adapté.` });
    else if (st.tbr70 > 0) P.push({ ok: false, texte: `Quelques hypoglycémies (minimum ${gl(st.min)} g/L) : à corriger même si l'HbA1c est bonne.` });
    else P.push({ ok: true, texte: 'Aucune hypoglycémie sur la journée.' });
  };
  const hba1c = (cible = 7) => {
    const v = st.hba1c.toFixed(1).replace('.', ',');
    if (st.hba1c < cible && st.tbr70 <= 0.04) P.push({ ok: true, texte: `HbA1c estimée ${v} % : objectif < ${cible} % atteint (à individualiser).` });
    else if (st.hba1c < cible) P.push({ ok: false, texte: `HbA1c ${v} % « parfaite » mais obtenue au prix d'hypoglycémies : elle ne doit pas rassurer.` });
    else if (nbClasses === 0) P.push({ ok: false, texte: `HbA1c ${v} % sans traitement : commencer par la metformine (avec l'hygiène de vie).` });
    else if (nbClasses === 1) P.push({ ok: false, texte: `HbA1c ${v} % sous un seul traitement : ajouter une 2e classe (iDPP-4, aGLP-1, iSGLT2, sulfamide) plutôt que d'attendre.` });
    else if (!insuline) P.push({ ok: false, texte: `HbA1c ${v} % malgré ${nbClasses} classes : penser à l'aGLP-1 s'il manque, ou à l'insuline lente.` });
    else P.push({ ok: false, texte: `HbA1c ${v} % sous insuline : augmenter progressivement les doses (titration sur la glycémie du réveil) ou ajouter les rapides.` });
  };
  const tir = () => P.push(st.tir >= 0.7 ? { ok: true, texte: `Temps dans la cible ${pc(st.tir)} (objectif > 70 %).` } : { ok: false, texte: `Temps dans la cible ${pc(st.tir)} : objectif > 70 % du temps entre 0,70 et 1,80 g/L.` });
  const besoin = (groupe: ClasseId[], pourquoi: string) => {
    const pris = groupe.filter((c) => on(tr, c));
    P.push(pris.length ? { ok: true, texte: `${pris.map(nom).join(' + ')} : ${pourquoi}.` } : { ok: false, texte: `Il manque : ${groupe.map(nom).join(' ou ')} (${pourquoi}).` });
  };

  switch (id) {
    case 't2': {
      if (!on(tr, 'metformine') && dfg(t.rein) >= 30) P.push({ ok: false, texte: 'La metformine reste le traitement de première intention, sauf contre-indication.' });
      hba1c(); hypos();
      if (on(tr, 'glibenclamide')) P.push({ ok: false, texte: 'Glibenclamide : préférer le gliclazide ou un iDPP-4 (moins d\'hypoglycémies).' });
      break;
    }
    case 't1': {
      P.push(on(tr, 'basale') || on(tr, 'melange') ? { ok: true, texte: 'Insuline de fond présente : pas d\'acidocétose.' } : { ok: false, texte: 'Il manque l\'insuline lente : sans elle, acidocétose. C\'est la base du traitement.' });
      if (on(tr, 'basale')) P.push(on(tr, 'rapide') ? { ok: true, texte: 'Schéma basal-bolus complet : lente + rapide aux repas.' } : { ok: false, texte: 'Insuline lente seule : les repas ne sont pas couverts (pics élevés). Ajouter la rapide avant les repas.' });
      tir(); hypos();
      const inutiles = NON_INSULINES.filter((c) => on(tr, c));
      if (inutiles.length) P.push({ ok: false, texte: `${inutiles.map(nom).join(', ')} : pas d'indication dans le type 1.` });
      break;
    }
    case 'prediabete':
      P.push(st.aJeun < 100 ? { ok: true, texte: `Glycémie du réveil revenue sous 1,00 g/L (${gl(st.aJeun)}).` } : { ok: false, texte: `Glycémie du réveil ${gl(st.aJeun)} g/L : l'hygiène de vie (activité, perte de poids) est la première mesure.` });
      if (ids.length === 1 && !ids.includes('effort')) P.push({ ok: false, texte: 'Essayez la situation « Activité physique » : c\'est la mesure la plus efficace à ce stade (−58 % de diabète dans l\'étude DPP avec l\'hygiène de vie).' });
      break;
    case 'gestationnel':
      P.push(st.aJeun < 95 ? { ok: true, texte: `Glycémie du réveil ${gl(st.aJeun)} g/L (objectif < 0,95).` } : { ok: false, texte: `Glycémie du réveil ${gl(st.aJeun)} g/L : au-dessus de 0,95 g/L. Diététique, puis insuline si besoin.` });
      P.push(st.max < 140 ? { ok: true, texte: `Pics après les repas sous 1,40 g/L.` } : { ok: false, texte: `Pic à ${gl(st.max)} g/L après un repas (objectif < 1,40 g/L à 1 h).` });
      if (NON_INSULINES.some((c) => on(tr, c) && c !== 'metformine')) P.push({ ok: false, texte: 'Pendant la grossesse, l\'insuline est le traitement de référence.' });
      break;
    case 'hypo':
      hypos();
      if (on(tr, 'glibenclamide')) P.push({ ok: false, texte: 'Le glibenclamide est la cause la plus probable : le remplacer (gliclazide, iDPP-4).' });
      break;
    case 'acidocetose':
      P.push(on(tr, 'basale') || on(tr, 'melange') ? { ok: true, texte: 'Insuline de fond reprise : l\'acidocétose est corrigée (à l\'hôpital, insuline en perfusion d\'abord).' } : { ok: false, texte: 'Pas d\'insuline de fond : l\'acidocétose continue. Urgence hospitalière.' });
      break;
    case 'repasSaute':
    case 'effort':
      hypos();
      break;
    case 'ramadan':
      if (on(tr, 'glibenclamide')) P.push({ ok: false, texte: 'Glibenclamide à éviter pendant le Ramadan (guide IDF-DAR).' });
      hypos();
      P.push(st.max < 300 ? { ok: true, texte: `Pas de glycémie au-dessus de 3,00 g/L (maximum ${gl(st.max)}).` } : { ok: false, texte: `Glycémie à ${gl(st.max)} g/L : au-dessus de 3,00 g/L, il faut rompre le jeûne.` });
      break;
    case 'irc': {
      const d = dfg(t.rein);
      if (on(tr, 'metformine')) P.push(d < 30 ? { ok: false, texte: `Metformine contre-indiquée (DFG ≈ ${d}).` } : d < 45 && (tr.metformine ?? 0) > 1 ? { ok: false, texte: `DFG ≈ ${d} : metformine limitée à 1 000 mg/j (demi-dose ou dose standard réduite).` } : { ok: true, texte: `Metformine compatible avec un DFG ≈ ${d}${d < 45 ? ' à dose réduite' : ''}.` });
      if (on(tr, 'glibenclamide')) P.push({ ok: false, texte: 'Glibenclamide à éviter quand le rein est malade.' });
      besoin(['isglt2'], 'protège le rein');
      hypos();
      break;
    }
    case 'retino': case 'neuro':
      hba1c();
      P.push({ ok: true, texte: 'Rappel : tension artérielle bien contrôlée (voir Hémodyssée) et examen spécialisé régulier.' });
      break;
    case 'nephro':
      besoin(['isglt2'], 'protège le rein, en première ligne avec la metformine');
      hba1c();
      if (on(tr, 'glibenclamide')) P.push({ ok: false, texte: 'Glibenclamide à éviter quand le rein est malade.' });
      break;
    case 'pied':
      P.push({ ok: false, texte: 'Plaie du pied : décharge, soins et recherche d\'infection en urgence. Aucun antidiabétique ne la soigne à lui seul.' });
      hba1c();
      break;
    case 'coronaire':
      besoin(['aglp1', 'isglt2'], 'protection cardiovasculaire démontrée');
      hba1c();
      break;
  }
  return P;
}

/** Classes ajoutées sans indication parmi les maladies simulées. */
export function classesEnPlus(actives: PathoActive[], tr: Traitement): ClasseId[] {
  const utiles = new Set<ClasseId>();
  const ids = actives.map((a) => a.id);
  for (const a of actives) for (const c of Object.keys(PATHO_PAR_ID[a.id]?.traitement.propose ?? {}) as ClasseId[]) utiles.add(c);
  const t2 = ids.some((i) => ['t2', 'hypo', 'retino', 'nephro', 'neuro', 'pied', 'coronaire', 'irc', 'ramadan', 'repasSaute', 'effort'].includes(i)) && !ids.some((i) => ['t1', 'acidocetose', 'prediabete', 'gestationnel'].includes(i));
  if (t2) [...NON_INSULINES, ...INSULINES].forEach((c) => utiles.add(c));
  if (ids.some((i) => ['t1', 'acidocetose'].includes(i))) INSULINES.forEach((c) => utiles.add(c));
  if (ids.includes('gestationnel')) INSULINES.forEach((c) => utiles.add(c));
  if (ids.includes('prediabete')) utiles.add('metformine');
  if (ids.includes('t1') || ids.includes('acidocetose')) NON_INSULINES.forEach((c) => utiles.delete(c));
  return (Object.keys(tr) as ClasseId[]).filter((c) => on(tr, c) && !utiles.has(c));
}
