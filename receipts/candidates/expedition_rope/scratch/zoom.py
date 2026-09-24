"""Throwaway: zoom into a band of every view of a verifier render.

usage: python3 zoom.py <render.png> <out.png> <y0> <y1> [scale=2]
y0, y1 are fractions of the object's own height in the view (0 top, 1 bottom), measured on
the trimmed silhouette so the same band is taken from every view.
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
f0, f1 = float(sys.argv[3]), float(sys.argv[4])
scale = float(sys.argv[5]) if len(sys.argv) > 5 else 2
im = Image.open(src).convert("RGB")
n = 5
s = im.width // n
bg = im.getpixel((2, 2))
tiles = [im.crop((i * s, 0, (i + 1) * s, s)) for i in range(n)]


def bbox(t):
    px = t.load()
    xs, ys = [], []
    for y in range(t.height):
        for x in range(t.width):
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 18:
                xs.append(x)
                ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, t.width, t.height)


crops = []
for t in tiles:
    x0, y0, x1, y1 = bbox(t)
    h = y1 - y0
    top, bot = int(y0 + f0 * h) - 6, int(y0 + f1 * h) + 6
    cx = (x0 + x1) // 2
    band = t.crop((0, max(0, top), t.width, min(t.height, bot)))
    # keep only the columns that hold the object in this band
    bx = bbox(band)
    pad = 10
    c = band.crop((max(0, bx[0] - pad), 0, min(band.width, bx[2] + pad), band.height))
    crops.append(c.resize((int(c.width * scale), int(c.height * scale)), Image.LANCZOS))
w = sum(c.width for c in crops) + 12 * (len(crops) - 1)
h = max(c.height for c in crops)
sheet = Image.new("RGB", (w, h), bg)
x = 0
for c in crops:
    sheet.paste(c, (x, 0))
    x += c.width + 12
sheet.save(out)
print(out, sheet.size)
