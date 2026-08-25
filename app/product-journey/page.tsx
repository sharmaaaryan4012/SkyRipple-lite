import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function ProductJourney() {
  return (
    <div className="min-h-screen bg-page text-aubergine font-sans selection:bg-gold selection:text-white">
      <nav className="w-full bg-page border-b border-border">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-aubergine-soft hover:text-white transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
            <span className="font-medium text-sm">Back to Home</span>
          </Link>
          <div className="text-xs font-mono text-gold border border-gold/30 px-3 py-1 rounded-full">
            PRODUCT JOURNEY
          </div>
        </div>
      </nav>

      <header className="pt-16 pb-20 px-4 md:px-6 border-b border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap gap-4 mb-6">
            <span className="px-3 py-1 bg-white/5 text-white border border-border rounded text-xs font-bold tracking-wider uppercase">
              PRODUCT JOURNEY
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-medium text-white mb-6 leading-tight">
            Building SkyRipple: <br />
            <span className="text-gold">From Synthetic Data Engine to Enterprise SaaS</span>
          </h1>
          <p className="text-lg md:text-xl text-aubergine-soft leading-relaxed max-w-2xl">
            Great engineering solves complex problems; great product management solves the <em>right</em> problems. Here is how I pivoted SkyRipple from an open-ended technical flex into a focused, enterprise-grade AI Operations platform.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-12">
        
        {/* SIDEBAR */}
        <aside className="hidden md:block md:col-span-3 sticky top-28 self-start">
          <div className="space-y-3 border-l border-border pl-4">
            <a href="#section-1" className="block text-sm text-aubergine-soft hover:text-gold hover:translate-x-1 transition-all">01. Identify the Customer</a>
            <a href="#section-2" className="block text-sm text-aubergine-soft hover:text-gold hover:translate-x-1 transition-all">02. Customer Needs</a>
            <a href="#section-3" className="block text-sm text-aubergine-soft hover:text-gold hover:translate-x-1 transition-all">03. Ruthless Prioritization</a>
            <a href="#section-4" className="block text-sm text-aubergine-soft hover:text-gold hover:translate-x-1 transition-all">04. Two Hard Trade-offs</a>
            <a href="#section-5" className="block text-sm text-aubergine-soft hover:text-gold hover:translate-x-1 transition-all">05. Final Positioning</a>
          </div>
        </aside>

        {/* CONTENT AREA */}
        <article className="col-span-1 md:col-span-9 space-y-20 md:space-y-24">
          
          {/* INTRO (No specific section number) */}
          <section className="space-y-6">
            <p className="text-aubergine text-lg">
              SkyRipple began purely as a technical escalation. Having previously engineered synthetic data generation pipelines for the healthcare sector during my time at Onix, I wanted to apply that same architectural rigor - ripping a database apart, building a knowledge graph, and wrapping it in a simulation layer - to the aviation industry.
            </p>
            <p className="text-aubergine text-lg">
              But a simulation without a target user is just a sandbox. To transform SkyRipple from a heavy mathematical backend into a viable enterprise product, I had to stop thinking like a systems engineer and start thinking like a Product Manager.
            </p>
            <p className="text-aubergine text-lg">
              Here is how I used the <strong className="text-white">CIRCLES method</strong> to guide this transformation.
            </p>
          </section>

          <section id="section-1" className="space-y-6">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-white flex items-center gap-3">
              <span className="text-gold font-mono text-lg">01.</span> Comprehend the Situation & Identify the Customer
            </h2>
            
            <div className="mt-8 space-y-8">
              <div className="bg-surface border-l-4 border-red-soft p-6 md:p-8 rounded-r-xl border-y border-r border-border shadow-sm">
                <h4 className="text-white font-bold mb-4 text-xl">The Trap</h4>
                <p className="text-aubergine text-base mb-4">
                  When you model 582,000 real flights and synthesize 2.4 million passenger itineraries down to the minute, the immediate temptation is to build a product for <em>everyone</em>.
                </p>
                <p className="text-aubergine text-base">
                  Initially, I found myself building for the &quot;Aviation Enthusiast.&quot; I was designing interfaces where a user could click on a specific aircraft, view a rich seat map, and drill down into individual passenger profiles - their names, connection flights, and age demographics. The data was all there in the backend.
                </p>
              </div>

              <div className="bg-surface border-l-4 border-gold p-6 md:p-8 rounded-r-xl border-y border-r border-border shadow-sm">
                <h4 className="text-white font-bold mb-4 text-xl">The Pivot</h4>
                <p className="text-aubergine text-base mb-4">
                  But as the simulation revealed the brutal financial reality of airline delays - specifically the 5.19x cost multiplier when a local disruption cascades nationally - the core customer became glaringly obvious. The end-user wasn&apos;t an aviation geek looking at a flight tracker.
                </p>
                <p className="font-medium text-white text-xl py-2 border-l-2 border-gold pl-4 ml-2 my-4">
                  The user was an Airline Duty Manager sitting in an Operations Control Center (OCC) at 2:00 AM.
                </p>
                <ul className="list-disc pl-6 space-y-2 mt-4 text-aubergine text-base">
                  <li><strong className="text-white">Their Context:</strong> High cognitive overload, massive financial pressure, and managing chaotic, competing priorities (crew legality, gate availability, aircraft maintenance).</li>
                  <li><strong className="text-white">Their Goal:</strong> Stop the multi-day financial bleeding caused by a network disruption.</li>
                </ul>
              </div>
            </div>
          </section>

          <section id="section-2" className="space-y-6">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-white flex items-center gap-3">
              <span className="text-gold font-mono text-lg">02.</span> Report the Customer&apos;s Needs
            </h2>
            <p className="text-aubergine text-lg">
              Once the Duty Manager was identified as the core user, their primary needs crystallized:
            </p>
            
            <div className="border-l-2 border-border ml-4 space-y-8 mt-8">
              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-page border-gold"></div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Speed over Granularity</h3>
                <p className="text-aubergine text-base">They don&apos;t care about passenger names; they care about missed connection aggregates.</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-page border-gold"></div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Actionable Intelligence</h3>
                <p className="text-aubergine text-base">They don&apos;t need a visualization of the problem; they need a mathematically verified recovery solution.</p>
              </div>
              <div className="relative pl-8">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full border-2 bg-page border-gold"></div>
                <h3 className="text-lg md:text-xl font-bold text-white mb-2">Trust</h3>
                <p className="text-aubergine text-base">They operate in a highly regulated, zero-margin-for-error environment. They cannot rely on an LLM that might hallucinate financial savings.</p>
              </div>
            </div>
          </section>

          <section id="section-3" className="space-y-6">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-white flex items-center gap-3">
              <span className="text-gold font-mono text-lg">03.</span> Cut: Ruthless Prioritization
            </h2>
            <p className="text-aubergine text-lg">
              This is where the hardest product decisions were made. To serve the Duty Manager, I had to kill my darlings.
            </p>
            <p className="text-aubergine text-lg">
              I entirely scrapped the &quot;FlightRadar24-esque&quot; features. I removed the aircraft photos, the granular seat-map UIs, and the individual passenger tracking features. I had spent weeks modeling that synthetic data, but surfacing it in the UI violated the core product mandate:
            </p>
            <blockquote className="border-l-4 border-red-soft pl-6 py-2 my-6 text-xl text-white italic font-medium">
              &quot;If it doesn&apos;t help the OCC recover network costs, it&apos;s visual noise.&quot;
            </blockquote>
            <p className="text-aubergine text-lg">
              By cutting the enthusiast features, I cleared the roadmap to build what actually mattered: the 5-Agent Arbitrated Financial Simulator.
            </p>
          </section>

          <section id="section-4" className="space-y-6">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-white flex items-center gap-3">
              <span className="text-gold font-mono text-lg">04.</span> Evaluate: Two Hard Trade-offs
            </h2>
            <p className="text-aubergine text-lg">
              Building this system required making two massive architectural and product compromises.
            </p>
            
            <div className="grid grid-cols-1 gap-6 mt-8">
              <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <h4 className="text-white font-bold mb-3 text-lg">Trade-off A: Scope vs. Performance</h4>
                <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
                  The Ground Operations Abstraction
                </div>
                <p className="text-aubergine text-sm mb-4">
                  I initially wanted a hyper-realistic airport environment that modeled the exact number of ground staff and terminal gates. However, calculating dynamic ground-staff movements across 300+ airports introduced massive computational latency.
                </p>
                <div className="p-4 rounded-lg bg-page border border-gold/30">
                  <h5 className="text-white font-bold text-sm mb-2">The Decision</h5>
                  <p className="text-sm text-aubergine leading-relaxed">
                    I explicitly chose to hardcode terminal capacities and abstract the ground crew variables. Whether there are 3 or 15 baggage handlers at a gate does not fundamentally alter the macro-financial cascade of a 2-hour runway closure at O&apos;Hare. This sacrifice in micro-realism guaranteed the macro-system could execute a multi-day national disruption scenario in under 20 seconds.
                  </p>
                </div>
              </div>

              <div className="bg-surface p-6 rounded-xl border border-border shadow-sm">
                <h4 className="text-white font-bold mb-3 text-lg">Trade-off B: The Go-to-Market Strategy</h4>
                <div className="flex items-center gap-2 text-gold font-bold text-xs uppercase tracking-widest mb-4">
                  SkyRipple vs. SkyRipple Lite
                </div>
                <p className="text-aubergine text-sm mb-4">
                  The full 5-Agent OCC simulation is computationally heavy. Running parallel financial simulations for a continuous month takes several minutes. While an airline enterprise will gladly wait 5 minutes for a calculation that saves them $172,000, a recruiter, portfolio visitor, or prospective buyer looking for immediate Time-to-Value (TTV) will bounce if forced to wait.
                </p>
                <div className="p-4 rounded-lg bg-page border border-gold/30">
                  <h5 className="text-white font-bold text-sm mb-2">The Decision</h5>
                  <p className="text-sm text-aubergine leading-relaxed">
                    I bifurcated the product. I kept the heavy backend Python engine private, and built <strong className="text-white">SkyRipple Lite</strong> - a zero-latency, serverless interactive client for public deployment. By pre-computing massive multi-day scenarios and packaging them as a static web export, I allowed users to instantly experience the simulation&apos;s analytical depth without sitting through backend compute times. It proves the capability exists, while strictly optimizing for immediate user engagement.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section id="section-5" className="space-y-6">
            <h2 className="font-display text-2xl md:text-3xl font-medium text-white flex items-center gap-3">
              <span className="text-gold font-mono text-lg">05.</span> Summarize: The Final Positioning
            </h2>
            <p className="text-aubergine text-lg">
              By strictly adhering to the user&apos;s operational needs, SkyRipple evolved into its final form.
            </p>
            <p className="text-aubergine text-lg">
              Instead of an exploratory dashboard, it became an <strong className="text-white">Agentic AI operations platform</strong>. By defining the strict &quot;Gemini Proposes, Code Disposes&quot; boundary, we solved the user&apos;s trust issue. And by creating SkyRipple Lite, we solved the market accessibility issue.
            </p>
            
            <div className="mt-12 bg-gold/10 border border-gold/30 p-8 rounded-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <h3 className="text-2xl font-bold text-white mb-4 relative z-10">The Takeaway</h3>
              <p className="text-lg text-white font-medium relative z-10 leading-relaxed">
                SkyRipple is proof that deep technical execution only generates value when it is ruthlessly aligned with a user&apos;s operational reality. Building the engine required engineering; deciding what <em>not</em> to build required product strategy.
              </p>
            </div>
          </section>

        </article>
      </div>
    </div>
  );
}
