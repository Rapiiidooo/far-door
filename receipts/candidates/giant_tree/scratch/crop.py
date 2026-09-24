# Crop views out of a verifier strip: crop.py <name> <views e.g. 0,4> <out.png> [scale]
import sys
from PIL import Image
name, views, out = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
im = Image.open(f'_verify/{name}.png')
s = im.height
tiles = [im.crop((v * s, 0, (v + 1) * s, s)) for v in views]
sheet = Image.new('RGB', (s * len(tiles), s))
for i, t in enumerate(tiles):
    sheet.paste(t, (i * s, 0))
sheet.save(out)
print(out, sheet.size)
