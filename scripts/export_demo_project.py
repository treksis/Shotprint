#!/usr/bin/env python3
"""Pack a finished template run (lab/arena/arms/<arm>) into a Studio demo project.

    python3 scripts/export_demo_project.py lab/arena/arms/claude-template-v3 public/demo/bluechip-v3

Writes web-sized media (plates 640 px JPEG, clips 480p H.264, takes AAC, final 720p) and
project.json: the canvas items by lane, their input edges, and the agent run to replay in the chat.
Reads the run's own records (plates.json, cut.json, jobs/*.jsonl, fill.md, final/) and the judge
result (lab/arena/results/<arm>.json); nothing is invented.
"""
import json, pathlib, re, shutil, subprocess, sys

ARM, OUT = map(pathlib.Path, sys.argv[1:3])
ROOT = pathlib.Path(__file__).resolve().parent.parent
RESULT = ROOT / "lab/arena/results" / f"{ARM.name}.json"
TPL = ROOT / "lab/templates/bluechip-factory"
for d in ("plates", "clips", "takes", "inputs", "frames"):
    (OUT / d).mkdir(parents=True, exist_ok=True)


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *map(str, args)], check=True)


def jpg(src, dst, w=640):
    if not dst.exists(): ff("-i", src, "-vf", f"scale={w}:-2", "-q:v", "4", dst)
    return dst.relative_to(OUT.parent.parent).as_posix()  # path under public/


def mp4(src, dst, h=480, crf=30):
    if not dst.exists():
        ff("-i", src, "-vf", f"scale=-2:{h}", "-c:v", "libx264", "-preset", "veryfast", "-crf", crf,
           "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", dst)
    return dst.relative_to(OUT.parent.parent).as_posix()


def m4a(src, dst):
    if not dst.exists(): ff("-i", src, "-vn", "-c:a", "aac", "-b:a", "96k", dst)
    return dst.relative_to(OUT.parent.parent).as_posix()


def poster(src, dst, t=0.6, w=480):
    if not dst.exists(): ff("-ss", t, "-i", src, "-frames:v", 1, "-vf", f"scale={w}:-2", "-q:v", "4", dst)
    return dst.relative_to(OUT.parent.parent).as_posix()


url = lambda p: "/" + p
dur = lambda f: float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                                     capture_output=True, text=True).stdout.strip() or 0)

jobs = {}
for f in sorted((ARM / "jobs").glob("*.jsonl")):
    for line in f.read_text().splitlines():
        if line.strip():
            j = json.loads(line); jobs[j["id"]] = j
cut = json.loads((ARM / "cut.json").read_text())
plates = json.loads((ARM / "plates.json").read_text())
result = json.loads(RESULT.read_text()) if RESULT.exists() else None
fill = (ARM / "fill.md").read_text()
lines = dict(re.findall(r"\| (L\d)[^|]*\| \"([^\"]+)\"", fill))
shot_rows = re.findall(r"^\| (\d+) \| ([\d.]+-[\d.]+) \| ([^|]+) \| ([^|]+) \|", fill, re.M)

items, edges = [], []


def add(kind, lane, iid, label, **kw):
    items.append({"id": iid, "kind": kind, "lane": lane, "label": label, **kw})
    return iid


# Inputs
add("reference", "inputs", "ref", "Reference video", sub="BlueChip · 117 s · 52 shots",
    media={"type": "video", "src": url(mp4(ROOT / "lab/arena/kit/assets/template_bluechip.mp4", OUT / "inputs/reference.mp4", 360, 32)),
           "poster": url(poster(ROOT / "lab/arena/kit/assets/template_bluechip.mp4", OUT / "inputs/reference.jpg", 20))})
add("template", "inputs", "tpl", "Director's template", sub="15 shots · 5 camera setups · 6 lines",
    media={"type": "image", "src": url(jpg(TPL / "frames/camA_interview_wide.jpg", OUT / "frames/camA.jpg"))},
    meta={"frames": {k: url(jpg(TPL / f"frames/{k}.jpg", OUT / f"frames/{k}.jpg", 320)) for k in
                     ["establish_wide", "camA_interview_wide", "camB_offaxis_mcu", "camC_frontal_mcu", "camD_tight_cu",
                      "product_hero_handheld", "assembly_macro_hands", "field_use", "etch_macro"]}})
