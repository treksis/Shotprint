#!/usr/bin/env python3
"""Write an original score (synthesized here, no samples, no source melody) on the grid of an existing score.

    python3 docs/pitch/own_score.py SRC.wav OUT.wav PRESET [--bpm N] [--bar0 S]

Tempo and first bar come from `bin/template beats`-style detection passed in (--bpm, --bar0), so cuts made
on the old score's bars still land on bars. The loudness envelope of SRC is followed (300 ms window), so the
new score drops out, builds and ends where the old one did, at the same loudness; nothing else is taken.
Presets: pop quirky electro cinematic darkdrive anthem warm folk.
"""
import argparse, subprocess, sys, wave
import numpy as np

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("src"); ap.add_argument("out"); ap.add_argument("preset")
ap.add_argument("--bpm", type=float, required=True); ap.add_argument("--bar0", type=float, default=0.0)
ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
rng = np.random.default_rng(a.seed)


def load(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


src = load(a.src); N = len(src); T = N / SR
out = np.zeros((N, 2))
beat = 60.0 / a.bpm; bar = 4 * beat
t0 = a.bar0 - bar * np.ceil(a.bar0 / bar)  # first bar start at or before 0


def note_hz(m): return 440.0 * 2 ** ((m - 69) / 12)


def add(sig, at, pan=0.0, g=1.0):
    i = int(round(at * SR))
    if i >= N or i + len(sig) <= 0: return
    s0 = max(0, -i); sig = sig[s0:]; i += s0
    sig = sig[:N - i]
    out[i:i + len(sig), 0] += sig * g * np.sqrt(0.5 * (1 - pan))
    out[i:i + len(sig), 1] += sig * g * np.sqrt(0.5 * (1 + pan))


def env(n, att, dec):  # attack seconds, exponential decay time constant seconds
    t = np.arange(n) / SR
    return np.minimum(1, t / max(att, 1e-4)) * np.exp(-t / dec)


def additive(f, dur, partials, att=0.005, dec=0.5, detune=0.0):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k, (mult, amp, d) in enumerate(partials):
        if f * mult > 16000: break
        ph = rng.uniform(0, 2 * np.pi)
        s += amp * np.sin(2 * np.pi * f * mult * (1 + detune * (k % 3 - 1)) * t + ph) * np.exp(-t / (dec * d))
    return s * np.minimum(1, t / att)


def keys(f, dur): return additive(f, dur, [(1, 1, 1), (2, .45, .6), (3, .2, .4), (4, .12, .3), (5, .06, .2)], .004, .9)
def pluck(f, dur): return additive(f, dur, [(1, 1, 1), (2, .6, .5), (3, .35, .35), (4, .2, .25), (6, .08, .15)], .002, .35)
def pizz(f, dur): return additive(f, dur, [(1, 1, 1), (2, .4, .5), (3, .15, .3)], .003, .12)
def bell(f, dur): return additive(f, dur, [(1, 1, 1), (2.76, .4, .5), (5.4, .2, .3), (8.93, .1, .2)], .002, 1.2)


def pad(f, dur):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for det in (-0.006, 0, 0.0055):
        for h in range(1, 9):  # band-limited soft saw
            if f * h > 9000: break
            s += np.sin(2 * np.pi * f * (1 + det) * h * t + rng.uniform(0, 6.3)) / h ** 1.6
    a_, r_ = min(0.6, dur / 3), min(0.8, dur / 3)
    e = np.minimum(1, t / a_) * np.minimum(1, (dur - t) / r_)
    return s * e * 0.25


def bass(f, dur, short=False):
    n = int(dur * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    e = np.minimum(1, t / 0.004) * (np.exp(-t / 0.18) if short else np.minimum(1, (dur - t) / 0.03).clip(0))
    return s * e


def kick(g=1.0):
    n = int(0.45 * SR); t = np.arange(n) / SR
    f = 45 + 95 * np.exp(-t / 0.035)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) * g


def noise(n): return rng.standard_normal(n)


def hp(x, k=1): return np.diff(x, n=k, prepend=np.zeros(k))


SNARE = None
def snare():
    global SNARE
    if SNARE is None:
        n = int(0.25 * SR); t = np.arange(n) / SR
        SNARE = hp(noise(n)) * 0.5 * np.exp(-t / 0.06) + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.04)
    return SNARE


def hat(open_=False):
    n = int((0.3 if open_ else 0.06) * SR); t = np.arange(n) / SR
    return hp(noise(n), 2) * 0.25 * np.exp(-t / (0.09 if open_ else 0.015))


def tom(f):
    n = int(0.4 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(f * (1 + 0.5 * np.exp(-t / 0.05))) / SR) * np.exp(-t / 0.15)


def block():
    n = int(0.08 * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 820 * t) + .4 * np.sin(2 * np.pi * 1730 * t)) * np.exp(-t / 0.018)


