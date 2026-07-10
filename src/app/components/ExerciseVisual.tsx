import { ExerciseFigure } from "./ExerciseFigure";
import type { MotionId } from "../data/motions";

// Visuel d'exercice pour les listes/grilles (beaucoup d'items affichés en
// même temps) : figure 2D légère. Le personnage 3D animé (ExerciseFigure3D)
// est réservé aux emplacements uniques et mis en avant (dashboard, lecteur
// de pause) pour éviter d'ouvrir des dizaines de contextes WebGL à la fois.

export function ExerciseVisual({
  motion,
  size = 92,
  animate = false,
}: {
  motion: MotionId;
  size?: number;
  animate?: boolean;
}) {
  return <ExerciseFigure motion={motion} size={size} animate={animate} />;
}
