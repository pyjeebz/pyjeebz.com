// Guestbook sign-in: who's signed in with GitHub, kept in a signed cookie.
//
// The cookie holds the GitHub user itself (no session table), signed with
// SESSION_SECRET so it can't be edited into someone else. GitHub's access
// token is used once, to look the user up, and never stored.

import type { AstroCookies } from "astro";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  SESSION_SECRET,
} from "astro:env/server";

export type User = {
  id: number;
  login: string;
  name: string;
  avatar: string;
};

const COOKIE = "gb_session";
// The OAuth `state`, between leaving for GitHub and coming back.
export const STATE_COOKIE = "gb_oauth_state";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export const github =
  GITHUB_CLIENT_ID && GITHUB_CLIENT_SECRET && SESSION_SECRET
    ? { clientId: GITHUB_CLIENT_ID, clientSecret: GITHUB_CLIENT_SECRET }
    : null;

const mac = (data: string) =>
  createHmac("sha256", SESSION_SECRET!).update(data).digest("base64url");

export const cookieOptions = (maxAge: number) => ({
  path: "/",
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: "lax" as const,
  maxAge,
});

export function setSession(cookies: AstroCookies, user: User) {
  const data = Buffer.from(
    JSON.stringify({ ...user, exp: Date.now() + MAX_AGE * 1000 }),
  ).toString("base64url");
  cookies.set(COOKIE, `${data}.${mac(data)}`, cookieOptions(MAX_AGE));
}

export function clearSession(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: "/" });
}

// The signed-in user, or null if there's no cookie, it's been tampered
// with, or it's expired.
export function getSession(cookies: AstroCookies): User | null {
  if (!github) return null;
  const [data, signature] = cookies.get(COOKIE)?.value.split(".") ?? [];
  if (!data || !signature) return null;
  const expected = Buffer.from(mac(data));
  const given = Buffer.from(signature);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    const { exp, ...user } = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    );
    return typeof exp === "number" && exp > Date.now() ? (user as User) : null;
  } catch {
    return null;
  }
}
