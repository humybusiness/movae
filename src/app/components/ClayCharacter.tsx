import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { disposeObject, poseHand, type AvatarConfig, type CharacterJoints } from "./clayParts";
import { buildCharacter } from "./skinnedAvatar";
import { animateGarden, buildGarden } from "./gardenParts";
import { MatSet } from "./clayParts";
import type { FrontPose, Motion, SidePose } from "../data/motions";

// ============================================================================
// Personnage Movaé v3 — cinématique.
//
// La géométrie (squelette ~90 articulations, doigts 3 phalanges, pupilles,
// jardin...) vit dans clayParts.ts / gardenParts.ts ; ici on convertit les
// poses de motions.ts vers le squelette et on les applique à 60 fps :
// flexion répartie sur les 3 segments de colonne, cou en 2 segments,
// clavicules pour le haussement d'épaules, doigts, regard, respiration.
// ============================================================================

export { CLAY } from "./clayParts";

export const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------- Pose 3D normalisée ----------

export interface Arm3D {
  fwd: number;
  abd: number;
  elbowFwd: number;
  elbowAbd: number;
}

export interface Leg3D {
  thigh: number;
  shin: number;
  foot: number;
  open: number;
}

export interface Pose3D {
  posX: number;
  posY: number;
  torsoTilt: number;
  torsoBend: number;
  torsoTwist: number;
  headTilt: number;
  headBend: number;
  headTwist: number;
  headOut: number;
  shrug: number;
  shoulderZ: number;
  armL: Arm3D;
  armR: Arm3D;
  legL: Leg3D;
  legR: Leg3D;
  belly: number;
  grow: number;
  gazeX: number;
  gazeY: number;
  fist: number;
}

const REST_ARM_SEATED: Arm3D = { fwd: 34, abd: 4, elbowFwd: 58, elbowAbd: 0 };
const REST_ARM_STAND: Arm3D = { fwd: 8, abd: 5, elbowFwd: 10, elbowAbd: 0 };
const REST_LEG_SEATED: Leg3D = { thigh: 0, shin: 0, foot: 0, open: 4 };
const REST_LEG_STAND: Leg3D = { thigh: -80, shin: 2, foot: 0, open: 2 };

export function restPose(stand: boolean): Pose3D {
  return {
    posX: 0,
    posY: 0,
    torsoTilt: 0,
    torsoBend: 0,
    torsoTwist: 0,
    headTilt: 0,
    headBend: 0,
    headTwist: 0,
    headOut: 0,
    shrug: 0,
    shoulderZ: 0,
    armL: stand ? REST_ARM_STAND : REST_ARM_SEATED,
    armR: stand ? REST_ARM_STAND : REST_ARM_SEATED,
    legL: stand ? REST_LEG_STAND : REST_LEG_SEATED,
    legR: stand ? REST_LEG_STAND : REST_LEG_SEATED,
    belly: 0,
    grow: 0,
    gazeX: 0,
    gazeY: 0,
    fist: 0,
  };
}

// ---------- Conversion motions.ts → Pose3D ----------
// Vue de profil : membre « proche » = côté gauche (montré à la caméra).

function sideArm(a: { sh: number; el: number } | null | undefined, fallback: Arm3D): Arm3D {
  if (a === null || a === undefined) return fallback;
  return { fwd: a.sh, abd: 5, elbowFwd: a.el, elbowAbd: 0 };
}

