"use client";

import React, { useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

import { DEFAULT_ICON_SIZE } from "@/constants/icons";

export function ThemeToggle() {
  const { theme, toggleTheme, isLoaded } = useTheme();
  const [isSpinning, setIsSpinning] = useState(false);

  if (!isLoaded) {
    return (
      <button className="p-2">
        <div className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={() => {
        setIsSpinning(true);
        toggleTheme();
        setTimeout(() => setIsSpinning(false), 500);
      }}
      className={`theme-toggle-btn transition-all duration-300 hover:rotate-[30deg] ${
        isSpinning ? "animate-spin [animation-duration:0.2s] [animation-iteration-count:1]" : ""
      }`}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        <Moon
          size={DEFAULT_ICON_SIZE}
          className="text-foreground transition-colors duration-300"
        />
      ) : (
        <Sun
          size={DEFAULT_ICON_SIZE}
          className="text-foreground transition-colors duration-300"
        />
      )}
    </button>
  );
}
