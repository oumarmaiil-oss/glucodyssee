/**
 * « Don / Soutien » : transfert au numéro mobile du Dr O. Sow (Sénégal) par Wave ou Orange Money.
 * Rien n'est payé dans l'application : numéro à copier, et raccourci #144# (menu Orange Money Sénégal).
 * Les pastilles Wave et Orange Money sont de simples repères aux couleurs des services (pas les logos officiels) ;
 * un lien de paiement direct demanderait un compte marchand (Wave Business, Orange Money marchand).
 */
import { useState } from 'react';
import { Check, Copy, Heart, Phone, X } from 'lucide-react';
import { WHATSAPP, WHATSAPP_AFFICHE } from './Signalement.tsx';

/** Numéro local (sans l'indicatif +221), celui que demandent Wave et Orange Money au Sénégal. */
const NUMERO_LOCAL = WHATSAPP.replace(/^221/, '');
const NUMERO_LOCAL_AFFICHE = WHATSAPP_AFFICHE.replace(/^\+221\s*/, '');

/** Pastilles des deux services (repères visuels aux couleurs de chacun). */
export function PastilleWave({ taille = 28 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={taille} height={taille} role="img" aria-label="Wave">
      <rect width="40" height="40" rx="10" fill="#1dc8ff" />
      <path d="M7 22c3-6 6-6 9 0s6 6 9 0 6-6 8 0" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
export function PastilleOrangeMoney({ taille = 28 }: { taille?: number }) {
  return (
    <svg viewBox="0 0 40 40" width={taille} height={taille} role="img" aria-label="Orange Money">
      <rect width="40" height="40" rx="10" fill="#ff7900" />
      <rect x="8" y="27" width="24" height="5" rx="1" fill="#fff" />
      <text x="20" y="22" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12" fill="#fff">OM</text>
    </svg>
  );
}

export function Soutien({ onClose }: { onClose: () => void }) {
  const [copie, setCopie] = useState(false);
  const copier = async () => {
    try { await navigator.clipboard.writeText(NUMERO_LOCAL); setCopie(true); setTimeout(() => setCopie(false), 2000); } catch { /* presse-papiers indisponible */ }
  };
  return (
    <div className="fixed inset-0 z-50 bg-ink/90 sm:bg-ink/80 sm:backdrop-blur-sm grid place-items-center p-4 overscroll-contain" role="dialog" aria-modal="true" aria-label="Don et soutien" onClick={onClose}>
      <div className="max-w-sm w-full rounded-3xl border border-line bg-panel p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <h2 className="font-display text-2xl inline-flex items-center gap-2"><Heart size={20} className="text-miel" fill="currentColor" /> Don · Soutien</h2>
          <button className="btn-icone !w-11 !h-11 -mt-1 -mr-1 active:scale-95 transition-transform" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
        </div>
        <div className="flex items-center justify-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-card border border-line px-3 py-2"><PastilleWave /> <b className="text-[15px]">Wave</b></span>
          <span className="inline-flex items-center gap-2 rounded-2xl bg-card border border-line px-3 py-2"><PastilleOrangeMoney /> <b className="text-[15px]">Orange Money</b></span>
        </div>
        <div className="rounded-2xl border border-miel/40 bg-miel/8 p-3 text-center space-y-2">
          <div className="num text-[28px] font-bold tracking-wide">{NUMERO_LOCAL_AFFICHE}</div>
          <div className="text-[12px] text-muted">Dr O. Sow · {WHATSAPP_AFFICHE}</div>
          <div className="flex justify-center gap-2 pt-1">
            <button onClick={copier} className={`rounded-xl px-4 py-2 text-[13.5px] font-bold inline-flex items-center gap-1.5 active:scale-95 transition-transform ${copie ? 'bg-ok text-ink' : 'bg-miel text-ink'}`} aria-live="polite">
              {copie ? <><Check size={15} /> Copié</> : <><Copy size={15} /> Copier le numéro</>}
            </button>
            <a href="tel:%23144%23" className="rounded-xl px-3 py-2 text-[13.5px] font-bold inline-flex items-center gap-1.5 bg-[#ff7900] text-white active:scale-95 transition-transform" title="Ouvrir le menu Orange Money (#144#)"><Phone size={15} /> #144#</a>
          </div>
        </div>
        <p className="text-[11.5px] text-dim text-center">Vérifiez le nom du bénéficiaire avant de valider. Ne communiquez jamais votre code secret.</p>
      </div>
    </div>
  );
}
