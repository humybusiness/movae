import type { IndexStyleId } from "../types";

// Visualisation de l'Indice Movaé, en trois styles déblocables.

function Ring({ value, size }: { value: number; size: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * c;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Indice Movaé : ${value} sur 100`}>
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--m-bg2)" strokeWidth="10" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--m-accent)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 60 60)"
        style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
      <text
        x="60"
        y="64"
        textAnchor="middle"
        fontSize="34"
        fontWeight="700"
        fill="var(--m-ink)"
        fontFamily="var(--font-display)"
      >
        {value}
      </text>
      <text x="60" y="80" textAnchor="middle" fontSize="9" fontWeight="600" fill="var(--m-ink2)" letterSpacing="1.5">
        / 100
      </text>
    </svg>
  );
}

function BigScore({ value }: { value: number }) {
  return (
    <div className="flex flex-col items-center" aria-label={`Indice Movaé : ${value} sur 100`}>
      <span className="font-display text-7xl font-bold leading-none tracking-tight">{value}</span>
      <div className="mt-3 h-1.5 w-28 overflow-hidden rounded-full bg-[var(--m-bg2)]">
        <div
          className="h-full rounded-full bg-[var(--m-accent)] transition-[width] duration-700"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function Bars({ value }: { value: number }) {
  const filled = Math.round(value / 10);
  return (
    <div className="flex flex-col items-center gap-3" aria-label={`Indice Movaé : ${value} sur 100`}>
      <span className="font-display text-4xl font-bold leading-none">{value}</span>
      <div className="flex items-end gap-1.5">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="w-3 rounded-full transition-colors duration-500"
            style={{
              height: `${18 + i * 3}px`,
              background: i < filled ? "var(--m-accent)" : "var(--m-bg2)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function IndexVisual({
  value,
  style,
  size = 150,
}: {
  value: number;
  style: IndexStyleId;
  size?: number;
}) {
  if (style === "score") return <BigScore value={value} />;
  if (style === "barres") return <Bars value={value} />;
  return <Ring value={value} size={size} />;
}
