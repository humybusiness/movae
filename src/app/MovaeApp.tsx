import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Coffee,
  Dumbbell,
  Home,
  LayoutList,
  Loader2,
  LogIn,
  LogOut,
  Play,
  Power,
  Settings,
  TrendingUp,
} from "lucide-react";
import { StoreProvider, useMovae } from "./state/store";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { Login } from "./auth/Login";
import { getRecommendation } from "./engine/engine";
import { exerciseById, type Exercise } from "./data/exercises";
import { rewardById } from "./data/rewards";
import { themeById } from "./data/themes";
import { BreakPlayer } from "./components/BreakPlayer";
import { FocusTools } from "./components/FocusTools";
import { Onboarding } from "./components/Onboarding";
import { MButton } from "./components/ui";
import { Dashboard } from "./views/Dashboard";
import { ExercisesView } from "./views/ExercisesView";
import { ProgramsView } from "./views/ProgramsView";
import { ProgressView } from "./views/ProgressView";
import { RewardsView } from "./views/RewardsView";
import { SettingsView } from "./views/SettingsView";
import { showNotification } from "../lib/notify";
import { setTrayState, systemIdleSeconds } from "../lib/desktop";
import type { Zone } from "./types";

type ViewId = "accueil" | "exercices" | "programmes" | "progression" | "recompenses" | "reglages";

const NAV: { id: ViewId; label: string; icon: typeof Home }[] = [
  { id: "accueil", label: "Accueil", icon: Home },
  { id: "exercices", label: "Exercices", icon: Dumbbell },
  { id: "programmes", label: "Programmes", icon: LayoutList },
  { id: "progression", label: "Progression", icon: TrendingUp },
  { id: "recompenses", label: "Récompenses", icon: Award },
  { id: "reglages", label: "Réglages", icon: Settings },
];

const TICK_MS = 20_000;
const IDLE_AFTER_MS = 5 * 60_000;
const NOTIFY_COOLDOWN_MS = 10 * 60_000;

function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="mlogo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FA68A" />
          <stop offset="1" stopColor="#4F755D" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#mlogo)" />
      <rect x="14" y="34" width="8" height="16" rx="4" fill="#F4F1E8" opacity="0.8" />
      <rect x="28" y="26" width="8" height="24" rx="4" fill="#F4F1E8" opacity="0.9" />
      <rect x="42" y="16" width="8" height="34" rx="4" fill="#F4F1E8" />
    </svg>
  );
}

