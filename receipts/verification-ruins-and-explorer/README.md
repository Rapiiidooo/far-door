# Ruins and explorer verification

On 25 September 2026 the owner asked for better graphics: the city under the sea as ruins, better fish and rays, the trees on the forest's hills buried instead of floating, and a better explorer; then renamed the game Farseek and added the name `farseek.rapidoai.dev`. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, then against the public URL.

## What changed

- **The drowned city** (`game/atlantis.js`): the last door now shows the city in ruins ([the ruins](sea-ruins.png)). Its broken rings and a temple whose dome has caved in, a crystal still glowing in the breached sanctum, stand among roofless houses and snapped towers set on the sand between the rings, columns and arches along the avenue, and pieces of the builders' court washed by the sea: two guardian colossi leaning at the avenue's mouth, fallen heads, broken columns, rubble and amphorae. Anemones glow cyan and violet and lumen plants hang their lit pods among them. The ruins are six new recipe assets ([the wave](../candidates/ruins/README.md)); the reused pieces are recipe assets from the other worlds. The pristine city's four assets left the game.
- **Fish and rays:** a banded reef fish with a lathed body, a forked tail, tall fins and ringed eyes, and a manta with swept wings and a pale belly ([the shoal under the title](sea-shoal-title.png); [the candidates](../candidates/sea-creatures/README.md)).
- **The forest's trees and rocks** (`game/forest.js`): on the far country's coarse floor, whose cells of about 7 m run under the true heights over every rise, trees on slopes and hills stood clear of the ground. Trees, ferns, mushrooms and boulders now stand on the lowest ground as drawn under their roots, the trees a little deeper still ([through the forest](forest-trees.png), [the castle's hill](castle-hill.png)).
- **The explorer** (`hero_explorer`, third pass; [the candidate](../candidates/hero_explorer_v3/README.md)): a face above the scarf with eyes, brows, a nose, a mouth, ears and a jaw, under hair with a short tail; the goggles at the throat; a backpack with a bedroll carrying the rope coil; a canteen; thigh pockets, knee patches and laced boots ([now](explorer.png), [before](explorer-before.png)). The joints, pivots, palms and grip are those of the second pass.
- **Hanging from a ledge** (`game/hero-anim.js`): the owner saw the hands hang as open claws in front of the lip. The solver placed the palm on its goal and only then turned the hand to face the palm down, which swung the palm about the wrist and left the fingers pointing at the sky or aside, and the goal sat 1.5 cm inside the stone. Now the hand's whole turn is set first (the palm flat on the top, the fingers reaching over the stone), the wrist is brought to where the palm then rests on the lip, and the explorer hangs at the depth where that reach is met; the legs hang a little back with the knees bent, so the boots keep off the wall as they sway ([before](hang-before.png), [after](hang-after.png)).
- **Under the credits** (`game/world-four.js`): at the owner's request the view no longer drifts to a stop but turns slowly about the drowned city for as long as the credits roll, about a degree a second, easing in from where the glide ends, drawing in over the second ring clear of the towers, and rising and sinking a metre ([turning](credits-orbit-a.png), [further round](credits-orbit-b.png)). The credits' line on the recipe no longer says three candidates, since the last waves had one or two.
- **The name:** Farseek on the title screen, the tab, the credits and the closing card. The saves keep their `far-door-` keys, and the analytics still run only on `fardoor.rapidoai.dev`.

## Checks

- **The closing shot, probed:** no page or console error, 60 frames a second throughout, and 217 shader programs before and after the whole shot ([probe](closing-shot-probe.json)).
- **The whole game:** `node scripts/playthrough.mjs outputs/playthrough` played from the title through the four levels and the closing shot to the credits and back with real keys, with no page or console error; no shader program was compiled in play, 219 at the first start and 219 at the end; it was played again, with the same result, once the hands were set flat on the lip ([log](playthrough/log.json)). The new explorer hangs, climbs, jumps and pushes as before ([hanging](playthrough/02-hang.png), [on the isles](playthrough/21-isles-jumps.png), [at the ice block](playthrough/31-frost-block.png)); the closing shot reaches the ruins ([the last door](playthrough/36-finale-last-door.png), [the ruins](playthrough/37-finale-sea.png), [the credits](playthrough/38-credits.png)).
- **Touch:** `node scripts/touch-check.mjs outputs/touch-check` passes 36 of 36 ([log](touch-check.json)).
- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 19 of 19 ([results](menu-check.json)).
- **The relics:** `node scripts/relic-check.mjs outputs/relic-check` passes 32 of 32 ([results](relic-check/results.json)).
- **The recipe:** the new assets pass the recipe's `verify.mjs --size=560` (the ruins six of six, the creatures four of four, the explorer one of one), and `harness/ship.mjs` flags nothing in the game folder.
- **Jam gate on the local server:** ready in 9.7 s with the workstation's GPU, 3.8 MB, 445 draw calls and 372,277 triangles at peak; 14.7 s with the software renderer forced; both passing.

## The public URL

The game is served under both `https://farseek.rapidoai.dev/` and `https://fardoor.rapidoai.dev/`: the owner added the name's A record, and the edge's HTTP site, certificate and HTTPS site were extended to it (`add-domain.sh` in the private deployment notes). The source moved to <https://github.com/Rapiiidooo/farseek>; the old address redirects. Commit `c97091b` was deployed as release `20260925-c97091b1edcc` and passed the gate there (ready in 5.2 s); commit `b5a0af7`, with the hands set flat on the lip and the view turning under the credits, replaced it as release `20260925-b5a0af7174fb`. Its first deploy was refused by the deploy script's own check, which looked for the page title Far Door, and the previous release was restored; the check now accepts either title, and the second deploy went through. The served files checked match the last commit. The jam gate on it, as published:

```text
=== 404 JAM VERDICT ===
url             https://farseek.rapidoai.dev/
utc             2026-09-25T07:36:47.891Z
commit          b5a0af7174fba418290e22d2f0667ea8597becd5
viewport        390x844 @3x phone, real touch, Android Chrome UA
network         4G: 4 Mbps down, 1 Mbps up, 60 ms latency, CPU 2x slower
ready           5.2 s   budget 20 s   PASS
weight          3.8 MB   budget 10 MB   PASS
started         yes (tap on #startb)
moved           3.2 m   needs 1 m   PASS
peak draws      445   budget 900   PASS
peak tris       372,277   budget 1,500,000   PASS
median fps      60 (ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version))
errors          0   PASS
404s            0   PASS
external deps   none
outside folder  none, every file came from the game folder
RESULT: PASS
=== END ===
```

With the software renderer forced it was ready in 10.0 s and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Limits

Nobody has looked at the ruins, the creatures or the new explorer by hand yet, nor on a physical phone. The ruins, the creatures and the explorer's third pass had one or two candidates each where earlier waves had three. The explorer's face is small on screen in play and shows mostly in the letterboxed shots. Pageview analytics are still collected only under `fardoor.rapidoai.dev`.
