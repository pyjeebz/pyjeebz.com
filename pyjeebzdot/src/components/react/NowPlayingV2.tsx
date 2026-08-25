import { useEffect, useRef, useState } from "react";
import { registerEventSourceCleanup } from "../../utils/eventSourceCleanup";
import { VinylDisc } from "./VinylDisc";
import { AmbientGlow } from "./AmbientGlow";
import { GlassTooltip } from "./GlassTooltip";

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

// CharWave: each character animates a small vertical bounce, staggered ~75ms
// per letter. The stagger is what gives the title that undulating "wave" feel
// without anything actually moving horizontally.
const CharWave = ({
  text,
  color,
  isPlaying,
}: {
  text: string;
  color?: string;
  isPlaying: boolean;
}) => (
  <span
    className={`char-wave ${isPlaying ? "playing" : ""}`}
    aria-label={text}
    style={{ color: color ?? "inherit" }}
  >
    {text.split("").map((char, i) => (
      <span
        key={`${char}-${i}`}
        style={{ animationDelay: `${i * 75}ms` }}
      >
        {char === " " ? " " : char}
      </span>
    ))}
  </span>
);

const sameTrack = (a: NowPlayingData | null, b: NowPlayingData | null) =>
  !!a && !!b && a.title === b.title && a.artist === b.artist;

const rank = (d: NowPlayingData | null) =>
  !d || !d.title || d.configured === false || d.error ? 0 : d.isPlaying ? 2 : 1;

// Sample the average color of an album cover, skipping the very dark and very
// bright extremes so the chosen hue actually represents the artwork rather
// than its shadows or highlights.
function getDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    const finish = (fallback: string) => resolve(fallback);
    const timer = setTimeout(() => finish("rgb(var(--accent-rgb))"), 3000);
    img.onload = () => {
      clearTimeout(timer);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return finish("rgb(var(--accent-rgb))");
      const size = 50;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        if (brightness > 30 && brightness < 225) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }
      if (count === 0) return finish("rgb(var(--accent-rgb))");
      finish(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
    };
    img.onerror = () => {
      clearTimeout(timer);
      finish("rgb(var(--accent-rgb))");
    };
  });
}

export default function NowPlaying() {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const dataRef = useRef<NowPlayingData | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [titleColor, setTitleColor] = useState<string>("rgb(var(--accent-rgb))");
  const [hovered, setHovered] = useState(false);

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
      clearPending();
      if (sameTrack(d, dataRef.current) && d.isPlaying !== dataRef.current?.isPlaying) {
        apply(d);
      } else if (rank(d) >= rank(dataRef.current)) {
        apply(d);
      } else {
        pending.current = setTimeout(() => {
          apply(d);
          pending.current = null;
        }, 2500);
      }
    };

    const open = () => {
      if (es) return;
      es = new EventSource("/api/now-playing-stream");
      registerEventSourceCleanup(es);
      es.onmessage = (e) => {
        try {
          onFrame(JSON.parse(e.data) as NowPlayingData);
        } catch {
          /* ignore malformed frame */
        }
      };
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

  useEffect(() => {
    if (data?.albumImageUrl) {
      getDominantColor(data.albumImageUrl).then(setTitleColor);
    } else {
      setTitleColor("rgb(var(--accent-rgb))");
    }
  }, [data?.albumImageUrl]);

  if (!data || data.configured === false || data.error || !data.title) return null;

  return (
    <div
      className="now-playing-widget tooltip-trigger"
      role="region"
      aria-label="Now playing"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="widget-row">
        <div className="vinyl-area">
          <AmbientGlow color={titleColor} isPlaying={data.isPlaying ?? false} />
          <VinylDisc color={titleColor} isPlaying={data.isPlaying ?? false} />
        </div>

        <div className="text-content">
          <span className="status-label">
            {data.isPlaying ? "NOW PLAYING" : "PAUSED"}
          </span>
          <div className="title-wrapper">
            <CharWave
              text={data.title ?? ""}
              color={titleColor}
              isPlaying={data.isPlaying ?? false}
            />
          </div>
        </div>
      </div>

      <GlassTooltip
        artist={data.artist ?? null}
        album={data.album ?? null}
        show={hovered}
      />
    </div>
  );
}
