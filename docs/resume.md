# Far Door handoff

Far Door is the owner's second game idea: an original mix of tomb exploration (third-person traversal in carved ruins) and a gate network to other worlds, with a comic bureaucratic checkpoint beyond the first gate. It began as a prototype the owner did not want submitted, because the 404 jam allows one entry per person and that entry was Hungry for Trouble. On 24 September the owner judged Far Door the stronger entry, asked for it to meet every jam requirement, and chose to enter it in place of Hungry for Trouble: its source is public at <https://github.com/Rapiiidooo/far-door>. When a new release goes out, the entry's commit, its verdict block and the live files must name the same commit. It is hosted at <https://fardoor.rapidoai.dev/>. Keep names, logos and signature designs of existing franchises out of it; the red lines are in [the style lock](style-lock.md).

## State

On 24 September 2026 the owner played the overhaul and asked for a full rework. Their complaints: the game was hard to understand, hitboxes and clipping showed, there was no way back to a previous level, the menu was weak, level 2 made no sense and had no puzzle, the load between levels was catastrophic, the gate opening was not impressive, the ending stopped too soon without credits, and the arms looked like a toy figure's. The rework answers each one:

- **Menus:** a loading bar, a title menu (Continue, New game, Levels, Settings, Controls, Credits) and a pause menu (Resume, Restart, Levels, Settings, Controls, Quit). Keyboard, mouse and gamepad share one focus. Progress and settings persist in `localStorage` (`store.js`). Levels start in place, with no page reload.
- **Guidance:** a persistent objective, a marker on the next thing to reach, and one-time control cards. `story.js` steps the court; the checkpoint's `guide()` covers level 2. The previous expedition's ropes mark the lips to hang from, and chapter cards name each level.
- **Collisions:** `world.js` has round colliders and three flags (grab, stand, cam). Props use cylinders fitted to their meshes and turned with them. The colossi, the facade doorway and the gate's lower arc use measured boxes. The canyon skin stays within 0.45 m of its colliders. The camera stops at props and stelae, and feet stand on the sand drifts. Two-bone IK puts the palms on ledges, blocks and mirror drums.
- **Loading:** every scene is compiled behind the loading bar, against the render target it draws into. Light counts never change during play, and pools replace runtime objects. No shader compiles after the first level starts: the play-through asserts it.
- **The gate's set piece:** the ring arms, charges, ignites (flash, floor shockwave, blown sparks), fills with a membrane of light and clears onto the other world. Letterboxed shots frame it; Enter or Space skips it.
- **Level 2, the checkpoint:** the clerk explains that three address plates must be stamped and that Wardens stamp offenders. Taking the confiscated sun disc, or hitting a Warden with it, makes them hunt the explorer; each one paints a ring where its stamp will land. Stepping out of the ring leaves the stamp on the plate: the right Warden approves it, the wrong one voids it. Then a disc charged in the crystal's beam lights the barrier lamp, and the far door opens with the same set piece.
- **The ending:** since the level 3 work below, the far door no longer ends the game; the credits (`credits.js`) follow the isles' closing shot.
- **The explorer:** a second-pass hero with tapered sleeves, blended shoulders, hand joints and real hands. The disc sits in the palm.
- **The way back:** the first door's twin in level 2 is a membrane of light; walking back through it returns to the court, and the doors work both ways.

The owner then played the rework by hand, found it much better, and asked for more, now done:

- **The story:** a new game opens on a letterboxed shot with subtitles. A first expedition sent word from this ravine three weeks ago, then went silent, and their camp is still on the terrace. The first objective is to find them. Their field notes, the scroll in the open crate, explain the address, the mirrors, Mira's disc and the way down; they open with E. Subtitles carry the thread into level 2 (their confiscated gear, Mira's disc) and the ending.
- **The block:** the explorer keeps station on the face of a sliding block, and a move into a collider or off the floor is refused with a strain.
- **The mirrors:** they turn all the way round; the beam stops on the unpolished back.
- **Quitting to the title:** it no longer leaves the pause menu under the title menu.
- **Flicker beside the first gate:** the guardians' bottom step overlapped the gate's dais at the same height; the guardians now sit 1 cm low. An audit of coplanar faces in all three worlds also lifted the checkpoint's light pools off the sand ripples' crests.

Then the owner asked for the planet in level 2 to stop showing over the scenery, and for a third level, now done:

