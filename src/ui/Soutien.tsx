/**
 * « Don / Soutien » : transfert au numéro mobile du Dr O. Sow (Sénégal) par Wave ou Orange Money.
 * Rien n'est payé dans l'application : numéro à copier, et raccourci #144# (menu Orange Money Sénégal).
 * Pas de logos : seuls les logos officiels conviendraient (à ajouter à partir des fichiers fournis par les services).
 * Un lien de paiement direct demanderait un compte marchand (Wave Business, Orange Money marchand).
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
    <div className="fixed inset-0 z-50 bg-ink/90 sm:bg-ink/80 sm:backdrop-blur-sm grid place-items-center p-4 overscroll-contain" role="dialog" aria-modal="true" aria-label="Don et soutien" onClick={onClose}>
      <div className="max-w-sm w-full rounded-3xl border border-line bg-panel p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start gap-2">
          <h2 className="font-display text-2xl inline-flex items-center gap-2"><Heart size={20} className="text-miel" fill="currentColor" /> Don · Soutien</h2>
          <button className="btn-icone !w-11 !h-11 -mt-1 -mr-1 active:scale-95 transition-transform" onClick={onClose} aria-label="Fermer"><X size={15} /></button>
        </div>
        <p className="text-center text-[15px] font-semibold">Wave · Orange Money</p>
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
