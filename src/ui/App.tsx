import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, FlaskConical, Pause, Pill, Play, RefreshCcw, Share2, Speech, X } from 'lucide-react';
import { evolution, simuler, PROFILS, INSULINES, type Injection, type ProfilId, type Repas, type Resultat } from '../core/moteur.ts';
import { apresDelaiEtVoix, choisirVoix, textePrononcable } from '../core/voix.ts';
import { CHAPITRES, JOURNEES, REGLAGES_DEPART, SCENARIOS, SCHEMAS, injectionsPour, nomRepas, type JourneeId, type Reglages, type SchemaId } from '../content/parcours.ts';
import { CLASSES, CLASSE_PAR_ID, type ClasseId } from '../content/classes.ts';
import { ORGANES, type OrganeId } from '../content/organes.ts';
import { Corps } from '../render/Corps.tsx';
import { ORGANES_DETAILLES, VueOrgane, type EtatOrgane } from '../render/Organes.tsx';
import type { ModePancreas } from '../render/Pancreas3D.ts';
import { Courbe10ans, Courbe24h } from '../render/Courbes.tsx';
import { IconeContact, partagerApp, Signalement, WHATSAPP, WHATSAPP_AFFICHE } from './Signalement.tsx';
import { BandeauInstaller, FenetreInstaller } from './Installer.tsx';

type Onglet = 'parcours' | 'simulateur' | 'traitements';
const nf = (x: number, d = 2) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
const GRAISSE: Record<ProfilId, number> = { sain: 0, prediabete: 0.5, t2leger: 0.7, t2: 0.85, t2evolue: 0.85, t1: 0 };
const PROFILS_UI: [ProfilId, string][] = [['sain', 'Sain'], ['prediabete', 'Prédiabète'], ['t2leger', 'Type 2 (début)'], ['t2', 'Type 2'], ['t2evolue', 'Type 2 évolué'], ['t1', 'Type 1']];
const ORALES: ClasseId[] = ['metformine', 'sulfamide', 'idpp4', 'aglp1', 'isglt2'];
const DOSES: [number, string][] = [[0, '0'], [0.5, '½'], [1, '1'], [2, '2']];
const fmtH = (h: number) => `${String(Math.floor(h)).padStart(2, '0')} h ${String(Math.round((h % 1) * 60) % 60).padStart(2, '0')}`;

function construire(reg: Reglages) {
  const repas = JOURNEES[reg.journee].repas.map((r) => ({ ...r }));
  let inj = injectionsPour(reg.schema, repas, reg.profil);
  if (reg.sansBolusMidi) inj = inj.filter((i) => !(i.type === 'rapideAnalogue' && i.h > 12 && i.h < 15));
  return { repas, inj };
}

