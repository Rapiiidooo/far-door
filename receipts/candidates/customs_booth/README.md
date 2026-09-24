# customs_booth candidates

- `customs_booth_a`, primitives: a hollow kiosk of boxes round a real room, framed chalk panels with disc-and-crescent medallions, a dashed ochre band, a stacked-cylinder post with a bronze fork and a nine-box arm. Verifier: `ok customs_booth_a 6970 tris 11 meshes 6.75x2.8x2.033m`.
- `customs_booth_b`, profiles: chamfered courses swept round the plan (plinth, band, cornice, roof tiers), walls extruded with real holes for the window and recessed panels, lathed post, lamp and stamp, extruded diagonal stripes and a tapering arm. Verifier: `ok customs_booth_b 7488 tris 11 meshes 6.65x2.8x2.054m`.
- `customs_booth_c` (picked, now `game/assets/customs_booth.js`), a second reading in chamfered masonry: coursed corner piers, recessed chalk panels, a brow of alternating ochre and chalk blocks over the window and round the band, and a counterweighted octagonal arm hung on a hub on the post's front face. Verifier: `ok customs_booth_c 10418 tris 12 meshes 6.7x2.8x2.112m`.

Picked C: it reads most like the ruin builders' work, the striped brow gives the window an officious frown, and its sides and back are the richest. B's diagonal stripes carry a little better at 20 m; A is plain.

`joints.barrier` pivots at [-0.65, 1.1, 0.984] and rotation.z > 0 lifts it; `scratch/posed_booth_c_lift80.js` is clean at 80 degrees, with the counterweight swinging down in front of the post. `parts.lamp` is lit at emissiveIntensity 2 (0 shows dormant crystal). Plain data: `window`, `counter` and `inside`, a floor point at 0.55 m where a Warden fills the window.

Weaknesses: the loader shares the lamp material between instances, so clone it before flashing one booth; the arm runs 0.33 m in front of the wall, level with the counter's edge.
