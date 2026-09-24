# brazier candidates

- A, primitives: a flattened half-sphere bowl, torus rim, straight rods splayed 17 degrees, torus ring brace, dodecahedron coals on a sphere-cap mound. `ok 3768 tris, 24 meshes, 0.8x1.1x0.8m`
- B, profiles: one closed lathe for the bowl with the rolled rim in its profile, tube legs swept along curves that flare to the feet, lathe hub, feet, band brace and coal mound. `ok 3720 tris, 18 meshes, 0.8x1.1x0.8m`
- C, second reading: a two-step underside, flat cast strap legs drawn as side silhouettes with tabs and paws, a pendant boss, heaped angular coals. `ok 3864 tris, 21 meshes, 0.8x1.1x0.8m`

Picked B (now `game/assets/brazier.js`): a solid cast bowl instead of A's single-surface shell, and legs that visibly splay and flare. C's stepped underside does not read and its paws look like clips. `userData.flame` is `[0, 1.069, 0]`, 2 cm above the top coal and 3 cm under the rim.

Weaknesses: the feet stay inside the 0.4 m rim radius to keep the footprint symmetric, which limits the splay. The 5.8 cm legs are the thinnest parts in the set (`scratch/rig_brazier_b.png`, low view included).
