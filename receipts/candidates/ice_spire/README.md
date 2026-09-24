# ice_spire candidates

The brief is "ice_spire" in [the fifth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`):

- `ice_spire_a` (picked), primitives: each crystal an open six-sided shaft and a cone tip, split by angle so each face takes its colour, a hexagonal frost collar, and a mound of two faceted sphere caps with snow-capped boulders. Verifier: `ok ice_spire_a 689 tris 47 meshes 2.6x4x2.6m`.
- `ice_spire_b`, profiles: twelve-segment lathes pulled into bevelled hexagons, with a frost sleeve, a tapering shaft and a two-tier tip, on a jittered lathed mound with a lobed snow cap. Verifier: `ok ice_spire_b 1049 tris 41 meshes 2.656x4x2.538m`.
- `ice_spire_c`, a second reading as hand-built triangle lists: irregular six-sided crystals with skewed tips on a heap of faceted boulders, each triangle coloured by the way it faces. Verifier: `ok ice_spire_c 528 tris 4 meshes 2.592x4x2.549m`.

Picked A by looking at the three in the game, on the frozen stream under the twilight light (`scratch/ingame_a.png`, `ingame_b.png`, `ingame_c.png`). A's pale faces and white tips read as ice against the dark banks at 15 m; B reads the same but looks machined; C's darker faces and rock heap merge with the ice sheet.

Weaknesses, from the agent's report: regular prisms with single pyramid tips and no bevels, so up close they look a little like sharpened pencils; the frost bands read as plain sleeves; the back view is darker than the front; 47 meshes before the loader merges them.
