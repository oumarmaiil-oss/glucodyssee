/**
 * Les voyages guidés : la scène suit le glucose, l'insuline ou la défense contre l'hypoglycémie, étape par étape,
 * en changeant de vue (corps, îlot, cellule, rein, courbes). Les textes s'adaptent au patient simulé
 * (type 1, type 2, traitement) et les chiffres viennent du moteur, à l'heure montrée.
 */
import type { Etat, Niveau, Terrain } from '../core/types.ts';
import { repasDuJour } from '../core/engine.ts';
import type { ZoneId } from './zones.ts';

export type VueVoyage = 'corps' | 'ilot' | 'cellule' | 'rein' | 'courbe' | 'vaisseau';

export interface EtapeVoyage {
  z: ZoneId;
  vue: VueVoyage;
  site?: 'muscle' | 'foie';
  /** Minutes après le début du voyage (heure montrée dans la scène). */
  decalage?: number;
  texte: (t: Terrain, e: Etat) => string;
  detail: (e: Etat, m: number, niveau: Niveau) => string;
}

export interface Voyage { id: 'glucose' | 'insuline' | 'defense'; titre: string; court: string; pour: string; couleur: string; etapes: EtapeVoyage[] }

const g = (mg: number) => `${(mg / 100).toFixed(2).replace('.', ',')} g/L`;
const h = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')} h ${String(Math.round(m % 60)).padStart(2, '0')}`;
const injecte = (e: Etat) => e.injections.length > 0;
const sulfa = (e: Etat) => (e.traitement.sulfamide ?? 0) + (e.traitement.glibenclamide ?? 0) > 0;
const resistant = (t: Terrain) => t.si < 0.6;

