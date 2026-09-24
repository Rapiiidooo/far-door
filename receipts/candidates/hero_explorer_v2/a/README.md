# hero_explorer, second pass, candidate A (primitives)

`hero_explorer_a.js`, checked against `hero_explorer_a.expect.json` (height 1.75, tolerance 0.15).

Verifier (`--size=560`): `ok    hero_explorer_a         12512 tris  34 meshes  0.649x1.75x0.411m`

- **Triangles:** 12,512 under three 0.169 (the verifier's CDN build) and 0.186 (the game's). Capsules are built by hand from a cylinder and two half spheres, because `CapsuleGeometry` counts about 1.8 times more triangles in 0.169.
- **grip.hands:** 2.166 m, measured by the module with both upper arms at rotation.x -2.9. The posed hang copy renders 2.166 m tall.
- **palms:** left `[0.285, 0.859, 0.129]`, right `[-0.285, 0.859, 0.129]`. Each is the centre of the palm block (halfway from wrist to knuckles, mid-thickness), in model space at rest, after the placement shift.
- **Joints:** the 12 first-pass joints plus `leftHand` and `rightHand` at the wrists (children of the lower arms), 14 in all, every rotation zero at rest. Pivots follow the first pass, except that the elbows sit 1 cm lower and 2.6 cm further forward (the upper arm is 0.30 m and hangs 5 degrees forward). The rig sits 1.3 cm forward of the origin (in-game hero: 0.4 cm back).

## Construction

Head, torso, legs and boots come from first-pass candidate A. Rebuilt from primitives:

- **Shoulder:** a sloped ellipsoid yoke on the spine runs from the collar over the top of a deltoid cap (an ellipsoid on the upper arm, 0.124 m wide), meeting it where their slopes agree.
- **Arm:** a sleeve tapering from 0.11 to 0.09 m and flattened front to back, a rounded sleeve elbow with the forearm's own cap inside it at the pivot, a rolled cuff (torus), a canvas sleeve from 0.085 to 0.065 m, and a leather gauntlet flaring to 0.1 m with a rolled edge.
- **Hand:** a wrist ellipsoid inside the gauntlet, a four-sided frustum palm with a domed back, a knuckle bar, a thumb ball and a two-segment thumb angled forward and in, and four two-segment fingers curling 62 to 86 degrees (0.198 m from wrist to middle fingertip, straightened). Palms face the thighs, turned 15 degrees back.
- **Rest pose:** upper arms hang 8 degrees out and 5 forward; the forearm is modelled 12 degrees further forward and 6.5 out, which keeps the curled fingers off the thigh when a wrist flexes inward.
- **Jacket skirt:** two flared cylinder panels with reshaped vertices, cut away over the thighs in front, flared and vented behind. A canvas trouser front with a fly shows in the opening.
- **Satchel:** moved high behind the right hip, clear of the thigh's backswing and the arm's swing, and shallow enough to keep the rig centred.

## Checks

- **Posed copies:** `scratch/poses/` (pose applied at the end, then re-grounded, by `scratch/make_poses.mjs`), own verifier run 10/10 ok: hang, run and its mirror, push, T, elbow 130, hand flex, back 45, thighs forward 60 and back 35 and their mirror. Overviews: `scratch/poses_overview.png` and `poses_overview2.png`.
- **What the poses showed:** no gap, hole or torn sleeve at shoulder, elbow or wrist. The deltoid stays a rounded sleeve top at rest and in every arm pose. The 130-degree elbow shows a rounded sleeve elbow with the cuff below it. The wrists stay closed inside the gauntlets when flexed. Close-ups: `scratch/closeup_shoulders.png`, `closeup_elbows.png`, `closeup_hands.png`, `closeup_hips.png`.
- **Numbers:** `scratch/collide.mjs` tests skirt, belt, satchel and hand vertices against the thigh tubes in every pose, all clear (2 mm threshold). `scratch/clearance.mjs` measures the fingertips 8.5 cm from the thigh at rest and 0.3 cm in the hand flex.
- **Against the first pass:** its own three poses (`scratch/firstpass_poses/`, 3/3 ok) beside its `poses.png` in `scratch/firstpass_compare.png` and `firstpass_compare_zoom.png`: rounded shoulders instead of pads, tapered sleeves that bend instead of tubes, hands instead of blocks.
- **Game distance:** `scratch/game_distance.png`, the in-game hero left and this candidate right, in sun on sandstone with the canvas recoloured as `main.js` does: 4 m front and back, 8 m, running, and the game's own hang values.
- **Loader:** through `game/assetlib.js` with `keepHierarchy` and height 1.75, all 14 joints resolve per instance, scale is exactly 1, grip and palms arrive as plain data, and the loader adds no offset.

## Known weaknesses

- **Shoulder:** a faint seam shows where the yoke meets the deltoid cap. With the arm overhead or straight out, the deltoid reads as a rounded bulge at the arm root; it is continuous with the sleeve but rounder than a real shoulder.
- **Open front:** the jacket is cut away from the belt to the hips (needed for a 60-degree thigh), so it reads open below the belt. In the verifier's pale canvas the trouser front looks stark; the game's khaki softens it.
- **Beyond the brief:** the game's roll (thighs at -1.9) and the knee-up of its climb (-1.6) push the thighs up to 7 cm through the skirt's side panels and the belt (`scratch/gameposes.mjs`). Vault, jump and brace poses are clear.
- **Hand flex:** the literal test (z +0.4 on both hands) bends the right hand towards the body with 3 mm to spare; a larger inward bend at rest would touch the thigh.
- **Palm:** the frustum's flat back reads slightly boxy up close.
- **Satchel strap:** a spine twist still shears the strap where the spine meets the hips (inherited: straps on the spine, satchel on the hips).
- **Triangle count helper:** `scratch/tris169.mjs` needs a local copy of three 0.169's `three.module.js` from the CDN.
