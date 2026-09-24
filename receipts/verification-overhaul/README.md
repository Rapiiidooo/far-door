# Overhaul play-through

After the owner's go-ahead on 24 September 2026 (fix the bugs, improve movement and graphics, add weapons and a funny twist after the gate), `scripts/playthrough.mjs` played the whole game against a local server, from the title to the end card, with real key events only. It steers by the telemetry the game publishes (position, camera heading, mirror catches, checkpoint phase, Warden states) and never calls into the game.

## Result

Every step passed with no page or console error:

- the descent: running jump, drop to hang, crack shimmy, climb, broken stair;
- the court: pushing the block, then lighting the three stelae through one, two and three mirrors;
- the gate and the crossing;
- the checkpoint: taking the disc back, defeating the three Wardens (7 throws, no damage taken), lighting the lamp with a disc charged in the crystal's beam, and walking through the lifted barrier;
- the final shot and the end card.

[The log](log.json) holds each milestone and the final telemetry. Screenshots are numbered in play order, from [the title](01-title.png) to [the end card](15-end.png), including [the fight](11-fight.png) and [the open barrier](13-barrier-open.png).

## Other checks

- The recipe verifier passes all 24 selected assets in `game/assets` (24 of 24 clean, 1,574 to 14,124 triangles each).
- The recipe ship check parses all 64 modules and finds no path leaving the game folder.

## Limits

This ran in headless Chrome on an Apple M5 Max with Metal. It is not a hands-on test, and the frame rate it reports is not a performance verdict. The run does not exercise falls into the chasm, the knockout screen, pulling blocks, the pause settings or a gamepad.
