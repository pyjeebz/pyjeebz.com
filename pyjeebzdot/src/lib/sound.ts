// Sound engine backed by cuelume — 14 interaction cues synthesized live with
// Web Audio (no asset files). Mute is read through localStorage so every
// island and the global script agree without a shared React tree. Cuelume
// stays disabled until the user opts in via the Sound toggle (or `M`), which
// also keeps its declarative bind() cues behind the same gate.

import { play, setEnabled, setVolume, type SoundName } from "cuelume";

const MUTED_KEY = "pyjeebz:sound-muted";
const CHANGE_EVENT = "pyjeebz:sound-change";

class SoundEngine {
  private hoverMql: MediaQueryList | null = null;

  constructor() {
    if (typeof window === "undefined") return;

    this.hoverMql = window.matchMedia("(hover: hover) and (pointer: fine)");

    setEnabled(!this.isMuted());
    setVolume(0.5);

    window.addEventListener("storage", (e) => {
      if (e.key === MUTED_KEY) {
        setEnabled(!this.isMuted());
        this.emit();
      }
    });
  }

  isMuted(): boolean {
    try {
      const value = localStorage.getItem(MUTED_KEY);
      return value === null ? true : value === "true"; // off until opted in
    } catch {
      return true;
    }
  }

  setMuted(value: boolean) {
    try {
      localStorage.setItem(MUTED_KEY, String(value));
    } catch {}
    setEnabled(!value);
    this.emit();
  }

  toggle() {
    const next = !this.isMuted();
    this.setMuted(next);
    if (!next) this.toggleOn();
  }

  subscribe(listener: () => void): () => void {
    if (typeof window === "undefined") return () => {};
    window.addEventListener(CHANGE_EVENT, listener);
    return () => window.removeEventListener(CHANGE_EVENT, listener);
  }

  private emit() {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }

  // cuelume already no-ops on blocked autoplay or missing Web Audio, so the
  // only gate needed here is our mute preference.
  private cue(name: SoundName) {
    if (!this.isMuted()) play(name);
  }

  reveal() {
    this.cue("sparkle");
  }

  // A quiet tick as the pointer sweeps the work list. cuelume throttles hover
  // cues globally, so dense lists stay calm; alternating voices keep a little
  // of the ratchet feel the old pitch ladder had.
  detent(index: number) {
    if (!this.hoverMql?.matches) return;
    this.cue(index % 2 === 0 ? "whisper" : "tick");
  }

  open() {
    this.cue("bloom");
  }

  close() {
    this.cue("droplet");
  }

  nav() {
    this.cue("page");
  }

  toggleOn() {
    this.cue("success");
  }

  // The mls signature draw-on: one arrival swell fired as the pen starts,
  // spanning the whole trace (the draw animation is timed to fit inside it).
  signature() {
    this.cue("arrival");
  }

  // The 404 scribble striking the signature out — a short "wrong" buzz as the
  // pen crosses the ink.
  signatureCross() {
    this.cue("error");
  }
}

export const sound = new SoundEngine();