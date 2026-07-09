import { Play } from "lucide-react";
import { PROGRAMS } from "../data/programs";
import { exerciseById, type Exercise } from "../data/exercises";
import { Chip, MButton, MCard, SectionTitle } from "../components/ui";
import { ZONE_LABELS } from "../types";
import { formatDuration } from "../../lib/time";

export function ProgramsView({ onStart }: { onStart: (queue: Exercise[]) => void }) {
  return (
    <div>
      <SectionTitle
        title={`Programmes guidés — ${PROGRAMS.length} rituels`}
        subtitle="Des enchaînements courts pensés pour les moments et situations clés de la journée."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {PROGRAMS.map((p) => {
          const exercises = p.exerciseIds
            .map((id) => exerciseById(id))
            .filter((e): e is Exercise => Boolean(e));
          const totalSec = exercises.reduce((s, e) => s + e.durationSec, 0);
          return (
            <MCard key={p.id} className="flex flex-col p-6 transition hover:-translate-y-0.5">
              <div className="flex flex-wrap gap-1.5">
                {p.zones.map((z) => (
                  <Chip key={z} tone="accent">
                    {ZONE_LABELS[z]}
                  </Chip>
                ))}
                <Chip>{formatDuration(totalSec)}</Chip>
                {p.discret && <Chip tone="warm">Discret</Chip>}
              </div>
              <h3 className="font-display mt-3 text-xl font-semibold tracking-tight">{p.name}</h3>
              <p className="mt-1 text-sm text-[var(--m-ink2)]">{p.tagline}</p>
              <ol className="mt-4 flex-1 space-y-2">
                {exercises.map((e, i) => (
                  <li key={e.id} className="flex items-center gap-2.5 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--m-bg2)] text-[10px] font-bold text-[var(--m-ink2)]">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate">{e.name}</span>
                    <span className="text-xs tabular-nums text-[var(--m-ink2)]">
                      {formatDuration(e.durationSec)}
                    </span>
                  </li>
                ))}
              </ol>
              <MButton className="mt-5 w-full" onClick={() => onStart(exercises)}>
                <Play className="h-4 w-4" aria-hidden />
                Lancer le programme
              </MButton>
            </MCard>
          );
        })}
      </div>
    </div>
  );
}
