/** Scène principale : corps, îlot (2D/3D), cellule, rein ou courbes, animés par l'horloge de la journée. */
import { useEffect, useRef, useState } from 'react';
import { apresDelaiEtVoix, choisirVoix, textePrononcable } from '../core/voix.ts';
import { Activity, Camera, Pause, Speech, Play, RotateCcw, RotateCw, SkipBack, SkipForward, Snail, Square, Tag, Volume2, VolumeX, Maximize2, Minimize2, Video, X, ZoomIn, ZoomOut } from 'lucide-react';
import { fmtHeure, Horloge, instantA } from '../core/clock.ts';
import type { Son } from '../core/audio.ts';
import type { Etat, Niveau } from '../core/types.ts';
import { ZONES, type ZoneId } from '../content/zones.ts';
import type { Rendu } from '../render/scene2d.ts';
import { creerCorps2D, type Journal, type Molecule } from '../render/corps2d.ts';
import { creerIlot2D } from '../render/ilot2d.ts';
import { creerCellule2D, type ReglageAtelier, type StatsAtelier } from '../render/cellule2d.ts';
import { ETAPES_ATELIER, NIVEAUX_INSULINE } from '../content/atelier.ts';
import { creerRein2D } from '../render/rein2d.ts';
import { creerCourbe2D } from '../render/courbe2d.ts';
import { creerVaisseau2D, ETAPES_MICRO, SITES_MICRO, type SiteMicro } from '../render/vaisseau2d.ts';
import { creerTraces, type ModeTraces, type Traces } from '../render/traces.ts';
import { VOYAGES, type Voyage } from '../content/voyages.ts';
import { Candy, Cookie, Footprints, Hand, Syringe, Trash2, Route, Utensils } from 'lucide-react';

export type Vue = 'corps' | 'ilot' | 'ilot3d' | 'cellule' | 'rein' | 'courbe' | 'vaisseau';
export type SiteCellule = 'muscle' | 'foie';

/** Où chaque zone est visible. Sert à proposer la bonne vue au lieu de changer de vue tout seul. */
const ZONES_VUE: Record<Vue, ZoneId[]> = {
  corps: ['estomac', 'intestin', 'veinePorte', 'foie', 'sang', 'pancreas', 'muscles', 'graisse', 'cerveau', 'reins', 'globules', 'yeux', 'nerfs', 'pieds', 'coeur'],
  ilot: ['ilot', 'pancreas'],
  ilot3d: ['ilot', 'pancreas'],
  cellule: ['muscles', 'foie', 'graisse', 'sang'],
  rein: ['reins'],
  courbe: ['sang', 'globules'],
  vaisseau: ['yeux', 'reins', 'nerfs', 'pieds'],
};
export const zoneDansVue = (z: ZoneId, v: Vue) => ZONES_VUE[v].includes(z);
export const NOMS_VUES: Record<Vue, string> = { corps: 'Corps', ilot: 'Îlot 2D', ilot3d: 'Îlot 3D', cellule: 'Cellule', rein: 'Rein', courbe: 'Courbes', vaisseau: 'Petits vaisseaux' };
/** Meilleure vue pour une zone. */
export const vuePour = (z: ZoneId): Vue => (z === 'ilot' ? 'ilot' : 'corps');
export const SITES_CELLULE: { id: SiteCellule; nom: string }[] = [{ id: 'muscle', nom: 'Muscle' }, { id: 'foie', nom: 'Foie' }];

const leger = typeof navigator !== 'undefined' && (
  (navigator.hardwareConcurrency ?? 8) <= 4
  || /[?&]leger/.test(location.search)
  || (typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 900)
) && !/[?&]complet/.test(location.search);

interface Props {
  vue: Vue;
  etat: Etat;
  etatSans: Etat;
  niveau: Niveau;
  zone: ZoneId | null;
  onZone: (z: ZoneId | null) => void;
  son: Son;
  ralenti: boolean;
  sonOn: boolean;
  onSon: () => void;
  onRalenti: () => void;
  legende: string;
  onVue: (v: Vue) => void;
  onVoyage: (id: Voyage['id']) => void;
  /** Agir en direct à l'heure affichée. */
  onAgir: (a: 'sucre' | 'collation' | 'repas' | 'marche' | 'insuline' | 'effacer', minute: number) => void;
  nbAjouts: number;
  /** Demande de suivre une molécule (depuis le panneau). */
  demandeSuivi?: { type: Molecule; n: number } | null;
  /** Demande d'ouvrir l'atelier « La clé et la porte ». */
  demandeAtelier?: number;
  /** Minute imposée par un voyage guidé : l'horloge s'y fige (null = la journée défile). */
  figer: number | null;
  /** Ce que la maladie ouverte montre dans cette vue. */
  bandeau: string | null;
  /** Site des petits vaisseaux le plus parlant pour la maladie ouverte. */
  siteMicroPatho?: SiteMicro | null;
  /** Signale qu'une démonstration propre à la scène est en cours. */
  onLectureLocale?: (on: boolean) => void;
  tourActif: boolean;
  /** Lecture en cours (voyage du sucre, présentation, effet du traitement dans le temps). */
  lecture: Lecture | null;
  onLecture: (a: 'prev' | 'next' | 'pause' | 'restart' | 'stop') => void;
  site: SiteCellule;
  onSite: (s: SiteCellule) => void;
  /** Demande de placer l'horloge à une heure précise (minute), avec un compteur pour la répéter. */
  allerA?: { minute: number; n: number } | null;
  peutRetour: boolean;
  onRetour: () => void;
}

export interface Lecture { titre: string; texte: string; detail?: string; index: number; total: number; pause: boolean; /** La voix off lit aussi l'explication. */ voixDetail?: boolean }

