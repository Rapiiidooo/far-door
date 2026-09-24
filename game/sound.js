// Procedural sound, no files: desert wind, footfalls, stone, bells for the glyphs and a
// rising drone for the gate. The context starts on the first click, as browsers require.

export class Sound {
  constructor(settings = {}) {
    this.ctx = null;
    this.stepClock = 0;
    this.settings = settings;
    this.ducked = false;
  }

  start() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    // Effects and music have their own levels under the master.
    this.fx = ctx.createGain();
    this.fx.connect(this.master);
    this.applyVolumes();
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Wind: looping noise through a wandering band-pass.
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 420;
    band.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = 0.09;
    src.connect(band).connect(gain).connect(this.fx);
    src.start();
    this.wind = { band, gain };
    // The beam's hum, louder near the light.
    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 110;
    const hum2 = ctx.createOscillator();
    hum2.frequency.value = 165.5;
    const humGain = ctx.createGain();
    humGain.gain.value = 0;
    hum.connect(humGain);
    hum2.connect(humGain);
    humGain.connect(this.fx);
    hum.start();
    hum2.start();
    this.hum = humGain;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    const duck = this.ducked ? 0.35 : 1;
    this.master.gain.setTargetAtTime(0.75 * (s.volume ?? 0.8) * duck, t, 0.05);
    this.fx.gain.setTargetAtTime(s.effects ?? 0.9, t, 0.05);
    this.music?.bus.gain.setTargetAtTime(0.9 * (s.music ?? 0.7), t, 0.05);
  }

  // Quieter under the pause menu.
  duck(on) {
    this.ducked = on;
    this.applyVolumes();
  }

  // --- music: slow generative pads per place, and a bouncy pulse while Wardens give chase.
  startMusic() {
    if (!this.ctx || this.music) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.9 * (this.settings.music ?? 0.7);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 1100;
    bus.connect(tone).connect(this.master);
    this.music = {
      mode: "court",
      bus,
      nextChord: ctx.currentTime + 0.5,
      chord: 0,
      nextBeat: 0,
      beat: 0,
    };
    this.musicTimer = setInterval(() => this.tickMusic(), 100);
  }

  setMusic(mode) {
    if (this.music && this.music.mode !== mode) {
      this.music.mode = mode;
      this.music.nextChord = Math.min(
        this.music.nextChord,
        this.ctx.currentTime + 0.3,
      );
      this.music.nextBeat = this.ctx.currentTime + 0.1;
    }
  }

  tickMusic() {
    const M = this.music,
      ctx = this.ctx;
    if (!M || ctx.state !== "running") return;
    const t = ctx.currentTime;
    const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const SETS = {
      // D dorian in the court: warm and patient.
      court: [
        [50, 57, 60, 65, 69],
        [46, 53, 57, 62, 65],
        [48, 55, 60, 64, 67],
        [45, 52, 55, 60, 64],
      ],
      // Lydian shimmer under the violet sky.
      world2: [
        [52, 59, 63, 68, 70],
        [49, 56, 59, 64, 68],
        [45, 52, 56, 61, 64],
        [47, 54, 58, 63, 66],
      ],
      fight: [
        [45, 52, 57, 60, 64],
        [43, 50, 55, 59, 62],
      ],
      // The door open: the court's chords lifted into major.
      "court-open": [
        [50, 57, 62, 66, 69],
        [47, 54, 59, 62, 66],
        [43, 50, 55, 59, 62],
        [45, 52, 57, 61, 64],
      ],
      // Open and airy over the isles: E lydian.
      isles: [
        [52, 59, 64, 68, 70],
        [49, 56, 61, 64, 68],
        [45, 52, 57, 61, 64],
        [47, 54, 59, 63, 66],
      ],
      // The frozen reach: open fifths and a high cold ninth, A minor.
      frost: [
        [45, 52, 59, 64, 71],
        [41, 48, 57, 64, 67],
        [43, 50, 57, 62, 69],
        [40, 47, 55, 62, 66],
      ],
      // Dawn over the clouds, for the ending and the credits.
      finale: [
        [48, 55, 60, 64, 67],
        [45, 52, 57, 60, 64],
        [41, 48, 53, 57, 60],
        [43, 50, 55, 59, 62],
      ],
    };
    if (t + 0.4 > M.nextChord) {
      const set = SETS[M.mode] || SETS.court;
      const notes = set[M.chord % set.length];
      M.chord++;
      const len = M.mode === "fight" ? 4.4 : 8.5;
      for (const [i, n] of notes.entries())
        this.pad(hz(n), M.nextChord, len, i === 0 ? 0.028 : 0.018);
      M.nextChord += M.mode === "fight" ? 3.64 : 8;
    }
    if (M.mode === "fight") {
      const step = 60 / 132 / 2;
      const bass = [45, 45, 52, 45, 57, 45, 52, 50];
      if (M.nextBeat < t) M.nextBeat = t + 0.05;
      while (M.nextBeat < t + 0.35) {
        const b = M.beat++;
        this.pluck(hz(bass[b % bass.length] - 12), M.nextBeat, 0.16, 0.09);
        if (b % 2 === 1) this.tick(M.nextBeat, 0.035);
        M.nextBeat += step;
      }
    }
  }

  pad(freq, at, length, level) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + 2.4);
    g.gain.setValueAtTime(level, at + length - 2.5);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    g.connect(this.music.bus);
    for (const cents of [-7, 7]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = freq;
      o.detune.value = cents;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 700;
      o.connect(lp).connect(g);
      o.start(at);
      o.stop(at + length + 0.1);
    }
  }

  pluck(freq, at, length, level) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = freq;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, at);
    lp.frequency.exponentialRampToValueAtTime(200, at + length);
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(lp).connect(g).connect(this.music.bus);
    o.start(at);
    o.stop(at + length + 0.05);
  }

  tick(at, level) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    src.connect(hp).connect(g).connect(this.music.bus);
    src.start(at, Math.random(), 0.06);
  }

  update(dt, hero, beams) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.wind.band.frequency.setTargetAtTime(
      380 + Math.sin(t * 0.21) * 160 + Math.sin(t * 0.73) * 60,
      t,
      0.5,
    );
    this.wind.gain.gain.setTargetAtTime(
      0.07 + Math.sin(t * 0.13) * 0.03,
      t,
      0.8,
    );
    let near = 99;
    for (const s of beams?.segments || [])
      near = Math.min(near, distToSegment(hero.pos, s));
    this.hum.gain.setTargetAtTime(Math.max(0, 1 - near / 7) * 0.035, t, 0.2);
    if (hero.state === "ground" && hero.speed > 1) {
      this.stepClock += dt * hero.speed;
      if (this.stepClock > 1.75) {
        this.stepClock = 0;
        this.burst(0.05, 900, 0.07, 0.6);
      }
    }
  }

  play(name, arg) {
    if (!this.ctx) return;
    switch (name) {
      case "jump":
        return this.burst(0.12, 700, 0.05, 1.5);
      case "land":
        this.tone(72, 0.18, 0.18, "sine");
        return this.burst(0.08, 500, 0.12, 0.8);
      case "land-hard":
        this.tone(55, 0.35, 0.3, "sine");
        return this.burst(0.2, 300, 0.2, 0.6);
      case "grab":
      case "grip":
        return this.burst(0.06, 1600, 0.08, 2);
      case "climb":
      case "vault":
        return this.burst(0.3, 800, 0.06, 1);
      case "push":
      case "pull":
        return this.burst(1.0, 240, 0.16, 0.6);
      case "lock":
        return this.tone(1320, 0.08, 0.05, "triangle");
      case "chime": {
        const base = { left: 392, top: 523.25, right: 659.25 }[arg] || 440;
        return this.bell(base);
      }
      case "medallion":
        this.burst(0.5, 1800, 0.12, 0.8);
        return this.bell([196, 261.63, 329.63][arg] || 196, 3);
      case "gate":
        return this.drone();
      case "cross":
        this.sweep(200, 1600, 0.9, 0.08, "sine");
        this.burst(1.6, 1200, 0.3, 0.4);
        return this.bell(261.6, 3);
      case "respawn":
        return this.burst(0.4, 400, 0.1, 0.7);
      case "roll":
        return this.burst(0.35, 500, 0.08, 0.9);
      case "hurt":
        this.tone(140, 0.2, 0.12, "square");
        return this.burst(0.2, 700, 0.12, 1.2);
      case "throw":
        return this.sweep(900, 2400, 0.28, 0.06, "sawtooth");
      case "catch":
        return this.tone(1560, 0.12, 0.06, "triangle");
      case "clink":
        this.tone(2100, 0.18, 0.05, "triangle");
        return this.tone(3150, 0.12, 0.03, "sine");
      case "charge":
        this.bell(784, 1.2);
        return this.sweep(600, 1800, 0.5, 0.05, "sine");
      case "warden-alert":
        this.sweep(700, 1300, 0.12, 0.07, "square");
        return setTimeout(
          () => this.sweep(1300, 800, 0.14, 0.07, "square"),
          130,
        );
      case "warden-windup":
        return this.sweep(200, 520, 0.6, 0.06, "sawtooth");
      case "warden-hit":
        this.tone(95, 0.2, 0.2, "sine");
        return this.sweep(1400, 500, 0.18, 0.08, "square");
      case "warden-down":
        return this.sweep(900, 120, 0.9, 0.09, "sawtooth");
      case "pop":
        this.burst(0.15, 2000, 0.12, 2);
        return this.bell(1046.5, 0.6);
      case "stamp":
        this.tone(60, 0.3, 0.3, "sine");
        return this.burst(0.18, 350, 0.25, 0.7);
      case "alarm":
        for (let i = 0; i < 4; i++)
          setTimeout(() => this.sweep(600, 950, 0.28, 0.08, "square"), i * 320);
        return;
      case "lamp":
        this.bell(659.25, 2.4);
        return this.bell(987.8, 2.4);
      // A pylon wakes: two bells a fifth apart, and its bridge hums out across the gap.
      case "pylon":
        this.bell(523.25, 2.2);
        return this.bell(783.99, 2.6);
      case "bridge":
        return this.sweep(196, 587.3, 0.9, 0.06, "sine");
      // Ice: a block's run across the pond and its stop, a strike that shatters, thin ice
      // cracking and giving way, and ice closing again.
      case "slide":
        return this.sweep(900, 420, 0.6, 0.03, "triangle");
      case "thud":
        return this.burst(0.25, 260, 0.2, 0.7);
      case "shatter":
        this.burst(0.35, 3200, 0.14, 1.2);
        this.bell(1318.5, 1.2);
        return setTimeout(() => this.burst(0.5, 1800, 0.08, 0.9), 80);
      case "crack":
        return this.burst(0.12, 2600, 0.12, 1.6);
      case "break":
        this.burst(0.5, 700, 0.16, 0.8);
        return setTimeout(() => this.burst(0.7, 300, 0.12, 0.6), 120);
      case "freeze":
        return this.sweep(1200, 2400, 0.8, 0.025, "sine");
      // A stone about to go: grit shaken loose, then the fall and its rubble.
      case "tremble":
        return this.burst(0.9, 520, 0.06, 0.9);
      case "crumble":
        this.burst(0.8, 240, 0.2, 0.6);
        return setTimeout(() => this.burst(0.6, 150, 0.14, 0.5), 160);
      case "barrier":
        return this.sweep(180, 90, 1.2, 0.08, "sawtooth");
      case "clerk":
        return this.sweep(500, 620, 0.09, 0.03, "square");
      case "use":
        return this.burst(0.2, 1200, 0.08, 1.5);
      case "paper":
        this.burst(0.18, 3200, 0.05, 1.5);
        return setTimeout(() => this.burst(0.22, 2400, 0.04, 1.2), 90);
      case "strain":
        this.tone(52, 0.3, 0.2, "sine");
        return this.burst(0.4, 190, 0.18, 0.7);
      case "ui":
        return this.tone(880, 0.05, 0.03, "triangle");
      case "rumble":
        return this.rumble(3.4);
      case "ignite":
        this.tone(48, 1.6, 0.4, "sine");
        this.sweep(160, 40, 1.2, 0.2, "sawtooth");
        this.burst(1.8, 300, 0.45, 0.5);
        this.burst(2.4, 2400, 0.12, 0.3);
        for (const [f, d] of [
          [392, 0],
          [523.25, 90],
          [659.25, 180],
          [783.99, 300],
        ])
          setTimeout(() => this.bell(f, 4.5), d);
        return;
      // A relic found: a rising arpeggio, lighter than a door's.
      case "relic":
        this.burst(0.25, 2800, 0.05, 1.4);
        for (const [f, d] of [
          [523.25, 0],
          [659.25, 110],
          [783.99, 220],
          [1046.5, 380],
        ])
          setTimeout(() => this.bell(f, 2.4), d);
        return;
      case "plate":
        this.tone(70, 0.3, 0.3, "sine");
        this.bell(523.25, 2.2);
        return setTimeout(() => this.bell(783.99, 2.2), 140);
      case "void":
        this.sweep(300, 120, 0.4, 0.1, "square");
        return this.burst(0.25, 500, 0.15, 0.8);
      case "provoke":
        return this.sweep(500, 900, 0.18, 0.06, "square");
      default:
    }
  }

  burst(duration, freq, level, q) {
    const ctx = this.ctx,
      t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(f).connect(g).connect(this.fx);
    src.start(t, Math.random() * 1.5, duration + 0.05);
  }

  tone(freq, duration, level, type = "sine") {
    const ctx = this.ctx,
      t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(g).connect(this.fx);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  // A pitch glide: whooshes, squeaks and alarms.
  sweep(from, to, duration, level, type = "sine") {
    const ctx = this.ctx,
      t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + duration);
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    o.connect(f).connect(g).connect(this.fx);
    o.start(t);
    o.stop(t + duration + 0.05);
  }

  // A struck bronze bell: inharmonic partials decaying at different rates.
  bell(base, length = 3.2) {
    for (const [ratio, level, decay] of [
      [1, 0.16, 1],
      [2.01, 0.08, 0.7],
      [2.76, 0.06, 0.5],
      [5.4, 0.03, 0.25],
    ])
      this.tone(base * ratio, length * decay, level, "sine");
  }

  // The ground working itself up under a charging gate: a sub-bass swell and grinding stone.
  rumble(length) {
    const ctx = this.ctx,
      t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.5, t + length);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.4);
    g.connect(this.fx);
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(32, t);
    o.frequency.exponentialRampToValueAtTime(58, t + length);
    o.connect(g);
    o.start(t);
    o.stop(t + length + 0.5);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(120, t);
    lp.frequency.exponentialRampToValueAtTime(700, t + length);
    const ng = ctx.createGain();
    ng.gain.value = 0.35;
    src.connect(lp).connect(ng).connect(g);
    src.start(t);
    src.stop(t + length + 0.5);
    for (let i = 0; i < 6; i++)
      setTimeout(
        () =>
          this.burst(0.12, 600 + Math.random() * 900, 0.05 + i * 0.015, 1.5),
        i * 520 + Math.random() * 200,
      );
  }

  drone() {
    const ctx = this.ctx,
      t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 3);
    g.gain.exponentialRampToValueAtTime(0.06, t + 9);
    g.connect(this.fx);
    for (const f of [55, 82.4, 110.2, 164.8]) {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f * 0.5, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 3.2);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(200, t);
      lp.frequency.exponentialRampToValueAtTime(1400, t + 3.5);
      o.connect(lp).connect(g);
      o.start(t);
      o.stop(t + 30);
    }
  }
}

function distToSegment(p, s) {
  const vx = s.x1 - s.x0,
    vz = s.z1 - s.z0;
  const len2 = vx * vx + vz * vz || 1;
  const t = Math.max(
    0,
    Math.min(1, ((p.x - s.x0) * vx + (p.z - s.z0) * vz) / len2),
  );
  return Math.hypot(p.x - (s.x0 + vx * t), p.z - (s.z0 + vz * t));
}