export default function App() {
  const [onglet, setOnglet] = useState<Onglet>('parcours');
  const [chap, setChap] = useState(0);
  const [etape, setEtape] = useState(0);
  const [reglages, setReglages] = useState<Reglages>({ ...REGLAGES_DEPART, ...CHAPITRES[0]!.etapes[0]!.reglages });
  const [repas, setRepas] = useState<Repas[]>(() => construire({ ...REGLAGES_DEPART }).repas);
  const [injections, setInjections] = useState<Injection[]>([]);
  const [heure, setHeure] = useState(13.6);
  const [anime, setAnime] = useState(false);
  const [focus, setFocus] = useState<OrganeId[]>(CHAPITRES[0]!.etapes[0]!.focus);
  const [voirAnnees, setVoirAnnees] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [voix, setVoix] = useState(false);
  const [organeInfo, setOrganeInfo] = useState<OrganeId | null>(null);
  const [detail, setDetail] = useState<OrganeId | null>(null);
  const [modePancreas, setModePancreas] = useState<ModePancreas>('organe');
  const [scenario, setScenario] = useState('');
  const [contact, setContact] = useState(false);
  const [aideInstall, setAideInstall] = useState(false);
  const [invite, setInvite] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [maj, setMaj] = useState(false);

  useEffect(() => {
    const surInstall = (e: Event) => { e.preventDefault(); setInvite(e as Event & { prompt: () => Promise<void> }); };
    const surMaj = () => setMaj(true);
    addEventListener('beforeinstallprompt', surInstall); addEventListener('gluco-maj', surMaj);
    return () => { removeEventListener('beforeinstallprompt', surInstall); removeEventListener('gluco-maj', surMaj); };
  }, []);

  /** Applique des réglages complets (patient, journée, traitements…) et recalcule repas et injections. */
  const appliquer = (reg: Reglages) => { const { repas: r, inj } = construire(reg); setReglages(reg); setRepas(r); setInjections(inj); };

  /** Aller à une étape du parcours. */
  const allerEtape = (c: number, e: number) => {
    const ch = CHAPITRES[c]!; const et = ch.etapes[e]!;
    setChap(c); setEtape(e);
    appliquer({ ...REGLAGES_DEPART, ...et.reglages });
    setFocus(et.focus); setVoirAnnees(!!et.annees);
    if (et.heure !== undefined) { setHeure(et.heure); setAnime(false); } else setAnime(true);
    setOrganeInfo(null); setDetail(et.vue ?? null); if (et.vue === 'pancreas') setModePancreas(et.ilot ? 'ilot' : 'organe');
  };
  const etapeCourante = CHAPITRES[chap]!.etapes[etape]!;

  // Simulation
  const args = useMemo(() => ({
    profil: reglages.profil, insuffisanceRenale: reglages.ir, repas: repas.filter((r) => r.g > 0),
    efforts: reglages.effort ? [{ h: 16, duree: 45, intensite: 0.7 }] : [], traitements: reglages.tr, injections,
  }), [reglages, repas, injections]);
  const sim = useMemo(() => simuler(args), [args]);
  const aTraitement = ORALES.some((c) => ((reglages.tr as Record<string, number | boolean | undefined>)[c] as number ?? 0) > 0) || injections.length > 0;
  const fantome = useMemo<Resultat | null>(() => (aTraitement ? simuler({ ...args, traitements: {}, injections: [] }) : null), [args, aTraitement]);
  const type2 = ['prediabete', 't2leger', 't2', 't2evolue'].includes(reglages.profil);
  const montrerAnnees = type2 && (onglet !== 'parcours' || voirAnnees);
  const ans = useMemo(() => montrerAnnees ? { sans: evolution({ profil: reglages.profil, repas: args.repas }), avec: evolution({ profil: reglages.profil, repas: args.repas, traitements: reglages.tr, injections }) } : null, [montrerAnnees, reglages, args.repas, injections]);

  // Animation de l'heure (une journée en 40 secondes)
  useEffect(() => {
    if (!anime) return;
    let raf = 0, t = performance.now();
    const f = (n: number) => { const dt = (n - t) / 1000; t = n; setHeure((h) => (h + dt * 0.6) % 24); raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f); return () => cancelAnimationFrame(raf);
  }, [anime]);

  // Lecture guidée : voix off + avance automatique (attend la fin de la phrase)
  const voixChoisie = useRef<SpeechSynthesisVoice | null>(null);
  const voixDispo = typeof window !== 'undefined' && 'speechSynthesis' in window;
  useEffect(() => {
    if (!voixDispo) return;
    const m = () => { voixChoisie.current = choisirVoix(speechSynthesis.getVoices()); };
    m(); speechSynthesis.addEventListener?.('voiceschanged', m); return () => speechSynthesis.removeEventListener?.('voiceschanged', m);
  }, [voixDispo]);
  useEffect(() => {
    if (!voixDispo) return;
    speechSynthesis.cancel();
    if (!voix || onglet !== 'parcours') return;
    const u = new SpeechSynthesisUtterance(textePrononcable(`${etapeCourante.titre}. ${etapeCourante.texte} ${etapeCourante.detail}`));
    const v = voixChoisie.current; if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'fr-FR';
    u.rate = 0.97; const t = setTimeout(() => speechSynthesis.speak(u), 150); return () => clearTimeout(t);
  }, [voix, chap, etape, onglet, voixDispo]);
  useEffect(() => {
    if (!lecture || onglet !== 'parcours') return;
    const n = CHAPITRES[chap]!.etapes.length;
    if (etape >= n - 1) { const t = setTimeout(() => setLecture(false), 4000); return () => clearTimeout(t); }
    return apresDelaiEtVoix(9000, () => allerEtape(chap, etape + 1));
  }, [lecture, chap, etape, onglet]);

  // Sites d'action des traitements actifs
  const sites = useMemo(() => {
    const s: Partial<Record<OrganeId, string[]>> = {};
    const ajouter = (c: ClasseId) => { for (const o of CLASSE_PAR_ID[c].sites) (s[o] ??= []).push(CLASSE_PAR_ID[c].couleur); };
    for (const c of ORALES) if (((reglages.tr as Record<string, number | undefined>)[c] ?? 0) > 0) ajouter(c);
    if (injections.length) ajouter('insuline');
    return s;
  }, [reglages.tr, injections]);
  const gH = sim.G[Math.min(sim.G.length - 1, Math.round(heure * 60))] ?? 90;
  const glucosurie = gH > 180 || (((reglages.tr.isglt2 ?? 0) > 0) && gH > 80);
  const effortEnCours = reglages.effort && heure >= 16 && heure < 16.75;
  const iH = sim.I[Math.min(sim.I.length - 1, Math.round(heure * 60))] ?? 8;
  const etatOrgane: EtatOrgane = { g: gH, i: iH, ra: sim.Ra[Math.min(sim.Ra.length - 1, Math.round(heure * 60))] ?? 0,
    secretion: reglages.profil === 't1' ? 0 : Math.min(1, (injections.length ? Math.max(0, iH - 10) : iH) / 70) * Math.min(1, PROFILS[reglages.profil].beta * 2.2),
    beta: PROFILS[reglages.profil].beta, type1: reglages.profil === 't1', si: PROFILS[reglages.profil].si, tr: reglages.tr, injection: injections.length > 0, ir: reglages.ir, effort: effortEnCours };

  const reinitialiser = () => { setDetail(null); setOnglet('parcours'); setLecture(false); setVoix(false); allerEtape(0, 0); setScenario(''); };
  const contexte = [`Onglet : ${onglet}`, onglet === 'parcours' ? `Chapitre : ${CHAPITRES[chap]!.titre}, étape ${etape + 1}` : `Scénario : ${scenario || 'libre'}`,
    `Patient : ${PROFILS[reglages.profil].nom}${reglages.ir ? ' + rein malade' : ''}`, `Repas : ${repas.map((r) => `${fmtH(r.h)} ${r.g} g`).join(', ')}`,
    `Traitements : ${ORALES.filter((c) => ((reglages.tr as Record<string, number | undefined>)[c] ?? 0) > 0).map((c) => `${CLASSE_PAR_ID[c].court} ×${(reglages.tr as Record<string, number>)[c]}`).join(', ') || 'aucun'}${reglages.tr.glibenclamide ? ' (glibenclamide)' : ''}`,
    `Insuline : ${injections.map((i) => `${fmtH(i.h)} ${INSULINES[i.type].nom} ${i.u} U`).join(', ') || 'aucune'}`,
    `Résultats : à jeun ${nf(sim.stats.aJeun / 100)} g/L, HbA1c ${nf(sim.stats.hba1c, 1)} %, cible ${Math.round(sim.stats.tir * 100)} %, < 0,70 ${Math.round(sim.stats.tbr70 * 100)} %`,
    `Appareil : ${navigator.userAgent}`].join('\n');

  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-30 bg-fond/90 backdrop-blur border-b border-line">
        <div className="max-w-[1500px] mx-auto px-3 sm:px-5 h-12 lg:h-14 flex items-center gap-2">
          <span className="w-7 h-7 rounded-full grid place-items-center bg-[radial-gradient(circle_at_35%_30%,#ffd27a,#e0921a_60%,#9a5a06)] shadow-[0_0_16px_rgba(240,168,50,.45)]" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 3c3 4 6 7.5 6 11a6 6 0 0 1-12 0c0-3.5 3-7 6-11z" fill="#fff" /></svg></span>
          <div className="font-display text-[17px] sm:text-[19px] font-bold flex items-center gap-1.5">Glucodyssée <span className="max-[379px]:hidden font-sans text-[9px] font-bold uppercase tracking-wider text-miel border border-miel/40 rounded px-1 py-px leading-none">Bêta</span></div>
          <span className="ml-auto" />
          <button onClick={reinitialiser} className="btn-icone" title="Tout réinitialiser" aria-label="Tout réinitialiser"><RefreshCcw size={16} /></button>
          <button onClick={() => void partagerApp()} className="btn-icone" title="Partager l'application" aria-label="Partager l'application"><Share2 size={16} /></button>
          <button onClick={() => setContact(true)} className="h-[34px] rounded-[10px] px-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#25d366] border border-[#25d366]/40 bg-[#25d366]/10 active:scale-95 transition-transform" aria-label="Contacter ou signaler"><IconeContact size={16} /> Contact</button>
        </div>
      </header>

      <main className="flex-1 max-w-[1500px] w-full mx-auto p-2 sm:p-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_440px]">
        <section className="grid gap-3 min-w-0 content-start">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_minmax(0,1fr)] lg:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <div className="carte p-2 relative">
              <div className="h-[300px] sm:h-[420px] relative">
                {detail ? <VueOrgane organe={detail} e={etatOrgane} mode={modePancreas} onMode={setModePancreas} />
                  : <Corps sim={sim} heure={heure} focus={organeInfo ? [organeInfo] : focus} sites={sites} graisse={GRAISSE[reglages.profil]} glucosurie={glucosurie} effort={effortEnCours} onOrgane={(o) => setOrganeInfo((x) => (x === o ? null : o))} />}
              </div>
              <div className="flex flex-wrap gap-1 pt-1 pb-0.5" role="tablist" aria-label="Vue">
                <button onClick={() => setDetail(null)} className={`puce shrink-0 !min-h-8 !py-1 ${!detail ? 'actif' : ''}`}>Corps</button>
                {ORGANES_DETAILLES.map((o) => <button key={o} onClick={() => { setDetail(o); setOrganeInfo(null); }} className={`puce shrink-0 !min-h-8 !py-1 ${detail === o ? 'actif' : ''}`}>{ORGANES[o].nom}{o === 'pancreas' ? ' 3D' : ''}</button>)}
              </div>
              <div className="absolute top-2 left-2 rounded-full bg-fond/85 border border-line px-2.5 py-1 text-[12px] num">{fmtH(heure)} · <b className="text-miel">{nf(gH / 100)} g/L</b></div>
              <button onClick={() => setAnime((a) => !a)} className="absolute top-2 right-2 btn-icone" aria-label={anime ? 'Mettre la journée en pause' : 'Faire défiler la journée'} title={anime ? 'Pause' : 'Faire défiler la journée'}>{anime ? <Pause size={15} /> : <Play size={15} />}</button>
              {!detail && <p className="text-[11px] text-dim text-center">Points dorés : sucre · clés bleues : insuline · touchez un organe</p>}
              {onglet === 'parcours' && (
                <div className="lg:hidden mt-2 rounded-xl border border-miel/40 bg-fond/80 p-2.5 flex items-start gap-2 fade-in" aria-live="polite">
                  <button onClick={() => allerEtape(chap, Math.max(0, etape - 1))} disabled={etape === 0} className="btn-icone shrink-0 disabled:opacity-35" aria-label="Étape précédente (légende)"><ChevronLeft size={15} /></button>
                  <div className="min-w-0 flex-1"><div className="text-[10.5px] uppercase tracking-wider text-dim font-bold">{CHAPITRES[chap]!.titre} · {etape + 1}/{CHAPITRES[chap]!.etapes.length}</div><div className="text-[14px] font-bold leading-snug">{etapeCourante.titre}</div><div className="text-[13px] text-muted leading-snug">{etapeCourante.texte}</div></div>
                  <button onClick={() => etape < CHAPITRES[chap]!.etapes.length - 1 ? allerEtape(chap, etape + 1) : chap < CHAPITRES.length - 1 && allerEtape(chap + 1, 0)} className="btn-icone shrink-0 !bg-miel !text-fond" aria-label="Étape suivante (légende)"><ChevronRight size={15} /></button>
                </div>
              )}
              {organeInfo && <div className="absolute inset-x-2 bottom-2 carte p-2.5 text-[12.5px] fade-in"><div className="flex justify-between gap-2"><b>{ORGANES[organeInfo].nom}</b><button onClick={() => setOrganeInfo(null)} aria-label="Fermer"><X size={14} /></button></div><p className="text-muted mt-0.5">{ORGANES[organeInfo].role}</p>{ORGANES_DETAILLES.includes(organeInfo) && <button onClick={() => { setDetail(organeInfo); setOrganeInfo(null); }} className="mt-1.5 h-8 rounded-lg px-3 text-[12px] font-bold bg-miel text-fond">Voir en détail{organeInfo === 'pancreas' ? ' (3D)' : ''}</button>}</div>}
            </div>
            <div className="grid gap-3 content-start min-w-0">
              <div className="carte p-3">
                <div className="flex flex-wrap justify-between items-baseline gap-x-3 gap-y-1">
                  <div className="titre-section">Glycémie sur 24 heures</div>
                  <div className="flex flex-wrap gap-x-3 text-[11.5px] text-dim">
                    <span><i className="inline-block w-3.5 h-[3px] rounded bg-miel align-middle mr-1" />glycémie</span>
                    {fantome && <span><i className="inline-block w-3.5 h-[3px] rounded bg-fantome align-middle mr-1" />sans traitement</span>}
                    <span><i className="inline-block w-3.5 h-2 rounded-sm bg-cible-fond border border-ok align-middle mr-1" />cible 0,70-1,80</span>
                  </div>
                </div>
                <Courbe24h sim={sim} fantome={fantome} repas={repas} injections={injections} heure={heure} onHeure={(h) => { setAnime(false); setHeure(h); }} />
                <p className="text-[11px] text-dim">Touchez ou glissez sur la courbe pour choisir l'heure ; ▶ fait défiler la journée.</p>
              </div>
              <Chiffres sim={sim} profil={reglages.profil} injections={injections} />
              {ans && <div className="carte p-3"><div className="titre-section mb-1">HbA1c estimée sur 10 ans</div><Courbe10ans sans={ans.sans} avec={ans.avec} /><p className="text-[11.5px] text-dim">Le pancréas s'épuise peu à peu (environ 6 % de fonction en moins par an dans ce modèle).</p></div>}
            </div>
          </div>
        </section>

        <aside className="carte overflow-hidden lg:sticky lg:top-[68px] lg:self-start lg:max-h-[calc(100vh-84px)] flex flex-col min-w-0">
          <nav className="grid grid-cols-3 gap-1 p-1.5 border-b border-line" role="tablist">
            {([['parcours', 'Parcours', BookOpen], ['simulateur', 'Simulateur', FlaskConical], ['traitements', 'Traitements', Pill]] as const).map(([id, nom, Icone]) => (
              <button key={id} role="tab" aria-selected={onglet === id} onClick={() => { setOnglet(id); setLecture(false); if (id === 'simulateur') setAnime(true); }} className={`rounded-xl py-2 text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 ${onglet === id ? 'bg-card2 text-white' : 'text-muted hover:text-txt'}`}><Icone size={15} />{nom}</button>
            ))}
          </nav>
          <BandeauInstaller onOuvrir={() => setAideInstall(true)} />
          <div className="flex-1 overflow-y-auto scroll-thin p-3.5">
            {onglet === 'parcours' && (
              <div className="space-y-3">
                <div className="flex gap-1.5 overflow-x-auto scroll-thin pb-1">
                  {CHAPITRES.map((c, k) => <button key={c.id} onClick={() => { setLecture(false); allerEtape(k, 0); }} className={`puce shrink-0 ${chap === k ? 'actif' : ''}`}>{c.titre}</button>)}
                </div>
                <div className="flex items-center gap-1">{CHAPITRES[chap]!.etapes.map((_, k) => <button key={k} onClick={() => allerEtape(chap, k)} aria-label={`Étape ${k + 1}`} className={`h-1.5 flex-1 rounded-full ${k <= etape ? 'bg-miel' : 'bg-card2'}`} />)}</div>
                <div className="text-[11px] uppercase tracking-wider text-dim font-bold">{CHAPITRES[chap]!.titre} · étape {etape + 1}/{CHAPITRES[chap]!.etapes.length}</div>
                <h2 className="font-display text-2xl leading-tight">{etapeCourante.titre}</h2>
                <p className="text-[15px] leading-relaxed">{etapeCourante.texte}</p>
                <p className="text-[13.5px] text-muted leading-relaxed border-l-2 border-miel/50 pl-3">{etapeCourante.detail}</p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button onClick={() => allerEtape(chap, Math.max(0, etape - 1))} disabled={etape === 0} className="btn-icone disabled:opacity-35" aria-label="Étape précédente"><ChevronLeft size={16} /></button>
                  <button onClick={() => setLecture((l) => !l)} className={`h-9 rounded-xl px-3 inline-flex items-center gap-1.5 text-[13px] font-bold ${lecture ? 'bg-miel text-fond' : 'bg-card2 border border-line'}`}>{lecture ? <Pause size={14} /> : <Play size={14} />} {lecture ? 'Pause' : 'Lecture guidée'}</button>
                  {voixDispo && <button onClick={() => setVoix((v) => !v)} className={`btn-icone ${voix ? 'actif' : ''}`} aria-pressed={voix} aria-label={voix ? 'Couper la voix off' : 'Activer la voix off'} title="Voix off"><Speech size={15} /></button>}
                  <button onClick={() => etape < CHAPITRES[chap]!.etapes.length - 1 ? allerEtape(chap, etape + 1) : chap < CHAPITRES.length - 1 && allerEtape(chap + 1, 0)} className="ml-auto h-9 rounded-xl px-3 inline-flex items-center gap-1 text-[13px] font-bold bg-miel text-fond">{etape < CHAPITRES[chap]!.etapes.length - 1 ? 'Suivant' : chap < CHAPITRES.length - 1 ? 'Chapitre suivant' : 'Fin'} <ChevronRight size={15} /></button>
                </div>
                <p className="text-[12px] text-dim">Chaque étape règle le simulateur. Pour changer vous-même les repas ou les traitements, ouvrez l'onglet <button className="underline" onClick={() => setOnglet('simulateur')}>Simulateur</button>.</p>
              </div>
            )}
            {onglet === 'simulateur' && <Simulateur reglages={reglages} repas={repas} injections={injections} scenario={scenario}
              onScenario={(id) => { const s = SCENARIOS.find((x) => x.id === id)!; setScenario(id); appliquer({ ...s.reglages }); setFocus([]); }}
              onReglages={(r) => { setScenario(''); const n = { ...reglages, ...r }; if ('journee' in r || 'schema' in r || 'profil' in r) appliquer(n); else setReglages(n); }}
              onRepas={(r) => { setScenario(''); setRepas(r); if (reglages.schema === 'basalBolus') setInjections(injectionsPour('basalBolus', r, reglages.profil)); }}
              onInjections={(i) => { setScenario(''); setInjections(i); }} />}
            {onglet === 'traitements' && <Traitements onVoir={(c) => { setOnglet('simulateur'); setScenario(''); appliquer({ ...REGLAGES_DEPART, profil: c === 'insuline' ? 't2evolue' : 't2', tr: c === 'insuline' ? { metformine: 1 } : { [c]: 1 }, schema: c === 'insuline' ? 'glargine' : 'aucune' }); setFocus(CLASSE_PAR_ID[c].sites); }} />}
            <footer className="mt-6 pt-3 border-t border-line text-center text-[11px] text-dim space-y-1">
              <p>Outil pédagogique, modèle simplifié : il ne remplace ni l'avis médical ni le RCP des médicaments, et ne sert jamais à calculer une dose.</p>
              <p>© 2026 Glucodyssée · Dr O. Sow · Dakar · <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">WhatsApp {WHATSAPP_AFFICHE}</a> · <a href="mailto:oumarmaiil@gmail.com" className="underline decoration-dotted">oumarmaiil@gmail.com</a> · v{__VERSION__}</p>
              <p>Même famille que <a href="https://oumarmaiil-oss.github.io/hemodyssee/" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted">Hémodyssée</a> · <button onClick={() => setAideInstall(true)} className="underline decoration-dotted">Installer</button> · code AGPL-3.0, contenu CC BY-NC-SA 4.0</p>
              <details className="text-left max-w-xl mx-auto"><summary className="cursor-pointer text-center py-1">Sources</summary>
                <ul className="space-y-1 mt-1 leading-snug">
                  <li>• Critères diagnostiques et classification des hypoglycémies : ADA, Standards of Care in Diabetes 2025.</li>
                  <li>• Temps dans la cible : consensus international, Battelino et al., Diabetes Care 2019.</li>
                  <li>• HbA1c et glycémie moyenne : étude ADAG, Nathan et al., 2008.</li>
                  <li>• Ramadan : IDF-DAR, Diabetes and Ramadan Practical Guidelines 2021.</li>
                  <li>• Conservation de l'insuline : Ogle et al., Diabetic Medicine 2016 ; revue Cochrane sur la stabilité de l'insuline.</li>
                  <li>• Modèle : inspiré du modèle minimal de Bergman et de l'absorption des repas de Dalla Man, simplifié et calibré sur des repères cliniques.</li>
                </ul>
              </details>
            </footer>
          </div>
        </aside>
      </main>

      {contact && <Signalement contexte={contexte} onClose={() => setContact(false)} />}
      {aideInstall && <FenetreInstaller invite={invite} onInstalle={() => setInvite(null)} onClose={() => setAideInstall(false)} />}
      {maj && <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-miel/40 bg-panel shadow-2xl px-4 py-3 flex items-center gap-3 text-sm fade-in">Nouvelle version installée.<button onClick={() => location.reload()} className="rounded-lg bg-miel text-fond font-bold px-3 py-1">Recharger</button></div>}
    </div>
  );
}

