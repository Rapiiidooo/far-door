# Soundtrack and grass verification

On 25 September 2026 the owner asked whether easy improvements were left, suggesting "une petite soundtrack légèrement différente par niveau, avec un fade in fade out pas agressif" and grass with more triangles. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, then against the public URL.

## What changed

- **The soundtrack** (`game/sound.js`): the music was slow pads alone, which dipped to near silence between chords. It is now one small tune for the whole journey, played in each place's own mode, tempo and voice over the pads, which hand one chord to the next:
  - the court: a plucked harp in D minor, a bar every 8 s, lifted into D major once the door is open;
  - the checkpoint: vibraphone over a turning music box in E, a bar every 6.4 s;
  - the isles: a breathy flute in G with an echo, a bar every 8.8 s;
  - the frozen reach: a celesta in A minor, the slowest (10 s a bar) and the most reverberant;
  - the far door and the credits: the flute doubled by celesta in C.

  The tune's lines alternate with rests of four bars, where a few soft notes of the chord fall now and then. Every chord keeps to its place's scale, and a tune note that would rub a semitone against a held note moves onto it. Places crossfade over about six seconds with a breath between them, the Wardens' chase comes and goes in about two, and the music rises from silence when a game starts. Everything is synthesized in the browser, with no audio file.

- **Each world's air:** the wind blows in its own band and strength (a hot desert wind, a low night wind over basalt, an open gusting sky, a thin whistling cold), footfalls sound of sand, basalt, limestone or snow, and birds call in the forest under the ending and the credits.
- **Grass** (`game/grass.js`): a new recipe asset, `meadow_grass` (a seventh wave, candidate B picked in the game; see `receipts/candidates/meadow_grass/`), replaces the isles' flat fans of spikes with tufts of 32 arched blades and nodding oat heads, 784 triangles each. It is planted as instanced copies in square patches, one draw call per material and patch, and the vertex shader leans every blade with a wind that rolls across each field. It grows in sage clumps round the rims of the isles ([the arrival isle](grass-isles.png); the ferry carries its own, the crumbling stones stay bare), as a meadow over the forest floor ([through the great ring](grass-forest.png)), and as dry straw in the lee of the court's walls and round its fallen stones ([the court](grass-court.png)). No tuft grows over a relic.

## The music, measured

`node scripts/music-preview.mjs outputs/music-preview` renders the music offline through `game/sound.js` itself, place after place as a play-through would change them, at the default settings ([spectrogram](music-spectrogram.png), [levels](music-levels.json)). Every place sits between −40.0 and −36.3 dB of full scale on average, and the far door and credits at −33.1, peaking at −20.2 dB at most. At each change of place the level dips for two to four seconds, then the new place rises. The largest rise from one half second to the next, 11 dB, is a harp note in the court's second bar, 12 s in, not a change of place. With `--effects` it renders each world's wind and footfalls, between −48.4 and −43.2 dB ([levels](air-levels.json)). These are measurements, not a listening verdict: nobody has listened to it yet.

## Checks

- **The whole game:** `node scripts/playthrough.mjs outputs/playthrough` played from the title through the four levels to the credits and back, with no page or console error; no shader program was compiled in play, 197 at the first start and 197 at the end (193 before this round: the grass's programs are compiled at load with the rest) ([log](playthrough/log.json), [the isles' arrival](playthrough/20-isles-arrival.png), [the forest through the great ring](playthrough/35-finale.png)).
- **A script fix met on the way:** after the isles' clumps were thickened, the play-through from the isles (`--from=w3`) failed twice in a row on the relay's 12 m bridge: the camera stood 8 degrees off the bridge's axis, the script only turns aside beyond about 22 degrees, and the explorer walked off the side of the 1.9 m bridge. The same run passed with the sparser clumps, so the grass had only shifted the timing that sets the camera's heading there. On bridges the script now faces down the bridge first and corrects beyond 7 degrees; the run from the isles then passed, and so did the whole game above.
- **The relics:** `node scripts/relic-check.mjs outputs/relic-check` passes 32 of 32 with the grass in place, cleared round each relic ([results](relic-check/results.json)).
- **Touch:** `node scripts/touch-check.mjs outputs/touch-check` passes 36 of 36 ([results](touch-check.json)).
- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 19 of 19 ([results](menu-check.json)).
- **Grass counts:** 52 tufts in the court (8 draw calls, 40,768 triangles), 404 on the isles (34 draw calls, 316,736 triangles) and 429 in the forest (30 draw calls, 336,336 triangles). At the start of the isles the frame holds 628,842 triangles in 469 draw calls, at 60 frames a second here.
- **Jam gate on the local server:** ready in 9.6 s with the workstation's GPU (11.6 s before this round), 3.7 MB, 425 draw calls and 365,525 triangles at peak; 14.4 s with the software renderer forced (14.4 s before), both passing.

## The public URL

Commit `59e5fd6` was deployed to <https://fardoor.rapidoai.dev/> as release `20260924-59e5fd6b4d69`; the served files checked match the commit. The jam gate, as published:

```text
=== 404 JAM VERDICT ===
url             https://fardoor.rapidoai.dev/
utc             2026-09-24T22:52:51.609Z
commit          59e5fd6b4d69546d7475df2e6b3c1f6eee72b9ce
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

With the software renderer forced it was ready in 10.1 s (9.7 s before this round) and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Limits

Nobody has listened to the music or the winds yet, on speakers or on a phone; the levels above are offline measurements. Nothing here was played by hand or on a physical phone.
