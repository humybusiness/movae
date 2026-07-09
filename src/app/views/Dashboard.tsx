import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Clock,
  Eye,
  Flame,
  Gift,
  Play,
  RefreshCw,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";
import { useMovae } from "../state/store";
import {
  getRecommendation,
  indexStatus,
  todayIndex,
  todayStats,
  yesterdayIndex,
} from "../engine/engine";
import { EYE_EXERCISE_ID, exerciseById, type Exercise } from "../data/exercises";
import { REWARDS } from "../data/rewards";
import { ExerciseFigure } from "../components/ExerciseFigure";
import { IndexVisual } from "../components/IndexVisual";
import { Chip, MButton, MCard, ProgressBar } from "../components/ui";
import { URGENCY_LABELS, ZONE_LABELS, ZONES, type UrgencyLevel } from "../types";
import { formatClock, formatDuration } from "../../lib/time";

const URGENCY_TONES: Record<UrgencyLevel, string> = {
  fraiche: "bg-[var(--m-soft)] text-[var(--m-strong)]",
  ok: "bg-[var(--m-soft)] text-[var(--m-strong)]",
  bientot: "bg-[#D9C7A7]/30 text-[#8F7443]",
  recommandee: "bg-[#C9A86A]/25 text-[#8F7443]",
  prioritaire: "bg-[#C9A86A]/40 text-[#6E5730]",
};

