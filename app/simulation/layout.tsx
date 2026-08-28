import type { Metadata } from "next";

// page.tsx here is "use client" (useSearchParams), which can't export
// `metadata` itself -- this sibling layout is the only way to give the
// route its own title/canonical instead of silently inheriting the
// root layout's (see app/layout.tsx's own docstring on why that used to
// make every page claim "/" as canonical).
export const metadata: Metadata = {
  title: "Control Room",
  description: "Launch the SkyRipple control room: pick a disruption, watch it cascade through a real day of US domestic air traffic, and see the network-wide cost in real time.",
  alternates: {
    canonical: '/simulation',
  },
  openGraph: {
    title: "Control Room | SkyRipple",
    description: "Pick a disruption, watch it cascade through a real day of US domestic air traffic, and see the network-wide cost in real time.",
    url: "https://skyripple.saaryan.com/simulation",
    images: [{ url: "https://skyripple.saaryan.com/og-image.jpg", width: 1200, height: 630, alt: "SkyRipple - Agentic Airtraffic Simulator" }],
  },
};

export default function SimulationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
