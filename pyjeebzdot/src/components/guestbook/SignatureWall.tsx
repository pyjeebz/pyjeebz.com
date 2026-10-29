import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { sound } from "../../lib/sound";
import type { Signature } from "../../lib/guestbook";
import { BackButton } from "../BackButton";
import { SignatureInk } from "./SignatureInk";

// The signature wall: everyone who's signed, on one canvas to wander around.
// Drag (or scroll) to pan, pinch (or ctrl-scroll) to zoom, arrow keys and
// +/− from the keyboard. The newest signature sits in the middle and older
// ones ring outward, each nudged off the grid a little so it reads as a wall
// people signed rather than a table. Click one for who, when and their note.

const CELL = { width: 230, height: 140 };
const ITEM = { width: 190, height: 100 };
const JITTER = 18;
const ZOOM = { min: 0.2, max: 3, step: 1.4 };
const PAN_STEP = 90;
const WALL_PAGE = 200;
const WALL_MAX = 2000;

const MESSAGES = {
  offline: "The wall is resting right now. Try again later.",
  empty: "No one yet. You could be the first.",
};

type Camera = { x: number; y: number; k: number };
type Placed = { signature: Signature; x: number; y: number; turn: number };

const clamp = (k: number) => Math.min(ZOOM.max, Math.max(ZOOM.min, k));

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// A small seeded random, so a signature keeps its nudge between visits.
function random(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    t = (t ^ (t >>> 14)) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    return t / 4294967296;
  };
}

// Grid cells nearest the middle first, a little wider than tall to suit a
// screen, so signature n always lands in the same place as the wall grows.
function cells(count: number): [number, number][] {
  const reach = Math.ceil(Math.sqrt(count)) + 1;
  const all: [number, number][] = [];
  for (let i = -reach; i <= reach; i++) {
    for (let j = -reach; j <= reach; j++) all.push([i, j]);
  }
  const distance = ([i, j]: [number, number]) =>
    Math.hypot(i * CELL.width * 0.7, j * CELL.height);
  return all
    .sort(
      (a, b) =>
        distance(a) - distance(b) ||
        Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0]),
    )
    .slice(0, count);
}

function place(signatures: Signature[]): Placed[] {
  const grid = cells(signatures.length);
  return signatures.map((signature, n) => {
    const rand = random(signature.id);
    const [i, j] = grid[n];
    return {
      signature,
      x: i * CELL.width + (rand() - 0.5) * 2 * JITTER,
      y: j * CELL.height + (rand() - 0.5) * 2 * JITTER,
      turn: (rand() - 0.5) * 6,
    };
  });
}

