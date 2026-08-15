import type { APIRoute } from "astro";
import { getNowPlaying, visibleKey } from "../../lib/spotify";

export const prerender = false;

// Adaptive poll: Spotify rate-limits hard (a sustained sub-second poll earns a
// multi-hour 429), so idle at a slow baseline and only tighten in the window
// where a change is actually likely — the last seconds of a track.
const BASE_MS = 6000; // steady state (~10 req/min)
const BOUNDARY_MS = 1200; // near a track boundary
const BOUNDARY_WINDOW_MS = 8000; // "near the end" threshold

// Server-Sent Events: poll on the server and push to the browser only when what
// is on screen changes. EventSource auto-reconnects, so we close before the
// serverless max duration and let the client reconnect.
export const GET: APIRoute = ({ request }) => {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      let lastKey = "";
      let timer: ReturnType<typeof setTimeout>;
      let maxTimer: ReturnType<typeof setTimeout>;

      const send = (obj: unknown) => {
        if (!closed) controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };
      const ping = () => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      };
      const stop = () => {
        if (closed) return;
        closed = true;
        clearTimeout(timer);
        clearTimeout(maxTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const nextDelay = (d: Awaited<ReturnType<typeof getNowPlaying>>) => {
        if (d?.isPlaying && d.durationMs && d.progressMs != null) {
          const remaining = d.durationMs - d.progressMs;
          if (remaining > 0 && remaining <= BOUNDARY_WINDOW_MS) return BOUNDARY_MS;
        }
        return BASE_MS;
      };

      const tick = async () => {
        if (closed) return;
        let delay = BASE_MS;
        try {
          const data = await getNowPlaying();
          const key = visibleKey(data);
          if (key !== lastKey) {
            lastKey = key;
            send(data);
          } else {
            ping(); // keepalive through proxies
          }
          delay = nextDelay(data);
        } catch {
          /* keep the stream open; try again next tick */
        }
        if (!closed) timer = setTimeout(tick, delay);
      };

      maxTimer = setTimeout(stop, 270_000);
      request.signal.addEventListener("abort", stop);
      tick(); // push initial state immediately, then self-schedule
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
};
