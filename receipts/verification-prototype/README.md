# Prototype play-through

On 24 September 2026 `scripts/playthrough.mjs` played the whole vertical slice against a local server, from the title to the end card. It drives the game only with real key events (keyboard in physical-key codes, `?nolock=1` so headless Chrome can play without pointer lock) and steers by the telemetry the game publishes: position, camera heading and mirror catches. It never calls into the game.

## Result

Every step passed with no page or console error: the running jump across the terrace gap, hanging from the platform edge and letting go, catching the crack across the chasm, shimmying to the next platform and climbing up, the broken stair, pushing the block out of the sunlight, lighting the left stela with the first mirror, the right stela through two mirrors, the top stela through three with a jump to the island, the gate opening, the crossing and the final shot. [The log](log.json) holds each milestone and the final telemetry.

Screenshots, in order: [title](01-title.png), [hanging](02-hang.png), [shimmy](03-shimmy.png), [court](04-court.png), [first glyph](05-first-glyph.png), [third glyph](06-third-glyph.png), [gate open](07-gate-open.png), [portal](08-portal.png), [second world](09-world-two.png), [finale](10-finale.png), [end card](11-end.png).

## Other checks

- The recipe verifier passes all ten selected assets in `game/assets` (10 of 10 clean, 1,648 to 14,124 triangles each).
- The recipe ship check parses all 45 modules and finds no path leaving the game folder.

## Limits

This is headless Chrome on an Apple M5 Max with Metal, not a hands-on test. The frame rate it reports is not a performance verdict. Gamepad input and the feel of the controls still need a person at the keyboard. The play-through does not test falls into the chasm, respawns, pulling blocks or the pause screen.
