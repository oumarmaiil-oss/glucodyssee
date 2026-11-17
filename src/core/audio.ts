/**
 * Son du capteur de glucose (Web Audio) : bip discret au passage de chaque repas et alarme
 * quand la glycémie de la journée passe sous 0,70 g/L (aiguë) ou au-dessus de 2,50 g/L (grave).
 */
import type { Instant } from './clock.ts';

export class Son {
  private ctx: AudioContext | null = null;
  private vol: GainNode | null = null;
  private dest: MediaStreamAudioDestinationNode | null = null;
  actif = false;
  private dernier = -1e9;
  private dernierRepas: string | null = null;
  private t = 0;

  /** À appeler depuis un geste de l'utilisateur (exigence des navigateurs, iOS compris). */
  activer(): boolean {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.ctx = new AC();
        const nav = navigator as Navigator & { audioSession?: { type: string } };
        if (nav.audioSession) nav.audioSession.type = 'playback';
        this.vol = this.ctx.createGain(); this.vol.gain.value = 0.9;
        const lim = this.ctx.createDynamicsCompressor(); lim.threshold.value = -6; lim.ratio.value = 12;
        this.vol.connect(lim).connect(this.ctx.destination);
        const s = this.ctx.createBufferSource(); s.buffer = this.ctx.createBuffer(1, 1, 22050); s.connect(this.ctx.destination); s.start();
      }
      void this.ctx.resume();
      this.actif = true;
      return true;
    } catch {
      return false;
    }
  }
  couper() { this.actif = false; }

  /** Flux audio pour l'enregistrement vidéo (null si le son n'est pas activé). */
  flux(): MediaStream | null {
    if (!this.ctx || !this.vol || !this.actif) return null;
    if (!this.dest) { this.dest = this.ctx.createMediaStreamDestination(); this.vol.connect(this.dest); }
    return this.dest.stream;
  }

  private bip(freq: number, duree: number, gain: number, delai = 0) {
    const c = this.ctx!, t0 = c.currentTime + delai;
    const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
    const g = c.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
    o.connect(g).connect(this.vol!); o.start(t0); o.stop(t0 + duree + 0.02);
  }

  /** Appelé à chaque image : alarmes selon la glycémie de l'instant affiché. */
  tick(i: Instant, dt: number) {
    this.t += dt;
    if (!this.actif || !this.ctx) return;
    if (i.repas && i.repas !== this.dernierRepas) { this.bip(660, 0.12, 0.25); this.bip(880, 0.12, 0.2, 0.14); }
    this.dernierRepas = i.repas;
    if (this.t - this.dernier < 1.6) return;
    if (i.G < 70) { this.dernier = this.t; this.bip(1046, 0.16, 0.45); this.bip(1046, 0.16, 0.45, 0.24); this.bip(1046, 0.16, 0.45, 0.48); }
    else if (i.G > 250) { this.dernier = this.t; this.bip(330, 0.35, 0.35); }
  }
}
