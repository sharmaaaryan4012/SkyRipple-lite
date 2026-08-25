import Link from "next/link";
import { ArrowLeftIcon } from "@/components/icons";

export default function CaseStudy() {
  return (
    <div className="min-h-screen bg-page text-aubergine font-body">
      <nav className="p-6 border-b border-border">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium hover:text-gold transition-colors">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Home
        </Link>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-24">
        <h1 className="text-4xl font-display font-semibold mb-6">Case Study</h1>
        <p className="text-lg text-aubergine-soft">In-depth case study content will go here.</p>
      </main>
    </div>
  );
}

