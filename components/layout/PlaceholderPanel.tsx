import { Panel } from "@/components/ui/Panel";

/**
 * A quiet stand-in for a surface a LATER Phase 7 task builds (the map,
 * the clock/scrubber, the chat dock). Deliberately understated,  muted
 * text, no icon, no fake content,  so it reads as "reserved," not
 * "broken" or "loading forever."
 */
export function PlaceholderPanel({ label, note, className = "" }: { label: string; note: string; className?: string }) {
  return (
    <Panel className={`h-full flex flex-col items-center justify-center text-center ${className}`}>
      <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-2">{label}</p>
      <p className="text-muted text-xs max-w-[220px]">{note}</p>
    </Panel>
  );
}
