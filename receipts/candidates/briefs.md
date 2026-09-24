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

# Second wave

Handed out on 24 September 2026 with the updated style lock, for the camp on the terrace and the checkpoint in the second world. Same contract and fallback as above.

## warden

An articulated comic construct 1.15 m tall: a round, slightly pear-shaped body of warden-chalk stone with a stamp-ochre sash across it; an oversized head that is almost entirely an aged-bronze mask 0.55 m tall, domed on top and flat in front, with one vertical slit for an eye in ancient-light turquoise (its own mesh); short thick arms with three-fingered stone hands; two stubby legs with round flat feet. It carries in its right hand an enormous customs stamp: a stout timber handle with a round basalt stamping head 0.35 m across, the face of the head carved with a disc motif. Joints, each a `Group` at its pivot with geometry as offset children and zero rotation at rest: `g.userData.joints = { body, head, leftArm, rightArm, leftLeg, rightLeg, stamp }`. `body` pivots at the hips (about 0.3 m) and parents `head` (neck, about 0.62 m) and both arms (shoulders); legs pivot at the hips; `stamp` pivots in the right hand and belongs to `rightArm`. The left side is +X. Expose `g.userData.parts = { eye }`. Budget: at most 6,000 triangles.

## sun_disc

A bronze throwing disc 0.45 m across and 0.06 m thick, lying flat with its faces up and down: a stepped outer rim with twelve shallow notches, radial ribs on both faces, a round lens of ancient-light turquoise 0.12 m across set through the centre (its own mesh), and a leather grip strap across the underside. It must read as a precious ancient weapon at a glance, not a plate. Expose `g.userData.parts = { lens }`. Budget: at most 3,000 triangles.

## customs_booth

A squat checkpoint kiosk of night basalt with warden-chalk panels, 2.4 m wide, 2 m deep and 2.8 m tall, with a wide dark window opening facing +Z above a counter ledge that holds a round stamp and a stack of thin slate papers; a stepped roof crowned by a round lamp dome of ancient-light turquoise 0.5 m across (its own mesh); on its left side (+X) a barrier post 1.2 m tall carrying a striped barrier arm 4 m long, stamp ochre and warden chalk in alternating bands, resting horizontally and pointing towards +X. The arm is a `Group` pivoting at the top of its post so it can lift. Expose `g.userData.joints = { barrier }` and `g.userData.parts = { lamp }`. Overall about 6.5 m wide including the arm. Budget: at most 12,000 triangles.

## confiscation_bin

A chest 1.2 m wide, 0.8 m deep and 0.8 m tall of basalt with aged-bronze bands and corner caps, with a hinged lid propped open, overflowing with confiscated junk: a single boot, a dented kettle, a rolled map, a hat and a tangle of rope, all slightly spilling over the rim; a small stamp-ochre tag on a stick stuck into the pile. The lid is a `Group` pivoting on its back hinge. Expose `g.userData.joints = { lid }`. Budget: at most 7,000 triangles.

## queue_post

A queue stanchion 1.0 m tall: a round basalt base 0.35 m across, a slim aged-bronze post, a warden-chalk ball on top, and a thick rope of stamp ochre hanging from the ball in a sagging loop 1.4 m long towards +X, ending in a bronze hook at post height. Budget: at most 2,500 triangles.

## crystal_emitter

A light source for the second world, 2.1 m tall: a stepped basalt pedestal 1.2 m tall with carved grooves, an aged-bronze cage of three curved ribs rising from it, and inside the cage a floating faceted crystal of ancient-light turquoise 0.6 m tall (its own mesh), not touching the ribs. Expose `g.userData.parts = { crystal }` and plain data `g.userData.beam = [x, y, z]` for the crystal's centre. Budget: at most 5,000 triangles.

## lumen_plant

Alien flora 1.3 m tall: a cluster of five curved, thick stalks of night basalt colour rising from a knotted root mound, each ending in a bulbous translucent pod of lumen lilac (the pods are their own mesh, emissive), with smaller buds along the stalks. Expose `g.userData.parts = { pods }`. Budget: at most 5,000 triangles.

## expedition_tent

An abandoned explorer's tent 2.6 m long, 1.8 m wide and 1.6 m tall: an A-frame of weathered timber poles crossing at the top at each end, sun-bleached canvas with two darker patches draped over a ridge pole, the front flap tied open showing a rolled bedroll inside, guy ropes running out to timber pegs, and a folded camp stool beside the entrance. Front faces +Z. Budget: at most 7,000 triangles.

## supply_crates

A cluster 1.8 m wide, 1.2 m deep and 1.3 m tall: two stacked weathered-timber crates with rope handles and nailed battens, a third crate beside them with its lid leaning against it and straw and a rolled map inside, and a small banded barrel. Budget: at most 6,000 triangles.

## clay_urns

Three terracotta urns of different sizes (0.5, 0.75 and 1.0 m tall) standing together with incised rings and small handles, the smallest broken with three shards lying beside it. Budget: at most 5,000 triangles.

## fallen_head

The colossal head of a fallen guardian statue lying on its side, half sunk in sand, 4.5 m long, 2.6 m tall and 3 m deep: a bone-limestone mask with a single vertical slit, the sandstone headdress tiers broken off at the top, a deep crack across the mask, and a low sand drift built up against its underside so it sits in the ground. Budget: at most 12,000 triangles.

## boulder_cluster

Three weathered sandstone boulders (2.2, 1.5 and 0.9 m tall) resting against each other, faceted and chamfered, with horizontal strata grooves and burnt sienna undersides. Budget: at most 4,000 triangles.

## desert_agave

A desert plant 1.0 m tall: a rosette of eighteen thick, pointed, slightly curled leaves in desert sage with paler tips, growing from a small mound of sand, plus one tall dry flower stalk. Budget: at most 4,000 triangles.

## glyph_banner

An ancient banner 3.6 m tall: a weathered-timber pole with a crossbar near the top from which hangs a long tattered cloth of bone and burnt sienna in two vertical bands with a raised disc-and-crescent patch in the middle, its lower edge torn into three tails, stiffened as if caught in a breeze. The pole stands in a small pile of stones. Budget: at most 4,000 triangles.