export function sideFrameTo3D(p: SidePose, stand: boolean): Pose3D {
  const base = restPose(stand);
  return {
    ...base,
    posY: -(p.pelvisY ?? 0) * 0.012,
    torsoTilt: p.torso ?? 0,
    headTilt: p.head ?? 0,
    headOut: p.headX ?? 0,
    shrug: Math.max(0, -(p.shoulderLift ?? 0)) / 6,
    shoulderZ: (p.shoulderShift ?? 0) * 0.012,
    armL: sideArm(p.armNear, base.armL),
    armR: sideArm(p.armFar, base.armR),
    legL: {
      thigh: p.thigh ?? base.legL.thigh,
      shin: p.shin ?? base.legL.shin,
      foot: p.foot ?? base.legL.foot,
      open: base.legL.open,
    },
    legR: {
      thigh: p.thighFar ?? base.legR.thigh,
      shin: p.shinFar ?? base.legR.shin,
      foot: p.footFar ?? base.legR.foot,
      open: base.legR.open,
    },
    belly: p.belly ?? 0,
    gazeY: p.gaze !== undefined ? lerp(-0.3, 0.25, p.gaze) : 0,
  };
}

function frontArm(a: { sh: number; el: number } | null | undefined, shrug: number): Arm3D {
  if (a === null || a === undefined) {
    return { ...REST_ARM_SEATED, fwd: REST_ARM_SEATED.fwd - shrug * 10 };
  }
  return { fwd: 6, abd: a.sh, elbowFwd: 0, elbowAbd: a.el };
}

export function frontFrameTo3D(p: FrontPose): Pose3D {
  const base = restPose(false);
  const shrug = p.shrug ?? 0;
  return {
    ...base,
    posX: (p.hipShift ?? 0) * 0.05,
    torsoBend: p.bend ?? 0,
    torsoTwist: (p.twist ?? 0) * 26,
    headTilt: (p.nod ?? 0) * 0.7,
    headBend: p.tilt ?? 0,
    headTwist: (p.turn ?? 0) * 38,
    shrug,
    armL: frontArm(p.armL, shrug),
    armR: frontArm(p.armR, shrug),
    legL: { ...base.legL, open: 4 + (p.knees ?? 0) * 22 },
    legR: { ...base.legR, open: 4 + (p.knees ?? 0) * 22 },
    grow: p.grow ?? 0,
    gazeX: (p.turn ?? 0) * 0.7,
  };
}

function lerpArm(a: Arm3D, b: Arm3D, t: number): Arm3D {
  return {
    fwd: lerp(a.fwd, b.fwd, t),
    abd: lerp(a.abd, b.abd, t),
    elbowFwd: lerp(a.elbowFwd, b.elbowFwd, t),
    elbowAbd: lerp(a.elbowAbd, b.elbowAbd, t),
  };
}

function lerpLeg(a: Leg3D, b: Leg3D, t: number): Leg3D {
  return {
    thigh: lerp(a.thigh, b.thigh, t),
    shin: lerp(a.shin, b.shin, t),
    foot: lerp(a.foot, b.foot, t),
    open: lerp(a.open, b.open, t),
  };
}

