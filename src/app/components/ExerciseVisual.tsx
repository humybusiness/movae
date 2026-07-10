import { useState } from "react";
import { ExerciseFigure } from "./ExerciseFigure";
import type { MotionId } from "../data/motions";

// Visuel d'exercice avec remplacement automatique par image :
// déposez une image dans public/exercises/{id}.webp (ou régénérez le build
// desktop) et elle remplace la figure vectorielle, sans toucher au code.
// Tant que l'image n'existe pas (ou ne charge pas), la figure sert de repli.

export function ExerciseVisual({
  exerciseId,
  motion,
  size = 92,
  animate = false,
}: {
  exerciseId: string;
  motion: MotionId;
  size?: number;
  animate?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <span className="relative inline-block align-top" style={{ width: size, height: size }}>
      {!loaded && <ExerciseFigure motion={motion} size={size} animate={animate} />}
      {!failed && (
        <img
          src={`/exercises/${exerciseId}.webp`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="absolute inset-0 h-full w-full rounded-2xl object-cover"
          style={{ display: loaded ? "block" : "none" }}
          onLoad={(e) => {
            // Garde-fou : un serveur SPA peut renvoyer du HTML pour un fichier
            // manquant — on vérifie que c'est bien une image décodée.
            if ((e.target as HTMLImageElement).naturalWidth > 1) setLoaded(true);
            else setFailed(true);
          }}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
