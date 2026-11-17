// Teaser vertical 20 s « trois vues » : Ramadan (courbe), rein, cellule musculaire (GLUT4).
// Chaque vue est filmée à part, en temps réel (1080×1920), puis montée avec des fondus enchaînés (ffmpeg xfade).
// Pas de doigt à l'écran, une phrase par vue. Usage : node vues.cjs → vues-video.mp4 (sans son).
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:4180/glucodyssee/';
const FPS = 30, FONDU = 0.8;
const D = (f) => path.join(__dirname, f);

// Chaque plan : préparation dans l'application, heure de départ souhaitée, durée, phrase, cartes éventuelles.
const PLANS = [
  { nom: 'ramadan', duree: 7.5, heure: [9, 11], puces: ['Diabète de type 2', 'Ramadan'], vue: 'Courbes',
    phrase: 'Ramadan : la glycémie du sahur au ndogu', carte: [-1, 2.2, '<h2 style="font-size:34px">Le voyage<br>du sucre</h2><p style="font-size:16px">en 3 vues</p>'] },
  { nom: 'rein', duree: 6, heure: [13.7, 14.2], puces: ['Diabète de type 2'], vue: 'Rein',
    phrase: 'Le rein : au-delà de 1,80 g/L, le sucre passe dans les urines' },
  { nom: 'cellule', duree: 8.1, heure: [7.8, 8.4], puces: [], vue: 'Cellule',
    phrase: 'Le muscle : l\'insuline ouvre les portes GLUT4, le sucre entre',
    carte: [5.0, 99, '<img src="icon-512.png"><h1>Glucodyssée</h1><p class="url">oumarmaiil-oss.github.io/glucodyssee</p><p>Gratuit · téléphone et ordinateur</p><p class="pied">Simulation pédagogique</p>'] },
];

const SURCOUCHE = ([phrase, carte, duree]) => {
  const st = document.createElement('style');
  st.textContent = `#tk{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#fff}
  #tk .cap{position:absolute;left:14px;right:14px;top:14px;background:rgba(7,10,18,.9);border-left:4px solid #f5a524;border-radius:14px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,.5)}
  #tk .cap b{display:block;font-family:Fraunces,Georgia,serif;font-size:25px;line-height:1.15}
  #tk .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:28px;text-align:center;background:radial-gradient(ellipse at 50% 38%,rgba(42,33,18,.96),rgba(7,10,18,.98) 72%)}
  #tk .card img{width:84px;height:84px;border-radius:22px;box-shadow:0 0 50px rgba(245,165,36,.5)}
  #tk .card h1{margin:4px 0 0;font-family:Fraunces,Georgia,serif;font-size:40px}
  #tk .card h2{margin:0;font-family:Fraunces,Georgia,serif;line-height:1.1}
  #tk .card p{margin:0;font-size:15px;color:#cbd5e1}
  #tk .card .url{font-weight:800;color:#f5a524}
  #tk .card .pied{margin-top:8px;font-size:12px;color:#94a3b8}
  .fixed.bottom-4[role=status]{display:none!important}`;
  document.head.appendChild(st);
  const z = document.createElement('div'); z.id = 'tk';
  z.innerHTML = `<div class="cap"><b></b></div><div class="card"></div>`;
  document.body.appendChild(z);
  const cap = z.querySelector('.cap'), card = z.querySelector('.card');
  cap.querySelector('b').textContent = phrase;
  if (carte) card.innerHTML = carte[2];
  const t0 = performance.now();
  const boucle = () => {
    const t = (performance.now() - t0) / 1000;
    const c = carte ? Math.max(0, Math.min(1, (t - carte[0]) / 0.5, (carte[1] - t) / 0.5)) : 0;
    card.style.opacity = c;
    const debut = carte && carte[0] < 0 ? carte[1] : 0.5;
    const fin = carte && carte[0] > 0 ? carte[0] : 99;
    cap.style.opacity = Math.max(0, Math.min(1, (t - debut) / 0.6, (fin - t) / 0.4));
    cap.style.transform = `translateY(${(1 - Math.min(1, Math.max(0, (t - debut) / 0.6))) * -10}px)`;
    if (t < duree + 1) requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
};

async function filmer(b, plan) {
  const c = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await p.addInitScript(() => { localStorage.setItem('gluco.niveau', '2'); localStorage.setItem('gluco.bandeau-installer', '1'); });
  await p.goto(URL); await p.waitForTimeout(2200);
  const clic = (pred) => p.evaluate((src) => { const f = new Function('x', 'return ' + src); const el = [...document.querySelectorAll('button')].find((x) => f(x)); el?.click(); return !!el; }, pred);
  await clic("x.getAttribute('role') === 'tab' && x.textContent.includes('Maladies')"); await p.waitForTimeout(300);
  for (const n of plan.puces) {
    await clic(`x.classList.contains('puce') && x.textContent.trim() === ${JSON.stringify(n)}`); await p.waitForTimeout(300);
    await clic("x.textContent.includes('Toutes les maladies')"); await p.waitForTimeout(300);
  }
  await clic(`x.textContent.trim() === ${JSON.stringify(plan.vue)}`); await p.waitForTimeout(500);
  await clic("x.getAttribute('aria-label') === 'Plein écran' && !!x.offsetParent"); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
  // Attendre l'heure voulue sur l'horloge de l'application (24 h en 60 s).
  const heure = () => p.evaluate(() => { const m = document.body.innerText.match(/(\d\d):(\d\d) · \d/); return m ? +m[1] + +m[2] / 60 : -1; });
  for (let k = 0; k < 400; k++) { const h = await heure(); if (h >= plan.heure[0] && h < plan.heure[1]) break; await p.waitForTimeout(150); }
  const cdp = await c.newCDPSession(p);
  const images = [];
  cdp.on('Page.screencastFrame', (f) => { images.push({ t: f.metadata.timestamp, data: Buffer.from(f.data, 'base64') }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920 });
  await p.waitForTimeout(150);
  const t0 = Date.now() / 1000;
  await p.evaluate(SURCOUCHE, [plan.phrase, plan.carte ?? null, plan.duree]);
  await p.waitForTimeout(plan.duree * 1000 + 400);
  await cdp.send('Page.stopScreencast');
  await c.close();
  const out = D(`plan-${plan.nom}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', out]);
  const debut = images.find((x) => x.t >= t0)?.t ?? images[0].t;
  let k = 0;
  for (let n = 0; n < Math.round(plan.duree * FPS); n++) {
    const tt = debut + n / FPS;
    while (k + 1 < images.length && images[k + 1].t <= tt) k++;
    if (!ff.stdin.write(images[k].data)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log(plan.nom, images.length, 'images reçues');
  return out;
}

(async () => {
  const b = await chromium.launch();
  const fichiers = [];
  for (const plan of PLANS) fichiers.push(await filmer(b, plan));
  await b.close();
  // Fondus enchaînés entre les plans.
  const [d1, d2] = PLANS.map((x) => x.duree);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...fichiers.flatMap((f) => ['-i', f]),
    '-filter_complex', `[0:v][1:v]xfade=transition=fade:duration=${FONDU}:offset=${d1 - FONDU}[a];[a][2:v]xfade=transition=fade:duration=${FONDU}:offset=${d1 + d2 - 2 * FONDU},format=yuv420p[v]`,
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-r', String(FPS), D('vues-video.mp4')]);
  console.log('vidéo', D('vues-video.mp4'));
})();
