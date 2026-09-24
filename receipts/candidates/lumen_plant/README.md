# lumen_plant candidates

- **a, primitives:** a five-lobed torus knot flattened round a low dome for the mound, stalks as chains of tapering cylinders with swollen knuckles, sphere pods drawn in to a soft point, egg buds. `ok lumen_plant_a 4816 tris 3 meshes 0.766x1.297x0.862m`
- **b, sweeps:** tapering tube stalks that bow out and turn back up, lathed calyx cups holding upright bulb pods, lathed buds, a lumpy lathed mound with tube roots looping into the ground. `ok lumen_plant_b 4322 tris 3 meshes 0.761x1.305x0.856m`
- **c, second reading (picked):** each stalk is one swept tube that starts as a root tip on the ground, winds over a lumpy core so the five braid into the knotted mound, then rises and arches over; its pod hangs like a lantern, a translucent lathed bell with a glowing heart in the same mesh. `ok lumen_plant_c 4560 tris 3 meshes 0.971x1.307x0.988m`

C is the softest and most alien: fleshy arches, lanterns whose hearts show through the shell, a braided root knot, the opposite of the hard basalt. Under the game's own override (pods at 1.6 and a lilac point light at 1.1 m, reproduced in `../crystal_emitter/scratch/night.html`) the light sits inside the arch canopy and rim-lights the stalks. B is the clean upright alternative; A's knuckled stalks read as bamboo.

Exposes `parts.pods` (one mesh, hearts drawn before shells) and `parts.buds` (an addition to the brief); load with `keepHierarchy`. Weaknesses: pod skins are night basalt with lumen lilac as emission only, so they clip to pale pink on the untoned sheet; at opacity 0.8 they glow less than an opaque pod at the same intensity; through one pod, a pod behind it shows its heart but not its shell; footprint 0.97 x 0.99 m.
