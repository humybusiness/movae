import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// LA BODYMAP — le cœur de Movaé.
//
// Votre corps, de face, en temps réel :
//  - chaque PARTIE du corps est colorée selon son état (vert sauge = bien
//    mobilisée → sable → terracotta = réclame du mouvement), piloté par le
//    moteur ;
//  - chaque zone porte une PASTILLE cliquable (couleur signature de la zone)
//    qui ouvre directement les exercices associés.

// Dégradé d'état : frais → à surveiller → à mobiliser.
const FRESH = [0x7f, 0xa6, 0x8a]; // sauge
const MID = [0xd9, 0xc7, 0xa7]; // sable
const HIGH = [0xc9, 0x85, 0x5c]; // terracotta

function statusColor(strain: number): string {
  const t = Math.max(0, Math.min(1, strain / 100));
  const mix = (a: number[], b: number[], k: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const c = t < 0.5 ? mix(FRESH, MID, t * 2) : mix(MID, HIGH, (t - 0.5) * 2);
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

// Pastilles cliquables : position sur le corps (viewBox 0 0 120 140).
const DOTS: { zone: Zone; x: number; y: number }[] = [
  { zone: "yeux", x: 60, y: 15 },
  { zone: "nuque", x: 60, y: 27 },
  { zone: "epaules", x: 77, y: 34 },
  { zone: "dos", x: 60, y: 42 },
  { zone: "energie", x: 60, y: 61.5 },
  { zone: "poignets", x: 85.5, y: 70 },
  { zone: "hanches", x: 60, y: 76 },
  { zone: "jambes", x: 67, y: 101 },
];

export function BodyMap({
  strain,
  onZoneClick,
}: {
  strain: Record<Zone, number>;
  onZoneClick?: (zone: Zone) => void;
}) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  const c = (z: Zone) => statusColor(strain[z]);
  const outline = { stroke: "var(--m-ink)", strokeOpacity: 0.28, strokeWidth: 1.4 };

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* La silhouette de face */}
      <svg
        viewBox="0 0 120 140"
        className="w-48 shrink-0 sm:w-56"
        role="img"
        aria-label="BodyMap : état de chaque zone du corps — cliquez une pastille pour ouvrir les exercices"
      >
        {/* sol */}
        <ellipse cx={60} cy={134.5} rx={26} ry={3} fill="var(--m-ink)" opacity={0.08} />

        <g style={{ animation: "m-breath-soft 4.2s ease-in-out infinite", transformOrigin: "60px 60px" }}>
          {/* ---- jambes ---- */}
          <g stroke={c("jambes")} strokeLinecap="round" fill="none">
            <path d="M54.5 82 L53 106" strokeWidth={9.5} />
            <path d="M65.5 82 L67 106" strokeWidth={9.5} />
            <path d="M53 108 L52.5 128" strokeWidth={8} />
            <path d="M67 108 L67.5 128" strokeWidth={8} />
          </g>
          <ellipse cx={50} cy={131.5} rx={6} ry={3} fill={c("jambes")} {...outline} />
          <ellipse cx={70} cy={131.5} rx={6} ry={3} fill={c("jambes")} {...outline} />

          {/* ---- bras ---- */}
          <g strokeLinecap="round" fill="none">
            <path d="M42 40 L37 58" stroke={c("epaules")} strokeWidth={7.5} />
            <path d="M78 40 L83 58" stroke={c("epaules")} strokeWidth={7.5} />
            <path d="M37 60 L34.5 75" stroke={c("poignets")} strokeWidth={6.5} />
            <path d="M83 60 L85.5 75" stroke={c("poignets")} strokeWidth={6.5} />
          </g>
          <circle cx={34} cy={79.5} r={4} fill={c("poignets")} {...outline} />
          <circle cx={86} cy={79.5} r={4} fill={c("poignets")} {...outline} />

          {/* ---- bassin / abdomen / poitrine ---- */}
          <rect x={47.5} y={69.5} width={25} height={12} rx={6} fill={c("hanches")} {...outline} />
          <rect x={49.5} y={53} width={21} height={17.5} rx={6.5} fill={c("energie")} {...outline} />
          <rect x={47} y={29} width={26} height={25.5} rx={8.5} fill={c("dos")} {...outline} />

          {/* ---- épaules (deltoïdes) ---- */}
          <circle cx={43.5} cy={34} r={7} fill={c("epaules")} {...outline} />
          <circle cx={76.5} cy={34} r={7} fill={c("epaules")} {...outline} />

          {/* ---- cou + tête ---- */}
          <rect x={55.5} y={23} width={9} height={7} rx={3} fill={c("nuque")} {...outline} />
          <circle cx={60} cy={14.5} r={10} fill="var(--m-card)" stroke="var(--m-ink)" strokeOpacity={0.45} strokeWidth={1.6} />
          <circle cx={56.3} cy={14} r={1.3} fill="var(--m-ink)" opacity={0.75} />
          <circle cx={63.7} cy={14} r={1.3} fill="var(--m-ink)" opacity={0.75} />
          <path d="M57 19 Q60 20.5 63 19" stroke="var(--m-ink)" strokeOpacity={0.5} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        </g>

        {/* ---- pastilles cliquables → exercices de la zone ---- */}
        {DOTS.map(({ zone, x, y }) => (
          <g
            key={zone}
            role="button"
            tabIndex={0}
            aria-label={`${ZONE_LABELS[zone]} — voir les exercices`}
            onClick={() => onZoneClick?.(zone)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onZoneClick?.(zone);
              }
            }}
            className="bm-dot"
          >
            <circle cx={x} cy={y} r={5.4} fill={ZONE_COLORS[zone]} stroke="var(--m-card)" strokeWidth={2.2} />
            <path
              d={`M${x - 2} ${y} H${x + 2} M${x} ${y - 2} V${y + 2}`}
              stroke="var(--m-card)"
              strokeWidth={1.4}
              strokeLinecap="round"
            />
            <title>{`${ZONE_LABELS[zone]} : ${Math.round(strain[zone])}/100 — cliquez pour les exercices`}</title>
          </g>
        ))}
      </svg>

      {/* Détail par zone (cliquable aussi) */}
      <div className="min-w-44 flex-1 space-y-1">
        {sorted.map((z) => {
          const v = Math.round(strain[z]);
          return (
            <button
              key={z}
              onClick={() => onZoneClick?.(z)}
              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-[var(--m-bg2)]"
              aria-label={`${ZONE_LABELS[z]} : ${v} sur 100 — voir les exercices`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ZONE_COLORS[z] }} aria-hidden />
              <span className="w-16 shrink-0 truncate text-xs font-semibold text-[var(--m-ink2)]">
                {ZONE_LABELS[z]}
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--m-bg2)]">
                <span
                  className="block h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${v}%`, background: statusColor(v) }}
                />
              </span>
            </button>
          );
        })}
        <p className="pt-1.5 text-[11px] text-[var(--m-ink2)]">
          Sauge = bien mobilisé · terracotta = réclame du mouvement. Cliquez une zone
          pour ses exercices.
        </p>
      </div>
    </div>
  );
}
