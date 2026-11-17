/** Petits composants : moniteur, risques, graphique d'évolution. */
import type { Etat, Niveau } from '../core/types.ts';
import type { PointEvolution } from '../core/engine.ts';
import { dfg } from '../core/engine.ts';

const g2 = (mg: number) => (mg / 100).toFixed(2).replace('.', ',');
const v1 = (x: number) => x.toFixed(1).replace('.', ',');
const pc = (x: number) => `${Math.round(x * 100)}`;

/**
 * Statut de la glycémie au réveil (ADA). Sans diabète : seuils diagnostiques (normal < 1,00 ; prédiabète 1,00-1,25 ;
 * diabète ≥ 1,26). Chez le diabétique : objectif avant repas 0,80-1,30 g/L (à individualiser).
 */
export const statutJeun = (mg: number, diabetique = false) =>
  mg < 70 ? { t: 'Trop basse', c: 'text-alert' }
    : diabetique ? (mg < 80 ? { t: 'Un peu basse', c: 'text-warn' } : mg <= 130 ? { t: 'Dans l\'objectif', c: 'text-ok' } : mg < 200 ? { t: 'Au-dessus de l\'objectif', c: 'text-warn' } : { t: 'Très élevée', c: 'text-alert' })
      : mg < 100 ? { t: 'Normale', c: 'text-ok' }
        : mg < 126 ? { t: 'Prédiabète', c: 'text-warn' }
          : mg < 200 ? { t: 'Diabète', c: 'text-warn' } : { t: 'Très élevée', c: 'text-alert' };

/** Statut de l'HbA1c : jamais en vert quand elle cache des hypoglycémies. */
export const statutHba1c = (e: Etat) => {
  const h = e.stats.hba1c;
  if (e.stats.tbr70 > 0.04 || e.stats.tbr54 > 0) return { t: 'Cache des hypos', c: 'text-alert' };
  if (e.terrain.type === 'aucun') return h < 5.7 ? { t: 'Normale', c: 'text-ok' } : h < 6.5 ? { t: 'Prédiabète', c: 'text-warn' } : { t: 'Diabète', c: 'text-warn' };
  return h < 7 ? { t: 'Objectif atteint', c: 'text-ok' } : h < 8 ? { t: 'Au-dessus de 7 %', c: 'text-warn' } : { t: 'Élevée', c: 'text-alert' };
};

function Mesure({ nom, valeur, unite, note, couleur, delta }: { nom: string; valeur: string; unite?: string; note?: string; couleur?: string; delta?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9.5px] sm:text-[10.5px] uppercase tracking-wider text-dim font-semibold truncate leading-tight">{nom}</div>
      <div className="flex flex-nowrap sm:flex-wrap items-baseline gap-x-1 leading-tight">
        <span className={`num text-[15px] sm:text-[19px] font-semibold ${couleur ?? ''}`}>{valeur}</span>
        {unite && <span className="text-[10px] sm:text-[11px] text-dim">{unite}</span>}
        {delta && <span className="num text-[10px] sm:text-[11px] text-ok ml-0.5">{delta}</span>}
      </div>
      {note && <div className={`hidden sm:block text-[11px] font-semibold ${couleur ?? 'text-muted'}`}>{note}</div>}
    </div>
  );
}

