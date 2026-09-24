# Crop verifier strips into single views: crop.py <strip.png> <out_prefix> [views]
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
views = sys.argv[3].split(',') if len(sys.argv) > 3 else ['front', 'right', 'back', 'left', 'tq']
names = ['front', 'right', 'back', 'left', 'tq']
im = Image.open(src)
w = im.width // 5
for i, n in enumerate(names):
    if n in views:
        im.crop((i * w, 0, (i + 1) * w, im.height)).save(f'{out}_{n}.png')
