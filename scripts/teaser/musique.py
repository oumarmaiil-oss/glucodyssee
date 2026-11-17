"""Musique originale du teaser (30 s), synthétisée : aucune boucle ni échantillon extérieur.
Structure calée sur le montage : 0-9 s montée douce, 9-17 s pulsation, 16 s montée + impact à 17 s (atelier Ramadan),
17-27 s thème complet, 27 s accord final et extinction."""
import numpy as np, wave, sys

SR = 44100
DUREE = 30.0
BPM = 112
BEAT = 60 / BPM
N = int(SR * DUREE)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

def env_adsr(n, a=0.01, d=0.1, s=0.7, r=0.2):
    e = np.ones(n); na, nd, nr = int(a * SR), int(d * SR), int(r * SR)
    na = min(na, n); e[:na] = np.linspace(0, 1, na)
    nd = min(nd, max(0, n - na)); e[na:na + nd] = np.linspace(1, s, nd); e[na + nd:] = s
    nr = min(nr, n); e[n - nr:] *= np.linspace(1, 0, nr)
    return e

def ajoute(sig, debut, gain=1.0, pan=0.0):
    i = int(debut * SR); j = min(N, i + len(sig))
    if i >= N: return
    s = sig[:j - i] * gain
    L[i:j] += s * np.sqrt((1 - pan) / 2) * 1.414 / 1.414
    R[i:j] += s * np.sqrt((1 + pan) / 2)

def note(f, dur, kind='pad'):
    n = int(dur * SR); tt = np.arange(n) / SR
    if kind == 'pad':
        sig = sum(np.sin(2 * np.pi * f * h * tt * (1 + det)) / h for h in (1, 2, 3, 4) for det in (-0.003, 0.003))
        sig *= env_adsr(n, 0.9, 0.5, 0.8, 1.2) * 0.12
    elif kind == 'pluck':
        sig = (np.sin(2 * np.pi * f * tt) + 0.5 * np.sin(2 * np.pi * 2 * f * tt) + 0.2 * np.sin(2 * np.pi * 3 * f * tt)) * np.exp(-tt * 5.5) * 0.22
        sig *= env_adsr(n, 0.004, 0.05, 1, 0.05)
    elif kind == 'basse':
        sig = (np.sin(2 * np.pi * f * tt) + 0.35 * np.sin(2 * np.pi * 2 * f * tt)) * env_adsr(n, 0.01, 0.2, 0.75, 0.12) * 0.32
    elif kind == 'cloche':
        sig = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * 2.76 * f * tt) + 0.2 * np.sin(2 * np.pi * 5.4 * f * tt)) * np.exp(-tt * 2.2) * 0.16
    return sig

def kick(gain=1.0):
    n = int(0.35 * SR); tt = np.arange(n) / SR
    f = 46 + 110 * np.exp(-tt * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9) * 0.9 * gain

def hat(gain=1.0):
    n = int(0.06 * SR); x = np.random.randn(n); x = np.diff(np.concatenate([[0], x]))
    return x * np.exp(-np.arange(n) / SR * 70) * 0.09 * gain

def clap():
    n = int(0.18 * SR); x = np.random.randn(n)
    e = np.exp(-np.arange(n) / SR * 22); e[:int(0.012 * SR)] *= 1.6
    return np.convolve(x, np.ones(6) / 6, 'same') * e * 0.22

def riser(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = np.random.randn(n); out = np.zeros(n); a = 0.0
    for k in range(0, n, 512):  # filtre passe-bas qui s'ouvre
        alpha = 0.02 + 0.6 * (k / n) ** 2
        seg = x[k:k + 512]; y = np.zeros_like(seg)
        for m in range(len(seg)): a += alpha * (seg[m] - a); y[m] = a
        out[k:k + 512] = y
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 900 * (tt / dur) ** 2) / SR) * 0.15
    return (out * 0.5 + sweep) * (tt / dur) ** 2

def impact():
    n = int(2.5 * SR); tt = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tt * 6)) / SR) * np.exp(-tt * 2.2)
    bruit = np.random.randn(n) * np.exp(-tt * 5) * 0.25
    return (boom + bruit) * 0.8

