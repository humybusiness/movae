import type { Zone } from "../types";
import type { MotionId } from "./motions";

export interface Exercise {
  id: string;
  name: string;
  zones: Zone[];
  durationSec: number;
  reps: string; // dosage lisible : « 8 répétitions lentes », « 15 s par côté »…
  steps: string[];
  why: string; // bénéfice concret, sans jargon
  science?: string; // ancrage prudent (INRS, AOA, littérature ergonomie…)
  discretion: 1 | 2 | 3; // 1 = invisible, 2 = discret, 3 = visible
  position: "assis" | "debout" | "assis-debout";
  intensity: 1 | 2 | 3; // 1 = très doux, 3 = dynamique
  motion: MotionId;
}
