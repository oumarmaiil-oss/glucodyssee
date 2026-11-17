# Teaser de 30 secondes

Fabriqué à partir de la vraie application : rien n'est truqué, les courbes et les chiffres viennent du moteur.

1. `npm run build` puis `npx vite preview --port 4180` (l'application sur http://localhost:4180/glucodyssee/).
2. Tourner les 4 séquences, en parallèle si la machine le permet (Chromium et Playwright requis, horloge virtuelle :
   chaque image est calculée à intervalle exact, la vidéo est donc parfaitement fluide) :
   `node tourner.cjs corps`, `node tourner.cjs molecule`, `node tourner.cjs ilot`, `node tourner.cjs ramadan`.
3. `./monter.sh` : génère la musique (`musique.py`, composition originale synthétisée, sans échantillon extérieur,
   donc libre de droits) et assemble `teaser-glucodyssee.mp4` (1920×1080, 30 images/s, H.264 + AAC).

Plan : 0-9 s vue Corps (un repas entre et devient glucose) · 9-13 s suivre une molécule · 13-17 s îlot en 3D ·
17-27 s **fonction phare : l'atelier « Jeûner en sécurité » (Ramadan)** · 27-30 s carte de fin.

## Version verticale de 15 secondes (TikTok, Reels, Shorts, statut WhatsApp)

Fabriquée en moins d'une minute : enregistrement en temps réel (le déroulé est joué dans la page), 1080×1920.

1. Application servie sur http://localhost:4180/glucodyssee/ (comme ci-dessus).
2. `node tiktok.cjs` → `tiktok-video.mp4` (sans son).
3. Musique de 15 s calée sur le montage :
   `DUREE=15 T_PULSE=1.2 T_ARP=0.6 T_IMP=2.6 T_FIN=12.2 python3 musique.py musique15.wav`
4. Assemblage :
   `ffmpeg -i tiktok-video.mp4 -i musique15.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart glucodyssee-ramadan-15s-vertical.mp4`

Résultat publié : `docs/videos/glucodyssee-ramadan-15s-vertical.mp4`. La carte de fin rappelle qu'il s'agit d'une
simulation pédagogique et qu'on ne change jamais son traitement sans son médecin.

## Version verticale de 30 secondes : 3 situations, 3 courbes

Trois logiques différentes, toutes tirées de l'application : Ramadan (choisir un médicament sûr pour le jeûne),
type 2 + metformine (traitement de fond, courbe en pointillés « sans traitement »), type 1 + insuline (traitement vital).
Environ 50 secondes de fabrication.

1. `node tiktok3.cjs` → `tiktok3-video.mp4`
2. `DUREE=30 T_PULSE=1.2 T_ARP=0.6 T_IMP=2.6 T_FIN=26.8 python3 musique.py musique30v.wav`
3. `ffmpeg -i tiktok3-video.mp4 -i musique30v.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart glucodyssee-3-situations-30s-vertical.mp4`

Résultat publié : `docs/videos/glucodyssee-3-situations-30s-vertical.mp4`.

## Version verticale de 20 secondes (recommandée)

Même trio, plus lisible : une carte plein écran « 1/3, 2/3, 3/3 » entre les cas (le changement se fait derrière),
une seule phrase à la fois, un seul geste par cas.

1. `node tiktok20.cjs` → `tiktok20-video.mp4`
2. `DUREE=20 T_PULSE=0.8 T_ARP=0.4 T_IMP=2.0 T_FIN=17.2 python3 musique.py musique20.wav`
3. Assemblage ffmpeg comme ci-dessus → `docs/videos/glucodyssee-3-situations-20s-vertical.mp4`.
