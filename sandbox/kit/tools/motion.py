#!/usr/bin/env python3
"""Measure camera motion per shot: global pan/tilt (in % of frame width/height), zoom (% scale change),
roll, and shake (frame-to-frame jitter), from feature tracking between frames sampled at 8 fps.

    .venv/bin/python tools/motion.py <video> <shots.json> <out.json>

Classifies each shot as static / push-in / pull-out / pan-left / pan-right / tilt-up / tilt-down /
handheld (jitter without a dominant direction), combinations allowed. Used both to dissect templates
and to check that a generated clip actually performs the camera move its slot asks for.
"""
import json, sys
import cv2
import numpy as np

FPS = 8.0


def frames(cap, start, end, w=480):
    cap.set(cv2.CAP_PROP_POS_MSEC, start * 1000)
    t = start
    while t < end:
        cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
        ok, f = cap.read()
        if not ok: break
        h = int(f.shape[0] * w / f.shape[1])
        yield cv2.cvtColor(cv2.resize(f, (w, h)), cv2.COLOR_BGR2GRAY)
        t += 1 / FPS


def step(a, b):
    pts = cv2.goodFeaturesToTrack(a, 300, 0.01, 8)
    if pts is None or len(pts) < 12: return None
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(a, b, pts, None)
    good = st.ravel() == 1
    if good.sum() < 12: return None
    m, _ = cv2.estimateAffinePartial2D(pts[good], nxt[good], method=cv2.RANSAC, ransacReprojThreshold=2.0)
    if m is None: return None
    s = float(np.hypot(m[0, 0], m[1, 0]))
    return m[0, 2] / a.shape[1], m[1, 2] / a.shape[0], s - 1, float(np.degrees(np.arctan2(m[1, 0], m[0, 0])))


def classify(dx, dy, dz, jitter, dur):
    tags = []
    # thresholds are per-shot totals (fraction of frame) and per-step jitter
    if dz > 0.04: tags.append("push-in")
    if dz < -0.04: tags.append("pull-out")
    # camera pans right -> image content moves left (negative dx)
    if dx < -0.06: tags.append("pan-right/truck-right")
    if dx > 0.06: tags.append("pan-left/truck-left")
    if dy < -0.06: tags.append("tilt-down/pedestal-down")
    if dy > 0.06: tags.append("tilt-up/pedestal-up")
    if jitter > 0.004: tags.append("handheld")
    return tags or ["static"]


def analyse(video, start, end):
    cap = cv2.VideoCapture(video)
    prev, steps = None, []
    for g in frames(cap, start + 0.05, end - 0.05):
        if prev is not None:
            r = step(prev, g)
            if r: steps.append(r)
        prev = g
    cap.release()
    if not steps: return {"camera": ["unknown"]}
    a = np.array(steps)
    dx, dy = a[:, 0].sum(), a[:, 1].sum()
    dz = float(np.prod(1 + a[:, 2]) - 1)
    # jitter: deviation of per-step translation from its smoothed path
    k = 5
    sm = np.apply_along_axis(lambda c: np.convolve(c, np.ones(k) / k, mode="same"), 0, a[:, :2]) if len(a) > k else a[:, :2]
    jitter = float(np.mean(np.hypot(*(a[:, :2] - sm).T)))
    return {"pan_x": round(float(dx), 3), "tilt_y": round(float(dy), 3), "zoom": round(dz, 3),
            "roll_deg": round(float(a[:, 3].sum()), 2), "jitter": round(jitter, 4),
            "camera": classify(dx, dy, dz, jitter, end - start)}


if __name__ == "__main__":
    video, shots_path, out = sys.argv[1:4]
    shots = json.load(open(shots_path))
    for s in shots:
        s["motion"] = analyse(video, s["start"], s["end"])
        print(s["i"], f"{s['start']:.2f}-{s['end']:.2f}", s["motion"].get("camera"), {k: v for k, v in s["motion"].items() if k != "camera"})
    json.dump(shots, open(out, "w"), indent=1)
