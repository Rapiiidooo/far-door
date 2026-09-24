# Crop the five views of one verifier strip into a 2x3 grid at native resolution.
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
views = [int(v) for v in sys.argv[3].split(',')] if len(sys.argv) > 3 else [0, 1, 2, 3, 4]
im = Image.open(src)
w, h = im.size
s = w // 5
tiles = [im.crop((i * s, 0, (i + 1) * s, h)) for i in views]
cols = min(3, len(tiles))
rows = (len(tiles) + cols - 1) // cols
sheet = Image.new('RGB', (cols * s, rows * h), (34, 38, 43))
for k, t in enumerate(tiles):
    sheet.paste(t, ((k % cols) * s, (k // cols) * h))
sheet.save(out)
