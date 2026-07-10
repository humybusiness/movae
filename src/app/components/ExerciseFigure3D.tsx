import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ExerciseFigure } from "./ExerciseFigure";
import {
  applyPose,
  ClayLights,
  ClayRig,
  ClayStage,
  easeInOut,
  lerpPose,
  motionFrames3D,
  pelvisBaseY,
  rad,
  restPose,
  useRigRefs,
  CLAY,
} from "./ClayCharacter";
import { defaultAvatar, useMovaeMaybe } from "../state/store";
import { MOTIONS, type Motion, type MotionId } from "../data/motions";

// Figure d'exercice 3D : le personnage argile rejoue le mouvement de
// l'exercice, filmé sous son meilleur angle (profil pour les mouvements
// sagittaux, face pour les latéraux/rotations). Les vues gros-plan
// (yeux, mains) restent en 2D, plus lisibles à cette échelle.

// Orientation du personnage selon la vue : en profil il montre son côté
// gauche (léger 3/4 pour garder du volume), de face il regarde la caméra.
const VIEW_YAW: Record<"side" | "front", number> = {
  side: rad(68),
  front: rad(-6),
};

// Quelques exercices gagnent à être cadrés plus strictement de profil
// (rétraction du menton, dos rond/creux...) ou en 3/4 plus ouvert.
const YAW_OVERRIDES: Partial<Record<MotionId, number>> = {
  "chin-tuck": rad(86),
  "neck-yes": rad(82),
  "cat-cow": rad(80),
  "forward-fold": rad(78),
  "pelvis-tilt": rad(84),
  "stand-backbend": rad(80),
  "desk-cobra": rad(74),
  "breath-belly": rad(58),
  "breath-446": rad(58),
  sigh: rad(58),
  "shoulder-roll": rad(78),
};

function yawFor(motionId: MotionId, motion: Motion): number {
  if (motion.view !== "side" && motion.view !== "front") return 0;
  return YAW_OVERRIDES[motionId] ?? VIEW_YAW[motion.view];
}

function ExerciseScene({
  motionId,
  motion,
  animate,
  body,
  equipped,
}: {
  motionId: MotionId;
  motion: Motion;
  animate: boolean;
  body: "f" | "m";
  equipped: string[];
}) {
  const stand = motion.view === "side" && Boolean(motion.stand);
  const frames = useMemo(() => motionFrames3D(motion), [motion]);
  const refs = useRigRefs();
  const rig = useRef<THREE.Group>(null);
  const blinkSeed = useRef(Math.random() * 10);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const yaw = yawFor(motionId, motion);
  const baseY = pelvisBaseY(stand);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Micro-vie : léger balancement + respiration + clignements.
    let sway = 0;
    let blink = 1;
    if (!reduced.current) {
      sway = Math.sin(t * 0.4) * 0.05;
      const b = (t + blinkSeed.current) % 3.4;
      blink = b < 0.12 ? 0.12 : 1;
    }
    if (rig.current) rig.current.rotation.y = yaw + sway;

    let pose = frames[frames.length - 1];
    if (animate && !reduced.current && frames.length > 1) {
      const cycle = motion.hold ? 4.2 : 2.8;
      const phase = (t % cycle) / cycle;
      let k = phase * 2;
      k = k < 1 ? k : 2 - k;
      if (motion.hold) k = Math.min(1, k * 1.6); // plateau : étirement tenu
      const eased = easeInOut(k);
      const seg = eased * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(seg));
      pose = lerpPose(frames[i], frames[i + 1], seg - i);
    } else if (!animate && !reduced.current) {
      // pose finale + respiration discrète
      pose = { ...pose, belly: Math.max(pose.belly, 0.12 + Math.sin(t * 1.4) * 0.1) };
    }
    applyPose(refs, pose, baseY, blink);
  });

  const desk = motion.view === "side" && Boolean(motion.desk);
  const target = motion.view === "side" && Boolean(motion.target);

  return (
    <group position={[0, -0.82, 0]}>
      <ClayLights />
      <group ref={rig} rotation={[0, yaw, 0]}>
        <ClayRig refs={refs} avatar={{ body, equipped }} />
        <ClayStage seated={!stand} desk={desk} equipped={equipped} />
        {/* cible visuelle des exercices de regard */}
        {target && (
          <mesh position={[0, 1.55, 1.15]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            <meshStandardMaterial color={CLAY.accent} roughness={0.8} />
          </mesh>
        )}
      </group>
    </group>
  );
}

export function ExerciseFigure3D({
  motion: motionId,
  size = 120,
  animate = false,
  className = "",
}: {
  motion: MotionId;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  const motion = MOTIONS[motionId] as Motion;
  const store = useMovaeMaybe();
  const avatar = store?.state.avatar ?? defaultAvatar();

  // Gros plans yeux/mains : la figure 2D reste plus claire.
  if (motion.view === "face" || motion.view === "hands") {
    return <ExerciseFigure motion={motionId} size={size} animate={animate} className={className} />;
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        overflow: "hidden",
        background: "radial-gradient(120% 100% at 50% 20%, var(--m-soft) 0%, var(--m-bg2) 100%)",
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.18, 3.5], fov: 30 }}
        dpr={[1, 1.75]}
        style={{ width: size, height: size, display: "block" }}
      >
        <ExerciseScene
          motionId={motionId}
          motion={motion}
          animate={animate}
          body={avatar.body}
          equipped={avatar.equipped}
        />
      </Canvas>
    </div>
  );
}

// Aperçu « portrait » pour le menu Personnage : pose de repos, respiration,
// rotation lente pour admirer les accessoires sous tous les angles.
export function CharacterStage({
  body,
  equipped,
  size = 280,
}: {
  body: "f" | "m";
  equipped: string[];
  size?: number;
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.12,
        overflow: "hidden",
        background: "radial-gradient(120% 100% at 50% 15%, var(--m-soft) 0%, var(--m-bg2) 100%)",
      }}
    >
      <Canvas
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0.18, 3.4], fov: 30 }}
        dpr={[1, 2]}
        style={{ width: size, height: size, display: "block" }}
      >
        <PortraitScene body={body} equipped={equipped} />
      </Canvas>
    </div>
  );
}

function PortraitScene({ body, equipped }: { body: "f" | "m"; equipped: string[] }) {
  const refs = useRigRefs();
  const rig = useRef<THREE.Group>(null);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const rest = useMemo(() => restPose(false), []);
  const baseY = pelvisBaseY(false);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    let blink = 1;
    if (!reduced.current) {
      const b = t % 3.1;
      blink = b < 0.12 ? 0.12 : 1;
      if (rig.current) rig.current.rotation.y = Math.sin(t * 0.3) * 0.5 - 0.1;
    }
    const pose = {
      ...rest,
      belly: 0.15 + Math.sin(t * 1.3) * 0.12,
      headBend: Math.sin(t * 0.5) * 2.5,
    };
    applyPose(refs, pose, baseY, blink);
  });

  return (
    <group position={[0, -0.82, 0]}>
      <ClayLights />
      <group ref={rig}>
        <ClayRig refs={refs} avatar={{ body, equipped }} />
        <ClayStage seated equipped={equipped} />
      </group>
    </group>
  );
}
