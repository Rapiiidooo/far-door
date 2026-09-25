# The sea wave

The briefs are the eighth wave in [briefs.md](../briefs.md): the objects of the city under the sea that the last door shows at the end of the game. They were first built from primitives inside `game/atlantis.js`. The jam asks that every 3D object be written through the recipe, so each became an asset module of its own, with the same shapes, verified together (`_verify/sheet.png`, `--size=560`).

There is one candidate per brief (`<name>_a`), not three: the owner chose this ending with a tenth of the week's usage left and the jam closing the next day, and the shapes had already been judged in the game. The first pass left five of eight flagged by the verifier (three too crude, three off the ground, the manta off centre and blank from the front), so the house gained a plinth, a cornice, sills, an arched door with a step and a finial; the kelp three denser ribbons; the manta a hump, horns, eyes and a mouth; and the fish, the manta and the coral were set on the ground. The second pass was clean, eight of eight:

- `sea_temple_a`: 4,864 triangles, 49.6 x 51 x 49.6 m.
- `sea_house_a`: 388 triangles, 4.3 x 7.41 x 4.6 m.
- `sea_tower_a`: 464 triangles, 2.44 x 24.4 x 2.5 m.
- `sea_rings_a`: 15,888 triangles, 196.5 x 6.27 x 196.5 m.
- `reef_fish_a`: 168 triangles, 0.16 x 0.47 x 1.07 m.
- `manta_ray_a`: 396 triangles, 1 x 0.18 x 1.38 m.
- `sea_kelp_a`: 240 triangles, 1 x 1 x 0.87 m.
- `sea_coral_a`: 336 triangles, 1.39 x 0.87 x 0.97 m.

Each is copied to `game/assets/` under its brief's name. The game places them as instanced copies ([the city in the game](ingame-sea.png)): the temple and the rings once, the houses, towers, kelp and coral by the dozen at their own scales, and the fish and mantas moved and turned by the vertex shader alone, the fish tinted per shoal and the coral per head. Only the sand, the water, the shafts of light and the drifting motes are drawn in the world's own code, as in the other worlds.

Later the same day the owner asked for the city as ruins and for better fish and rays: `sea_temple`, `sea_house`, `sea_tower` and `sea_rings` left the game for the [ruins](../ruins/README.md), and `reef_fish` and `manta_ray` were replaced by a [second reading](../sea-creatures/README.md). `sea_kelp` and `sea_coral` stay.
