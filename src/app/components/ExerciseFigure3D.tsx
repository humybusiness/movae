import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import {
  applyPose,
  ClayLights,
  ClayRig,
  GardenStage,
  easeInOut,
  lerpPose,
  motionFrames3D,
  pelvisBaseY,
  rad,
  restPose,
  swayHair,
  useRigRefs,
  CLAY,
} from "./ClayCharacter";
import { buildLooseHand, disposeObject, poseHand, type AvatarConfig } from "./clayParts";
import { gardenItemIds } from "./gardenParts";
import { defaultAvatar, useMovaeMaybe } from "../state/store";
import { MOTIONS, type FaceKind, type HandsKind, type Motion, type MotionId } from "../data/motions";
import type { AvatarState } from "../types";

// Figure d'exercice 3D : le personnage argile rejoue le mouvement de
// l'exercice, filmé sous son meilleur angle — profil pour les mouvements
// sagittaux, face pour les latéraux/rotations, gros plan visage pour les
// exercices d'yeux (pupilles animées), gros plan main pour les poignets.

export function avatarConfig(avatar: AvatarState): AvatarConfig {
  return { hair: avatar.hair, colors: avatar.colors, equipped: avatar.equipped };
}

// ---------- Cadrage par vue ----------

const VIEW_YAW: Record<"side" | "front", number> = {
  side: rad(68),
  front: rad(-6),
};

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

// ---------- Scène corps entier (vues side / front) ----------

function ExerciseScene({
  motionId,
  motion,
  animate,
  config,
}: {
  motionId: MotionId;
  motion: Motion;
  animate: boolean;
  config: AvatarConfig;
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

    let sway = 0;
    let blink = 1;
    if (!reduced.current) {
      sway = Math.sin(t * 0.4) * 0.05;
      const b = (t + blinkSeed.current) % 3.4;
      blink = b < 0.12 ? 0.1 : 1;
    }
    if (rig.current) rig.current.rotation.y = yaw + sway;

    let pose = frames[frames.length - 1];
    if (animate && !reduced.current && frames.length > 1) {
      const cycle = motion.hold ? 4.2 : 2.8;
      const phase = (t % cycle) / cycle;
      let k = phase * 2;
      k = k < 1 ? k : 2 - k;
      if (motion.hold) k = Math.min(1, k * 1.6);
      const eased = easeInOut(k);
      const seg = eased * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(seg));
      pose = lerpPose(frames[i], frames[i + 1], seg - i);
    } else if (!animate && !reduced.current) {
      pose = { ...pose, belly: Math.max(pose.belly, 0.12 + Math.sin(t * 1.4) * 0.1) };
    }
    applyPose(refs, pose, baseY, blink);
    if (!reduced.current) swayHair(refs, t);
  });

  const desk = motion.view === "side" && Boolean(motion.desk);
  const target = motion.view === "side" && Boolean(motion.target);
  // Dans le lecteur d'exercice, on épure : pas d'objets de jardin, seulement
  // le tabouret/bureau — le personnage reste le sujet.
  const stageEquipped = useMemo(() => config.equipped.filter((id) => gardenItemIds([id]).length === 0), [config.equipped]);

  return (
    <group position={[0, -0.82, 0]}>
      <ClayLights />
      <group ref={rig} rotation={[0, yaw, 0]}>
        <ClayRig refs={refs} config={config} />
        <GardenStage equipped={stageEquipped} seated={!stand} desk={desk} />
        {target && (
          <mesh position={[0, 1.55, 1.15]}>
            <sphereGeometry args={[0.05, 12, 10]} />
            <meshStandardMaterial color={CLAY.accent} roughness={0.8} />
          </mesh>
        )}
      </group>
    </group>
  );
}

// ---------- Scène visage (exercices d'yeux : pupilles animées) ----------

