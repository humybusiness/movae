import { useRef } from "react";
import * as THREE from "three";
import type { AvatarState } from "../types";
import type { FrontPose, Motion, SidePose } from "../data/motions";

// ============================================================================
// Personnage Movaé en argile — rig 3D partagé.
//
// DA « pâte à modeler / nature calme » : formes rondes, matériaux mats très
// rugueux, palette sauge/crème/terracotta, socle d'argile, galets, verdure.
// Le rig est piloté de façon impérative (refs + applyPose à 60 fps) à partir
// des poses déjà décrites dans motions.ts : un seul personnage sert les
// 100 exercices, et il porte les accessoires gagnés avec l'argile.
// ============================================================================

export const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// ---------- Palette argile ----------

export const CLAY = {
  top: "#8FAE97", // haut sauge
  topDark: "#7FA68A",
  trousers: "#6F665C", // pantalon argile brune
  skin: "#F0DCC3",
  hair: "#4A3F35",
  blush: "#DFA184",
  accent: "#C4795A", // terracotta
  pedestal: "#E9E0CE", // sable
  stool: "#D9C6A5",
  leaf: "#5F8B6D",
  leafDark: "#4F755D",
  pot: "#C08552",
  dark: "#3A342C",
  cream: "#F7F2E6",
} as const;

function clayMat(color: string) {
  return <meshStandardMaterial color={color} roughness={0.95} metalness={0} />;
}

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
  };
}

// ---------- Conversion des poses motions.ts → Pose3D ----------
// Vue de profil : le personnage montre son côté gauche à la caméra,
// donc membre « proche » (near) = côté gauche, « éloigné » (far) = droit.

