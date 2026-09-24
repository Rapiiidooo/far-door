# hero_explorer second pass, candidate C: faceted

Strategy C keeps the first pass's cut-stone language (chamfered 8- and 12-sided prisms as flat-shaded `BufferGeometry`, straps raycast onto facets) for the head, torso, legs and boots, and rebuilds the arms, hands and jacket skirt as faceted lofts along anatomical paths.

Verifier (`node harness/verify.mjs <this folder> --size=560`):

```
ok    hero_explorer_c          5734 tris  34 meshes  0.643x1.75x0.433m
```

- **Triangles:** 5,734 (budget 14,000), 34 meshes, one per joint and material.
- **grip.hands:** 2.132 m. The posed hang copy measures 2.132 m tall in the verifier, and 2.1317 m through the game's loader.
- **palms:** left `[0.266, 0.88, 0.117]`, right `[-0.266, 0.88, 0.117]`. Each is the centre of the palm face (the surface turned to the thigh), halfway from wrist to knuckles, after the placement shift.
- **Joints:** the first pass's twelve plus `leftHand` and `rightHand` at the wrists (±0.285, 0.927, 0.098), children of the lower arms. Shoulders stay at (±0.21, 1.45, 0); the 5 degree forward hang moves the elbows to z = 0.025.

## What changed

- **Shoulders:** the torso slopes from the collar to the arm. The sleeve starts with a 12-sided dome centred on the pivot, so it turns in place under the shoulder line.
- **Arm:** the sleeve tapers from 0.126 x 0.106 m at the deltoid to 0.092 x 0.085 m at the elbow. The forearm carries an elbow cap that fills the back of a bend, a two-band rolled cuff 4 to 10 cm below the elbow, a canvas sleeve (0.087 to 0.064 m) and a flared gauntlet.
- **Hand:** a faceted palm, a thumb angled forward and in, and four fingers swept through three knuckles into a loose half fist, palm to the thigh. About 0.19 m from wrist to fingertip when straightened.
- **Hips:** the jacket skirt is short in front (about 4 cm below the belt), where a swung thigh passes, and long and flared at the sides and back, with a back vent. The seat ends in a crotch point. A lower-leg octagonal cap replaces the knee ball.

## Checks

- The verifier passes here. I looked at `_verify/sheet.png` and the per-asset strip.
- `scratch/make_poses.py` writes posed copies to `scratch/poses/`, with the pose applied at the end and the model re-grounded. The copies cover hang, run, mirrored run, push, T, elbow bent 130 degrees, hand flex, arms back 45 degrees, and thighs at 60 degrees forward and 35 back. The verifier passes all nine. I looked at every view, plus close-ups in `scratch/shots/`. None shows a gap, hole, torn sleeve or visible ball at the shoulder, elbow or wrist. No thigh cuts the skirt, and no finger goes into a thigh.
- `scratch/clip.mjs` finds no hand vertex inside a thigh and no thigh vertex outside the skirt, at rest, in idle sway, in both runs, in both flexes and in the thigh swing. The flexed hand stops 6 mm from its thigh.
- `scratch/loader.mjs` loads the model through `game/assetlib.js` with `keepHierarchy`. All 14 joints resolve per instance, `grip` and `palms` survive, and `{ height: 1.75 }` scales by exactly 1.
- `scratch/sanity.mjs`: every closed mesh has a positive volume and finite normals.
- `scratch/scene.mjs` renders the candidate next to the current in-game hero at 4 and 8 m in sun (`scratch/shots/dist_*`). `scratch/poses.png` matches the first pass's pose sheet.

## Known weaknesses

- The short front and the steep hem drop at the sides look like a cutaway coat. That is the cost of a rigid skirt that clears a 60 degree thigh.
- Rigid parts still collide beyond the brief's range: the game's roll tuck (thighs at -1.9) drives the thighs through the belt and jacket front.
- The hands are one fixed half fist, and raised palms face each other. A ledge grip or a flat push needs the game to turn the hand joints.
- With the arm raised forward or out, the deltoid dome rises a few centimetres above the shoulder slope, like a bunched deltoid.
- In flat light the trouser seat still shows as a small pale panel under the short jacket front.
- Following the brief's dimensions, the arms are slimmer than the first pass's, so they read thinner at 8 m.
- Unchanged from the first pass: a strong spine twist shears the satchel strap at the belt.
