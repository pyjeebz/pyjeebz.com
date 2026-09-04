import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, usePaginatedQuery } from "convex/react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import {
  COLORS,
  PAD_H,
  PAD_W,
  type Entry,
  Avatar,
  Mark,
  fmtDate,
  swatch,
  useScanRef,
} from "./shared";

const PAGE_SIZE = 24;

type Stroke = { d: string; color: string; width: number };

const buttonOpts = JSON.stringify({ variant: "outline" });
const buttonClass =
  "font-body font-bold text-charcoal px-5 py-2 text-base cursor-pointer";

/** The signing form, shown once GitHub says who you are. */
function SignForm({ name, avatar }: { name: string; avatar?: string | null }) {
  const sign = useMutation(api.guestbook.sign);
  const { signOut } = useAuthActions();

  const formRef = useScanRef<HTMLFormElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const liveRef = useRef<SVGPathElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const current = useRef("");

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [mode, setMode] = useState<"draw" | "type">("draw");
  const [typed, setTyped] = useState("");
  const [color, setColor] = useState<string>(COLORS[0]);
  const [width, setWidth] = useState(3);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);

  const setSketchState = (state: "idle" | "loading" | "error" | "success") => {
    const sketch = (
      buttonRef.current as (HTMLElement & { __napkinSketch?: { setState: (s: string) => void } }) | null
    )?.__napkinSketch;
    try {
      sketch?.setState(state);
    } catch {
      /* sketch handle absent — cosmetic only */
    }
  };

  const pos = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * PAD_W;
    const y = ((e.clientY - r.top) / r.height) * PAD_H;
    return `${Math.round(x * 10) / 10} ${Math.round(y * 10) / 10}`;
  };

  const down = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    current.current = `M${pos(e)}`;
    if (liveRef.current) {
      liveRef.current.setAttribute("d", current.current);
      liveRef.current.setAttribute("stroke", swatch(color));
      liveRef.current.setAttribute("stroke-width", String(width));
    }
  };

  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!current.current) return;
    current.current += ` L${pos(e)}`;
    liveRef.current?.setAttribute("d", current.current);
  };

  const up = () => {
    if (!current.current) return;
    if (current.current.length > 8) {
      const d = current.current;
      setStrokes((s) => [...s, { d, color, width }]);
    }
    current.current = "";
    liveRef.current?.setAttribute("d", "");
  };

  const undo = () => setStrokes((s) => s.slice(0, -1));
  const clear = () => setStrokes([]);

  const hasInk = mode === "draw" ? strokes.length > 0 : typed.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    setSketchState("loading");
    try {
      const mark =
        mode === "draw"
          ? strokes.map((s) => s.d).join(" ")
          : typed.trim();

      await sign({
        kind: mode === "draw" ? "drawn" : "typed",
        mark,
        message: message || undefined,
        color,
        strokeWidth: width,
        // Scatter it somewhere on the wall.
        x: 4 + Math.random() * 78,
        y: 4 + Math.random() * 74,
        rotation: Math.random() * 16 - 8,
        scale: 0.85 + Math.random() * 0.45,
      });

      setSketchState("success");
      setStrokes([]);
      setTyped("");
      setMessage("");
      setJustSigned(true);
      setTimeout(() => {
        setJustSigned(false);
        setSketchState("idle");
      }, 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign. Try again.");
      setSketchState("error");
      setTimeout(() => setSketchState("idle"), 2000);
    } finally {
      setBusy(false);
    }
  };

  const field =
    "w-full bg-transparent font-body text-charcoal placeholder:text-muted-faint px-3 py-2 focus:outline-none text-base";

  return (
    <form ref={formRef} onSubmit={submit} data-napkin="card" data-napkin-opts={JSON.stringify({ boil: 0 })}>
      <div className="p-6 sm:p-7">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3">
            {avatar && <Avatar src={avatar} name={name} size={28} />}
            <h2 className="font-display text-lg text-charcoal">
              signing as <span className="font-bold">{name}</span>
            </h2>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="font-mono text-2xs uppercase tracking-[0.14em] text-muted-faint transition-colors hover:text-charcoal"
          >
            sign out
          </button>
        </div>

        {/* draw | type */}
        <div className="mb-5 flex items-center justify-end">
          <div className="flex items-center gap-1 font-mono text-2xs uppercase tracking-[0.14em]">
            {(["draw", "type"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={
                  mode === m
                    ? "px-2.5 py-1 bg-highlighter-yellow text-charcoal"
                    : "px-2.5 py-1 text-muted-faint hover:text-charcoal transition-colors"
                }
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {mode === "draw" ? (
          <>
            <svg
              ref={svgRef}
              viewBox={`0 0 ${PAD_W} ${PAD_H}`}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerLeave={up}
              style={{ touchAction: "none", aspectRatio: `${PAD_W} / ${PAD_H}` }}
              className="w-full cursor-crosshair bg-paper/60"
              data-napkin="card"
              data-napkin-opts={JSON.stringify({ boil: 0 })}
              aria-label="Drawing pad"
            >
              {strokes.map((s, i) => (
                <path
                  key={i}
                  d={s.d}
                  stroke={swatch(s.color)}
                  strokeWidth={s.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}
              <path ref={liveRef} d="" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-2" role="group" aria-label="Ink colour">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Ink ${c === "ink" ? "charcoal" : c}`}
                    aria-pressed={color === c}
                    className="h-6 w-6 rounded-full transition-transform"
                    style={{
                      background: swatch(c),
                      border:
                        color === c
                          ? "2px dashed var(--color-charcoal)"
                          : "1.5px solid rgba(44 44 42 / 0.25)",
                      transform: color === c ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5" role="group" aria-label="Stroke size">
                {[3, 6, 10].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setWidth(w)}
                    aria-pressed={width === w}
                    className={
                      "grid h-7 w-7 place-items-center rounded-full font-mono text-2xs transition-colors " +
                      (width === w
                        ? "bg-charcoal text-paper"
                        : "text-muted-faint hover:text-charcoal")
                    }
                  >
                    {w}
                  </button>
                ))}
              </div>

              {strokes.length > 0 && (
                <div className="ml-auto flex items-center gap-3 font-mono text-2xs uppercase tracking-[0.14em]">
                  <button
                    type="button"
                    onClick={undo}
                    className="text-muted-faint transition-colors hover:text-charcoal"
                  >
                    undo
                  </button>
                  <button
                    type="button"
                    onClick={clear}
                    className="text-muted-faint transition-colors hover:text-charcoal"
                  >
                    clear
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <label data-napkin="input" className="block">
            <span className="sr-only">Your signature, typed</span>
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              maxLength={60}
              placeholder="sign your name (typed)"
              className={field}
            />
          </label>
        )}

        <label data-napkin="input" className="mt-5 block">
          <span className="sr-only">Say something (optional)</span>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={160}
            placeholder="say something (optional)"
            className={field}
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            ref={buttonRef}
            data-napkin="button"
            data-napkin-opts={JSON.stringify({ variant: "outline" })}
            type="submit"
            disabled={busy || !hasInk}
            className="font-body font-bold text-charcoal px-5 py-2 text-base cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "sticking…" : justSigned ? "stuck — thank you" : "stick it"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-muted">{error}</p>}
      </div>
    </form>
  );
}

/** One guestbook card in the list. */
function Row({ e }: { e: Entry }) {
  const ref = useScanRef<HTMLLIElement>();
  const tilt = e._id.charCodeAt(e._id.length - 1) % 2 === 0 ? "0.4deg" : "-0.4deg";
  return (
    <li
      ref={ref}
      data-napkin="card"
      data-napkin-opts={JSON.stringify({ boil: 0 })}
      className="bg-surface p-5 sm:p-6"
      style={{ transform: `rotate(${tilt})` }}
    >
      <div className="flex items-start gap-x-4">
        <div className="w-36 shrink-0 sm:w-44">
          {e.kind === "drawn" ? (
            <Mark e={e} className="h-16 w-full" />
          ) : (
            <Mark e={e} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {e.message && (
            <p className="text-[15px] leading-relaxed text-muted">{e.message}</p>
          )}
          <p className="mt-2 font-mono text-2xs tracking-[0.08em] text-muted-faint">
            {e.avatarUrl && (
              <span className="mr-2">
                <Avatar src={e.avatarUrl} name={e.name} size={18} />
              </span>
            )}
            {e.name} · {fmtDate(e.createdAt)}
          </p>
        </div>
      </div>
    </li>
  );
}

export default function Guestbook() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const user = useQuery(api.users.currentUser);
  const { signIn } = useAuthActions();
  const [signingIn, setSigningIn] = useState(false);
  const actionsRef = useScanRef<HTMLDivElement>();

  const { results, status, loadMore } = usePaginatedQuery(
    api.guestbook.listPage,
    {},
    { initialNumItems: PAGE_SIZE }
  );

  const entries = results as Entry[] | undefined;

  const handleSignIn = () => {
    setSigningIn(true);
    void signIn("github", { redirectTo: "/guestbook" });
  };

  // Coming back to this tab via browser-back restores the frozen "opening
  // github…" state (bfcache); clear it, and drop it once auth lands.
  useEffect(() => {
    const reset = () => setSigningIn(false);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);
  useEffect(() => {
    if (isAuthenticated) setSigningIn(false);
  }, [isAuthenticated]);

  if (isLoading) {
    return (
      <p className="grid min-h-[30vh] place-items-center font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
        loading…
      </p>
    );
  }

  return (
    <section>
      {/* sign in + wall link, side by side, same hand-drawn button */}
      <div ref={actionsRef} className="mb-10 flex flex-wrap items-center gap-3">
        {!isAuthenticated && (
          <button
            data-napkin="button"
            data-napkin-opts={buttonOpts}
            type="button"
            onClick={handleSignIn}
            disabled={signingIn}
            className={`${buttonClass} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {signingIn ? "opening github…" : "sign in with github"}
          </button>
        )}
        <a
          href="/wall"
          data-napkin="button"
          data-napkin-opts={buttonOpts}
          className={buttonClass}
        >
          see the signature wall
        </a>
      </div>

      {isAuthenticated &&
        (user ? (
          <SignForm name={user.name ?? "someone"} avatar={user.image} />
        ) : (
          <SignForm name="you" avatar={undefined} />
        ))}

      {/* ------------------------------ the list ------------------------------ */}
      {entries !== undefined && entries.length > 0 && (
        <div className="mt-12">
          <h2 className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
            the guestbook
          </h2>
          <ul className="mt-6 space-y-5">
            {entries.map((e) => (
              <Row key={e._id} e={e} />
            ))}
          </ul>

          <div className="mt-8 flex flex-col items-center gap-2">
            {status === "CanLoadMore" && <LoadMoreButton onLoadMore={() => loadMore(PAGE_SIZE)} />}
            {status === "LoadingMore" && (
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
                loading…
              </p>
            )}
            {status === "Exhausted" && (
              <p className="font-mono text-2xs uppercase tracking-[0.18em] text-muted-faint">
                that's everyone.
              </p>
            )}
          </div>
        </div>
      )}

      {entries !== undefined && entries.length === 0 && (
        <p className="mt-12 text-center italic text-muted">
          Nobody has signed yet. Be the first.
        </p>
      )}
    </section>
  );
}

function LoadMoreButton({ onLoadMore }: { onLoadMore: () => void }) {
  const ref = useScanRef<HTMLDivElement>();
  return (
    <div ref={ref}>
      <button
        data-napkin="button"
        data-napkin-opts={JSON.stringify({ variant: "outline" })}
        type="button"
        onClick={onLoadMore}
        className="font-body font-bold text-charcoal px-5 py-2 text-base cursor-pointer"
      >
        load more
      </button>
    </div>
  );
}