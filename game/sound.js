// Procedural sound, no files: each world's wind and footfalls, stone, bells for the glyphs, a
// rising drone for the gate and a small tune per place. The context starts on the first
// click, as browsers require.

export class Sound {
  constructor(settings = {}) {
    this.ctx = null;
    this.stepClock = 0;
    this.settings = settings;
    this.ducked = false;
    this.place = "court";
    this.birdClock = 0;
  }

  // Where the explorer is, for the wind and the footfalls; "forest" once the last door is open.
  setPlace(where) {
    this.place = where;
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

  // --- music: one small tune for the whole journey, played in each world's own mode, tempo and
  // voice over slow pads, with rests between its lines. Places crossfade slowly with a breath
  // between them; the Wardens' chase comes and goes faster, on a bouncy pulse of its own.
  startMusic() {
    if (!this.ctx || this.music) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.9 * (this.settings.music ?? 0.7);
    bus.connect(this.master);
    const tone = ctx.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 4200;
    tone.connect(bus);
    // One shared room for every place, each sending its own share into it.
    const hall = ctx.createConvolver();
    hall.buffer = hallTail(ctx, 3.2);
    hall.connect(tone);
    this.music = { mode: null, bus, tone, hall, layers: {} };
    this.musicTimer = setInterval(() => this.tickMusic(), 100);
  }

  setMusic(mode) {
    const M = this.music;
    if (!M || M.mode === mode) return;
    const t = this.ctx.currentTime;
    const quick = mode === "fight" || M.mode === "fight";
    const old = M.layers[M.mode];
    if (old) {
      old.on = false;
      old.out.gain.cancelScheduledValues(t);
      old.out.gain.setValueAtTime(old.out.gain.value, t);
      old.out.gain.setTargetAtTime(0, t, quick ? 0.5 : 1.8);
      old.until = t + (quick ? 3 : 10);
    }
    // The first music of a session rises from silence; a new place waits a breath.
    const at = t + (M.mode === null || quick ? 0.05 : 1.6);
    M.mode = mode;
    const L = (M.layers[mode] ??= this.musicLayer(CUES[mode] || CUES.court));
    L.out.gain.cancelScheduledValues(t);
    L.out.gain.setValueAtTime(L.out.gain.value, t);
    L.out.gain.setTargetAtTime(1, at, quick ? 0.35 : 2.4);
    // A place that had fallen silent starts its tune again from the top.
    if (!(L.until > t)) {
      L.next = at;
      L.bar = 0;
    }
    L.on = true;
    L.until = Infinity;
  }

  // A place's music: its own level, a send into the shared room and, for the airy voices, an
  // echo that darkens as it repeats.
  musicLayer(cue) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = 0;
    out.connect(this.music.tone);
    const send = ctx.createGain();
    send.gain.value = cue.hall;
    out.connect(send).connect(this.music.hall);
    const lead = ctx.createGain();
    lead.connect(out);
    if (cue.echo) {
      const delay = ctx.createDelay(3);
      delay.delayTime.value = (cue.echo * cue.bar) / 8;
      const dark = ctx.createBiquadFilter();
      dark.type = "lowpass";
      dark.frequency.value = 2400;
      const back = ctx.createGain();
      back.gain.value = 0.35;
      const wet = ctx.createGain();
      wet.gain.value = 0.4;
      lead.connect(delay).connect(dark).connect(back).connect(delay);
      dark.connect(wet).connect(out);
    }
    return {
      cue,
      out,
      lead,
      on: false,
      bar: 0,
      next: 0,
      beat: 0,
      nextBeat: 0,
      seed: 7,
    };
  }

  tickMusic() {
    if (this.music && this.ctx.state === "running")
      this.scheduleMusic(this.ctx.currentTime);
  }

  // Everything due in the next half second, for every place still audible.
  scheduleMusic(t) {
    for (const L of Object.values(this.music.layers)) {
      if (!L.on && !(L.until > t)) continue;
      // Back from a hidden tab: skip what was missed rather than play it all at once.
      if (L.next < t - 0.25) L.next = t + 0.1;
      while (L.next < t + 0.5) {
        this.musicBar(L, L.next);
        L.next += L.cue.bar;
        L.bar++;
      }
      if (L.cue.pulse) this.musicPulse(L, t);
    }
  }

