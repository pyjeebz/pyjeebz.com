import type { APIRoute } from "astro";
import { getNowPlaying } from "../../lib/spotify";

export const prerender = false;

export const GET: APIRoute = async () =>
  new Response(JSON.stringify(await getNowPlaying()), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store, max-age=0",
    },
  });
