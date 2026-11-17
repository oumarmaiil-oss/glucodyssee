/**
 * Îlot de Langerhans en 3D (three.js, chargé à la demande) : un amas de cellules bêta (bleues),
 * alpha (violettes) et delta (grises), traversé par des capillaires. Les granules d'insuline et de glucagon
 * s'échappent au rythme du moteur et partent dans le sang des capillaires, où circulent les globules rouges.
 * L'îlot tourne lentement tout seul ; il s'arrête quand on le manipule. Glisser pour faire tourner, pincer ou molette pour zoomer.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Instant } from '../core/clock.ts';
import type { Etat } from '../core/types.ts';
import type { ZoneId } from '../content/zones.ts';
import type { Rendu, OptionsRendu } from './scene2d.ts';

function graine(n: number) { let s = n; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }

export function creerIlot3D(conteneur: HTMLElement, opt: OptionsRendu = {}): Rendu {
  const leger = !!opt.leger;
  const renderer = new THREE.WebGLRenderer({ antialias: !leger, alpha: true, preserveDrawingBuffer: true });
  let defImposee: number | null = null;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, leger ? 1.25 : 2));
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  conteneur.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 1.2, 9);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.minDistance = 4; controls.maxDistance = 16; controls.enablePan = false;
  // Rotation lente automatique, suspendue pendant et peu après un geste.
  controls.autoRotate = true; controls.autoRotateSpeed = 2.5; // un tour en 24 s environ (vitesse liée au temps, pas aux images)
  let repriseRotation: ReturnType<typeof setTimeout> | undefined;
  controls.addEventListener('start', () => { controls.autoRotate = false; clearTimeout(repriseRotation); });
  controls.addEventListener('end', () => { clearTimeout(repriseRotation); repriseRotation = setTimeout(() => { controls.autoRotate = true; }, 6000); });
  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const d1 = new THREE.DirectionalLight(0xffffff, 1.1); d1.position.set(4, 6, 5); scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x88aaff, 0.5); d2.position.set(-5, -2, -4); scene.add(d2);

  // Cellules.
  const alea = graine(7);
  type Cel = { p: THREE.Vector3; type: 'beta' | 'alpha' | 'delta'; rang: number };
  const cels: Cel[] = [];
  while (cels.length < (leger ? 120 : 190)) {
    const p = new THREE.Vector3(alea() * 2 - 1, alea() * 2 - 1, alea() * 2 - 1).multiplyScalar(2.6);
    if (p.length() > 2.6) continue;
    const u = alea();
    cels.push({ p, type: u < 0.55 ? 'beta' : u < 0.9 ? 'alpha' : 'delta', rang: alea() });
  }
  const geo = new THREE.SphereGeometry(0.3, leger ? 10 : 16, leger ? 8 : 12);
  const matB = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.45, emissive: 0x0b4a6f, emissiveIntensity: 0.4 });
  const matBm = new THREE.MeshStandardMaterial({ color: 0x5b6475, roughness: 0.8, transparent: true, opacity: 0.45 });
  const matA = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.45, emissive: 0x4c1d95, emissiveIntensity: 0.3 });
  const matD = new THREE.MeshStandardMaterial({ color: 0xa3acc0, roughness: 0.6 });
  const maillages = cels.map((c) => {
    const m = new THREE.Mesh(geo, c.type === 'beta' ? matB : c.type === 'alpha' ? matA : matD);
    m.position.copy(c.p); m.scale.setScalar(0.85 + alea() * 0.3); scene.add(m); return m;
  });
  // Capillaires.
  const matCap = new THREE.MeshStandardMaterial({ color: 0xc9424f, roughness: 0.5, transparent: true, opacity: 0.8 });
  const capillaires = [
    new THREE.CatmullRomCurve3([new THREE.Vector3(-4, 0.2, 0), new THREE.Vector3(-1, -0.3, 0.4), new THREE.Vector3(1, 0.3, -0.3), new THREE.Vector3(4, -0.1, 0)]),
    new THREE.CatmullRomCurve3([new THREE.Vector3(0, -4, 0.5), new THREE.Vector3(0.3, -1, -0.5), new THREE.Vector3(-0.4, 1, 0.3), new THREE.Vector3(0.2, 4, 0)]),
  ];
  for (const cv of capillaires) scene.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 40, 0.16, 8, false), matCap));
  // Globules rouges qui circulent dans les capillaires (un seul maillage instancié : léger).
  const N_GLOB = 14;
  const geoGlob = new THREE.SphereGeometry(0.13, 10, 8);
  const globules = new THREE.InstancedMesh(geoGlob, new THREE.MeshStandardMaterial({ color: 0xe0525f, roughness: 0.35, emissive: 0x5a0f18, emissiveIntensity: 0.5 }), N_GLOB * capillaires.length);
  scene.add(globules);
  const mGlob = new THREE.Matrix4(), qGlob = new THREE.Quaternion(), eGlob = new THREE.Vector3(1, 0.55, 1), pGlob = new THREE.Vector3();
  // Lymphocytes (type 1).
  const matL = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4, emissive: 0x7f1d1d, emissiveIntensity: 0.5 });
  const lympho = Array.from({ length: 16 }, () => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), matL); m.visible = false; scene.add(m); return m; });
  // Granules (points).
  const N_GR = leger ? 260 : 500;
  const pos = new Float32Array(N_GR * 3), col = new Float32Array(N_GR * 3);
  const gr = Array.from({ length: N_GR }, () => ({ vie: 0, v: new THREE.Vector3(), type: 0 }));
  const geoG = new THREE.BufferGeometry();
  geoG.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geoG.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const points = new THREE.Points(geoG, new THREE.PointsMaterial({ size: 0.15, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false }));
  scene.add(points);
  const cIns = new THREE.Color(0x7dd3fc), cGlu = new THREE.Color(0xd8b4fe);

  let etat: Etat | null = null, accI = 0, accG = 0, temps = 0;
  const redim = () => {
    const w = conteneur.clientWidth, h = conteneur.clientHeight;
    if (defImposee) renderer.setPixelRatio(defImposee);
    renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(redim); ro.observe(conteneur);
  const emettre = (src: THREE.Vector3, type: number) => {
    const k = gr.findIndex((x) => x.vie <= 0); if (k < 0) return;
    const dir = src.clone().add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6)).normalize();
    gr[k].vie = 2.6; gr[k].type = type; gr[k].v.copy(dir).multiplyScalar(0.8 + Math.random() * 0.5);
    const dep = src.clone().add(dir.clone().multiplyScalar(0.34));
    pos[k * 3] = dep.x; pos[k * 3 + 1] = dep.y; pos[k * 3 + 2] = dep.z;
    const c = type ? cGlu : cIns; col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
  };

  return {
    frame(i: Instant, dt: number) {
      temps += dt;
      const beta = etat?.terrain.beta ?? 1, t1 = etat?.terrain.type === 't1';
      cels.forEach((c, k) => {
        if (c.type !== 'beta') return;
        const vivante = c.rang < beta;
        maillages[k].material = vivante ? matB : matBm;
      });
      matB.emissiveIntensity = 0.25 + Math.min(1, i.S / Math.max(0.5, beta * 10)) * 0.9;
      matA.emissiveIntensity = 0.2 + Math.min(1, Math.max(0, i.glucagon - 0.5)) * 0.8;
      lympho.forEach((m, k) => { m.visible = t1; if (t1) { const a = temps * 0.3 + k * 0.39; m.position.set(Math.cos(a) * (2 + (k % 3) * 0.4), Math.sin(a * 1.3) * 1.5, Math.sin(a) * (2 + (k % 3) * 0.4)); } });
      const vivantes = cels.filter((c) => c.type === 'beta' && c.rang < beta), alphas = cels.filter((c) => c.type === 'alpha');
      // Sécrétion : au rythme du moteur, avec la part basale (continue) toujours visible tant qu'il reste des cellules bêta.
      accI += (Math.min(40, i.S) * 3 + 5) * dt; accG += (Math.max(0, i.glucagon - 0.45) * 9 + 1.5) * dt;
      while (accI >= 1 && vivantes.length) { accI -= 1; emettre(vivantes[(Math.random() * vivantes.length) | 0].p, 0); }
      while (accG >= 1) { accG -= 1; emettre(alphas[(Math.random() * alphas.length) | 0].p, 1); }
      if (accI > 6) accI = 6;
      for (let k = 0; k < N_GR; k++) {
        const p = gr[k];
        if (p.vie <= 0) { pos[k * 3 + 1] = 999; continue; }
        p.vie -= dt; pos[k * 3] += p.v.x * dt; pos[k * 3 + 1] += p.v.y * dt; pos[k * 3 + 2] += p.v.z * dt;
      }
      geoG.attributes.position.needsUpdate = true; geoG.attributes.color.needsUpdate = true;
      capillaires.forEach((cv, c) => {
        for (let k = 0; k < N_GLOB; k++) {
          const u = (temps * 0.09 + k / N_GLOB + c * 0.37) % 1;
          cv.getPointAt(u, pGlob); pGlob.y += Math.sin(k * 2.3) * 0.05;
          qGlob.setFromAxisAngle(eGlob.set(0, 1, 0), temps * 2 + k); eGlob.set(1, 0.55, 1);
          mGlob.compose(pGlob, qGlob, eGlob); globules.setMatrixAt(c * N_GLOB + k, mGlob);
        }
      });
      globules.instanceMatrix.needsUpdate = true;
      controls.update(dt);
      renderer.render(scene, camera);
    },
    maj(e) { etat = e; },
    focus(z: ZoneId | null) { if (!z) { camera.position.set(0, 1.2, 9); controls.target.set(0, 0, 0); } },
    selection() { /* une seule structure */ },
    setEtiquettes() { /* légende affichée par l'interface */ },
    setDefinition(pr) { defImposee = pr; renderer.setPixelRatio(pr ?? Math.min(window.devicePixelRatio || 1, leger ? 1.25 : 2)); redim(); },
    zoomer(f) { camera.position.multiplyScalar(1 / f); const d = camera.position.length(); if (d < 4) camera.position.setLength(4); if (d > 16) camera.position.setLength(16); },
    setMarges() { /* la 3D occupe toute la scène */ },
    dispose() { clearTimeout(repriseRotation); ro.disconnect(); controls.dispose(); renderer.dispose(); geo.dispose(); geoG.dispose(); geoGlob.dispose(); renderer.domElement.remove(); },
  };
}
