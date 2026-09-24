# Throwaway: crop views out of a verifier strip and enlarge them.
# usage: python3 crop.py <strip.png> <out.png> [--box=x0,y0,x1,y1 (fractions of a view)] [--scale=2] [views...]
import sys
from PIL import Image
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
src, out = args[0], args[1]
views = [int(v) for v in args[2:]] or [0, 1, 2, 3, 4]
box = [float(x) for x in opts.get('box', '0.25,0.02,0.75,0.98').split(',')]
scale = float(opts.get('scale', '1'))
im = Image.open(src)
s = im.height
tiles = []
for v in views:
    t = im.crop((int(v * s + box[0] * s), int(box[1] * s), int(v * s + box[2] * s), int(box[3] * s)))
    if scale != 1:
        t = t.resize((int(t.width * scale), int(t.height * scale)), Image.LANCZOS)
    tiles.append(t)
sheet = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height), (34, 38, 43))
x = 0
for t in tiles:
    sheet.paste(t, (x, 0)); x += t.width
sheet.save(out)
print(out, sheet.size)
