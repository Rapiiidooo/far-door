# Far Door handoff

Far Door is the owner's second game idea: an original mix of tomb exploration (third-person traversal in carved ruins) and a gate network to other worlds, with a comic bureaucratic checkpoint beyond the first gate. It is a prototype only. The owner asked not to submit it anywhere: the 404 jam allows one entry per person and that entry is Hungry for Trouble. Keep names, logos and signature designs of existing franchises out of it; the red lines are in [the style lock](style-lock.md).

## State

The owner loved the first slice and gave carte blanche on 24 September 2026. The game now plays from the title to a "To be continued" card:

- **The descent:** running jump, drop to hang, crack shimmy, climb, broken stair.
- **The court puzzle:** push the block out of the sunlight, turn three free-turning mirrors that catch on targets, light three stelae.
- **The gate:** it opens with a live portal view.
- **The checkpoint:** a clerk denies passage; taking the sun disc back from the confiscation bin sets off the alarm; three Wardens fight; a disc charged in the crystal's beam lights the booth's lamp and lifts the barrier.
- **The final shot** over the plain.

`scripts/playthrough.mjs` plays all of it with real key events (`--from=w2` starts at the second world). The latest run is in `receipts/verification-overhaul/`. All 24 generated assets pass the recipe verifier. Nobody has played it by hand yet.

Two fixes live outside the assets. `main.js` copies the missing `material.dfg` block into the r186 CSM chunk, without which every fully metallic surface renders black under the rig's cascaded shadows. Mirror faces keep their flat polished material because the procedural metal surface rusts them.

## Layout

`game/` is a static folder with vendored three.js 0.186 (`npm run vendor` refreshes it). `assetlib.js`, `surfaces.js` and `rig.js` are unmodified copies from the recipe harness; do not reformat them.

- **Movement:**
  - `hero.js` holds the traversal and combat states (roll, knockback).
  - `hero-anim.js` drives the joints through substepped springs, with gait curves and overlays for throw, catch and flinch.
  - `follow-camera.js` has per-action framing and multi-probe rock collision.
  - `input.js` reads keys by physical position and handles mouse buttons, the gamepad and look settings.
- **The court:**
  - `court.js` holds the height map, the puzzle pieces and the `PROPS` dressing list.
  - `cliffs.js` is the swept canyon wall.
  - `terrain.js` has the rock, masonry, flagstone and sand shaders and the occlusion field.
  - `level.js` builds the court, drifts and horizon, and moves blocks and mirrors.
  - `beams.js` is the light tracer.
  - `gate.js` builds the portal.
- **The second world:**
  - `world-two.js` holds the sky, ground, flora and sparkles, plus its own composer.
  - `checkpoint.js` holds the booth, bin, queue, beam, lamp, barrier and the clerk's script.
  - `wardens.js` holds the Warden AI and animation, `disc.js` the sun disc, and `bubbles.js` the speech bubbles.
- **Shared:** `hud.js`, `sound.js` (procedural effects and generative music) and `fx.js` (dust and stamp marks).

Development URL parameters: `?nolock=1` plays without pointer lock, `?at=x,z,feet[,yawDeg]` starts elsewhere, `?lit=1` lights the address at once, `?w2=1` starts in the second world, and `?debug=1` exposes the game on `window.__FD__`. `scripts/shot.mjs` takes a screenshot after a list of timed keys.

## Assets

Briefs: `receipts/candidates/briefs.md` (two waves). Each asset folder holds three candidates, the verifier sheet and a short README naming the choice. Some assets place their origin away from their main body. The customs booth body sits 2.15 m towards -X of its origin, a queue post's base sits 0.587 m towards -X, and the booth exposes `window`, `counter` and `inside` points. Run the verifier from the recipe folder with `PUPPETEER_EXECUTABLE_PATH` pointing at the installed Chrome, since puppeteer's own browser is not downloaded here.

## Next

See `tasks/prototype.md`.