- **The planet:** the ringed giant's ring was drawn as a transparent surface, after the whole valley and without a depth test, so it lay over the walls and ridges. It now draws with the rest of the sky, before the valley.
- **Level 3, the dawn isles** (`isles.js`, `world-three.js`): Mira's expedition crossed the floating isles on ropes while dawn drifted them together; their ropes hang snapped from the rims. The explorer arrives through the far door's twin (a membrane back to the checkpoint), jumps two small isles, then wakes the builders' pylons with Mira's disc, charged in a crystal's beam. Each pylon throws a stepped bridge of light to the next isle for a few seconds; the second stands across the gap, and the last two share one charge. On the far isle, Mira's camp holds her journal: reading it lights two glyphs of three on her ring and starts the closing shot and the credits.
- **Isle collisions:** `world.js` has an `isle` shape, a gently domed cap inside an irregular rim, measured once off the isle's mesh by raycasts (rim and dome by bearing, boulders as round colliders) and carried to each isle's scale and turn. Bridges and the lone rock are `unsafe`: the explorer never respawns on them.
- **The new object:** `light_pylon`, through the recipe (three candidates, picked by eye in the game; see `receipts/candidates/light_pylon/`).

- **Hosting:** the game is live at <https://fardoor.rapidoai.dev/> on its own VM in the owner's infrastructure, serving the `game/` folder of a committed release, with pageview analytics in the owner's Umami (`game/analytics.js`: production only, never in an automated browser, Do Not Track and GPC respected, the page alone). The private deployment notes and scripts, including how to publish a new release, live in the owner's infrastructure repository, outside this one.

Then the owner asked for everything the jam requires; the gate plays the live URL on a phone, with a real tap and a real finger:

- **Touch controls** (`touch.js`): a stick (a light push walks and never steps off an edge, a full push runs), a drag on the picture to look, and buttons for the actions that apply where the explorer is. Taps skip shots, the notes and the credits. The controls show while touch is in use, and the help texts and Controls screen follow the device.
- **Phone layout:** texts sit above the buttons in portrait and between the stick and the buttons in landscape; the vertical field of view widens on tall screens; phones start on balanced quality.
- **The gate's drag:** `#startb` is New game and `#stick` the stick, so the gate runs with no options. The terrace start moved back from the edge, still facing the court, so the drag walks 3 m and stops at the lip.
- **Slow machines:** real time down to 20 frames a second with physics substeps. Without a GPU (SwiftShader, llvmpipe) the pixel ratio drops to 0.75 and only the court compiles at load.
- **Fixes met on the way:** after a careful walk to a lip the hang found no ground under the body's centre, and the letterbox caught touches meant for the stick.

The owner then found level 3 too short and too easy, and asked for more length and challenge, and a favicon:

- **The ferry:** past the twin pylons, an isle drifts between two others, resting 2.6 s a stride off each rim, and carries whoever stands on it (`drift` in `ISLES`; the cap, its boulders and the mesh move together).
- **The crumbling stones:** three small isles tremble for 1.1 s under the feet, fall into the cloud and rise again about five seconds later; they must be crossed at a run.
- **The relay:** one charge for two pylons with a 12 m bridge between them; the far one stands on the camp's isle and is struck from the small isle in between. A throw back through the crystal's beam from there recharges the disc.
- **Tighter bridges:** 15, 12, 10 and 10 s (20, 16, 12 and 12 before). The camp is now 203 m out instead of 106, and Mira's journal mentions the ferry and the stones.
- **The favicon:** `game/favicon.svg` draws the ring, its light and the three medallions; `apple-touch-icon.png` is rendered from it.

The latest evidence is in [receipts/verification-isles-challenges](../receipts/verification-isles-challenges/README.md), [receipts/verification-jam](../receipts/verification-jam/README.md), [receipts/verification-hosting](../receipts/verification-hosting/README.md) and [receipts/verification-level-3](../receipts/verification-level-3/README.md); the earlier rounds are in [receipts/verification-rework](../receipts/verification-rework/README.md). Nothing after the first rework has been played by hand yet, and no physical phone has played the touch controls.

## Layout

`game/` is a static folder with vendored three.js 0.186 (`npm run vendor` refreshes it). `assetlib.js`, `surfaces.js` and `rig.js` are unmodified copies from the recipe harness; do not reformat them.

