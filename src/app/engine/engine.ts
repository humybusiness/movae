// Moteur d'analyse Movaé.
//
// Principe : chaque zone du corps accumule une « sollicitation estimée » (0–100)
// pendant le temps de travail, à un rythme qui dépend du style de travail déclaré
// et du moment de la journée. Les pauses actives font redescendre les zones
// ciblées. Le moteur croise cette pression corporelle avec le temps écoulé
// depuis la dernière pause pour décider QUAND proposer une pause et QUEL
// exercice recommander. Tout est calculé localement, sans capteur ni caméra.

import { EXERCISES, exerciseById, type Exercise } from "../data/exercises";
import { REWARDS } from "../data/rewards";
import { dayKey, minutesBetween, shiftDayKey } from "../../lib/time";
import {
  ZONES,
  type DayStats,
  type MovaeState,
  type UrgencyLevel,
  type WorkStyle,
  type Zone,
} from "../types";

// Points de sollicitation par minute de travail actif.
const BASE_RATE: Record<Zone, number> = {
  yeux: 1.5,
  nuque: 1.15,
  epaules: 1.05,
  dos: 0.95,
  poignets: 1.0,
  hanches: 0.85,
  jambes: 0.85,
  energie: 0.75,
};

// Modulation selon le style de travail déclaré.
const STYLE_MULT: Record<WorkStyle, Partial<Record<Zone, number>>> = {
  clavier: { poignets: 1.6, epaules: 1.25, nuque: 1.1 },
  visio: { nuque: 1.35, dos: 1.2, energie: 1.25, poignets: 0.7 },
  lecture: { yeux: 1.45, nuque: 1.2, poignets: 0.6 },
  mixte: {},
};

const MAX_TICK_MIN = 10; // rattrapage maximal entre deux ticks
const AUTO_CLOSE_GAP_MIN = 180; // au-delà, la journée est considérée terminée
const IDLE_DECAY_PER_MIN = 0.6;
const AWAY_DECAY_PER_MIN = 0.9;
const STREAK_MIN_BREAKS = 3; // un jour compte dans la série à partir de 3 pauses

export function emptyStrain(): Record<Zone, number> {
  return Object.fromEntries(ZONES.map((z) => [z, 0])) as Record<Zone, number>;
}

function emptyDay(date: string): DayStats {
  return { date, breaks: 0, activeMin: 0, overdueMin: 0, zones: [], index: 0 };
}

function timeOfDayMult(zone: Zone, now: number): number {
  const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  if (zone === "energie" && h >= 13.5 && h < 16) return 1.35; // creux post-déjeuner
  if (zone === "yeux" && h >= 17) return 1.15; // fatigue visuelle de fin de journée
  return 1;
}

function rateFor(zone: Zone, style: WorkStyle, now: number): number {
  return BASE_RATE[zone] * (STYLE_MULT[style][zone] ?? 1) * timeOfDayMult(zone, now);
}

export function pressureOf(strain: Record<Zone, number>): number {
  return Math.max(...ZONES.map((z) => strain[z]));
}

// ---------- Indice Movaé ----------

export function computeIndex(state: MovaeState, key: string): number {
  const day = state.days[key];
  if (!day || day.activeMin < 5) return day?.index ?? 0;
  const expected = Math.max(1, day.activeMin / state.profile.cadenceMin);
  const regularity = Math.min(1, day.breaks / expected);
  const coverage = Math.min(1, day.zones.length / 5);
  const streakF = Math.min(state.streak.current, 14) / 14;
  const balance = Math.max(0, 1 - (day.overdueMin / Math.max(1, day.activeMin)) * 2);
  return Math.round(45 * regularity + 20 * coverage + 20 * streakF + 15 * balance);
}

export function indexStatus(index: number): string {
  if (index >= 85) return "Excellent rythme";
  if (index >= 70) return "Très bien";
  if (index >= 50) return "En route";
  if (index >= 30) return "À relancer";
  return "Journée à démarrer";
}

// ---------- Tick (appelé toutes les ~20 s) ----------

export function applyTick(state: MovaeState, now: number, idle: boolean): MovaeState {
  const last = state.session.lastTickAt ?? now;
  const gapMin = minutesBetween(last, now);

  // Longue absence : la journée se clôt d'elle-même, les tensions retombent.
  if (gapMin > AUTO_CLOSE_GAP_MIN && state.session.status !== "off") {
    const strain = emptyStrain();
    for (const z of ZONES) strain[z] = Math.round(state.strain[z] * 0.15);
    return {
      ...state,
      strain,
      session: { ...state.session, status: "off", lastTickAt: now },
    };
  }

  const minutes = Math.min(gapMin, MAX_TICK_MIN);
  const strain = { ...state.strain };
  const status = state.session.status;

  if (status === "working" && !idle) {
    for (const z of ZONES) {
      strain[z] = Math.min(100, strain[z] + rateFor(z, state.profile.style, now) * minutes);
    }
  } else {
    const decay = status === "away" ? AWAY_DECAY_PER_MIN : IDLE_DECAY_PER_MIN;
    for (const z of ZONES) strain[z] = Math.max(0, strain[z] - decay * minutes);
  }

  // Statistiques du jour
  const key = dayKey(now);
  const days = { ...state.days };
  const day = { ...(days[key] ?? emptyDay(key)) };
  if (status === "working" && !idle) {
    day.activeMin += minutes;
    const rec = getRecommendation({ ...state, strain }, now);
    if (rec.level === "prioritaire") day.overdueMin += minutes;
  }
  days[key] = day;

  const next: MovaeState = {
    ...state,
    strain,
    days,
    session: { ...state.session, lastTickAt: now },
  };
  next.days[key] = { ...day, index: computeIndex(next, key) };
  return next;
}

