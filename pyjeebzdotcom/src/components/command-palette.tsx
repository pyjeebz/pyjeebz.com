"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  User,
  Briefcase,
  Camera,
  FileText,
  X,
} from "lucide-react";
import { DEFAULT_ICON_SIZE, SOCIAL_ICON_SIZE } from "@/constants/icons";

interface SearchItem {
  title: string;
  category: string;
  href: string;
  icon: React.ReactNode;
}

const ALL_ITEMS: SearchItem[] = [
  {
    title: "Home",
    category: "Pages",
    href: "/",
    icon: <Home size={DEFAULT_ICON_SIZE} />,
  },
  {
    title: "About",
    category: "Pages",
    href: "/about",
    icon: <User size={DEFAULT_ICON_SIZE} />,
  },
  {
    title: "Works",
    category: "Pages",
    href: "/works",
    icon: <Briefcase size={DEFAULT_ICON_SIZE} />,
  },
  {
    title: "Photos",
    category: "Pages",
    href: "/photos",
    icon: <Camera size={DEFAULT_ICON_SIZE} />,
  },
  {
    title: "Articles",
    category: "Pages",
    href: "/articles",
    icon: <FileText size={DEFAULT_ICON_SIZE} />,
  },
];

type Phase = "closed" | "bar-in" | "results-in" | "closing";

export function CommandPalette() {
  const [phase, setPhase] = useState<Phase>("closed");
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query) return ALL_ITEMS;
    const q = query.toLowerCase();
    return ALL_ITEMS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q),
    );
  }, [query]);

  const open = useCallback(() => {
    setQuery("");
    setSelectedIndex(0);
    setPhase("bar-in");
  }, []);

  const close = useCallback(() => {
    setPhase("closing");
    setTimeout(() => {
      setPhase("closed");
      setQuery("");
      setSelectedIndex(0);
    }, 200);
  }, []);

  // After bar fades in, reveal results
  useEffect(() => {
    if (phase === "bar-in") {
      const timer = setTimeout(() => setPhase("results-in"), 250);
      return () => clearTimeout(timer);
    }
  }, [phase]);

  // Focus input when bar appears
  useEffect(() => {
    if (phase === "bar-in" || phase === "results-in") {
      inputRef.current?.focus();
    }
  }, [phase]);

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (phase === "closed" || phase === "closing") {
          open();
        } else {
          close();
        }
      }
      if (e.key === "Escape" && phase !== "closed" && phase !== "closing") {
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phase, open, close]);

  // Reset selection on query change
  useEffect(() => setSelectedIndex(0), [query]);

  function handleKeyNav(e: React.KeyboardEvent) {
    if (filtered.length === 0) return;
    const maxIndex = filtered.length - 1;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, maxIndex));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      close();
      router.push(filtered[selectedIndex].href);
    }
  }

  if (phase === "closed") return null;

  const isVisible = phase === "bar-in" || phase === "results-in";
  const showResults = phase === "results-in";
  const isClosing = phase === "closing";

  // Group items by category
  const grouped: Record<string, SearchItem[]> = {};
  for (const item of filtered) {
    (grouped[item.category] ??= []).push(item);
  }

  let flatIndex = 0;

  return (
    <>
      <div className="cp-backdrop" onClick={close} />
      <div className="cp-overlay">
        <div
          className={`cp-panel ${isVisible ? "cp-visible" : ""} ${isClosing ? "cp-closing" : ""}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyNav}
        >
          <div className="cp-input-wrapper">
            <Search size={DEFAULT_ICON_SIZE} className="cp-search-icon" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages and articles..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="cp-input"
            />
            <button
              onClick={close}
              className="cp-close"
              aria-label="Close search"
            >
              <X size={14} />
            </button>
          </div>
          <div
            className={`cp-results ${showResults ? "cp-results-visible" : ""}`}
          >
            {filtered.length === 0 && (
              <div className="cp-empty">No results found.</div>
            )}
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="cp-category">{category}</div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={item.href}
                      className={`cp-item ${idx === selectedIndex ? "cp-item-active" : ""}`}
                      onClick={() => {
                        close();
                        router.push(item.href);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                    >
                      <span className="cp-item-icon">{item.icon}</span>
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

export function SearchButton() {
  return (
    <button
      onClick={() =>
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "k",
            metaKey: true,
            bubbles: true,
          }),
        )
      }
      aria-label="Search"
      className="search-btn transition-all duration-300 border-2 border-pink py-1 px-2 rounded flex items-center space-x-1 cursor-pointer"
    >
      <Search size={SOCIAL_ICON_SIZE} />
      <span className="text-sm">Search</span>
    </button>
  );
}
