import { useEffect, useRef, useState } from "react";
import {
  Check,
  Coffee,
  FlaskConical,
  Pause,
  Play,
  SkipForward,
  ThumbsDown,
  ThumbsUp,
  X,
} from "lucide-react";
import type { Exercise } from "../data/exercises";
import { ExerciseFigure } from "./ExerciseFigure";
import { Chip, MButton } from "./ui";
import { ZONE_LABELS } from "../types";
import { formatDuration } from "../../lib/time";

// Lecteur de pause guidée.
//
// Validation stricte : une pause ne compte que si le minuteur va au bout.
//  - pas de bouton « terminer plus tôt » ;
//  - fermer ou passer un exercice = non comptabilisé ;
//  - pour les exercices réalisés À L'ÉCRAN (position assise), quitter la
//    fenêtre suspend automatiquement le minuteur. Les exercices qui demandent
//    de s'éloigner (marche, fenêtre, hydratation) ne sont pas suspendus.

const PREP_SECONDS = 3;

export function BreakPlayer({
  queue,
  onCompleteExercise,
  onAllComplete,
  onFeedback,
  onClose,
}: {
  queue: Exercise[];
  onCompleteExercise: (exercise: Exercise, actualSec: number) => void;
  onAllComplete?: () => void;
  onFeedback?: (exerciseId: string, up: boolean) => void;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"prep" | "run">("prep");
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [interrupted, setInterrupted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, boolean>>({});
  const doneList = useRef<Exercise[]>([]);
  const doneCount = useRef(0);

  const exercise = queue[Math.min(idx, queue.length - 1)];
  const total = exercise.durationSec;
  const remaining = Math.max(0, total - elapsed);
  const stepLen = total / exercise.steps.length;
  const stepIndex = Math.min(exercise.steps.length - 1, Math.floor(elapsed / stepLen));
  // Les exercices « écran » sont suspendus si on quitte la fenêtre ;
  // ceux qui invitent à s'éloigner (marche, fenêtre…) ne le sont pas.
  const guarded = exercise.position === "assis";

  const goNext = () => {
    if (idx + 1 < queue.length) {
      setIdx(idx + 1);
      setElapsed(0);
      setPhase("prep");
      setPrepLeft(PREP_SECONDS);
      setPaused(false);
      setInterrupted(false);
    } else {
      setFinished(true);
    }
  };

  const completeCurrent = () => {
    onCompleteExercise(exercise, total);
    doneList.current = [...doneList.current, exercise];
    doneCount.current += 1;
    if (idx + 1 >= queue.length && queue.length > 1 && doneCount.current === queue.length) {
      onAllComplete?.();
    }
    goNext();
  };

  // Compte à rebours de préparation (« Installez-vous »)
  useEffect(() => {
    if (phase !== "prep" || finished) return;
    const interval = setInterval(() => {
      setPrepLeft((p) => {
        if (p <= 1) {
          setPhase("run");
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, finished, idx]);

  // Minuteur principal — seule façon de valider la pause.
  useEffect(() => {
    if (phase !== "run" || paused || finished) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [phase, paused, finished, idx]);

  useEffect(() => {
    if (!finished && phase === "run" && elapsed >= total) completeCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  // Anti-triche douce : quitter la fenêtre suspend les exercices « écran ».
  useEffect(() => {
    if (!guarded || finished) return;
    const suspend = () => {
      if (phase === "run") {
        setPaused(true);
        setInterrupted(true);
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") suspend();
    };
    window.addEventListener("blur", suspend);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", suspend);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [guarded, phase, finished]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === " " && phase === "run") {
        e.preventDefault();
        setPaused((p) => !p);
        setInterrupted(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

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
            <h2 className="font-display mt-5 text-2xl font-semibold">Pause validée</h2>
            <p className="mt-2 text-[var(--m-ink2)]">
              {doneCount.current > 1
                ? `${doneCount.current} exercices menés au bout. Votre Indice en tient compte.`
                : "Menée au bout, comme il faut. Votre Indice Movaé en tient compte."}
            </p>
            {onFeedback && doneList.current.length > 0 && (
              <div className="mx-auto mt-5 max-w-sm space-y-2 text-left">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-[var(--m-ink2)]">
                  Ces exercices vous ont fait du bien ?
                </p>
                {doneList.current.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center gap-3 rounded-xl border border-[var(--m-line)] px-3.5 py-2"
                  >
                    <span className="flex-1 truncate text-sm font-medium">{ex.name}</span>
                    {feedbackGiven[ex.id] !== undefined ? (
                      <span className="text-xs font-semibold text-[var(--m-strong)]">
                        {feedbackGiven[ex.id] ? "Noté 👍" : "Noté, merci"}
                      </span>
                    ) : (
                      <>
                        <button
                          aria-label={`J'ai aimé ${ex.name}`}
                          onClick={() => {
                            onFeedback(ex.id, true);
                            setFeedbackGiven((f) => ({ ...f, [ex.id]: true }));
                          }}
                          className="rounded-lg p-1.5 text-[var(--m-ink2)] transition hover:bg-[var(--m-soft)] hover:text-[var(--m-strong)]"
                        >
                          <ThumbsUp className="h-4 w-4" aria-hidden />
                        </button>
                        <button
                          aria-label={`Je n'ai pas aimé ${ex.name}`}
                          onClick={() => {
                            onFeedback(ex.id, false);
                            setFeedbackGiven((f) => ({ ...f, [ex.id]: false }));
                          }}
                          className="rounded-lg p-1.5 text-[var(--m-ink2)] transition hover:bg-[var(--m-bg2)] hover:text-[var(--m-ink)]"
                        >
                          <ThumbsDown className="h-4 w-4" aria-hidden />
                        </button>
                      </>
                    )}
                  </div>
                ))}
                <p className="text-center text-[11px] text-[var(--m-ink2)]">
                  Vos retours aident le moteur à mieux choisir. Ils restent sur votre appareil.
                </p>
              </div>
            )}
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
                  <Chip tone="warm">{exercise.reps}</Chip>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Abandonner (la pause ne sera pas comptée)"
                title="Abandonner (la pause ne sera pas comptée)"
                className="rounded-full p-2 text-[var(--m-ink2)] transition hover:bg-[var(--m-soft)] hover:text-[var(--m-ink)]"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* Bandeau d'interruption */}
            {interrupted && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl bg-[#C9A86A]/20 px-4 py-2.5 text-sm font-medium text-[#8F7443]" role="status">
                <Coffee className="h-4 w-4 shrink-0" aria-hidden />
                Minuteur suspendu — vous avez quitté la fenêtre. Reprenez pour valider la pause.
              </div>
            )}

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
                  {phase === "prep" ? (
                    <>
                      <p className="text-sm font-semibold text-[var(--m-ink2)]">Installez-vous…</p>
                      <span className="font-display text-6xl font-bold tabular-nums text-[var(--m-strong)]" aria-live="polite">
                        {prepLeft}
                      </span>
                    </>
                  ) : (
                    <>
                      <ExerciseFigure motion={exercise.motion} size={116} animate={!paused} />
                      <span className="font-display -mt-1 text-xl font-bold tabular-nums" aria-live="polite">
                        {remaining}s
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Étapes */}
              <ol className="space-y-3" aria-label="Étapes de l’exercice">
                {exercise.steps.map((step, i) => (
                  <li
                    key={i}
                    className={`flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                      phase === "run" && i === stepIndex
                        ? "bg-[var(--m-soft)] font-semibold text-[var(--m-ink)]"
                        : phase === "run" && i < stepIndex
                          ? "text-[var(--m-ink2)] line-through decoration-[var(--m-line)]"
                          : "text-[var(--m-ink2)]"
                    }`}
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        phase === "run" && i <= stepIndex
                          ? "bg-[var(--m-strong)] text-[var(--m-bg)]"
                          : "bg-[var(--m-bg2)] text-[var(--m-ink2)]"
                      }`}
                    >
                      {phase === "run" && i < stepIndex ? <Check className="h-3 w-3" aria-hidden /> : i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              {phase === "run" && (
                <MButton
                  variant="secondary"
                  onClick={() => {
                    setPaused((p) => !p);
                    setInterrupted(false);
                  }}
                >
                  {paused ? <Play className="h-4 w-4" aria-hidden /> : <Pause className="h-4 w-4" aria-hidden />}
                  {paused ? "Reprendre" : "Pause"}
                </MButton>
              )}
              {queue.length > 1 && idx + 1 < queue.length && (
                <MButton variant="ghost" onClick={goNext}>
                  <SkipForward className="h-4 w-4" aria-hidden />
                  Passer (non compté)
                </MButton>
              )}
            </div>
            <p className="mt-4 text-center text-xs font-medium text-[var(--m-strong)]">
              La pause est validée quand le minuteur arrive au bout — restez avec nous jusqu’à la fin.
            </p>
            {exercise.science && (
              <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs text-[var(--m-ink2)]">
                <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="max-w-md">{exercise.science}</span>
              </p>
            )}
            <p className="mt-2 text-center text-xs text-[var(--m-ink2)]">
              Restez dans une amplitude confortable. Un mouvement ne doit jamais être douloureux.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
