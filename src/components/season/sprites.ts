// Pixel sprites for the Halloween season. One character per pixel; the
// palette maps characters to CSS classes defined in styles/seasons/halloween.css.

export const lanternPalette = {
  o: "px-pumpkin",
  d: "px-pumpkin-dark",
  y: "px-flame",
  g: "px-stem",
};

// Carved pumpkin, Minecraft-style square face.
export const lantern = [
  "....gg....",
  ".oodoodoo.",
  "ooodoodooo",
  "ooyyooyyoo",
  "ooyyooyyoo",
  "ooodoodooo",
  "oyyyyyyyyo",
  "ooyoyyoyoo",
  ".oodoodoo.",
];

export const batPalette = {
  "#": "px-bat",
  e: "px-bat-eye",
};

export const batWingsUp = [
  "#.............#",
  "##...........##",
  ".##...#.#...##.",
  ".####.e#e.####.",
  "..###########..",
  "....#######....",
  "......#.#......",
];

export const batWingsDown = [
  "...............",
  "...............",
  "......#.#......",
  "..###.e#e.###..",
  ".#############.",
  "##..#######..##",
  "#.....#.#.....#",
];

export const moonPalette = {
  m: "px-moon",
  s: "px-moon-shade",
  c: "px-moon-crater",
  k: "px-moon-pit",
  h: "px-moon-halo",
};

// Pixel moon: a disc whose lower-right limb falls into shade through a
// dithered band, a handful of craters, and a dithered halo standing in for
// glow, so the light itself stays in the pixel language.
const MOON = 30;
const MOON_R = 11.5;
const craterPits = new Set(["11,10", "12,10", "18,9", "13,18", "19,16", "20,16"]);
const craterRims = new Set([
  "10,9", "11,9", "12,9", "10,10", "10,11", "11,11",
  "17,8", "18,8", "17,9",
  "12,17", "13,17", "12,18", "12,19", "13,19", "14,18",
  "18,15", "19,15", "20,15", "18,16",
  "8,15", "16,12", "15,21",
]);
export const moon = Array.from({ length: MOON }, (_, y) =>
  Array.from({ length: MOON }, (_, x) => {
    const dx = x + 0.5 - MOON / 2;
    const dy = y + 0.5 - MOON / 2;
    const d = Math.hypot(dx, dy);
    const checker = (x + y) % 2 === 0;
    if (d > MOON_R) {
      if (d <= MOON_R + 1.2) return "h";
      if (d <= MOON_R + 3 && checker) return "h";
      return ".";
    }
    if (craterPits.has(`${x},${y}`)) return "k";
    if (craterRims.has(`${x},${y}`)) return "c";
    // The limb away from the light falls into shade, then dithers back.
    const away = dx + dy;
    if (d > MOON_R - 1.6 && away > 2) return "s";
    if (d > MOON_R - 3.4 && away > 5 && checker) return "s";
    return "m";
  }).join(""),
);

export const starPalette = {
  w: "px-star",
};

export const star = [".w.", "www", ".w."];

export const spiderPalette = {
  "#": "px-spider",
  e: "px-bat-eye",
};

export const spider = [
  "#..#...#..#",
  ".#..###..#.",
  "..#######..",
  "#..#e#e#..#",
  ".##.###.##.",
  "....###....",
  ".....#.....",
];

// Graveyard horizon for the home hero: blocky hills with tombstones, a dead
// tree, a broken fence, and jack-o'-lanterns whose light warms the ground
// around them. Wide enough that any viewport sees only a centered slice, with
// the busiest stretch to the right, under the moon.
export const horizonPalette = {
  g: "px-ground",
  r: "px-rim",
  w: "px-rim-warm",
  t: "px-stone",
  s: "px-stone-lit",
  o: "px-pumpkin",
  d: "px-pumpkin-dark",
  y: "px-flame",
  n: "px-stem",
};

export const HORIZON_W = 480;
export const HORIZON_H = 26;

const tombTall = [
  ".ttts.",
  "ttttts",
  "tgggts",
  "ttttts",
  "ttttts",
  "ttttts",
  "ttttts",
];

const tombSmall = [".ts.", "ttts", "ttts", "ttts", "ttts"];

const deadTree = [
  "..g..........g.....",
  "...g....g...g...g..",
  "...gg...g..g...g...",
  "....g...gg.g..gg...",
  "..g.gg...ggg.gg....",
  "...g.gg..gg.gg.....",
  "......gg.ggggg.....",
  ".......gggg........",
  "........ggg........",
  "........ggg........",
  "........gg.........",
  "........ggg........",
  ".......gggg........",
  ".......ggggg.......",
  "......gggggg.......",
  ".....ggggggggg.....",
];

const fence = [
  "g....g....g....g....g",
  "ggggggggggg....gggggg",
  "g....g....g....g....g",
  "ggggggggggggggggggggg",
  "g....g....g....g....g",
];

const pumpkinSmall = [
  "...n...",
  ".odood.",
  "oyoooyo",
  "ooodooo",
  "oyyyyyo",
  ".ododo.",
];

const pumpkinBig = lantern.map((row) => row.replace(/g/g, "n"));

// [shape, left column, casts light]
const features: [string[], number, boolean?][] = [
  [tombSmall, 92],
  [pumpkinSmall, 118, true],
  [tombTall, 150],
  [fence, 172],
  [tombSmall, 214],
  [pumpkinSmall, 226, true],
  [tombTall, 246],
  [pumpkinBig, 288, true],
  [tombTall, 306],
  [deadTree, 322],
  [tombSmall, 344],
  [tombTall, 352],
  [pumpkinSmall, 366, true],
  [fence, 380],
  [tombTall, 410],
  [pumpkinSmall, 430, true],
];

// [center column, height, spread]
const hills: [number, number, number][] = [
  [60, 2, 18],
  [150, 2, 26],
  [230, 1, 16],
  [334, 5, 30],
  [420, 3, 24],
];

// Ground height per column, stepped in 4-wide blocks.
const groundHeight = Array.from({ length: HORIZON_W }, (_, x) => {
  const block = Math.floor(x / 4) * 4 + 2;
  const lift = hills.reduce(
    (sum, [c, h, w]) => sum + h * Math.exp(-(((block - c) / w) ** 2)),
    0,
  );
  return 3 + Math.round(lift);
});

function buildHorizon() {
  const grid = Array.from({ length: HORIZON_H }, () =>
    Array<string>(HORIZON_W).fill("."),
  );
  const lights: number[] = [];

  for (const [shape, x0, lit] of features) {
    const w = Math.max(...shape.map((r) => r.length));
    const bottom = HORIZON_H - Math.min(...groundHeight.slice(x0, x0 + w)) - 1;
    shape.forEach((row, i) => {
      const y = bottom - (shape.length - 1 - i);
      [...row].forEach((ch, dx) => {
        if (ch !== "." && y >= 0) grid[y][x0 + dx] = ch;
      });
    });
    if (lit) lights.push(x0 + Math.floor(w / 2));
  }

  // Ground goes down last, so features sink into higher steps instead of
  // floating over them. Its top edge catches moonlight, or lantern light.
  groundHeight.forEach((h, x) => {
    const top = HORIZON_H - h;
    const near = Math.min(...lights.map((l) => Math.abs(l - x)));
    const warm = near <= 5 || (near <= 8 && x % 2 === 0);
    for (let y = top; y < HORIZON_H; y++) {
      grid[y][x] = y === top ? (warm ? "w" : "r") : "g";
    }
  });

  return grid.map((row) => row.join(""));
}

export const horizon = buildHorizon();
