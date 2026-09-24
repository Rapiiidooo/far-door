# hero_explorer candidates

- **A, primitives:** spheres, tapered cylinders, boxes, tori and capsules. Verifier: `ok hero_explorer_a 11154 tris 33 meshes 0.683x1.75x0.396m`
- **B, profiles:** lathe jacket, limbs, cap and goggle cups; extruded boots, brim, mitten hands, satchel and scarf tail; tube-swept rope helix and scarf wraps. Verifier: `ok hero_explorer_b 11184 tris 33 meshes 0.673x1.751x0.411m`
- **C, faceted:** chamfered 8- and 12-sided prisms built as flat-shaded BufferGeometry, straps and pockets raycast onto the facets, the scarf as a cowl plus a face mask. Verifier: `ok hero_explorer_c 3856 tris 33 meshes 0.691x1.75x0.423m`

Picked **C**, now `game/assets/hero_explorer.js`. In a sunlit sandstone test (`scratch/dist_grid.png`) all three read alike at 15 m, but at 8 m C has the chunkiest mass and the clearest head (cap, visor, bronze goggles), and its cut planes speak the style lock's chamfered-mass language; A reads as a stiff toy and B as soft. All three share one rig, with each joint baked to one mesh per material.

Joint check: `scratch/posed_hang.js`, `posed_run.js` and `posed_look.js` (spine, head and scarfTail) all verify clean, with no detached or torn limb. The hang render measures 2.144 m, equal to `userData.grip.hands`, which the module measures itself with both upper arms at rotation.x -2.9 (a true vertical, -π, gives 2.156). Loaded through `game/assetlib.js` with `keepHierarchy`, all 12 joints resolve per instance and `{ height: 1.75 }` scales by exactly 1.

Known weaknesses: the skirt is rigid on the hips, so a forward thigh cuts through its hem when running; raised hands keep their palms facing inward; a strong spine twist shears the satchel strap at the belt.
