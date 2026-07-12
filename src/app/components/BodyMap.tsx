import { useState } from "react";
import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// LA BODYMAP — silhouette 2D au trait noir, cœur du dashboard.
//
// Une silhouette humaine de face dessinée en trait noir. Chaque ZONE du corps
// est une région cliquable, teintée selon sa sollicitation (sauge = bien
// mobilisée → sable → terracotta = réclame du mouvement), pilotée par le
// moteur. Un clic ouvre les exercices de la zone.

const FRESH = [0x7f, 0xa6, 0x8a];
const MID = [0xd9, 0xc7, 0xa7];
const HIGH = [0xc9, 0x85, 0x5c];

function statusColor(strain: number): string {
  const t = Math.max(0, Math.min(1, strain / 100));
  const mix = (a: number[], b: number[], k: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * k));
  const c = t < 0.5 ? mix(FRESH, MID, t * 2) : mix(MID, HIGH, (t - 0.5) * 2);
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

// Régions cliquables (viewBox 0 0 200 380). Chaque zone est une forme simple
// remplie par sa couleur d'état, posée sous le trait noir de la silhouette.
type Region = { zone: Zone; el: "rect" | "circle" | "ellipse"; attrs: Record<string, number>; rx?: number };

const REGIONS: Region[] = [
  { zone: "yeux", el: "circle", attrs: { cx: 100, cy: 34, r: 13 } },
  { zone: "nuque", el: "rect", attrs: { x: 90, y: 52, width: 20, height: 16 }, rx: 7 },
  { zone: "epaules", el: "rect", attrs: { x: 62, y: 70, width: 76, height: 20 }, rx: 10 },
  { zone: "dos", el: "rect", attrs: { x: 72, y: 92, width: 56, height: 50 }, rx: 16 },
  { zone: "energie", el: "rect", attrs: { x: 78, y: 132, width: 44, height: 34 }, rx: 14 },
  { zone: "hanches", el: "rect", attrs: { x: 72, y: 168, width: 56, height: 30 }, rx: 14 },
  { zone: "poignets", el: "circle", attrs: { cx: 45, cy: 176, r: 12 } },
  { zone: "jambes", el: "rect", attrs: { x: 78, y: 210, width: 44, height: 150 }, rx: 20 },
];

function ZoneShape({ r, fill, opacity }: { r: Region; fill: string; opacity: number }) {
  const common = { fill, opacity, style: { transition: "fill .7s ease, opacity .2s ease" } };
  if (r.el === "circle") return <circle {...r.attrs} {...common} />;
  if (r.el === "ellipse") return <ellipse {...r.attrs} {...common} />;
  return <rect {...r.attrs} rx={r.rx} {...common} />;
}

export function BodyMap({
  strain,
  onZoneClick,
}: {
  strain: Record<Zone, number>;
  onZoneClick?: (zone: Zone) => void;
}) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  const [hovered, setHovered] = useState<Zone | null>(null);
  const ink = "var(--m-ink)";

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="0 0 200 380"
        className="w-40 shrink-0 sm:w-48"
        role="img"
        aria-label="BodyMap : silhouette du corps, chaque zone colorée selon sa sollicitation — cliquez une zone pour ses exercices"
      >
        {/* ombre au sol */}
        <ellipse cx={100} cy={372} rx={44} ry={5} fill={ink} opacity={0.08} />

        {/* --- zones colorées (sous le trait) --- */}
        {REGIONS.map((r) => (
          <g
            key={r.zone}
            role="button"
            tabIndex={0}
            aria-label={`${ZONE_LABELS[r.zone]} — voir les exercices`}
            onClick={() => onZoneClick?.(r.zone)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onZoneClick?.(r.zone);
              }
            }}
            onMouseEnter={() => setHovered(r.zone)}
            onMouseLeave={() => setHovered(null)}
            className="cursor-pointer outline-none"
          >
            <ZoneShape r={r} fill={statusColor(strain[r.zone])} opacity={hovered === r.zone ? 1 : 0.85} />
          </g>
        ))}

        {/* --- silhouette : trait noir par-dessus (non interactif) --- */}
        <g
          fill="none"
          stroke={ink}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          pointerEvents="none"
        >
          {/* tête + cou */}
          <circle cx={100} cy={34} r={22} />
          <path d="M90 54 L90 68 M110 54 L110 68" />
          {/* épaules + tronc */}
          <path d="M90 66 C70 68 60 78 58 92 L66 150 C68 168 72 176 72 196 L128 196 C128 176 132 168 134 150 L142 92 C140 78 130 68 110 66" />
          {/* taille (repère abdos) */}
          <path d="M74 132 C88 138 112 138 126 132" opacity={0.35} strokeWidth={2} />
          {/* bras gauche */}
          <path d="M60 90 C48 104 42 132 42 160 C42 170 44 178 46 186" />
          {/* bras droit */}
          <path d="M140 90 C152 104 158 132 158 160 C158 170 156 178 154 186" />
          {/* mains */}
          <circle cx={45} cy={190} r={7} />
          <circle cx={155} cy={190} r={7} />
          {/* bassin + jambes */}
          <path d="M74 196 L80 300 C81 330 82 350 84 366 L96 366 C97 348 98 320 100 300 C102 320 103 348 104 366 L116 366 C118 350 119 330 120 300 L126 196" />
          {/* pieds */}
          <path d="M82 366 C78 372 74 373 72 373 L92 373 L92 366" />
          <path d="M118 366 C122 372 126 373 128 373 L108 373 L108 366" />
        </g>
      </svg>

      {/* Détail par zone (cliquable, synchronisé au survol) */}
      <div className="min-w-44 flex-1 space-y-1">
        {sorted.map((z) => {
          const v = Math.round(strain[z]);
          return (
            <button
              key={z}
              onClick={() => onZoneClick?.(z)}
              onMouseEnter={() => setHovered(z)}
              onMouseLeave={() => setHovered(null)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1 text-left transition ${
                hovered === z ? "bg-[var(--m-bg2)]" : "hover:bg-[var(--m-bg2)]"
              }`}
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