function sideArm(a: { sh: number; el: number } | null | undefined, fallback: Arm3D): Arm3D {
  if (a === null) return fallback;
  if (a === undefined) return fallback;
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

type GRef = React.RefObject<THREE.Group | null>;

export interface RigRefs {
  pelvis: GRef;
  torso: GRef;
  chest: GRef;
  belly: GRef;
  head: GRef;
  eyeL: GRef;
  eyeR: GRef;
  shL: GRef;
  elL: GRef;
  shR: GRef;
  elR: GRef;
  hipL: GRef;
  kneeL: GRef;
  ankL: GRef;
  hipR: GRef;
  kneeR: GRef;
  ankR: GRef;
}

export function useRigRefs(): RigRefs {
  return {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pelvis: useRef(null),
    torso: useRef(null),
    chest: useRef(null),
    belly: useRef(null),
    head: useRef(null),
    eyeL: useRef(null),
    eyeR: useRef(null),
    shL: useRef(null),
    elL: useRef(null),
    shR: useRef(null),
    elR: useRef(null),
    hipL: useRef(null),
    kneeL: useRef(null),
    ankL: useRef(null),
    hipR: useRef(null),
    kneeR: useRef(null),
    ankR: useRef(null),
  };
}

// ---------- Application d'une pose (impératif, 60 fps) ----------

const SHOULDER_Y = 0.5;

function applyArm(sh: GRef, el: GRef, arm: Arm3D, side: 1 | -1, shrug: number, shoulderZ: number) {
  if (sh.current) {
    sh.current.rotation.set(rad(-arm.fwd), 0, rad(arm.abd) * side);
    sh.current.position.set(0.27 * side, SHOULDER_Y + shrug * 0.05, shoulderZ);
  }
  el.current?.rotation.set(rad(-arm.elbowFwd), 0, rad(arm.elbowAbd) * side);
}

function applyLeg(hip: GRef, knee: GRef, ank: GRef, leg: Leg3D, side: 1 | -1) {
  hip.current?.rotation.set(-rad(leg.thigh + 90), 0, rad(leg.open) * side);
  knee.current?.rotation.set(rad(90 + leg.thigh - leg.shin), 0, 0);
  ank.current?.rotation.set(rad(leg.shin) - rad(leg.foot), 0, 0);
}

export function applyPose(refs: RigRefs, pose: Pose3D, pelvisBaseY: number, blink = 1) {
  refs.pelvis.current?.position.set(pose.posX, pelvisBaseY + pose.posY + pose.grow * 0.05, 0);
  if (refs.torso.current) {
    refs.torso.current.rotation.set(rad(pose.torsoTilt), rad(pose.torsoTwist), rad(-pose.torsoBend));
    refs.torso.current.scale.setY(1 + pose.grow * 0.04);
  }
  if (refs.head.current) {
    refs.head.current.rotation.set(rad(pose.headTilt), rad(pose.headTwist), rad(-pose.headBend));
    refs.head.current.position.set(0, 0.72 - pose.shrug * 0.03, pose.headOut * 0.006);
  }
  refs.eyeL.current?.scale.setY(blink);
  refs.eyeR.current?.scale.setY(blink);
  if (refs.belly.current) {
    const s = 1 + pose.belly * 0.3;
    refs.belly.current.scale.set(s, s, s);
  }
  applyArm(refs.shL, refs.elL, pose.armL, -1, pose.shrug, pose.shoulderZ);
  applyArm(refs.shR, refs.elR, pose.armR, 1, pose.shrug, pose.shoulderZ);
  applyLeg(refs.hipL, refs.kneeL, refs.ankL, pose.legL, -1);
  applyLeg(refs.hipR, refs.kneeR, refs.ankR, pose.legR, 1);
}

// ---------- Accessoires 3D ----------

function AccessoryHead({ id }: { id: string }) {
  if (id === "bob-sable") {
    return (
      <group position={[0, 0.16, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.17, 0.2, 0.12, 18]} />
          {clayMat(CLAY.pedestal)}
        </mesh>
        <mesh position={[0, -0.05, 0]}>
          <cylinderGeometry args={[0.3, 0.31, 0.025, 18]} />
          {clayMat(CLAY.pedestal)}
        </mesh>
      </group>
    );
  }
  if (id === "casque-audio") {
    return (
      <group>
        <mesh rotation={[0, 0, 0]} position={[0, 0.1, 0]}>
          <torusGeometry args={[0.22, 0.028, 8, 20, Math.PI]} />
          {clayMat(CLAY.dark)}
        </mesh>
        <mesh position={[-0.22, 0.0, 0]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          {clayMat(CLAY.accent)}
        </mesh>
        <mesh position={[0.22, 0.0, 0]}>
          <sphereGeometry args={[0.07, 12, 10]} />
          {clayMat(CLAY.accent)}
        </mesh>
      </group>
    );
  }
  if (id === "couronne-feuilles") {
    return (
      <group position={[0, 0.13, 0]}>
        {Array.from({ length: 9 }).map((_, i) => {
          const a = (i / 9) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.2, Math.sin(i) * 0.01, Math.sin(a) * 0.2]} rotation={[0.3, a, 0]}>
              <sphereGeometry args={[0.045, 8, 6]} />
              {clayMat(i % 3 === 0 ? CLAY.leafDark : CLAY.leaf)}
            </mesh>
          );
        })}
      </group>
    );
  }
  return null;
}

function AccessoryFace({ id }: { id: string }) {
  if (id === "lunettes-rondes") {
    return (
      <group position={[0, 0.02, 0.2]}>
        <mesh position={[-0.08, 0, 0]}>
          <torusGeometry args={[0.055, 0.012, 8, 16]} />
          {clayMat(CLAY.dark)}
        </mesh>
        <mesh position={[0.08, 0, 0]}>
          <torusGeometry args={[0.055, 0.012, 8, 16]} />
          {clayMat(CLAY.dark)}
        </mesh>
        <mesh position={[0, 0.01, 0]} rotation={[0, 0, Math.PI / 2]}>
          <capsuleGeometry args={[0.01, 0.03, 4, 6]} />
          {clayMat(CLAY.dark)}
        </mesh>
      </group>
    );
  }
  return null;
}

// ---------- Le personnage ----------

function Hand({ side }: { side: 1 | -1 }) {
  void side;
  return (
    <mesh position={[0, -0.3, 0]} castShadow>
      <sphereGeometry args={[0.075, 12, 10]} />
      {clayMat(CLAY.skin)}
    </mesh>
  );
}

function Foot() {
  return (
    <group position={[0, -0.36, 0]}>
      <mesh position={[0, -0.02, 0.07]} castShadow>
        <capsuleGeometry args={[0.055, 0.12, 6, 10]} />
        {clayMat(CLAY.dark)}
      </mesh>
    </group>
  );
}

