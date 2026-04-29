// Guestbook API placeholder - feature not yet enabled
import type { APIRoute } from "astro";

export const POST: APIRoute = async () => {
  return new Response(JSON.stringify({ error: "Not implemented" }), { status: 501 });
};
