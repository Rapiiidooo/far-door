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

# Third wave

Handed out on 24 September 2026, after the owner's review of the overhaul: the explorer's arms read as a toy figure's, and the second world needs a real puzzle, a lit path and a proper ending. Same contract, style lock and fallback as above.

## hero_explorer (second pass)

The same explorer, style lock, palette, height (1.75 m), contract, joint names and hierarchy as the first pass, at most 14,000 triangles. The owner found the arms "like a toy figure": uniform tubes hung from boxy shoulder pads, with flat block hands, hanging dead straight. Rebuild the arms and hands so they read as human arms from a third-person camera 4 to 8 m away, while keeping the chunky, readable style of the rest of the figure.

- Shoulders: the jacket's shoulder line slopes down from the collar to the arm. The deltoid is a rounded cap that overlaps the top of the sleeve and blends into the torso, with no separate block or ball visible at rest, with the arm raised overhead, swung forward 80 degrees, back 45 degrees, or out 90 degrees.
- Upper arm: a tapered sleeve, widest at the deltoid (about 0.12 m), narrowing to about 0.09 m at the elbow, slightly flattened front to back.
- Elbow: sleeve fabric overlaps the forearm, so a bend of up to 130 degrees shows no gap, hole or visible sphere.
- Forearm: the sleeve is rolled into a thick cuff just below the elbow; below it the canvas shirt sleeve tapers from about 0.085 m to about 0.065 m at the wrist; the leather glove has a short flared gauntlet cuff.
- Hands: a real hand about 0.19 m from wrist to fingertips: a palm, a separate thumb angled forward and inward, and the four fingers as two or four chunky, slightly curled segments, relaxed in a loose half fist at rest with the palms facing the thighs.
- New joints: `leftHand` and `rightHand`, each a `Group` at the wrist pivot, a child of its lower arm, with zero rotation at rest. The hand geometry belongs to them. Add them to `g.userData.joints`.
- Rest pose: the upper arms hang about 8 degrees out from the body and about 5 degrees forward. The forearm and hand geometry may be modelled with a relaxed bend of about 12 degrees forward at the elbow while every joint rotation stays zero.
- The jacket skirt must not be cut by a thigh swung forward to 60 degrees or back to 35 degrees: split it at the front and back, flare it or shorten it.
- `g.userData.grip = { hands }`: metres from the soles to the top of the fingertips with both upper arms at rotation.x = -2.9 and every other joint at rest, measured by the module itself as before.
- `g.userData.palms = { left: [x, y, z], right: [x, y, z] }`: the centre of each palm in model space at rest, after the placement shift.

## stamp_plate

An address plate set into the ground, 1.8 m across and 0.14 m tall: a round slab of night basalt with a stepped, chamfered edge and a raised warden-chalk rim 0.12 m wide; inside the rim a shallow recessed field 1.3 m across and 0.03 m deep where the game mounts a glyph; eight short stamp-ochre tick marks spaced around the rim like the edge of a seal; a thin ring of dormant crystal inlay just inside the rim, as its own mesh, that the game can light. It must read from 10 m as a place where something gets stamped. Expose `g.userData.parts = { inlay }` and plain data `g.userData.field = { center: [x, y, z], size }` for the top centre of the recessed field and its diameter. Budget: at most 3,000 triangles.

## path_lantern

A lantern post of the gate builders, 2.4 m tall: a squat stepped basalt base 0.6 m across, a slim four-sided basalt shaft with two incised grooves, and at the top an aged-bronze cage of four curved ribs holding a faceted crystal 0.28 m tall of dormant crystal (its own mesh, so the game can light it), capped by a small stepped bronze lid. Finished on every side. Expose `g.userData.parts = { crystal }` and plain data `g.userData.light = [x, y, z]` for the crystal's centre. Budget: at most 2,500 triangles.

## expedition_rope

