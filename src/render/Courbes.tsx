/** Courbes : glycémie sur 24 h (avec courbe « sans traitement », cible, repas, injections, curseur) et HbA1c sur 10 ans. */
import { useEffect, useRef, useState } from 'react';
import { INSULINES, type Injection, type Repas, type Resultat } from '../core/moteur.ts';

const nf = (x: number, d = 2) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

function useLargeur<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [l, setL] = useState(600);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => setL(Math.max(280, Math.round(el.clientWidth))));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, l] as const;
}

export function Courbe24h({ sim, fantome, repas, injections, heure, onHeure }: { sim: Resultat; fantome: Resultat | null; repas: Repas[]; injections: Injection[]; heure: number; onHeure: (h: number) => void }) {
  const [ref, W] = useLargeur<HTMLDivElement>();
  const H = W < 520 ? 210 : 260, g = { l: 38, r: 8, t: 16, b: 24 };
  const max = Math.max(...sim.G) / 100;
  const yMax = [2.5, 3, 4, 6, 9].find((v) => v >= max + 0.2) ?? 9;
  const X = (h: number) => g.l + (h / 24) * (W - g.l - g.r);
  const Y = (v: number) => g.t + (1 - v / yMax) * (H - g.t - g.b);
  const ticks = yMax <= 3 ? [0, 0.5, 1, 1.5, 2, 2.5, 3].filter((v) => v <= yMax) : yMax <= 4 ? [0, 1, 2, 3, 4] : yMax <= 6 ? [0, 2, 4, 6] : [0, 3, 6, 9];
  const chemin = (G: number[]) => G.filter((_, i) => i % 4 === 0).map((v, k) => `${k ? 'L' : 'M'}${X((k * 4) / 60).toFixed(1)},${Y(Math.min(v / 100, yMax)).toFixed(1)}`).join('');
  const Hi = 54, iMax = Math.max(40, ...sim.I) * 1.1, Yi = (v: number) => 4 + (1 - v / iMax) * (Hi - 8);
  const ci = sim.I.filter((_, i) => i % 4 === 0).map((v, k) => `${k ? 'L' : 'M'}${X((k * 4) / 60).toFixed(1)},${Yi(v).toFixed(1)}`).join('');
  const gHeure = sim.G[Math.min(sim.G.length - 1, Math.round(heure * 60))] ?? 0;
  const choisir = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const h = ((e.clientX - r.left) / r.width * W - g.l) / (W - g.l - g.r) * 24;
    onHeure(Math.max(0, Math.min(23.99, h)));
  };
  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none" onPointerDown={choisir} onPointerMove={(e) => { if (e.buttons) choisir(e); }} role="img" aria-label="Glycémie sur 24 heures">
        <rect x={g.l} y={Y(1.8)} width={W - g.l - g.r} height={Y(0.7) - Y(1.8)} fill="var(--color-cible-fond)" />
        <line x1={g.l} x2={W - g.r} y1={Y(0.7)} y2={Y(0.7)} stroke="var(--color-alert)" strokeDasharray="4 4" />
        <text x={W - g.r} y={Y(0.7) + 12} textAnchor="end" fontSize="10.5" fill="var(--color-alert)">hypoglycémie &lt; 0,70</text>
        {ticks.map((v) => <g key={v}><line x1={g.l} x2={W - g.r} y1={Y(v)} y2={Y(v)} stroke="var(--color-line)" /><text x={g.l - 5} y={Y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--color-dim)" className="num">{nf(v, v % 1 ? 1 : 0)}</text></g>)}
        {Array.from({ length: W < 520 ? 5 : 9 }, (_, k) => k * (W < 520 ? 6 : 3)).map((h) => <text key={h} x={X(h)} y={H - 7} textAnchor="middle" fontSize="10.5" fill="var(--color-dim)" className="num">{h} h</text>)}
        <text x={g.l} y={11} fontSize="10.5" fill="var(--color-dim)">g/L</text>
        {repas.filter((r) => r.g > 0).map((r, k) => <g key={k}><line x1={X(r.h)} x2={X(r.h)} y1={g.t} y2={H - g.b} stroke="var(--color-miel)" strokeOpacity=".25" /><circle cx={X(r.h)} cy={g.t + 2} r="4.5" fill="var(--color-miel)" /><text x={X(r.h) + 7} y={g.t + 6} fontSize="10.5" fill="var(--color-dim)">{r.g} g</text></g>)}
        {fantome && <path d={chemin(fantome.G)} fill="none" stroke="var(--color-fantome)" strokeWidth="2" strokeDasharray="5 4" />}
        <path d={chemin(sim.G)} fill="none" stroke="var(--color-miel)" strokeWidth="3" strokeLinejoin="round" />
        <line x1={X(heure)} x2={X(heure)} y1={g.t} y2={H - g.b} stroke="var(--color-txt)" strokeOpacity=".5" />
        <circle cx={X(heure)} cy={Y(Math.min(yMax, gHeure / 100))} r="5.5" fill="var(--color-miel)" stroke="var(--color-fond)" strokeWidth="2" />
      </svg>
      <svg viewBox={`0 0 ${W} ${Hi}`} className="w-full h-auto" role="img" aria-label="Insuline dans le sang">
        <path d={`${ci} L${X(24)},${Yi(0)} L${X(0)},${Yi(0)} Z`} fill="var(--color-insuline)" fillOpacity=".14" />
        <path d={ci} fill="none" stroke="var(--color-insuline)" strokeWidth="2" />
        <text x={g.l + 4} y={13} fontSize="10.5" fill="var(--color-insuline)">insuline dans le sang</text>
        {injections.filter((j) => !INSULINES[j.type].continu).map((j, k) => <path key={k} d={`M${X(j.h)},${Hi - 1} l-4,-8 h8 z`} fill="var(--color-insuline)" />)}
        <line x1={X(heure)} x2={X(heure)} y1={0} y2={Hi} stroke="var(--color-txt)" strokeOpacity=".35" />
      </svg>
    </div>
  );
}

