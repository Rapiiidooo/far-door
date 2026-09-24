"""Split a verifier render (five square views side by side) into a zoomed grid.

usage: python3 views.py <render.png> <out.png> [views=0,1,2,3,4] [cols=3]
Each view is trimmed to the object with one shared crop box so the scale stays equal.
"""
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
pick = [int(x) for x in (sys.argv[3] if len(sys.argv) > 3 else "0,1,2,3,4").split(",")]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 3
im = Image.open(src).convert("RGB")
n = 5
s = im.width // n
bg = im.getpixel((2, 2))
tiles = [im.crop((i * s, 0, (i + 1) * s, s)) for i in pick]


def bbox(t):
    px = t.load()
    xs, ys = [], []
    for y in range(0, t.height, 2):
        for x in range(0, t.width, 2):
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 18:
                xs.append(x)
                ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys)) if xs else (0, 0, t.width, t.height)


boxes = [bbox(t) for t in tiles]
x0 = max(0, min(b[0] for b in boxes) - 8)
y0 = max(0, min(b[1] for b in boxes) - 8)
x1 = min(s, max(b[2] for b in boxes) + 8)
y1 = min(s, max(b[3] for b in boxes) + 8)
tiles = [t.crop((x0, y0, x1, y1)) for t in tiles]
w, h = x1 - x0, y1 - y0
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new("RGB", (w * cols, h * rows), bg)
for i, t in enumerate(tiles):
    sheet.paste(t, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
print(out, sheet.size)
