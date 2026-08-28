import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Project Overview",
  description: "SkyRipple simulates a runway closure cascading through a real day of US domestic air traffic - 582,304 real BTS flight legs, a 5.19x cost propagation multiplier, and a five-role agentic recovery team.",
  alternates: {
    canonical: '/case-study',
  },
  openGraph: {
    title: "Project Overview | SkyRipple",
    description: "What happens when one runway closes at O'Hare? A discrete-event cascade engine, a real financial ledger, and an agentic recovery team - explained.",
    url: "https://skyripple.saaryan.com/case-study",
    images: [{ url: "https://skyripple.saaryan.com/og-image.jpg", width: 1200, height: 630, alt: "SkyRipple - Agentic Airtraffic Simulator" }],
  },
};

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function ArrowUpRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 17 17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function DatabaseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

function NetworkIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="16" width="6" height="6" rx="1" />
      <rect x="2" y="16" width="6" height="6" rx="1" />
      <rect x="9" y="2" width="6" height="6" rx="1" />
      <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
      <path d="M12 12V8" />
    </svg>
  );
}

function UsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function RadarIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
      <path d="M4 6l.01 0" />
      <path d="M2.99 9.34A10 10 0 1 0 21 12a10 10 0 0 0-.66-3.57" />
      <path d="M12 12 21 3" />
      <path d="M12 12v9" />
    </svg>
  );
}

function LayersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}

function ShieldCheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

const STATS = [
  { icon: DatabaseIcon, value: "582,304", label: "real BTS flight legs", sub: "Dec 2025 · 343 airports · 14 carriers" },
  { icon: NetworkIcon, value: "5.19x", label: "cascade propagation", sub: "$181,376 direct → $942,081 network-wide" },
  { icon: UsersIcon, value: "2.41M", label: "synthetic passenger itineraries", sub: "190,711 crew pairings, 6,756 gates" },
  { icon: RadarIcon, value: "16-20s", label: "full national cascade", sub: "steady-state live resolution time" },
];

const FEATURES = [
  {
    icon: LayersIcon,
    title: "Discrete-Event Cascade Engine",
    text: "A four-channel simulation - aircraft rotation, crew pairing, passenger itineraries, and disruptions - propagates one localized event (a runway closure, a grounded tail) into its full network-wide consequence across a real day of US domestic traffic.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Financial Ledger, Not a Guess",
    text: "Every dollar is attributed down to the carrier and airport across five cost categories, validated against real BTS on-time data (reactionary delay correlates r ≈ +0.6 with the ground-truth late_aircraft_delay_min).",
  },
  {
    icon: UsersIcon,
    title: "Agentic Recovery, Safe by Construction",
    text: "Five LLM-powered roles - Aircraft, Crew, Passenger, and Gate Controllers, arbitrated by a Duty Manager - propose recovery plans that are re-simulated and cost-checked before acceptance. The arbitrated plan can never cost more than doing nothing.",
  },
  {
    icon: RadarIcon,
    title: "A Control Room, Not a Dashboard",
    text: "A FlightRadar-style live map, a scrubbable timeline, and a real-time cost ledger let you provoke a disruption and watch it ripple through the network minute by minute - not read about it after the fact.",
  },
];

const STACK = [
  "Python · Discrete-Event Simulation",
  "SQLite · 167MB Normalized Schedule",
  "FastAPI · Live Simulation Backend",
  "Gemini Flash-Lite · NL Parsing & Arbitration",
  "Next.js 15 · App Router",
  "TypeScript",
  "deck.gl · WebGL Map Rendering",
  "Tailwind CSS",
];

