// Moteur adaptatif Movaé.
//
// Deux étages, tous deux 100 % locaux et transparents :
//
// 1. MODÈLE PHYSIOLOGIQUE — chaque zone du corps accumule une « sollicitation
//    estimée » (0–100) pendant le travail, à un rythme modulé par le style de
//    travail déclaré et le moment de la journée (creux post-déjeuner, fatigue
//    visuelle du soir). Les pauses font redescendre les zones ciblées.
//
// 2. APPRENTISSAGE (mode intelligent, activable/désactivable) — le moteur
//    apprend de vos réactions : à quelles heures vous acceptez réellement les
//    pauses (protection des phases de concentration), quel rythme vous suivez
//    vraiment (cadence auto-ajustée ±15 min autour de votre réglage), quels
//    exercices vous font du bien (retours 👍/👎) et lesquels vous n'avez pas
//    encore essayés (variété). Chaque recommandation expose ses raisons.
//
// Aucun capteur, aucune caméra, aucun contenu de travail analysé.

import { EXERCISES, exerciseById, type Exercise } from "../data/exercises";
import { REWARDS } from "../data/rewards";
import { dayKey, minutesBetween, shiftDayKey } from "../../lib/time";
import {
  ZONES,
  ZONE_LABELS,
  type DayStats,
  type Insights,
  type MovaeState,
  type UrgencyLevel,
  type WorkStyle,
  type Zone,
} from "../types";

// ---------- Constantes du modèle physiologique ----------

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

const STYLE_MULT: Record<WorkStyle, Partial<Record<Zone, number>>> = {
  clavier: { poignets: 1.6, epaules: 1.25, nuque: 1.1 },
  visio: { nuque: 1.35, dos: 1.2, energie: 1.25, poignets: 0.7 },
  lecture: { yeux: 1.45, nuque: 1.2, poignets: 0.6 },
  mixte: {},
};

const MAX_TICK_MIN = 10;
const AUTO_CLOSE_GAP_MIN = 180;
const IDLE_DECAY_PER_MIN = 0.6;
const AWAY_DECAY_PER_MIN = 0.9;
const STREAK_MIN_BREAKS = 3;
const PENDING_TIMEOUT_MIN = 20; // proposition sans réponse = ignorée
const CADENCE_LEARN_RANGE = 15; // la cadence apprise reste à ±15 min du réglage

export function emptyStrain(): Record<Zone, number> {
  return Object.fromEntries(ZONES.map((z) => [z, 0])) as Record<Zone, number>;
}

export function emptyInsights(): Insights {
  return { hourly: {}, exFeedback: {}, pendingRecAt: null, cadenceAuto: null };
}

function emptyDay(date: string): DayStats {
  return { date, breaks: 0, activeMin: 0, overdueMin: 0, zones: [], index: 0 };
}

function timeOfDayMult(zone: Zone, now: number): number {
  const h = new Date(now).getHours() + new Date(now).getMinutes() / 60;
  if (zone === "energie" && h >= 13.5 && h < 16) return 1.35;
  if (zone === "yeux" && h >= 17) return 1.15;
  return 1;
}

function rateFor(zone: Zone, style: WorkStyle, now: number): number {
  return BASE_RATE[zone] * (STYLE_MULT[style][zone] ?? 1) * timeOfDayMult(zone, now);
}

export function pressureOf(strain: Record<Zone, number>): number {
  return Math.max(...ZONES.map((z) => strain[z]));
}

// ---------- Apprentissages ----------

// Cadence effective : le réglage utilisateur, doucement ajusté vers le rythme
// réellement observé (jamais à plus de ±15 min du réglage).
export function effectiveCadence(state: MovaeState): number {
  const base = state.profile.cadenceMin;
  if (!state.prefs.smartMode || state.insights.cadenceAuto === null) return base;
  return Math.round(
    Math.min(base + CADENCE_LEARN_RANGE, Math.max(base - CADENCE_LEARN_RANGE, state.insights.cadenceAuto)),
  );
}

// Réceptivité apprise pour une heure donnée (lissage de Laplace).
export function hourReceptivity(insights: Insights, hour: number): { r: number; n: number } {
  const s = insights.hourly[String(hour)];
  if (!s) return { r: 0.5, n: 0 };
  return { r: (s.acc + 1) / (s.prop + 2), n: s.prop };
}

// ---------- Indice Movaé ----------

