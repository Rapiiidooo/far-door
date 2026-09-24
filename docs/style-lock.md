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
| Weathered timber   | `0x8a6a48` | The previous expedition: crates, tent poles, banner poles                          |
| Rope               | `0xb49a6a` | Lashings, guy ropes, handles                                                       |
| Terracotta         | `0xa8603a` | Clay urns and pottery shards                                                       |
| Desert sage        | `0x7a8766` | The few desert plants, dusty and pale                                              |
| Warden chalk       | `0xc9c2d8` | Second world only: the Wardens' bodies and the checkpoint's painted parts          |
| Stamp ochre        | `0xd9a441` | Second world only: stamps, barrier stripes, the Wardens' sashes                    |
| Lumen lilac        | `0xd98cff` | Emissive only, second world flora; never on anything built                         |
| Dawn limestone     | `0xeadcc0` | Third world only: the tops of the floating isles and the arrival dais              |
| Isle rock          | `0x9b7658` | Third world only: the undersides of the floating isles                             |
| Cloud gold         | `0xf2d49a` | Third world only: the cloud sea, as a shader colour                                |
| Glacier white      | `0xe9f2f6` | Fourth world only: snow, frost and the lit tops of ice                             |
| Ice blue           | `0xa9d2e3` | Fourth world only: clear ice faces                                                 |
| Deep ice           | `0x5b9bbd` | Fourth world only: ice in shadow, the cores of blocks and spires                   |
| Frost slate        | `0x3d4654` | Fourth world only: the rock of the frozen canyon                                   |
| Pine needle        | `0x2f4a3e` | Fourth world only: the snow pines                                                  |
| Bark umber         | `0x5a4030` | Fifth world only: the forest's trunks and roots                                    |
| Moss green         | `0x4f7a3a` | Fifth world only: moss, canopy and the darker fronds                               |
| Fern green         | `0x7da04a` | Fifth world only: young fronds and leaves in light                                 |
| Spore lime         | `0xc3f25a` | Emissive only, fifth world flora; never on anything built                          |
| Lantern amber      | `0xffb24a` | Emissive only: a flame or a lit window, the one warm light people carry            |

## Fixed decisions

- Metres. The level is a grid of 2 m cells with heights in 0.5 m steps. The hero is 1.75 m tall. A push block is 1.9 m on each side. A sun mirror is 1.9 m tall. A glyph stela is 2.4 m tall. The gate ring is 9 m across. The seated colossus is 14 m tall. A Warden is 1.15 m tall. The sun disc is 0.45 m across. An address plate is 1.8 m across. A path lantern is 2.4 m tall. A floating isle is about 14 m across. A light pylon is 2.8 m tall. An ice block is 1.9 m on each side. A snow pine is about 7 m tall. A forest tree is about 16 m tall.
- Base at y = 0, centred on x and z, front faces +Z.
- Flat colours with sensible roughness; procedural surfaces are applied at load time. Name materials from the contract's list only: `plaster`, `stone`, `timber`, `tile`, `metal`, `fabric`, `foliage`, `ground`. Sandstone and basalt are `stone`, bronze is `metal`, cloth is `fabric`, leather is `fabric`.
- Emissive turquoise parts are separate meshes with their own material (`emissive: 0x39e3d0`) so the game can switch them from dormant to lit.
- Silhouettes read at 20 m in strong sun and haze: chunky masses, stepped profiles and deep grooves, never fine filigree that disappears.

## The invented civilisation

Stepped, chamfered masses; rounded medallions; crescent and disc motifs; parallel incised grooves that run like channels; masks without features except a single vertical slit. Glyphs are simple geometric shapes built as geometry: disc, crescent, twin circles, spiral, triangle with a dot, three wave lines. No text and no printed signage anywhere.

It must not read as any real culture. No pyramids, obelisks, ankhs, animal-headed figures, pharaoh headdresses, hieroglyph walls or Mesoamerican serpent heads.

## The previous expedition

Someone camped on the terrace before the explorer: a canvas tent, crates, a banner, lanterns. Timber is weathered grey-brown, canvas is patched and sun-bleached, ropes are frayed. It tells a story without words and gives the start a human scale.

## The second world: the checkpoint

The gate opens onto a bureaucratic checkpoint of the gate network, run by the Wardens: squat constructs of pale chalk stone with an oversized aged-bronze mask for a head, a glowing turquoise slit for an eye, stubby legs and an enormous customs stamp. They are comic, not frightening: exaggerated proportions, waddling, officious. Their world is night basalt and ash lilac under a violet sky, with lilac-glowing flora; the checkpoint itself is basalt with warden-chalk panels and stamp-ochre stripes. Turquoise still marks the builders' technology: eyes, lenses, lamps and the gate.

## The third world: the dawn isles

The checkpoint's far door opens onto a sky at dawn: pale limestone isles float over a sea of golden cloud, with more rings of the network hanging in the distance. It is the third level: the explorer follows Mira's trail from isle to isle, across bridges of turquoise light that the builders' pylons project when the sun disc, charged with light, strikes their lens. It stays simple and bright: warm light, soft haze, no creatures. The builders' pylons and crystals are the same sandstone, bone limestone, bronze and turquoise as in the court; the expedition's frayed ropes and last camp are the same weathered timber, canvas and rope as on the terrace.

## The fourth world: the frozen reach

Mira went on through a frost door: a world of ice under a twilight sky with slow ribbons of aurora. Snow lies on frost-slate rock; frozen streams and a frozen lake are clear ice over deep blue, and the ice holds blocks, spires and a stela. The only warm colours are the explorer and the expedition's timber, rope and vermilion markers; turquoise still marks the builders' technology (lenses, the ring, the stela's glyph). Ice is chunky and faceted, with bevelled edges and darker cores, never glassy filigree. Sizes: an ice block is 1.9 m on each side like the court's push block, an ice spire cluster about 4 m tall, a snow pine about 7 m, a trail cairn about 1.1 m.

## The fifth world: the wild forest (seen through a door)

Beyond the last door of the game lies a wild forest, only glimpsed through the ring at the end: huge old trees with buttress roots and moss, ferns, and mushrooms whose gills glow spore lime in the shade, under warm shafts of light through a high canopy. Further off stand a giant tree ringed by fairy lights and, on a hill in the haze, a castle of pale stone with moss-green roofs and lit windows; a stag and birds pass through. It is a world full of promise, seen for a few seconds. A forest tree is about 16 m tall with a canopy about 14 m across; a fern cluster about 1.2 m across; the tallest glowing mushroom about 1.4 m.

## Relics

Five things the expeditions left behind are hidden along the way, for the curious: a rolled papyrus of the first expedition, their field radio, a page of Mira's on the isles, her scarf and her lantern in the ice. They are small, human and worn: parchment, weathered timber, rope, leather, aged bronze and explorer vermilion, never turquoise.

## Red lines (keep clear of existing franchises)

- The gate is a plain carved ring on a stepped dais. No chevrons or clamps around its rim, no rotating inner symbol ring, no dialling pedestal with symbol keys, no liquid or splashing vortex.
- The hero has no braid, tank top, shorts or twin pistols. The hero wears a field jacket, a vermilion scarf, a cap with bronze goggles, gloves and a satchel.
- No names, logos or visual quotations from existing games, films or series.
- The Wardens are masked stone constructs, not goblins, orcs, gnomes or any franchise's creatures: no pointed ears, green skin or tusks.
- Health is shown as small bronze pips, not hearts; the thrown disc is a bronze sun disc, not a boomerang shape from any game.
