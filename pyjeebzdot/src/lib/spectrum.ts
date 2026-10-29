// The footer spectrum's palettes and everything that hangs off them: which
// ones turn the page dark, the accent each one lends the rest of the site, the
// voice the playable columns take on, and which palette a first visit gets at
// each time of day. Shared by components/Footer.astro and the early,
// pre-paint script in layouts/Layout.astro.

// spectrum.aryank.space's nine palettes, in their swatch order, bottom of the
// column first.
export const PALETTES = [
  // Original
  [
    "#340B05",
    "#0358F7",
    "#5092C7",
    "#E1ECFE",
    "#FFD400",
    "#FA3D1D",
    "#FD02F5",
    "#FFC0FD",
  ],
  // Blue → pink
  [
    "#1E3A8A",
    "#3B82F6",
    "#A855F7",
    "#EC4899",
    "#F472B6",
    "#F9A8D4",
    "#FBCFE8",
    "#FDF2F8",
  ],
  // Blue → orange
  [
    "#1E40AF",
    "#3B82F6",
    "#60A5FA",
    "#FFFFFF",
    "#FED7AA",
    "#FB923C",
    "#EA580C",
    "#9A3412",
  ],
  // Amber sunset
  [
    "#FEF3C7",
    "#FCD34D",
    "#F59E0B",
    "#D97706",
    "#B45309",
    "#92400E",
    "#78350F",
    "#451A03",
  ],
  // Purple
  [
    "#F3E8FF",
    "#E9D5FF",
    "#D8B4FE",
    "#C084FC",
    "#A855F7",
    "#9333EA",
    "#7C3AED",
    "#6B21B6",
  ],
  // Monochrome
  [
    "#1A1A1A",
    "#404040",
    "#666666",
    "#999999",
    "#CCCCCC",
    "#E5E5E5",
    "#F5F5F5",
    "#FFFFFF",
  ],
  // Pink
  [
    "#FDF2F8",
    "#FCE7F3",
    "#F9A8D4",
    "#F472B6",
    "#EC4899",
    "#BE185D",
    "#831843",
    "#500724",
  ],
  // Blue-black
  [
    "#000000",
    "#0F172A",
    "#1E293B",
    "#334155",
    "#475569",
    "#64748B",
    "#94A3B8",
    "#CBD5E1",
  ],
  // Beige-black
  [
    "#FEF3C7",
    "#F59E0B",
    "#D97706",
    "#92400E",
    "#451A03",
    "#1C1917",
    "#0C0A09",
    "#000000",
  ],
];

// The colour each palette lends the page — text selection, the wet ink of the
// signature, the guestbook pen. Picked to read on that palette's page (white,
// or #1a1a1a for the dark ones).
export const ACCENTS = [
  "#0358F7",
  "#A855F7",
  "#EA580C",
  "#D97706",
  "#7C3AED",
  "#CCCCCC",
  "#EC4899",
  "#94A3B8",
  "#F59E0B",
];

// Monochrome, blue-black and beige-black: on their site these turn the page
// dark, and so they do here (see the tokens in styles/global.css).
export const DARK_PALETTES = [5, 7, 8];
export const PAGE_COLORS = { light: "#ffffff", dark: "#1a1a1a" };

// How the spectrum sounds when it's played (see lib/sound.ts).
export type Voice = "bell" | "glass" | "soft" | "warm";
export const VOICES: Voice[] = [
  "bell",
  "glass",
  "bell",
  "warm",
  "soft",
  "glass",
  "soft",
  "glass",
  "warm",
];

// Until a visitor picks a palette, the visitor's local time picks one: pastel
// mornings, the original by day, an amber evening, blue-black (and a dark
// page) at night. [from hour, palette], in order through the day.
export const SCHEDULE: [number, number][] = [
  [0, 7],
  [5, 1],
  [10, 0],
  [17, 3],
  [20, 7],
];

export const STORAGE_KEY = "pyjeebz:footer-palette";

export function paletteForHour(hour: number) {
  let palette = SCHEDULE[0][1];
  for (const [from, p] of SCHEDULE) if (hour >= from) palette = p;
  return palette;
}

// The visitor's own pick if they've made one, otherwise the time of day's.
export function initialPalette() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const n = saved === null ? NaN : Number(saved);
    if (Number.isInteger(n) && n >= 0 && n < PALETTES.length) return n;
  } catch {}
  return paletteForHour(new Date().getHours());
}
