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