export function Moniteur({ e, niveau, ref0, compact }: { e: Etat; niveau: Niveau; ref0?: Etat | null; compact?: boolean }) {
  const st = e.stats;
  const j = statutJeun(st.aJeun, ['t1', 't2', 'gestationnel'].includes(e.terrain.type) && Object.keys(e.traitement).length > 0), hb = statutHba1c(e);
  const d = (a: number, b: number | undefined, f: (x: number) => string) => (b !== undefined && f(a) !== f(b) ? `${a - b > 0 ? '+' : '−'}${f(Math.abs(a - b))}` : undefined);
  const hbTxt = st.hba1c > 14 ? '> 14' : v1(st.hba1c);
  const hypo = st.tbr54 > 0 ? { t: 'Niveau 2', c: 'text-alert' } : st.tbr70 > 0 ? { t: 'Niveau 1', c: 'text-warn' } : { t: 'Aucune', c: 'text-ok' };
  return (
    <div className={`carte px-2.5 py-1.5 sm:p-3 gap-x-3.5 sm:gap-x-4 gap-y-2 flex overflow-x-auto scroll-thin [&>*]:shrink-0 sm:[&>*]:min-w-[86px] sm:grid ${compact ? 'sm:grid-cols-3' : 'sm:grid-cols-6'}`} data-testid="moniteur">
      <Mesure nom="Glycémie au réveil" valeur={g2(st.aJeun)} unite="g/L" note={j.t} couleur={j.c} delta={d(st.aJeun / 100, ref0 ? ref0.stats.aJeun / 100 : undefined, (x) => x.toFixed(2).replace('.', ','))} />
      <Mesure nom="HbA1c estimée" valeur={hbTxt} unite="%" note={hb.t} couleur={hb.c} delta={d(st.hba1c, ref0?.stats.hba1c, v1)} />
      {niveau >= 2 ? (
        <>
          <Mesure nom="Pic après repas" valeur={st.max > 600 ? '> 6' : g2(st.max)} unite="g/L" couleur={st.max >= 300 ? 'text-alert' : st.max > 180 ? 'text-warn' : undefined} delta={d(st.max / 100, ref0 ? ref0.stats.max / 100 : undefined, (x) => x.toFixed(2).replace('.', ','))} />
          <Mesure nom="Temps dans la cible" valeur={pc(st.tir)} unite="%" note="0,70-1,80 g/L" couleur={st.tir >= 0.7 ? 'text-ok' : 'text-warn'} />
          <Mesure nom="Sous 0,70 g/L" valeur={pc(st.tbr70)} unite="%" note={hypo.t} couleur={hypo.c} />
          <Mesure nom="Sucre urinaire" valeur={String(Math.round(e.urine))} unite="g/jour" couleur={e.urine > 5 ? 'text-warn' : undefined} />
        </>
      ) : (
        <>
          <Mesure nom="Hypoglycémies" valeur={hypo.t} couleur={hypo.c} />
          <Mesure nom="Le sucre" valeur={st.tbr70 > 0 ? 'Trop bas' : st.tir >= 0.7 ? 'Bien' : 'Trop haut'} couleur={st.tbr70 > 0 ? 'text-alert' : st.tir >= 0.7 ? 'text-ok' : 'text-warn'} />
        </>
      )}
      {niveau >= 3 && (
        <>
          <Mesure nom="Minimum" valeur={g2(st.min)} unite="g/L" couleur={st.min < 54 ? 'text-alert' : st.min < 70 ? 'text-warn' : undefined} />
          <Mesure nom="Sous 0,54 g/L" valeur={pc(st.tbr54)} unite="%" couleur={st.tbr54 > 0 ? 'text-alert' : undefined} />
          <Mesure nom="Insuline moyenne" valeur={String(Math.round(e.insulineMoy))} unite="µU/mL" />
          <Mesure nom="Fonction bêta" valeur={String(Math.round(e.terrain.beta * 100))} unite="%" couleur={e.terrain.beta < 0.3 ? 'text-warn' : undefined} />
          <Mesure nom="Sensibilité insuline" valeur={String(Math.round(e.terrain.si * 100))} unite="%" couleur={e.terrain.si < 0.6 ? 'text-warn' : undefined} />
          <Mesure nom="DFG indicatif" valeur={String(dfg(e.terrain.rein))} unite="mL/min" couleur={dfg(e.terrain.rein) < 45 ? 'text-warn' : undefined} />
        </>
      )}
    </div>
  );
}

export function Risques({ e, ref0 }: { e: Etat; ref0?: Etat | null }) {
  const lignes: { nom: string; v: string; w: number; c: string; avant?: string }[] = [
    { nom: 'Yeux, reins, nerfs', v: `×${v1(e.risques.micro)}`, w: Math.min(100, (Math.log(e.risques.micro) / Math.log(12)) * 100 + 8), c: e.risques.micro >= 3 ? 'bg-alert' : e.risques.micro >= 1.6 ? 'bg-warn' : 'bg-ok', avant: ref0 && Math.abs(ref0.risques.micro - e.risques.micro) > 0.05 ? v1(ref0.risques.micro) : undefined },
    { nom: 'Infarctus', v: `×${v1(e.risques.coronaire)}`, w: Math.min(100, (Math.log(e.risques.coronaire) / Math.log(6)) * 100 + 8), c: e.risques.coronaire >= 2 ? 'bg-alert' : e.risques.coronaire >= 1.3 ? 'bg-warn' : 'bg-ok', avant: ref0 && Math.abs(ref0.risques.coronaire - e.risques.coronaire) > 0.05 ? v1(ref0.risques.coronaire) : undefined },
    { nom: 'Hypoglycémie', v: e.risques.hypo >= 0.99 ? 'Élevé' : e.risques.hypo > 0.2 ? 'Modéré' : e.risques.hypo > 0 ? 'Faible' : 'Aucune', w: 8 + 92 * e.risques.hypo, c: e.risques.hypo >= 0.99 ? 'bg-alert' : e.risques.hypo > 0.2 ? 'bg-warn' : 'bg-ok' },
    { nom: 'Acidocétose', v: e.risques.cetose >= 1 ? 'Urgence' : e.risques.cetose > 0 ? 'Possible' : 'Non', w: 8 + 92 * e.risques.cetose, c: e.risques.cetose >= 1 ? 'bg-alert' : e.risques.cetose > 0 ? 'bg-warn' : 'bg-ok' },
  ];
  return (
    <div className="space-y-1.5">
      {lignes.map((l) => (
        <div key={l.nom} className="flex items-center gap-2 text-xs">
          <span className="w-28 text-muted shrink-0">{l.nom}</span>
          <div className="flex-1 h-2 rounded-full bg-card2 overflow-hidden"><div className={`h-full ${l.c} transition-all duration-500`} style={{ width: `${l.w}%` }} /></div>
          <span className="num w-20 text-right">{l.v}{l.avant && <span className="text-dim"> ({l.avant})</span>}</span>
        </div>
      ))}
      <p className="text-[11px] text-dim leading-snug">Yeux/reins/nerfs et infarctus : risque relatif par rapport à une HbA1c de 6 %, d'après l'UKPDS 35 (chaque point d'HbA1c en moins : −37 % de complications microvasculaires, −14 % d'infarctus ; association observationnelle). Ordres de grandeur, pas une prédiction individuelle.</p>
    </div>
  );
}