A climbing anchor left by the earlier expedition: an aged-bronze ring piton driven into the top of a stone lip, with a frayed rope tied through the ring that runs over the edge and hangs 1.6 m down the face in a gentle S curve, ending in a thick knot. The lip itself is not part of the asset: the piton sits on the edge of a flat top whose face drops away towards +Z, and the rope bends over that edge and hangs down in front of it. As the contract requires, the lowest point (the knot) is at y = 0, so the piton sits about 1.75 m up; expose plain data `g.userData.anchor = [x, y, z]` for the point where the rope crosses the edge, so the game can hang the asset from any ledge. Rope colour, with a small weathered-timber wedge beside the piton. Declare `g.userData.mounts = 'back'`. Budget: at most 2,000 triangles.

## floating_isle

A floating island about 14 m across: a flat, gently domed top of dawn limestone with low tufts of desert sage grass and two small boulders, whose underside tapers into a long, inverted cone of stepped, chamfered isle-rock strata hanging about 9 m below the top, with three smaller rock fragments floating beneath it, not touching. The tip of the lowest fragment is at y = 0. Expose plain data `g.userData.top = y`, the height of the walkable top at its centre. Budget: at most 7,000 triangles.

# Fourth wave

Handed out on 24 September 2026, when the third world became the third level: the explorer crosses the floating isles on bridges of light that the builders' pylons project. Same contract, style lock and fallback as above.

## light_pylon

A standing stone of the gate builders 2.8 m tall. A stepped, chamfered sandstone plinth 1.1 m square in two tiers (0.3 m and 0.2 m tall, the upper tier 0.85 m square), with a burnt sienna lower course. On it a four-sided shaft 1.5 m tall that tapers from 0.5 m to 0.36 m, with two incised horizontal grooves and a bone limestone band near its top. The shaft ends in a yoke of two short aged-bronze arms that hold upright an aged-bronze ring 0.9 m across and 0.1 m thick, facing +Z, its centre about 2.3 m up; a round lens of dormant crystal 0.62 m across fills the ring and is finished on both faces (its own mesh). In front of the plinth (+Z) a flat aged-bronze threshold plate 1.1 m wide, 0.55 m deep and 0.04 m thick lies on the ground, with a straight slot of dormant crystal 0.8 m long and 0.06 m wide along its front edge (its own mesh). Four bronze rivets on the ring's face. Finished on every side. Expose `g.userData.parts = { lens, slot }` and plain data `g.userData.lens = { center: [x, y, z], radius }` for the lens and `g.userData.emit = [x, y, z]` for the middle of the slot's front edge at the plate's top. Budget: at most 5,000 triangles.

# Fifth wave

Handed out on 24 September 2026, when the owner asked for more detail everywhere, a fourth level on ice and a glimpse of a wild forest behind the last door. Same contract, style lock and fallback as above. Ice is flat colour like everything else (the game gives it its gloss and translucency at load), chunky and faceted, never glassy filigree.

## ice_block

A block of clear ice 1.9 m on each side that the explorer pushes across a frozen pond. A cube with bevelled edges about 0.12 m wide and slightly irregular, faceted faces (each face bulges or dips by a few centimetres, never flat and never smooth); ice blue faces, glacier white bevels and a thin crust of frost on the top face; inside, visible where the faces are cut back, a darker deep-ice core and three or four trapped bubbles (small flattened spheres, glacier white) near the surface. Finished on every side, the base flat at y = 0 over its whole footprint. Budget: at most 3,000 triangles.

## ice_spire

A cluster of five ice crystals about 4 m tall growing from a low mound of frost-slate rock 2.6 m across dusted with glacier white snow. The crystals are six-sided prisms with pointed, faceted tips, leaning out from the centre at different angles: one tall central crystal (about 4 m), two of about 2.8 m and two stubby ones of about 1.4 m; ice blue faces with deep-ice undersides, a glacier white frost band where each leaves the rock. It must read from 20 m as a spike of ice, and from every side. Budget: at most 4,000 triangles.

## ice_casing

