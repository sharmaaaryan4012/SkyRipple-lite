import type { Metadata } from "next";

// page.tsx here is "use client" (the PDF viewer needs to be client-side
// dynamic-imported), so it can't export `metadata` itself -- see
// app/simulation/layout.tsx for why a sibling layout is the fix.
export const metadata: Metadata = {
  title: "Pitch Deck",
  description: "The SkyRipple pitch deck: the strategic business and technical presentation for the agentic airtraffic simulator.",
  alternates: {
    canonical: '/pitch-deck',
  },
  openGraph: {
    title: "Pitch Deck | SkyRipple",
    description: "The strategic business and technical presentation for the agentic airtraffic simulator.",
    url: "https://skyripple.saaryan.com/pitch-deck",
    images: [{ url: "https://skyripple.saaryan.com/og-image.jpg", width: 1200, height: 630, alt: "SkyRipple - Agentic Airtraffic Simulator" }],
  },
};

export default function PitchDeckLayout({ children }: { children: React.ReactNode }) {
  return children;
}
