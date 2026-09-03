import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { fmtDate, hash, swatch, type Entry, Avatar, PAD_H, PAD_W } from "./shared";

/**
 * The signature wall — an infinite canvas of bare signatures (no cards),
 * mirroring ephraimduncan.com/wall: a centered chronological grid, drag/wheel
 * to pan, ctrl/cmd+wheel or pinch to zoom, arrow keys to pan, click a
 * signature to open its details.
 */

// Grid geometry: 220×140 cells on a 232×152 pitch (12px gutter), each cell
// nudged a few px so the rows read hand-placed. The grid is centered on the
// world origin; the initial view puts that origin at the middle of the screen.
const CELL_W = 220;
const CELL_H = 140;
const PITCH_X = 232;
const PITCH_Y = 152;
const JITTER = 4;

const INITIAL_SCALE = 0.8;
const MIN_SCALE = 0.25;
const MAX_SCALE = 3;
const ZOOM_FACTOR = 1.06;
const WHEEL_ZOOM_RATE = 0.009;
const ARROW_PAN = 80;
const DRAG_THRESHOLD = 8;
const CULL_MARGIN = 500;
// A click within 100ms of a drag ending is really a drag.
const DRAG_GRACE_MS = 100;

type Pan = { x: number; y: number };
type Position = { id: string; entry: Entry; x: number; y: number; order: number };

/** Chronological row-major grid, centered on the world origin. */
function layoutPositions(entries: Entry[]): Position[] {
  const list = [...entries].sort((a, b) => a.createdAt - b.createdAt);
  const n = list.length;
  const cols = Math.max(1, Math.ceil(Math.sqrt(n * (PITCH_X / PITCH_Y))));
  const w = (cols - 1) * PITCH_X;
  const rows = Math.ceil(n / cols);
  const h = (rows - 1) * PITCH_Y;
  return list.map((entry, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const g = hash(entry._id);
    return {
      id: entry._id,
      entry,
      x: -w / 2 + col * PITCH_X - CELL_W / 2 + (g % 9) - JITTER,
      y: -h / 2 + row * PITCH_Y - CELL_H / 2 + ((g >> 3) % 9) - JITTER,
      order: i,
    };
  });
}

/** Reveal stagger: waves of five, ten waves, then everyone together. */
const revealDelay = (order: number) => Math.floor(order / 5) % 10 * 30;

/** The ink itself — drawn path or typed name, nothing else. */
function Ink({ e, className = "" }: { e: Entry; className?: string }) {
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
      preserveAspectRatio="xMidYMid meet"
      className={className}
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

const Signature = memo(function Signature({
  pos,
  onOpen,
}: {
  pos: Position;
  onOpen: (e: Entry) => void;
}) {
  const { entry: e, x, y, order } = pos;
  const label = `Open signature by ${e.name}`;
  return (
    <div
      className="signature-element absolute left-0 top-0"
      style={{
        width: CELL_W,
        height: CELL_H,
        transform: `translate3d(${x}px, ${y}px, 0px)`,
        animationDelay: `${revealDelay(order)}ms`,
        contain: "layout style paint",
      }}
    >
      <div className="pointer-events-none flex h-full w-full items-center justify-center opacity-80">
        <Ink e={e} className="max-h-full max-w-full" />
      </div>
      <button
        type="button"
        data-element="true"
        aria-label={label}
        onClick={() => onOpen(e)}
        className="signature-hit"
      />
    </div>
  );
});

/* Tiny hand-drawn controls — path-only strokes, no straight lines. */

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true" {...strokeProps}>
      <path d="M8.2 3.1 C7.9 6 8.1 10 7.9 12.9" />
      <path d="M3.1 8.1 C6 7.8 10.1 8.2 12.9 8" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true" {...strokeProps}>
      <path d="M3.4 8.3 C6.2 7.8 9.7 8.2 12.6 7.9" />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true" {...strokeProps}>
      <path d="M12.8 7.2 C13 4.9 10.9 2.9 8.4 3.1 C5.7 3.3 3.5 5.5 3.6 8.2 C3.7 10.9 5.9 13 8.5 12.9 C10.3 12.8 11.9 11.8 12.6 10.3" />
      <path d="M12.9 6.9 C12.8 7.9 12.8 9.3 12.6 10.4 C11.7 10.2 10.9 10.2 9.9 10.3" />
    </svg>
  );
}

function CornersIcon() {
  return (
    <svg viewBox="0 0 16 16" width={15} height={15} aria-hidden="true" {...strokeProps}>
      <path d="M3 6.4 C3 4.4 4.4 3 6.4 3" />
      <path d="M9.6 3 C11.6 3 13 4.4 13 6.4" />
      <path d="M13 9.6 C13 11.6 11.6 13 9.6 13" />
      <path d="M6.4 13 C4.4 13 3 11.6 3 9.6" />
    </svg>
  );
}

