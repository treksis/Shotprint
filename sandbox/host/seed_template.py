#!/usr/bin/env python3
"""Seed a finished director template into the Studio library (sandbox/templates/<id>).

    python3 sandbox/host/seed_template.py <template dir> <catalog id>

- Copies the template, renaming its folder to the catalog id (and its own path mentions).
- Normalizes cut30/cut15 to the schema bin/template reads: shots[].src, lines[].clip, score.segments.
- Converts opaque PNGs to JPEG (q90) and rewrites every reference to them; PNGs with transparency
  (mattes, cut-outs) stay PNG. Audio stays WAV but is gitignored: it comes from the source film.
- Runs bin/template check on the result.
"""
import json, re, shutil, subprocess, sys
from pathlib import Path
from PIL import Image

REPO = Path(__file__).resolve().parents[2]
src, cid = Path(sys.argv[1]).resolve(), sys.argv[2]
old_id = src.name
dst = REPO / 'sandbox/templates' / cid
if dst.exists():
    shutil.rmtree(dst)
shutil.copytree(src, dst, ignore=shutil.ignore_patterns('frames', '.DS_Store', '__pycache__'))

# 1. Opaque PNG -> JPEG.
renamed = {}
for p in sorted(dst.rglob('*.png')):
    im = Image.open(p)
    alpha = im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info)
    if alpha and im.convert('RGBA').getchannel('A').getextrema()[0] < 255:
        continue
    q = p.with_suffix('.jpg')
    im.convert('RGB').save(q, quality=90, optimize=True)
    p.unlink()
    renamed[p.relative_to(dst).as_posix()] = q.relative_to(dst).as_posix()

texts = [f for f in dst.rglob('*') if f.suffix in ('.json', '.md') and f.is_file()]
for f in texts:
    s = f.read_text()
    for a, b in renamed.items():
        s = s.replace(a, b)
        s = re.sub(rf'(?<![\w/]){re.escape(Path(a).name)}', Path(b).name, s)  # bare file names
    s = re.sub(r'(sNN[a-z]?)\.png', r'\1.jpg', s)  # board placeholders
    if old_id != cid:
        s = s.replace(f'templates/{old_id}/', f'templates/{cid}/').replace(f'templates/{old_id}`', f'templates/{cid}`')
    f.write_text(s)

# 2. Normalize the cuts.
tj = dst / 'template.json'
t = json.loads(tj.read_text())
for n in ('30', '15'):
    c = t.get(f'cut{n}')
    if not c:
        continue
    for s in c.get('shots', []):
        if 'src' not in s or not isinstance(s['src'], list):
            w = s.get('source_window') or s.get('src_window')
            if w:
                s['src'] = [w[0], w[1]]
    for l in c.get('lines') or []:
        clip = l.get('clip') or l.get('file')
        if not clip and (dst / f"set/lines/{l.get('id')}.wav").exists():
            clip = f"set/lines/{l['id']}.wav"
        if clip:
            l['clip'] = clip
        kind = str(l.get('kind', '')) + str(l.get('type', ''))
        if 'sung' in kind or 'lyric' in kind:
            l.setdefault('in_score', True)
        if 'words' not in l and 'text' in l:
            l['words'] = l['text']
    sc = c.get('score')
    if isinstance(sc, dict):
        sc.setdefault('file', f'set/score_{n}.wav')
        segs = sc.get('segments')
        if segs and 'src_in' not in segs[0] and 'src' in segs[0]:
            sc['segments'] = [{**g, 'src_in': g['src'][0], 'src_out': g['src'][1]} for g in segs]
        elif not segs and sc.get('cuts'):        # [{at, from_source, to_source}] joins
            cuts, dur = sc['cuts'], sc.get('duration', c['duration'])
            out, t0, s0 = [], 0.0, cuts[0]['from_source'] - cuts[0]['at']
            for k, j in enumerate(cuts):
                out.append({'src_in': round(s0, 4), 'src_out': j['from_source']})
                s0, t0 = j['to_source'], j['at']
            out.append({'src_in': round(s0, 4), 'src_out': round(s0 + dur - t0, 4)})
            sc['segments'] = out
        elif not segs and sc.get('sections') and isinstance(sc['sections'][0].get('from_score'), list):
            sc['segments'] = [{'src_in': x['from_score'][0], 'src_out': x['from_score'][1]} for x in sc['sections'] if 'from_score' in x]
tj.write_text(json.dumps(t, indent=1, ensure_ascii=False))

# 3. Check.
mb = sum(f.stat().st_size for f in dst.rglob('*') if f.is_file()) / 1e6
print(f'{dst.relative_to(REPO)}: {len(renamed)} PNG -> JPEG, {mb:.1f} MB')
r = subprocess.run(['node', str(REPO / 'sandbox/kit/bin/template.mjs'), 'check', str(dst)], capture_output=True, text=True)
print(r.stdout.strip() or r.stderr.strip())
sys.exit(r.returncode)
