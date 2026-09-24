// Title, prompts, the address glyphs and the end card. Prompts name the control on the
// device in use, with the printed key label of the current keyboard layout.

const GLYPHS = {
  left: '<svg viewBox="0 0 24 24"><circle cx="8" cy="12" r="4.5"/><circle cx="16" cy="12" r="4.5"/></svg>',
  top: '<svg viewBox="0 0 24 24"><path d="M12.8 12.0 L12.9 12.2 L13.0 12.5 L13.0 12.7 L12.9 13.0 L12.7 13.3 L12.4 13.6 L12.1 13.8 L11.6 13.9 L11.2 13.9 L10.7 13.8 L10.3 13.5 L9.9 13.2 L9.5 12.7 L9.3 12.2 L9.2 11.6 L9.2 10.9 L9.4 10.2 L9.8 9.6 L10.3 9.1 L10.9 8.6 L11.7 8.4 L12.5 8.2 L13.3 8.3 L14.2 8.6 L15.0 9.0 L15.7 9.7 L16.2 10.5 L16.6 11.4 L16.7 12.4 L16.7 13.5 L16.3 14.6 L15.8 15.5 L15.0 16.4 L14.0 17.1 L12.9 17.5 L11.6 17.7 L10.4 17.6 L9.1 17.2 L8.0 16.6 L6.9 15.7 L6.1 14.5 L5.6 13.2 L5.3 11.8 L5.4 10.3 L5.8 8.9 L6.6 7.5 L7.6 6.3 L8.9 5.4 L10.4 4.7 L12.0 4.4 L13.7 4.4 L15.4 4.9 L16.9 5.7 L18.3 6.8 L19.4 8.2 L20.2 9.9 L20.6 11.7 L20.6 13.6 L20.1 15.5 L19.3 17.3"/></svg>',
  right:
    '<svg viewBox="0 0 24 24"><path d="M3 19L12 5l9 14z"/><circle cx="12" cy="14" r="1.4"/></svg>',
};

export class Hud {
  constructor(input) {
    this.input = input;
    this.el = (id) => document.getElementById(id);
    for (const g of document.querySelectorAll(".glyph"))
      g.innerHTML = GLYPHS[g.dataset.id];
    this.lastPrompt = null;
    this.objectiveTimer = null;
  }

  ready(onStart) {
    const b = this.el("start");
    b.disabled = false;
    b.textContent = "Enter the ruin";
    b.addEventListener("click", onStart, { once: true });
    b.focus();
    const labels = {
      move: this.input.moveLabel(),
      interact: this.input.label("interact"),
      drop: this.input.label("drop"),
      roll: this.input.labels.get("KeyQ") || "Q",
    };
    for (const k of document.querySelectorAll("[data-key]"))
      k.textContent = labels[k.dataset.key] || k.textContent;
  }

  hideTitle() {
    const t = this.el("title");
    t.classList.add("leaving");
    setTimeout(() => (t.hidden = true), 900);
  }

  show() {
    this.el("hud").hidden = false;
  }

  objective(text) {
    const o = this.el("objective");
    o.textContent = text;
    o.style.opacity = text ? 1 : 0;
    clearTimeout(this.objectiveTimer);
    if (text)
      this.objectiveTimer = setTimeout(() => (o.style.opacity = 0), 9000);
  }

  light(id) {
    document.querySelector(`.glyph[data-id="${id}"]`)?.classList.add("lit");
  }

  prompt(code) {
    if (code === this.lastPrompt) return;
    this.lastPrompt = code;
    const k = (a) => `<kbd>${this.input.label(a)}</kbd>`;
    const text = {
      turn: `Hold ${k("interact")} to turn the mirror`,
      grab: `Hold ${k("interact")} to grab the block`,
      block: `Push or pull while holding ${k("interact")}`,
      turning: `Steer left and right to turn · release ${k("interact")}`,
      hang: `Move sideways to shimmy · forward to climb · ${k("drop")} to let go`,
      edge: `${k("drop")} to hang from the edge`,
      take: `${k("interact")} Take back the sun disc`,
    }[code];
    const p = this.el("prompt");
    if (text) p.innerHTML = text;
    p.classList.toggle("on", !!text);
  }

  // Bronze pips for the explorer's composure; hidden until the first fight.
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

  // A one-off control hint in the middle of the screen.
  hint(kind) {
    const k = (a) => `<kbd>${this.input.label(a)}</kbd>`;
    const text = {
      throw: `${k("throw")} throw the disc · ${k("roll")} roll`,
    }[kind];
    const el = this.el("hint");
    el.innerHTML = text;
    el.classList.add("on");
    clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => el.classList.remove("on"), 6500);
  }

  // Knocked out by the Wardens: a rubber stamp and a verdict, then back down the path.
  processed(done) {
    const el = this.el("processed");
    el.hidden = false;
    el.classList.remove("show");
    void el.offsetWidth;
    el.classList.add("show");
    setTimeout(() => {
      el.hidden = true;
      done();
    }, 2300);
  }

  pause(on) {
    const p = this.el("pause");
    if (p.hidden === !on) return;
    p.hidden = !on;
  }

  // A short dip to black with a line of text, so a respawn reads as a consequence.
  blackout(kind) {
    const f = this.el("fade");
    const line = this.el("fade-line");
    line.textContent =
      kind === "deep" ? "The dark swallows the fall." : "Too far to fall.";
    f.classList.add("dark");
    f.style.opacity = 1;
    setTimeout(() => {
      f.style.opacity = 0;
      setTimeout(() => f.classList.remove("dark"), 400);
    }, 650);
  }

  flash(strength = 0.6) {
    const f = this.el("fade");
    f.style.opacity = strength;
    setTimeout(() => (f.style.opacity = 0), 120);
  }

  end(onAgain) {
    this.el("hud").hidden = true;
    const e = this.el("end");
    e.hidden = false;
    this.el("again").addEventListener("click", onAgain, { once: true });
  }
}
