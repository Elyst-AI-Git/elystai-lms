/**
 * Circular status node for lesson checklists. Completed nodes draw their
 * checkmark via the .check-draw stroke animation.
 */
export function CheckNode({ done, locked = false }: { done: boolean; locked?: boolean }) {
  if (done) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-pill bg-emerald">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path
            d="M2 6.5L4.8 9.2L10 3"
            stroke="var(--elyst-green)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="check-draw"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border-2 ${
        locked ? "border-border bg-surface-muted" : "border-emerald/30 bg-white"
      }`}
      aria-hidden
    >
      {locked && (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <rect x="2" y="4.5" width="6" height="4" rx="1" className="fill-fg-3" />
          <path d="M3.2 4.5V3.4a1.8 1.8 0 013.6 0v1.1" stroke="var(--fg-3)" strokeWidth="1.2" fill="none" />
        </svg>
      )}
    </span>
  );
}
