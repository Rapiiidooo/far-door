# The frozen reach verification

On 24 September 2026 the owner asked for more detail everywhere, a new planet like a wild forest glimpsed on the "to be continued", and a level on ice, pushed and deployed once the play works. These checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, with real key, mouse and touch events, reading only the telemetry the game publishes.

## What is new

- **Mira's ring:** reading her journal lights two glyphs of three and the ring opens halfway, onto ice ([her ring opening](playthrough/28-mira-ring.png)); walking back through its twin returns to her camp.
- **Level 4, the frozen reach** (`game/frozen.js`, `game/world-four.js`): a frozen stream to slide down and a crevasse to jump ([crevasse](playthrough/30-frost-crevasse.png)); a frozen pond whose block of ice slides until something stops it, pushed east then north under the one low notch in the wall ([the block in place](playthrough/31-frost-block.png)); thin ice that cracks and breaks, and two floes drifting across a channel ([thin ice](playthrough/32-frost-thin-ice.png)); an island where a prism charges the disc and three charged strikes free a stela from three layers of ice that heal if left alone ([the island](playthrough/33-frost-island.png)). Its glyph, a six-pointed star, completes the address.
- **The forest** (`game/forest.js`): the great ring opens onto a wild forest of old trees, ferns and glowing mushrooms, drawn only into its portal, and the closing shot closes in on it before "To be continued" ([ring opening](playthrough/34-frost-ring-opening.png), [the forest through the door](playthrough/35-finale.png), [credits](playthrough/36-credits.png)).
- **Detail:** fallen masonry and agaves in the court, more lumen plants along the checkpoint's valley, banners, crates and builders' rubble on the new isles; fractures drawn in the ice and a grain in the snow.
- **Assets:** nine new objects through the recipe, one agent per object writing three candidates, each picked by eye in the game: [ice_block](../candidates/ice_block/README.md), [ice_spire](../candidates/ice_spire/README.md), [ice_casing](../candidates/ice_casing/README.md), [snow_pine](../candidates/snow_pine/README.md), [frost_cairn](../candidates/frost_cairn/README.md), [wild_tree](../candidates/wild_tree/README.md), [fern_cluster](../candidates/fern_cluster/README.md), [glow_mushroom](../candidates/glow_mushroom/README.md) and [rubble_pile](../candidates/rubble_pile/README.md). `node scripts/compare-candidates.mjs` captures the three candidates of an asset in the same in-game view.
- **A fix:** the last safe spot was throttled by a timer that every climb reset, so after a climb no spot was remembered for as long as the explorer had played before it; a fall on the lake sent the explorer back into the pond. It now runs on a clock that never resets.

## The whole game

`node scripts/playthrough.mjs outputs/playthrough` played from the title through the four levels to the credits and back, with no page or console error ([log](playthrough/log.json)). In the frozen reach it slid the stream at a run and jumped the crevasse, pushed the block east against a spire and north under the notch, climbed the block and the notch, ran the thin ice (the tiles broke behind it), rode both floes, charged the disc at the prism and freed the stela, and watched the ring open onto the forest. No shader program was compiled in play: 156 at the first start and 156 at the end. `--from=w4` plays the frozen reach alone and passes too.

## The public URL

Commit `bec8425` was deployed to <https://fardoor.rapidoai.dev/> as release `20260924-bec842579a5f`; every served file checked matches the commit. The first attempt was refused by the deploy script's own check and the previous release was restored at once: the check piped the page into `grep -q` under `pipefail`, which fails as soon as the page outgrows one write. The check now reads the page whole, and the second attempt went live. The jam gate, as published:

```text
=== 404 JAM VERDICT ===
url             https://fardoor.rapidoai.dev/
utc             2026-09-24T19:11:20.412Z
commit          bec842579a5f96bf76a19232feec9e0eadb1d51d
viewport        390x844 @3x phone, real touch, Android Chrome UA
network         4G: 4 Mbps down, 1 Mbps up, 60 ms latency, CPU 2x slower
ready           4.6 s   budget 20 s   PASS
weight          3.4 MB   budget 10 MB   PASS
started         yes (tap on #startb)
moved           3.2 m   needs 1 m   PASS
peak draws      412   budget 900   PASS
peak tris       324,091   budget 1,500,000   PASS
median fps      60 (ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version))
errors          0   PASS
404s            0   PASS
external deps   none
outside folder  none, every file came from the game folder
RESULT: PASS
=== END ===
```

With the software renderer forced it was ready in 8.8 s and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Other checks

- **Menus and level flow:** `node scripts/menu-check.mjs` passes 19 of 19, including a Levels screen of five starts and the way back from the frozen reach to Mira's camp, her ring still open ([results](menu-check.json)).
- **Touch:** `node scripts/touch-check.mjs` passes 36 of 36 with no page or console error, including the frozen reach in portrait and landscape with every control shown ([results](touch/log.json), [portrait](touch/16-frost.png), [landscape](touch/17-frost-landscape.png)).
- **The jam gate on the local server:** on this workstation's GPU, ready in 9.0 s, 3.4 MB, 3.2 m walked, at most 412 draws and 324,091 triangles, no error or missing file ([verdict](gate-local/gpu-verdict.json)). With the software renderer forced, ready in 14.2 s and passing ([verdict](gate-local/software-verdict.json)); the new worlds add about 0.4 s of building and the extra props about 0.3 s of the court's first frame.
- **Modules:** the recipe's ship check parses 91 modules and one page, flags no array of literals or base64, and no path leaves the folder.

## Limits

The frozen reach was played by the scripted run, not by hand, and not with touch controls on a physical phone. Its challenges ask for running jumps and quick throws: on a phone that means a full push of the stick and a timely tap. The forest is a view only; nothing there is playable yet.
