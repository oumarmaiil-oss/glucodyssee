/** Panneaux latéraux : Explorer, Maladies et traitements, Évolution. */
import { useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Candy, Check, ChevronDown, Info, Pill, Play, Plus, Printer, Sparkles, Stethoscope, Utensils, X } from 'lucide-react';
import type { ClasseId, Etat, Niveau, Repas, Terrain, Traitement } from '../core/types.ts';
import { evoluer, injectionsPour, indexAn, type Scenario } from '../core/engine.ts';
import { ZONES, type ZoneId } from '../content/zones.ts';
import { FAMILLES, PATHOLOGIES, PATHO_PAR_ID, type Famille, type PathoActive, type Pathologie } from '../content/pathologies.ts';
import { classesEnPlus, evaluerPathologie } from '../core/evaluation.ts';
import { CLASSES, CLASSE_PAR_ID, DOSES, GROUPES, INSULINES_IDS, type Classe, type GroupeClasse } from '../content/classes.ts';
import { PRESENTATIONS } from '../content/presentations.ts';
import { CAS } from '../content/cas.ts';
import { Quiz } from './Quiz.tsx';
import { FicheImpression, imprimerFiche } from './Fiche.tsx';
import { GraphiqueEvolution, LEGENDE_SCENARIOS, Moniteur, Risques } from './widgets.tsx';
import { NOMS_VUES, vuePour, zoneDansVue, type Vue } from './Stage.tsx';

const NIVEAUX_NOMS: Record<Niveau, string> = { 1: 'Découvrir', 2: 'Comprendre', 3: 'Approfondir' };

export const VOYAGE: { z: ZoneId; etape: string }[] = [
  { z: 'estomac', etape: 'Le repas arrive : l\'amidon va devenir du glucose' },
  { z: 'intestin', etape: 'Le glucose traverse la paroi de l\'intestin' },
  { z: 'veinePorte', etape: 'La veine porte l\'emmène d\'abord au foie' },
  { z: 'foie', etape: 'Le foie en garde une partie en réserve' },
  { z: 'sang', etape: 'Le reste passe dans le sang : la glycémie monte' },
  { z: 'pancreas', etape: 'Le pancréas sent le sucre monter' },
  { z: 'ilot', etape: 'Les cellules bêta libèrent l\'insuline' },
  { z: 'muscles', etape: 'L\'insuline ouvre les portes des muscles' },
  { z: 'graisse', etape: 'Le tissu gras stocke aussi le surplus' },
  { z: 'cerveau', etape: 'Le cerveau consomme du sucre, sans insuline' },
  { z: 'reins', etape: 'Les reins filtrent le sang et récupèrent le sucre' },
  { z: 'globules', etape: 'Le sucre colle à l\'hémoglobine : c\'est l\'HbA1c' },
];
export const ATTEINTES: ZoneId[] = ['yeux', 'nerfs', 'pieds', 'coeur'];

/** Détails affichés pendant le voyage du sucre : [niveau Découvrir, niveaux Comprendre/Approfondir]. */
export const DETAILS_VISITE: Partial<Record<ZoneId, [string, string]>> = {
  estomac: ['Riz, mil, pain, manioc : leurs glucides deviennent du glucose.', 'Vidange gastrique progressive : elle règle la vitesse de montée du sucre'],
  intestin: ['Le glucose passe dans le sang par la paroi de l\'intestin.', 'Transporteurs SGLT1 et GLUT2 · l\'intestin libère les incrétines (GLP-1, GIP)'],
  veinePorte: ['Tout le sang de l\'intestin passe par le foie.', 'Le foie reçoit aussi l\'insuline du pancréas en premier, à forte concentration'],
  foie: ['Le foie stocke le sucre en réserve.', 'Glycogène ≈ 100 g · à jeun, production ≈ 2 mg/kg/min'],
  sang: ['À peine une cuillère à café de sucre dans tout le sang.', 'À jeun < 1,00 g/L · après le repas, retour en 2 à 3 heures'],
  pancreas: ['Le pancréas surveille le sucre en permanence.', 'Les îlots : 1 à 2 % de la masse du pancréas'],
  ilot: ['Les cellules bêta fabriquent l\'insuline : la clé.', '≈ 55 % de cellules bêta, 35 % alpha, 10 % delta'],
  muscles: ['La clé ouvre la porte : le sucre entre dans le muscle.', 'Récepteur de l\'insuline → transporteurs GLUT4 à la surface'],
  graisse: ['Le surplus d\'énergie est stocké.', 'L\'insuline freine aussi la libération des graisses'],
  cerveau: ['Le cerveau a besoin de sucre en permanence.', '≈ 120 g de glucose par jour, sans insuline'],
  reins: ['Les reins récupèrent tout le sucre filtré.', '≈ 180 g filtrés par jour · seuil ≈ 1,80 g/L · SGLT2 ≈ 90 %'],
  globules: ['L\'HbA1c raconte les 3 derniers mois.', 'HbA1c 7 % ≈ glycémie moyenne 1,54 g/L (ADAG)'],
};

