// Teaser vertical (TikTok, Reels, Shorts, statut WhatsApp) : 1080×1920, 15 s, enregistré en temps réel.
// Le déroulé (textes, toucher, clics) est joué dans la page ; Chrome envoie les images au fil de l'eau (screencast).
// Usage : node tiktok.cjs [url]   →   tiktok-video.mp4 (sans son), puis monter-tiktok.sh ajoute la musique.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const URL = process.argv[2] || 'http://localhost:4180/glucodyssee/';
const DUREE = 15, FPS = 30;
const OUT = path.join(__dirname, 'tiktok-video.mp4');

// Déroulé joué dans la page (temps en secondes depuis le départ).
const SCENARIO = () => {
  const css = `
  #tk{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#fff}
  #tk .cap{position:absolute;left:12px;right:12px;top:10px;background:rgba(7,10,18,.9);border-left:4px solid #f5a524;border-radius:14px;padding:10px 13px;box-shadow:0 8px 24px rgba(0,0,0,.5);transition:none}
  #tk .cap i{display:inline-block;margin-bottom:5px;padding:1px 8px;border-radius:99px;background:#a78bfa;color:#0b0f1c;font:800 10px/1.6 "Plus Jakarta Sans",sans-serif;letter-spacing:.08em;font-style:normal}
  #tk .cap b{display:block;font-family:Fraunces,Georgia,serif;font-size:23px;line-height:1.12}
  #tk .cap span{display:block;margin-top:4px;font-size:13px;line-height:1.3;color:#cbd5e1}
  #tk .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:28px;text-align:center;background:radial-gradient(ellipse at 50% 38%,rgba(42,33,18,.95),rgba(7,10,18,.97) 72%)}
  #tk .card img{width:84px;height:84px;border-radius:22px;box-shadow:0 0 50px rgba(245,165,36,.5)}
  #tk .card h1{margin:4px 0 0;font-family:Fraunces,Georgia,serif;font-size:40px;line-height:1.05}
  #tk .card h2{margin:0;font-family:Fraunces,Georgia,serif;font-size:27px;line-height:1.15}
  #tk .card p{margin:0;font-size:15px;line-height:1.35;color:#cbd5e1}
  #tk .card .url{font-weight:800;color:#f5a524;font-size:15px}
  #tk .card .pied{margin-top:10px;font-size:11.5px;color:#94a3b8}
  #tk .tap{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;background:rgba(255,255,255,.12);border:3px solid #f5a524;box-shadow:0 4px 12px rgba(0,0,0,.45)}
  #tk .rip{position:absolute;border:3px solid #f5a524;border-radius:50%;transform:translate(-50%,-50%)}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const z = document.createElement('div'); z.id = 'tk';
  z.innerHTML = '<div class="cap"><i></i><b></b><span></span></div><div class="rip"></div><div class="tap"></div><div class="card"></div>';
  document.body.appendChild(z);
  const cap = z.querySelector('.cap'), tap = z.querySelector('.tap'), rip = z.querySelector('.rip'), card = z.querySelector('.card');
  const panneau = () => document.querySelector('[aria-label="Atelier jeûner en sécurité"]');
  const bouton = (txt) => [...(panneau()?.querySelectorAll('button') ?? [])].find((b) => b.textContent.trim() === txt);
  const centre = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const fade = (t, a, b, d = 0.3) => Math.max(0, Math.min(1, (t - a) / d, (b - t) / d));
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
  const HOOK = '<h2>Ramadan et diabète</h2><p style="font-size:18px;color:#fff;max-width:300px">Certains comprimés font chuter le sucre<br>en plein jeûne.</p><p>Regardez la courbe.</p>';
  const FIN = '<img src="icon-512.png"><h1>Glucodyssée</h1><p>Comprendre le diabète en 2D et en 3D</p><p class="url">oumarmaiil-oss.github.io/glucodyssee</p><p>Gratuit · téléphone et ordinateur</p><p class="pied">Simulation pédagogique (guide IDF-DAR 2021).<br>Ne changez jamais votre traitement sans votre médecin.</p>';
  const clics = [[4.0, '+ glibenclamide'], [8.1, 'Suivant'], [8.9, '+ iDPP-4']];
  const faits = new Set();
  let cible = { x: 300, y: 330 }, depuis = { x: 300, y: 330 }, tDep = 0, tArr = 0, tClic = -9;
  const viser = (txt, t, duree) => { const b = bouton(txt); if (!b) return; depuis = { ...posTap(t) }; cible = centre(b); tDep = t; tArr = t + duree; };
  const posTap = (t) => { const k = tArr > tDep ? ease((t - tDep) / (tArr - tDep)) : 1; return { x: depuis.x + (cible.x - depuis.x) * k, y: depuis.y + (cible.y - depuis.y) * k }; };
  window.__debut = performance.now();
  const boucle = () => {
    const t = (performance.now() - window.__debut) / 1000;
    if (t > 3.1 && !faits.has('v1')) { faits.add('v1'); viser('+ glibenclamide', t, 0.8); }
    if (t > 7.3 && !faits.has('v2')) { faits.add('v2'); viser('Suivant', t, 0.7); }
    for (const [tc, txt] of clics) if (t >= tc && !faits.has(txt + tc)) { faits.add(txt + tc); bouton(txt)?.click(); tClic = t; if (txt === 'Suivant') setTimeout(() => viser('+ iDPP-4', (performance.now() - window.__debut) / 1000, 0.5), 60); }
    const titre = t < 4.3 ? ['Atelier Ramadan', 'Un patient de type 2 jeûne du sahur au ndogu'] : t < 9.2 ? ['Glibenclamide : le sucre chute', 'Sous 0,70 g/L en plein jeûne : il faudrait rompre le jeûne'] : ['iDPP-4 : pas d\'hypoglycémie', 'La journée de jeûne se passe sans danger'];
    cap.querySelector('i').textContent = 'GLUCODYSSÉE'; cap.querySelector('b').textContent = titre[0]; cap.querySelector('span').textContent = titre[1];
    cap.style.opacity = fade(t, 2.4, 12.0); cap.style.transform = `translateY(${(1 - fade(t, 2.4, 99)) * -12}px)`;
    const p = posTap(t); tap.style.left = p.x + 'px'; tap.style.top = p.y + 'px'; tap.style.opacity = fade(t, 3.0, 10.2) * 0.95;
    const r = (t - tClic) / 0.45; rip.style.opacity = r >= 0 && r <= 1 ? 1 - r : 0; rip.style.left = p.x + 'px'; rip.style.top = p.y + 'px'; rip.style.width = rip.style.height = 12 + r * 50 + 'px';
    const html = t < 6 ? HOOK : FIN; if (card.dataset.h !== html) { card.innerHTML = html; card.dataset.h = html; }
    card.style.opacity = t < 6 ? fade(t, -1, 2.5, 0.35) : fade(t, 12.0, 99, 0.45);
    if (t < 16) requestAnimationFrame(boucle);
  };
  requestAnimationFrame(boucle);
};

(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const p = await c.newPage();
  await p.addInitScript(() => { localStorage.setItem('gluco.niveau', '2'); localStorage.setItem('gluco.bandeau-installer', '1'); });
  await p.goto(URL); await p.waitForTimeout(2500);
  // Préparation : atelier Ramadan ouvert, étape 2 (« ajoutez le glibenclamide »).
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Jeûner en sécurité'))?.click());
  await p.waitForTimeout(1200);
  await p.evaluate(() => [...document.querySelectorAll('[aria-label="Atelier jeûner en sécurité"] button')].find((x) => x.textContent.trim() === 'Suivant')?.click());
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(1500);

  const cdp = await c.newCDPSession(p);
  const images = [];
  cdp.on('Page.screencastFrame', async (f) => { images.push({ t: f.metadata.timestamp, data: Buffer.from(f.data, 'base64') }); cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  await p.waitForTimeout(300);
  const t0 = Date.now() / 1000;
  await p.evaluate(SCENARIO);
  await p.waitForTimeout(DUREE * 1000 + 600);
  await cdp.send('Page.stopScreencast');
  await b.close();

  // Images à cadence fixe : pour chaque instant, la dernière image reçue.
  const debut = images.find((x) => x.t >= t0)?.t ?? images[0].t;
  console.log('images reçues', images.length, '≈', (images.length / (DUREE + 0.9)).toFixed(1), 'i/s');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1080:1920:flags=lanczos', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', OUT]);
  let k = 0;
  for (let n = 0; n < DUREE * FPS; n++) {
    const tt = debut + n / FPS;
    while (k + 1 < images.length && images[k + 1].t <= tt) k++;
    if (!ff.stdin.write(images[k].data)) await new Promise((r) => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r));
  console.log('vidéo', OUT);
})();
