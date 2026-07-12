import { useState } from "react";
import { BodyMap3D } from "./BodyMap3D";
import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// LA BODYMAP — le cœur de Movaé.
//
// Votre corps en vrai 3D (le personnage argile debout), en temps réel :
//  - chaque PARTIE du corps est colorée selon son état (vert sauge = bien
//    mobilisée → sable → terracotta = réclame du mouvement), piloté par le
//    moteur ;
//  - on peut CLIQUER directement sur une partie du corps (ou sur la liste à
//    côté) pour ouvrir les exercices de la zone.

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

export function BodyMap({
  strain,
  onZoneClick,
}: {
  strain: Record<Zone, number>;
  onZoneClick?: (zone: Zone) => void;
}) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  const [hovered, setHovered] = useState<Zone | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-6">
      {/* Le personnage argile 3D, cliquable par zone */}
      <BodyMap3D
        strain={strain}
        onZoneClick={onZoneClick}
        hovered={hovered}
        onHover={setHovered}
        size={248}
      />

      {/* Détail par zone (cliquable aussi, synchronisé au survol) */}
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
          (ou le corps) pour ses exercices.
        </p>
      </div>
    </div>
  );
}
