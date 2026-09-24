# temple_facade candidates

- **a, primitives (picked):** boxes, top-flared boxes for the stepped chamfered slabs, vertex-chamfered boxes for the pier fronts, cylinders for the medallions, a clamped egg sphere for the slit mask, and boxes with jittered front vertices, flat shaded, for the uncut cliff. `ok temple_facade_a 5844 tris 150 meshes 16x13x3m [flat by declaration: back]`
- **b, profiles:** elevation outlines with holes extruded in depth (walls, doorway orders, round sinkages in the lintel), chamfered plans extruded upward (piers), channelled sections swept sideways (crown tiers), lathed medallions, bevelled polygons for the cliff. `ok temple_facade_b 9980 tris 112 meshes 16x13x3m [flat by declaration: back]`
- **c, bedded strata:** the cliff as stacked sandstone beds with ragged lips, the carving as plan outlines pushed up course by course (stepped-corner piers, chamfered tier blocks). `ok temple_facade_c 10332 tris 155 meshes 16x12.99x3m [flat by declaration: back]`

All three share one composition, so the cliff decided it, since it covers most of the backdrop. In a low-sun render with shadows at 20 to 34 m, a's faceted blocks read as uncut rock, b's bevelled polygons as a fieldstone wall and c's beds as brick courses; the carving reads equally well in all three.

Known weaknesses: the dark interior is a basalt plate 2 m behind the frame (a walk-in recess, not an opening); the cliff is cut flat at x = ±8 m and y = 13 m, so it wants more cliff beside and above it; pilasters under a medallion frieze keep a faint classical echo, which the slit mask, stepped crown and channelled piers work against. `userData.doorway` (plain data, kept only with `keepHierarchy`) gives centre [0, 3, -0.2], size [3.5, 6, 2] and threshold [0, 0.05, 0.8].