# key root (MIDI), chord progression as scale-degree triads in semitones from the root
MAJ = [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]]          # I V vi IV
MIN = [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]]         # i VI III VII
WARM = [[0, 4, 7, 11], [9, 12, 16, 19], [5, 9, 12, 16], [7, 11, 14, 17]]  # Imaj7 vi7 IVmaj7 V
P = {
    "pop":        dict(root=60, prog=MAJ, drums="pop", lead=pluck, arp=8, bassmode="eighth", padg=.35),
    "quirky":     dict(root=65, prog=MAJ, drums="quirky", lead=pizz, arp=4, bassmode="half", padg=.0),
    "electro":    dict(root=57, prog=MIN, drums="four", lead=pluck, arp=16, bassmode="pulse", padg=.55),
    "cinematic":  dict(root=50, prog=MIN, drums="sparse", lead=bell, arp=2, bassmode="whole", padg=.8),
    "darkdrive":  dict(root=52, prog=MIN, drums="drive", lead=pluck, arp=8, bassmode="pulse16", padg=.5),
    "anthem":     dict(root=62, prog=MAJ, drums="anthem", lead=keys, arp=4, bassmode="eighth", padg=.6),
    "warm":       dict(root=58, prog=WARM, drums="shaker", lead=keys, arp=4, bassmode="half", padg=.35, bells=True),
    "folk":       dict(root=55, prog=MAJ, drums="none", lead=pluck, arp=8, bassmode="half", padg=.45),
}[a.preset]

r = P["root"]; nbar = int(np.ceil((T - t0) / bar)) + 1
for b in range(nbar):
    bs = t0 + b * bar
    ch = P["prog"][b % 4]
    # pad: the chord across the bar, an octave below
    if P["padg"]:
        for k, iv in enumerate(ch):
            add(pad(note_hz(r - 12 + iv), bar + 0.4), bs, pan=(k - 1) * 0.4, g=P["padg"] * 0.5)
    # arpeggio / chord hits
    steps = P["arp"]; step = bar / steps
    for s in range(steps):
        if P["lead"] is keys and s % 2: continue
        notes = [ch[s % len(ch)] + 12 * ((s // len(ch)) % 2)] if P["lead"] is not keys else ch
        for iv in notes:
            add(P["lead"](note_hz(r + iv), min(1.6, step * 3)), bs + s * step,
                pan=0.3 * np.sin(s), g=(0.32 if P["lead"] is not keys else 0.22) * (1.0 if s % 4 == 0 else 0.8))
    if P.get("bells") and b % 2 == 0:
        add(bell(note_hz(r + 24 + ch[-1]), 2.5), bs + 2 * beat, pan=0.4, g=0.12)
    # bass
    bm, root_hz = P["bassmode"], note_hz(r - 24 + ch[0])
    if bm == "whole": add(bass(root_hz, bar), bs, g=0.5)
    elif bm == "half":
        for h in range(2): add(bass(root_hz, 2 * beat), bs + h * 2 * beat, g=0.45)
    elif bm == "eighth":
        for e in range(8): add(bass(root_hz, beat / 2), bs + e * beat / 2, g=0.4)
    elif bm == "pulse":
        for e in range(8): add(bass(root_hz, beat / 2, short=True), bs + e * beat / 2, g=0.5)
    elif bm == "pulse16":
        for e in range(16): add(bass(root_hz, beat / 4, short=True), bs + e * beat / 4, g=0.42)
    # drums
    d = P["drums"]
    for q in range(4):
        bt = bs + q * beat
        if d in ("four", "drive", "pop"): add(kick(), bt, g=0.8)
        if d == "anthem" and q in (0, 2): add(kick(1.0), bt, g=0.9)
        if d == "sparse" and q == 0: add(kick(), bt, g=0.7)
        if d == "quirky" and q in (0, 2): add(kick(), bt, g=0.45)
        if d in ("pop", "drive", "anthem", "four") and q in (1, 3): add(snare(), bt, g=0.55 if d != "four" else 0.35)
        if d in ("pop", "four", "drive"): add(hat(), bt + beat / 2, pan=0.3, g=0.6)
        if d == "four":
            for s16 in (1, 3): add(hat(), bt + s16 * beat / 4, pan=-0.3, g=0.3)
        if d == "quirky": add(block(), bt + beat / 2, pan=0.4, g=0.25)
        if d == "shaker":
            for e in range(2): add(hat(), bt + e * beat / 2, pan=0.2, g=0.35 if e else 0.2)
    if d == "anthem" and b % 4 == 3:
        for k, f in enumerate((180, 140, 110, 90)): add(tom(f), bs + 3 * beat + k * beat / 4, g=0.6)

# room: short stereo echo for width
dly = int(0.23 * SR); wet = np.zeros_like(out); wet[dly:, 0] = out[:-dly, 1]; wet[dly:, 1] = out[:-dly, 0]
out += 0.18 * wet


def rms_env(x, win=0.3):
    m = (x ** 2).mean(1); k = int(win * SR)
    c = np.cumsum(np.concatenate([[0], m])); e = np.sqrt(np.maximum((c[k:] - c[:-k]) / k, 0))
    return np.concatenate([np.full(k // 2, e[0]), e, np.full(len(m) - len(e) - k // 2, e[-1])])


es, eo = rms_env(src), rms_env(out)
g = np.clip(es / np.maximum(eo, 1e-5), 0, 6)
out *= g[:, None]
out *= min(1.0, 0.89 / max(np.abs(out).max(), 1e-9))
fade = int(0.01 * SR); out[:fade] *= np.linspace(0, 1, fade)[:, None]
with wave.open(a.out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype("<i2").tobytes())
print(f"{a.out}: {T:.2f} s, {a.bpm} bpm, bar0 {a.bar0}, preset {a.preset}")