export function lerpPose(a: Pose3D, b: Pose3D, t: number): Pose3D {
  return {
    posX: lerp(a.posX, b.posX, t),
    posY: lerp(a.posY, b.posY, t),
    torsoTilt: lerp(a.torsoTilt, b.torsoTilt, t),
    torsoBend: lerp(a.torsoBend, b.torsoBend, t),
    torsoTwist: lerp(a.torsoTwist, b.torsoTwist, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    headBend: lerp(a.headBend, b.headBend, t),
    headTwist: lerp(a.headTwist, b.headTwist, t),
    headOut: lerp(a.headOut, b.headOut, t),
    shrug: lerp(a.shrug, b.shrug, t),
    shoulderZ: lerp(a.shoulderZ, b.shoulderZ, t),
    armL: lerpArm(a.armL, b.armL, t),
    armR: lerpArm(a.armR, b.armR, t),
    legL: lerpLeg(a.legL, b.legL, t),
    legR: lerpLeg(a.legR, b.legR, t),
    belly: lerp(a.belly, b.belly, t),
    grow: lerp(a.grow, b.grow, t),
    gazeX: lerp(a.gazeX, b.gazeX, t),
    gazeY: lerp(a.gazeY, b.gazeY, t),
    fist: lerp(a.fist, b.fist, t),
  };
}

export function motionFrames3D(motion: Motion): Pose3D[] {
  if (motion.view === "side") {
    const stand = Boolean(motion.stand);
    return motion.frames.map((f) => sideFrameTo3D(f, stand));
  }
  if (motion.view === "front") {
    return motion.frames.map(frontFrameTo3D);
  }
  return [restPose(false)];
}

// ---------- Refs du rig ----------

export interface RigRefs {
  joints: React.RefObject<CharacterJoints | null>;
}

export function useRigRefs(): RigRefs {
  const joints = useRef<CharacterJoints | null>(null);
  return useMemo(() => ({ joints }), [joints]);
}

// ---------- Application d'une pose (impératif, 60 fps) ----------

function applyArm(
  sh: THREE.Object3D,
  el: THREE.Object3D,
  clav: THREE.Object3D,
  arm: Arm3D,
  side: 1 | -1,
  shrug: number,
  shoulderZ: number,
) {
  sh.rotation.set(rad(-arm.fwd), 0, rad(arm.abd) * side);
  el.rotation.set(rad(-arm.elbowFwd), 0, rad(arm.elbowAbd) * side);
  clav.position.y = 0.24 + shrug * 0.05;
  clav.position.z = shoulderZ;
  clav.rotation.z = shrug * 0.12 * -side;
}

function applyLeg(
  hip: THREE.Object3D,
  knee: THREE.Object3D,
  ank: THREE.Object3D,
  toe: THREE.Object3D,
  leg: Leg3D,
  side: 1 | -1,
) {
  hip.rotation.set(-rad(leg.thigh + 90), 0, rad(leg.open) * side);
  knee.rotation.set(rad(90 + leg.thigh - leg.shin), 0, 0);
  ank.rotation.set(rad(leg.shin) - rad(leg.foot), 0, 0);
  // les orteils accompagnent légèrement la pointe de pied
  toe.rotation.x = Math.max(0, -rad(leg.foot)) * 0.4;
}

// blink : 1 = yeux ouverts, 0 = fermés.
export function applyPose(refs: RigRefs, pose: Pose3D, pelvisBaseY: number, blink = 1) {
  const j = refs.joints.current;
  if (!j) return;

  j.pelvis.position.set(pose.posX, pelvisBaseY + pose.posY + pose.grow * 0.05, 0);

  // colonne : flexion/torsion répartie sur 3 segments (souplesse d'argile)
  const tilt = rad(pose.torsoTilt);
  const twist = rad(pose.torsoTwist);
  const bend = rad(-pose.torsoBend);
  j.spine1.rotation.set(tilt * 0.45, twist * 0.3, bend * 0.4);
  j.spine2.rotation.set(tilt * 0.35, twist * 0.35, bend * 0.35);
  j.chest.rotation.set(tilt * 0.2, twist * 0.35, bend * 0.25);
  j.spine1.scale.setY(1 + pose.grow * 0.04);

  // cou en 2 segments + tête
  const hTilt = rad(pose.headTilt);
  const hTwist = rad(pose.headTwist);
  const hBend = rad(-pose.headBend);
  j.neck1.rotation.set(hTilt * 0.25, hTwist * 0.25, hBend * 0.2);
  j.neck2.rotation.set(hTilt * 0.25, hTwist * 0.25, hBend * 0.25);
  j.head.rotation.set(hTilt * 0.5, hTwist * 0.5, hBend * 0.55);
  j.neck1.position.z = pose.headOut * 0.005;
  j.head.position.z = pose.headOut * 0.003;

  // paupières (hautes + basses)
  const lidRot = lerp(-0.25, -1.35, Math.max(0, Math.min(1, blink)));
  j.lidL.rotation.x = lidRot;
  j.lidR.rotation.x = lidRot;
  j.lidLowL.rotation.x = lerp(-0.9, -1.45, Math.max(0, Math.min(1, blink)));
  j.lidLowR.rotation.x = lerp(-0.9, -1.45, Math.max(0, Math.min(1, blink)));

  // regard
  j.pupilL.position.set(pose.gazeX * 0.02, pose.gazeY * 0.017, 0);
  j.pupilR.position.set(pose.gazeX * 0.02, pose.gazeY * 0.017, 0);
  // sourcils légèrement expressifs sur l'effort (bras hauts)
  const effort = Math.max(pose.armL.fwd, pose.armR.fwd) > 120 ? 0.06 : 0;
  j.browL.position.y = 0.108 + effort;
  j.browR.position.y = 0.108 + effort;

  // respiration
  const bs = 1 + pose.belly * 0.3;
  j.belly.scale.set(bs, bs, bs);
  const cs = 1 + pose.belly * 0.12;
  j.chestBreath.scale.set(cs, cs, cs);

  applyArm(j.shL, j.elL, j.clavL, pose.armL, -1, pose.shrug, pose.shoulderZ);
  applyArm(j.shR, j.elR, j.clavR, pose.armR, 1, pose.shrug, pose.shoulderZ);
  applyLeg(j.hipL, j.kneeL, j.ankL, j.toeL, pose.legL, -1);
  applyLeg(j.hipR, j.kneeR, j.ankR, j.toeR, pose.legR, 1);
  poseHand(j.handL, pose.fist);
  poseHand(j.handR, pose.fist);
}

// Balancement des mèches de cheveux (queue de cheval...) — appeler par frame.
export function swayHair(refs: RigRefs, t: number): void {
  const chain = refs.joints.current?.hairChain;
  if (!chain || chain.length === 0) return;
  for (let i = 0; i < chain.length; i++) {
    const seg = chain[i];
    const base = i === 0 ? 0.55 : 0;
    seg.rotation.x = base + Math.sin(t * 1.6 + i * 0.9) * 0.06;
    seg.rotation.z = Math.sin(t * 1.1 + i * 1.3) * 0.08;
  }
}

// ---------- Le personnage (React, via les fabriques) ----------

export function ClayRig({ refs, config }: { refs: RigRefs; config: AvatarConfig }) {
  const key = `${config.hair}|${Object.values(config.colors).join(",")}|${[...config.equipped].sort().join(",")}`;
  const built = useMemo(
    () => buildCharacter(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  // Branche les articulations avant le premier rendu de frame.
  refs.joints.current = built.joints;

  useEffect(() => {
    refs.joints.current = built.joints;
    return () => {
      if (refs.joints.current === built.joints) refs.joints.current = null;
      disposeObject(built.root);
      built.materials.dispose();
    };
  }, [built, refs]);

  return <primitive object={built.root} />;
}

// ---------- Le jardin (île + objets/compagnons installés, animés) ----------

export function GardenStage({
  equipped,
  seated,
  desk,
}: {
  equipped: string[];
  seated?: boolean;
  desk?: boolean;
}) {
  const key = `${[...equipped].sort().join(",")}|${seated ? 1 : 0}|${desk ? 1 : 0}`;
  const built = useMemo(() => {
    const ms = new MatSet();
    const root = buildGarden(equipped, ms, { seated, desk });
    return { root, ms };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    return () => {
      disposeObject(built.root);
      built.ms.dispose();
    };
  }, [built]);

  useFrame((state) => {
    animateGarden(built.root, state.clock.getElapsedTime());
  });

  return <primitive object={built.root} />;
}

export function ClayLights() {
  return (
    <group>
      <ambientLight intensity={0.85} color="#FFF6E8" />
      <directionalLight position={[-2.2, 3.4, 2.6]} intensity={1.25} color="#FFF3E0" />
      <directionalLight position={[2.4, 1.2, -1.6]} intensity={0.35} color="#DCEAE0" />
    </group>
  );
}

// Hauteur du bassin selon la position (le sol est à y = 0).
export function pelvisBaseY(stand: boolean): number {
  return stand ? 0.76 : 0.52;
}
