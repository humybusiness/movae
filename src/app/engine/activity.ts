// Analyse d'activité 100 % locale et non intrusive.
//
// Ce module COMPTE — il ne lit jamais. Aucune touche n'est identifiée, aucun
// texte n'est capturé : seulement le NOMBRE de frappes, de clics et de
// défilements par minute. Ces cadences suffisent pour reconnaître la forme
// du travail en cours (rédaction soutenue, visio/lecture mains libres,
// navigation) et surtout détecter la FIN d'une séquence : le meilleur moment
// pour glisser une pause sans casser la concentration.

export type WorkMode = "redaction" | "visio" | "navigation" | "calme";

export const MODE_LABELS: Record<WorkMode, string> = {
  redaction: "rédaction soutenue",
  visio: "visio ou lecture",
  navigation: "navigation",
  calme: "activité calme",
};

interface MinuteBucket {
  minute: number; // Math.floor(ts / 60000)
  keys: number;
  clicks: number;
  scrolls: number;
}

export interface EpisodeEnd {
  mode: WorkMode;
  durationMin: number;
  endedAt: number;
}

export interface ActivityHint {
  mode: WorkMode;
  kpm: number; // frappes/minute (moyenne 5 min)
  episodeEnded: EpisodeEnd | null; // séquence longue terminée il y a < 6 min
}

const HISTORY_MIN = 120;
const EPISODE_MIN = 12; // durée minimale pour qu'une séquence « compte »
const ENDED_WINDOW_MIN = 6; // fenêtre pendant laquelle la fin reste exploitable

class ActivityTracker {
  private buckets: MinuteBucket[] = [];
  private episode: { mode: WorkMode; startedAt: number } | null = null;
  private lastEnd: EpisodeEnd | null = null;

  private bucketFor(now: number): MinuteBucket {
    const minute = Math.floor(now / 60000);
    let last = this.buckets[this.buckets.length - 1];
    if (!last || last.minute !== minute) {
      last = { minute, keys: 0, clicks: 0, scrolls: 0 };
      this.buckets.push(last);
      if (this.buckets.length > HISTORY_MIN) {
        this.buckets.splice(0, this.buckets.length - HISTORY_MIN);
      }
    }
    return last;
  }

  key(now = Date.now()): void {
    this.bucketFor(now).keys++;
  }

  click(now = Date.now()): void {
    this.bucketFor(now).clicks++;
  }

  scroll(now = Date.now()): void {
    this.bucketFor(now).scrolls++;
  }

  // Cadences moyennes sur les `span` dernières minutes.
  rates(now: number, span = 5): { kpm: number; cpm: number; spm: number } {
    const minute = Math.floor(now / 60000);
    let keys = 0;
    let clicks = 0;
    let scrolls = 0;
    for (const b of this.buckets) {
      if (b.minute > minute - span && b.minute <= minute) {
        keys += b.keys;
        clicks += b.clicks;
        scrolls += b.scrolls;
      }
    }
    return { kpm: keys / span, cpm: clicks / span, spm: scrolls / span };
  }

  modeAt(now: number): WorkMode {
    const { kpm, cpm, spm } = this.rates(now);
    if (kpm >= 25) return "redaction"; // frappe soutenue = écriture en cours
    if (cpm + spm >= 6 && kpm < 15) return "navigation";
    if (kpm < 4 && cpm < 2 && spm < 2) return "visio"; // présent, mains libres
    return "calme";
  }

  // À appeler régulièrement (tick moteur) : suit les épisodes de travail.
  update(now: number, working: boolean): void {
    if (!working) {
      this.episode = null;
      return;
    }
    const mode = this.modeAt(now);
    if (!this.episode) {
      this.episode = { mode, startedAt: now };
      return;
    }
    if (this.episode.mode !== mode) {
      const durationMin = (now - this.episode.startedAt) / 60000;
      // Seules les séquences longues et « denses » (rédaction, visio) marquent
      // un vrai jalon : leur fin est le bon créneau pour bouger.
      if (durationMin >= EPISODE_MIN && (this.episode.mode === "redaction" || this.episode.mode === "visio")) {
        this.lastEnd = { mode: this.episode.mode, durationMin: Math.round(durationMin), endedAt: now };
      }
      this.episode = { mode, startedAt: now };
    }
  }

  hint(now: number): ActivityHint {
    const { kpm } = this.rates(now);
    const ended =
      this.lastEnd && (now - this.lastEnd.endedAt) / 60000 <= ENDED_WINDOW_MIN ? this.lastEnd : null;
    return { mode: this.modeAt(now), kpm: Math.round(kpm), episodeEnded: ended };
  }

  // Consomme la fin d'épisode (une pause a été proposée/prise dessus).
  consumeEpisodeEnd(): void {
    this.lastEnd = null;
  }

  reset(): void {
    this.buckets = [];
    this.episode = null;
    this.lastEnd = null;
  }
}

// Singleton : l'activité est une réalité de la session, pas de l'état persisté.
export const activity = new ActivityTracker();
