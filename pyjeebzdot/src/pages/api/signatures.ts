// The guestbook API — rendered on demand (the rest of the site is static).
//
//   GET  /api/signatures?before=<id>&limit=<n>  → { signatures, next }  (newest first)
//   POST /api/signatures { message, strokes, website }  → { signature }
//
// Signing needs GitHub sign-in (lib/session.ts), and the name comes from the
// GitHub profile. Each account has one signature: signing again replaces it.
// Signatures go up straight away; `npm run guestbook -- hide <id>` takes one
// down (and keeps it down if they re-sign). Each IP can sign a few times an
// hour, and `website` is a honeypot field the form never shows — anything
// that fills it in is a bot.

import type { APIRoute } from "astro";
import { createHash } from "node:crypto";
import { DATABASE_URL } from "astro:env/server";
import { db } from "../../lib/db";
import {
  cleanMessage,
  cleanName,
  parseStrokes,
  type Signature,
} from "../../lib/guestbook";
import { getSession } from "../../lib/session";

export const prerender = false;

const PAGE_SIZE = 24;
// The wall asks for bigger pages, to fill itself in fewer requests.
const MAX_PAGE_SIZE = 200;
const MAX_BODY = 200_000; // bytes — a long signature is ~60KB of JSON
const PER_HOUR = 3;
const PER_DAY = 10;

type Row = {
  id: string;
  name: string;
  github_login: string | null;
  message: string;
  strokes: Signature["strokes"];
  created_at: Date;
};

const toSignature = (row: Row): Signature => ({
  id: Number(row.id),
  name: row.name,
  login: row.github_login,
  message: row.message,
  strokes: row.strokes,
  createdAt: row.created_at.toISOString(),
});

const json = (body: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });

const offline = () => json({ error: "offline" }, 503);

export const GET: APIRoute = async ({ url }) => {
  const sql = db();
  if (!sql) return offline();

  const before = Number(url.searchParams.get("before"));
  const asked = Number(url.searchParams.get("limit") ?? PAGE_SIZE);
  const size = Number.isSafeInteger(asked)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, asked))
    : PAGE_SIZE;
  const rows = await sql<Row[]>`
    select id, name, github_login, message, strokes, created_at from signatures
    where not hidden ${Number.isSafeInteger(before) && before > 0 ? sql`and id < ${before}` : sql``}
    order by id desc
    limit ${size + 1}
  `;
  const signatures = rows.slice(0, size).map(toSignature);
  const next = rows.length > size ? signatures.at(-1)!.id : null;

  return json({ signatures, next }, 200, {
    // A short shared cache; a new signer sees their own immediately anyway.
    "cache-control":
      "public, max-age=0, s-maxage=20, stale-while-revalidate=60",
  });
};

export const POST: APIRoute = async ({ request, clientAddress, cookies }) => {
  const sql = db();
  if (!sql) return offline();
  const user = getSession(cookies);
  if (!user) return json({ error: "signin" }, 401);

  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return json({ error: "invalid" }, 413);

  let body: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "invalid" }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: "invalid" }, 400);
  }

  // The honeypot: pretend it worked.
  if (body.website) return json({ signature: null }, 201);

  const strokes = parseStrokes(body.strokes);
  if (!strokes) return json({ error: "invalid" }, 400);
  const name = cleanName(user.name);
  const message = cleanMessage(body.message);

  // Salted with the connection secret so the stored hash can't be reversed
  // by hashing every IPv4 address.
  const ipHash = createHash("sha256")
    .update(`${DATABASE_URL}:${clientAddress}`)
    .digest("hex");

  const [recent] = await sql<{ hour: number; day: number }[]>`
    select
      count(*) filter (where created_at > now() - interval '1 hour')::int as hour,
      count(*)::int as day
    from signatures
    where ip_hash = ${ipHash} and created_at > now() - interval '1 day'
  `;
  if (recent.hour >= PER_HOUR || recent.day >= PER_DAY) {
    return json({ error: "limited" }, 429);
  }

  const [row] = await sql<Row[]>`
    insert into signatures
      (name, message, strokes, ip_hash, github_id, github_login)
    values
      (${name}, ${message}, ${sql.json(strokes)}, ${ipHash}, ${user.id}, ${user.login})
    on conflict (github_id) where github_id is not null do update set
      name = excluded.name,
      message = excluded.message,
      strokes = excluded.strokes,
      ip_hash = excluded.ip_hash,
      github_login = excluded.github_login,
      created_at = now()
    returning id, name, github_login, message, strokes, created_at
  `;
  return json({ signature: toSignature(row) }, 201);
};
