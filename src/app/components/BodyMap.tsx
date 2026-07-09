import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// Carte du corps Movaé — la signature visuelle de l'app.
// Une silhouette assise dont chaque zone s'illumine de SA couleur, avec une
// intensité proportionnelle à la sollicitation estimée. Lecture instantanée,
// zéro texte nécessaire.

const ANCHORS: Record<Zone, { x: number; y: number }> = {
  yeux: { x: 66, y: 26 },
  nuque: { x: 57, y: 38 },
  epaules: { x: 54, y: 46 },
  dos: { x: 48, y: 60 },
  poignets: { x: 80, y: 60 },
  hanches: { x: 54, y: 76 },
  jambes: { x: 74, y: 92 },
  energie: { x: 62, y: 58 },
};

export function BodyMap({ strain }: { strain: Record<Zone, number> }) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  return (
    <div className="flex items-center gap-5">
      {/* Silhouette */}
      <svg viewBox="0 0 120 120" className="w-40 shrink-0 sm:w-44" role="img" aria-label="Carte du corps : sollicitation estimée par zone">
        <rect x={4} y={4} width={112} height={112} rx={24} fill="var(--m-bg2)" />
        {/* halos de zone (sous la silhouette) */}
        {ZONES.map((z) => {
          const v = strain[z];
          return (
            <circle
              key={z}
              cx={ANCHORS[z].x}
              cy={ANCHORS[z].y}
              r={8 + (v / 100) * 8}
              fill={ZONE_COLORS[z]}
              opacity={0.16 + (v / 100) * 0.6}
            >
              <title>{`${ZONE_LABELS[z]} : ${Math.round(v)}/100`}</title>
            </circle>
          );
        })}
        {/* chaise */}
        <g stroke="var(--m-ink2)" strokeWidth={3.5} strokeLinecap="round" opacity={0.35} fill="none">
          <path d="M30 79 L66 79" />
          <path d="M31 79 L31 48" />
          <path d="M36 79 L36 104" />
          <path d="M62 79 L62 104" />
        </g>
        {/* silhouette assise */}
        <g stroke="var(--m-ink)" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.85}>
          <path d="M54 76 L56 49" strokeWidth={8.5} />
          <path d="M56 49 L58 44" strokeWidth={5} />
          <circle cx={60} cy={32} r={8.5} fill="var(--m-ink)" stroke="none" />
          <path d="M57 49 L68 59 L78 61" strokeWidth={5.5} />
          <circle cx={78} cy={61} r={3} fill="var(--m-ink)" stroke="none" />
          <path d="M54 76 L76 74" strokeWidth={7} />
          <path d="M76 74 L76 100" strokeWidth={7} />
          <path d="M76 100 L84 100" strokeWidth={5.5} />
        </g>
      </svg>

      {/* Détail compact par zone */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {sorted.map((z) => {
          const v = Math.round(strain[z]);
          return (
            <div key={z} className="flex items-center gap-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ZONE_COLORS[z] }} aria-hidden />
              <span className="w-16 shrink-0 truncate text-xs font-semibold text-[var(--m-ink2)]">
                {ZONE_LABELS[z]}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--m-bg2)]">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${v}%`, background: ZONE_COLORS[z] }}
                  role="progressbar"
                  aria-label={`${ZONE_LABELS[z]} : ${v} sur 100`}
                  aria-valuenow={v}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
