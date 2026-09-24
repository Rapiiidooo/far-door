// The address glyphs as flat icons on a 24-unit grid: SVG for the HUD, canvas strokes for the
// ink the Wardens' stamps leave on the ground. The 3D versions are in glyphs.js.

const SPIRAL =
  "M12.8 12.0 L12.9 12.2 L13.0 12.5 L13.0 12.7 L12.9 13.0 L12.7 13.3 L12.4 13.6 L12.1 13.8 L11.6 13.9 L11.2 13.9 L10.7 13.8 L10.3 13.5 L9.9 13.2 L9.5 12.7 L9.3 12.2 L9.2 11.6 L9.2 10.9 L9.4 10.2 L9.8 9.6 L10.3 9.1 L10.9 8.6 L11.7 8.4 L12.5 8.2 L13.3 8.3 L14.2 8.6 L15.0 9.0 L15.7 9.7 L16.2 10.5 L16.6 11.4 L16.7 12.4 L16.7 13.5 L16.3 14.6 L15.8 15.5 L15.0 16.4 L14.0 17.1 L12.9 17.5 L11.6 17.7 L10.4 17.6 L9.1 17.2 L8.0 16.6 L6.9 15.7 L6.1 14.5 L5.6 13.2 L5.3 11.8 L5.4 10.3 L5.8 8.9 L6.6 7.5 L7.6 6.3 L8.9 5.4 L10.4 4.7 L12.0 4.4 L13.7 4.4 L15.4 4.9 L16.9 5.7 L18.3 6.8 L19.4 8.2 L20.2 9.9 L20.6 11.7 L20.6 13.6 L20.1 15.5 L19.3 17.3";

export const ICONS = {
  twin: [{ circle: [8, 12, 4.5] }, { circle: [16, 12, 4.5] }],
  spiral: [{ path: SPIRAL }],
  peak: [{ path: "M3 19L12 5l9 14z" }, { circle: [12, 14, 1.4] }],
  crescent: [{ path: "M15.5 4.6A8 8 0 1 0 15.5 19.4A6.4 6.4 0 1 1 15.5 4.6z" }],
  waves: [
    {
      path: "M3.5 7.5q2.1-2.6 4.2 0t4.3 0 4.3 0 4.2 0M3.5 12q2.1-2.6 4.2 0t4.3 0 4.3 0 4.2 0M3.5 16.5q2.1-2.6 4.2 0t4.3 0 4.3 0 4.2 0",
    },
  ],
  disc: [{ circle: [12, 12, 7.5] }, { circle: [12, 12, 2.2] }],
  // A glyph nobody has found yet.
  unknown: [
    { path: "M8.6 8.8a3.5 3.5 0 1 1 5 3.2c-1 .5-1.6 1.2-1.6 2.3v.9" },
    { circle: [12, 18.6, 1.1] },
  ],
};

export function svg(kind) {
  const parts = (ICONS[kind] || [])
    .map((p) =>
      p.circle
        ? `<circle cx="${p.circle[0]}" cy="${p.circle[1]}" r="${p.circle[2]}"/>`
        : `<path d="${p.path}"/>`,
    )
    .join("");
  return `<svg viewBox="0 0 24 24">${parts}</svg>`;
}

// Strokes a glyph centred on (x, y), `size` units across, onto a 2D canvas context.
export function draw(ctx, kind, x, y, size) {
  const k = size / 24;
  ctx.save();
  ctx.translate(x - 12 * k, y - 12 * k);
  ctx.scale(k, k);
  for (const p of ICONS[kind] || []) {
    if (p.circle) {
      ctx.beginPath();
      ctx.arc(p.circle[0], p.circle[1], p.circle[2], 0, Math.PI * 2);
      ctx.stroke();
    } else ctx.stroke(new Path2D(p.path));
  }
  ctx.restore();
}
