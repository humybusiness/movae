import { useMemo } from "react";
import { useMovae } from "../state/store";
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
