# far_gate candidates

- `far_gate_a` (picked): revolved profiles. Ring, bone lip, groove inlays and medallion plugs are LatheGeometry sweeps, one lathe per profile edge; the dais is hand-built chamfered boxes stepped on all four sides; buttresses are extruded cradles following the ring. Verifier: `ok far_gate_a 14124 tris 11 meshes 12x9x6m`.
- `far_gate_b`: extruded sections. Ring from bevelled annuli, dais swept from its stepped cross-section (steps front and back only), tall piers as buttresses. Verifier: `ok far_gate_b 28760 tris 11 meshes 12x9x6m`.
- `far_gate_c`: primitives read as masonry. TorusGeometry bands reshaped to rectangular sections, rolled torus lip, box dais, buttresses as stepped courses resting on the ring. Verifier: `ok far_gate_c 22836 tris 11 meshes 12x9x6m`.

Picked A: the ring stays a clean, dominant circle, the dais reads as stepped from every side, every edge is crisp, and it is the lightest. B's piers brace harder but box the ring in, and its bevelled lip shows thin dark dashes; C's courses are busy and its box edges sharp.

Known weaknesses: the floor sits at 1.02 m, 2 cm above the opening's lowest point, because a grazing contact z-fights; A also drops the buried bottom 12 degrees of the opening wall and chamfers for the same reason, while B and C keep a faint dotted line there in SwiftShader. The bone lip is only 8 cm wide on the faces.