export default function Wall() {
  // The server caps this at 300 — the whole board comes in one query.
  const results = useQuery(api.guestbook.list);
  const entries = results as Entry[] | undefined;

  const canvasRef = useRef<HTMLDivElement>(null);

  const [pan, setPan] = useState<Pan>({ x: 0, y: 0 });
  const [scale, setScale] = useState(INITIAL_SCALE);
  const [ready, setReady] = useState(false);
  const [isPanning, setPanning] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const panRef = useRef(pan);
  panRef.current = pan;
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const positions = useMemo(
    () => (entries ? layoutPositions(entries) : []),
    [entries]
  );

  /* ------------------------------ gestures ------------------------------ */

  const pointersRef = useRef(
    new Map<number, { x: number; y: number; element: boolean; startX: number; startY: number }>()
  );
  type Gesture =
    | { type: "idle" }
    | { type: "pan"; pointerId: number; startClientX: number; startClientY: number; startPan: Pan }
    | { type: "pinch"; a: number; b: number; startDist: number; startScale: number };
  const gestureRef = useRef<Gesture>({ type: "idle" });
  const dragEndRef = useRef(0);

  const setScaleAtPoint = useCallback((clientX: number, clientY: number, next: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
    const rect = canvas.getBoundingClientRect();
    // World point under the pointer stays put while the scale changes.
    const wx = (clientX - rect.left - panRef.current.x) / scaleRef.current;
    const wy = (clientY - rect.top - panRef.current.y) / scaleRef.current;
    setPan({ x: clientX - rect.left - wx * s, y: clientY - rect.top - wy * s });
    setScale(s);
  }, []);

  const zoomIn = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setScaleAtPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      parseFloat((scaleRef.current * ZOOM_FACTOR).toFixed(3))
    );
  }, [setScaleAtPoint]);

  const zoomOut = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setScaleAtPoint(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      parseFloat((scaleRef.current / ZOOM_FACTOR).toFixed(3))
    );
  }, [setScaleAtPoint]);

  const zoomToFit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setScale(INITIAL_SCALE);
    setPan({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });
  }, []);

  // Center the board on mount, then let the reveal play.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPan({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });
    setReady(true);
  }, []);

  // Wheel: plain wheel pans; ctrl/cmd+wheel (also trackpad pinch) zooms.
  // React registers wheel passively at the root, so attach natively.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setScaleAtPoint(e.clientX, e.clientY, scaleRef.current * Math.exp(-e.deltaY * WHEEL_ZOOM_RATE));
      } else {
        setPan({ x: panRef.current.x - e.deltaX, y: panRef.current.y - e.deltaY });
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setScaleAtPoint]);

  const isCanvas = (target: EventTarget | null) =>
    !(target instanceof Element && target.closest('[data-element="true"]'));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const element = !isCanvas(e.target);
    pointersRef.current.set(e.pointerId, {
      x: e.clientX,
      y: e.clientY,
      element,
      startX: e.clientX,
      startY: e.clientY,
    });
    if (element) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    gestureRef.current = {
      type: "pan",
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPan: panRef.current,
    };
    setPanning(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pointers = pointersRef.current;
    const p = pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;

    // A press on a signature that becomes a drag hands control to the canvas.
    if (p.element && gestureRef.current.type === "idle") {
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > DRAG_THRESHOLD) {
        p.element = false;
        e.currentTarget.setPointerCapture(e.pointerId);
        gestureRef.current = {
          type: "pan",
          pointerId: e.pointerId,
          startClientX: p.startX,
          startClientY: p.startY,
          startPan: panRef.current,
        };
        setPanning(true);
      }
    }

    if (pointers.size === 2 && gestureRef.current.type !== "pinch") {
      const [a, b] = [...pointers.values()];
      if (a.element || b.element) return;
      gestureRef.current = {
        type: "pinch",
        a: [...pointers.keys()][0],
        b: [...pointers.keys()][1],
        startDist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        startScale: scaleRef.current,
      };
      return;
    }

    const g = gestureRef.current;
    if (g.type === "pan" && e.pointerId === g.pointerId) {
      setPan({
        x: g.startPan.x + (e.clientX - g.startClientX),
        y: g.startPan.y + (e.clientY - g.startClientY),
      });
    } else if (g.type === "pinch" && pointers.size === 2) {
      const a = pointers.get(g.a);
      const b = pointers.get(g.b);
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      setScaleAtPoint(
        (a.x + b.x) / 2,
        (a.y + b.y) / 2,
        (g.startScale * dist) / g.startDist
      );
    }
  };

  const endPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    const g = gestureRef.current;
    if (g.type === "pan" && e.pointerId !== g.pointerId) return;
    gestureRef.current = { type: "idle" };
    dragEndRef.current = Date.now();
    setPanning(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    let dx = 0;
    let dy = 0;
    switch (e.key) {
      case "ArrowLeft": dx = ARROW_PAN; break;
      case "ArrowRight": dx = -ARROW_PAN; break;
      case "ArrowUp": dy = ARROW_PAN; break;
      case "ArrowDown": dy = -ARROW_PAN; break;
      default: return;
    }
    e.preventDefault();
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  };

  /* ------------------------------ culling ------------------------------- */

  const visible = useMemo(() => {
    if (!ready || positions.length === 0) return [];
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = scale;
    const left = -pan.x / s - CULL_MARGIN;
    const right = (vw - pan.x) / s + CULL_MARGIN;
    const top = -pan.y / s - CULL_MARGIN;
    const bottom = (vh - pan.y) / s + CULL_MARGIN;
    return positions.filter(
      (p) => p.x + CELL_W >= left && p.x <= right && p.y + CELL_H >= top && p.y <= bottom
    );
  }, [positions, pan, scale, ready]);

  /* ------------------------------ dialog -------------------------------- */

  const openSignature = useCallback((e: Entry) => {
    if (Date.now() - dragEndRef.current < DRAG_GRACE_MS) return;
    setSelected(e);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void document.documentElement.requestFullscreen();
    }
  };

  /* ------------------------------- render ------------------------------- */

  if (entries === undefined) {
    return (
      <p className="grid h-screen place-items-center font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
        loading…
      </p>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="grid h-screen place-items-center px-6 text-center">
        <div>
          <p className="italic text-muted">the board is empty — nothing taped up yet.</p>
          <a
            href="/guestbook"
            className="mt-4 inline-block font-mono text-2xs uppercase tracking-[0.14em] text-muted-faint transition-colors hover:text-charcoal"
          >
            sign the guestbook →
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={canvasRef}
        role="application"
        aria-label="Signature wall canvas. Use the arrow keys to pan."
        tabIndex={0}
        className={`wall-canvas absolute inset-0 focus:outline-none ${isPanning ? "is-panning" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onKeyDown={onKeyDown}
      >
        <div
          className="relative h-screen w-screen will-change-transform"
          style={{
            transformOrigin: "0 0",
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            contain: "layout style",
          }}
        >
          {visible.map((p) => (
            <Signature key={p.id} pos={p} onOpen={openSignature} />
          ))}
        </div>
      </div>

      {/* top-right: the one way in */}
      <a
        href="/guestbook"
        className="wall-chrome right-4 top-4 font-body font-bold text-charcoal transition-colors hover:bg-highlighter-yellow"
        style={{ borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px", padding: "0.4rem 1rem" }}
      >
        sign the guestbook
      </a>

      {/* bottom-center: canvas controls */}
      <div
        className="wall-chrome bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2"
        role="group"
        aria-label="Canvas controls"
      >
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          className="wall-ctl-btn"
        >
          <CornersIcon />
        </button>
        <button type="button" onClick={zoomToFit} aria-label="Zoom to fit" title="Zoom to fit" className="wall-ctl-btn">
          <FitIcon />
        </button>
        <button type="button" onClick={zoomIn} aria-label="Zoom in" title="Zoom in" className="wall-ctl-btn">
          <PlusIcon />
        </button>
        <span className="sr-only" aria-live="polite">
          {Math.round(scale * 100)}%
        </span>
        <button type="button" onClick={zoomOut} aria-label="Zoom out" title="Zoom out" className="wall-ctl-btn">
          <MinusIcon />
        </button>
      </div>

      {/* signature details */}
      {selected && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center p-4"
          style={{ background: "rgba(244 241 234 / 0.72)", backdropFilter: "blur(2px)" }}
          onClick={() => setSelected(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Signature by ${selected.name}`}
            className="napkin-grid w-full max-w-sm border-2 border-charcoal bg-surface p-5 shadow-[0_2px_6px_rgba(44_44_42/0.16)]"
            style={{ borderRadius: "255px 15px 225px 15px / 15px 225px 15px 255px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="napkin-grid relative aspect-video w-full overflow-hidden"
              style={{ borderRadius: "18px 8px 16px 10px / 10px 16px 8px 18px" }}
            >
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <Ink e={selected} className="max-h-full max-w-full" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-faint">
                signed {fmtDate(selected.createdAt)}
              </p>
              <p className="flex items-center gap-2 font-display text-lg text-charcoal">
                {selected.avatarUrl && (
                  <Avatar src={selected.avatarUrl} name={selected.name} size={20} />
                )}
                {selected.name}
              </p>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="wall-ctl-btn !w-auto px-3 font-mono text-2xs uppercase tracking-[0.14em]"
              >
                close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}