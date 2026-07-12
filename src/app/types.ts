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

// Couleur signature de chaque zone du corps — utilisée partout (chips, barres,
// carte du corps) pour une lecture instantanée, sans texte superflu.
export const ZONE_COLORS: Record<Zone, string> = {
  yeux: "#4E7FA8",
  nuque: "#C07A5B",
  epaules: "#8E6FB0",
  dos: "#4F755D",
  poignets: "#B98E3E",
  hanches: "#B0607A",
  jambes: "#5B8A96",
  energie: "#D07A2E",
};

export type WorkStyle = "clavier" | "visio" | "mixte" | "lecture";

export const WORK_STYLE_LABELS: Record<WorkStyle, string> = {
  clavier: "Clavier intensif",
  visio: "Beaucoup de visios",
  mixte: "Journées mixtes",
  lecture: "Lecture & analyse",
};

export type ThemeId = "sauge" | "nuit-calme" | "sable" | "foret" | "aube" | "ocean";

// ---------- Personnage argile ----------

export type HairId = "court" | "mi-long" | "chignon" | "queue" | "boucles" | "ras";

export const HAIR_LABELS: Record<HairId, string> = {
  court: "Court",
  "mi-long": "Mi-long",
  chignon: "Chignon",
  queue: "Queue de cheval",
  boucles: "Bouclé",
  ras: "Très court",
};

// Chaque élément du personnage est colorable librement par l'utilisateur.
export interface AvatarColors {
  skin: string;
  hair: string;
  top: string;
  trousers: string;
  shoes: string;
}

export const DEFAULT_AVATAR_COLORS: AvatarColors = {
  skin: "#F0DCC3",
  hair: "#4A3F35",
  top: "#8FAE97",
  trousers: "#6F665C",
  shoes: "#4C443B",
};

export interface AvatarState {
  hair: HairId;
  colors: AvatarColors;
  clay: number; // élans (monnaie gagnée avec les pauses)
  owned: string[]; // accessoires/jardin achetés
  equipped: string[]; // portés/installés (jardin et animaux cumulables)
}
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

// ---------- Apprentissages du moteur adaptatif (100 % locaux) ----------

export interface HourStat {
  prop: number; // pauses proposées à cette heure
  acc: number; // pauses effectivement prises après proposition
}

export interface ExerciseFeedback {
  up: number;
  down: number;
  done: number;
  lastTs: number; // dernière réalisation (pour la variété)
}

export interface Insights {
  hourly: Record<string, HourStat>; // clé = heure "8".."19"
  exFeedback: Record<string, ExerciseFeedback>;
  pendingRecAt: number | null; // proposition en attente de réponse
  cadenceAuto: number | null; // rythme réellement observé (EMA, minutes)
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
    smartMode: boolean; // moteur adaptatif (apprentissage local) vs cadence fixe
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
  avatar: AvatarState;
  strain: Record<Zone, number>; // sollicitation estimée 0–100 par zone
  insights: Insights;
  history: BreakLog[];
  days: Record<string, DayStats>;
  streak: { current: number; best: number; lastDay: string | null };
  unlocked: string[];
  totals: { breaks: number; minutes: number; programs: number };
}

export type UrgencyLevel = "fraiche" | "ok" | "bientot" | "recommandee" | "prioritaire";

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  fraiche: "Rythme frais",
  ok: "Tout va bien",
  bientot: "Pause bientôt utile",
  recommandee: "Pause recommandée",
  prioritaire: "C’est le moment de bouger",
};
