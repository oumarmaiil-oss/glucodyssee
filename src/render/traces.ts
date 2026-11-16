/**
 * Bandeau « capteur » sous la scène (comme l'ECG d'Hémodyssée) : la glycémie de la journée,
 * la bande cible et le curseur de l'heure ; en mode complet, l'insuline en plus.
 */
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';

export type ModeTraces = 'aucun' | 'glycemie' | 'tout';

export interface Traces {
  frame(i: Instant, dt: number, e: Etat): void;
  setMode(m: ModeTraces): void;
  dispose(): void;
}

export function creerTraces(cv: HTMLCanvasElement): Traces {
  const g = cv.getContext('2d')!;
  let dpr = 1, cw = 1, ch = 1, mode: ModeTraces = 'glycemie';
  const ro = new ResizeObserver(() => {
    cw = cv.clientWidth; ch = cv.clientHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
  });
  ro.observe(cv);

  function frame(i: Instant, _dt: number, e: Etat) {
    if (mode === 'aucun' || !cw) return;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cw, ch);
    const lignes = mode === 'tout' ? 2 : 1;
    const hL = ch / lignes;
    const x0 = 60, x1 = cw - 8;
    const X = (h: number) => x0 + (h / 24) * (x1 - x0);
    const Y = (v: number) => 4 + (1 - (Math.min(Math.max(v, 40), 350) - 40) / 310) * (hL - 8);
    g.fillStyle = 'rgba(52,211,153,.12)'; g.fillRect(x0, Y(180), x1 - x0, Y(70) - Y(180));
    g.strokeStyle = 'rgba(251,113,133,.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, Y(70)); g.lineTo(x1, Y(70)); g.stroke();
    g.lineWidth = 2; g.lineJoin = 'round';
    for (let m = 6; m < 1440; m += 6) {
      const v = e.G[m];
      g.strokeStyle = v < 70 ? '#fb7185' : v > 180 ? '#fbbf24' : '#34d399';
      g.beginPath(); g.moveTo(X((m - 6) / 60), Y(e.G[m - 6])); g.lineTo(X(m / 60), Y(v)); g.stroke();
    }
    const xc = X(i.heure);
    g.strokeStyle = 'rgba(233,238,248,.6)'; g.lineWidth = 1; g.beginPath(); g.moveTo(xc, 0); g.lineTo(xc, ch); g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(xc, Y(i.G), 3.5, 0, 7); g.fill();
    g.font = '600 10px "Plus Jakarta Sans", system-ui'; g.fillStyle = 'rgba(245,176,39,.9)'; g.textAlign = 'left'; g.textBaseline = 'top';
    g.fillText('CAPTEUR', 6, 4);
    g.fillStyle = '#e9eef8'; g.font = '600 11px "IBM Plex Mono", monospace';
    g.fillText(`${(i.G / 100).toFixed(2).replace('.', ',')} g/L`, 6, 17);
    if (mode === 'tout') {
      const y0 = hL;
      let imax = 20; for (let m = 0; m < 1440; m += 10) imax = Math.max(imax, e.I[m]);
      g.strokeStyle = 'rgba(148,163,184,.18)'; g.beginPath(); g.moveTo(0, y0); g.lineTo(cw, y0); g.stroke();
      g.strokeStyle = '#38bdf8'; g.lineWidth = 1.8; g.beginPath();
      for (let m = 0; m < 1440; m += 6) { const x = X(m / 60), y = y0 + hL - 4 - (e.I[m] / imax) * (hL - 10); m ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
      g.fillStyle = '#7dd3fc'; g.font = '600 10px "Plus Jakarta Sans", system-ui'; g.fillText('INSULINE', 6, y0 + 4);
    }
  }

  return { frame, setMode(m) { mode = m; }, dispose() { ro.disconnect(); } };
}
