# Split a verifier strip into its five views, trim each to the object, tile them larger.
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
views = [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 else [0, 1, 2, 3, 4]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.6
im = Image.open(src).convert('RGB')
w, h = im.size
s = w // 5
bg = (34, 38, 43)
tiles = []
for i in views:
    t = im.crop((i * s, 0, (i + 1) * s, h))
    px = t.load()
    xs, ys = [], []
    for y in range(0, h, 2):
        for x in range(0, s, 2):
            r, g, b = px[x, y]
            if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > 18:
                xs.append(x); ys.append(y)
    m = 12
    box = (max(0, min(xs) - m), max(0, min(ys) - m), min(s, max(xs) + m), min(h, max(ys) + m))
    t = t.crop(box)
    tiles.append(t.resize((int(t.width * scale), int(t.height * scale)), Image.LANCZOS))
cols = 2 if len(tiles) > 1 else 1
cw = max(t.width for t in tiles); ch = max(t.height for t in tiles)
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * cw, rows * ch), bg)
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % cols) * cw, (k // cols) * ch))
sheet.save(out)
print(out, sheet.size)
