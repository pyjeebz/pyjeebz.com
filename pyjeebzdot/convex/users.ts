import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** The signed-in GitHub user, or null. Consumed by the guestbook island. */
export const currentUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      name: user.name ?? null,
      image: user.image ?? null,
      email: user.email ?? null,
    };
  },
});