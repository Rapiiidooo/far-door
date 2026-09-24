# Level 3: the dawn isles

The owner asked on 24 September 2026 for a playable third level in the world beyond the far door, then for hosting on a new VM (subdomain of rapidoai.dev, kusanagi infra, Umami analytics).

## Design

Mira's expedition crossed the isles on ropes while dawn drifted them together; their ropes hang snapped from the rims. The explorer has Mira's disc: charged in a crystal's beam and thrown at a builders' pylon, it wakes the pylon, which projects a stepped bridge of light for a few seconds.

- Arrival isle with the far door's twin (a membrane back to the checkpoint), then two jumps across small isles.
- Isle C: crystal and pylon on the same isle, the bridge to D.
- Isle D: the pylon stands on E, across the gap, facing back.
- Isle E: two pylons in a row (E to a small rock, the rock to F) on one charge; the rock is not a respawn point.
- Isle F: Mira's camp and her note, and a ring whose address shows two glyphs of three. Reading the note starts the closing shot and the credits.

## Steps

- [x] Isle colliders measured from the isle mesh (rim and dome by bearing); bridges never count as safe ground.
- [x] `isles.js`: layout, crystals, pylons, bridges, disc targets, guide, Mira's note, finale.
- [x] `world-three.js` and `main.js`: chapter `isles`, crossings both ways, precompile, telemetry, Levels menu, ending after level 3.
- [x] `light_pylon` through the recipe: three candidates, verifier, pick by eye.
- [x] Sound and music for the isles.
- [x] Play-through and menu check cover level 3; no shader compiles in play.
- [x] Receipts for level 3 (`receipts/verification-level-3/`).
- [ ] Hosting on a new VM, `fardoor.rapidoai.dev`, in the kusanagi infrastructure, with Umami analytics. The game side is done (`game/analytics.js`, website ID `e7a2dc08-58e3-4c04-8940-bd67b7b6db42`). The deployment kit (VM, static site, edge HTTPS, analytics routes, Umami registration, release script) is drafted and syntax-checked but not installed: the session was not allowed to read the production host or write to the infrastructure repository. It needs the owner's permission for both, and an IONOS A record `fardoor` to `157.180.101.245`.
