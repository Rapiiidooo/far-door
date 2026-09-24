# sun_disc candidates

First round (`scratch/round1_raised_rim_sheet.png`): all three read the stepped rim as a raised rim round a recessed field, and every one looked like a plate or a hubcap, which the brief rules out. The final round reads it as tiers falling from a jewelled hub to a thin notched blade.

- **A, primitives:** a stretched eight-sided torus for the hub, RingGeometry tiers on open cylinder walls, twelve box tabs whose gaps are the notches, tilted box rays, a squashed-sphere lens. Verifier: `ok sun_disc_a 1932 tris 4 meshes 0.453x0.061x0.453m`
- **B, profiles:** one stepped lathe body, an extruded notched blade thinned towards its edge, extruded ray fins, a turned lens, an extruded strap. Verifier: `ok sun_disc_b 2620 tris 4 meshes 0.449x0.063x0.449m`
- **C, faceted height field:** the whole disc as one hand-built polar mesh (twelve sectors of six columns), rays widening towards the rim, a cut twelve-sided gem. Verifier: `ok sun_disc_c 2772 tris 4 meshes 0.449x0.061x0.449m`

Picked **C**, now `game/assets/sun_disc.js`: its rays read as sunlight where B's fins read as spokes, its cut gem and chamfers match the explorer and the Warden, and it is clean where B's thinned blade shows a long earcut crease (`scratch/b_threeq_zoom.png`) and A's box tabs read as a gear. Checked under the game's daylight rig (`scratch/rig_stack.png`) and upside down (`scratch/underside_views.png`): the strap loops clear of the face and the gem shows from below.

Weaknesses: the strap hangs 1.5 mm below the hub, so the disc measures 0.061 m; at `emissiveIntensity` 1.1 the lens washes out to pale turquoise in full sun, so raise it while the disc is live; aged bronze reads dark in the verifier, which has no environment map.
