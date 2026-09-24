# Jam readiness verification

On 24 September 2026 the owner asked for Far Door to meet every requirement of the 404 game jam, judging it a stronger entry than Hungry for Trouble. The rules are in the jam repository's README and on <https://game.404.xyz/>. The gate (`harness/jam.mjs` in the recipe) loads the live URL on a 390 by 844 phone viewport under a 4G profile with the CPU slowed 2x, taps `#startb`, drags a visible `#stick` up and holds it for six seconds, and judges the ready time, weight, movement, draws, triangles, errors and missing files.

The game had no touch controls, so a phone could not play it. These changes answer the gate and a judge's phone:

- **Touch controls** (`game/touch.js`): a stick, a drag on the picture to look, and Jump, Use and pause buttons; Hang shows at an edge or while hanging, Throw while the disc is carried, Roll beyond the first door. A light push on the stick walks and never steps off an edge, like Shift on a keyboard; past three quarters of its throw the explorer runs. A tap skips a shot, puts the notes back and skips the credits. The controls show while touch is in use; a key or a moving mouse hides them, so a touch laptop keeps its keyboard layout.
- **Phone layout:** in portrait the prompt, the cards and the narration sit above two rows of buttons, the chapter title sits mid-height, and the vertical field of view widens. On a phone on its side the texts share the gap between the stick and the buttons, and the objective shrinks into its corner. Help texts and the Controls screen name the buttons. Phones start on the balanced quality setting.
- **The start:** the explorer starts 2 m further back on the terrace, west of the camp, still facing the court and the gate, so the gate's drag walks 3 m before a light push stops at the edge.
- **The edge:** a careful walk leaves the body's centre just past a lip, where the hang looked for ground and found none. It now also looks under the heels, which fixes Shift then C on a keyboard too.
- **Slow frames:** the game keeps real time down to 20 frames a second (30 before), with physics in steps of at most 1/50 s.
- **Software rendering:** on a machine without a GPU (SwiftShader, llvmpipe) the picture draws at a pixel ratio of 0.75, and only the court compiles at load; the worlds beyond the doors compile when first reached. With a GPU nothing changes: every scene still compiles behind the loading bar.
- **The letterbox:** its bars are only a frame and no longer catch a touch meant for the stick or the picture. The first touch-check run missed this; the check now repeats the gate's exact gesture.
- **The title:** "An expedition in three worlds" replaces "A prototype" on the loading, title and credits screens.
- **Analytics:** an automated browser (`navigator.webdriver`) no longer loads the tracker. The gate reports a phone's user agent, which Umami's bot filter would have counted as a visit.

## The gate against the local server

Run from the recipe folder with the installed Chrome, against `npm start` (files served uncompressed):

| run                                                  | ready  | weight | moved | peak draws | peak triangles | median fps | errors, 404s | result |
| ---------------------------------------------------- | ------ | ------ | ----- | ---------- | -------------- | ---------- | ------------ | ------ |
| `jam.mjs` as published, Metal on an Apple M5 Max     | 7.8 s  | 3.3 MB | 3.2 m | 382        | 311,317        | 60         | 0, 0         | PASS   |
| the same with `--use-angle=swiftshader`, no GPU used | 12.1 s | 3.3 MB | 3.2 m | 382        | 311,317        | 11         | 0, 0         | PASS   |

The second run copies the gate and adds one launch flag, to see what a jury machine without a GPU would get ([GPU verdict](gate-local/gpu-verdict.json), [software verdict](gate-local/software-verdict.json), [the software run's frame in motion](gate-local/software-moving.png)). In software the court's first frame costs about 4 s: ANGLE builds SwiftShader's pipelines at the first draw, so a compile call returns at once and the first frame pays. Before these changes the software run was ready in 25.9 s, compiling all three worlds. Turning shadows off would have saved only 0.5 s more, so they stay.

## Touch

`node scripts/touch-check.mjs outputs/touch-check` drives the phone viewport with real touch events: 34 of 34 checks pass with no page or console error, and no missing file ([results](touch/log.json)). It covers the gate's gesture (3.2 m walked), the title menus and help texts ([title](touch/01-title.png), [controls](touch/02-controls.png)), the opening shot skipped by a tap ([opening](touch/04-opening.png)), the stick walking to the camp and Use opening the notes ([play](touch/05-play.png), [notes](touch/07-notes.png)), a light push stopping at the terrace's edge, Hang and Jump ([edge](touch/09-edge.png), [hanging](touch/10-hanging.png)), looking by dragging, the pause button ([pause](touch/11-pause.png)), landscape ([court](touch/12-landscape.png), [checkpoint](touch/14-checkpoint-landscape.png)), the checkpoint and the isles with every control their world has ([checkpoint](touch/13-checkpoint.png), [isles](touch/15-isles.png)), and the credits skipped by a tap ([credits](touch/16-credits.png)). At each stop it checks that no visible control covers the prompt, a hint card, the narration, the objective, the health beads or the address, including with a prompt and a hint card forced up together.

## Keyboard and mouse

- `node scripts/playthrough.mjs outputs/playthrough` played from the title through the three levels to the credits and back, from the new start, with no page or console error, and 126 shader programs at the first start and at the end.
- `node scripts/menu-check.mjs outputs/menu-check`: 18 of 18 checks pass. The walk to the camp's notes now steers there from the new start.
- `node ../404-game-recipe/harness/ship.mjs game`: 79 modules and one page parse, and no path leaves the folder.

## Limits

These are Chrome emulations of a phone on a workstation; no physical phone has played this build yet. Multi-finger play is covered by the code (each pointer is tracked on its own) but the checks move one finger at a time, apart from the look drag. The software run used this workstation's CPU; a slower machine without a GPU will be slower to its first frame.
