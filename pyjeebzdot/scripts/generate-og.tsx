import path from "node:path";
import fs from "node:fs/promises";
import matter from "gray-matter";
import satori from "satori";
import sharp from "sharp";
import { SIG_D, SIG_VB } from "../src/lib/signature";

const ROOT = process.cwd();
const WRITINGS_DIR = path.join(ROOT, "src/content/writings");
const FONTS_DIR = path.join(ROOT, "scripts/fonts");
const OUT_DIR = path.join(ROOT, "public/images/og-images/writings");

const BLACK = "#000000";
const ZINC_500 = "#71717a";
const ZINC_400 = "#a1a1aa";

type Writing = {
  id: string;
  title: string;
  description?: string;
};

// The "mls" signature — same path as src/components/MLSSignature.tsx (imported
// from src/lib/signature.ts so every consumer traces the exact same ink).
const SIG_W = 225.456;
const SIG_H = 185.808;
const SIG_SVG = `<svg width="${SIG_W}" height="${SIG_H}" viewBox="${SIG_VB}" xmlns="http://www.w3.org/2000/svg"><path d="${SIG_D}" fill="${BLACK}" stroke="${BLACK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const SIG_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(SIG_SVG).toString("base64")}`;
const SIG_HEIGHT = 30;
const SIG_WIDTH = Math.round((SIG_W / SIG_H) * SIG_HEIGHT);

async function getWritings(): Promise<Writing[]> {
  let files: string[];
  try {
    files = await fs.readdir(WRITINGS_DIR);
  } catch {
    // No writings yet (the collection directory doesn't exist).
    return [];
  }
  const writings: Writing[] = [];

  for (const file of files) {
    if (!file.endsWith(".mdx")) continue;

    const raw = await fs.readFile(path.join(WRITINGS_DIR, file));
    const { data } = matter(raw);

    // Skip writings that pin their own OG image.
    if (data?.seo?.ogImageUrl) continue;

    writings.push({
      id: file.replace(/\.mdx$/, ""),
      title: data.title,
      description: data.description,
    });
  }

  return writings;
}

async function loadFonts() {
  const weights = [
    { weight: 400, file: "geist-regular.ttf" },
    { weight: 500, file: "geist-medium.ttf" },
    { weight: 600, file: "geist-semibold.ttf" },
  ] as const;
  return Promise.all(
    weights.map(async ({ weight, file }) => ({
      name: "Geist",
      weight,
      style: "normal" as const,
      data: await fs.readFile(path.join(FONTS_DIR, file)),
    })),
  );
}

async function renderCard(
  writing: Writing,
  fonts: Awaited<ReturnType<typeof loadFonts>>,
) {
  const svg = await satori(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        width: "100%",
        padding: "80px",
        backgroundColor: "#ffffff",
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: 26,
        }}
      >
        <img
          src={SIG_DATA_URI}
          width={SIG_WIDTH}
          height={SIG_HEIGHT}
          style={{ marginRight: 14 }}
        />
        <span style={{ fontWeight: 500, color: ZINC_400 }}>pyjeebz.com</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            display: "flex",
            fontWeight: 600,
            fontSize: 64,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: BLACK,
          }}
        >
          {writing.title}
        </div>
        {writing.description ? (
          <div
            style={{
              display: "flex",
              fontWeight: 400,
              fontSize: 30,
              lineHeight: 1.35,
              letterSpacing: "-0.01em",
              color: ZINC_500,
              marginTop: 20,
              textWrap: "balance",
            }}
          >
            {writing.description}
          </div>
        ) : null}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(OUT_DIR, `${writing.id}.png`));
}

// The site-wide default card: the signature as the centerpiece, identity
// beneath it. Overwrites public/images/og-image.png (used by Layout.astro
// whenever a page doesn't pin its own ogImageUrl).
async function renderDefaultCard(fonts: Awaited<ReturnType<typeof loadFonts>>) {
  const SIG_BIG_HEIGHT = 200;
  const SIG_BIG_WIDTH = Math.round((SIG_W / SIG_H) * SIG_BIG_HEIGHT);

  const svg = await satori(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        backgroundColor: "#ffffff",
        fontFamily: "Geist",
      }}
    >
      <img src={SIG_DATA_URI} width={SIG_BIG_WIDTH} height={SIG_BIG_HEIGHT} />
      <div
        style={{
          display: "flex",
          fontWeight: 500,
          fontSize: 36,
          letterSpacing: "-0.01em",
          color: ZINC_500,
          marginTop: 48,
        }}
      >
        Computational Thinker
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts,
    },
  );

  await sharp(Buffer.from(svg))
    .png()
    .toFile(path.join(ROOT, "public/images/og-image.png"));
}

const writings = await getWritings();
const fonts = await loadFonts();
await fs.mkdir(OUT_DIR, { recursive: true });
await fs.mkdir(path.join(ROOT, "public/images"), { recursive: true });

console.log("🎨 Generating default OG image...");
await renderDefaultCard(fonts);
console.log("✅ og-image.png");

console.log(`🎨 Generating ${writings.length} writing OG image(s)...`);
for (const writing of writings) {
  await renderCard(writing, fonts);
  console.log(`✅ ${writing.id}.png`);
}
console.log("✨ Done");
