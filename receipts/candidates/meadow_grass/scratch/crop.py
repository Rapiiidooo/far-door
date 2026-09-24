# Scratch: crop a region of a render and optionally scale it. usage: crop.py src out x0 y0 x1 y1 [scale]
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
s = float(sys.argv[7]) if len(sys.argv) > 7 else 1.0
im = Image.open(src).convert('RGB').crop((x0, y0, x1, y1))
if s != 1.0:
    im = im.resize((int(im.width * s), int(im.height * s)), Image.LANCZOS)
im.save(out)
print(out, im.size)