export const VOYAGES: Voyage[] = [
  {
    id: 'glucose', titre: 'Le voyage du glucose', court: 'Glucose', couleur: '#f5a524', pour: 'Du repas jusqu\'aux cellules',
    etapes: [
      { z: 'estomac', vue: 'corps', decalage: 0, texte: () => 'Le repas arrive : l\'amidon va devenir du glucose.', detail: (e, m, n) => n === 1 ? 'Riz, mil, pain, manioc : leurs glucides deviennent du glucose.' : `${h(m)} · ${repasPrincipal(e.terrain).nom} : ${repasPrincipal(e.terrain).g} g de glucides · la vidange de l'estomac règle la vitesse de montée` },
      { z: 'intestin', vue: 'corps', decalage: 15, texte: () => 'Le glucose traverse la paroi de l\'intestin.', detail: (e, m, n) => n === 1 ? 'Il passe dans le sang par de petites portes.' : `Transporteurs SGLT1 et GLUT2 · l'intestin prévient le pancréas (GLP-1, GIP)${(e.traitement.aglp1 ?? 0) > 0 ? ' · sous aGLP-1, l\'estomac se vide plus lentement' : ''}` },
      { z: 'veinePorte', vue: 'corps', decalage: 25, texte: () => 'La veine porte l\'emmène d\'abord au foie.', detail: () => 'Tout le sang de l\'intestin traverse le foie avant de rejoindre le cœur.' },
      { z: 'foie', vue: 'cellule', site: 'foie', decalage: 35, texte: (t) => resistant(t) ? 'Le foie résiste à l\'insuline : il stocke mal et continue de produire du sucre.' : 'Le foie en garde une partie en réserve (glycogène).', detail: (e, m) => `Production du foie à ${h(m)} : ${e.PGE[m].toFixed(1).replace('.', ',')} mg/kg/min (à jeun ≈ 2)${(e.traitement.metformine ?? 0) > 0 ? ' · la metformine la freine' : ''}` },
      { z: 'sang', vue: 'courbe', decalage: 50, texte: () => 'Le reste passe dans le sang : la glycémie monte.', detail: (e, m) => `Glycémie à ${h(m)} : ${g(e.G[m])} · pic de la journée ${g(e.stats.max)}` },
      { z: 'pancreas', vue: 'corps', decalage: 55, texte: (t) => t.type === 't1' ? 'Le pancréas ne répond plus : il n\'y a plus de cellules bêta.' : 'Le pancréas sent le sucre monter.', detail: (e, m) => `Sécrétion d'insuline : ${e.S[m].toFixed(1).replace('.', ',')} µU/mL/min · fonction bêta ${Math.round(e.terrain.beta * 100)} %` },
      { z: 'ilot', vue: 'ilot', decalage: 60, texte: (t, e) => t.type === 't1' ? (injecte(e) ? 'Type 1 : l\'insuline vient de l\'injection, pas de l\'îlot.' : 'Type 1 : l\'îlot ne libère plus d\'insuline.') : t.beta < 0.5 ? 'Les cellules bêta libèrent l\'insuline, mais trop peu et trop tard.' : 'Les cellules bêta libèrent l\'insuline.', detail: (e, m) => `Insuline dans le sang à ${h(m)} : ${Math.round(e.I[m])} µU/mL${sulfa(e) ? ' · sous sulfamide, l\'îlot libère aussi entre les repas' : ''}` },
      { z: 'muscles', vue: 'cellule', site: 'muscle', decalage: 75, texte: (t, e) => t.type === 't1' && !injecte(e) ? 'Sans clé, la porte du muscle reste fermée.' : resistant(t) ? 'Serrures grippées : le sucre entre mal dans le muscle.' : 'L\'insuline ouvre les portes des muscles.', detail: (e, m) => `Captation par les muscles et la graisse : ${e.Uins[m].toFixed(1).replace('.', ',')} mg/kg/min · sensibilité à l'insuline ${Math.round(e.terrain.si * 100)} %` },
      { z: 'graisse', vue: 'corps', decalage: 85, texte: (_, e) => e.risques.cetose >= 1 ? 'Sans insuline, la graisse se vide : danger d\'acidocétose.' : 'Le tissu gras stocke aussi le surplus.', detail: () => 'L\'insuline freine aussi la libération des graisses.' },
      { z: 'cerveau', vue: 'corps', decalage: 95, texte: () => 'Le cerveau consomme du sucre, sans insuline.', detail: (e, m) => `≈ 120 g de glucose par jour · consommation à ${h(m)} : ${e.Ucer[m].toFixed(1).replace('.', ',')} mg/kg/min` },
      { z: 'reins', vue: 'rein', decalage: 100, texte: (_, e) => e.urine > 5 ? 'Trop de sucre : le rein ne peut plus tout récupérer, il passe dans les urines.' : 'Les reins filtrent le sang et récupèrent tout le sucre.', detail: (e) => `Seuil rénal ≈ ${(e.traitement.isglt2 ?? 0) > 0 ? '0,70 g/L (iSGLT2)' : '1,80 g/L'} · sucre dans les urines : ${Math.round(e.urine)} g/jour` },
      { z: 'globules', vue: 'courbe', decalage: 110, texte: () => 'Le sucre colle à l\'hémoglobine : c\'est l\'HbA1c.', detail: (e) => `HbA1c estimée ${e.stats.hba1c > 14 ? '> 14' : e.stats.hba1c.toFixed(1).replace('.', ',')} % · ${Math.round(e.stats.tir * 100)} % du temps entre 0,70 et 1,80 g/L` },
    ],
  },
  {
    id: 'insuline', titre: 'Le voyage de l\'insuline', court: 'Insuline', couleur: '#38bdf8', pour: 'De la cellule bêta à la serrure',
    etapes: [
      { z: 'ilot', vue: 'ilot', decalage: 30, texte: (t) => t.type === 't1' ? 'Type 1 : les cellules bêta ont été détruites.' : 'Le sucre monte : les cellules bêta le détectent.', detail: (e, m) => `Glycémie à ${h(m)} : ${g(e.G[m])}` },
      { z: 'ilot', vue: 'ilot', decalage: 40, texte: (t, e) => t.type === 't1' ? (injecte(e) ? 'L\'insuline vient de l\'injection sous la peau.' : 'Sans injection, il n\'y a pas d\'insuline du tout.') : sulfa(e) ? 'Elles libèrent l\'insuline ; le sulfamide les force en plus.' : 'Elles libèrent l\'insuline.', detail: (e, m, n) => n === 1 ? 'Le sucre entre dans la cellule bêta, qui libère ses grains d\'insuline.' : `Glucose → ATP → fermeture des canaux K-ATP → entrée du calcium → libération · ${e.S[m].toFixed(1).replace('.', ',')} µU/mL/min` },
      { z: 'veinePorte', vue: 'corps', decalage: 45, texte: (t) => t.type === 't1' ? 'L\'insuline injectée passe dans le sang sans passer d\'abord par le foie.' : 'Elle part d\'abord vers le foie, par la veine porte.', detail: () => 'L\'insuline du pancréas arrive au foie en premier, à forte concentration.' },
      { z: 'foie', vue: 'cellule', site: 'foie', decalage: 55, texte: (t) => t.type === 't1' ? 'Le foie reçoit moins d\'insuline qu\'à l\'état normal.' : 'Le foie en garde environ la moitié : il arrête de produire du sucre et le stocke.', detail: (e, m) => `Production du foie à ${h(m)} : ${e.PGE[m].toFixed(1).replace('.', ',')} mg/kg/min${resistant(e.terrain) ? ' · le foie résiste : il freine mal' : ''}` },
      { z: 'sang', vue: 'courbe', decalage: 60, texte: () => 'Le reste circule dans tout le corps.', detail: (e, m) => `Insuline dans le sang à ${h(m)} : ${Math.round(e.I[m])} µU/mL (courbe bleue, en bas)` },
      { z: 'muscles', vue: 'cellule', site: 'muscle', decalage: 70, texte: (t) => resistant(t) ? 'Sur le muscle, la clé tourne mal dans une serrure grippée.' : 'Sur le muscle, la clé ouvre la porte GLUT4.', detail: (e, m) => `Récepteur de l'insuline → transporteurs GLUT4 à la surface · captation ${e.Uins[m].toFixed(1).replace('.', ',')} mg/kg/min` },
      { z: 'graisse', vue: 'corps', decalage: 80, texte: (_, e) => e.risques.cetose >= 1 ? 'Sans insuline, la graisse libère ses réserves : corps cétoniques.' : 'Sur la graisse, elle fait stocker et bloque la libération des graisses.', detail: () => 'Sans ce frein (type 1 non traité), le foie transforme les graisses en corps cétoniques.' },
      { z: 'ilot', vue: 'ilot', decalage: 90, texte: () => 'Dans l\'îlot, elle freine les cellules alpha voisines : moins de glucagon.', detail: (e, m) => `Indice de glucagon à ${h(m)} : ${e.glucagon[m].toFixed(1).replace('.', ',')} (1 = jeûne normal)` },
      { z: 'reins', vue: 'rein', decalage: 100, texte: (t) => t.rein < 0.65 ? 'Rein malade : l\'insuline est éliminée plus lentement, elle dure plus longtemps.' : 'Le foie et le rein détruisent l\'insuline : elle ne dure que quelques minutes.', detail: (_, __, n) => n === 1 ? 'C\'est pour ça que le pancréas en libère en permanence.' : 'Demi-vie de l\'insuline dans le sang : quelques minutes · rein malade : risque d\'hypoglycémie sous insuline ou sulfamide' },
    ],
  },
  {
    id: 'defense', titre: 'La défense contre l\'hypoglycémie', court: 'Hypoglycémie', couleur: '#c084fc', pour: 'Quand le sucre descend trop bas',
    etapes: [
      { z: 'sang', vue: 'courbe', texte: (_, e) => e.stats.tbr70 > 0 ? 'Le sucre descend sous 0,70 g/L : c\'est l\'hypoglycémie.' : 'Ici, la glycémie ne descend pas sous 0,70 g/L.', detail: (e, m) => e.stats.tbr70 > 0 ? `${h(m)} : ${g(e.G[m])} · minimum de la journée ${g(e.stats.min)}` : 'Pour la voir, simulez la fiche « Hypoglycémie » (sulfamide et repas sauté), puis relancez ce voyage.' },
      { z: 'ilot', vue: 'ilot', decalage: 5, texte: (_, e) => sulfa(e) ? 'Les cellules bêta devraient s\'arrêter… mais le sulfamide les force encore.' : 'Les cellules bêta arrêtent de libérer l\'insuline.', detail: (e, m) => `Sécrétion d'insuline : ${e.S[m].toFixed(1).replace('.', ',')} µU/mL/min · insuline ${Math.round(e.I[m])} µU/mL` },
      { z: 'ilot', vue: 'ilot', decalage: 10, texte: () => 'Les cellules alpha libèrent le glucagon.', detail: (e, m) => `Indice de glucagon : ${e.glucagon[m].toFixed(1).replace('.', ',')} (1 = jeûne normal)` },
      { z: 'foie', vue: 'cellule', site: 'foie', decalage: 15, texte: () => 'Le foie vide ses réserves et fabrique du sucre.', detail: (e, m) => `Production du foie : ${e.PGE[m].toFixed(1).replace('.', ',')} mg/kg/min (à jeun ≈ 2) · glycogène et néoglucogenèse` },
      { z: 'cerveau', vue: 'corps', decalage: 20, texte: () => 'Le cerveau souffre en premier : sueurs, tremblements, faim, confusion.', detail: (_, __, n) => n === 1 ? 'L\'adrénaline donne l\'alerte : cœur qui bat vite, sueurs.' : 'Signes adrénergiques puis neuroglucopéniques · niveau 2 sous 0,54 g/L · niveau 3 : besoin de l\'aide d\'un tiers' },
      { z: 'sang', vue: 'courbe', decalage: 25, texte: () => 'Règle des 15 : 15 g de sucre, contrôle après 15 minutes.', detail: () => 'Trois morceaux de sucre ou un demi-verre de jus ; recommencer si < 0,70 g/L, puis une collation. Glucagon si la personne ne peut pas avaler.' },
    ],
  },
];

export const VOYAGE_PAR_ID = Object.fromEntries(VOYAGES.map((v) => [v.id, v])) as Record<Voyage['id'], Voyage>;

/** Le repas le plus riche en glucides de la journée (point de départ des voyages du glucose et de l'insuline). */
export function repasPrincipal(t: Terrain) {
  const r = repasDuJour(t).filter((x) => !(t.collations ?? []).includes(x));
  return r.reduce((a, b) => (b.g > a.g ? b : a), r[0] ?? { h: 13.5, g: 0, nom: 'Repas' });
}

/** Minute de départ du voyage : le repas principal, ou le début de l'hypoglycémie. */
export function minuteDepart(v: Voyage, e: Etat): number {
  if (v.id !== 'defense') return Math.round(repasPrincipal(e.terrain).h * 60);
  for (let k = 6 * 60; k < 1440; k++) if (e.G[k] < 70) return k;
  let m = 0; for (let k = 0; k < 1440; k++) if (e.G[k] < e.G[m]) m = k;
  return m;
}
