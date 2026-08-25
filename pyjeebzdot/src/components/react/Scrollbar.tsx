import { useEffect, useRef, useState } from "react";

type ScrollbarState = "idle" | "compressed" | "extended" | "split" | "tracking";

const POSE_ORDER: ScrollbarState[] = ["idle", "compressed", "extended", "split", "tracking"];

const AXIS_MARGIN_RIGHT = 24;
const IDLE_TIP_MARGIN_BOTTOM = 28;
const SPLIT_DOT_LENGTH = 1;

const CONFIG = {
  arrowLength: 36,
  wingSpread: 10,
  lineLength: 320,
  dotSpacing: 24,
  maxExtension: 48,
  extensionFalloff: 0.55,
  colorFalloff: 0.25,
  smoothingTau: 0.06,
  hitPadding: 14,
  bobAmplitude: 2.5,
  bobPeriod: 2.2,
  strokeWidth: 2.5,
};

const TRANSITIONS = [
  { duration: 0.18, ease: easeOutCubic },   // idle -> compressed
  { duration: 0.4, ease: easeInOutCubic },  // compressed -> extended
  { duration: 0.22, ease: easeOutCubic },   // extended -> split
  { duration: 0.22, ease: easeOutCubic },   // split -> tracking
];

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getStateForScroll(scrollY: number): ScrollbarState {
  return scrollY > 4 ? "tracking" : "idle";
}

function getScrollFraction() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  return maxScroll > 0 ? Math.min(1, Math.max(0, window.scrollY / maxScroll)) : 0;
}

function getFocusDot(dotCount: number) {
  return Math.round(getScrollFraction() * (dotCount - 1));
}