// ---------- Recommandation ----------

export interface Recommendation {
  need: number; // 0–100
  level: UrgencyLevel;
  sinceBreakMin: number;
  topZones: Zone[];
  exercise: Exercise;
  alternatives: Exercise[];
  eyeDue: boolean;
  snoozed: boolean;
}

export function getRecommendation(state: MovaeState, now: number): Recommendation {
  const { session, profile, prefs } = state;
  const anchor = session.lastBreakAt ?? session.startedAt ?? now;
  const sinceBreakMin = minutesBetween(anchor, now);
  const pressure = pressureOf(state.strain);
  const timeNorm = Math.min(100, (sinceBreakMin / profile.cadenceMin) * 70);
  const need = Math.round(0.55 * pressure + 0.45 * timeNorm);

  let level: UrgencyLevel;
  if (sinceBreakMin < profile.cadenceMin * 0.35 && pressure < 70) level = "fraiche";
  else if (need >= 85) level = "prioritaire";
  else if (need >= 65) level = "recommandee";
  else if (need >= 45) level = "bientot";
  else level = "ok";

  const topZones = [...ZONES]
    .sort((a, b) => state.strain[b] - state.strain[a])
    .filter((z) => state.strain[z] > 15)
    .slice(0, 3);

  const recentIds = state.history.slice(-3).map((h) => h.exerciseId);
  const scored = EXERCISES.map((ex) => {
    const zoneScore =
      ex.zones.reduce((sum, z) => sum + state.strain[z], 0) / ex.zones.length;
    const varietyPenalty = recentIds.includes(ex.id) ? 40 : 0;
    // En mode visio, privilégier la discrétion.
    const discretionPenalty = profile.style === "visio" && ex.discretion === 3 ? 12 : 0;
    return { ex, score: zoneScore - varietyPenalty - discretionPenalty };
  }).sort((a, b) => b.score - a.score);

  const eyeAnchor = session.lastEyeAt ?? anchor;
  const eyeDue =
    prefs.eyeRule && session.status === "working" && minutesBetween(eyeAnchor, now) >= 20;

  return {
    need,
    level,
    sinceBreakMin,
    topZones,
    exercise: scored[0].ex,
    alternatives: scored.slice(1, 4).map((s) => s.ex),
    eyeDue,
    snoozed: session.snoozedUntil !== null && session.snoozedUntil > now,
  };
}

// ---------- Pause terminée ----------

const PRIMARY_RELIEF = 65;
const GLOBAL_RELIEF = 8;
const HISTORY_CAP = 500;

export function applyBreak(
  state: MovaeState,
  exercise: Exercise,
  now: number,
  actualSec: number,
): MovaeState {
  const strain = { ...state.strain };
  for (const z of ZONES) {
    const relief = exercise.zones.includes(z) ? PRIMARY_RELIEF : GLOBAL_RELIEF;
    strain[z] = Math.max(0, strain[z] - relief);
  }

  const log = {
    id: `${now}-${exercise.id}`,
    ts: now,
    exerciseId: exercise.id,
    zones: exercise.zones,
    durationSec: actualSec,
  };
  const history = [...state.history, log].slice(-HISTORY_CAP);

  const key = dayKey(now);
  const days = { ...state.days };
  const day = { ...(days[key] ?? emptyDay(key)) };
  day.breaks += 1;
  day.zones = Array.from(new Set([...day.zones, ...exercise.zones]));
  days[key] = day;

  // Série : un jour devient « actif » à partir de STREAK_MIN_BREAKS pauses.
  let streak = { ...state.streak };
  if (day.breaks >= STREAK_MIN_BREAKS && streak.lastDay !== key) {
    const current = streak.lastDay === shiftDayKey(key, -1) ? streak.current + 1 : 1;
    streak = { current, best: Math.max(streak.best, current), lastDay: key };
  }

  const next: MovaeState = {
    ...state,
    strain,
    history,
    days,
    streak,
    totals: {
      breaks: state.totals.breaks + 1,
      minutes: state.totals.minutes + Math.round(actualSec / 60),
    },
    session: {
      ...state.session,
      lastBreakAt: now,
      snoozedUntil: null,
      lastEyeAt: exercise.zones.includes("yeux") ? now : state.session.lastEyeAt,
    },
  };

  // Récompenses nouvellement débloquées
  const newlyUnlocked = REWARDS.filter(
    (r) => !next.unlocked.includes(r.id) && r.check(next),
  ).map((r) => r.id);
  if (newlyUnlocked.length > 0) next.unlocked = [...next.unlocked, ...newlyUnlocked];

  next.days[key] = { ...day, index: computeIndex(next, key) };
  return next;
}

// ---------- Sélecteurs utilitaires ----------

export function todayStats(state: MovaeState, now: number): DayStats {
  return state.days[dayKey(now)] ?? emptyDay(dayKey(now));
}

export function todayIndex(state: MovaeState, now: number): number {
  return todayStats(state, now).index;
}

export function yesterdayIndex(state: MovaeState, now: number): number | null {
  const day = state.days[shiftDayKey(dayKey(now), -1)];
  return day && day.activeMin >= 5 ? day.index : null;
}

export function lastBreakExercise(state: MovaeState): Exercise | undefined {
  const last = state.history[state.history.length - 1];
  return last ? exerciseById(last.exerciseId) : undefined;
}
