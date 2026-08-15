import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  reactions: defineTable({
    slug: v.string(),
    emoji: v.string(),
  })
    .index("by_slug", ["slug"])
    .index("by_slug_emoji", ["slug", "emoji"]),

  guestbook: defineTable({
    name: v.string(),
    // "drawn" stores SVG path data; "typed" stores the literal text.
    kind: v.union(v.literal("drawn"), v.literal("typed")),
    mark: v.string(),
    // All optional so entries written before these fields existed stay valid.
    message: v.optional(v.string()),
    color: v.optional(v.string()),
    strokeWidth: v.optional(v.number()),
    // Placement on the wall, as percentages of the board.
    x: v.optional(v.number()),
    y: v.optional(v.number()),
    rotation: v.optional(v.number()),
    scale: v.optional(v.number()),
    createdAt: v.number(),
    // Set true from the Convex dashboard to hide an entry without deleting it.
    hidden: v.optional(v.boolean()),
  }).index("by_created", ["createdAt"]),
});
