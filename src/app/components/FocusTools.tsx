import { useEffect, useState } from "react";
import { BrainCircuit, X } from "lucide-react";
import { useMovae } from "../state/store";
import { showNotification } from "../../lib/notify";

// Deep Work (bas de la barre latérale) : durée au curseur (20 min → 2 h).
// Pendant la session, le moteur ne propose AUCUNE pause, puis vous invite à
// bouger à la fin — le focus et la récupération travaillent ensemble.

export function FocusTools() {
  const { dispatch } = useMovae();

  const [durMin, setDurMin] = useState(45);
  const [endsAt, setEndsAt] = useState<number | null>(() => {
    const raw = sessionStorage.getItem("movae:deepwork");
    const v = raw ? Number(raw) : 0;
    return v > Date.now() ? v : null;
  });
  const [, force] = useState(0);

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

  const start = () => {
    const until = Date.now() + durMin * 60000;
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
  const durLabel =
    durMin >= 60 ? `${Math.floor(durMin / 60)} h${durMin % 60 ? ` ${durMin % 60}` : ""}` : `${durMin} min`;

  return (
    <div className="rounded-xl border border-[var(--m-line)] p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--m-ink2)]">
          <BrainCircuit className="h-3.5 w-3.5" aria-hidden />
          Deep work
        </p>
        {endsAt && (
          <button
            onClick={stop}
            aria-label="Arrêter la session deep work"
            title="Arrêter"
            className="rounded-md p-1 text-[var(--m-ink2)] transition hover:bg-[var(--m-bg2)] hover:text-[var(--m-ink)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      {endsAt ? (
        <>
          <p className="mt-1.5 font-display text-2xl font-bold tabular-nums text-[var(--m-strong)]">
            {mm}:{String(ss).padStart(2, "0")}
          </p>
          <p className="mt-1 text-[10px] leading-snug text-[var(--m-ink2)]">
            Zéro rappel pendant la session.
          </p>
        </>
      ) : (
        <>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[var(--m-ink2)]">Durée</span>
            <span className="font-bold text-[var(--m-strong)]">{durLabel}</span>
          </div>
          <input
            type="range"
            min={20}
            max={120}
            step={5}
            value={durMin}
            onChange={(e) => setDurMin(Number(e.target.value))}
            className="mt-1 w-full accent-[var(--m-strong)]"
            aria-label="Durée de la session deep work"
          />
          <button
            onClick={start}
            className="mt-2 w-full rounded-lg bg-[var(--m-strong)] py-1.5 text-xs font-bold text-[var(--m-bg)] transition hover:opacity-90"
          >
            Lancer le focus
          </button>
        </>
      )}
    </div>
  );
}
