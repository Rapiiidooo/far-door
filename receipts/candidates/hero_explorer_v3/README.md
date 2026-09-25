# hero_explorer, third pass

The brief is the ninth wave's `hero_explorer (third pass)` in [briefs.md](../briefs.md). One candidate, `hero_explorer_a`: the second pass's candidate B ([hero_explorer_v2](../hero_explorer_v2/README.md)) with parts added to its joints before they are baked, so the skeleton, the pivots, the palms and the grip, and with them the animation and the hands' placement, are unchanged. The verifier found it clean: 17,258 triangles, 0.646 x 1.751 x 0.502 m (`_verify/`).

- **The face:** the scarf no longer covers the nose and mouth. The head has eyes (a ring of white and a dark iris), brows, a nose, a mouth, ears and a jaw, under dark hair round the back and sides with a short tail tied in the scarf's red.
- **The kit:** the goggles hang at the throat; an olive canvas backpack with a flap, buckled straps, two straps rising into the scarf and a bedroll tied on top carries the rope coil; a tin canteen hangs at the left hip on a strap from the belt.
- **The clothes:** a buttoned cargo pocket on the outside of each thigh, a worn patch over each knee, laces crossing between two rows of eyelets on the boots, and smoother legs.

The first render showed the eyes too large and too white; they were made smaller and duller before the copy into `game/assets/`.

A second revision, the same day, after the owner asked why the hand looked as if it held something at rest: the fingers and thumb of each hand are built twice over the one palm, closed round a grip as before and open and relaxed, each set baked into a mesh of its own, left out of the joint's bake and declared as `userData.hands` (`leftOpen`, `leftGrip`, `rightOpen`, `rightGrip`). The open sets show at rest; the game shows the closed ones while a hand grips or holds. The grip height is measured with the closed fingers, as before. The verifier found it clean: 18,578 triangles, 50 meshes.
