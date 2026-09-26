// Cuts the trailer from the recorded sessions (scripts/record-trailer.mjs): the clips in order,
// the game's own sound cut along with them (scripts/trailer-soundtrack.mjs), each place's music
// under its part and cards set in the game's type. Writes a 1080p60 master, a 720p30 copy, a
// short loop for the README and the chosen stills as 1920x1080 screenshots.
//   node scripts/edit-trailer.mjs [dir]
import puppeteer from "puppeteer-core";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
  stat,
} from "node:fs/promises";

const dir = process.argv[2] || "outputs/trailer";
const FFMPEG = "/opt/homebrew/bin/ffmpeg";
const FPS = 60;
const RATE = 48000;
// Each place's tune is brought to one loudness, and the music sits this much above the game's
// own sound in the mix.
const MUSIC_LUFS = -30;
const MUSIC_GAIN = 2.0;

// A part is a run of clips under one piece of music. A clip is [session, from, to, label] in
// seconds of that session's recording, or ["card:<name>", 0, seconds] for a full-screen card.
// `fade` crossfades picture and sound from the part before. `music` names the place whose tune
// starts with the part's first frame (music-<place>.wav, from its first bar); a part without
// one keeps the music before.
const PARTS = [
  {
    music: "court",
    clips: [
      ["court", 1.62, 6.9, "the opening shot"],
      ["court", 13.6, 16.2, "over the gap"],
      ["court", 19.8, 22.8, "along the crack and up"],
      [
        "court",
        55.4,
        59.3,
        "the light sent from mirror to mirror onto a stela",
      ],
    ],
  },
  {
    music: "court-open",
    clips: [["court", 75.1, 80.9, "the first door opens"]],
  },
  {
    music: "world2",
    clips: [
      ["court", 88.4, 92.5, "through it, to the checkpoint"],
      ["checkpoint", 26.0, 28.7, "the clerk"],
    ],
  },
  {
    music: "fight",
    clips: [
      ["checkpoint", 35.5, 38.1, "the confiscated disc taken back"],
      ["checkpoint", 40.0, 41.9, "a Warden's stamp"],
      ["checkpoint", 43.4, 45.7, "a plate stamped"],
    ],
  },
  {
    music: "isles",
    clips: [
      ["checkpoint", 72.0, 77.0, "the far door opens on the isles"],
      ["isles", 18.2, 21.2, "isle to isle"],
      ["isles", 23.9, 25.4, "a pylon woken"],
      ["isles", 27.0, 29.4, "across its bridge of light"],
      ["isles", 57.4, 60.0, "the crumbling stones"],
    ],
  },
  {
    music: "frost",
    clips: [
      ["isles", 86.9, 90.3, "Mira's ring opens on the ice"],
      ["frost", 19.2, 23.4, "down the frozen stream"],
      ["frost", 54.0, 57.2, "thin ice"],
      ["frost", 79.0, 81.55, "the last glyph struck free"],
    ],
  },
  {
    music: "finale",
    clips: [
      ["frost", 86.4, 91.0, "the great ring opens on the forest"],
      ["frost", 96.6, 100.7, "through it"],
      ["frost", 110.4, 114.4, "over the forest"],
      ["frost", 127.0, 133.9, "the last door, at the castle"],
    ],
  },
  {
    music: "sea",
    clips: [["frost", 135.0, 144.7, "the drowned city and the title"]],
  },
  { fade: 0.8, clips: [["card:end", 0, 4.5]] },
];
// Captions, bottom left: [kicker, line]. Cards over the picture: [name, part, clip, at,
// seconds], `at` counted from the start of that clip.
const CAPTIONS = {
  mirrors: ["Turn the bronze mirrors", "Dial the door with sunlight"],
  wardens: ["No stamp, no passage", "Provoke the Wardens"],
  bridges: ["Charge the disc in crystal beams", "Wake bridges of light"],
  ice: ["Slide, push, shatter", "Free the last glyph"],
};
const CARDS = [
  ["mirrors", 0, 3, 0.2, 3.4],
  ["wardens", 3, 1, 0, 4.0],
  ["bridges", 4, 2, 0.1, 3.7],
  ["ice", 5, 1, 0.4, 3.6],
];
// The README's loop: [part, from, to] in seconds of that part.
const LOOP = [1, 0.4, 5.8];
// Stills for the README, from the recorder's 4K stills: [file in stills/, name].
const SHOTS = [
  ["court-11-gate.png", "01-mirrors"],
  ["court-17-gate.png", "02-first-door"],
  ["checkpoint-01-orbit-1.png", "03-checkpoint"],
  ["checkpoint-09-far-door.png", "04-far-door"],
  ["isles-06-first-bridge.png", "05-bridge-of-light"],
  ["frost-05-slide.png", "06-frozen-stream"],
  ["frost-16-great-ring.png", "07-great-ring"],
  ["frost-50-finale.png", "08-drowned-city"],
];

