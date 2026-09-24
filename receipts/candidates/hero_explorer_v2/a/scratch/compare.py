# Throwaway: stack verifier strips into rows (first-pass crop), optionally beside a reference image.
# usage: python3 compare.py <out.png> <strip.png>... [--ref=<image.png>]
import sys
from PIL import Image, ImageDraw
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opts = dict(a[2:].split('=', 1) for a in sys.argv[1:] if a.startswith('--'))
out, strips = args[0], args[1:]
rows = []
for f in strips:
    im = Image.open(f); s = im.height
    tiles = [im.crop((int(v * s + 0.22 * s), int(0.02 * s), int(v * s + 0.78 * s), int(0.98 * s))) for v in range(5)]
    row = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height), (34, 38, 43))
    x = 0
    for t in tiles: row.paste(t, (x, 0)); x += t.width
    rows.append(row)
W = max(r.width for r in rows)
mine = Image.new('RGB', (W, sum(r.height for r in rows)), (34, 38, 43))
y = 0
for r in rows: mine.paste(r, (0, y)); y += r.height
if 'ref' in opts:
    ref = Image.open(opts['ref']).convert('RGB')
    ref = ref.resize((int(ref.width * mine.height / ref.height), mine.height), Image.LANCZOS)
    both = Image.new('RGB', (ref.width + 20 + mine.width, mine.height), (60, 60, 60))
    both.paste(ref, (0, 0)); both.paste(mine, (ref.width + 20, 0))
    d = ImageDraw.Draw(both)
    d.text((10, 10), 'first pass (in game)', fill=(255, 255, 255)); d.text((ref.width + 30, 10), 'second pass, candidate A', fill=(255, 255, 255))
    mine = both
mine.save(out)
print(out, mine.size)
