# Throwaway: crop a verifier strip into its views, trimmed around the figure.
# usage: python3 crop.py <strip.png> <out.png> [views...]  (views: 0..4)
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
views = [int(v) for v in sys.argv[3:]] or [0, 1, 2, 3, 4]
im = Image.open(src)
s = im.height
tiles = [im.crop((v * s + int(s * 0.25), int(s * 0.02), (v + 1) * s - int(s * 0.25), int(s * 0.98))) for v in views]
sheet = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height), (34, 38, 43))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0)); x += t.width
sheet.save(out)
print(out, sheet.size)