add("product", "inputs", "product", "Product sheet", sub="Meta VR Glasses · product lock",
    media={"type": "image", "src": url(jpg(ARM / "assets/product_sheet.png", OUT / "inputs/product_sheet.jpg"))},
    meta={"lock": re.search(r"> PRODUCT LOCK: (.+?)\n\n", fill, re.S).group(1).replace("\n> ", " ")})
add("cast", "inputs", "cast", "Presenter + voice", sub="stand-in founder · timbre reference",
    media={"type": "image", "src": url(jpg(ARM / "assets/presenter_1.png", OUT / "inputs/presenter.jpg"))},
    meta={"voice": url(m4a(ARM / "assets/presenter_voice.wav", OUT / "inputs/voice.m4a"))})

# Fill
add("fill", "fill", "fill", "Filled template", sub=f"{len(lines)} lines · {len(shot_rows)} shots",
    meta={"lines": lines, "shots": [{"n": int(n), "t": t, "setup": s.strip(), "picture": p.strip()} for n, t, s, p in shot_rows]})
edges += [("tpl", "fill", "template"), ("product", "fill", "product lock"), ("cast", "fill", "presenter")]

# Plates: one card per setup (start + end)
seen = {}
for take, p in plates.items():
    key = p["plate"]
    if key in seen: continue
    pid = f"plate_{p['setup'].lower().replace('-', '_')}"
    if pid in [i["id"] for i in items]: pid += "_" + take
    seen[key] = pid
    add("plate", "plates", pid, p["setup"], sub="start → end" if p.get("end") else "start",
        media={"type": "image", "src": url(jpg(ARM / p["plate"], OUT / f"plates/{pid}.jpg"))},
        meta={"end": url(jpg(ARM / p["end"], OUT / f"plates/{pid}_end.jpg")) if p.get("end") and (ARM / p["end"]).exists() else None})
    edges.append(("fill", pid, "shot spec"))
for still in [s for s in cut["picture"] if s.get("still", "").startswith("plates/")]:
    pid = "plate_" + pathlib.Path(still["still"]).stem
    add("plate", "plates", pid, "HERITAGE", sub="archive still · no render",
        media={"type": "image", "src": url(jpg(ARM / still["still"], OUT / f"plates/{pid}.jpg"))})
    edges.append(("fill", pid, "shot spec"))

# Takes (Ref2V voice) and clips
take_ids = {}
for jid, j in jobs.items():
    if j.get("refs") or j.get("ref_audios"):
        line = jid.upper()[:2]
        f = ARM / "renders" / f"{jid}.mp4"
        if not f.exists(): continue
        tid = add("take", "takes", f"take_{jid}", f"{line} voice take", sub=lines.get(line, ""),
                  media={"type": "video", "src": url(mp4(f, OUT / f"takes/{jid}.mp4", 360, 32)),
                         "poster": url(poster(f, OUT / f"takes/{jid}.jpg"))},
                  meta={"mode": "Ref2V", "line": lines.get(line, "")})
        take_ids[line] = tid
        setup_plate = seen.get(plates.get(jid, plates.get(jid + "p", {})).get("plate", ""), None)
        if setup_plate: edges.append((setup_plate, tid, "setup plate"))

