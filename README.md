# Far Door

A browser prototype: an explorer descends into a sunken desert ruin, bends sunlight with bronze mirrors to light the three glyphs of an address, and walks through a stone ring that has become a live window onto another world.

It is a private prototype, not a contest entry. Every 3D object is Three.js code produced through the [404 game recipe](../404-game-recipe/GAME.md) loop: a written brief, three candidates, the verifier's four-sided sheet and a choice by eye. The briefs and sheets are in [receipts/candidates](receipts/candidates/).

## Run it

```bash
npm install
npm start            # http://localhost:3002
```

Keyboard and mouse, or a gamepad. Movement keys follow the physical layout, so ZQSD works on AZERTY.

## Check it

```bash
node scripts/playthrough.mjs outputs/playthrough   # plays from the title to the end card with real keys
node ../404-game-recipe/harness/ship.mjs game       # every module parses, nothing escapes the folder
```

The play-through needs the local server running and Google Chrome installed.
