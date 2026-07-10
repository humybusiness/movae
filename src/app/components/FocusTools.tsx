import { useEffect, useState } from "react";
import { BrainCircuit, ChevronDown, ChevronUp, Music, Pause, Play, X } from "lucide-react";
import { useMovae } from "../state/store";
import { showNotification } from "../../lib/notify";
import {
  AMBIENCES,
  setAmbienceVolume,
  startAmbience,
  stopAmbience,
  type AmbienceKind,
} from "../../lib/audio";

// Outils de focus (bas de la barre latérale) :
//  - Deep Work : durée au curseur (20 min → 2 h). Pendant la session, le moteur
//    ne propose AUCUNE pause, puis vous invite à bouger à la fin.
//  - Musique intégrée : ambiances génératives Movaé (lecture/pause/volume,
//    100 % locales) + lecteur Spotify embarqué (lecture, pause, piste suivante).

const SPOTIFY_PLAYLISTS = [
  { id: "37i9dQZF1DWZeKCadgRdKQ", label: "Deep Focus" },
  { id: "37i9dQZF1DWWQRwui0ExPn", label: "Lo-Fi Beats" },
  { id: "37i9dQZF1DX4sWSpwq3LiO", label: "Peaceful Piano" },
  { id: "37i9dQZF1DX0SM0LYsmbMT", label: "Jazz Vibes" },
];

export function FocusTools() {
  const { dispatch } = useMovae();

  // ---- Deep Work ----
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
  const durLabel = durMin >= 60 ? `${Math.floor(durMin / 60)} h${durMin % 60 ? ` ${durMin % 60}` : ""}` : `${durMin} min`;

  // ---- Musique ----
  const [ambience, setAmbience] = useState<AmbienceKind | null>(null);
  const [volume, setVolume] = useState(0.6);
  const [spotifyOpen, setSpotifyOpen] = useState(false);
  const [playlist, setPlaylist] = useState(SPOTIFY_PLAYLISTS[0].id);

  useEffect(() => () => stopAmbience(), []); // coupe le son en quittant

  const toggleAmbience = (kind: AmbienceKind) => {
    if (ambience === kind) {
      stopAmbience();
      setAmbience(null);
    } else {
      startAmbience(kind, volume);
      setAmbience(kind);
    }
  };

  return (
    <div className="space-y-2.5">
      {/* Deep work */}
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

      {/* Musique intégrée */}
      <div className="rounded-xl border border-[var(--m-line)] p-3">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--m-ink2)]">
          <Music className="h-3.5 w-3.5" aria-hidden />
          Musique
        </p>
        {/* Ambiances génératives (100 % locales) */}
        <div className="mt-2 flex gap-1.5">
          {AMBIENCES.map((a) => {
            const active = ambience === a.id;
            return (
              <button
                key={a.id}
                onClick={() => toggleAmbience(a.id)}
                aria-pressed={active}
                className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[10px] font-bold transition ${
                  active
                    ? "border-transparent bg-[var(--m-strong)] text-[var(--m-bg)]"
                    : "border-[var(--m-line)] text-[var(--m-ink2)] hover:border-[var(--m-accent)]"
                }`}
              >
                {active ? <Pause className="h-3 w-3" aria-hidden /> : <Play className="h-3 w-3" aria-hidden />}
                {a.label}
              </button>
            );
          })}
        </div>
        {ambience && (
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100;
              setVolume(v);
              setAmbienceVolume(v);
            }}
            className="mt-2 w-full accent-[var(--m-strong)]"
            aria-label="Volume de l'ambiance"
          />
        )}
        {/* Spotify embarqué : lecture / pause / piste suivante dans l'app */}
        <button
          onClick={() => setSpotifyOpen((s) => !s)}
          aria-expanded={spotifyOpen}
          className="mt-2 flex w-full items-center justify-between rounded-lg border border-[var(--m-line)] px-2.5 py-1.5 text-[11px] font-bold text-[var(--m-ink2)] transition hover:border-[var(--m-accent)] hover:text-[var(--m-strong)]"
        >
          Spotify
          {spotifyOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
        </button>
        {spotifyOpen && (
          <div className="mt-2 space-y-2">
            <select
              value={playlist}
              onChange={(e) => setPlaylist(e.target.value)}
              aria-label="Choisir une playlist"
              className="w-full rounded-lg border border-[var(--m-line)] bg-[var(--m-bg)] px-2 py-1.5 text-[11px] font-semibold outline-none"
            >
              {SPOTIFY_PLAYLISTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <iframe
              key={playlist}
              title="Lecteur Spotify"
              src={`https://open.spotify.com/embed/playlist/${playlist}?theme=0`}
              width="100%"
              height="152"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-xl"
            />
          </div>
        )}
      </div>
    </div>
  );
}
