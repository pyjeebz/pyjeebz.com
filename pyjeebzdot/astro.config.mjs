import { defineConfig } from "astro/config";

import tailwind from "@astrojs/tailwind";
import react from "@astrojs/react";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: vercel(),
  integrations: [tailwind(), react()],
  vite: {
    server: {
      // A running `astro build` churns .vercel/output and crashes the dev
      // file-watcher, so keep build output out of the watch set.
      watch: { ignored: ["**/.vercel/**", "**/dist/**"] },
    },
  },
});
