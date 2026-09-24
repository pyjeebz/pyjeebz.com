// Generates the site's favicon assets from the handwritten "mls" signature.
//
// The signature is one continuous stroke (src/lib/signature.ts); the favicon
// is the leading "m" segment with its natural exit tail (cut at segment 75,
// chosen visually — the "l" bowl only enters at ~150). Everything derives from
// the shared path, so re-running this script re-traces the exact same ink.
//
// Outputs:
//   public/favicon.svg                  — vector "m", dark-mode aware
//   public/manifest/favicon.ico         — 32px
//   public/manifest/apple-touch-icon.png— 180px, white bg (iOS)
//   public/manifest/android-chrome-192x192.png / -512x512.png — white bg
//
// Run: npm run generate:favicon

import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { SIG_D } from "../src/lib/signature";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public/manifest");

// The favicon "m": first N cubic segments of the signature stroke.
const CUT_SEGMENT = 75;
// Padding around the glyph as a fraction of its longest side, so the ink
// doesn't touch the icon edge.
const PAD_FRACTION = 0.14;
// Stroke weight as a fraction of the (square) viewBox — ~1.36px at 16px.
const STROKE_FRACTION = 0.085;

// Split the path into its M command + C segments.
const parts = SIG_D.split(/(?=[MC])/);
const startM = parts[0];
const segs: number[][] = [];
for (const p of parts.slice(1)) {
  const nums = p
    .replace(/^C/, "")
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (nums.length === 6) segs.push(nums);
}
const mStart = startM.replace(/^M\s*/, "").split(/[\s,]+/).map(Number);

// Endpoints of the first CUT_SEGMENT segments → tight bounds of the "m".
let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
let cur = [mStart[0], mStart[1]];
const track = (x: number, y: number) => {
  minX = Math.min(minX, x);
  minY = Math.min(minY, y);
  maxX = Math.max(maxX, x);
  maxY = Math.max(maxY, y);
};
track(cur[0], cur[1]);
let d = startM;
for (let i = 0; i < CUT_SEGMENT && i < segs.length; i++) {
  const s = segs[i];
  d += ` C ${s[0]} ${s[1]}, ${s[2]} ${s[3]}, ${s[4]} ${s[5]}`;
  track(s[4], s[5]);
  cur = [s[4], s[5]];
}

// Square viewBox centered on the glyph, with padding.
const glyphW = maxX - minX;
const glyphH = maxY - minY;
const size = Math.max(glyphW, glyphH) * (1 + 2 * PAD_FRACTION);
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;
const VB = `${cx - size / 2} ${cy - size / 2} ${size} ${size}`;
const STROKE = STROKE_FRACTION * size;

const pathEl = (stroke: string) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`;

// Vector favicon — black on light, white on dark, matching the old pattern.
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}">
  <style>
    path { stroke: #000; }
    @media (prefers-color-scheme: dark) {
      path { stroke: #FFF; }
    }
  </style>
  ${pathEl("#000")}
</svg>
`;

// Raster SVG for sharp (librsvg ignores the media query above).
const rasterSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB}">${pathEl("#000")}</svg>`;

const ICO_SIZE = 32;
const SIZES: Array<{ file: string; size: number; background: string | null }> = [
  { file: "apple-touch-icon.png", size: 180, background: "#ffffff" },
  { file: "android-chrome-192x192.png", size: 192, background: "#ffffff" },
  { file: "android-chrome-512x512.png", size: 512, background: "#ffffff" },
];

async function main() {
  await fs.writeFile(path.join(ROOT, "public/favicon.svg"), faviconSvg);

  for (const { file, size, background } of SIZES) {
    // Render the ink at high density, then flatten it onto a solid background
    // (composite layers sit on top, so the background must be the base).
    const ink = await sharp(Buffer.from(rasterSvg), { density: 72 * (size / 16) })
      .resize(size, size)
      .png()
      .toBuffer();
    await sharp({
      create: { width: size, height: size, channels: 4, background: background ?? { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([{ input: ink }])
      .png()
      .toFile(path.join(OUT_DIR, file));
    console.log(`wrote ${file} (${size}px)`);
  }

  // 32px favicon → .ico
  const ico32 = await sharp(Buffer.from(rasterSvg), { density: 144 }).resize(32, 32).png().toBuffer();
  const ico = await pngToIco(ico32);
  await fs.writeFile(path.join(OUT_DIR, "favicon.ico"), ico);
  console.log("wrote favicon.ico (32px)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});