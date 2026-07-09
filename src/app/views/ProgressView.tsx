import { useMemo } from "react";
import { Brain } from "lucide-react";
import { useMovae } from "../state/store";
import { learnedSummary } from "../engine/engine";
import { exerciseById } from "../data/exercises";
import { MCard, SectionTitle } from "../components/ui";
import { ZONE_LABELS, ZONES, type Zone } from "../types";
import { dayKey, formatClock, formatDayLabel, shiftDayKey } from "../../lib/time";

export function ProgressView({ now }: { now: number }) {
  const { state } = useMovae();

  const week = useMemo(() => {
    const today = dayKey(now);
    return Array.from({ length: 7 }, (_, i) => {
      const key = shiftDayKey(today, i - 6);
      const day = state.days[key];
      return {
        key,
        label: formatDayLabel(key),
        index: day?.index ?? 0,
        breaks: day?.breaks ?? 0,
        activeMin: day?.activeMin ?? 0,
      };
    });
  }, [state.days, now]);

  const weekBreaks = week.reduce((s, d) => s + d.breaks, 0);
  const weekActive = Math.round(week.reduce((s, d) => s + d.activeMin, 0));
  const activeDays = week.filter((d) => d.breaks >= 3).length;

  const weekStart = now - 7 * 86400000;
  const zoneCounts = useMemo(() => {
    const counts = Object.fromEntries(ZONES.map((z) => [z, 0])) as Record<Zone, number>;
    for (const h of state.history) {
      if (h.ts >= weekStart) for (const z of h.zones) counts[z] += 1;
    }
    return counts;
  }, [state.history, weekStart]);
  const maxZone = Math.max(1, ...ZONES.map((z) => zoneCounts[z]));

  const recent = [...state.history].slice(-8).reverse();

  return (
    <div>
      <SectionTitle
        title="Progression"
        subtitle="Votre régularité, semaine après semaine. Sans classement, sans pression."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { value: String(weekBreaks), label: "pauses sur 7 jours" },
          { value: `${Math.floor(weekActive / 60)} h ${String(weekActive % 60).padStart(2, "0")}`, label: "de travail estimé" },
          { value: `${activeDays}/7`, label: "jours actifs (≥ 3 pauses)" },
        ].map((s) => (
          <MCard key={s.label} className="p-5">
            <p className="font-display text-3xl font-semibold">{s.value}</p>
            <p className="mt-1 text-sm text-[var(--m-ink2)]">{s.label}</p>
          </MCard>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <MCard className="p-6">
          <h3 className="font-display text-lg font-semibold">Indice Movaé — 7 jours</h3>
          <div className="mt-6 flex h-44 items-end justify-between gap-3" role="img" aria-label="Indice Movaé des 7 derniers jours">
            {week.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                <span className="text-xs font-semibold tabular-nums text-[var(--m-ink2)]">
                  {d.index > 0 ? d.index : "·"}
                </span>
                <div
                  className="w-full max-w-9 rounded-t-lg bg-[var(--m-accent)] transition-all"
                  style={{
                    height: `${Math.max(3, d.index)}%`,
                    opacity: d.index > 0 ? 1 : 0.25,
                  }}
                />
                <span className="text-[10px] font-semibold uppercase text-[var(--m-ink2)]">
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </MCard>

        <MCard className="p-6">
          <h3 className="font-display text-lg font-semibold">Zones mobilisées — 7 jours</h3>
          <div className="mt-5 space-y-2.5">
            {[...ZONES]
              .sort((a, b) => zoneCounts[b] - zoneCounts[a])
              .map((z) => (
                <div key={z} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-semibold text-[var(--m-ink2)]">
                    {ZONE_LABELS[z]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--m-bg2)]">
                    <div
                      className="h-full rounded-full bg-[var(--m-accent)]"
                      style={{ width: `${(zoneCounts[z] / maxZone) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-xs tabular-nums text-[var(--m-ink2)]">
                    {zoneCounts[z]}
                  </span>
                </div>
              ))}
          </div>
          <p className="mt-4 text-xs text-[var(--m-ink2)]">
            Un rythme équilibré mobilise plusieurs zones dans la semaine — le moteur y
            veille dans ses recommandations.
          </p>
        </MCard>
      </div>

      {/* Fresque de mouvement : 12 semaines d'un coup d'œil */}
      <MCard className="mt-5 p-6">
        <h3 className="font-display text-lg font-semibold">Votre fresque de mouvement</h3>
        <p className="mt-1 text-xs text-[var(--m-ink2)]">
          12 semaines · plus la case est verte, plus la journée a été active.
        </p>
        <div className="mt-4 flex gap-1 overflow-x-auto pb-1" role="img" aria-label="Activité des 12 dernières semaines">
          {Array.from({ length: 12 }, (_, w) => (
            <div key={w} className="flex flex-col gap-1">
              {Array.from({ length: 7 }, (_, d) => {
                const offset = (11 - w) * 7 + (6 - d);
                const key = shiftDayKey(dayKey(now), -offset);
                const dayData = state.days[key];
                const breaks = dayData?.breaks ?? 0;
                const intensity = Math.min(1, breaks / 6);
                return (
                  <div
                    key={d}
                    className="h-3.5 w-3.5 rounded-[4px]"
                    style={{
                      background:
                        breaks > 0 ? "var(--m-accent)" : "var(--m-bg2)",
                      opacity: breaks > 0 ? 0.25 + intensity * 0.75 : 1,
                    }}
                    title={`${key} : ${breaks} pause${breaks > 1 ? "s" : ""}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </MCard>

      {state.prefs.smartMode && (() => {
        const learned = learnedSummary(state);
        if (learned.observedHours.length === 0 && learned.triedCount === 0) return null;
        return (
          <MCard className="mt-5 p-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-[var(--m-strong)]" aria-hidden />
              <h3 className="font-display text-lg font-semibold">Ce que Movaé a appris</h3>
            </div>
            {learned.observedHours.length > 0 && (
              <>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-[var(--m-ink2)]">
                  Votre réceptivité aux pauses, heure par heure
                </p>
                <div
                  className="mt-3 flex h-24 items-end gap-1.5"
                  role="img"
                  aria-label="Réceptivité aux pauses par heure de la journée"
                >
                  {learned.observedHours.map((h) => (
                    <div key={h.hour} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full max-w-8 rounded-t-md bg-[var(--m-accent)]"
                        style={{ height: `${Math.round(h.receptivity * 100)}%`, opacity: 0.4 + h.receptivity * 0.6 }}
                        title={`${h.hour} h : ${Math.round(h.receptivity * 100)} % (${h.samples} propositions)`}
                      />
                      <span className="text-[10px] font-semibold text-[var(--m-ink2)]">{h.hour}h</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--m-ink2)]">
                  Le moteur propose plus volontiers aux heures hautes et protège les heures
                  basses (vos phases de concentration).
                </p>
              </>
            )}
            <p className="mt-4 text-sm">
              <span className="font-semibold">{learned.triedCount}</span>
              <span className="text-[var(--m-ink2)]"> exercices essayés sur 100</span>
              {learned.favorite && (
                <span className="text-[var(--m-ink2)]">
                  {" "}— favori : <span className="font-semibold text-[var(--m-ink)]">{learned.favorite.name}</span>
                </span>
              )}
            </p>
          </MCard>
        );
      })()}

      <MCard className="mt-5 p-6">
        <h3 className="font-display text-lg font-semibold">Dernières pauses</h3>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--m-ink2)]">
            Votre historique apparaîtra ici après votre première pause.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--m-line)]">
            {recent.map((b) => {
              const ex = exerciseById(b.exerciseId);
              const d = new Date(b.ts);
              return (
                <li key={b.id} className="flex items-center gap-4 py-2.5 text-sm">
                  <span className="w-28 shrink-0 text-xs text-[var(--m-ink2)]">
                    {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} ·{" "}
                    {formatClock(b.ts)}
                  </span>
                  <span className="flex-1">{ex?.name ?? b.exerciseId}</span>
                  <span className="text-xs text-[var(--m-ink2)]">
                    {b.zones.map((z) => ZONE_LABELS[z]).join(", ")}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </MCard>
    </div>
  );
}
