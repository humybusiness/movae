import { useState } from "react";
import {
  ArrowRight,
  Bell,
  BellOff,
  BookOpen,
  Brain,
  Check,
  Keyboard,
  Shuffle,
  Timer,
  Video,
} from "lucide-react";
import { MButton } from "./ui";
import { requestNotificationPermission } from "../../lib/notify";
import { DISCLAIMER } from "../../lib/constants";
import { WORK_STYLE_LABELS, type WorkStyle } from "../types";

const STYLE_ICONS: Record<WorkStyle, typeof Keyboard> = {
  clavier: Keyboard,
  visio: Video,
  mixte: Shuffle,
  lecture: BookOpen,
};

const STYLE_DESC: Record<WorkStyle, string> = {
  clavier: "Code, rédaction, saisie… vos poignets travaillent dur.",
  visio: "Réunions en chaîne : nuque et dos figés, énergie en dents de scie.",
  mixte: "Un peu de tout : Movaé équilibre les recommandations.",
  lecture: "Beaucoup de lecture à l’écran : vos yeux passent en priorité.",
};

export function Onboarding({
  onDone,
  initialName = "",
}: {
  initialName?: string;
  onDone: (data: {
    name: string;
    style: WorkStyle;
    cadenceMin: number;
    goal: number;
    notifications: boolean;
    smartMode: boolean;
  }) => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState(initialName);
  const [style, setStyle] = useState<WorkStyle>("mixte");
  const [cadenceMin, setCadenceMin] = useState(45);
  const [goal, setGoal] = useState(6);
  const [smartMode, setSmartMode] = useState(true);

  const finish = (notifications: boolean) =>
    onDone({ name: name.trim(), style, cadenceMin, goal, notifications, smartMode });

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div
        className="w-full max-w-lg rounded-3xl border border-[var(--m-line)] bg-[var(--m-card)] p-8 sm:p-10"
        style={{ boxShadow: "var(--m-shadow)" }}
      >
        <div className="mb-8 flex items-center gap-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition ${
                i <= step ? "bg-[var(--m-accent)]" : "bg-[var(--m-bg2)]"
              }`}
            />
          ))}
        </div>

        {step === 0 && (
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Bienvenue sur Movaé
            </h1>
            <p className="mt-3 text-[var(--m-ink2)]">
              Des micro-pauses actives, assises et guidées, recommandées au bon moment de
              votre journée de travail. Uniquement des statistiques de mouvement, jamais de
              caméra.
            </p>
            <label className="mt-6 block text-sm font-semibold" htmlFor="ob-name">
              Comment doit-on vous appeler ? <span className="font-normal text-[var(--m-ink2)]">(optionnel)</span>
            </label>
            <input
              id="ob-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Votre prénom"
              className="mt-2 w-full rounded-xl border border-[var(--m-line)] bg-[var(--m-bg)] px-4 py-3 text-sm outline-none transition focus:border-[var(--m-accent)]"
            />
            <MButton className="mt-6 w-full" onClick={() => setStep(1)}>
              Continuer <ArrowRight className="h-4 w-4" aria-hidden />
            </MButton>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              À quoi ressemblent vos journées ?
            </h2>
            <p className="mt-2 text-sm text-[var(--m-ink2)]">
              Movaé adapte ses recommandations aux zones que votre travail sollicite le plus.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {(Object.keys(WORK_STYLE_LABELS) as WorkStyle[]).map((s) => {
                const Icon = STYLE_ICONS[s];
                const active = style === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-4 text-left transition ${
                      active
                        ? "border-[var(--m-accent)] bg-[var(--m-soft)]"
                        : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-[var(--m-strong)]" aria-hidden />
                    <p className="mt-2 text-sm font-semibold">{WORK_STYLE_LABELS[s]}</p>
                    <p className="mt-1 text-xs text-[var(--m-ink2)]">{STYLE_DESC[s]}</p>
                  </button>
                );
              })}
            </div>

            <div className="mt-6">
              <label className="flex items-center justify-between text-sm font-semibold" htmlFor="ob-cadence">
                Rythme cible entre deux pauses
                <span className="text-[var(--m-strong)]">{cadenceMin} min</span>
              </label>
              <input
                id="ob-cadence"
                type="range"
                min={30}
                max={90}
                step={5}
                value={cadenceMin}
                onChange={(e) => setCadenceMin(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--m-strong)]"
              />
              <label className="mt-4 flex items-center justify-between text-sm font-semibold" htmlFor="ob-goal">
                Objectif de pauses par jour
                <span className="text-[var(--m-strong)]">{goal}</span>
              </label>
              <input
                id="ob-goal"
                type="range"
                min={3}
                max={10}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="mt-2 w-full accent-[var(--m-strong)]"
              />
            </div>

            <MButton className="mt-6 w-full" onClick={() => setStep(2)}>
              Continuer <ArrowRight className="h-4 w-4" aria-hidden />
            </MButton>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Comment Movaé doit-il réfléchir ?
            </h2>
            <p className="mt-2 text-sm text-[var(--m-ink2)]">
              Vous choisissez — et vous pourrez changer d'avis à tout moment dans les réglages.
            </p>
            <div className="mt-5 grid gap-3">
              <button
                onClick={() => setSmartMode(true)}
                aria-pressed={smartMode}
                className={`rounded-2xl border p-4 text-left transition ${
                  smartMode
                    ? "border-[var(--m-accent)] bg-[var(--m-soft)]"
                    : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-[var(--m-strong)]" aria-hidden />
                  <p className="text-sm font-bold">IA Movaé (recommandé)</p>
                  {smartMode && <Check className="ml-auto h-4 w-4 text-[var(--m-strong)]" aria-hidden />}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-[var(--m-ink2)]">
                  <li>• Analyse en continu 14 signaux non sensibles : heure, rythme, sollicitation des 8 zones, vos retours…</li>
                  <li>• Apprend vos heures réceptives et protège vos phases de concentration.</li>
                  <li>• Ajuste le rythme à votre cadence réelle (± 15 min autour de votre réglage).</li>
                  <li className="font-semibold text-[var(--m-ink)]">
                    Transparente (chaque signal est visible dans l’app) et 100 % locale : rien n’est envoyé, tout est effaçable.
                  </li>
                </ul>
              </button>
              <button
                onClick={() => setSmartMode(false)}
                aria-pressed={!smartMode}
                className={`rounded-2xl border p-4 text-left transition ${
                  !smartMode
                    ? "border-[var(--m-accent)] bg-[var(--m-soft)]"
                    : "border-[var(--m-line)] hover:border-[var(--m-accent)]/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Timer className="h-5 w-5 text-[var(--m-strong)]" aria-hidden />
                  <p className="text-sm font-bold">Mode simple</p>
                  {!smartMode && <Check className="ml-auto h-4 w-4 text-[var(--m-strong)]" aria-hidden />}
                </div>
                <p className="mt-2 text-xs text-[var(--m-ink2)]">
                  Des rappels à cadence fixe, sans aucun apprentissage. Movaé reste un simple minuteur intelligent.
                </p>
              </button>
            </div>
            <MButton className="mt-6 w-full" onClick={() => setStep(3)}>
              Continuer <ArrowRight className="h-4 w-4" aria-hidden />
            </MButton>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Des rappels doux ?
            </h2>
            <p className="mt-2 text-sm text-[var(--m-ink2)]">
              Movaé peut vous prévenir discrètement quand une pause devient vraiment utile —
              jamais plus d’un rappel toutes les 10 minutes. Vous pourrez changer d’avis
              dans les réglages.
            </p>
            <div className="mt-6 grid gap-3">
              <MButton
                onClick={async () => {
                  const perm = await requestNotificationPermission();
                  finish(perm === "granted");
                }}
              >
                <Bell className="h-4 w-4" aria-hidden />
                Activer les rappels
              </MButton>
              <MButton variant="secondary" onClick={() => finish(false)}>
                <BellOff className="h-4 w-4" aria-hidden />
                Plus tard, dans l’app seulement
              </MButton>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-[var(--m-ink2)]">{DISCLAIMER}</p>
          </div>
        )}
      </div>
    </div>
  );
}
