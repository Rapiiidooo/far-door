import * as THREE from "three";
import { svg } from "./glyph-icons.js";

// Everything drawn over the game: the objective, the gate address, a marker on the next thing
// to reach, one-time control cards, the context prompt, composure pips, and the cinematic
// overlays. Controls are named for the device in use, with the printed key labels of the
// current keyboard layout.

export class Hud {
  constructor(input, settings) {
    this.input = input;
    this.settings = settings;
    this.el = (id) => document.getElementById(id);
    this.lastPrompt = null;
    this.markerEls = [];
    this.targets = [];
    this.v = new THREE.Vector3();
    this.hintTimer = null;
    this.address = [];
  }

  // A control named for the device in use: <kbd>E</kbd>, <kbd>X</kbd> on a gamepad.
  k(action) {
    return `<kbd>${this.input.label(action)}</kbd>`;
  }

  keys(...codes) {
    return codes.map((c) => `<kbd>${this.input.keyLabel(c)}</kbd>`).join("");
  }

  show() {
    this.el("hud").hidden = false;
  }

  hide() {
    this.el("hud").hidden = true;
    this.clearHint();
    this.setMarkers([]);
  }

  // --- objective ------------------------------------------------------------------------
  objective(text, sub = "") {
    const box = this.el("objective-box");
    const changed = text !== this.lastObjective;
    this.lastObjective = text;
    this.el("objective").textContent = text || "";
    this.el("objective-sub").textContent = sub || "";
    box.classList.toggle("empty", !text);
    if (changed && text) {
      box.classList.remove("fresh");
      void box.offsetWidth;
      box.classList.add("fresh");
    }
  }

  sub(text) {
    this.el("objective-sub").textContent = text || "";
  }

  // --- the gate address ---------------------------------------------------------------------
  setAddress(kinds) {
    this.address = kinds;
    document.querySelectorAll("#address .glyph").forEach((g, i) => {
      g.innerHTML = svg(kinds[i] ?? "unknown");
      g.dataset.kind = kinds[i] ?? "unknown";
      g.classList.remove("lit");
    });
  }

  light(kind) {
    document
      .querySelector(`#address .glyph[data-kind="${kind}"]`)
      ?.classList.add("lit");
  }

  // --- markers ------------------------------------------------------------------------------
  // `targets` are world positions (Vector3 or functions returning one).
  setMarkers(targets) {
    this.targets = targets || [];
    while (this.markerEls.length < this.targets.length) {
      const m = document.createElement("div");
      m.className = "marker";
      m.innerHTML =
        '<span class="arrow"></span><span class="diamond"></span><span class="dist"></span>';
      this.el("markers").appendChild(m);
      this.markerEls.push(m);
    }
    this.markerEls.forEach((m, i) => (m.hidden = i >= this.targets.length));
  }

  updateMarkers(camera, from) {
    const w = innerWidth,
      h = innerHeight;
    const on = this.settings.markers;
    this.targets.forEach((t, i) => {
      const m = this.markerEls[i];
      const p = typeof t === "function" ? t() : t;
      if (!on || !p) {
        m.style.opacity = 0;
        return;
      }
      const dist = from ? Math.hypot(p.x - from.x, p.z - from.z) : 99;
      const v = this.v.copy(p).project(camera);
      let x = v.x,
        y = v.y;
      const behind = v.z > 1;
      if (behind) {
        x = -x;
        y = -y;
      }
      const edge = behind || Math.abs(x) > 0.9 || Math.abs(y) > 0.82;
      if (edge) {
        const k = Math.max(Math.abs(x) / 0.9, Math.abs(y) / 0.82, 1e-3);
        x /= k;
        y /= k;
        if (behind && Math.abs(y) < 0.82 && Math.abs(x) < 0.9) y = -0.82;
      }
      const sx = (x * 0.5 + 0.5) * w,
        sy = (-y * 0.5 + 0.5) * h;
      m.classList.toggle("edge", edge);
      m.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) translate(-50%, -50%)`;
      const arrow = m.firstChild;
      if (edge)
        arrow.style.transform = `rotate(${(-Math.atan2(y, x) * 180) / Math.PI + 90}deg) translateY(-18px)`;
      m.lastChild.textContent = dist < 99 ? `${Math.round(dist)} m` : "";
      m.style.opacity = dist < 2.2 && !edge ? 0 : 1;
    });
  }

  // --- control cards --------------------------------------------------------------------------
  hint(title, html, duration = 8) {
    if (!this.settings.hints) return;
    const el = this.el("hint");
    el.querySelector(".hint-title").textContent = title;
    el.querySelector(".hint-body").innerHTML = html;
    el.classList.add("on");
    this.liftSubtitle(true);
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => {
      el.classList.remove("on");
      this.liftSubtitle(false);
    }, duration * 1000);
  }

  // A relic found: a card of its own, so neither it nor a control card hides the other, and
  // shown even with the control cards turned off.
  relic(name, line, count, total) {
    const el = this.el("relic-toast");
    el.querySelector(".kicker").textContent =
      `Relic found · ${count} of ${total}`;
    el.querySelector(".name").textContent = name;
    el.querySelector(".line").textContent = line;
    el.classList.remove("on");
    void el.offsetWidth;
    el.classList.add("on");
    clearTimeout(this.relicTimer);
    this.relicTimer = setTimeout(() => el.classList.remove("on"), 7000);
  }

  clearHint() {
    clearTimeout(this.hintTimer);
    this.el("hint").classList.remove("on");
    this.liftSubtitle(false);
  }

  // A line of narration climbs above a control card instead of printing over it.
  liftSubtitle(on) {
    const hint = this.el("hint");
    this.el("subtitle").style.bottom = on
      ? `${parseFloat(getComputedStyle(hint).bottom) + hint.offsetHeight + 14}px`
      : "";
  }

  // --- the context prompt ----------------------------------------------------------------------
  prompt(code) {
    if (code === this.lastPrompt) return;
    this.lastPrompt = code;
    const k = (a) => this.k(a);
    const side = this.keys("KeyA", "KeyD");
    let text = {
      turn: `Hold ${k("interact")} to turn the mirror`,
      grab: `Hold ${k("interact")} to grab the block`,
      block: `Push ${this.keys("KeyW")} or pull ${this.keys("KeyS")} while holding ${k("interact")}`,
      turning: `Steer ${side} to turn · release ${k("interact")} to let go`,
      hang: `${side} shimmy · ${this.keys("KeyW")} climb · ${k("drop")} let go`,
      edge: `${k("drop")} hang from the edge`,
      take: `${k("interact")} Take Mira's sun disc`,
      read: `${k("interact")} Read the expedition's notes`,
      "read-mira": `${k("interact")} Read Mira's journal`,
      talk: `${k("interact")} Talk to the clerk`,
      charge: `${k("throw")} throw through the beam to charge the disc`,
    }[code];
    // A relic names itself: "relic:Take the radio".
    if (!text && code?.startsWith("relic:"))
      text = `${k("interact")} ${code.slice(6)}`;
    const p = this.el("prompt");
    if (text) p.innerHTML = text;
    p.classList.toggle("on", !!text);
  }

