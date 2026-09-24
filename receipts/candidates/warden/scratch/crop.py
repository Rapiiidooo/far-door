# Throwaway: crop views out of a verifier strip. usage: crop.py <strip.png> <out.png> <views e.g. 0,1,2> [zoom box as fractions x0,y0,x1,y1]
import sys
from PIL import Image
im = Image.open(sys.argv[1])
W, H = im.size
n = 5
vw = W // n
views = [int(v) for v in sys.argv[3].split(',')]
box = [float(f) for f in sys.argv[4].split(',')] if len(sys.argv) > 4 else [0, 0, 1, 1]
tiles = []
for v in views:
    x0 = v * vw
    t = im.crop((x0 + int(box[0] * vw), int(box[1] * H), x0 + int(box[2] * vw), int(box[3] * H)))
    tiles.append(t)
out = Image.new('RGB', (sum(t.size[0] for t in tiles), max(t.size[1] for t in tiles)), (34, 38, 43))
x = 0
for t in tiles:
    out.paste(t, (x, 0)); x += t.size[0]
out.save(sys.argv[2])
print(out.size)