  // One bar: the pads' chord, and a bar of the tune, or between its lines a few soft notes.
  musicBar(L, at) {
    const cue = L.cue,
      i = L.bar;
    const chord = cue.chords[i % cue.chords.length];
    for (const [k, n] of chord.entries())
      this.pad(
        hz(n),
        at,
        cue.pad ?? cue.bar + 0.3,
        k === 0 ? 0.018 : 0.012,
        L.out,
      );
    const beat = cue.bar / 8;
    const part = cue.song[Math.floor(i / 4) % cue.song.length];
    const line = TUNE[part]?.[i % 4];
    if (line)
      for (const [b, degree, len] of line) {
        const n = fit(tuneNote(cue, degree), chord);
        this.musicNote(
          cue.lead,
          hz(n),
          at + b * beat,
          len * beat,
          cue.level,
          L,
        );
        if (cue.double)
          this.musicNote(
            cue.double,
            hz(n + 12),
            at + b * beat,
            len * beat,
            cue.level * 0.3,
            L,
          );
      }
    else if (cue.lead && i % 2 === 1) {
      const tops = chord.slice(2);
      for (const b of [1 + rand(L) * 2, 4 + rand(L) * 2.5])
        this.musicNote(
          cue.lead,
          hz(tops[Math.floor(rand(L) * tops.length)] + 12),
          at + b * beat,
          beat * 1.5,
          cue.level * 0.45,
          L,
        );
    }
    // A music box turning the chord over, a little officious.
    if (cue.box)
      for (let s = 0; s < 8; s++)
        this.musicNote(
          "box",
          hz(chord[1 + BOX[s]] + 12),
          at + s * beat,
          beat,
          s % 4 === 0 ? 0.022 : 0.014,
          L,
        );
  }

  // The chase: a plucked bass bouncing at 132 beats a minute, and a tick off the beat.
  musicPulse(L, t) {
    const step = 60 / 132 / 2;
    const bass = [45, 45, 52, 45, 57, 45, 52, 50];
    if (L.nextBeat < t) L.nextBeat = t + 0.05;
    while (L.nextBeat < t + 0.35) {
      const b = L.beat++;
      this.pluck(hz(bass[b % bass.length] - 12), L.nextBeat, 0.16, 0.09, L.out);
      if (b % 2 === 1) this.tick(L.nextBeat, 0.025, L.out);
      L.nextBeat += step;
    }
  }

