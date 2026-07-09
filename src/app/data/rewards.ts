import { countChallengesDone, distinctExercisesTried } from "./daily";
import { shiftDayKey, dayKey } from "../../lib/time";
import type { IndexStyleId, MovaeState, ThemeId } from "../types";

export interface RewardProgress {
  current: number;
  target: number;
}

export interface Reward {
  id: string;
  kind: "badge" | "theme" | "style";
  name: string;
  desc: string;
  hint: string; // condition affichée quand verrouillé
  icon: string; // nom d'icône lucide (mappé dans l'UI)
  grants?: { theme?: ThemeId; style?: IndexStyleId };
  check: (s: MovaeState) => boolean;
  progress?: (s: MovaeState) => RewardProgress;
}

const anyDay = (s: MovaeState, pred: (d: MovaeState["days"][string]) => boolean) =>
  Object.values(s.days).some(pred);

const eyeBreaks = (s: MovaeState) =>
  s.history.filter((h) => h.zones.includes("yeux")).length;

const feedbackCount = (s: MovaeState) =>
  Object.values(s.insights.exFeedback).reduce((sum, f) => sum + f.up + f.down, 0);

// Jours actifs (≥ 3 pauses) sur les 7 derniers jours.
const activeDaysThisWeek = (s: MovaeState) => {
  const today = dayKey(Date.now());
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const d = s.days[shiftDayKey(today, -i)];
    if (d && d.breaks >= 3) n++;
  }
  return n;
};

