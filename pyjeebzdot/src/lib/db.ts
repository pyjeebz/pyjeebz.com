// The guestbook's Postgres connection, made on first use and kept for the
// life of the function instance (Vercel's Fluid Compute reuses instances
// across requests). null when DATABASE_URL isn't set.
//
// prepare: false so it works through Neon's pooled (PgBouncer) endpoint.

import postgres from "postgres";
import { DATABASE_URL } from "astro:env/server";

let client: postgres.Sql | undefined;

export function db() {
  if (!DATABASE_URL) return null;
  client ??= postgres(DATABASE_URL, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return client;
}
