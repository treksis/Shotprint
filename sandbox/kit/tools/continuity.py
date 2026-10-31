#!/usr/bin/env python3
"""Continuity check for a cut list, before assembly. Needs OpenCV (templates/.venv).

    python3 continuity.py cut.json [plates.json] [--template ../bluechip-factory/template.json]

plates.json (optional): {"<take>": {"plate": "plates/camA.png", "setup": "CAM-A"}, ...}

Reports, per take: plate adherence (does the clip actually open on its plate?), frozen/morphing head
(how many frames to trim), speech windows (where the voice starts and stops, in clip and timeline
time), and the measured camera move vs the setup's allowed moves. Per cut: colour/brightness jump
between the outgoing and incoming frame, and jump cuts (same setup on both sides).
Exit code 1 if anything is flagged as FIX.
"""
import json, pathlib, re, subprocess, sys
import cv2
import numpy as np

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from motion import analyse  # noqa: E402


def frame_at(path, t):
    cap = cv2.VideoCapture(str(path)); cap.set(cv2.CAP_PROP_POS_MSEC, max(0, t) * 1000); ok, f = cap.read(); cap.release()
    return f if ok else None


def last_frame(path, dur):
    return frame_at(path, max(0, dur - 0.06))


def sim(a, b):
    """0..1 similarity: structure (grayscale NCC on 96x54) and colour (Lab histogram correlation)."""
    if a is None or b is None: return 0.0
    ga = cv2.resize(cv2.cvtColor(a, cv2.COLOR_BGR2GRAY), (96, 54)).astype(np.float32)
    gb = cv2.resize(cv2.cvtColor(b, cv2.COLOR_BGR2GRAY), (96, 54)).astype(np.float32)
    ga -= ga.mean(); gb -= gb.mean()
    ncc = float((ga * gb).sum() / (np.sqrt((ga ** 2).sum() * (gb ** 2).sum()) + 1e-6))
    ha = cv2.calcHist([cv2.cvtColor(a, cv2.COLOR_BGR2LAB)], [1, 2], None, [16, 16], [0, 256, 0, 256])
    hb = cv2.calcHist([cv2.cvtColor(b, cv2.COLOR_BGR2LAB)], [1, 2], None, [16, 16], [0, 256, 0, 256])
    hc = float(cv2.compareHist(ha, hb, cv2.HISTCMP_CORREL))
    return round(max(0.0, 0.6 * ncc + 0.4 * hc), 3)


def lab_mean(f):
    l = cv2.cvtColor(f, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    return l.mean(0) * np.array([100 / 255, 1, 1]) - np.array([0, 128, 128])


def frozen_head(path):
    """Frames at the start that barely change (a held first frame) or that change violently (morph-in)."""
    cap = cv2.VideoCapture(str(path)); prev = None; diffs = []
    for _ in range(24):
        ok, f = cap.read()
        if not ok: break
        g = cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (160, 90)).astype(np.float32)
        if prev is not None: diffs.append(float(np.abs(g - prev).mean()))
        prev = g
    cap.release()
    held = 0
    for d in diffs:
        if d < 0.35: held += 1
        else: break
    spike = max(diffs[:8]) if diffs else 0
    return held, round(spike, 1), diffs


def speech(path):
    r = subprocess.run(["ffmpeg", "-i", str(path), "-af", "silencedetect=noise=-32dB:d=0.18", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", r)]
    en = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", r)]
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                               capture_output=True, text=True).stdout.strip() or 0)
    sil = sorted(zip(st, en + [dur] * (len(st) - len(en))))
    talk, t = [], 0.0
    for a, b in sil:
        if a - t > 0.15: talk.append([round(t, 2), round(a, 2)])
        t = b
    if dur - t > 0.15: talk.append([round(t, 2), round(dur, 2)])
    return talk, dur


def main():
    cut_path = pathlib.Path(sys.argv[1]); base = cut_path.parent; cut = json.loads(cut_path.read_text())
    plates = {}
    if len(sys.argv) > 2 and not sys.argv[2].startswith("--"): plates = json.loads(pathlib.Path(sys.argv[2]).read_text())
    tpl = None
    if "--template" in sys.argv: tpl = json.loads(pathlib.Path(sys.argv[sys.argv.index("--template") + 1]).read_text())
    fixes = 0
    print("== takes")
    for k, tk in cut["takes"].items():
        f = base / tk["file"]
        if not f.exists(): print(f"{k}: MISSING {tk['file']}"); fixes += 1; continue
        talk, dur = speech(f)
        held, spike, _ = frozen_head(f)
        line = f"{k}: {dur:.2f}s at {tk['at']:+.2f}"
        p = plates.get(k, {})
        if p.get("plate"):
            plate = cv2.imread(str(base / p["plate"]))
            s0, s1 = sim(plate, frame_at(f, 0.04)), sim(plate, frame_at(f, 1.0))
            flag = "FIX" if s0 < 0.55 else ("check" if s1 < 0.45 else "ok")
            fixes += flag == "FIX"
            line += f" | plate adherence open {s0} @1s {s1} [{flag}]"
        if held >= 3: line += f" | held head {held} frames -> trim {held / 24:.2f}s"
        if spike > 18: line += f" | morph spike {spike} in first 8 frames -> trim ~0.3s"
        line += f" | speech {talk if talk else 'none'}"
        if talk: line += f" (timeline {[[round(a + tk['at'], 2), round(b + tk['at'], 2)] for a, b in talk]})"
        if tpl and p.get("setup") in tpl.get("setups", {}):
            allowed = tpl["setups"][p["setup"]].get("motion")
            used = [s for s in cut["picture"] if s.get("take") == k]
            if used and allowed:
                a, b = used[0]["t"]; m = analyse(str(f), a - tk["at"], b - tk["at"])
                ok = any(any(x.startswith(al) for x in m["camera"]) for al in allowed)
                line += f" | camera {m['camera']} vs {allowed} [{'ok' if ok else 'check'}]"
        print(line)
    print("== cuts")
    pic = cut["picture"]
    for i in range(1, len(pic)):
        A, B = pic[i - 1], pic[i]
        if not (A.get("take") and B.get("take")): continue
        ta, tb = cut["takes"][A["take"]], cut["takes"][B["take"]]
        fa = frame_at(base / ta["file"], A["t"][1] - ta["at"] - 0.05)
        fb = frame_at(base / tb["file"], B["t"][0] - tb["at"] + 0.02)
        if fa is None or fb is None: continue
        d = lab_mean(fb) - lab_mean(fa)
        sa, sb = plates.get(A["take"], {}).get("setup"), plates.get(B["take"], {}).get("setup")
        note = []
        if sa and sa == sb: note.append("JUMP CUT (same setup)"); fixes += 1
        same_world = sa and sb and sa.startswith("CAM") and sb.startswith("CAM")
        if same_world and (abs(d[0]) > 10 or np.hypot(d[1], d[2]) > 8):
            note.append("grade jump between interview setups -> grade_match"); fixes += 1
        print(f"{A['take']} -> {B['take']} @ {B['t'][0]:.2f}s: dL {d[0]:+.1f} dab {np.hypot(d[1], d[2]):.1f} {' '.join(note)}")
    print(f"== {fixes} item(s) to fix")
    sys.exit(1 if fixes else 0)


if __name__ == "__main__":
    main()
