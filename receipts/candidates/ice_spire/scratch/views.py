# Scratch: stack chosen verifier views of each candidate into one image at full size.
# usage: python3 views.py <out.png> <view indexes, e.g. 0,2,4> <name>...
import sys
from PIL import Image
out, idx, names = sys.argv[1], [int(i) for i in sys.argv[2].split(',')], sys.argv[3:]
base = '/Users/rapido/perso/bittensor/404/far-door/receipts/candidates/ice_spire/_verify/'
rows = []
for n in names:
    im = Image.open(base + n + '.png')
    w = im.width // 5
    rows.append([im.crop((i * w, 0, (i + 1) * w, im.height)) for i in idx])
W, H = rows[0][0].width, rows[0][0].height
sheet = Image.new('RGB', (W * len(idx), H * len(rows)))
for r, row in enumerate(rows):
    for c, v in enumerate(row):
        sheet.paste(v, (c * W, r * H))
sheet.save(out)
