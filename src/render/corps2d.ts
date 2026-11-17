/**
 * Vue « corps » : le voyage du sucre. Le glucose (hexagones dorés) arrive par l'intestin et la veine porte,
 * passe par le foie, circule dans le sang (sa densité suit la glycémie de l'instant) et entre dans les
 * muscles, le cerveau, la graisse ; il déborde dans les urines au-dessus du seuil rénal.
 * L'insuline (points bleus) sort du pancréas ou du site d'injection. Les flux viennent du moteur, minute par minute.
 */
import { bouchee, cle, clamp, COUL, creerScene2D, hexagone, losange, triangle, lerp, mix, type Contexte, type OptionsRendu, type Pt, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';
import { effetsVisibles } from '../core/effets.ts';
import { repasDuJour } from '../core/engine.ts';
import type { Etat } from '../core/types.ts';

const W = 600, H = 940;

interface Chemin { pts: Pt[]; cum: number[]; len: number }
function chemin(pts: Pt[]): Chemin {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
function at(c: Chemin, s: number): Pt {
  const d = clamp(s, 0, 1) * c.len; let i = 1;
  while (i < c.cum.length - 1 && c.cum[i] < d) i++;
  const t = (d - c.cum[i - 1]) / (c.cum[i] - c.cum[i - 1] || 1);
  return [lerp(c.pts[i - 1][0], c.pts[i][0], t), lerp(c.pts[i - 1][1], c.pts[i][1], t)];
}

const COEUR: Pt = [314, 262];
type Organe = 'cerveau' | 'muscles' | 'reins' | 'graisse' | 'foie';
/** Boucles de circulation : artère jusqu'à l'organe (moitié du trajet), puis veine de retour au cœur. */
const BOUCLES: { org: Organe; c: Chemin; poids: number }[] = [
  { org: 'cerveau', poids: 0.18, c: chemin([COEUR, [306, 222], [300, 160], [298, 96], [300, 70], [292, 96], [288, 160], [296, 230], COEUR]) },
  { org: 'muscles', poids: 0.2, c: chemin([COEUR, [306, 330], [300, 540], [262, 590], [252, 700], [248, 780], [238, 700], [244, 590], [290, 545], [296, 330], COEUR]) },
  { org: 'muscles', poids: 0.2, c: chemin([COEUR, [306, 330], [300, 540], [338, 590], [348, 700], [352, 780], [362, 700], [356, 590], [310, 545], [296, 330], COEUR]) },
  { org: 'reins', poids: 0.09, c: chemin([COEUR, [306, 330], [304, 420], [244, 420], [232, 425], [244, 430], [298, 432], [296, 330], COEUR]) },
  { org: 'reins', poids: 0.09, c: chemin([COEUR, [306, 330], [304, 420], [364, 420], [376, 425], [364, 430], [302, 432], [296, 330], COEUR]) },
  { org: 'graisse', poids: 0.1, c: chemin([COEUR, [306, 330], [304, 470], [396, 480], [410, 490], [396, 500], [300, 492], [296, 330], COEUR]) },
  { org: 'foie', poids: 0.14, c: chemin([COEUR, [306, 330], [300, 380], [252, 352], [236, 345], [252, 340], [290, 300], COEUR]) },
];
/** Absorption : intestin → veine porte → foie → veine sus-hépatique → cœur. */
const ABS = chemin([[300, 480], [282, 450], [270, 410], [258, 372], [250, 350], [276, 312], [300, 280], COEUR]);
/** Insuline : pancréas → veine porte → foie → cœur ; injection : ventre → cœur. */
const INS_PANC = chemin([[330, 392], [290, 400], [270, 395], [258, 372], [250, 350], [276, 312], [300, 280], COEUR]);
const INS_INJ = chemin([[372, 520], [340, 500], [306, 470], [302, 330], COEUR]);
/** Urine : rein → uretère → vessie. */
/** Hormones : GLP-1 de l'intestin vers le pancréas (après le repas) ; glucagon du pancréas vers le foie. */
const GLP1 = chemin([[300, 470], [316, 440], [330, 412], [336, 396]]);
const GLUCAGON = chemin([[318, 394], [290, 400], [270, 395], [258, 372], [244, 350]]);
const URINE = [chemin([[232, 432], [252, 500], [292, 572]]), chemin([[376, 432], [352, 500], [308, 572]])];

// Trajet du repas : bouche → œsophage → estomac, puis estomac → intestin (où l'amidon devient glucose).
const T_BOUCHE = chemin([[300, 102], [302, 150], [306, 205], [322, 262], [340, 314], [352, 340]]);
const T_STO_INT = chemin([[366, 356], [350, 384], [318, 420], [262, 450], [338, 462], [262, 476], [338, 490], [300, 496]]);
const POS_ESTOMAC: Pt[] = Array.from({ length: 16 }, (_, k) => [342 + ((k * 13) % 30) - 2 + (k % 3) * 2, 334 + ((k * 7) % 22)]);
/** Glucides encore dans l'estomac (g) et vitesse de vidange (g/min), même loi que le moteur (vidange ≈ 1,8 %/min, ralentie par les aGLP-1). */
function estomac(e: Etat, heure: number) {
  const k = 0.018 * (1 - 0.35 * Math.min(1, e.traitement.aglp1 ?? 0));
  let g = 0, repasEnCours: { nom: string; g: number; depuis: number } | null = null;
  for (const r of repasDuJour(e.terrain)) {
    const dm = (((heure - r.h) * 60) % 1440 + 1440) % 1440;
    if (dm < 360) { g += r.g * Math.exp(-k * dm); if (dm < 20) repasEnCours = { nom: r.nom, g: r.g, depuis: dm }; }
  }
  return { g, vidange: k * g, repasEnCours };
}

// Trajets de la molécule suivie.
const T_REPAS = chemin([[356, 344], [336, 372], [310, 420], [300, 452], [300, 480]]);
const T_INTESTIN_FOIE = chemin([[300, 480], [282, 450], [270, 410], [258, 372], [244, 348]]);
const T_FOIE_COEUR = chemin([[244, 348], [276, 312], [300, 280], COEUR]);
const T_PANC_FOIE = chemin([[336, 394], [300, 400], [270, 395], [258, 372], [244, 348]]);
const moitie = (c: Chemin, aller: boolean) => { const n = c.pts.length, mi = Math.floor(n / 2); return chemin(aller ? c.pts.slice(0, mi + 1) : c.pts.slice(mi)); };
const ARTERES = BOUCLES.map((b) => moitie(b.c, true));
const VEINES = BOUCLES.map((b) => moitie(b.c, false));
const NOMS_ORGANES: Record<Organe, string> = { cerveau: 'le cerveau', muscles: 'les muscles des jambes', reins: 'les reins', graisse: 'le tissu gras', foie: 'le foie' };

export type Molecule = 'glucose' | 'insuline';
export interface Journal { type: Molecule; lignes: string[]; fini: boolean }

const REGIONS: Region[] = [
  { z: 'yeux', x: 270, y: 66, w: 60, h: 28 },
  { z: 'globules', x: 46, y: 236, w: 128, h: 128 },
  { z: 'veinePorte', x: 252, y: 392, w: 34, h: 42 },
  { z: 'pancreas', x: 290, y: 380, w: 96, h: 28 },
  { z: 'cerveau', x: 250, y: 22, w: 100, h: 88 },
  { z: 'coeur', x: 284, y: 236, w: 62, h: 56 },
  { z: 'foie', x: 196, y: 312, w: 124, h: 66 },
  { z: 'estomac', x: 320, y: 318, w: 76, h: 56 },
  { z: 'reins', x: 208, y: 398, w: 46, h: 54 }, { z: 'reins', x: 354, y: 398, w: 46, h: 54 },
  { z: 'intestin', x: 244, y: 440, w: 112, h: 92 },
  { z: 'graisse', x: 390, y: 440, w: 48, h: 110 },
  { z: 'muscles', x: 214, y: 600, w: 172, h: 200 },
  { z: 'pieds', x: 196, y: 888, w: 208, h: 40 },
  { z: 'nerfs', x: 214, y: 805, w: 172, h: 78 },
  { z: 'sang', x: 290, y: 300, w: 30, h: 240 },
];

interface Particule { b: number; s: number; o: number; abs?: boolean }

export function creerCorps2D(conteneur: HTMLElement, opt: OptionsRendu = {}): Rendu & { suivre(type: Molecule | null, onJournal?: (j: Journal) => void): void } {
  const leger = !!opt.leger;
  const sang: Particule[] = [];
  const absP: { s: number; o: number }[] = [];
  const bouchees: { c: 'bouche' | 'intestin'; s: number; o: number }[] = [];
  let accBouche = 0, accVid = 0, coupees = 0;
  const ins: { c: Chemin | null; b: number; s: number; o: number; vie: number }[] = [];
  const urine: { k: number; s: number }[] = [];
  const horm: { c: Chemin; s: number; o: number; coul: 'glp1' | 'glucagon' }[] = [];
  let accGlp = 0, accGlu = 0;
  let vessie = 0;
  // ── Molécule suivie : son trajet dépend de l'état du patient à l'heure affichée. ──
  let tr: { type: Molecule; c: Chemin | null; s: number; attente: number; lignes: string[]; fini: boolean; boucles: number; apres: ((i: Instant, e: NonNullable<Contexte['etat']>) => void) | null; traine: Pt[]; pt: Pt; onJ?: (j: Journal) => void } | null = null;
  const dire = (texte: string) => { if (!tr) return; tr.lignes.push(texte); tr.onJ?.({ type: tr.type, lignes: [...tr.lignes], fini: tr.fini }); };
  const finir = (texte: string) => { if (!tr) return; tr.fini = true; tr.c = null; tr.apres = null; dire(texte); };
  const aller = (c: Chemin, texte: string | null, apres: (i: Instant, e: NonNullable<Contexte['etat']>) => void) => { if (!tr) return; tr.c = c; tr.s = 0; tr.apres = apres; tr.attente = 0.9; if (texte) dire(texte); };
  const gh = (x: number) => `${(x * 4.2).toFixed(1).replace('.', ',')} g/h`;
  const gl = (mg: number) => `${(mg / 100).toFixed(2).replace('.', ',')} g/L`;
  const porte = (i: Instant, e: NonNullable<Contexte['etat']>) => clamp((i.I / (i.I + 40)) * e.terrain.si * ((e.traitement.metformine ?? 0) > 0 ? 1.25 : 1) * 1.3 + (i.effort ? 0.5 : 0), 0, 0.97);
  const alea = () => Math.random();
  function auCoeurGlucose(i: Instant, e: NonNullable<Contexte['etat']>) {
    if (!tr) return;
    if (tr.boucles >= 3) { finir(`Elle tourne encore dans le sang après ${tr.boucles} tours : c'est ce qui arrive quand la glycémie reste haute (${gl(i.G)}).`); return; }
    const w = [i.Ucer, (i.Uins * 0.75 + i.Ueff) / 2, (i.Uins * 0.75 + i.Ueff) / 2, 0.25, 0.25, i.Uins * 0.25 + 0.02, 0];
    const tot = w.reduce((a, b) => a + b, 0); let r = alea() * tot, b = 0; while (b < w.length - 1 && r > w[b]) { r -= w[b]; b++; }
    const org = BOUCLES[b].org;
    aller(ARTERES[b], `Le cœur l'envoie par les artères vers ${NOMS_ORGANES[org]}.`, (i2, e2) => arriveeOrgane(b, i2, e2));
  }
  function retour(b: number, texte: string) { if (!tr) return; tr.boucles++; aller(VEINES[b], texte, auCoeurGlucose); }
  function arriveeOrgane(b: number, i: Instant, e: NonNullable<Contexte['etat']>) {
    const org = BOUCLES[b].org;
    if (org === 'cerveau') { finir(`Elle entre dans le cerveau, sans avoir besoin d'insuline : elle sert de carburant aux neurones (le cerveau en consomme ≈ 120 g par jour).`); return; }
    if (org === 'muscles' || org === 'graisse') {
      const p = porte(i, e) * (org === 'graisse' ? 0.8 : 1);
      if (alea() < p) finir(i.effort && org === 'muscles' ? 'Elle entre dans le muscle : l\'effort a fait monter des portes GLUT4, même sans beaucoup d\'insuline.' : `Elle entre dans ${org === 'muscles' ? 'le muscle' : 'la cellule graisseuse'} : l'insuline (${Math.round(i.I)} µU/mL) a fait monter une porte GLUT4.${org === 'muscles' ? ' Elle sera brûlée ou stockée en glycogène.' : ' Elle sera stockée.'}`);
      else retour(b, e.terrain.type === 't1' && i.I < 5 ? 'Porte fermée : il n\'y a pas d\'insuline (type 1 sans injection). Elle repart dans le sang par les veines.' : e.terrain.si < 0.6 ? 'Porte fermée : la serrure est grippée (résistance à l\'insuline). Elle repart dans le sang par les veines.' : `Porte fermée : trop peu d'insuline à cette heure (${Math.round(i.I)} µU/mL). Elle repart dans le sang par les veines.`);
      return;
    }
    if (org === 'reins') {
      const filtre = (i.G * 1.25 * e.terrain.rein) / 70;
      const pu = clamp(i.Urein / Math.max(0.01, filtre), 0, 1);
      if (alea() < pu * 3) { aller(URINE[b === 3 ? 0 : 1], `Filtrée par le rein, mais SGLT2 ne peut pas tout reprendre (glycémie ${gl(i.G)}, au-dessus du seuil${(e.traitement.isglt2 ?? 0) > 0 ? ' abaissé par l\'iSGLT2' : ''}).`, () => finir('Elle part dans les urines : c\'est la glycosurie (elle entraîne de l\'eau : soif, urines abondantes).')); }
      else retour(b, 'Filtrée par le rein, puis reprise par le transporteur SGLT2 : retour dans le sang.');
    }
  }
  function auCoeurInsuline(etape: number) {
    // 0 : vers les muscles ; 1 : vers le rein (destruction).
    const b = etape === 0 ? (alea() < 0.5 ? 1 : 2) : 3;
    aller(ARTERES[b], etape === 0 ? 'Le cœur l\'envoie vers les muscles des jambes.' : 'Elle repasse par le cœur, puis arrive au rein.', (i, e) => {
      if (etape === 0) {
        const res = e.terrain.si < 0.6;
        dire(res ? 'Elle se fixe sur un récepteur du muscle, mais la cascade à l\'intérieur répond mal (résistance) : peu de portes GLUT4 montent.' : 'Elle se fixe sur un récepteur du muscle : le signal (IRS → PI3K → Akt) fait monter les portes GLUT4, le glucose entre.');
        aller(VEINES[b], 'Elle se détache et repart dans le sang.', () => auCoeurInsuline(1));
      } else finir('Le rein la capte et la détruit : l\'insuline ne dure que quelques minutes dans le sang, d\'où une libération permanente par le pancréas.');
    });
  }
  function demarrer(type: Molecule, i: Instant, e: NonNullable<Contexte['etat']>) {
    if (!tr) return;
    if (type === 'glucose') {
      if (i.Ra > 0.3) {
        aller(T_REPAS, `${i.repas ? `Avalée avec le ${i.repas.toLowerCase()}` : 'Avalée avec le repas'} : l'amidon a été coupé en glucose dans l'intestin.`, () =>
          aller(T_INTESTIN_FOIE, `Elle traverse la paroi de l'intestin (repas : ${gh(i.Ra)} de glucose qui entrent) et prend la veine porte vers le foie.`, (i2, e2) => {
            const stock = clamp((i2.I - 15) / 50, 0, 1) * 0.55 * e2.terrain.sl;
            if (alea() < stock) finir(`Le foie la garde et la stocke en glycogène : l'insuline (${Math.round(i2.I)} µU/mL) lui dit de faire des réserves.`);
            else aller(T_FOIE_COEUR, 'Le foie la laisse passer : elle rejoint le cœur par la veine cave.', auCoeurGlucose);
          }));
      } else {
        tr.pt = [244, 348];
        aller(T_FOIE_COEUR, `Pas de repas en cours : elle a été fabriquée par le foie (${gh(i.PGE)})${e.terrain.sl < 0.6 ? ', qui résiste à l\'insuline et produit trop' : ''}. Elle rejoint le cœur.`, auCoeurGlucose);
      }
    } else {
      if (i.S > 0.3) {
        aller(T_PANC_FOIE, `Une cellule bêta la libère (glycémie ${gl(i.G)}) en même temps que le peptide C. Elle part dans la veine porte, droit vers le foie.`, () => {
          if (alea() < 0.5) finir('Le foie la capte dès son premier passage (il en garde environ la moitié) : elle lui fait stocker le sucre et arrêter d\'en fabriquer.');
          else aller(T_FOIE_COEUR, 'Le foie la laisse passer : elle rejoint le cœur.', () => auCoeurInsuline(0));
        });
      } else if (e.injections.length) {
        aller(INS_INJ, 'Elle vient d\'une injection sous la peau : elle entre dans le sang sans passer d\'abord par le foie.', () => auCoeurInsuline(0));
      } else finir(e.terrain.beta < 0.05 ? 'Rien à suivre : plus de cellules bêta (type 1) et aucune injection. Sans insuline, le sucre ne peut pas entrer dans les muscles.' : `Rien à suivre à cette heure : le sucre est bas (${gl(i.G)}), le pancréas ne libère presque pas d'insuline. Choisissez une heure après un repas.`);
    }
  }
 // remplissage visuel de la vessie en glucose
  const glow = { cerveau: 0, muscles: 0, reins: 0, graisse: 0, foie: 0 };
  let spawnAbs = 0, spawnFoie = 0, spawnIns = 0, spawnUr = 0;
  const tire = () => { const r = Math.random(); let a = 0; for (let k = 0; k < BOUCLES.length; k++) { a += BOUCLES[k].poids; if (r <= a) return k; } return 0; };

  function avancer(c: Contexte, i: Instant, dt: number) {
    const e = c.etat; if (!e) return;
    if (tr && !tr.fini) {
      if (!tr.c && !tr.apres && tr.lignes.length === 0) demarrer(tr.type, i, e);
      else if (tr.c) {
        if (tr.attente > 0) tr.attente -= dt;
        else {
          tr.s += (85 * dt) / tr.c.len;
          if (tr.s >= 1) { tr.s = 1; const f = tr.apres; tr.pt = at(tr.c, 1); tr.c = null; tr.apres = null; f?.(i, e); }
        }
      }
      if (tr && tr.c) { tr.pt = at(tr.c, tr.s); tr.traine.push(tr.pt); if (tr.traine.length > 40) tr.traine.shift(); }
    }
    const k = leger ? 0.55 : 1;
    // Densité du sucre dans le sang : proportionnelle à la glycémie de l'instant.
    const cible = Math.round(clamp(i.G, 30, 450) * 0.32 * k);
    const v = 150;
    // Sources : intestin (repas) et foie.
    spawnAbs += i.Ra * 9 * k * dt * 4;
    spawnAbs = 0;
    // Le repas entre par la bouche (bouchées de 10 g de glucides), attend dans l'estomac, puis passe dans l'intestin
    // au rythme de la vidange ; dans l'intestin, chaque bouchée est coupée en glucose (3 hexagones) qui part vers le foie.
    const est = estomac(e, i.heure);
    if (est.repasEnCours) { accBouche += (est.repasEnCours.g / 10 / 20) * 24 * dt; while (accBouche >= 1) { accBouche -= 1; bouchees.push({ c: 'bouche', s: 0, o: Math.random() - 0.5 }); } }
    accVid += (est.vidange / 10) * 24 * dt;
    while (accVid >= 1) { accVid -= 1; bouchees.push({ c: 'intestin', s: 0, o: Math.random() - 0.5 }); }
    for (let j = bouchees.length - 1; j >= 0; j--) {
      const b = bouchees[j]; b.s += ((b.c === 'bouche' ? 110 : 70) * dt) / (b.c === 'bouche' ? T_BOUCHE.len : T_STO_INT.len);
      if (b.s >= 1) { bouchees.splice(j, 1); if (b.c === 'intestin') { coupees++; for (let q = 0; q < 3; q++) absP.push({ s: -q * 0.03, o: Math.random() - 0.5 }); } }
    }
    for (const p of absP) p.s += (v * 0.7 * dt) / T_INTESTIN_FOIE.len;
    for (let j = absP.length - 1; j >= 0; j--) if (absP[j].s >= 1) { absP.splice(j, 1); if (sang.length < cible + 25) sang.push({ b: 6, s: 0.62 + Math.random() * 0.1, o: Math.random() - 0.5 }); }
    spawnFoie += i.PGE * 3 * k * dt * 4;
    while (spawnFoie >= 1) { spawnFoie -= 1; if (sang.length < cible + 15) sang.push({ b: 6, s: 0.62 + Math.random() * 0.1, o: Math.random() - 0.5 }); }
    // Rattrapage doux vers la densité cible.
    if (sang.length < cible - 8) sang.push({ b: tire(), s: Math.random(), o: Math.random() - 0.5 });
    // Puits : cerveau, muscles, graisse, reins (urines) ; probabilités selon les flux de l'instant.
    const total = Math.max(0.2, i.Ucer + i.Uins + i.Ueff + i.Urein);
    const pOrg: Record<Organe, number> = {
      cerveau: (i.Ucer / total), muscles: ((i.Uins * 0.75 + i.Ueff) / total), graisse: (i.Uins * 0.25 / total), reins: (i.Urein / total), foie: 0,
    };
    const exces = sang.length > cible + 6 ? 1.6 : sang.length < cible - 6 ? 0.25 : 1;
    for (let j = sang.length - 1; j >= 0; j--) {
      const p = sang[j]; const b = BOUCLES[p.b];
      const avant = p.s;
      p.s += (v * dt) / b.c.len;
      if (avant < 0.5 && p.s >= 0.5) {
        const pr = clamp(pOrg[b.org] * 1.4 * exces, 0, 0.95);
        if (Math.random() < pr) {
          glow[b.org] = Math.min(1, glow[b.org] + 0.06);
          if (b.org === 'reins') urine.push({ k: p.b === 3 ? 0 : 1, s: 0 });
          sang.splice(j, 1); continue;
        }
      }
      if (p.s >= 1) { p.s -= 1; p.b = tire(); }
    }
    if (i.Urein > 0.02) { spawnUr += i.Urein * 6 * dt; while (spawnUr >= 1) { spawnUr -= 1; urine.push({ k: Math.random() < 0.5 ? 0 : 1, s: 0 }); } }
    for (const u of urine) u.s += dt * 0.6;
    for (let j = urine.length - 1; j >= 0; j--) if (urine[j].s >= 1) { urine.splice(j, 1); vessie = Math.min(1, vessie + 0.04); }
    vessie = Math.max(0, vessie - dt * 0.03);
    for (const o of Object.keys(glow) as Organe[]) glow[o] = Math.max(0, glow[o] - dt * 0.6);
    // Hormones : GLP-1 libéré par l'intestin au repas (renforcé par les iDPP-4) ; glucagon quand le sucre baisse.
    const trt = e.traitement;
    accGlp += (i.Ra / (i.Ra + 3)) * (e.terrain.inc + ((trt.idpp4 ?? 0) > 0 ? 0.8 : 0)) * 10 * k * dt;
    while (accGlp >= 1) { accGlp -= 1; horm.push({ c: GLP1, s: 0, o: Math.random() - 0.5, coul: 'glp1' }); }
    accGlu += clamp(i.glucagon - 0.6, 0, 3) * 9 * k * dt;
    while (accGlu >= 1) { accGlu -= 1; horm.push({ c: GLUCAGON, s: 0, o: Math.random() - 0.5, coul: 'glucagon' }); }
    for (const h of horm) h.s += (90 * dt) / h.c.len;
    for (let j = horm.length - 1; j >= 0; j--) if (horm[j].s >= 1) horm.splice(j, 1);
    // Insuline : densité proportionnelle à l'insuline du sang ; source pancréas ou site d'injection.
    const cibleIns = Math.round(clamp(i.I, 0, 120) * 0.3 * k);
    spawnIns += (i.S * 1.6 + (i.injection ? 6 : 0)) * k * dt;
    while (spawnIns >= 1 && ins.length < cibleIns + 6) { spawnIns -= 1; ins.push({ c: i.S > 0.3 || !i.injection ? INS_PANC : INS_INJ, b: tire(), s: 0, o: Math.random() - 0.5, vie: 6 + Math.random() * 6 }); }
    if (spawnIns > 3) spawnIns = 3;
    if (ins.length < cibleIns - 4 && i.I > 2) ins.push({ c: null, b: tire(), s: Math.random(), o: Math.random() - 0.5, vie: 6 });
    for (let j = ins.length - 1; j >= 0; j--) {
      const p = ins[j]; p.vie -= dt;
      if (p.c) { p.s += (v * 0.8 * dt) / p.c.len; if (p.s >= 1) { p.c = null; p.s = 0; } }
      else { p.s += (v * dt) / BOUCLES[p.b].c.len; if (p.s >= 1) { p.s -= 1; p.b = tire(); } }
      if (p.vie <= 0 || ins.length > cibleIns + 10) ins.splice(j, 1);
    }
  }

  function dessiner(c: Contexte, i: Instant) {
    const { g, etat: e, texte, temps } = c;
    const t = e?.terrain;
    const fx = effetsVisibles(e);
    const G = i.G;

    // Silhouette.
    g.fillStyle = 'rgba(160,175,205,.07)'; g.strokeStyle = 'rgba(180,195,225,.28)'; g.lineWidth = 2;
    g.beginPath();
    g.ellipse(300, 70, 54, 62, 0, 0, Math.PI * 2);
    g.moveTo(276, 126); g.lineTo(272, 160); g.lineTo(190, 178); g.quadraticCurveTo(160, 188, 152, 232); g.lineTo(122, 512); g.lineTo(152, 516); g.lineTo(184, 292);
    g.lineTo(196, 462); g.lineTo(192, 570); g.lineTo(214, 920); g.lineTo(276, 920); g.lineTo(298, 610); g.lineTo(302, 610); g.lineTo(324, 920); g.lineTo(386, 920);
    g.lineTo(408, 570); g.lineTo(404, 462); g.lineTo(416, 292); g.lineTo(448, 516); g.lineTo(478, 512); g.lineTo(448, 232); g.quadraticCurveTo(440, 188, 410, 178); g.lineTo(328, 160); g.lineTo(324, 126); g.closePath();
    g.fill(); g.stroke();

    // Graisse abdominale (plus marquée dans le type 2).
    const gras = t?.type === 't2' ? 0.22 : t?.type === 'prediabete' ? 0.14 : 0.06;
    g.fillStyle = `rgba(250,204,120,${gras})`; g.beginPath(); g.ellipse(300, 485, 118, 70, 0, 0, 7); g.fill();
    if (glow.graisse > 0.05) { g.fillStyle = `rgba(250,204,120,${0.25 * glow.graisse})`; g.beginPath(); g.ellipse(410, 490, 26, 50, 0, 0, 7); g.fill(); }

    // Cerveau : s'assombrit et clignote en hypoglycémie.
    const hypo = G < 70;
    const fc = hypo ? 0.35 + 0.25 * Math.abs(Math.sin(temps * 5)) : 1;
    g.fillStyle = hypo ? `rgba(150,90,220,${0.55 + 0.3 * Math.abs(Math.sin(temps * 5))})` : mix([120, 100, 130], [236, 150, 170], fc); g.globalAlpha = 0.6;
    g.beginPath(); g.ellipse(300, 62, 40, 32, 0, 0, 7); g.fill(); g.globalAlpha = 1;
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(300 + (k - 2) * 14, 62, 12, 0.3, 2.6); g.stroke(); }
    if (glow.cerveau > 0.05) { g.fillStyle = `rgba(245,176,39,${0.25 * glow.cerveau})`; g.beginPath(); g.ellipse(300, 62, 44, 36, 0, 0, 7); g.fill(); }
    // Yeux (rétinopathie : taches rouges).
    for (const x of [284, 316]) {
      g.fillStyle = '#e9eef8'; g.beginPath(); g.ellipse(x, 82, 9, 6, 0, 0, 7); g.fill();
      g.fillStyle = (t?.retino ?? 0) > 0.05 ? '#c2410c' : '#7dd3fc'; g.beginPath(); g.arc(x, 82, 4, 0, 7); g.fill();
      if ((t?.retino ?? 0) > 0.05) { g.fillStyle = '#ef4444'; for (let k = 0; k < Math.round(2 + 5 * t!.retino); k++) { g.beginPath(); g.arc(x - 6 + ((k * 37) % 12), 78 + ((k * 23) % 8), 1.2, 0, 7); g.fill(); } }
    }

    // Cœur (coronaropathie : zone sombre).
    g.save(); g.translate(COEUR[0], COEUR[1]); g.rotate(-0.5);
    const sc = 1 + 0.04 * Math.max(0, Math.sin(temps * 7.2));
    g.scale(sc, sc);
    const grad = g.createRadialGradient(-6, -8, 4, 0, 0, 34); grad.addColorStop(0, '#e05a62'); grad.addColorStop(1, '#8e1f2a');
    g.fillStyle = grad; g.beginPath(); g.moveTo(0, 26); g.bezierCurveTo(-34, 5, -31, -22, -12, -24); g.bezierCurveTo(-3, -26, 0, -17, 0, -14);
    g.bezierCurveTo(0, -17, 3, -26, 12, -24); g.bezierCurveTo(31, -22, 34, 5, 0, 26); g.fill();
    if ((t?.coronaire ?? 0) > 0.05) { g.fillStyle = 'rgba(60,55,85,.7)'; g.beginPath(); g.ellipse(9, 10, 10, 8, 0, 0, 7); g.fill(); }
    g.restore();

    // Vaisseaux principaux : aorte et veine cave.
    const ligne = (pts: Pt[], l: number, coul: string) => { g.strokeStyle = coul; g.lineWidth = l; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(...pts[0]); for (const p of pts.slice(1)) g.lineTo(...p); g.stroke(); };
    for (const b of BOUCLES) { const n = b.c.pts.length; const mi = Math.floor(n / 2); ligne(b.c.pts.slice(0, mi + 1), 4, 'rgba(201,66,79,.55)'); ligne(b.c.pts.slice(mi), 4, 'rgba(90,111,200,.5)'); }
    ligne([COEUR, [306, 330], [304, 540]], 9, 'rgba(201,66,79,.75)');
    ligne([[296, 545], [296, 330], [300, 280]], 8, 'rgba(90,111,200,.7)');

    // Foie : ambre quand il relâche du sucre, bleuté quand il stocke.
    const relache = clamp(i.PGE / 3, 0, 1), stocke = clamp((i.I - 15) / 60, 0, 1) * (i.Ra > 0.5 ? 1 : 0.3);
    g.fillStyle = mix([120, 60, 50], [205, 110, 60], relache); g.globalAlpha = 0.75;
    g.beginPath(); g.moveTo(200, 330); g.quadraticCurveTo(230, 306, 318, 318); g.quadraticCurveTo(318, 360, 280, 372); g.quadraticCurveTo(220, 380, 200, 330); g.fill(); g.globalAlpha = 1;
    if (stocke > 0.1) { g.fillStyle = `rgba(56,189,248,${0.25 * stocke})`; g.beginPath(); g.ellipse(258, 342, 46, 22, 0, 0, 7); g.fill(); }
    // Grains de glycogène (réserve).
    g.fillStyle = 'rgba(255,230,170,.55)';
    const nGly = Math.round(4 + 8 * clamp(stocke + 0.3 - relache * 0.3, 0, 1));
    for (let k = 0; k < nGly; k++) { g.beginPath(); g.arc(222 + ((k * 29) % 80), 330 + ((k * 17) % 32), 2.2, 0, 7); g.fill(); }

    // Estomac et intestin.
    g.fillStyle = i.Ra > 0.3 ? 'rgba(245,176,39,.35)' : 'rgba(230,160,170,.25)'; g.strokeStyle = 'rgba(240,190,200,.45)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(356, 344, 34, 24, -0.4, 0, 7); g.fill(); g.stroke();
    const est = c.etat ? estomac(c.etat, i.heure) : { g: 0, vidange: 0, repasEnCours: null };
    const nSto = Math.min(16, Math.round(est.g / 10));
    for (let k = 0; k < nSto; k++) { const [px, py] = POS_ESTOMAC[k]; bouchee(g, px + Math.sin(temps * 3 + k) * 1.5, py, 4.5); }
    g.strokeStyle = i.Ra > 0.3 ? 'rgba(245,176,39,.75)' : 'rgba(240,180,190,.45)'; g.lineWidth = 7;
    g.beginPath(); g.moveTo(258, 452);
    for (let k = 0; k < 4; k++) { const y = 456 + k * 18; g.bezierCurveTo(250, y + 6, 352, y, 344, y + 9); g.bezierCurveTo(352, y + 14, 250, y + 12, 258, y + 18); }
    g.stroke();
    // Pancréas : s'allume avec la sécrétion d'insuline.
    const sec = clamp(i.S / 6, 0, 1), betaOk = (t?.beta ?? 1) > 0.02;
    g.fillStyle = betaOk ? mix([200, 170, 150], [80, 200, 250], sec) : 'rgba(120,120,135,.6)';
    g.beginPath(); g.moveTo(292, 396); g.quadraticCurveTo(330, 380, 384, 386); g.quadraticCurveTo(388, 398, 378, 400); g.quadraticCurveTo(330, 404, 296, 406); g.closePath(); g.fill();

    // Reins et vessie.
    const pale = clamp(Math.max(t?.nephro ?? 0, 1 - (t?.rein ?? 1) * 1.2), 0, 1);
    for (const x of [232, 376]) { g.fillStyle = mix([200, 80, 90], [170, 150, 150], pale); g.beginPath(); g.ellipse(x, 425, 15, 23, 0, 0, 7); g.fill(); if (glow.reins > 0.05) { g.fillStyle = `rgba(245,176,39,${0.35 * glow.reins})`; g.beginPath(); g.ellipse(x, 425, 18, 26, 0, 0, 7); g.fill(); } }
    g.strokeStyle = 'rgba(250,230,150,.35)'; g.lineWidth = 2.5;
    for (const u of URINE) { g.beginPath(); g.moveTo(...u.pts[0]); for (const p of u.pts.slice(1)) g.lineTo(...p); g.stroke(); }
    g.fillStyle = 'rgba(250,230,150,.18)'; g.strokeStyle = 'rgba(250,230,150,.45)'; g.lineWidth = 1.5;
    g.beginPath(); g.ellipse(300, 580, 26, 18, 0, 0, 7); g.fill(); g.stroke();
    if (vessie > 0.02) { for (let k = 0; k < Math.round(vessie * 12); k++) hexagone(g, 286 + ((k * 13) % 28), 574 + ((k * 7) % 12), 2.6); }
    for (const u of urine) { const [x, y] = at(URINE[u.k], u.s); hexagone(g, x, y, 2.6); }

    // Muscles des cuisses.
    const faim = G > 160 && i.Uins < 1.2 && !i.effort;
    for (const x of [250, 350]) {
      g.fillStyle = i.effort ? `rgba(110,231,183,${0.3 + 0.2 * Math.abs(Math.sin(temps * 4))})` : faim ? 'rgba(150,90,220,.28)' : 'rgba(225,140,150,.22)';
      g.beginPath(); g.ellipse(x, 690, 32, 82, 0, 0, 7); g.fill();
      if (glow.muscles > 0.05) { g.fillStyle = `rgba(245,176,39,${0.3 * glow.muscles})`; g.beginPath(); g.ellipse(x, 690, 34, 84, 0, 0, 7); g.fill(); }
    }
    // Nerfs des jambes (neuropathie : scintillements).
    const neuro = t?.neuro ?? 0;
    g.strokeStyle = neuro > 0.05 ? `rgba(250,204,21,${0.35 + 0.4 * Math.abs(Math.sin(temps * 6))})` : 'rgba(250,224,120,.28)'; g.lineWidth = 1.5;
    for (const x of [236, 364]) { g.beginPath(); g.moveTo(x, 600); g.lineTo(x + (x < 300 ? -2 : 2), 760); g.lineTo(x + (x < 300 ? 4 : -4), 900); g.stroke(); }
    // Pieds (plaie).
    for (const [x, sx] of [[236, -1], [364, 1]] as const) {
      g.fillStyle = neuro > 0.4 ? 'rgba(160,150,190,.45)' : 'rgba(200,175,185,.35)'; g.beginPath(); g.ellipse(x + sx * 6, 914, 28, 10, 0, 0, 7); g.fill();
    }
    if ((t?.pied ?? 0) > 0.05) { g.fillStyle = '#7f1d1d'; g.strokeStyle = '#fb7185'; g.lineWidth = 1.5; g.beginPath(); g.arc(240, 916, 4 + 3 * t!.pied, 0, 7); g.fill(); g.stroke(); }

    // Encart « sang » : globules rouges et HbA1c.
    {
      const x0 = 110, y0 = 300, r = 58;
      g.save(); g.beginPath(); g.arc(x0, y0, r, 0, 7); g.fillStyle = 'rgba(60,10,20,.75)'; g.fill(); g.clip();
      const hb = e ? clamp((e.stats.hba1c - 4) / 8, 0, 1) : 0.1;
      for (let k = 0; k < 9; k++) {
        const ax = x0 - 34 + (k % 3) * 34 + Math.sin(temps * 0.6 + k) * 3, ay = y0 - 30 + Math.floor(k / 3) * 30;
        g.fillStyle = '#c0283a'; g.beginPath(); g.ellipse(ax, ay, 13, 9, 0.3, 0, 7); g.fill();
        g.fillStyle = '#8f1b2a'; g.beginPath(); g.ellipse(ax, ay, 5, 3, 0.3, 0, 7); g.fill();
        if ((k * 0.11 + 0.05) < hb) hexagone(g, ax + 9, ay - 6, 3.2);
      }
      const nG = Math.round(clamp(G / 100, 0.2, 5) * 5);
      for (let k = 0; k < nG; k++) hexagone(g, x0 - 46 + ((k * 31 + Math.floor(temps * 20)) % 92), y0 - 46 + ((k * 47) % 92), 2.4);
      g.restore();
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.arc(x0, y0, r, 0, 7); g.stroke();
      if (c.labels || c.choisi === 'globules') texte(`HbA1c ${e ? e.stats.hba1c.toFixed(1).replace('.', ',') : '–'} %`, x0, y0 + r + 14);
    }

    // Flèches de flux : épaisseur selon la quantité de glucose qui passe (g/heure, adulte de 70 kg).
    {
      const fleche = (cc: Chemin, flux: number, coul: string, label0: string | null, lx?: number, ly?: number) => {
        if (flux < 0.02) return;
        const label = tr ? null : label0;
        const w = 1.5 + Math.min(9, flux * 2.6);
        g.save(); g.strokeStyle = coul; g.globalAlpha = 0.55; g.lineWidth = w; g.lineCap = 'round'; g.setLineDash([10, 9]); g.lineDashOffset = -temps * 40;
        g.beginPath(); g.moveTo(...cc.pts[0]); for (const q of cc.pts.slice(1)) g.lineTo(...q); g.stroke(); g.restore();
        const [x1, y1] = at(cc, 0.97), [x2, y2] = at(cc, 1); const a = Math.atan2(y2 - y1, x2 - x1);
        g.fillStyle = coul; g.beginPath(); g.moveTo(x2 + Math.cos(a) * 6, y2 + Math.sin(a) * 6); g.lineTo(x2 + Math.cos(a + 2.5) * (6 + w), y2 + Math.sin(a + 2.5) * (6 + w)); g.lineTo(x2 + Math.cos(a - 2.5) * (6 + w), y2 + Math.sin(a - 2.5) * (6 + w)); g.closePath(); g.fill();
        if (label) { const [mx, my] = at(cc, 0.5); texte(label, lx ?? mx, ly ?? my, coul, 11); }
      };
      const v = (x: number) => `${(x * 4.2).toFixed(0)} g/h`;
      fleche(T_INTESTIN_FOIE, i.Ra, '#f5b027', i.Ra > 0.05 ? `Repas +${v(i.Ra)}` : null, 196, 432);
      fleche(T_FOIE_COEUR, i.PGE, '#f5b027', `Foie +${v(i.PGE)}`, 214, 300);
      fleche(ARTERES[0], i.Ucer, '#f5b027', `Cerveau −${v(i.Ucer)}`, 372, 150);
      const musc = i.Uins * 0.75 + i.Ueff;
      fleche(ARTERES[1], musc / 2, '#f5b027', `Muscles −${v(musc)}`, 170, 700);
      fleche(ARTERES[2], musc / 2, '#f5b027', null);
      fleche(ARTERES[5], i.Uins * 0.25, '#f5b027', `Graisse −${v(i.Uins * 0.25)}`, 470, 520);
      if (i.Urein > 0.02) { fleche(URINE[0], i.Urein / 2, '#f5b027', `Urines −${v(i.Urein)}`, 196, 540); fleche(URINE[1], i.Urein / 2, '#f5b027', null); }
    }
    // Particules : glucose absorbé, glucose du sang, insuline.
    for (const b of bouchees) { const [x, y] = at(b.c === 'bouche' ? T_BOUCHE : T_STO_INT, b.s); if (b.c === 'intestin' && b.s > 0.8) { const f = (b.s - 0.8) / 0.2; bouchee(g, x + b.o * 4, y, 5 * (1 - f) + 1); for (let q = 0; q < 3; q++) hexagone(g, x + Math.cos(q * 2.1) * 9 * f, y + Math.sin(q * 2.1) * 9 * f, 3.2 * f); } else bouchee(g, x + b.o * 4, y, 5); }
    for (const p of absP) { if (p.s < 0) continue; const [x, y] = at(T_INTESTIN_FOIE, p.s); hexagone(g, x + p.o * 4, y, 3.4); }
    for (const p of sang) { const [x, y] = at(BOUCLES[p.b].c, p.s); hexagone(g, x + p.o * 4, y + p.o * 2, 3); }
    for (const p of ins) { const [x, y] = p.c ? at(p.c, p.s) : at(BOUCLES[p.b].c, p.s); cle(g, x - p.o * 4, y, 3.4, 0); }

    for (const h of horm) { const [x, y] = at(h.c, h.s); if (h.coul === 'glp1') losange(g, x + h.o * 3, y, 4); else triangle(g, x + h.o * 3, y, 4.2); }
    if (i.glucagon > 1.15 && !tr) texte('Glucagon : le pancréas demande au foie de libérer du sucre', 160, 270, '#d8b4fe');
    // Site d'injection.
    if (i.injection) { g.strokeStyle = COUL.insuline; g.lineWidth = 2; g.beginPath(); g.moveTo(392, 506); g.lineTo(374, 520); g.stroke(); g.fillStyle = COUL.insuline; g.beginPath(); g.arc(372, 521, 3, 0, 7); g.fill(); texte(i.injection, 450, 506, '#7dd3fc'); }
    // Graisses libérées sans insuline (type 1 non traité) : vers le foie, corps cétoniques.
    if (e && e.risques.cetose >= 1 && !tr) {
      for (let k = 0; k < 8; k++) { const s = ((temps * 0.25 + k / 8) % 1); g.fillStyle = 'rgba(250,204,120,.85)'; g.beginPath(); g.arc(lerp(400, 270, s), lerp(480, 350, s), 2.6, 0, 7); g.fill(); }
      texte('Sans insuline : graisses brûlées → corps cétoniques (acidocétose)', 300, 600, '#fb7185');
    }

    // Messages.
    if (!tr) {
    if (hypo) texte('Hypoglycémie : le cerveau manque de sucre', 300, 132, '#d6b4ff');
    if (i.Urein > 0.05) texte('Sucre dans les urines', 300, 612, '#fde68a');
    if (faim) texte('Muscles affamés : le sucre n\'entre pas', 300, 790, '#d6b4ff');
    if (i.effort) texte('Effort : les muscles captent le sucre sans insuline', 300, 790, '#6ee7b7');
    if (est.repasEnCours) texte(`${est.repasEnCours.nom} : ${est.repasEnCours.g} g de glucides avalés`, 168, 214, '#e9d5b5');
    if (est.g > 3) texte(`Estomac : ${Math.round(est.g)} g à digérer`, 500, 324, '#e9d5b5');
    else if (i.Ra > 0.3) texte('Estomac vide : l\'intestin finit le repas', 500, 324, '#e9d5b5');
    else texte('À jeun : le sucre vient du foie', 500, 324, '#94a3b8');
    if (est.vidange > 0.15 && coupees > 0) texte('Intestin : l\'amidon est coupé en glucose', 452, 470, '#fde68a');
    if (!betaOk) texte('Pancréas : plus de cellules bêta', 470, 392, '#94a3b8');
    if (fx.foieFreine) texte('Metformine : le foie relâche moins de sucre', 190, 246, '#6ee7b7');
    if (fx.pancreasForce) texte('Sulfamide : insuline libérée en continu', 470, 414, '#6ee7b7');
    if (fx.incretines && !fx.estomacRalenti) texte('iDPP-4 : incrétines renforcées', 470, 414, '#6ee7b7');
    if (fx.estomacRalenti) texte('aGLP-1 : estomac ralenti, satiété', 470, 360, '#6ee7b7');
    if (fx.sucreUrinaire) texte('iSGLT2 : le sucre part dans les urines', 470, 444, '#6ee7b7');
    if (fx.sansEffet) texte('Sans cellules bêta, le comprimé n\'agit pas', 470, 438, '#fbbf24');
    if ((t?.retino ?? 0) > 0.05) texte('Rétinopathie', 380, 100, '#fca5a5');
    if (neuro > 0.05) texte('Neuropathie : fourmillements, pieds insensibles', 300, 860, '#fde68a');
    if ((t?.pied ?? 0) > 0.05) texte('Plaie du pied', 160, 916, '#fb7185');
    if ((t?.coronaire ?? 0) > 0.05) texte('Artères du cœur atteintes', 420, 240, '#fca5a5');
    if (pale > 0.05) texte((t?.nephro ?? 0) > 0.05 ? 'Reins abîmés (néphropathie)' : 'Reins qui filtrent moins', 160, 456, '#fca5a5');
    if (t?.type === 'gestationnel') texte('Grossesse : les hormones du placenta gênent l\'insuline', 300, 452, '#f9a8d4');
    if (t?.ramadan && i.heure > 5.5 && i.heure < 19.5) texte('Ramadan : jeûne jusqu\'au ndogu', 452, 300, '#fde68a');

    }
    // Molécule suivie.
    if (tr) {
      const [x, y] = tr.pt; const coul = tr.type === 'glucose' ? '#fbbf24' : '#38bdf8';
      for (let k = 0; k < tr.traine.length; k++) { const q = tr.traine[k]; g.fillStyle = coul; g.globalAlpha = (k / tr.traine.length) * 0.5; g.beginPath(); g.arc(q[0], q[1], 3, 0, 7); g.fill(); }
      g.globalAlpha = 1;
      g.strokeStyle = coul; g.lineWidth = 2; g.globalAlpha = 0.35 + 0.3 * Math.abs(Math.sin(temps * 4)); g.beginPath(); g.arc(x, y, 16, 0, 7); g.stroke(); g.globalAlpha = 1;
      if (tr.type === 'glucose') hexagone(g, x, y, 8, coul); else cle(g, x, y, 7, 0, coul);
      texte(tr.type === 'glucose' ? 'Glucose suivi' : 'Insuline suivie', x, y - 28, coul, 11);
    }
    if (c.labels) {
      texte('Cerveau', 300, 14); texte('Cœur', 372, 262); texte('Foie', 196, 360); texte('Estomac', 412, 344); texte('Pancréas', 350, 372);
      texte('Intestin', 300, 540); texte('Veine porte', 210, 410); texte('Reins', 232, 462); texte('Graisse', 440, 470); texte('Muscles', 300, 660);
      texte('Vessie', 300, 600); texte('Nerfs', 380, 830); texte('Pieds', 300, 934); texte('Sang', 330, 450);
    }
    void G;
  }

  function objet(c: Contexte, [x, y]: Pt): string | null {
    const pres = (q: Pt, r = 7) => Math.hypot(q[0] - x, q[1] - y) < r;
    if (tr && pres(tr.pt, 14)) return tr.type === 'glucose' ? 'Molécule de glucose suivie' : 'Molécule d\'insuline suivie';
    for (const b of bouchees) if (pres(at(b.c === 'bouche' ? T_BOUCHE : T_STO_INT, b.s), 8)) return 'Bouchée de repas : 10 g de glucides (amidon), pas encore digérés';
    for (const p of absP) if (p.s >= 0 && pres(at(T_INTESTIN_FOIE, p.s))) return 'Glucose du repas : absorbé par l\'intestin, il part au foie par la veine porte';
    for (const h of horm) if (pres(at(h.c, h.s))) return h.coul === 'glp1' ? 'GLP-1 (incrétine) : l\'intestin prévient le pancréas qu\'un repas arrive' : 'Glucagon : le pancréas demande au foie de libérer du sucre';
    for (const p of ins) if (pres(p.c ? at(p.c, p.s) : at(BOUCLES[p.b].c, p.s))) return 'Insuline (la clé) : elle fait entrer le glucose dans les muscles et la graisse';
    for (const p of sang) if (pres(at(BOUCLES[p.b].c, p.s))) return 'Glucose dans le sang (hexagone doré)';
    if (Math.hypot(x - 110, y - 300) < 58) return 'Globules rouges : le sucre colle à l\'hémoglobine (HbA1c)';
    return null;
  }

  const base = creerScene2D(conteneur, opt, {
    W, H, regions: REGIONS, dessiner, avancer, sMax: 5,
    repli: { ilot: 'pancreas' },
    suivi: () => (tr && !tr.fini ? tr.pt : null),
    objet,
  });
  return {
    ...base,
    suivre(type, onJournal) {
      tr = type ? { type, c: null, s: 0, attente: 0, lignes: [], fini: false, boucles: 0, apres: null, traine: [], pt: [356, 344], onJ: onJournal } : null;
      if (!type) base.focus(null);
    },
  };
}
