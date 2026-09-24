# sun_mirror candidates

- A, primitives: stacked cylinder courses, a sphere-cap face, torus rim, box U fork, triangular prism ribs. `ok 5364 tris, 43 meshes, 1.836x1.9x1.2m`
- B, profiles: lathe drum, disc body and concave face, one extruded keyhole U fork, concentric back ribs. `ok 5856 tris, 20 meshes, 1.78x1.9x1.2m`
- C, second reading: an extruded half-ring cradle that follows the disc, stepped bezel, twelve-ray sunburst of wedge ribs, T grips, three-groove drum. `ok 5508 tris, 40 meshes, 1.806x1.9x1.2m`

Picked C (now `game/assets/sun_mirror.js`): the cradle reads as a mirror yoke from every side, the sunburst is the clearest ribbed back and echoes the sun and disc motifs, and both pivots sit on the drum axis. `userData.mirror` is `{ center: [0, 1.3, 0], radius: 0.6 }`; the group `mirror_disc` pivots on that centre (rotation.x > 0 tips the face down).

Weaknesses: the verifier has no environment map, so the metalness 1 face is black in `_verify/sheet.png`; under the game rig it reads as polished bronze (`scratch/rig_sun_mirror_c.png`). With the rig's cascaded shadows on, every metal renders black until the vendored `CSMShader.lights_fragment_begin` gets three r186's `material.dfg` block (`scratch/rig_csm_fixed_sun_mirror_c.png`). Load it without `surfaces`: the metal recipe rusts the face (`scratch/rig_surfaces_sun_mirror_c.png`).
