# queue_post candidates

- `queue_post_a`, profiles: a revolved stepped base with a groove, bronze post and cup, a lathed ball, a tube swept along a solved catenary, bronze ferrules and a swept J-hook. Verifier: `ok queue_post_a 2080 tris 4 meshes 1.525x1x0.35m`.
- `queue_post_b`, primitives: stacked cylinders and frustums, a sphere, tori for the eyes, the rope as one torus arc (a circular sag) and a half-torus hook. Verifier: `ok queue_post_b 1812 tris 4 meshes 1.521x1x0.35m`.
- `queue_post_c` (picked, now `game/assets/queue_post.js`), a second reading in the profile arm the form favours: a three-tier grooved base, a collared post, a chalk ball girdled by a bronze band that carries the eyes, and three stamp-ochre strands twisted round the catenary. Verifier: `ok queue_post_c 2392 tris 4 meshes 1.524x1x0.35m`.

Picked C: the twisted strands read as rope where A and B read as a hose; otherwise the three agree, and the primitives arm won nothing back.

To line posts up, put the next post's `userData.post` (its foot) on this one's `userData.nextPost` (1.4 m along +x): each hook then threads the next post's -x eye, checked with three posts in `scratch/line_c.mjs`.

Weaknesses: a lone post, or the last of a line, leaves its hook hanging in the air 1.4 m out at post height, so end a line against something. The ball has 12 segments and looks faceted up close.
