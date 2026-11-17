// Tests du moteur de Glucodyssée et de la cohérence du contenu (fiches, évaluation, cas, présentations).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculer, dfg, evoluer, indexAn, TERRAIN_SAIN } from './engine.ts';
import { classesEnPlus, evaluerPathologie } from './evaluation.ts';
import { construireTerrain, PATHOLOGIES, PATHO_PAR_ID, type PathoActive } from '../content/pathologies.ts';
import { CLASSES, CLASSE_PAR_ID } from '../content/classes.ts';
import { ZONES } from '../content/zones.ts';
import { CAS } from '../content/cas.ts';
import { PRESENTATIONS } from '../content/presentations.ts';
import type { ClasseId, Traitement } from './types.ts';

const terrain = (a: PathoActive[]) => construireTerrain(TERRAIN_SAIN, a);
const T1 = terrain([{ id: 't1', s: 0.7 }]);
const T2 = terrain([{ id: 't2', s: 0.7 }]);

test('sujet sain : glycémie normale, aucune alerte', () => {
  const e = calculer(TERRAIN_SAIN);
  assert.ok(e.stats.aJeun >= 80 && e.stats.aJeun < 100);
  assert.equal(e.stats.tbr70, 0);
  assert.equal(e.alertes.length, 0);
  assert.ok(e.risques.micro < 1.01);
});

test('type 1 : sans insuline, alerte d\'acidocétose ; basal-bolus standard équilibré', () => {
  const sans = calculer(T1);
  assert.ok(sans.alertes.some((a) => a.niveau === 'danger' && /acidocétose/.test(a.texte)));
  assert.equal(sans.risques.cetose, 1);
  const bb = calculer(T1, { basale: 1, rapide: 1 });
  assert.ok(bb.stats.tir > 0.7, `cible ${bb.stats.tir}`);
  assert.equal(bb.stats.tbr54, 0);
  assert.equal(bb.risques.cetose, 0);
  const melange = calculer(T1, { melange: 1 });
  assert.equal(melange.stats.tbr70, 0, 'mélange à dose standard sans hypoglycémie');
  assert.ok(melange.stats.tir < bb.stats.tir, 'le mélange équilibre moins bien que le basal-bolus');
});

test('metformine seule : jamais d\'hypoglycémie (sujet sain et tous les stades du type 2)', () => {
  for (const t of [TERRAIN_SAIN, terrain([{ id: 't2', s: 0.4 }]), T2, terrain([{ id: 't2', s: 1 }])]) {
    for (const d of [1, 2]) assert.equal(calculer(t, { metformine: d }).stats.tbr70, 0);
  }
});

test('alertes : associations et terrains à risque', () => {
  const irc = terrain([{ id: 't2', s: 0.7 }, { id: 'irc', s: 0.7 }]);
  assert.ok(dfg(irc.rein) >= 30 && dfg(irc.rein) < 45, `DFG ${dfg(irc.rein)}`);
  assert.ok(calculer(irc, { glibenclamide: 1 }).alertes.some((a) => a.niveau === 'danger' && /Glibenclamide/.test(a.texte)));
  assert.ok(calculer(irc, { metformine: 2 }).alertes.some((a) => a.niveau === 'danger' && /1 000 mg/.test(a.texte)));
  const severe = terrain([{ id: 't2', s: 0.7 }, { id: 'irc', s: 1 }]);
  assert.ok(calculer(severe, { metformine: 1 }).alertes.some((a) => /contre-indiquée/.test(a.texte)));
  assert.ok(calculer(T2, { idpp4: 1, aglp1: 1 }).alertes.some((a) => /même voie/.test(a.texte)));
  const ram = terrain([{ id: 't2', s: 0.4 }, { id: 'ramadan', s: 0.7 }]);
  const eRam = calculer(ram, { glibenclamide: 1 });
  assert.ok(eRam.stats.tbr70 > 0, 'glibenclamide au Ramadan : hypoglycémie');
  assert.ok(eRam.alertes.some((a) => /Ramadan/.test(a.texte)));
  assert.equal(calculer(ram, { metformine: 1, idpp4: 1 }).stats.tbr70, 0, 'metformine + iDPP-4 au Ramadan : pas d\'hypoglycémie');
});

test('hypoglycémie : la fiche montre la cause, le traitement proposé la corrige, le resucrage fait remonter', () => {
  const a: PathoActive[] = [{ id: 'hypo', s: 0.7 }];
  const t = terrain(a);
  const cause = calculer(t, PATHO_PAR_ID.hypo.demo);
  assert.ok(cause.stats.tbr70 > 0.04);
  const corrige = calculer(t, PATHO_PAR_ID.hypo.traitement.propose);
  assert.equal(corrige.stats.tbr70, 0);
  let m = 0; for (let k = 6 * 60; k < 1440; k++) if (cause.G[k] < 70) { m = k; break; }
  const resucre = calculer({ ...t, collations: [{ h: m / 60, g: 15, nom: 'Resucrage (15 g)' }] }, PATHO_PAR_ID.hypo.demo);
  assert.ok(resucre.G[m + 30] > cause.G[m + 30] + 10, 'la glycémie remonte après 15 g de sucre');
});

test('iSGLT2 : glucose dans les urines, seuil abaissé', () => {
  const e = calculer(T2, { isglt2: 1 });
  assert.ok(e.urine >= 50 && e.urine <= 110, `${e.urine} g`);
});