function scrollToDot(dot: number, dotCount: number) {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const fraction = dotCount > 1 ? dot / (dotCount - 1) : 1;
  window.scrollTo({
    top: fraction * maxScroll,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

function scrollDownOneViewport() {
  window.scrollTo({
    top: window.scrollY + window.innerHeight * 0.85,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
}

type LineEndpoints = readonly [x1: number, y1: number, x2: number, y2: number];

type Pose = {
  leftWing: LineEndpoints;
  rightWing: LineEndpoints;
  pieces: readonly LineEndpoints[];
};

function getPoses(svgRect: DOMRect, geometry: { arrowLength: number; wingSpread: number; lineLength: number; dotCount: number }): Record<ScrollbarState, Pose> {
  const { width, height } = svgRect;
  const verticalAxis = width - AXIS_MARGIN_RIGHT;
  const bottomY = height - IDLE_TIP_MARGIN_BOTTOM;
  const extendedLineTop = height / 2 - geometry.lineLength / 2;
  const extendedLineBottom = height / 2 + geometry.lineLength / 2;

  const shaftPieces = Array.from({ length: geometry.dotCount }, (_, i): LineEndpoints => {
    const step = (bottomY - geometry.arrowLength - (bottomY - geometry.arrowLength - (bottomY - geometry.arrowLength - geometry.lineLength / 2))) / geometry.dotCount;
    return [verticalAxis, bottomY - geometry.arrowLength - i * step, verticalAxis, bottomY - geometry.arrowLength - (i + 1) * step];
  });

  const step = (extendedLineBottom - extendedLineTop) / geometry.dotCount;
  const dotPieces = Array.from({ length: geometry.dotCount }, (_, i): LineEndpoints => {
    const center = extendedLineTop + (i + 0.5) * step;
    return [verticalAxis, center - SPLIT_DOT_LENGTH / 2, verticalAxis, center + SPLIT_DOT_LENGTH / 2];
  });

  const splitBottomDotCenter = extendedLineBottom - step / 2;

  const dotsPose: Pose = {
    leftWing: [verticalAxis, splitBottomDotCenter, verticalAxis, splitBottomDotCenter],
    rightWing: [verticalAxis, splitBottomDotCenter, verticalAxis, splitBottomDotCenter],
    pieces: dotPieces,
  };

  return {
    idle: {
      leftWing: [verticalAxis - geometry.wingSpread, bottomY - geometry.wingSpread, verticalAxis, bottomY],
      rightWing: [verticalAxis + geometry.wingSpread, bottomY - geometry.wingSpread, verticalAxis, bottomY],
      pieces: shaftPieces,
    },
    compressed: {
      leftWing: [verticalAxis, bottomY, verticalAxis, bottomY],
      rightWing: [verticalAxis, bottomY, verticalAxis, bottomY],
      pieces: shaftPieces,
    },
    extended: {
      leftWing: [verticalAxis, extendedLineBottom, verticalAxis, extendedLineBottom],
      rightWing: [verticalAxis, extendedLineBottom, verticalAxis, extendedLineBottom],
      pieces: Array.from({ length: geometry.dotCount }, (_, i): LineEndpoints => {
        const step = (extendedLineBottom - extendedLineTop) / geometry.dotCount;
        return [verticalAxis, extendedLineTop + i * step, verticalAxis, extendedLineTop + (i + 1) * step];
      }),
    },
    split: dotsPose,
    tracking: dotsPose,
  };
}

function getExtensionLength(dot: number, focusDot: number, maxExtension: number, falloff: number) {
  return maxExtension * Math.pow(falloff, Math.abs(dot - focusDot));
}

function mixColors(from: [number, number, number], to: [number, number, number], t: number) {
  return `rgb(${Math.round(lerp(from[0], to[0], t))}, ${Math.round(lerp(from[1], to[1], t))}, ${Math.round(lerp(from[2], to[2], t))})`;
}

function parseHexColor(hex: string): [number, number, number] {
  const digits = hex.trim().slice(1);
  const full = digits.length === 3 ? [...digits].map(d => d + d).join("") : digits;
  const n = parseInt(full, 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

export default function Scrollbar() {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftWingRef = useRef<SVGLineElement>(null);
  const rightWingRef = useRef<SVGLineElement>(null);
  const pieceRefs = useRef<(SVGLineElement | null)[]>([]);
  const hitRefs = useRef<(SVGRectElement | null)[]>([]);
  const arrowHitRef = useRef<SVGRectElement>(null);

  const [visible, setVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const anim = useRef({
    current: 0,
    target: 0,
    rafId: null as number | null,
    lastTime: 0,
    state: "idle" as ScrollbarState,
    extensions: new Float64Array(0),
  });

  const didEnter = useRef(false);
  const bobTime = useRef(0);
  const hoveredDot = useRef<number | null>(null);
  const arrowHovered = useRef(false);

  const dotCount = Math.max(1, Math.round(CONFIG.lineLength / CONFIG.dotSpacing));
  const dotColor = parseHexColor("#c4b59d");
  // Hover sits in the same warm-tan family as the base, just lifted toward
  // the ember stop of the signature gradient — no off-palette gold.
  const dotHoverColor = parseHexColor("#d8a878");

  // Need to apply measurement before first paint
  useEffect(() => {
    const svg = svgRef.current;
    const leftWing = leftWingRef.current;
    const rightWing = rightWingRef.current;
    const pieces = pieceRefs.current.slice(0, dotCount).filter((el): el is SVGLineElement => el !== null);
    const hits = hitRefs.current.slice(0, dotCount).filter((h): h is SVGRectElement => h !== null);
    const arrowHit = arrowHitRef.current;
    if (!svg || !leftWing || !rightWing || !arrowHit || pieces.length < dotCount || hits.length < dotCount) return;

    const a = anim.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const canHover = window.matchMedia("(hover: hover)");

    const transitions = TRANSITIONS.map(t => ({ ...t, ease: t.ease }));

    let poses = getPoses(svg.getBoundingClientRect(), {
      arrowLength: CONFIG.arrowLength,
      wingSpread: CONFIG.wingSpread,
      lineLength: CONFIG.lineLength,
      dotCount,
    });

    const placeHitAreas = () => {
      const spacing = CONFIG.lineLength / dotCount;
      hits.forEach((el, i) => {
        const [x, y1, , y2] = poses.split.pieces[i];
        el.setAttribute("x", String(x - CONFIG.maxExtension - CONFIG.hitPadding));
        el.setAttribute("y", String((y1 + y2) / 2 - spacing / 2));
        el.setAttribute("width", String(CONFIG.maxExtension + 2 * CONFIG.hitPadding));
        el.setAttribute("height", String(spacing));
      });

      const [, , verticalAxis, bottomY] = poses.idle.leftWing;
      const arrowHitTop = bottomY - CONFIG.arrowLength - CONFIG.bobAmplitude - CONFIG.hitPadding;
      const arrowHitBottom = bottomY + CONFIG.bobAmplitude + CONFIG.hitPadding;
      arrowHit.setAttribute("x", String(verticalAxis - CONFIG.wingSpread - CONFIG.hitPadding));
      arrowHit.setAttribute("y", String(arrowHitTop));
      arrowHit.setAttribute("width", String(2 * (CONFIG.wingSpread + CONFIG.hitPadding)));
      arrowHit.setAttribute("height", String(arrowHitBottom - arrowHitTop));
    };

    const applyHoverColors = () => {
      const arrowStroke = arrowHovered.current ? "rgb(var(--accent-rgb))" : "";
      leftWing.style.stroke = arrowStroke;
      rightWing.style.stroke = arrowStroke;
      pieces.forEach((el, i) => {
        if (arrowHovered.current) {
          el.style.stroke = arrowStroke;
        } else if (hoveredDot.current === null) {
          el.style.stroke = "";
        } else {
          el.style.stroke = mixColors(dotColor, dotHoverColor, Math.pow(CONFIG.colorFalloff, Math.abs(i - hoveredDot.current!)));
        }
      });
    };

    const advanceExtensions = (dt: number): boolean => {
      const focusDot = getFocusDot(dotCount);
      const alpha = reduceMotion.matches ? 1 : 1 - Math.exp(-dt / CONFIG.smoothingTau);
      let settled = true;
      for (let i = 0; i < dotCount; i++) {
        const targetLength = getExtensionLength(i, focusDot, CONFIG.maxExtension, CONFIG.extensionFalloff);
        const frameLength = a.extensions[i] + (targetLength - a.extensions[i]) * alpha;
        if (Math.abs(targetLength - frameLength) < 0.05) {
          a.extensions[i] = targetLength;
        } else {
          a.extensions[i] = frameLength;
          settled = false;
        }
      }
      return settled;
    };

    const setLine = (el: SVGLineElement, f: LineEndpoints, g: LineEndpoints, s: number, extendLeft = 0, offsetY = 0) => {
      el.setAttribute("x1", String(lerp(f[0], g[0], s) - extendLeft));
      el.setAttribute("y1", String(lerp(f[1], g[1], s) + offsetY));
      el.setAttribute("x2", String(lerp(f[2], g[2], s)));
      el.setAttribute("y2", String(lerp(f[3], g[3], s) + offsetY));
    };

    const applyGeometry = (t: number) => {
      const segment = Math.min(Math.max(Math.floor(t), 0), transitions.length - 1);
      const from = poses[POSE_ORDER[segment]];
      const to = poses[POSE_ORDER[segment + 1]];
      const local = transitions[segment].ease(t - segment);
      const trackingExtensionScale = segment === transitions.length - 1 ? local : 0;
      const idleBobScale = segment === 0 ? 1 - local : 0;
      const bobOffset = idleBobScale * CONFIG.bobAmplitude * Math.sin((2 * Math.PI * bobTime.current) / CONFIG.bobPeriod);

      setLine(leftWing, from.leftWing, to.leftWing, local, 0, bobOffset);
      setLine(rightWing, from.rightWing, to.rightWing, local, 0, bobOffset);
      pieces.forEach((el, i) =>
        setLine(el, from.pieces[i], to.pieces[i], local, trackingExtensionScale * a.extensions[i], bobOffset)
      );
    };

    const syncState = () => {
      const next = getStateForScroll(window.scrollY);
      if (next !== a.state) {
        a.state = next;
        svg.dataset.state = next;
        if (next !== "tracking" && hoveredDot.current !== null) {
          hoveredDot.current = null;
          applyHoverColors();
        }
        if (next !== "idle" && arrowHovered.current) {
          arrowHovered.current = false;
          applyHoverColors();
        }
      }
    };

    const advance = (dt: number) => {
      if (reduceMotion.matches) {
        a.current = a.target;
        return;
      }
      let remaining = dt;
      while (remaining > 0 && a.current !== a.target) {
        const dir = a.target > a.current ? 1 : -1;
        const segment = dir > 0
          ? Math.min(Math.floor(a.current), transitions.length - 1)
          : Math.max(Math.ceil(a.current) - 1, 0);
        const boundary = dir > 0 ? segment + 1 : segment;
        const stop = dir > 0 ? Math.min(a.target, boundary) : Math.max(a.target, boundary);
        const { duration } = transitions[segment];
        const timeToStop = Math.abs(stop - a.current) * duration;
        if (timeToStop <= remaining) {
          a.current = stop;
          remaining -= timeToStop;
        } else {
          a.current += (remaining / duration) * dir;
          remaining = 0;
        }
      }
    };

    const step = (now: number) => {
      const dt = Math.min((now - a.lastTime) / 1000, 0.1);
      a.lastTime = now;
      advance(dt);
      const extensionsSettled = advanceExtensions(dt);
      if (!reduceMotion.matches) bobTime.current += dt;
      applyGeometry(a.current);
      const bobbing = a.current === 0 && !reduceMotion.matches;
      if (a.current === a.target && extensionsSettled && !bobbing) {
        a.rafId = null;
        return;
      }
      a.rafId = requestAnimationFrame(step);
    };

    const kick = () => {
      if (a.rafId === null) {
        a.lastTime = performance.now();
        a.rafId = requestAnimationFrame(step);
      }
    };

    const onScroll = () => {
      syncState();
      a.target = POSE_ORDER.indexOf(a.state);
      kick();
      setVisible(true);
    };

    syncState();
    a.target = POSE_ORDER.indexOf(a.state);
    a.extensions = new Float64Array(dotCount);
    if (!didEnter.current) {
      a.current = reduceMotion.matches ? a.target : Math.max(a.target - 1, 0);
      didEnter.current = true;
    }
    const mountFocusDot = getFocusDot(dotCount);
    for (let i = 0; i < dotCount; i++) {
      a.extensions[i] = getExtensionLength(i, mountFocusDot, CONFIG.maxExtension, CONFIG.extensionFalloff);
    }
    applyGeometry(a.current);
    placeHitAreas();
    kick();

    const resizeObserver = new ResizeObserver(() => {
      poses = getPoses(svg.getBoundingClientRect(), {
        arrowLength: CONFIG.arrowLength,
        wingSpread: CONFIG.wingSpread,
        lineLength: CONFIG.lineLength,
        dotCount,
      });
      applyGeometry(a.current);
      placeHitAreas();
    });
    resizeObserver.observe(svg);

    const hoverHandlers = hits.map((el, i) => {
      const enter = () => {
        if (!canHover.matches) return;
        hoveredDot.current = i;
        applyHoverColors();
      };
      const leave = () => {
        if (hoveredDot.current !== i) return;
        hoveredDot.current = null;
        applyHoverColors();
      };
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
      return { el, enter, leave };
    });

    const arrowEnter = () => {
      if (!canHover.matches) return;
      arrowHovered.current = true;
      applyHoverColors();
    };
    const arrowLeave = () => {
      arrowHovered.current = false;
      applyHoverColors();
    };
    arrowHit.addEventListener("mouseenter", arrowEnter);
    arrowHit.addEventListener("mouseleave", arrowLeave);

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      hoverHandlers.forEach(({ el, enter, leave }) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
      arrowHit.removeEventListener("mouseenter", arrowEnter);
      arrowHit.removeEventListener("mouseleave", arrowLeave);
      window.removeEventListener("scroll", onScroll);
      resizeObserver.disconnect();
      if (a.rafId !== null) cancelAnimationFrame(a.rafId);
      a.rafId = null;
    };
  }, [dotCount]);

  return (
    <svg
      ref={svgRef}
      className="custom-scrollbar"
      data-state="idle"
      aria-hidden="true"
      style={{
        opacity: visible ? (isHovered ? 1 : 0.5) : 0,
        transition: "opacity 300ms ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <line ref={leftWingRef} stroke="rgb(var(--accent-rgb))" strokeWidth={CONFIG.strokeWidth} strokeLinecap="round" />
      <line ref={rightWingRef} stroke="rgb(var(--accent-rgb))" strokeWidth={CONFIG.strokeWidth} strokeLinecap="round" />
      {Array.from({ length: dotCount }, (_, i) => (
        <line
          key={i}
          ref={(el) => { pieceRefs.current[i] = el; }}
          stroke="rgb(var(--accent-rgb))"
          strokeWidth={CONFIG.strokeWidth}
          strokeLinecap="round"
        />
      ))}
      {Array.from({ length: dotCount }, (_, i) => (
        <rect
          key={i}
          className="hit-area"
          ref={(el) => { hitRefs.current[i] = el; }}
          onClick={() => scrollToDot(i, dotCount)}
          fill="none"
          style={{ pointerEvents: visible ? "auto" : "none" }}
        />
      ))}
      <rect
        ref={arrowHitRef}
        className="arrow-hit"
        onClick={scrollDownOneViewport}
        fill="none"
        style={{ pointerEvents: visible ? "auto" : "none" }}
      />
    </svg>
  );
}