#!/usr/bin/env python3
"""Post graphics that must be legible: the laser-etch claim and the end card. Pillow only.

    python3 post_text.py etch "DESIGNED BY META" "BUILT IN AMERICA" out.mov [--size 1280x720] [--dur 2.2]
    python3 post_text.py endcard "Meta" out.png [--size 1280x720]

etch: transparent overlay; monospaced light-grey letters appear one by one following a bright spark,
with a soft glow, as if burned into the surface underneath. endcard: black frame, brand mark small at
lower-left, as in the master.
"""
import subprocess, sys, tempfile, pathlib, shutil
from PIL import Image, ImageDraw, ImageFilter, ImageFont

MONO = ["/System/Library/Fonts/Menlo.ttc", "/System/Library/Fonts/Monaco.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"]
SANS = ["/System/Library/Fonts/HelveticaNeue.ttc", "/System/Library/Fonts/Helvetica.ttc", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]


def font(cands, size):
    for c in cands:
        if pathlib.Path(c).exists(): return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def opt(name, default):
    return sys.argv[sys.argv.index(name) + 1] if name in sys.argv else default


def etch(l1, l2, out):
    W, H = map(int, opt("--size", "1280x720").split("x")); dur = float(opt("--dur", "2.2")); fps = 24
    f = font(MONO, int(H * 0.062)); lines = [l1, l2]
    x0, y0 = int(W * 0.12), int(H * 0.36); lh = int(H * 0.095)
    total = sum(len(l) for l in lines); reveal = dur * 0.8
    tmp = pathlib.Path(tempfile.mkdtemp())
    for n in range(int(dur * fps)):
        t = n / fps; k = min(total, int(total * t / reveal) + 1)
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0)); glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d, g = ImageDraw.Draw(img), ImageDraw.Draw(glow); shown = 0; spark = None
        for i, l in enumerate(lines):
            m = max(0, min(len(l), k - shown)); shown += len(l)
            if m:
                txt = l[:m]; y = y0 + i * lh
                d.text((x0, y), txt, font=f, fill=(222, 228, 230, 235))
                g.text((x0, y), txt, font=f, fill=(150, 210, 255, 160))
                if m < len(l) or (i == len(lines) - 1 and k < total + 1):
                    spark = (x0 + d.textlength(txt, font=f), y + lh * 0.35)
        glow = glow.filter(ImageFilter.GaussianBlur(6))
        img = Image.alpha_composite(glow, img)
        if spark and t < reveal + 0.1:
            s = Image.new("RGBA", (W, H), (0, 0, 0, 0)); sd = ImageDraw.Draw(s); r = int(H * 0.012)
            sd.ellipse([spark[0] - r * 3, spark[1] - r * 3, spark[0] + r * 3, spark[1] + r * 3], fill=(170, 220, 255, 90))
            sd.ellipse([spark[0] - r, spark[1] - r, spark[0] + r, spark[1] + r], fill=(255, 255, 255, 255))
            img = Image.alpha_composite(img, s.filter(ImageFilter.GaussianBlur(2)))
        img.save(tmp / f"f{n:04d}.png")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(fps), "-i", str(tmp / "f%04d.png"),
                    "-c:v", "qtrle", "-pix_fmt", "argb", out], check=True)
    shutil.rmtree(tmp); print("etch overlay ->", out)


def endcard(mark, out):
    W, H = map(int, opt("--size", "1280x720").split("x"))
    img = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(img)
    f = font(SANS, int(min(W, H) * 0.045))
    d.text((int(W * 0.06), int(H * 0.84)), mark, font=f, fill=(245, 245, 245))
    img.save(out); print("end card ->", out)


if __name__ == "__main__":
    if sys.argv[1] == "etch": etch(sys.argv[2], sys.argv[3], sys.argv[4])
    elif sys.argv[1] == "endcard": endcard(sys.argv[2], sys.argv[3])
    else: print(__doc__)
