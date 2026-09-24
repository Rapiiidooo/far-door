# Throwaway: upper bodies of the first pass's poses.png (left of each pair) beside this candidate
# in the same poses (right), from scratch/firstpass_poses/_verify. python3 compare_zoom.py
from PIL import Image
ref = Image.open('/Users/rapido/perso/bittensor/404/far-door/receipts/candidates/hero_explorer/scratch/poses.png').convert('RGB')
tw, th = ref.width // 5, ref.height // 3
mine = [Image.open(f'firstpass_poses/_verify/posed_fp_{n}.png').convert('RGB') for n in ('hang', 'run', 'look')]
def ref_tile(col, row):
    t = ref.crop((col * tw, row * th, (col + 1) * tw, (row + 1) * th))
    return t.crop((int(0.05 * tw), 0, int(0.95 * tw), int(0.55 * th)))
def my_tile(im, col):
    s = im.height
    t = im.crop((col * s + int(0.22 * s), int(0.02 * s), col * s + int(0.78 * s), int(0.98 * s)))
    return t.crop((int(0.05 * t.width), 0, int(0.95 * t.width), int(0.55 * t.height)))
pairs = []
for row, cols in ((0, (0, 4)), (1, (1, 4)), (2, (0, 4))):
    for c in cols:
        a, b = ref_tile(c, row), my_tile(mine[row], c)
        a = a.resize((int(a.width * 420 / a.height), 420), Image.LANCZOS)
        b = b.resize((int(b.width * 420 / b.height), 420), Image.LANCZOS)
        p = Image.new('RGB', (a.width + b.width + 8, 420), (90, 90, 90))
        p.paste(a, (0, 0)); p.paste(b, (a.width + 8, 0)); pairs.append(p)
W = max(p.width for p in pairs)
grid = Image.new('RGB', (W * 2 + 16, 428 * 3), (20, 20, 20))
for i, p in enumerate(pairs): grid.paste(p, ((i % 2) * (W + 16), (i // 2) * 428))
grid.save('firstpass_compare_zoom.png'); print('firstpass_compare_zoom.png', grid.size)
