import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Anonymous guestbook: no accounts, no login. Because anyone can write, every
// limit below is enforced here on the server — the client cannot be trusted.
const MAX_NAME = 32;
const MAX_TYPED = 60;
const MAX_MESSAGE = 160;
const MAX_PATH = 20000; // SVG path data for a drawn mark
const PAGE = 300;

// Marks may only use these. "ink" resolves to the theme's text colour at render
// time; the rest are chosen to read on both the dark and paper backgrounds.
const COLORS = ["ink", "#ff5a1f", "#3b82f6", "#ec4899", "#22c55e"];

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

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("guestbook")
      .withIndex("by_created")
      .order("desc")
      .take(PAGE);
    return rows
      .filter((r) => !r.hidden)
      .map((r) => ({
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
      }));
  },
});

export const sign = mutation({
  args: {
    name: v.string(),
    kind: v.union(v.literal("drawn"), v.literal("typed")),
    mark: v.string(),
    message: v.optional(v.string()),
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    rotation: v.optional(v.number()),
    scale: v.optional(v.number()),
    // Bots fill hidden fields; humans never see this one.
    trap: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.trap) return { ok: true, id: null };

    const name = clean(args.name, MAX_NAME);
    if (name.length < 1) throw new Error("Add a name.");

    let mark: string;
    if (args.kind === "typed") {
      mark = clean(args.mark, MAX_TYPED);
      if (!mark) throw new Error("Type a signature.");
    } else {
      mark = args.mark.slice(0, MAX_PATH);
      if (mark.length < 8) throw new Error("Draw a signature first.");
      if (!isSafePath(mark)) throw new Error("That mark isn't valid.");
    }

    // Light flood guard: block a burst of entries under the same name.
    const recent = await ctx.db
      .query("guestbook")
      .withIndex("by_created")
      .order("desc")
      .take(5);
    const now = Date.now();
    const sameNameJustNow = recent.filter(
      (r) => r.name.toLowerCase() === name.toLowerCase() && now - r.createdAt < 30_000
    );
    if (sameNameJustNow.length >= 2) {
      throw new Error("Easy there, give it a moment.");
    }

    const message = clean(args.message ?? "", MAX_MESSAGE);

    // Reject anything outside the fixed palette so no arbitrary CSS can land in
    // a stroke attribute.
    const color =
      args.color && COLORS.includes(args.color) ? args.color : "ink";

    const id = await ctx.db.insert("guestbook", {
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
      createdAt: now,
    });
    return { ok: true, id };
  },
});