  // One note of a place's voice.
  musicNote(kind, f, at, len, vel, L) {
    const ctx = this.ctx,
      into = L.lead;
    switch (kind) {
      // Plucked strings: a bright attack that darkens as it rings.
      case "harp": {
        const length = Math.max(1.8, len + 1);
        const lp = ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.setValueAtTime(Math.min(8000, f * 10), at);
        lp.frequency.exponentialRampToValueAtTime(f * 1.8, at + 0.7);
        lp.connect(into);
        this.ring(f, at, length, vel, lp, "triangle", 0.006);
        this.ring(f * 1.002, at, length, vel * 0.3, lp, "sawtooth", 0.006);
        this.ring(f * 2, at, length * 0.4, vel * 0.15, lp);
        return;
      }
      // Metal bars under a slow tremolo, and the mallet's knock.
      case "vibes": {
        const length = Math.max(1.6, len + 1.2);
        const trem = ctx.createGain();
        trem.gain.value = 0.78;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.4;
        const depth = ctx.createGain();
        depth.gain.value = 0.22;
        lfo.connect(depth).connect(trem.gain);
        lfo.start(at);
        lfo.stop(at + length + 0.05);
        trem.connect(into);
        this.ring(f, at, length, vel, trem, "sine", 0.004);
        this.ring(f * 4, at, 0.3, vel * 0.18, into);
        this.ring(f * 10, at, 0.06, vel * 0.05, into);
        return;
      }
      // Breath and a pure tone, the vibrato coming in as the note settles.
      case "flute": {
        const end = at + len,
          hold = Math.max(at + 0.15, end - 0.1);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, at);
        g.gain.linearRampToValueAtTime(vel, at + 0.14);
        g.gain.setValueAtTime(vel, hold);
        g.gain.setTargetAtTime(0, hold, 0.12);
        g.connect(into);
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.1;
        const depth = ctx.createGain();
        depth.gain.setValueAtTime(0, at);
        depth.gain.linearRampToValueAtTime(f * 0.005, at + 0.6);
        lfo.connect(depth);
        for (const [type, level] of [
          ["sine", 1],
          ["triangle", 0.22],
        ]) {
          const o = ctx.createOscillator();
          o.type = type;
          o.frequency.value = f;
          depth.connect(o.frequency);
          const lg = ctx.createGain();
          lg.gain.value = level;
          o.connect(lg).connect(g);
          o.start(at);
          o.stop(end + 0.8);
        }
        lfo.start(at);
        lfo.stop(end + 0.8);
        const air = ctx.createBufferSource();
        air.buffer = this.noise;
        air.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = f * 2;
        bp.Q.value = 2.5;
        const ag = ctx.createGain();
        ag.gain.setValueAtTime(0, at);
        ag.gain.linearRampToValueAtTime(vel * 0.9, at + 0.04);
        ag.gain.setTargetAtTime(vel * 0.15, at + 0.05, 0.08);
        ag.gain.setTargetAtTime(0, hold, 0.1);
        air.connect(bp).connect(ag).connect(into);
        air.start(at, Math.random() * 1.5);
        air.stop(end + 0.8);
        return;
      }
      // Struck glass: a clear tone, its octave and a cold, inharmonic shimmer above.
      case "celesta": {
        const length = Math.max(2.4, len + 1.6);
        for (const [ratio, level, decay] of [
          [1, 1, 1],
          [2, 0.3, 0.55],
          [3.01, 0.1, 0.3],
          [4.17, 0.07, 0.18],
          [6.8, 0.03, 0.08],
        ])
          this.ring(
            f * ratio,
            at,
            length * decay,
            vel * level,
            into,
            "sine",
            0.003,
          );
        return;
      }
      case "box":
        this.ring(f, at, 0.8, vel, into, "sine", 0.003);
        this.ring(f * 2, at, 0.4, vel * 0.3, into, "sine", 0.003);
        this.ring(f * 5.4, at, 0.12, vel * 0.08, into, "sine", 0.003);
        return;
      default:
    }
  }

  // One partial: an oscillator with its own strike and decay.
  ring(f, at, length, level, into, type = "sine", attack = 0.005) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(level, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + length);
    o.connect(g).connect(into);
    o.start(at);
    o.stop(at + length + 0.05);
  }

  // A pad swells in over two seconds and only lets go once the next chord is swelling in.
  pad(freq, at, length, level, into) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.setTargetAtTime(level, at, 0.7);
    g.gain.setTargetAtTime(0, at + length, 0.8);
    g.connect(into);
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
      o.stop(at + length + 4);
    }
  }

  pluck(freq, at, length, level, into) {
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
    o.connect(lp).connect(g).connect(into);
    o.start(at);
    o.stop(at + length + 0.05);
  }

  tick(at, level, into) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(level, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.05);
    src.connect(hp).connect(g).connect(into);
    src.start(at, Math.random(), 0.06);
  }

  update(dt, hero, beams) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const air = AIR[this.place] || AIR.court;
    this.wind.band.frequency.setTargetAtTime(
      air.band +
        Math.sin(t * 0.21) * air.swing +
        Math.sin(t * 0.73) * air.swing * 0.4,
      t,
      0.5,
    );
    this.wind.band.Q.setTargetAtTime(air.q, t, 0.5);
    this.wind.gain.gain.setTargetAtTime(
      air.gain * (1 + Math.sin(t * 0.13) * 0.4),
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
        this.footfall();
      }
    }
    // Beyond the last door, birds somewhere in the trees.
    if (this.place === "forest" && (this.birdClock -= dt) < 0) {
      this.birdClock = 1.2 + Math.random() * 3.5;
      this.birdsong();
    }
  }

  footfall() {
    switch (this.place) {
      // Grit on basalt.
      case "two":
        return this.burst(0.04, 1500, 0.05, 1.1);
      // Worn limestone.
      case "three":
        return this.burst(0.05, 1150, 0.06, 0.9);
      // Snow: a crunch, then the pack settling.
      case "four":
        this.burst(0.07, 2300, 0.05, 0.5);
        return this.burst(0.1, 700, 0.05, 0.8);
      // Sand.
      default:
        return this.burst(0.05, 900, 0.07, 0.6);
    }
  }

  // A few quick rising whistles.
  birdsong() {
    const ctx = this.ctx;
    const base = 2300 + Math.random() * 1700;
    let at = ctx.currentTime + 0.02;
    for (let i = 0, n = 2 + Math.floor(Math.random() * 4); i < n; i++) {
      const f = base * (0.9 + Math.random() * 0.25);
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(f, at);
      o.frequency.exponentialRampToValueAtTime(f * 1.4, at + 0.06);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.022, at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);
      o.connect(g).connect(this.fx);
      o.start(at);
      o.stop(at + 0.1);
      at += 0.09 + Math.random() * 0.07;
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

// Each world's wind: the band it blows in, how far that wanders, how narrow it is and how loud.
const AIR = {
  // Hot desert wind.
  court: { band: 380, swing: 160, q: 0.7, gain: 0.07 },
  // A low night wind over basalt.
  two: { band: 240, swing: 70, q: 0.9, gain: 0.09 },
  // Open sky, gusting.
  three: { band: 620, swing: 240, q: 0.55, gain: 0.09 },
  // A thin, whistling cold.
  four: { band: 950, swing: 320, q: 2.2, gain: 0.1 },
  // Leaves stirring.
  forest: { band: 1600, swing: 400, q: 0.5, gain: 0.035 },
};

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

// The tune, in degrees of each place's scale above its root: [beat, degree, beats held] in
// bars of eight beats, four bars a line. The theme sets out, the answer turns it home.
const TUNE = {
  theme: [
    [
      [0, 4, 2],
      [2, 7, 1],
      [3, 6, 1],
      [4, 4, 3],
    ],
    [
      [0, 2, 2],
      [2, 3, 1],
      [3, 4, 1],
      [4, 0, 3],
    ],
    [
      [0, 3, 2],
      [2, 4, 1],
      [3, 6, 1],
      [4, 8, 2],
      [6, 7, 2],
    ],
    [
      [0, 6, 2],
      [2, 4, 1],
      [3, 3, 1],
      [4, 1, 2],
    ],
  ],
  answer: [
    [
      [0, 7, 1],
      [1, 6, 1],
      [2, 4, 2],
      [4, 2, 1],
      [5, 3, 1],
      [6, 4, 2],
    ],
    [
      [0, 5, 2],
      [2, 4, 1],
      [3, 2, 1],
      [4, 0, 4],
    ],
    [
      [0, 1, 1],
      [1, 3, 1],
      [2, 6, 2],
      [4, 7, 1],
      [5, 8, 1],
      [6, 7, 2],
    ],
    [
      [0, 6, 2],
      [2, 4, 2],
      [4, 1, 1],
      [5, 0, 3],
    ],
  ],
};

// The music box's walk over the upper four notes of a chord.
const BOX = [0, 1, 2, 3, 2, 3, 1, 2];

// Each place's music: the root and scale the tune is played in, the length of a bar in
// seconds, the voice, its level, how much of it goes into the room, an echo in beats, the
// order of its lines and rests, and the pads' chords, one a bar.
const CUES = {
  // The sunken court: D minor on a plucked harp, patient.
  court: {
    root: 62,
    scale: MINOR,
    bar: 8,
    lead: "harp",
    level: 0.14,
    hall: 0.3,
    song: ["theme", "rest", "answer", "rest"],
    chords: [
      [50, 57, 60, 65, 69],
      [46, 53, 57, 62, 65],
      [48, 55, 60, 64, 67],
      [45, 52, 55, 60, 64],
    ],
  },
  // The door open: the same harp, the tune lifted into D major, and fewer rests.
  "court-open": {
    root: 62,
    scale: MAJOR,
    bar: 8,
    lead: "harp",
    level: 0.14,
    hall: 0.3,
    song: ["theme", "answer", "rest"],
    chords: [
      [50, 57, 62, 66, 69],
      [47, 54, 59, 62, 66],
      [43, 50, 55, 59, 62],
      [45, 52, 57, 61, 64],
    ],
  },
  // The checkpoint: vibes over a turning music box in E major, a touch officious.
  world2: {
    root: 64,
    scale: MAJOR,
    bar: 6.4,
    lead: "vibes",
    level: 0.12,
    hall: 0.35,
    box: true,
    song: ["theme", "rest", "answer", "rest"],
    chords: [
      [52, 59, 63, 66, 68],
      [49, 56, 59, 64, 68],
      [45, 52, 56, 61, 64],
      [47, 54, 59, 63, 66],
    ],
  },
  // The Wardens give chase: quicker pads over a plucked pulse, and no tune.
  fight: {
    bar: 3.64,
    pad: 4.4,
    pulse: true,
    hall: 0.2,
    song: ["rest"],
    chords: [
      [45, 52, 57, 60, 64],
      [43, 50, 55, 59, 62],
    ],
  },
  // Over the isles: a breathy flute in G, slow and open, with an echo off the clouds.
  isles: {
    root: 67,
    scale: MAJOR,
    bar: 8.8,
    lead: "flute",
    level: 0.06,
    hall: 0.45,
    echo: 0.75,
    song: ["theme", "rest", "answer", "rest"],
    chords: [
      [43, 50, 57, 59, 62],
      [40, 47, 55, 59, 62],
      [36, 43, 52, 59, 66],
      [38, 45, 54, 57, 64],
    ],
  },
  // The frozen reach: a celesta in A minor over open fifths, the slowest and most spacious.
  frost: {
    root: 69,
    scale: MINOR,
    bar: 10,
    lead: "celesta",
    level: 0.11,
    hall: 0.6,
    echo: 1,
    song: ["theme", "rest", "answer", "rest"],
    chords: [
      [45, 52, 59, 64, 71],
      [41, 48, 57, 64, 67],
      [43, 50, 57, 62, 69],
      [40, 47, 55, 62, 67],
    ],
  },
  // A door opening onto dawn, and the credits: the whole tune in C, the flute doubled by glass.
  finale: {
    root: 72,
    scale: MAJOR,
    bar: 8,
    lead: "flute",
    double: "celesta",
    level: 0.06,
    hall: 0.45,
    echo: 0.75,
    song: ["theme", "answer"],
    chords: [
      [48, 55, 60, 64, 67],
      [45, 52, 57, 60, 64],
      [41, 48, 53, 57, 60],
      [43, 50, 55, 59, 62],
    ],
  },
};

function tuneNote(cue, degree) {
  return cue.root + cue.scale[degree % 7] + 12 * Math.floor(degree / 7);
}

// Every chord keeps to its place's scale, so a tune note can only rub against a held note a
// semitone away, or sit a flat ninth over the bass: then it moves onto the note it rubs.
function fit(n, chord) {
  if (chord.some((c) => (n - c) % 12 === 0)) return n;
  for (const c of chord) if (Math.abs(n - c) === 1) return c;
  if ((n - chord[0]) % 12 === 1) return n - 1;
  return n;
}

// The same few soft notes between the lines on every run of a place.
function rand(L) {
  L.seed = (L.seed * 16807) % 2147483647;
  return L.seed / 2147483647;
}

// The room's tail: stereo noise dying away over `seconds`, softened so it rings dark.
function hallTail(ctx, seconds) {
  const n = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let low = 0;
    for (let i = 0; i < n; i++) {
      low += (Math.random() * 2 - 1 - low) * 0.3;
      d[i] = low * Math.pow(1 - i / n, 2.4);
    }
  }
  return buf;
}