A shell of rough ice that encases a standing stone: 1.8 m wide, 3.0 m tall and 1.3 m deep, hollow inside with room for a stela 0.9 m wide, 2.4 m tall and 0.5 m deep standing at its centre on y = 0. Build it as three nested layers of chunky, faceted ice shards (each layer a ring of six to nine shards leaning inwards, the outer layer tallest and thickest), so each layer can fall away on its own: `g.userData.parts = { outer, middle, inner }`, three `Group`s. Ice blue and deep-ice shards with glacier white frost on their upper faces. Seen closed it reads as a jagged mound of ice around something tall. Budget: at most 5,000 triangles.

## snow_pine

A conifer of the frozen world, about 7 m tall: a straight dark bark-umber trunk visible at the base, and five or six stacked, drooping tiers of pine-needle branches that narrow to a crooked tip, each tier weighed down by a thick glacier white cap of snow on its upper side. Slightly asymmetric, one side more laden than the other. Readable from every side. Budget: at most 3,500 triangles.

## frost_cairn

A trail marker left by Mira's expedition, about 1.1 m tall: five flat, uneven frost-slate stones stacked slightly off-centre, a weathered-timber stake 1.3 m long driven in beside them, leaning, with a strip of explorer-vermilion cloth tied to its top and hanging down, and a thin crust of glacier white snow on the top stone. Finished on every side. Budget: at most 1,500 triangles.

## wild_tree

A huge old tree of the wild forest, about 16 m tall. A thick trunk 1.6 m across that twists slightly as it rises, flaring at the base into five or six buttress roots that spread 3 m out over the ground; bark-umber bark with moss-green patches on the roots and the lower trunk; two or three heavy limbs rising from about 8 m; a canopy about 14 m across made of eight to twelve irregular, chunky clumps of moss green and fern green foliage at different heights; three or four hanging vines (fern green) dropping 3 to 4 m from the limbs. Name the foliage material `foliage` and the bark `timber`. Readable from every side. Budget: at most 9,000 triangles.

## fern_cluster

A clump of forest ferns about 1.2 m across and 0.8 m tall: nine to twelve arching fronds rising from a centre and curving out and down, each frond a tapering blade with a zig-zag or notched edge suggesting leaflets, moss green at the base and fern green at the tips, with two tightly curled fiddleheads in the middle. Name the material `foliage`. Budget: at most 3,000 triangles.

## glow_mushroom

A cluster of four mushrooms of the wild forest on a mossy root knob about 0.8 m across: the tallest 1.4 m, then 1.0 m, 0.6 m and 0.35 m, with pale stems that thicken at the base and broad, slightly drooping caps (bark umber on top with a few paler spots); under each cap the gills are a separate mesh of spore lime (`emissive: 0xc3f25a`), so the game can make them glow. Expose `g.userData.parts = { glow }` holding the gills. Budget: at most 3,000 triangles.

## rubble_pile

A heap of fallen masonry from the builders' ruins, about 2.4 m across and 0.9 m tall: two broken dressed blocks with chamfered edges and a cut groove (sandstone and sunlit sandstone), one leaning on the other, a snapped drum of a column (bone limestone band), and eight to twelve smaller angular chunks and flakes spilling out around them (sandstone and burnt sienna). Name the material `stone`. It must read from 15 m as fallen worked stone, not as boulders. Budget: at most 3,000 triangles.

# Sixth wave

Handed out on 24 September 2026, when the owner asked for five hidden relics to find as achievements, a forest seen further and fuller through the last door, and more relief in the frozen reach. Same contract, style lock and fallback as above.

## field_scroll

A papyrus scroll left by the first expedition, about 0.5 m long: a rolled sheet of bone limestone parchment 0.09 m thick, one end partly unrolled into a flat, curling sheet 0.3 m wide showing a sketched map in explorer-leather ink (a few thin raised lines, a circle and a cross built as geometry), tied in the middle with a rope cord whose two ends hang loose, lying on the ground. Finished on every side. Budget: at most 1,500 triangles.

## field_radio