const ff = (args) =>
  execFileSync(FFMPEG, ["-hide_banner", "-loglevel", "error", "-y", ...args], {
    stdio: ["ignore", "inherit", "inherit"],
  });
const frame = (s) => Math.round(s * FPS);

async function renderCards() {
  await mkdir(`${dir}/cards`, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  // The game's own typefaces, inlined: a page set from a string cannot fetch them.
  const font = async (file) =>
    `url(data:font/woff2;base64,${(await readFile(`game/fonts/${file}`)).toString("base64")}) format("woff2")`;
  const style = `
    @font-face { font-family: "Barlow Condensed"; font-weight: 800;
      src: ${await font("barlow-condensed-800.woff2")}; }
    @font-face { font-family: "DM Sans"; font-weight: 100 1000;
      src: ${await font("dm-sans-variable.woff2")}; }
    html, body { margin: 0; width: 1920px; height: 1080px; background: transparent;
      font-family: "DM Sans", sans-serif; color: #f0e2c8; }
    .kicker { margin: 0 0 14px; font-size: 24px; font-weight: 600; letter-spacing: 0.32em;
      text-transform: uppercase; color: #39e3d0; text-shadow: 0 1px 10px rgba(0, 0, 0, 0.8); }
    h1, h2 { margin: 0; font-family: "Barlow Condensed", sans-serif; font-weight: 800;
      text-transform: uppercase; letter-spacing: 0.04em; }
    .caption { position: absolute; left: 112px; bottom: 250px; }
    .caption h2 { font-size: 92px; line-height: 0.92; color: #f6e7c8;
      text-shadow: 0 4px 30px rgba(0, 0, 0, 0.75), 0 2px 0 rgba(90, 50, 20, 0.55); }
    .full { position: absolute; inset: 0; display: grid; place-content: center; text-align: center;
      background: radial-gradient(ellipse at 50% 45%, #2a1d14 0%, #120d0a 70%); }
    .full h1 { font-size: 250px; line-height: 0.86; color: #f3dfb8;
      text-shadow: 0 4px 0 #7a4a28, 0 28px 60px rgba(0, 0, 0, 0.5); }
    .full .tagline { margin: 30px 0 84px; font-size: 36px; }
    .full .play { margin: 0; font-size: 30px; }
    .full .url { margin: 12px 0 0; font-size: 54px; font-weight: 700; color: #39e3d0; }
  `;
  const pages = {
    ...Object.fromEntries(
      Object.entries(CAPTIONS).map(([name, [kicker, line]]) => [
        name,
        `<div class="caption"><p class="kicker">${kicker}</p><h2>${line}</h2></div>`,
      ]),
    ),
    end: `<div class="full"><p class="kicker">An expedition in four worlds</p><h1>Farseek</h1>
      <p class="tagline">Every tomb hides an address.</p>
      <p class="play">Play it free in your browser, on a laptop or a phone</p>
      <p class="url">farseek.rapidoai.dev</p></div>`,
  };
  for (const [name, html] of Object.entries(pages)) {
    await page.setContent(`<style>${style}</style>${html}`, {
      waitUntil: "load",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: `${dir}/cards/${name}.png`,
      omitBackground: true,
    });
  }
  await browser.close();
}

// When each part and each of its clips starts in the finished trailer.
function timeline() {
  let end = 0;
  return PARTS.map((part, p) => {
    const start = p ? end - (part.fade || 0) : 0;
    let at = start;
    const clips = part.clips.map(([, a, b]) => {
      const clip = at;
      at += (frame(b) - frame(a)) / FPS;
      return clip;
    });
    end = at;
    return { start, seconds: at - start, clips };
  });
}

function inputs() {
  const list = [];
  const at = (kind, src) => {
    const key = `${kind}:${src}`;
    let i = list.findIndex((x) => x.key === key);
    if (i < 0) i = list.push({ key, kind, src }) - 1;
    return i;
  };
  return {
    list,
    video: (s) => at("video", s),
    card: (name) => at("card", name),
    effects: (s) => at("effects", s),
    music: (s) => at("music", s),
    args() {
      return list.flatMap(({ kind, src }) =>
        kind === "video"
          ? ["-i", `${dir}/${src}.mp4`]
          : kind === "card"
            ? [
                "-loop",
                "1",
                "-framerate",
                String(FPS),
                "-i",
                `${dir}/cards/${src}.png`,
              ]
            : kind === "music"
              ? ["-i", `${dir}/music-${src}.wav`]
              : ["-i", `${dir}/${src}-effects.wav`],
      );
    },
  };
}

function picture(times) {
  const io = inputs();
  const g = [];
  PARTS.forEach((part, p) => {
    const vs = part.clips.map(([s, a, b], c) => {
      const id = `v${p}_${c}`;
      if (s.startsWith("card:"))
        g.push(
          `[${io.card(s.slice(5))}:v]trim=end_frame=${frame(b) - frame(a)},setpts=PTS-STARTPTS,format=yuv420p,settb=1/${FPS}[${id}]`,
        );
      else
        g.push(
          `[${io.video(s)}:v]trim=start_frame=${frame(a)}:end_frame=${frame(b)},setpts=PTS-STARTPTS,settb=1/${FPS}[${id}]`,
        );
      return `[${id}]`;
    });
    g.push(`${vs.join("")}concat=n=${vs.length}:v=1:a=0[p${p}]`);
  });
  let v = "[p0]";
  for (let p = 1; p < PARTS.length; p++) {
    const d = PARTS[p].fade || 0;
    g.push(
      d
        ? `${v}[p${p}]xfade=transition=fade:duration=${d}:offset=${times[p].start.toFixed(4)}[j${p}]`
        : `${v}[p${p}]concat=n=2:v=1:a=0[j${p}]`,
    );
    v = `[j${p}]`;
  }
  CARDS.forEach(([name, part, clip, offset, seconds], c) => {
    const at = (times[part].clips[clip] + offset).toFixed(4);
    g.push(
      `[${io.card(name)}:v]trim=end_frame=${frame(seconds)},format=rgba,` +
        `fade=t=in:st=0:d=0.4:alpha=1,fade=t=out:st=${seconds - 0.4}:d=0.4:alpha=1,` +
        `setpts=PTS-STARTPTS+${at}/TB[c${c}]`,
      `${v}[c${c}]overlay=0:0:eof_action=pass[o${c}]`,
    );
    v = `[o${c}]`;
  });
  const total = times.at(-1).start + times.at(-1).seconds;
  g.push(
    `${v}fade=t=out:st=${(total - 0.8).toFixed(3)}:d=0.8,format=yuv420p[out]`,
  );
  return { io, graph: g.join(";\n"), total };
}

function sound(times) {
  const io = inputs();
  const g = [];
  PARTS.forEach((part, p) => {
    const as = part.clips.map(([s, a, b], c) => {
      const id = `a${p}_${c}`;
      const len = (frame(b) - frame(a)) / FPS;
      if (s.startsWith("card:"))
        g.push(`anullsrc=r=${RATE}:cl=stereo,atrim=duration=${len}[${id}]`);
      else
        g.push(
          `[${io.effects(s)}:a]atrim=start=${frame(a) / FPS}:end=${frame(b) / FPS},asetpts=PTS-STARTPTS,` +
            `afade=t=in:d=0.02,afade=t=out:st=${(len - 0.02).toFixed(4)}:d=0.02[${id}]`,
        );
      return `[${id}]`;
    });
    g.push(`${as.join("")}concat=n=${as.length}:v=0:a=1[q${p}]`);
  });
  let a = "[q0]";
  for (let p = 1; p < PARTS.length; p++) {
    const d = PARTS[p].fade || 0;
    g.push(
      d
        ? `${a}[q${p}]acrossfade=d=${d}:c1=tri:c2=tri[k${p}]`
        : `${a}[q${p}]concat=n=2:v=0:a=1[k${p}]`,
    );
    a = `[k${p}]`;
  }
  // The music: each part's place from its first frame, faded under the next.
  const total = times.at(-1).start + times.at(-1).seconds;
  const beds = [];
  PARTS.forEach((part, p) => {
    if (!part.music) return;
    const s = part.music;
    let q = p + 1;
    while (q < PARTS.length && !PARTS[q].music) q++;
    const until =
      q < PARTS.length ? times[q].start + (PARTS[q].fade || 1) : total;
    const len = until - times[p].start;
    const ms = Math.round(times[p].start * 1000);
    g.push(
      `[${io.music(s)}:a]atrim=duration=${len.toFixed(4)},asetpts=PTS-STARTPTS,` +
        `afade=t=in:d=${p ? 0.8 : 0.2},afade=t=out:st=${(len - 1.2).toFixed(4)}:d=1.2,` +
        `volume=${stemGain[s].toFixed(4)},adelay=${ms}|${ms}[m${p}]`,
    );
    beds.push(`[m${p}]`);
  });
  g.push(
    `${beds.join("")}amix=inputs=${beds.length}:normalize=0:duration=longest[music]`,
    `${a}[music]amix=inputs=2:weights=1 ${MUSIC_GAIN}:normalize=0:duration=first,` +
      `afade=t=out:st=${(total - 1.2).toFixed(3)}:d=1.2,atrim=end=${total.toFixed(4)}[out]`,
  );
  return { io, graph: g.join(";\n"), total };
}
function render({ io, graph }, name, output) {
  const file = `${dir}/${name}-graph.txt`;
  return writeFile(file, graph).then(() =>
    ff([...io.args(), "-/filter_complex", file, "-map", "[out]", ...output]),
  );
}

function loudness(file) {
  const r = spawnSync(
    FFMPEG,
    [
      "-hide_banner",
      "-nostats",
      "-i",
      file,
      "-af",
      "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
      "-f",
      "null",
      "-",
    ],
    { encoding: "utf8" },
  );
  const from = r.stderr.lastIndexOf("{");
  return JSON.parse(r.stderr.slice(from, r.stderr.indexOf("}", from) + 1));
}

const stemGain = {};
for (const s of new Set(PARTS.map((p) => p.music).filter(Boolean)))
  stemGain[s] =
    10 ** ((MUSIC_LUFS - loudness(`${dir}/music-${s}.wav`).input_i) / 20);
await renderCards();
const times = timeline();
const cut = picture(times);
await render(cut, "picture", [
  ...["-c:v", "libx264", "-preset", "slow", "-crf", "20", "-r", String(FPS)],
  `${dir}/picture.mp4`,
]);
await render(sound(times), "sound", [
  "-c:a",
  "pcm_s16le",
  "-ar",
  String(RATE),
  `${dir}/sound.wav`,
]);
const m = loudness(`${dir}/sound.wav`);
ff([
  ...["-i", `${dir}/sound.wav`, "-af"],
  `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:` +
    `measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
  ...["-ar", String(RATE), `${dir}/sound-16.wav`],
]);
ff([
  ...["-i", `${dir}/picture.mp4`, "-i", `${dir}/sound-16.wav`],
  ...[
    "-map",
    "0:v",
    "-map",
    "1:a",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
  ],
  ...["-movflags", "+faststart", "-shortest", `${dir}/farseek-trailer.mp4`],
]);
ff([
  ...[
    "-i",
    `${dir}/farseek-trailer.mp4`,
    "-vf",
    "scale=1280:720:flags=lanczos,fps=30",
  ],
  ...[
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-b:a",
    "160k",
  ],
  ...["-movflags", "+faststart", `${dir}/farseek-trailer-720p.mp4`],
]);
// The loop, as an animated WebP: a third of a GIF's weight, in full colour.
const loop = [LOOP[1], LOOP[2]].map((s) =>
  (times[LOOP[0]].start + s).toFixed(3),
);
await rm(`${dir}/loop`, { recursive: true, force: true });
await mkdir(`${dir}/loop`);
ff([
  ...["-ss", loop[0], "-to", loop[1], "-i", `${dir}/farseek-trailer.mp4`],
  ...["-vf", "fps=15,scale=800:-1:flags=lanczos", `${dir}/loop/%04d.png`],
]);
const loopFrames = (await readdir(`${dir}/loop`))
  .sort()
  .map((f) => `${dir}/loop/${f}`);
execFileSync("/opt/homebrew/bin/img2webp", [
  ...["-loop", "0", "-lossy", "-q", "72", "-m", "6", "-d", "67"],
  ...loopFrames,
  ...["-o", `${dir}/farseek-loop.webp`],
]);
await rm(`${dir}/loop`, { recursive: true });
await mkdir(`${dir}/screenshots`, { recursive: true });
for (const [file, name] of SHOTS)
  ff([
    ...["-i", `${dir}/stills/${file}`, "-vf", "scale=1920:1080:flags=lanczos"],
    ...["-q:v", "3", `${dir}/screenshots/${name}.jpg`],
  ]);
const size = async (f) => ((await stat(`${dir}/${f}`)).size / 1e6).toFixed(1);
const report = {
  seconds: +cut.total.toFixed(3),
  parts: PARTS.map((p, i) => ({
    music: p.music,
    fade: p.fade,
    clips: p.clips.map((c, k) => ({
      at: +times[i].clips[k].toFixed(3),
      clip: c,
    })),
  })),
  cards: CARDS.map(([name, part, clip, offset, seconds]) => ({
    name,
    text: CAPTIONS[name],
    at: +(times[part].clips[clip] + offset).toFixed(3),
    seconds,
  })),
  loop: loop.map(Number),
  music: { lufs: MUSIC_LUFS, gain: MUSIC_GAIN, stems: stemGain },
  loudness: { measured: m.input_i, target: -16 },
  sizes: {
    master: await size("farseek-trailer.mp4"),
    light: await size("farseek-trailer-720p.mp4"),
    loop: await size("farseek-loop.webp"),
  },
};
await writeFile(`${dir}/edit.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.sizes), `${report.seconds}s`);
