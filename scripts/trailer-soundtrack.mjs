// Plays a recorded session's sound log back through the game's own Sound class, offline and in
// step with the session's frames: one WAV of the effects and each world's air, one of the music.
// With --cues, renders instead each named place's music from its first bar at full level.
//   node scripts/trailer-soundtrack.mjs <session> [dir] [--url=http://localhost:3002/]
//   node scripts/trailer-soundtrack.mjs --cues=court,isles [dir] [--seconds=40]
import puppeteer from "puppeteer-core";
import { readFile, writeFile } from "node:fs/promises";

const arg = (name) =>
  process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const positional = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const cues = arg("cues")?.split(",");
const session = cues ? null : positional[0];
const dir = positional[cues ? 0 : 1] || "outputs/trailer";
const base = arg("url") || "http://localhost:3002/";
const seconds = Number(arg("seconds") || 40);
const rec = cues
  ? null
  : JSON.parse(await readFile(`${dir}/${session}-sound.json`, "utf8"));

const browser = await puppeteer.launch({
  executablePath:
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on(
  "console",
  (m) => m.type() === "error" && !/404/.test(m.text()) && errors.push(m.text()),
);
await page.goto(`${base}favicon.svg`);

const jobs = cues
  ? cues.map((cue) => ({
      kind: "music",
      file: `${dir}/music-${cue}.wav`,
      rec: {
        frames: seconds * 60,
        fps: 60,
        t0: 0,
        cue,
        log: [
          [1000 / 60, "start"],
          [1000 / 60, "startMusic"],
          [1000 / 60, "music", cue],
        ],
      },
    }))
  : ["effects", "music"].map((kind) => ({
      kind,
      file: `${dir}/${session}-${kind}.wav`,
      rec,
    }));
for (const { kind, file, rec } of jobs) {
  const wav = await page.evaluate(
    async (rec, kind) => {
      const RATE = 48000;
      const seconds = rec.frames / rec.fps;
      const off = new OfflineAudioContext(2, Math.ceil(RATE * seconds), RATE);
      window.AudioContext = function () {
        return off;
      };
      // Delays inside the Sound class run on the render's clock, one render quantum at most late.
      const Q = 128 / RATE;
      const slots = new Map();
      const at = (time, fn) => {
        const k = Math.max(
          Math.ceil(time / Q - 1e-6),
          Math.floor(off.currentTime / Q + 1e-6) + 1,
        );
        if (k * Q >= seconds) return;
        if (!slots.has(k)) {
          slots.set(k, []);
          off.suspend(k * Q).then(() => {
            for (const f of slots.get(k)) f();
            slots.delete(k);
            off.resume();
          });
        }
        slots.get(k).push(fn);
      };
      window.setTimeout = (fn, ms = 0) => (
        at(off.currentTime + ms / 1000, fn),
        0
      );
      window.setInterval = () => 0;
      const { Sound } = await import(`/sound.js?replay=${kind}`);
      const s = new Sound({
        volume: 0.8,
        music: kind === "music" ? 0.7 : 0,
        effects: kind === "effects" ? 0.9 : 0,
      });
      const origin = { x: 0, z: 0 };
      const run = ([, what, a, b, c, d]) => {
        if (what === "start") s.start();
        else if (what === "startMusic") s.startMusic();
        else if (what === "place") s.setPlace(a);
        else if (what === "music") {
          s.setMusic(a);
          // A cue rendered alone starts at full level instead of rising from silence.
          if (rec.cue) {
            const g = s.music.layers[a].out.gain;
            g.cancelScheduledValues(0);
            g.setValueAtTime(1, 0);
          }
        } else if (what === "duck") s.duck(a);
        else if (what === "play") s.play(a, b);
        else if (what === "update")
          s.update(
            a,
            { pos: origin, state: b, speed: c },
            d < 99 ? { segments: [{ x0: d, z0: 0, x1: d, z1: 0 }] } : null,
          );
      };
      // A frame's events sound when the frame is shown: frame i is stepped to t0 + i/fps.
      const when = (t) => (t - rec.t0) / 1000 - 1 / rec.fps;
      for (const e of rec.log) {
        const t = when(e[0]);
        if (t <= 0) run(e);
        else at(t, () => run(e));
      }
      for (let t = 0.1; t < seconds; t += 0.1)
        at(t, () => s.music && s.scheduleMusic(off.currentTime));
      const buf = await off.startRendering();
      const L = buf.getChannelData(0),
        R = buf.getChannelData(1);
      const bytes = new ArrayBuffer(44 + L.length * 4);
      const v = new DataView(bytes);
      const str = (o, text) =>
        [...text].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)));
      str(0, "RIFF");
      v.setUint32(4, 36 + L.length * 4, true);
      str(8, "WAVEfmt ");
      v.setUint32(16, 16, true);
      v.setUint16(20, 1, true);
      v.setUint16(22, 2, true);
      v.setUint32(24, RATE, true);
      v.setUint32(28, RATE * 4, true);
      v.setUint16(32, 4, true);
      v.setUint16(34, 16, true);
      str(36, "data");
      v.setUint32(40, L.length * 4, true);
      for (let i = 0, o = 44; i < L.length; i++, o += 4) {
        v.setInt16(o, Math.max(-1, Math.min(1, L[i])) * 32767, true);
        v.setInt16(o + 2, Math.max(-1, Math.min(1, R[i])) * 32767, true);
      }
      const u8 = new Uint8Array(bytes);
      let bin = "";
      for (let i = 0; i < u8.length; i += 0x8000)
        bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return btoa(bin);
    },
    rec,
    kind,
  );
  await writeFile(file, Buffer.from(wav, "base64"));
  console.log(file);
}
console.log(`errors: ${errors.length ? errors.join(" | ") : "none"}`);
await browser.close();
