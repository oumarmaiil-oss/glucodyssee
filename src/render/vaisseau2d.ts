/**
 * Vue « petits vaisseaux » : la microangiopathie diabétique, sur trois sites (rétine, glomérule du rein, nerf).
 * Un capillaire vu en long : globules rouges et glucose dans la lumière (densité selon la glycémie de l'instant),
 * paroi qui s'épaissit (membrane basale), produits de glycation (AGE), fuites, micro-anévrismes, occlusion,
 * puis néovaisseaux (rétine), albumine dans les urines (rein) ou fibres nerveuses qui disparaissent (nerf).
 * Le degré d'atteinte vient du terrain (complications simulées, ou installées avec les années dans l'onglet Évolution).
 * Représentation pédagogique : les étapes sont celles décrites dans les recommandations, sans échelle de temps.
 */
import { clamp, creerScene2D, hexagone, lerp, type Contexte, type OptionsRendu, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';

const W = 640, H = 520, Y0 = 200, Y1 = 300; // bords de la lumière du capillaire

export type SiteMicro = 'retine' | 'glomerule' | 'nerf';
export const SITES_MICRO: { id: SiteMicro; nom: string }[] = [{ id: 'retine', nom: 'Rétine' }, { id: 'glomerule', nom: 'Rein' }, { id: 'nerf', nom: 'Nerf' }];

export const ETAPES_MICRO: { titre: string; texte: string; detail: string; niveau: number }[] = [
  { titre: 'Glycation', texte: 'le sucre en excès colle aux protéines de la paroi.', detail: 'Il se forme des produits de glycation avancée (AGE, points bruns), comme l\'HbA1c dans les globules rouges.', niveau: 0.12 },
  { titre: 'La paroi s\'épaissit', texte: 'la membrane basale du capillaire devient épaisse et rigide.', detail: 'Les cellules qui soutiennent le capillaire (péricytes) disparaissent peu à peu.', niveau: 0.35 },
  { titre: 'Le vaisseau fuit', texte: 'la paroi laisse passer ce qu\'elle devrait retenir.', detail: 'Rétine : micro-anévrismes, exsudats, œdème · rein : albumine dans les urines · nerf : œdème autour des fibres.', niveau: 0.55 },
  { titre: 'Le vaisseau se bouche', texte: 'le tissu autour manque d\'oxygène.', detail: 'Zones privées de sang (ischémie) : c\'est le tournant vers les formes graves.', niveau: 0.78 },
  { titre: 'Les lésions graves', texte: 'rétine : nouveaux vaisseaux fragiles qui saignent ; rein : filtres détruits ; nerf : fibres qui meurent.', detail: 'Un bon équilibre du sucre et de la tension ralentit chaque étape (UKPDS : −37 % de complications microvasculaires par point d\'HbA1c en moins).', niveau: 1 },
];

const REGIONS = (site: string): Region[] => [{ z: site === 'glomerule' ? 'reins' : site === 'nerf' ? 'nerfs' : 'yeux', x: 20, y: 60, w: W - 40, h: H - 100 }];

export function creerVaisseau2D(conteneur: HTMLElement, opt: OptionsRendu = {}): Rendu & { setEtape(i: number | null): void } {
  const gr = Array.from({ length: 26 }, (_, k) => ({ x: (k / 26) * W, y: lerp(Y0 + 18, Y1 - 18, Math.random()), v: 70 + Math.random() * 25 }));
  const glu: { x: number; y: number; v: number }[] = [];
  const fuite: { x: number; y: number; vy: number; vie: number }[] = [];
  let etapeForcee: number | null = null, accF = 0;

  const atteinte = (c: Contexte) => {
    if (etapeForcee !== null) return ETAPES_MICRO[etapeForcee].niveau;
    const t = c.etat?.terrain;
    if (!t) return 0;
    return c.site === 'glomerule' ? t.nephro : c.site === 'nerf' ? t.neuro : t.retino;
  };

  function avancer(c: Contexte, i: Instant, dt: number) {
    const a = atteinte(c);
    const ralenti = a > 0.75 ? 0.25 : 1;
    for (const p of gr) { p.x += p.v * ralenti * dt; if (p.x > W + 20) p.x -= W + 40; }
    const cible = Math.round(clamp(i.G, 30, 450) / 6);
    while (glu.length < cible) glu.push({ x: Math.random() * W, y: lerp(Y0 + 8, Y1 - 8, Math.random()), v: 80 + Math.random() * 30 });
    if (glu.length > cible) glu.length = cible;
    for (const p of glu) { p.x += p.v * ralenti * dt; if (p.x > W) p.x -= W; }
    if (a > 0.45) { accF += (a - 0.4) * 14 * dt; while (accF >= 1) { accF -= 1; fuite.push({ x: 120 + Math.random() * 400, y: Y1 + 6, vy: 25 + Math.random() * 20, vie: 2.5 }); } }
    for (const f of fuite) { f.vie -= dt; f.y += f.vy * dt; }
    for (let j = fuite.length - 1; j >= 0; j--) if (fuite[j].vie <= 0) fuite.splice(j, 1);
  }

  function dessiner(c: Contexte, i: Instant) {
    const { g, texte, temps, site } = c;
    const a = atteinte(c);
    const ep = 6 + 16 * clamp(a / 0.6, 0, 1); // épaisseur de la membrane basale
    // Tissu autour.
    const tissu = site === 'retine' ? [120, 50, 40] : site === 'glomerule' ? [130, 70, 80] : [110, 95, 60];
    g.fillStyle = `rgba(${tissu[0]},${tissu[1]},${tissu[2]},.22)`; g.fillRect(0, 60, W, H - 100);
    // Ischémie (zone grise) quand le vaisseau se bouche.
    if (a > 0.7) { g.fillStyle = `rgba(80,85,100,${0.35 * clamp((a - 0.7) / 0.3, 0, 1) + 0.15})`; g.beginPath(); g.ellipse(W * 0.72, Y1 + 110, 170, 60, 0, 0, 7); g.fill(); }
    // Nerf : faisceau de fibres sous le capillaire.
    if (site === 'nerf') {
      for (let k = 0; k < 9; k++) {
        const vivante = k / 9 > a * 0.9;
        g.strokeStyle = vivante ? 'rgba(253,224,71,.75)' : 'rgba(120,120,120,.35)'; g.lineWidth = vivante ? 4 : 2; g.setLineDash(vivante ? [] : [6, 6]);
        g.beginPath(); g.moveTo(20, Y1 + 50 + k * 13); g.bezierCurveTo(200, Y1 + 40 + k * 13, 440, Y1 + 60 + k * 13, 620, Y1 + 50 + k * 13); g.stroke(); g.setLineDash([]);
      }
      if (a > 0.05 && Math.sin(temps * 6) > 0.6) texte('Fourmillements, brûlures', W * 0.3, Y1 + 190, '#fde68a', 11);
    }
    // Paroi (membrane basale) et lumière.
    g.fillStyle = 'rgba(250,210,190,.55)'; g.fillRect(0, Y0 - ep, W, ep); g.fillRect(0, Y1, W, ep);
    // Micro-anévrisme (rétine) : la paroi se dilate.
    if (site === 'retine' && a > 0.4) { const r = 14 + 14 * clamp((a - 0.4) / 0.4, 0, 1); g.fillStyle = 'rgba(201,66,79,.75)'; g.beginPath(); g.arc(W * 0.4, Y1 + ep + r * 0.6, r, 0, 7); g.fill(); g.strokeStyle = 'rgba(250,210,190,.7)'; g.lineWidth = 2; g.stroke(); }
    const lumiere = g.createLinearGradient(0, Y0, 0, Y1); lumiere.addColorStop(0, 'rgba(160,30,45,.55)'); lumiere.addColorStop(1, 'rgba(120,20,35,.55)');
    g.fillStyle = lumiere; g.fillRect(0, Y0, W, Y1 - Y0);
    // Occlusion : un bouchon dans la lumière.
    if (a > 0.72) { g.fillStyle = 'rgba(60,40,45,.9)'; g.beginPath(); g.roundRect(W * 0.62, Y0 + 4, 60, Y1 - Y0 - 8, 16); g.fill(); }
    // Contenu : globules rouges et glucose.
    for (const p of gr) { if (a > 0.72 && p.x > W * 0.62 && p.x < W * 0.62 + 60) continue; g.fillStyle = '#d23a4a'; g.beginPath(); g.ellipse(p.x, p.y, 11, 7, 0.2, 0, 7); g.fill(); g.fillStyle = '#9b1f30'; g.beginPath(); g.ellipse(p.x, p.y, 4, 2.5, 0.2, 0, 7); g.fill(); }
    for (const p of glu) hexagone(g, p.x, p.y, 3);
    // AGE : produits de glycation accrochés à la paroi (plus nombreux si le sucre est haut).
    const nAge = Math.round(4 + 60 * clamp(a, 0, 1) + Math.max(0, i.G - 140) / 6);
    g.fillStyle = 'rgba(146,84,32,.95)';
    for (let k = 0; k < nAge; k++) { const x = ((k * 97) % W); const haut = k % 2 === 0; g.beginPath(); g.arc(x, haut ? Y0 - ep / 2 : Y1 + ep / 2, 2.6, 0, 7); g.fill(); }
    // Fuites : exsudats jaunes (rétine), albumine bleue (rein), œdème (nerf).
    for (const f of fuite) { g.fillStyle = site === 'glomerule' ? `rgba(96,165,250,${clamp(f.vie, 0, 1)})` : `rgba(253,224,71,${clamp(f.vie, 0, 1) * 0.9})`; g.beginPath(); g.arc(f.x, f.y, 3, 0, 7); g.fill(); }
    // Néovaisseaux fragiles (rétine, stade proliférant).
    if (site === 'retine' && a > 0.9) {
      g.strokeStyle = 'rgba(239,68,68,.85)'; g.lineWidth = 1.5;
      for (let k = 0; k < 7; k++) { g.beginPath(); g.moveTo(W * 0.72 + k * 14 - 50, Y1 + ep); g.quadraticCurveTo(W * 0.72 + k * 10 - 40, Y1 + 80, W * 0.72 + Math.sin(k * 2) * 60, Y1 + 140 + (k % 3) * 12); g.stroke(); }
      if (Math.sin(temps * 2) > 0) { g.fillStyle = 'rgba(185,28,28,.45)'; g.beginPath(); g.ellipse(W * 0.75, Y1 + 150, 50, 18, 0, 0, 7); g.fill(); }
    }
    // Glomérule : urine en bas.
    if (site === 'glomerule') { g.fillStyle = 'rgba(250,230,150,.12)'; g.fillRect(0, H - 90, W, 50); texte(a > 0.45 ? 'Albumine dans les urines (bleu) : signe précoce à dépister chaque année' : 'Urines : pas d\'albumine', W / 2, H - 64, a > 0.45 ? '#93c5fd' : '#6ee7b7', 11.5); }

    // Messages.
    const nom = site === 'glomerule' ? 'Capillaire du glomérule (rein)' : site === 'nerf' ? 'Petit vaisseau qui nourrit le nerf' : 'Capillaire de la rétine';
    texte(nom, W / 2, 30, '#e9eef8', 13);
    const stade = a < 0.05 ? 'Paroi saine' : a < 0.3 ? 'Glycation débutante' : a < 0.5 ? 'Paroi épaissie' : a < 0.72 ? 'Le vaisseau fuit' : a < 0.9 ? 'Le vaisseau se bouche' : 'Lésions graves';
    texte(`${stade} · glycémie de l'instant ${(i.G / 100).toFixed(2).replace('.', ',')} g/L`, W / 2, 56, a < 0.05 ? '#6ee7b7' : a < 0.5 ? '#fde68a' : '#fca5a5', 11.5);
    if (a < 0.05 && i.G > 180) texte('Le sucre haut commence à coller à la paroi : c\'est l\'exposition répétée qui l\'abîme', W / 2, H - 22, '#fde68a', 11);
    if (c.labels) {
      texte('Membrane basale', 90, Y0 - ep - 12, '#fecaca', 11); texte('Globules rouges et glucose', W - 120, Y0 + 20, '#fecaca', 11);
      texte('AGE (glycation)', 90, Y1 + ep + 14, '#d6a77a', 11);
    }
  }

  const base = creerScene2D(conteneur, opt, { W, H, regions: REGIONS, dessiner, avancer, siteInitial: 'retine', repli: { pieds: 'nerfs' }, sMax: 4 });
  return { ...base, setEtape(i) { etapeForcee = i; } };
}
