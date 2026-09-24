# Relics, the forest and the relief verification

On 24 September 2026 the owner validated the frozen reach build and asked for more material and relief, above all in the snow world and a little in the others; for five hidden relics to find as achievements ("le premier papyrus", a radio in the second world, a papyrus in the middle of the third, a scarf and one more thing in the last); for the forest seen through the last door to reach further and be fuller, "rempli de surprise et d'idée", with a giant tree, fairies, a distant castle on a hill and an animal or two passing by; and pointed out that the mirror lit from the start stood in the deepest shade. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, then against the public URL.

## What changed

- **Five relics** (`game/relics.js`), each hidden off the way and glinting now and then:
  - the first papyrus, by the urns in the court's east corner ([taken](relic-check/01-papyrus.png));
  - the expedition's field radio, at the foot of the checkpoint's western spire past the barrier, its dial glowing faintly in the dusk ([taken](relic-check/02-radio.png));
  - a page of Mira's, on the isle in the middle of the stage where the ferry is awaited ([taken](relic-check/03-page.png));
  - her scarf, on a stone on the plateau above the frozen pond ([taken](relic-check/04-scarf.png));
  - her lantern, still burning in the lee of the island ([taken](relic-check/05-lantern.png)).

  Use takes one; a gold card names it and counts it ("Relic found · 2 of 5"), even with the control cards turned off. Relics stay found across new games, like achievements. The Relics screen, on the title and in pause, lists what was found and where the rest lie ([all five](relic-check/06-relics-screen.png)); forgetting the progress in Settings puts them back ([hidden again](relic-check/07-relics-hidden.png)).

- **The forest beyond the last door** (`game/forest.js`): a lighter haze and an avenue kept open onto a giant tree whose braided trunk carries glowing pods among fairy lights and, on a level hill in the haze, a castle with lit windows; a stag walks from one grazing spot to the next, birds wheel round the giant and cross the avenue, and two ranges of mountains close the horizon. Trees, ferns and mushrooms are twice as many, drawn as instanced copies ([through the ring](forest.png)).
- **The frozen reach's relief:** walls worn into layers with snow on every ledge and the recipe's stone surface laid on in world space; thirty clusters of icicles under the lips; four waterfalls caught in ice against the walls; boulders capped with snow; two ranges of snowy peaks around the valley ([the stream](frozen-stream.png), [the island](frozen-island.png), [the peaks from the arrival](frozen-arrival.png)). The snow's grain and the ice's cracks now show: the merged ground had no texture coordinates.
- **A little in the other worlds:** basalt boulders at the foot of the checkpoint's walls, and small rocks drifting beside the way across the isles ([both](other-worlds.png)).
- **The first mirror in the sun:** the sun catcher and the first mirror stood in the west wall's shade. The notch above them is now a slot cut deep into the wall, and the light through it is a spot of its own on the catcher, the floor, the block and the first mirror ([before](slot-before.png), [after](slot-after.png)).
- **Assets:** a sixth wave through the recipe, one agent per object writing three candidates, each picked by eye in the game: `field_scroll`, `field_radio`, `mira_scarf`, `mira_lantern`, `giant_tree`, `hill_castle`, `forest_deer`, `forest_bird`, `icicle_cluster` and `frozen_falls` (receipts in `receipts/candidates/`).
- **A fix met on the way:** three.js's shadow pass shares one depth material and rebuilds its program each time it goes from an instanced caster to a plain one, into whichever variant the next caster needs, so a shader compiled in play near the island. The instanced casters have a shadow material of their own. The relics cast no shadow: the lantern's see-through panes would want a shadow shader of their own.

## Checks

- **The whole game:** `node scripts/playthrough.mjs outputs/playthrough` played from the title through the four levels to the credits and back, with no page or console error; no shader program was compiled in play, 193 at the first start and 193 at the end ([log](playthrough/log.json), [the island](playthrough/33-frost-island.png), [the forest through the great ring](playthrough/35-finale.png)).
- **The relics:** `node scripts/relic-check.mjs outputs/relic-check` passes 32 of 32. In each world the explorer is set down on the way nearby and walks to the relic with real keys; the prompt offers it, Use takes it, the card counts it (1 of 5 to 5 of 5), it leaves its world and no shader compiles. After a reload the title reads "Relics · 5 of 5" and the Relics screen names all five; forgetting the progress in Settings puts all five back ([results](relic-check/results.json)).
- **Touch:** `node scripts/touch-check.mjs outputs/touch-check` passes 36 of 36; the layout test now raises a relic's card with the prompt and a hint card. Its first run found the card under a long objective on a phone held upright in the frozen reach: on a small screen the card now takes the objective's place while it shows ([results](touch-check.json)).
- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 19 of 19 ([results](menu-check.json)).
- **Jam gate on the local server:** ready in 11.6 s with the workstation's GPU (9.0 s before this round), and 14.4 s with the software renderer forced (14.2 s before), both passing. Against the public URL the gate was ready in 5.2 s (5.7 s before) and 9.7 s with the software renderer (9.0 s before).

## The public URL

Commit `ae2c321` was deployed to <https://fardoor.rapidoai.dev/> as release `20260924-ae2c321d4f37`; the served files checked match the commit. The jam gate, as published:

```text
=== 404 JAM VERDICT ===
url             https://fardoor.rapidoai.dev/
utc             2026-09-24T21:07:02.722Z
commit          ae2c321d4f37212c64d4608fca4bdeb69a1cf240
viewport        390x844 @3x phone, real touch, Android Chrome UA
network         4G: 4 Mbps down, 1 Mbps up, 60 ms latency, CPU 2x slower
ready           5.2 s   budget 20 s   PASS
weight          3.6 MB   budget 10 MB   PASS
started         yes (tap on #startb)
moved           3.2 m   needs 1 m   PASS
peak draws      417   budget 900   PASS
peak tris       324,757   budget 1,500,000   PASS
median fps      60 (ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version))
errors          0   PASS
404s            0   PASS
external deps   none
outside folder  none, every file came from the game folder
RESULT: PASS
=== END ===
```

With the software renderer forced it was ready in 9.7 s and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Limits

The relics were found by a script set down near each one, not hunted by hand, so how easy they are to spot is untested; the play-through does not take them. Nothing here was played by hand or on a physical phone.