The first expedition's field radio, about 0.5 m wide: a boxy case of weathered timber with aged-bronze corner plates and a hinged lid propped open behind, a front panel with two round dials, a row of three knobs and a round speaker grille of parallel slots, a folding leather carrying handle on top, a telescopic bronze antenna raised at an angle, and a coiled cable running to a small headset of two round earpieces on a band lying beside it. It must read as a radio from 5 m. Finished on every side. Budget: at most 3,000 triangles.

## mira_scarf

Mira's long knitted scarf left on a stone: a low frost-slate stone about 0.6 m across, and a scarf of explorer vermilion with two stamp-ochre stripes near each end, draped over the stone in a loose loop so both ends trail on the ground, each end finished with a short fringe of thick tassels, the knit shown by shallow ribs across its width. A dusting of glacier white frost on the stone and the upper folds. It must read at 6 m as a red scarf someone left. Budget: at most 3,000 triangles.

## mira_lantern

Mira's expedition lantern, about 0.45 m tall: an aged-bronze frame with a round base, four corner posts, a pierced conical top and a wire bail handle raised in an arc, holding four panes (flat, pale bone limestone, slightly inset) around a short candle stub on a dish; the flame is a separate small mesh of lantern amber (`emissive: 0xffb24a`), so the game can light it. Standing upright on the ground. Expose `g.userData.parts = { flame }`. Budget: at most 2,500 triangles.

## giant_tree

A colossal ancient tree of the wild forest, about 60 m tall, seen from far away: a massive bark-umber trunk 9 m across at the base that flares into eight great buttress roots spreading 14 m, with a tall arched hollow between two roots at its foot; the trunk rises and splits at about 30 m into four huge limbs carrying a broad crown about 44 m across of twelve to sixteen enormous chunky clumps of moss green and fern green foliage; moss on the roots and the lower trunk; a dozen hanging pods (small rounded shapes) under the crown as a separate mesh of spore lime (`emissive: 0xc3f25a`), exposed as `g.userData.parts = { glow }`. Name the bark material `timber` and the foliage `foliage`. Chunky masses that read against haze at 150 m. Budget: at most 12,000 triangles.

## hill_castle

A castle seen far off on a hill, about 36 m wide and 42 m tall: a cluster of five round towers of different heights (the tallest 42 m) of bone limestone and sunlit sandstone, each with a steep conical roof of moss green and a thin spire, joined by curtain walls with a simple crenellated top, a tall arched gate at the front, and small arched windows as a separate mesh of lantern amber (`emissive: 0xffb24a`), exposed as `g.userData.parts = { windows }`. Its base sits on y = 0 as if on a hilltop (the hill is not part of the asset). Invented, not any real or famous castle. Name the stone `stone`. It must read as a castle from 200 m through haze. Budget: at most 9,000 triangles.

## forest_deer

A stag of the wild forest, about 2.3 m tall to the tips of its antlers and 2.1 m long: a slender body of bark umber with a paler belly, a long neck, a head with large ears and broad branching antlers dotted with a few small spore-lime buds as a separate mesh (`emissive: 0xc3f25a`), a short tail, and four thin legs with dark hooves. Built so it can walk: each leg is its own `Group` pivoting at the hip or shoulder (`frontLeft`, `frontRight`, `backLeft`, `backRight`), and the head and neck are a `Group` pivoting at the base of the neck (`head`); expose `g.userData.parts = { frontLeft, frontRight, backLeft, backRight, head, glow }`. Standing at rest, facing +Z. Budget: at most 5,000 triangles.

## forest_bird

A bird of the wild forest, about 0.7 m across the wings: a plump body of fern green with a stamp-ochre breast, a short hooked beak, a long forked tail, and two broad wings, each its own `Group` pivoting at the shoulder (`leftWing`, `rightWing`), spread level at rest; expose `g.userData.parts = { leftWing, rightWing }`. Facing +Z, gliding. Budget: at most 1,500 triangles.

## icicle_cluster

A row of icicles hanging from a rock lip, 2.4 m long along X: a thin crust of glacier white ice along the top (0.15 m tall, 0.3 m deep), and hanging from it nine to thirteen icicles of different lengths, from 0.3 m to 1.4 m, each a tapering, slightly faceted cone of ice blue with a deep-ice core near its root, a few doubled or fused. As the contract requires, the lowest tip is at y = 0; expose plain data `g.userData.anchor = [x, y, z]` for the middle of the crust's top edge, so the game can hang it from any lip. Declare `g.userData.mounts = 'top'`. Budget: at most 2,500 triangles.

