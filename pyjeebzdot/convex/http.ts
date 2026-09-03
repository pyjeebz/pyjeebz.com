import { httpRouter } from "convex/server";
import { auth } from "./auth";

// Serves the OAuth callback (e.g. /api/auth/callback/github) on the
// deployment's *.convex.site URL — GitHub hits this directly, never Astro.
const http = httpRouter();

auth.addHttpRoutes(http);

export default http;