export const REWARDS: Reward[] = [
  // ---------- Badges ----------
  {
    id: "premiere-pause",
    kind: "badge",
    name: "Premier mouvement",
    desc: "Votre toute première pause active avec Movaé.",
    hint: "Terminer 1 pause",
    icon: "Sparkles",
    check: (s) => s.totals.breaks >= 1,
    progress: (s) => ({ current: s.totals.breaks, target: 1 }),
  },
  {
    id: "elan-10",
    kind: "badge",
    name: "Élan",
    desc: "10 pauses actives terminées.",
    hint: "Terminer 10 pauses",
    icon: "Activity",
    check: (s) => s.totals.breaks >= 10,
    progress: (s) => ({ current: s.totals.breaks, target: 10 }),
  },
  {
    id: "regulier-50",
    kind: "badge",
    name: "Le rythme est pris",
    desc: "50 pauses actives terminées.",
    hint: "Terminer 50 pauses",
    icon: "Medal",
    check: (s) => s.totals.breaks >= 50,
    progress: (s) => ({ current: s.totals.breaks, target: 50 }),
  },
  {
    id: "profond-200",
    kind: "badge",
    name: "Movaé profond",
    desc: "200 pauses actives. Le mouvement fait partie de vos journées.",
    hint: "Terminer 200 pauses",
    icon: "Trophy",
    check: (s) => s.totals.breaks >= 200,
    progress: (s) => ({ current: s.totals.breaks, target: 200 }),
  },
  {
    id: "serie-3",
    kind: "badge",
    name: "Prise d’élan",
    desc: "3 jours actifs d’affilée.",
    hint: "3 jours de série",
    icon: "Flame",
    check: (s) => s.streak.best >= 3,
    progress: (s) => ({ current: s.streak.best, target: 3 }),
  },
  {
    id: "serie-7",
    kind: "badge",
    name: "Série 7 jours",
    desc: "Une semaine entière de régularité.",
    hint: "7 jours de série",
    icon: "Flame",
    check: (s) => s.streak.best >= 7,
    progress: (s) => ({ current: s.streak.best, target: 7 }),
  },
  {
    id: "serie-14",
    kind: "badge",
    name: "Quinzaine solide",
    desc: "14 jours actifs d’affilée.",
    hint: "14 jours de série",
    icon: "CalendarCheck",
    check: (s) => s.streak.best >= 14,
    progress: (s) => ({ current: s.streak.best, target: 14 }),
  },
  {
    id: "serie-30",
    kind: "badge",
    name: "Un mois en mouvement",
    desc: "30 jours actifs d’affilée. Chapeau bas.",
    hint: "30 jours de série",
    icon: "Crown",
    check: (s) => s.streak.best >= 30,
    progress: (s) => ({ current: s.streak.best, target: 30 }),
  },
  {
    id: "corps-complet",
    kind: "badge",
    name: "Corps complet",
    desc: "5 zones du corps mobilisées dans la même journée.",
    hint: "5 zones en 1 jour",
    icon: "PersonStanding",
    check: (s) => anyDay(s, (d) => d.zones.length >= 5),
  },
  {
    id: "matinal",
    kind: "badge",
    name: "Matinal",
    desc: "Une pause active avant 9 h 30.",
    hint: "1 pause avant 9 h 30",
    icon: "Sunrise",
    check: (s) =>
      s.history.some((h) => {
        const d = new Date(h.ts);
        return d.getHours() + d.getMinutes() / 60 < 9.5;
      }),
  },
  {
    id: "marathon-doux",
    kind: "badge",
    name: "Marathon doux",
    desc: "6 pauses actives dans la même journée.",
    hint: "6 pauses en 1 jour",
    icon: "Footprints",
    check: (s) => anyDay(s, (d) => d.breaks >= 6),
  },
  {
    id: "oeil-de-lynx",
    kind: "badge",
    name: "Œil de lynx",
    desc: "10 pauses dédiées aux yeux.",
    hint: "10 pauses « yeux »",
    icon: "Eye",
    check: (s) => eyeBreaks(s) >= 10,
    progress: (s) => ({ current: eyeBreaks(s), target: 10 }),
  },
  // ---------- Niveaux ----------
  {
    id: "niveau-eveil",
    kind: "badge",
    name: "Niveau 2 — Éveil",
    desc: "10 pauses : le mouvement s'installe.",
    hint: "10 pauses au total",
    icon: "Sunrise",
    check: (s) => s.totals.breaks >= 10,
    progress: (s) => ({ current: s.totals.breaks, target: 10 }),
  },
  {
    id: "niveau-elan",
    kind: "badge",
    name: "Niveau 3 — Élan",
    desc: "30 pauses : la routine prend forme.",
    hint: "30 pauses au total",
    icon: "Zap",
    check: (s) => s.totals.breaks >= 30,
    progress: (s) => ({ current: s.totals.breaks, target: 30 }),
  },
  {
    id: "niveau-rythme",
    kind: "badge",
    name: "Niveau 4 — Rythme",
    desc: "75 pauses : votre corps connaît la musique.",
    hint: "75 pauses au total",
    icon: "Music",
    check: (s) => s.totals.breaks >= 75,
    progress: (s) => ({ current: s.totals.breaks, target: 75 }),
  },
  {
    id: "niveau-flow",
    kind: "badge",
    name: "Niveau 5 — Flow",
    desc: "150 pauses : bouger fait partie de vous.",
    hint: "150 pauses au total",
    icon: "Waves",
    check: (s) => s.totals.breaks >= 150,
    progress: (s) => ({ current: s.totals.breaks, target: 150 }),
  },
  {
    id: "niveau-maitre",
    kind: "badge",
    name: "Niveau 6 — Maître du mouvement",
    desc: "300 pauses : le sommet de la pyramide Movaé.",
    hint: "300 pauses au total",
    icon: "Mountain",
    check: (s) => s.totals.breaks >= 300,
    progress: (s) => ({ current: s.totals.breaks, target: 300 }),
  },
  // ---------- Exploration ----------
  {
    id: "explorateur-10",
    kind: "badge",
    name: "Curieux",
    desc: "10 exercices différents essayés.",
    hint: "10 exercices différents",
    icon: "Compass",
    check: (s) => distinctExercisesTried(s) >= 10,
    progress: (s) => ({ current: distinctExercisesTried(s), target: 10 }),
  },
  {
    id: "explorateur-30",
    kind: "badge",
    name: "Explorateur",
    desc: "30 exercices différents essayés.",
    hint: "30 exercices différents",
    icon: "Map",
    check: (s) => distinctExercisesTried(s) >= 30,
    progress: (s) => ({ current: distinctExercisesTried(s), target: 30 }),
  },
  {
    id: "explorateur-60",
    kind: "badge",
    name: "Grand voyageur",
    desc: "60 exercices différents essayés.",
    hint: "60 exercices différents",
    icon: "Globe",
    check: (s) => distinctExercisesTried(s) >= 60,
    progress: (s) => ({ current: distinctExercisesTried(s), target: 60 }),
  },
  {
    id: "collection-complete",
    kind: "badge",
    name: "Collection complète",
    desc: "Les 100 exercices essayés au moins une fois. Respect.",
    hint: "100 exercices différents",
    icon: "Library",
    check: (s) => distinctExercisesTried(s) >= 100,
    progress: (s) => ({ current: distinctExercisesTried(s), target: 100 }),
  },
  // ---------- Défis du jour ----------
  {
    id: "defi-premier",
    kind: "badge",
    name: "Défi relevé",
    desc: "Votre premier défi du jour accompli.",
    hint: "1 défi du jour",
    icon: "Target",
    check: (s) => countChallengesDone(s) >= 1,
    progress: (s) => ({ current: countChallengesDone(s), target: 1 }),
  },
  {
    id: "defi-7",
    kind: "badge",
    name: "Chasseur de défis",
    desc: "7 défis du jour relevés.",
    hint: "7 défis du jour",
    icon: "Swords",
    check: (s) => countChallengesDone(s) >= 7,
    progress: (s) => ({ current: countChallengesDone(s), target: 7 }),
  },
  {
    id: "defi-21",
    kind: "badge",
    name: "Imbattable",
    desc: "21 défis du jour relevés.",
    hint: "21 défis du jour",
    icon: "Trophy",
    check: (s) => countChallengesDone(s) >= 21,
    progress: (s) => ({ current: countChallengesDone(s), target: 21 }),
  },
  // ---------- Programmes & engagement ----------
  {
    id: "programme-premier",
    kind: "badge",
    name: "Rituel complet",
    desc: "Un programme guidé terminé de bout en bout.",
    hint: "1 programme terminé",
    icon: "ListChecks",
    check: (s) => s.totals.programs >= 1,
    progress: (s) => ({ current: s.totals.programs, target: 1 }),
  },
  {
    id: "programmes-10",
    kind: "badge",
    name: "Maître des rituels",
    desc: "10 programmes guidés terminés.",
    hint: "10 programmes terminés",
    icon: "Layers",
    check: (s) => s.totals.programs >= 10,
    progress: (s) => ({ current: s.totals.programs, target: 10 }),
  },
  {
    id: "semaine-parfaite",
    kind: "badge",
    name: "Semaine solide",
    desc: "5 jours actifs (≥ 3 pauses) sur les 7 derniers jours.",
    hint: "5 jours actifs / 7",
    icon: "CalendarHeart",
    check: (s) => activeDaysThisWeek(s) >= 5,
    progress: (s) => ({ current: activeDaysThisWeek(s), target: 5 }),
  },
  {
    id: "critique-10",
    kind: "badge",
    name: "Fin connaisseur",
    desc: "10 retours 👍/👎 donnés : le moteur vous connaît mieux.",
    hint: "10 retours donnés",
    icon: "MessageSquareHeart",
    check: (s) => feedbackCount(s) >= 10,
    progress: (s) => ({ current: feedbackCount(s), target: 10 }),
  },
  // ---------- Thèmes ----------
  {
    id: "theme-nuit",
    kind: "theme",
    name: "Thème Nuit calme",
    desc: "Un mode sombre apaisant, débloqué par la régularité.",
    hint: "3 jours de série",
    icon: "Moon",
    grants: { theme: "nuit-calme" },
    check: (s) => s.streak.best >= 3,
    progress: (s) => ({ current: s.streak.best, target: 3 }),
  },
  {
    id: "theme-sable",
    kind: "theme",
    name: "Thème Sable",
    desc: "Une palette chaude et minérale.",
    hint: "25 pauses au total",
    icon: "Shell",
    grants: { theme: "sable" },
    check: (s) => s.totals.breaks >= 25,
    progress: (s) => ({ current: s.totals.breaks, target: 25 }),
  },
  {
    id: "theme-foret",
    kind: "theme",
    name: "Thème Forêt profonde",
    desc: "Le sombre végétal des habitués.",
    hint: "7 jours de série",
    icon: "Trees",
    grants: { theme: "foret" },
    check: (s) => s.streak.best >= 7,
    progress: (s) => ({ current: s.streak.best, target: 7 }),
  },
  {
    id: "theme-aube",
    kind: "theme",
    name: "Thème Aube",
    desc: "Des tons chauds de lever de soleil.",
    hint: "75 pauses au total",
    icon: "Sun",
    grants: { theme: "aube" },
    check: (s) => s.totals.breaks >= 75,
    progress: (s) => ({ current: s.totals.breaks, target: 75 }),
  },
  {
    id: "theme-ocean",
    kind: "theme",
    name: "Thème Océan",
    desc: "Le bleu-vert profond des grands réguliers.",
    hint: "120 pauses au total",
    icon: "Waves",
    grants: { theme: "ocean" },
    check: (s) => s.totals.breaks >= 120,
    progress: (s) => ({ current: s.totals.breaks, target: 120 }),
  },
  // ---------- Styles d'indice ----------
  {
    id: "style-score",
    kind: "style",
    name: "Indice « Score dominant »",
    desc: "Le chiffre en très grand, pour les amateurs de sobriété.",
    hint: "5 pauses au total",
    icon: "Hash",
    grants: { style: "score" },
    check: (s) => s.totals.breaks >= 5,
    progress: (s) => ({ current: s.totals.breaks, target: 5 }),
  },
  {
    id: "style-barres",
    kind: "style",
    name: "Indice « Barres »",
    desc: "Votre indice en barres segmentées, façon vumètre calme.",
    hint: "15 pauses au total",
    icon: "BarChart3",
    grants: { style: "barres" },
    check: (s) => s.totals.breaks >= 15,
    progress: (s) => ({ current: s.totals.breaks, target: 15 }),
  },
];

export const rewardById = (id: string): Reward | undefined =>
  REWARDS.find((r) => r.id === id);

export function themeUnlocked(s: MovaeState, theme: ThemeId): boolean {
  if (theme === "sauge") return true;
  const reward = REWARDS.find((r) => r.grants?.theme === theme);
  return !reward || s.unlocked.includes(reward.id);
}

export function styleUnlocked(s: MovaeState, style: IndexStyleId): boolean {
  if (style === "anneau") return true;
  const reward = REWARDS.find((r) => r.grants?.style === style);
  return !reward || s.unlocked.includes(reward.id);
}
