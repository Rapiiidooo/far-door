# icicle_cluster candidates

The brief is "icicle_cluster" in [the sixth wave](../briefs.md). One agent built three candidates from the same brief and style lock, each with its own construction strategy, and verified them together (`_verify/sheet.png`, `--size=560`). Each is three meshes of unnamed ice materials and exposes `userData.anchor`, the middle of the crust's top edge on the rock side, and `userData.mounts = 'top'`.

- `icicle_cluster_a`, primitives: twelve six-sided cones hanging from bars with icosahedron lumps, a deep-ice cone inside each root, two fused pairs and a doubled icicle. Verifier: `ok icicle_cluster_a 1082 tris 3 meshes 2.38x1.55x0.306m`.
- `icicle_cluster_b` (picked), profiles: each icicle a six-segment lathe of a drawn profile, slightly oval, twisted and bent, with an inner lathe for the core, under a crust lofted along the row, one fused pair and a spur from a drip. Verifier: `ok icicle_cluster_b 1786 tris 3 meshes 2.4x1.55x0.294m`.
- `icicle_cluster_c`, a second reading: icicles hanging in fused clumps from faceted hearts of deep ice under a crust of bevelled slabs. Verifier: `ok icicle_cluster_c 1492 tris 3 meshes 2.4x1.54x0.312m`.

Picked B in the game, hung from the lips of the frozen stream's banks ([the three](ingame.png)). All three read as icicles there; B's lengths vary most naturally and its crust is the quietest, where A's crust looks busy and C leaves bare gaps between clumps. The game hangs thirty of them by their anchor under the lips along the whole reach, as instanced copies in three draw calls.

Weaknesses, from the agent's report: the smooth crust can read as a white board; the fused root and the spur only read up close; it has the most triangles of the three.
