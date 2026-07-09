// Types partagés de l'application Movaé (état, zones, profils).

export type Zone =
  | "yeux"
  | "nuque"
  | "epaules"
  | "dos"
  | "poignets"
  | "hanches"
  | "jambes"
  | "energie";

export const ZONES: Zone[] = [
  "yeux",
  "nuque",
  "epaules",
  "dos",
  "poignets",
  "hanches",
  "jambes",
  "energie",
];

export const ZONE_LABELS: Record<Zone, string> = {
  yeux: "Yeux",
  nuque: "Nuque",
  epaules: "Épaules",
  dos: "Dos",
  poignets: "Poignets",
  hanches: "Hanches",
  jambes: "Jambes",
  energie: "Énergie",
};

export type WorkStyle = "clavier" | "visio" | "mixte" | "lecture";

export const WORK_STYLE_LABELS: Record<WorkStyle, string> = {
  clavier: "Clavier intensif",
  visio: "Beaucoup de visios",
  mixte: "Journées mixtes",
  lecture: "Lecture & analyse",
};

export type ThemeId = "sauge" | "nuit-calme" | "sable" | "foret" | "aube";
export type IndexStyleId = "anneau" | "score" | "barres";
export type SessionStatus = "off" | "working" | "away";

export interface BreakLog {
  id: string;
  ts: number;
  exerciseId: string;
  zones: Zone[];
  durationSec: number;
}

export interface DayStats {
  date: string;
  breaks: number;
  activeMin: number;
  overdueMin: number;
  zones: Zone[];
  index: number;
}

export interface MovaeState {
  version: 1;
  onboarded: boolean;
  profile: {
    name: string;
    style: WorkStyle;
    cadenceMin: number; // rythme cible entre deux pauses
    goal: number; // objectif de pauses par jour
  };
  prefs: {
    theme: ThemeId;
    indexStyle: IndexStyleId;
    notifications: boolean;
    eyeRule: boolean; // règle 20-20-20
  };
  session: {
    status: SessionStatus;
    startedAt: number | null;
    lastBreakAt: number | null;
    lastEyeAt: number | null;
    lastTickAt: number | null;
    lastNotifyAt: number | null;
    snoozedUntil: number | null;
  };
  strain: Record<Zone, number>; // sollicitation estimée 0–100 par zone
  history: BreakLog[];
  days: Record<string, DayStats>;
  streak: { current: number; best: number; lastDay: string | null };
  unlocked: string[];
  totals: { breaks: number; minutes: number };
}

export type UrgencyLevel = "fraiche" | "ok" | "bientot" | "recommandee" | "prioritaire";

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  fraiche: "Rythme frais",
  ok: "Tout va bien",
  bientot: "Pause bientôt utile",
  recommandee: "Pause recommandée",
  prioritaire: "C’est le moment de bouger",
};
