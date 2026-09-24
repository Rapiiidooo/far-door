# Level 3 verification

On 24 September 2026 the owner asked for two things: stop the planet in level 2 from showing over the scenery, then build the third level. These checks ran against a local server, in headless Chrome with Metal on an Apple M5 Max, driving the game with real key and mouse events and reading only the telemetry it publishes.

## The planet in level 2

The ringed giant's ring was the only transparent piece of the sky. Transparent surfaces draw after every opaque one, and the sky skips the depth test, so the ring printed over the checkpoint wall, the ridges and the far door. It now blends in the opaque pass right after the planet, before anything on the ground. Three views of the valley, before and after ([before and after](planet/ring-before-after.png)).

## The whole game

`node scripts/playthrough.mjs outputs/pt13` played from the title menu through all three levels to the credits and back to the title, with no page or console error ([log](playthrough/log.json)). The court and the checkpoint play as before ([far door open](playthrough/19-far-door-open.png)). Then, on the isles:

- **Arrival and jumps:** out of the far door's twin, then three running jumps from isle to isle ([arrival](playthrough/20-isles-arrival.png), [the first pylon's isle](playthrough/21-isles-jumps.png)).
- **The first pylon:** the disc thrown through the crystal's beam, then at the pylon's lens; its stepped bridge of light crossed to the next isle ([bridge](playthrough/22-isles-bridge.png)).
- **Across the gap:** the second pylon stands on the far isle, woken with a throw across the gap; its bridge crossed back towards it.
- **One charge, two pylons:** both woken on a single charge, both bridges crossed to the camp ([pair](playthrough/23-isles-pair.png), [camp](playthrough/24-isles-camp.png)).
- **Mira's journal and the finale:** the journal read in her camp ([journal](playthrough/25-mira-journal.png)); two glyphs of three light on her ring, and the closing shot leads to the credits ([finale](playthrough/26-finale.png), [credits](playthrough/27-credits.png)).

The run asserts that no shader program was compiled after the first level started: 126 programs at the first start and 126 at the end. `--from=w3` plays the isles alone.

## Menus and level flow

`node scripts/menu-check.mjs outputs/menu-check`: 18 of 18 checks pass ([results](menus/results.json)). New since the last receipt: the Levels screen lists four starts, and walking back through the far door's twin from the isles returns to the checkpoint with its barrier up and the far door open ([back at the checkpoint](menus/13-back-at-the-checkpoint.png)).

## Other checks

- **The new object:** `light_pylon` came through the recipe, three candidates verified and picked by eye in the game ([receipts](../candidates/light_pylon/README.md)). The verifier passes all 29 assets in `game/assets` (29/29 clean).
- **Modules:** the recipe's ship check parses all 78 modules and finds no path leaving the game folder.
- **Load and cost:** the game is ready 0.94 to 0.96 s after navigation, against 0.74 to 0.82 s before the third level; measuring the isle's cap takes 66 ms of it. On the first isle the frame draws 355 calls and 0.25 million triangles.
- **Isle collisions:** the ground under each pylon was mapped on a 0.4 m grid while placing them; every threshold now sits 0.8 m inside its rim with ground on both sides of the plinth. The play-through crosses all four bridges on foot, onto each far isle.

## Limits

Nobody has played the isles by hand yet. The runs do not exercise pointer lock, a gamepad, a phone, audio output or a slower GPU. The jumps and throws are scripted from telemetry; a human's aim with the camera is not tested.
