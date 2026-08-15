import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

const PAD_W = 520;
const PAD_H = 200;

/** Must mirror COLORS in convex/guestbook.ts — the server rejects anything else. */
const COLORS = ["ink", "#ff5a1f", "#3b82f6", "#ec4899", "#22c55e"] as const;

/** Stable hash so entries written before placement existed keep the same spot. */
function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}

const swatch = (c: string) => (c === "ink" ? "var(--ink)" : c);

const PencilIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

type Entry = {
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
};

/** One taped scrap on the board. */
function Scrap({ e, index }: { e: Entry; index: number }) {
  const seed = hash(e._id);
  const x = e.x ?? 6 + (seed % 76);
  const y = e.y ?? 6 + ((seed >> 7) % 72);
  const rotation = e.rotation ?? ((seed >> 3) % 1600) / 100 - 8;
  const scale = e.scale ?? 0.9 + ((seed >> 11) % 40) / 100;

  return (
    <div
      className="group absolute w-[min(64vw,230px)] transition-transform duration-300 ease-out [transform:rotate(var(--rot))_scale(var(--scl))] hover:z-50 hover:[transform:rotate(0deg)_scale(1.06)]"
      style={
        {
          left: `${x}%`,
          top: `${y}%`,
          "--rot": `${rotation}deg`,
          "--scl": `${scale}`,
          zIndex: index + 1,
        } as React.CSSProperties
      }
    >
      <div className="relative border border-hairline bg-[var(--panel)] px-4 pb-3 pt-5 shadow-[0_16px_36px_-20px_var(--shadow)] backdrop-blur-sm">
        {/* strip of tape */}
        <span
          className="absolute left-1/2 top-0 h-4 w-14 -translate-x-1/2 -translate-y-1/2 -rotate-3 border border-hairline bg-[var(--surface-2)] backdrop-blur-sm"
          aria-hidden="true"
        />

        {e.message && (
          <p className="mb-2 text-[12px] leading-snug text-muted">{e.message}</p>
        )}

        <div className="flex min-h-[56px] items-center justify-center">
          {e.kind === "typed" ? (
            <span
              className="font-serif text-[1.35rem] italic leading-tight"
              style={{ color: swatch(e.color) }}
            >
              {e.mark}
            </span>
          ) : (
            <svg
              viewBox={`0 0 ${PAD_W} ${PAD_H}`}
              className="h-[68px] w-full"
              fill="none"
              aria-hidden="true"
            >
              <path
                d={e.mark}
                stroke={swatch(e.color)}
                strokeWidth={e.strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>

        <p className="mt-2 border-t border-hairline pt-2 text-right font-mono text-2xs uppercase tracking-[0.14em] text-muted-faint">
          — {e.name}
        </p>
      </div>
    </div>
  );
}

function DrawModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const sign = useMutation(api.guestbook.sign);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<string[]>([]);
  const current = useRef<string[]>([]);
  const drawing = useRef(false);

  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [trap, setTrap] = useState("");
  const [hasInk, setHasInk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redraw = () => {
    const c = canvasRef.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, PAD_W, PAD_H);
    ctx.strokeStyle =
      color === "ink"
        ? getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() ||
          "#e6e4e1"
        : color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const d of [...strokes.current, current.current.join(" ")].filter(Boolean)) {
      try {
        ctx.stroke(new Path2D(d));
      } catch {
        /* ignore malformed */
      }
    }
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = PAD_W * dpr;
    c.height = PAD_H * dpr;
    redraw();
  }, []);

  useEffect(redraw, [color, width]);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const pos = (e: React.PointerEvent) => {
    const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * PAD_W;
    const y = ((e.clientY - r.top) / r.height) * PAD_H;
    return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    current.current = [`M${pos(e)}`];
    redraw();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    current.current.push(`L${pos(e)}`);
    redraw();
  };
  const up = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (current.current.length > 1) {
      strokes.current.push(current.current.join(" "));
      setHasInk(true);
    }
    current.current = [];
    redraw();
  };

  const clear = () => {
    strokes.current = [];
    current.current = [];
    setHasInk(false);
    redraw();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sign({
        name,
        message,
        kind: "drawn",
        mark: strokes.current.join(" "),
        color,
        strokeWidth: width,
        // Scatter it somewhere on the board.
        x: 4 + Math.random() * 78,
        y: 4 + Math.random() * 74,
        rotation: Math.random() * 16 - 8,
        scale: 0.85 + Math.random() * 0.45,
        trap: trap || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign. Try again.");
      setBusy(false);
    }
  };

  const field =
    "rounded-md border border-hairline bg-[var(--surface)] px-3 py-2 font-mono text-sm text-off-white outline-none placeholder:text-muted-faint focus:border-accent/50";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: "rgba(4,4,6,0.72)", backdropFilter: "blur(4px)" }}
      onMouseDown={onClose}
    >
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-xl border border-hairline bg-black-001 p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
            leave your mark
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-faint transition-colors hover:text-accent"
          >
            <CloseIcon />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerLeave={up}
          style={{ touchAction: "none", aspectRatio: `${PAD_W} / ${PAD_H}` }}
          className="w-full cursor-crosshair rounded-lg border border-hairline bg-[var(--surface)]"
          aria-label="Drawing pad"
        />

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
                className="h-6 w-6 rounded-full border transition-transform"
                style={{
                  background: swatch(c),
                  borderColor:
                    color === c ? "rgb(var(--accent-rgb))" : "var(--hairline)",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }}
              />
            ))}
          </div>

          <label className="flex flex-1 items-center gap-2">
            <span className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-faint">
              size
            </span>
            <input
              type="range"
              min={2}
              max={24}
              value={width}
              onChange={(e) => setWidth(Number(e.target.value))}
              className="w-full accent-[rgb(var(--accent-rgb))]"
            />
          </label>

          {hasInk && (
            <button
              type="button"
              onClick={clear}
              className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-faint transition-colors hover:text-accent"
            >
              clear
            </button>
          )}
        </div>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={160}
          placeholder="say something (optional)"
          className={`${field} mt-4 w-full`}
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
            required
            placeholder="your name"
            className={`${field} flex-1`}
          />
          {/* honeypot — hidden from people, catnip for bots */}
          <input
            value={trap}
            onChange={(e) => setTrap(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="pointer-events-none absolute h-0 w-0 opacity-0"
          />
          <button
            type="submit"
            disabled={busy || !hasInk || !name}
            className="rounded-md border border-accent/55 px-4 py-2 font-mono text-2xs uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-hairline disabled:text-muted-faint disabled:hover:bg-transparent"
          >
            {busy ? "sticking…" : "stick it"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-muted">{error}</p>}
      </form>
    </div>
  );
}

export default function Guestbook() {
  const entries = useQuery(api.guestbook.list) as Entry[] | undefined;
  const [drawing, setDrawing] = useState(false);
  const [justSigned, setJustSigned] = useState(false);

  return (
    <section className="relative">
      <div className="relative min-h-[78vh] overflow-hidden rounded-xl border border-hairline bg-[var(--surface)]">
        {/* faint grid, like a board */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(var(--hairline) 1px, transparent 1px), linear-gradient(90deg, var(--hairline) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden="true"
        />

        {entries === undefined && (
          <p className="absolute inset-0 grid place-items-center font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
            loading…
          </p>
        )}

        {entries?.length === 0 && (
          <p className="absolute inset-0 grid place-items-center px-6 text-center font-serif italic text-muted">
            Nothing on the wall yet. Be the first to leave a mark.
          </p>
        )}

        {entries?.map((e, i) => (
          <Scrap key={e._id} e={e} index={i} />
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setDrawing(true)}
          className="inline-flex items-center gap-2 rounded-md border border-accent/55 px-4 py-2 font-mono text-2xs uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent/10"
        >
          <PencilIcon />
          sign the wall
        </button>

        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-muted-faint">
          {justSigned
            ? "stuck — thank you"
            : entries
              ? `${entries.length} ${entries.length === 1 ? "mark" : "marks"}`
              : ""}
        </p>
      </div>

      {drawing && (
        <DrawModal
          onClose={() => setDrawing(false)}
          onSaved={() => {
            setJustSigned(true);
            setTimeout(() => setJustSigned(false), 4000);
          }}
        />
      )}
    </section>
  );
}
