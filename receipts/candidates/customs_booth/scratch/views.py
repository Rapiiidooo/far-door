# Throwaway: cut a verifier strip into its five views, crop each to the object and
# lay them out bigger so detail can be judged by eye.
# usage: views.py <strip.png> <out.png> [cell px, default 520] [views, default 0,1,2,3,4]
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
cell = int(sys.argv[3]) if len(sys.argv) > 3 else 520
pick = [int(x) for x in sys.argv[4].split(',')] if len(sys.argv) > 4 else [0, 1, 2, 3, 4]
im = Image.open(src).convert('RGB')
n = 5
w = im.width // n
bg = im.getpixel((2, 2))
tiles = []
for i in pick:
    v = im.crop((i * w, 0, (i + 1) * w, im.height))
    px = v.load()
    xs, ys = [], []
    for y in range(0, v.height, 2):
        for x in range(0, v.width, 2):
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 18:
                xs.append(x); ys.append(y)
    if xs:
        m = 8
        v = v.crop((max(0, min(xs) - m), max(0, min(ys) - m), min(v.width, max(xs) + m), min(v.height, max(ys) + m)))
    s = min(cell / v.width, cell / v.height)
    tiles.append(v.resize((max(1, int(v.width * s)), max(1, int(v.height * s))), Image.LANCZOS))
cols = 3 if len(tiles) > 3 else len(tiles)
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cell, rows * cell), bg)
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % cols) * cell + (cell - t.width) // 2, (k // cols) * cell + (cell - t.height) // 2))
sheet.save(out)