export function Courbe10ans({ sans, avec }: { sans: { hba1c: number }[]; avec: { hba1c: number }[] }) {
  const [ref, W] = useLargeur<HTMLDivElement>();
  const H = 170, g = { l: 34, r: 8, t: 10, b: 22 };
  const tous = [...sans, ...avec].map((x) => x.hba1c);
  const hmax = Math.max(8, Math.ceil(Math.max(...tous) + 0.5)), hmin = Math.min(5, Math.floor(Math.min(...tous) - 0.3));
  const X = (k: number) => g.l + (k / 10) * (W - g.l - g.r), Y = (v: number) => g.t + (1 - (v - hmin) / (hmax - hmin)) * (H - g.t - g.b);
  const p = (arr: { hba1c: number }[]) => arr.map((x, k) => `${k ? 'L' : 'M'}${X(k).toFixed(1)},${Y(Math.min(hmax, x.hba1c)).toFixed(1)}`).join('');
  const meme = sans.every((x, k) => Math.abs(x.hba1c - (avec[k]?.hba1c ?? 0)) < 0.01);
  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="HbA1c estimée sur 10 ans">
        {Array.from({ length: hmax - hmin + 1 }, (_, k) => hmin + k).map((v) => <g key={v}><line x1={g.l} x2={W - g.r} y1={Y(v)} y2={Y(v)} stroke="var(--color-line)" /><text x={g.l - 5} y={Y(v) + 4} textAnchor="end" fontSize="10.5" fill="var(--color-dim)" className="num">{v} %</text></g>)}
        <line x1={g.l} x2={W - g.r} y1={Y(7)} y2={Y(7)} stroke="var(--color-ok)" strokeDasharray="4 4" />
        <text x={g.l + 4} y={Y(7) - 4} fontSize="10.5" fill="var(--color-ok)">objectif 7 %</text>
        {[0, 2, 4, 6, 8, 10].map((k) => <text key={k} x={X(k)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="var(--color-dim)">{k === 0 ? 'auj.' : `${k} ans`}</text>)}
        {!meme && <path d={p(sans)} fill="none" stroke="var(--color-fantome)" strokeWidth="2" strokeDasharray="5 4" />}
        <path d={p(avec)} fill="none" stroke="var(--color-miel)" strokeWidth="3" />
        {!meme && <text x={X(10)} y={Y(Math.min(hmax, sans[10]!.hba1c)) - 6} textAnchor="end" fontSize="10.5" fill="var(--color-dim)">sans traitement {nf(sans[10]!.hba1c, 1)} %</text>}
        <text x={X(10)} y={Y(Math.min(hmax, avec[10]!.hba1c)) + 14} textAnchor="end" fontSize="10.5" fill="var(--color-miel)">{meme ? 'sans traitement' : 'avec le traitement'} {nf(avec[10]!.hba1c, 1)} %</text>
      </svg>
    </div>
  );
}
