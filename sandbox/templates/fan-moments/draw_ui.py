# Draws the template's post graphics (set/ui_tagline.png, set/ui_end_card.png) at 1920x1080 with alpha.
# Usage: python3 templates/<id>/draw_ui.py <set dir> [BRAND] [TAGLINE] [PARTNER_LINE] [BRAND_COLOUR hex]
import sys, json
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]
BRAND = sys.argv[2] if len(sys.argv) > 2 else "SODA"
TAG = sys.argv[3] if len(sys.argv) > 3 else "Feel the rush with"
PARTNER = sys.argv[4] if len(sys.argv) > 4 else "FOR EVERY FAN"
COL = sys.argv[5] if len(sys.argv) > 5 else "#B5121B"
serif, sans = f"{d}/font_serif.ttf", f"{d}/font_sans.ttf"
W, H = 1920, 1080

def fit_size(path, text, target_h, measure="Th"):
    lo, hi = 10, 400
    while hi - lo > 1:
        m = (lo + hi) // 2
        b = ImageFont.truetype(path, m).getbbox(measure, anchor="ls")
        (lo, hi) = (m, hi) if -b[1] < target_h else (lo, m)
    return ImageFont.truetype(path, lo)

def tracked(dr, xy, text, font, track, fill):
    x, y = xy
    for ch in text:
        dr.text((x, y), ch, font=font, fill=fill, anchor="ls"); x += dr.textlength(ch, font=font) + track
    return x - track
def tracked_w(dr, text, font, track):
    return sum(dr.textlength(ch, font=font) for ch in text) + track * (len(text) - 1)

# --- tagline: serif line + bold sans wordmark, one baseline at 53.0% H, group centred at 50% W
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
base = 572
fs = fit_size(serif, TAG, 72, "lh")          # ascender height of l/h = 72 px (6.7% H)
fb = fit_size(sans, BRAND, 76, "H")           # wordmark cap height 76 px (7.0% H)
ts = -0.06 * fs.size                          # tight tracking, like the source's condensed serif
w1 = tracked_w(dr, TAG, fs, ts); w2 = dr.textlength(BRAND, font=fb); gap = 24
x0 = (W - (w1 + gap + w2)) / 2
tracked(dr, (x0, base), TAG, fs, ts, (255, 255, 255, 255))
dr.text((x0 + w1 + gap, base), BRAND, font=fb, fill=(255, 255, 255, 255), anchor="ls")
im.save(f"{d}/ui_tagline.png")
tag_box = [round(x0), 500, round(x0 + w1 + gap + w2), base]

# --- end card lockup: brand tile + partner tile + partner line
im = Image.new("RGBA", (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
c = tuple(int(COL[i:i + 2], 16) for i in (1, 3, 5)) + (255,)
dr.rectangle([780, 442, 975, 637], fill=c)                                  # 195 x 195 brand tile
fw = fit_size(sans, BRAND, 40, "H")
while dr.textlength(BRAND, font=fw) > 150: fw = ImageFont.truetype(sans, fw.size - 1)
dr.text((877.5, 539.5), BRAND, font=fw, fill=(255, 255, 255, 255), anchor="mm")
dr.rounded_rectangle([990, 442, 1140, 637], radius=34, fill=(255, 255, 255, 255))  # partner tile
cx, cy, r = 1065, 539.5, 50                                                # generic football pictogram
import math
ball = Image.new("L", (W, H), 0); bd = ImageDraw.Draw(ball)
bd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
patch = Image.new("L", (W, H), 0); pd = ImageDraw.Draw(patch)
def pent(px, py, rad, rot):
    return [(px + rad * math.cos(math.radians(rot + 72 * k)), py + rad * math.sin(math.radians(rot + 72 * k))) for k in range(5)]
pd.polygon(pent(cx, cy, 19, -90), fill=255)
for k in range(5):
    a = math.radians(-90 + 36 + 72 * k)
    pd.polygon(pent(cx + 47 * math.cos(a), cy + 47 * math.sin(a), 17, math.degrees(a)), fill=255)
for k in range(5):                                                         # seams from the centre patch out
    a = math.radians(-90 + 72 * k)
    pd.line([(cx + 19 * math.cos(a), cy + 19 * math.sin(a)), (cx + 36 * math.cos(a), cy + 36 * math.sin(a))], fill=255, width=4)
from PIL import ImageChops
ink = ImageChops.multiply(patch, ball)
im.paste((20, 20, 20, 255), (0, 0), ink)
dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(20, 20, 20, 255), width=5)
fp = fit_size(sans, PARTNER, 11, "H")
track = 1.6
tw = sum(dr.textlength(ch, font=fp) for ch in PARTNER) + track * (len(PARTNER) - 1)
x = 960 - tw / 2
for ch in PARTNER:
    dr.text((x, 680), ch, font=fp, fill=(255, 255, 255, 255), anchor="ls"); x += dr.textlength(ch, font=fp) + track
im.save(f"{d}/ui_end_card.png")
print(json.dumps({"tagline_box_px": tag_box, "serif_size": fs.size, "brand_size": fb.size, "tile_word_size": fw.size, "partner_size": fp.size}))
