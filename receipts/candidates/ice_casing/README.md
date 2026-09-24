# ice_casing candidates

The brief is "ice_casing" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`). Each exposes `userData.parts = { outer, middle, inner }`, three child groups of shards that the game drops one layer per strike, and leaves room for the glyph stela inside.

- `ice_casing_a` (picked), primitives: rings of faceted shards leaning inwards, the outer layer tallest, with pointed tips standing proud of the crown and frost on the upper faces. Verifier: `ok ice_casing_a 690 tris 9 meshes 1.814x2.98x1.303m`.
- `ice_casing_b`, profiles: extruded shards with bevels closing into a frosted dome. Verifier: `ok ice_casing_b 2610 tris 9 meshes 1.852x3.006x1.31m`.
- `ice_casing_c`, a second reading: long vertical facets closing into a bullet-shaped shell with a small crown of points. Verifier: `ok ice_casing_c 3527 tris 9 meshes 1.797x2.98x1.209m` (after the in-game frames, which show an earlier C of 3,362 triangles).

Picked A by looking at the three in the game, on the island round the stela and with the game's translucency, which lets the stela's lens show through (`scratch/ingame_a.png`, `ingame_b.png`, `ingame_c.png`), and on the sheet. A's pointed shards read as a jagged mound of ice around something tall, as the brief asks; B closes into a smooth dome and C into a bullet. A is also the lightest.

The real stela is 1.3 x 2.4 x 0.68 m at its base, bigger than the brief's 0.9 x 0.5 m, so inside a 1.8 x 1.3 m casing the walls are only 0.25 to 0.3 m thick: every candidate had to close over the crown above 2.1 m and reads as a tall sheath rather than a broad mound. Each clears the stela's 5,616 vertices by at least 2.6 cm.

Weaknesses, from the agent's report: A reads as a faceted crystal tower with a white cone on top, and its back and ends look plain; from straight above, slivers of the stela's crown show between the points; with the outer ring gone, the middle ring leaves part of the stela visible; the fit is computed at load, about 60 ms.
