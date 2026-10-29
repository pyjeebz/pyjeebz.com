// Who's signed in to the guestbook (the page itself is static, so it asks).
//
//   GET    /api/auth/session  → { enabled, user, signedAt }
//   DELETE /api/auth/session  → signs out

import type { APIRoute } from "astro";
import { db } from "../../../lib/db";
import { clearSession, getSession, github } from "../../../lib/session";

export const prerender = false;

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    headers: {
      "content-type": "application/json",
      "cache-control": "private, no-store",
    },
  });

export const GET: APIRoute = async ({ cookies }) => {
  const user = getSession(cookies);
  let signedAt: string | null = null;
  const sql = db();
  if (user && sql) {
    const [row] = await sql<{ created_at: Date }[]>`
      select created_at from signatures where github_id = ${user.id}
    `;
    signedAt = row?.created_at.toISOString() ?? null;
  }
  return json({ enabled: Boolean(github && sql), user, signedAt });
};

export const DELETE: APIRoute = ({ cookies }) => {
  clearSession(cookies);
  return json({ user: null });
};
