import Link from 'next/link';

function ArrowRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="6 3 20 12 6 21 6 3" />
    </svg>
  );
}

function PresentationIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h20" />
      <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="m7 21 5-5 5 5" />
    </svg>
  );
}

function RouteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="6" cy="19" r="3" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
      <circle cx="18" cy="5" r="3" />
    </svg>
  );
}

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

import { PageTransition } from '@/components/page-transition';
import { RevealText } from '@/components/reveal-text';

export default function LandingPage() {
  return (
    <PageTransition>
      <div className="min-h-screen bg-page text-aubergine font-body selection:bg-surface">
        <nav className="w-full bg-page/80 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="text-xl font-display font-semibold tracking-tight">SkyRipple</div>
              <a href="https://www.saaryan.com" data-cursor-hover className="text-sm font-medium text-muted hover:text-gold transition-colors flex items-center gap-2">
                <ArrowRightIcon className="w-4 h-4 rotate-180" /> Back to saaryan.com
              </a>
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 md:pt-24 md:pb-28">
          <div className="space-y-8 max-w-4xl">
            <h1 className="font-display text-[clamp(2.75rem,10vw,6rem)] leading-[0.95] font-medium tracking-tight text-white">
              <RevealText>Agentic airline delay-propagation simulator.</RevealText>
            </h1>
            <p className="max-w-2xl text-lg sm:text-xl text-aubergine-soft leading-relaxed">
              SkyRipple is a control-room view of multi-day cascading disruptions and AI-driven recovery scenarios, built for strategic aviation analysis.
            </p>
          
          <div className="flex flex-wrap gap-4 pt-4">
            <Link 
              href="/simulation"
              className="inline-flex items-center gap-2 bg-gold text-page px-6 py-3 rounded-full font-bold hover:bg-white transition-colors"
            >
              <PlayIcon className="w-4 h-4" />
              Launch Simulation
            </Link>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6 mt-32">
          <Link href="/product-journey" className="group p-6 rounded-xl border border-border bg-surface hover:bg-elevated transition-colors">
            <RouteIcon className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-gold transition-colors">Product Journey</h3>
            <p className="text-sm text-aubergine-soft">Explore the evolution and development process behind SkyRipple.</p>
          </Link>
          <Link href="/case-study" className="group p-6 rounded-xl border border-border bg-surface hover:bg-elevated transition-colors">
            <BookOpenIcon className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-gold transition-colors">Case Study</h3>
            <p className="text-sm text-aubergine-soft">Read in-depth analysis of disruption and recovery strategies.</p>
          </Link>
          <Link href="/pitch-deck" className="group p-6 rounded-xl border border-border bg-surface hover:bg-elevated transition-colors">
            <PresentationIcon className="w-8 h-8 text-gold mb-4" />
            <h3 className="text-lg font-display font-semibold mb-2 group-hover:text-gold transition-colors">Pitch Deck</h3>
            <p className="text-sm text-aubergine-soft">View the strategic business and technical presentation.</p>
          </Link>
        </div>
      </main>
      </div>
    </PageTransition>
  );
}

