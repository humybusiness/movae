import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { buildCharacter, disposeObject, type CharacterJoints } from "./clayParts";
import type { AvatarState } from "../types";
import type { FrontPose, Motion, SidePose } from "../data/motions";

// ============================================================================
// Personnage Movaé en argile — rig 3D partagé.
//
// La géométrie détaillée (doigts, chaussures, pupilles, mèches...) vit dans
// clayParts.ts ; ici on garde la cinématique : conversion des poses de
// motions.ts vers le squelette 3D et application impérative à 60 fps.
// Un seul personnage sert les 100 exercices et porte les accessoires gagnés.
// ============================================================================

export { CLAY } from "./clayParts";

export const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------- Pose 3D normalisée ----------

export interface Arm3D {
  fwd: number; // élévation sagittale (0 = bras le long, + = vers l'avant/haut)
  abd: number; // abduction frontale (+ = s'écarte du corps)
  elbowFwd: number; // flexion du coude dans le plan sagittal
  elbowAbd: number; // flexion du coude dans le plan frontal
}

export interface Leg3D {
  thigh: number; // depuis l'horizontale, + = genou levé (assis : 0)
  shin: number; // tibia depuis la verticale, + = pied vers l'avant
  foot: number; // + = pointe levée
  open: number; // ouverture latérale du genou
}

export interface Pose3D {
  posX: number;
  posY: number;
  torsoTilt: number; // + = penché en avant
  torsoBend: number; // + = incliné vers sa gauche (écran droite en vue de face)
  torsoTwist: number;
  headTilt: number;
  headBend: number;
  headTwist: number;
  headOut: number; // translation avant/arrière (rétraction du menton)
  shrug: number; // 0..1 élévation des épaules
  shoulderZ: number; // avancée/recul des épaules (roulements)
  armL: Arm3D;
  armR: Arm3D;
  legL: Leg3D;
  legR: Leg3D;
  belly: number; // 0..1 respiration ventrale
  grow: number; // 0..1 auto-grandissement
  gazeX: number; // -1..1 regard (pupilles)
  gazeY: number; // -1..1
  fist: number; // 0..1 fermeture des mains (0 = détendue)
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

// ---------- Conversion des poses motions.ts → Pose3D ----------
// Vue de profil : le personnage montre son côté gauche à la caméra,
// donc membre « proche » (near) = côté gauche, « éloigné » (far) = droit.

function sideArm(a: { sh: number; el: number } | null | undefined, fallback: Arm3D): Arm3D {
  if (a === null || a === undefined) return fallback;
  return { fwd: a.sh, abd: 5, elbowFwd: a.el, elbowAbd: 0 };
}

export function sideFrameTo3D(p: SidePose, stand: boolean): Pose3D {
  const base = restPose(stand);
  const legL: Leg3D = {
    thigh: p.thigh ?? base.legL.thigh,
    shin: p.shin ?? base.legL.shin,
    foot: p.foot ?? base.legL.foot,
    open: base.legL.open,
  };
  const legR: Leg3D = {
    thigh: p.thighFar ?? base.legR.thigh,
    shin: p.shinFar ?? base.legR.shin,
    foot: p.footFar ?? base.legR.foot,
    open: base.legR.open,
  };
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
    legL,
    legR,
    belly: p.belly ?? 0,
    // regard : suit la cible (exercices d'yeux au loin)
    gazeY: p.gaze !== undefined ? lerp(-0.3, 0.25, p.gaze) : 0,
  };
}

// Vue de face : dans motions.ts, armL est dessiné à gauche de l'écran, soit le
// bras situé côté -X monde (caméra par défaut). sh y mesure l'écartement.
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

const SHOULDER_Y = 0.5;

function applyArm(
  sh: THREE.Group,
  el: THREE.Group,
  arm: Arm3D,
  side: 1 | -1,
  shrug: number,
  shoulderZ: number,
) {
  sh.rotation.set(rad(-arm.fwd), 0, rad(arm.abd) * side);
  sh.position.set(0.27 * side, SHOULDER_Y + shrug * 0.05, shoulderZ);
  el.rotation.set(rad(-arm.elbowFwd), 0, rad(arm.elbowAbd) * side);
}

function applyLeg(hip: THREE.Group, knee: THREE.Group, ank: THREE.Group, leg: Leg3D, side: 1 | -1) {
  hip.rotation.set(-rad(leg.thigh + 90), 0, rad(leg.open) * side);
  knee.rotation.set(rad(90 + leg.thigh - leg.shin), 0, 0);
  ank.rotation.set(rad(leg.shin) - rad(leg.foot), 0, 0);
}

// Doigts : flexion douce (repos ≈ 0.12 rad, poing ≈ 1.35 rad).
function applyHand(hand: CharacterJoints["handL"], fist: number) {
  const base = 0.12 + fist * 1.25;
  const tip = 0.22 + fist * 1.15;
  for (const f of hand.fingers) f.rotation.x = base;
  for (const t of hand.tips) t.rotation.x = tip;
}

