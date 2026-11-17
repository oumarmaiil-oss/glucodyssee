/**
 * Vue « cellule » : la clé et la porte.
 *  - Muscle : récepteurs de l'insuline (Y) sur la membrane, transporteurs GLUT4 qui montent à la surface
 *    selon l'action de l'insuline (et l'effort, par une autre voie), glucose qui entre au rythme du moteur.
 *    Type 2 : serrures « grippées » (gouttelettes de graisse dans la cellule, cascade qui répond mal).
 *  - Foie : glycogène stocké ou libéré, glucose qui sort (production hépatique) ou entre, glucagon et insuline.
 *  - En haut, un capillaire où le sang circule (globules rouges, glucose, insuline) ; le glucose en sort et traverse
 *    le liquide autour de la cellule jusqu'à la membrane.
 */
import { clamp, COUL, creerScene2D, cle, hexagone, lerp, type Contexte, type OptionsRendu, type Pt, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';
import { effetsVisibles } from '../core/effets.ts';

const W = 640, H = 560, MEMB = 210;
/** Capillaire sanguin (haut et bas de sa paroi) et vitesse du sang (unités de scène par seconde). */
const CAP_T = 30, CAP_B = 98, FLUX = 95;
const yCap = () => CAP_T + 9 + Math.random() * (CAP_B - CAP_T - 18);
const N_REC = 7;
const RECEPTEURS = Array.from({ length: N_REC }, (_, k) => 70 + k * 84);
const N_GLUT = 8;

export interface ReglageAtelier { ins: number; res: boolean; effort: boolean }
export interface StatsAtelier { sang: number; gl: number; entrees: number; foie: number }

export function creerCellule2D(conteneur: HTMLElement, opt: OptionsRendu = {}, siteInitial = 'muscle'): Rendu & { setAtelier(r: ReglageAtelier | null, onStats?: (s: StatsAtelier) => void): void } {
  const sang: { x: number; y: number; v: number }[] = [];
  const entres: { x: number; y: number; vy: number; vie: number }[] = [];
  const sortants: { x: number; y: number; vy: number; vie: number }[] = [];
  const globules = Array.from({ length: 8 }, (_, k) => ({ x: k * 84 + Math.random() * 30, y: yCap(), v: FLUX * (0.9 + Math.random() * 0.2), a: Math.random() * 3 }));
  const diffusion: { x: number; y: number; vy: number; vie: number }[] = [];
  let accD = 0;
  const glut = Array.from({ length: N_GLUT }, (_, k) => ({ x: 110 + k * 62, pos: 0 })); // pos 0 = en réserve, 1 = à la membrane
  let accE = 0, accS = 0, glycogene = 0.5;
  // Atelier « La clé et la porte » : un petit système fermé sang / muscle / foie que l'on règle à la main.
  // Modèle simplifié : le foie relâche du sucre (freiné par l'insuline, relancé par le glucagon quand le sucre baisse) ;
  // le muscle en capte selon le nombre de portes GLUT4 ouvertes.
  let atelier: ReglageAtelier | null = null, onStats: ((s: StatsAtelier) => void) | undefined;
  let pool = 60, accFoie = 0, tStats = 0, entreesRecentes = 0, foieRecent = 0;

  const regions = (site: string): Region[] => [{ z: site === 'foie' ? 'foie' : 'muscles', x: 20, y: MEMB - 10, w: W - 40, h: H - MEMB }, { z: 'sang', x: 20, y: 20, w: W - 40, h: MEMB - 40 }];

  function action(c: Contexte, i: Instant) {
    if (atelier) return { ins: atelier.ins, porte: clamp(atelier.ins * (atelier.res ? 0.35 : 1) * 1.15 + (atelier.effort ? 0.55 : 0), 0, 1) };
    const t = c.etat?.terrain;
    const metf = (c.etat?.traitement.metformine ?? 0) > 0 ? 1.25 : 1;
    const ins = i.I / (i.I + 40);
    return { ins, porte: clamp(ins * (t?.si ?? 1) * metf * 1.3 + (i.effort ? 0.5 : 0), 0, 1) };
  }

  /** Le sang circule ; une partie du glucose sort du capillaire et rejoint la cellule. */
  function circuler(dt: number, glucose: number) {
    for (const q of globules) { q.x += q.v * dt; q.a += dt; if (q.x > W + 14) { q.x = -14; q.y = yCap(); } }
    accD += clamp(glucose / 100, 0.2, 4) * 3 * dt;
    while (accD >= 1) { accD -= 1; diffusion.push({ x: 30 + Math.random() * (W - 60), y: CAP_B + 2, vy: 26 + Math.random() * 18, vie: 1 }); }
    for (const d of diffusion) { d.y += d.vy * dt; d.x += Math.sin(d.y * 0.15) * 6 * dt; if (d.y > MEMB - 46) d.vie -= dt * 2.5; }
    for (let j = diffusion.length - 1; j >= 0; j--) if (diffusion[j].vie <= 0) diffusion.splice(j, 1);
    if (diffusion.length > 60) diffusion.splice(0, diffusion.length - 60);
  }

  function avancer(c: Contexte, i: Instant, dt: number) {
    const e = c.etat; if (!e) return;
    const foie = c.site === 'foie';
    circuler(dt, atelier && !foie ? (pool / 60) * 95 : foie && i.PGE > 1.6 ? 0 : i.G);
    if (atelier && !foie) {
      const { ins, porte } = action(c, i);
      const sortieFoie = 4.5 * (1 - 0.75 * ins) + (pool < 44 ? 0.5 : 0);
      accFoie += sortieFoie * dt;
      while (accFoie >= 1) { accFoie -= 1; foieRecent++; if (pool < 110) pool++; }
      accE += 0.06 * porte * pool * dt;
      while (accE >= 1 && pool > 0) { accE -= 1; pool--; entreesRecentes++; const ouverts = glut.filter((x) => x.pos > 0.8); const gt = ouverts.length ? ouverts[(Math.random() * ouverts.length) | 0] : glut[0]; entres.push({ x: gt.x, y: MEMB - 6, vy: 60, vie: 2.4 }); }
      for (const gt of glut) gt.pos = lerp(gt.pos, clamp(porte * N_GLUT - (gt.x - 110) / 62, 0, 1), Math.min(1, dt * 2.5));
      while (sang.length < pool) sang.push({ x: Math.random() * W, y: yCap(), v: FLUX * (0.75 + Math.random() * 0.4) });
      if (sang.length > pool) sang.length = pool;
      for (const p of sang) { p.x += p.v * dt; if (p.x > W) p.x -= W; }
      for (const p of entres) { p.vie -= dt; p.y += p.vy * dt; }
      for (let j = entres.length - 1; j >= 0; j--) if (entres[j].vie <= 0) entres.splice(j, 1);
      tStats += dt;
      if (tStats > 2) { onStats?.({ sang: pool, gl: (pool / 60) * 0.95, entrees: entreesRecentes / tStats, foie: foieRecent / tStats }); tStats = 0; entreesRecentes = 0; foieRecent = 0; }
      return;
    }
    const cible = Math.round(clamp(i.G, 30, 450) / 5);
    while (sang.length < cible) sang.push({ x: Math.random() * W, y: yCap(), v: FLUX * (0.75 + Math.random() * 0.4) });
    if (sang.length > cible) sang.length = cible;
    for (const p of sang) { p.x += p.v * dt; if (p.x > W) p.x -= W; }
    const { porte } = action(c, i);
    for (const gt of glut) gt.pos = lerp(gt.pos, foie ? 1 : clamp(porte * N_GLUT - (gt.x - 110) / 62, 0, 1), Math.min(1, dt * 2.5));
    if (!foie) {
      accE += (i.Uins + i.Ueff) * 2.2 * dt;
      while (accE >= 1) { accE -= 1; const ouverts = glut.filter((x) => x.pos > 0.8); if (!ouverts.length) break; const gt = ouverts[(Math.random() * ouverts.length) | 0]; entres.push({ x: gt.x, y: MEMB - 6, vy: 60, vie: 2.4 }); }
    } else {
      // Foie : stockage quand l'insuline est haute après le repas, libération à jeun (production hépatique).
      const stockage = clamp((i.I - 15) / 50, 0, 1) * (i.Ra > 0.3 ? 1 : 0.2);
      glycogene = clamp(glycogene + (stockage * 0.25 - clamp(i.PGE / 3, 0, 1) * 0.12) * dt, 0.05, 1);
      accS += i.PGE * 1.6 * dt;
      while (accS >= 1) { accS -= 1; const gt = glut[(Math.random() * N_GLUT) | 0]; sortants.push({ x: gt.x, y: MEMB + 30, vy: -60, vie: 2 }); }
      accE += stockage * 4 * dt;
      while (accE >= 1) { accE -= 1; const gt = glut[(Math.random() * N_GLUT) | 0]; entres.push({ x: gt.x, y: MEMB - 6, vy: 60, vie: 2 }); }
    }
    if (accE > 4) accE = 4;
    for (const p of entres) { p.vie -= dt; p.y += p.vy * dt; }
    for (const p of sortants) { p.vie -= dt; p.y += p.vy * dt; }
    for (let j = entres.length - 1; j >= 0; j--) if (entres[j].vie <= 0) entres.splice(j, 1);
    for (let j = sortants.length - 1; j >= 0; j--) if (sortants[j].vie <= 0) sortants.splice(j, 1);
  }

  function dessiner(c: Contexte, i: Instant) {
    const { g, etat: e, texte, temps } = c;
    const t = e?.terrain;
    const foie = c.site === 'foie';
    const fx = effetsVisibles(e);
    const { ins, porte } = action(c, i);
    const resist = atelier ? atelier.res : (t?.si ?? 1) < 0.6;
    const effort = atelier ? atelier.effort : i.effort;
    // Sang (en haut) et cellule (en bas).
    // Liquide autour de la cellule, puis le capillaire où le sang circule.
    g.fillStyle = 'rgba(201,66,79,.06)'; g.fillRect(0, 20, W, MEMB - 20);
    g.fillStyle = 'rgba(201,66,79,.24)'; g.fillRect(0, CAP_T, W, CAP_B - CAP_T);
    g.save(); g.strokeStyle = 'rgba(255,214,214,.18)'; g.lineWidth = 2; g.setLineDash([16, 14]); g.lineDashOffset = -temps * FLUX;
    for (const yy of [CAP_T + 20, CAP_B - 20]) { g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    g.restore();
    for (const q of globules) {
      g.save(); g.translate(q.x, q.y); g.rotate(Math.sin(q.a) * 0.4);
      g.fillStyle = '#c9424f'; g.beginPath(); g.ellipse(0, 0, 11, 7, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(120,20,32,.55)'; g.beginPath(); g.ellipse(0, 0, 5, 3, 0, 0, 7); g.fill(); g.restore();
    }
    // Paroi du capillaire (cellules endothéliales, avec leurs noyaux).
    g.strokeStyle = 'rgba(250,200,200,.55)'; g.lineWidth = 3;
    for (const yy of [CAP_T, CAP_B]) { g.beginPath(); g.moveTo(0, yy); g.lineTo(W, yy); g.stroke(); }
    g.fillStyle = 'rgba(250,200,200,.4)';
    for (let x = 40; x < W; x += 110) { g.beginPath(); g.ellipse(x, CAP_T - 1, 13, 3.5, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(x + 55, CAP_B + 1, 13, 3.5, 0, 0, 7); g.fill(); }
    // Flèche du sens du sang.
    g.fillStyle = 'rgba(255,214,214,.75)'; const fx0 = W - 26; g.beginPath(); g.moveTo(fx0 + 12, (CAP_T + CAP_B) / 2); g.lineTo(fx0, (CAP_T + CAP_B) / 2 - 8); g.lineTo(fx0, (CAP_T + CAP_B) / 2 + 8); g.closePath(); g.fill();
    // Insuline transportée par le sang.
    const nClesSang = Math.round(ins * 6);
    for (let k = 0; k < nClesSang; k++) cle(g, (k * 113 + temps * FLUX * 0.9) % (W + 20) - 10, CAP_T + 14 + ((k * 23) % (CAP_B - CAP_T - 28)), 4.5, 0);
    // Glucose sorti du capillaire, qui va vers la membrane.
    for (const d of diffusion) { g.globalAlpha = clamp(d.vie, 0, 1) * 0.9; hexagone(g, d.x, d.y, 3); }
    g.globalAlpha = 1;
    texte('Le sang circule dans le capillaire →', W / 2, CAP_T - 11, '#fecaca', 10.5);
    g.fillStyle = foie ? 'rgba(180,90,60,.16)' : 'rgba(225,120,130,.13)'; g.fillRect(0, MEMB, W, H - MEMB);
    g.strokeStyle = 'rgba(250,210,190,.7)'; g.lineWidth = 6; g.beginPath(); g.moveTo(0, MEMB); g.lineTo(W, MEMB); g.stroke();
    g.strokeStyle = 'rgba(250,210,190,.35)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, MEMB + 8); g.lineTo(W, MEMB + 8); g.stroke();
    for (const p of sang) hexagone(g, p.x, p.y, 3.4);

    // Récepteurs de l'insuline (Y) ; clés fixées selon l'insuline du sang.
    const nCles = Math.round(ins * N_REC * 1.2);
    RECEPTEURS.forEach((x, k) => {
      g.strokeStyle = '#93c5fd'; g.lineWidth = 4; g.beginPath();
      g.moveTo(x, MEMB + 26); g.lineTo(x, MEMB - 12); g.moveTo(x, MEMB - 12); g.lineTo(x - 12, MEMB - 32); g.moveTo(x, MEMB - 12); g.lineTo(x + 12, MEMB - 32); g.stroke();
      if (k < nCles) cle(g, x, MEMB - 40 + Math.sin(temps * 2 + k) * 1.5, 6, -Math.PI / 2);
      // Serrure grippée (type 2) : la cascade sous le récepteur répond mal.
      if (!foie && resist) { g.fillStyle = 'rgba(251,191,36,.65)'; g.beginPath(); g.arc(x + 6, MEMB + 40, 6, 0, 7); g.fill(); g.beginPath(); g.arc(x - 8, MEMB + 52, 4, 0, 7); g.fill(); }
      if (foie && k % 2 === 1 && i.glucagon > 0.6) { g.fillStyle = COUL.glucagon; g.beginPath(); g.arc(x + 30, MEMB - 26, 5, 0, 7); g.fill(); }
    });
    // Transporteurs GLUT4 (muscle) ou GLUT2 (foie).
    for (const gt of glut) {
      const y = lerp(MEMB + 120, MEMB, gt.pos);
      g.fillStyle = gt.pos > 0.8 ? '#34d399' : 'rgba(52,211,153,.45)';
      g.beginPath(); g.roundRect(gt.x - 9, y - 12, 18, 24, 5); g.fill();
      g.fillStyle = 'rgba(7,10,18,.8)'; g.fillRect(gt.x - 2.5, y - 12, 5, 24);
      if (gt.pos < 0.5 && !foie) { g.strokeStyle = 'rgba(52,211,153,.4)'; g.lineWidth = 1.5; g.beginPath(); g.arc(gt.x, y, 18, 0, 7); g.stroke(); }
    }
    for (const p of entres) hexagone(g, p.x, p.y, 3.4);
    for (const p of sortants) hexagone(g, p.x, p.y, 3.4);

    // Cascade de signalisation sous les deux premiers récepteurs : IRS → PI3K → Akt → GLUT4.
    if (!foie) {
      const res = resist;
      const nCl = Math.round(ins * N_REC * 1.2);
      for (const [k, x] of RECEPTEURS.slice(0, 2).entries()) {
        const actif = k < nCl;
        const pts: [number, number, string][] = [[x, MEMB + 52, 'IRS'], [x + 26, MEMB + 92, 'PI3K'], [x + 52, MEMB + 132, 'Akt']];
        g.strokeStyle = actif ? (res ? 'rgba(251,191,36,.55)' : 'rgba(110,231,183,.8)') : 'rgba(148,163,184,.3)'; g.lineWidth = 2; g.setLineDash(res ? [4, 5] : []);
        g.beginPath(); g.moveTo(x, MEMB + 26); for (const [px, py] of pts) g.lineTo(px, py); g.lineTo(glut[k].x, lerp(MEMB + 120, MEMB, glut[k].pos)); g.stroke(); g.setLineDash([]);
        for (const [px, py, nom] of pts) {
          g.fillStyle = actif ? (res ? 'rgba(251,191,36,.85)' : '#6ee7b7') : 'rgba(148,163,184,.5)'; g.beginPath(); g.arc(px, py, 6, 0, 7); g.fill();
          if (c.labels || k === 0) { g.fillStyle = '#e9eef8'; g.font = '600 10px "Plus Jakarta Sans", system-ui'; g.textAlign = 'left'; g.fillText(nom, px + 9, py + 3); }
        }
        if (actif && !res) { const u = (temps * 0.7 + k * 0.3) % 1; const seg = Math.min(2, Math.floor(u * 3)); const [ax, ay] = seg === 0 ? [x, MEMB + 26] : [pts[seg - 1][0], pts[seg - 1][1]]; const [bx, by] = [pts[seg][0], pts[seg][1]]; const f = u * 3 - seg; g.fillStyle = '#fff'; g.beginPath(); g.arc(lerp(ax, bx, f), lerp(ay, by, f), 3, 0, 7); g.fill(); }
      }
      if (res && nCl > 0) texte('La cascade répond mal : le signal se perd avant GLUT4', 360, MEMB + 150, '#fde68a', 11);
    }
    if (foie) {
      // Glycogène : grappes de grains.
      const n = Math.round(6 + glycogene * 40);
      for (let k = 0; k < n; k++) { const cx = 100 + (k % 6) * 88, cy = MEMB + 200 + ((k % 6) % 2) * 60, an = k * 2.4, rr = 6 + (k / 6) * 3.2; const x = cx + Math.cos(an) * rr, y = cy + Math.sin(an) * rr * 0.8; g.fillStyle = 'rgba(253,230,138,.7)'; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
      texte(`Glycogène (réserve) : ${glycogene > 0.6 ? 'plein' : glycogene > 0.3 ? 'moyen' : 'bas'}`, W / 2, H - 30, '#fde68a');
      if (i.PGE > 1.6) texte('Le foie libère du glucose (glycogène + néoglucogenèse)', W / 2, MEMB + 120, '#fdba74');
      else if (entres.length > 2) texte('Le foie stocke le glucose (insuline)', W / 2, MEMB + 120, '#7dd3fc');
      if (fx.foieFreine) texte('Metformine : production de glucose freinée', W / 2, MEMB + 80, '#6ee7b7');
      if (i.glucagon > 1.1) texte('Glucagon : « libère tes réserves »', W / 2, CAP_B + 18, '#d8b4fe');
    } else if (atelier) {
      const etatSucre = pool < 44 ? ['Hypoglycémie : le sucre du sang s\'effondre', '#fb7185'] : pool > 90 ? ['Trop de sucre reste dans le sang', '#fbbf24'] : ['Sucre du sang dans la normale', '#6ee7b7'];
      texte(etatSucre[0], W / 2, H - 30, etatSucre[1]);
      if (effort) texte('Effort : les portes s\'ouvrent aussi sans insuline', W / 2, CAP_B + 18, '#6ee7b7');
      else if (ins === 0) texte('Pas d\'insuline : aucune clé, portes cachées dans la cellule', W / 2, CAP_B + 18, '#fca5a5');
      // Jauge du sucre du sang (à gauche).
      g.fillStyle = 'rgba(7,10,18,.7)'; g.fillRect(8, 40, 14, MEMB - 60);
      const hJ = (MEMB - 60) * Math.min(1, pool / 110);
      g.fillStyle = pool < 44 ? '#fb7185' : pool > 90 ? '#fbbf24' : '#34d399'; g.fillRect(8, MEMB - 20 - hJ, 14, hJ);
      g.strokeStyle = 'rgba(233,238,248,.5)'; g.lineWidth = 1; const yN = MEMB - 20 - (MEMB - 60) * (60 / 110); g.beginPath(); g.moveTo(4, yN); g.lineTo(26, yN); g.stroke();
    } else {
      if (porte > 0.55) texte('Clé dans la serrure : les portes GLUT4 montent, le sucre entre', W / 2, H - 30, '#6ee7b7');
      else if (i.G > 150) texte('Peu de portes ouvertes : le sucre reste dans le sang', W / 2, H - 30, '#fbbf24');
      if ((t?.si ?? 1) < 0.6) texte(t?.type === 't2' ? 'Type 2 : serrures grippées (résistance à l\'insuline)' : 'Résistance à l\'insuline : serrures un peu grippées', 470, MEMB + 80, '#fde68a');
      if (effort) texte('Effort : les portes s\'ouvrent aussi sans insuline (voie AMPK)', W / 2, CAP_B + 18, '#6ee7b7');
      else if (fx.insulineInjectee) texte('Insuline injectée : des clés en plus', W / 2, CAP_B + 18, '#7dd3fc');
      if (t?.type === 't1' && ins < 0.1) texte('Type 1 : pas de clé, les portes restent fermées', W / 2, CAP_B + 18, '#fca5a5');
    }
    if (c.labels) {
      texte('Liquide autour de la cellule', 120, CAP_B + 40, '#fecaca', 10.5); texte(foie ? 'Hépatocyte (cellule du foie)' : 'Cellule musculaire', W / 2, MEMB + 26);
      texte('Récepteur de l\'insuline', RECEPTEURS[0] + 40, MEMB - 56, '#93c5fd'); texte(foie ? 'Transporteur GLUT2' : 'Transporteur GLUT4', 560, MEMB + 60, '#6ee7b7');
    }
  }

  function objet(c: Contexte, [x, y]: Pt): string | null {
    const foie = c.site === 'foie';
    for (const rx of RECEPTEURS) if (Math.abs(x - rx) < 14 && y > MEMB - 46 && y < MEMB + 28) return 'Récepteur de l\'insuline (en Y) : la clé s\'y fixe et lance le signal';
    for (const gt of glut) { const gy = lerp(MEMB + 120, MEMB, gt.pos); if (Math.abs(x - gt.x) < 12 && Math.abs(y - gy) < 15) return foie ? 'Transporteur GLUT2 : le glucose entre ou sort du foie' : gt.pos > 0.8 ? 'Porte GLUT4 ouverte, à la surface : le glucose entre' : 'Porte GLUT4 en réserve dans la cellule : elle attend le signal de l\'insuline'; }
    if (!foie) for (const rx of RECEPTEURS.slice(0, 2)) for (const [dx, dy, nom] of [[0, 52, 'IRS'], [26, 92, 'PI3K'], [52, 132, 'Akt']] as const) if (Math.hypot(x - rx - dx, y - MEMB - dy) < 9) return `${nom} : un relais du signal de l'insuline, du récepteur jusqu'aux portes GLUT4`;
    if (y >= CAP_T - 4 && y <= CAP_B + 4) return 'Capillaire sanguin : le sang circule et apporte le glucose (hexagones dorés) et l\'insuline (clés)';
    if (y < MEMB - 4 && y > CAP_B) return 'Liquide autour de la cellule : le glucose sorti du capillaire va vers la membrane';
    if (foie && y > MEMB + 140) return 'Glycogène : la réserve de sucre du foie';
    if (y > MEMB + 8) return foie ? 'Hépatocyte (cellule du foie)' : 'Cellule musculaire';
    if (Math.abs(y - MEMB) <= 8) return 'Membrane de la cellule';
    return null;
  }

  const base = creerScene2D(conteneur, opt, { W, H, regions, dessiner, avancer, siteInitial, repli: { graisse: 'muscles' }, sMax: 4, objet });
  return { ...base, setAtelier(r, cb) { if (r && !atelier) { pool = 60; entres.length = 0; } atelier = r; onStats = cb; } };
}
