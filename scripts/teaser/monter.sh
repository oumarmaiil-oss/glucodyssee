#!/usr/bin/env bash
# Montage du teaser : 4 séquences (9 + 4 + 4 + 13 s) + musique → teaser-glucodyssee.mp4 (1920×1080, 30 i/s).
set -euo pipefail
cd "$(dirname "$0")"
python3 musique.py musique.wav
printf "file 'seq-corps.mp4'\nfile 'seq-molecule.mp4'\nfile 'seq-ilot.mp4'\nfile 'seq-ramadan.mp4'\n" > liste.txt
ffmpeg -y -loglevel error -f concat -safe 0 -i liste.txt -i musique.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -shortest -movflags +faststart \
  -metadata title="Glucodyssée — teaser" -metadata artist="Dr O. Sow" teaser-glucodyssee.mp4
ffprobe -v error -show_entries format=duration,size -show_entries stream=codec_name,width,height,r_frame_rate -of compact teaser-glucodyssee.mp4
