import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convexUrl = import.meta.env.PUBLIC_CONVEX_URL;
const client = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: React.ReactNode }) {
  if (!client) return <>{children}</>;
  // ConvexAuthProvider provides both the Convex client context and auth state;
  // it manages the token (localStorage by default) and consumes the ?code=
  // handed back from the Convex HTTP callback after an OAuth round-trip.
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}