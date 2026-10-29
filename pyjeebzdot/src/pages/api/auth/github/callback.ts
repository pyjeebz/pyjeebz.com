// Sign in with GitHub, step two: GitHub sends the visitor back with a code,
// which is swapped for an access token, used once to look up who they are.
// Then back to the guestbook, signed in.
//
//   GET /api/auth/github/callback?code=…&state=…

import type { APIRoute } from "astro";
import {
  github,
  setSession,
  STATE_COOKIE,
  type User,
} from "../../../../lib/session";

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const failed = () => redirect("/guestbook?signin=failed");
  if (!github) return redirect("/guestbook?signin=unavailable");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = cookies.get(STATE_COOKIE)?.value;
  cookies.delete(STATE_COOKIE, { path: "/" });
  if (!code || !state || state !== expected) return failed();

  try {
    const tokenRes = await fetch(
      "https://github.com/login/oauth/access_token",
      {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          client_id: github.clientId,
          client_secret: github.clientSecret,
          code,
          redirect_uri: new URL("/api/auth/github/callback", url).href,
        }),
      },
    );
    const { access_token } = (await tokenRes.json()) as {
      access_token?: string;
    };
    if (!access_token) return failed();

    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${access_token}`,
        accept: "application/vnd.github+json",
        "user-agent": "pyjeebz.com guestbook",
      },
    });
    if (!userRes.ok) return failed();
    const profile = (await userRes.json()) as {
      id: number;
      login: string;
      name: string | null;
      avatar_url: string;
    };

    const user: User = {
      id: profile.id,
      login: profile.login,
      name: profile.name?.trim() || profile.login,
      avatar: profile.avatar_url,
    };
    setSession(cookies, user);
    return redirect("/guestbook");
  } catch {
    return failed();
  }
};
