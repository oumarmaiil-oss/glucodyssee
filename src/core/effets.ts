/**
 * Effets des traitements qu'on peut montrer dans la scène (étiquettes vertes).
 * Chaque effet n'apparaît que si la classe agit vraiment dans la situation simulée.
 */
import type { Etat } from './types.ts';

export interface EffetsVisibles {
  foieFreine: boolean; // metformine
  pancreasForce: boolean; // sulfamide (glucose-indépendant)
  incretines: boolean; // iDPP-4 ou aGLP-1 : insuline quand le sucre monte, glucagon freiné
  estomacRalenti: boolean; // aGLP-1
  sucreUrinaire: boolean; // iSGLT2
  insulineInjectee: boolean; // insuline
  sansEffet: boolean; // sulfamide ou incrétine sans cellules bêta (type 1)
}

export function effetsVisibles(e: Etat | null | undefined): EffetsVisibles {
  const aucun: EffetsVisibles = { foieFreine: false, pancreasForce: false, incretines: false, estomacRalenti: false, sucreUrinaire: false, insulineInjectee: false, sansEffet: false };
  if (!e || e.fraction < 0.5) return aucun;
  const tr = e.traitement, beta = e.terrain.beta > 0.02;
  const on = (c: keyof typeof tr) => (tr[c] ?? 0) > 0;
  return {
    foieFreine: on('metformine'),
    pancreasForce: (on('sulfamide') || on('glibenclamide')) && beta,
    incretines: (on('idpp4') || on('aglp1')) && beta,
    estomacRalenti: on('aglp1'),
    sucreUrinaire: on('isglt2'),
    insulineInjectee: on('basale') || on('rapide') || on('melange'),
    sansEffet: !beta && (on('sulfamide') || on('glibenclamide') || on('idpp4')),
  };
}
