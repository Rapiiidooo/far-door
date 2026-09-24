# Throwaway: crop the object out of each verifier view and tile the crops larger.
# usage: python3 crop.py <verify png> <out png> [views e.g. 0,1,2,3,4] [scale]
import sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
views = [int(v) for v in (sys.argv[3] if len(sys.argv) > 3 else '0,1,2,3,4').split(',')]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
im = Image.open(src).convert('RGB')
S = im.height
tiles = []
for i in views:
    v = im.crop((i * S, 0, (i + 1) * S, S))
    bg = v.getpixel((2, 2))
    px = v.load()
    xs, ys = [], []
    for y in range(0, S, 2):
        for x in range(0, S, 2):
            p = px[x, y]
            if abs(p[0] - bg[0]) + abs(p[1] - bg[1]) + abs(p[2] - bg[2]) > 18:
                xs.append(x)
                ys.append(y)
    if xs:
        v = v.crop((max(min(xs) - 8, 0), max(min(ys) - 8, 0), min(max(xs) + 8, S), min(max(ys) + 8, S)))
    tiles.append(v.resize((int(v.width * scale), int(v.height * scale)), Image.LANCZOS))
W = sum(t.width for t in tiles) + 10 * (len(tiles) - 1)
H = max(t.height for t in tiles)
sheet = Image.new('RGB', (W, H), (34, 38, 43))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0))
    x += t.width + 10
sheet.save(out)
print(out, sheet.size)
