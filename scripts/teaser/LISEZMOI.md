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
