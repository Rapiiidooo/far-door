// Procedural sound, no files: desert wind, footfalls, stone, bells for the glyphs and a
// rising drone for the gate. The context starts on the first click, as browsers require.

export class Sound {
  constructor() {
    this.ctx = null;
    this.stepClock = 0;
  }

  start() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.7;
    this.master.connect(ctx.destination);
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
    src.connect(band).connect(gain).connect(this.master);
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
    humGain.connect(this.master);
    hum.start();
    hum2.start();
    this.hum = humGain;
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
        return this.bell(196, 2.5);
      case "gate":
        return this.drone();
      case "cross":
        this.burst(1.6, 1200, 0.3, 0.4);
        return this.bell(261.6, 3);
      case "respawn":
        return this.burst(0.4, 400, 0.1, 0.7);
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
    src.connect(f).connect(g).connect(this.master);
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
    o.connect(g).connect(this.master);
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

  drone() {
    const ctx = this.ctx,
      t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 3);
    g.gain.exponentialRampToValueAtTime(0.06, t + 9);
    g.connect(this.master);
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
