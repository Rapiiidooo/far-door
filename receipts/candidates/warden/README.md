# warden candidates

- **A, primitives:** two squashed spheres for the pear, a cylinder and hemisphere head with a flat mask slab, capsule arms, a sash of boxes laid on by raycasting, torus fingers and a stack of discs for the stamp. Verifier: `ok warden_a 5836 tris 17 meshes 1.014x1.15x0.481m`
- **B, profiles:** turned pear, legs, feet, arms and stamp (one lathe per segment where a step must stay crisp), a turned dome pressed flat in front, extruded mask plate, slit, hand and crescent, a lathe collar for the fist. Verifier: `ok warden_b 5828 tris 17 meshes 1.011x1.15x0.486m`
- **C, faceted masonry:** chamfered prisms built as flat-shaded BufferGeometry like the explorer, a sixteen-sided pear, a D-shaped mask with a chamfered plate and a real slit, the sash raycast onto the facets. Verifier: `ok warden_c 3780 tris 18 meshes 1.015x1.15x0.481m`

Picked **C**, now `game/assets/warden.js`. Under world two's light beside the hero (`scratch/w2_abc2.png`, `scratch/w2_c2.png`) B has the smoothest mask face, but C is cut in the same chamfered language as the explorer and the ruins, at two thirds of B's triangles; A reads as a diving helmet on a snowman. All three share one rig, each joint baked to one mesh per material.

Joints: `scratch/posed_walk.js` (legs ±0.5, arms opposite) and `scratch/posed_slam.js` (`rightArm.x = -2.6`, `body.x = -0.2`) verify clean with nothing detached or torn; the raised stamp clears the mask by about 5 mm and the swinging stamp stays above the ground. Loaded through `game/assetlib.js` with `keepHierarchy`, all seven joints and `parts.eye` resolve per instance, posing one instance leaves another still, and `{ height: 1.15 }` scales by exactly 1.

Weaknesses: the stamp widens the right side, so centring on the bounding box puts the body 7 cm to +X of the origin; the short arms lift the stamp beside the mask, never above it; a leg swung 0.5 rad dips its toe 3.4 cm below the rest ground; the basalt stamp head relies on its ochre band to read against night basalt.