export function computeIndex(state: MovaeState, key: string): number {
  const day = state.days[key];
  if (!day || day.activeMin < 5) return day?.index ?? 0;
  const expected = Math.max(1, day.activeMin / effectiveCadence(state));
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

// ---------- Recommandation ----------

export interface Recommendation {
  need: number; // 0–100
  level: UrgencyLevel;
  sinceBreakMin: number;
  topZones: Zone[];
  exercise: Exercise;
  alternatives: Exercise[];
  reasons: string[]; // transparence : pourquoi cet exercice, pourquoi maintenant
  nextIdealAt: number | null; // estimation de la prochaine fenêtre idéale
  cadence: number; // cadence effective (apprise ou réglée)
  eyeDue: boolean;
  snoozed: boolean;
}

export function getRecommendation(state: MovaeState, now: number): Recommendation {
  const { session, profile, prefs, insights } = state;
  const smart = prefs.smartMode;
  const cadence = effectiveCadence(state);
  const anchor = session.lastBreakAt ?? session.startedAt ?? now;
  const sinceBreakMin = minutesBetween(anchor, now);
  const pressure = pressureOf(state.strain);
  const timeNorm = Math.min(100, (sinceBreakMin / cadence) * 70);
  const need = Math.round(0.55 * pressure + 0.45 * timeNorm);

  const reasons: string[] = [];

  // Ajustement du seuil selon la réceptivité apprise à cette heure.
  const hour = new Date(now).getHours();
  const { r: receptivity, n: samples } = hourReceptivity(insights, hour);
  let adjusted = need;
  if (smart && samples >= 3) {
    if (receptivity >= 0.6) adjusted += 6;
    else if (receptivity <= 0.25) adjusted -= 12;
  }

  let level: UrgencyLevel;
  if (sinceBreakMin < cadence * 0.35 && pressure < 70) level = "fraiche";
  else if (need >= 88) level = "prioritaire"; // le besoin fort passe toujours
  else if (adjusted >= 65) level = "recommandee";
  else if (adjusted >= 45) level = "bientot";
  else level = "ok";

  const topZones = [...ZONES]
    .sort((a, b) => state.strain[b] - state.strain[a])
    .filter((z) => state.strain[z] > 15)
    .slice(0, 3);

  // ----- Choix de l'exercice : zones + préférences + variété + contexte -----
  const recentIds = state.history.slice(-4).map((h) => h.exerciseId);
  const scored = EXERCISES.map((ex) => {
    const zoneScore = ex.zones.reduce((sum, z) => sum + state.strain[z], 0) / ex.zones.length;
    let score = zoneScore;
    if (recentIds.includes(ex.id)) score -= 45;
    if (profile.style === "visio" && ex.discretion === 3) score -= 12;
    if (smart) {
      const fb = insights.exFeedback[ex.id];
      if (fb) {
        score += Math.max(-3, Math.min(3, fb.up - fb.down)) * 6;
        // variété : plus un exercice est ancien, plus il redevient candidat
        const daysSince = (now - fb.lastTs) / 86400000;
        score += Math.min(12, daysSince * 1.5);
      } else {
        score += 10; // jamais essayé : encourager la découverte
      }
    }
    return { ex, score };
  }).sort((a, b) => b.score - a.score);

  const exercise = scored[0].ex;

  // ----- Raisons affichées (transparence du moteur) -----
  if (topZones.length > 0 && state.strain[topZones[0]] >= 40) {
    reasons.push(`${ZONE_LABELS[topZones[0]]} sollicité·e depuis un moment`);
  }
  if (sinceBreakMin >= cadence) {
    reasons.push(`${Math.round(sinceBreakMin)} min sans pause`);
  }
  if (smart) {
    const fb = insights.exFeedback[exercise.id];
    if (fb && fb.up > fb.down) reasons.push("vous l'avez apprécié");
    if (!fb) reasons.push("nouveau pour vous");
    if (samples >= 3 && receptivity >= 0.6) reasons.push("heure où vous répondez bien");
  }
  if (profile.style === "visio" && exercise.discretion === 1) reasons.push("invisible en visio");

  // ----- Prochaine fenêtre idéale (estimation) -----
  let nextIdealAt: number | null = null;
  if (level === "fraiche" || level === "ok" || level === "bientot") {
    const needRate = 0.55 * 1.1 + 0.45 * (70 / cadence); // points de besoin / minute
    const minutes = Math.max(0, Math.min(180, (65 - adjusted) / needRate));
    nextIdealAt = now + minutes * 60000;
  }

  const eyeAnchor = session.lastEyeAt ?? anchor;
  const eyeDue =
    prefs.eyeRule && session.status === "working" && minutesBetween(eyeAnchor, now) >= 20;

  return {
    need,
    level,
    sinceBreakMin,
    topZones,
    exercise,
    alternatives: scored.slice(1, 4).map((s) => s.ex),
    reasons,
    nextIdealAt,
    cadence,
    eyeDue,
    snoozed: session.snoozedUntil !== null && session.snoozedUntil > now,
  };
}

// ---------- Tick (appelé toutes les ~20 s) ----------

export function applyTick(state: MovaeState, now: number, idle: boolean): MovaeState {
  const last = state.session.lastTickAt ?? now;
  const gapMin = minutesBetween(last, now);

  if (gapMin > AUTO_CLOSE_GAP_MIN && state.session.status !== "off") {
    const strain = emptyStrain();
    for (const z of ZONES) strain[z] = Math.round(state.strain[z] * 0.15);
    return {
      ...state,
      strain,
      insights: { ...state.insights, pendingRecAt: null },
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

  const key = dayKey(now);
  const days = { ...state.days };
  const day = { ...(days[key] ?? emptyDay(key)) };

  // Suivi des propositions : le moteur apprend quelles heures sont réceptives.
  let insights = state.insights;
  const withStrain = { ...state, strain };
  const rec = getRecommendation(withStrain, now);
  if (status === "working" && !idle) {
    day.activeMin += minutes;
    if (rec.level === "prioritaire") day.overdueMin += minutes;
    if (
      insights.pendingRecAt === null &&
      (rec.level === "recommandee" || rec.level === "prioritaire") &&
      !rec.snoozed
    ) {
      const h = String(new Date(now).getHours());
      const stat = insights.hourly[h] ?? { prop: 0, acc: 0 };
      insights = {
        ...insights,
        pendingRecAt: now,
        hourly: { ...insights.hourly, [h]: { ...stat, prop: stat.prop + 1 } },
      };
    }
  }
  if (insights.pendingRecAt !== null && minutesBetween(insights.pendingRecAt, now) > PENDING_TIMEOUT_MIN) {
    insights = { ...insights, pendingRecAt: null }; // ignorée : proposée mais non suivie
  }
  days[key] = day;

  const next: MovaeState = {
    ...state,
    strain,
    days,
    insights,
    session: { ...state.session, lastTickAt: now },
  };
  next.days[key] = { ...day, index: computeIndex(next, key) };
  return next;
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

  let streak = { ...state.streak };
  if (day.breaks >= STREAK_MIN_BREAKS && streak.lastDay !== key) {
    const current = streak.lastDay === shiftDayKey(key, -1) ? streak.current + 1 : 1;
    streak = { current, best: Math.max(streak.best, current), lastDay: key };
  }

  // ----- Apprentissages -----
  let insights = { ...state.insights };
  // 1. Proposition suivie d'effet → l'heure était réceptive.
  if (insights.pendingRecAt !== null) {
    const h = String(new Date(insights.pendingRecAt).getHours());
    const stat = insights.hourly[h] ?? { prop: 1, acc: 0 };
    insights.hourly = { ...insights.hourly, [h]: { ...stat, acc: stat.acc + 1 } };
    insights.pendingRecAt = null;
  }
  // 2. Cadence réellement observée (EMA bornée, apprise en douceur).
  const anchor = state.session.lastBreakAt ?? state.session.startedAt;
  if (anchor && state.session.status === "working") {
    const interval = minutesBetween(anchor, now);
    if (interval >= 15 && interval <= 120) {
      insights.cadenceAuto =
        insights.cadenceAuto === null ? interval : Math.round((0.75 * insights.cadenceAuto + 0.25 * interval) * 10) / 10;
    }
  }
  // 3. Compteur de réalisations (variété).
  const fb = insights.exFeedback[exercise.id] ?? { up: 0, down: 0, done: 0, lastTs: 0 };
  insights.exFeedback = {
    ...insights.exFeedback,
    [exercise.id]: { ...fb, done: fb.done + 1, lastTs: now },
  };

  const next: MovaeState = {
    ...state,
    strain,
    history,
    days,
    streak,
    insights,
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

  const newlyUnlocked = REWARDS.filter(
    (r) => !next.unlocked.includes(r.id) && r.check(next),
  ).map((r) => r.id);
  if (newlyUnlocked.length > 0) next.unlocked = [...next.unlocked, ...newlyUnlocked];

  next.days[key] = { ...day, index: computeIndex(next, key) };
  return next;
}

// ---------- Retour utilisateur sur un exercice ----------

export function applyExerciseFeedback(state: MovaeState, exerciseId: string, up: boolean): MovaeState {
  const fb = state.insights.exFeedback[exerciseId] ?? { up: 0, down: 0, done: 0, lastTs: Date.now() };
  return {
    ...state,
    insights: {
      ...state.insights,
      exFeedback: {
        ...state.insights.exFeedback,
        [exerciseId]: up ? { ...fb, up: fb.up + 1 } : { ...fb, down: fb.down + 1 },
      },
    },
  };
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

// Résumé de ce que le moteur a appris (affiché tel quel à l'utilisateur).
export interface LearnedSummary {
  observedHours: { hour: number; receptivity: number; samples: number }[];
  favorite: Exercise | null;
  triedCount: number;
  cadenceAuto: number | null;
}

export function learnedSummary(state: MovaeState): LearnedSummary {
  const observedHours = Object.entries(state.insights.hourly)
    .map(([h, s]) => ({ hour: Number(h), receptivity: (s.acc + 1) / (s.prop + 2), samples: s.prop }))
    .filter((x) => x.samples > 0)
    .sort((a, b) => a.hour - b.hour);
  let favorite: Exercise | null = null;
  let best = 0;
  for (const [id, fb] of Object.entries(state.insights.exFeedback)) {
    const score = fb.up - fb.down + fb.done * 0.2;
    if (fb.up > 0 && score > best) {
      best = score;
      favorite = exerciseById(id) ?? null;
    }
  }
  return {
    observedHours,
    favorite,
    triedCount: Object.values(state.insights.exFeedback).filter((f) => f.done > 0).length,
    cadenceAuto: state.insights.cadenceAuto,
  };
}
