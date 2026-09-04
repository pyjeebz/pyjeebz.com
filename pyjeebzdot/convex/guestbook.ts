import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// GitHub-gated guestbook: identity comes from the signed-in user, so there is
// no name argument to forge and no honeypot to police. One account = one
// entry: re-signing replaces the previous mark.
const MAX_TYPED = 60;
const MAX_MESSAGE = 160;
const MAX_PATH = 20000; // SVG path data for a drawn mark
const MAX_NAME = 32;

// Marks may only use these. "ink" resolves to the theme's text colour at render
// time; the rest are the Napkin highlighter palette (must match the client
// swatches in Guestbook.tsx exactly).
const COLORS = ["ink", "#F5DE6B", "#F2A9BC", "#A8C9EE", "#B3D6A4"];

const clamp = (n: number, lo: number, hi: number) =>
  Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;

/** Drop control characters, collapse whitespace, cap length. */
function clean(input: string, max: number) {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Drawn marks must be plain SVG path data — M/L commands, numbers, separators. */
function isSafePath(d: string) {
  return /^[ML0-9eE\s,.-]+$/.test(d);
}

/** Shared projection for both queries. */
const toPublic = (r: {
  _id: string;
  name: string;
  kind: string;
  mark: string;
  message?: string;
  color?: string;
  strokeWidth?: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  createdAt: number;
  avatarUrl?: string;
}) => ({
  _id: r._id,
  name: r.name,
  kind: r.kind,
  mark: r.mark,
  message: r.message ?? "",
  color: r.color ?? "ink",
  strokeWidth: r.strokeWidth ?? 3,
  // Older rows predate placement; the client falls back to a hash of the id.
  x: r.x,
  y: r.y,
  rotation: r.rotation,
  scale: r.scale,
  createdAt: r.createdAt,
  avatarUrl: r.avatarUrl,
});

/** Paginated list for the guestbook page ("load more"). */
export const listPage = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("guestbook")
      .withIndex("by_created")
      .order("desc")
      .paginate(args.paginationOpts);
    return {
      ...result,
      page: result.page.filter((r) => !r.hidden).map(toPublic),
    };
  },
});

/** Unpaginated list for the wall page. Kept for its placement fields. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("guestbook")
      .withIndex("by_created")
      .order("desc")
      .take(300);
    return rows.filter((r) => !r.hidden).map(toPublic);
  },
});

export const sign = mutation({
  args: {
    kind: v.union(v.literal("drawn"), v.literal("typed")),
    mark: v.string(),
    message: v.optional(v.string()),
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    rotation: v.optional(v.number()),
    scale: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Sign in to leave a mark.");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Sign in to leave a mark.");

    // GitHub profile name, else email local-part, else something honest.
    const name = clean(
      user.name ?? user.email?.split("@")[0] ?? "someone",
      MAX_NAME
    );
    const avatarUrl = user.image ?? undefined;

    let mark: string;
    if (args.kind === "typed") {
      mark = clean(args.mark, MAX_TYPED);
      if (!mark) throw new Error("Type a signature.");
    } else {
      mark = args.mark.slice(0, MAX_PATH);
      if (mark.length < 8) throw new Error("Draw a signature first.");
      if (!isSafePath(mark)) throw new Error("That mark isn't valid.");
    }

    const message = clean(args.message ?? "", MAX_MESSAGE);

    // Reject anything outside the fixed palette so no arbitrary CSS can land in
    // a stroke attribute.
    const color =
      args.color && COLORS.includes(args.color) ? args.color : "ink";

    const fields = {
      name,
      kind: args.kind,
      mark,
      message,
      color,
      strokeWidth: clamp(args.strokeWidth ?? 3, 2, 24),
      x: clamp(args.x ?? 50, 2, 88),
      y: clamp(args.y ?? 50, 2, 88),
      rotation: clamp(args.rotation ?? 0, -18, 18),
      scale: clamp(args.scale ?? 1, 0.7, 1.4),
      createdAt: Date.now(),
      avatarUrl,
    };

    // One entry per person: replace the previous mark wholesale.
    const prior = await ctx.db
      .query("guestbook")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (prior) {
      await ctx.db.patch(prior._id, fields);
      return { ok: true, id: prior._id, replaced: true };
    }

    const id = await ctx.db.insert("guestbook", { ...fields, userId });
    return { ok: true, id, replaced: false };
  },
});

/** Moderation tool — remove one entry by id. Internal, never exposed over HTTP. */
export const removeEntry = internalMutation({
  args: { id: v.id("guestbook") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { ok: true };
  },
});