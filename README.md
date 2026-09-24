# Far Door

A browser prototype in three levels. An explorer follows a lost expedition down into a sunken desert ruin and bends sunlight with bronze mirrors onto the three glyphs of an address, and the stone ring before the ruin opens onto another world. There, a gate network's customs checkpoint will not let anyone through without the destination address stamped by its Wardens, who only stamp offenders. A second door opens onto a sky of floating isles, crossed on bridges of light that the builders' pylons throw when struck by a charged sun disc, to the expedition leader's last camp and a ring whose address is missing a glyph. The credits follow.

It is a prototype, not a contest entry, played at <https://fardoor.rapidoai.dev/>. Every 3D object is Three.js code produced through the [404 game recipe](../404-game-recipe/GAME.md) loop: a written brief, three candidates, the verifier's four-sided sheet and a choice by eye. The briefs and sheets are in [receipts/candidates](receipts/candidates/).

## Run it

```bash
npm install
npm start            # http://localhost:3002
```

Keyboard and mouse, or a gamepad. Movement keys follow the physical layout, so ZQSD works on AZERTY. Escape pauses; the pause menu and the title menu both reach any level already visited.

## Check it

```bash
node scripts/playthrough.mjs outputs/playthrough   # plays from the title to the credits with real keys
node scripts/menu-check.mjs outputs/menu-check     # menus, levels, pause, the ways back, the notes, a knockout
node ../404-game-recipe/harness/ship.mjs game       # every module parses, nothing escapes the folder
```

Both scripts need the local server running and Google Chrome installed. The play-through fails if any shader compiles after the first level starts; `--from=w2` or `--from=w3` starts it at the checkpoint or on the isles.