  // --- the story's own voice ---------------------------------------------------------------------
  // A line of narration under the picture, over cinematics as well as play.
  subtitle(text, seconds = 4) {
    const el = this.el("subtitle");
    el.textContent = text;
    el.classList.add("on");
    clearTimeout(this.subtitleTimer);
    this.subtitleTimer = setTimeout(
      () => el.classList.remove("on"),
      seconds * 1000,
    );
  }

  clearSubtitle() {
    clearTimeout(this.subtitleTimer);
    this.el("subtitle").classList.remove("on");
  }

  // A sheet over the game: the first expedition's field notes, or Mira's journal.
  showNotes(on, which = "first") {
    const el = this.el("notes");
    if (on) {
      el.querySelectorAll("[data-note]").forEach(
        (a) => (a.hidden = a.dataset.note !== which),
      );
      el.querySelectorAll("[data-glyph]").forEach(
        (g) => (g.innerHTML = svg(g.dataset.glyph)),
      );
      const them = which === "mira" ? "it" : "them";
      el.querySelectorAll("[data-help]").forEach(
        (h) =>
          (h.innerHTML = this.input.usingTouch
            ? `Tap to put ${them} back`
            : `${this.k("interact")} or <kbd>Esc</kbd> to put ${them} back`),
      );
    }
    el.hidden = !on;
  }

  // --- composure --------------------------------------------------------------------------------
  health(value, max) {
    const el = this.el("health");
    el.hidden = false;
    if (el.children.length !== max) {
      el.innerHTML = "";
      for (let i = 0; i < max; i++)
        el.appendChild(document.createElement("span"));
    }
    [...el.children].forEach((pip, i) =>
      pip.classList.toggle("spent", i >= value),
    );
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
  }

  hideHealth() {
    this.el("health").hidden = true;
  }

  // --- cinematic overlays -------------------------------------------------------------------------
  letterbox(on) {
    this.el("letterbox").classList.toggle("on", on);
    this.el("hud").style.opacity = on ? 0 : 1;
  }

  chapter(kicker, title, sub = "", seconds = 4.5) {
    const c = this.el("chapter-card");
    c.querySelector(".kicker").textContent = kicker;
    c.querySelector("h2").textContent = title;
    c.querySelector(".sub").textContent = sub;
    c.classList.add("on");
    clearTimeout(this.chapterTimer);
    this.chapterTimer = setTimeout(
      () => c.classList.remove("on"),
      seconds * 1000,
    );
  }

  // At once, without the fade: the card must not linger behind the title menu.
  clearChapter() {
    clearTimeout(this.chapterTimer);
    const c = this.el("chapter-card");
    c.style.transition = "none";
    c.classList.remove("on");
    void c.offsetWidth;
    c.style.transition = "";
  }

  // The light of a crossing: a bloom of white and turquoise that covers the swap of worlds.
  warp() {
    const w = this.el("warp");
    w.classList.remove("go");
    void w.offsetWidth;
    w.classList.add("go");
  }

  processed(done) {
    const el = this.el("processed");
    el.hidden = false;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(() => {
      el.hidden = true;
      done();
    }, 1900);
  }

  // A short dip to black with a line of text, so a respawn reads as a consequence.
  blackout(text, hold = 650) {
    const f = this.el("fade");
    this.el("fade-line").textContent = text;
    f.classList.add("dark");
    f.style.opacity = 1;
    setTimeout(() => {
      f.style.opacity = 0;
      setTimeout(() => f.classList.remove("dark"), 400);
    }, hold);
  }

  flash(strength = 0.6) {
    const f = this.el("fade");
    f.classList.remove("dark");
    f.style.opacity = strength;
    setTimeout(() => (f.style.opacity = 0), 120);
  }

  fadeTo(opacity, dark = true) {
    const f = this.el("fade");
    f.classList.toggle("dark", dark);
    this.el("fade-line").textContent = "";
    f.style.opacity = opacity;
  }
}
