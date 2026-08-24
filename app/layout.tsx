import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

// next/font self-hosts these at build time (no runtime request to Google
// Fonts, no render-blocking <link>, and it works fine in a static export).
// Each font exposes a CSS variable that tailwind.config.ts's fontFamily
// entries point at, so `font-display` / `font-body` / `font-mono` classes
// work anywhere in the app.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SkyRipple",
  description: "Control-room view of an agentic airline delay-propagation simulator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${inter.variable} ${plexMono.variable}`}>
      <body className="bg-page text-aubergine font-body text-sm antialiased">{children}</body>
    </html>
  );
}