export default function CaseStudy() {
  return (
    <div className="min-h-screen bg-page text-aubergine font-sans selection:bg-gold selection:text-page">
      <nav className="w-full bg-page border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-aubergine-soft hover:text-white transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="font-medium text-sm">Back to Home</span>
          </Link>
          <div className="text-xs font-mono text-gold border border-gold/30 px-3 py-1 rounded-full">
            PROJECT OVERVIEW
          </div>
        </div>
      </nav>

      <header className="pt-16 pb-16 px-4 md:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="px-3 py-1 bg-white/5 text-white border border-border rounded text-xs font-bold tracking-wider uppercase">
              Agentic Airtraffic Simulator
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-medium text-white mb-6 leading-tight">
            What happens when <span className="text-gold">one runway closes</span> at O&apos;Hare?
          </h1>
          <p className="text-lg md:text-xl text-aubergine-soft leading-relaxed max-w-2xl mb-10">
            SkyRipple simulates exactly that - live, against a full real day of US domestic air traffic - then deploys a five-role AI operations team to recover it and shows you the dollars saved.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/simulation"
              className="inline-flex items-center gap-2 bg-gold text-page px-6 py-3 rounded-full font-bold hover:bg-white transition-colors"
            >
              Launch Simulation
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/product-journey"
              className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-full font-bold text-white hover:border-gold/50 transition-colors"
            >
              Read the Product Journey
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="bg-surface border border-border rounded-xl p-6">
              <stat.icon className="w-6 h-6 text-gold mb-4" />
              <p className="font-display text-2xl md:text-3xl font-semibold text-white mb-1">{stat.value}</p>
              <p className="text-sm text-white/80 mb-1">{stat.label}</p>
              <p className="text-xs text-aubergine-soft">{stat.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="max-w-2xl mb-12">
          <h2 className="font-display text-2xl md:text-3xl font-medium text-white mb-4">How it works</h2>
          <p className="text-aubergine-soft text-lg">
            Four systems working together: a world model built from real data, an engine that propagates disruption through it, a ledger that prices every consequence, and an agentic team that recovers from it.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-surface border border-border rounded-xl p-6 md:p-8">
              <f.icon className="w-6 h-6 text-gold mb-4" />
              <h3 className="text-white font-bold text-lg mb-3">{f.title}</h3>
              <p className="text-aubergine text-sm leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-20">
        <div className="bg-gold/10 border border-gold/30 p-8 md:p-10 rounded-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 max-w-3xl">
            <h3 className="text-xl md:text-2xl font-bold text-white mb-4">SkyRipple vs. SkyRipple Lite</h3>
            <p className="text-white/90 leading-relaxed mb-4">
              The full engine keeps a live Python discrete-event simulator, a real SQLite world model, and Gemini-driven natural-language parsing running behind a FastAPI backend - a five-minute wait for an enterprise-grade calculation. This Lite build is that same engine&apos;s output, pre-computed and packaged as a zero-latency static client, so the analytical depth is instant to explore.
            </p>
            <Link href="/product-journey" className="inline-flex items-center gap-1.5 text-gold font-medium hover:text-white transition-colors">
              Why I built it this way
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <h2 className="font-display text-2xl md:text-3xl font-medium text-white mb-8">Built with</h2>
        <div className="flex flex-wrap gap-3">
          {STACK.map((item) => (
            <span key={item} className="px-4 py-2 bg-white/5 border border-border rounded-full text-sm text-aubergine-soft font-mono">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Link href="/simulation" className="group p-6 rounded-xl border border-border bg-surface hover:bg-elevated transition-colors">
            <RadarIcon className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-gold transition-colors">Launch Simulation</h3>
            <p className="text-sm text-aubergine-soft">Provoke a disruption and watch it cascade through a real day of US air traffic.</p>
          </Link>
          <Link href="/pitch-deck" className="group p-6 rounded-xl border border-border bg-surface hover:bg-elevated transition-colors">
            <LayersIcon className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-gold transition-colors">Pitch Deck</h3>
            <p className="text-sm text-aubergine-soft">The strategic business and technical presentation.</p>
          </Link>
          <a
            href="https://www.saaryan.com/cases/skyripple-agentic-simulator/"
            className="group p-6 rounded-xl border border-border bg-surface hover:bg-elevated transition-colors"
          >
            <ArrowUpRightIcon className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-gold transition-colors">Full Technical Case Study</h3>
            <p className="text-sm text-aubergine-soft">The engineering deep-dive: engine architecture, LLM boundary, and optimization notes.</p>
          </a>
        </div>
      </section>
    </div>
  );
}
