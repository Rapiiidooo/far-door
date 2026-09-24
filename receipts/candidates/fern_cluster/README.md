# fern_cluster candidates

The brief is "fern_cluster" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`):

- `fern_cluster_a`, primitives: eleven fronds, each a chain of pivoted links that tilts more at every joint, with a thin stem and pairs of flattened cones as leaflets; fiddleheads coiled from torus arcs. Verifier: `ok fern_cluster_a 2738 tris 476 meshes 1.281x0.786x1.206m`.
- `fern_cluster_b`, profiles: each frond one extrusion swept along its arch and reshaped into a stalk and a blade folded like a shallow roof, with alternating teeth; fiddleheads wound on a thinning spiral. Verifier: `ok fern_cluster_b 2924 tris 9 meshes 1.279x0.811x1.247m`.
- `fern_cluster_c` (picked), a second reading as hand-built sheets: each blade one folded sheet whose leaflets are ridges ending in teeth, twelve fronds in two rings, four upright young ones and eight low spreading ones, with beaded fiddleheads. Verifier: `ok fern_cluster_c 2098 tris 3 meshes 1.192x0.793x1.26m`.

Picked C by looking at the three in the game's forest scene beside the explorer (`scratch/ingame_lineup_abc.png`, `ingame_forest_abc_0.png`). C spreads low and wide with lit tips, as a fern does; A is airy but its tallest fronds hook over abruptly; B's solid saw-edged blades read as a cycad. C is also the lightest.

Weaknesses, from the agent's report: face-on, the four upright inner fronds read as narrow spikes; the pleated edges look jagged up close; from the front the fiddleheads hide behind the inner fronds. A small bark-umber crown at the base, with its own `timber` material, goes beyond the brief's single `foliage` material.
