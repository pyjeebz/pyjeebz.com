import type { Metadata } from "next";
import { Anonymous_Pro } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/general.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import Background from "@/ui/background";
import { Intro } from "@/ui/intro";
import { Footer } from "@/ui/footer";
import { CommandPalette } from "@/components/command-palette";
import { PageTransition } from "@/ui/page-transition";

const anonymousPro = Anonymous_Pro({
  variable: "--font-anonymous-pro",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap", // Ensures text is visible while font loads
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NODE_ENV === "production"
      ? "https://pyjeebz.com"
      : "http://localhost:3000",
  ),
  title: "Mujeeb Lawal-Saka",
  description:
    "Mujeeb Lawal-Saka's portfolio. Engineer with an architect's flair. Building intelligent infrastructure at AssemblyHQ and PreScale.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Mujeeb Lawal-Saka",
    description:
      "Mujeeb Lawal-Saka's portfolio. Engineer with an architect's flair. Building intelligent infrastructure at AssemblyHQ and PreScale.",
    images: [
      {
        url: "/card-preview.jpeg",
        width: 1200,
        height: 630,
        alt: "Mujeeb Lawal-Saka Portfolio",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mujeeb Lawal-Saka",
    description:
      "Mujeeb Lawal-Saka's portfolio. Engineer with an architect's flair. Building intelligent infrastructure at AssemblyHQ and PreScale.",
    images: ["/card-preview.jpeg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${anonymousPro.variable} antialiased`}>
        <ThemeProvider>
          <Background />
          <Intro />
          <CommandPalette />
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
