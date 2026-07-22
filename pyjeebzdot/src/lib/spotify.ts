// Shared Spotify "now playing" logic used by both the REST endpoint and the
// SSE stream. Reads env from import.meta.env (dev) or process.env (Vercel).

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_URL = "https://api.spotify.com/v1/me/player/currently-playing";
const RECENT_URL = "https://api.spotify.com/v1/me/player/recently-played?limit=1";

const env = (key: string): string | undefined =>
  (import.meta.env as Record<string, string | undefined>)[key] ??
  (typeof process !== "undefined" ? process.env[key] : undefined);

// Reused across invocations on a warm instance (tokens last ~1h).
let cachedToken: { value: string; exp: number } | null = null;

async function getAccessToken(id: string, secret: string, refresh: string) {
  if (cachedToken && cachedToken.exp > Date.now() + 10_000) return cachedToken.value;
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    exp: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

type Track = {
  name: string;
  duration_ms?: number;
  artists?: { name: string }[];
  album?: { name?: string; images?: { url: string }[] };
  external_urls?: { spotify?: string };
};

export type NowPlaying = {
  configured: boolean;
  isPlaying?: boolean;
  error?: boolean;
  rateLimited?: boolean;
  title?: string;
  artist?: string;
  album?: string | null;
  albumImageUrl?: string | null;
  songUrl?: string | null;
  progressMs?: number | null;
  durationMs?: number | null;
};

const normalize = (
  item: Track,
  isPlaying: boolean,
  progressMs: number | null = null
): NowPlaying => ({
  configured: true,
  isPlaying,
  title: item.name,
  artist: (item.artists ?? []).map((a) => a.name).join(", "),
  album: item.album?.name ?? null,
  albumImageUrl: item.album?.images?.[0]?.url ?? null,
  songUrl: item.external_urls?.spotify ?? null,
  progressMs,
  durationMs: item.duration_ms ?? null,
});

// Last successful snapshot + a cooldown, so sub-second polling degrades safely:
// on a 429 or a network blip we keep serving the last known track instead of
// hammering Spotify or flipping the widget off.
let lastGood: NowPlaying | null = null;
let rateLimitedUntil = 0;

export async function getNowPlaying(): Promise<NowPlaying> {
  const id = env("SPOTIFY_CLIENT_ID");
  const secret = env("SPOTIFY_CLIENT_SECRET");
  const refresh = env("SPOTIFY_REFRESH_TOKEN");
  if (!id || !secret || !refresh) return { configured: false };

  // Respect a Spotify rate-limit backoff without touching the network at all —
  // even with no cached track, since further calls can extend the cooldown.
  if (Date.now() < rateLimitedUntil) {
    return lastGood ?? { configured: true, isPlaying: false, rateLimited: true };
  }

  try {
    const token = await getAccessToken(id, secret, refresh);
    const auth = { Authorization: `Bearer ${token}` };

    const now = await fetch(NOW_PLAYING_URL, { headers: auth, cache: "no-store" });

    if (now.status === 429) {
      const retry = Number(now.headers.get("retry-after") ?? "2");
      rateLimitedUntil = Date.now() + (retry + 1) * 1000;
      return lastGood ?? { configured: true, isPlaying: false };
    }

    if (now.status === 200) {
      const data = await now.json();
      if (data?.item) {
        lastGood = normalize(data.item, Boolean(data.is_playing), data.progress_ms ?? null);
        return lastGood;
      }
    }

    const recent = await fetch(RECENT_URL, { headers: auth, cache: "no-store" });
    if (recent.ok) {
      const data = await recent.json();
      const track = data?.items?.[0]?.track;
      if (track) {
        lastGood = normalize(track, false);
        return lastGood;
      }
    }

    // Couldn't resolve a current or recent track this tick (e.g. a 204 blip).
    // Keep the last known track rather than blanking the widget.
    if (lastGood?.title) return lastGood;
    return { configured: true, isPlaying: false };
  } catch {
    // Network hiccup — keep showing the last known track, don't flip to hidden.
    return lastGood ?? { configured: true, error: true };
  }
}

// A stable key for "did anything the UI shows change?"
export const visibleKey = (d: NowPlaying) =>
  `${d.configured}|${d.error}|${d.isPlaying}|${d.title}|${d.artist}`;
