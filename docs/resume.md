# Far Door handoff

Far Door is the owner's second game idea: an original mix of tomb exploration (third-person traversal in carved ruins) and a gate network to other worlds. It is a prototype only. The owner asked not to submit it anywhere: the 404 jam allows one entry per person and that entry is Hungry for Trouble. Keep names, logos and signature designs of existing franchises out of it; the red lines are in [the style lock](style-lock.md).

## State

The vertical slice is playable end to end: title, descent (running jump, drop to hang, crack shimmy, climb, broken stair), the mirror puzzle (push the block out of the sunlight, three free-turning mirrors that catch on targets, three stelae), the gate opening with a live portal view, the second world and the end card. `scripts/playthrough.mjs` plays all of it with real key events; the latest run and its screenshots are in `receipts/verification-prototype/`. All ten generated assets are in the game and pass the recipe verifier. Nobody has played it by hand yet.

Two fixes live outside the assets. `main.js` copies the missing `material.dfg` block into the r186 CSM chunk, without which every fully metallic surface renders black under the rig's cascaded shadows. Mirror faces keep their flat polished material because the procedural metal surface rusts them.

## Layout

`game/` is a static folder with vendored three.js 0.186 (`npm run vendor` refreshes it). `assetlib.js`, `surfaces.js` and `rig.js` are unmodified copies from the recipe harness.

- `court.js`: the first level as a height map in 2 m cells, plus mirrors, stelae, block and scenery positions.
- `world.js`: box colliders and queries. `hero.js`: traversal states. `hero-anim.js`: procedural joint animation. `follow-camera.js`: orbit camera with rock collision.
- `terrain.js`: faceted rock, flagstone and sand geometry and shaders. `level.js`: builds the court and moves blocks and mirrors.
- `beams.js`: the 2D light tracer, mirror catches, shaft and dust. `gate.js`: channels, medallions, portal render target. `world-two.js`: the second world with its own composer.
- `hud.js`, `sound.js` (procedural WebAudio), `input.js` (layout-aware keys, pointer lock, gamepad).

Development URL parameters: `?nolock=1` plays without pointer lock, `?at=x,z,feet` starts elsewhere, `?lit=1` lights the address at once. `scripts/shot.mjs` takes a screenshot after a list of timed keys.

## Assets

Briefs: `receipts/candidates/briefs.md`. Each asset folder holds three candidates, the verifier sheet and a short README naming the choice. Run the verifier from the recipe folder with `PUPPETEER_EXECUTABLE_PATH` pointing at the installed Chrome, since puppeteer's own browser is not downloaded here.

## Next

See `tasks/prototype.md`.
