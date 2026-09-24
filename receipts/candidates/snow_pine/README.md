# snow_pine candidates

The brief is "snow_pine" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`). Each is one mesh per material (pine needle `foliage`, bark `timber`, snow `ground`) and exposes plain data `userData.trunk`.

- `snow_pine_a`, primitives: five tiers and a crooked tuft, each a one-segment cone slope, an open band skirt with a serrated hem and a flipped cone underside, with a snow cap from the same kit. Verifier: `ok snow_pine_a 1208 tris 3 meshes 4.15x7.006x4.079m`.
- `snow_pine_b`, profiles: six lathed tiers from an umbrella profile that changes with the angle, each with a swept snow profile ending in a ragged lip, and a bent lathe spire. Verifier: `ok snow_pine_b 2466 tris 3 meshes 4.366x7x4.366m`.
- `snow_pine_c` (picked), a second reading as boughs rather than tiers: six whorls of hand-lofted boughs that rise off the trunk then droop, each carrying its own snow slab, round a dark core, with a crooked leader and root spurs. Verifier: `ok snow_pine_c 3138 tris 3 meshes 3.948x7x3.784m`.

Picked C by looking at the three in the game, on the frozen reach's plateau (`scratch/ingame_plateau_a.png`, `ingame_plateau_b.png`, `ingame_plateau_c.png`, and the agent's `ingame_15m.png`, `ingame_30m.png`). C's drooping boughs and dark green read as a conifer against the snow at 15 to 30 m; A's banded cone and B's stacked plates read as ornaments.

Weaknesses, from the agent's report: it is the heaviest of the three; its silhouette is the most open, so sky shows between whorls from a low camera; the snow slabs read as scattered patches; the load shows more through droop than as one heavier side. The agent also found that the verifier's three.js (r169) drops half the faces of a `ConeGeometry` with more than one height segment, which the game's r186 renders whole.
