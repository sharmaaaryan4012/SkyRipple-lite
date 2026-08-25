"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";
import dynamic from "next/dynamic";

const PdfViewer = dynamic(() => import("@/components/PdfViewer"), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-black/20 relative flex justify-center items-center min-h-[60vh] rounded-xl border border-border shadow-2xl">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
        <span className="text-aubergine-soft font-mono text-sm">Loading viewer...</span>
      </div>
    </div>
  ),
});

export default function PitchDeck() {
  return (
    <div className="min-h-screen bg-page text-aubergine font-body">
      <nav className="p-6 border-b border-border">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-gold transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>
      </nav>
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-24 flex flex-col items-center">
        <div className="w-full max-w-5xl mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-semibold mb-4 text-white"><span className="text-gold">SkyRipple</span> Pitch Deck</h1>
          <p className="text-lg text-aubergine-soft">
            Explore our vision for the future of aviation network planning. Use the controls below to navigate the presentation.
          </p>
        </div>
        
        <PdfViewer url="/documents/SkyRipple_Pitch_Deck.pdf" />
      </main>
    </div>
  );
}

