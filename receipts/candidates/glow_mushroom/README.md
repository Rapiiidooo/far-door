# glow_mushroom candidates

The brief is "glow_mushroom" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`). All three expose `userData.parts.glow` holding the gills, with a spore lime emissive material that keeps its colour after the loader's surfaces.

- `glow_mushroom_a`, primitives: tapered cylinder stems on squashed bulbs, flattened sphere caps with hemisphere spots, a knob of squashed hemispheres with root flares and moss pads; per cap, an open cone of gills and plane fins. Verifier: `ok glow_mushroom_a 2832 tris 5 meshes 1.097x1.4x1.009m`.
- `glow_mushroom_b` (picked), profiles: a lathed knob with buttress ridges under a ragged moss mat, stems lathed and bent along curves so they lean out and turn up, caps lathed with drooping rims and spots, gills lathed with hand-built fins. Verifier: `ok glow_mushroom_b 2884 tris 5 meshes 1.143x1.4x0.912m`.
- `glow_mushroom_c`, a second reading: a gnarled burl on a surface root, four swept-tube stems growing from one foot as a bouquet, hand-built caps with wavy rims and warts, pleated gills, one gill mesh per mushroom. Verifier: `ok glow_mushroom_c 2966 tris 8 meshes 1.013x1.4x0.777m`.

Picked B by looking at the three in the game, through the great ring onto the forest (`scratch/ingame_a.png`, `ingame_b.png`, `ingame_c.png`), and on the sheet. At that distance the three read alike, as lit rims under dark caps; B's bent stems and drooping caps look grown rather than turned, and it keeps to five meshes, where C costs three more draws for each of the twelve mushrooms.

Weaknesses, from the agent's report: the buttresses give the knob a star-shaped footprint, the moss mat is small and mostly hidden, the gill band is thin from above, and the smallest cap sits low against the knob.