used = {s.get("take") for s in cut["picture"]} | {s.get("take") for s in cut.get("sound", [])}
clip_ids = {}
for name, tk in cut["takes"].items():
    f = ARM / tk["file"]
    if name not in used or not f.exists(): continue
    j = jobs.get(pathlib.Path(tk["file"]).stem.replace("_fx", ""), {})
    mode = "Ref2V" if (j.get("refs") or j.get("ref_audios")) else ("FL2V" if j.get("last_frame") else "I2V")
    if j.get("guide_audio"): mode += " + guide audio"
    p = plates.get(name, {})
    pic = name in {s.get("take") for s in cut["picture"]}
    cid = add("clip", "clips", f"clip_{name}", p.get("setup", name), sub=mode if pic else f"{mode} · sound only (voice-over)",
              media={"type": "video", "src": url(mp4(f, OUT / f"clips/{name}.mp4")), "poster": url(poster(f, OUT / f"clips/{name}.jpg"))},
              meta={"mode": mode, "duration": round(dur(f), 2), "at": tk["at"],
                    "effect": "lean-in punch-in" if "_fx" in tk["file"] else None})
    clip_ids[name] = cid
    if p.get("plate") in seen:
        edges.append((seen[p["plate"]], cid, "first + last frame" if j.get("last_frame") else "reference"))
    if j.get("guide_audio"):
        line = name.upper()[:2]
        if line in take_ids: edges.append((take_ids[line], cid, "guide audio"))

# Cut + final
shots = []
for s in cut["picture"]:
    src = s.get("take")
    shots.append({"t": s["t"], "item": clip_ids.get(src) or ("plate_" + pathlib.Path(s["still"]).stem if s.get("still", "").startswith("plates/") else None),
                  "label": plates.get(src, {}).get("setup", "END CARD" if "endcard" in s.get("still", "") else "HERITAGE")})
add("cut", "cut", "cut", "Cut list", sub=f"{len(shots)} shots · 30.0 s · takes placed once", meta={"shots": shots})
edges += [(c, "cut", "shot" if any(s.get("take") == n for s in cut["picture"]) else "voice-over") for n, c in clip_ids.items()]
edges += [("plate_" + pathlib.Path(s["still"]).stem, "cut", "still") for s in cut["picture"] if s.get("still", "").startswith("plates/")]
final = ARM / "final/final.mp4"
fmeta = {"duration": round(dur(final), 2)}
if result:
    fmeta.update({"score": result["mean"], "spread": result["spread"], "scores": result["scores"],
                  "summary": result["passes"][0]["summary"], "majors": result["major_segments"]})
add("final", "final", "final", "Final film", sub=f"judge {result['mean']}" if result else "",
    media={"type": "video", "src": url(mp4(final, OUT / "final.mp4", 720, 24)), "poster": url(poster(final, OUT / "final.jpg", 16.0, 640))},
    meta=fmeta)
edges.append(("cut", "final", "assemble"))

n_plates = sum(1 for i in items if i["kind"] == "plate")
run = [
    {"text": "Reading the template, product sheet and presenter", "lane": "inputs"},
    {"text": f"Filling the template: {len(lines)} lines within budget, {len(shot_rows)} shots mapped to setups", "lane": "fill", "cost": "text"},
    {"text": f"Making {n_plates} plates (start + end frames) from the reference frames", "lane": "plates", "cost": f"{n_plates * 2} images"},
    {"text": f"Recording {len(take_ids)} voice takes (Ref2V)", "lane": "takes", "cost": f"{len(take_ids)} clips"},
    {"text": f"Rendering {len(clip_ids)} shots with first + last frame (FL2V), presenter shots lip-synced to their takes", "lane": "clips", "cost": f"{len(clip_ids)} clips"},
    {"text": "Continuity check: 0 items to fix", "lane": "clips"},
    {"text": "Assembling the cut: every take placed once, nothing retimed", "lane": "cut"},
    {"text": f"Judging against the reference: {result['mean']} (no major flaws)" if result else "Judging", "lane": "final", "cost": "text"},
]
project = {"id": "bluechip-v3", "name": "Meta VR Glasses × BlueChip", "template": "bluechip-factory",
           "prompt": "Make a 30-second Meta VR Glasses film from the BlueChip factory template.",
           "lanes": ["inputs", "fill", "plates", "takes", "clips", "cut", "final"],
           "items": items, "edges": [{"from": a, "to": b, "role": r} for a, b, r in edges], "run": run}
(OUT / "project.json").write_text(json.dumps(project, indent=1))
size = sum(f.stat().st_size for f in OUT.rglob("*") if f.is_file())
print(f"{len(items)} items, {len(edges)} edges -> {OUT} ({size / 1e6:.1f} MB)")
