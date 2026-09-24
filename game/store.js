// Settings and progress kept in this browser. Storage can be missing or blocked (a private
// window, a sandboxed preview), so every read and write falls back to defaults silently.

const SETTINGS_KEY = "far-door-settings";
const PROGRESS_KEY = "far-door-progress";

// A phone starts one step down in quality: its small screen gains little from the pixels.
const phone =
  matchMedia("(pointer: coarse)").matches &&
  Math.min(screen.width, screen.height) <= 500;

const DEFAULT_SETTINGS = {
  sensitivity: 1,
  invertY: false,
  volume: 0.8,
  music: 0.7,
  effects: 0.9,
  quality: phone ? "balanced" : "high",
  markers: true,
  hints: true,
  shake: true,
};

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* not persisted */
  }
}

export const settings = { ...DEFAULT_SETTINGS, ...read(SETTINGS_KEY) };

export function saveSettings() {
  write(SETTINGS_KEY, settings);
}

// Places the explorer has reached, in play order. Each one is a start in the Levels menu.
export const CHAPTERS = [
  {
    id: "court",
    level: 1,
    title: "The Sunken Court",
    start: "From the terrace",
    blurb:
      "Climb down into the ruin and bend the sunlight onto the gate's address.",
  },
  {
    id: "floor",
    level: 1,
    title: "The Sunken Court",
    start: "From the court floor",
    blurb: "Skip the descent: the mirrors and the stelae are waiting.",
  },
  {
    id: "checkpoint",
    level: 2,
    title: "The Checkpoint",
    start: "Beyond the first door",
    blurb: "No address stamp, no passage. Get stamped, one way or another.",
  },
  {
    id: "isles",
    level: 3,
    title: "The Dawn Isles",
    start: "Beyond the far door",
    blurb: "Follow Mira's trail across the floating isles on bridges of light.",
  },
  {
    id: "frost",
    level: 4,
    title: "The Frozen Reach",
    start: "Beyond Mira's ring",
    blurb:
      "Slide the ice, push its blocks and cross the lake to the glyph it keeps.",
  },
];

const saved = read(PROGRESS_KEY);
export const progress = {
  reached: new Set(Array.isArray(saved.reached) ? saved.reached : []),
  last: typeof saved.last === "string" ? saved.last : null,
  finished: !!saved.completed,
};
progress.reached.add("court");

function saveProgress() {
  write(PROGRESS_KEY, {
    reached: [...progress.reached],
    last: progress.last,
    completed: progress.finished,
  });
}

export function reach(id) {
  const fresh = !progress.reached.has(id);
  progress.reached.add(id);
  progress.last = id;
  saveProgress();
  return fresh;
}

export function finish() {
  progress.finished = true;
  saveProgress();
}

export function resetProgress() {
  progress.reached = new Set(["court"]);
  progress.last = null;
  progress.finished = false;
  saveProgress();
}
