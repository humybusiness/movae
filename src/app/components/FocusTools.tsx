import { useEffect, useState } from "react";
import { BrainCircuit, Music, Square } from "lucide-react";
import { useMovae } from "../state/store";
import { showNotification } from "../../lib/notify";

// Outils de focus (bas de la barre latérale) :
//  - minuteur Deep Work : pendant la session, le moteur Movaé ne propose AUCUNE
//    pause (snooze jusqu'à la fin) — puis vous invite à bouger, au moment parfait ;
//  - accès rapide à votre musique de concentration (Spotify, Deezer, YT Music).

const DURATIONS = [25, 45, 90];

const MUSIC_LINKS = [
  { label: "Spotify", href: "https://open.spotify.com" },
  { label: "Deezer", href: "https://www.deezer.com" },
  { label: "YT Music", href: "https://music.youtube.com" },
];

export function FocusTools() {
  const { dispatch } = useMovae();
  const [endsAt, setEndsAt] = useState<number | null>(() => {
    const raw = sessionStorage.getItem("movae:deepwork");
    const v = raw ? Number(raw) : 0;
    return v > Date.now() ? v : null;
  });
  const [, force] = useState(0);

  // Tic d'affichage + fin de session.
  useEffect(() => {
    if (!endsAt) return;
    const interval = setInterval(() => {
      if (Date.now() >= endsAt) {
        setEndsAt(null);
        sessionStorage.removeItem("movae:deepwork");
        dispatch({ type: "snooze", until: Date.now() });
        showNotification(
          "Deep work terminé 🎯",
          "Beau focus. C'est le moment parfait pour bouger 45 secondes.",
        );
      } else {
        force((n) => n + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt, dispatch]);

  const start = (min: number) => {
    const until = Date.now() + min * 60000;
    setEndsAt(until);
    sessionStorage.setItem("movae:deepwork", String(until));
    dispatch({ type: "snooze", until }); // le moteur respecte votre focus
  };

  const stop = () => {
    setEndsAt(null);
    sessionStorage.removeItem("movae:deepwork");
    dispatch({ type: "snooze", until: Date.now() });
  };

  const remaining = endsAt ? Math.max(0, endsAt - Date.now()) : 0;
  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <div className="space-y-2.5">
      {/* Deep work */}
      <div className="rounded-xl border border-[var(--m-line)] p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--m-ink2)]">
          <BrainCircuit className="h-3.5 w-3.5" aria-hidden />
          Deep work
        </p>
        {endsAt ? (
          <div className="mt-2 flex items-center justify-between">
            <span className="font-display text-2xl font-bold tabular-nums text-[var(--m-strong)]">
              {mm}:{String(ss).padStart(2, "0")}
            </span>
            <button
              onClick={stop}
              aria-label="Arrêter la session deep work"
              className="rounded-lg p-2 text-[var(--m-ink2)] transition hover:bg-[var(--m-bg2)] hover:text-[var(--m-ink)]"
            >
              <Square className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-1.5">
            {DURATIONS.map((min) => (
              <button
                key={min}
                onClick={() => start(min)}
                className="flex-1 rounded-lg border border-[var(--m-line)] py-1.5 text-xs font-bold text-[var(--m-ink2)] transition hover:border-[var(--m-accent)] hover:text-[var(--m-strong)]"
              >
                {min}′
              </button>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[10px] leading-snug text-[var(--m-ink2)]">
          {endsAt ? "Zéro rappel pendant la session." : "Movaé se tait, puis vous fait bouger."}
        </p>
      </div>

      {/* Musique de concentration */}
      <div className="flex items-center gap-1.5">
        <Music className="h-3.5 w-3.5 shrink-0 text-[var(--m-ink2)]" aria-hidden />
        {MUSIC_LINKS.map((m) => (
          <a
            key={m.label}
            href={m.href}
            target="_blank"
            rel="noreferrer"
            className="flex-1 rounded-lg border border-[var(--m-line)] px-1 py-1 text-center text-[10px] font-bold text-[var(--m-ink2)] transition hover:border-[var(--m-accent)] hover:text-[var(--m-strong)]"
          >
            {m.label}
          </a>
        ))}
      </div>
    </div>
  );
}
