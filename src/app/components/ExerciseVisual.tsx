import { useMemo } from "react";
import { ExerciseFigure } from "./ExerciseFigure";
import { zoneSnapshot } from "./zoneSnapshots";
import { defaultAvatar, useMovaeMaybe } from "../state/store";
import { MOTIONS, type MotionId } from "../data/motions";

// Vignette d'exercice pour les listes/grilles : gros plan 3D STATIQUE de la
// zone ciblée (main seule pour les poignets, visage pour les yeux, nuque de
// profil...). Les images sont rendues une fois par un renderer partagé puis
// mises en cache — aucune scène 3D vivante par carte. Le personnage animé
// complet reste réservé au dashboard et au lecteur de pause.

export function ExerciseVisual({
  motion,
  size = 92,
}: {
  motion: MotionId;
  size?: number;
  animate?: boolean;
}) {
  const zone = MOTIONS[motion].highlight;
  const store = useMovaeMaybe();
  const body = (store?.state.avatar ?? defaultAvatar()).body;

  const src = useMemo(() => {
    try {
      return zoneSnapshot(zone, body);
    } catch {
      return null; // WebGL indisponible : repli sur la figure vectorielle
    }
  }, [zone, body]);

  if (!src) return <ExerciseFigure motion={motion} size={size} />;

  return (
    <span
      className="inline-block align-top"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        overflow: "hidden",
        background: "radial-gradient(120% 100% at 50% 20%, var(--m-soft) 0%, var(--m-bg2) 100%)",
      }}
    >
      <img src={src} alt="" width={size} height={size} className="h-full w-full object-cover" />
    </span>
  );
}
