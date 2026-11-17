/**
 * Vue « courbes » : la journée type comme sur un capteur de glucose en continu.
 * Bande verte 0,70-1,80 g/L (consensus temps dans la cible), lignes 0,70 et 0,54 (hypoglycémie niveaux 1 et 2),
 * courbe fantôme « sans traitement », repas, injections, effort, insuline en bas, curseur de l'heure.
 */
import { clamp, COUL, creerScene2D, type Contexte, type OptionsRendu, type Pt, type Region, type Rendu } from './scene2d.ts';
import type { Instant } from '../core/clock.ts';
import { fmtHeure } from '../core/clock.ts';
import { repasDuJour, resultatHgpo } from '../core/engine.ts';

const W = 900, H = 560;
const M = { l: 58, r: 22, t: 70, b: 150 };
const GMIN = 30, GMAX = 400;
const X = (h: number) => M.l + (h / 24) * (W - M.l - M.r);
const Y = (g: number) => M.t + (1 - (clamp(g, GMIN, GMAX) - GMIN) / (GMAX - GMIN)) * (H - M.t - M.b);
const YI0 = H - M.b + 34, YI1 = H - 26;

const REGIONS: Region[] = [{ z: 'sang', x: M.l, y: M.t, w: W - M.l - M.r, h: H - M.t - M.b }];

