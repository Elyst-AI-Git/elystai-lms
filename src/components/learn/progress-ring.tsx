/**
 * SVG progress ring - server-renderable, animates its stroke once on mount
 * via the .ring-progress CSS animation (no JS).
 */
export function ProgressRing({
  percent,
  size = 64,
  onDark = false,
}: {
  percent: number;
  size?: number;
  onDark?: boolean;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, percent));
  const offset = c * (1 - clamped / 100);

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${clamped}% complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className={onDark ? "stroke-white/15" : "stroke-surface-muted"}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`ring-progress ${onDark ? "stroke-green" : "stroke-emerald"}`}
          style={{ ["--ring-circumference" as string]: `${c}px` }}
        />
      </svg>
      <span
        className={`absolute inset-0 flex items-center justify-center font-display text-label font-bold ${
          onDark ? "text-fg-on-dark" : "text-fg"
        }`}
      >
        {clamped}%
      </span>
    </div>
  );
}
