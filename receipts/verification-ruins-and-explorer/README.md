# Ruins and explorer verification

On 25 September 2026 the owner asked for better graphics: the city under the sea as ruins, better fish and rays, the trees on the forest's hills buried instead of floating, and a better explorer; then renamed the game Farseek and added the name `farseek.rapidoai.dev`. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, then against the public URL.

## What changed

- **The drowned city** (`game/atlantis.js`): the last door now shows the city in ruins ([the ruins](sea-ruins.png)). Its broken rings and a temple whose dome has caved in, a crystal still glowing in the breached sanctum, stand among roofless houses and snapped towers set on the sand between the rings, columns and arches along the avenue, and pieces of the builders' court washed by the sea: two guardian colossi leaning at the avenue's mouth, fallen heads, broken columns, rubble and amphorae. Anemones glow cyan and violet and lumen plants hang their lit pods among them. The ruins are six new recipe assets ([the wave](../candidates/ruins/README.md)); the reused pieces are recipe assets from the other worlds. The pristine city's four assets left the game.
- **Fish and rays:** a banded reef fish with a lathed body, a forked tail, tall fins and ringed eyes, and a manta with swept wings and a pale belly ([the shoal under the title](sea-shoal-title.png); [the candidates](../candidates/sea-creatures/README.md)).
- **The forest's trees and rocks** (`game/forest.js`): on the far country's coarse floor, whose cells of about 7 m run under the true heights over every rise, trees on slopes and hills stood clear of the ground. Trees, ferns, mushrooms and boulders now stand on the lowest ground as drawn under their roots, the trees a little deeper still ([through the forest](forest-trees.png), [the castle's hill](castle-hill.png)).
- **The explorer** (`hero_explorer`, third pass; [the candidate](../candidates/hero_explorer_v3/README.md)): a face above the scarf with eyes, brows, a nose, a mouth, ears and a jaw, under hair with a short tail; the goggles at the throat; a backpack with a bedroll carrying the rope coil; a canteen; thigh pockets, knee patches and laced boots ([now](explorer.png), [before](explorer-before.png)). The joints, pivots, palms and grip are those of the second pass.
- **The name:** Farseek on the title screen, the tab, the credits and the closing card. The saves keep their `far-door-` keys, and the analytics still run only on `fardoor.rapidoai.dev`.

## Checks

- **The closing shot, probed:** no page or console error, 60 frames a second throughout, and 217 shader programs before and after the whole shot ([probe](closing-shot-probe.json)).
- **The whole game:** `node scripts/playthrough.mjs outputs/playthrough` played from the title through the four levels and the closing shot to the credits and back with real keys, with no page or console error; no shader program was compiled in play, 219 at the first start and 219 at the end ([log](playthrough/log.json)). The new explorer hangs, climbs, jumps and pushes as before ([hanging](playthrough/02-hang.png), [on the isles](playthrough/21-isles-jumps.png), [at the ice block](playthrough/31-frost-block.png)); the closing shot reaches the ruins ([the last door](playthrough/36-finale-last-door.png), [the ruins](playthrough/37-finale-sea.png), [the credits](playthrough/38-credits.png)).
- **Touch:** `node scripts/touch-check.mjs outputs/touch-check` passes 36 of 36 ([log](touch-check.json)).
- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 19 of 19 ([results](menu-check.json)).
- **The relics:** `node scripts/relic-check.mjs outputs/relic-check` passes 32 of 32 ([results](relic-check/results.json)).
- **The recipe:** the new assets pass the recipe's `verify.mjs --size=560` (the ruins six of six, the creatures four of four, the explorer one of one), and `harness/ship.mjs` flags nothing in the game folder.
- **Jam gate on the local server:** ready in 9.7 s with the workstation's GPU, 3.8 MB, 445 draw calls and 372,277 triangles at peak; 14.7 s with the software renderer forced; both passing.
