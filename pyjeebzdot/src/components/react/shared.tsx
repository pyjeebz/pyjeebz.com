import { useEffect, useRef } from "react";

/** Bits shared between the guestbook page and the signature wall. */

export const PAD_W = 520;
export const PAD_H = 200;

/** Must mirror COLORS in convex/guestbook.ts — the server rejects anything else. */
export const COLORS = ["ink", "#F5DE6B", "#F2A9BC", "#A8C9EE", "#B3D6A4"] as const;

export const swatch = (c: string) => (c === "ink" ? "var(--color-charcoal)" : c);

export type Entry = {
  _id: string;
  name: string;
  kind: string;
  mark: string;
  message: string;
  color: string;
  strokeWidth: number;
  x?: number;
  y?: number;
  rotation?: number;
  scale?: number;
  createdAt: number;
  avatarUrl?: string;
};

/** Stable hash so entries written before placement existed keep the same spot. */
export function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

export const fmtDate = (t: number) =>
  new Date(t)
    .toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    .toLowerCase();

/** A stored mark — typed text or a drawn path — rendered as the signer left it. */
export function Mark({ e, className = "" }: { e: Entry; className?: string }) {
  if (e.kind === "typed") {
    return (
      <span
        className={`font-display text-xl leading-tight ${className}`}
        style={{ color: swatch(e.color) }}
      >
        {e.mark}
      </span>
    );
  }
  return (
    <svg
      viewBox={`0 0 ${PAD_W} ${PAD_H}`}
      className={`fill-none ${className}`}
      aria-hidden="true"
    >
      <path
        d={e.mark}
        stroke={swatch(e.color)}
        strokeWidth={e.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function Avatar({ src, name, size = 24 }: { src: string; name: string; size?: number }) {
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      title={name}
      className="inline-block rounded-full align-middle"
      style={{ border: "1.5px solid rgba(44 44 42 / 0.25)" }}
    />
  );
}

/**
 * Islands render after the page-level napkin scan has run, so re-scan this
 * subtree once mounted to sketch the drawably chrome inside it.
 */
export function useScanRef<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const napkin = (window as unknown as { __napkin?: { scan: (r?: ParentNode) => void } })
      .__napkin;
    napkin?.scan(ref.current ?? undefined);
  }, []);
  return ref;
}