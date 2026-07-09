import type { Exercise } from "./exercise-model";
import { EX_HAUT } from "./ex-haut";
import { EX_TRONC } from "./ex-tronc";
import { EX_BAS } from "./ex-bas";

export type { Exercise } from "./exercise-model";

// Banque complète : 100 exercices assis / debout, sans matériel,
// répartis sur les 8 zones. Voir ex-haut / ex-tronc / ex-bas.
export const EXERCISES: Exercise[] = [...EX_HAUT, ...EX_TRONC, ...EX_BAS];

const byId = new Map(EXERCISES.map((e) => [e.id, e]));

export const exerciseById = (id: string): Exercise | undefined => byId.get(id);

export const EYE_EXERCISE_ID = "regle-20-20-20";
