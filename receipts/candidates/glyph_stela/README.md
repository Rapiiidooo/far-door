# glyph_stela candidates

- `glyph_stela_a`: primitives. Courses are BoxGeometry with corners moved onto the taper, bands are darker courses set back 3 cm, torus bezel and sphere-cap lens. Verifier: `ok glyph_stela_a 1712 tris 5 meshes 1.3x2.4x0.681m`.
- `glyph_stela_b` (picked): extruded profiles. Tapered outline slices with chamfers, a front skin with the panel as a hole, crown and base tiers extruded upward, lathe bezel and domed lens. Verifier: `ok glyph_stela_b 1916 tris 5 meshes 1.3x2.4x0.68m`.
- `glyph_stela_c`: a second reading as coursed masonry of hand-built chamfered blocks; the bands are the course joints, and a sunken field framed by pale jambs holds lens and panel. Verifier: `ok glyph_stela_c 1828 tris 5 meshes 1.3x2.4x0.68m`.

Picked B: chamfers everywhere read as carved stone, the dark bands clearly wrap the sides and back, and its three-step crown is the crispest. A is plain with sharp edges; C's pale jambs read as pilasters.

Known weaknesses: a 0.6 m panel cannot fit under a lens centred at 1.3 m (kept level with the sun mirror) on a 0.5 m base, so the panel is 0.48 m, exposed in `userData.panel.size`. The base is 0.68 m deep to stay within the brief's 0.6 m depth, so it steps out mainly in width.
