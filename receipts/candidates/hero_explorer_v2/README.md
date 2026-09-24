# hero_explorer, second pass

The owner found the first explorer's arms "like a toy figure": boxy shoulder pads, uniform tube sleeves and flat block hands hanging dead straight. The brief is "hero_explorer (second pass)" in [the third wave](../briefs.md). Three agents built one candidate each, from the same brief, style lock and joint layout, with a different construction strategy. Each folder holds its candidate, its own verifier run, its pose checks and a README with its measurements and weaknesses.

The three verified together (`_verify/sheet.png`, `--size=560`):

- **A, primitives** (`a/`): tapered cylinders, spheres and hand-built capsules, from the first pass's primitives candidate. `ok hero_explorer_a 12512 tris 34 meshes 0.649x1.75x0.411m`
- **B, profiles** (`b/`): lathed sleeves with a deltoid swell, taper and rolled cuff, swept fingers, extruded palm and thumb, skirt halves that follow the thighs. `ok hero_explorer_b 13810 tris 36 meshes 0.646x1.751x0.451m`
- **C, faceted** (`c/`): the current chamfered-prism language with more rings per limb and faceted hands. `ok hero_explorer_c 5734 tris 34 meshes 0.643x1.75x0.433m`

All three add `leftHand` and `rightHand` joints at the wrists, `userData.palms`, and pass every pose check in the brief (hang, run, push, T, elbow at 130 degrees, hand flex, thighs 60 degrees forward and 35 back).

Picked **B**, now `game/assets/hero_explorer.js`. Side by side with the first pass (`b/scratch/compare.png`) and in sun at 4 and 8 m (`b/scratch/dist_grid.png`), it is the one whose arms read as a person's: the shoulder line slopes into the sleeve with no pad, the sleeves taper and bend, the hands are small and relaxed. A reads as an action figure with a helmet-like cap; C keeps the world's cut-stone look but its arms stay blocky, which is the complaint.

In the game, the animator drives the new hand joints and plants the palms with two-bone IK: on a ledge while hanging and climbing, on a block's face while pushing, on a mirror's drum while turning it. The sun disc sits under the right palm. The explorer hangs at the depth where the palms, not the fingertips, meet the lip.

Known weaknesses, from B's own report: with the arms overhead the sleeve's rounded root shows beside the torso from behind; the game's brace pose swings a thigh 51 degrees back, beyond the brief, where the back hem meets it; the fingers are one fixed half fist. The arms are slimmer than the first pass's, so the figure reads less blocky at a distance.
