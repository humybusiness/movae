import { useMemo, useState } from "react";
import {
  Check,
  Clock,
  Eye,
  Flame,
  Gift,
  Lightbulb,
  Play,
  RefreshCw,
  Sparkles,
  Swords,
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
import { challengeOfDay, challengeDoneOn } from "../data/daily";
import { levelFor } from "../data/levels";
import { tipOfDay } from "../data/tips";
import { dayKey, formatClock, formatDuration } from "../../lib/time";
import { BodyMap } from "../components/BodyMap";
import { ExerciseFigure } from "../components/ExerciseFigure";
import { IndexVisual } from "../components/IndexVisual";
import { Chip, MButton, MCard, ProgressBar } from "../components/ui";
import { URGENCY_LABELS, ZONE_COLORS, ZONE_LABELS, type UrgencyLevel } from "../types";

const URGENCY_TONES: Record<UrgencyLevel, string> = {
  fraiche: "bg-[var(--m-soft)] text-[var(--m-strong)]",
  ok: "bg-[var(--m-soft)] text-[var(--m-strong)]",
  bientot: "bg-[#D9C7A7]/30 text-[#8F7443]",
  recommandee: "bg-[#C9A86A]/25 text-[#8F7443]",
  prioritaire: "bg-[#C9A86A]/40 text-[#6E5730]",
};

function greeting(name: string, now: number): string {
  const h = new Date(now).getHours();
  const who = name ? `, ${name}` : "";
  if (h < 12) return `Bonjour${who}`;
  if (h < 18) return `Bon après-midi${who}`;
  return `Bonsoir${who}`;
}

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

  const proposed =
    altIndex >= 0 && rec.alternatives[altIndex % rec.alternatives.length]
      ? rec.alternatives[altIndex % rec.alternatives.length]
      : rec.exercise;

  const nextReward = useMemo(() => {
    const locked = REWARDS.filter((r) => !state.unlocked.includes(r.id) && r.progress);
    return locked
      .map((r) => ({ r, p: r.progress!(state) }))
      .sort((a, b) => b.p.current / b.p.target - a.p.current / a.p.target)[0];
  }, [state]);

  const todayBreaks = state.history.filter(
    (h) => new Date(h.ts).toDateString() === new Date(now).toDateString(),
  );
  const todayKey = dayKey(now);
  const challenge = challengeOfDay(todayKey);
  const challengeDone = challengeDoneOn(state, todayKey);
  const tip = tipOfDay(todayKey);
  const lvl = levelFor(state.totals.breaks);

  return (
    <div className="space-y-5">
      {/* En-tête éditorial */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {greeting(state.profile.name, now)}
          </h1>
          <p className="mt-1 text-sm text-[var(--m-ink2)]">
            {new Date(now).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            {" · "}Niveau {lvl.level.n} — {lvl.level.name}
          </p>
        </div>
        {working && rec.nextIdealAt && state.prefs.smartMode && (rec.level === "fraiche" || rec.level === "ok") && (
          <p className="flex items-center gap-1.5 text-sm text-[var(--m-ink2)]">
            <Clock className="h-4 w-4" aria-hidden />
            Prochaine fenêtre idéale ~{" "}
            <span className="font-bold text-[var(--m-strong)]">{formatClock(rec.nextIdealAt)}</span>
          </p>
        )}
      </div>

      {/* Bandeau yeux (règle 20-20-20) */}
      {rec.eyeDue && working && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl px-4 py-3" style={{ background: `${ZONE_COLORS.yeux}1a` }}>
          <p className="flex items-center gap-2 text-sm font-semibold" style={{ color: ZONE_COLORS.yeux }}>
            <Eye className="h-4 w-4" aria-hidden />
            20 minutes d’écran — offrez 20 s à vos yeux.
          </p>
          <MButton variant="secondary" className="!py-1.5" onClick={() => onStartBreak([exerciseById(EYE_EXERCISE_ID)!])}>
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
          <div className="my-3 flex flex-1 items-center">
            <IndexVisual value={index} style={state.prefs.indexStyle} />
          </div>
          <p className="font-semibold text-[var(--m-strong)]">{indexStatus(index)}</p>
          {yIndex !== null && (
            <p className="mt-0.5 text-xs text-[var(--m-ink2)]">
              {index >= yIndex ? "+" : ""}
              {index - yIndex} vs hier
            </p>
          )}
          <div className="mt-4 w-full border-t border-[var(--m-line)] pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">Niveau {lvl.level.n}</span>
              {lvl.next && (
                <span className="text-[var(--m-ink2)]">
                  {state.totals.breaks}/{lvl.next.threshold} pauses
                </span>
              )}
            </div>
            {lvl.next && <ProgressBar className="mt-1.5" value={lvl.progress} max={1} />}
          </div>
        </MCard>

        {/* Carte héro : prochaine pause */}
        <div
          className="rounded-2xl border border-[var(--m-line)] p-6 lg:col-span-2"
          style={{
            boxShadow: "var(--m-shadow)",
            background: "linear-gradient(135deg, var(--m-soft) 0%, var(--m-card) 55%)",
          }}
        >
          {!working && !away ? (
            <div className="flex h-full flex-col items-start justify-center py-4">
              <h2 className="font-display text-3xl font-semibold tracking-tight">
                Prêt à travailler ?
              </h2>
              <p className="mt-2 max-w-md text-sm text-[var(--m-ink2)]">
                Démarrez votre journée : Movaé veille sur votre rythme et vous propose la
                bonne pause au bon moment. Tout reste sur votre appareil.
              </p>
              <MButton className="mt-5 !px-8 !py-3.5 !text-base" onClick={() => dispatch({ type: "start-day", now })}>
                <Play className="h-5 w-5" aria-hidden />
                Démarrer ma journée
              </MButton>
            </div>
          ) : (
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${URGENCY_TONES[rec.level]}`}>
                  {URGENCY_LABELS[rec.level]}
                </span>
                <span className="text-xs font-medium text-[var(--m-ink2)]">
                  {rec.sinceBreakMin < 1 ? "Pause à l’instant" : `${Math.round(rec.sinceBreakMin)} min sans pause`}
                </span>
              </div>

              <div className="mt-4 flex flex-1 flex-wrap items-center gap-6">
                <div className="shrink-0 rounded-3xl bg-[var(--m-card)] p-2" style={{ boxShadow: "var(--m-shadow)" }}>
                  <ExerciseFigure motion={proposed.motion} size={148} animate />
                </div>
                <div className="min-w-52 flex-1">
                  <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
                    {proposed.name}
                  </h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {proposed.zones.map((z) => (
                      <Chip key={z} color={ZONE_COLORS[z]}>
                        {ZONE_LABELS[z]}
                      </Chip>
                    ))}
                    <Chip>{formatDuration(proposed.durationSec)}</Chip>
                    <Chip tone="warm">{proposed.reps}</Chip>
                  </div>
                  {state.prefs.smartMode && rec.reasons.length > 0 && altIndex < 0 && (
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-[var(--m-ink2)]">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--m-accent)]" aria-hidden />
                      <span>{rec.reasons.join(" · ")}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <MButton className="!px-7 !py-3 !text-base" onClick={() => onStartBreak([proposed])}>
                  <Play className="h-5 w-5" aria-hidden />
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
        </div>
      </div>

      {/* Objectif / série / récompense — gros chiffres, icônes colorées */}
      <div className="grid gap-5 sm:grid-cols-3">
        <MCard className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: "var(--m-soft)" }}>
            <Target className="h-5 w-5 text-[var(--m-strong)]" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-3xl font-semibold leading-none">
              {day.breaks}
              <span className="text-base text-[var(--m-ink2)]">/{state.profile.goal}</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--m-ink2)]">Objectif du jour</p>
            <ProgressBar className="mt-2" value={day.breaks} max={state.profile.goal} />
          </div>
        </MCard>
        <MCard className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${ZONE_COLORS.energie}1f` }}>
            <Flame className="h-5 w-5" style={{ color: ZONE_COLORS.energie }} aria-hidden />
          </span>
          <div>
            <p className="font-display text-3xl font-semibold leading-none">
              {state.streak.current}
              <span className="text-base text-[var(--m-ink2)]"> j</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-[var(--m-ink2)]">
              Série · record {state.streak.best}
            </p>
          </div>
        </MCard>
        <MCard className="flex items-center gap-4 p-5">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${ZONE_COLORS.poignets}1f` }}>
            <Gift className="h-5 w-5" style={{ color: ZONE_COLORS.poignets }} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            {nextReward ? (
              <>
                <p className="truncate text-sm font-bold">{nextReward.r.name}</p>
                <p className="mt-0.5 text-xs text-[var(--m-ink2)]">{nextReward.r.hint}</p>
                <ProgressBar className="mt-2" tone="warm" value={nextReward.p.current} max={nextReward.p.target} />
              </>
            ) : (
              <p className="text-sm font-semibold">Tout est débloqué 🎉</p>
            )}
          </div>
        </MCard>
      </div>

      {/* Carte du corps + journée */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MCard className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold">Votre jumeau</h3>
            <Chip tone={working ? "accent" : "neutral"}>{working ? "en direct" : "en veille"}</Chip>
          </div>
          <BodyMap
            strain={state.strain}
            justMoved={state.session.lastBreakAt !== null && now - state.session.lastBreakAt < 2 * 60000}
          />
          <p className="mt-3 text-xs text-[var(--m-ink2)]">
            Il se tasse quand vous vous tassez — et se redresse quand vous bougez.
          </p>
        </MCard>

        <MCard className="p-6">
          <h3 className="font-display text-lg font-semibold">Votre journée</h3>
          <div className="mt-4 flex gap-8">
            <div>
              <p className="font-display text-3xl font-semibold leading-none">{Math.round(day.activeMin)}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--m-ink2)]">min de travail</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold leading-none">{day.breaks}</p>
              <p className="mt-1 text-xs font-semibold text-[var(--m-ink2)]">pauses validées</p>
            </div>
            <div>
              <p className="font-display text-3xl font-semibold leading-none">{day.zones.length}<span className="text-base text-[var(--m-ink2)]">/8</span></p>
              <p className="mt-1 text-xs font-semibold text-[var(--m-ink2)]">zones mobilisées</p>
            </div>
          </div>
          {todayBreaks.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-[var(--m-line)] pt-4">
              {todayBreaks.slice(-4).reverse().map((b) => {
                const ex = exerciseById(b.exerciseId);
                const zone = b.zones[0];
                return (
                  <li key={b.id} className="flex items-center gap-3 text-sm">
                    <span className="w-11 shrink-0 text-xs font-semibold tabular-nums text-[var(--m-ink2)]">
                      {formatClock(b.ts)}
                    </span>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ZONE_COLORS[zone] }} aria-hidden />
                    <span className="flex-1 truncate">{ex?.name ?? b.exerciseId}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </MCard>
      </div>

      {/* Défi du jour + conseil kiné */}
      <div className="grid gap-5 lg:grid-cols-2">
        <MCard className="flex items-center gap-5 p-5">
          <div className="shrink-0 rounded-2xl bg-[var(--m-bg2)]">
            <ExerciseFigure motion={challenge.motion} size={96} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: ZONE_COLORS.energie }}>
              <Swords className="h-3.5 w-3.5" aria-hidden />
              Défi du jour
            </p>
            <h3 className="mt-1 truncate font-display text-xl font-semibold">{challenge.name}</h3>
            {challengeDone ? (
              <Chip tone="accent" className="mt-2.5">
                <Check className="h-3.5 w-3.5" aria-hidden />
                Relevé aujourd’hui
              </Chip>
            ) : (
              <MButton variant="secondary" className="mt-2.5 !py-1.5" onClick={() => onStartBreak([challenge])}>
                <Play className="h-4 w-4" aria-hidden />
                Relever le défi
              </MButton>
            )}
          </div>
        </MCard>
        <MCard className="p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: ZONE_COLORS.yeux }}>
            <Lightbulb className="h-3.5 w-3.5" aria-hidden />
            Le conseil kiné du jour
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold">{tip.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-[var(--m-ink2)]">{tip.text}</p>
        </MCard>
      </div>
    </div>
  );
}
