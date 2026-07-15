import { ExerciseFigure } from "./ExerciseFigure";
import type { MotionId } from "../data/motions";

// Vignette d'exercice : le personnage 2D en pose finale, cadré sur la zone
// travaillée (main seule pour les doigts, visage pour les yeux...).

export function ExerciseVisual({ motion, size = 92 }: { motion: MotionId; size?: number }) {
  return (
    <span
      className="inline-block overflow-hidden align-top"
      style={{ width: size, height: size, borderRadius: size * 0.18 }}
    >
      <ExerciseFigure motion={motion} size={size} zoom />
    </span>
  );
}