test('risques UKPDS : ×1/0,63 et ×1/0,86 par point d\'HbA1c au-dessus de 6 %', () => {
  const e = calculer(T2);
  const ex = Math.min(e.stats.hba1c, 14) - 6;
  assert.ok(Math.abs(e.risques.micro - Math.pow(1 / 0.63, ex)) < 1e-9);
  assert.ok(Math.abs(e.risques.coronaire - Math.pow(1 / 0.86, ex)) < 1e-9);
});

test('évolution sur 10 ans : sans traitement l\'HbA1c monte ; le traitement réduit le risque ; l\'arrêt le fait remonter', () => {
  const tr: Traitement = { metformine: 1, isglt2: 1 };
  const sans = evoluer(T2, tr, 'sans').points, avec = evoluer(T2, tr, 'avec').points, arret = evoluer(T2, tr, 'arret', 5).points;
  const k10 = indexAn(10), k5 = indexAn(5), k6 = indexAn(6);
  assert.ok(sans[k10].hba1c > sans[0].hba1c + 0.5);
  assert.ok(avec[k10].micro < sans[k10].micro);
  assert.ok(arret[k6].hba1c > avec[k6].hba1c + 0.3, 'arrêt : l\'HbA1c remonte');
  assert.ok(arret[k10].micro < sans[k10].micro, 'effet mémoire : l\'arrêt reste moins risqué que l\'absence de traitement');
  assert.equal(arret[k5 - 1].hba1c, avec[k5 - 1].hba1c);
  assert.ok(sans[k10].beta < sans[0].beta, 'la fonction bêta baisse dans le type 2');
});

test('cohérence fiche ↔ évaluation : le traitement proposé n\'est jamais jugé « en trop » ni « manquant »', () => {
  for (const p of PATHOLOGIES) {
    const a: PathoActive[] = [{ id: p.id, s: 0.7 }];
    const propose = p.traitement.propose;
    assert.deepEqual(classesEnPlus(a, propose), [], `${p.id} : classes jugées en trop`);
    const e = calculer(terrain(a), propose);
    const points = evaluerPathologie(p.id, a, e, propose);
    for (const c of Object.keys(propose) as ClasseId[]) {
      assert.ok(!points.some((x) => !x.ok && x.texte.startsWith('Il manque') && x.texte.includes(CLASSE_PAR_ID[c].court)), `${p.id} : ${c} jugé manquant`);
    }
  }
});

test('contenu : zones, classes, cas cliniques et présentations bien reliés', () => {
  for (const p of PATHOLOGIES) {
    for (const z of p.zones) assert.ok(ZONES[z], `${p.id} : zone ${z}`);
    for (const n of [1, 2, 3] as const) assert.ok(p.texte[n].length > 40, `${p.id} : texte niveau ${n}`);
  }
  for (const c of CLASSES) { assert.ok(ZONES[c.zone]); for (const n of [1, 2, 3] as const) assert.ok(c.mecanisme[n].length > 30); }
  for (const c of CAS) {
    for (const q of c.questions) assert.equal(q.options.filter((o) => o.ok).length, 1, `${c.id} : une seule bonne réponse`);
    for (const a of c.pathos) assert.ok(PATHO_PAR_ID[a.id], `${c.id} : ${a.id}`);
    for (const k of Object.keys(c.traitement ?? {})) assert.ok(CLASSE_PAR_ID[k as ClasseId], `${c.id} : ${k}`);
    if (c.zone) assert.ok(ZONES[c.zone]);
  }
  for (const pr of PRESENTATIONS) for (const e of pr.etapes) {
    for (const a of e.actives) assert.ok(PATHO_PAR_ID[a.id]);
    if (e.detail) { const t = terrain(e.actives); assert.ok(e.detail(calculer(t, e.traitement), calculer(t, {})).length > 5); }
  }
});

test('voyages et vues : chaque étape et chaque maladie ont un texte valable, quel que soit le patient', async () => {
  const { VOYAGES, minuteDepart } = await import('../content/voyages.ts');
  const { VUES_PATHO } = await import('../content/vuesPatho.ts');
  const patients = [TERRAIN_SAIN, T1, T2, terrain([{ id: 'hypo', s: 0.7 }]), terrain([{ id: 't2', s: 0.4 }, { id: 'ramadan', s: 0.7 }])];
  for (const v of VOYAGES) for (const t of patients) for (const tr of [{}, { basale: 1, rapide: 1 }, { glibenclamide: 1 }] as Traitement[]) {
    const e = calculer(t, tr);
    const m0 = minuteDepart(v, e);
    assert.ok(m0 >= 0 && m0 < 1440);
    for (const et of v.etapes) {
      assert.ok(ZONES[et.z], `${v.id} : ${et.z}`);
      const m = (m0 + (et.decalage ?? 0)) % 1440;
      assert.ok(et.texte(t, e).length > 10);
      for (const n of [1, 2, 3] as const) assert.ok(!/NaN|undefined/.test(et.detail(e, m, n)), `${v.id} ${et.z} : ${et.detail(e, m, n)}`);
    }
  }
  for (const p of PATHOLOGIES) {
    const vp = VUES_PATHO[p.id];
    assert.ok(vp && Object.keys(vp.vues).length > 0, `${p.id} : vues manquantes`);
    for (const k of Object.keys(vp.vues)) assert.ok(['corps', 'ilot', 'cellule', 'rein', 'courbe'].includes(k));
  }
});
