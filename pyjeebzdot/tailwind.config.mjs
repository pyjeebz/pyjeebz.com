/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Architects Daughter"', '"Comic Sans MS"', '"Segoe Print"', "cursive"],
        body: ["Kalam", '"Segoe Print"', "cursive"],
        sans: ["Kalam", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      colors: {
        paper: "#F4F1EA",
        charcoal: { DEFAULT: "#2C2C2A", light: "#595955" },
        surface: "#FFFFFF",
        ink: "#2C2C2A",
        muted: "rgba(44 44 42 / 0.62)",
        "muted-faint": "rgba(44 44 42 / 0.38)",
        "highlighter-yellow": "#F5DE6B",
        "highlighter-pink": "#F2A9BC",
        "highlighter-blue": "#A8C9EE",
        "highlighter-green": "#B3D6A4",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1.4" }],
      },
    },
  },
  plugins: [],
};