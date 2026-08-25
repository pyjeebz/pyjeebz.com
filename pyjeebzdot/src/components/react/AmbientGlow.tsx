interface AmbientGlowProps {
  color: string;
  isPlaying: boolean;
}

export function AmbientGlow({ color, isPlaying }: AmbientGlowProps) {
  return (
    <div
      className={`ambient-glow ${isPlaying ? "playing" : "paused"}`}
      style={{
        background: `radial-gradient(circle at center, ${color} 0%, ${color} 40%, transparent 70%)`,
        opacity: isPlaying ? 0.35 : 0.15,
        transition: "opacity 400ms ease-out, transform 300ms ease-out",
      }}
      aria-hidden="true"
    />
  );
}