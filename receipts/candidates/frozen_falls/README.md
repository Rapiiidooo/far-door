# frozen_falls candidates

The brief is "frozen_falls" in [the sixth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`). All three use the three ice colours with unnamed materials and flat shading, stand in front of one flat back face and declare `userData.mounts = 'back'`.

- `frozen_falls_a` (picked), primitives: a curtain of hexagonal columns, each a chain of one-segment frustums that bends over the brow, tucks in, swells over the bulge and flares into the apron, over a deep-ice body, with frost pads on the brows and the bulge, cone icicles and a lobed apron. Verifier: `ok frozen_falls_a 4167 tris 147 meshes 5x8.023x1.99m`.
- `frozen_falls_b`, profiles: one side profile swept across the width as a single skin, fluted by ten ridged ribs, faceted and coloured by which way each facet faces, lathed icicles. Verifier: `ok frozen_falls_b 2466 tris 4 meshes 5.02x8.009x1.909m`.
- `frozen_falls_c`, a second reading as a frozen chandelier: six lobes roll over the brow and swell into frosted heads, pillars hang from them over a glaze on the rock. Verifier: `ok frozen_falls_c 1911 tris 3 meshes 4.958x8.037x1.963m`.

Picked A in the game, where two stand against the island's back wall either side of the great ring ([the three](ingame.png)), and two more against the arrival's walls. A reads at once as a waterfall caught in ice; B reads as a fluted wall of ice and C as candle drips. The game loads its 147 parts merged into three meshes and draws all four falls as instanced copies, with round colliders along the apron.

Weaknesses, from the agent's report: it reads a little like organ pipes with a near-rectangular outline; the joints between frustums show as kinks; up close the frost pads look stuck on; its icicles are mostly lost among the columns from the front.
