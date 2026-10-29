import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { inkPath, inkViewBox, PAD, type Stroke } from "../../lib/guestbook";

// A signature's ink. With `replay`, it writes itself out the first time it
// scrolls into view, one recorded point at a time. Points were captured at
// the pointer's event rate, so a steady point rate replays each signature at
// roughly the speed it was signed (the pauses between strokes aside). With
// `crop`, the box hugs the ink instead of the whole pad.

const MS_PER_POINT = 8;
const MAX_REPLAY_MS = 2600;

type SignatureInkProps = {
  strokes: Stroke[];
  label: string;
  replay?: boolean;
  crop?: boolean;
  className?: string;
};

export function SignatureInk(props: SignatureInkProps) {
  const {
    strokes,
    label,
    replay = true,
    crop = false,
    className = "block h-auto w-full",
  } = props;
  const reduce = useReducedMotion();
  const ref = useRef<SVGSVGElement>(null);

  const finished = useMemo(() => strokes.map((s) => inkPath(s)), [strokes]);
  const viewBox = useMemo(
    () => (crop ? inkViewBox(strokes) : `0 0 ${PAD.width} ${PAD.height}`),
    [crop, strokes],
  );
  const total = useMemo(
    () => strokes.reduce((n, s) => n + s.length, 0),
    [strokes],
  );
  const animate = replay && !reduce;
  const [drawn, setDrawn] = useState(animate ? 0 : total);

  useEffect(() => {
    const el = ref.current;
    if (!animate || !el) {
      setDrawn(total);
      return;
    }
    let raf: number | undefined;
    const write = () => {
      const duration = Math.min(MAX_REPLAY_MS, total * MS_PER_POINT);
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setDrawn(Math.round(total * t));
        raf = t < 1 ? requestAnimationFrame(step) : undefined;
      };
      raf = requestAnimationFrame(step);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        write();
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (raf !== undefined) cancelAnimationFrame(raf);
    };
  }, [animate, total]);

  // Whole strokes from the cache; only the one being written is re-inked.
  const paths: string[] = [];
  let left = drawn;
  for (const [i, stroke] of strokes.entries()) {
    if (left <= 0) break;
    paths.push(
      left >= stroke.length
        ? finished[i]
        : inkPath(stroke.slice(0, left), false),
    );
    left -= stroke.length;
  }

  return (
    <svg
      ref={ref}
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className={className}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="var(--color-black)" />
      ))}
    </svg>
  );
}
