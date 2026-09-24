# Rework verification

On 24 September 2026 the owner played the overhaul and listed what was wrong: the game was hard to understand, hitboxes and clipping were visible, there was no way back to the previous level, the menu was weak, the second level made no sense and had no puzzle, the load between levels was catastrophic, the gate opening was not impressive, the ending stopped too soon without credits, and the explorer's arms looked like a toy figure's. These checks ran on the reworked game against a local server, in headless Chrome with Metal on an Apple M5 Max. They drive the game with real key events and read only the telemetry it publishes.

## The whole game

`node scripts/playthrough.mjs outputs/pt9` played from the title menu to the credits and back to the title, with no page or console error ([log](playthrough/log.json)). It skips the opening shot with Enter and does not read the expedition's notes, so the objective moves on without them:

- **The descent:** gap jump, drop to hang, crack shimmy, climb and stair, guided by the objective, the marker and the expedition's ropes ([hang](playthrough/02-hang.png), [shimmy](playthrough/03-shimmy.png)).
- **The court:** block pulled off the beam, then the three stelae lit through one, two and three mirrors.
- **The gate's set piece:** it charges, ignites and clears onto the second world ([charge](playthrough/07-gate-charge.png), [ignition](playthrough/08-gate-ignition.png), [reveal](playthrough/09-gate-reveal.png)).
- **The checkpoint:** the clerk's briefing, the disc taken from the bin, then each address plate stamped by its matching Warden, luring each one onto its plate and stepping out of its ring. That took one throw, four dodges and no damage ([ring](playthrough/15-stamp-ring.png), [stamped](playthrough/16-stamped.png)).
- **The lamp and the barrier:** one throw through the crystal's beam lit the lamp and raised the barrier ([barrier](playthrough/17-barrier-open.png)).
- **The ending:** the far door opened onto the third world. The closing shot, the title and the credits followed, then the title menu ([finale](playthrough/20-finale.png), [credits](playthrough/21-credits.png)).

The run asserts that no shader program was compiled after the first level started. It measured 103 programs at the first start and 103 after the far door. Every scene is compiled behind the loading bar against the render target it is drawn into, with the shadow type fixed beforehand.

## Menus and level flow

`node scripts/menu-check.mjs outputs/menu-check`: 17 of 17 checks pass ([results](menus/results.json)).

- **Title menu:** it offers Continue once a level beyond the first start has been reached ([title](menus/01-title.png)).
- **Levels:** the screen lists every reached start ([levels](menus/02-levels.png)); Back returns to the title menu.
- **Settings and Controls:** settings change and persist ([settings](menus/03-settings.png)); the controls screen opens.
- **Continue:** it resumes the checkpoint.
- **The way back:** walking back through the first door's membrane returns to the court, with its gate already open ([court](menus/06-back-in-the-court.png)).
- **Pause:** Escape pauses ([pause](menus/07-pause.png)). The pause menu's Levels starts the court floor, and Restart keeps the level.
- **Quit:** from the checkpoint's pause menu, Quit leaves the title menu alone on screen ([title](menus/09-quit-to-title.png)).
- **Credits:** they roll from the title menu, and Escape skips them.
- **New game:** it opens on the expedition's story with the objective "Find the first expedition". E at the camp's crate opens the notes ([notes](menus/11-notes.png)); closing them moves the objective on.
- **Knockout:** standing still before angry Wardens ends in "Processed" ([processed](menus/12-processed.png)), then a respawn at the head of the plaza with full composure.

## The second round

The owner played the rework by hand, found the rest much better, and reported four things. Each fix was checked in headless Chrome as above; the push and the mirror used one-off probes that are not in `scripts/`.

- **The block push clipped the explorer into the stone.** The explorer now keeps station on the face of the sliding block instead of running its own clock. Sampled every 0.22 s through a push and a pull, the explorer's centre stayed 0.47 to 0.57 m from the moving face, for a body radius of 0.32 m ([pull](second-round/05-pull.png)). A move into another collider or off the floor is refused with a strain pose, a scrape of stone and, the first time, a card saying why. The block could be pushed north into the boulder beside it; that move is refused now, and the block leaves the beam southwards.
- **Some mirrors stopped short of a full turn.** A lit mirror used to stop at the edge of the light. Mirrors now turn all the way round; the beam stops on the unpolished back and returns as the face comes round. The probe turned the first mirror through all twelve 30-degree sectors ([turning](second-round/06-mirror-turn.png)).
- **Quitting to the title from level 2 showed two menus.** Opening a menu screen now hides every other panel, and the chapter card clears at once. The menu check counts the panels showing after the quit.
- **The start gave no reason to be there.** A letterboxed opening shot says that a first expedition sent word from this ravine three weeks ago, then went silent ([opening](second-round/01-opening.png)), and ends on their abandoned camp ([camp](second-round/02-camp.png)). The first objective is to find them. Their field notes lie in the open crate, where the scroll already was: they explain the address, the mirrors, Mira's light-drinking disc and the way down. Closing them shows a line from the explorer and moves the objective on, and the next control card waits until the line is over ([line](second-round/03-after-the-notes.png), [card](second-round/04-first-hint.png)). The thread goes on in level 2, where the explorer recognises the expedition's confiscated gear and Mira's disc, and in the ending.

## The third round

The owner then saw two textures flicker in turn beside the first gate ([the spot, reproduced](third-round/01-dais-before.png)).

- **Cause:** each seated guardian's bottom step reached 17 cm onto the gate's dais, and both tops sat at 0.5 m. Apart from the animated explorer and flames, frames rendered from cameras 4 mm apart differed only along that strip, on both sides of the gate ([difference, in green](third-round/02-dais-before-diff.png)).
- **Fix:** the guardians and their colliders sit 1 cm lower, so the step passes under the dais. The same renders no longer differ there ([after](third-round/03-dais-after.png), [difference](third-round/04-dais-after-diff.png)).
- **Other cases:** a one-off audit listed every overlapping pair of flat faces that share a plane and a facing but not a material, in all three worlds. The checkpoint's pools of lantern light lay at the height of the sand ripples' crests (3 cm) and now sit at 5 cm. Every other pair lies inside a solid, behind another part, under the floor or on a face turned away from play; close and distant renders of the ones nearest to view showed no flicker.

## Other checks

- **Assets:** the recipe verifier passes all 28 assets in `game/assets` (28/28 clean). That includes the second-pass explorer and the four third-wave objects; their candidates and choices are in `receipts/candidates/`.
- **Modules:** the recipe's ship check parses all 75 modules and finds no path leaving the game folder.
- **Colliders:** screenshots with `?colliders=1` showed each fitted collider against its mesh. Props turn with their meshes; the colossi, facade doorway and gate arc are stacked boxes; the canyon face stays within 0.45 m of its colliders.
- **Load and cost:** the game is ready 0.74 to 0.82 s after navigation. It draws 500 to 730 calls and 0.4 to 0.5 million triangles, depending on the world. Headless frame rates are not a performance verdict.

## Limits

The owner has played the first rework by hand, not yet the later rounds. The runs do not exercise pointer lock, a gamepad, a phone, audio output or a slower GPU. The knockout check stands still; it does not test dodging by hand.
