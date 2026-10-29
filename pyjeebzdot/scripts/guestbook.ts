// Guestbook moderation.
//
//   npm run guestbook                 latest 20 signatures (hidden ones too)
//   npm run guestbook -- hide <id>    take a signature off the wall
//   npm run guestbook -- show <id>    put it back
//
// To look at a signature before deciding, open /guestbook — or delete it for
// good in the Neon console.

import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (in .env, or the environment) first.");
  process.exit(1);
}

const sql = postgres(url, { prepare: false });
const [command, rawId] = process.argv.slice(2);

try {
  if (command === "hide" || command === "show") {
    const id = Number(rawId);
    if (!Number.isSafeInteger(id)) throw new Error("Usage: hide|show <id>");
    const rows = await sql`
      update signatures set hidden = ${command === "hide"}
      where id = ${id} returning id
    `;
    console.log(
      rows.length
        ? `Signature ${id} ${command === "hide" ? "hidden" : "shown"}.`
        : `No signature ${id}.`,
    );
  } else {
    const rows = await sql<
      {
        id: string;
        name: string;
        github_login: string | null;
        message: string;
        hidden: boolean;
        created_at: Date;
        points: number;
      }[]
    >`
      select id, name, github_login, message, hidden, created_at,
        (select sum(jsonb_array_length(s)) from jsonb_array_elements(strokes) s)::int as points
      from signatures order by id desc limit 20
    `;
    console.table(
      rows.map((r) => ({
        id: Number(r.id),
        name: r.name || "(anonymous)",
        github: r.github_login ?? "",
        note: r.message,
        points: r.points,
        hidden: r.hidden,
        signed: r.created_at.toISOString().slice(0, 16).replace("T", " "),
      })),
    );
  }
} finally {
  await sql.end();
}
