# expedition_tent candidates

- A, primitives: an open three-sided cylinder for the canvas and a closed one for the back gable; six-sided rods, boxes and tori for poles, rolled flaps, ropes, pegs, bedroll and stool. `ok expedition_tent_a 1682 tris 78 meshes 1.883x1.584x2.662m`
- B, profiles: one sagging canvas cross-section with real thickness extruded along the ridge and lifted into scallops between the hem pegs; seams and sod cloth are slices of it; pinched lathe door flaps, lathe poles, sagging tube ropes, extruded notched pegs. `ok expedition_tent_b 6174 tris 62 meshes 1.879x1.568x2.646m`
- C, second reading, hand-built: one faceted sheet draped over a sagging ridge pole, slack valleys between the pegs, one flap gathered on its pole and one thrown back over the roof, a snapped and frayed guy line and a torn back corner. `ok expedition_tent_c 3943 tris 82 meshes 1.885x1.565x2.736m`

Picked C (now `game/assets/expedition_tent.js`): the only one that looks left behind rather than pitched, and it reads as an open, abandoned tent from every side in the game rig (`scratch/rig_camp_0.png`, `scratch/rig_c_close_grid.png`). A is a clean prism; B is crisp but new.

Palette: the style lock names no tent canvas, and explorer canvas `0xcdbf9f` renders blue-white in the rig's shade (`scratch/rig_canvas_test_0.png`), so the canvas is rope khaki `0xb49a6a`, patched in burnt sienna and weathered timber, over a dark leather ground sheet that keeps the doorway in shadow.

Known weaknesses: the shaded slope still cools to grey-green in the rig, like every pale surface there; 2.2 cm guy ropes vanish beyond about 15 m; the box includes pegs, ropes and stool, while the tent body is about 1.6 x 2.2 m.
