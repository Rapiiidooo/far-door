# ice_block candidates

The brief is "ice_block" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`). The game loads ice with procedural surfaces off and gives it its gloss.

- `ice_block_a`, primitives: a deep-ice core box, twelve glacier-white bevel bars and octahedron corners, each face crazed into about fourteen staggered frusta of ice blue with one lower "spall" per wall. Verifier: `ok ice_block_a 1464 tris 98 meshes 1.9x1.9x1.9m`.
- `ice_block_b` (picked), a profile sweep: a hand-built loft of a chamfered square section, walls and cap as jittered grids round a bulge or dip per face, chips sunk into sloped deep-ice scallops, and a raised frost crust on top. Verifier: `ok ice_block_b 1006 tris 8 meshes 1.9x1.892x1.894m`.
- `ice_block_c`, a second reading: a clear shell round a dark core, each wall a faceted frame round one irregular window cut back to the core, with bubbles on it. Verifier: `ok ice_block_c 822 tris 8 meshes 1.9x1.9x1.9m`.

Picked B by looking at the three in the game, on the frozen pond (`scratch/ingame_a.png`, `ingame_b.png`, `ingame_c.png`). B reads as one clear block of ice with a crust of frost; A's crazing reads as cracked tiles, and C's single window per face as a porthole.

Weaknesses, from the agent's report: the faceting is fine-grained rather than chunky, the chips are small so the dark core shows only in a few triangles, the bubbles vanish beyond about 10 m, and the top reaches 1.892 m of the 1.9 m block (its collider is the full 1.9 m). All three bevel the bottom edges, so the flat contact patch is 1.73 m square.
