import { useEffect, useRef } from "react";

interface VinylDiscProps {
  color: string;
  isPlaying: boolean;
}

// 40x40 vector vinyl. Groove rings are drawn from outer to inner, with a
// subtle white sheen arc on the upper-right that rotates with the disc.
// The center label takes the album's dominant color, and the spin animation
// stops exactly where it is when paused (animation-play-state: paused keeps
// the current keyframe, so we don't snap back to 0deg).
export function VinylDisc({ color, isPlaying }: VinylDiscProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rafRef = useRef<number | null>(null);

  // Drive rotation via rAF so we can stop exactly on the current frame
  // (animation-play-state: paused on a CSS keyframe snaps to the nearest
  // keyframe boundary on some browsers, which looks jerky). rAF gives us a
  // smooth, monotonic angle that holds on pause.
  useEffect(() => {
    if (!isPlaying) return;

    const node = svgRef.current;
    if (!node) return;
    let angle = parseFloat(node.dataset.angle ?? "0");
    const tick = () => {
      angle = (angle + 0.4) % 360;
      node.dataset.angle = String(angle);
      node.style.transform = `rotate(${angle}deg)`;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying]);

  return (
    <svg
      ref={svgRef}
      width="40"
      height="40"
      viewBox="0 0 40 40"
      className={`vinyl-disc ${isPlaying ? "playing" : "paused"}`}
      aria-hidden="true"
      style={{ transformOrigin: "center", willChange: "transform" }}
    >
      <defs>
        <radialGradient id="vinylBase" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1f1f1f" />
          <stop offset="55%" stopColor="#121212" />
          <stop offset="100%" stopColor="#060606" />
        </radialGradient>
        <linearGradient id="vinylSheen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="45%" stopColor="white" stopOpacity="0.28" />
          <stop offset="55%" stopColor="white" stopOpacity="0.28" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="labelShade" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="white" stopOpacity="0.18" />
          <stop offset="100%" stopColor="black" stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Base disc */}
      <circle cx="20" cy="20" r="20" fill="url(#vinylBase)" />

      {/* Concentric groove rings — drawn slightly off the diameter so the
          sheen reads as a real highlight, not a flat overlay. */}
      <g fill="none" stroke="#ffffff" strokeWidth="0.35" opacity="0.08">
        {Array.from({ length: 12 }, (_, i) => {
          const r = 19 - i * 1.05;
          return r > 9.5 ? <circle key={i} cx="20" cy="20" r={r} /> : null;
        })}
      </g>

      {/* Sheen highlight arc, upper-right */}
      <path
        d="M20,3 A17,17 0 0,1 37,20"
        stroke="url(#vinylSheen)"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        opacity="0.7"
      />

      {/* Center label — album color, with a tiny shading pass for depth */}
      <circle cx="20" cy="20" r="8" fill={color} />
      <circle cx="20" cy="20" r="8" fill="url(#labelShade)" />

      {/* Center hole */}
      <circle cx="20" cy="20" r="2.2" fill="#0a0a0a" />
    </svg>
  );
}
