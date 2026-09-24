# Throwaway: cut views out of a strip and lay them side by side.
# usage: crop.py <strip.png> <out.png> <views per row> <view indices e.g. 0,1,6> [row]
import sys
from PIL import Image
im = Image.open(sys.argv[1])
n = int(sys.argv[3])
idx = [int(x) for x in sys.argv[4].split(',')]
row = int(sys.argv[5]) if len(sys.argv) > 5 else 0
w = im.width // n
h = w
out = Image.new('RGB', (w * len(idx), h))
for k, i in enumerate(idx):
    out.paste(im.crop((i * w, row * h, (i + 1) * w, (row + 1) * h)), (k * w, 0))
out.save(sys.argv[2])
