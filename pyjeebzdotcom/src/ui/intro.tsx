"use client";

import { SocialCons } from "@/components/social-cons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const LOCATIONS = [
  "Architect, Toronto",
  "Architect, Waterloo",
  "Architect, GTA",
];
const TYPE_SPEED = 50;
const PAUSE_DURATION = 2000;

function commonPrefixLength(a: string, b: string) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

function useTypewriter(strings: string[]) {
  const [text, setText] = useState("");
  const [stringIndex, setStringIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = strings[stringIndex];
    const next = strings[(stringIndex + 1) % strings.length];
    const shared = commonPrefixLength(current, next);
    let delay: number;

    if (!isDeleting) {
      delay = text.length < current.length ? TYPE_SPEED : PAUSE_DURATION;
    } else {
      delay = TYPE_SPEED / 2;
    }

    const id = setTimeout(() => {
      if (!isDeleting) {
        if (text.length < current.length) {
          setText(current.slice(0, text.length + 1));
        } else {
          setIsDeleting(true);
        }
      } else if (text.length > shared) {
        setText(current.slice(0, text.length - 1));
      } else {
        setIsDeleting(false);
        setStringIndex((stringIndex + 1) % strings.length);
      }
    }, delay);

    return () => clearTimeout(id);
  }, [text, stringIndex, isDeleting, strings]);

  return text;
}

export function Intro() {
  const pathname = usePathname();
  const typedText = useTypewriter(LOCATIONS);

  return (
    <div className="max-w-xl mx-auto mt-10 px-4">
      <div className="flex flex-col py-2 gap-4 border-b-2 sm:flex-row sm:justify-between sm:items-center sm:gap-0">
        <div>
          <h1 className="text-2xl max-w-fit transition-all duration-300 hover:rotate-[-2deg] hover:scale-108">
            <Link href="/">
              <span className="glow">Mujeeb Lawal-Saka</span>
            </Link>
          </h1>
          <span className="italic">{typedText || "\u00A0"}<span className="animate-blink">|</span></span>
        </div>
        <div className="social-icons sm:ml-auto">
          <SocialCons />
        </div>
      </div>
      <div className="navbar mt-1 font-bold">
        <ul className="flex space-x-6">
          <li>
            <Link href="/" className={pathname === "/" ? "active" : ""}>
              Home
            </Link>
          </li>
          <li>
            <Link
              href="/about"
              className={pathname === "/about" ? "active" : ""}
            >
              About
            </Link>
          </li>
          <li>
            <Link
              href="/works"
              className={pathname === "/works" ? "active" : ""}
            >
              Works
            </Link>
          </li>
          <li>
            <Link
              href="/photos"
              className={pathname === "/photos" ? "active" : ""}
            >
              Photos
            </Link>
          </li>
          <li>
            <Link
              href="/articles"
              className={pathname.startsWith("/articles") ? "active" : ""}
            >
              Articles
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
