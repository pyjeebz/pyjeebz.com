import { ConvexClientProvider } from "./ConvexProvider";
import Wall from "./Wall";

export default function WallWrapper() {
  if (!import.meta.env.PUBLIC_CONVEX_URL) {
    return (
      <p className="italic text-muted">The wall is warming up — check back shortly.</p>
    );
  }

  return (
    <ConvexClientProvider>
      <Wall />
    </ConvexClientProvider>
  );
}