function Hair({ body }: { body: "f" | "m" }) {
  if (body === "m") {
    return (
      <mesh position={[0, 0.09, -0.015]} castShadow>
        <sphereGeometry args={[0.2, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        {clayMat(CLAY.hair)}
      </mesh>
    );
  }
  return (
    <group>
      <mesh position={[0, 0.08, -0.02]} castShadow>
        <sphereGeometry args={[0.21, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        {clayMat(CLAY.hair)}
      </mesh>
      {/* mèches latérales */}
      <mesh position={[-0.17, -0.04, 0.02]} rotation={[0, 0, 0.18]}>
        <capsuleGeometry args={[0.05, 0.16, 6, 8]} />
        {clayMat(CLAY.hair)}
      </mesh>
      <mesh position={[0.17, -0.04, 0.02]} rotation={[0, 0, -0.18]}>
        <capsuleGeometry args={[0.05, 0.16, 6, 8]} />
        {clayMat(CLAY.hair)}
      </mesh>
      {/* chignon */}
      <mesh position={[0, 0.16, -0.16]} castShadow>
        <sphereGeometry args={[0.09, 12, 10]} />
        {clayMat(CLAY.hair)}
      </mesh>
    </group>
  );
}

function Face({ refs }: { refs: Pick<RigRefs, "eyeL" | "eyeR"> }) {
  return (
    <group position={[0, 0.01, 0]}>
      <group ref={refs.eyeL} position={[-0.075, 0.015, 0.185]}>
        <mesh>
          <sphereGeometry args={[0.024, 10, 8]} />
          {clayMat(CLAY.dark)}
        </mesh>
      </group>
      <group ref={refs.eyeR} position={[0.075, 0.015, 0.185]}>
        <mesh>
          <sphereGeometry args={[0.024, 10, 8]} />
          {clayMat(CLAY.dark)}
        </mesh>
      </group>
      {/* sourire */}
      <mesh position={[0, -0.062, 0.183]} rotation={[0.25, 0, 0]}>
        <torusGeometry args={[0.045, 0.009, 6, 14, Math.PI * 0.7]} />
        <meshStandardMaterial color={CLAY.dark} roughness={0.9} />
      </mesh>
      {/* joues */}
      <mesh position={[-0.12, -0.04, 0.155]}>
        <sphereGeometry args={[0.028, 8, 6]} />
        <meshStandardMaterial color={CLAY.blush} roughness={1} transparent opacity={0.55} />
      </mesh>
      <mesh position={[0.12, -0.04, 0.155]}>
        <sphereGeometry args={[0.028, 8, 6]} />
        <meshStandardMaterial color={CLAY.blush} roughness={1} transparent opacity={0.55} />
      </mesh>
    </group>
  );
}

function ArmMesh({ side, refs }: { side: 1 | -1; refs: { sh: GRef; el: GRef } }) {
  return (
    <group ref={refs.sh} position={[0.27 * side, SHOULDER_Y, 0]}>
      {/* épaule */}
      <mesh castShadow>
        <sphereGeometry args={[0.085, 12, 10]} />
        {clayMat(CLAY.top)}
      </mesh>
      {/* bras */}
      <mesh position={[0, -0.16, 0]} castShadow>
        <capsuleGeometry args={[0.062, 0.2, 6, 10]} />
        {clayMat(CLAY.top)}
      </mesh>
      {/* avant-bras + main */}
      <group ref={refs.el} position={[0, -0.32, 0]}>
        <mesh position={[0, -0.14, 0]} castShadow>
          <capsuleGeometry args={[0.052, 0.17, 6, 10]} />
          {clayMat(CLAY.skin)}
        </mesh>
        <Hand side={side} />
      </group>
    </group>
  );
}

function LegMesh({ side, refs }: { side: 1 | -1; refs: { hip: GRef; knee: GRef; ank: GRef } }) {
  return (
    <group ref={refs.hip} position={[0.13 * side, -0.02, 0]}>
      <mesh position={[0, -0.17, 0]} castShadow>
        <capsuleGeometry args={[0.093, 0.2, 6, 10]} />
        {clayMat(CLAY.trousers)}
      </mesh>
      <group ref={refs.knee} position={[0, -0.36, 0]}>
        <mesh position={[0, -0.16, 0]} castShadow>
          <capsuleGeometry args={[0.075, 0.19, 6, 10]} />
          {clayMat(CLAY.trousers)}
        </mesh>
        <group ref={refs.ank} position={[0, -0.34, 0]}>
          <Foot />
        </group>
      </group>
    </group>
  );
}

export function ClayRig({
  refs,
  avatar,
}: {
  refs: RigRefs;
  avatar: Pick<AvatarState, "body" | "equipped">;
}) {
  const eq = (slot: string) =>
    avatar.equipped.find((id) => {
      if (slot === "tete") return ["bob-sable", "casque-audio", "couronne-feuilles"].includes(id);
      if (slot === "visage") return id === "lunettes-rondes";
      if (slot === "cou") return id === "echarpe-terracotta";
      if (slot === "epaule") return id === "oiseau-mesange";
      return false;
    });
  const headAcc = eq("tete");
  const faceAcc = eq("visage");
  const fem = avatar.body === "f";

  return (
    <group ref={refs.pelvis}>
      {/* bassin */}
      <mesh castShadow>
        <sphereGeometry args={[0.2, 16, 12]} />
        {clayMat(CLAY.trousers)}
      </mesh>
      {/* jambes */}
      <LegMesh side={-1} refs={{ hip: refs.hipL, knee: refs.kneeL, ank: refs.ankL }} />
      <LegMesh side={1} refs={{ hip: refs.hipR, knee: refs.kneeR, ank: refs.ankR }} />
      {/* buste */}
      <group ref={refs.torso} position={[0, 0.06, 0]} scale={[fem ? 0.95 : 1, 1, 1]}>
        <group ref={refs.chest}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <capsuleGeometry args={[0.22, 0.3, 8, 14]} />
            {clayMat(CLAY.top)}
          </mesh>
          {/* ventre respirant */}
          <group ref={refs.belly} position={[0, 0.16, 0.14]}>
            <mesh>
              <sphereGeometry args={[0.1, 12, 10]} />
              {clayMat(CLAY.top)}
            </mesh>
          </group>
        </group>
        {/* écharpe */}
        {eq("cou") && (
          <mesh position={[0, 0.56, 0.02]} rotation={[rad(14), 0, 0]}>
            <torusGeometry args={[0.15, 0.05, 8, 18]} />
            {clayMat(CLAY.accent)}
          </mesh>
        )}
        {/* mésange sur l'épaule */}
        {eq("epaule") && (
          <group position={[-0.3, 0.6, 0.02]}>
            <mesh castShadow>
              <sphereGeometry args={[0.06, 10, 8]} />
              {clayMat("#8FB7C9")}
            </mesh>
            <mesh position={[0, 0.055, 0.02]}>
              <sphereGeometry args={[0.04, 10, 8]} />
              {clayMat(CLAY.cream)}
            </mesh>
            <mesh position={[0, 0.055, 0.058]}>
              <coneGeometry args={[0.012, 0.03, 6]} />
              {clayMat(CLAY.accent)}
            </mesh>
          </group>
        )}
        {/* bras */}
        <ArmMesh side={-1} refs={{ sh: refs.shL, el: refs.elL }} />
        <ArmMesh side={1} refs={{ sh: refs.shR, el: refs.elR }} />
        {/* cou + tête */}
        <mesh position={[0, 0.56, 0]}>
          <cylinderGeometry args={[0.07, 0.085, 0.14, 10]} />
          {clayMat(CLAY.skin)}
        </mesh>
        <group ref={refs.head} position={[0, 0.72, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[0.21, 22, 18]} />
            {clayMat(CLAY.skin)}
          </mesh>
          <Hair body={avatar.body} />
          <Face refs={{ eyeL: refs.eyeL, eyeR: refs.eyeR }} />
          {headAcc && <AccessoryHead id={headAcc} />}
          {faceAcc && <AccessoryFace id={faceAcc} />}
        </group>
      </group>
    </group>
  );
}

// ---------- Décor nature / calme ----------

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
        <cylinderGeometry args={[0.95, 1.02, 0.09, 36]} />
        {clayMat(CLAY.pedestal)}
      </mesh>
      {/* galets */}
      <mesh position={[-0.72, 0.03, 0.4]} scale={[1, 0.6, 1]}>
        <sphereGeometry args={[0.07, 10, 8]} />
        {clayMat("#D8CDB6")}
      </mesh>
      <mesh position={[-0.6, 0.02, 0.52]} scale={[1, 0.55, 1]}>
        <sphereGeometry args={[0.045, 10, 8]} />
        {clayMat("#C9BFA8")}
      </mesh>
      {/* brin d'herbe */}
      <group position={[0.78, 0, 0.3]}>
        <mesh position={[0, 0.09, 0]} rotation={[0, 0, 0.25]}>
          <coneGeometry args={[0.02, 0.2, 6]} />
          {clayMat(CLAY.leaf)}
        </mesh>
        <mesh position={[0.05, 0.07, 0.02]} rotation={[0, 0, -0.3]}>
          <coneGeometry args={[0.016, 0.15, 6]} />
          {clayMat(CLAY.leafDark)}
        </mesh>
      </group>
      {/* tabouret d'argile quand assis */}
      {seated && (
        <group>
          <mesh position={[0, 0.42, -0.05]} castShadow receiveShadow>
            <cylinderGeometry args={[0.26, 0.23, 0.09, 16]} />
            {clayMat(CLAY.stool)}
          </mesh>
          <mesh position={[0, 0.2, -0.05]}>
            <cylinderGeometry args={[0.07, 0.1, 0.38, 10]} />
            {clayMat(CLAY.stool)}
          </mesh>
        </group>
      )}
      {/* bureau esquissé (exercices « au bureau ») */}
      {desk && (
        <group position={[0.62, 0, 0.15]}>
          <mesh position={[0, 0.62, 0]} castShadow>
            <boxGeometry args={[0.5, 0.05, 0.42]} />
            {clayMat(CLAY.stool)}
          </mesh>
          <mesh position={[0.2, 0.3, 0]}>
            <cylinderGeometry args={[0.035, 0.045, 0.6, 8]} />
            {clayMat(CLAY.stool)}
          </mesh>
        </group>
      )}
      {/* accessoires de décor */}
      {equipped.includes("plante-pot") && (
        <group position={[-0.78, 0, -0.1]}>
          <mesh position={[0, 0.1, 0]} castShadow>
            <cylinderGeometry args={[0.1, 0.08, 0.18, 12]} />
            {clayMat(CLAY.pot)}
          </mesh>
          <mesh position={[0, 0.26, 0]}>
            <sphereGeometry args={[0.09, 10, 8]} />
            {clayMat(CLAY.leaf)}
          </mesh>
          <mesh position={[-0.06, 0.33, 0.02]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            {clayMat(CLAY.leafDark)}
          </mesh>
          <mesh position={[0.07, 0.32, -0.02]}>
            <sphereGeometry args={[0.05, 10, 8]} />
            {clayMat(CLAY.leaf)}
          </mesh>
        </group>
      )}
      {equipped.includes("tasse-tisane") && (
        <group position={[0.68, 0, -0.35]}>
          <mesh position={[0, 0.07, 0]} castShadow>
            <cylinderGeometry args={[0.07, 0.055, 0.12, 12]} />
            {clayMat(CLAY.cream)}
          </mesh>
          <mesh position={[0.085, 0.07, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.03, 0.012, 6, 10]} />
            {clayMat(CLAY.cream)}
          </mesh>
        </group>
      )}
    </group>
  );
}

export function ClayLights() {
  return (
    <group>
      <ambientLight intensity={0.75} color="#FFF6E8" />
      <directionalLight position={[-2.2, 3.4, 2.6]} intensity={1.15} color="#FFF3E0" />
      <directionalLight position={[2.4, 1.2, -1.6]} intensity={0.3} color="#DCEAE0" />
    </group>
  );
}

// Hauteur du bassin selon la position (le sol est à y = 0).
export function pelvisBaseY(stand: boolean): number {
  return stand ? 0.76 : 0.52;
}