# Grille : la mineur — fa — do — sol (Am F C G), 2 mesures de 4 temps par accord.
ACC = [(220.0, 261.63, 329.63), (174.61, 220.0, 261.63), (130.81, 164.81, 196.0), (196.0, 246.94, 293.66)]
BASSE = [110.0, 87.31, 65.41, 98.0]
MESURE = 4 * BEAT
ARP = [0, 1, 2, 1, 2, 0, 2, 1]

pos, k = 0.0, 0
while pos < DUREE - 0.5:
    acc = ACC[k % 4]
    for f in acc: ajoute(note(f, MESURE * 2 + 0.6, 'pad'), pos, 1.0 if pos < 27 else 0.0, pan=(f % 3 - 1) * 0.3)
    if 9 <= pos < 27:
        for b in range(8): ajoute(note(BASSE[k % 4], BEAT * 0.9, 'basse'), pos + b * BEAT)
    if 4.3 <= pos < 27:
        for s in range(16):
            f = acc[ARP[s % 8]] * (2 if pos >= 17 else 1)
            ajoute(note(f, BEAT / 2 * 0.95, 'pluck'), pos + s * BEAT / 2, 0.8 if pos >= 17 else 0.55, pan=0.35 if s % 2 else -0.35)
    pos += MESURE * 2; k += 1

# Percussions.
b = 0.0
while b < 27:
    if b >= 9: ajoute(kick(0.8 if b < 17 else 1.0), b)
    if b >= 17 and int(round(b / BEAT)) % 2 == 1: ajoute(clap(), b, pan=0.1)
    if b >= 9: ajoute(hat(0.7), b + BEAT / 2, pan=0.4)
    if b >= 17: ajoute(hat(0.5), b + BEAT / 4, pan=-0.4); ajoute(hat(0.5), b + 3 * BEAT / 4, pan=-0.4)
    b += BEAT

# Montée et impact (arrivée de l'atelier Ramadan à 17 s), cloches aux temps forts du montage.
ajoute(riser(2.2), 17.0 - 2.2, 0.9)
ajoute(impact(), 17.0, 1.0)
for tt0, f in [(0.2, 880.0), (2.9, 659.25), (9.0, 783.99), (13.0, 659.25), (19.4, 523.25), (23.8, 880.0)]:
    ajoute(note(f, 2.5, 'cloche'), tt0, 0.9, pan=0.2)
# Accord final (27 s) : la mineur ouvert, long.
for f in (110.0, 220.0, 329.63, 440.0, 523.25): ajoute(note(f, 3.0, 'pad') * 1.6, 27.0)
ajoute(impact() * 0.7, 27.0)
ajoute(note(880.0, 3.0, 'cloche'), 27.0, 1.0)

# Arc dynamique : douce au début, plus présente à 9 s, pleine à partir de l'impact (17 s).
arc = np.interp(t, [0, 8.8, 9.2, 16.8, 17.0, 30], [0.42, 0.5, 0.68, 0.78, 1.0, 1.0])
L *= arc; R *= arc
# Réverbération légère (convolution avec un bruit décroissant), compression douce, fondus.
ir_n = int(1.6 * SR); ir = np.random.randn(ir_n) * np.exp(-np.arange(ir_n) / SR * 3.2) * 0.012; ir[0] = 1.0
def conv(x):
    m = len(x) + ir_n - 1; F = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, F) * np.fft.rfft(ir, F), F)[:len(x)]
L, R = conv(L), conv(R)
for ch in (L, R):
    ch[:] = np.tanh(ch * 1.4) / np.tanh(1.4)
fi, fo = int(0.4 * SR), int(1.8 * SR)
for ch in (L, R):
    ch[:fi] *= np.linspace(0, 1, fi); ch[-fo:] *= np.linspace(1, 0, fo) ** 1.5
m = max(np.abs(L).max(), np.abs(R).max()); L, R = L / m * 0.89, R / m * 0.89
st = (np.stack([L, R], 1) * 32767).astype(np.int16)
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'musique.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print('musique ok')
