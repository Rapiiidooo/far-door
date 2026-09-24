# Throwaway: stack verifier strips, each view cropped to the figure. usage: python3 crop.py out.png strip1.png [strip2.png ...]
import sys
from PIL import Image
out, srcs = sys.argv[1], sys.argv[2:]
rows = []
for src in srcs:
    im = Image.open(src); s = im.height
    tiles = [im.crop((v * s + int(s * 0.2), 0, (v + 1) * s - int(s * 0.2), s)) for v in range(5)]
    row = Image.new('RGB', (sum(t.width for t in tiles), s), (34, 38, 43)); x = 0
    for t in tiles: row.paste(t, (x, 0)); x += t.width
    rows.append(row)
sheet = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)), (34, 38, 43)); y = 0
for r in rows: sheet.paste(r, (0, y)); y += r.height
sheet.save(out); print(out, sheet.size)
