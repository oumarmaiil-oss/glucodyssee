/**
 * Socle commun des scènes 2D (canvas) : taille réelle de l'écran, zoom et déplacement (zoom2d),
 * zones cliquables, survol, cadrage animé sur une zone, étiquettes lisibles, export haute définition.
 */
import { installerZoom2D, MARGES_NULLES, zoneLibre, type Marges } from './zoom2d.ts';
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';
import type { ZoneId } from '../content/zones.ts';

export type Pt = [number, number];
export interface Region { z: ZoneId; x: number; y: number; w: number; h: number }

export interface Rendu {
  frame(i: Instant, dt: number): void;
  maj(e: Etat, sans?: Etat): void;
  focus(z: ZoneId | null): void;
  selection(z: ZoneId | null): void;
  setEtiquettes(on: boolean): void;
  setDefinition(pr: number | null): void;
  zoomer(f: number): void;
  setMarges(m: Marges): void;
  dispose(): void;
  /** Vue Cellule : muscle ou foie. */
  setSite?(s: string): void;
}

export interface OptionsRendu {
  onPick?: (z: ZoneId | null) => void;
  onHover?: (z: ZoneId | null) => void;
  /** Nom de l'objet sous la souris (et position dans la scène, en pixels), ou null. */
  onObjet?: (nom: string | null, x: number, y: number) => void;
  leger?: boolean;
}

export interface Contexte {
  g: CanvasRenderingContext2D;
  temps: number;
  etat: Etat | null;
  sans: Etat | null;
  labels: boolean;
  choisi: ZoneId | null;
  survol: ZoneId | null;
  echelle: number; // zoom courant
  leger: boolean;
  site: string;
  texte: (t: string, x: number, y: number, coul?: string, taille?: number) => void;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const mix = (a: number[], b: number[], t: number) => `rgb(${lerp(a[0], b[0], t) | 0},${lerp(a[1], b[1], t) | 0},${lerp(a[2], b[2], t) | 0})`;

export const COUL = {
  glucose: '#f5b027', insuline: '#38bdf8', glucagon: '#c084fc', vert: '#6ee7b7', alerte: '#fb7185', texte: '#e9eef8',
  sangArt: '#c9424f', sangVein: '#5a6fc8',
};

/** Dessine un petit hexagone (molécule de glucose). */
export function hexagone(g: CanvasRenderingContext2D, x: number, y: number, r: number, coul = COUL.glucose) {
  g.fillStyle = coul; g.beginPath();
  for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k + Math.PI / 6; const px = x + r * Math.cos(a), py = y + r * Math.sin(a); k ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fill();
}

/** Triangle (glucagon). */
export function triangle(g: CanvasRenderingContext2D, x: number, y: number, r: number, coul = COUL.glucagon) {
  g.fillStyle = coul; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.9, y + r * 0.7); g.lineTo(x - r * 0.9, y + r * 0.7); g.closePath(); g.fill();
}
/** Losange (GLP-1, incrétine). */
export function losange(g: CanvasRenderingContext2D, x: number, y: number, r: number, coul = '#f472b6') {
  g.fillStyle = coul; g.beginPath(); g.moveTo(x, y - r); g.lineTo(x + r * 0.75, y); g.lineTo(x, y + r); g.lineTo(x - r * 0.75, y); g.closePath(); g.fill();
}
/** Bouchée de repas (amidon, avant digestion). */
export function bouchee(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
  g.fillStyle = '#d9b98c'; g.strokeStyle = '#8a6a3f'; g.lineWidth = 1.2;
  g.beginPath(); g.ellipse(x, y, r, r * 0.8, 0.4, 0, 7); g.fill(); g.stroke();
  g.fillStyle = 'rgba(138,106,63,.6)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.15, r * 0.22, 0, 7); g.fill(); g.beginPath(); g.arc(x + r * 0.3, y + r * 0.2, r * 0.18, 0, 7); g.fill();
}

