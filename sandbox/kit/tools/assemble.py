#!/usr/bin/env python3
"""Assemble a film from a cut list without ever retiming a take.

    python3 assemble.py cut.json out.mp4 [--check]     # --check validates only

cut.json:
{
  "format": [1280, 720], "fps": 24,
  "takes": {                                   # every rendered clip used, placed ONCE on the timeline
    "l1":  {"file": "renders/l1.mp4", "at": 0.4},   # clip time 0 sits at timeline 0.4
    "est": {"file": "renders/est.mp4", "at": 0.0}
  },
  "picture": [                                 # contiguous from 0 to the end, hard cuts
    {"t": [0.0, 2.0], "take": "est"},
    {"t": [2.0, 4.6], "take": "l1"},
    {"t": [4.6, 6.2], "take": "her_a", "look": "bw_4x3"},
    {"t": [28.2, 30.0], "still": "post/endcard.png"}
  ],
  "sound": [ {"t": [0.4, 4.5], "take": "l1", "gain": 1.0} ],     # dialogue windows
  "score": {"file": "score.wav", "gain": 0.30, "end": 28.2, "duck": true},
  "overlays": [ {"t": [26.0, 28.2], "file": "post/etch.mov"} ]   # full-frame, alpha
}

The sync contract: a take's picture and sound windows both map timeline t to clip time t - at, so
lips and voice keep the relationship the model generated. Nothing is stretched, sped up or slowed.
"""
import json, subprocess, sys, pathlib

TOL = 0.03


def probe(f):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f],
                         capture_output=True, text=True).stdout.strip()
    return float(out)


def validate(cut, base):
    errs, warn = [], []
    takes = cut["takes"]
    for k, v in takes.items():
        p = base / v["file"]
        if not p.exists(): errs.append(f"take {k}: missing {v['file']}"); continue
        v["_dur"] = probe(str(p))
    pic = cut["picture"]
    t = 0.0
    for i, s in enumerate(pic):
        a, b = s["t"]
        if abs(a - t) > TOL: errs.append(f"picture[{i}] starts at {a} but previous ends at {t} (gap/overlap)")
        if b - a < 0.4: warn.append(f"picture[{i}] is only {b - a:.2f}s")
        if "take" in s:
            tk = takes.get(s["take"])
            if not tk: errs.append(f"picture[{i}]: unknown take {s['take']}"); t = b; continue
            ca, cb = a - tk["at"], b - tk["at"]
            if ca < -TOL or ("_dur" in tk and cb > tk["_dur"] + TOL):
                errs.append(f"picture[{i}] {s['take']}: needs clip {ca:.2f}-{cb:.2f}s, clip is 0-{tk.get('_dur', 0):.2f}s (move 'at' or the cut)")
        elif "still" not in s: errs.append(f"picture[{i}]: needs 'take' or 'still'")
        t = b
    for i in range(1, len(pic)):
        if pic[i].get("take") and pic[i].get("take") == pic[i - 1].get("take"):
            warn.append(f"picture[{i}] continues the same take as picture[{i-1}] (merge them)")
    for i, s in enumerate(cut.get("sound", [])):
        tk = takes.get(s["take"])
        if not tk: errs.append(f"sound[{i}]: unknown take {s['take']}"); continue
        ca, cb = s["t"][0] - tk["at"], s["t"][1] - tk["at"]
        if ca < -TOL or ("_dur" in tk and cb > tk["_dur"] + TOL):
            errs.append(f"sound[{i}] {s['take']}: needs clip {ca:.2f}-{cb:.2f}s, clip is 0-{tk.get('_dur', 0):.2f}s")
    return errs, warn, t


