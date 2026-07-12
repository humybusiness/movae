import { useMemo, useState } from "react";
import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// LA BODYMAP — silhouette anatomique 2D au trait noir, cœur du dashboard.
//
// Une silhouette humaine de face (fidèle à la référence : tête ronde, épaules
// naturelles, bras légèrement écartés, mains, pieds nus), dessinée en un seul
// trait noir lissé. Des pastilles cliquables sont posées aux bons endroits du
// corps ; leur couleur reflète la sollicitation de la zone (sauge = bien
// mobilisée → sable → terracotta = réclame du mouvement) et un clic ouvre les
// exercices de la zone.

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

// ---- Contour de la silhouette (viewBox 0 0 300 640, centre x = 150) ----
// On ne décrit que la MOITIÉ DROITE, de la couronne au périnée ; la gauche est
// obtenue par symétrie (x → 300 − x). Le tracé final est une spline fermée
// lissée qui passe par ces repères anatomiques.
type P = [number, number];

const RIGHT_HALF: P[] = [
  [168, 36], // couronne (droite)
  [186, 66], // crâne, largeur max
  [179, 91], // pommette / mâchoire
  [165, 105], // mâchoire → cou
  [160, 117], // cou (droite)
  [179, 123], // trapèze
  [206, 133], // épaule / deltoïde
  [216, 159], // haut du bras
  [219, 206], // bras
  [218, 240], // coude
  [214, 300], // avant-bras
  [212, 330], // poignet (extérieur)
  [219, 351], // dos de la main
  [212, 379], // doigts
  [200, 385], // bout des doigts
  [193, 367], // main (intérieur)
  [196, 336], // poignet (intérieur)
  [201, 300], // avant-bras interne
  [204, 240], // coude interne
  [201, 186], // haut de bras interne
  [190, 153], // aisselle
  [180, 201], // flanc haut
  [174, 240], // taille
  [180, 275], // hanche haute
  [193, 303], // hanche (largeur max)
  [189, 351], // cuisse externe
  [181, 449], // genou externe
  [172, 521], // mollet externe
  [165, 567], // cheville externe
  [170, 583], // cou-de-pied
  [188, 593], // orteils
  [162, 597], // talon
  [151, 569], // cheville interne
  [150, 521], // mollet interne
  [151, 449], // genou interne
  [153, 351], // cuisse interne
  [150, 323], // périnée (centre)
];

const APEX: P = [150, 30]; // sommet du crâne, sur l'axe

function fullLoop(): P[] {
  const mirror = ([x, y]: P): P => [300 - x, y];
  const pts: P[] = [APEX, ...RIGHT_HALF];
  // remontée du côté gauche : miroir des points, du périnée vers la couronne,
  // en sautant le dernier (périnée, déjà sur l'axe).
  for (let i = RIGHT_HALF.length - 2; i >= 0; i--) pts.push(mirror(RIGHT_HALF[i]));
  return pts;
}

// Spline de Catmull-Rom fermée → chemin SVG cubique lissé.
function smoothClosedPath(pts: P[]): string {
  const n = pts.length;
  const pt = (i: number) => pts[((i % n) + n) % n];
  let d = `M ${pt(0)[0].toFixed(1)} ${pt(0)[1].toFixed(1)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pt(i - 1);
    const p1 = pt(i);
    const p2 = pt(i + 1);
    const p3 = pt(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)} `;
  }
  return d + "Z";
}

// Pastilles cliquables, posées au bon endroit du corps.
const DOTS: { zone: Zone; x: number; y: number }[] = [
  { zone: "yeux", x: 150, y: 62 },
  { zone: "nuque", x: 150, y: 110 },
  { zone: "epaules", x: 196, y: 132 },
  { zone: "dos", x: 150, y: 175 },
  { zone: "energie", x: 150, y: 235 },
  { zone: "hanches", x: 150, y: 300 },
  { zone: "poignets", x: 207, y: 335 },
  { zone: "jambes", x: 168, y: 470 },
];

export function BodyMap({
  strain,
  onZoneClick,
}: {
  strain: Record<Zone, number>;
  onZoneClick?: (zone: Zone) => void;
}) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  const [hovered, setHovered] = useState<Zone | null>(null);
  const path = useMemo(() => smoothClosedPath(fullLoop()), []);
  const ink = "var(--m-ink)";

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg
        viewBox="20 10 260 620"
        className="w-40 shrink-0 sm:w-48"
        role="img"
        aria-label="BodyMap : silhouette du corps avec des pastilles cliquables par zone, colorées selon la sollicitation"
      >
        {/* ombre au sol */}
        <ellipse cx={150} cy={606} rx={52} ry={6} fill={ink} opacity={0.07} />

        {/* silhouette : trait noir, intérieur discret */}
        <path
          d={path}
          fill="var(--m-card)"
          stroke={ink}
          strokeWidth={2.4}
          strokeLinejoin="round"
        />

        {/* pastilles cliquables → exercices de la zone */}
        {DOTS.map(({ zone, x, y }) => {
          const active = hovered === zone;
          return (
            <g
              key={zone}
              role="button"
              tabIndex={0}
              aria-label={`${ZONE_LABELS[zone]} : ${Math.round(strain[zone])} sur 100 — voir les exercices`}
              onClick={() => onZoneClick?.(zone)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onZoneClick?.(zone);
                }
              }}
              onMouseEnter={() => setHovered(zone)}
              onMouseLeave={() => setHovered(null)}
              className="cursor-pointer outline-none"
              style={{ transition: "transform .15s ease" }}
            >
              {/* halo d'identité (couleur signature de la zone) */}
              <circle cx={x} cy={y} r={active ? 17 : 13} fill={ZONE_COLORS[zone]} opacity={active ? 0.28 : 0.16} />
              {/* pastille : couleur = état de la zone */}
              <circle cx={x} cy={y} r={active ? 11 : 9} fill={statusColor(strain[zone])} stroke="var(--m-card)" strokeWidth={2.5} />
              <path
                d={`M${x - 3} ${y} H${x + 3} M${x} ${y - 3} V${y + 3}`}
                stroke="var(--m-card)"
                strokeWidth={1.6}
                strokeLinecap="round"
              />
              <title>{`${ZONE_LABELS[zone]} : ${Math.round(strain[zone])}/100 — cliquez pour les exercices`}</title>
            </g>
          );
        })}
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
          Sauge = bien mobilisé · terracotta = réclame du mouvement. Cliquez une pastille
          (ou une zone) pour ses exercices.
        </p>
      </div>
    </div>
  );
}
