/** A small pill button for a clickable text prompt,  used for the
 * chat's starter examples (Fix 1: renamed from ScenarioChip, since it no
 * longer links to a precomputed scenario, just runs some text through
 * the live path like anything typed by hand). */
export function PromptChip({ label, onClick, disabled = false }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="font-mono text-xs text-aubergine border border-border rounded-full px-2.5 py-1 hover:bg-elevated hover:border-aubergine-soft state-transition disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-border"
    >
      {label}
    </button>
  );
}