function FaceScene({
  kind,
  animate,
  config,
}: {
  kind: FaceKind;
  animate: boolean;
  config: AvatarConfig;
}) {
  const refs = useRigRefs();
  const rest = useMemo(() => restPose(false), []);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const baseY = pelvisBaseY(false);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const run = animate && !reduced.current;
    const a = t * ((2 * Math.PI) / 4);

    let gazeX = 0;
    let gazeY = 0;
    let blink = 1;
    let armL = rest.armL;
    let armR = rest.armR;

    if (kind === "eye-circles" && run) {
      gazeX = Math.cos(a);
      gazeY = Math.sin(a);
    } else if (kind === "eye-eight" && run) {
      gazeX = Math.sin(a);
      gazeY = Math.sin(a * 2) * 0.6;
    } else if (kind === "eye-sweep" && run) {
      gazeX = Math.sin(a);
    } else if (kind === "blink") {
      const b = t % 1.4;
      blink = run ? (b < 0.35 ? 0 : 1) : 1;
    } else if (kind === "rest-closed") {
      blink = 0;
    } else if (kind === "palming") {
      blink = 0;
      armL = { fwd: 142, abd: 10, elbowFwd: 128, elbowAbd: 6 };
      armR = { fwd: 142, abd: 10, elbowFwd: 128, elbowAbd: 6 };
    }

    const pose = {
      ...rest,
      armL,
      armR,
      gazeX,
      gazeY,
      belly: 0.15 + (reduced.current ? 0 : Math.sin(t * 1.2) * 0.12),
    };
    if (blink === 1 && !reduced.current) {
      const b = (t + 1.7) % 4.1;
      if (b < 0.12) blink = 0.1;
    }
    applyPose(refs, pose, baseY, blink);
    if (!reduced.current) swayHair(refs, t);
  });

  return (
    <group position={[0, -1.38, 0]}>
      <ClayLights />
      <group rotation={[0, rad(-4), 0]}>
        <ClayRig refs={refs} config={config} />
      </group>
    </group>
  );
}

// ---------- Scène mains (poignets/doigts : vraie main à doigts) ----------

function HandsScene({ kind, animate, skin }: { kind: HandsKind; animate: boolean; skin: string }) {
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const two = kind === "prayer" || kind === "prayer-inv";
  const massage = kind === "forearm-massage";

  const built = useMemo(() => {
    const main = buildLooseHand(1, skin);
    const other = two || massage ? buildLooseHand(-1, skin) : null;
    return { main, other };
  }, [two, massage, skin]);

  useEffect(() => {
    return () => {
      disposeObject(built.main.root);
      built.main.ms.dispose();
      if (built.other) {
        disposeObject(built.other.root);
        built.other.ms.dispose();
      }
    };
  }, [built]);

  const wristHolder = useRef<THREE.Group>(null);
  const otherHolder = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const run = animate && !reduced.current;
    const cycle = kind === "shake" ? 1.2 : 3.6;
    const phase = run ? (t % cycle) / cycle : 0.85;
    let k = phase * 2;
    k = k < 1 ? k : 2 - k;
    const eased = easeInOut(k);
    const hand = built.main.joints;
    const holder = wristHolder.current;
    if (!holder) return;

    holder.rotation.set(Math.PI, 0, 0);
    holder.position.set(0, -0.05, 0);
    poseHand(hand, 0.06);

    switch (kind) {
      case "wrist-flex":
        hand.wrist.rotation.set(0.15 + eased * 0.85, 0, 0);
        break;
      case "wrist-ext":
        hand.wrist.rotation.set(-(0.15 + eased * 0.85), 0, 0);
        break;
      case "wrist-circles": {
        const a = (run ? t : 1) * 2.2;
        hand.wrist.rotation.set(Math.sin(a) * 0.7, 0, Math.cos(a) * 0.45);
        break;
      }
      case "shake":
        hand.wrist.rotation.set(0, 0, run ? Math.sin(t * 22) * 0.28 : 0.2);
        poseHand(hand, 0.03);
        break;
      case "flip":
        hand.wrist.rotation.set(0, eased * Math.PI, 0);
        break;
      case "fist":
        hand.wrist.rotation.set(0, 0, 0);
        poseHand(hand, eased);
        break;
      case "finger-fan":
        hand.wrist.rotation.set(0, 0, 0);
        poseHand(hand, 0.02, eased);
        hand.thumb.p1.rotation.z = 0.75 + eased * 0.35;
        break;
      case "thumb":
        hand.wrist.rotation.set(0, 0, 0);
        hand.thumb.p1.rotation.x = 0.45 + Math.sin((run ? t : 1) * 3) * 0.4;
        break;
      case "prayer":
      case "prayer-inv": {
        const dir = kind === "prayer" ? 1 : -1;
        holder.rotation.set(Math.PI, 0, 0.12);
        holder.position.set(0.09, -0.02 + dir * eased * 0.09, 0);
        poseHand(hand, 0.02);
        if (otherHolder.current && built.other) {
          otherHolder.current.rotation.set(Math.PI, 0, -0.12);
          otherHolder.current.position.set(-0.09, -0.02 + dir * eased * 0.09, 0);
          poseHand(built.other.joints, 0.02);
        }
        break;
      }
      case "forearm-massage": {
        holder.rotation.set(Math.PI, 0, Math.PI / 2 - 0.25);
        holder.position.set(0.28, -0.12, 0);
        if (otherHolder.current && built.other) {
          otherHolder.current.rotation.set(-1.2, 0, 0);
          otherHolder.current.position.set(0.05 - eased * 0.3, 0.02, 0.06);
          poseHand(built.other.joints, 0.35);
        }
        break;
      }
    }
  });

  return (
    <group>
      <ClayLights />
      <group scale={2.6} position={[0, -0.12, 0]}>
        {/* avant-bras */}
        <mesh position={[0, -0.28, 0]} castShadow>
          <capsuleGeometry args={[0.055, 0.3, 8, 20]} />
          <meshStandardMaterial color={skin} roughness={0.94} metalness={0} />
        </mesh>
        <mesh position={[0, -0.42, 0]}>
          <torusGeometry args={[0.062, 0.018, 10, 22]} />
          <meshStandardMaterial color={CLAY.accent} roughness={0.94} metalness={0} />
        </mesh>
        <group ref={wristHolder}>
          <primitive object={built.main.root} />
        </group>
        {built.other && (
          <group ref={otherHolder}>
            <primitive object={built.other.root} />
          </group>
        )}
      </group>
    </group>
  );
}

