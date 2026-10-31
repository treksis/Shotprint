#!/usr/bin/env python3
"""Match a clip's colour to a reference frame (Reinhard transfer in Lab), keeping its audio untouched.

    python3 grade_match.py in.mp4 reference.(png|jpg|mp4@t) out.mp4 [--strength 0.7]

Use it to repair a grade jump between two shots of the same setup or world. Timing is unchanged:
same frames, same count, original audio stream copied.
"""
import subprocess, sys, tempfile, os
import cv2
import numpy as np


def ref_frame(spec):
    if "@" in spec:
        f, t = spec.rsplit("@", 1); cap = cv2.VideoCapture(f); cap.set(cv2.CAP_PROP_POS_MSEC, float(t) * 1000)
        ok, fr = cap.read(); cap.release(); return fr
    return cv2.imread(spec)


def stats(img):
    lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB).astype(np.float32)
    return lab.reshape(-1, 3).mean(0), lab.reshape(-1, 3).std(0) + 1e-3


def main():
    src, ref, out = sys.argv[1:4]
    k = float(sys.argv[sys.argv.index("--strength") + 1]) if "--strength" in sys.argv else 0.7
    rm, rs = stats(ref_frame(ref))
    cap = cv2.VideoCapture(src); fps = cap.get(cv2.CAP_PROP_FPS) or 24
    w, h = int(cap.get(3)), int(cap.get(4))
    ok, first = cap.read(); sm, ss = stats(first); cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    tmp = tempfile.mktemp(suffix=".mp4")
    wr = cv2.VideoWriter(tmp, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))
    n = 0
    while True:
        ok, f = cap.read()
        if not ok: break
        lab = cv2.cvtColor(f, cv2.COLOR_BGR2LAB).astype(np.float32)
        t = (lab - sm) * (rs / ss) + rm
        lab = np.clip(lab * (1 - k) + t * k, 0, 255).astype(np.uint8)
        wr.write(cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)); n += 1
    cap.release(); wr.release()
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-i", src, "-map", "0:v", "-map", "1:a?",
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "-c:a", "copy", out], check=True)
    os.remove(tmp)
    print(f"grade_match: {n} frames, strength {k} -> {out}")


if __name__ == "__main__":
    main()
