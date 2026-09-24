# hero_explorer, second pass, candidate B (profiles)

Built from profiles, starting from the first-pass profiles candidate. Each sleeve is a lathe with a real radius profile: a deltoid swell of 0.123 m, a cap leaned in over the shoulder joint, a taper to 0.093 m at the elbow and a closed, lipped end that covers the elbow when it bends. The forearm is three lathes: a thick rolled cuff, the canvas shirt sleeve tapering from 0.085 m to 0.065 m, and a short flared gauntlet closed at the wrist. The palm and the thumb are extruded outlines, with the bevel drawn inside the outline (the ExtrudeGeometry bevel trap). The four fingers are tubes swept through a loose half fist, then tapered, swollen at the knuckle and closed by rewriting their vertices. The hand measures about 0.185 m from wrist to fingertip when straightened, palms toward the thighs.

The jacket skirt is split. Its front halves are surfaces of revolution about the hip hinge, carried by the thighs, so a thigh swinging forward slides its half up under the belt instead of cutting it. The sides and the vented back hang from the hips and flare to clear a thigh swung back. The torso keeps its lathe but now slopes from the collar to the arms, fills out at the armpits and squares its plan there (a superellipse), so an arm's root sinks into it when raised or swung. Head, legs and boots are the first pass's.

## Numbers

- Verifier: `ok    hero_explorer_b         13810 tris  36 meshes  0.646x1.751x0.451m`
- Triangles: 13,810 (budget 14,000).
- `grip.hands`: 2.122 (first-pass C: 2.144). The posed hang copy measures the same 2.122 m.
- `palms` (centre of each palm's inner face, model space at rest): left `[0.276, 0.886, 0.128]`, right `[-0.276, 0.886, 0.128]`. In `rightLowerArm`'s frame the right palm sits at about `(-0.026, -0.278, 0.081)`, in `rightHand`'s at `(0.009, -0.046, 0.011)`. The game currently attaches the sun disc to `rightLowerArm` at `(0, -0.36, 0.08)`, below the new fingers.
- Joints: the first pass's twelve plus `leftHand` and `rightHand`, each a Group at the wrist, a child of its lower arm, zero rotation at rest.

## What I checked

- Verifier on this folder, with `hero_explorer_b.expect.json` (height 1.75, tolerance 0.15): ok, sheet in `_verify/`.
- Posed copies in `scratch/posed/`, made by `scratch/make_poses.py` (pose applied at the end, then re-grounded), with their own verifier run: 8/8 ok. Poses: hang (upper arms -2.9), run (arms 0.6 with elbow -1.4 and -0.7 with -0.4, thighs -1.0 and 0.6, knees 1.2 and 0.3), push (-1.4, elbows -0.5), T (z ±1.5), elbow 130 (lower arms -2.27), hand flex (hands x 0.6, z 0.4), arms back 45, thighs 60 forward and 35 back. Contact sheets: `scratch/shots/posed_a.png`, `posed_b.png`, `posed_c.png`.
- Close-ups in `scratch/shots/final_*.png`, looked at one by one. The shoulder, at rest and raised, swung forward 80, back 45 and out 90, shows no block or ball, and the shoulder line slopes from the collar. The elbow at 130, from eight angles, shows no gap, hole or sphere: the rolled cuff bunches in the crook. The wrist flexed both ways is covered by the gauntlet. Both hands mirror correctly. The skirt is clean at rest, in the run and in the 60/35 swings. The chest strap now rides over the right pocket. The game's throw wind-up (arm 0.9 back and 0.9 out) and falling pose (arms -1.25 with z ±1.05) also join cleanly at the shoulder.
- `scratch/clearance.mjs` (output in `scratch/shots/clearance.txt`): no thigh vertex reaches the fixed side or back skirt at rest, at 60 forward with 35 back either way, in the run, with the thighs abducted, or in the game's roll, climb, vault and landing. At full swing a few hem vertices of the front half (5 of 240 at 60 forward, 13 in the run) sit up to about 6% outside the belt's rounded lower edge, tucked under it.
- `scratch/handhits.mjs`: no hand vertex (of 1,016) inside a thigh, shin or the torso at rest, flexed both ways, in both run sides, or in the game's run, idle, turn, roll and elbow 130 poses.
- `scratch/loader.mjs`: loaded through `game/assetlib.js` as the game does (hierarchy kept, surfaces off, height 1.75). All 14 joints resolve as Groups per instance, hands parented to the lower arms, `grip` and `palms` carried, loader re-origin 0, palm markers on the palm faces (`scratch/loader.png`).
- Against the current in-game hero in identical poses (`scratch/compare.png`) and in sun on sandstone at 4 m and 8 m (`scratch/dist_grid.png`). The shoulder pads, uniform tubes and block hands are gone, the arms taper and bend, and the run no longer cuts the skirt.

## Known weaknesses

- Arms overhead: the sleeve's rounded root still shows beside the torso from behind at close range. It is soft and continuous, not a ball, but it reads as the end of the sleeve.
- A front skirt half follows its thigh: swung back, it slides down with it and reads as a rounded bulge over the hip from the front. At a full 60 forward its hem sits just proud of the belt's lower edge.
- The game's brace swings a thigh 51 degrees back, beyond the brief's 35. There the back hem meets the thigh.
- At the brief's widths the arms are slimmer than the first-pass faceted hero, so the figure reads less blocky.
- The torso changed at the shoulders and armpits, so the pockets and cross strap were refitted.
- Fingers are rigid parts of the hand joint. Overhead, the palms face each other, so ledge grips need the new hand joints turned.
- `grip.hands` drops by 2 cm against the current hero, so the game's hang height shifts accordingly.