- **Flow:** `main.js` (loading, precompile, chapters, crossings, the notes, the finale, loop), `menu.js`, `hud.js`, `store.js`, `story.js` (the court's steps and the scripted shots with subtitles), `credits.js`, `sound.js`, `input.js` and `touch.js` (the on-screen controls). The texts of both notes are in `index.html`.
- **Movement:** `hero.js` (traversal and combat states), `hero-anim.js` (springs, gait, overlays, arm IK), `follow-camera.js`.
- **The court:** `court.js` (map, props and their fitted shapes, ropes, starts), `level.js`, `cliffs.js`, `terrain.js`, `beams.js`, and `gate.js`, which holds the gate, its set piece, its portal and its colliders.
- **Level 2:** `world-two.js` (valley, ridges, lanterns, both gates, the disc) and `checkpoint.js` (booth, wall, plates, Wardens, clerk, phases, guide). The Warden AI is in `wardens.js`, the pooled stamp ink and rings in `fx.js`, the speech bubbles in `bubbles.js`.
- **Level 3:** `world-three.js` (sky, cloud sea, distant isles, the arrival ring, Mira's disc, the closing shot) and `isles.js` (the isles and their measured caps, the ferry and the crumbling stones, crystals, pylons, bridges, ropes, Mira's camp and ring, the guide).
- **Glyphs:** `glyphs.js` builds them in 3D; `glyph-icons.js` draws them for the HUD and the stamp ink.

Development URL parameters: `?nolock=1` plays without pointer lock, `?chapter=court|floor|checkpoint|isles` starts a level, `?w2=1` is the checkpoint, `?at=x,z,feet[,yawDeg]` starts elsewhere, `?lit=1` lights the court's address, `?barrier=1` raises the checkpoint barrier, `?cam=x,y,z,tx,ty,tz` holds the camera still, `?colliders=1` draws every collider, and `?debug=1` exposes the game on `window.__FD__`.

## Traps met on the way

- The rig asks for `PCFSoftShadowMap`, which r186 removed and swaps for `PCFShadowMap` at the first shadow pass. Programs key on the shadow type, so `main.js` sets the real type before compiling anything.
- Programs also key on the render target: a scene drawn into a composer or a portal compiles without tone mapping. Precompile each scene with its target bound and, for a portal, its clipping plane.
- Adding or removing a light recompiles every material in view. Turn lights down instead.
- Two faces that share a plane and overlap flicker in turn. When placing assets against each other, keep their steps and tops at different heights or apart.
- A transparent material always draws after every opaque one, whatever its `renderOrder`. Sky pieces that skip the depth test must be opaque (blend with `CustomBlending` when they need alpha), or they print over the scene.
- The explorer steps up at most 0.55 m. An isle's dome falls away from its centre, so anything set on an isle (a ring's dais) must sink into it rather than stand on its crown.
- A pylon that is already burning must not draw the disc's aim, or a second pylon behind it can never be struck.
- Only cameras look down their -Z; a plain `Object3D` used as a pose probe faces the target with its +Z. Cinematic probes are cameras.
- The r186 cascaded-shadow chunk never fills `material.dfg`, so `main.js` patches it, or every fully metallic surface renders black. Mirror faces keep their flat polished material.
- Ground is found under the explorer's footprint, so a body can stand with its centre just past a lip. Anything that looks for the ledge under the explorer must also look under the heels.
- Under SwiftShader, ANGLE builds pipelines at the first draw: `compileAsync` returns at once and the first frame pays, about 4 s for the court on this workstation.
- A moving isle moves its cap, its boulders, its bounding box and its mesh together, after the explorer's physics, and carries the explorer by the same step only when grounded on it; it is `unsafe`, so no respawn lands on it.
- Any full-screen layer over the game must let touches through (`pointer-events: none`), or it swallows the stick or the tap that skips a shot. Automated checks that tap elsewhere will not notice: repeat the gate's own gesture.

## Assets

The briefs are in `receipts/candidates/briefs.md`, in three waves. Each asset folder holds three candidates, the verifier sheet and a README naming the choice; the second-pass explorer is in `hero_explorer_v2/`. Some assets place their origin away from their body. The customs booth body sits 2.15 m towards -X of its origin, a queue post's base sits 0.587 m towards -X, and the expedition rope and the floating isle are placed by their `anchor` and `top` data. Run the verifier from the recipe folder with `PUPPETEER_EXECUTABLE_PATH` pointing at the installed Chrome.

## Next

See `tasks/prototype.md`.
