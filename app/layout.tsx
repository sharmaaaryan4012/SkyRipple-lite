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
  title: "SkyRipple Lite",
  description: "Control-room view of an agentic airline delay-propagation simulator.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-page text-aubergine font-body text-sm antialiased">
        <Cursor />
        {children}
      </body>
    </html>
  );
}
