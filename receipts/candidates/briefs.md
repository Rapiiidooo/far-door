# Asset briefs

These are the exact briefs handed to the generating agents on 24 September 2026, together with [the style lock](../../docs/style-lock.md). No image generator was available in this session, so every brief follows the recipe's fallback: form, not function, one paragraph per object (see `404-game-recipe/404.md`, "If you have no images at all").

Every candidate follows `404-game-recipe/docs/asset-contract.md`: one default export taking `THREE`, one `Group`, metres, base at y = 0, centred on x and z, front facing +Z, `MeshStandardMaterial` with explicit colours and contract material names, no imports, textures or network. Named parts are exposed as maps of `Object3D` on `userData` (the loader carries maps, not arrays). Plain numbers on `userData` must be measured after the placement shift.

## hero_explorer

An articulated explorer 1.75 m tall standing in a relaxed rest pose, stylised and chunky so it reads at 8 to 15 m from a third-person camera: a slightly large rounded head; a short-brimmed cap with bronze goggles pushed down over the eyes (dark amber lenses, aged bronze rims, leather strap); a vermilion scarf wound around the neck and pulled up over the nose and mouth, with one tail hanging behind the left shoulder; an indigo hip-length field jacket with a belt, two chest pockets and sleeves rolled to the forearm; leather gloves; canvas trousers tucked into mid-calf leather boots with thick soles; a leather satchel on the right hip on a strap crossing the chest; a coil of rope over the back. Skin shows only as a thin band between goggles and scarf.

Joints, every one a `Group` placed at the pivot with its geometry as offset children, all rotations zero at rest, arms hanging about 8 degrees out from the body, legs straight: `g.userData.joints = { hips, spine, head, leftUpperArm, leftLowerArm, rightUpperArm, rightLowerArm, leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg, scarfTail }`. Hierarchy: `hips` (pelvis, about 0.95 m) parents `spine` (waist, about 1.05 m) and both upper legs (hip joints about 0.92 m, x = ±0.1). `spine` parents the chest, `head` (base of the neck, about 1.52 m) and both upper arms (shoulders about 1.45 m, x = ±0.21). Upper limbs parent lower limbs at the elbow and knee; hands belong to lower arms, feet to lower legs. The character's left is +X. `scarfTail` hangs from the back of the neck and belongs to `spine`. Also expose plain data `g.userData.grip = { hands: <metres from the soles to the fingertips with both arms raised straight overhead> }`. Budget: at most 12,000 triangles.

## far_gate

A colossal ring 9 m across, outer radius 4.5 m, inner radius 3.5 m, 1.1 m deep, of basalt with a bone-limestone outer lip. Its faces carry three concentric incised grooves running all the way round, built as thin separate meshes in dormant crystal so the game can light them, and three round glyph medallions 0.9 m across set flush into the ring face at 12, 4 and 8 o'clock, each its own mesh. The lower part of the ring sinks into a stepped sandstone dais 12 m wide, 6 m deep and 1.0 m high in two 0.5 m steps, and the inner opening meets the dais top exactly, so a person walks through at floor level. Two thick sandstone buttress blocks with chamfered, stepped tops brace the ring on the dais, left and right. No chevrons, clamps or spikes anywhere on the rim. Both faces of the ring are finished; it is seen from both sides. Expose `g.userData.parts = { grooves, medallionTop, medallionLeft, medallionRight }` and plain data `g.userData.portal = { center: [x, y, z], radius: 3.5 }` for the centre of the opening. Budget: at most 40,000 triangles.

## glyph_stela

A sandstone stela 2.4 m tall, 1.0 m wide and 0.6 m deep on a stepped two-tier base 1.3 m wide (each tier 0.25 m high). The slab tapers slightly towards a chamfered, stepped top. At 1.3 m a round lens 0.45 m across in dormant crystal, its own mesh, sits in an aged bronze bezel facing +Z. Below the lens, a recessed square panel 0.6 m wide and 0.08 m deep, empty, where the game mounts a glyph. Carved horizontal bands run around the sides and back so it is finished from every angle. Expose `g.userData.parts = { lens }` and plain data `g.userData.lens = { center: [x, y, z], radius }` and `g.userData.panel = { center: [x, y, z], size }`. Budget: at most 6,000 triangles.

## sun_mirror

A pivoting sun mirror 1.9 m tall: a round polished bronze disc 1.2 m across and 0.08 m thick, its front very slightly concave, with an aged bronze rim and a ribbed back, held at its sides by a U-shaped aged bronze fork; the fork stands on a squat round sandstone turntable drum 1.2 m across and 0.55 m tall with a carved groove band and two short bronze push handles sticking out horizontally at the drum's sides. The reflective face points +Z and is vertical. Expose plain data `g.userData.mirror = { center: [x, y, z], radius: 0.6 }`. Budget: at most 8,000 triangles.

## push_block

A carved sandstone block 1.9 m on each side with chamfered edges: each vertical face carries a shallow recessed square with an incised disc-and-crescent motif and two horizontal grooves near the top; the top face is worn and very slightly dished; a burnt sienna band darkens the bottom 0.25 m. Finished on all six faces. Budget: at most 5,000 triangles.

## brazier

A bronze fire bowl 1.1 m tall: a wide shallow bowl 0.8 m across with a thick rolled rim, standing on three splayed legs that end in disc feet, with a ring brace between the legs; inside the bowl a low mound of dark coals. Aged bronze. Expose plain data `g.userData.flame = [x, y, z]`, the point just above the coals. Budget: at most 4,000 triangles.

## guardian_colossus

A seated colossus 14 m tall carved from sandstone: a stylised figure sitting upright on a stepped block throne, forearms resting flat on its thighs, hands open with palms down on the knees; a smooth featureless bone-limestone mask for a face with a single vertical slit; a tall headdress rising in three receding tiers with a disc at its front; broad shoulders with a stepped collar band; feet side by side on a plinth. Chamfered masses, deep grooves, weathered: one headdress corner broken off and a crack across the plinth. Finished from every angle, including the throne's stepped back. Budget: at most 30,000 triangles.

## broken_column

A ruined column 3.4 m tall: a square stepped base 1.4 m across, three stacked drums 1.0 m in diameter with shallow fluting, the top drum sheared off at an angle, and one fallen drum fragment lying against the base. Sandstone with a fragment of a bone-limestone capital band. Budget: at most 5,000 triangles.

## temple_facade

A temple front carved into a cliff face, 16 m wide, 13 m tall and 3 m deep, flat at the back (`g.userData.mounts = 'back'`): a stepped rectangular doorway 3.5 m wide and 6 m tall recessed 2 m deep into a dark interior, flanked by four engaged square pillars with stepped capitals; above, a broad lintel band with a row of round medallions, then a stepped crown in three receding tiers; the carved front is framed by rough, uncut cliff rock at the sides and top, as irregular chunky blocks. Sandstone body, bone limestone bands, burnt sienna weathering at the base. Budget: at most 40,000 triangles.

## basalt_spire

An alien volcanic rock formation 9 m tall in night basalt: three leaning hexagonal columns of different heights fused at the base, ash-lilac mineral streaks along their upper faces, and a few broken hexagonal stubs around the foot, 4 m across at the base. Budget: at most 6,000 triangles.
