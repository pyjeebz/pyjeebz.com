// Sound engine backed by cuelume — 14 interaction cues synthesized live with
// Web Audio (no asset files). Mute is read through localStorage so every
// island and the global script agree without a shared React tree. Cuelume
// stays disabled until the user opts in via the Sound toggle (or `M`), which
// also keeps its declarative bind() cues behind the same gate.

import { play, setEnabled, setVolume, type SoundName } from "cuelume";
import type { Voice } from "./spectrum";

const MUTED_KEY = "pyjeebz:sound-muted";
const CHANGE_EVENT = "pyjeebz:sound-change";

// The playable spectrum: nine columns, nine notes of C major pentatonic
// (C4 up to G5) — any run across them sounds like it was meant to.
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19];
const C4 = 261.63;

// Each voice is a few sine/triangle/saw partials through a lowpass, with a
// quick attack and an exponential ring-out. [frequency ratio, gain, wave].
const VOICE_SPECS: Record<
  Voice,
  {
    partials: [number, number, OscillatorType][];
    attack: number;
    decay: number;
    cutoff: number;
  }
> = {
  // A struck bell: the fundamental plus its inharmonic 2.76× overtone.
  bell: {
    partials: [
      [1, 1, "sine"],
      [2.76, 0.22, "sine"],
    ],
    attack: 0.004,
    decay: 1.4,
    cutoff: 6000,
  },
  // Glassy: an octave up, a faint high shimmer, a long tail.
  glass: {
    partials: [
      [2, 0.8, "sine"],
      [5.4, 0.08, "sine"],
    ],
    attack: 0.003,
    decay: 1.9,
    cutoff: 9000,
  },
  // Soft: a rounded triangle, felted.
  soft: {
    partials: [[1, 1, "triangle"]],
    attack: 0.02,
    decay: 0.9,
    cutoff: 1800,
  },
  // Warm: a sawtooth under a low filter, like a reed.
  warm: {
    partials: [[1, 0.5, "sawtooth"]],
    attack: 0.015,
    decay: 1.1,
    cutoff: 950,
  },
};

class SoundEngine {
  private hoverMql: MediaQueryList | null = null;
  private ctx: AudioContext | null = null;

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

  // Clicking the footer over to its next spectrum palette.
  paletteSwap() {
    this.cue("toggle");
  }

  // Lifting the pen onto the guestbook pad.
  penDown() {
    this.cue("whisper");
  }

  // One note of the playable spectrum: column 0–8, in the palette's voice.
  // cuelume's cues are fixed recipes, so the notes get their own small synth
  // (and their own AudioContext) behind the same mute preference.
  note(step: number, voice: Voice) {
    if (this.isMuted()) return;
    const ctx = this.audio();
    if (!ctx) return;

    const spec = VOICE_SPECS[voice];
    const freq = C4 * 2 ** (PENTATONIC[step % PENTATONIC.length] / 12);
    const now = ctx.currentTime;
    const end = now + spec.attack + spec.decay;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = spec.cutoff;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.09, now + spec.attack);
    env.gain.exponentialRampToValueAtTime(0.0001, end);
    filter.connect(env).connect(ctx.destination);

    for (const [ratio, gain, type] of spec.partials) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq * ratio;
      const level = ctx.createGain();
      level.gain.value = gain;
      osc.connect(level).connect(filter);
      osc.start(now);
      osc.stop(end + 0.05);
    }
  }

  private audio(): AudioContext | null {
    if (typeof window === "undefined" || !window.AudioContext) return null;
    try {
      this.ctx ??= new AudioContext();
      // Browsers hold a new context until the page has had a click or key
      // press; until then this quietly does nothing.
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch {
      return null;
    }
  }

  // The 404 scribble striking the signature out — a short "wrong" buzz as the
  // pen crosses the ink.
  signatureCross() {
    this.cue("error");
  }
}

export const sound = new SoundEngine();