function Texte3({ textes, niveau }: { textes: Record<Niveau, string>; niveau: Niveau }) {
  const [plus, setPlus] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-[14px] leading-relaxed">{textes[niveau]}</p>
      {niveau < 3 && (
        <>
          <button onClick={() => setPlus((v) => !v)} className="text-xs text-accent font-semibold inline-flex items-center gap-1">
            <ChevronDown size={14} className={plus ? 'rotate-180 transition' : 'transition'} /> {plus ? 'Moins' : `Aller plus loin (${NIVEAUX_NOMS[(niveau + 1) as Niveau]})`}
          </button>
          {plus && <p className="text-[13px] leading-relaxed text-muted border-l-2 border-accent/40 pl-3 fade-in">{textes[(niveau + 1) as Niveau]}</p>}
        </>
      )}
    </div>
  );
}

// ─────────────────────────── Explorer ───────────────────────────

export function PanneauExplorer({ zone, niveau, vue, actives, repas, onRepas, onZone, onTogglePatho, onVue, onVoirPatho }: {
  zone: ZoneId | null; niveau: Niveau; vue: Vue; actives: PathoActive[]; repas: Repas[]; onRepas: (r: Repas[]) => void;
  onZone: (z: ZoneId | null) => void; onTogglePatho: (id: string) => void; onVue: (v: Vue) => void; onVoirPatho: (id: string) => void;
}) {
  if (!zone) {
    return (
      <div className="space-y-4 fade-in">
        <div>
          <h2 className="font-display text-xl">Le voyage du sucre</h2>
          <p className="text-sm text-muted mt-1">Suivez le glucose d'un repas, de l'assiette jusqu'aux cellules. Touchez une étape, ou directement un organe dans la scène.</p>
        </div>
        <ol className="relative border-l border-line ml-2 space-y-1">
          {VOYAGE.map((v) => (
            <li key={v.z} className="pl-4 relative">
              <span className="absolute -left-[5px] top-2.5 w-2.5 h-2.5 rounded-full bg-miel" />
              <button onClick={() => onZone(v.z)} className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-card">
                <div className="text-[13.5px] font-semibold">{ZONES[v.z].nom}</div>
                <div className="text-xs text-muted">{v.etape}</div>
              </button>
            </li>
          ))}
        </ol>
        <div className="carte p-3">
          <div className="titre-section mb-2">Là où le sucre en excès abîme</div>
          <div className="flex gap-2 flex-wrap">{ATTEINTES.map((z) => <button key={z} className="puce" onClick={() => onZone(z)}>{ZONES[z].nom}</button>)}</div>
        </div>
        <div className="carte p-3 space-y-2">
          <div className="titre-section flex items-center gap-1.5"><Utensils size={13} /> La journée type</div>
          <p className="text-[12px] text-muted">Glucides de chaque repas (en grammes). Repère : une assiette de riz cuit (≈ 200 g) apporte environ 55 g de glucides.</p>
          {repas.map((r, k) => (
            <label key={r.nom} className="block">
              <span className="text-xs text-muted flex justify-between"><span>{r.nom} ({String(Math.floor(r.h)).padStart(2, '0')} h {String(Math.round((r.h % 1) * 60)).padStart(2, '0')})</span><span className="num text-txt">{r.g} g</span></span>
              <input type="range" min={0} max={150} step={10} value={r.g} onChange={(e) => onRepas(repas.map((x, j) => (j === k ? { ...x, g: +e.target.value } : x)))} aria-label={`Glucides du ${r.nom}`} />
            </label>
          ))}
        </div>
      </div>
    );
  }
  const z = ZONES[zone];
  const idx = VOYAGE.findIndex((v) => v.z === zone);
  const pathos = PATHOLOGIES.filter((p) => p.zones.includes(zone) && p.niveauMin <= Math.max(niveau, 2));
  const classes = CLASSES.filter((c) => c.zone === zone);
  const pasDansVue = !zoneDansVue(zone, vue);
  return (
    <div className="space-y-4 fade-in" key={zone}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <button onClick={() => onZone(null)} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt"><ArrowLeft size={13} /> Le voyage</button>
          <h2 className="font-display text-2xl mt-1 flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-miel" />{z.nom}</h2>
        </div>
        {idx >= 0 && (
          <div className="flex gap-1 shrink-0 mt-5">
            <button className="btn-icone" disabled={idx === 0} onClick={() => onZone(VOYAGE[idx - 1].z)} aria-label="Étape précédente"><ArrowLeft size={15} /></button>
            <button className="btn-icone" disabled={idx === VOYAGE.length - 1} onClick={() => onZone(VOYAGE[idx + 1].z)} aria-label="Étape suivante"><ArrowRight size={15} /></button>
          </div>
        )}
      </div>
      {pasDansVue && <button onClick={() => onVue(vuePour(zone))} className="w-full carte p-2.5 text-sm text-accent font-semibold text-left">Cette zone se voit dans la vue {NOMS_VUES[vuePour(zone)]} : l'afficher →</button>}
      {(zone === 'pancreas') && vue !== 'ilot' && vue !== 'ilot3d' && <button onClick={() => onVue('ilot')} className="w-full carte p-2.5 text-[13px] text-left"><span className="text-accent font-semibold">Entrer dans un îlot de Langerhans →</span> <span className="text-muted">cellules bêta et alpha, en 2D et en 3D</span></button>}
      {(zone === 'muscles' || zone === 'foie' || zone === 'graisse') && vue !== 'cellule' && <button onClick={() => onVue('cellule')} className="w-full carte p-2.5 text-[13px] text-left"><span className="text-accent font-semibold">Voir la cellule de près →</span> <span className="text-muted">la clé, la serrure et la porte (vue Cellule)</span></button>}
      {zone === 'reins' && vue !== 'rein' && <button onClick={() => onVue('rein')} className="w-full carte p-2.5 text-[13px] text-left"><span className="text-accent font-semibold">Voir le néphron →</span> <span className="text-muted">filtration, SGLT2, seuil rénal (vue Rein)</span></button>}
      {(zone === 'sang' || zone === 'globules') && vue !== 'courbe' && <button onClick={() => onVue('courbe')} className="w-full carte p-2.5 text-[13px] text-left"><span className="text-accent font-semibold">Voir la courbe de la journée →</span> <span className="text-muted">comme un capteur de glucose (vue Courbes)</span></button>}
      {zone === 'coeur' && <a href="https://oumarmaiil-oss.github.io/hemodyssee/" target="_blank" rel="noopener noreferrer" className="block w-full carte p-2.5 text-[13px] text-left"><span className="text-[#ff8a95] font-semibold">Ouvrir Hémodyssée →</span> <span className="text-muted">le cœur, les artères, la tension et le cholestérol</span></a>}
      <div className="carte p-3.5">
        <div className="titre-section mb-1.5">Comment ça marche</div>
        <Texte3 textes={z.role} niveau={niveau} />
        {niveau >= 2 && z.chiffres && <div className="mt-2.5 text-xs text-muted flex items-center gap-1.5"><Info size={13} /> {z.chiffres}</div>}
      </div>
      {classes.length > 0 && (
        <div className="carte p-3">
          <div className="titre-section mb-2">Les traitements qui agissent ici</div>
          <div className="flex flex-wrap gap-1.5">{classes.map((c) => <span key={c.id} className="puce"><span className="w-2 h-2 rounded-full" style={{ background: c.couleur }} />{c.court}</span>)}</div>
        </div>
      )}
      {pathos.length > 0 && (
        <div>
          <div className="titre-section mb-2">Maladies et situations de cette zone — touchez pour simuler</div>
          <div className="flex flex-wrap gap-1.5">
            {pathos.map((p) => {
              const on = actives.some((a) => a.id === p.id);
              return <button key={p.id} className={`puce ${on ? 'actif' : ''}`} onClick={() => { onTogglePatho(p.id); onVoirPatho(p.id); }}>{on ? <Check size={13} /> : <Plus size={13} />} {p.nom}</button>;
            })}
          </div>
          {actives.filter((a) => pathos.some((p) => p.id === a.id)).map((a) => {
            const p = PATHO_PAR_ID[a.id];
            return (
              <div key={a.id} className="carte p-3 mt-2.5 border-miel/30 fade-in">
                <div className="text-sm font-semibold">{p.nom}</div>
                <p className="text-[13px] text-muted mt-1"><span className="text-txt font-semibold">Ce qu'on voit : </span>{p.voir}</p>
                <button onClick={() => onVoirPatho(p.id)} className="text-xs text-accent font-semibold mt-2">Fiche complète et traitement →</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Maladies ───────────────────────────

export const SCENARIOS_RAPIDES: { nom: string; actives: PathoActive[] }[] = [
  { nom: 'Type 2 découvert au bilan', actives: [{ id: 't2', s: 0.4 }] },
  { nom: 'Type 2 installé', actives: [{ id: 't2', s: 0.7 }] },
  { nom: 'Type 1', actives: [{ id: 't1', s: 0.7 }] },
  { nom: 'Prédiabète', actives: [{ id: 'prediabete', s: 0.7 }] },
  { nom: 'Type 2 + rein malade', actives: [{ id: 't2', s: 0.7 }, { id: 'nephro', s: 0.7 }] },
  { nom: 'Type 2 + Ramadan', actives: [{ id: 't2', s: 0.4 }, { id: 'ramadan', s: 0.7 }] },
];

function ordreFamilles(vue: Vue, zone: ZoneId | null): Famille[] {
  const tout: Famille[] = ['diabetes', 'aigues', 'situations', 'complications'];
  let tete: Famille[] = [];
  if (zone && ATTEINTES.includes(zone)) tete = ['complications'];
  else if (zone === 'cerveau') tete = ['aigues'];
  else if (vue === 'rein') tete = ['situations', 'complications'];
  return [...new Set([...tete, ...tout])];
}

export function PanneauMaladies(props: {
  niveau: Niveau; vue: Vue; zone: ZoneId | null; actives: PathoActive[]; focus: string | null; traitement: Traitement; terrain: Terrain;
  etat: Etat; etatSans: Etat;
  onFocus: (id: string | null) => void; onToggle: (id: string) => void; onSeverite: (id: string, s: number) => void;
  onScenario: (a: PathoActive[]) => void; onDose: (c: ClasseId, d: number) => void; onRemplacer: (t: Traitement) => void;
  onSequence: () => void; onComparer: () => void; onResucrage: () => void;
  onVoir: (v: Vue) => void; onPresentation: (id: string) => void;
  onCas: (actives: PathoActive[], traitement: Traitement, zone: ZoneId | null) => void;
}) {
  const [quiz, setQuiz] = useState(false);
  if (quiz) return <Quiz onFermer={() => setQuiz(false)} onSimuler={props.onCas} onEffet={props.onSequence} />;
  const { niveau, vue, zone, actives, focus, onFocus, onToggle, onSeverite, onScenario } = props;
  const f = focus ? PATHO_PAR_ID[focus] : null;
  const familles = ordreFamilles(vue, zone);
  const dansZone = zone ? PATHOLOGIES.filter((p) => p.zones.includes(zone)) : [];
  const puce = (p: Pathologie) => {
    const on = actives.some((a) => a.id === p.id);
    return <button key={p.id} className={`puce ${on ? 'actif' : ''} ${focus === p.id ? 'ring-1 ring-accent/60' : ''}`} onClick={() => { if (!on) onToggle(p.id); onFocus(p.id); }}>{on && <Check size={13} />}{niveau === 1 ? p.court : p.nom}</button>;
  };
  return (
    <div className="space-y-4 fade-in">
      {f ? (
        <article className="space-y-3 fade-in" key={f.id}>
          <button onClick={() => onFocus(null)} className="text-xs text-muted inline-flex items-center gap-1 hover:text-txt"><ArrowLeft size={13} /> Toutes les maladies</button>
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-display text-2xl">{f.nom}</h3>
            {actives.some((a) => a.id === f.id)
              ? <button className="puce" onClick={() => onToggle(f.id)}><X size={13} /> Retirer</button>
              : <button onClick={() => onToggle(f.id)} className="rounded-lg bg-miel text-ink font-bold text-[13px] px-3 py-1.5 shrink-0">Simuler</button>}
          </div>
          {actives.some((a) => a.id === f.id) && f.severites && (
            <div className="seg">{f.severites.map((nom, k) => { const v = [0.4, 0.7, 1][k]; return <button key={v} className={actives.find((a) => a.id === f.id)?.s === v ? 'actif' : ''} onClick={() => onSeverite(f.id, v)}>{nom}</button>; })}</div>
          )}
          <section className="carte p-3.5"><div className="titre-section mb-1">Ce qui se passe</div><Texte3 textes={f.texte} niveau={niveau} /></section>
          <section className="carte p-3.5"><div className="titre-section mb-1">Ce qu'on voit</div><p className="text-[13.5px] text-muted">{f.voir}</p>
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {(['corps', 'ilot', 'cellule', 'rein', 'courbe'] as const).map((v) => {
                const actif = vue === v || (v === 'ilot' && vue === 'ilot3d');
                return <button key={v} onClick={() => props.onVoir(v)} className={`puce ${actif ? 'actif' : ''}`}>{actif && <Check size={13} />}Vue {NOMS_VUES[v].replace(' 2D', '')}</button>;
              })}
            </div>
            <div className="titre-section mt-3 mb-1">Conséquences</div><ul className="text-[13.5px] space-y-0.5">{f.consequences.map((c) => <li key={c}>• {c}</li>)}</ul></section>
          {f.id === 'hypo' && actives.some((a) => a.id === 'hypo') && (
            <button onClick={props.onResucrage} className="w-full rounded-xl bg-miel text-ink font-bold text-[13.5px] py-2.5 inline-flex items-center justify-center gap-2"><Candy size={16} /> Resucrer : 15 g de sucre au moment du malaise</button>
          )}
          <BlocTraitement {...props} patho={f} />
          {actives.length > 0 && <>
            <button onClick={imprimerFiche} className="w-full rounded-lg bg-card2 border border-line py-2 text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5"><Printer size={13} /> Fiche récapitulative (imprimer ou PDF)</button>
            <FicheImpression actives={actives} traitement={props.traitement} etat={props.etat} sans={props.etatSans} />
          </>}
          {f.arret && <section className="rounded-xl bg-warn/8 border border-warn/25 p-3"><div className="titre-section mb-1 text-warn/90">Si on arrête le traitement</div><p className="text-[13.5px]">{f.arret}</p></section>}
        </article>
      ) : (
        <>
          <div>
            <div className="titre-section mb-2">Présentations guidées · 2 à 3 min, sans rien toucher</div>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESENTATIONS.map((p) => (
                <button key={p.id} onClick={() => props.onPresentation(p.id)} className="carte p-2 text-left hover:border-miel/50">
                  <div className="flex items-center gap-1 text-[13px] font-bold"><Play size={11} fill="currentColor" className="text-miel shrink-0" /> {p.titre}</div>
                  <div className="text-[11px] text-muted leading-tight mt-0.5">{p.pour}</div>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setQuiz(true)} className="w-full carte p-3 flex items-center gap-3 text-left hover:border-accent/50">
            <span className="w-9 h-9 rounded-xl bg-accent/15 text-accent grid place-items-center shrink-0"><Stethoscope size={18} /></span>
            <span className="flex-1"><span className="block text-[14px] font-bold">S'entraîner : {CAS.length} cas cliniques</span><span className="block text-[12px] text-muted">Diagnostic, conduite à tenir, correction expliquée</span></span>
            <ArrowRight size={15} className="text-dim" />
          </button>
          <div>
            <div className="titre-section mb-2">Cas prêts à présenter</div>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS_RAPIDES.map((s) => <button key={s.nom} className="puce" onClick={() => onScenario(s.actives)}><Sparkles size={13} /> {s.nom}</button>)}
              {actives.length > 0 && <button className="puce" onClick={() => onScenario([])}><X size={13} /> Sujet sain</button>}
            </div>
          </div>
          {actives.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="titre-section">Simulées en ce moment — touchez pour traiter</div>
                <button onClick={imprimerFiche} className="text-[11.5px] text-accent font-semibold inline-flex items-center gap-1 shrink-0"><Printer size={12} /> Fiche PDF</button>
              </div>
              <FicheImpression actives={actives} traitement={props.traitement} etat={props.etat} sans={props.etatSans} />
              {actives.map((a) => {
                const p = PATHO_PAR_ID[a.id];
                const pts = evaluerPathologie(a.id, actives, props.etat, props.traitement);
                const ok = pts.length > 0 && pts.every((x) => x.ok);
                return (
                  <button key={a.id} onClick={() => onFocus(a.id)} className="w-full carte p-2.5 flex items-center gap-2 text-left hover:border-miel/40">
                    <span className={`w-2.5 h-2.5 rounded-full ${ok ? 'bg-ok' : 'bg-warn'}`} />
                    <span className="flex-1 text-[13.5px] font-semibold">{p.nom}</span>
                    <span className={`text-[11.5px] ${ok ? 'text-ok' : 'text-warn'}`}>{ok ? 'Contrôlé' : 'À traiter'}</span>
                    <ArrowRight size={14} className="text-dim" />
                  </button>
                );
              })}
            </div>
          )}
          {dansZone.length > 0 && (
            <div className="rounded-xl border border-accent/25 bg-accent/5 p-3">
              <div className="titre-section mb-1.5">Zone sélectionnée : {ZONES[zone!].nom}</div>
              <div className="flex flex-wrap gap-1.5">{dansZone.map(puce)}</div>
            </div>
          )}
          {familles.map((fam) => {
            const liste = PATHOLOGIES.filter((p) => p.famille === fam && p.niveauMin <= Math.max(niveau, 2));
            if (!liste.length) return null;
            return <div key={fam}><div className="titre-section mb-1.5">{FAMILLES[fam]}</div><div className="flex flex-wrap gap-1.5">{liste.map(puce)}</div></div>;
          })}
          <p className="text-xs text-dim">Un seul type de diabète à la fois ; les situations et les complications s'ajoutent.</p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────── Traitement intégré à la fiche ───────────────────────────

function BlocTraitement({ patho, niveau, actives, etat, etatSans, traitement, terrain, onDose, onRemplacer, onSequence, onComparer }: {
  patho: Pathologie; niveau: Niveau; actives: PathoActive[]; etat: Etat; etatSans: Etat; traitement: Traitement; terrain: Terrain;
  onDose: (c: ClasseId, d: number) => void; onRemplacer: (t: Traitement) => void; onSequence: () => void; onComparer: () => void;
}) {
  const [ouverte, setOuverte] = useState<ClasseId | null>(null);
  const [autres, setAutres] = useState(false);
  const simulee = actives.some((a) => a.id === patho.id);
  const propose = patho.traitement.propose;
  const proposees = Object.keys(propose) as ClasseId[];
  const t1 = terrain.type === 't1';
  const principales = CLASSES.filter((c) => proposees.includes(c.id) || (t1 ? INSULINES_IDS.includes(c.id) : ['metformine', 'sulfamide', 'idpp4', 'aglp1', 'isglt2', 'basale'].includes(c.id)));
  const secondaires = CLASSES.filter((c) => !principales.includes(c));
  const actif = Object.values(traitement).some((d) => d && d > 0);
  const points = simulee ? evaluerPathologie(patho.id, actives, etat, traitement) : [];
  const enPlus = classesEnPlus(actives, traitement);
  const unites = (c: ClasseId, d: number) => injectionsPour(terrain, { [c]: d }).map((i) => `${i.u} U`).join(' + ');

  const ligneClasse = (c: Classe) => {
    const d = traitement[c.id] ?? 0;
    const open = ouverte === c.id;
    return (
      <div key={c.id} className={`carte ${d ? 'border-ok/40' : ''}`}>
        <div className="flex items-center gap-2 p-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.couleur }} />
          <button className="flex-1 text-left min-w-0" onClick={() => setOuverte(open ? null : c.id)}>
            <div className="text-[13px] font-semibold truncate">{niveau === 1 ? c.court : c.nom}{proposees.includes(c.id) && <span className="ml-1.5 text-[10px] text-ok font-bold">PROPOSÉ</span>}</div>
            <div className="text-[11px] text-dim truncate">{INSULINES_IDS.includes(c.id) && d ? `${unites(c.id, d)} · ` : ''}{c.exemples}</div>
          </button>
          <div className="seg shrink-0">
            <button className={d === 0 ? 'actif' : ''} onClick={() => onDose(c.id, 0)} aria-label={`Sans ${c.court}`}>0</button>
            {DOSES.map((x) => <button key={x.v} className={d === x.v ? 'actif' : ''} onClick={() => onDose(c.id, x.v)} aria-label={`${c.court} ${x.nom}`}>{x.v === 0.5 ? '½' : x.v === 1 ? '1' : '2'}</button>)}
          </div>
        </div>
        {open && (
          <div className="px-3 pb-3 space-y-2 text-[13px] fade-in">
            <div className="text-[11.5px] text-dim">Agit sur : {c.cible}</div>
            <Texte3 textes={c.mecanisme} niveau={niveau} />
            <p><span className="font-semibold">Ce qu'on voit : </span><span className="text-muted">{c.effetVisible}</span></p>
            <div><span className="font-semibold">Effets indésirables : </span><span className="text-muted">{c.indesirables.join(' · ')}</span></div>
            <div><span className="font-semibold">Précautions : </span><span className="text-muted">{c.precautions}</span></div>
            <div className="rounded-lg bg-warn/8 border border-warn/25 p-2"><span className="font-semibold text-warn">À l'arrêt : </span>{c.arret}</div>
          </div>
        )}
      </div>
    );
  };
  const parGroupe = (liste: Classe[]) => (Object.keys(GROUPES) as GroupeClasse[]).map((gp) => {
    const l = liste.filter((c) => c.groupe === gp);
    return l.length ? <div key={gp} className="space-y-1.5"><div className="text-[11px] text-dim font-semibold">{GROUPES[gp]}</div>{l.map(ligneClasse)}</div> : null;
  });

  return (
    <section className="rounded-2xl border border-ok/25 bg-ok/[0.04] p-3.5 space-y-3">
      <div className="flex items-center gap-2"><Pill size={16} className="text-ok" /><span className="font-bold">Traiter</span></div>
      <p className="text-[13.5px]">{patho.traitement.texte}</p>
      {patho.traitement.nonMedicamenteux && <p className="text-[12.5px] text-muted">Hygiène de vie : {patho.traitement.nonMedicamenteux}</p>}
      {(proposees.length > 0 || patho.traitement.retirer?.length) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {proposees.map((c) => <span key={c} className={`puce trt ${traitement[c] ? 'actif' : ''}`}>{CLASSE_PAR_ID[c].court}{propose[c] !== 1 ? ` ${propose[c] === 0.5 ? '½' : '×2'}` : ''}</span>)}
          {patho.traitement.retirer?.map((c) => <span key={c} className="puce line-through opacity-70">{CLASSE_PAR_ID[c].court}</span>)}
          <button onClick={() => { const n: Traitement = { ...traitement, ...propose }; for (const c of patho.traitement.retirer ?? []) delete n[c]; onRemplacer(n); if (simulee) setTimeout(onSequence, 50); }} className="ml-auto rounded-lg bg-ok text-ink font-bold text-[13px] px-3 py-1.5 inline-flex items-center gap-1.5"><Pill size={14} /> Appliquer le traitement proposé</button>
        </div>
      )}
      {simulee && actif && (
        <>
          <div className="titre-section">Résultat (écart par rapport à sans traitement)</div>
          <Moniteur e={etat} niveau={Math.min(niveau, 2) as Niveau} ref0={etatSans} compact />
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onSequence} className="rounded-lg bg-card2 border border-line py-2 text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5"><Play size={13} fill="currentColor" /> Effet dans le temps</button>
            <button onClick={onComparer} className="rounded-lg bg-card2 border border-line py-2 text-[12.5px] font-semibold">Comparer sans / avec</button>
          </div>
        </>
      )}
      {points.length > 0 && (
        <ul className="space-y-1.5">
          {points.map((p) => (
            <li key={p.texte} className={`flex gap-2 text-[13px] rounded-lg p-2 ${p.ok ? 'bg-ok/10' : 'bg-warn/10'}`}>
              {p.ok ? <Check size={15} className="text-ok shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="text-warn shrink-0 mt-0.5" />}<span>{p.texte}</span>
            </li>
          ))}
        </ul>
      )}
      {enPlus.length > 0 && (
        <div className="rounded-lg border border-line p-2.5 text-[13px] space-y-1">
          <div className="titre-section">Ajouté sans indication ici</div>
          {enPlus.map((c) => <div key={c}><b>{CLASSE_PAR_ID[c].court}</b> <span className="text-muted">— pas utile pour la situation simulée ; il apporte surtout ses effets indésirables : {CLASSE_PAR_ID[c].indesirables[0].toLowerCase()}.</span></div>)}
        </div>
      )}
      {etat.alertes.map((a) => (
        <div key={a.texte} className={`rounded-xl border p-2.5 text-[13px] flex gap-2 ${a.niveau === 'danger' ? 'border-alert/50 bg-alert/10' : a.niveau === 'attention' ? 'border-warn/40 bg-warn/8' : 'border-accent/30 bg-accent/5'}`}>
          <AlertTriangle size={15} className={`shrink-0 mt-0.5 ${a.niveau === 'danger' ? 'text-alert' : a.niveau === 'attention' ? 'text-warn' : 'text-accent'}`} /> {a.texte}
        </div>
      ))}
      {etat.effets.length > 0 && <div className="text-[12.5px] text-muted"><span className="font-semibold text-txt">À surveiller : </span>{etat.effets.join(' · ')}</div>}

      <div className="space-y-2">
        <div className="flex items-center justify-between"><div className="titre-section">Ajuster classe par classe</div>{actif && <button onClick={() => onRemplacer({})} className="text-xs text-muted hover:text-txt">Tout retirer</button>}</div>
        {parGroupe(principales)}
        <button onClick={() => setAutres((v) => !v)} className="text-xs text-accent font-semibold inline-flex items-center gap-1"><ChevronDown size={14} className={autres ? 'rotate-180' : ''} /> {autres ? 'Masquer les autres classes' : `Essayer une autre classe (${secondaires.length})`}</button>
        {autres && parGroupe(secondaires)}
      </div>
      {simulee && <div className="carte p-3"><div className="titre-section mb-2">Risques</div><Risques e={etat} ref0={actif ? etatSans : null} /></div>}
    </section>
  );
}

// ─────────────────────────── Évolution ───────────────────────────

export interface VueEvolution { scenario: Scenario; an: number; arret: number }

const ans = (a: number) => (a < 1 ? `${Math.round(a * 12)} mois` : `${String(Number.isInteger(a) ? a : a.toFixed(1)).replace('.', ',')} an${a >= 2 ? 's' : ''}`);

export function PanneauEvolution({ terrain, traitement, vueEvo, onVueEvo, onAllerTraitements }: {
  terrain: Terrain; traitement: Traitement; vueEvo: VueEvolution | null; onVueEvo: (v: VueEvolution | null) => void; onAllerTraitements: () => void;
}) {
  const [an, setAn] = useState(vueEvo?.an ?? 5);
  const [arret, setArret] = useState(vueEvo?.arret ?? 5);
  const actif = Object.values(traitement).some((d) => d && d > 0);
  const series = useMemo(() => ({
    sans: evoluer(terrain, traitement, 'sans').points,
    ...(actif ? { avec: evoluer(terrain, traitement, 'avec').points, arret: evoluer(terrain, traitement, 'arret', arret).points } : {}),
  }), [terrain, traitement, arret, actif]);
  const maj = (a: number) => { setAn(a); if (vueEvo) onVueEvo({ ...vueEvo, an: a, arret }); };
  const p = (k: keyof typeof series) => series[k]?.[indexAn(an)];
  const t2 = terrain.type === 't2';
  return (
    <div className="space-y-4 fade-in">
      <div>
        <h2 className="font-display text-xl">Et dans 10 ans ?</h2>
        <p className="text-sm text-muted mt-1">Trois histoires pour le même patient : sans traitement, avec le traitement suivi, ou traitement arrêté en cours de route.</p>
      </div>
      {terrain.type === 'aucun' && <p className="carte p-3 text-[13px] text-muted">Le sujet sain reste stable. Choisissez un diabète (onglet Maladies) pour voir son évolution.</p>}
      {!actif && terrain.type !== 'aucun' && (
        <button onClick={onAllerTraitements} className="w-full carte p-3 text-left text-sm"><span className="text-accent font-semibold">Choisissez d'abord un traitement</span> <span className="text-muted">(onglet Maladies : ouvrez une fiche puis « Traiter ») pour comparer les trois scénarios.</span></button>
      )}
      <div className="flex flex-wrap gap-3 text-xs">
        {LEGENDE_SCENARIOS.filter((l) => l.k === 'sans' || actif).map((l) => <span key={l.k} className="inline-flex items-center gap-1.5"><span className="w-3 h-1 rounded" style={{ background: l.c }} />{l.nom}</span>)}
      </div>
      <div className="carte p-3 space-y-2">
        <label className="text-xs text-muted flex justify-between"><span>Moment observé</span><span className="num text-txt">{ans(an)}</span></label>
        <input type="range" min={0} max={10} step={0.25} value={an} onChange={(e) => maj(+e.target.value)} aria-label="Moment observé" />
        {actif && (
          <>
            <label className="text-xs text-muted flex justify-between pt-1"><span>Arrêt du traitement au bout de</span><span className="num text-warn">{ans(arret)}</span></label>
            <input type="range" min={1} max={9} step={0.5} value={arret} onChange={(e) => { setArret(+e.target.value); if (vueEvo) onVueEvo({ ...vueEvo, arret: +e.target.value }); }} aria-label="Moment de l'arrêt du traitement" />
          </>
        )}
        <div className="pt-1">
          <div className="text-xs text-muted mb-1.5">Montrer dans la scène :</div>
          <div className="seg flex-wrap">
            <button className={!vueEvo ? 'actif' : ''} onClick={() => onVueEvo(null)}>Aujourd'hui</button>
            {LEGENDE_SCENARIOS.filter((l) => l.k === 'sans' || actif).map((l) => (
              <button key={l.k} className={vueEvo?.scenario === l.k ? 'actif' : ''} onClick={() => onVueEvo({ scenario: l.k, an, arret })}>{l.nom.replace('Traitement ', '')}</button>
            ))}
          </div>
        </div>
      </div>
      <GraphiqueEvolution series={series} cle="hba1c" titre="HbA1c estimée" unite="%" an={an} arret={arret} format={(v) => v.toFixed(1)} cible={7} />
      <GraphiqueEvolution series={series} cle="aJeun" titre="Glycémie au réveil" unite="g/L" an={an} arret={arret} format={(v) => v.toFixed(2)} />
      {t2 && <GraphiqueEvolution series={series} cle="beta" titre="Fonction des cellules bêta" unite="%" an={an} arret={arret} />}
      <GraphiqueEvolution series={series} cle="tir" titre="Temps dans la cible" unite="%" an={an} arret={arret} cible={70} />
      <GraphiqueEvolution series={series} cle="micro" titre="Risque relatif : yeux, reins, nerfs" unite="×" an={an} arret={arret} format={(v) => v.toFixed(1)} />
      <GraphiqueEvolution series={series} cle="coro" titre="Risque relatif d'infarctus" unite="×" an={an} arret={arret} format={(v) => v.toFixed(1)} />
      <div className="carte p-3 text-[13px] space-y-1">
        <div className="titre-section mb-1">Au moment observé</div>
        {(['sans', 'avec', 'arret'] as const).filter((k) => series[k]).map((k) => {
          const q = p(k)!; const l = LEGENDE_SCENARIOS.find((x) => x.k === k)!;
          return <div key={k} className="flex justify-between gap-2"><span style={{ color: l.c }}>{l.nom}</span><span className="num text-muted">HbA1c {q.hba1c.toFixed(1)} · micro ×{q.micro.toFixed(1)} · IDM ×{q.coro.toFixed(1)}</span></div>;
        })}
      </div>
      <p className="text-[11px] text-dim">Les risques utilisent l'HbA1c moyenne depuis le début, comme l'UKPDS : un bon équilibre précoce garde un bénéfice même après un arrêt (« effet mémoire »). Modèle pédagogique : tendances et ordres de grandeur, pas une prédiction pour un patient.</p>
    </div>
  );
}
