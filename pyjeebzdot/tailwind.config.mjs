/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Newsreader", "Georgia", "ui-serif", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "JetBrains Mono", "Menlo", "Consolas", "monospace"],
        display: ["var(--font-display)"],
      },
      colors: {
        "black-001": "var(--bg)",
        "off-white": "var(--ink)",
        muted: "var(--muted)",
        "muted-faint": "var(--muted-faint)",
        hairline: "var(--hairline)",
        accent: "rgb(var(--accent-rgb) / <alpha-value>)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};
