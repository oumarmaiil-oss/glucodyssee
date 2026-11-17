/**
 * Pancréas en 3D (chargé à la demande) : l'organe avec ses îlots de Langerhans, puis le zoom sur un îlot.
 * Dans l'îlot : cellules bêta (insuline, vertes), alpha (glucagon, roses), capillaire où arrive le sucre
 * (points dorés) et d'où partent les grains d'insuline (bleus). Type 1 : cellules bêta détruites et
 * lymphocytes ; type 2 : cellules bêta moins nombreuses et épuisées ; sulfamide : sécrétion forcée.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface EtatIlot {
  glycemie: number;       // mg/dL
  secretion: number;      // 0 à 1 : sécrétion endogène relative
  beta: number;           // fonction bêta du profil (0 à 1)
  type1: boolean;
  sulfamide: boolean;
  incretine: boolean;     // iDPP-4 ou aGLP-1 : signal des incrétines
}
export type ModePancreas = 'organe' | 'ilot';

export interface Pancreas3D {
  maj(e: EtatIlot): void;
  mode(m: ModePancreas): void;
  dispose(): void;
}

export function creerPancreas3D(hote: HTMLElement, departMode: ModePancreas = 'organe'): Pancreas3D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  hote.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  const controles = new OrbitControls(camera, renderer.domElement);
  controles.enableDamping = true; controles.enablePan = false; controles.autoRotate = true; controles.autoRotateSpeed = 0.8;
  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x2a1d10, 1.3));
  const soleil = new THREE.DirectionalLight(0xffffff, 1.6); soleil.position.set(4, 6, 5); scene.add(soleil);

  // ── L'organe ──
  const organe = new THREE.Group(); scene.add(organe);
  const courbe = new THREE.CatmullRomCurve3([V(-3.2, -0.3, 0.2), V(-2.4, 0.1, 0.3), V(-1.2, 0.35, 0), V(0.2, 0.45, -0.1), V(1.6, 0.6, -0.2), V(2.9, 0.95, -0.15), V(3.6, 1.25, 0)]);
  const matPancreas = new THREE.MeshStandardMaterial({ color: 0xe8c98a, roughness: 0.7, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide });
  // Forme lisse : un tube dont le rayon diminue de la tête vers la queue (vertex par vertex)
  const SEG = 120, RAD = 32;
  const geoP = new THREE.TubeGeometry(courbe, SEG, 1, RAD, false);
  const pos = geoP.attributes.position as THREE.BufferAttribute, centre = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i <= SEG; i++) {
    const t = i / SEG; courbe.getPoint(t, centre);
    const r = (0.95 - 0.6 * t) * (1 + 0.06 * Math.sin(t * 23));
    for (let j = 0; j <= RAD; j++) {
      const k = i * (RAD + 1) + j; q.fromBufferAttribute(pos, k).sub(centre);
      q.multiply(new THREE.Vector3(r, r * 0.8, r * 0.85)).add(centre); pos.setXYZ(k, q.x, q.y, q.z);
    }
  }
  geoP.computeVertexNormals();
  organe.add(new THREE.Mesh(geoP, matPancreas));
  // Duodénum (C autour de la tête) et canal de Wirsung
  const duod = new THREE.CatmullRomCurve3([V(-2.2, 1.5, 0.4), V(-3.6, 1.2, 0.6), V(-4.3, -0.2, 0.5), V(-3.7, -1.5, 0.4), V(-2.2, -1.7, 0.3)]);
  organe.add(new THREE.Mesh(new THREE.TubeGeometry(duod, 60, 0.42, 16, false), new THREE.MeshStandardMaterial({ color: 0xd99a8a, roughness: 0.8 })));
  organe.add(new THREE.Mesh(new THREE.TubeGeometry(courbe, 80, 0.07, 8, false), new THREE.MeshStandardMaterial({ color: 0xc9a25a, roughness: 0.6 })));
  // Îlots lumineux
  const ilots: THREE.Mesh[] = [];
  const matIlot = new THREE.MeshStandardMaterial({ color: 0x8fff9f, emissive: 0x3aa860, emissiveIntensity: 1.2, roughness: 0.3 });
  const alea = graine(7);
  for (let k = 0; k < 46; k++) {
    const t = alea() * 0.96, p = courbe.getPoint(t), r = (0.95 - 0.6 * t) * 0.9;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.09 + alea() * 0.06, 12, 10), matIlot.clone());
    m.position.set(p.x + (alea() - 0.5) * r, p.y + (alea() - 0.5) * r * 0.8, p.z + (alea() - 0.5) * r * 0.8);
    organe.add(m); ilots.push(m);
  }

  // ── L'îlot agrandi ──
  const ilot = new THREE.Group(); scene.add(ilot);
  const capillaire = new THREE.CatmullRomCurve3([V(-4, -1.6, 0.6), V(-1.6, -0.6, 0.9), V(0, 0.1, 0.4), V(1.5, 0.6, -0.3), V(4, 1.5, -0.6)]);
  ilot.add(new THREE.Mesh(new THREE.TubeGeometry(capillaire, 80, 0.26, 14, false), new THREE.MeshStandardMaterial({ color: 0xc0393f, roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false })));
  interface Cellule { m: THREE.Mesh; beta: boolean; phase: number; vivante: boolean }
  const cellules: Cellule[] = [];
  const geoCell = new THREE.IcosahedronGeometry(0.34, 2);
  const a2 = graine(11);
  for (let k = 0; k < 90; k++) {
    // répartition dans une sphère aplatie, cœur riche en cellules bêta, périphérie en cellules alpha
    const u = a2(), v = a2(), w = Math.cbrt(a2());
    const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
    const pos = V(2.4 * w * Math.sin(ph) * Math.cos(th), 1.9 * w * Math.cos(ph), 2.2 * w * Math.sin(ph) * Math.sin(th));
    const beta = w < 0.78 ? a2() < 0.9 : a2() < 0.35;
    const m = new THREE.Mesh(geoCell, new THREE.MeshStandardMaterial({ color: beta ? 0x7fd36a : 0xff7f96, roughness: 0.55, emissive: beta ? 0x1f5a14 : 0x5a1422, emissiveIntensity: 0.4 }));
    m.position.copy(pos); m.scale.setScalar(0.85 + a2() * 0.35); ilot.add(m);
    cellules.push({ m, beta, phase: a2() * 6.28, vivante: true });
  }
  const lymphos: THREE.Mesh[] = [];
  for (let k = 0; k < 9; k++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.35, emissive: 0x333333 }));
    const th = (k / 9) * 6.28; m.position.set(3.1 * Math.cos(th), 0.6 * Math.sin(th * 2), 2.8 * Math.sin(th)); m.visible = false; ilot.add(m); lymphos.push(m);
  }
  // Particules : sucre (doré, dans le capillaire), insuline (bleu, des cellules bêta vers le capillaire), incrétines (vert clair)
  const NS = 60, NI = 90, NG = 24;
  const sucre = nuage(NS, 0xf0a832, 0.11), insuline = nuage(NI, 0x7aa2ff, 0.09), incret = nuage(NG, 0xb6ffb0, 0.08);
  ilot.add(sucre.mesh, insuline.mesh, incret.mesh);
  const graines: { cell: number; t: number }[] = Array.from({ length: NI }, (_, k) => ({ cell: k, t: (k / NI) }));

  let etat: EtatIlot = { glycemie: 90, secretion: 0.2, beta: 1, type1: false, sulfamide: false, incretine: false };
  let modeCourant: ModePancreas = departMode;
  const appliquerMode = () => {
    organe.visible = modeCourant === 'organe'; ilot.visible = modeCourant === 'ilot';
    if (modeCourant === 'organe') { camera.position.set(0.5, 2.2, 9.5); controles.target.set(-0.3, 0.3, 0); }
    else { camera.position.set(0, 1.6, 11.5); controles.target.set(0, 0, 0); }
    controles.update();
  };
  appliquerMode();

  const ro = new ResizeObserver(() => {
    const w = hote.clientWidth || 300, h = hote.clientHeight || 300;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  });
  ro.observe(hote);

  const m4 = new THREE.Matrix4(), vtmp = new THREE.Vector3();
  let raf = 0, t0 = performance.now(), visible = true;
  const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; }); io.observe(hote);
  const boucle = (n: number) => {
    raf = requestAnimationFrame(boucle);
    if (!visible) return;
    const s = Math.max(0, (n - t0) / 1000);
    controles.update();
    // Îlots de l'organe : pulsent avec la sécrétion ; éteints dans le type 1
    const vivantes = etat.type1 ? 0.05 : Math.max(0.15, etat.beta);
    ilots.forEach((m, k) => {
      const mat = m.material as THREE.MeshStandardMaterial;
      const on = k / ilots.length < vivantes || !etat.type1;
      mat.emissiveIntensity = on ? 0.35 + 1.4 * etat.secretion * (0.6 + 0.4 * Math.sin(s * 3 + k)) : 0.02;
      mat.color.setHex(etat.type1 && k / ilots.length >= vivantes ? 0x6b665e : 0x6fd38f);
    });
    if (modeCourant !== 'ilot') { renderer.render(scene, camera); return; }
    // Cellules bêta : vivantes selon la fonction bêta ; détruites (grises, rétrécies) dans le type 1
    const betas = cellules.filter((c) => c.beta);
    const nVivantes = Math.round(betas.length * (etat.type1 ? 0.04 : Math.min(1, 0.25 + etat.beta)));
    betas.forEach((c, k) => {
      c.vivante = k < nVivantes;
      const mat = c.m.material as THREE.MeshStandardMaterial;
      if (!c.vivante) { mat.color.setHex(0x5f5a52); mat.emissiveIntensity = 0; c.m.scale.setScalar(0.55); return; }
      mat.color.setHex(0x7fd36a);
      const force = etat.sulfamide ? 0.9 : etat.secretion;
      mat.emissiveIntensity = 0.25 + 1.2 * force * (0.5 + 0.5 * Math.sin(s * 4 + c.phase));
      c.m.scale.setScalar(0.95 + 0.08 * force * Math.sin(s * 4 + c.phase));
    });
    lymphos.forEach((m, k) => { m.visible = etat.type1; m.position.y = 0.6 * Math.sin(s * 0.8 + k); });
    // Sucre dans le capillaire (nombre selon la glycémie)
    const nS = Math.round(Math.min(NS, (etat.glycemie / 100) * 14));
    for (let k = 0; k < NS; k++) {
      if (k >= nS) { sucre.cacher(k); continue; }
      capillaire.getPoint(((k / NS) + s * 0.06) % 1, vtmp);
      vtmp.x += Math.sin(k * 7.1) * 0.12; vtmp.y += Math.cos(k * 3.7) * 0.12;
      sucre.placer(k, vtmp, m4);
    }
    // Grains d'insuline : de cellules bêta vivantes vers le capillaire
    const vivantesListe = betas.filter((c) => c.vivante);
    const debit = vivantesListe.length ? Math.min(1, (etat.sulfamide ? 0.85 : etat.secretion)) : 0;
    const nI = Math.round(NI * debit);
    for (let k = 0; k < NI; k++) {
      const gk = graines[k]!;
      if (k >= nI || !vivantesListe.length) { insuline.cacher(k); continue; }
      gk.t += 0.004 + 0.01 * debit;
      if (gk.t > 1) { gk.t = 0; gk.cell = Math.floor(Math.random() * vivantesListe.length); }
      const depart = vivantesListe[gk.cell % vivantesListe.length]!.m.position;
      capillaire.getPoint(0.35 + ((k * 0.37) % 0.4), vtmp);
      vtmp.lerpVectors(depart, vtmp, gk.t);
      insuline.placer(k, vtmp, m4);
    }
    // Incrétines (iDPP-4, aGLP-1) : arrivent par le capillaire vers les cellules bêta
    for (let k = 0; k < NG; k++) {
      if (!etat.incretine) { incret.cacher(k); continue; }
      const cible = (betas[(k * 5) % betas.length]!).m.position;
      capillaire.getPoint(0.2 + (k / NG) * 0.6, vtmp);
      const t = (s * 0.35 + k / NG) % 1;
      vtmp.lerp(cible, t);
      incret.placer(k, vtmp, m4);
    }
    sucre.fin(); insuline.fin(); incret.fin();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(boucle);

  return {
    maj(e) { etat = e; },
    mode(m) { if (m !== modeCourant) { modeCourant = m; appliquerMode(); } },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); controles.dispose();
      scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); const mat = m.material as THREE.Material | THREE.Material[] | undefined; if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.(); });
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}

function V(x: number, y: number, z: number) { return new THREE.Vector3(x, y, z); }
function graine(s: number) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function nuage(n: number, couleur: number, rayon: number) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(rayon, 10, 8), new THREE.MeshStandardMaterial({ color: couleur, emissive: couleur, emissiveIntensity: 0.6 }), n);
  const zero = new THREE.Matrix4().makeScale(0, 0, 0);
  return {
    mesh,
    cacher(k: number) { mesh.setMatrixAt(k, zero); },
    placer(k: number, p: THREE.Vector3, m: THREE.Matrix4) { m.makeTranslation(p.x, p.y, p.z); mesh.setMatrixAt(k, m); },
    fin() { mesh.instanceMatrix.needsUpdate = true; },
  };
}
