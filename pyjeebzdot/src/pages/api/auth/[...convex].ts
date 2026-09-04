import type { APIRoute } from "astro";

/**
 * Auth on the real domain. GitHub's authorize screen shows the redirect_uri,
 * so the callback is registered as https://pyjeebz.com/api/auth/callback/github
 * (via CUSTOM_AUTH_SITE_URL on the Convex deployment) — this catch-all hands
 * the request on to Convex, which does the actual token exchange and then
 * bounces back to the site.
 */
export const prerender = false;

const CONVEX_HTTP_URL = (import.meta.env.PUBLIC_CONVEX_URL ?? "")
  .replace(/\.cloud\/?$/, ".site")
  .replace(/\/$/, "");

export const GET: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api\/auth/, "");
  const target = `${CONVEX_HTTP_URL}/api/auth${path}${url.search}`;
  return Response.redirect(target, 307);
};