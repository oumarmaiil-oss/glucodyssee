/**
 * Horloge de la journée : la scène rejoue la journée type en accéléré (24 h en 60 s par défaut).
 * Chaque instant donne la glycémie et les flux de glucose de la minute en cours.
 */
import type { Etat } from './types.ts';
import { repasDuJour } from './engine.ts';

export interface Instant {
  minute: number; // 0..1439
  heure: number; // heures décimales
  G: number; // mg/dL
  dG: number; // tendance (mg/dL par 15 min)
  I: number; // insuline (µU/mL)
  S: number; // sécrétion d'insuline
  Ra: number; PGE: number; Uins: number; Ucer: number; Urein: number; Ueff: number;
  glucagon: number;
  repas: string | null; // repas en cours (dans l'heure qui suit)
  injection: string | null; // injection récente
  effort: boolean;
  nuit: boolean;
}

export const fmtHeure = (h: number) => {
  const m = Math.round(h * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};

export function instantA(e: Etat, minute: number): Instant {
  const m = ((Math.floor(minute) % 1440) + 1440) % 1440;
  const h = m / 60;
  const prev = e.G[(m + 1440 - 15) % 1440];
  const repas = repasDuJour(e.terrain).find((r) => h >= r.h && h < r.h + 1)?.nom ?? null;
  return {
    minute: m, heure: h, G: e.G[m], dG: e.G[m] - prev, I: e.I[m], S: e.S[m],
    Ra: e.Ra[m], PGE: e.PGE[m], Uins: e.Uins[m], Ucer: e.Ucer[m], Urein: e.Urein[m], Ueff: e.Ueff[m],
    glucagon: e.glucagon[m],
    repas, injection: e.injections.find((i) => h >= i.h && h < i.h + 0.6)?.nom ?? null,
    effort: e.Ueff[m] > 0.01,
    nuit: h < 6.5 || h >= 22.5,
  };
}

export class Horloge {
  minute = 7 * 60; // la journée commence au réveil
  vitesse = 1; // 1 = 24 h en 60 s
  pause = false;
  avancer(dt: number) {
    if (!this.pause) this.minute = (this.minute + dt * 24 * this.vitesse) % 1440;
    return this.minute;
  }
  aller(minute: number) { this.minute = ((minute % 1440) + 1440) % 1440; }
}
