import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, SkipForward, X } from "lucide-react";
import type { Exercise } from "../data/exercises";
import { FigureVisual } from "./FigureVisual";
import { Chip, MButton } from "./ui";
import { ZONE_LABELS } from "../types";
import { formatDuration } from "../../lib/time";

// Lecteur de pause guidée : minuteur circulaire, étapes qui défilent,
// figure animée. Gère une file d'exercices (programmes).

export function BreakPlayer({
  queue,
  onCompleteExercise,
  onClose,
}: {
  queue: Exercise[];
  onCompleteExercise: (exercise: Exercise, actualSec: number) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const doneCount = useRef(0);

  const exercise = queue[Math.min(idx, queue.length - 1)];
  const total = exercise.durationSec;
  const remaining = Math.max(0, total - elapsed);
  const stepLen = total / exercise.steps.length;
  const stepIndex = Math.min(exercise.steps.length - 1, Math.floor(elapsed / stepLen));

  const completeCurrent = (sec: number) => {
    onCompleteExercise(exercise, sec);
    doneCount.current += 1;
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      setElapsed(0);
    } else {
      setFinished(true);
    }
  };

  useEffect(() => {
    if (paused || finished) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [paused, finished, idx]);

  useEffect(() => {
    if (!finished && elapsed >= total) completeCurrent(total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " ") {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Anneau de progression
  const r = 88;
  const c = 2 * Math.PI * r;
  const progress = Math.min(1, elapsed / total);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--m-bg)]/95 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={finished ? "Pause terminée" : `Exercice : ${exercise.name}`}
    >
      <div className="w-full max-w-2xl">
        {finished ? (
          <div className="rounded-3xl border border-[var(--m-line)] bg-[var(--m-card)] p-10 text-center" style={{ boxShadow: "var(--m-shadow)" }}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--m-soft)]">
              <Check className="h-8 w-8 text-[var(--m-strong)]" aria-hidden />
            </div>
            <h2 className="font-display mt-5 text-2xl font-semibold">Pause terminée</h2>
            <p className="mt-2 text-[var(--m-ink2)]">
              {doneCount.current > 1
                ? `${doneCount.current} exercices terminés. Votre Indice en tient compte.`
                : "Bien joué. Votre Indice Movaé en tient compte."}
            </p>
            <MButton className="mt-6" onClick={onClose} autoFocus>
              Retour au tableau de bord
            </MButton>
          </div>
        ) : (
          <div className="rounded-3xl border border-[var(--m-line)] bg-[var(--m-card)] p-6 sm:p-10" style={{ boxShadow: "var(--m-shadow)" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                {queue.length > 1 && (
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--m-ink2)]">
                    Exercice {idx + 1} / {queue.length}
                  </p>
                )}
                <h2 className="font-display mt-1 text-2xl font-semibold tracking-tight">
                  {exercise.name}
                </h2>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {exercise.zones.map((z) => (
                    <Chip key={z} tone="accent">
                      {ZONE_LABELS[z]}
                    </Chip>
                  ))}
                  <Chip>{formatDuration(exercise.durationSec)}</Chip>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer sans terminer"
                className="rounded-full p-2 text-[var(--m-ink2)] transition hover:bg-[var(--m-soft)] hover:text-[var(--m-ink)]"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="mt-6 grid items-center gap-8 sm:grid-cols-[auto_1fr]">
              {/* Minuteur + figure */}
              <div className="relative mx-auto h-52 w-52">
                <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="100" cy="100" r={r} fill="none" stroke="var(--m-bg2)" strokeWidth="8" />
                  <circle
                    cx="100"
                    cy="100"
                    r={r}
                    fill="none"
                    stroke="var(--m-accent)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${progress * c} ${c}`}
                    style={{ transition: "stroke-dasharray 1s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <FigureVisual visual={exercise.visual} size={110} />
                  <span className="font-display -mt-1 text-xl font-bold tabular-nums" aria-live="polite">
                    {remaining}s
                  </span>
                </div>
              </div>

              {/* Étapes */}
              <ol className="space-y-3" aria-label="Étapes de l’exercice">
                {exercise.steps.map((step, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      i === stepIndex
                        ? "bg-[var(--m-soft)] font-semibold text-[var(--m-ink)]"
                        : i < stepIndex
                          ? "text-[var(--m-ink2)] line-through decoration-[var(--m-line)]"
                          : "text-[var(--m-ink2)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        i <= stepIndex
                          ? "bg-[var(--m-strong)] text-[var(--m-bg)]"
                          : "bg-[var(--m-bg2)] text-[var(--m-ink2)]"
                      }`}
                    >
                      {i < stepIndex ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <MButton variant="secondary" onClick={() => setPaused((p) => !p)}>
                {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                {paused ? "Reprendre" : "Pause"}
              </MButton>
              <MButton onClick={() => completeCurrent(Math.max(elapsed, 10))}>
                <Check className="h-4 w-4" aria-hidden />
                J’ai terminé
              </MButton>
              {queue.length > 1 && idx + 1 < queue.length && (
                <MButton
                  variant="ghost"
                  onClick={() => {
                    setIdx(idx + 1);
                    setElapsed(0);
                  }}
                >
                  <SkipForward className="h-4 w-4" aria-hidden />
                  Passer
                </MButton>
              )}
            </div>
            <p className="mt-4 text-center text-xs text-[var(--m-ink2)]">
              Restez dans une amplitude confortable. Un mouvement ne doit jamais être douloureux.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
