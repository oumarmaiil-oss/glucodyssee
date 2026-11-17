/**
 * Vues détaillées des organes : pancréas en 3D (îlots), foie, intestin, muscle, rein, cerveau en 2D animée.
 * Chaque vue réagit à la simulation (glycémie, insuline, repas) et aux traitements actifs.
 */
import { useEffect, useRef, useState } from 'react';
import type { Traitements } from '../core/moteur.ts';
import type { OrganeId } from '../content/organes.ts';
import type { ModePancreas, Pancreas3D } from './Pancreas3D.ts';

export interface EtatOrgane {
  g: number;          // glycémie (mg/dL)
  i: number;          // insuline plasmatique (µU/mL)
  ra: number;         // apparition du glucose du repas (mg/kg/min)
  secretion: number;  // 0-1
  beta: number; type1: boolean; si: number;
  tr: Traitements; injection: boolean; ir: boolean; effort: boolean;
}

export const ORGANES_DETAILLES: OrganeId[] = ['pancreas', 'foie', 'intestin', 'muscles', 'reins', 'cerveau'];

const T = ({ x, y, children, c = 'var(--color-txt)', s = 11, a = 'middle', w = 600 }: { x: number; y: number; children: React.ReactNode; c?: string; s?: number; a?: 'start' | 'middle' | 'end'; w?: number }) => (
  <text x={x} y={y} fontSize={s} fontWeight={w} fill={c} textAnchor={a} style={{ paintOrder: 'stroke', stroke: 'var(--color-fond)', strokeWidth: 3 }}>{children}</text>
);
/** n particules qui suivent un chemin (animation SVG native, légère). */
function Flux({ n, d, c, r = 3, dur = 3, key0 = '' }: { n: number; d: string; c: string; r?: number; dur?: number; key0?: string }) {
  return <>{Array.from({ length: Math.max(0, Math.round(n)) }, (_, k) => (
    <circle key={key0 + k} r={r} fill={c}>
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${-(k * dur) / Math.max(1, n)}s`} path={d} />
    </circle>
  ))}</>;
}
const Badge = ({ x, y, c, children }: { x: number; y: number; c: string; children: React.ReactNode }) => (
  <g><rect x={x} y={y - 12} width={String(children).length * 6.2 + 14} height="18" rx="9" fill={c} fillOpacity=".18" stroke={c} strokeOpacity=".7" /><T x={x + 7} y={y + 1} c={c} s={10.5} a="start" w={700}>{children}</T></g>
);

export function VueOrgane({ organe, e, onMode, mode }: { organe: OrganeId; e: EtatOrgane; mode: ModePancreas; onMode: (m: ModePancreas) => void }) {
  if (organe === 'pancreas') return <VuePancreas e={e} mode={mode} onMode={onMode} />;
  return (
    <svg viewBox="0 -30 320 350" className="w-full h-full" role="img" aria-label={`Vue détaillée : ${organe}`}>
      {organe === 'foie' && <Foie e={e} />}
      {organe === 'intestin' && <Intestin e={e} />}
      {organe === 'muscles' && <Muscle e={e} />}
      {organe === 'reins' && <Rein e={e} />}
      {organe === 'cerveau' && <Cerveau e={e} />}
    </svg>
  );
}

function VuePancreas({ e, mode, onMode }: { e: EtatOrgane; mode: ModePancreas; onMode: (m: ModePancreas) => void }) {
  const hote = useRef<HTMLDivElement>(null);
  const rendu = useRef<Pancreas3D | null>(null);
  const [erreur, setErreur] = useState(false);
  const [pret, setPret] = useState(false);
  useEffect(() => {
    let annule = false;
    import('./Pancreas3D.ts').then((m) => { if (annule || !hote.current) return; rendu.current = m.creerPancreas3D(hote.current, mode); setPret(true); }).catch(() => setErreur(true));
    return () => { annule = true; rendu.current?.dispose(); rendu.current = null; };
  }, []);
  useEffect(() => { rendu.current?.mode(mode); }, [mode, pret]);
  useEffect(() => {
    rendu.current?.maj({ glycemie: e.g, secretion: e.secretion, beta: e.beta, type1: e.type1, sulfamide: (e.tr.sulfamide ?? 0) > 0, incretine: (e.tr.idpp4 ?? 0) > 0 || (e.tr.aglp1 ?? 0) > 0 });
  });
  return (
    <div className="relative w-full h-full">
      <div ref={hote} className="absolute inset-0" />
      {!pret && !erreur && <div className="absolute inset-0 grid place-items-center text-dim text-sm">Préparation du pancréas en 3D…</div>}
      {erreur && <div className="absolute inset-0 grid place-items-center text-center p-6 text-dim text-sm">La 3D n'est pas disponible sur cet appareil.</div>}
      <div className="absolute top-10 inset-x-2 flex justify-center"><div className="inline-flex p-0.5 rounded-xl bg-fond/85 border border-line">
        <button onClick={() => onMode('organe')} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${mode === 'organe' ? 'bg-miel text-fond' : 'text-muted'}`}>Le pancréas</button>
        <button onClick={() => onMode('ilot')} className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold ${mode === 'ilot' ? 'bg-miel text-fond' : 'text-muted'}`}>Zoom sur un îlot</button>
      </div></div>
      <div className="absolute bottom-7 inset-x-2 text-center text-[11px] text-muted pointer-events-none">
        {mode === 'organe'
          ? <>Tête (contre le duodénum), corps, queue · <b className="text-ok">îlots de Langerhans</b> (1 à 2 % du pancréas)</>
          : <><b className="text-[#7fd36a]">cellules bêta</b> (insuline) · <b className="text-[#ff7f96]">cellules alpha</b> (glucagon) · <b className="text-miel">sucre</b> · <b className="text-insuline">insuline</b>{e.type1 ? <> · <b className="text-txt">lymphocytes</b> (attaque auto-immune)</> : null}{(e.tr.idpp4 || e.tr.aglp1) ? <> · <b className="text-[#b6ffb0]">incrétines</b></> : null}</>}
      </div>
      <div className="absolute bottom-1 inset-x-2 text-center text-[10.5px] text-dim pointer-events-none">Glissez pour faire tourner · pincez pour zoomer</div>
    </div>
  );
}

function Foie({ e }: { e: EtatOrgane }) {
  const stocke = e.i > 18;                 // insuline élevée : le foie stocke
  const metf = (e.tr.metformine ?? 0) > 0;
  const production = stocke ? 0 : Math.min(10, (e.type1 && e.i < 4 ? 10 : 5) * (metf ? 0.5 : 1) * (e.g < 70 ? 1.6 : 1));
  const glycogene = Math.round(Math.min(26, 6 + e.i / 3));
  return (<>
    <T x={160} y={22} s={13} w={700}>Le foie : réserve et usine à sucre</T>
    <path d="M40 120 c10 -50 120 -70 220 -40 c30 10 26 50 -6 66 c-70 40 -150 70 -196 50 c-22 -10 -24 -50 -18 -76 z" fill="var(--color-foie)" opacity=".85" />
    {Array.from({ length: glycogene }, (_, k) => <g key={k} transform={`translate(${70 + (k % 9) * 20} ${100 + Math.floor(k / 9) * 22})`}><path d="M0 -5 L1.5 -1.5 L5 0 L1.5 1.5 L0 5 L-1.5 1.5 L-5 0 L-1.5 -1.5 Z" fill="#ffe2a0" opacity=".9" /></g>)}
    <T x={160} y={196} c="#ffe2a0" s={10.5}>étoiles : glycogène (sucre en réserve)</T>
    <path id="vers-foie" d="M20 250 C 80 250, 100 200, 150 150" fill="none" stroke="var(--color-sang)" strokeOpacity=".4" strokeWidth="10" />
    <path d="M190 150 C 230 200, 250 250, 305 250" fill="none" stroke="var(--color-sang)" strokeOpacity=".4" strokeWidth="10" />
    {stocke && <Flux n={Math.min(9, e.g / 25)} d="M20 250 C 80 250, 100 200, 150 150" c="var(--color-miel)" dur={2.4} />}
    {production > 0 && <Flux n={production} d="M190 150 C 230 200, 250 250, 305 250" c="var(--color-miel)" dur={2.4} key0="p" />}
    <T x={60} y={276} c="var(--color-miel)" s={10.5}>{stocke ? 'le sucre entre (repas, insuline)' : ''}</T>
    <T x={262} y={276} c="var(--color-miel)" s={10.5}>{production > 0 ? 'le foie libère du sucre' : ''}</T>
    <T x={160} y={300} c="var(--color-muted)" s={11} w={500}>{stocke ? 'Insuline haute : le foie stocke et arrête de produire.' : e.type1 && e.i < 4 ? 'Sans insuline, le foie s\'emballe : il produit trop de sucre.' : 'Insuline basse (nuit, entre les repas) : le foie libère du sucre.'}</T>
    {metf && <Badge x={14} y={52} c="#60a5fa">metformine : le foie produit moins</Badge>}
    {e.g < 70 && <Badge x={14} y={74} c="var(--color-alert)">hypoglycémie : le glucagon relance le foie</Badge>}
  </>);
}

function Intestin({ e }: { e: EtatOrgane }) {
  const repas = e.ra > 0.3;
  const dpp4 = (e.tr.idpp4 ?? 0) > 0, glp1 = (e.tr.aglp1 ?? 0) > 0;
  const villosites = [40, 80, 120, 160, 200, 240, 280];
  return (<>
    <T x={160} y={22} s={13} w={700}>L'intestin : le sucre du repas entre dans le sang</T>
    <rect x="10" y="40" width="300" height="70" rx="10" fill="var(--color-intestin)" opacity=".25" />
    <T x={160} y={60} c="var(--color-muted)" s={10.5} w={500}>dans l'intestin : le repas digéré</T>
    {repas && <Flux n={Math.min(14, e.ra * 1.6)} d="M10 85 L310 85" c="var(--color-miel)" dur={6} />}
    {villosites.map((x) => <path key={x} d={`M${x - 14} 200 Q ${x - 14} 110 ${x} 108 Q ${x + 14} 110 ${x + 14} 200 Z`} fill="var(--color-intestin)" opacity=".9" />)}
    {repas && villosites.map((x, k) => <Flux key={x} n={Math.min(3, e.ra / 2.5 + 1)} d={`M${x} 104 L${x} 236`} c="var(--color-miel)" dur={2} key0={`v${k}`} />)}
    <rect x="10" y="230" width="300" height="20" rx="10" fill="var(--color-sang)" opacity=".45" />
    <T x={160} y={266} c="var(--color-sang)" s={10.5}>vers le sang (veine porte), puis le foie</T>
    {/* Cellules L : GLP-1 vers le pancréas */}
    <circle cx="100" cy="150" r="9" fill="#34d399" opacity=".9" /><circle cx="220" cy="160" r="9" fill="#34d399" opacity=".9" />
    {repas && <Flux n={4} d="M100 150 C 100 220, 160 280, 300 300" c="#b6ffb0" dur={3} key0="g" />}
    {repas && !dpp4 && <g><circle cx="196" cy="286" r="7" fill="none" stroke="var(--color-alert)" strokeWidth="2" /><T x={208} y={290} c="var(--color-alert)" s={10} a="start">la DPP-4 détruit le GLP-1</T></g>}
    <T x={160} y={314} c="var(--color-muted)" s={11} w={500}>{repas ? 'Les cellules L libèrent les incrétines (GLP-1) qui préviennent le pancréas.' : 'Pas de repas en cours : rien n\'entre.'}</T>
    {dpp4 && <Badge x={14} y={130} c="#a78bfa">iDPP-4 : le GLP-1 dure plus longtemps</Badge>}
    {glp1 && <Badge x={14} y={130 + (dpp4 ? 22 : 0)} c="#34d399">aGLP-1 : vidange plus lente, plus d'incrétine</Badge>}
  </>);
}

function Muscle({ e }: { e: EtatOrgane }) {
  const ouverture = Math.min(1, (e.i / (e.i + 40)) * e.si * 1.6 + (e.effort ? 0.6 : 0));
  const portes = [70, 130, 190, 250];
  const t2 = e.si < 0.7;
  return (<>
    <T x={160} y={22} s={13} w={700}>Le muscle : la clé ouvre la porte</T>
    <rect x="20" y="40" width="280" height="80" rx="12" fill="var(--color-sang)" opacity=".18" />
    <T x={160} y={58} c="var(--color-muted)" s={10.5} w={500}>sang : sucre et insuline</T>
    <Flux n={Math.min(12, e.g / 18)} d="M20 90 L300 90" c="var(--color-miel)" dur={7} />
    <Flux n={Math.min(10, e.i / 6)} d="M300 105 L20 105" c="var(--color-insuline)" dur={8} r={2.6} key0="i" />
    <rect x="10" y="130" width="300" height="16" rx="8" fill="var(--color-muscle)" opacity=".7" />
    {portes.map((x) => (
      <g key={x}>
        <rect x={x - 12} y="126" width="24" height="24" rx="5" fill="var(--color-fond)" stroke={t2 ? '#b07a4a' : 'var(--color-ok)'} strokeWidth="2" />
        <rect x={x - 10} y="128" width={20 * (1 - ouverture)} height="20" rx="3" fill={t2 ? '#7a5634' : 'var(--color-ok)'} opacity=".55" />
        {e.i > 6 && <g transform={`translate(${x} 116)`}><circle r="4" fill="none" stroke="var(--color-insuline)" strokeWidth="2" /><path d="M4 0 h7 m-2 0 v3" stroke="var(--color-insuline)" strokeWidth="2" /></g>}
        {ouverture > 0.08 && <Flux n={Math.round(ouverture * 4)} d={`M${x} 100 L${x} 260`} c="var(--color-miel)" dur={2.2} key0={`m${x}`} />}
      </g>
    ))}
    <rect x="10" y="150" width="300" height="130" rx="12" fill="var(--color-muscle)" opacity=".28" />
    <T x={160} y={300} c="var(--color-muted)" s={11} w={500}>{e.effort ? 'Effort : les portes s\'ouvrent même avec peu d\'insuline.' : t2 ? 'Serrures grippées (résistance) : la clé ouvre mal la porte.' : ouverture > 0.4 ? 'Insuline présente : les portes (GLUT4) sont ouvertes, le sucre entre.' : 'Peu d\'insuline : les portes restent presque fermées.'}</T>
    <T x={160} y={232} c="var(--color-txt)" s={11}>cellule musculaire : le sucre devient énergie</T>
    {t2 && <Badge x={14} y={172} c="#b07a4a">résistance à l'insuline</Badge>}
    {(e.tr.metformine ?? 0) > 0 && <Badge x={14} y={194} c="#60a5fa">metformine : meilleure sensibilité</Badge>}
  </>);
}

function Rein({ e }: { e: EtatOrgane }) {
  const sglt2 = (e.tr.isglt2 ?? 0) > 0;
  const seuil = sglt2 ? 70 : 180;
  const fuite = e.g > seuil ? Math.min(10, (e.g - seuil) / (sglt2 ? 12 : 20)) * (e.ir ? 0.5 : 1) : 0;
  const yS = (g: number) => 280 - Math.min(400, g) / 400 * 200;
  return (<>
    <T x={160} y={22} s={13} w={700}>Le rein : il récupère le sucre… jusqu'à un seuil</T>
    <circle cx="70" cy="80" r="30" fill="var(--color-rein)" opacity=".8" /><T x={70} y={124} s={10.5} c="var(--color-muted)" w={500}>glomérule : filtre</T>
    <path d="M100 80 H 200 C 230 80 230 150 200 150 H 120 C 95 150 95 220 120 220 H 220" fill="none" stroke="var(--color-rein)" strokeWidth="14" strokeOpacity=".55" strokeLinecap="round" />
    <Flux n={Math.min(10, e.g / 20)} d="M100 80 H 200 C 230 80 230 150 200 150 H 120 C 95 150 95 220 120 220 H 220" c="var(--color-miel)" dur={6} />
    {[130, 160, 190].map((x) => <g key={x}><rect x={x - 6} y="66" width="12" height="28" rx="4" fill={sglt2 ? '#7a6250' : '#fb923c'} opacity={sglt2 ? 0.5 : 0.9} /><path d={`M${x} 64 L${x} 40`} stroke="var(--color-miel)" strokeWidth="2" strokeDasharray="3 3" /></g>)}
    <T x={160} y={36} c="#fb923c" s={10.5}>SGLT2 : récupèrent le sucre</T>
    {fuite > 0 && <Flux n={fuite} d="M220 220 L 290 220 L 290 300" c="var(--color-miel)" dur={2.2} key0="u" />}
    <T x={262} y={250} c={fuite > 0 ? 'var(--color-miel)' : 'var(--color-dim)'} s={10.5}>{fuite > 0 ? 'sucre dans les urines' : 'urines sans sucre'}</T>
    {/* Jauge glycémie / seuil */}
    <rect x="20" y="80" width="10" height="200" rx="5" fill="var(--color-card2)" />
    <rect x="20" y={yS(e.g)} width="10" height={280 - yS(e.g)} rx="5" fill="var(--color-miel)" />
    <line x1="14" x2="44" y1={yS(seuil)} y2={yS(seuil)} stroke="var(--color-alert)" strokeWidth="2" />
    <T x={48} y={yS(seuil) + 4} c="var(--color-alert)" s={10} a="start">seuil {sglt2 ? '≈ 0,70' : '≈ 1,80'} g/L</T>
    <T x={160} y={300} c="var(--color-muted)" s={11} w={500}>{sglt2 ? 'iSGLT2 : le rein laisse partir du sucre (60-80 g/j).' : fuite > 0 ? 'Glycémie au-dessus de 1,80 g/L : le rein déborde.' : 'Sous 1,80 g/L, tout le sucre filtré est récupéré.'}</T>
    {e.ir && <Badge x={130} y={262} c="var(--color-alert)">rein malade : filtre moins</Badge>}
  </>);
}

function Cerveau({ e }: { e: EtatOrgane }) {
  const hypo = e.g < 70, severe = e.g < 54;
  return (<>
    <T x={160} y={22} s={13} w={700}>Le cerveau : il a besoin de sucre en continu</T>
    <path d="M70 150 c-20 -70 60 -110 100 -96 c30 -30 110 -10 100 50 c30 30 0 90 -40 84 c-20 30 -90 30 -110 4 c-40 6 -60 -20 -50 -42 z" fill="var(--color-cerveau)" opacity={hypo ? 0.45 : 0.85} />
    <Flux n={Math.min(10, e.g / 15)} d="M20 260 C 80 240, 120 200, 160 150" c="var(--color-miel)" dur={2.8} />
    <T x={160} y={224} c="var(--color-muted)" s={10.5} w={500}>environ 120 g de glucose par jour, sans insuline</T>
    {hypo ? (<>
      <T x={160} y={256} c="var(--color-alert)" s={13} w={800}>{severe ? 'Hypoglycémie sévère : confusion, malaise' : 'Hypoglycémie : le cerveau manque de sucre'}</T>
      <T x={160} y={278} c="var(--color-alert)" s={11}>sueurs · tremblements · faim · cœur rapide{severe ? ' · troubles du comportement' : ''}</T>
      <T x={160} y={300} c="var(--color-txt)" s={11}>Règle des 15 : 15 g de sucre, contrôle 15 min plus tard.</T>
    </>) : <T x={160} y={276} c="var(--color-ok)" s={12}>Glycémie suffisante : le cerveau fonctionne normalement.</T>}
  </>);
}
