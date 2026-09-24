# Far Door: the locked style

> Sun-baked sandstone ruins of an invented cliff-carving civilisation, cut as bold chamfered masses with stepped profiles and deep incised grooves, weathered but crisp, where the only cool colour anywhere is the turquoise light of ancient technology set into lenses, channels and the gate.

Working title: Far Door. Every tomb holds the address of a gate; an explorer redirects sunlight with bronze mirrors to light the address glyphs, and the gate opens a live window onto another world.

## Palette

| Role               | Hex        | Where it belongs                                                                   |
| ------------------ | ---------- | ---------------------------------------------------------------------------------- |
| Sunlit sandstone   | `0xd4a373` | Upper courses, dressed faces, block tops                                           |
| Sandstone          | `0xb57f4f` | The main body of walls, blocks, stelae and statues                                 |
| Burnt sienna       | `0x8a5433` | Lower courses, deep carving, recesses, weathered bases                             |
| Bone limestone     | `0xe6d3ae` | Trims, bands, statue masks and the rim of the gate frame                           |
| Basalt             | `0x3a3531` | The gate ring, plinth inlays, contrast bands (never a whole building)              |
| Aged bronze        | `0x9a6a35` | Mirror forks, fittings, braziers, rivets                                           |
| Polished bronze    | `0xe0b56a` | Mirror faces only (metalness 1, roughness about 0.18)                              |
| Ancient light      | `0x39e3d0` | Emissive only: lit lenses, lit grooves, the gate's inner rim. Nothing else is cool |
| Dormant crystal    | `0x1d5f63` | Unlit lenses and inlays before they receive light                                  |
| Explorer indigo    | `0x2d3656` | The hero's field jacket                                                            |
| Explorer vermilion | `0xc2412d` | The hero's scarf, the one signal colour on the hero                                |
| Explorer canvas    | `0xcdbf9f` | The hero's trousers and shirt cuffs                                                |
| Explorer leather   | `0x4b2e1e` | Boots, gloves, belt, satchel, goggle strap                                         |
| Explorer skin      | `0x9c6b4e` | The small visible part of the face                                                 |
| Night basalt       | `0x2a2830` | Second world only: black rock and sand                                             |
| Ash lilac          | `0x8c7fa3` | Second world only: dust, pale rock highlights                                      |

## Fixed decisions

- Metres. The level is a grid of 2 m cells with heights in 0.5 m steps. The hero is 1.75 m tall. A push block is 1.9 m on each side. A sun mirror is 1.9 m tall. A glyph stela is 2.4 m tall. The gate ring is 9 m across. The seated colossus is 14 m tall.
- Base at y = 0, centred on x and z, front faces +Z.
- Flat colours with sensible roughness; procedural surfaces are applied at load time. Name materials from the contract's list only: `plaster`, `stone`, `timber`, `tile`, `metal`, `fabric`, `foliage`, `ground`. Sandstone and basalt are `stone`, bronze is `metal`, cloth is `fabric`, leather is `fabric`.
- Emissive turquoise parts are separate meshes with their own material (`emissive: 0x39e3d0`) so the game can switch them from dormant to lit.
- Silhouettes read at 20 m in strong sun and haze: chunky masses, stepped profiles and deep grooves, never fine filigree that disappears.

## The invented civilisation

Stepped, chamfered masses; rounded medallions; crescent and disc motifs; parallel incised grooves that run like channels; masks without features except a single vertical slit. Glyphs are simple geometric shapes built as geometry: disc, crescent, twin circles, spiral, triangle with a dot, three wave lines. No text and no printed signage anywhere.

It must not read as any real culture. No pyramids, obelisks, ankhs, animal-headed figures, pharaoh headdresses, hieroglyph walls or Mesoamerican serpent heads.

## Red lines (keep clear of existing franchises)

- The gate is a plain carved ring on a stepped dais. No chevrons or clamps around its rim, no rotating inner symbol ring, no dialling pedestal with symbol keys, no liquid or splashing vortex.
- The hero has no braid, tank top, shorts or twin pistols. The hero wears a field jacket, a vermilion scarf, a cap with bronze goggles, gloves and a satchel.
- No names, logos or visual quotations from existing games, films or series.
