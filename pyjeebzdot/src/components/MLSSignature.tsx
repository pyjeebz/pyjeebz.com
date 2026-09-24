import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { sound } from "../lib/sound";
import { SIG_D, SIG_VB } from "../lib/signature";

// The "mls" signature (Mujeeb Lawal-Saka) as one continuous stroke, drawn on
// like handwriting — pathLength traces the stroke, then the ink fills in
// behind it. Replays on hover. Reduced motion skips straight to the finished
// filled signature. The path lives in src/lib/signature.ts (shared with the
// favicon/OG asset scripts).
//
// `crossedOut` (404 page): after the signature finishes, a hand scribble
// strikes it out — the "this isn't the page you signed up for" moment.

// Hand-scribbled strike-through, looped left-to-right across the signature's
// viewBox (464–690 × 234–420).
const SCRIBBLE_D =
  "M 468 340 C 498 236 546 232 524 330 C 502 428 566 418 584 316 C 602 220 654 226 634 326 C 618 402 676 388 688 296";

export function MLSSignature({ crossedOut = false }: { crossedOut?: boolean }) {
  const reduce = useReducedMotion();
  // Remount the motion path to replay the draw-on; `drawing` guards against
  // re-triggering mid-signature.
  const [runId, setRunId] = useState(0);
  const drawing = useRef(false);

  useEffect(() => {
    if (reduce) return;
    drawing.current = true;
    // A single arrival swell (~0.6s body, ~1s with shimmer tail) spans the
    // whole trace — the draw is timed to finish inside it, ink filling right
    // behind the shimmer.
    sound.signature();
    const timers: number[] = [
      window.setTimeout(() => (drawing.current = false), 1400),
    ];
    if (crossedOut) {
      // Fire with the scribble, which starts once the ink has settled.
      timers.push(window.setTimeout(() => sound.signatureCross(), 1200));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [runId, reduce, crossedOut]);

  const replay = () => {
    if (reduce || drawing.current) return;
    setRunId((n) => n + 1);
  };

  return (
    <motion.svg
      key={runId}
      viewBox={SIG_VB}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "64px", height: "auto", overflow: "visible", display: "block" }}
      role="img"
      aria-label="Signature: mls"
      onHoverStart={replay}
      animate={reduce || !crossedOut ? undefined : { rotate: [0, 0, -1.5, 1, -0.3, 0] }}
      transition={reduce || !crossedOut ? undefined : {
        duration: 0.5,
        delay: 1.2,
        times: [0, 0.05, 0.4, 0.7, 0.9, 1],
        ease: "easeOut",
      }}
    >
      <motion.path
        d={SIG_D}
        fill="var(--color-black)"
        stroke="var(--color-black)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        initial={reduce ? false : { pathLength: 0, fillOpacity: 0 }}
        animate={{ pathLength: 1, fillOpacity: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : {
                // Compressed from the original 2s trace so one arrival swell
                // can span the whole signature.
                pathLength: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                fillOpacity: { duration: 0.4, ease: "easeIn", delay: 0.7 },
              }
        }
      />
      {crossedOut ? (
        <motion.path
          d={SCRIBBLE_D}
          fill="none"
          stroke="var(--color-black)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={reduce ? { duration: 0 } : {
            pathLength: { delay: 1.2, duration: 0.45, ease: "easeInOut" },
          }}
        />
      ) : null}
    </motion.svg>
  );
}