export function Dashboard({
  now,
  onStartBreak,
}: {
  now: number;
  onStartBreak: (queue: Exercise[]) => void;
}) {
  const { state, dispatch } = useMovae();
  const [altIndex, setAltIndex] = useState(-1);

  const rec = useMemo(() => getRecommendation(state, now), [state, now]);
  const day = todayStats(state, now);
  const index = todayIndex(state, now);
  const yIndex = yesterdayIndex(state, now);
  const working = state.session.status === "working";
  const away = state.session.status === "away";

  const proposed = altIndex >= 0 && rec.alternatives[altIndex % rec.alternatives.length]
    ? rec.alternatives[altIndex % rec.alternatives.length]
    : rec.exercise;

  const nextReward = useMemo(() => {
    const locked = REWARDS.filter((r) => !state.unlocked.includes(r.id) && r.progress);
    return locked
      .map((r) => ({ r, p: r.progress!(state) }))
      .sort((a, b) => b.p.current / b.p.target - a.p.current / a.p.target)[0];
  }, [state]);

  const strainSorted = [...ZONES].sort((a, b) => state.strain[b] - state.strain[a]);
  const todayBreaks = state.history.filter(
    (h) => new Date(h.ts).toDateString() === new Date(now).toDateString(),
  );

  return (
    <div className="space-y-5">
      {/* Bandeau yeux (règle 20-20-20) */}
      {rec.eyeDue && working && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--m-accent)]/40 bg-[var(--m-soft)] px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--m-strong)]">
            <Eye className="h-4 w-4" aria-hidden />
            Vos yeux fixent l’écran depuis plus de 20 minutes.
          </p>
          <MButton
            variant="secondary"
            className="!py-1.5"
            onClick={() => onStartBreak([exerciseById(EYE_EXERCISE_ID)!])}
          >
            20 s au loin
          </MButton>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Indice Movaé */}
        <MCard className="flex flex-col items-center p-6 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">
            Indice Movaé
          </p>
          <div className="my-4 flex flex-1 items-center">
            <IndexVisual value={index} style={state.prefs.indexStyle} />
          </div>
          <p className="font-semibold text-[var(--m-strong)]">{indexStatus(index)}</p>
          <p className="mt-1 text-xs text-[var(--m-ink2)]">
            {yIndex !== null ? (
              <>
                {index >= yIndex ? "+" : ""}
                {index - yIndex} par rapport à hier
              </>
            ) : (
              "L’Indice reflète votre régularité du jour."
            )}
          </p>
        </MCard>

        {/* Prochaine pause / démarrage */}
        <MCard className="p-6 lg:col-span-2">
          {!working && !away ? (
            <div className="flex h-full flex-col items-start justify-center">
              <Chip tone="accent">
                <Sun className="h-3.5 w-3.5" aria-hidden />
                Journée non démarrée
              </Chip>
              <h2 className="font-display mt-4 text-2xl font-semibold tracking-tight">
                Prêt à travailler ? Movaé veille sur votre rythme.
              </h2>
              <p className="mt-2 max-w-lg text-sm text-[var(--m-ink2)]">
                Démarrez votre journée : le moteur Movaé estime la sollicitation de chaque
                zone de votre corps selon votre style de travail, et vous propose la bonne
                pause au bon moment. Tout est calculé localement, sans caméra.
              </p>
              <MButton className="mt-5" onClick={() => dispatch({ type: "start-day", now })}>
                <Play className="h-4 w-4" aria-hidden />
                Démarrer ma journée
              </MButton>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${URGENCY_TONES[rec.level]}`}
                >
                  {URGENCY_LABELS[rec.level]}
                </span>
                <p className="flex items-center gap-1.5 text-xs text-[var(--m-ink2)]">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {rec.sinceBreakMin < 1
                    ? "Pause à l’instant"
                    : `Dernier mouvement il y a ${Math.round(rec.sinceBreakMin)} min`}
                </p>
              </div>

              <div className="mt-4 flex flex-1 flex-wrap items-center gap-6">
                <div className="shrink-0 rounded-2xl bg-[var(--m-bg2)] p-2">
                  <ExerciseFigure motion={proposed.motion} size={124} animate />
                </div>
                <div className="min-w-52 flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">
                    Pause recommandée
                  </p>
                  <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight">
                    {proposed.name}
                  </h2>
                  <p className="mt-1.5 text-sm text-[var(--m-ink2)]">{proposed.why}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proposed.zones.map((z) => (
                      <Chip key={z} tone="accent">
                        {ZONE_LABELS[z]}
                      </Chip>
                    ))}
                    <Chip>{formatDuration(proposed.durationSec)}</Chip>
                    <Chip tone="warm">{proposed.reps}</Chip>
                  </div>
                  {state.prefs.smartMode && rec.reasons.length > 0 && altIndex < 0 && (
                    <p className="mt-2.5 flex items-start gap-1.5 text-xs text-[var(--m-ink2)]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--m-accent)]" aria-hidden />
                      <span>Pourquoi : {rec.reasons.join(" · ")}.</span>
                    </p>
                  )}
                  {state.prefs.smartMode &&
                    rec.nextIdealAt &&
                    (rec.level === "fraiche" || rec.level === "ok") && (
                      <p className="mt-1.5 text-xs text-[var(--m-ink2)]">
                        Prochaine fenêtre idéale estimée vers{" "}
                        <span className="font-semibold text-[var(--m-strong)]">
                          {formatClock(rec.nextIdealAt)}
                        </span>
                        .
                      </p>
                    )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <MButton onClick={() => onStartBreak([proposed])}>
                  <Play className="h-4 w-4" aria-hidden />
                  Commencer
                </MButton>
                <MButton variant="secondary" onClick={() => setAltIndex((i) => i + 1)}>
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Autre idée
                </MButton>
                <MButton
                  variant="ghost"
                  onClick={() => dispatch({ type: "snooze", until: now + 10 * 60000 })}
                  disabled={rec.snoozed}
                >
                  {rec.snoozed ? "Rappel dans 10 min" : "Plus tard"}
                </MButton>
              </div>
            </div>
          )}
        </MCard>
      </div>

      {/* Objectif / série / récompense */}
      <div className="grid gap-5 sm:grid-cols-3">
        <MCard className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">
            <Target className="h-3.5 w-3.5" aria-hidden />
            Objectif du jour
          </p>
          <p className="font-display mt-3 text-3xl font-semibold">
            {day.breaks}
            <span className="text-lg text-[var(--m-ink2)]"> / {state.profile.goal} pauses</span>
          </p>
          <ProgressBar className="mt-3" value={day.breaks} max={state.profile.goal} />
        </MCard>
        <MCard className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            Série
          </p>
          <p className="font-display mt-3 text-3xl font-semibold">
            {state.streak.current}
            <span className="text-lg text-[var(--m-ink2)]">
              {" "}
              jour{state.streak.current > 1 ? "s" : ""}
            </span>
          </p>
          <p className="mt-3 text-xs text-[var(--m-ink2)]">
            Record : {state.streak.best} — un jour compte à partir de 3 pauses.
          </p>
        </MCard>
        <MCard className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--m-ink2)]">
            <Gift className="h-3.5 w-3.5" aria-hidden />
            Prochaine récompense
          </p>
          {nextReward ? (
            <>
              <p className="mt-3 font-semibold">{nextReward.r.name}</p>
              <p className="mt-1 text-xs text-[var(--m-ink2)]">{nextReward.r.hint}</p>
              <ProgressBar
                className="mt-3"
                tone="warm"
                value={nextReward.p.current}
                max={nextReward.p.target}
              />
            </>
          ) : (
            <p className="mt-3 text-sm text-[var(--m-ink2)]">
              Tout est débloqué. Impressionnant.
            </p>
          )}
        </MCard>
      </div>

      {/* Sollicitation par zone + journée */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MCard className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Sollicitation estimée</h3>
            <Chip>{working ? "en direct" : "en veille"}</Chip>
          </div>
          <div className="mt-4 space-y-2.5">
            {strainSorted.map((z) => {
              const v = Math.round(state.strain[z]);
              const high = v >= 70;
              return (
                <div key={z} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-xs font-semibold text-[var(--m-ink2)]">
                    {ZONE_LABELS[z]}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--m-bg2)]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${v}%`,
                        background: high ? "#C9A86A" : "var(--m-accent)",
                      }}
                    />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-[var(--m-ink2)]">
                    {high ? "à bouger" : v > 40 ? "à suivre" : "ok"}
                  </span>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-[var(--m-ink2)]">
            Estimation locale basée sur votre temps de travail, votre style déclaré et vos
            pauses. Aucune donnée ne quitte ce navigateur.
          </p>
        </MCard>

        <MCard className="p-6">
          <h3 className="font-display text-lg font-semibold">Votre journée</h3>
          {todayBreaks.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--m-ink2)]">
              Aucune pause pour l’instant.{" "}
              {working
                ? "La première recommandation arrive au bon moment."
                : "Démarrez votre journée pour activer le moteur Movaé."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2.5">
              {todayBreaks
                .slice(-6)
                .reverse()
                .map((b) => {
                  const ex = exerciseById(b.exerciseId);
                  return (
                    <li key={b.id} className="flex items-center gap-3 text-sm">
                      <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-[var(--m-ink2)]">
                        {formatClock(b.ts)}
                      </span>
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--m-accent)]" aria-hidden />
                      <span className="flex-1 truncate">{ex?.name ?? b.exerciseId}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--m-ink2)]" aria-hidden />
                    </li>
                  );
                })}
            </ul>
          )}
          <div className="mt-5 flex gap-6 border-t border-[var(--m-line)] pt-4 text-sm">
            <div>
              <p className="font-display text-xl font-semibold">{Math.round(day.activeMin)} min</p>
              <p className="text-xs text-[var(--m-ink2)]">de travail estimé</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold">{day.breaks}</p>
              <p className="text-xs text-[var(--m-ink2)]">pauses actives</p>
            </div>
            <div>
              <p className="font-display text-xl font-semibold">{day.zones.length}/8</p>
              <p className="text-xs text-[var(--m-ink2)]">zones mobilisées</p>
            </div>
          </div>
        </MCard>
      </div>
    </div>
  );
}
