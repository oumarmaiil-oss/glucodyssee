/** Application Glucodyssée : état global, mise en page, en-tête et accueil. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Compass, Download, Droplet, Heart, Map, Play, RefreshCcw, RefreshCw, Share2, Stethoscope, TrendingUp, X } from 'lucide-react';
import { apresDelaiEtVoix } from '../core/voix.ts';
import { AidesDefilement } from './Defilement.tsx';
import { BandeauInstaller, FenetreInstaller } from './Installer.tsx';
import { IconeContact, partagerApp, Signalement, WHATSAPP, WHATSAPP_AFFICHE } from './Signalement.tsx';
import { Soutien } from './Soutien.tsx';
import { calculer, evoluer, indexAn, REPAS_JOUR, TERRAIN_SAIN } from '../core/engine.ts';
import { Son } from '../core/audio.ts';
import type { ClasseId, Effort, Niveau, Repas, Traitement } from '../core/types.ts';
import type { ZoneId } from '../content/zones.ts';
import { bilanJeune, CHOIX_RAMADAN, type ReglageRamadan } from '../content/atelierRamadan.ts';
import { PanneauRamadan, type EtatAtelierRamadan } from './AtelierRamadan.tsx';
import { construireTerrain, PATHO_PAR_ID, TYPES_DIABETE, type PathoActive } from '../content/pathologies.ts';
import { CLASSE_PAR_ID } from '../content/classes.ts';
import { Stage, zoneDansVue, type SiteCellule, type Vue } from './Stage.tsx';
import { PRESENTATION_PAR_ID } from '../content/presentations.ts';
import { Moniteur } from './widgets.tsx';
import { PanneauEvolution, PanneauExplorer, PanneauMaladies, type VueEvolution } from './panels.tsx';
import { minuteDepart, VOYAGE_PAR_ID, type Voyage } from '../content/voyages.ts';
import { VUES_PATHO } from '../content/vuesPatho.ts';
import { SOURCES } from '../content/sources.ts';
import { FenetreSources } from './Sources.tsx';

type Onglet = 'explorer' | 'maladies' | 'evolution';

const PHASES = [
  { an: 0, nom: 'Avant le traitement' }, { an: 0.25, nom: '3 mois de traitement' }, { an: 1, nom: '1 an de traitement' },
  { an: 3, nom: '3 ans de traitement' }, { an: 5, nom: '5 ans de traitement' }, { an: 10, nom: '10 ans de traitement' },
];

/** Vue où chaque étape du voyage se voit le mieux. */
const VUE_ETAPE: Partial<Record<ZoneId, Vue>> = { ilot: 'ilot' };

const lire = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const ecrire = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* stockage indisponible */ } };

const NIVEAUX: { n: Niveau; nom: string; pour: string; icone: typeof Compass }[] = [
  { n: 1, nom: 'Découvrir', pour: 'Patients, familles, curieux : des mots simples, des images, l\'essentiel.', icone: Compass },
  { n: 2, nom: 'Comprendre', pour: 'Étudiants, infirmiers, délégués, éducateurs : les mécanismes et les chiffres clés.', icone: BookOpen },
  { n: 3, nom: 'Approfondir', pour: 'Médecins, pharmaciens, internes : physiopathologie détaillée, toutes les situations.', icone: Stethoscope },
];

/** Où la scène va quand une maladie est ajoutée. */
const ZONE_LESION: Record<string, ZoneId> = {
  hgpo: 'sang', t1: 'ilot', t2: 'muscles', prediabete: 'sang', gestationnel: 'sang', hypo: 'cerveau', acidocetose: 'graisse', repasSaute: 'sang', effort: 'muscles',
  ramadan: 'sang', irc: 'reins', retino: 'yeux', nephro: 'reins', neuro: 'nerfs', pied: 'pieds', coronaire: 'coeur',
};

