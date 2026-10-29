// The guestbook's shape, shared by the pad, the wall and the API: signatures
// are pen strokes on a 1000×400 pad, stored as integer points and inked with
// perfect-freehand so they get the same pressure-y, tapered line on the way
// in and on the way back out.

import { getStroke } from "perfect-freehand";

export const PAD = { width: 1000, height: 400 };

export type Point = [number, number];
export type Stroke = Point[];

export type Signature = {
  id: number;
  name: string;
  // The signer's GitHub username.
  login: string | null;
  message: string;
  strokes: Stroke[];
  createdAt: string;
};

export const LIMITS = {
  name: 40,
  message: 140,
  strokes: 60,
  pointsPerStroke: 800,
  points: 6000,
  // Fewer than this, or a scribble smaller than MIN_SPAN either way, is a
  // tap or a dot rather than a signature.
  minPoints: 12,
  minSpan: 40,
};

// Pen strokes from the network, checked and clamped, or null if they aren't
// a plausible signature.
export function parseStrokes(input: unknown): Stroke[] | null {
  if (!Array.isArray(input)) return null;
  if (input.length === 0 || input.length > LIMITS.strokes) return null;

  const strokes: Stroke[] = [];
  let total = 0;
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];

  for (const raw of input) {
    if (!Array.isArray(raw) || raw.length === 0) return null;
    if (raw.length > LIMITS.pointsPerStroke) return null;
    const stroke: Stroke = [];
    for (const point of raw) {
      if (!Array.isArray(point) || point.length !== 2) return null;
      const [x, y] = point;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      const px = Math.min(PAD.width, Math.max(0, Math.round(x)));
      const py = Math.min(PAD.height, Math.max(0, Math.round(y)));
      stroke.push([px, py]);
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);
    }
    total += stroke.length;
    strokes.push(stroke);
  }

  if (total < LIMITS.minPoints || total > LIMITS.points) return null;
  if (maxX - minX < LIMITS.minSpan && maxY - minY < LIMITS.minSpan) return null;
  return strokes;
}

// A display name: control characters out, whitespace collapsed, trimmed.
export function cleanName(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\p{Cc}\p{Cf}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITS.name);
}

// A short note left with the signature: like a name, but allowed to be
// longer.
export function cleanMessage(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, LIMITS.message);
}

// About the weight of the mls signature's line, scaled to the pad.
const PEN = {
  size: 11,
  thinning: 0.6,
  smoothing: 0.55,
  streamline: 0.45,
  simulatePressure: true,
  start: { taper: 12 },
  end: { taper: 18 },
};

// A stroke's ink as an SVG path: perfect-freehand's outline, joined with
// quadratic curves through the midpoints. `complete` is false while the pen
// is still down (or mid-replay), so the end isn't tapered off early.
export function inkPath(points: Stroke, complete = true): string {
  const outline = getStroke(points, { ...PEN, last: complete });
  if (outline.length < 2) return "";
  const mid = (a: number[], b: number[]) =>
    `${((a[0] + b[0]) / 2).toFixed(1)} ${((a[1] + b[1]) / 2).toFixed(1)}`;
  let d = `M${mid(outline[0], outline[1])} Q`;
  for (let i = 1; i < outline.length; i++) {
    const p = outline[i];
    d += `${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mid(p, outline[(i + 1) % outline.length])} `;
  }
  return `${d}Z`;
}

// A viewBox cropped to the ink, with room for the pen's width, so a
// signature in a corner of the pad still fills the space it's shown in. It
// never crops tighter than MIN_CROP, so a tiny one isn't blown up into a
// thick-lined giant next to the rest.
const MIN_CROP = { width: 420, height: 168 };

export function inkViewBox(strokes: Stroke[]): string {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const stroke of strokes) {
    for (const [x, y] of stroke) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) return `0 0 ${PAD.width} ${PAD.height}`;
  const pad = PEN.size * 2;
  const width = Math.max(MIN_CROP.width, maxX - minX + pad * 2);
  const height = Math.max(MIN_CROP.height, maxY - minY + pad * 2);
  return [
    (minX + maxX - width) / 2,
    (minY + maxY - height) / 2,
    width,
    height,
  ].join(" ");
}
