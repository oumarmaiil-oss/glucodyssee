/**
 * Fiche récapitulative à imprimer ou enregistrer en PDF (impression du navigateur) :
 * maladies simulées, traitement, chiffres sans / avec traitement, points de l'évaluation.
 */
import { createPortal } from 'react-dom';
import type { ClasseId, Etat, Traitement } from '../core/types.ts';
import { PATHO_PAR_ID, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';
import { evaluerPathologie } from '../core/evaluation.ts';

export function imprimerFiche() { window.print(); }
const v1 = (x: number) => x.toFixed(1).replace('.', ',');
const g2 = (mg: number) => (mg / 100).toFixed(2).replace('.', ',');
const pc = (x: number) => `${Math.round(x * 100)} %`;

export function FicheImpression({ actives, traitement, etat, sans }: { actives: PathoActive[]; traitement: Traitement; etat: Etat; sans: Etat }) {
  const classes = (Object.keys(traitement) as ClasseId[]).filter((c) => (traitement[c] ?? 0) > 0);
  const ligne = (nom: string, a: string, b: string) => <tr><td>{nom}</td><td>{a}</td><td>{b}</td></tr>;
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return createPortal(
    <div id="fiche-impression">
      <h1>Glucodyssée · fiche de simulation</h1>
      <p className="sous">{date}</p>
      <h2>Maladies et situations simulées</h2>
      <ul>{actives.map((a) => { const p = PATHO_PAR_ID[a.id]; const sev = p.severites?.[[0.4, 0.7, 1].indexOf(a.s)]; return <li key={a.id}>{p.nom}{sev ? ` (${sev.toLowerCase()})` : ''}</li>; })}</ul>
      <h2>Traitement</h2>
      {classes.length ? <ul>{classes.map((c) => <li key={c}>{CLASSE_PAR_ID[c].nom} : {CLASSE_PAR_ID[c].exemples}{traitement[c] !== 1 ? ` (dose ×${String(traitement[c]).replace('.', ',')})` : ''}</li>)}</ul> : <p>Aucun traitement.</p>}
      {etat.injections.length > 0 && <p>Injections : {etat.injections.map((i) => `${i.nom} ${i.u} U à ${String(Math.floor(i.h)).padStart(2, '0')} h ${String(Math.round((i.h % 1) * 60)).padStart(2, '0')}`).join(' ; ')}.</p>}
      <h2>Chiffres simulés (journée type)</h2>
      <table>
        <thead><tr><th></th><th>Sans traitement</th><th>Avec traitement</th></tr></thead>
        <tbody>
          {ligne('Glycémie au réveil', `${g2(sans.stats.aJeun)} g/L`, `${g2(etat.stats.aJeun)} g/L`)}
          {ligne('Pic après repas', `${g2(sans.stats.max)} g/L`, `${g2(etat.stats.max)} g/L`)}
          {ligne('HbA1c estimée', `${v1(Math.min(sans.stats.hba1c, 14))} %`, `${v1(Math.min(etat.stats.hba1c, 14))} %`)}
          {ligne('Temps dans la cible (0,70-1,80 g/L)', pc(sans.stats.tir), pc(etat.stats.tir))}
          {ligne('Temps sous 0,70 g/L', pc(sans.stats.tbr70), pc(etat.stats.tbr70))}
          {ligne('Glucose urinaire', `${Math.round(sans.urine)} g/jour`, `${Math.round(etat.urine)} g/jour`)}
          {ligne('Risque yeux/reins/nerfs (×, HbA1c 6 % = 1)', `×${v1(sans.risques.micro)}`, `×${v1(etat.risques.micro)}`)}
          {ligne('Risque d\'infarctus (×)', `×${v1(sans.risques.coronaire)}`, `×${v1(etat.risques.coronaire)}`)}
        </tbody>
      </table>
      <h2>Évaluation du traitement</h2>
      {actives.map((a) => (
        <div key={a.id}>
          <h3>{PATHO_PAR_ID[a.id].nom}</h3>
          <ul>{evaluerPathologie(a.id, actives, etat, traitement).map((p) => <li key={p.texte}>{p.ok ? '✓' : '✗'} {p.texte}</li>)}</ul>
        </div>
      ))}
      {etat.alertes.length > 0 && <><h2>Alertes</h2><ul>{etat.alertes.map((a) => <li key={a.texte}>{a.texte}</li>)}</ul></>}
      <p className="pied">Support pédagogique : simulation simplifiée d'un adulte type de 70 kg, qui ne remplace pas un avis médical et ne sert jamais à calculer une dose réelle. Glucodyssée · Dr O. Sow · oumarmaiil-oss.github.io/glucodyssee · contenu sous licence CC BY-NC-SA 4.0</p>
    </div>,
    document.body,
  );
}
