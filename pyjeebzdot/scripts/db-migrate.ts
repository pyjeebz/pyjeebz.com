// Creates the guestbook's tables (db/schema.sql) in the DATABASE_URL database.
// Safe to re-run.  npm run db:migrate

import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (in .env, or the environment) first.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false, onnotice: () => {} });
const schema = readFileSync(
  new URL("../db/schema.sql", import.meta.url),
  "utf8",
);

try {
  await sql.unsafe(schema);
  console.log("Guestbook schema is up to date.");
} finally {
  await sql.end();
}
