// Tournage image par image d'une séquence du teaser (1920×1080, 30 i/s, horloge virtuelle).
// Usage : node tourner.cjs <sequence>   (corps | molecule | ilot | ramadan)
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const SEQ = process.argv[2];
const FPS = 30, DT = 1000 / FPS;
const URL = 'http://localhost:4180/glucodyssee/';
const OUT = path.join(__dirname, `seq-${SEQ}.mp4`);

const ease = (t) => (t < 0 ? 0 : t > 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const fade = (t, a, b, d = 0.35) => Math.max(0, Math.min(1, (t - a) / d, (b - t) / d));

const OVERLAY = () => {
  const css = `
  #tz{position:fixed;inset:0;pointer-events:none;z-index:99999;font-family:"Plus Jakarta Sans",system-ui,sans-serif}
  #tz .cadre{position:absolute;left:0;top:0;width:1280px;height:720px;transform-origin:0 0}
  #tz .cap{position:absolute;left:34px;top:58px;max-width:560px;background:rgba(7,10,18,.86);border-left:4px solid #f5a524;border-radius:12px;padding:12px 18px 13px;box-shadow:0 10px 30px rgba(0,0,0,.45)}
  #tz .cap b{display:block;font-family:Fraunces,Georgia,serif;font-size:27px;line-height:1.15;color:#fff;font-weight:700}
  #tz .cap span{display:block;margin-top:5px;font-size:14.5px;line-height:1.35;color:#cbd5e1}
  #tz .badge{display:inline-block;margin-bottom:7px;padding:2px 9px;border-radius:999px;background:#a78bfa;color:#0b0f1c;font-size:11.5px;font-weight:800;letter-spacing:.08em}
  #tz .card{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;background:radial-gradient(ellipse at 50% 40%,rgba(42,33,18,.94),rgba(7,10,18,.97) 70%);color:#e9eef8;text-align:center}
  #tz .card img{width:112px;height:112px;border-radius:28px;box-shadow:0 0 60px rgba(245,165,36,.45)}
  #tz .card h1{font-family:Fraunces,Georgia,serif;font-size:62px;margin:6px 0 0;font-weight:700;letter-spacing:-.01em}
  #tz .card p{margin:0;font-size:20px;color:#cbd5e1}
  #tz .card .url{margin-top:12px;font-size:19px;font-weight:700;color:#f5a524}
  #tz .card .sig{margin-top:4px;font-size:14px;color:#94a3b8}
  #tz .cur{position:absolute;width:26px;height:26px;margin:-3px 0 0 -4px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.6))}
  #tz .rip{position:absolute;border:3px solid #f5a524;border-radius:50%;transform:translate(-50%,-50%)}`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const z = document.createElement('div'); z.id = 'tz';
  z.innerHTML = `<div class="cadre"><div class="cap" style="opacity:0"><i class="badge" style="display:none"></i><b></b><span></span></div><div class="card" style="opacity:0"></div></div>
    <div class="rip" style="opacity:0"></div>
    <svg class="cur" viewBox="0 0 24 24" style="opacity:0"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#0b0f1c" stroke-width="1.6" stroke-linejoin="round"/></svg>
`;
  document.body.appendChild(z);
  window.__tz = (o) => {
    const cad = z.querySelector('.cadre'); if (o.cam) { cad.style.left = o.cam.x + 'px'; cad.style.top = o.cam.y + 'px'; cad.style.transform = `scale(${o.cam.w / 1280})`; }
    const cap = z.querySelector('.cap'), cur = z.querySelector('.cur'), rip = z.querySelector('.rip'), card = z.querySelector('.card');
    cap.style.opacity = o.capO ?? 0; cap.style.transform = `translateY(${(1 - (o.capO ?? 0)) * 10}px)`;
    if (o.titre !== undefined) cap.querySelector('b').textContent = o.titre;
    if (o.sous !== undefined) cap.querySelector('span').textContent = o.sous;
    const bd = cap.querySelector('.badge'); bd.style.display = o.badge ? 'inline-block' : 'none'; bd.textContent = o.badge || '';
    cur.style.opacity = o.curO ?? 0; if (o.cx !== undefined) { cur.style.left = o.cx + 'px'; cur.style.top = o.cy + 'px'; }
    const r = o.rip ?? -1; if (r >= 0 && r <= 1) { rip.style.opacity = 1 - r; rip.style.left = o.cx + 'px'; rip.style.top = o.cy + 'px'; rip.style.width = rip.style.height = 10 + r * 46 + 'px'; } else rip.style.opacity = 0;
    card.style.opacity = o.cardO ?? 0; if (o.cardHtml !== undefined && card.dataset.h !== o.cardHtml) { card.innerHTML = o.cardHtml; card.dataset.h = o.cardHtml; }
  };
};

(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-gpu-vsync'] });
  const c = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 2.25 });
  const p = await c.newPage();
  await p.clock.install();
  await p.addInitScript(() => { localStorage.setItem('gluco.niveau', '2'); localStorage.setItem('gluco.bandeau-installer', '1'); });
  await p.goto(URL);
  await p.clock.runFor(2000); await p.waitForTimeout(1500); await p.clock.runFor(1000); await p.waitForTimeout(300);
  await p.evaluate(OVERLAY);
  const cdp = await c.newCDPSession(p);

  // Outils.
  const centre = async (sel, texte, n = 0) => p.evaluate(([sel, texte, n]) => {
    const els = [...document.querySelectorAll(sel)].filter((e) => !texte || e.textContent.trim() === texte || e.getAttribute('aria-label') === texte);
    const e = els[n]; if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, [sel, texte, n]);
  const cliquer = async (sel, texte, n = 0) => {
    const ok = await p.evaluate(([sel, texte, n]) => { const els = [...document.querySelectorAll(sel)].filter((e) => !texte || e.textContent.trim() === texte || e.getAttribute('aria-label') === texte); const e = els[n]; if (e) e.click(); return !!e; }, [sel, texte, n]);
    if (!ok) console.error('introuvable', sel, texte);
    await p.waitForTimeout(120);
  };
  const avancer = async (ms) => { await p.clock.runFor(ms); };

  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-vf', 'scale=1920:1080:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), OUT]);
  let clip = null;
  const image = async () => { const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true, clip }); ff.stdin.write(Buffer.from(data, 'base64')); };

  // Une séquence : liste d'actions horodatées (s) + fonction d'état de l'overlay par instant.
  let plan = [], etat = () => ({}), duree = 0;
  const PLEIN = { x: 0, y: 0, w: 1280 };
  const sc = await centre('[data-testid=scene]');
  const rs = await p.evaluate(() => { const r = document.querySelector('[data-testid=scene]').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  const SCENE_HAUT = { x: rs.x - 4, y: rs.y - 6, w: rs.w + 8 };
  const SCENE_BAS = { x: rs.x - 4, y: rs.y + rs.h + 6 - (rs.w + 8) * 9 / 16, w: rs.w + 8 };
  let camera = () => SCENE_HAUT;
  const mix = (a, b, k) => ({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, w: a.w + (b.w - a.w) * k });
  const posCur = { x: 900, y: 500 };
  // Déplacements du curseur : [t0, t1, cible]
  let trajets = [];
  const curA = (t) => {
    let x = posCur.x, y = posCur.y;
    for (const [t0, t1, a, bb] of trajets) { if (t >= t1) { x = bb.x; y = bb.y; } else if (t > t0) { const k = ease((t - t0) / (t1 - t0)); x = a.x + (bb.x - a.x) * k; y = a.y + (bb.y - a.y) * k; } }
    return { x, y };
  };

  if (SEQ === 'corps') {
    duree = 9;
    await cliquer('button', 'Zoomer'); await avancer(600); await p.waitForTimeout(200);
    const agir = await centre('button', 'Agir maintenant : manger, bouger');
    const intro = `<img src="icon-512.png"><h1>Glucodyssée</h1><p>Le voyage du sucre, du repas aux organes</p><p class="sig">Simulateur pédagogique du diabète · 2D et 3D</p>`;
    camera = (t) => mix(PLEIN, SCENE_HAUT, ease((t - 2.3) / 1.1));
    trajets = [[3.4, 4.3, { x: 700, y: 400 }, agir]];
    plan = [[4.4, async () => { await cliquer('button', 'Agir maintenant : manger, bouger'); const r = await centre('[role=menuitem]', null, 2); trajets.push([4.7, 5.4, agir, r]); }],
      [5.5, async () => { await cliquer('[role=menuitem]', null, 2); }]];
    etat = (t) => ({
      cardO: fade(t, -1, 2.6, 0.45), cardHtml: intro,
      capO: fade(t, 2.9, 9.4), titre: t < 5.8 ? 'Suivez le sucre, du repas aux organes' : 'Un repas entre… et devient glucose',
      sous: t < 5.8 ? 'Chaque flèche est chiffrée en grammes par heure' : 'L\'intestin coupe l\'amidon ; le foie, les muscles et le cerveau le reçoivent',
      curO: fade(t, 3.3, 6.3), rip: t > 4.4 && t < 4.9 ? (t - 4.4) / 0.5 : t > 5.5 && t < 6 ? (t - 5.5) / 0.5 : -1,
    });
  } else if (SEQ === 'molecule') {
    duree = 4;
    await cliquer('button.bg-miel', 'Glucose'); await avancer(900); await p.waitForTimeout(200);
    etat = (t) => ({ capO: fade(t, 0.15, 4.4), titre: 'Suivez une molécule de glucose', sous: 'La caméra la suit ; un journal explique chaque étape et sa raison' });
  } else if (SEQ === 'ilot') {
    duree = 4;
    await cliquer('button', 'Îlot'); await avancer(400); await p.waitForTimeout(300);
    await cliquer('button', '3D'); await p.waitForTimeout(2500); await avancer(600); await p.waitForTimeout(500);
    // L'îlot tourne seul (rotation automatique) ; on masque l'astuce « glissez pour tourner ».
    await p.addStyleTag({ content: '[data-testid=scene] [role=note]{display:none!important}' });
    plan = [];
    etat = (t) => ({ capO: fade(t, 0.15, 4.4), titre: 'L\'îlot de Langerhans en 3D', sous: 'Cellules bêta, alpha et delta : l\'insuline et le glucagon en direct' });
  } else if (SEQ === 'ramadan') {
    duree = 13;
    await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find((x) => x.textContent.includes('Jeûner en sécurité')); e && e.click(); });
    await p.waitForTimeout(400); await avancer(800); await p.waitForTimeout(300);
    await cliquer('[aria-label="Atelier jeûner en sécurité"] button', 'Suivant'); await avancer(300); await p.waitForTimeout(300);
    const glib = await centre('[aria-label="Atelier jeûner en sécurité"] button', '+ glibenclamide');
    camera = (t) => mix(SCENE_BAS, PLEIN, ease((t - 9.6) / 0.5));
    trajets = [[0.9, 2.0, { x: 600, y: 300 }, glib]];
    plan = [[2.2, async () => { await cliquer('[aria-label="Atelier jeûner en sécurité"] button', '+ glibenclamide'); const s = await centre('[aria-label="Atelier jeûner en sécurité"] button', 'Suivant'); trajets.push([4.9, 5.6, glib, s]); }],
      [5.8, async () => { await cliquer('[aria-label="Atelier jeûner en sécurité"] button', 'Suivant'); const s = await centre('[aria-label="Atelier jeûner en sécurité"] button', 'Suivant'); const d = await centre('[aria-label="Atelier jeûner en sécurité"] button', '+ iDPP-4'); trajets.push([6.0, 6.7, s, d]); }],
      [6.9, async () => { await cliquer('[aria-label="Atelier jeûner en sécurité"] button', '+ iDPP-4'); }]];
    const fin = `<img src="icon-512.png"><h1>Glucodyssée</h1><p>Gratuit · sur téléphone, tablette et ordinateur</p><p class="url">oumarmaiil-oss.github.io/glucodyssee</p><p class="sig">Conçu par le Dr O. Sow, pharmacien · Dakar</p>`;
    etat = (t) => ({
      capO: fade(t, 0.1, 9.8), badge: 'NOUVEAU',
      titre: t < 2.4 ? 'Jeûner en sécurité pendant le Ramadan' : t < 7.1 ? 'Glibenclamide : hypoglycémie en plein jeûne' : 'iDPP-4 : la journée passe sans hypoglycémie',
      sous: t < 2.4 ? 'Un patient de type 2 jeûne du sahur au ndogu : quel traitement ?' : t < 7.1 ? 'La courbe passe sous 0,70 g/L : il faudrait rompre le jeûne' : 'Courbes du moteur calibré · repères du guide IDF-DAR 2021',
      curO: fade(t, 0.8, 7.6), rip: t > 2.2 && t < 2.7 ? (t - 2.2) / 0.5 : t > 5.8 && t < 6.3 ? (t - 5.8) / 0.5 : t > 6.9 && t < 7.4 ? (t - 6.9) / 0.5 : -1,
      cardO: fade(t, 10.0, 99, 0.5), cardHtml: fin,
    });
  }

  const n = Math.round(duree * FPS);
  let k = 0;
  const t0 = Date.now();
  for (let f = 0; f < n; f++) {
    const t = f / FPS;
    while (k < plan.length && plan[k][0] <= t) { await plan[k][1](); k++; }
    const cp = curA(t);
    const cam = camera(t); cam.h = cam.w * 9 / 16;
    await p.evaluate((o) => window.__tz(o), { ...etat(t), cx: cp.x, cy: cp.y, cam });
    clip = { x: cam.x, y: cam.y, width: cam.w, height: cam.h, scale: 1920 / cam.w };
    if (typeof glisser === 'function') await glisser(t);
    if (!process.env.TEST) await image(); else if (f % 15 === 0) { const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip }); require('fs').writeFileSync(path.join(__dirname, `test-${SEQ}-${String(f).padStart(3, '0')}.jpg`), Buffer.from(data, 'base64')); }
    await avancer(DT);
    if (f % 30 === 0) console.log(SEQ, `${f}/${n}`, Math.round((Date.now() - t0) / 1000) + ' s');
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await b.close();
  console.log(SEQ, 'terminé', OUT);
})();
