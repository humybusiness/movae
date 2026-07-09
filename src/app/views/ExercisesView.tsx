import { useState } from "react";
import { Play } from "lucide-react";
import { EXERCISES, type Exercise } from "../data/exercises";
import { FigureVisual } from "../components/FigureVisual";
import { Chip, MButton, MCard, SectionTitle } from "../components/ui";
import { ZONE_LABELS, ZONES, type Zone } from "../types";
import { formatDuration } from "../../lib/time";

const DISCRETION_LABELS = { 1: "Invisible", 2: "Discret", 3: "Visible" } as const;

export function ExercisesView({ onStart }: { onStart: (queue: Exercise[]) => void }) {
  const [filter, setFilter] = useState<Zone | "toutes">("toutes");
  const list =
    filter === "toutes" ? EXERCISES : EXERCISES.filter((e) => e.zones.includes(filter));

  return (
    <div>
      <SectionTitle
        title="Bibliothèque d’exercices"
        subtitle="Tous assis, sans matériel, conçus pour les vraies journées de bureau."
      />
      <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filtrer par zone">
        <button
          onClick={() => setFilter("toutes")}
          aria-pressed={filter === "toutes"}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            filter === "toutes"
              ? "bg-[var(--m-strong)] text-[var(--m-bg)]"
              : "border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink2)] hover:bg-[var(--m-soft)]"
          }`}
        >
          Toutes
        </button>
        {ZONES.map((z) => (
          <button
            key={z}
            onClick={() => setFilter(z)}
            aria-pressed={filter === z}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              filter === z
                ? "bg-[var(--m-strong)] text-[var(--m-bg)]"
                : "border border-[var(--m-line)] bg-[var(--m-card)] text-[var(--m-ink2)] hover:bg-[var(--m-soft)]"
            }`}
          >
            {ZONE_LABELS[z]}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((ex) => (
          <MCard key={ex.id} className="flex flex-col p-5 transition hover:-translate-y-0.5">
            <div className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl bg-[var(--m-bg2)]">
                <FigureVisual visual={ex.visual} size={84} />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold leading-snug">{ex.name}</h3>
                <p className="mt-1 text-xs text-[var(--m-ink2)]">
                  {formatDuration(ex.durationSec)} · {DISCRETION_LABELS[ex.discretion]}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ex.zones.map((z) => (
                    <Chip key={z} tone="accent">
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
    </div>
  );
}