export function creerCourbe2D(conteneur: HTMLElement, opt: OptionsRendu = {}): Rendu {
  function trace(g: CanvasRenderingContext2D, arr: Float32Array, coul: string, larg: number, tirets?: number[]) {
    g.strokeStyle = coul; g.lineWidth = larg; g.lineJoin = 'round'; g.setLineDash(tirets ?? []);
    g.beginPath();
    for (let m = 0; m < 1440; m += 4) { const x = X(m / 60), y = Y(arr[m]); m ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke(); g.setLineDash([]);
  }

  function dessiner(c: Contexte, i: Instant) {
    const { g, etat: e, sans, texte } = c;
    if (!e) return;
    // Fond et bande cible.
    g.fillStyle = 'rgba(19,26,44,.65)'; g.beginPath(); g.roundRect(M.l - 8, M.t - 8, W - M.l - M.r + 16, H - M.t - M.b + 16, 10); g.fill();
    g.fillStyle = 'rgba(52,211,153,.13)'; g.fillRect(M.l, Y(180), W - M.l - M.r, Y(70) - Y(180));
    // Nuit.
    g.fillStyle = 'rgba(7,10,18,.35)'; g.fillRect(X(0), M.t, X(6.5) - X(0), Y(GMIN) - M.t); g.fillRect(X(22.5), M.t, X(24) - X(22.5), Y(GMIN) - M.t);
    // Grille.
    g.font = '600 12px "Plus Jakarta Sans", system-ui'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (const v of [54, 70, 100, 180, 250, 300, 400]) {
      g.strokeStyle = v === 70 || v === 54 ? 'rgba(251,113,133,.7)' : v === 180 ? 'rgba(52,211,153,.6)' : 'rgba(148,163,184,.15)';
      g.lineWidth = v === 70 || v === 180 ? 1.5 : 1; g.setLineDash(v === 54 ? [5, 4] : []);
      g.beginPath(); g.moveTo(M.l, Y(v)); g.lineTo(W - M.r, Y(v)); g.stroke(); g.setLineDash([]);
      g.fillStyle = v === 70 || v === 54 ? '#fda4af' : '#94a3b8'; g.fillText((v / 100).toFixed(2).replace('.', ','), M.l - 6, Y(v));
    }
    g.textAlign = 'center';
    for (let h = 0; h <= 24; h += 3) { g.fillStyle = '#7f8ba3'; g.fillText(`${h} h`, X(h), Y(GMIN) + 16); }
    g.save(); g.translate(16, (M.t + Y(GMIN)) / 2); g.rotate(-Math.PI / 2); g.fillStyle = '#94a3b8'; g.fillText('Glycémie (g/L)', 0, 0); g.restore();

    // Repas, injections, effort.
    for (const r of repasDuJour(e.terrain)) {
      g.strokeStyle = 'rgba(253,230,138,.35)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(X(r.h), M.t); g.lineTo(X(r.h), Y(GMIN)); g.stroke(); g.setLineDash([]);
      g.fillStyle = '#fde68a'; g.beginPath(); g.arc(X(r.h), M.t - 18, 9, 0, 7); g.fill();
      g.fillStyle = '#070a12'; g.font = '700 10px "Plus Jakarta Sans", system-ui'; g.fillText(`${r.g}`, X(r.h), M.t - 18);
    }
    for (const inj of e.injections) { g.fillStyle = COUL.insuline; g.beginPath(); g.moveTo(X(inj.h), M.t - 4); g.lineTo(X(inj.h) - 5, M.t - 13); g.lineTo(X(inj.h) + 5, M.t - 13); g.closePath(); g.fill(); }
    for (const ef of e.terrain.efforts) { g.fillStyle = 'rgba(110,231,183,.14)'; g.fillRect(X(ef.h), M.t, X(ef.h + ef.duree / 60) - X(ef.h), Y(GMIN) - M.t); }

    // Courbe fantôme puis courbe du patient (colorée selon la zone).
    if (sans && Object.keys(e.traitement).length) trace(g, sans.G, 'rgba(203,213,225,.45)', 2, [6, 5]);
    for (let m = 4; m < 1440; m += 4) {
      const gv = e.G[m];
      g.strokeStyle = gv < 70 ? '#fb7185' : gv > 250 ? '#f97316' : gv > 180 ? '#fbbf24' : '#34d399';
      g.lineWidth = 3.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(X((m - 4) / 60), Y(e.G[m - 4])); g.lineTo(X(m / 60), Y(gv)); g.stroke();
    }
    if (e.stats.max > GMAX) texte('Hors échelle : au-dessus de 4 g/L', W - 140, M.t + 12, '#f97316', 11);

    // HGPO : lectures à 0, 1 h et 2 h et seuils de la norme.
    if (e.terrain.hgpo) {
      const r = resultatHgpo(e);
      const gros = e.terrain.type === 'gestationnel';
      const seuils: [number, string][] = gros ? [[92, 'à jeun ≥ 0,92'], [180, '1 h ≥ 1,80'], [153, '2 h ≥ 1,53']] : [[140, '2 h : 1,40 (intolérance)'], [200, '2 h : 2,00 (diabète)']];
      g.setLineDash([3, 4]); g.lineWidth = 1;
      for (const [v, nom] of seuils) { g.strokeStyle = 'rgba(253,164,175,.7)'; g.beginPath(); g.moveTo(X(7.5), Y(v)); g.lineTo(X(10.8), Y(v)); g.stroke(); g.fillStyle = '#fda4af'; g.font = '600 10px "Plus Jakarta Sans", system-ui'; g.textAlign = 'left'; g.fillText(nom, X(10.85), Y(v) + 3); }
      g.setLineDash([]);
      ([[8, r.t0, 'T0'], [9, r.t60, '1 h'], [10, r.t120, '2 h']] as const).forEach(([hh, v, nom]) => {
        g.fillStyle = '#e9eef8'; g.beginPath(); g.arc(X(hh), Y(v), 5.5, 0, 7); g.fill(); g.strokeStyle = '#070a12'; g.lineWidth = 2; g.stroke();
        texte(`${nom} : ${(v / 100).toFixed(2).replace('.', ',')}`, X(hh), Y(v) - 18, '#e9eef8', 11);
      });
      texte(`HGPO 75 g · ${r.conclusion}`, (X(8) + X(16)) / 2, M.t + 14, r.niveau === 'ok' ? '#6ee7b7' : r.niveau === 'warn' ? '#fde68a' : '#fda4af', 12);
    }
    // Insuline (en bas).
    let imax = 20; for (let m = 0; m < 1440; m += 10) imax = Math.max(imax, e.I[m]);
    g.fillStyle = 'rgba(56,189,248,.08)'; g.fillRect(M.l, YI0, W - M.l - M.r, YI1 - YI0);
    g.strokeStyle = COUL.insuline; g.lineWidth = 2; g.beginPath();
    for (let m = 0; m < 1440; m += 4) { const x = X(m / 60), y = YI1 - (e.I[m] / imax) * (YI1 - YI0 - 4); m ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
    g.textAlign = 'left'; g.fillStyle = '#7dd3fc'; g.font = '600 11px "Plus Jakarta Sans", system-ui'; g.fillText(`Insuline dans le sang (max ${Math.round(imax)} µU/mL)`, M.l + 6, YI0 + 10);

    // Curseur de l'heure.
    const xc = X(i.heure), yc = Y(i.G);
    g.strokeStyle = 'rgba(233,238,248,.55)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xc, M.t); g.lineTo(xc, YI1); g.stroke();
    g.fillStyle = i.G < 70 ? '#fb7185' : i.G > 180 ? '#fbbf24' : '#34d399'; g.beginPath(); g.arc(xc, yc, 6, 0, 7); g.fill();
    g.strokeStyle = '#070a12'; g.lineWidth = 2; g.stroke();
    texte(`${fmtHeure(i.heure)} · ${(i.G / 100).toFixed(2).replace('.', ',')} g/L`, clamp(xc, M.l + 70, W - M.r - 70), Math.max(M.t + 14, yc - 22));

    // Résumé.
    const st = e.stats, pc = (x: number) => `${Math.round(x * 100)} %`;
    texte(`Temps dans la cible ${pc(st.tir)} · sous 0,70 : ${pc(st.tbr70)} · au-dessus de 1,80 : ${pc(st.tar180)} · HbA1c estimée ${st.hba1c.toFixed(1).replace('.', ',')} %`, W / 2, 16, st.tbr70 > 0.04 ? '#fda4af' : '#e9eef8', 12);
    if (c.labels) {
      texte('Bande verte : 0,70 à 1,80 g/L', W - 130, Y(125), '#6ee7b7', 11);
      if (sans && Object.keys(e.traitement).length) texte('Pointillés : sans traitement', W - 130, Y(330), '#cbd5e1', 11);
    }
  }

  function objet(c: Contexte, [x, y]: Pt): string | null {
    const e = c.etat; if (!e || x < M.l || x > W - M.r) return null;
    const m = Math.round(((x - M.l) / (W - M.l - M.r)) * 1439);
    const hh = `${String(Math.floor(m / 60)).padStart(2, '0')} h ${String(m % 60).padStart(2, '0')}`;
    const r = repasDuJour(e.terrain).find((q) => Math.abs(q.h * 60 - m) < 8);
    if (y < M.t && r) return `${r.nom} : ${r.g} g de glucides`;
    if (y < M.t) { const inj = e.injections.find((q) => Math.abs(q.h * 60 - m) < 8); if (inj) return `${inj.nom} : ${inj.u} U`; }
    if (y >= M.t && y <= Y(GMIN)) { const s = c.sans && Object.keys(e.traitement).length ? ` · sans traitement : ${(c.sans.G[m] / 100).toFixed(2).replace('.', ',')}` : ''; return `${hh} · glycémie ${(e.G[m] / 100).toFixed(2).replace('.', ',')} g/L${s}`; }
    if (y >= YI0 && y <= YI1) return `${hh} · insuline ${Math.round(e.I[m])} µU/mL`;
    return null;
  }

  return creerScene2D(conteneur, opt, { W, H, regions: REGIONS, dessiner, sMax: 3, objet });
}
