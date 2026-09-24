# guardian_colossus candidates

The brief fixes only the height (14 m); every expect file uses the designed 8.4 x 9.6 m plinth as width and depth.

- A, primitives: boxes with stepped corners and vertex tapers, eight-sided cylinders for the limbs, cylinders and tori for the medallions. `ok  guardian_colossus_a  7072 tris  203 meshes  8.46x14x9.66m`
- B, profiles: side profiles extruded across the width (throne, legs, L-shaped arms), front profiles (torso, head, slit mask), square and octagonal lathes (stepped headdress, collar, medallions). `ok  guardian_colossus_b  12068 tris  101 meshes  8.48x14.03x9.7m`
- C, a second reading on hand-built lofts: the guardian is robed, pleated columns falling from the knees to a bone hem, and every part is one BufferGeometry skinned through chamfered sections, so the limbs and torso taper like carving. `ok  guardian_colossus_c  12776 tris  123 meshes  8.4x14x9.66m`

Picked C. In a low-sun game view at 30 and 60 m, next to the real hero, all three read as a seated guardian, but C's pleats and tapered torso catch the raking light best, the robe keeps it furthest from the Egyptian seated colossi the pose could otherwise echo, and its fissure cuts both plinth steps so it shows from eye height. A reads as stacked voxels up close; B is clean but flatter.

Known weaknesses: the headdress disc is 1 m across, a pale dot at 60 m; the fingers are grooves along one hand loft, mitten-like up close; the settled front slab leaves a 4.5 cm step at the fissure, which a character controller must allow.
