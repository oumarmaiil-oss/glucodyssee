/**
 * Scène « Corps » : le sucre (points dorés) et l'insuline (clés bleues) circulent dans le sang.
 * Leur nombre suit la simulation, heure par heure. Les organes mis en évidence s'allument ;
 * le site d'action de chaque traitement prend la couleur de sa classe.
 */
import { useEffect, useRef } from 'react';
import type { Resultat } from '../core/moteur.ts';
import { ORGANES, type OrganeId } from '../content/organes.ts';

const BOUCLE = 'M160 96 C 250 112, 246 330, 178 474 C 170 492, 150 492, 142 474 C 74 330, 70 112, 160 96 Z';
const N_SUCRE = 70, N_CLES = 26;

interface Props {
  sim: Resultat;
  heure: number;
  focus: OrganeId[];
  sites: Partial<Record<OrganeId, string[]>>;
  graisse: number;           // 0 à 1 : tour de taille (terrain du type 2)
  glucosurie: boolean;       // sucre dans les urines à cette heure
  effort: boolean;
  onOrgane?: (o: OrganeId) => void;
}

const valeurA = (arr: number[], h: number) => arr[Math.max(0, Math.min(arr.length - 1, Math.round(h * 60)))] ?? 0;

export function Corps({ sim, heure, focus, sites, graisse, glucosurie, effort, onOrgane }: Props) {
  const chemin = useRef<SVGPathElement>(null);
  const sucres = useRef<(SVGCircleElement | null)[]>([]);
  const cles = useRef<(SVGGElement | null)[]>([]);
  const gouttes = useRef<(SVGCircleElement | null)[]>([]);
  const etat = useRef({ g: 90, i: 8, urine: false });
  etat.current = { g: valeurA(sim.G, heure), i: valeurA(sim.I, heure), urine: glucosurie };

  useEffect(() => {
    const p = chemin.current; if (!p) return;
    const L = p.getTotalLength();
    const pts = Array.from({ length: 400 }, (_, k) => p.getPointAtLength((k / 400) * L));
    const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0, t0 = performance.now();
    const boucle = (t: number) => {
      const s = Math.max(0, (t - t0) / 1000);
      const pt = (u: number) => pts[((Math.floor(u * 400) % 400) + 400) % 400]!;
      const nS = Math.round(Math.min(N_SUCRE, (etat.current.g / 100) * 16));
      const nC = Math.round(Math.min(N_CLES, etat.current.i / 5));
      sucres.current.forEach((c, k) => {
        if (!c) return;
        if (k >= nS) { c.setAttribute('opacity', '0'); return; }
        const u = ((k / N_SUCRE) + (reduit ? 0 : s * 0.035)) % 1;
        const q = pt(u);
        const dec = Math.sin(k * 7.3) * 7;
        c.setAttribute('cx', String(q.x + dec)); c.setAttribute('cy', String(q.y + Math.cos(k * 3.1) * 5)); c.setAttribute('opacity', '0.95');
      });
      cles.current.forEach((g, k) => {
        if (!g) return;
        if (k >= nC) { g.setAttribute('opacity', '0'); return; }
        const u = ((k / N_CLES) + 0.013 + (reduit ? 0 : s * 0.035)) % 1;
        const q = pt(u);
        g.setAttribute('transform', `translate(${q.x + Math.sin(k * 5.1) * 8} ${q.y + Math.cos(k * 2.3) * 6}) rotate(${(s * 60 + k * 40) % 360})`); g.setAttribute('opacity', '1');
      });
      gouttes.current.forEach((c, k) => {
        if (!c) return;
        if (!etat.current.urine) { c.setAttribute('opacity', '0'); return; }
        const u = ((s * 0.6 + k / 6) % 1);
        c.setAttribute('cy', String(282 + u * 70)); c.setAttribute('opacity', String(1 - u));
      });
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, []);

  const i = valeurA(sim.I, heure);
  const enFocus = (o: OrganeId) => focus.includes(o);
  const halo = (o: OrganeId) => {
    const c = sites[o];
    if (c?.length) return { stroke: c[0], strokeWidth: 4, filter: 'url(#lueur)' };
    if (enFocus(o)) return { stroke: 'var(--color-miel)', strokeWidth: 3, filter: 'url(#lueur)' };
    return { stroke: 'var(--color-line-fort)', strokeWidth: 1.2 };
  };
  const organe = (o: OrganeId, el: React.ReactNode) => (
    <g role="button" tabIndex={0} aria-label={`${ORGANES[o].nom} : ${ORGANES[o].role}`} onClick={() => onOrgane?.(o)} onKeyDown={(e) => { if (e.key === 'Enter') onOrgane?.(o); }} style={{ cursor: onOrgane ? 'pointer' : undefined }}>
      {el}
    </g>
  );
  const etiquette = (o: OrganeId, x: number, y: number, ancre: 'start' | 'end' = 'start') => (enFocus(o) || sites[o]?.length) ? (
    <text x={x} y={y} textAnchor={ancre} fontSize="12" fontWeight="700" fill={sites[o]?.[0] ?? 'var(--color-miel)'} style={{ paintOrder: 'stroke', stroke: 'var(--color-fond)', strokeWidth: 4 }}>{ORGANES[o].nom}</text>
  ) : null;

  return (
    <svg viewBox="0 0 320 540" className="w-full h-full" role="img" aria-label="Le corps : le sucre et l'insuline circulent dans le sang">
      <defs>
        <filter id="lueur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="f" /><feMerge><feMergeNode in="f" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <radialGradient id="peau" cx="50%" cy="35%" r="70%"><stop offset="0" stopColor="var(--color-corps)" stopOpacity="0.9" /><stop offset="1" stopColor="var(--color-corps)" stopOpacity="0.45" /></radialGradient>
      </defs>
      {/* Silhouette */}
      <circle cx="160" cy="52" r="34" fill="url(#peau)" />
      <path d="M140 84 h40 v14 c40 6 62 22 66 56 l10 120 c2 14 -14 18 -18 4 l-14 -96 l-4 124 c0 40 -6 70 -8 110 l-6 110 c-1 14 -26 14 -26 0 l-2 -120 h-4 l-2 120 c0 14 -25 14 -26 0 l-6 -110 c-2 -40 -8 -70 -8 -110 l-4 -124 l-14 96 c-4 14 -20 10 -18 -4 l10 -120 c4 -34 26 -50 66 -56 z" fill="url(#peau)" />
      {/* Graisse du ventre */}
      <ellipse cx="160" cy="300" rx={52 + 26 * graisse} ry={34 + 14 * graisse} fill="var(--color-graisse)" opacity={0.12 + 0.3 * graisse} />
      {/* Organes */}
      {organe('cerveau', <path d="M138 46 c0 -16 12 -24 22 -24 s22 8 22 24 c0 12 -10 18 -22 18 s-22 -6 -22 -18 z" fill="var(--color-cerveau)" {...halo('cerveau')} />)}
      {organe('coeur', <path d="M176 140 c-6 -10 -20 -6 -18 6 c2 10 18 20 18 20 s16 -10 18 -20 c2 -12 -12 -16 -18 -6 z" fill="var(--color-sang)" {...halo('coeur')} />)}
      {organe('foie', <path d="M92 196 c6 -18 40 -22 76 -12 c8 3 6 14 -2 18 c-26 14 -50 24 -66 18 c-8 -3 -10 -14 -8 -24 z" fill="var(--color-foie)" {...halo('foie')} />)}
      {organe('estomac', <path d="M176 188 c14 -6 34 2 32 20 c-2 16 -18 22 -30 18 c-8 -3 -4 -12 -10 -18 c-4 -6 2 -16 8 -20 z" fill="var(--color-estomac)" {...halo('estomac')} />)}
      {organe('pancreas', <path d="M128 236 c16 -8 52 -10 76 -4 c8 2 6 10 -2 12 c-24 6 -54 6 -72 2 c-6 -2 -6 -8 -2 -10 z" fill="var(--color-pancreas)" {...halo('pancreas')} />)}
      {organe('reins', <g><path d="M114 250 c-12 4 -12 26 0 30 c8 3 10 -6 8 -14 c-2 -8 0 -18 -8 -16 z" fill="var(--color-rein)" {...halo('reins')} /><path d="M206 250 c12 4 12 26 0 30 c-8 3 -10 -6 -8 -14 c2 -8 0 -18 8 -16 z" fill="var(--color-rein)" {...halo('reins')} /></g>)}
      {organe('intestin', <g><rect x="122" y="286" width="76" height="52" rx="22" fill="var(--color-intestin)" {...halo('intestin')} /><path d="M132 300 q10 -8 20 0 t20 0 t20 0 M132 314 q10 -8 20 0 t20 0 t20 0 M132 328 q10 -8 20 0 t20 0 t20 0" fill="none" stroke="var(--color-fond)" strokeOpacity=".35" strokeWidth="2" /></g>)}
      {organe('muscles', <g><rect x="122" y="392" width="34" height="96" rx="15" fill="var(--color-muscle)" fillOpacity={0.45 + 0.5 * (i / (i + 40)) + (effort ? 0.2 : 0)} {...halo('muscles')} /><rect x="164" y="392" width="34" height="96" rx="15" fill="var(--color-muscle)" fillOpacity={0.45 + 0.5 * (i / (i + 40)) + (effort ? 0.2 : 0)} {...halo('muscles')} /></g>)}
      {organe('graisse', <ellipse cx="160" cy="356" rx="20" ry="8" fill="var(--color-graisse)" fillOpacity="0.5" {...halo('graisse')} />)}
      {/* Vaisseau et particules */}
      <path ref={chemin} d={BOUCLE} fill="none" stroke="var(--color-sang)" strokeOpacity=".35" strokeWidth="10" strokeLinecap="round" />
      {organe('sang', <path d={BOUCLE} fill="none" stroke="transparent" strokeWidth="18" />)}
      {Array.from({ length: N_SUCRE }, (_, k) => <circle key={`s${k}`} ref={(el) => { sucres.current[k] = el; }} r="3.2" fill="var(--color-miel)" opacity="0" />)}
      {Array.from({ length: N_CLES }, (_, k) => (
        <g key={`c${k}`} ref={(el) => { cles.current[k] = el; }} opacity="0">
          <circle r="3.6" fill="none" stroke="var(--color-insuline)" strokeWidth="1.8" /><path d="M3.6 0 h6 m-2 0 v3 m-2.5 -3 v2.4" stroke="var(--color-insuline)" strokeWidth="1.8" fill="none" />
        </g>
      ))}
      {/* Urines */}
      {Array.from({ length: 6 }, (_, k) => <circle key={`u${k}`} ref={(el) => { gouttes.current[k] = el; }} cx={k % 2 ? 206 : 114} cy="282" r="2.6" fill="var(--color-miel)" opacity="0" />)}
      {glucosurie && <text x="160" y="380" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-miel)" style={{ paintOrder: 'stroke', stroke: 'var(--color-fond)', strokeWidth: 4 }}>sucre dans les urines</text>}
      {effort && <text x="160" y="508" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--color-ok)">effort en cours</text>}
      {/* Étiquettes */}
      {etiquette('cerveau', 200, 34)}{etiquette('coeur', 200, 152)}{etiquette('foie', 88, 182, 'end')}{etiquette('estomac', 214, 196)}
      {etiquette('pancreas', 214, 244)}{etiquette('reins', 92, 268, 'end')}{etiquette('intestin', 206, 320)}{etiquette('muscles', 206, 440)}
      {etiquette('graisse', 112, 360, 'end')}{etiquette('sang', 252, 300)}
    </svg>
  );
}
