# Throwaway: enlarge the head in views 0 (front), 1 (right), 2 (back), 4 (three-quarter).
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src); s = im.height
tiles = []
for v in [0, 1, 2, 4]:
    t = im.crop((v*s + int(s*0.38), int(s*0.03), v*s + int(s*0.62), int(s*0.27)))
    tiles.append(t.resize((t.width*3, t.height*3), Image.LANCZOS))
o = Image.new('RGB', (sum(t.width for t in tiles), tiles[0].height))
x = 0
for t in tiles: o.paste(t, (x, 0)); x += t.width
o.save(out); print(out, o.size)
