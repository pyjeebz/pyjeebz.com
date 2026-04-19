"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useTheme } from "@/hooks/use-theme";

const GRID_SIZE = "35px 35px";
const PARALLAX_FACTOR = 75;

const emptySubscribe = () => () => {};

function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

const mobileQuery = "(hover: none) and (pointer: coarse)";

function useIsMobile() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const mql = window.matchMedia(mobileQuery);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    () => window.matchMedia(mobileQuery).matches,
    () => false,
  );
}

function GridContainer({
  children,
  isMobile,
}: {
  children: React.ReactNode;
  isMobile: boolean;
}) {
  const size = isMobile ? "200vh" : "100%";
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: size,
        minHeight: size,
        backgroundColor: "var(--background)",
        transition: "background-color 0.3s ease",
        overflow: "hidden",
        zIndex: -100,
      }}
    >
      {children}
    </div>
  );
}

function GridOverlay({
  x,
  y,
  isMobile,
}: {
  x: number;
  y: number;
  isMobile: boolean;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: isMobile ? 0 : "-50%",
        left: isMobile ? 0 : "-50%",
        width: isMobile ? "100%" : "200%",
        height: isMobile ? "200vh" : "200%",
        minHeight: isMobile ? "200vh" : "200%",
        backgroundImage:
          "linear-gradient(to right, var(--grid-color) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-color) 1px, transparent 1px)",
        backgroundSize: GRID_SIZE,
        pointerEvents: "none",
        transform: isMobile
          ? "none"
          : `translate(${-x / PARALLAX_FACTOR}px, ${-y / PARALLAX_FACTOR}px)`,
      }}
    />
  );
}

function GlassOverlay({ isMobile }: { isMobile: boolean }) {
  const size = isMobile ? "200vh" : "100%";
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: size,
        minHeight: size,
        background: "var(--glass-bg)",
        transition:
          "background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease",
        backdropFilter: "blur(0.5px)",
        WebkitBackdropFilter: "blur(1px)",
        border: "1px solid var(--glass-border)",
        boxShadow: "0 0 6px var(--glass-shadow)",
        zIndex: -99,
      }}
    />
  );
}

export default function Grid() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const { isLoaded } = useTheme();

  const isMounted = useIsMounted();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isMounted || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [isMounted, isMobile]);

  if (!isLoaded || !isMounted) return null;

  return (
    <>
      <GridContainer isMobile={isMobile}>
        <GridOverlay
          x={isMobile ? 0 : mousePosition.x}
          y={isMobile ? 0 : mousePosition.y}
          isMobile={isMobile}
        />
      </GridContainer>
      <GlassOverlay isMobile={isMobile} />
    </>
  );
}