export default function App() {
  const [niveau, setNiveau] = useState<Niveau>(() => (Number(lire('gluco.niveau')) as Niveau) || 2);
  const [accueil, setAccueil] = useState(() => !lire('gluco.niveau'));
  const [vue, setVue] = useState<Vue>('corps');
  const [site, setSite] = useState<SiteCellule>('muscle');
  const [onglet, setOnglet] = useState<Onglet>('explorer');
  const [zone, setZone] = useState<ZoneId | null>(null);
  const [actives, setActives] = useState<PathoActive[]>([]);
  const [focusPatho, setFocusPatho] = useState<string | null>(null);
  const [lectLoc, setLectLoc] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [demandeAtelier, setDemandeAtelier] = useState(0);
  const [ramadanAt, setRamadanAt] = useState<EtatAtelierRamadan | null>(null);
  const [demandeSuivi, setDemandeSuivi] = useState<{ type: 'glucose' | 'insuline'; n: number } | null>(null);
  const [traitement, setTraitement] = useState<Traitement>({});
  const [repas, setRepas] = useState<Repas[]>(REPAS_JOUR);
  const [collations, setCollations] = useState<Repas[]>([]);
  const [effortsPerso, setEffortsPerso] = useState<Effort[]>([]);
  const [injPerso, setInjPerso] = useState<{ h: number; u: number }[]>([]);
  const [vueEvo, setVueEvo] = useState<VueEvolution | null>(null);
  const [sonOn, setSonOn] = useState(false);
  const [ralenti, setRalenti] = useState(false);
  const [allerA, setAllerA] = useState<{ minute: number; n: number } | null>(null);
  const son = useRef(new Son()).current;
  const [signaler, setSignaler] = useState(false);
  const [soutien, setSoutien] = useState(false);
  const panneau = useRef<HTMLDivElement>(null);
  const [maj, setMaj] = useState(false);
  const [installer, setInstaller] = useState<(Event & { prompt: () => Promise<void> }) | null>(null);
  const [aideInstall, setAideInstall] = useState(false);
  useEffect(() => {
    const surMaj = () => setMaj(true);
    const surInstall = (e: Event) => { e.preventDefault(); setInstaller(e as Event & { prompt: () => Promise<void> }); };
    window.addEventListener('gluco-maj', surMaj);
    window.addEventListener('beforeinstallprompt', surInstall);
    window.addEventListener('appinstalled', () => setInstaller(null));
    return () => { window.removeEventListener('gluco-maj', surMaj); window.removeEventListener('beforeinstallprompt', surInstall); };
  }, []);

  const terrain = useMemo(() => construireTerrain({ ...TERRAIN_SAIN, repas, collations, efforts: effortsPerso, injectionsPlus: injPerso, ramadanHorairesHabituels: ramadanAt?.r.habituels }, actives), [actives, repas, collations, effortsPerso, injPerso, ramadanAt?.r.habituels]);
  const etatSans = useMemo(() => calculer(terrain, {}), [terrain]);
  const etatAuj = useMemo(() => calculer(terrain, traitement), [terrain, traitement]);
  const evoScene = useMemo(() => {
    if (!vueEvo) return null;
    const k = indexAn(vueEvo.an);
    const ev = evoluer(terrain, traitement, vueEvo.scenario, vueEvo.arret);
    const sans = evoluer(terrain, traitement, 'sans');
    return { etat: calculer(ev.terrains[k], traitement, { fraction: ev.fractions[k] }), sans: calculer(sans.terrains[k], {}) };
  }, [vueEvo, terrain, traitement]);
  const etatScene = evoScene?.etat ?? etatAuj;
  const etatSansScene = evoScene?.sans ?? etatSans;

  // Bandeau de la scène : ce que la maladie ouverte (ou la dernière ajoutée) montre dans la vue en cours.
  const pathoVue = focusPatho && actives.some((a) => a.id === focusPatho) ? focusPatho : actives[actives.length - 1]?.id ?? null;
  const vueCle = vue === 'ilot3d' ? 'ilot' : vue;
  const bandeauPatho = pathoVue && VUES_PATHO[pathoVue]?.vues[vueCle] ? `${PATHO_PAR_ID[pathoVue].court} · ${VUES_PATHO[pathoVue].vues[vueCle]}` : null;
  const legende = [
    actives.map((a) => PATHO_PAR_ID[a.id].court).join(' + ') || 'Sujet sain',
    Object.keys(traitement).length ? 'Traitement : ' + (Object.keys(traitement) as ClasseId[]).map((c) => CLASSE_PAR_ID[c].court).join(', ') : '',
    `HbA1c ${etatScene.stats.hba1c.toFixed(1).replace('.', ',')} %`,
  ].filter(Boolean).join(' · ');

  const [tour, setTour] = useState<{ id: Voyage['id']; i: number } | null>(null);
  const [tourPause, setTourPause] = useState(false);
  const voyage = tour ? VOYAGE_PAR_ID[tour.id] : null;
  const etapeVoyage = tour && voyage ? voyage.etapes[tour.i] : null;
  const departVoyage = useMemo(() => (voyage ? minuteDepart(voyage, etatAuj) : 0), [voyage, etatAuj]);
  const minuteVoyage = etapeVoyage ? departVoyage + (etapeVoyage.decalage ?? 0) : null;
  useEffect(() => {
    if (!tour || !etapeVoyage || !voyage) return;
    setZone(etapeVoyage.z); setVue(etapeVoyage.vue === 'ilot' ? modeIlotRef.current : etapeVoyage.vue);
    if (etapeVoyage.site) setSite(etapeVoyage.site);
    if (tourPause) return;
    return apresDelaiEtVoix(6000, () => setTour((k) => (!k || k.i >= voyage.etapes.length - 1 ? null : { ...k, i: k.i + 1 })));
  }, [tour, tourPause]);
  const lancerVoyage = (id: Voyage['id']) => { setSeq(null); setPres(null); setTourPause(false); setTour({ id, i: 0 }); };
  useEffect(() => { if (tour === null) setTourPause(false); }, [tour]);

  // Effet du traitement dans le temps : avant, puis 3 mois, 1 an, 3 ans, 5 ans, 10 ans.
  const [seq, setSeq] = useState<number | null>(null);
  const [seqPause, setSeqPause] = useState(false);
  useEffect(() => {
    if (seq === null) return;
    setVueEvo(PHASES[seq].an === 0 ? { scenario: 'sans', an: 0, arret: 5 } : { scenario: 'avec', an: PHASES[seq].an, arret: 5 });
    if (seqPause) return;
    return apresDelaiEtVoix(3000, () => setSeq((k) => (k === null || k >= PHASES.length - 1 ? null : k + 1)));
  }, [seq, seqPause]);
  useEffect(() => { if (seq === null) setSeqPause(false); }, [seq]);

  // Présentations guidées : la scène s'enchaîne seule ; à l'arrêt, on retrouve l'état d'avant.
  const [pres, setPres] = useState<{ id: string; i: number; pause: boolean } | null>(null);
  const avantPres = useRef<{ actives: PathoActive[]; traitement: Traitement; vue: Vue; zone: ZoneId | null; vueEvo: VueEvolution | null } | null>(null);
  const etapePres = pres ? PRESENTATION_PAR_ID[pres.id].etapes[pres.i] : null;
  const lancerPresentation = (id: string) => {
    if (!pres) avantPres.current = avantRamadan.current ?? { actives, traitement, vue, zone, vueEvo };
    setTour(null); setSeq(null); setFocusPatho(null); setPres({ id, i: 0, pause: false });
  };
  const arreterPresentation = () => {
    const a = avantPres.current; setPres(null); avantPres.current = null;
    if (a) { setActives(a.actives); setTraitement(a.traitement); setVue(a.vue); setZone(a.zone); setVueEvo(a.vueEvo); }
  };
  useEffect(() => {
    if (!pres || !etapePres) return;
    setActives(etapePres.actives); setTraitement(etapePres.traitement);
    setVueEvo(etapePres.evo ? { scenario: etapePres.evo.scenario, an: etapePres.evo.an, arret: 5 } : null);
    setVue(etapePres.vue); setZone(etapePres.zone ?? null);
    if (etapePres.site) setSite(etapePres.site);
  }, [pres?.id, pres?.i]);
  useEffect(() => {
    if (!pres || pres.pause || !etapePres) return;
    const n = PRESENTATION_PAR_ID[pres.id].etapes.length;
    if (pres.i >= n - 1) return;
    return apresDelaiEtVoix(etapePres.duree ?? 6500, () => setPres((p) => (p ? { ...p, i: Math.min(n - 1, p.i + 1) } : p)));
  }, [pres]);
  const vueManuelle = (v: Vue) => {
    if (pres) { setPres(null); avantPres.current = null; }
    if (tour !== null) setTour(null);
    // La zone choisie qui ne se voit pas dans la nouvelle vue est désélectionnée.
    if (zone && !zoneDansVue(zone, v)) setZone(null);
    setVue(v);
  };

  // Atelier « Jeûner en sécurité » : patient de type 2 qui jeûne ; à la fermeture, on retrouve l'état d'avant.
  const avantRamadan = useRef<{ focusPatho: string | null; actives: PathoActive[]; traitement: Traitement; vue: Vue; zone: ZoneId | null; vueEvo: VueEvolution | null; collations: Repas[]; effortsPerso: Effort[]; injPerso: { h: number; u: number }[] } | null>(null);
  const choixRamadan = ramadanAt ? CHOIX_RAMADAN.find((c) => c.id === ramadanAt.r.choix)! : null;
  const ouvrirRamadan = () => {
    if (!ramadanAt) avantRamadan.current = { focusPatho, actives, traitement, vue, zone, vueEvo, collations, effortsPerso, injPerso };
    if (pres) { setPres(null); avantPres.current = null; }
    setTour(null); setSeq(null); setFocusPatho('ramadan');
    setActives([{ id: 't2', s: 0.4 }, { id: 'ramadan', s: 0.7 }]); setTraitement(CHOIX_RAMADAN[0].tr);
    setVueEvo(null); setCollations([]); setEffortsPerso([]); setInjPerso([]); setZone(null); setVue('courbe');
    setRamadanAt({ etape: 0, r: { choix: 'metf', habituels: true } });
  };
  const fermerRamadan = () => {
    const a = avantRamadan.current; setRamadanAt(null); avantRamadan.current = null;
    if (a) { setFocusPatho(a.focusPatho); setActives(a.actives); setTraitement(a.traitement); setVue(a.vue); setZone(a.zone); setVueEvo(a.vueEvo); setCollations(a.collations); setEffortsPerso(a.effortsPerso); setInjPerso(a.injPerso); }
  };
  const reglerRamadan = (x: Partial<ReglageRamadan>) => {
    if (!ramadanAt) return;
    const r = { ...ramadanAt.r, ...x };
    setRamadanAt({ ...ramadanAt, r }); setTraitement(CHOIX_RAMADAN.find((c) => c.id === r.choix)!.tr);
  };
  // Si le jeûne disparaît (tout retirer, cas clinique, présentation…), l'atelier se ferme sans rien restaurer.
  useEffect(() => { if (ramadanAt && !actives.some((a) => a.id === 'ramadan')) { setRamadanAt(null); avantRamadan.current = null; } }, [actives]);
  const conformeRamadan = !!choixRamadan && JSON.stringify(traitement) === JSON.stringify(choixRamadan.tr);
  const bilanRamadan = useMemo(() => (ramadanAt ? bilanJeune(etatAuj) : null), [!!ramadanAt, etatAuj]);

  const lancerSequence = () => { setTour(null); setPres(null); setSeq(0); };
  const comparer = () => { setSeq(null); setVueEvo(null); setVue('courbe'); };

  const [histo, setHisto] = useState<ZoneId[]>([]);
  const [modeIlot, setModeIlot] = useState<'ilot' | 'ilot3d'>('ilot');
  const modeIlotRef = useRef(modeIlot); modeIlotRef.current = modeIlot;
  useEffect(() => { if (vue === 'ilot' || vue === 'ilot3d') setModeIlot(vue); }, [vue]);
  const choisirNiveau = (n: Niveau) => { setNiveau(n); ecrire('gluco.niveau', String(n)); setAccueil(false); };
  const togglePatho = (id: string) => {
    const ajout = !actives.some((x) => x.id === id);
    if (ajout && ZONE_LESION[id]) setZone(ZONE_LESION[id]);
    setActives((a) => {
      if (a.some((x) => x.id === id)) return a.filter((x) => x.id !== id);
      // Un seul type de diabète à la fois.
      const sansConflit = TYPES_DIABETE.includes(id) ? a.filter((x) => !TYPES_DIABETE.includes(x.id)) : a;
      return [...sansConflit, { id, s: 0.7 }];
    });
    // Certaines fiches montrent leur cause (ex. : le glibenclamide pour l'hypoglycémie).
    const p = PATHO_PAR_ID[id];
    if (ajout && p.demo) {
      const t1 = actives.some((a) => a.id === 't1' || a.id === 'acidocetose');
      setTraitement(t1 ? { basale: 1, rapide: 2 } : (tr) => ({ ...tr, ...p.demo }));
      setAllerA({ minute: 16 * 60, n: Date.now() });
    }
    if (!ajout && id === 'hypo') setCollations([]);
    if (ajout && id === 'hgpo') { setVue('courbe'); setAllerA({ minute: 7 * 60 + 40, n: Date.now() }); }
    setVueEvo(null);
  };
  const onDose = (c: ClasseId, d: number) => { setTraitement((t) => { const n = { ...t }; if (d) n[c] = d; else delete n[c]; return n; }); };
  const onZone = (z: ZoneId | null) => {
    if (zone && z !== zone) setHisto((h) => [...h.slice(-19), zone]);
    setZone(z); if (z) setOnglet('explorer');
  };
  const retour = () => { setHisto((h) => { const p = h[h.length - 1] ?? null; setZone(p); return h.slice(0, -1); }); };
  const basculerSon = () => {
    if (sonOn) { son.couper(); setSonOn(false); }
    else if (son.activer()) setSonOn(true);
  };
  // Resucrage : 15 g de sucre rapide au moment où la glycémie est la plus basse.
  const resucrer = () => {
    // Au début du malaise : premier passage sous 0,70 g/L après le réveil (sinon, au point le plus bas).
    let m = -1; for (let k = 6 * 60; k < 1440; k++) if (etatAuj.G[k] < 70) { m = k; break; }
    if (m < 0) { m = 0; for (let k = 0; k < 1440; k++) if (etatAuj.G[k] < etatAuj.G[m]) m = k; }
    const h = Math.round((m / 60) * 4) / 4;
    setCollations((c) => [...c.filter((x) => Math.abs(x.h - h) > 0.2), { h, g: 15, nom: 'Resucrage (15 g)' }]);
    setVue('courbe'); setAllerA({ minute: Math.max(0, m - 30), n: Date.now() });
  };

  // Agir en direct : collation, repas imprévu ou marche à l'heure affichée dans la scène (avec « Annuler »).
  const agir = (a: 'sucre' | 'collation' | 'repas' | 'marche' | 'insuline' | 'effacer', minute: number) => {
    const h = Math.round((minute / 60) * 12) / 12;
    const hh = `${String(Math.floor(h)).padStart(2, '0')} h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
    const avant = instantane('');
    if (a === 'effacer') { setCollations([]); setEffortsPerso([]); setInjPerso([]); setAnnulation({ ...avant, message: 'Ajouts de la journée retirés.' }); return; }
    if (a === 'marche') setEffortsPerso((x) => [...x, { h, duree: 30, intensite: 0.6 }]);
    else if (a === 'insuline') setInjPerso((x) => [...x, { h, u: 4 }]);
    else {
      const ajout: Repas = a === 'sucre' ? { h, g: 15, nom: 'Resucrage (15 g)' } : a === 'collation' ? { h, g: 30, nom: 'Collation (30 g)' } : { h, g: 60, nom: 'Repas imprévu (60 g)' };
      setCollations((c) => [...c, ajout]);
    }
    const quoi = { sucre: '15 g de sucre', collation: 'une collation de 30 g', repas: 'un repas imprévu de 60 g (sans insuline rapide)', marche: '30 minutes de marche', insuline: '4 unités d\'insuline rapide (sous la peau)' }[a];
    setAnnulation({ ...avant, message: `Ajouté à ${hh} : ${quoi}.` });
    setAllerA({ minute: Math.max(0, minute - 20), n: Date.now() });
  };

  // Réinitialiser : tout revient à l'état de départ, avec « Annuler » pendant quelques secondes.
  const [cleScene, setCleScene] = useState(0);
  const [annulation, setAnnulation] = useState<{ message: string; vue: Vue; onglet: Onglet; zone: ZoneId | null; actives: PathoActive[]; focusPatho: string | null; traitement: Traitement; vueEvo: VueEvolution | null; repas: Repas[]; collations: Repas[]; effortsPerso: Effort[]; injPerso: { h: number; u: number }[] } | null>(null);
  useEffect(() => { if (!annulation) return; const t = setTimeout(() => setAnnulation(null), 8000); return () => clearTimeout(t); }, [annulation]);
  const instantane = (message: string) => ({ message, vue, onglet, zone, actives, focusPatho, traitement, vueEvo, repas, collations, effortsPerso, injPerso });
  const reinitialiser = () => {
    setAnnulation(instantane('Tout est revenu à l\'état de départ.'));
    setPres(null); avantPres.current = null; setTour(null); setSeq(null);
    setActives([]); setTraitement({}); setVueEvo(null); setZone(null); setFocusPatho(null); setHisto([]); setRepas(REPAS_JOUR); setCollations([]); setEffortsPerso([]); setInjPerso([]);
    setOnglet('explorer'); setVue('corps'); setRalenti(false);
    if (sonOn) { son.couper(); setSonOn(false); }
    setCleScene((n) => n + 1);
    panneau.current?.scrollTo({ top: 0 });
  };
  const toutRetirer = () => {
    setAnnulation(instantane('Maladies et traitements retirés.'));
    setPres(null); avantPres.current = null; setSeq(null);
    setActives([]); setTraitement({}); setVueEvo(null); setFocusPatho(null); setCollations([]); setEffortsPerso([]); setInjPerso([]);
  };
  const annuler = () => {
    const a = annulation; if (!a) return;
    setAnnulation(null);
    setActives(a.actives); setTraitement(a.traitement); setVueEvo(a.vueEvo); setFocusPatho(a.focusPatho); setRepas(a.repas); setCollations(a.collations); setEffortsPerso(a.effortsPerso); setInjPerso(a.injPerso);
    setOnglet(a.onglet); setVue(a.vue); setZone(a.zone);
  };

  const ONGLETS: { id: Onglet; nom: string; icone: typeof Map; badge?: number }[] = [
    { id: 'explorer', nom: 'Explorer', icone: Map },
    { id: 'maladies', nom: 'Maladies et traitements', icone: Droplet, badge: actives.length || undefined },
    { id: 'evolution', nom: 'Évolution', icone: TrendingUp },
  ];

  const signature = (
    <>
        <p>Outil pédagogique : il ne remplace pas l'avis d'un médecin ni le résumé des caractéristiques des médicaments, et ne sert jamais à calculer une dose réelle.</p>
        <p className="flex flex-wrap items-center justify-center gap-x-1.5">
          © 2026 Glucodyssée · Dr O. Sow · Dakar
          <svg viewBox="0 0 30 20" width="18" height="12" aria-label="Drapeau du Sénégal" role="img" className="inline rounded-[2px]">
            <rect width="10" height="20" fill="#00853F" /><rect x="10" width="10" height="20" fill="#FDEF42" /><rect x="20" width="10" height="20" fill="#E31B23" />
            <polygon fill="#00853F" points="15,6.2 15.95,9.1 19,9.1 16.53,10.9 17.47,13.8 15,12 12.53,13.8 13.47,10.9 11,9.1 14.05,9.1" />
          </svg>
          · <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-txt">WhatsApp {WHATSAPP_AFFICHE}</a>
          · <a href="mailto:oumarmaiil@gmail.com" className="underline decoration-dotted hover:text-txt">oumarmaiil@gmail.com</a>
          · v{__VERSION__}
          · <button onClick={() => void partagerApp()} className="underline decoration-dotted hover:text-txt">Partager l'application</button>
          · <button onClick={() => setAideInstall(true)} className="underline decoration-dotted hover:text-txt">Installer</button>
          · <button onClick={() => setSoutien(true)} className="underline decoration-dotted text-miel hover:text-txt">Soutenir (Wave, Orange Money)</button>
          · <a href="https://oumarmaiil-oss.github.io/hemodyssee/" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-txt">Hémodyssée</a>
        </p>
        <p>
          Projet ouvert : <a href="https://github.com/oumarmaiil-oss/glucodyssee" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-txt">code source</a> sous licence AGPL-3.0,
          contenu sous <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-txt">CC BY-NC-SA 4.0</a>.
          {' '}<a href="https://github.com/oumarmaiil-oss/glucodyssee/blob/main/CONTRIBUTING.md" target="_blank" rel="noopener noreferrer" className="underline decoration-dotted hover:text-txt">Contribuer</a>
        </p>
        <p><button onClick={() => setSource('tout')} className="underline decoration-dotted hover:text-txt">Sources des chiffres ({SOURCES.length} références vérifiables)</button></p>
    </>
  );

  const segVues = (cls: string) => (
    <div className={`seg ${cls}`} role="group" aria-label="Vue">
      <button className={vue === 'corps' ? 'actif' : ''} onClick={() => vueManuelle('corps')}>Corps</button>
      <button className={vue === 'ilot' || vue === 'ilot3d' ? 'actif' : ''} onClick={() => vueManuelle(modeIlot)} title="L'îlot de Langerhans en 2D et en 3D">Îlot</button>
      <button className={vue === 'cellule' ? 'actif' : ''} onClick={() => vueManuelle('cellule')}>Cellule</button>
      <button className={vue === 'rein' ? 'actif' : ''} onClick={() => vueManuelle('rein')}>Rein</button>
      <button className={vue === 'courbe' ? 'actif' : ''} onClick={() => vueManuelle('courbe')}>Courbes</button>
      <button className={vue === 'vaisseau' ? 'actif' : ''} onClick={() => vueManuelle('vaisseau')} title="Les petits vaisseaux : rétine, rein, nerf"><span className="lg:hidden">Vaiss.</span><span className="hidden lg:inline">Vaisseaux</span></button>
    </div>
  );

  return (
    <div className="h-[100dvh] lg:h-auto lg:min-h-full flex flex-col overflow-hidden lg:overflow-visible">
      <header className="sticky top-0 z-30 bg-ink/90 backdrop-blur border-b border-line">
        <div className="max-w-[1600px] mx-auto px-3 sm:px-5 h-12 lg:h-14 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-miel to-[#9a5b06] grid place-items-center shadow-[0_0_18px_rgba(245,165,36,.45)] text-ink"><Droplet size={16} /></span>
            <div className="leading-tight min-w-0">
              <div className="font-display text-[17px] sm:text-[19px] font-bold flex items-center gap-1.5">Glucodyssée <span title="Version bêta : vos retours sont les bienvenus (bouton Contact)" className="max-[379px]:hidden font-sans text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/40 rounded px-1 py-px leading-none">Bêta</span></div>
              <div className="text-[10.5px] text-dim hidden md:block">Le voyage du sucre, du repas aux organes</div>
            </div>
          </div>
          <div className="seg ml-auto hidden lg:inline-flex" role="group" aria-label="Niveau">
            {NIVEAUX.map((x) => <button key={x.n} className={niveau === x.n ? 'actif' : ''} onClick={() => choisirNiveau(x.n)}>{x.nom}</button>)}
          </div>
          {segVues('hidden lg:inline-flex')}
          <span className="ml-auto lg:ml-0" />
          {installer && <button onClick={() => { void installer.prompt(); setInstaller(null); }} className="btn-icone actif" title="Installer l'application" aria-label="Installer l'application"><Download size={16} /></button>}
          <button onClick={reinitialiser} className="btn-icone lg:!w-auto lg:px-2.5 lg:gap-1.5 lg:!flex lg:items-center lg:text-[12.5px] lg:font-semibold" title="Tout réinitialiser : revenir à l'état de départ" aria-label="Tout réinitialiser"><RefreshCcw size={16} /><span className="hidden lg:inline">Réinitialiser</span></button>
          <button onClick={() => void partagerApp()} className="btn-icone" title="Partager l'application" aria-label="Partager l'application"><Share2 size={16} /></button>
          <button onClick={() => setSoutien(true)} className="btn-icone !hidden lg:!grid text-miel" title="Soutenir Glucodyssée (Wave, Orange Money)" aria-label="Soutenir Glucodyssée"><Heart size={16} /></button>
          <button onClick={() => setSignaler(true)} className="h-[34px] rounded-[10px] px-2.5 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#25d366] border border-[#25d366]/40 bg-[#25d366]/10 active:scale-95 transition-transform touch-manipulation" title="Contacter l'auteur, signaler un problème ou suggérer" aria-label="Contacter ou signaler"><IconeContact size={16} /> Contact</button>
        </div>
        <div className="lg:hidden px-2 pb-1.5 grid sm:grid-cols-2 gap-1.5">
          <div className="seg w-full justify-between">{NIVEAUX.map((x) => <button key={x.n} className={`flex-1 ${niveau === x.n ? 'actif' : ''}`} onClick={() => choisirNiveau(x.n)}>{x.nom}</button>)}</div>
          {segVues('w-full justify-between [&>button]:flex-1 [&>button]:!px-1.5')}
        </div>
      </header>

      <main className="flex-1 min-h-0 max-w-[1600px] w-full mx-auto p-2 sm:p-4 grid gap-2 lg:gap-3 grid-rows-[auto_minmax(0,1fr)] grid-cols-[minmax(0,1fr)] lg:grid-rows-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex flex-col gap-2 lg:gap-3 min-w-0">
          <div className={`${ramadanAt ? 'h-[70dvh]' : tour !== null || seq !== null || pres || lectLoc ? 'h-[50dvh]' : 'h-[36dvh]'} transition-[height] duration-300 min-h-[230px] lg:min-h-[480px] ${vueEvo && seq === null ? 'lg:h-[calc(100vh-246px)]' : 'lg:h-[calc(100vh-190px)]'}`}>
            <Stage key={cleScene} vue={vue} etat={etatScene} etatSans={etatSansScene} niveau={niveau} zone={zone} onZone={onZone} son={son} ralenti={ralenti} sonOn={sonOn} onSon={basculerSon} onRalenti={() => setRalenti((v) => !v)} legende={legende} onVue={vueManuelle}
              onVoyage={lancerVoyage} siteMicroPatho={pathoVue === 'retino' ? 'retine' : pathoVue === 'nephro' ? 'glomerule' : pathoVue === 'neuro' || pathoVue === 'pied' ? 'nerf' : null} onLectureLocale={setLectLoc} demandeSuivi={demandeSuivi} demandeAtelier={demandeAtelier} onAgir={agir} nbAjouts={collations.length + effortsPerso.length + injPerso.length} figer={minuteVoyage} bandeau={bandeauPatho}
              tourActif={tour !== null} site={site} onSite={setSite} allerA={allerA}
              lecture={tour && voyage && etapeVoyage && minuteVoyage !== null ? { titre: voyage.titre, texte: etapeVoyage.texte(etatScene.terrain, etatScene), detail: etapeVoyage.detail(etatScene, ((minuteVoyage % 1440) + 1440) % 1440, niveau), index: tour.i, total: voyage.etapes.length, pause: tourPause, voixDetail: true }
                : pres && etapePres ? { titre: PRESENTATION_PAR_ID[pres.id].titre, texte: etapePres.texte, detail: etapePres.detail?.(etatScene, etatSansScene), index: pres.i, total: PRESENTATION_PAR_ID[pres.id].etapes.length, pause: pres.pause, voixDetail: true }
                : seq !== null ? { titre: 'Effet du traitement', texte: PHASES[seq].nom, detail: `HbA1c ${etatScene.stats.hba1c.toFixed(1)} % · temps dans la cible ${Math.round(etatScene.stats.tir * 100)} % · risque microvasculaire ×${etatScene.risques.micro.toFixed(1)}`, index: seq, total: PHASES.length, pause: seqPause } : null}
              onLecture={(a) => {
                if (tour && voyage) {
                  if (a === 'pause') setTourPause((p) => !p);
                  else if (a === 'prev') setTour({ ...tour, i: Math.max(0, tour.i - 1) });
                  else if (a === 'next') setTour({ ...tour, i: Math.min(voyage.etapes.length - 1, tour.i + 1) });
                  else if (a === 'restart') { setTourPause(false); setTour({ ...tour, i: 0 }); }
                  else { setTour(null); setZone(null); }
                } else if (pres) {
                  const n = PRESENTATION_PAR_ID[pres.id].etapes.length;
                  if (a === 'pause') setPres({ ...pres, pause: !pres.pause });
                  else if (a === 'prev') setPres({ ...pres, i: Math.max(0, pres.i - 1) });
                  else if (a === 'next') setPres({ ...pres, i: Math.min(n - 1, pres.i + 1) });
                  else if (a === 'restart') setPres({ ...pres, i: 0, pause: false });
                  else arreterPresentation();
                } else if (seq !== null) {
                  if (a === 'pause') setSeqPause((p) => !p);
                  else if (a === 'prev') setSeq((k) => Math.max(0, (k ?? 0) - 1));
                  else if (a === 'next') setSeq((k) => Math.min(PHASES.length - 1, (k ?? 0) + 1));
                  else if (a === 'restart') { setSeqPause(false); setSeq(0); }
                  else { setSeq(null); setVueEvo(null); }
                }
              }}
              peutRetour={histo.length > 0} onRetour={retour}
              panneauBas={ramadanAt && bilanRamadan ? <PanneauRamadan at={ramadanAt} bilan={bilanRamadan} conforme={conformeRamadan} onRegler={reglerRamadan} onEtape={(i) => setRamadanAt({ ...ramadanAt, etape: i })} onFermer={fermerRamadan} /> : null} />
          </div>
          {vueEvo && seq === null && (
            <div className="rounded-xl border border-warn/40 bg-warn/8 px-2.5 py-1.5 text-[12.5px] flex flex-wrap items-center gap-2">
              <TrendingUp size={15} className="text-warn shrink-0" />
              <span>Au bout de <b>{vueEvo.an < 1 ? `${Math.round(vueEvo.an * 12)} mois` : `${String(vueEvo.an).replace('.', ',')} an${vueEvo.an >= 2 ? 's' : ''}`}</b> :</span>
              <div className="seg">
                {(['sans', 'avec', 'arret'] as const).filter((k) => k === 'sans' || Object.keys(traitement).length).map((k) => (
                  <button key={k} className={vueEvo.scenario === k ? 'actif' : ''} onClick={() => setVueEvo({ ...vueEvo, scenario: k })}>{k === 'sans' ? 'Sans traitement' : k === 'avec' ? 'Avec' : 'Arrêté'}</button>
                ))}
              </div>
              <button onClick={() => setVueEvo(null)} className="ml-auto text-xs font-semibold text-txt">Revenir à aujourd'hui</button>
            </div>
          )}
          <Moniteur e={etatScene} niveau={niveau} ref0={Object.keys(traitement).length && (!vueEvo || vueEvo.scenario !== 'sans') ? etatSansScene : null} />
        </section>

        <aside className="min-w-0 min-h-0 lg:h-[calc(100vh-88px)] lg:sticky lg:top-[68px] flex flex-col rounded-2xl border border-line bg-panel overflow-hidden">
          <nav className="grid grid-cols-3 gap-1 p-1.5 border-b border-line" role="tablist">
            {ONGLETS.map((o) => (
              <button key={o.id} role="tab" aria-selected={onglet === o.id} onClick={() => setOnglet(o.id)}
                className={`relative rounded-xl py-2 text-[11.5px] sm:text-[12px] font-semibold flex flex-row sm:flex-col items-center justify-center gap-1 sm:gap-0.5 ${onglet === o.id ? 'bg-card2 text-white' : 'text-muted hover:text-txt'}`}>
                <o.icone size={16} className="shrink-0" /><span className="truncate">{o.nom}</span>
                {o.badge && <span className="absolute top-1 right-2 min-w-[17px] h-[17px] rounded-full bg-miel text-ink text-[10px] font-bold grid place-items-center px-1">{o.badge}</span>}
              </button>
            ))}
          </nav>
          <BandeauInstaller onOuvrir={() => setAideInstall(true)} />
          {(actives.length > 0 || Object.keys(traitement).length > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-line bg-miel/8 text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-miel shrink-0" />
              <span className="flex-1 min-w-0 truncate text-muted">
                {actives.length > 0 && <><b className="text-txt">{actives.length}</b> maladie{actives.length > 1 ? 's' : ''}</>}
                {actives.length > 0 && Object.keys(traitement).length > 0 && ' · '}
                {Object.keys(traitement).length > 0 && <><b className="text-txt">{Object.keys(traitement).length}</b> traitement{Object.keys(traitement).length > 1 ? 's' : ''}</>}
                {' '}appliqué{actives.length + Object.keys(traitement).length > 1 ? 's' : ''}
              </span>
              <button onClick={toutRetirer} className="shrink-0 rounded-lg border border-miel/50 bg-miel/15 text-white font-semibold px-2.5 py-1 inline-flex items-center gap-1 active:scale-95 transition-transform touch-manipulation" aria-label="Retirer toutes les maladies et tous les traitements"><X size={13} /> Tout retirer</button>
            </div>
          )}
          <div className="relative flex-1 min-h-0 flex flex-col">
          <div ref={panneau} className="flex-1 overflow-y-auto scroll-thin p-3.5 pr-5 lg:pr-3.5" data-testid="panneau">
            {onglet === 'explorer' && <PanneauExplorer zone={zone} niveau={niveau} vue={vue} actives={actives} onVoyage={lancerVoyage} onSource={setSource} onAtelier={() => { if (ramadanAt) fermerRamadan(); setTour(null); setPres(null); setSeq(null); setSite('muscle'); vueManuelle('cellule'); setDemandeAtelier((n) => n + 1); }} onSuivre={(type) => { if (ramadanAt) fermerRamadan(); setTour(null); setPres(null); setSeq(null); setDemandeSuivi({ type, n: Date.now() }); }} onRamadan={ouvrirRamadan} onVoirVue={(z, v, st) => { onZone(z); if (st) setSite(st); vueManuelle(v === 'ilot' ? modeIlot : v); }} repas={repas} onRepas={setRepas} onZone={onZone} onTogglePatho={togglePatho} onVue={vueManuelle} onVoirPatho={(id) => { setFocusPatho(id); }} />}
            {onglet === 'maladies' && <PanneauMaladies niveau={niveau} vue={vue} zone={zone} actives={actives} focus={focusPatho} traitement={traitement} terrain={terrain} etat={etatAuj} etatSans={etatSans}
              onSource={setSource} onFocus={setFocusPatho} onToggle={togglePatho} onDose={onDose} onRemplacer={setTraitement} onSequence={lancerSequence} onComparer={comparer} onResucrage={resucrer}
              onVoir={(v) => { setTour(null); setSeq(null); const sp = focusPatho ? VUES_PATHO[focusPatho]?.site : undefined; if (v === 'cellule' && sp) setSite(sp); vueManuelle(v === 'ilot' ? modeIlot : v); }}
              onPresentation={lancerPresentation}
              onRamadan={ouvrirRamadan}
              onCas={(a, t, z) => { setPres(null); setSeq(null); setTour(null); setActives(a); setTraitement(t); setVueEvo(null); setZone(z); setCollations([]); }}
              onSeverite={(id, s) => setActives((a) => a.map((x) => (x.id === id ? { ...x, s } : x)))}
              onScenario={(a) => { setActives(a); setTraitement({}); setVueEvo(null); setFocusPatho(null); setCollations([]); if (a[0] && ZONE_LESION[a[0].id]) setZone(ZONE_LESION[a[0].id]); }} />}
            {onglet === 'evolution' && <PanneauEvolution terrain={terrain} traitement={traitement} vueEvo={vueEvo} onVueEvo={setVueEvo} onAllerTraitements={() => setOnglet('maladies')} />}
            <footer className="lg:hidden mt-6 pt-3 border-t border-line text-center text-[11px] text-dim space-y-1">{signature}</footer>
          </div>
          <AidesDefilement cible={panneau} cle={onglet} />
          </div>
          {onglet === 'explorer' && focusPatho && (
            <button onClick={() => setOnglet('maladies')} className="m-2 mt-0 rounded-xl bg-card2 border border-line py-2 text-[13px] font-semibold">Ouvrir la fiche : {PATHO_PAR_ID[focusPatho].nom} →</button>
          )}
        </aside>
      </main>

      <footer className="hidden lg:block text-center text-[11px] text-dim pb-4 pt-1 px-4 space-y-1">{signature}</footer>

      {accueil && <Accueil onChoix={choisirNiveau} onDemo={() => { choisirNiveau(1); setOnglet('maladies'); lancerPresentation('voyage'); }} />}
      {soutien && <Soutien onClose={() => setSoutien(false)} />}
      {signaler && <Signalement onClose={() => setSignaler(false)} onSoutien={() => { setSignaler(false); setSoutien(true); }} contexte={[
        `Version : ${__VERSION__}`, `Vue : ${vue} · niveau ${niveau}${zone ? ` · zone ${zone}` : ''}`,
        `Maladies : ${actives.map((a) => `${PATHO_PAR_ID[a.id].court} (${a.s})`).join(', ') || 'aucune'}`,
        `Traitement : ${Object.entries(traitement).map(([c, d]) => `${CLASSE_PAR_ID[c as ClasseId].court} ×${d}`).join(', ') || 'aucun'}`,
        `Réveil ${(etatScene.stats.aJeun / 100).toFixed(2)} g/L · HbA1c ${etatScene.stats.hba1c.toFixed(1)} % · cible ${Math.round(etatScene.stats.tir * 100)} %`,
        `Appareil : ${navigator.userAgent}`, `Écran : ${window.innerWidth}×${window.innerHeight}`,
      ].join('\n')} />}
      {source && <FenetreSources id={source} onClose={() => setSource(null)} />}
      {aideInstall && <FenetreInstaller invite={installer} onInstalle={() => setInstaller(null)} onClose={() => setAideInstall(false)} />}
      {annulation && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-24px)] rounded-2xl border border-line bg-panel shadow-2xl px-3.5 py-2.5 flex items-center gap-3 text-[13px] sm:text-sm fade-in" role="status">
          <RefreshCcw size={15} className="text-accent shrink-0" /> <span className="min-w-0 leading-snug">{annulation.message}</span>
          <button onClick={annuler} className="shrink-0 rounded-lg bg-card2 border border-line font-semibold px-3 py-1">Annuler</button>
        </div>
      )}
      {maj && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-max max-w-[calc(100vw-24px)] rounded-2xl border border-accent/40 bg-panel shadow-2xl px-4 py-3 flex items-center gap-3 text-sm fade-in">
          <RefreshCw size={16} className="text-accent" /> Nouvelle version de Glucodyssée installée.
          <button onClick={() => location.reload()} className="rounded-lg bg-accent text-ink font-bold px-3 py-1">Recharger</button>
          <button onClick={() => setMaj(false)} className="text-muted" aria-label="Plus tard"><X size={15} /></button>
        </div>
      )}
    </div>
  );
}

function Accueil({ onChoix, onDemo }: { onChoix: (n: Niveau) => void; onDemo: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/85 backdrop-blur-sm grid place-items-center p-4 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Bienvenue">
      <div className="max-w-2xl w-full rounded-3xl border border-line bg-panel p-6 sm:p-8 fade-in">
        <div className="text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-miel to-[#9a5b06] grid place-items-center shadow-[0_0_30px_rgba(245,165,36,.5)] text-ink"><Droplet size={28} /></div>
          <h1 className="font-display text-3xl sm:text-4xl mt-4">Glucodyssée</h1>
          <p className="text-muted mt-2">Suivez le sucre du repas jusqu'aux cellules, déréglez la machine avec un diabète, puis voyez ce que chaque traitement change, aujourd'hui et dans 10 ans.</p>
        </div>
        <button onClick={onDemo} className="mt-6 w-full rounded-2xl bg-miel hover:brightness-110 text-ink font-bold py-3.5 inline-flex items-center justify-center gap-2 shadow-[0_6px_24px_rgba(245,165,36,.4)]">
          <Play size={16} fill="currentColor" /> Première visite ? Regardez la démo (1 min)
        </button>
        <p className="text-[12px] text-muted text-center mt-4">ou choisissez votre niveau :</p>
        <div className="mt-2 grid sm:grid-cols-3 gap-3">
          {NIVEAUX.map((x) => (
            <button key={x.n} onClick={() => onChoix(x.n)} className="text-left carte p-4 hover:border-miel/60 hover:bg-card2 transition">
              <x.icone size={22} className="text-miel" />
              <div className="font-bold mt-2">{x.nom}</div>
              <div className="text-[12.5px] text-muted mt-1 leading-snug">{x.pour}</div>
            </button>
          ))}
        </div>
        <p className="text-[11.5px] text-dim text-center mt-5">Vous pourrez changer de niveau à tout moment, en haut de l'écran.</p>
      </div>
    </div>
  );
}
