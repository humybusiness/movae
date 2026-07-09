// Défi du jour : un exercice mis en avant chaque jour, le même pour toute la
// journée (déterministe à partir de la date). Le relever nourrit des badges.

import { EXERCISES, type Exercise } from "./exercises";
import { dayKey } from "../../lib/time";
import type { MovaeState } from "../types";

export function challengeOfDay(key: string): Exercise {
  let h = 7;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return EXERCISES[h % EXERCISES.length];
}

export function challengeDoneOn(state: MovaeState, key: string): boolean {
  const target = challengeOfDay(key).id;
  return state.history.some((b) => b.exerciseId === target && dayKey(b.ts) === key);
}

// Nombre total de jours où le défi du jour a été relevé.
export function countChallengesDone(state: MovaeState): number {
  const doneByDay = new Map<string, Set<string>>();
  for (const b of state.history) {
    const k = dayKey(b.ts);
    if (!doneByDay.has(k)) doneByDay.set(k, new Set());
    doneByDay.get(k)!.add(b.exerciseId);
  }
  let count = 0;
  for (const [k, ids] of doneByDay) {
    if (ids.has(challengeOfDay(k).id)) count++;
  }
  return count;
}

export function distinctExercisesTried(state: MovaeState): number {
  return new Set(state.history.map((b) => b.exerciseId)).size;
}
