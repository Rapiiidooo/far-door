# Mira's ring and the way down verification

On 24 September 2026 the owner played the frozen reach build and reported a black disc in "the star gate" leading there, and asked for the climb and the jump across to the facing cliff at the start of level 1 to be necessary, perhaps with a longer way to them. The checks ran against the local server in headless Chrome with Metal on an Apple M5 Max, then against the public URL.

## What changed

- **Mira's ring:** it was built as a ring that never shows its world, yet its membrane still drew a view, which was an empty one-pixel target, hence the black disc. It is now a real portal onto the frozen reach, clipped at the arrival ring there and compiled at load like the other doors ([opened on the isles](mira-ring.png), [in the play-through](playthrough-mira-ring.png)).
- **The way down in level 1:** three shortcuts skipped the crack in the standing wall. A running jump from the terrace's west end landed straight on the platform beyond; a jump from the ledge below the west platform dropped 5.5 m into the court, which the explorer survives; and a diagonal jump from the west platform's corner reached the platform. The chasm now runs on under the terrace's west end, a broken parapet along that end is too high to jump and gives nothing to hold, and the crack's overhang reaches a metre further over the platform's lip. Each shortcut was tried again and failed: the parapet stops the first, the second falls into the chasm and returns to the ledge, and the third only catches the crack under the overhang. The climb out now comes after a longer shimmy ([shimmying](shimmy.png)).

## Checks

- **The whole game:** `node scripts/playthrough.mjs outputs/playthrough` played from the title through the four levels to the credits and back, with no page or console error. It caught the crack at x 5.09 and climbed out at 9.46. No shader program was compiled in play: 175 at the first start and 175 at the end ([log](playthrough-log.json)).
- **Touch:** `node scripts/touch-check.mjs outputs/touch-check` passes 36 of 36 ([results](touch-check.json)).
- **Menus and level flow:** `node scripts/menu-check.mjs outputs/menu-check` passes 19 of 19 ([results](menu-check.json)).

## The public URL

Commit `fc57c3c` was deployed to <https://fardoor.rapidoai.dev/> as release `20260924-fc57c3c5b501`; the served files checked match the commit. The jam gate, as published:

```text
=== 404 JAM VERDICT ===
url             https://fardoor.rapidoai.dev/
utc             2026-09-24T19:42:05.138Z
commit          fc57c3c5b50169c271a56ad51d236a591dd5decb
viewport        390x844 @3x phone, real touch, Android Chrome UA
network         4G: 4 Mbps down, 1 Mbps up, 60 ms latency, CPU 2x slower
ready           5.7 s   budget 20 s   PASS
weight          3.4 MB   budget 10 MB   PASS
started         yes (tap on #startb)
moved           3.2 m   needs 1 m   PASS
peak draws      413   budget 900   PASS
peak tris       323,371   budget 1,500,000   PASS
median fps      60 (ANGLE (Apple, ANGLE Metal Renderer: Apple M5 Max, Unspecified Version))
errors          0   PASS
404s            0   PASS
external deps   none
outside folder  none, every file came from the game folder
RESULT: PASS
=== END ===
```

With the software renderer forced it was ready in 9.0 s and passed too ([phone verdict](gate-live/phone-verdict.json), [software verdict](gate-live/software-verdict.json), [frame in motion](gate-live/phone-moving.png)).

## Limits

The shortcuts were tried by script from the spots where they worked before; a player may still find another line. Nothing here was played by hand or on a physical phone.
