# Atlantis ending verification

On 25 September 2026 the owner asked for a last level through the forest to the castle (poisonous animals to avoid, traps, guards to knock out) and a last door showing a world under the sea, and whether the tenth of the week's usage left would be enough to finish and submit. Told that a full playable level would not fit, the owner chose the cheaper plan: a longer ending, with no new level. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, then against the public URL.

## What changed

- **The closing shot** (`game/world-four.js`): once the camera has closed in on the forest through the great ring (15 s), the view flies on through the forest for 22 s, 270 m down the avenue, left of the giant and up the castle's hill ([the hill](flight-castle-hill.png)). It stops before a last door nine metres before the castle's gate. The door's medallions (waves, spiral, crescent) light as the camera comes up; it charges, ignites and clears onto a city under the sea ([charging](last-door-charging.png), [open](last-door-open.png)). The camera closes in, the view passes through and glides down towards the city's temple ([the city](sea-city.png)), the title comes up over it ([the title](sea-title.png)), and at 56 s the credits roll over the city while the view drifts on. Enter or Space skips to the credits.
- **Nested views, nothing new compiled** (`game/gate.js`, `game/forest.js`): the camera itself waits at the great ring's membrane, which fills the frame; each door's view then takes a pose in its own world (`Gate.viewPose`). The forest draws its last door's view of the sea first, into that door's own target, then itself, so the two views nest. The sea's shaders are compiled behind the loading bar with the rest. The last door's target stays a single pixel until the closing shot starts.
- **The sea** (`game/atlantis.js`): built in code, with no asset. A sand plain under drifting caustic light holds three rings of pale stone houses with lit windows and copper roofs about a domed temple, towers crowned with glowing crystals, and four bridges over the old canals. Kelp sways, coral lies on the sand, three shoals of fish and two mantas, built from three.js primitives, swim on orbits computed in the vertex shader ([the shoal before the temple](sea-fish.png)), and light falls in shafts from the surface through bubbles and sea snow.
- **The forest on the way** (`game/forest.js`): ferns and grass line the flight through the far country, the castle's hand-laid haze thins as the camera nears so it is seen in its own colours at its gate, and the light shafts fade when the camera passes by them.
- **Sound** (`game/sound.js`): when the last door ignites, the music crosses to a new cue, the tune on the vibraphone in F, the slowest of all and deep in its echo; under the sea a low swell replaces the forest's birds.

## Checks

- **The closing shot, probed:** started straight from the frozen reach and photographed on its timetable, at 1280x720 and at 390x844 in portrait ([portrait frames](phone-portrait.png), [probe](closing-shot-probe.json)): no page or console error, 60 frames a second throughout, 215 shader programs before and after the whole shot, the last door arming, charging, revealing and open on time, and the credits at 56 s. The flight stays at least 3.3 m above the ground. In portrait the membranes still fill the frame.
- **The game's end, played:** `node scripts/playthrough.mjs outputs/playthrough --from=w4` played the frozen reach with real keys, watched the whole closing shot and the credits, and returned to the title with no page or console error. No shader program was compiled in play, the closing shot included: 215 at the first start and 215 at the end (197 before this round; the programs of the sea and of the forest's last door are compiled at load with the rest). The script now waits for the longer shot and checks the programs once the credits roll ([log](playthrough/log.json), [the last door](playthrough/09-finale-last-door.png), [the sea through it](playthrough/10-finale-sea.png), [the credits](playthrough/11-credits.png)).
- **The jam's rule on 3D objects:** the fish and mantas were first a few hand-placed vertices each. The rule asks for geometry built from Three.js constructors and operations, not from literal vertex arrays, so they are now a sphere and two flattened cones, and a flat four-sided cylinder with a thin one for the tail. The recipe's `harness/ship.mjs` flags nothing in the game folder, and the closing-shot probe rerun on the rebuilt shoals found the same 215 programs, no error and 60 frames a second.
- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 19 of 19 ([results](menu-check.json)).
- **Jam gate on the local server:** ready in 9.6 s with the workstation's GPU (9.6 s before this round), 3.7 MB, 425 draw calls and 365,525 triangles at peak; 14.5 s with the software renderer forced (14.4 s before), both passing.
- **Not run again:** the touch and relic checks and the play-through from the title, since the controls, the relics and the first three levels are untouched; all three passed on `59e5fd6` (`receipts/verification-soundtrack-and-grass/`).

## The public URL

Commit `54eccbb` was deployed first, as release `20260924-54eccbbd18e0`, and passed the jam gate against the public URL (ready in 5.7 s). The fish and mantas were then rebuilt from primitives, and commit `0408bd5` replaced it as release `20260924-0408bd54aaec`; the served files checked match the commit. The jam gate, as published:

```text
=== 404 JAM VERDICT ===
url             https://fardoor.rapidoai.dev/
utc             2026-09-24T23:47:20.151Z
commit          0408bd54aaec006d62513ce2ea5ba1fd3759c4c8
viewport        390x844 @3x phone, real touch, Android Chrome UA
network         4G: 4 Mbps down, 1 Mbps up, 60 ms latency, CPU 2x slower
ready           4.7 s   budget 20 s   PASS
weight          3.7 MB   budget 10 MB   PASS
started         yes (tap on #startb)
moved           3.2 m   needs 1 m   PASS
peak draws      425   budget 900   PASS
peak tris       365,525   budget 1,500,000   PASS
median fps      60 (ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version))
errors          0   PASS
404s            0   PASS
external deps   none
outside folder  none, every file came from the game folder
RESULT: PASS
=== END ===
```

With the software renderer forced it was ready in 9.9 s (10.1 s before this round) and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Limits

Nobody has watched the new ending by hand or heard its music yet. The portrait frames come from a desktop GPU at a phone's size: during the ending a phone draws three worlds a frame (the frozen reach, the forest and the sea) and may drop frames there. The level the owner first described, with poisonous animals, traps and guards, was not built.
