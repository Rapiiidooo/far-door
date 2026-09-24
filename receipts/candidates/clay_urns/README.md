# clay_urns candidates

The form favours revolved profiles, so B and C are two readings on that arm and A is the primitives baseline. The brief gives only heights, so every expect file checks the 1.0 m height alone.

- A, primitives: squashed spheres on cylinder feet, cylinder necks, torus lips, dark tori for the rings, torus handles; the broken urn is the same primitives with a wedge left out of their sweep. `ok clay_urns_a 4442 tris 32 meshes 1.138x0.995x1.191m`
- B, profiles: one smooth lathe per urn with square channels cut into the profile, a darker lathe inside, tube handles; the break pulls every vertex above a zig-zag line onto it, and the shards are the same wall revolved through a narrow arc and capped. `ok clay_urns_b 4644 tris 27 meshes 1.141x1x1.082m`
- C, second reading, hand-built: ten-sided faceted lofts through stepped, chamfered profiles, a little uneven and leaning, deep channels, square-section handles, a jagged fracture that shows the wall's thickness, and three thick shards of that wall. `ok clay_urns_c 2532 tris 17 meshes 1.14x1.006x1.096m`

Picked C (now `game/assets/clay_urns.js`): its facets and stepped rims share the hero's and the ruins' cut language and stay legible in sun (`scratch/rig_urns_0.png`); B is handsome but reads as smooth, realistic pottery beside them, and A as eggs.

Known weaknesses: the middle urn's lug handles are small; the shards are 10 to 13 cm and only read up close; terracotta is named `plaster`, because unnamed it classifies as timber and would grow wood grain.
