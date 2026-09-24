# confiscation_bin candidates

- `confiscation_bin_a`, primitives: a hollow box chest with straps, a mid band, rivets and box caps; the lid is propped about 60 degrees open by the rolled map standing in the heap. Verifier: `ok confiscation_bin_a 5728 tris 13 meshes 1.228x1.407x0.947m`.
- `confiscation_bin_b`, profiles: the body is one profile swept round the plan (foot, wall, rim, inner wall, floor) under a stepped swept lid, with a lathed kettle and hat, an extruded boot and one swept rope; the lid rests ajar at 38 degrees on a boot standing in the heap. Verifier: `ok confiscation_bin_b 4856 tris 13 meshes 1.267x1.172x0.852m`.
- `confiscation_bin_c` (picked, now `game/assets/confiscation_bin.js`), a second reading as a chamfered coffer: corner posts in bronze sleeves, recessed banded panels, and a lid held 65 degrees open by a bronze prop rod whose fork catches a pin on the lid; the boot dangles over the left end and a rope loop spills down the front. Verifier: `ok confiscation_bin_c 6652 tris 13 meshes 1.392x1.423x0.933m`.

Picked C: it is the most legible at night from 4 to 10 m (the chalk seal and ochre crescent inside the lid, the flag, the rope loop) and matches the builders' chamfered masses. B's heap reads sparse; A reads as a generic chest.

`joints.lid` pivots on the back hinge at [0.046, 0.65, -0.367]; rotation.x < 0 opens it further and `scratch/posed_bin_c_open110.js` (-45 degrees, 110 open) is clean. rotation.x > 0 would drive it into the prop and the heap.

Weaknesses: the expect height is the propped pose (1.4 m; the chest closed is 0.8 m), and the width and depth include the boot, the prop, the lid behind the hinge and the rope loop. Opening the lid lifts its pin out of the fork and leaves the prop standing alone.