// blink : 1 = yeux ouverts, 0 = fermés (paupières descendues).
export function applyPose(refs: RigRefs, pose: Pose3D, pelvisBaseY: number, blink = 1) {
  const j = refs.joints.current;
  if (!j) return;
  j.pelvis.position.set(pose.posX, pelvisBaseY + pose.posY + pose.grow * 0.05, 0);
  j.torso.rotation.set(rad(pose.torsoTilt), rad(pose.torsoTwist), rad(-pose.torsoBend));
  j.torso.scale.setY(1 + pose.grow * 0.04);
  j.head.rotation.set(rad(pose.headTilt), rad(pose.headTwist), rad(-pose.headBend));
  j.head.position.set(0, 0.72 - pose.shrug * 0.03, pose.headOut * 0.006);
  // paupières : ouvertes = relevées (-1.35), fermées = baissées (-0.25)
  const lidRot = lerp(-0.25, -1.35, Math.max(0, Math.min(1, blink)));
  j.lidL.rotation.x = lidRot;
  j.lidR.rotation.x = lidRot;
  // regard
  j.pupilL.position.set(pose.gazeX * 0.02, pose.gazeY * 0.017, 0);
  j.pupilR.position.set(pose.gazeX * 0.02, pose.gazeY * 0.017, 0);
  const s = 1 + pose.belly * 0.3;
  j.belly.scale.set(s, s, s);
  applyArm(j.shL, j.elL, pose.armL, -1, pose.shrug, pose.shoulderZ);
  applyArm(j.shR, j.elR, pose.armR, 1, pose.shrug, pose.shoulderZ);
  applyLeg(j.hipL, j.kneeL, j.ankL, pose.legL, -1);
  applyLeg(j.hipR, j.kneeR, j.ankR, pose.legR, 1);
  applyHand(j.handL, pose.fist);
  applyHand(j.handR, pose.fist);
}

// ---------- Le personnage (React, via les fabriques) ----------

export function ClayRig({
  refs,
  avatar,
}: {
  refs: RigRefs;
  avatar: Pick<AvatarState, "body" | "equipped">;
}) {
  const key = `${avatar.body}|${[...avatar.equipped].sort().join(",")}`;
  const built = useMemo(
    () => buildCharacter(avatar.body, avatar.equipped),
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
    };
  }, [built, refs]);

  return <primitive object={built.root} />;
}

// ---------- Décor nature / calme ----------

function StageMat({ color }: { color: string }) {
  return <meshStandardMaterial color={color} roughness={0.94} metalness={0} />;
}

const STAGE = {
  pedestal: "#E9E0CE",
  stool: "#D9C6A5",
  leaf: "#5F8B6D",
  leafDark: "#4F755D",
  pot: "#C08552",
  cream: "#F7F2E6",
} as const;

export function ClayStage({
  seated,
  desk,
  equipped,
}: {
  seated: boolean;
  desk?: boolean;
  equipped: string[];
}) {
  return (
    <group>
      {/* socle d'argile */}
      <mesh position={[0, -0.045, 0]} receiveShadow>
        <cylinderGeometry args={[0.95, 1.02, 0.09, 48]} />
        <StageMat color={STAGE.pedestal} />
      </mesh>
      {/* galets */}
      <mesh position={[-0.72, 0.03, 0.4]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <StageMat color="#D8CDB6" />
      </mesh>
      <mesh position={[-0.6, 0.02, 0.52]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <StageMat color="#C9BFA8" />
      </mesh>
      {/* brins d'herbe */}
      <group position={[0.78, 0, 0.3]}>
        <mesh position={[0, 0.09, 0]} rotation={[0, 0, 0.25]}>
          <coneGeometry args={[0.02, 0.2, 8]} />
          <StageMat color={STAGE.leaf} />
        </mesh>
        <mesh position={[0.05, 0.07, 0.02]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.016, 0.15, 8]} />
          <StageMat color={STAGE.leafDark} />
        </mesh>
      </group>
      {/* tabouret d'argile quand assis */}
      {seated && (
        <group>
          <mesh position={[0, 0.42, -0.05]} castShadow receiveShadow>
            <cylinderGeometry args={[0.26, 0.23, 0.09, 24]} />
            <StageMat color={STAGE.stool} />
          </mesh>
          <mesh position={[0, 0.2, -0.05]}>
            <cylinderGeometry args={[0.07, 0.1, 0.38, 14]} />
            <StageMat color={STAGE.stool} />
          </mesh>
        </group>
      )}
      {/* bureau esquissé (exercices « au bureau ») */}
      {desk && (
        <group position={[0.62, 0, 0.15]}>
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[0.5, 0.05, 0.42]} />
            <StageMat color={STAGE.stool} />
          </mesh>
          <mesh position={[0.2, 0.3, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 0.6, 10]} />
            <StageMat color={STAGE.stool} />
          </mesh>
        </group>
      )}
      {/* accessoires de décor */}
      {equipped.includes("plante-pot") && (
        <group position={[-0.78, 0, -0.1]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.08, 0.18, 16]} />
            <StageMat color={STAGE.pot} />
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.09, 16, 12]} />
            <StageMat color={STAGE.leaf} />
          </mesh>
          <mesh position={[-0.06, 0.33, 0.02]}>
            <sphereGeometry args={[0.06, 16, 12]} />
            <StageMat color={STAGE.leafDark} />
          </mesh>
          <mesh position={[0.07, 0.32, -0.02]}>
            <sphereGeometry args={[0.05, 16, 12]} />
            <StageMat color={STAGE.leaf} />
          </mesh>
        </group>
      )}
      {equipped.includes("tasse-tisane") && (
        <group position={[0.68, 0, -0.35]}>
          <mesh position={[0, 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.055, 0.12, 16]} />
            <StageMat color={STAGE.cream} />
          </mesh>
          <mesh position={[0.085, 0.07, 0]}>
            <torusGeometry args={[0.03, 0.012, 8, 14]} />
            <StageMat color={STAGE.cream} />
          </mesh>
          {/* vapeur */}
          <mesh position={[0, 0.17, 0]} scale={[1, 1.6, 1]}>
            <sphereGeometry args={[0.018, 10, 8]} />
            <meshStandardMaterial color="#FFFFFF" roughness={1} transparent opacity={0.35} />
          </mesh>
        </group>
      )}
    </group>
  );
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
