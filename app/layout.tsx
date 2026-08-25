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
  alternates: {
    canonical: 'https://skyripple.saaryan.com',
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://skyripple.saaryan.com",
    title: "SkyRipple by Aaryan Sharma",
    description: "SkyRipple is a control-room view of multi-day cascading disruptions and AI-driven recovery scenarios, built for strategic aviation analysis.",
    siteName: "SkyRipple by Aaryan Sharma",
  },
  twitter: {
    card: "summary_large_image",
    title: "SkyRipple by Aaryan Sharma",
    description: "Control-room view of multi-day cascading disruptions and AI-driven recovery scenarios.",
  },
  icons: {
    icon: '/images/headshot.jpg',
    apple: '/images/headshot.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body className="bg-page text-aubergine font-body text-sm antialiased" suppressHydrationWarning>
        <Cursor />
        {children}
      </body>
    </html>
  );
}
