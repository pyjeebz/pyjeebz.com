-- The guestbook. Run with `npm run db:migrate` (safe to re-run).

create table if not exists signatures (
  id bigint generated always as identity primary key,
  -- Optional, shown under the signature.
  name text not null default '' check (char_length(name) <= 40),
  -- Optional, a short note left with the signature.
  message text not null default '' check (char_length(message) <= 140),
  -- Pen strokes on the 1000×400 pad: [[[x, y], …], …] (see lib/guestbook.ts).
  strokes jsonb not null,
  -- A salted hash of the signer's IP, only for rate limiting.
  ip_hash text not null,
  -- Moderation: `npm run guestbook -- hide <id>`.
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Added after the first version of the table.
alter table signatures add column if not exists message text not null
  default '' check (char_length(message) <= 140);

-- Signing needs a GitHub account, and each account has one signature:
-- signing again replaces it. Shown as a link to their profile.
alter table signatures add column if not exists github_id bigint;
alter table signatures add column if not exists github_login text;

create unique index if not exists signatures_github_idx
  on signatures (github_id) where github_id is not null;

create index if not exists signatures_wall_idx
  on signatures (id desc) where not hidden;

create index if not exists signatures_ip_idx
  on signatures (ip_hash, created_at desc);
