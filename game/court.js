// The Sunken Court: the first tomb. A 30 by 44 metre ruin in 2 m cells, north at -Z.
//
// Route: the explorer starts on the southern terrace (8 m) looking north at the gate, jumps
// the gap to the west platform, drops to a lower ledge, jumps the chasm to a crack in the
// standing wall, shimmies east to the next platform, climbs up, then walks down a broken
// stair of blocks into the court. There, sunlight enters from the west: push the block out
// of its way, then turn three mirrors to light the three stelae of the address.
//
// Heights: '.' 0, '_' sand pit at -3, '~' chasm at -8, '#' cliff, '1'..'9' 0.5 to 4.5 m,
// 'a'..'o' 5 to 12 m in 0.5 m steps.
export const CELL = 2;

export const MAP = [
  "###############",
  "###############",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#.............#",
  "#...eb852.....#",
  "#...e_____....#",
  "#oooe__.._....#",
  "#~~~~_____....#",
  "#bb~..........#",
  "#gg~gggggggggg#",
  "#gg~gggggggggg#",
  "#gg~gggggggggg#",
  "###############",
];

export function heightOf(ch) {
  if (ch === ".") return 0;
  if (ch === "_") return -3;
  if (ch === "~") return -8;
  if (ch === "#") return 16;
  if (ch >= "1" && ch <= "9") return (ch.charCodeAt(0) - 48) * 0.5;
  if (ch >= "a" && ch <= "o") return 5 + (ch.charCodeAt(0) - 97) * 0.5;
  throw new Error("unknown cell " + ch);
}

// Extra boxes that a height map cannot express: the crack in the standing wall (a lip with
// an overhang above it, so it can be hung from but not stood on) and the platform face that
// continues it. Each is [minX, minY, minZ, maxX, maxY, maxZ, kind].
export const EXTRA = [
  // Rock shoulders that set the carved facade into the cliff.
  [2, -10, 4, 7, 15.5, 6.6, "rock"],
  [23, -10, 4, 28, 14.5, 6.6, "rock"],
  [2, -10, 32, 8, 7.0, 32.35, "rock"],
  [2, 7.6, 32, 8, 12, 32.7, "rock"],
  [8, -10, 32, 10, 7.0, 32.35, "rock"],
];

export const START = { x: 21, z: 37.2, yaw: Math.PI };

export const LIGHT = {
  // The sun catcher sits against the west cliff and throws the beam east at 1.3 m.
  source: { x: 3, z: 21, dir: [1, 0] },
  height: 1.3,
};

export const MIRRORS = [
  { id: "m1", x: 9, z: 21, yaw: -Math.PI / 4 },
  { id: "m2", x: 21, z: 25, yaw: Math.PI / 2 },
  { id: "m3", x: 17, z: 31, yaw: Math.PI * 0.75 },
];

// The address: three stelae before the gate, each feeding one medallion.
export const STELAE = [
  { id: "left", x: 9, z: 17, yaw: 0, glyph: "twin" },
  { id: "top", x: 15, z: 17, yaw: 0, glyph: "spiral" },
  { id: "right", x: 21, z: 17, yaw: 0, glyph: "peak" },
];

export const BLOCKS = [{ id: "b1", x: 5, z: 21 }];

export const GATE = { x: 15, z: 11, yaw: 0 };
export const FACADE = { x: 15, z: 4, yaw: 0 };
export const COLOSSI = [
  { x: 5, z: 10.5, yaw: 0 },
  { x: 25, z: 10.5, yaw: 0 },
];

export const COLUMNS = [
  [3.2, 27.5, 0.4],
  [26.5, 21, 1.2],
  [25.8, 30.5, 2.1],
];

export const BRAZIERS = [
  [11.2, 14.6],
  [18.8, 14.6],
];
