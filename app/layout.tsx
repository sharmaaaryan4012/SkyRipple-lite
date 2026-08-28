import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Cursor } from "@/components/cursor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SoftwareApplication schema, mirroring the Person schema the main
// portfolio (saaryan.com) injects for itself -- gives Google an entity
// to attach rich-result eligibility to, and the `author`/`sameAs` link
// keeps this site legible as the same person's work when crawled
// independently of saaryan.com.
const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "SkyRipple",
  alternateName: "SkyRipple Lite",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://skyripple.saaryan.com",
  description:
    "An agentic US-domestic airline delay-propagation simulator. Provoke a disruption and watch it cascade through a real day of US air traffic, then watch an AI operations team recover it.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  author: {
    "@type": "Person",
    name: "Aaryan Sharma",
    url: "https://www.saaryan.com",
    sameAs: ["https://github.com/sharmaaaryan4012", "https://www.linkedin.com/in/sharmaaaryan"],
  },
};

// Root-level `alternates.canonical` deliberately omitted here: Next
// inherits a parent's metadata into every child route that doesn't
// override it, so setting one canonical URL at this level previously
// made EVERY page (/simulation, /product-journey, /pitch-deck,
// /case-study) declare "/" as its canonical -- telling Google they were
// all duplicates of the homepage and shouldn't be indexed separately.
// Each real page now sets its own via a same-folder metadata export (a
// sibling layout.tsx for the two client-component pages, since a "use
// client" page file can't export `metadata` itself).
export const metadata: Metadata = {
  metadataBase: new URL('https://skyripple.saaryan.com'),
  title: {
    template: "%s | SkyRipple by Aaryan Sharma",
    default: "SkyRipple by Aaryan Sharma",
  },
  description: "SkyRipple is a control-room view of multi-day cascading disruptions and AI-driven recovery scenarios, built for strategic aviation analysis.",
  keywords: ["Aviation Analysis", "Airline Simulation", "Disruption Modeling", "SkyRipple", "Aaryan Sharma"],
  authors: [{ name: "Aaryan Sharma" }],
  creator: "Aaryan Sharma",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://skyripple.saaryan.com",
    title: "SkyRipple by Aaryan Sharma",
    description: "SkyRipple is a control-room view of multi-day cascading disruptions and AI-driven recovery scenarios, built for strategic aviation analysis.",
    siteName: "SkyRipple by Aaryan Sharma",
    images: [
      {
        url: "https://skyripple.saaryan.com/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SkyRipple - Agentic Airtraffic Simulator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SkyRipple by Aaryan Sharma",
    description: "Control-room view of multi-day cascading disruptions and AI-driven recovery scenarios.",
    images: ["https://skyripple.saaryan.com/og-image.jpg"],
  },
  icons: {
    icon: '/images/headshot.jpg',
    apple: '/images/headshot.jpg',
  },
};

// This is a static export (next.config.ts's output: "export") -- Next's
// robots.ts/sitemap.ts metadata routes need this to actually land as
// static /robots.txt and /sitemap.xml files in the export instead of
// silently being skipped (confirmed the hard way on the portfolio site;
// carried the fix over here for the same reason).
export const dynamic = 'force-static';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="bg-page text-aubergine font-body text-sm antialiased" suppressHydrationWarning>
        {/* A plain <script> (not next/script) so this is baked into the
            static HTML at build time -- next/script's default strategy
            injects client-side after hydration, which JSON-LD crawlers
            with weaker JS execution than Googlebot may never see. */}
        <script
          id="schema-software-application"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
        />
        <Cursor />
        {children}
      </body>
    </html>
  );
}
