import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent,
  type SetStateAction,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { sound } from "../../lib/sound";
import {
  inkPath,
  LIMITS,
  PAD,
  type Point,
  type Signature,
  type Stroke,
} from "../../lib/guestbook";
import { SignatureInk } from "./SignatureInk";

// The guestbook: a signing pad, and a card for everyone who's signed (the
// whole crowd at once is on /guestbook/wall).
//
// The pen writes in the footer palette's accent, like the wet ink of the mls
// signature; once it's on a card it's dried to black and writes itself out
// again as it scrolls into view.

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "signed" }
  | { kind: "error"; message: string };

const MESSAGES: Record<string, string> = {
  invalid: "That didn’t come through as a signature. Give it another go?",
  signin: "Your GitHub sign-in ran out. Sign in again to sign.",
  failed: "GitHub sign-in didn’t go through. Give it another go?",
  limited: "You’ve signed a few times already. Come back in a bit.",
  offline: "The guestbook is resting right now. Try again later.",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });

export function Guestbook() {
  const reduce = useReducedMotion();
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [wall, setWall] = useState<"loading" | "ready" | "offline">("loading");
  const [loadingMore, setLoadingMore] = useState(false);
  const [session, setSession] = useState<Session | "loading">("loading");
  // The pad stays mounted while it's tucked away, so a half-drawn signature
  // survives closing it.
  const [open, setOpen] = useState(false);

  const user = session === "loading" ? null : session.user;
  const signedAt = session === "loading" ? null : session.signedAt;

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((body: Session) => setSession(body))
      .catch(() => setSession({ enabled: false, user: null, signedAt: null }));
  }, []);

  const load = async (before?: number) => {
    const res = await fetch(
      before ? `/api/signatures?before=${before}` : "/api/signatures",
    );
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as {
      signatures: Signature[];
      next: number | null;
    };
  };

  useEffect(() => {
    load()
      .then((page) => {
        setSignatures(page.signatures);
        setNext(page.next);
        setWall("ready");
      })
      .catch(() => setWall("offline"));
  }, []);

  const loadMore = async () => {
    if (next === null || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await load(next);
      setSignatures((all) => [...all, ...page.signatures]);
      setNext(page.next);
    } catch {
      // Leave the button there to try again.
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 text-sm">
        <motion.button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            sound.nav();
          }}
          aria-expanded={open}
          aria-controls="signing-pad"
          whileTap={reduce ? undefined : { scale: 0.96 }}
          className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2 text-white"
        >
          <PenIcon />
          {open
            ? "Close the pad"
            : user && signedAt
              ? "Update your signature"
              : "Sign the guestbook"}
        </motion.button>
        <a
          href="/guestbook/wall"
          onClick={() => sound.nav()}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2 text-zinc-700 transition-colors hover:border-zinc-400 hover:text-black"
        >
          <WallIcon />
          See the signature wall
        </a>
      </div>

      <motion.div
        id="signing-pad"
        initial={false}
        animate={
          open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }
        }
        transition={reduce ? { duration: 0 } : { duration: 0.3, ease: "easeOut" }}
        inert={!open}
        className="overflow-hidden"
      >
        <div className="pt-6">
          <SigningPad
            session={session}
            setSession={setSession}
            onWake={() => setOpen(true)}
            onSigned={(signature) => {
              // Signing again replaces their old signature, so take its card down.
              setSignatures((all) => [
                signature,
                ...all.filter((s) => s.id !== signature.id),
              ]);
              setWall("ready");
            }}
          />
        </div>
      </motion.div>

      <section className="mt-10" aria-labelledby="wall-heading">
        <h2 id="wall-heading" className="mb-4 text-zinc-500">
          Signed by
        </h2>

        {wall === "loading" ? (
          <p className="text-sm text-zinc-400">Gathering signatures…</p>
        ) : wall === "offline" && signatures.length === 0 ? (
          <p className="text-sm text-zinc-400">{MESSAGES.offline}</p>
        ) : signatures.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No one yet. You could be the first.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {signatures.map((s) => (
              <li
                key={s.id}
                className="flex min-h-36 flex-col gap-5 rounded-xl border border-zinc-200 bg-white p-5"
              >
                {s.message ? (
                  <p className="line-clamp-4 break-words text-zinc-800">
                    {s.message}
                  </p>
                ) : null}
                <div className="mt-auto flex items-end justify-between gap-3">
                  <p className="min-w-0 text-sm">
                    {user && s.login === user.login ? (
                      <span className="mb-1 inline-block rounded-full bg-zinc-100 px-2 text-xs text-zinc-500">
                        You
                      </span>
                    ) : null}
                    {s.login ? (
                      <a
                        href={`https://github.com/${s.login}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate font-medium text-black hover:underline"
                      >
                        {s.name || s.login}
                      </a>
                    ) : (
                      <span className="block truncate font-medium text-black">
                        {s.name || "Anonymous"}
                      </span>
                    )}
                    <time
                      dateTime={s.createdAt}
                      title={formatTime(s.createdAt)}
                      className="block text-xs whitespace-nowrap text-zinc-400 tabular-nums"
                    >
                      {formatDate(s.createdAt)}
                    </time>
                  </p>
                  <SignatureInk
                    strokes={s.strokes}
                    label={`Signature by ${s.name || "an anonymous visitor"}`}
                    crop
                    className="block h-16 w-32 shrink-0"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        {next !== null ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-4 text-sm text-zinc-500 transition-colors hover:text-black disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : "More signatures"}
          </button>
        ) : null}
      </section>
    </>
  );
}

type Session = {
  enabled: boolean;
  user: { id: number; login: string; name: string; avatar: string } | null;
  signedAt: string | null;
};

// What's on the pad while a visitor pops over to GitHub to sign in, so it's
// still there when they get back.
const DRAFT_KEY = "pyjeebz:guestbook-draft";

type SigningPadProps = {
  session: Session | "loading";
  setSession: Dispatch<SetStateAction<Session | "loading">>;
  // The pad has something to show (a draft back from GitHub, or a sign-in
  // that went wrong), so open it.
  onWake: () => void;
  onSigned: (signature: Signature) => void;
};

function SigningPad(props: SigningPadProps) {
  const { session, setSession, onWake, onSigned } = props;
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // The ref for the move handler, the state so lifting the pen re-renders
  // (and tapers off the end of the last stroke).
  const drawing = useRef(false);
  const [penDown, setPenDown] = useState(false);

  const points = strokes.reduce((n, s) => n + s.length, 0);
  const user = session === "loading" ? null : session.user;
  const enabled = session !== "loading" && session.enabled;
  const canSign =
    enabled && points >= LIMITS.minPoints && status.kind !== "sending";

  useEffect(() => {
    // Back from GitHub: pick the draft back up, and say if it went wrong.
    try {
      const draft = sessionStorage.getItem(DRAFT_KEY);
      if (draft) {
        sessionStorage.removeItem(DRAFT_KEY);
        const saved = JSON.parse(draft) as {
          strokes: Stroke[];
          message: string;
        };
        setStrokes(saved.strokes);
        setMessage(saved.message);
        onWake();
      }
    } catch {
      // No storage, or a draft that didn't parse: start blank.
    }
    const url = new URL(location.href);
    const signin = url.searchParams.get("signin");
    if (signin) {
      setStatus({
        kind: "error",
        message: signin === "failed" ? MESSAGES.failed : MESSAGES.offline,
      });
      url.searchParams.delete("signin");
      history.replaceState(null, "", url);
      onWake();
    }
  }, []);

  const signIn = () => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ strokes, message }));
    } catch {
      // The draft is a nicety; sign in anyway.
    }
    sound.nav();
    location.href = "/api/auth/github";
  };

  const signOut = async () => {
    await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
    setSession((s) =>
      s === "loading" ? s : { ...s, user: null, signedAt: null },
    );
  };

  // Pointer position in pad units.
  const toPad = (event: PointerEvent): Point => {
    const box = svgRef.current!.getBoundingClientRect();
    return [
      Math.round(((event.clientX - box.left) / box.width) * PAD.width),
      Math.round(((event.clientY - box.top) / box.height) * PAD.height),
    ];
  };

  const down = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0 || strokes.length >= LIMITS.strokes) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawing.current = true;
    setPenDown(true);
    if (status.kind !== "sending") setStatus({ kind: "idle" });
    setStrokes((all) => [...all, [toPad(event)]]);
    sound.penDown();
  };

  const move = (event: PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    const [x, y] = toPad(event);
    setStrokes((all) => {
      const current = all[all.length - 1];
      const [lx, ly] = current[current.length - 1];
      // Skip jitter, and stop adding once a stroke is full.
      if (Math.hypot(x - lx, y - ly) < 2) return all;
      if (current.length >= LIMITS.pointsPerStroke) return all;
      return [...all.slice(0, -1), [...current, [x, y]]];
    });
  };

  const up = () => {
    drawing.current = false;
    setPenDown(false);
  };

  const sign = async () => {
    if (!canSign) return;
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/signatures", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, strokes, website: honeypot }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setSession((s) => (s === "loading" ? s : { ...s, user: null }));
      }
      if (!res.ok) {
        setStatus({
          kind: "error",
          message: MESSAGES[body.error] ?? MESSAGES.offline,
        });
        return;
      }
      if (body.signature) {
        onSigned(body.signature);
        setSession((s) =>
          s === "loading" ? s : { ...s, signedAt: body.signature.createdAt },
        );
      }
      setStrokes([]);
      setMessage("");
      setStatus({ kind: "signed" });
      sound.signature();
    } catch {
      setStatus({ kind: "error", message: MESSAGES.offline });
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (user) sign();
        else signIn();
      }}
    >
      <div className="relative rounded-xl border border-dashed border-zinc-300 bg-white">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${PAD.width} ${PAD.height}`}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          role="img"
          aria-label="Signing pad: draw your signature with a mouse, finger or pen"
          className="block h-auto w-full cursor-crosshair touch-none select-none"
        >
          {/* The line to sign on. */}
          <text
            x="58"
            y="312"
            fontSize="34"
            fill="var(--color-zinc-400)"
            className="font-serif"
          >
            ×
          </text>
          <line
            x1="100"
            x2="940"
            y1="312"
            y2="312"
            stroke="var(--color-zinc-200)"
            strokeWidth="2"
          />
          {strokes.map((stroke, i) => (
            <path
              key={i}
              d={inkPath(stroke, !(penDown && i === strokes.length - 1))}
              fill="var(--color-accent)"
            />
          ))}
        </svg>
        {strokes.length === 0 ? (
          <p className="pointer-events-none absolute top-4 left-4 text-sm text-zinc-400">
            Sign here
          </p>
        ) : null}
      </div>

      <input
        type="text"
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        maxLength={LIMITS.message}
        placeholder="Leave a note (optional)"
        aria-label="Leave a note (optional)"
        autoComplete="off"
        className="mt-3 w-full border-b border-zinc-200 bg-transparent py-1 text-sm transition-colors outline-none placeholder:text-zinc-400 focus:border-zinc-500"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-zinc-500">
          {user ? (
            <>
              <img
                src={`${user.avatar}${user.avatar.includes("?") ? "&" : "?"}s=40`}
                alt=""
                width={20}
                height={20}
                className="size-5 shrink-0 rounded-full"
              />
              <span className="truncate">
                Signing as <span className="text-black">{user.name}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className="shrink-0 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-black hover:no-underline"
              >
                Sign out
              </button>
            </>
          ) : session !== "loading" && !session.enabled ? (
            <span>{MESSAGES.offline}</span>
          ) : null}
        </div>
        {/* The honeypot: hidden from people, irresistible to bots. */}
        <input
          type="text"
          name="website"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <div className="flex items-center gap-1.5 text-sm">
          <button
            type="button"
            onClick={() => setStrokes((all) => all.slice(0, -1))}
            disabled={strokes.length === 0}
            className="-my-3 -ml-1.5 px-1.5 py-3 text-zinc-500 transition-colors hover:text-black disabled:opacity-40 disabled:hover:text-zinc-500"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setStrokes([])}
            disabled={strokes.length === 0}
            className="-my-3 px-1.5 py-3 text-zinc-500 transition-colors hover:text-black disabled:opacity-40 disabled:hover:text-zinc-500"
          >
            Clear
          </button>
          {user || !enabled ? (
            <motion.button
              type="submit"
              disabled={!canSign}
              whileTap={reduce || !canSign ? undefined : { scale: 0.96 }}
              className="rounded-full bg-black px-4 py-2 text-white transition-opacity disabled:opacity-30"
            >
              {status.kind === "sending" ? "Signing…" : "Sign"}
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              whileTap={reduce ? undefined : { scale: 0.96 }}
              className="inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-white"
            >
              <GitHubIcon />
              Sign in with GitHub
            </motion.button>
          )}
        </div>
      </div>

      <p className="mt-3 min-h-5 text-sm text-zinc-500" aria-live="polite">
        {status.kind === "signed"
          ? "Signed. Thank you for stopping by."
          : status.kind === "error"
            ? status.message
            : user && session !== "loading" && session.signedAt
              ? `You signed on ${formatDate(session.signedAt)}. Signing again replaces it.`
              : !user && enabled
                ? "Draw first if you like. It’ll still be here after you sign in."
                : ""}
      </p>
    </form>
  );
}

function PenIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 2.5l2.5 2.5L6 12.5 2.5 13.5l1-3.5z" />
    </svg>
  );
}

// A little scrawl, for the wall of them.
function WallIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 11c1.5-6 3-7 3.5-4.5S4 12 5.5 10s2-3 2.5-1 1.5 2 2.5.5 1.5-1 2 0 1.5.5 2-.5" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
