import { useEffect, useRef, useState } from "react";

type NowPlayingData = {
  configured?: boolean;
  isPlaying?: boolean;
  error?: boolean;
  title?: string;
  artist?: string;
  album?: string | null;
  albumImageUrl?: string | null;
  songUrl?: string | null;
  progressMs?: number | null;
  durationMs?: number | null;
};

// Each bar gets its own height, tempo and phase so they move independently —
// reads as "reacting to the music" rather than marching in lockstep. (Not a
// real beat-sync: Spotify's tempo/analysis endpoints are deprecated for the app
// and the audio isn't in the browser.)
const BARS = [
  { h: 9, dur: 0.8, delay: 0 },
  { h: 15, dur: 1.3, delay: 0.18 },
  { h: 7, dur: 0.62, delay: 0.05 },
  { h: 13, dur: 1.05, delay: 0.24 },
  { h: 11, dur: 0.9, delay: 0.1 },
];

const Equalizer = () => (
  <span className="flex items-end gap-[2px] h-4" aria-hidden>
    {BARS.map((b, i) => (
      <span
        key={i}
        className="np-bar"
        style={{
          height: b.h,
          animationDuration: `${b.dur}s`,
          animationDelay: `${b.delay}s`,
        }}
      />
    ))}
  </span>
);

// 2 = playing, 1 = paused/last-played, 0 = nothing to show (hidden).
const rank = (d: NowPlayingData | null) =>
  !d || !d.title || d.configured === false || d.error ? 0 : d.isPlaying ? 2 : 1;

export default function NowPlaying() {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const dataRef = useRef<NowPlayingData | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;

    const clearPending = () => {
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
    };
    const apply = (d: NowPlayingData) => {
      dataRef.current = d;
      setData(d);
    };

    const onFrame = (d: NowPlayingData) => {
      // Upgrades (a track starts / changes) apply instantly. Downgrades
      // (pause / stop / hide) wait ~2.5s to confirm they aren't a transient
      // blip at a track boundary — the server only re-pushes on real change,
      // so a self-correcting blip cancels this before it fires.
      clearPending();
      if (rank(d) >= rank(dataRef.current)) {
        apply(d);
      } else {
        pending.current = setTimeout(() => {
          apply(d);
          pending.current = null;
        }, 2500);
      }
    };

    // Open the SSE stream when the tab is visible; close it when hidden so we
    // don't hold a serverless connection open in the background.
    const open = () => {
      if (es) return;
      es = new EventSource("/api/now-playing-stream");
      es.onmessage = (e) => {
        try {
          onFrame(JSON.parse(e.data) as NowPlayingData);
        } catch {
          /* ignore malformed frame */
        }
      };
      // On error EventSource retries automatically; nothing to do.
    };
    const close = () => {
      es?.close();
      es = null;
    };
    const onVis = () => (document.visibilityState === "visible" ? open() : close());

    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearPending();
      close();
    };
  }, []);

  // Hide entirely until there's a real track to show (or before setup).
  if (!data || data.configured === false || data.error || !data.title) return null;

  const label = data.isPlaying ? "now playing" : "last played";

  const inner = (
    <>
      {data.albumImageUrl ? (
        <img
          src={data.albumImageUrl}
          alt={data.album ?? ""}
          width={64}
          height={64}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-md border border-hairline object-cover"
        />
      ) : null}
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          {data.isPlaying ? (
            <Equalizer />
          ) : (
            <span className="text-accent" aria-hidden>
              ♪
            </span>
          )}
          <span className="font-mono text-2xs uppercase tracking-[0.16em] text-muted-faint">
            {label}
          </span>
        </span>
        <span className="mt-1 block truncate text-sm text-off-white transition-colors group-hover:text-accent">
          {data.title}
        </span>
        <span className="block truncate text-xs text-muted">{data.artist}</span>
      </span>
    </>
  );

  const className = "group inline-flex max-w-md items-center gap-4";

  return data.songUrl ? (
    <a href={data.songUrl} target="_blank" rel="noreferrer" className={className}>
      {inner}
    </a>
  ) : (
    <span className={className}>{inner}</span>
  );
}
