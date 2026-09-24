# Throwaway: split a verifier strip into views. usage: crop.py <strip.png> <out_prefix> [views e.g. 0,4] [zoom box x0,y0,x1,y1 in view px]
import sys
from PIL import Image
im = Image.open(sys.argv[1])
n = 5
w = im.width // n
views = [int(x) for x in sys.argv[3].split(',')] if len(sys.argv) > 3 else range(n)
for i in views:
    v = im.crop((i * w, 0, (i + 1) * w, im.height))
    if len(sys.argv) > 4:
        x0, y0, x1, y1 = [int(x) for x in sys.argv[4].split(',')]
        v = v.crop((x0, y0, x1, y1)).resize(((x1 - x0) * 2, (y1 - y0) * 2), Image.LANCZOS)
    v.save(f"{sys.argv[2]}_{i}.png")
