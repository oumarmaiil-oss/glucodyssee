/**
 * Vue « cellule » : la clé et la porte.
 *  - Muscle : récepteurs de l'insuline (Y) sur la membrane, transporteurs GLUT4 qui montent à la surface
 *    selon l'action de l'insuline (et l'effort, par une autre voie), glucose qui entre au rythme du moteur.
 *    Type 2 : serrures « grippées » (gouttelettes de graisse dans la cellule, cascade qui répond mal).
 *  - Foie : glycogène stocké ou libéré, glucose qui sort (production hépatique) ou entre, glucagon et insuline.
 */
import { clamp, COUL, creerScene2D, cle, hexagone, lerp, type Contexte, type OptionsRendu, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';
import { effetsVisibles } from '../core/effets.ts';

const W = 640, H = 560, MEMB = 210;
const N_REC = 7;
const RECEPTEURS = Array.from({ length: N_REC }, (_, k) => 70 + k * 84);
const N_GLUT = 8;

export function creerCellule2D(conteneur: HTMLElement, opt: OptionsRendu = {}, siteInitial = 'muscle'): Rendu {
  const sang: { x: number; y: number; v: number }[] = [];
  const entres: { x: number; y: number; vy: number; vie: number }[] = [];
  const sortants: { x: number; y: number; vy: number; vie: number }[] = [];
  const glut = Array.from({ length: N_GLUT }, (_, k) => ({ x: 110 + k * 62, pos: 0 })); // pos 0 = en réserve, 1 = à la membrane
  let accE = 0, accS = 0, glycogene = 0.5;

  const regions = (site: string): Region[] => [{ z: site === 'foie' ? 'foie' : 'muscles', x: 20, y: MEMB - 10, w: W - 40, h: H - MEMB }, { z: 'sang', x: 20, y: 20, w: W - 40, h: MEMB - 40 }];

  function action(c: Contexte, i: Instant) {
    const t = c.etat?.terrain;
    const metf = (c.etat?.traitement.metformine ?? 0) > 0 ? 1.25 : 1;
    const ins = i.I / (i.I + 40);
    return { ins, porte: clamp(ins * (t?.si ?? 1) * metf * 1.3 + (i.effort ? 0.5 : 0), 0, 1) };
  }

  function avancer(c: Contexte, i: Instant, dt: number) {
    const e = c.etat; if (!e) return;
    const foie = c.site === 'foie';
    const cible = Math.round(clamp(i.G, 30, 450) / 5);
    while (sang.length < cible) sang.push({ x: Math.random() * W, y: 40 + Math.random() * (MEMB - 70), v: 60 + Math.random() * 50 });
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
    // Sang (en haut) et cellule (en bas).
    g.fillStyle = 'rgba(201,66,79,.12)'; g.fillRect(0, 20, W, MEMB - 20);
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
      if (!foie && (t?.si ?? 1) < 0.6) { g.fillStyle = 'rgba(251,191,36,.65)'; g.beginPath(); g.arc(x + 6, MEMB + 40, 6, 0, 7); g.fill(); g.beginPath(); g.arc(x - 8, MEMB + 52, 4, 0, 7); g.fill(); }
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

    if (foie) {
      // Glycogène : grappes de grains.
      const n = Math.round(6 + glycogene * 40);
      for (let k = 0; k < n; k++) { const x = 60 + ((k * 53) % 520), y = MEMB + 150 + ((k * 31) % 150); g.fillStyle = 'rgba(253,230,138,.7)'; g.beginPath(); g.arc(x, y, 3.2, 0, 7); g.fill(); }
      texte(`Glycogène (réserve) : ${glycogene > 0.6 ? 'plein' : glycogene > 0.3 ? 'moyen' : 'bas'}`, W / 2, H - 30, '#fde68a');
      if (i.PGE > 1.6) texte('Le foie libère du glucose (glycogène + néoglucogenèse)', W / 2, MEMB + 120, '#fdba74');
      else if (entres.length > 2) texte('Le foie stocke le glucose (insuline)', W / 2, MEMB + 120, '#7dd3fc');
      if (fx.foieFreine) texte('Metformine : production de glucose freinée', W / 2, MEMB + 80, '#6ee7b7');
      if (i.glucagon > 1.1) texte('Glucagon : « libère tes réserves »', W / 2, 40, '#d8b4fe');
    } else {
      if (porte > 0.55) texte('Clé dans la serrure : les portes GLUT4 montent, le sucre entre', W / 2, H - 30, '#6ee7b7');
      else if (i.G > 150) texte('Peu de portes ouvertes : le sucre reste dans le sang', W / 2, H - 30, '#fbbf24');
      if ((t?.si ?? 1) < 0.6) texte('Type 2 : serrures grippées (résistance à l\'insuline)', W / 2, MEMB + 80, '#fde68a');
      if (i.effort) texte('Effort : les portes s\'ouvrent aussi sans insuline (voie AMPK)', W / 2, 40, '#6ee7b7');
      else if (fx.insulineInjectee) texte('Insuline injectée : des clés en plus', W / 2, 40, '#7dd3fc');
      if (t?.type === 't1' && ins < 0.1) texte('Type 1 : pas de clé, les portes restent fermées', W / 2, 40, '#fca5a5');
    }
    if (c.labels) {
      texte('Sang', 40, 34); texte(foie ? 'Hépatocyte (cellule du foie)' : 'Cellule musculaire', W / 2, MEMB + 26);
      texte('Récepteur de l\'insuline', RECEPTEURS[0] + 40, MEMB - 56, '#93c5fd'); texte(foie ? 'Transporteur GLUT2' : 'Transporteur GLUT4', 560, MEMB + 60, '#6ee7b7');
    }
  }

  return creerScene2D(conteneur, opt, { W, H, regions, dessiner, avancer, siteInitial, repli: { graisse: 'muscles' }, sMax: 4 });
}