def build(cut, base, out):
    W, H = cut.get("format", [1280, 720]); fps = cut.get("fps", 24)
    takes = cut["takes"]; end = cut["picture"][-1]["t"][1]
    inputs, idx, n_in = [], {}, 0

    def add(args):
        nonlocal n_in
        inputs.extend(args); n_in += 1; return n_in - 1
    for k, v in takes.items():
        idx[k] = add(["-i", str(base / v["file"])])
    stills = {}
    for s in cut["picture"]:
        if "still" in s and s["still"] not in stills:
            stills[s["still"]] = add(["-loop", "1", "-t", str(end), "-i", str(base / s["still"])])
    ov_idx = [add(["-i", str(base / o["file"])]) for o in cut.get("overlays", [])]
    sc = cut.get("score")
    if sc: sc_i = add(["-i", str(base / sc["file"])])
    fc, vlabels = [], []
    norm = f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={fps},setsar=1,format=yuv420p"
    for n, s in enumerate(cut["picture"]):
        a, b = s["t"]
        if "take" in s:
            tk = takes[s["take"]]; ca, cb = max(0.0, a - tk["at"]), b - tk["at"]
            src = f"[{idx[s['take']]}:v]trim=start={ca:.4f}:end={cb:.4f},setpts=PTS-STARTPTS"
        else:
            src = f"[{stills[s['still']]}:v]trim=duration={b - a:.4f},setpts=PTS-STARTPTS"
        look = s.get("look")
        if look == "bw_4x3":
            h43 = H; w43 = int(H * 4 / 3) // 2 * 2
            chain = f"{src},hue=s=0,eq=contrast=1.25:brightness=-0.02,noise=alls=12:allf=t,scale={w43}:{h43}:force_original_aspect_ratio=increase,crop={w43}:{h43},pad={W}:{H}:(ow-iw)/2:0:black,fps={fps},setsar=1,format=yuv420p"
        else:
            chain = f"{src},{norm}"
        fc.append(f"{chain}[v{n}]"); vlabels.append(f"[v{n}]")
    fc.append(f"{''.join(vlabels)}concat=n={len(vlabels)}:v=1:a=0[vcat]")
    last = "vcat"
    for j, (o, oi) in enumerate(zip(cut.get("overlays", []), ov_idx)):
        a, b = o["t"]
        fc.append(f"[{oi}:v]scale={W}:{H},format=rgba,setpts=PTS-STARTPTS+{a}/TB[ov{j}]")
        fc.append(f"[{last}][ov{j}]overlay=0:0:enable='between(t,{a},{b})':eof_action=pass[vo{j}]")
        last = f"vo{j}"
    alabels = []
    for n, s in enumerate(cut.get("sound", [])):
        tk = takes[s["take"]]; a, b = s["t"]; ca, cb = a - tk["at"], b - tk["at"]
        ms = int(round(a * 1000))
        fc.append(f"[{idx[s['take']]}:a]atrim=start={ca:.4f}:end={cb:.4f},asetpts=PTS-STARTPTS,"
                  f"afade=t=in:d=0.03,afade=t=out:st={max(0, cb - ca - 0.04):.3f}:d=0.04,"
                  f"volume={s.get('gain', 1.0)},aresample=48000,aformat=channel_layouts=stereo,adelay={ms}|{ms}[a{n}]")
        alabels.append(f"[a{n}]")
    if alabels:
        fc.append(f"{''.join(alabels)}amix=inputs={len(alabels)}:normalize=0:duration=longest,apad=whole_dur={end}[dlg]")
    else:
        fc.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={end}[dlg]")
    if sc:
        send = sc.get("end", end)
        fc.append(f"[{sc_i}:a]atrim=start={sc.get('in', 0)}:duration={send},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
                  f"volume={sc.get('gain', 0.3)},apad=whole_dur={end}[sc0]")
        if sc.get("duck", True):
            fc.append("[dlg]asplit=2[dlg1][dlgsc]")
            fc.append("[sc0][dlgsc]sidechaincompress=threshold=0.02:ratio=5:attack=30:release=350[scd]")
            fc.append("[dlg1][scd]amix=inputs=2:normalize=0:duration=first[mix]")
        else:
            fc.append("[dlg][sc0]amix=inputs=2:normalize=0:duration=first[mix]")
    else:
        fc.append("[dlg]anull[mix]")
    fc.append(f"[mix]loudnorm=I=-16:TP=-1.5:LRA=11,atrim=duration={end}[aout]")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", ";".join(fc), "-map", f"[{last}]", "-map", "[aout]",
           "-t", f"{end:.3f}", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)


if __name__ == "__main__":
    cut_path = pathlib.Path(sys.argv[1]); cut = json.loads(cut_path.read_text()); base = cut_path.parent
    errs, warn, end = validate(cut, base)
    for w in warn: print("warn:", w)
    for e in errs: print("ERROR:", e)
    print(f"timeline {end:.2f}s, {len(cut['picture'])} shots, {len(cut.get('sound', []))} dialogue windows")
    if errs: sys.exit(1)
    if "--check" not in sys.argv:
        out = pathlib.Path(sys.argv[2]); out.parent.mkdir(parents=True, exist_ok=True)
        build(cut, base, out); print("wrote", out, f"{probe(str(out)):.2f}s")