const COULEURS = { sans: '#fb7185', avec: '#34d399', arret: '#fbbf24' } as const;

export function GraphiqueEvolution({ series, cle, titre, unite, an, arret, format = (v: number) => v.toFixed(0), cible }: {
  series: Partial<Record<keyof typeof COULEURS, PointEvolution[]>>; cle: keyof PointEvolution; titre: string; unite?: string; an: number; arret?: number; format?: (v: number) => string; cible?: number;
}) {
  const W = 320, H = 120, m = { l: 34, r: 16, t: 10, b: 18 };
  const toutes = Object.values(series).flatMap((s) => s!.map((p) => p[cle] as number));
  let min = Math.min(...toutes, cible ?? Infinity), max = Math.max(...toutes, cible ?? -Infinity);
  if (max - min < 1e-6) { max += 1; min -= 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;
  const n = Object.values(series)[0]?.length ?? 41;
  const dureeAns = (Object.values(series)[0]?.[n - 1]?.an) ?? 10;
  const x = (a: number) => m.l + (a / dureeAns) * (W - m.l - m.r);
  const y = (v: number) => m.t + (1 - (v - min) / (max - min)) * (H - m.t - m.b);
  return (
    <figure className="carte p-2.5">
      <figcaption className="flex justify-between text-xs mb-1"><span className="font-semibold">{titre}</span>{unite && <span className="text-dim">{unite}</span>}</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={titre}>
        {[0, 0.5, 1].map((f) => { const v = min + (max - min) * f; return <g key={f}><line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="rgba(148,163,184,.14)" /><text x={m.l - 4} y={y(v) + 3} fontSize="9" fill="#7f8ba3" textAnchor="end">{format(v)}</text></g>; })}
        {cible !== undefined && <line x1={m.l} x2={W - m.r} y1={y(cible)} y2={y(cible)} stroke="#34d399" strokeDasharray="4 3" opacity={0.6} />}
        {[0, 2, 4, 6, 8, 10].filter((k) => k <= dureeAns).map((k) => <text key={k} x={x(k)} y={H - 4} fontSize="9" fill="#7f8ba3" textAnchor="middle">{k === 0 ? '0' : `${k} ans`}</text>)}
        {arret !== undefined && series.arret && <line x1={x(arret)} x2={x(arret)} y1={m.t} y2={H - m.b} stroke="#fbbf24" strokeDasharray="3 3" opacity={0.6} />}
        {(Object.entries(series) as [keyof typeof COULEURS, PointEvolution[]][]).map(([k, s]) => (
          <polyline key={k} fill="none" stroke={COULEURS[k]} strokeWidth={2} strokeLinejoin="round" points={s.map((p) => `${x(p.an)},${y(p[cle] as number)}`).join(' ')} />
        ))}
        <line x1={x(an)} x2={x(an)} y1={m.t} y2={H - m.b} stroke="#e9eef8" strokeWidth={1} opacity={0.5} />
      </svg>
    </figure>
  );
}

export const LEGENDE_SCENARIOS = [
  { k: 'sans', nom: 'Sans traitement', c: COULEURS.sans },
  { k: 'avec', nom: 'Traitement suivi', c: COULEURS.avec },
  { k: 'arret', nom: 'Traitement arrêté', c: COULEURS.arret },
] as const;