function Chiffres({ sim, profil, injections }: { sim: Resultat; profil: ProfilId; injections: Injection[] }) {
  const s = sim.stats;
  const cartes: [string, string, string, string][] = [
    ['Glycémie à jeun', nf(s.aJeun / 100), `g/L · ${nf(s.aJeun / 18.0182, 1)} mmol/L`, s.aJeun < 70 ? 'text-alert' : s.aJeun < 126 ? 'text-ok' : 'text-alert'],
    ['HbA1c estimée', `${nf(s.hba1c, 1)} %`, s.tbr70 > 0.04 ? 'basse à cause des hypoglycémies : piège !' : 'si chaque jour ressemblait à celui-ci', s.tbr70 > 0.04 ? 'text-alert' : s.hba1c < 7 ? 'text-ok' : 'text-alert'],
    ['Temps dans la cible', `${Math.round(s.tir * 100)} %`, '0,70-1,80 g/L (objectif > 70 %)', s.tir >= 0.7 ? 'text-ok' : 'text-alert'],
    ['Temps en hypoglycémie', `${Math.round(s.tbr70 * 100)} %`, 'sous 0,70 g/L (objectif < 4 %)', s.tbr70 > 0.04 ? 'text-alert' : 'text-ok'],
    ['Glycémie moyenne', nf(s.moyenne / 100), 'g/L', 'text-miel'],
    ['Sucre dans les urines', `${Math.round(sim.urine)} g`, 'par jour', sim.urine > 20 ? 'text-miel' : ''],
  ];
  const al: [string, string][] = [];
  if (s.min < 54) al.push(['alert', `Hypoglycémie de niveau 2 (minimum ${nf(s.min / 100)} g/L) : 15 g de sucre rapide, contrôle 15 min plus tard`]);
  else if (s.min < 70) al.push(['alert', `Hypoglycémie de niveau 1 (minimum ${nf(s.min / 100)} g/L)`]);
  if (profil === 't1' && !injections.length) al.push(['alert', 'Aucune insuline dans un diabète de type 1 : risque d\'acidocétose (urgence)']);
  else if (s.max > 300) al.push(['alert', `Hyperglycémie importante (jusqu'à ${nf(s.max / 100)} g/L)`]);
  if (!al.length && s.tir >= 0.7 && s.min >= 70) al.push(['ok', 'Journée équilibrée : dans la cible, sans hypoglycémie']);
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {cartes.map(([l, v, u, c]) => <div key={l} className="carte p-2.5 min-w-0"><div className="text-[11px] text-dim font-semibold">{l}</div><div className={`num text-[21px] font-semibold leading-tight ${c}`}>{v}</div><div className="text-[10.5px] text-dim leading-snug">{u}</div></div>)}
      </div>
      <div className="flex flex-wrap gap-1.5" aria-live="polite">{al.map(([c, t]) => <span key={t} className={`text-[12.5px] font-bold rounded-full px-3 py-1 ${c === 'ok' ? 'bg-ok/12 text-ok' : 'bg-alert/12 text-alert'}`}>{t}</span>)}</div>
    </div>
  );
}

