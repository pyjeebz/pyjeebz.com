interface GlassTooltipProps {
  artist: string | null;
  album: string | null;
  show: boolean;
}

export function GlassTooltip({ artist, album, show }: GlassTooltipProps) {
  if (!artist && !album) return null;

  return (
    <div
      className={`glass-tooltip ${show ? "visible" : ""}`}
      role="tooltip"
      aria-label={[artist, album].filter(Boolean).join(" — ")}
    >
      {artist && <span className="tooltip-artist">{artist}</span>}
      {album && <span className="tooltip-album">{album}</span>}
    </div>
  );
}