## frozen_falls

A frozen waterfall down a cliff face, 5 m wide and 8 m tall, flat at the back where it meets the rock: a curtain of vertical ice columns and ribbed folds of ice blue and deep ice that spill over a lip at the top, bulge out in the middle, and pool at the bottom into a low rounded apron of ice 1.5 m deep, with glacier white frost on the ledges and bulges and a few icicles at the lip. Declare `g.userData.mounts = 'back'`. It must read from 30 m as a waterfall caught in ice. Budget: at most 6,000 triangles.

# Seventh wave

Handed out on 24 September 2026, when the owner asked for grass with more triangles than the isles' flat fans of spikes. Same contract, style lock and fallback as above.

## meadow_grass

A tuft of soft meadow grass about 0.6 m tall and 0.7 m across, meant to be scattered by the hundred over the floating isles and the forest floor: twenty-four to forty slender blades rising from a tight base about 0.15 m across and fanning out in every direction, each blade a thin tapering strip (about 2 cm wide at its root, pointed at its tip) built in four or five segments so it arches smoothly and twists a little, the tallest near the middle standing almost upright, the outer ones shorter and bowing outward until their tips droop; three or four thin stalks rise above the blades carrying small oat-like seed heads. Two materials, both named `foliage` and double-sided: the lower part of every blade moss green, the upper part and the tips fern green (split each blade between the two materials, no vertex colours), and the seed heads in the fern green material. It must read at 5 m as a soft clump of grass, never as a star of flat spikes. Budget: 300 to 800 triangles, since hundreds are instanced.

# Eighth wave

Handed out on 25 September 2026 for the city under the sea that the forest's last door shows at the end of the game, one candidate each (see [sea/](sea/README.md)). Same contract, style lock and fallback as above, plus the sea's palette: pale marble, verdigris copper, gold trim, glowing cyan crystals and warm lit windows.

## sea_temple

The domed temple at the heart of a drowned city, about 50 m across and 51 m tall: an island of three round stone steps, sixteen columns about a round sanctum lit through tall slits, an entablature under a verdigris copper dome ringed in gold, and a lantern with a gold cone crowned by a glowing crystal. Declare the lit slits and the crystal as `userData.parts.glow`. Budget: at most 8,000 triangles.

## sea_house

A house of the drowned city, 4 m square and about 7 m to the tip of its roof: pale stone walls on a plinth under a cornice, a dark door under a stone arch with a step before it, lit windows front and back with sills, and a four-sided copper roof with a gold finial. It is scattered by the hundred at slightly different scales. Declare the windows as `userData.parts.glow`. Budget: at most 800 triangles.

## sea_tower

A slender tower of the drowned city, about 24 m tall: a round stone shaft narrowing a little as it rises, lit windows climbing it in a spiral, a gold band under a copper spire and a glowing crystal at the tip. The game scales its girth and height. Declare the windows and the crystal as `userData.parts.glow`. Budget: at most 1,000 triangles.

## sea_rings

The stonework of the drowned city, about 197 m across and 6 m high: three concentric rings of stone wall round an open centre for the temple, the old canals between them spanned by four bridges on paired piers, and a line of cyan light along both edges of each wall's top, declared as `userData.parts.glow`. Budget: at most 20,000 triangles.

## reef_fish

A reef fish about a metre long, nose to +z: a deep, narrow body, a flat forked tail fin, a fin on its back and two dark eyes, in pale silver so the game can tint each fish of a shoal. The game swims it in shoals with a vertex shader that beats its tail, so the tail must lie behind the body along -z. Budget: at most 400 triangles.

## manta_ray

A manta ray a metre across, nose to +z: a flat body with its wings out along x, a low hump on its back, two horns at the front, eyes at the sides of its head, a mouth and a whip of a tail, in dark slate. The game flaps its wings by their distance from the middle. Budget: at most 600 triangles.

