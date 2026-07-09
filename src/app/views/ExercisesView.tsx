import { useMemo, useState } from "react";
import { EyeOff, Play, Search } from "lucide-react";
import { EXERCISES, type Exercise } from "../data/exercises";
import { ExerciseFigure } from "../components/ExerciseFigure";
import { Chip, MButton, MCard, SectionTitle } from "../components/ui";
import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";
import { formatDuration } from "../../lib/time";

const DISCRETION_LABELS = { 1: "Invisible", 2: "Discret", 3: "Visible" } as const;
const POSITIONS = ["assis", "debout"] as const;

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-[var(--m-strong)] text-[var(--m-bg)]"
          : "border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink2)] hover:bg-[var(--m-soft)]"
      }`}
    >
      {children}
    </button>
  );
}

export function ExercisesView({ onStart }: { onStart: (queue: Exercise[]) => void }) {
  const [zone, setZone] = useState<Zone | null>(null);
  const [position, setPosition] = useState<(typeof POSITIONS)[number] | null>(null);
  const [invisibleOnly, setInvisibleOnly] = useState(false);
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return EXERCISES.filter((e) => {
      if (zone && !e.zones.includes(zone)) return false;
      if (position && e.position !== position && e.position !== "assis-debout") return false;
      if (invisibleOnly && e.discretion !== 1) return false;
      if (q && !`${e.name} ${e.why}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [zone, position, invisibleOnly, query]);

  return (
    <div>
      <SectionTitle
        title={`Bibliothèque — ${EXERCISES.length} exercices`}
        subtitle="Assis ou debout, sans matériel, illustrés pour être compris d'un coup d'œil. Conçus selon les repères INRS et la littérature en ergonomie."
      />

      {/* Recherche + filtres */}
      <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-[var(--m-line)] bg-[var(--m-card)] px-3.5 py-2.5">
        <Search className="h-4 w-4 shrink-0 text-[var(--m-ink2)]" aria-hidden />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un exercice (nuque, respiration, poignets…)"
          className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--m-ink2)]"
          aria-label="Rechercher un exercice"
        />
      </div>
      <div className="mb-2 flex flex-wrap gap-2" role="group" aria-label="Filtrer par zone">
        <FilterChip active={zone === null} onClick={() => setZone(null)}>
          Toutes zones
        </FilterChip>
        {ZONES.map((z) => (
          <FilterChip key={z} active={zone === z} onClick={() => setZone(zone === z ? null : z)}>
            {ZONE_LABELS[z]}
          </FilterChip>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Autres filtres">
        {POSITIONS.map((p) => (
          <FilterChip
            key={p}
            active={position === p}
            onClick={() => setPosition(position === p ? null : p)}
          >
            {p === "assis" ? "Assis" : "Debout"}
          </FilterChip>
        ))}
        <FilterChip active={invisibleOnly} onClick={() => setInvisibleOnly(!invisibleOnly)}>
          <span className="inline-flex items-center gap-1">
            <EyeOff className="h-3 w-3" aria-hidden />
            Invisible en open space
          </span>
        </FilterChip>
        <span className="ml-auto self-center text-xs text-[var(--m-ink2)]">
          {list.length} exercice{list.length > 1 ? "s" : ""}
        </span>
      </div>

      {list.length === 0 ? (
        <MCard className="p-8 text-center text-sm text-[var(--m-ink2)]">
          Aucun exercice ne correspond à ces filtres.
        </MCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((ex) => (
            <MCard key={ex.id} className="flex flex-col p-5 transition hover:-translate-y-0.5">
              <div className="flex items-start gap-4">
                <div className="shrink-0 rounded-xl bg-[var(--m-bg2)]">
                  <ExerciseFigure motion={ex.motion} size={92} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold leading-snug">{ex.name}</h3>
                  <p className="mt-1 text-xs text-[var(--m-ink2)]">
                    {formatDuration(ex.durationSec)} · {DISCRETION_LABELS[ex.discretion]} ·{" "}
                    {ex.position === "assis-debout" ? "assis ou debout" : ex.position}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold text-[var(--m-strong)]">{ex.reps}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ex.zones.map((z) => (
                      <Chip key={z} color={ZONE_COLORS[z]}>
                        {ZONE_LABELS[z]}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm text-[var(--m-ink2)]">{ex.why}</p>
              <MButton variant="secondary" className="mt-4 w-full" onClick={() => onStart([ex])}>
                <Play className="h-4 w-4" aria-hidden />
                Lancer
              </MButton>
            </MCard>
          ))}
        </div>
      )}
    </div>
  );
}
