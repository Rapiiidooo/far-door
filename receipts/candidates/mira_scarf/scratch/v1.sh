#!/bin/zsh
# Verify one candidate on its own: copy it into scratch/<letter>/, run the gate at 560 px and
# crop the five views to scratch/<letter>/view_<n>.png. Usage: zsh v1.sh a
set -e
HERE=/Users/rapido/perso/bittensor/404/far-door/receipts/candidates/mira_scarf
L=$1
mkdir -p $HERE/scratch/$L
cp $HERE/mira_scarf_$L.js $HERE/scratch/$L/
[ -f $HERE/mira_scarf_$L.expect.json ] && cp $HERE/mira_scarf_$L.expect.json $HERE/scratch/$L/
cd /Users/rapido/perso/bittensor/404/404-game-recipe
PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" node harness/verify.mjs $HERE/scratch/$L --size=560 2>&1 | grep -v "^sheet\|^report\|^$" || true
python3 -c "
from PIL import Image
im = Image.open('$HERE/scratch/$L/_verify/mira_scarf_$L.png'); s = im.size[1]
for i in range(5): im.crop((i*s, 0, (i+1)*s, s)).save('$HERE/scratch/$L/view_%d.png' % i)
"
