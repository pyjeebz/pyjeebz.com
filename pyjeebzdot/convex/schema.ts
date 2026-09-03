import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  // All authSessions/authAccounts/etc. tables from @convex-dev/auth.
  ...authTables,
  // Inlined only to add githubId — every other field is the library default.
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    image: v.optional(v.string()),
    isAnonymous: v.optional(v.boolean()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    // Explicit GitHub identity, mirrored from the auth profile.
    githubId: v.optional(v.string()),
  }).index("email", ["email"]),

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
    // Set once auth landed; absent = legacy anonymous entry (stays visible).
    userId: v.optional(v.id("users")),
    avatarUrl: v.optional(v.string()),
  })
    .index("by_created", ["createdAt"])
    .index("by_user", ["userId"]),
});