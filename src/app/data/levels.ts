// Niveaux Movaé : une progression sobre basée sur le nombre total de pauses.

export interface Level {
  n: number;
  name: string;
  threshold: number; // pauses totales requises
}

export const LEVELS: Level[] = [
  { n: 1, name: "Premiers pas", threshold: 0 },
  { n: 2, name: "Éveil", threshold: 10 },
  { n: 3, name: "Élan", threshold: 30 },
  { n: 4, name: "Rythme", threshold: 75 },
  { n: 5, name: "Flow", threshold: 150 },
  { n: 6, name: "Maître du mouvement", threshold: 300 },
];

export interface LevelState {
  level: Level;
  next: Level | null;
  progress: number; // 0..1 vers le niveau suivant
}

export function levelFor(totalBreaks: number): LevelState {
  let level = LEVELS[0];
  for (const l of LEVELS) if (totalBreaks >= l.threshold) level = l;
  const next = LEVELS.find((l) => l.n === level.n + 1) ?? null;
  const progress = next
    ? Math.min(1, (totalBreaks - level.threshold) / (next.threshold - level.threshold))
    : 1;
  return { level, next, progress };
}
