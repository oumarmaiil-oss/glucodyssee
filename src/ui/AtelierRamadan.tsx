/**
 * Panneau de l'atelier « Jeûner en sécurité » : il se pose au bas de la scène (comme « La clé et la porte »).
 * Les réglages changent le traitement du patient ; la courbe et le bilan viennent du moteur calibré.
 */
import { SkipBack, X } from 'lucide-react';
import { CHOIX_RAMADAN, ETAPES_RAMADAN, type BilanJeune, type ReglageRamadan } from '../content/atelierRamadan.ts';

const gl = (mg: number) => (mg / 100).toFixed(2).replace('.', ',');
const hh = (m: number) => `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')}`;

export interface EtatAtelierRamadan { etape: number; r: ReglageRamadan }

export function PanneauRamadan({ at, bilan, conforme, onRegler, onEtape, onFermer }: {
  at: EtatAtelierRamadan; bilan: BilanJeune; conforme: boolean;
  onRegler: (x: Partial<ReglageRamadan>) => void; onEtape: (i: number) => void; onFermer: () => void;
}) {
  const n = ETAPES_RAMADAN.length, et = ETAPES_RAMADAN[at.etape];
  const dernier = at.etape === n - 1;
  const reussi = conforme && et.reussi(at.r, bilan);
  return (
    <div className="absolute z-20 bottom-2 left-1/2 -translate-x-1/2 w-[97%] max-w-xl rounded-2xl bg-ink/95 border border-[#a78bfa]/60 overflow-hidden fade-in" role="region" aria-label="Atelier jeûner en sécurité">
      <div className="flex gap-0.5 p-0.5">{ETAPES_RAMADAN.map((_, k) => <div key={k} className={`h-1 flex-1 rounded-full ${k < at.etape ? 'bg-[#a78bfa]' : k === at.etape ? (reussi ? 'bg-ok' : 'bg-[#a78bfa]/50') : 'bg-card2'}`} />)}</div>
      <div className="px-3 pt-1 pb-2 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[9.5px] uppercase tracking-wider text-dim">Atelier Ramadan · {at.etape + 1}/{n} · {et.titre}</div>
            {reussi && !dernier
              ? <div className="text-[12px] leading-snug text-ok fade-in" aria-live="polite">✓ {et.explication}</div>
              : <div className="text-[12.5px] leading-snug font-semibold">{et.consigne}</div>}
            {dernier && <div className="text-[12px] leading-snug text-ok mt-0.5">{et.explication}</div>}
          </div>
          <button onClick={onFermer} className="btn-icone w-7 h-7 shrink-0" aria-label="Fermer l'atelier et revenir à l'état d'avant"><X size={13} /></button>
        </div>
        {!dernier && (
          <div className="flex items-center gap-1.5 overflow-x-auto scroll-thin -mx-1 px-1 pb-0.5">
            <div className="seg shrink-0">{CHOIX_RAMADAN.map((c) => <button key={c.id} className={`whitespace-nowrap ${at.r.choix === c.id && conforme ? 'actif' : ''}`} onClick={() => onRegler({ choix: c.id })}>{c.nom}</button>)}</div>
          </div>
        )}
        {!dernier && at.r.choix === 'melange' && (
          <div className="flex items-center gap-1.5 text-[11px] text-dim">
            <span className="shrink-0">Injections :</span>
            <div className="seg" role="group" aria-label="Horaires des injections">
              <button className={at.r.habituels ? 'actif' : ''} onClick={() => onRegler({ habituels: true })}>Horaires habituels</button>
              <button className={!at.r.habituels ? 'actif' : ''} onClick={() => onRegler({ habituels: false })}>Horaires adaptés</button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between gap-2 text-[11.5px]">
          <span className="num text-muted min-w-0">
            {!conforme ? <span className="text-warn">Traitement changé dans le panneau : touchez un choix pour reprendre.</span>
              : bilan.rompre ? <b className="text-alert">{bilan.rompre}</b>
              : <>Jeûne : plus bas <b className="text-ok">{gl(bilan.min)} g/L</b> à {hh(bilan.heureMin)} · plus haut <b className={bilan.max > 250 ? 'text-warn' : 'text-txt'}>{gl(bilan.max)}</b></>}
          </span>
          <span className="flex gap-1 shrink-0">
            <button onClick={() => onEtape(Math.max(0, at.etape - 1))} disabled={at.etape === 0} className="btn-icone w-8 h-8 disabled:opacity-35" aria-label="Étape précédente"><SkipBack size={14} /></button>
            {dernier
              ? <button onClick={onFermer} className="rounded-lg px-3 h-8 text-[12px] font-bold bg-ok text-ink">Terminer</button>
              : <button onClick={() => onEtape(at.etape + 1)} className={`rounded-lg px-3 h-8 text-[12px] font-bold ${reussi ? 'bg-ok text-ink' : 'bg-card2 border border-line text-muted'}`}>Suivant</button>}
          </span>
        </div>
      </div>
    </div>
  );
}
