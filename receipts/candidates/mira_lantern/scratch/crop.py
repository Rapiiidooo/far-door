# crop.py <png> <out> <view indices, comma separated> [scale]
# Cuts views out of a verifier strip (five square views side by side) and lays
# them next to each other, optionally enlarged, so small details can be judged.
import sys
from PIL import Image
src, out, views = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')]
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
im = Image.open(src)
s = im.height
tiles = [im.crop((v * s, 0, v * s + s, s)) for v in views]
sheet = Image.new('RGB', (s * len(tiles), s))
for i, t in enumerate(tiles):
    sheet.paste(t, (i * s, 0))
if scale != 1.0:
    sheet = sheet.resize((int(sheet.width * scale), int(sheet.height * scale)), Image.LANCZOS)
sheet.save(out)
print(out, sheet.size)