## sea_kelp

A frond of giant kelp one metre tall and rooted at y = 0, which the game stretches to 10 to 24 m: crossed ribbons a metre wide at the holdfast, narrowing towards the tip, in enough segments along their height for a vertex shader to sway them smoothly. Budget: at most 400 triangles.

## sea_coral

A head of coral about 1.4 m across and 0.9 m tall: a mound of faceted boulders of brain coral with fingers of branching coral leaning out between them, in one pale colour the game tints for each head. Budget: at most 600 triangles.

# Ninth wave

Handed out on 25 September 2026, when the owner asked for the city under the sea as ruins, better fish and rays, and a better explorer. Same contract, style lock and fallback as above. The ruins and the creatures were built by two agents working in parallel, the explorer's third pass by hand; see [ruins/](ruins/README.md), [sea-creatures/](sea-creatures/README.md) and [hero_explorer_v3/](hero_explorer_v3/README.md).

## ruin_temple

The temple of the city under the sea as a ruin, about 50 m across: the same round island of three steps, chipped; sixteen columns at 13 m, about half snapped at different heights, drums fallen on the steps; the round sanctum breached on one side; the copper dome broken open with a jagged edge; the lantern fallen; one crystal still glowing on a plinth in the sanctum, declared as `userData.parts.glow`; coral crusts. At most 9,000 triangles.

## ruin_rings

The city's three ring walls as ruins, with the radii and heights of `sea_rings` (32 to 42, 56 to 68 and 86 to 98 m; 5, 5.5 and 6 m high): broken into arcs with breaches and jagged tops, fallen blocks, four causeways with collapsed spans and lone piers, a clear breach along +Z for the camera's way down, and thin lines of cyan light surviving on some arcs (`userData.parts.glow`). At most 22,000 triangles.

## ruin_house

A roofless house of the drowned city, about 4.5 m square: four walls of different heights with jagged tops, an empty doorway on the front and empty windows, one corner collapsed into a heap of blocks, and a copper roof beam fallen inside. At most 800 triangles.

## ruin_tower

A tower of the drowned city snapped off at a slant, 14 to 20 m tall: a jagged top, dark window holes, drums and blocks fallen at its foot, coral crust near the base and a small glowing crystal shard lying there (`userData.parts.glow`). At most 1,200 triangles.

## ruin_column

A fluted column about 6 m tall on a square plinth, snapped with a jagged top, two drums fallen beside it. At most 800 triangles.

## ruin_arch

A half-fallen arched gateway about 10 m wide and 9 m tall: one pier standing with the springing of its arch, the other broken lower, voussoirs fallen at their feet. At most 1,500 triangles.

## reef_fish (second reading)

A tropical reef fish about a metre long, nose to +Z, to replace the eighth wave's: a smooth, deep, laterally compressed body, a forked tail, a tall swept dorsal fin and an anal fin, small pectoral fins, eyes with a pale ring and a dark pupil, a small mouth and two or three contrasting bands in their own material. The body stays pale so the game can tint each fish; the tail lies towards -Z for the vertex shader that beats it. 250 to 450 triangles.

## manta_ray (second reading)

A manta ray a metre across, nose to +Z, wings along ±X with the tips at about 0.5 m for the shader that flaps them: a true manta planform with curved leading edges and pointed, swept tips, a dark slate top and a pale belly, cephalic fins rolled forward, eyes on the sides of the head and a whip tail. 500 to 1,200 triangles.

## hero_explorer (third pass)

The explorer of the second pass, candidate B, with the same joints, pivots, palms and grip so the animation and the hand placement carry over: a face showing above the scarf (eyes, brows, a nose, a mouth, ears and a jaw) under hair with a short tail; the goggles hanging at the throat; a backpack with a flap, back straps and a bedroll, carrying the rope coil; a canteen at the left hip; thigh pockets, knee patches and laced boots. No franchise's signature look: no fedora and whip, no long braid with twin holsters.
