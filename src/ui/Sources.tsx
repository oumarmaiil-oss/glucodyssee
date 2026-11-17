/**
 * Fenêtre des sources : la liste des références, et pour chacune un petit document
 * (référence complète, ce que Glucodyssée en tire, où on le voit, limites, lien pour vérifier).
 */
import { useState } from 'react';
import { ArrowLeft, BookOpen, Check, Copy, ExternalLink, X } from 'lucide-react';
import { SOURCES, SOURCE_PAR_ID, type Source } from '../content/sources.ts';

export function FenetreSources({ id, onClose }: { id: string; onClose: () => void }) {
  const [courant, setCourant] = useState<string>(id);
  const s = courant !== 'tout' ? SOURCE_PAR_ID[courant] : null;
  return (
    <div className="fixed inset-0 z-50 bg-ink/90 sm:bg-ink/80 sm:backdrop-blur-sm grid place-items-center p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Sources" onClick={onClose}>
      <div className="max-w-xl w-full max-h-[90dvh] overflow-y-auto scroll-thin rounded-3xl border border-line bg-panel p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <div>
            {s && <button onClick={() => setCourant('tout')} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt mb-1"><ArrowLeft size={13} /> Toutes les sources</button>}
            <h2 className="font-display text-2xl flex items-center gap-2"><BookOpen size={20} className="text-miel" />{s ? s.court : `Sources des chiffres (${SOURCES.length})`}</h2>
          </div>
          <button className="btn-icone !w-11 !h-11 -mt-1 -mr-1" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
        </div>
        {s ? <DocumentSource s={s} /> : (
          <>
            <p className="text-[13px] text-muted">Chaque chiffre de Glucodyssée vient d'une de ces références. Touchez-en une pour voir ce que l'application en tire et où on le voit.</p>
            <ul className="space-y-1.5">
              {SOURCES.map((x) => (
                <li key={x.id}>
                  <button onClick={() => setCourant(x.id)} className="w-full carte p-2.5 text-left hover:border-miel/50">
                    <div className="flex items-center justify-between gap-2"><span className="text-[13.5px] font-semibold">{x.court}</span><span className="text-[10.5px] text-dim shrink-0">{x.type}</span></div>
                    <div className="text-[11.5px] text-muted leading-snug mt-0.5 line-clamp-2">{x.tire[0]}</div>
                  </button>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-dim">Modèle simplifié d'un adulte de 70 kg : bons sens de variation et bons ordres de grandeur, pas l'évolution d'un patient réel. Une erreur ? Bouton Contact.</p>
          </>
        )}
      </div>
    </div>
  );
}

function DocumentSource({ s }: { s: Source }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => { try { await navigator.clipboard.writeText(s.citation); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers indisponible */ } };
  return (
    <article className="space-y-3 fade-in">
      <div className="text-[10.5px] uppercase tracking-wider text-dim font-semibold">{s.type}</div>
      <p className="carte p-3 text-[13px] leading-relaxed select-text">{s.citation}</p>
      <section>
        <div className="titre-section mb-1">Ce que Glucodyssée en tire</div>
        <ul className="text-[13.5px] space-y-1">{s.tire.map((t) => <li key={t} className="flex gap-2"><Check size={14} className="text-ok shrink-0 mt-1" /><span>{t}</span></li>)}</ul>
      </section>
      <section>
        <div className="titre-section mb-1">Où le voir dans l'application</div>
        <ul className="text-[13px] text-muted space-y-0.5">{s.ou.map((t) => <li key={t}>• {t}</li>)}</ul>
      </section>
      {s.limites && <section className="rounded-xl bg-warn/8 border border-warn/25 p-2.5"><div className="titre-section mb-0.5 text-warn/90">Limites</div><p className="text-[13px]">{s.limites}</p></section>}
      <div className="flex flex-wrap gap-2 pt-1">
        <a href={s.lien} target="_blank" rel="noopener noreferrer" className="flex-1 min-h-11 rounded-xl bg-miel text-ink font-bold text-[13px] inline-flex items-center justify-center gap-1.5"><ExternalLink size={15} /> Ouvrir la source</a>
        <button onClick={copier} className="min-h-11 rounded-xl border border-line px-4 text-[13px] font-semibold inline-flex items-center gap-1.5"><Copy size={14} /> {copie ? 'Copiée' : 'Copier la référence'}</button>
      </div>
      <p className="text-[11px] text-dim break-all">Lien : {s.lien}</p>
    </article>
  );
}

/** Petites puces « Sources » à placer sous une fiche. */
export function PucesSources({ ids, onSource }: { ids: string[] | undefined; onSource: (id: string) => void }) {
  if (!ids?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[11px] text-dim inline-flex items-center gap-1"><BookOpen size={12} /> Sources :</span>
      {ids.map((id) => SOURCE_PAR_ID[id] && <button key={id} onClick={() => onSource(id)} className="text-[11.5px] rounded-full border border-line px-2 py-0.5 text-muted hover:text-txt hover:border-miel/50">{SOURCE_PAR_ID[id].court}</button>)}
    </div>
  );
}
