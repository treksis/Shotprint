#!/usr/bin/env python3
"""Publish a lab template to the Studio library, with its proof.

    python3 docs/pitch/publish_template.py <lab id> [<catalog id>]

Reads lab/replicate/author-<lab id>/templates/<lab id> (+ catalog.json), replica30-/replica15-<lab id>
(blind rebuilds) and compare30/compare15 (the real footage cut the same way). Writes:
- sandbox/templates/<catalog id>                      (via sandbox/host/seed_template.py)
- public/templates/<catalog id>.jpg / .mp4            (thumbnail and hover preview, from OUR rebuild)
- public/templates/proof/<catalog id>-{30,15}.mp4/.jpg (real cut | blind rebuild; local only)
- lab/pitch/catalog/<catalog id>.json                 (the StudioTemplate entry to add to the catalog)
"""
import json, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
LAB = REPO / 'lab/replicate'
lab_id = sys.argv[1]
cid = sys.argv[2] if len(sys.argv) > 2 else lab_id
tpl = LAB / f'author-{lab_id}/templates/{lab_id}'
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
FORMAT = {
    'phone-reveal': 'Tech product reveal',
    'farm-legacy': 'Heritage story',
    'animal-icons': 'Animal epic',
    'fan-moments': 'Fans + product macro',
    'room-makeover': 'Comedic makeover',
    'deadpan-dialogue': 'Deadpan dialogue',
    'holiday-story': 'Holiday story',
    'car-launch': 'Car launch',
    'athlete-anthem': 'Athlete monologue',
    'travel-escape': 'Travel comedy',
    'new-home': 'Family moment',
    'telenovela-glam': 'Telenovela parody',
}


def ff(*args):
    subprocess.run(['docker', 'run', '--rm', '-v', f'{REPO}:/w', '-w', '/w', 'muse-harness', 'ffmpeg', '-nostdin', '-y', '-loglevel', 'error', *args], check=True)


def rel(p: Path) -> str:
    return str(p.relative_to(REPO))


def dur(p: Path) -> float:
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True).stdout)


subprocess.run([sys.executable, str(REPO / 'sandbox/host/seed_template.py'), str(tpl), cid], check=True)
t = json.loads((REPO / f'sandbox/templates/{cid}/template.json').read_text())
cat = json.loads((tpl / 'catalog.json').read_text()) if (tpl / 'catalog.json').exists() else {}

pub = REPO / 'public/templates'
(pub / 'proof').mkdir(parents=True, exist_ok=True)
proof = {}
for n in ('30', '15'):
    orig, reb = LAB / f'compare{n}/{lab_id}_orig{n}.mp4', LAB / f'replica{n}-{lab_id}/final/final.mp4'
    if not (orig.exists() and reb.exists()):
        continue
    out = pub / f'proof/{cid}-{n}.mp4'
    lab = "drawtext=fontfile=%s:text='%s':x=14:y=12:fontsize=15:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=6"
    ff('-i', rel(orig), '-i', rel(reb), '-filter_complex',
       f"[0:v]fps=24,scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2,setsar=1,{lab % (FONT, 'REAL FOOTAGE')}[a];"
       f"[1:v]fps=24,scale=640:360,setsar=1,{lab % (FONT, 'REBUILT BLIND FROM THE TEMPLATE')}[b];[a][b]hstack[v]",
       '-map', '[v]', '-map', '1:a?', '-c:v', 'libx264', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', '-shortest', rel(out))
    ff('-ss', f'{dur(out) * 0.45:.2f}', '-i', rel(out), '-frames:v', '1', '-q:v', '3', rel(out.with_suffix('.jpg')))
    proof[n] = f'/templates/proof/{cid}-{n}.mp4'

reb30 = LAB / f'replica30-{lab_id}/final/final.mp4'
if reb30.exists():
    ff('-ss', f'{dur(reb30) * 0.4:.2f}', '-i', rel(reb30), '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', rel(pub / f'{cid}.jpg'))
    ff('-ss', '0', '-t', '6', '-i', rel(reb30), '-an', '-vf', 'scale=480:-2,fps=24', '-c:v', 'libx264', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', rel(pub / f'{cid}.mp4'))

src = {s['n']: s for s in t['shots']}
c30 = t.get('cut30') or {}
entry = {
    'id': cid,
    'title': cat.get('title', cid),
    'source': cat.get('source', ''),
    'format': FORMAT.get(lab_id) or cat.get('format') or 'Template',
    'status': 'ready',
    'durationSec': round(t['meta']['duration'], 1),
    'shots': len(c30.get('shots', [])),
    'shotsMeasured': True,
    'setups': len({str(src.get(s['from'], {}).get('setup')) for s in c30.get('shots', [])}) or None,
    'lines': len(c30.get('lines') or []) or None,
    'cuts': [int(n) for n in ('30', '15') if t.get(f'cut{n}')],
    'thumbnail': f'/templates/{cid}.jpg',
    'preview': f'/templates/{cid}.mp4',
    'proof': proof or None,
    'description': cat.get('description', ''),
    'prompt': cat.get('prompt30', f'Make a 30-second film for my product from the {cat.get("title", cid)} template.'),
}
(REPO / 'lab/pitch/catalog').mkdir(parents=True, exist_ok=True)
(REPO / f'lab/pitch/catalog/{cid}.json').write_text(json.dumps({k: v for k, v in entry.items() if v is not None}, indent=1))
print(json.dumps(entry, indent=1))