function AccountBadge({ compact = false }: { compact?: boolean }) {
  const { authEnabled, user, logout } = useAuth();
  if (!authEnabled) return null;

  if (!user) {
    // Mode invité alors que les comptes sont activés : proposer la connexion.
    return (
      <Link
        to="/app"
        onClick={() => {
          try {
            sessionStorage.removeItem("movae:guest");
          } catch {
            /* ignore */
          }
          window.location.reload();
        }}
        className="flex items-center gap-2 rounded-xl border border-[var(--m-line)] px-3 py-2 text-xs font-semibold text-[var(--m-ink2)] transition hover:bg-[var(--m-bg2)] hover:text-[var(--m-ink)]"
      >
        <LogIn className="h-4 w-4" aria-hidden />
        Se connecter / créer un compte
      </Link>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "rounded-xl border border-[var(--m-line)] p-2.5"}`}>
      {user.photoURL ? (
        <img src={user.photoURL} alt="" className="h-8 w-8 shrink-0 rounded-full" />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--m-soft)] text-xs font-bold text-[var(--m-strong)]">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-[var(--m-ink)]">{user.name}</p>
          <p className="truncate text-[11px] text-[var(--m-ink2)]">{user.email}</p>
        </div>
      )}
      <button
        onClick={() => logout()}
        aria-label="Se déconnecter"
        title="Se déconnecter"
        className="rounded-lg p-1.5 text-[var(--m-ink2)] transition hover:bg-[var(--m-bg2)] hover:text-[var(--m-ink)]"
      >
        <Power className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function AppInner() {
  const { state, dispatch } = useMovae();
  const { user } = useAuth();
  const [view, setView] = useState<ViewId>("accueil");
  const [zoneReq, setZoneReq] = useState<{ z: Zone; n: number } | null>(null);
  const [queue, setQueue] = useState<Exercise[] | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const lastInputAt = useRef(Date.now());
  const prevUnlocked = useRef<string[] | null>(null);

  const theme = themeById(state.prefs.theme);
  const working = state.session.status === "working";
  const away = state.session.status === "away";

  // ---- Suivi d'activité (souris / clavier, local uniquement) ----
  useEffect(() => {
    let lastMove = 0;
    const onInput = () => {
      lastInputAt.current = Date.now();
    };
    const onMove = () => {
      const t = Date.now();
      if (t - lastMove > 2000) {
        lastMove = t;
        lastInputAt.current = t;
      }
    };
    window.addEventListener("keydown", onInput);
    window.addEventListener("pointerdown", onInput);
    window.addEventListener("wheel", onMove, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("pointerdown", onInput);
      window.removeEventListener("wheel", onMove);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  // ---- Tick du moteur ----
  useEffect(() => {
    const tick = async () => {
      const t = Date.now();
      // Version bureau : inactivité mesurée à l'échelle du système entier
      // (toutes applications). Version web : activité dans l'onglet.
      const sysIdle = await systemIdleSeconds();
      const idle =
        sysIdle !== null
          ? sysIdle * 1000 > IDLE_AFTER_MS
          : document.visibilityState === "visible" && t - lastInputAt.current > IDLE_AFTER_MS;
      dispatch({ type: "tick", now: t, idle });
      setNow(t);
    };
    void tick();
    const interval = setInterval(() => void tick(), TICK_MS);
    const onVisible = () => void tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [dispatch]);

  // ---- Rappels doux ----
  const rec = useMemo(() => getRecommendation(state, now), [state, now]);

  // ---- Icône vivante (bureau) : le logo du tray se tasse avec votre corps ----
  const lastTray = useRef(-1);
  useEffect(() => {
    const level = !working
      ? 0
      : rec.level === "prioritaire"
        ? 3
        : rec.level === "recommandee"
          ? 2
          : rec.level === "bientot"
            ? 1
            : 0;
    if (level !== lastTray.current) {
      lastTray.current = level;
      setTrayState(level);
    }
  }, [rec.level, working]);
  useEffect(() => {
    if (!working || !state.prefs.notifications || rec.snoozed || queue) return;
    if (rec.level !== "recommandee" && rec.level !== "prioritaire") return;
    const last = state.session.lastNotifyAt ?? 0;
    if (now - last < NOTIFY_COOLDOWN_MS) return;
    const ok = showNotification(
      "C’est le bon moment pour bouger",
      `${rec.exercise.name} — ${Math.round(rec.exercise.durationSec)} secondes, sans quitter votre chaise.`,
    );
    if (ok) dispatch({ type: "notified", now });
  }, [rec, working, state.prefs.notifications, state.session.lastNotifyAt, now, queue, dispatch]);

  // ---- Toasts de récompenses ----
  useEffect(() => {
    if (prevUnlocked.current === null) {
      prevUnlocked.current = state.unlocked;
      return;
    }
    const fresh = state.unlocked.filter((id) => !prevUnlocked.current!.includes(id));
    prevUnlocked.current = state.unlocked;
    if (fresh.length === 0) return;
    const items = fresh.map((id) => ({
      id: `${id}-${Date.now()}`,
      text: `Débloqué : ${rewardById(id)?.name ?? id}`,
    }));
    setToasts((t) => [...t, ...items]);
    const timer = setTimeout(
      () => setToasts((t) => t.filter((x) => !items.some((i) => i.id === x.id))),
      6000,
    );
    return () => clearTimeout(timer);
  }, [state.unlocked]);

  // ---- Raccourci PWA « ?action=pause » ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("action") === "pause" && state.onboarded) {
      setQueue([getRecommendation(state, Date.now()).exercise]);
      window.history.replaceState(null, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.onboarded]);

  if (!state.onboarded) {
    return (
      <div className="m-app min-h-screen" style={theme.vars as CSSProperties}>
        <Onboarding
          initialName={user?.name ?? ""}
          onDone={(data) => {
            dispatch({ type: "onboard", ...data });
            dispatch({ type: "start-day", now: Date.now() });
          }}
        />
      </div>
    );
  }

  return (
    <div className="m-app min-h-screen" style={theme.vars as CSSProperties}>
      <div className="mx-auto flex min-h-screen max-w-7xl">
        {/* Sidebar desktop */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-[var(--m-line)] p-5 lg:flex">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Retour au site Movaé">
            <Logo />
            <span className="font-display text-xl font-semibold tracking-tight">Movaé</span>
          </Link>
          <nav className="mt-8 flex flex-1 flex-col gap-1" aria-label="Navigation principale">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-current={view === id ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  view === id
                    ? "bg-[var(--m-soft)] text-[var(--m-strong)]"
                    : "text-[var(--m-ink2)] hover:bg-[var(--m-bg2)] hover:text-[var(--m-ink)]"
                }`}
              >
                <Icon className="h-4.5 w-4.5" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
          <div className="space-y-3">
            <FocusTools />
            <AccountBadge />
            <p className="px-1 text-[11px] leading-relaxed text-[var(--m-ink2)]">
              Créé par des étudiants kinés.
            </p>
          </div>
        </aside>

        {/* Colonne principale */}
        <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
          <header className="sticky top-0 z-30 border-b border-[var(--m-line)] bg-[var(--m-bg)]/85 px-5 py-3.5 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 lg:hidden">
                <Logo size={26} />
                <span className="font-display text-lg font-semibold">Movaé</span>
              </div>
              <p className="hidden items-center gap-2 text-sm font-semibold lg:flex">
                <span className="font-display text-base">Movaé</span>
              </p>
              <div className="flex items-center gap-2">
                <span className="lg:hidden">
                  <AccountBadge compact />
                </span>
                {working && (
                  <span className="mr-1 hidden items-center gap-1.5 text-xs font-semibold text-[var(--m-strong)] sm:flex">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--m-accent)]" aria-hidden />
                    Journée en cours
                  </span>
                )}
                {!working && !away ? (
                  <MButton className="!py-2" onClick={() => dispatch({ type: "start-day", now: Date.now() })}>
                    <Play className="h-4 w-4" aria-hidden />
                    Démarrer ma journée
                  </MButton>
                ) : (
                  <>
                    <MButton
                      variant={away ? "primary" : "secondary"}
                      className="!py-2"
                      onClick={() => dispatch({ type: "toggle-away", now: Date.now() })}
                    >
                      <Coffee className="h-4 w-4" aria-hidden />
                      {away ? "Je suis de retour" : "Je m’absente"}
                    </MButton>
                    <MButton
                      variant="ghost"
                      className="!py-2"
                      onClick={() => dispatch({ type: "end-day", now: Date.now() })}
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      Terminer
                    </MButton>
                  </>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 p-5 sm:p-6">
            {view === "accueil" && (
              <Dashboard
                now={now}
                onStartBreak={setQueue}
                onOpenZone={(z) => {
                  setZoneReq((q) => ({ z, n: (q?.n ?? 0) + 1 }));
                  setView("exercices");
                }}
              />
            )}
            {view === "exercices" && <ExercisesView onStart={setQueue} initialZone={zoneReq} />}
            {view === "programmes" && <ProgramsView onStart={setQueue} />}
            {view === "progression" && <ProgressView now={now} />}
            {view === "recompenses" && <RewardsView />}
            {view === "reglages" && <SettingsView />}
          </main>
        </div>
      </div>

      {/* Navigation mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-[var(--m-line)] bg-[var(--m-card)]/95 px-2 py-2 backdrop-blur lg:hidden"
        aria-label="Navigation mobile"
      >
        {NAV.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            aria-current={view === id ? "page" : undefined}
            aria-label={label}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2.5 py-1 text-[10px] font-semibold transition ${
              view === id ? "text-[var(--m-strong)]" : "text-[var(--m-ink2)]"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>

      {/* Lecteur de pause */}
      {queue && (
        <BreakPlayer
          queue={queue}
          onCompleteExercise={(exercise, actualSec) => {
            const ex = exerciseById(exercise.id) ?? exercise;
            dispatch({ type: "complete-break", exercise: ex, now: Date.now(), actualSec });
          }}
          onAllComplete={() => dispatch({ type: "program-done" })}
          onFeedback={
            state.prefs.smartMode
              ? (exerciseId, up) => dispatch({ type: "exercise-feedback", exerciseId, up })
              : undefined
          }
          onClose={() => setQueue(null)}
        />
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed bottom-20 right-4 z-50 flex flex-col gap-2 lg:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="rounded-xl border border-[var(--m-line)] bg-[var(--m-card)] px-4 py-3 text-sm font-semibold"
            style={{ boxShadow: "var(--m-shadow)" }}
          >
            🏅 {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function AuthGate() {
  const { ready, authEnabled, user, guest } = useAuth();

  if (!ready) {
    return (
      <div className="m-app flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--m-strong)]" aria-hidden />
      </div>
    );
  }

  if (authEnabled && !user && !guest) {
    return <Login />;
  }

  // La clé force la réinitialisation du store au changement d'utilisateur.
  return (
    <StoreProvider key={user?.uid ?? "guest"}>
      <AppInner />
    </StoreProvider>
  );
}

export default function MovaeApp() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
