import { ConvexClientProvider } from "./ConvexProvider";
import Guestbook from "./Guestbook";

export default function GuestbookWrapper() {
  // Without a deployment URL the Convex provider renders nothing, which would
  // leave a silently blank page. Say so instead.
  if (!import.meta.env.PUBLIC_CONVEX_URL) {
    return (
      <p className="italic text-muted">The guestbook is warming up — check back shortly.</p>
    );
  }

  return (
    <ConvexClientProvider>
      <Guestbook />
    </ConvexClientProvider>
  );
}