import {
  drawablyButton,
  drawablyCheckbox,
  drawablyInput,
  drawablyTextarea,
  drawablyDivider,
  drawablyCard,
  drawablyBadge,
  drawablyUnderline,
  drawablyHighlight,
} from "drawably";
import "drawably/style.css";

type Sketch = { resketch(seed?: number): void; destroy(): void };
type Attacher = (el: HTMLElement, opts?: Record<string, unknown>) => Sketch;

const attachers: Record<string, Attacher> = {
  button: drawablyButton as Attacher,
  card: drawablyCard as Attacher,
  badge: drawablyBadge as Attacher,
  divider: drawablyDivider as Attacher,
  input: drawablyInput as Attacher,
  textarea: drawablyTextarea as Attacher,
  checkbox: drawablyCheckbox as Attacher,
  underline: drawablyUnderline as Attacher,
  highlight: drawablyHighlight as Attacher,
};

const handles = new WeakMap<Element, Sketch>();

/**
 * Attach a seeded sketch to every [data-napkin] element under `root` that
 * hasn't been sketched yet. Options come from a JSON `data-napkin-opts`
 * attribute (e.g. {"boil":0,"roughness":1.4}).
 */
function scan(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>("[data-napkin]").forEach((el) => {
    if (handles.has(el)) return; // never double-attach (HMR / React re-render)
    const kind = el.dataset.napkin;
    if (!kind) return;
    const fn = attachers[kind];
    if (!fn) return;
    let opts: Record<string, unknown> = {};
    try {
      if (el.dataset.napkinOpts) opts = JSON.parse(el.dataset.napkinOpts);
    } catch {
      /* malformed opts — sketch with defaults */
    }
    try {
      const sketch = fn(el, opts);
      handles.set(el, sketch);
      // Stash on the element so callers (e.g. the guestbook button) can reach
      // resketch/setState without a second attach.
      (el as HTMLElement & { __napkinSketch?: Sketch }).__napkinSketch = sketch;
    } catch (e) {
      console.warn("[napkin] failed to sketch", kind, e);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => scan());
} else {
  scan();
}

// Escape hatch for React islands that add napkin-marked nodes after mount.
(window as unknown as { __napkin: { scan: typeof scan } }).__napkin = { scan };

export { scan };