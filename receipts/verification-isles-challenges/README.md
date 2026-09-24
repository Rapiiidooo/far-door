# Level 3 challenges verification

On 24 September 2026 the owner played the dawn isles and found them great but far too simple and short, and asked for more length and challenge in level 3. They also asked for a favicon. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, with real key, mouse and touch events, reading only the telemetry the game publishes.

## What changed

The isles now run to 203 m instead of 106, with three new challenges after the twin pylons ([still views of the new sections](new-sections.png)):

- **The ferry:** an isle drifts between two others and rests for 2.6 s a stride off each rim; the explorer boards it in one rest and steps off in the other. It carries whoever stands on it, and a fall returns to the isle before ([aboard](24-isles-ferry.png)).
- **The crumbling stones:** three small isles tremble for 1.1 s under the feet, then fall into the cloud and rise again about five seconds later, so they must be crossed at a run.
- **The relay:** one charge for two pylons, with a 12 m bridge that holds for 7 s between them. The far pylon stands on the camp's isle and is struck from the small isle in between; a throw back through the crystal's beam from there charges the disc again ([the landing and its card](25-isles-stones.png)).
- **Shorter bridges:** the earlier pylons hold for 15, 12, 10 and 10 s, down from 20, 16, 12 and 12.

Objectives, markers, one-time cards and lines of narration cover each new section, the ferry's marker rides with it, and Mira's journal mentions the ferry and the stones. The favicon (`game/favicon.svg`) draws the ring, its light and the three medallions of the address; `apple-touch-icon.png` is its 180 px rendering ([at 16, 32, 64 and 180 px](favicon.png)). With it, desktop Chrome no longer asks for a missing `/favicon.ico`.

## The whole game

`node scripts/playthrough.mjs outputs/playthrough` played from the title through the three levels to the credits and back, with no page or console error ([log](playthrough-log.json)). On the isles it waited for the ferry's rest to board it and for the other rest to step off, ran the three stones from one jump to the next (they were falling and trembling behind it), charged the disc once for the relay, crossed to the small isle still glowing, woke the far pylon from there, and reached the camp, the journal and the closing shot ([pair](23-isles-pair.png), [camp](26-isles-camp.png), [finale](28-finale.png)). No shader program was compiled in play: 126 at the first start and 126 at the end. `--from=w3` plays the isles alone and passes too.

## The public URL

Commit `1c9cac4` was deployed to <https://fardoor.rapidoai.dev/> as release `20260924-1c9cac408025`; the served files checked match the commit, the favicon included. The jam gate, as published:

```text
=== 404 JAM VERDICT ===
url             https://fardoor.rapidoai.dev/
utc             2026-09-24T17:46:08.097Z
commit          1c9cac408025620f2bbae93d13cca88168bf7d65
viewport        390x844 @3x phone, real touch, Android Chrome UA
network         4G: 4 Mbps down, 1 Mbps up, 60 ms latency, CPU 2x slower
ready           4.1 s   budget 20 s   PASS
weight          3.3 MB   budget 10 MB   PASS
started         yes (tap on #startb)
moved           3.2 m   needs 1 m   PASS
peak draws      382   budget 900   PASS
peak tris       311,317   budget 1,500,000   PASS
median fps      60 (ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version))
errors          0   PASS
404s            0   PASS
external deps   none
outside folder  none, every file came from the game folder
RESULT: PASS
=== END ===
```

With the software renderer forced it was ready in 8.4 s and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Other checks

- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 18 of 18 ([results](menu-check.json)).
- **Touch:** `node scripts/touch-check.mjs outputs/touch-check` passes 34 of 34, including the isles' layout with every control shown ([results](touch-check.json)).
- **Jam gate on the local server:** the published gate passes on this workstation's GPU, ready in 8.7 s (7.8 s before the new sections) with 3.2 m walked; with the software renderer forced it is ready in 12.4 s and passes too.
- **Modules:** the recipe's ship check parses 79 modules and one page, and no path leaves the game folder.

## Limits

The new challenges were played by the scripted run, not by hand, and not with touch controls on a physical phone. The stones and the ferry ask for running jumps: on a phone that means a full push of the stick.
