import GitHub from "@auth/core/providers/github";
import { convexAuth } from "@convex-dev/auth/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    GitHub({
      // GitHub now includes `iss=https://github.com` in its callback (RFC 9207
      // issuer identification) and oauth4webapi rejects an issuer it doesn't
      // expect — without this, sign-in dies with "unexpected iss parameter".
      issuer: "https://github.com",
      profile(profile) {
        return {
          id: String(profile.id),
          // Many GitHub accounts have no public name — fall back to the handle.
          name: profile.name ?? profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: String(profile.id),
        };
      },
    }),
  ],
});