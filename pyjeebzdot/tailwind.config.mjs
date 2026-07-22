/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "ui-serif", "serif"],
      },
      colors: {
        "black-001": "#f4f1e8",
        "off-white": "#22201b",
        muted: "#6b645a",
        "muted-faint": "#9c958b",
        hairline: "rgba(34, 32, 27, 0.12)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};
