/**
 * The one bordered-surface primitive every dashboard block sits inside.
 * Depth comes only from the surface -> elevated step (no shadows,
 * no blur,  see the design reference's "density over decoration" rule),
 * so this component IS that rule, applied once.
 */
export function Panel({
  title,
  eyebrow,
  className = "",
  testId,
  children,
}: {
  title?: string;
  eyebrow?: string;
  className?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <section data-testid={testId} className={`bg-surface border border-border rounded-md p-5 ${className}`}>
      {(title || eyebrow) && (
        <header className="mb-4">
          {eyebrow && <p className="font-mono text-xs uppercase tracking-widest text-aubergine-soft mb-1">{eyebrow}</p>}
          {title && <h2 className="font-display text-lg font-semibold text-aubergine">{title}</h2>}
        </header>
      )}
      {children}
    </section>
  );
}