// ---------- Composant principal ----------

const VIEW_CAMERA: Record<Motion["view"], { pos: [number, number, number]; fov: number }> = {
  side: { pos: [0, 0.18, 3.5], fov: 30 },
  front: { pos: [0, 0.18, 3.5], fov: 30 },
  face: { pos: [0, 0.06, 1.5], fov: 24 },
  hands: { pos: [0, 0, 1.7], fov: 30 },
};

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
  const config = avatarConfig(store?.state.avatar ?? defaultAvatar());
  const cam = VIEW_CAMERA[motion.view];

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
        camera={{ position: cam.pos, fov: cam.fov }}
        dpr={[1, 1.75]}
        style={{ width: size, height: size, display: "block" }}
      >
        {motion.view === "face" ? (
          <FaceScene kind={motion.kind} animate={animate} config={config} />
        ) : motion.view === "hands" ? (
          <HandsScene kind={motion.kind} animate={animate} skin={config.colors.skin} />
        ) : (
          <ExerciseScene motionId={motionId} motion={motion} animate={animate} config={config} />
        )}
      </Canvas>
    </div>
  );
}

// Aperçu « portrait » pour le menu Personnage : pose de repos, respiration,
// rotation lente — la caméra recule quand le jardin grandit.
export function CharacterStage({
  config,
  size = 280,
}: {
  config: AvatarConfig;
  size?: number;
}) {
  const gardenCount = gardenItemIds(config.equipped).length;
  const camZ = gardenCount >= 3 ? 4.9 : gardenCount >= 1 ? 4.1 : 3.4;

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
        camera={{ position: [0, 0.35, camZ], fov: 30 }}
        dpr={[1, 2]}
        style={{ width: size, height: size, display: "block" }}
      >
        <PortraitScene config={config} />
      </Canvas>
    </div>
  );
}

function PortraitScene({ config }: { config: AvatarConfig }) {
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
      blink = b < 0.12 ? 0.1 : 1;
      if (rig.current) rig.current.rotation.y = Math.sin(t * 0.3) * 0.5 - 0.1;
    }
    const pose = {
      ...rest,
      belly: 0.15 + Math.sin(t * 1.3) * 0.12,
      headBend: Math.sin(t * 0.5) * 2.5,
      gazeX: Math.sin(t * 0.35) * 0.25,
    };
    applyPose(refs, pose, baseY, blink);
    if (!reduced.current) swayHair(refs, t);
  });

  return (
    <group position={[0, -0.82, 0]}>
      <ClayLights />
      <group ref={rig}>
        <ClayRig refs={refs} config={config} />
        <GardenStage equipped={config.equipped} seated />
      </group>
    </group>
  );
}
