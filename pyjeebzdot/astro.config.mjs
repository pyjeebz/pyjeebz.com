import { defineConfig, envField } from "astro/config";
import { unified } from "@astrojs/markdown-remark";

import tailwindcss from "@tailwindcss/vite";

import vercel from "@astrojs/vercel";

import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

import { transformerMetaHighlight } from "@shikijs/transformers";

import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";

import { vercelTheme } from "./src/lib/shiki";
import { transformerCodeTitle } from "./src/lib/code-title";
import { autolinkOptions, externalLinksOptions } from "./src/lib/rehype";
import { serializeSitemap, shouldIndexPage } from "./src/lib/sitemap";

// https://astro.build/config
export default defineConfig({
  site: "https://pyjeebz.com",
  trailingSlash: "never",
  output: "static",
  adapter: vercel({}),

  // The guestbook's Postgres (Neon in production; compose.yaml locally) and
  // its GitHub sign-in (an OAuth app, plus a secret to sign the session
  // cookie). The site still builds and runs without them — the guestbook
  // just says so.
  env: {
    schema: {
      DATABASE_URL: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      GITHUB_CLIENT_ID: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      GITHUB_CLIENT_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
      SESSION_SECRET: envField.string({
        context: "server",
        access: "secret",
        optional: true,
      }),
    },
  },

  // Crawlers guess /sitemap.xml; the sitemap integration emits an index instead.
  redirects: {
    "/sitemap.xml": "/sitemap-index.xml",
  },
  markdown: {
    syntaxHighlight: "shiki",
    shikiConfig: {
      theme: vercelTheme,
      wrap: false,
      transformers: [transformerMetaHighlight(), transformerCodeTitle()],
    },
    processor: unified({
      gfm: true,
      rehypePlugins: [
        rehypeSlug,
        [rehypeAutolinkHeadings, autolinkOptions],
        [rehypeExternalLinks, externalLinksOptions],
      ],
    }),
  },

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    react(),
    mdx(),
    sitemap({
      serialize: serializeSitemap,
      filter: shouldIndexPage,
    }),
  ],
});
