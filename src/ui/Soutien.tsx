/**
 * « Soutenir Glucodyssée » : transfert au numéro mobile du Dr O. Sow (Sénégal) par Wave ou Orange Money.
 * Rien n'est payé dans l'application : on affiche le numéro, on le copie, et l'on suit les étapes de son
 * propre service. Orange Money Sénégal : menu #144# (transfert : numéro du bénéficiaire, montant, code secret).
 */
import { useState } from 'react';
import { Check, Copy, Heart, Phone, X } from 'lucide-react';
import { WHATSAPP, WHATSAPP_AFFICHE } from './Signalement.tsx';

/** Numéro local (sans l'indicatif +221), celui que demandent Wave et Orange Money au Sénégal. */
const NUMERO_LOCAL = WHATSAPP.replace(/^221/, '');
const NUMERO_LOCAL_AFFICHE = WHATSAPP_AFFICHE.replace(/^\+221\s*/, '');

export function Soutien({ onClose }: { onClose: () => void }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try { await navigator.clipboard.writeText(NUMERO_LOCAL); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers indisponible */ }
  };
  return (
    <div className="fixed inset-0 z-50 bg-ink/90 sm:bg-ink/80 sm:backdrop-blur-sm grid place-items-center p-4 overscroll-contain" role="dialog" aria-modal="true" aria-label="Soutenir Glucodyssée" onClick={onClose}>
      <div className="max-w-md w-full max-h-[90dvh] overflow-y-auto rounded-3xl border border-line bg-panel p-5 space-y-3.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <h2 className="font-display text-2xl inline-flex items-center gap-2"><Heart size={20} className="text-miel" fill="currentColor" /> Soutenir Glucodyssée</h2>
          <button className="btn-icone !w-11 !h-11 -mt-1 -mr-1 active:scale-95 transition-transform" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
        </div>
        <p className="text-sm text-muted">Glucodyssée est gratuit et le restera. Si l'outil vous aide à apprendre ou à expliquer le diabète, vous pouvez soutenir son développement, du montant de votre choix.</p>

        <div className="rounded-2xl border border-miel/40 bg-miel/8 p-3 flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-dim">Numéro (Sénégal)</div>
            <div className="num text-2xl font-bold tracking-wide">{NUMERO_LOCAL_AFFICHE}</div>
            <div className="text-[12px] text-muted">Dr O. Sow · depuis l'étranger : {WHATSAPP_AFFICHE}</div>
          </div>
          <button onClick={copier} className={`shrink-0 rounded-xl px-3 py-2 text-[13px] font-bold inline-flex items-center gap-1.5 active:scale-95 transition-transform ${copie ? 'bg-ok text-ink' : 'bg-miel text-ink'}`} aria-live="polite">
            {copie ? <><Check size={15} /> Copié</> : <><Copy size={15} /> Copier</>}
          </button>
        </div>

        <section className="rounded-2xl border border-line bg-card p-3 space-y-1.5">
          <h3 className="font-bold text-[15px] inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#1dc8ff]" /> Wave</h3>
          <ol className="text-[13px] text-muted space-y-0.5 list-decimal pl-5">
            <li>Ouvrez l'application Wave et touchez « Envoyer ».</li>
            <li>Saisissez le numéro <b className="text-txt num">{NUMERO_LOCAL_AFFICHE}</b> (ou collez-le).</li>
            <li>Indiquez le montant, puis validez avec votre code.</li>
          </ol>
        </section>

        <section className="rounded-2xl border border-line bg-card p-3 space-y-1.5">
          <h3 className="font-bold text-[15px] inline-flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-[#ff7900]" /> Orange Money</h3>
          <ol className="text-[13px] text-muted space-y-0.5 list-decimal pl-5">
            <li>Composez <b className="text-txt num">#144#</b> (ou ouvrez l'application Orange Money).</li>
            <li>Choisissez le transfert d'argent et saisissez <b className="text-txt num">{NUMERO_LOCAL_AFFICHE}</b>.</li>
            <li>Indiquez le montant, puis validez avec votre code secret.</li>
          </ol>
          <a href="tel:%23144%23" className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#ff7900]/50 bg-[#ff7900]/10 px-3 py-1.5 text-[13px] font-semibold text-[#ffb070]"><Phone size={14} /> Composer #144#</a>
        </section>

        <p className="text-[12px] text-dim">Avant de valider, vérifiez que le nom du bénéficiaire affiché correspond bien au Dr O. Sow. Glucodyssée ne vous demandera jamais votre code secret. Une question : <a className="underline" href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>.</p>
      </div>
    </div>
  );
}