export function Stage({ vue, etat, etatSans, niveau, zone, onZone, son, ralenti, sonOn, onSon, onRalenti, legende, onVue, onVoyage, onAgir, nbAjouts, demandeSuivi, demandeAtelier = 0, figer, bandeau, siteMicroPatho, onLectureLocale, tourActif, lecture: lectureApp, onLecture: onLectureApp, site, onSite, allerA, peutRetour, onRetour }: Props) {
  const hote = useRef<HTMLDivElement>(null);
  const rendu = useRef<Rendu | null>(null);
  const petitEcran = typeof window !== 'undefined' && window.innerWidth < 700;
  const [traces, setTraces] = useState<ModeTraces>(() => (petitEcran || niveau === 1 ? 'aucun' : 'glycemie'));
  const avecTraces = vue !== 'courbe';
  const cvTraces = useRef<HTMLCanvasElement>(null);
  const moteurTraces = useRef<Traces | null>(null);
  const horloge = useRef(new Horloge());
  const etatRef = useRef(etat);
  const capteurRef = useRef<HTMLSpanElement>(null);
  const pastilleRef = useRef<HTMLSpanElement>(null);
  const [survol, setSurvol] = useState<ZoneId | null>(null);
  useEffect(() => { setSurvol(null); }, [vue]);
  const [pret, setPret] = useState(false);
  const [erreur3D, setErreur3D] = useState(false);
  const [etiquettes, setEtiquettes] = useState(niveau === 1 && !petitEcran);
  const [pauseJour, setPauseJour] = useState(false);
  const visible = useRef(true);
  const captureRef = useRef<((src: HTMLCanvasElement) => void) | null>(null);
  const legendeRef = useRef(legende);
  legendeRef.current = legende;
  const [enreg, setEnreg] = useState<{ debut: number; son: boolean } | null>(null);
  const [capture, setCapture] = useState(false);
  const [pleinEcran, setPleinEcran] = useState(false);
  useEffect(() => {
    if (!pleinEcran) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setPleinEcran(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [pleinEcran]);
  const [fichier, setFichier] = useState<{ blob: Blob; nom: string; video: boolean } | null>(null);
  const tactile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  const [duree, setDuree] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const onZoneRef = useRef(onZone);
  useEffect(() => {
    const io = new IntersectionObserver(([en]) => { visible.current = en.isIntersecting; });
    if (hote.current) io.observe(hote.current);
    return () => io.disconnect();
  }, []);
  onZoneRef.current = onZone;

  etatRef.current = etat;
  useEffect(() => { rendu.current?.maj(etat, etatSans); }, [etat, etatSans]);
  useEffect(() => { horloge.current.vitesse = ralenti ? 0.35 : 1; }, [ralenti]);
  const [menuVoyages, setMenuVoyages] = useState(false);
  const [menuAgir, setMenuAgir] = useState(false);
  // Suivre une molécule (vue Corps) : la caméra la suit, le journal raconte chaque étape et sa raison.
  const [suivi, setSuivi] = useState<Journal | null>(null);
  const [attenteSuivi, setAttenteSuivi] = useState<Molecule | null>(null);
  const lancerSuivi = (type: Molecule) => { setMenuVoyages(false); if (vue !== 'corps') onVue('corps'); setAttenteSuivi(type); };
  useEffect(() => { if (demandeSuivi) lancerSuivi(demandeSuivi.type); }, [demandeSuivi?.n]);
  useEffect(() => {
    const r = rendu.current as { suivre?: (t: Molecule | null, cb?: (j: Journal) => void) => void } | null;
    if (!attenteSuivi || !pret || vue !== 'corps' || !r?.suivre) return;
    setSuivi({ type: attenteSuivi, lignes: [], fini: false });
    r.suivre(attenteSuivi, (j) => setSuivi(j));
    setAttenteSuivi(null);
  }, [attenteSuivi, pret, vue]);
  useEffect(() => { if (vue !== 'corps') setSuivi(null); }, [vue]);
  const arreterSuivi = () => { (rendu.current as { suivre?: (t: null) => void } | null)?.suivre?.(null); setSuivi(null); };
  const journalRef = useRef<HTMLOListElement>(null);
  useEffect(() => { journalRef.current?.scrollTo({ top: 1e6, behavior: 'smooth' }); }, [suivi?.lignes.length]);
  // Bilan du sucre dans le sang (vue Corps), mis à jour 4 fois par seconde.
  const [bilan, setBilan] = useState<{ ra: number; foie: number; cer: number; mus: number; eff: number; uri: number; dG: number } | null>(null);
  const vueRef = useRef(vue); vueRef.current = vue;
  // Atelier « La clé et la porte » (vue Cellule, muscle).
  const [atelier, setAtelier] = useState<{ etape: number; r: ReglageAtelier } | null>(null);
  const [statsAt, setStatsAt] = useState<StatsAtelier | null>(null);
  useEffect(() => {
    const r = rendu.current as { setAtelier?: (x: ReglageAtelier | null, cb?: (s: StatsAtelier) => void) => void } | null;
    if (!pret || vue !== 'cellule' || !r?.setAtelier) return;
    r.setAtelier(atelier ? atelier.r : null, setStatsAt);
  }, [atelier?.r, pret, vue]);
  useEffect(() => { if (vue !== 'cellule' || site !== 'muscle') setAtelier(null); }, [vue, site]);
  const ouvrirAtelier = () => { if (site !== 'muscle') onSite('muscle'); setStatsAt(null); setAtelier({ etape: 0, r: { ins: 0, res: false, effort: false } }); };
  const atelierEnAttente = useRef(0);
  useEffect(() => { if (demandeAtelier > atelierEnAttente.current && vue === 'cellule' && pret) { atelierEnAttente.current = demandeAtelier; ouvrirAtelier(); } }, [demandeAtelier, vue, pret]);
  const regler = (x: Partial<ReglageAtelier>) => setAtelier((a) => (a ? { ...a, r: { ...a.r, ...x } } : a));
  const etapeAt = atelier ? ETAPES_ATELIER[atelier.etape] : null;
  const reussiAt = !!(atelier && etapeAt && etapeAt.reussi(atelier.r, statsAt));
  useEffect(() => {
    if (figer !== null) { horloge.current.aller(figer); horloge.current.pause = true; }
    else horloge.current.pause = pauseJour || (!!suivi && !suivi.fini);
  }, [pauseJour, figer, suivi?.fini, !!suivi]);
  // Petits vaisseaux : site (rétine, rein, nerf) et démonstration des étapes de la microangiopathie.
  const [siteMicro, setSiteMicro] = useState<SiteMicro>('retine');
  useEffect(() => { if (zone === 'yeux') setSiteMicro('retine'); else if (zone === 'reins') setSiteMicro('glomerule'); else if (zone === 'nerfs' || zone === 'pieds') setSiteMicro('nerf'); }, [zone]);
  useEffect(() => { if (siteMicroPatho) setSiteMicro(siteMicroPatho); }, [siteMicroPatho]);
  const [micro, setMicro] = useState<{ i: number; pause: boolean } | null>(null);
  useEffect(() => {
    if (!micro || micro.pause || micro.i >= ETAPES_MICRO.length - 1) return;
    return apresDelaiEtVoix(5600, () => setMicro((m) => (m ? { ...m, i: m.i + 1 } : m)));
  }, [micro]);
  useEffect(() => { if (vue !== 'vaisseau') setMicro(null); }, [vue]);
  useEffect(() => { if (lectureApp) setMicro(null); }, [lectureApp]);
  useEffect(() => { onLectureLocale?.(!!micro); }, [!!micro]);
  const lecture: Lecture | null = lectureApp ?? (micro ? { titre: 'Les petits vaisseaux', texte: `${ETAPES_MICRO[micro.i].titre} : ${ETAPES_MICRO[micro.i].texte}`, detail: ETAPES_MICRO[micro.i].detail, index: micro.i, total: ETAPES_MICRO.length, pause: micro.pause, voixDetail: true } : null);
  const onLecture = (a: 'prev' | 'next' | 'pause' | 'restart' | 'stop') => {
    if (lectureApp || !micro) { onLectureApp(a); return; }
    if (a === 'prev') setMicro({ ...micro, i: Math.max(0, micro.i - 1) });
    else if (a === 'next') setMicro({ ...micro, i: Math.min(ETAPES_MICRO.length - 1, micro.i + 1) });
    else if (a === 'pause') setMicro({ ...micro, pause: !micro.pause });
    else if (a === 'restart') setMicro({ i: 0, pause: false });
    else setMicro(null);
  };
  useEffect(() => { if (allerA) horloge.current.aller(allerA.minute); }, [allerA?.n]);
  useEffect(() => { setEtiquettes(niveau === 1 && !petitEcran); }, [niveau]);

  // Création du rendu (3D chargée à la demande).
  useEffect(() => {
    const el = hote.current!;
    let annule = false;
    setPret(false); setErreur3D(false);
    const opts = { onPick: (z: ZoneId | null) => onZoneRef.current(z), onHover: setSurvol, leger };
    const monter = (r: Rendu) => {
      if (annule) { r.dispose(); return; }
      rendu.current = r; r.maj(etatRef.current, etatSans); r.setSite?.(vue === 'vaisseau' ? siteMicro : site); setPret(true);
    };
    if (vue === 'ilot3d') import('../render/ilot3d.ts').then((m) => monter(m.creerIlot3D(el, opts))).catch(() => setErreur3D(true));
    else if (vue === 'ilot') monter(creerIlot2D(el, opts));
    else if (vue === 'cellule') monter(creerCellule2D(el, opts, site));
    else if (vue === 'rein') monter(creerRein2D(el, opts));
    else if (vue === 'courbe') monter(creerCourbe2D(el, opts));
    else if (vue === 'vaisseau') monter(creerVaisseau2D(el, opts));
    else monter(creerCorps2D(el, opts));
    return () => { annule = true; rendu.current?.dispose(); rendu.current = null; };
  }, [vue]);
  useEffect(() => { rendu.current?.setSite?.(vue === 'vaisseau' ? siteMicro : site); }, [site, siteMicro, pret]);
  useEffect(() => { const r = rendu.current as { setEtape?: (i: number | null) => void } | null; if (pret) r?.setEtape?.(micro ? micro.i : null); }, [micro, pret, vue]);

  // Boucle d'animation unique.
  useEffect(() => {
    let raf = 0, last = performance.now(), dernierTexte = '', tBilan = 0;
    let saut = 1, compteur = 0, cumulDt = 0, fenetre = 0, images = 0, retours = 0;
    const boucle = (now: number) => {
      const dtBrut = (now - last) / 1000; last = now;
      const dt = Math.min(0.05, dtBrut);
      if (visible.current && !captureRef.current && !document.hidden) {
        fenetre += dtBrut; images++;
        if (fenetre >= 2) {
          const fps = images / fenetre;
          if (saut === 1 && fps < 24) saut = 2;
          else if (saut === 2 && fps > 55 && retours < 2) { saut = 1; retours++; }
          fenetre = 0; images = 0;
        }
      }
      const minute = horloge.current.avancer(dt);
      const i = instantA(etatRef.current, minute);
      cumulDt += dt; compteur++;
      const dessiner = captureRef.current || compteur % saut === 0;
      if (dessiner && (visible.current || captureRef.current)) { rendu.current?.frame(i, Math.min(0.1, cumulDt)); cumulDt = 0; }
      if (visible.current) moteurTraces.current?.frame(i, dt, etatRef.current);
      if (captureRef.current) { const c = hote.current?.querySelector('canvas'); if (c) captureRef.current(c); }
      son.tick(i, dt);
      tBilan += dt;
      if (tBilan > 0.25 && vueRef.current === 'corps') { tBilan = 0; setBilan({ ra: i.Ra * 4.2, foie: i.PGE * 4.2, cer: i.Ucer * 4.2, mus: i.Uins * 4.2, eff: i.Ueff * 4.2, uri: i.Urein * 4.2, dG: i.dG }); }
      const fleche = i.dG > 15 ? '↗' : i.dG < -15 ? '↘' : '→';
      const texte = `${fmtHeure(i.heure)} · ${(i.G / 100).toFixed(2).replace('.', ',')} g/L ${fleche}`;
      if (texte !== dernierTexte && capteurRef.current) {
        dernierTexte = texte; capteurRef.current.textContent = texte;
        if (pastilleRef.current) pastilleRef.current.style.background = i.G < 70 ? '#fb7185' : i.G > 180 ? '#fbbf24' : '#34d399';
      }
      raf = requestAnimationFrame(boucle);
    };
    raf = requestAnimationFrame(boucle);
    return () => cancelAnimationFrame(raf);
  }, [son]);

  useEffect(() => { if (!pret) return; rendu.current?.selection(zone); rendu.current?.focus(zone); }, [zone, pret]);
  useEffect(() => { if (!pret) return; rendu.current?.setEtiquettes(etiquettes); }, [etiquettes, pret, vue]);
  useEffect(() => {
    if (!cvTraces.current) return;
    const t = creerTraces(cvTraces.current);
    moteurTraces.current = t;
    return () => { t.dispose(); moteurTraces.current = null; };
  }, [traces !== 'aucun' && avecTraces]);
  useEffect(() => { moteurTraces.current?.setMode(traces); }, [traces]);
  useEffect(() => { if (niveau === 1 && traces === 'tout') setTraces('glycemie'); }, [niveau, traces]);
  useEffect(() => { if (zone === 'foie') onSite('foie'); else if (zone === 'muscles' || zone === 'graisse') onSite('muscle'); }, [zone]);

  // Cadrage : les dessins 2D tiennent dans la partie de la scène que les boutons ne couvrent pas.
  const [tailleScene, setTailleScene] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = hote.current?.parentElement; if (!el) return;
    const ro = new ResizeObserver(() => setTailleScene({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const r = rendu.current;
    if (!pret || !r) return;
    const large = window.innerWidth >= 1024;
    const decalageHote = lecture && !large ? 92 : 0;
    const bande = traces === 'aucun' || !avecTraces ? 0 : (traces === 'tout' ? 96 : 52) * (tailleScene.h >= 420 ? 1 : 0.6);
    const basScene = Math.max(lecture ? 92 : 34, bande ? (lecture ? 74 : 40) + bande : 0);
    r.setMarges({ haut: 46, gauche: 46, droite: 10, bas: Math.max(8, basScene - decalageHote) });
  }, [pret, vue, traces, avecTraces, !!lecture, tailleScene]);

  // Astuce 3D : à chaque ouverture de l'îlot 3D, jusqu'au premier geste.
  const [astuce3D, setAstuce3D] = useState(true);
  const geste3D = () => { if (astuce3D && vue === 'ilot3d') setAstuce3D(false); };
  // Voix off.
  const voixDispo = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [voix, setVoix] = useState(() => { try { return localStorage.getItem('gluco.voix') === '1'; } catch { return false; } });
  useEffect(() => { try { localStorage.setItem('gluco.voix', voix ? '1' : '0'); } catch { /* stockage indisponible */ } }, [voix]);
  const texteLu = lecture && !lecture.pause ? [lecture.texte, lecture.voixDetail ? lecture.detail : null].filter(Boolean).join('. ') : null;
  const voixChoisie = useRef<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    if (!voixDispo) return;
    const maj = () => { voixChoisie.current = choisirVoix(speechSynthesis.getVoices()); };
    maj(); speechSynthesis.addEventListener?.('voiceschanged', maj);
    return () => speechSynthesis.removeEventListener?.('voiceschanged', maj);
  }, []);
  useEffect(() => {
    if (!voixDispo) return;
    speechSynthesis.cancel();
    if (!voix || !texteLu) return;
    const u = new SpeechSynthesisUtterance(textePrononcable(texteLu));
    const v = voixChoisie.current ?? choisirVoix(speechSynthesis.getVoices());
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'fr-FR';
    u.rate = 0.97; u.pitch = 1;
    const t = setTimeout(() => speechSynthesis.speak(u), 120);
    return () => clearTimeout(t);
  }, [voix, texteLu]);
  useEffect(() => () => { if (voixDispo) speechSynthesis.cancel(); }, []);
  void apresDelaiEtVoix;

  /** Compose une image : fond, scène, légende et signature discrète. */
  const composer = (src: HTMLCanvasElement, dst: HTMLCanvasElement) => {
    const g = dst.getContext('2d')!;
    const w = dst.width, h = dst.height;
    const fond = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    fond.addColorStop(0, '#2a2112'); fond.addColorStop(0.55, '#0b0f1c'); fond.addColorStop(1, '#070a12');
    g.fillStyle = fond; g.fillRect(0, 0, w, h);
    g.drawImage(src, 0, 0, w, h);
    const u = Math.max(12, Math.round(w / 90));
    g.font = `600 ${u}px "Plus Jakarta Sans", system-ui`; g.textBaseline = 'alphabetic';
    if (legendeRef.current) { g.fillStyle = 'rgba(7,10,18,.65)'; const tw = g.measureText(legendeRef.current).width; g.fillRect(u * 0.8, u * 0.8, tw + u * 1.2, u * 1.9); g.fillStyle = '#e9eef8'; g.fillText(legendeRef.current, u * 1.4, u * 2.1); }
    g.globalAlpha = 0.3; g.font = `500 ${Math.max(10, Math.round(u * 0.62))}px "Plus Jakarta Sans", system-ui`; g.textAlign = 'right';
    g.fillStyle = '#ffffff'; g.fillText('Glucodyssée · Dr O. Sow', w - u * 0.8, h - u * 0.7); g.textAlign = 'left'; g.globalAlpha = 1;
  };
  const nomFichier = (ext: string) => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `glucodyssee-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`; };
  const telecharger = (blob: Blob, nom: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 60000); };
  const peutPartager = (f: File) => { try { return !!navigator.canShare?.({ files: [f] }); } catch { return false; } };
  const partager = async () => {
    if (!fichier) return;
    const f = new File([fichier.blob], fichier.nom, { type: fichier.blob.type });
    try { await navigator.share({ files: [f], title: 'Glucodyssée' }); } catch { /* partage annulé */ }
  };
  const definir = (on: boolean) => {
    const w = hote.current?.clientWidth || 800;
    rendu.current?.setDefinition(on ? Math.min(2.5, Math.max(window.devicePixelRatio || 1, 1600 / w)) : null);
  };
  const photo = () => {
    definir(true);
    captureRef.current = (src) => {
      captureRef.current = null;
      setTimeout(() => definir(false), 0);
      const dst = document.createElement('canvas'); dst.width = src.width; dst.height = src.height;
      composer(src, dst);
      dst.toBlob((b) => { if (!b) return; if (tactile) setFichier({ blob: b, nom: nomFichier('png'), video: false }); else telecharger(b, nomFichier('png')); }, 'image/png');
    };
  };
  const video = () => {
    if (recorder.current) { recorder.current.stop(); return; }
    definir(true);
    const src = hote.current?.querySelector('canvas'); if (!src) return;
    const k = Math.min(1, 1920 / src.width);
    const dst = document.createElement('canvas'); dst.width = Math.round(src.width * k / 2) * 2; dst.height = Math.round(src.height * k / 2) * 2;
    const flux = dst.captureStream(30);
    const audio = son.flux();
    audio?.getAudioTracks().forEach((t) => flux.addTrack(t));
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1,mp4a.40.2', 'video/mp4;codecs=avc1,opus', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
    const type = types.find((t) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t));
    if (!type) { alert('L\'enregistrement vidéo n\'est pas pris en charge par ce navigateur.'); return; }
    const rec = new MediaRecorder(flux, { mimeType: type, videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 192_000 });
    const morceaux: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
    rec.onstop = () => {
      captureRef.current = null; recorder.current = null; setEnreg(null); definir(false);
      const blob = new Blob(morceaux, { type: type.split(';')[0] }), nom = nomFichier(type.includes('mp4') ? 'mp4' : 'webm');
      if (!blob.size) { alert('La vidéo est vide : la scène n\'a pas pu être filmée. Réessayez en laissant la scène visible.'); return; }
      setFichier({ blob, nom, video: true });
      if (!tactile) telecharger(blob, nom);
    };
    captureRef.current = (c) => composer(c, dst);
    rec.start(1000);
    recorder.current = rec;
    setEnreg({ debut: performance.now(), son: !!audio });
  };
  useEffect(() => {
    if (!enreg) return;
    const t = setInterval(() => {
      const s2 = (performance.now() - enreg.debut) / 1000; setDuree(s2);
      if (s2 >= 120) recorder.current?.stop();
    }, 250);
    return () => clearInterval(t);
  }, [enreg]);
  useEffect(() => () => recorder.current?.stop(), []);

  const nomSurvol = survol ? ZONES[survol].nom : null;
  const estIlot = vue === 'ilot' || vue === 'ilot3d';

  return (
    <div className={`${pleinEcran ? 'fixed inset-0 z-[45] rounded-none border-0' : 'relative w-full h-full rounded-2xl border border-line'} overflow-hidden bg-[radial-gradient(ellipse_at_50%_35%,#2a2112_0%,#0b0f1c_55%,#070a12_100%)]`} data-testid="scene">
      <div ref={hote} onPointerLeave={() => setSurvol(null)} onPointerDown={geste3D} onWheel={geste3D} className={`absolute inset-x-0 top-0 ${lecture ? 'bottom-[92px] lg:bottom-0' : 'bottom-0'}`} />
      {!pret && !erreur3D && <div className="absolute inset-0 grid place-items-center text-muted text-sm">Préparation de la scène…</div>}
      {erreur3D && <div className="absolute inset-0 grid place-items-center text-center p-6 text-muted text-sm">La 3D n'est pas disponible sur cet appareil.<br />Utilisez la vue 2D.</div>}

      {vue === 'ilot3d' && pret && astuce3D && !lecture && (
        <div className="absolute z-10 left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-1.5 fade-in" role="note">
          <svg viewBox="0 0 64 40" width="58" height="36" aria-hidden="true" className="drop-shadow-[0_2px_6px_rgba(0,0,0,.6)]">
            <path d="M10 20 a22 10 0 0 1 44 0" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="2.2" strokeDasharray="3 4" />
            <path d="M50 14 l5 6 l-7 2" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <g className="astuce-doigt"><circle cx="32" cy="27" r="6" fill="#fff" fillOpacity=".9" /><circle cx="32" cy="27" r="10" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" /></g>
          </svg>
          <div className="rounded-full bg-ink/85 border border-line px-3 py-1 text-[11.5px] sm:text-xs font-semibold text-txt whitespace-nowrap">
            <span className="pointer-coarse:inline hidden">Glissez pour faire tourner · pincez pour zoomer</span>
            <span className="pointer-coarse:hidden">Cliquez-glissez pour faire tourner · molette pour zoomer</span>
          </div>
        </div>
      )}
      {vue === 'ilot3d' && pret && !astuce3D && (
        <div className="absolute z-10 left-1/2 -translate-x-1/2 bottom-0.5 lg:bottom-14 pointer-events-none whitespace-nowrap rounded-full bg-ink/80 border border-accent/30 px-2 py-px lg:px-3 lg:py-1 text-[10px] sm:text-[10.5px] lg:text-[13px] font-semibold text-muted lg:text-txt inline-flex items-center gap-1" role="note">
          <RotateCw size={13} className="text-accent shrink-0" />
          <span className="pointer-coarse:inline hidden">Glissez pour faire tourner · pincez pour zoomer</span>
          <span className="pointer-coarse:hidden">Cliquez-glissez pour tourner · molette pour zoomer</span>
        </div>
      )}
      {estIlot && pret && (
        <div className="absolute z-10 right-2 top-12 lg:top-14 rounded-xl bg-ink/80 border border-line px-2.5 py-1.5 text-[11px] space-y-0.5 pointer-events-none">
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" /> Bêta : insuline</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#c084fc]" /> Alpha : glucagon</div>
          <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#a3acc0]" /> Delta</div>
        </div>
      )}

      {/* Son, ralenti, pause de la journée, zoom : colonne de gauche */}
      <div className="absolute z-20 left-2 top-12 lg:top-24 flex flex-col gap-1.5">
        <button onClick={onSon} className={`btn-icone !w-8 !h-8 ${sonOn ? 'actif' : ''}`} title={sonOn ? 'Couper les alarmes du capteur' : 'Activer les alarmes du capteur'} aria-label={sonOn ? 'Couper les alarmes du capteur' : 'Activer les alarmes du capteur'} aria-pressed={sonOn}>{sonOn ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
        <button onClick={onRalenti} className={`btn-icone !w-8 !h-8 ${ralenti ? 'actif' : ''}`} title="Ralenti" aria-label="Ralenti" aria-pressed={ralenti}><Snail size={15} /></button>
        <button onClick={() => setPauseJour((v) => !v)} className={`btn-icone !w-8 !h-8 ${pauseJour ? 'actif' : ''}`} title={pauseJour ? 'Reprendre la journée' : 'Arrêter l\'horloge'} aria-label={pauseJour ? 'Reprendre la journée' : 'Arrêter l\'horloge'} aria-pressed={pauseJour}>{pauseJour ? <Play size={14} /> : <Pause size={14} />}</button>
        {pret && (
          <div className="mt-1.5 flex flex-col rounded-[10px] border border-line bg-ink/80 overflow-hidden">
            <button onClick={() => { geste3D(); rendu.current?.zoomer(1.35); }} className="w-8 h-8 grid place-items-center text-muted hover:text-txt active:bg-card2 touch-manipulation" title="Zoomer" aria-label="Zoomer"><ZoomIn size={15} /></button>
            <div className="h-px bg-line" />
            <button onClick={() => { geste3D(); rendu.current?.zoomer(1 / 1.35); }} className="w-8 h-8 grid place-items-center text-muted hover:text-txt active:bg-card2 touch-manipulation" title="Dézoomer" aria-label="Dézoomer"><ZoomOut size={15} /></button>
          </div>
        )}
        <button onClick={() => setPleinEcran((v) => !v)} className={`btn-icone !w-8 !h-8 mt-1.5 !hidden lg:!grid ${pleinEcran ? 'actif' : ''}`} title={pleinEcran ? 'Quitter le plein écran' : 'Plein écran'} aria-label={pleinEcran ? 'Quitter le plein écran' : 'Plein écran'} aria-pressed={pleinEcran}>{pleinEcran ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>
      </div>
      <button onClick={() => setPleinEcran((v) => !v)} className={`lg:hidden absolute z-20 right-2 ${lecture ? 'top-12' : 'bottom-14'} btn-icone !w-8 !h-8 ${pleinEcran ? 'actif' : ''}`} title={pleinEcran ? 'Quitter le plein écran' : 'Plein écran'} aria-label={pleinEcran ? 'Quitter le plein écran' : 'Plein écran'} aria-pressed={pleinEcran}>{pleinEcran ? <Minimize2 size={15} /> : <Maximize2 size={15} />}</button>

      {/* Heure et glycémie de l'instant (comme la phase du cycle dans Hémodyssée) */}
      <div className={`absolute ${lecture ? 'bottom-[96px] lg:bottom-auto' : 'bottom-2.5'} left-2 lg:bottom-auto lg:top-14 lg:left-12 flex items-center gap-1.5 rounded-full bg-ink/80 border border-line px-2 py-0.5 text-[11px] lg:text-xs text-txt pointer-events-none num`}>
        <span ref={pastilleRef} className="w-2 h-2 rounded-full bg-ok" />
        <span ref={capteurRef}>—</span>
      </div>
      {fichier && (
        <div className="absolute z-30 left-1/2 -translate-x-1/2 bottom-3 w-[min(94%,420px)] rounded-2xl border border-ok/40 bg-ink/95 p-3 shadow-xl fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-semibold">{fichier.video ? 'Vidéo prête' : 'Image prête'} <span className="text-dim font-normal">· {(fichier.blob.size / 1e6).toFixed(1)} Mo{fichier.nom.endsWith('webm') ? ' · WebM' : ''}</span></div>
            <button onClick={() => setFichier(null)} className="btn-icone w-7 h-7" aria-label="Fermer"><X size={13} /></button>
          </div>
          <div className="flex gap-2 mt-2">
            {peutPartager(new File([fichier.blob], fichier.nom, { type: fichier.blob.type })) && <button onClick={partager} className="flex-1 rounded-lg bg-ok text-ink font-bold text-[13px] py-2">Partager</button>}
            <button onClick={() => telecharger(fichier.blob, fichier.nom)} className="flex-1 rounded-lg bg-card2 border border-line font-semibold text-[13px] py-2">{tactile ? 'Enregistrer' : 'Télécharger à nouveau'}</button>
          </div>
          {fichier.nom.endsWith('webm') && <p className="text-[11px] text-dim mt-1.5">Ce navigateur enregistre en WebM : pour WhatsApp, préférez Chrome récent ou Safari (MP4).</p>}
        </div>
      )}
      {enreg && (
        <div className="absolute top-12 left-12 flex items-center gap-2 rounded-full bg-alert/20 border border-alert/60 px-3 py-1 text-xs font-semibold">
          <span className="w-2.5 h-2.5 rounded-full bg-alert animate-pulse" /> Enregistrement {Math.floor(duree / 60)}:{String(Math.floor(duree % 60)).padStart(2, '0')} · {enreg.son ? 'avec son' : 'sans son'}
        </div>
      )}
      {zone && !zoneDansVue(zone, vue) && !nomSurvol && !lecture && (
        <div className="absolute top-12 lg:top-14 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-ink/90 border border-accent/40 px-3 py-1 text-xs z-10">
          <span className="text-muted">{ZONES[zone].nom} se voit dans la vue</span>
          <button onClick={() => onVue(vuePour(zone))} className="font-semibold text-accent">{NOMS_VUES[vuePour(zone)]} →</button>
        </div>
      )}
      {vue === 'cellule' && site === 'muscle' && pret && !lecture && !atelier && (
        <button onClick={ouvrirAtelier} className="absolute z-20 right-2 top-12 lg:top-14 rounded-full bg-[#38bdf8] hover:brightness-110 text-ink text-[12px] font-bold pl-2.5 pr-3.5 py-1.5 inline-flex items-center gap-1.5 shadow-[0_4px_18px_rgba(56,189,248,.4)]">
          <Play size={13} fill="currentColor" /> Atelier : la clé et la porte
        </button>
      )}
      {vue === 'vaisseau' && pret && !lecture && (
        <button onClick={() => setMicro({ i: 0, pause: false })} className="absolute z-20 right-2 top-12 lg:top-14 rounded-full bg-miel hover:brightness-110 text-ink text-[12px] font-bold pl-2.5 pr-3.5 py-1.5 inline-flex items-center gap-1.5 shadow-[0_4px_18px_rgba(245,165,36,.45)]">
          <Play size={13} fill="currentColor" /> Les étapes de l'atteinte
        </button>
      )}
      {bandeau && !lecture && !suivi && vue !== 'vaisseau' && vue !== 'courbe' && !nomSurvol && !(zone && !zoneDansVue(zone, vue)) && (
        <div className="absolute z-10 top-12 lg:top-14 left-1/2 -translate-x-1/2 w-[min(66%,460px)] rounded-xl bg-ink/88 border border-miel/40 px-3 py-1.5 text-[11.5px] sm:text-xs leading-snug text-txt pointer-events-none text-center">{bandeau}</div>
      )}
      {vue === 'corps' && pret && bilan && !suivi && (
        <div className="absolute z-10 right-2 top-12 lg:top-14 w-[196px] rounded-xl bg-ink/85 border border-line px-2.5 py-2 text-[11px] pointer-events-none hidden sm:block">
          <div className="font-semibold text-txt mb-1">Le glucose du sang, en g/heure</div>
          {([['Repas (intestin)', bilan.ra, 1], ['Foie', bilan.foie, 1], ['Cerveau', bilan.cer, -1], ['Muscles et graisse', bilan.mus, -1], ['Effort', bilan.eff, -1], ['Urines', bilan.uri, -1]] as const).filter(([, v, sens]) => v > 0.3 || sens === 1).map(([nom, v, sens]) => (
            <div key={nom} className="flex items-center gap-1.5 leading-tight py-px">
              <span className={`w-3 text-center font-bold ${sens > 0 ? 'text-miel' : 'text-muted'}`}>{sens > 0 ? '+' : '−'}</span>
              <span className="flex-1 text-muted truncate">{nom}</span>
              <span className={`num ${sens > 0 ? 'text-miel' : 'text-txt'}`}>{Math.round(v)}</span>
            </div>
          ))}
          {(() => { const ent = bilan.ra + bilan.foie, sor = bilan.cer + bilan.mus + bilan.eff + bilan.uri; const d = ent - sor; return (
            <div className={`mt-1 pt-1 border-t border-line font-semibold ${d > 3 ? 'text-warn' : d < -3 ? 'text-accent' : 'text-ok'}`}>{d > 3 ? `↗ Il entre plus qu'il ne sort : la glycémie monte` : d < -3 ? '↘ Il sort plus qu\'il n\'entre : la glycémie baisse' : '→ Entrées ≈ sorties : glycémie stable'}</div>
          ); })()}
          <div className="mt-1.5 pt-1 border-t border-line grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-dim">
            <span className="flex items-center gap-1"><svg width="10" height="10" viewBox="-5 -5 10 10"><polygon points="4.3,2.5 0,5 -4.3,2.5 -4.3,-2.5 0,-5 4.3,-2.5" fill="#f5b027" /></svg>Glucose</span>
            <span className="flex items-center gap-1"><svg width="12" height="10" viewBox="-6 -5 12 10"><circle cx="-3" cy="0" r="2.2" fill="none" stroke="#38bdf8" strokeWidth="1.6" /><path d="M-1 0H5M3.5 0V2.2" stroke="#38bdf8" strokeWidth="1.6" fill="none" /></svg>Insuline</span>
            <span className="flex items-center gap-1"><svg width="10" height="10" viewBox="-5 -5 10 10"><polygon points="0,-4.5 4,3.5 -4,3.5" fill="#c084fc" /></svg>Glucagon</span>
            <span className="flex items-center gap-1"><svg width="10" height="10" viewBox="-5 -5 10 10"><polygon points="0,-5 3.8,0 0,5 -3.8,0" fill="#f472b6" /></svg>GLP-1</span>
            <span className="col-span-2 flex items-center gap-1"><svg width="11" height="10" viewBox="-5.5 -5 11 10"><ellipse rx="5" ry="4" fill="#d9b98c" stroke="#8a6a3f" /></svg>Repas (amidon, avant digestion)</span>
          </div>
        </div>
      )}

      {nomSurvol && (
        <div className="absolute top-12 lg:top-14 left-1/2 -translate-x-1/2 rounded-full bg-ink/85 border border-line px-3 py-1 text-xs font-semibold pointer-events-none z-10">{nomSurvol} · cliquer pour zoomer</div>
      )}

      {/* Barre d'outils */}
      <div className="absolute z-20 top-2 left-2 right-2 flex gap-1 sm:gap-1.5 overflow-x-auto scroll-thin lg:justify-end lg:overflow-visible [&::-webkit-scrollbar]:hidden">
        {estIlot && (
          <div className="seg shrink-0">
            <button className={vue === 'ilot' ? 'actif' : ''} onClick={() => onVue('ilot')}>2D</button>
            <button className={vue === 'ilot3d' ? 'actif' : ''} onClick={() => onVue('ilot3d')} title="Îlot en 3D : faites-le tourner" aria-label="3D"><span className="inline-flex items-center gap-1">3D<RotateCw size={11} className="text-accent" /></span></button>
          </div>
        )}
        {vue === 'vaisseau' && (
          <div className="seg shrink-0">{SITES_MICRO.map((s) => <button key={s.id} className={siteMicro === s.id ? 'actif' : ''} onClick={() => setSiteMicro(s.id)}>{s.nom}</button>)}</div>
        )}
        {vue === 'cellule' && (
          <div className="seg shrink-0">{SITES_CELLULE.map((s) => <button key={s.id} className={site === s.id ? 'actif' : ''} onClick={() => onSite(s.id)}>{s.nom}</button>)}</div>
        )}
        {peutRetour && <button onClick={onRetour} className="btn-outil shrink-0" aria-label="Revenir à la zone précédente">← Retour</button>}
        {avecTraces && <button onClick={() => setTraces((m) => (m === 'aucun' ? 'glycemie' : m === 'glycemie' && niveau >= 2 ? 'tout' : 'aucun'))} className={`btn-outil shrink-0 ${traces !== 'aucun' ? 'actif' : ''}`} aria-label="Afficher le capteur de glucose"><Activity size={14} /> {traces === 'tout' ? 'Capteur + insuline' : 'Capteur'}</button>}
        {vue !== 'ilot3d' && <button onClick={() => setEtiquettes((v) => !v)} className={`btn-outil shrink-0 ${etiquettes ? 'actif' : ''}`} aria-label="Afficher les noms" title="Noms"><Tag size={14} /><span className="hidden sm:inline">Noms</span></button>}
        {!lecture && <button onClick={() => { setMenuAgir((v) => !v); setCapture(false); }} className={`btn-outil shrink-0 ${menuAgir ? 'actif' : ''}`} aria-label="Agir maintenant : manger, bouger" aria-expanded={menuAgir} title="Agir maintenant"><Hand size={14} /> Agir</button>}
        {enreg ? (
          <button onClick={video} className="btn-outil shrink-0 !text-white !bg-miel/85 !border-miel" aria-label="Arrêter l'enregistrement vidéo"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /><Square size={12} fill="currentColor" /> Stop</button>
        ) : (
          <button onClick={() => setCapture((v) => !v)} className={`btn-outil shrink-0 ${capture ? 'actif' : ''}`} aria-label="Capturer : photo ou vidéo" aria-expanded={capture} title="Capturer (photo ou vidéo)"><Camera size={14} /><span className="hidden sm:inline">Capturer</span></button>
        )}
        <button onClick={() => { onZone(null); rendu.current?.focus(null); }} className="btn-outil shrink-0" aria-label="Revenir à la vue d'ensemble" title="Tout voir"><RotateCcw size={14} /><span className="hidden sm:inline">Tout voir</span></button>
      </div>
      {menuAgir && !lecture && (
        <>
          <div className="absolute inset-0 z-20" onClick={() => setMenuAgir(false)} aria-hidden="true" />
          <div className="absolute z-30 top-12 right-2 lg:top-14 w-64 rounded-xl bg-ink/95 border border-line p-1.5 shadow-xl fade-in" role="menu" aria-label="Agir maintenant">
            <div className="px-2.5 pt-1 pb-1.5 text-[11px] text-dim">À l'heure affichée ({fmtHeure(horloge.current.minute / 60)}), puis la journée se recalcule :</div>
            {([['sucre', Candy, '15 g de sucre rapide', 'Le resucrage de la règle des 15'], ['collation', Cookie, 'Collation de 30 g', 'Un fruit, un morceau de pain'], ['repas', Utensils, 'Repas imprévu de 60 g', 'Sans insuline rapide en plus'], ['marche', Footprints, 'Marcher 30 minutes', 'Les muscles captent du sucre'], ['insuline', Syringe, 'Injecter 4 U d\'insuline rapide', 'Elle fait entrer le sucre dans les muscles']] as const).map(([id, Icone, nom, sous]) => (
              <button key={id} role="menuitem" onClick={() => { setMenuAgir(false); onAgir(id, horloge.current.minute); }} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card2 active:bg-card2">
                <span className="w-8 h-8 rounded-lg bg-miel/15 text-miel grid place-items-center shrink-0"><Icone size={16} /></span>
                <span><span className="block text-[13px] font-semibold">{nom}</span><span className="block text-[11px] text-dim">{sous}</span></span>
              </button>
            ))}
            {nbAjouts > 0 && <button role="menuitem" onClick={() => { setMenuAgir(false); onAgir('effacer', 0); }} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card2 text-muted"><Trash2 size={15} className="ml-2 mr-1.5" /> Retirer les {nbAjouts} ajout{nbAjouts > 1 ? 's' : ''} de la journée</button>}
          </div>
        </>
      )}
      {capture && !enreg && (
        <>
          <div className="absolute inset-0 z-20" onClick={() => setCapture(false)} aria-hidden="true" />
          <div className="absolute z-30 top-12 right-2 lg:top-14 w-56 rounded-xl bg-ink/95 border border-line p-1.5 shadow-xl fade-in" role="menu" aria-label="Capturer">
            <button role="menuitem" onClick={() => { setCapture(false); photo(); }} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card2 active:bg-card2">
              <span className="w-8 h-8 rounded-lg bg-accent/15 text-accent grid place-items-center shrink-0"><Camera size={16} /></span>
              <span><span className="block text-[13px] font-semibold">Photo</span><span className="block text-[11px] text-dim">Image de la scène, en haute définition</span></span>
            </button>
            <button role="menuitem" onClick={() => { setCapture(false); video(); }} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card2 active:bg-card2">
              <span className="w-8 h-8 rounded-lg bg-miel/15 text-miel grid place-items-center shrink-0"><Video size={16} /></span>
              <span><span className="block text-[13px] font-semibold">Vidéo</span><span className="block text-[11px] text-dim">Enregistrer l'animation (et le son s'il est activé)</span></span>
            </button>
          </div>
        </>
      )}

      {lecture ? (
        <div className="absolute z-20 bottom-2 left-1/2 -translate-x-1/2 w-[96%] max-w-lg rounded-2xl bg-ink/92 border border-miel/50 overflow-hidden fade-in" role="status" aria-live="polite">
          <div className="flex gap-0.5 p-0.5">
            {Array.from({ length: lecture.total }, (_, k) => (
              <div key={k} className="h-1 flex-1 rounded-full bg-card2 overflow-hidden"><div className={`h-full bg-miel ${k < lecture.index ? 'w-full' : k === lecture.index ? (lecture.pause ? 'w-1/2' : 'w-full transition-[width] duration-[4000ms] ease-linear') : 'w-0'}`} key={`${k}-${lecture.index}`} /></div>
            ))}
          </div>
          <div className="px-2.5 pb-1.5 pt-0.5 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full shrink-0 ${lecture.pause ? 'bg-muted' : 'bg-miel animate-pulse'}`} />
            <div className="min-w-0 flex-1">
              <div className="text-[9.5px] uppercase tracking-wider text-dim truncate">{lecture.pause ? 'En pause' : 'Lecture en cours'} · {lecture.titre} · {lecture.index + 1}/{lecture.total}</div>
              <div className="text-[12.5px] font-semibold leading-tight">{lecture.texte}</div>
              {lecture.detail && <div className="text-[11px] text-muted leading-tight mt-0.5 truncate sm:whitespace-normal">{lecture.detail}</div>}
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <button onClick={() => onLecture('prev')} disabled={lecture.index === 0} className="btn-icone w-8 h-8 disabled:opacity-35" aria-label="Étape précédente"><SkipBack size={14} /></button>
              <button onClick={() => onLecture('pause')} className="btn-icone w-8 h-8" aria-label={lecture.pause ? 'Reprendre' : 'Mettre en pause'}>{lecture.pause ? <Play size={14} fill="currentColor" /> : <Pause size={14} />}</button>
              <button onClick={() => onLecture('next')} disabled={lecture.index >= lecture.total - 1} className="btn-icone w-8 h-8 disabled:opacity-35" aria-label="Étape suivante"><SkipForward size={14} /></button>
              <button onClick={() => onLecture('restart')} className="btn-icone w-8 h-8 hidden sm:grid" aria-label="Revoir depuis le début"><RotateCcw size={14} /></button>
              {voixDispo && <button onClick={() => setVoix((v) => !v)} className={`btn-icone w-8 h-8 ${voix ? 'text-ok border-ok/50' : ''}`} aria-label={voix ? 'Couper la voix off' : 'Activer la voix off'} title="Voix off"><Speech size={14} /></button>}
              <button onClick={() => onLecture('stop')} className="btn-icone w-8 h-8" aria-label="Arrêter la lecture"><X size={14} /></button>
            </div>
          </div>
        </div>
      ) : atelier && etapeAt ? (
        <div className="absolute z-20 bottom-2 left-1/2 -translate-x-1/2 w-[97%] max-w-xl rounded-2xl bg-ink/95 border border-[#38bdf8]/60 overflow-hidden fade-in" role="region" aria-label="Atelier la clé et la porte">
          <div className="flex gap-0.5 p-0.5">{ETAPES_ATELIER.map((_, k) => <div key={k} className={`h-1 flex-1 rounded-full ${k < atelier.etape ? 'bg-[#38bdf8]' : k === atelier.etape ? (reussiAt ? 'bg-ok' : 'bg-[#38bdf8]/50') : 'bg-card2'}`} />)}</div>
          <div className="px-3 pt-1.5 pb-2 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9.5px] uppercase tracking-wider text-dim">Atelier · {atelier.etape + 1}/{ETAPES_ATELIER.length} · {etapeAt.titre}</div>
                <div className={`text-[12.5px] leading-snug ${reussiAt && atelier.etape > 0 && atelier.etape < ETAPES_ATELIER.length - 1 ? 'text-muted' : 'font-semibold'}`}>{etapeAt.consigne}</div>
                {(reussiAt || atelier.etape === 0 || atelier.etape === ETAPES_ATELIER.length - 1) && <div className="text-[12px] leading-snug text-ok mt-0.5 fade-in">{reussiAt && atelier.etape > 0 && atelier.etape < ETAPES_ATELIER.length - 1 ? '✓ ' : ''}{etapeAt.explication}</div>}
              </div>
              <button onClick={() => setAtelier(null)} className="btn-icone w-7 h-7 shrink-0" aria-label="Fermer l'atelier"><X size={13} /></button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-dim">Insuline</span>
              <div className="seg">{NIVEAUX_INSULINE.map((n) => <button key={n.v} className={atelier.r.ins === n.v ? 'actif' : ''} onClick={() => regler({ ins: n.v })}>{n.nom}</button>)}</div>
              <button onClick={() => regler({ res: !atelier.r.res })} className={`puce ${atelier.r.res ? 'actif' : ''}`} aria-pressed={atelier.r.res}>Résistance (type 2)</button>
              <button onClick={() => regler({ effort: !atelier.r.effort })} className={`puce ${atelier.r.effort ? 'actif' : ''}`} aria-pressed={atelier.r.effort}>Effort</button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
              <span className="num text-muted">Sucre du sang ≈ <b className={statsAt && statsAt.sang < 44 ? 'text-alert' : statsAt && statsAt.sang > 90 ? 'text-warn' : 'text-ok'}>{statsAt ? statsAt.gl.toFixed(2).replace('.', ',') : '–'} g/L</b> · entre dans le muscle : <b className="text-txt">{statsAt ? statsAt.entrees.toFixed(1).replace('.', ',') : '–'}</b>/s · sort du foie : <b className="text-txt">{statsAt ? statsAt.foie.toFixed(1).replace('.', ',') : '–'}</b>/s</span>
              <span className="flex gap-1">
                <button onClick={() => setAtelier({ ...atelier, etape: Math.max(0, atelier.etape - 1) })} disabled={atelier.etape === 0} className="btn-icone w-8 h-8 disabled:opacity-35" aria-label="Étape précédente"><SkipBack size={14} /></button>
                <button onClick={() => setAtelier({ ...atelier, etape: Math.min(ETAPES_ATELIER.length - 1, atelier.etape + 1) })} disabled={atelier.etape >= ETAPES_ATELIER.length - 1} className={`rounded-lg px-3 h-8 text-[12px] font-bold ${reussiAt ? 'bg-ok text-ink' : 'bg-card2 border border-line text-muted'} disabled:opacity-35`}>Suivant</button>
              </span>
            </div>
          </div>
        </div>
      ) : suivi ? (
        <div className="absolute z-20 bottom-2 left-1/2 -translate-x-1/2 w-[96%] max-w-lg rounded-2xl bg-ink/94 border overflow-hidden fade-in" style={{ borderColor: suivi.type === 'glucose' ? 'rgba(245,165,36,.6)' : 'rgba(56,189,248,.6)' }} role="status" aria-live="polite">
          <div className="px-3 pt-2 flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-wider text-dim">{suivi.fini ? 'Trajet terminé' : 'On suit'} une molécule {suivi.type === 'glucose' ? 'de glucose' : 'd\'insuline'} · {fmtHeure(horloge.current.minute / 60)}</div>
            <button onClick={arreterSuivi} className="btn-icone w-7 h-7" aria-label="Arrêter le suivi"><X size={13} /></button>
          </div>
          <ol ref={journalRef} className="px-3 pb-1 max-h-[96px] lg:max-h-[132px] overflow-y-auto scroll-thin text-[12px] leading-snug space-y-1">
            {suivi.lignes.map((l, k) => <li key={k} className={`flex gap-2 ${k === suivi.lignes.length - 1 ? 'text-txt font-semibold' : 'text-muted'}`}><span className="num text-dim shrink-0">{k + 1}.</span><span>{l}</span></li>)}
            {!suivi.lignes.length && <li className="text-muted">Départ…</li>}
          </ol>
          {suivi.fini && (
            <div className="px-3 pb-2 pt-1 flex flex-wrap gap-1.5">
              <button onClick={() => lancerSuivi(suivi.type)} className="rounded-lg bg-miel text-ink font-bold text-[12px] px-3 py-1.5">Suivre une autre {suivi.type === 'glucose' ? 'molécule de glucose' : 'molécule d\'insuline'}</button>
              <button onClick={() => lancerSuivi(suivi.type === 'glucose' ? 'insuline' : 'glucose')} className="rounded-lg bg-card2 border border-line font-semibold text-[12px] px-3 py-1.5">Suivre {suivi.type === 'glucose' ? 'l\'insuline' : 'le glucose'}</button>
              <span className="text-[10.5px] text-dim self-center">Le trajet change selon l'heure, le patient et le traitement.</span>
            </div>
          )}
        </div>
      ) : pret && !tourActif && (
        <>
          <button onClick={() => setMenuVoyages((v) => !v)} aria-expanded={menuVoyages} aria-label="Voyages guidés" className="absolute z-20 bottom-6 right-2 sm:bottom-7 lg:bottom-2.5 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 whitespace-nowrap rounded-full bg-miel/90 sm:bg-miel hover:brightness-110 active:scale-95 transition-transform text-ink text-[10.5px] sm:text-[12px] font-bold pl-1.5 pr-2 py-0.5 sm:pl-2.5 sm:pr-3.5 sm:py-1.5 inline-flex items-center gap-1 sm:gap-1.5 touch-manipulation before:absolute before:-inset-2.5 before:content-[''] sm:before:hidden shadow-[0_1px_6px_rgba(245,165,36,.3)] sm:shadow-[0_4px_18px_rgba(245,165,36,.45)]">
            <Route size={13} /> <span className="sm:hidden">Voyages</span><span className="hidden sm:inline">Voyages guidés</span>
          </button>
          {menuVoyages && (
            <>
              <div className="absolute inset-0 z-20" onClick={() => setMenuVoyages(false)} aria-hidden="true" />
              <div className="absolute z-30 bottom-14 right-2 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 w-64 rounded-xl bg-ink/95 border border-line p-1.5 shadow-xl fade-in" role="menu" aria-label="Voyages guidés">
                <div className="px-2.5 pt-1 pb-1 text-[10.5px] uppercase tracking-wider text-dim">Suivre une molécule (vue Corps)</div>
                {([['glucose', '#f5a524', 'Une molécule de glucose', 'D\'où elle vient, où elle va, et pourquoi'], ['insuline', '#38bdf8', 'Une molécule d\'insuline', 'Du pancréas (ou de l\'injection) à la serrure']] as const).map(([id, coul, nom, sous]) => (
                  <button key={id} role="menuitem" onClick={() => lancerSuivi(id)} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card2 active:bg-card2">
                    <span className="w-3 h-3 rotate-45 shrink-0" style={{ background: coul }} />
                    <span><span className="block text-[13px] font-semibold">{nom}</span><span className="block text-[11px] text-dim">{sous}</span></span>
                  </button>
                ))}
                <div className="px-2.5 pt-2 pb-1 text-[10.5px] uppercase tracking-wider text-dim">Voyages commentés</div>
                {VOYAGES.map((v) => (
                  <button key={v.id} role="menuitem" onClick={() => { setMenuVoyages(false); onVoyage(v.id); }} className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-card2 active:bg-card2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: v.couleur }} />
                    <span><span className="block text-[13px] font-semibold">{v.titre}</span><span className="block text-[11px] text-dim">{v.pour} · {v.etapes.length} étapes</span></span>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {traces !== 'aucun' && avecTraces && (
        <canvas ref={cvTraces} className={`absolute left-0 right-0 ${lecture ? 'bottom-[96px] lg:bottom-[74px]' : 'bottom-10'} w-full ${traces === 'tout' ? 'h-[96px]' : 'h-[52px]'} pointer-events-none bg-gradient-to-b from-ink/30 to-ink/75`} />
      )}

      <div className={`absolute bottom-0.5 right-2 text-[9px] tracking-wide text-white/25 pointer-events-none select-none ${vue === 'ilot3d' ? 'hidden lg:block' : ''}`}>Glucodyssée · Dr O. Sow</div>
    </div>
  );
}