function Simulateur({ reglages, repas, injections, scenario, onScenario, onReglages, onRepas, onInjections }: {
  reglages: Reglages; repas: Repas[]; injections: Injection[]; scenario: string;
  onScenario: (id: string) => void; onReglages: (r: Partial<Reglages>) => void; onRepas: (r: Repas[]) => void; onInjections: (i: Injection[]) => void;
}) {
  const tr = reglages.tr as Record<string, number | boolean | undefined>;
  const heures = Array.from({ length: 48 }, (_, k) => k / 2);
  const sc = SCENARIOS.find((s) => s.id === scenario);
  return (
    <div className="space-y-4">
      <div>
        <div className="titre-section mb-1.5">Scénarios à essayer</div>
        <div className="flex flex-wrap gap-1.5">{SCENARIOS.map((s) => <button key={s.id} onClick={() => onScenario(s.id)} className={`puce ${scenario === s.id ? 'actif' : ''}`}>{s.nom}</button>)}</div>
        {sc && <p className="text-[13px] text-muted mt-2 fade-in">{sc.texte}</p>}
      </div>
      <div>
        <div className="titre-section mb-1.5">Patient</div>
        <div className="flex flex-wrap gap-1.5">{PROFILS_UI.map(([id, nom]) => <button key={id} onClick={() => onReglages({ profil: id })} className={`puce ${reglages.profil === id ? 'actif' : ''}`}>{nom}</button>)}</div>
        <label className="flex items-center gap-2 mt-2 text-[13px] font-semibold"><input type="checkbox" className="w-5 h-5 accent-[var(--color-miel)]" checked={reglages.ir} onChange={(e) => onReglages({ ir: e.target.checked })} /> Rein malade (insuffisance rénale)</label>
      </div>
      <div>
        <div className="titre-section mb-1.5">Journée</div>
        <div className="flex flex-wrap gap-1.5">{(Object.keys(JOURNEES) as JourneeId[]).map((id) => <button key={id} onClick={() => onReglages({ journee: id })} className={`puce ${reglages.journee === id ? 'actif' : ''}`}>{JOURNEES[id].nom}</button>)}</div>
        <div className="mt-2 space-y-1.5">
          {repas.map((r, i) => (
            <div key={i} className="grid grid-cols-[6.5rem_1fr_auto_auto] items-center gap-1.5">
              <span className="text-[12.5px] font-semibold">{nomRepas(r.h)}</span>
              <select aria-label="Heure du repas" value={r.h} onChange={(e) => onRepas(repas.map((x, k) => (k === i ? { ...x, h: Number(e.target.value) } : x)).sort((a, b) => a.h - b.h))} className="bg-card2 border border-line rounded-lg px-2 h-9 text-[15px]">
                {heures.map((h) => <option key={h} value={h}>{fmtH(h)}</option>)}
              </select>
              <span className="flex items-center gap-1"><input aria-label="Glucides (g)" type="number" min={0} max={250} step={5} value={r.g} onChange={(e) => onRepas(repas.map((x, k) => (k === i ? { ...x, g: Math.max(0, Math.min(250, Number(e.target.value) || 0)) } : x)))} className="bg-card2 border border-line rounded-lg px-2 h-9 w-[4.8rem] text-[16px]" /><span className="text-[11px] text-dim">g</span></span>
              <button onClick={() => onRepas(repas.filter((_, k) => k !== i))} className="w-9 h-9 text-dim" aria-label="Retirer ce repas"><X size={15} /></button>
            </div>
          ))}
          <button onClick={() => onRepas([...repas, { h: 17, g: 30 }].sort((a, b) => a.h - b.h))} className="puce">+ Ajouter un repas</button>
        </div>
        <label className="flex items-center gap-2 mt-2 text-[13px] font-semibold"><input type="checkbox" className="w-5 h-5 accent-[var(--color-miel)]" checked={reglages.effort} onChange={(e) => onReglages({ effort: e.target.checked })} /> Effort : 45 min de marche rapide à 16 h</label>
      </div>
      <div>
        <div className="titre-section mb-1.5">Comprimés et injections (hors insuline)</div>
        {ORALES.map((c) => {
          const cl = CLASSE_PAR_ID[c];
          return (
            <div key={c} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 border-t border-line first:border-0">
              <div className="min-w-0"><div className="text-[13.5px] font-bold" style={{ color: (tr[c] as number ?? 0) > 0 ? cl.couleur : undefined }}>{c === 'sulfamide' ? (tr.glibenclamide ? 'Sulfamide (glibenclamide)' : 'Sulfamide (gliclazide)') : cl.nom}</div><div className="text-[11.5px] text-dim">{cl.ou}</div></div>
              <div className="seg">{DOSES.map(([v, l]) => <button key={v} className={(tr[c] as number ?? 0) === v ? 'actif' : ''} onClick={() => onReglages({ tr: { ...reglages.tr, [c]: v } })} aria-pressed={(tr[c] as number ?? 0) === v}>{l}</button>)}</div>
            </div>
          );
        })}
        <label className="flex items-center gap-2 mt-1 text-[13px] font-semibold"><input type="checkbox" className="w-5 h-5 accent-[var(--color-miel)]" checked={!!tr.glibenclamide} onChange={(e) => onReglages({ tr: { ...reglages.tr, glibenclamide: e.target.checked } })} /> Le sulfamide est du glibenclamide (plus puissant, plus long)</label>
      </div>
      <div>
        <div className="titre-section mb-1.5">Insuline</div>
        <div className="flex flex-wrap gap-1.5">{(Object.keys(SCHEMAS) as SchemaId[]).map((id) => <button key={id} onClick={() => onReglages({ schema: id })} className={`puce ${reglages.schema === id ? 'actif' : ''}`}>{SCHEMAS[id]}</button>)}</div>
        <div className="mt-2 space-y-1.5">
          {injections.map((j, i) => (
            <div key={i} className="flex items-center justify-between gap-2 text-[12.5px]">
              <span><b className="num">{fmtH(j.h)}</b> · {INSULINES[j.type].nom}</span>
              <span className="flex items-center gap-1"><input aria-label="Unités" type="number" min={0} max={80} value={j.u} onChange={(e) => onInjections(injections.map((x, k) => (k === i ? { ...x, u: Math.max(0, Math.min(80, Number(e.target.value) || 0)) } : x)))} className="bg-card2 border border-line rounded-lg px-2 h-9 w-[4.2rem] text-[16px]" /><span className="text-[11px] text-dim">U</span></span>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-dim mt-1.5">Doses de départ pour un adulte de 70 kg, à but pédagogique uniquement.</p>
      </div>
    </div>
  );
}

function Traitements({ onVoir }: { onVoir: (c: ClasseId) => void }) {
  const [ouvert, setOuvert] = useState<ClasseId | null>('metformine');
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-muted">Chaque classe agit à un endroit du corps : touchez « Voir » pour l'allumer dans la scène.</p>
      {CLASSES.map((c) => (
        <div key={c.id} className="carte p-3" style={{ borderColor: ouvert === c.id ? c.couleur + '88' : undefined }}>
          <button className="w-full flex items-center gap-2 text-left" onClick={() => setOuvert((o) => (o === c.id ? null : c.id))} aria-expanded={ouvert === c.id}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.couleur }} />
            <span className="flex-1 min-w-0"><span className="block text-[14px] font-bold">{c.nom}</span><span className="block text-[11.5px] text-dim truncate">{c.exemples}</span></span>
            <span className="text-[11.5px] font-semibold" style={{ color: c.couleur }}>{c.ou}</span>
          </button>
          {ouvert === c.id && (
            <div className="mt-2 space-y-2 text-[13px] fade-in">
              <p className="text-[14px]">{c.simple}</p>
              <p className="text-muted">{c.detail}</p>
              <div><div className="titre-section mb-0.5">Effets indésirables</div><ul className="list-disc pl-5 text-muted">{c.indesirables.map((x) => <li key={x}>{x}</li>)}</ul></div>
              <div><div className="titre-section mb-0.5">Précautions</div><p className="text-muted">{c.precautions}</p></div>
              <button onClick={() => onVoir(c.id)} className="h-9 rounded-xl px-3 text-[13px] font-bold bg-miel text-fond">Voir dans la scène</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
