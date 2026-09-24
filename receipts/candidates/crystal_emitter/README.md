# crystal_emitter candidates

- **a, primitives:** a square stepped pedestal of boxes whose pilasters leave two lit channels on each face, three torus-arc ribs meeting in a finial, a hexagonal crystal made of a cylinder and two cones. `ok crystal_emitter_a 2748 tris 5 meshes 1.04x2.1x1.04m`
- **b, profiles (picked):** one six-sided lathe for the pedestal with three incised rings lit at their floor, a lathed bronze collar round a lit dish, tapering tube ribs rising from bell sockets into a lathe finial, a flat-shaded six-sided lathe crystal. `ok crystal_emitter_b 3132 tris 5 meshes 1.154x2.1x0.999m`
- **c, second reading:** the ribs as three extruded bronze crescents, a square pedestal of extruded outlines with one deep lit channel per face and a lit cross over the capital, a hand-built irregular crystal. `ok crystal_emitter_c 2592 tris 5 meshes 1x2.1x1m`

B reads as a light source at once under the second world's lighting (ACES and bloom, checked in `scratch/night.html`): the crystal blooms, the dish pools light under it, the three lit rings echo the gate's grooves, and the hexagonal pedestal belongs to this world of basalt columns. A's paired channels thin out at distance; C's crescents read as curved plates rather than a cage.

Exposes `parts.crystal` (centred on its own origin, so it can spin or bob), `parts.grooves` (the rings and dish, an addition to the brief) and `beam: [0, 1.615, 0]`; load with `keepHierarchy`. Weaknesses: at emissive 2.0 the crystal clips to flat turquoise on the untoned sheet, so only its silhouette shows it faceted there; it clears the finial by 5.7 cm; the pedestal is 1.15 m across its corners on x and 1.0 m across flats on z.
