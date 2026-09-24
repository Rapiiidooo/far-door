# Throwaway: crop the verifier strip into a tighter 2x-row image for eyeballing.
# usage: python3 crop.py <strip.png> <out.png> [views...]  (views: 0..4)
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
views = [int(v) for v in sys.argv[3:]] or [0, 1, 2, 3, 4]
im = Image.open(src)
s = im.height
tiles = []
for v in views:
    t = im.crop((v * s, 0, (v + 1) * s, s))
    # trim the empty margins left and right of the figure
    tiles.append(t.crop((int(s * 0.22), int(s * 0.02), int(s * 0.78), int(s * 0.98))))
w = sum(t.width for t in tiles)
sheet = Image.new('RGB', (w, tiles[0].height), (34, 38, 43))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0)); x += t.width
sheet.save(out)
print(out, sheet.size)
