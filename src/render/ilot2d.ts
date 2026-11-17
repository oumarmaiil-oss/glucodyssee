/**
 * Vue « îlot de Langerhans » : cellules bêta (insuline, bleu), alpha (glucagon, violet) et delta (gris),
 * mélangées comme chez l'humain (≈ 55 / 35 / 10 %). Les granules sortent au rythme calculé par le moteur :
 * sécrétion d'insuline et indice de glucagon de l'instant. Type 1 : lymphocytes et cellules bêta détruites ;
 * type 2 : cellules bêta qui s'éteignent avec les années ; sulfamide : canaux K-ATP fermés.
 */
import { clamp, COUL, creerScene2D, hexagone, type Contexte, type OptionsRendu, type Pt, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';
import { effetsVisibles } from '../core/effets.ts';

const W = 640, H = 600, CX = 320, CY = 290, R = 215;

type TypeCellule = 'beta' | 'alpha' | 'delta';
interface Cellule { x: number; y: number; r: number; type: TypeCellule; rang: number; ph: number }

// Disposition déterministe (même îlot à chaque ouverture).
function graine(n: number) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const CELLULES: Cellule[] = (() => {
  const alea = graine(42), liste: Cellule[] = [];
  const pas = 38;
  for (let y = CY - R + 20; y <= CY + R - 20; y += pas * 0.87) {
    for (let x = CX - R + 20 + ((Math.round((y - CY) / (pas * 0.87)) & 1) ? pas / 2 : 0); x <= CX + R - 20; x += pas) {
      const d = Math.hypot(x - CX, y - CY);
      if (d > R - 22 || Math.abs(y - CY + 10) < 20) continue; // place pour le capillaire
      const u = alea();
      const type: TypeCellule = u < 0.55 ? 'beta' : u < 0.9 ? 'alpha' : 'delta';
      liste.push({ x: x + (alea() - 0.5) * 6, y: y + (alea() - 0.5) * 6, r: 15 + alea() * 3, type, rang: alea(), ph: alea() * 6 });
    }
  }
  return liste;
})();

const REGIONS: Region[] = [{ z: 'ilot', x: CX - R, y: CY - R, w: 2 * R, h: 2 * R }];

export function creerIlot2D(conteneur: HTMLElement, opt: OptionsRendu = {}): Rendu {
  const gran: { x: number; y: number; vx: number; vy: number; type: 'ins' | 'glu'; vie: number }[] = [];
  const glucose: { x: number; y: number; v: number }[] = [];
  const lympho = Array.from({ length: 14 }, (_, k) => ({ a: (k / 14) * Math.PI * 2, d: 0.4 + (k % 4) * 0.15, ph: k }));
  let accI = 0, accG = 0;

  function avancer(c: Contexte, i: Instant, dt: number) {
    const e = c.etat; if (!e) return;
    const beta = e.terrain.beta;
    const vivantes = CELLULES.filter((x) => x.type === 'beta' && x.rang < beta);
    const alphas = CELLULES.filter((x) => x.type === 'alpha');
    accI += clamp(i.S, 0, 40) * 2.2 * dt;
    while (accI >= 1 && vivantes.length) {
      accI -= 1; const s = vivantes[(Math.random() * vivantes.length) | 0];
      gran.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 20, vy: (CY - 10 - s.y) * 0.9, type: 'ins', vie: 2.2 });
    }
    accG += clamp(i.glucagon - 0.45, 0, 3) * 7 * dt;
    while (accG >= 1) {
      accG -= 1; const s = alphas[(Math.random() * alphas.length) | 0];
      gran.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 20, vy: (CY - 10 - s.y) * 0.9, type: 'glu', vie: 2.2 });
    }
    if (accI > 5) accI = 5;
    for (const p of gran) { p.vie -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (Math.abs(p.y - (CY - 10)) < 12) { p.vy = 0; p.vx = 160; } }
    for (let j = gran.length - 1; j >= 0; j--) if (gran[j].vie <= 0 || gran[j].x > W) gran.splice(j, 1);
    // Glucose du capillaire : densité selon la glycémie.
    const cible = Math.round(clamp(i.G, 30, 450) / 8);
    while (glucose.length < cible) glucose.push({ x: Math.random() * W, y: CY - 10 + (Math.random() - 0.5) * 22, v: 90 + Math.random() * 40 });
    if (glucose.length > cible) glucose.length = cible;
    for (const p of glucose) { p.x += p.v * dt; if (p.x > W) p.x -= W; }
  }

  function dessiner(c: Contexte, i: Instant) {
    const { g, etat: e, texte, temps } = c;
    const t = e?.terrain;
    const beta = t?.beta ?? 1;
    const fx = effetsVisibles(e);
    const t1 = t?.type === 't1';
    // Tissu exocrine autour.
    g.fillStyle = 'rgba(230,170,160,.06)'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 40; k++) { const a = k * 2.4, d = R + 40 + (k % 5) * 18; g.fillStyle = 'rgba(230,170,160,.12)'; g.beginPath(); g.arc(CX + Math.cos(a) * d, CY + Math.sin(a) * d, 16, 0, 7); g.fill(); }
    // Îlot.
    g.fillStyle = 'rgba(40,50,80,.55)'; g.strokeStyle = 'rgba(180,200,240,.35)'; g.lineWidth = 2;
    g.beginPath(); g.arc(CX, CY, R, 0, 7); g.fill(); g.stroke();
    // Capillaire traversant l'îlot.
    g.fillStyle = 'rgba(201,66,79,.35)'; g.fillRect(0, CY - 26, W, 32);
    g.strokeStyle = 'rgba(201,66,79,.7)'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, CY - 26); g.lineTo(W, CY - 26); g.moveTo(0, CY + 6); g.lineTo(W, CY + 6); g.stroke();
    for (const p of glucose) hexagone(g, p.x, p.y, 3);

    // Cellules.
    for (const s of CELLULES) {
      const vivante = s.type !== 'beta' || s.rang < beta;
      const pulse = 1 + 0.05 * Math.sin(temps * 3 + s.ph);
      if (s.type === 'beta') {
        if (vivante) {
          const act = clamp(i.S / (Math.max(0.05, beta) * 10), 0, 1);
          g.fillStyle = `rgba(56,189,248,${0.45 + 0.4 * act})`;
        } else g.fillStyle = t1 ? 'rgba(90,60,70,.5)' : 'rgba(90,100,120,.35)';
      } else if (s.type === 'alpha') g.fillStyle = `rgba(192,132,252,${0.4 + 0.35 * clamp(i.glucagon - 0.5, 0, 1)})`;
      else g.fillStyle = 'rgba(160,170,190,.45)';
      g.beginPath(); g.arc(s.x, s.y, s.r * (vivante ? pulse : 0.8), 0, 7); g.fill();
      g.fillStyle = 'rgba(10,15,30,.55)'; g.beginPath(); g.arc(s.x, s.y, s.r * 0.32, 0, 7); g.fill();
      // Canaux K-ATP fermés sous sulfamide.
      if (s.type === 'beta' && vivante && fx.pancreasForce) { g.strokeStyle = '#fbbf24'; g.lineWidth = 2; g.beginPath(); g.arc(s.x + s.r * 0.7, s.y - s.r * 0.7, 3.5, 0, 7); g.stroke(); g.beginPath(); g.moveTo(s.x + s.r * 0.7 - 3, s.y - s.r * 0.7); g.lineTo(s.x + s.r * 0.7 + 3, s.y - s.r * 0.7); g.stroke(); }
      if (s.type === 'beta' && !vivante && !t1) { g.strokeStyle = 'rgba(148,163,184,.4)'; g.lineWidth = 1; g.beginPath(); g.arc(s.x, s.y, s.r * 0.8, 0, 7); g.stroke(); }
    }
    // Lymphocytes qui attaquent (type 1).
    if (t1) for (const l of lympho) {
      const a = l.a + temps * 0.15, d = R * (l.d + 0.05 * Math.sin(temps + l.ph));
      const x = CX + Math.cos(a) * d, y = CY + Math.sin(a) * d;
      g.fillStyle = '#ef4444'; g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
      g.fillStyle = '#7f1d1d'; g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill();
    }
    // Incrétines (GLP-1) qui arrivent sur les cellules bêta.
    if (fx.incretines) for (let k = 0; k < 8; k++) { const s = (temps * 0.4 + k / 8) % 1; const x = 20 + s * 160, y = 120 + k * 46; g.fillStyle = '#f472b6'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 8, y - 5); g.lineTo(x - 8, y + 5); g.closePath(); g.fill(); }
    // Granules.
    for (const p of gran) { g.fillStyle = p.type === 'ins' ? COUL.insuline : COUL.glucagon; g.beginPath(); g.arc(p.x, p.y, 2.6, 0, 7); g.fill(); }

    // Messages.
    const nBeta = CELLULES.filter((x) => x.type === 'beta').length, nViv = CELLULES.filter((x) => x.type === 'beta' && x.rang < beta).length;
    if (t1) texte('Type 1 : les lymphocytes ont détruit les cellules bêta', CX, 40, '#fca5a5');
    else if (beta < 0.9) texte(`Cellules bêta qui fonctionnent : ${Math.round((nViv / nBeta) * 100)} %`, CX, 40, '#fde68a');
    if (i.G < 70) texte('Sucre bas : les cellules alpha libèrent le glucagon', CX, H - 28, '#d8b4fe');
    else if (i.S > 3) texte('Sucre haut : les cellules bêta libèrent l\'insuline', CX, H - 28, '#7dd3fc');
    if (fx.pancreasForce) texte('Sulfamide : canaux K-ATP fermés, l\'insuline coule même si le sucre est bas', CX, 72, '#6ee7b7');
    if (fx.incretines) texte('Incrétines (GLP-1) : plus d\'insuline et moins de glucagon quand le sucre monte', CX, 72, '#6ee7b7');
    if (fx.sansEffet) texte('Plus de cellules bêta : sulfamide et iDPP-4 n\'agissent pas', CX, 72, '#fbbf24');
    if (c.labels) {
      texte('Cellule bêta → insuline', 140, 168, '#7dd3fc'); texte('Cellule alpha → glucagon', 500, 168, '#d8b4fe');
      texte('Cellule delta', 500, 420); texte('Capillaire sanguin', 560, CY - 44, '#fca5a5');
    }
  }

  function objet(c: Contexte, [x, y]: Pt): string | null {
    const beta = c.etat?.terrain.beta ?? 1;
    if (c.etat?.terrain.type === 't1') for (const l of lympho) { const a = l.a + c.temps * 0.15, d = R * (l.d + 0.05 * Math.sin(c.temps + l.ph)); if (Math.hypot(x - CX - Math.cos(a) * d, y - CY - Math.sin(a) * d) < 10) return 'Lymphocyte : il attaque les cellules bêta (type 1, maladie auto-immune)'; }
    for (const p of gran) if (Math.hypot(x - p.x, y - p.y) < 6) return p.type === 'ins' ? 'Grain d\'insuline libéré dans le sang' : 'Grain de glucagon libéré dans le sang';
    if (Math.abs(y - (CY - 10)) < 17) return 'Capillaire sanguin : il emporte l\'insuline et le glucagon (hexagones : glucose)';
    for (const s of CELLULES) if (Math.hypot(x - s.x, y - s.y) < s.r) return s.type === 'beta' ? (s.rang < beta ? 'Cellule bêta : elle fabrique l\'insuline quand le sucre monte' : 'Cellule bêta détruite ou épuisée : elle ne fabrique plus d\'insuline') : s.type === 'alpha' ? 'Cellule alpha : elle libère le glucagon quand le sucre baisse' : 'Cellule delta : la somatostatine, qui freine ses voisines';
    if (Math.hypot(x - CX, y - CY) > R + 10) return 'Pancréas exocrine : il fabrique les enzymes de la digestion';
    return null;
  }

  return creerScene2D(conteneur, opt, { W, H, regions: REGIONS, dessiner, avancer, repli: { pancreas: 'ilot' }, sMax: 4, objet });
}
