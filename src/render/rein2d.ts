/**
 * Vue « rein » : un néphron. Le glomérule filtre le glucose (quantité filtrée ∝ glycémie × DFG) ;
 * le tubule proximal le réabsorbe par SGLT2 (≈ 90 %) puis SGLT1 (le reste). La part qui atteint les urines
 * vient du moteur (au-dessus du seuil rénal ≈ 1,80 g/L, abaissé vers 0,70-0,75 g/L par les iSGLT2).
 */
import { clamp, creerScene2D, hexagone, lerp, type Contexte, type OptionsRendu, type Pt, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';
import { dfg } from '../core/engine.ts';
import { SEUIL_REIN } from '../core/moteur.ts';

const W = 640, H = 560;
const TUBE: Pt[] = [[150, 150], [300, 150], [520, 150], [560, 190], [560, 300], [520, 330], [420, 330], [380, 360], [380, 470], [380, 540]];
const cum = [0]; for (let k = 1; k < TUBE.length; k++) cum.push(cum[k - 1] + Math.hypot(TUBE[k][0] - TUBE[k - 1][0], TUBE[k][1] - TUBE[k - 1][1]));
const LEN = cum[cum.length - 1];
const at = (s: number): Pt => { const d = clamp(s, 0, 1) * LEN; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const t = (d - cum[i - 1]) / (cum[i] - cum[i - 1] || 1); return [lerp(TUBE[i - 1][0], TUBE[i][0], t), lerp(TUBE[i - 1][1], TUBE[i][1], t)]; };
const S_SGLT2 = [0.08, 0.14, 0.2, 0.26, 0.32], S_SGLT1 = [0.44, 0.5];

const REGIONS: Region[] = [{ z: 'reins', x: 40, y: 60, w: 560, h: 480 }];

export function creerRein2D(conteneur: HTMLElement, opt: OptionsRendu = {}): Rendu {
  const parts: { s: number; o: number; dest: number }[] = []; // dest : abscisse où il est réabsorbé (2 = urine)
  const reab: { x: number; y: number; vie: number }[] = [];
  let acc = 0;

  function filtre(c: Contexte, i: Instant) {
    const rein = c.etat?.terrain.rein ?? 1;
    const filtreMgKgMin = (i.G * 1.25 * rein) / 70; // DFG ≈ 125 mL/min × fonction rénale
    const pUrine = clamp(i.Urein / Math.max(0.01, filtreMgKgMin), 0, 1);
    return { filtreMgKgMin, pUrine };
  }

  function avancer(c: Contexte, i: Instant, dt: number) {
    const e = c.etat; if (!e) return;
    const { filtreMgKgMin, pUrine } = filtre(c, i);
    const isglt2 = (e.traitement.isglt2 ?? 0) > 0;
    acc += filtreMgKgMin * 7 * dt;
    while (acc >= 1) {
      acc -= 1;
      const u = Math.random();
      const dest = u < pUrine ? 2 : (isglt2 ? Math.random() < 0.55 : Math.random() < 0.9) ? S_SGLT2[(Math.random() * S_SGLT2.length) | 0] : S_SGLT1[(Math.random() * S_SGLT1.length) | 0];
      parts.push({ s: 0, o: Math.random() - 0.5, dest });
    }
    if (acc > 6) acc = 6;
    for (const p of parts) p.s += dt * 0.22;
    for (let j = parts.length - 1; j >= 0; j--) {
      const p = parts[j];
      if (p.dest < 2 && p.s >= p.dest) { const [x, y] = at(p.dest); reab.push({ x, y: y + 18, vie: 1.2 }); parts.splice(j, 1); }
      else if (p.s >= 1) parts.splice(j, 1);
    }
    for (const r of reab) { r.vie -= dt; r.y += 40 * dt; }
    for (let j = reab.length - 1; j >= 0; j--) if (reab[j].vie <= 0) reab.splice(j, 1);
  }

  function dessiner(c: Contexte, i: Instant) {
    const { g, etat: e, texte, temps } = c;
    const t = e?.terrain;
    const isglt2 = (e?.traitement.isglt2 ?? 0) > 0;
    const seuil = isglt2 ? 70 : SEUIL_REIN;
    // Capillaire péritubulaire (le glucose réabsorbé retourne au sang).
    g.fillStyle = 'rgba(201,66,79,.14)'; g.fillRect(160, 196, 380, 40);
    g.strokeStyle = 'rgba(201,66,79,.45)'; g.lineWidth = 2; g.strokeRect(160, 196, 380, 40);
    // Le sang y circule (globules rouges et flux), vers la veine du rein.
    g.save(); g.beginPath(); g.rect(160, 196, 380, 40); g.clip();
    g.strokeStyle = 'rgba(255,214,214,.16)'; g.lineWidth = 2; g.setLineDash([14, 12]); g.lineDashOffset = -temps * 70;
    g.beginPath(); g.moveTo(160, 216); g.lineTo(540, 216); g.stroke(); g.setLineDash([]);
    for (let k = 0; k < 6; k++) { const x = 160 + ((k * 71 + temps * 70) % 400) - 10, y = 206 + ((k * 13) % 22); g.fillStyle = 'rgba(201,66,79,.85)'; g.beginPath(); g.ellipse(x, y, 8, 5, 0, 0, 7); g.fill(); g.fillStyle = 'rgba(120,20,32,.5)'; g.beginPath(); g.ellipse(x, y, 3.5, 2, 0, 0, 7); g.fill(); }
    g.restore();
    // Glomérule.
    const pale = clamp(t?.nephro ?? 0, 0, 1);
    g.fillStyle = `rgba(201,66,79,${0.55 - 0.3 * pale})`; g.beginPath(); g.arc(110, 150, 46, 0, 7); g.fill();
    g.strokeStyle = 'rgba(250,210,190,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(110, 150, 56, -1.2, 1.2, true); g.stroke();
    for (let k = 0; k < 7; k++) { g.strokeStyle = 'rgba(255,170,170,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(98 + (k % 3) * 12, 136 + Math.floor(k / 3) * 12, 9, 0, 7); g.stroke(); }
    // Tubule.
    g.strokeStyle = 'rgba(250,220,200,.35)'; g.lineWidth = 30; g.lineJoin = 'round'; g.lineCap = 'round';
    g.beginPath(); g.moveTo(...TUBE[0]); for (const p of TUBE.slice(1)) g.lineTo(...p); g.stroke();
    // Transporteurs SGLT2 (bloqués par les iSGLT2) et SGLT1.
    for (const s of S_SGLT2) {
      const [x, y] = at(s);
      g.fillStyle = isglt2 ? 'rgba(251,191,36,.35)' : '#fbbf24'; g.beginPath(); g.roundRect(x - 7, y + 10, 14, 12, 3); g.fill();
      if (isglt2) { g.strokeStyle = '#fb7185'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(x - 7, y + 10); g.lineTo(x + 7, y + 22); g.moveTo(x + 7, y + 10); g.lineTo(x - 7, y + 22); g.stroke(); }
    }
    for (const s of S_SGLT1) { const [x, y] = at(s); g.fillStyle = '#fb923c'; g.beginPath(); g.roundRect(x + 10, y - 7, 12, 14, 3); g.fill(); }
    for (const p of parts) { const [x, y] = at(p.s); hexagone(g, x + p.o * 12, y + p.o * 6, 3.2); }
    for (const r of reab) hexagone(g, r.x, r.y, 3.2, `rgba(245,176,39,${clamp(r.vie, 0, 1)})`);
    // Urines.
    g.fillStyle = 'rgba(250,230,150,.16)'; g.strokeStyle = 'rgba(250,230,150,.45)'; g.lineWidth = 1.5;
    g.beginPath(); g.roundRect(340, 500, 80, 46, 10); g.fill(); g.stroke();

    const uj = e?.urine ?? 0;
    const d = dfg(t?.rein ?? 1);
    const filtreJ = (i.G / 100) * 180 * (t?.rein ?? 1);
    texte(`Seuil rénal ≈ ${(seuil / 100).toFixed(2).replace('.', ',')} g/L${isglt2 ? ' (abaissé par l\'iSGLT2)' : ''}`, W / 2, 40, isglt2 ? '#6ee7b7' : '#e9eef8');
    texte(`Glycémie ${(i.G / 100).toFixed(2).replace('.', ',')} g/L · filtré ≈ ${Math.round(filtreJ)} g/jour à ce niveau · urines ≈ ${Math.round(uj)} g/jour`, W / 2, 70, '#fde68a', 11.5);
    if (i.Urein > 0.03) texte('Le sucre dépasse la capacité de réabsorption : il part dans les urines', W / 2, H - 18, '#fde68a');
    else texte('Tout le glucose filtré est récupéré', W / 2, H - 18, '#6ee7b7');
    if (d < 60) texte(`Rein malade : DFG ≈ ${d} mL/min`, 120, 230, '#fca5a5');
    if (c.labels) {
      texte('Glomérule (filtre)', 110, 86); texte('SGLT2 ≈ 90 % du glucose', 300, 118, '#fbbf24'); texte('SGLT1 : le reste', 520, 112, '#fb923c');
      texte('Retour au sang', 350, 252, '#fca5a5'); texte('Urines', 470, 524);
    }
    void temps;
  }

  function objet(c: Contexte, [x, y]: Pt): string | null {
    if (Math.hypot(x - 110, y - 150) < 56) return 'Glomérule : le filtre du rein (≈ 180 g de glucose filtrés par jour)';
    for (const s of S_SGLT2) { const [px, py] = at(s); if (Math.abs(x - px) < 10 && y > py + 6 && y < py + 26) return (c.etat?.traitement.isglt2 ?? 0) > 0 ? 'SGLT2 bloqué par l\'iSGLT2 : le glucose filtré n\'est plus repris' : 'SGLT2 : il reprend ≈ 90 % du glucose filtré'; }
    for (const s of S_SGLT1) { const [px, py] = at(s); if (Math.abs(x - px - 16) < 10 && Math.abs(y - py) < 10) return 'SGLT1 : il reprend le reste du glucose filtré'; }
    if (x > 160 && x < 540 && y > 196 && y < 236) return 'Capillaire : le glucose repris retourne dans le sang';
    if (x > 340 && x < 420 && y > 500 && y < 546) return 'Urines : le glucose qui n\'a pas été repris';
    for (let k = 0; k <= 40; k++) { const [px, py] = at(k / 40); if (Math.hypot(x - px, y - py) < 15) return k / 40 < 0.42 ? 'Tubule proximal : c\'est ici que le glucose est repris' : 'Tubule : il conduit l\'urine vers la vessie'; }
    return null;
  }

  return creerScene2D(conteneur, opt, { W, H, regions: REGIONS, dessiner, avancer, sMax: 4, objet });
}
