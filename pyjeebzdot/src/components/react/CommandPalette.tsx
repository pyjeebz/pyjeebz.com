import { useEffect, useMemo, useRef, useState } from "react";

type Command = {
  id: string;
  label: string;
  hint?: string;
  keywords?: string;
  // Return a string to print it as terminal output and keep the palette open;
  // return nothing to run the action and close.
  run: () => string | void;
};

const nav = (url: string) => {
  window.location.href = url;
};
const ext = (url: string) => {
  window.open(url, "_blank", "noopener,noreferrer");
};
const goWorkshop = () => {
  if (window.location.pathname === "/") {
    document.getElementById("workshop")?.scrollIntoView({ behavior: "smooth" });
  } else {
    window.location.href = "/#workshop";
  }
};

const commands: Command[] = [
  { id: "home", label: "home", hint: "↵ index", keywords: "start index", run: () => nav("/") },
  { id: "blog", label: "blog", hint: "↵ writing", keywords: "posts writing intro", run: () => nav("/blog") },
  { id: "workshop", label: "the workshop", hint: "↵ projects", keywords: "projects work things built", run: () => goWorkshop() },
  { id: "prescale", label: "prescale", hint: "↗ prescale.dev", keywords: "load tester project", run: () => ext("https://prescale.dev") },
  { id: "why", label: "why", hint: "↗ github", keywords: "code archaeology cli project", run: () => ext("https://github.com/pyjeebz/why") },
  { id: "ports", label: "ports", hint: "↗ ports.tools", keywords: "cli kill port project", run: () => ext("https://ports.tools") },
  { id: "github", label: "github", hint: "↗ @pyjeebz", keywords: "code social gh", run: () => ext("https://github.com/pyjeebz") },
  { id: "x", label: "x", hint: "↗ @pyjeebz", keywords: "twitter social", run: () => ext("https://x.com/pyjeebz") },
  { id: "email", label: "email", hint: "↗ say hello", keywords: "contact mail", run: () => ext("mailto:lawalsakamujeeb@gmail.com") },
  { id: "linkedin", label: "linkedin", hint: "↗ connect", keywords: "social work", run: () => ext("https://www.linkedin.com/in/mujeeb-lawal-saka/") },
  {
    id: "theme",
    label: "theme",
    hint: "cycle accent",
    keywords: "color palette accent",
    run: () => {
      (window as unknown as { __pjPalette?: { cycle: () => void } }).__pjPalette?.cycle();
      return "accent cycled — psst, clicking my name does this too.";
    },
  },
  {
    id: "whoami",
    label: "whoami",
    hint: "",
    keywords: "about who bio",
    run: () => "Mujeeb — builds things. mostly held together with code and optimism.",
  },
];

const isTypingTarget = (el: EventTarget | null) => {
  const n = el as HTMLElement | null;
  if (!n) return false;
  const tag = n.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || n.isContentEditable;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const [output, setOutput] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) =>
      (c.label + " " + (c.keywords ?? "")).toLowerCase().includes(q)
    );
  }, [query]);

  // Global open triggers: "/" and ⌘K / Ctrl+K. Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "/" && !open && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Reset + focus + scroll-lock when opening.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setOutput(null);
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(t);
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  const exec = (cmd?: Command) => {
    if (!cmd) return;
    const out = cmd.run();
    if (typeof out === "string") {
      setOutput(out);
      setQuery("");
    } else {
      setOpen(false);
    }
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => Math.min(s + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => Math.max(s - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      exec(results[selected]);
    }
  };

  return (
    <>
      {/* discoverability + mobile trigger */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open command palette"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-1.5 rounded-md border border-hairline bg-black-001/80 px-2.5 py-1.5 font-mono text-2xs text-muted-faint backdrop-blur transition-colors hover:border-accent/50 hover:text-accent"
        >
          <span className="text-accent">/</span>
          <span className="hidden sm:inline">commands</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[16vh]"
          style={{ background: "rgba(28, 26, 22, 0.32)", backdropFilter: "blur(2px)" }}
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-hairline bg-black-001 shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-hairline px-4 py-3">
              <span className="font-mono text-sm text-accent">$</span>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
                placeholder="type a command — 'blog', 'why', 'theme', 'whoami'…"
                className="min-w-0 flex-1 bg-transparent font-mono text-sm text-off-white outline-none placeholder:text-muted-faint"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            {output && (
              <div className="border-b border-hairline px-4 py-3 font-mono text-sm text-muted">
                {output}
              </div>
            )}

            <ul className="max-h-72 overflow-y-auto py-1">
              {results.length === 0 ? (
                <li className="px-4 py-3 font-mono text-sm text-muted-faint">
                  no matches. try 'help' — kidding, just type less.
                </li>
              ) : (
                results.map((cmd, i) => (
                  <li key={cmd.id}>
                    <button
                      type="button"
                      onMouseEnter={() => setSelected(i)}
                      onClick={() => exec(cmd)}
                      className="flex w-full items-center justify-between gap-4 border-l-2 px-4 py-2 text-left transition-colors"
                      style={{
                        borderLeftColor:
                          i === selected ? "rgb(var(--accent-rgb))" : "transparent",
                        backgroundColor:
                          i === selected ? "rgb(var(--accent-rgb) / 0.08)" : "transparent",
                      }}
                    >
                      <span
                        className="font-mono text-sm"
                        style={{ color: i === selected ? "rgb(var(--accent-rgb))" : "#22201b" }}
                      >
                        {cmd.label}
                      </span>
                      {cmd.hint && (
                        <span className="shrink-0 font-mono text-2xs text-muted-faint">
                          {cmd.hint}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>

            <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 font-mono text-2xs text-muted-faint">
              <span>↑↓ navigate</span>
              <span>↵ run</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
