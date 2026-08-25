import { useEffect, useRef, useState } from "react";
import { registerEventSourceCleanup } from "../../utils/eventSourceCleanup";

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

const CharWave = ({ text, color }: { text: string; color?: string }) => (
  <span className="char-wave" aria-label={text} style={{ color: color ?? "inherit", filter: "saturate(1.8)" }}>
    {text.split("").map((char, i) => (
      <span key={i} style={{ animationDelay: `${i * 80}ms` }}>
        {char === " " ? "\u00A0" : char}
      </span>
    ))}
  </span>
);

const Tooltip = ({ content }: { content: string | null | undefined }) => {
  if (!content) return null;
  return (
    <span className="tooltip-wrapper" tabIndex={0}>
      <span className="tooltip" role="tooltip">{content}</span>
    </span>
  );
};

const sameTrack = (a: NowPlayingData | null, b: NowPlayingData | null) =>
  !!a && !!b && a.title === b.title && a.artist === b.artist;

const rank = (d: NowPlayingData | null) =>
  !d || !d.title || d.configured === false || d.error ? 0 : d.isPlaying ? 2 : 1;

function getDominantColor(imageUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve("rgb(var(--accent-rgb))");
        return;
      }
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
      if (count > 0) {
        resolve(`rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`);
      } else {
        resolve("rgb(var(--accent-rgb))");
      }
    };
    img.onerror = () => resolve("rgb(var(--accent-rgb))");
    setTimeout(() => resolve("rgb(var(--accent-rgb))"), 3000);
  });
}

export default function NowPlaying() {
  const [data, setData] = useState<NowPlayingData | null>(null);
  const dataRef = useRef<NowPlayingData | null>(null);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [titleColor, setTitleColor] = useState<string>("rgb(var(--accent-rgb))");

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

  const label = data.isPlaying ? "listening to" : "last played";
  const tooltipContent = data.artist && data.album
    ? `${data.artist} · ${data.album}`
    : data.artist;

  return (
    <div className="now-playing-wrapper">
      {data.songUrl && data.isPlaying ? (
        <a
          href={data.songUrl}
          target="_blank"
          rel="noreferrer"
          className="now-playing-link"
        >
          <span className="label">{label}</span>
          <span className="title-wrapper">
            <CharWave text={data.title ?? ""} color={titleColor} />
            <Tooltip content={tooltipContent} />
          </span>
        </a>
      ) : data.isPlaying ? (
        <span className="now-playing-link">
          <span className="label">{label}</span>
          <span className="title-wrapper">
            <CharWave text={data.title ?? ""} color={titleColor} />
            <Tooltip content={tooltipContent} />
          </span>
        </span>
      ) : (
        <span className="now-playing-link paused">
          <span className="label">{label}</span>
          <span className="title-wrapper paused">
            <span className="text-muted">{data.title}</span>
            <Tooltip content={tooltipContent} />
          </span>
          <span className="paused-icon" aria-hidden="true">♪</span>
        </span>
      )}
    </div>
  );
}