/** Petite clé (insuline). */
export function cle(g: CanvasRenderingContext2D, x: number, y: number, r: number, rot = 0, coul = COUL.insuline) {
  g.save(); g.translate(x, y); g.rotate(rot); g.strokeStyle = coul; g.fillStyle = coul; g.lineWidth = r * 0.45;
  g.beginPath(); g.arc(-r * 0.9, 0, r * 0.6, 0, 7); g.stroke();
  g.beginPath(); g.moveTo(-r * 0.3, 0); g.lineTo(r * 1.3, 0); g.moveTo(r * 0.8, 0); g.lineTo(r * 0.8, r * 0.5); g.moveTo(r * 1.2, 0); g.lineTo(r * 1.2, r * 0.45); g.stroke();
  g.restore();
}

export function creerScene2D(conteneur: HTMLElement, opt: OptionsRendu, def: {
  W: number; H: number; regions: Region[] | ((site: string) => Region[]); sMax?: number;
  dessiner: (c: Contexte, i: Instant) => void;
  avancer?: (c: Contexte, i: Instant, dt: number) => void;
  /** Zone affichée quand on demande une zone absente de cette vue (sinon : vue d'ensemble). */
  repli?: Partial<Record<ZoneId, ZoneId>>;
  siteInitial?: string;
  /** Nom de l'objet dessiné près du point (coordonnées du dessin), pour la bulle de survol. */
  objet?: (c: Contexte, p: Pt) => string | null;
  /** Point à suivre avec la caméra (molécule suivie), ou null. */
  suivi?: () => Pt | null;
}): Rendu {
  const { W, H } = def;
  const cv = document.createElement('canvas');
  cv.style.cssText = 'display:block;width:100%;height:100%;touch-action:manipulation';
  conteneur.appendChild(cv);
  const g = cv.getContext('2d')!;
  let dpr = 1, cw = 1, ch = 1, defImposee: number | null = null;
  const redim = () => {
    cw = conteneur.clientWidth; ch = conteneur.clientHeight;
    dpr = defImposee ?? Math.min(window.devicePixelRatio || 1, opt.leger ? 1.25 : 2);
    cv.width = Math.max(1, Math.round(cw * dpr)); cv.height = Math.max(1, Math.round(ch * dpr));
  };
  const ro = new ResizeObserver(redim);
  ro.observe(conteneur);

  const vue = { s: 1, cx: W / 2, cy: H / 2 };
  let anim: { t: number; de: typeof vue; a: typeof vue } | null = null;
  let marges: Marges = MARGES_NULLES;
  const libre = () => zoneLibre(cw, ch, marges, { w: W, h: H });
  const zoom = installerZoom2D(cv, { vue, vue0: { s: 1, cx: W / 2, cy: H / 2 }, sMax: def.sMax ?? 4, W, H, centre: () => { const l = libre(); return [l.mx, l.my]; }, k0: () => libre().k0, animer: (a) => { anim = { t: 0, de: { ...vue }, a }; }, arreterAnim: () => { anim = null; } });
  const base = () => { const l = libre(), k = l.k0 * vue.s; return { k, ox: l.mx - vue.cx * k, oy: l.my - vue.cy * k }; };
  const monde = (ev: PointerEvent): Pt => { const r = cv.getBoundingClientRect(); const b = base(); return [(ev.clientX - r.left - b.ox) / b.k, (ev.clientY - r.top - b.oy) / b.k]; };
  const regs = () => (typeof def.regions === 'function' ? def.regions(c.site) : def.regions);
  const zoneEn = ([x, y]: Pt) => regs().find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)?.z ?? null;

  const c: Contexte = {
    g, temps: 0, etat: null, sans: null, labels: false, choisi: null, survol: null, echelle: 1, leger: !!opt.leger, site: def.siteInitial ?? '',
    texte(t, x, y, coul = COUL.texte, taille0 = 12.5) {
      const taille = taille0 / Math.sqrt(vue.s) / clamp(libre().k0, 0.5, 1); // lisible aussi sur un petit écran
      g.font = `600 ${taille}px "Plus Jakarta Sans", system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
      const w = g.measureText(t).width;
      g.fillStyle = 'rgba(7,10,18,.78)'; g.beginPath(); g.roundRect(x - w / 2 - 6, y - taille * 0.8, w + 12, taille * 1.6, 7); g.fill();
      g.fillStyle = coul; g.fillText(t, x, y);
    },
  };
  const onMove = (ev: PointerEvent) => {
    if (ev.pointerType !== 'mouse') return;
    const pt = monde(ev), r = cv.getBoundingClientRect();
    opt.onObjet?.(def.objet?.(c, pt) ?? null, ev.clientX - r.left, ev.clientY - r.top);
    const z = zoneEn(pt); if (z !== c.survol) { c.survol = z; cv.style.cursor = z ? 'pointer' : 'default'; opt.onHover?.(z); } };
  const onUp = (ev: PointerEvent) => { if (!zoom.aDeplace()) opt.onPick?.(zoneEn(monde(ev))); };
  const onLeave = () => opt.onObjet?.(null, 0, 0);
  cv.addEventListener('pointermove', onMove); cv.addEventListener('pointerup', onUp); cv.addEventListener('pointerleave', onLeave);

  return {
    frame(i, dt) {
      c.temps += dt;
      if (anim) {
        anim.t = Math.min(1, anim.t + dt / 0.7); const k = anim.t * anim.t * (3 - 2 * anim.t);
        vue.s = lerp(anim.de.s, anim.a.s, k); vue.cx = lerp(anim.de.cx, anim.a.cx, k); vue.cy = lerp(anim.de.cy, anim.a.cy, k);
        if (anim.t >= 1) anim = null;
      }
      const pt = def.suivi?.();
      if (pt) { const k = Math.min(1, dt * 2.5); vue.s += (2.1 - vue.s) * k; vue.cx += (pt[0] - vue.cx) * k; vue.cy += (pt[1] - vue.cy) * k; }
      c.echelle = vue.s;
      def.avancer?.(c, i, dt);
      const b = base();
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, cw, ch);
      g.setTransform(dpr * b.k, 0, 0, dpr * b.k, dpr * b.ox, dpr * b.oy);
      def.dessiner(c, i);
      for (const r of regs()) if (r.z === c.choisi || r.z === c.survol) {
        g.strokeStyle = r.z === c.choisi ? 'rgba(125,211,252,.95)' : 'rgba(255,255,255,.4)'; g.lineWidth = 2; g.setLineDash([6, 4]);
        g.beginPath(); g.roundRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8, 10); g.stroke(); g.setLineDash([]);
      }
    },
    maj(e, sans) { c.etat = e; c.sans = sans ?? null; },
    focus(z) {
      const zz = z ? (regs().some((r) => r.z === z) ? z : def.repli?.[z] ?? null) : null;
      const r = zz ? regs().find((x) => x.z === zz) : null;
      const a = r ? { s: clamp(Math.min(W / (r.w + 200), H / (r.h + 220)), 1, 2.4), cx: r.x + r.w / 2, cy: r.y + r.h / 2 } : { s: 1, cx: W / 2, cy: H / 2 };
      anim = { t: 0, de: { ...vue }, a };
    },
    selection(z) { c.choisi = z; },
    setEtiquettes(on) { c.labels = on; },
    setDefinition(pr) { defImposee = pr; redim(); },
    zoomer: (f) => zoom.zoomer(f),
    setMarges(m) { marges = m; },
    setSite(s) { c.site = s; },
    dispose() { zoom.dispose(); ro.disconnect(); cv.removeEventListener('pointermove', onMove); cv.removeEventListener('pointerup', onUp); cv.removeEventListener('pointerleave', onLeave); cv.remove(); },
  };
}
