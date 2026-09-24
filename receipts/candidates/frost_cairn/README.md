# frost_cairn candidates

The brief is "frost_cairn" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`):

- `frost_cairn_a` (picked), primitives: each stone three stacked low-sided frustums, squashed, turned and tipped; a hexagonal stake leaning out to the right and back; the cloth a band, a turn and a knot with jointed tails; a frustum crust and dome of snow. Verifier: `ok frost_cairn_a 960 tris 36 meshes 1.222x1.292x0.697m`.
- `frost_cairn_b`, profiles: irregular outlines extruded with chamfers, each stone sitting on the tilted top of the one below; lathed stake, band and knot; ribbons swept along hanging curves. Verifier: `ok frost_cairn_b 914 tris 13 meshes 1.121x1.278x0.699m`.
- `frost_cairn_c`, a second reading as hand-built geometry: ragged chipped wedges, the stake resting against the upper stones, the strip wound round the top with a twisting torn tail, snow moulded over the capstone. Verifier: `ok frost_cairn_c 708 tris 6 meshes 0.913x1.255x0.69m`.

Picked A by looking at the three in the game, on the arrival shelf (`scratch/ingame_a.png`, `ingame_b.png`, `ingame_c.png`). A's stake stands apart from the stack, so the vermilion strip reads as a marker from a distance; B's stake stands close and its stack is flat; C's stake looks upright from the front and hides the stones.

Weaknesses, from the agent's report: the stones are regular pucks, so the stack looks tidy; the long tail is three straight boxes with small kinks; the stake stands free and leans away, which makes this the widest candidate; 36 meshes before the loader merges them.