export function SignatureWall() {
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [wall, setWall] = useState<"loading" | "ready" | "offline">("loading");
  const [selected, setSelected] = useState<Signature | null>(null);
  const placed = useMemo(() => place(signatures), [signatures]);

  const viewRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const camera = useRef<Camera>({ x: 0, y: 0, k: 1 });
  const tween = useRef<number | undefined>(undefined);
  const settle = useRef<number | undefined>(undefined);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const dragged = useRef(false);

  // Every signature, a page at a time; the wall fills in as they arrive.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let before: number | null = null;
      let count = 0;
      try {
        do {
          const res = await fetch(
            `/api/signatures?limit=${WALL_PAGE}` +
              (before ? `&before=${before}` : ""),
          );
          if (!res.ok) throw new Error(String(res.status));
          const page = (await res.json()) as {
            signatures: Signature[];
            next: number | null;
          };
          if (cancelled) return;
          setSignatures((all) => [...all, ...page.signatures]);
          setWall("ready");
          count += page.signatures.length;
          before = page.next;
        } while (before !== null && count < WALL_MAX);
      } catch {
        if (!cancelled)
          setWall((state) => (state === "ready" ? state : "offline"));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const apply = () => {
    const layer = layerRef.current;
    if (!layer) return;
    const { x, y, k } = camera.current;
    layer.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${k})`;
    // A promoted layer pans smoothly but keeps the raster it had, which
    // blurs when zoomed in; drop the promotion once the camera rests so the
    // ink re-rasterises crisp at the new scale.
    layer.style.willChange = "transform";
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      layer.style.willChange = "auto";
    }, 200);
  };

  const stop = () => {
    if (tween.current !== undefined) cancelAnimationFrame(tween.current);
    tween.current = undefined;
  };

  const animateTo = (to: Camera) => {
    stop();
    const from = { ...camera.current };
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / 380);
      const e = 1 - (1 - t) ** 3;
      camera.current = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        k: from.k * (to.k / from.k) ** e,
      };
      apply();
      tween.current = t < 1 ? requestAnimationFrame(step) : undefined;
    };
    tween.current = requestAnimationFrame(step);
  };

  const size = () => {
    const view = viewRef.current;
    return { w: view?.clientWidth ?? 0, h: view?.clientHeight ?? 0 };
  };

  const home = (): Camera => {
    const { w, h } = size();
    return { x: w / 2, y: h / 2, k: w < 640 ? 0.7 : 1 };
  };

  const fit = (): Camera => {
    const { w, h } = size();
    if (placed.length === 0) return home();
    let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
    for (const p of placed) {
      minX = Math.min(minX, p.x - ITEM.width / 2);
      maxX = Math.max(maxX, p.x + ITEM.width / 2);
      minY = Math.min(minY, p.y - ITEM.height / 2);
      maxY = Math.max(maxY, p.y + ITEM.height / 2);
    }
    const k = clamp(
      Math.min(1.5, (w - 64) / (maxX - minX), (h - 160) / (maxY - minY)),
    );
    return {
      x: w / 2 - ((minX + maxX) / 2) * k,
      y: h / 2 - ((minY + maxY) / 2) * k,
      k,
    };
  };

  // Zoom by `factor` about a point on screen, keeping that point still.
  const zoomAt = (sx: number, sy: number, factor: number) => {
    const { x, y, k } = camera.current;
    const next = clamp(k * factor);
    camera.current = {
      x: sx - (sx - x) * (next / k),
      y: sy - (sy - y) * (next / k),
      k: next,
    };
  };

  const zoomBy = (factor: number) => {
    const { w, h } = size();
    const { x, y, k } = camera.current;
    const next = clamp(k * factor);
    animateTo({
      x: w / 2 - (w / 2 - x) * (next / k),
      y: h / 2 - (h / 2 - y) * (next / k),
      k: next,
    });
  };

  const panBy = (dx: number, dy: number) => {
    camera.current = {
      ...camera.current,
      x: camera.current.x + dx,
      y: camera.current.y + dy,
    };
  };

  useEffect(() => {
    camera.current = home();
    apply();
  }, []);

  // Scrolling pans; a trackpad pinch (which browsers send as ctrl+wheel)
  // zooms. Not passive, so the page doesn't try to scroll or zoom too.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      stop();
      const scale = event.deltaMode === 1 ? 16 : 1;
      if (event.ctrlKey || event.metaKey) {
        const box = view.getBoundingClientRect();
        zoomAt(
          event.clientX - box.left,
          event.clientY - box.top,
          Math.exp(-event.deltaY * scale * 0.01),
        );
      } else {
        panBy(-event.deltaX * scale, -event.deltaY * scale);
      }
      apply();
    };
    view.addEventListener("wheel", wheel, { passive: false });
    return () => view.removeEventListener("wheel", wheel);
  }, []);

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    stop();
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pointers.current.size === 1) dragged.current = false;
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const last = pointers.current.get(event.pointerId);
    if (!last) return;
    const view = event.currentTarget;
    const now = { x: event.clientX, y: event.clientY };

    if (pointers.current.size === 1) {
      // Only a real drag pans (and swallows the click), not a shaky tap.
      if (!dragged.current && Math.hypot(now.x - last.x, now.y - last.y) < 4) {
        return;
      }
      if (!dragged.current) {
        dragged.current = true;
        view.setPointerCapture(event.pointerId);
        view.style.cursor = "grabbing";
      }
      panBy(now.x - last.x, now.y - last.y);
    } else {
      // Two fingers: zoom about their midpoint, and pan as it moves.
      const [other] = [...pointers.current].filter(
        ([id]) => id !== event.pointerId,
      );
      const o = other[1];
      const before = Math.hypot(last.x - o.x, last.y - o.y);
      const after = Math.hypot(now.x - o.x, now.y - o.y);
      const box = view.getBoundingClientRect();
      dragged.current = true;
      zoomAt(
        (now.x + o.x) / 2 - box.left,
        (now.y + o.y) / 2 - box.top,
        before > 0 ? after / before : 1,
      );
      panBy((now.x - last.x) / 2, (now.y - last.y) / 2);
    }
    pointers.current.set(event.pointerId, now);
    apply();
  };

  const up = (event: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) event.currentTarget.style.cursor = "";
  };

  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    const pans: Record<string, [number, number]> = {
      ArrowLeft: [PAN_STEP, 0],
      ArrowRight: [-PAN_STEP, 0],
      ArrowUp: [0, PAN_STEP],
      ArrowDown: [0, -PAN_STEP],
    };
    const { x, y, k } = camera.current;
    if (event.key in pans) {
      const [dx, dy] = pans[event.key];
      animateTo({ x: x + dx, y: y + dy, k });
    } else if (event.key === "+" || event.key === "=") {
      zoomBy(ZOOM.step);
    } else if (event.key === "-" || event.key === "_") {
      zoomBy(1 / ZOOM.step);
    } else if (event.key === "0") {
      animateTo(home());
    } else if (event.key === "f") {
      animateTo(fit());
    } else {
      return;
    }
    event.preventDefault();
  };

  // The note opens as a modal dialog, which brings focus, Escape and the
  // backdrop along with it.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (selected && dialog && !dialog.open) dialog.showModal();
  }, [selected]);

  const open = (signature: Signature) => {
    if (dragged.current) return;
    setSelected(signature);
    sound.open();
  };

  const count = signatures.length;

  return (
    <div className="fixed inset-0 overflow-hidden bg-(--color-page)">
      <div
        ref={viewRef}
        role="application"
        aria-label="Signature wall. Drag or use the arrow keys to look around, plus and minus to zoom."
        tabIndex={0}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
        className="absolute inset-0 cursor-grab touch-none select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-zinc-400"
      >
        <div ref={layerRef} className="absolute top-0 left-0 origin-top-left">
          {placed.map(({ signature: s, x, y, turn }, n) => (
            <button
              key={s.id}
              type="button"
              onClick={() => open(s)}
              aria-label={`Open signature by ${s.name || "an anonymous visitor"}`}
              className="wall-item group absolute top-0 left-0 rounded-lg focus-visible:outline-2 focus-visible:outline-zinc-400"
              style={{
                width: ITEM.width,
                height: ITEM.height,
                transform: `translate(${x - ITEM.width / 2}px, ${y - ITEM.height / 2}px) rotate(${turn}deg)`,
                animationDelay: `${Math.min(n * 15, 900)}ms`,
              }}
            >
              <SignatureInk
                strokes={s.strokes}
                label=""
                crop
                replay={false}
                className="pointer-events-none block h-full w-full opacity-80 transition duration-200 group-hover:scale-105 group-hover:opacity-100"
              />
            </button>
          ))}
        </div>
      </div>

      {wall !== "ready" || count === 0 ? (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-4 text-center text-sm text-zinc-400">
          {wall === "loading"
            ? "Gathering signatures…"
            : wall === "offline"
              ? MESSAGES.offline
              : MESSAGES.empty}
        </p>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="pointer-events-auto rounded-full bg-(--color-page)/80 px-3 py-1 backdrop-blur-sm">
          <BackButton href="/guestbook" label="Guestbook" />
        </div>
        <a
          href="/guestbook"
          onClick={() => sound.nav()}
          className="pointer-events-auto rounded-full bg-black px-3.5 py-1 text-sm text-white transition-opacity hover:opacity-80"
        >
          Sign the guestbook
        </a>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {count > 0 ? (
          <p className="text-xs text-zinc-400 tabular-nums">
            {count} {count === 1 ? "signature" : "signatures"}
          </p>
        ) : null}
        <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
          <WallButton label="Zoom to fit" onClick={() => animateTo(fit())}>
            <path d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
          </WallButton>
          <WallButton
            label="Back to the middle"
            onClick={() => animateTo(home())}
          >
            <path d="M2.5 7a4.5 4.5 0 1 0 1.3-3.2M2.5 2v2.5H5" />
          </WallButton>
          <WallButton label="Zoom in" onClick={() => zoomBy(ZOOM.step)}>
            <path d="M7 3v8M3 7h8" />
          </WallButton>
          <WallButton label="Zoom out" onClick={() => zoomBy(1 / ZOOM.step)}>
            <path d="M3 7h8" />
          </WallButton>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => {
          setSelected(null);
          sound.close();
        }}
        onClick={(event) => {
          // A click on the backdrop lands on the dialog itself.
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
        aria-labelledby="signature-name"
        className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white p-0 text-black shadow-lg ring-1 ring-zinc-200 backdrop:bg-[rgb(0_0_0/0.25)]"
      >
        {selected ? (
          <div className="p-6">
            <h2 id="signature-name" className="font-medium">
              {selected.name || "Anonymous"}
            </h2>
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <SignatureInk
                key={selected.id}
                strokes={selected.strokes}
                label={`Signature by ${selected.name || "an anonymous visitor"}`}
                crop
                className="block aspect-video h-auto w-full"
              />
            </div>
            {selected.message ? (
              <p className="mt-4 text-sm break-words text-zinc-700">
                {selected.message}
              </p>
            ) : null}
            <div className="mt-4 flex items-center justify-between gap-4">
              <p className="flex min-w-0 flex-wrap gap-x-3 text-sm text-zinc-500">
                <span>Signed {formatDate(selected.createdAt)}</span>
                {selected.login ? (
                  <a
                    href={`https://github.com/${selected.login}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate underline decoration-zinc-300 underline-offset-2 hover:text-black hover:no-underline"
                  >
                    @{selected.login}
                  </a>
                ) : null}
              </p>
              <button
                type="button"
                autoFocus
                onClick={() => dialogRef.current?.close()}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm transition-colors hover:bg-zinc-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

type WallButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
};

function WallButton(props: WallButtonProps) {
  const { label, onClick, children } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="grid size-8 place-items-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-black"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {children}
      </svg>
    </button>
  );
}
