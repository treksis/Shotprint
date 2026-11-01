#!/usr/bin/env python3
"""Add (or replace) catalog entries written by publish_template.py in src/shared/studio-templates.ts.

    python3 docs/pitch/add_to_catalog.py lab/pitch/catalog/<id>.json [...]
"""
import json, re, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
TS = REPO / 'src/shared/studio-templates.ts'
ORDER = ['id', 'title', 'source', 'format', 'status', 'durationSec', 'shots', 'shotsMeasured', 'setups', 'lines', 'cuts',
         'thumbnail', 'preview', 'proof', 'examples', 'description', 'prompt']


def lit(v):
    if isinstance(v, str):
        if "'" in v and '"' not in v:
            return '"' + v.replace('\\', '\\\\') + '"'
        return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"
    if isinstance(v, bool):
        return 'true' if v else 'false'
    if isinstance(v, list):
        return '[' + ', '.join(lit(x) for x in v) + ']'
    if isinstance(v, dict):
        return '{ ' + ', '.join(f"{k if re.fullmatch(r'[a-z]\w*', k) else repr(k)}: {lit(x)}" for k, x in v.items()) + ' }'
    return json.dumps(v)


def block(e):
    lines = ['  {']
    for k in ORDER:
        if k not in e or e[k] in (None, '', []):
            continue
        v = lit(e[k])
        if k in ('description',) and len(v) > 90:
            lines.append(f'    {k}:\n      {v},')
        else:
            lines.append(f'    {k}: {v},')
    lines.append('  },')
    return '\n'.join(lines)


s = TS.read_text()
for f in sys.argv[1:]:
    e = json.loads(Path(f).read_text())
    b = block(e)
    m = re.search(r"\n  \{\n    id: '" + re.escape(e['id']) + r"',.*?\n  \},", s, re.S)
    if m:
        s = s[:m.start()] + '\n' + b + s[m.end():]
    else:
        i = s.rindex('];')
        s = s[:i] + b + '\n' + s[i:]
    print('catalog:', e['id'])
TS.write_text(s)
