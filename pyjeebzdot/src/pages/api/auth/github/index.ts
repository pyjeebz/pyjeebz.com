// Sign in with GitHub, step one: off to GitHub's consent screen, with a
// random `state` in a short-lived cookie so the callback can tell the
// sign-in was started here (and not by a link someone else crafted).
//
//   GET /api/auth/github

import type { APIRoute } from "astro";
import { randomBytes } from "node:crypto";
import { cookieOptions, github, STATE_COOKIE } from "../../../../lib/session";

export const prerender = false;

export const GET: APIRoute = ({ url, cookies, redirect }) => {
  if (!github) return redirect("/guestbook?signin=unavailable");

  const state = randomBytes(16).toString("hex");
  cookies.set(STATE_COOKIE, state, cookieOptions(60 * 10));

  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", github.clientId);
  authorize.searchParams.set(
    "redirect_uri",
    new URL("/api/auth/github/callback", url).href,
  );
  authorize.searchParams.set("state", state);
  // No scopes: just the public profile.
  authorize.searchParams.set("scope", "");
  return redirect(authorize.href);
};
