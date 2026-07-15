import { useEffect, useRef, useState } from "react";
import {
  MOTIONS,
  type FaceKind,
  type FrontPose,
  type HandsKind,
  type HighlightZone,
  type Motion,
  type MotionId,
  type SidePose,
} from "../data/motions";
import { circle, ellipse, seg, unionPath, type P } from "./outline";
import { defaultAvatar, useMovaeMaybe } from "../state/store";
import type { AvatarColors, HairId } from "../types";

// ============================================================================
// Le personnage 2D Movaé — un seul trait.
//
// Le corps n'est plus une superposition de formes : chaque volume (torse,
// membres, tête, mains, chaussures) est fusionné par union booléenne, et UNE
// seule ligne lissée entoure l'ensemble. Les couleurs sont des aplats posés
// sous ce contour. Piloté par les articulations de motions.ts ; quatre
// cadrages (profil, face, visage, main) ; couleurs/coupe/accessoires = avatar.
// ============================================================================

const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

interface Look {
  colors: AvatarColors;
  hair: HairId;
  equipped: string[];
}

const ACCENT = "#C4795A";
const DARK = "#3A342C";
const BLUSH = "#E4A78D";
const INK_W = 1.15; // épaisseur du trait unique

function useLook(): Look {
  const store = useMovaeMaybe();
  const a = store?.state.avatar ?? defaultAvatar();
  return { colors: a.colors, hair: a.hair, equipped: a.equipped };
}

// ---------- Poses complètes (cinématique inchangée : motions.ts) ----------

interface FullSide {
  torso: number; head: number; headX: number; shoulderLift: number; shoulderShift: number;
  armNear: { sh: number; el: number } | null; armFar: { sh: number; el: number } | null;
  thigh: number; shin: number; foot: number; thighFar: number; shinFar: number; footFar: number;
  pelvisY: number; belly: number; gaze: number;
}

function sideDefaults(stand: boolean): FullSide {
  return stand
    ? { torso: 0, head: 0, headX: 0, shoulderLift: 0, shoulderShift: 0,
        armNear: { sh: 10, el: 8 }, armFar: { sh: 6, el: 10 },
        thigh: -78, shin: 2, foot: 0, thighFar: -78, shinFar: 2, footFar: 0,
        pelvisY: 0, belly: 0, gaze: 1 }
    : { torso: 0, head: 0, headX: 0, shoulderLift: 0, shoulderShift: 0,
        armNear: { sh: 34, el: 58 }, armFar: { sh: 30, el: 62 },
        thigh: 0, shin: 0, foot: 0, thighFar: 0, shinFar: 0, footFar: 0,
        pelvisY: 0, belly: 0, gaze: 1 };
}

function mergeSide(base: FullSide, p: SidePose): FullSide {
  return { ...base, ...p,
    armNear: p.armNear === undefined ? base.armNear : p.armNear,
    armFar: p.armFar === undefined ? base.armFar : p.armFar } as FullSide;
}

function lerpArm(a: { sh: number; el: number } | null, b: { sh: number; el: number } | null, t: number) {
  if (!a || !b) return t < 0.5 ? a : b;
  return { sh: lerp(a.sh, b.sh, t), el: lerp(a.el, b.el, t) };
}

function lerpSide(a: FullSide, b: FullSide, t: number): FullSide {
  const out = { ...a } as FullSide;
  (Object.keys(a) as (keyof FullSide)[]).forEach((k) => {
    if (k === "armNear" || k === "armFar") return;
    (out[k] as number) = lerp(a[k] as number, b[k] as number, t);
  });
  out.armNear = lerpArm(a.armNear, b.armNear, t);
  out.armFar = lerpArm(a.armFar, b.armFar, t);
  return out;
}

interface FullFront {
  tilt: number; turn: number; nod: number; twist: number; bend: number; shrug: number;
  grow: number; hipShift: number; knees: number;
  armL: { sh: number; el: number } | null; armR: { sh: number; el: number } | null;
}

const FRONT_DEFAULTS: FullFront = {
  tilt: 0, turn: 0, nod: 0, twist: 0, bend: 0, shrug: 0, grow: 0, hipShift: 0, knees: 0,
  armL: { sh: 10, el: 8 }, armR: { sh: 10, el: 8 },
};

function mergeFront(p: FrontPose): FullFront {
  return { ...FRONT_DEFAULTS, ...p,
    armL: p.armL === undefined ? FRONT_DEFAULTS.armL : p.armL,
    armR: p.armR === undefined ? FRONT_DEFAULTS.armR : p.armR } as FullFront;
}

function lerpFront(a: FullFront, b: FullFront, t: number): FullFront {
  const out = { ...a } as FullFront;
  (Object.keys(a) as (keyof FullFront)[]).forEach((k) => {
    if (k === "armL" || k === "armR") return;
    (out[k] as number) = lerp(a[k] as number, b[k] as number, t);
  });
  out.armL = lerpArm(a.armL, b.armL, t);
  out.armR = lerpArm(a.armR, b.armR, t);
  return out;
}

// ---------- Cinématique (profil) ----------

const TORSO_L = 27, NECK = 5, HEAD_R = 8.5, UA = 13, FA = 12, THIGH = 23, SHIN = 25, FOOT = 8;

interface SideJoints {
  pelvis: P; shoulder: P; headC: P;
  elbowN: P | null; handN: P | null; handAN: number;
  elbowF: P | null; handF: P | null; handAF: number;
  kneeN: P; ankleN: P; toeN: P; kneeF: P; ankleF: P; toeF: P;
  belly: P;
}

function solveSide(pose: FullSide, stand: boolean): SideJoints {
  const baseY = stand ? 54 : 76;
  const pelvis = { x: 54, y: baseY + pose.pelvisY };
  const tor = rad(pose.torso);
  const shoulder = {
    x: pelvis.x + Math.sin(tor) * TORSO_L + pose.shoulderShift,
    y: pelvis.y - Math.cos(tor) * TORSO_L + pose.shoulderLift,
  };
  const hd = rad(pose.torso + pose.head);
  const headC = {
    x: shoulder.x + Math.sin(hd) * (NECK + HEAD_R) * 0.9 + pose.headX + Math.sin(hd) * 2,
    y: shoulder.y - Math.cos(hd) * (NECK + HEAD_R),
  };
  const arm = (spec: { sh: number; el: number } | null) => {
    if (!spec) return { elbow: null as P | null, hand: null as P | null, a: 0 };
    const a1 = rad(pose.torso + spec.sh);
    const elbow = { x: shoulder.x + Math.sin(a1) * UA, y: shoulder.y + Math.cos(a1) * UA };
    const a2 = a1 + rad(spec.el);
    const hand = { x: elbow.x + Math.sin(a2) * FA, y: elbow.y + Math.cos(a2) * FA };
    return { elbow, hand, a: a2 };
  };
  const nA = arm(pose.armNear);
  const fA = arm(pose.armFar);
  const leg = (th: number, sh: number, ft: number) => {
    const knee = { x: pelvis.x + Math.cos(rad(th)) * THIGH, y: pelvis.y - Math.sin(rad(th)) * THIGH };
    const a3 = rad(sh);
    const ankle = { x: knee.x + Math.sin(a3) * SHIN, y: knee.y + Math.cos(a3) * SHIN };
    const toe = { x: ankle.x + Math.cos(rad(ft)) * FOOT, y: ankle.y - Math.sin(rad(ft)) * FOOT };
    return { knee, ankle, toe };
  };
  const nL = leg(pose.thigh, pose.shin, pose.foot);
  const fL = leg(pose.thighFar, pose.shinFar, pose.footFar);
  const belly = {
    x: pelvis.x + (shoulder.x - pelvis.x) * 0.42 + 5.5 + pose.belly * 2.5,
    y: pelvis.y + (shoulder.y - pelvis.y) * 0.42,
  };
  return {
    pelvis, shoulder, headC,
    elbowN: nA.elbow, handN: nA.hand, handAN: nA.a,
    elbowF: fA.elbow, handF: fA.hand, handAF: fA.a,
    kneeN: nL.knee, ankleN: nL.ankle, toeN: nL.toe,
    kneeF: fL.knee, ankleF: fL.ankle, toeF: fL.toe,
    belly,
  };
}

const L = (a: P, b: P) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

// Aplat de membre : segment épais à bouts ronds, SANS contour propre.
function Flat({ a, b, w, color, o = 1 }: { a: P; b: P; w: number; color: string; o?: number }) {
  return <path d={L(a, b)} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" opacity={o} />;
}

// ---------- Pièces dessinées (aplats + détails, le trait vient de l'union) ----------

function shoeGeom(ankle: P, toe: P) {
  const a = (Math.atan2(toe.y - ankle.y, toe.x - ankle.x) * 180) / Math.PI;
  const c = { x: (ankle.x + toe.x) / 2 + 1.2, y: (ankle.y + toe.y) / 2 + 0.8 };
  return { c, a, rx: 6.6, ry: 3 };
}

function SideHandFingers({ p, a, skin }: { p: P; a: number; skin: string }) {
  const dx = Math.sin(rad(a)), dy = Math.cos(rad(a));
  return (
    <g>
      {[-0.55, 0, 0.55].map((o) => (
        <path key={o}
          d={`M${p.x} ${p.y} l${(dx * 3.4 - dy * o * 1.3).toFixed(1)} ${(dy * 3.4 + dx * o * 1.3).toFixed(1)}`}
          stroke={skin} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      ))}
    </g>
  );
}

// Volumes de cheveux à inclure dans le contour unifié (profil).
function sideHairRings(c: P, hair: HairId) {
  const r = HEAD_R;
  if (hair === "chignon") return [circle({ x: c.x - r - 0.8, y: c.y - 3.5 }, 3.1)];
  if (hair === "queue") return [seg({ x: c.x - r + 1, y: c.y - 3 }, { x: c.x - r - 2.6, y: c.y + 6.5 }, 2.2, 1.5)];
  if (hair === "mi-long") return [seg({ x: c.x - r + 1.4, y: c.y }, { x: c.x - r + 1.8, y: c.y + 7.5 }, 2.6, 2)];
  if (hair === "boucles")
    return [circle({ x: c.x - 2, y: c.y - r }, 3.2), circle({ x: c.x + 4, y: c.y - r + 1.2 }, 2.8), circle({ x: c.x - r + 1, y: c.y - r + 3 }, 3)];
  return [];
}

function SideHairFill({ c, hair, color }: { c: P; hair: HairId; color: string }) {
  const r = HEAD_R;
  if (hair === "ras")
    return <path d={`M${c.x - r} ${c.y - 1} A ${r} ${r} 0 0 1 ${c.x + r * 0.72} ${c.y - r * 0.68} L ${c.x - r * 0.5} ${c.y - r * 0.2} Z`} fill={color} opacity={0.9} />;
  const cap = `M${c.x - r - 0.3} ${c.y + 1.5} A ${r + 0.4} ${r + 0.4} 0 0 1 ${c.x + r * 0.8} ${c.y - r * 0.62} Q ${c.x + 2} ${c.y - r * 0.2} ${c.x - r * 0.2} ${c.y - r * 0.45} Q ${c.x - r * 0.9} ${c.y - r * 0.1} ${c.x - r - 0.3} ${c.y + 1.5} Z`;
  return (
    <g fill={color}>
      <path d={cap} />
      {hair === "mi-long" && <path d={`M${c.x - r - 0.8} ${c.y - 1} q -1.4 6 0.6 9.5 q 2.4 1 2.8 -1 q -1.6 -4.5 -0.6 -8 Z`} />}
      {hair === "chignon" && <circle cx={c.x - r - 0.8} cy={c.y - 3.5} r={3.1} />}
      {hair === "queue" && <path d={`M${c.x - r + 1} ${c.y - 4} q -5.4 3.5 -4.4 11 q 1.6 1.6 2.8 0.2 q -0.8 -6 1.8 -9.4 Z`} />}
      {hair === "boucles" && (
        <g>
          <circle cx={c.x - 2} cy={c.y - r} r={3.4} />
          <circle cx={c.x + 4} cy={c.y - r + 1.2} r={3} />
          <circle cx={c.x - r + 1} cy={c.y - r + 3} r={3.2} />
        </g>
      )}
    </g>
  );
}

// Visage profil (détails posés PAR-DESSUS le trait unique).
function SideFace({ c, look, gazeY = 0 }: { c: P; look: Look; gazeY?: number }) {
  const { colors, equipped } = look;
  return (
    <g>
      <ellipse cx={c.x + 3.6} cy={c.y - 0.6 + gazeY} rx={1.15} ry={1.6} fill={DARK} />
      <path d={`M${c.x + 2} ${c.y - 3.4} q 2 -1.1 3.6 -0.2`} stroke={colors.hair} strokeWidth={0.9} strokeLinecap="round" fill="none" />
      <path d={`M${c.x + HEAD_R - 1.2} ${c.y + 0.4} q 1.5 0.8 0.5 2.2`} stroke={DARK} strokeWidth={0.6} strokeLinecap="round" fill="none" />
      <path d={`M${c.x + 4.8} ${c.y + 3.6} q 1.4 0.7 2.4 -0.2`} stroke={DARK} strokeWidth={0.7} strokeLinecap="round" fill="none" />
      <circle cx={c.x + 3.2} cy={c.y + 2.8} r={1.1} fill={BLUSH} opacity={0.5} />
      <path d={`M${c.x - 1.4} ${c.y + 0.2} a 1.6 1.6 0 1 0 0.2 -0.1`} fill="none" stroke={DARK} strokeWidth={0.5} />
      {equipped.includes("lunettes-rondes") && (
        <g stroke={DARK} strokeWidth={0.8} fill="none">
          <circle cx={c.x + 4.4} cy={c.y - 0.6} r={2.4} />
          <path d={`M${c.x + 2} ${c.y - 0.8} L ${c.x - 1} ${c.y - 1.4}`} />
        </g>
      )}
      {equipped.includes("bob-sable") && (
        <path d={`M${c.x - HEAD_R - 2} ${c.y - 4} q ${HEAD_R + 2} -8.5 ${2 * HEAD_R + 3.4} -0.6 q 1.8 1.6 -0.6 1.8 l -${2 * HEAD_R + 2.4} 0.6 q -2.4 -0.2 -0.8 -1.8`} fill="#E9E0CE" stroke={DARK} strokeWidth={0.6} />
      )}
      {equipped.includes("casque-audio") && (
        <g>
          <path d={`M${c.x - HEAD_R + 1} ${c.y - 2} a ${HEAD_R - 0.5} ${HEAD_R - 0.5} 0 0 1 ${2 * HEAD_R - 3} -1.4`} stroke={DARK} strokeWidth={1.4} fill="none" />
          <rect x={c.x - 2.2} y={c.y - 2.4} width={3.4} height={4.6} rx={1.6} fill={ACCENT} />
        </g>
      )}
      {equipped.includes("couronne-feuilles") && (
        <g fill="#5F8B6D">
          {[-5, -1.5, 2, 5.5].map((o) => <ellipse key={o} cx={c.x + o} cy={c.y - HEAD_R + 0.4} rx={1.7} ry={0.9} transform={`rotate(${o * 6} ${c.x + o} ${c.y - HEAD_R})`} />)}
        </g>
      )}
    </g>
  );
}

// Torse habillé de profil (aplat, sans contour).
function SideTorsoFill({ j, belly, top }: { j: SideJoints; belly: number; top: string }) {
  const p = j.pelvis, s = j.shoulder;
  const bx = j.belly.x + 3 + belly * 2.2, by = j.belly.y;
  const back = { x: p.x + (s.x - p.x) * 0.5 - 6.2, y: p.y + (s.y - p.y) * 0.5 };
  return (
    <g>
      <path
        d={`M${p.x - 6} ${p.y + 3.5} Q ${back.x} ${back.y} ${s.x - 5} ${s.y - 3}
            Q ${s.x} ${s.y - 5.4} ${s.x + 5} ${s.y - 2.6}
            Q ${bx} ${by} ${p.x + 6.5} ${p.y + 3.5} Z`}
        fill={top} />
      <path d={`M${p.x - 6} ${p.y + 3.2} Q ${p.x} ${p.y + 5.4} ${p.x + 6.5} ${p.y + 3.2}`} stroke={ACCENT} strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </g>
  );
}

function SideBody({ pose, stand, target, look }: { pose: FullSide; stand: boolean; target?: boolean; look: Look }) {
  const j = solveSide(pose, stand);
  const { colors } = look;
  const gazeTarget = { x: lerp(80, 106, pose.gaze), y: lerp(42, 20, pose.gaze) };
  const wristN = j.elbowN && j.handN
    ? { x: j.handN.x - (j.handN.x - j.elbowN.x) * 0.22, y: j.handN.y - (j.handN.y - j.elbowN.y) * 0.22 }
    : null;

  // ----- volumes du contour unifié -----
  const shoeN = shoeGeom(j.ankleN, j.toeN);
  const shoeF = shoeGeom(j.ankleF, j.toeF);
  const near = [
    seg(j.pelvis, j.shoulder, 6.4, 5.2),
    seg(j.shoulder, j.headC, 2.5, 3),
    circle(j.headC, HEAD_R + 0.2),
    ...sideHairRings(j.headC, look.hair),
    seg(j.pelvis, j.kneeN, 3.7, 3.4),
    seg(j.kneeN, j.ankleN, 3.2, 2.8),
    ellipse(shoeN.c, shoeN.rx, shoeN.ry, shoeN.a),
  ];
  if (pose.belly > 0.02) near.push(circle({ x: j.belly.x + 2.4, y: j.belly.y }, 4.6 + pose.belly * 2.6));
  if (j.elbowN && j.handN) {
    near.push(seg(j.shoulder, j.elbowN, 3, 2.6), seg(j.elbowN, j.handN, 2.5, 2.2), circle(j.handN, 2.7));
  }
  const far: typeof near = [
    seg(j.pelvis, j.kneeF, 3.4, 3.1),
    seg(j.kneeF, j.ankleF, 2.9, 2.6),
    ellipse(shoeF.c, shoeF.rx, shoeF.ry, shoeF.a),
  ];
  if (j.elbowF && j.handF) {
    far.push(seg(j.shoulder, j.elbowF, 2.7, 2.4), seg(j.elbowF, j.handF, 2.3, 2), circle(j.handF, 2.5));
  }

  return (
    <g>
      {/* ----- côté éloigné : aplats assombris + son propre trait fin ----- */}
      <g opacity={0.4}>
        <Flat a={j.pelvis} b={j.kneeF} w={6.6} color={colors.trousers} />
        <Flat a={j.kneeF} b={j.ankleF} w={5.6} color={colors.trousers} />
        <ellipse cx={shoeF.c.x} cy={shoeF.c.y} rx={shoeF.rx - 0.4} ry={shoeF.ry - 0.3} transform={`rotate(${shoeF.a} ${shoeF.c.x} ${shoeF.c.y})`} fill={colors.shoes} />
        {j.elbowF && j.handF && (
          <g>
            <Flat a={j.shoulder} b={j.elbowF} w={5.2} color={colors.top} />
            <Flat a={j.elbowF} b={j.handF} w={4.4} color={colors.skin} />
            <circle cx={j.handF.x} cy={j.handF.y} r={2.5} fill={colors.skin} />
          </g>
        )}
        <path d={unionPath(far)} stroke={DARK} strokeWidth={0.9} fill="none" strokeLinejoin="round" />
      </g>

      {/* ----- aplats du côté proche ----- */}
      <SideTorsoFill j={j} belly={pose.belly} top={colors.top} />
      <Flat a={j.pelvis} b={j.kneeN} w={7} color={colors.trousers} />
      <Flat a={j.kneeN} b={j.ankleN} w={6} color={colors.trousers} />
      <circle cx={j.ankleN.x} cy={j.ankleN.y} r={2.6} fill={ACCENT} />
      <ellipse cx={shoeN.c.x} cy={shoeN.c.y} rx={shoeN.rx - 0.3} ry={shoeN.ry - 0.2} transform={`rotate(${shoeN.a} ${shoeN.c.x} ${shoeN.c.y})`} fill={colors.shoes} />
      <path d={L(j.shoulder, { x: (j.shoulder.x + j.headC.x) / 2, y: (j.shoulder.y + j.headC.y) / 2 })}
        stroke={colors.skin} strokeWidth={4.6} strokeLinecap="round" fill="none" />
      <circle cx={j.headC.x} cy={j.headC.y} r={HEAD_R} fill={colors.skin} />
      <SideHairFill c={j.headC} hair={look.hair} color={colors.hair} />
      {j.elbowN && j.handN && wristN && (
        <g>
          <Flat a={j.shoulder} b={j.elbowN} w={5.8} color={colors.top} />
          <Flat a={j.elbowN} b={j.handN} w={4.8} color={colors.skin} />
          <circle cx={wristN.x} cy={wristN.y} r={2.5} fill={ACCENT} />
          <circle cx={j.handN.x} cy={j.handN.y} r={2.7} fill={colors.skin} />
        </g>
      )}

      {/* ----- LE trait : contour unique du corps ----- */}
      <path d={unionPath(near)} stroke={DARK} strokeWidth={INK_W} fill="none" strokeLinejoin="round" />

      {/* ----- détails par-dessus ----- */}
      {j.elbowN && j.handN && <SideHandFingers p={j.handN} a={j.handAN} skin={colors.skin} />}
      <SideFace c={j.headC} look={look} gazeY={target ? -pose.gaze * 0.8 : 0} />
      {pose.belly > 0.02 && (
        <ellipse cx={j.belly.x + 4} cy={j.belly.y} rx={2 + pose.belly * 3} ry={3 + pose.belly * 3.4}
          fill="none" stroke={ACCENT} strokeWidth={1.1} opacity={0.55} />
      )}
      {target && (
        <g>
          <path d={L({ x: j.headC.x + 7, y: j.headC.y - 1 }, gazeTarget)} stroke={ACCENT} strokeWidth={1.6} strokeDasharray="3 4" fill="none" />
          <circle cx={gazeTarget.x} cy={gazeTarget.y} r={3.6} fill={ACCENT} />
        </g>
      )}
    </g>
  );
}

function SideScene({ stand, desk }: { stand?: boolean; desk?: boolean }) {
  return (
    <g stroke="var(--m-ink2)" strokeWidth={3.2} strokeLinecap="round" opacity={0.4} fill="none">
      {!stand && (
        <>
          <path d="M30 79 L66 79" />
          <path d="M31 79 L31 48" />
          <path d="M36 79 L36 106" />
          <path d="M62 79 L62 106" />
        </>
      )}
      {stand && <path d="M28 106 L104 106" strokeWidth={2.4} opacity={0.8} />}
      {desk && (
        <>
          <path d="M76 60 L114 60" />
          <path d="M110 60 L110 106" />
        </>
      )}
    </g>
  );
}

// ---------- Vue de face ----------

function frontHairRings(c: P, r: number, hair: HairId) {
  if (hair === "chignon") return [circle({ x: c.x, y: c.y - r - 1.6 }, 3)];
  if (hair === "queue") return [seg({ x: c.x + r - 1, y: c.y - 3 }, { x: c.x + r + 2.6, y: c.y + 5 }, 2.2, 1.6)];
  if (hair === "mi-long")
    return [
      seg({ x: c.x - r + 0.6, y: c.y - 1 }, { x: c.x - r + 0.4, y: c.y + 7 }, 2.4, 1.8),
      seg({ x: c.x + r - 0.6, y: c.y - 1 }, { x: c.x + r - 0.4, y: c.y + 7 }, 2.4, 1.8),
    ];
  if (hair === "boucles")
    return [circle({ x: c.x - 5, y: c.y - r + 1 }, 3), circle({ x: c.x, y: c.y - r - 0.8 }, 3.3), circle({ x: c.x + 5, y: c.y - r + 1 }, 3)];
  return [];
}

function FrontHairFill({ cx, cy, r, hair, color }: { cx: number; cy: number; r: number; hair: HairId; color: string }) {
  if (hair === "ras")
    return <path d={`M${cx - r} ${cy - 2} A ${r} ${r} 0 0 1 ${cx + r} ${cy - 2} L ${cx + r - 1.2} ${cy - 3.4} A ${r - 1.4} ${r - 1.4} 0 0 0 ${cx - r + 1.2} ${cy - 3.4} Z`} fill={color} opacity={0.9} />;
  const cap = `M${cx - r - 0.2} ${cy - 1} A ${r + 0.3} ${r + 0.3} 0 0 1 ${cx + r + 0.2} ${cy - 1} Q ${cx + r - 1} ${cy - 3.6} ${cx + 2.6} ${cy - 4.4} Q ${cx} ${cy - 3.6} ${cx - 3.4} ${cy - 4.6} Q ${cx - r + 1.4} ${cy - 3.4} ${cx - r - 0.2} ${cy - 1} Z`;
  return (
    <g fill={color}>
      <path d={cap} />
      {hair === "mi-long" && (
        <g>
          <path d={`M${cx - r - 0.4} ${cy - 1.5} q -1.6 5.5 -0.4 8.5 q 2.2 1.4 3 -0.4 q -1.4 -4 -0.6 -7 Z`} />
          <path d={`M${cx + r + 0.4} ${cy - 1.5} q 1.6 5.5 0.4 8.5 q -2.2 1.4 -3 -0.4 q 1.4 -4 0.6 -7 Z`} />
        </g>
      )}
      {hair === "chignon" && <circle cx={cx} cy={cy - r - 1.6} r={3} />}
      {hair === "queue" && <path d={`M${cx + r - 1} ${cy - 4} q 4.6 1.4 4 9 q -1.6 1.6 -2.8 0.2 q 0 -5 -2.4 -7.6 Z`} />}
      {hair === "boucles" && (
        <g>
          <circle cx={cx - 5} cy={cy - r + 1} r={3.2} />
          <circle cx={cx} cy={cy - r - 0.8} r={3.5} />
          <circle cx={cx + 5} cy={cy - r + 1} r={3.2} />
        </g>
      )}
    </g>
  );
}

function FrontFace({ cx, cy, turn, look }: { cx: number; cy: number; turn: number; look: Look }) {
  const { colors, equipped } = look;
  const r = 9.5;
  const ex = turn * 2.2;
  return (
    <g>
      {[-3.3, 3.3].map((o) => (
        <g key={o}>
          <ellipse cx={cx + o + ex} cy={cy - 0.4} rx={1.25} ry={1.7} fill={DARK} />
          <circle cx={cx + o + ex + 0.4} cy={cy - 1} r={0.4} fill="#fff" opacity={0.9} />
          <path d={`M${cx + o - 1.7} ${cy - 3.2} q 1.7 -1 3.4 -0.1`} stroke={colors.hair} strokeWidth={0.85} strokeLinecap="round" fill="none" />
        </g>
      ))}
      <path d={`M${cx - 0.8 + ex * 0.6} ${cy + 1.2} q 0.8 1 0 1.8`} stroke={DARK} strokeWidth={0.6} strokeLinecap="round" fill="none" />
      <path d={`M${cx - 1.8 + ex * 0.5} ${cy + 4.2} q 1.8 1.4 3.6 0`} stroke={DARK} strokeWidth={0.75} strokeLinecap="round" fill="none" />
      <circle cx={cx - 4.6} cy={cy + 2.6} r={1.15} fill={BLUSH} opacity={0.5} />
      <circle cx={cx + 4.6} cy={cy + 2.6} r={1.15} fill={BLUSH} opacity={0.5} />
      {equipped.includes("lunettes-rondes") && (
        <g stroke={DARK} strokeWidth={0.8} fill="none">
          <circle cx={cx - 3.3} cy={cy - 0.4} r={2.5} />
          <circle cx={cx + 3.3} cy={cy - 0.4} r={2.5} />
          <path d={`M${cx - 0.8} ${cy - 0.6} h1.6`} />
        </g>
      )}
      {equipped.includes("bob-sable") && (
        <path d={`M${cx - r - 2.4} ${cy - 3.4} q ${r + 2.4} -9.5 ${2 * r + 4.8} 0 q 1.2 1.8 -1.2 1.8 l -${2 * r + 2.4} 0 q -2.4 0 -1.2 -1.8`} fill="#E9E0CE" stroke={DARK} strokeWidth={0.6} />
      )}
      {equipped.includes("casque-audio") && (
        <g>
          <path d={`M${cx - r} ${cy - 2} a ${r} ${r} 0 0 1 ${2 * r} 0`} stroke={DARK} strokeWidth={1.4} fill="none" />
          <rect x={cx - r - 1.6} y={cy - 2.6} width={3} height={4.4} rx={1.4} fill={ACCENT} />
          <rect x={cx + r - 1.4} y={cy - 2.6} width={3} height={4.4} rx={1.4} fill={ACCENT} />
        </g>
      )}
      {equipped.includes("couronne-feuilles") && (
        <g fill="#5F8B6D">
          {[-6, -2, 2, 6].map((o) => <ellipse key={o} cx={cx + o} cy={cy - r + 0.6} rx={1.8} ry={1} transform={`rotate(${o * 5} ${cx + o} ${cy - r})`} />)}
        </g>
      )}
    </g>
  );
}

function FrontBody({ pose, look }: { pose: FullFront; look: Look }) {
  const { colors, equipped } = look;
  const shY = 45 - pose.shrug * 5 - pose.grow * 3;
  const hipY = 80;
  const tx = pose.twist * 2; // décalage de torsion (léger)
  const shL = { x: 45 + tx, y: shY };
  const shR = { x: 75 + tx, y: shY };
  const arm = (side: 1 | -1, spec: { sh: number; el: number } | null) => {
    if (!spec) return null;
    const s = side === 1 ? shR : shL;
    const a1 = rad(spec.sh);
    const elbow = { x: s.x + side * Math.sin(a1) * UA, y: s.y + Math.cos(a1) * UA };
    const a2 = a1 + rad(spec.el);
    const hand = { x: elbow.x + side * Math.sin(a2) * FA, y: elbow.y + Math.cos(a2) * FA };
    return { s, elbow, hand };
  };
  const aL = arm(-1, pose.armL);
  const aR = arm(1, pose.armR);
  // tête : nod/grow + inclinaison latérale autour de la base du cou
  const hc0 = { x: 60 + tx + pose.turn * 2, y: 25 + pose.nod * 0.4 - pose.grow * 4 };
  const tilt = rad(pose.tilt);
  const pivot = { x: 60 + tx, y: shY - 6 };
  const headC = {
    x: pivot.x + (hc0.x - pivot.x) * Math.cos(tilt) - (hc0.y - pivot.y) * Math.sin(tilt),
    y: pivot.y + (hc0.x - pivot.x) * Math.sin(tilt) + (hc0.y - pivot.y) * Math.cos(tilt),
  };
  const kneeAngle = rad(10 + pose.knees * 26);
  const hip = pose.hipShift * 6;
  const R = 9.5;

  // jambes (assises, de face)
  const legs = [-1, 1].map((s) => {
    const hx = 60 + s * 8 + pose.hipShift * 5;
    const ky = hipY + 6 + Math.cos(kneeAngle) * 20;
    const kx = hx + s * Math.sin(kneeAngle) * 20;
    return { s, a: { x: hx, y: hipY + 5 }, b: { x: kx, y: ky } };
  });

  // ----- contour unifié -----
  const parts = [
    circle(headC, R + 0.2),
    ...frontHairRings(headC, R, look.hair),
    seg({ x: 60 + tx, y: shY }, { x: headC.x, y: headC.y + 4 }, 2.3, 2.6),
    seg(shL, shR, 5),
    seg({ x: 60 + tx * 0.5, y: shY + 2 }, { x: 60 + hip, y: hipY - 2 }, 13.2, 11),
    seg({ x: 52 + hip, y: hipY + 3.5 }, { x: 68 + hip, y: hipY + 3.5 }, 5.6),
    ...legs.flatMap((l) => [seg(l.a, l.b, 3.3, 3), ellipse({ x: l.b.x, y: l.b.y + 2.4 }, 3.6, 2.1)]),
  ];
  for (const e of [aL, aR]) {
    if (e) parts.push(seg(e.s, e.elbow, 2.8, 2.5), seg(e.elbow, e.hand, 2.4, 2.1), circle(e.hand, 2.6));
  }

  return (
    <g transform={pose.bend !== 0 ? `rotate(${pose.bend} 60 ${hipY})` : undefined}>
      {/* aplats */}
      {legs.map((l) => (
        <g key={l.s}>
          <Flat a={l.a} b={l.b} w={6.4} color={colors.trousers} />
          <ellipse cx={l.b.x} cy={l.b.y + 2.4} rx={3.4} ry={2} fill={colors.shoes} />
        </g>
      ))}
      <path d={`M${48 + hip} ${hipY + 6.5} q 12 4.5 24 0 l -1.5 -6 q -10.5 -3 -21 0 Z`} fill={colors.trousers} />
      <path
        d={`M${shL.x - 4.5} ${shL.y - 3} Q ${60 + tx} ${shY - 6.5} ${shR.x + 4.5} ${shR.y - 3}
            L ${72 + hip} ${hipY + 1} Q 60 ${hipY + 4.5} ${48 + hip} ${hipY + 1} Z`}
        fill={colors.top} />
      <path d={`M${48 + hip} ${hipY + 0.5} Q 60 ${hipY + 4} ${72 + hip} ${hipY + 0.5}`} stroke={ACCENT} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {equipped.includes("echarpe-terracotta") && (
        <path d={`M${shL.x + 2} ${shY - 1} q 13 4 26 0 l -1 -4 q -12 -3 -24 0 Z`} fill={ACCENT} />
      )}
      {[aL && { a: aL, s: -1 as const }, aR && { a: aR, s: 1 as const }].map((e, i) =>
        e ? (
          <g key={i}>
            <Flat a={e.a.s} b={e.a.elbow} w={5.6} color={colors.top} />
            <Flat a={e.a.elbow} b={e.a.hand} w={4.6} color={colors.skin} />
            <circle
              cx={e.a.hand.x - (e.a.hand.x - e.a.elbow.x) * 0.22}
              cy={e.a.hand.y - (e.a.hand.y - e.a.elbow.y) * 0.22}
              r={2.3} fill={ACCENT} />
            <circle cx={e.a.hand.x} cy={e.a.hand.y} r={2.6} fill={colors.skin} />
          </g>
        ) : null,
      )}
      <path d={`M${60 + tx} ${shY} L${headC.x} ${headC.y + 5}`} stroke={colors.skin} strokeWidth={4.4} strokeLinecap="round" />
      <circle cx={headC.x} cy={headC.y} r={R} fill={colors.skin} />
      <FrontHairFill cx={headC.x} cy={headC.y} r={R} hair={look.hair} color={colors.hair} />

      {/* LE trait */}
      <path d={unionPath(parts)} stroke={DARK} strokeWidth={INK_W} fill="none" strokeLinejoin="round" />

      {/* détails */}
      <g transform={pose.tilt !== 0 ? `rotate(${pose.tilt} ${pivot.x} ${pivot.y})` : undefined}>
        <FrontFace cx={hc0.x} cy={hc0.y} turn={pose.turn} look={look} />
      </g>
    </g>
  );
}

// ---------- Gros plan visage (yeux) ----------

function FaceScene({ kind, p, staticMode, look }: { kind: FaceKind; p: number; staticMode: boolean; look: Look }) {
  const { colors } = look;
  const t = staticMode ? 0.3 : p;
  const ang = t * Math.PI * 2;
  let dx = 0, dy = 0, closed = false, hands = false, blinkNow = false;
  if (kind === "eye-circles") { dx = Math.cos(ang) * 2.8; dy = Math.sin(ang) * 2.4; }
  if (kind === "eye-eight") { dx = Math.sin(ang) * 3.2; dy = Math.sin(ang * 2) * 1.7; }
  if (kind === "eye-sweep") { dx = Math.sin(ang) * 3.2; }
  if (kind === "blink") { blinkNow = Math.sin(ang) > 0.55; }
  if (kind === "rest-closed") closed = true;
  if (kind === "palming") hands = true;
  const shut = closed || blinkNow;
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={49} rx={7.2} ry={shut ? 0.9 : 5.4} fill="#fff" stroke={DARK} strokeWidth={1.1} />
      {!shut && (
        <g>
          <circle cx={cx + dx} cy={49 + dy} r={3.1} fill="#5E7160" />
          <circle cx={cx + dx} cy={49 + dy} r={1.7} fill={DARK} />
          <circle cx={cx + dx + 0.9} cy={48 + dy - 0.6} r={0.7} fill="#fff" />
        </g>
      )}
      {shut && <path d={`M${cx - 6} 49 q 6 2.4 12 0`} stroke={DARK} strokeWidth={1.2} fill="none" strokeLinecap="round" />}
      <path d={`M${cx - 6.4} 41.5 q 6.4 -2.6 12.8 -0.4`} stroke={colors.hair} strokeWidth={1.7} strokeLinecap="round" fill="none" />
    </g>
  );
  const breath = kind === "palming" || kind === "rest-closed" ? 1 + Math.sin(ang) * 0.013 : 1;
  // contour unifié du gros plan : crâne + oreilles
  const headParts = [circle({ x: 60, y: 55 }, 31), circle({ x: 31, y: 56 }, 4.2), circle({ x: 89, y: 56 }, 4.2)];
  return (
    <g transform={`scale(${breath})`} style={{ transformOrigin: "60px 56px" }}>
      <circle cx={60} cy={55} r={31} fill={colors.skin} />
      <circle cx={31} cy={56} r={4.2} fill={colors.skin} />
      <circle cx={89} cy={56} r={4.2} fill={colors.skin} />
      <FrontHairFill cx={60} cy={51} r={31} hair={look.hair} color={colors.hair} />
      <path d={unionPath(headParts)} stroke={DARK} strokeWidth={1.2} fill="none" />
      {!hands && eye(47)}
      {!hands && eye(73)}
      <path d="M58.6 55 q 1.4 1.6 0 3" stroke={DARK} strokeWidth={0.9} fill="none" strokeLinecap="round" />
      <path d="M54 70 Q60 73.5 66 70" stroke={DARK} strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <circle cx={44} cy={64} r={2.6} fill={BLUSH} opacity={0.5} />
      <circle cx={76} cy={64} r={2.6} fill={BLUSH} opacity={0.5} />
      {hands && (
        <g>
          {[47, 73].map((cx, i) => (
            <g key={i}>
              <ellipse cx={cx} cy={50} rx={10.5} ry={13.5} fill={colors.skin} stroke={DARK} strokeWidth={1} transform={`rotate(${i ? 8 : -8} ${cx} 50)`} />
              {[-4, 0, 4].map((o) => (
                <path key={o} d={`M${cx + o} 38.5 q ${i ? 1 : -1} -4 ${i ? 2 : -2} -5.5`} stroke={colors.skin} strokeWidth={3.4} strokeLinecap="round" fill="none" />
              ))}
            </g>
          ))}
          <path d="M40 62 L30 84 M80 62 L90 84" stroke={colors.top} strokeWidth={6.5} strokeLinecap="round" />
        </g>
      )}
      {kind === "eye-sweep" && staticMode && (
        <path d="M40 32 H80 M44 29 l-4 3 4 3 M76 29 l4 3 -4 3" stroke={ACCENT} strokeWidth={2} fill="none" />
      )}
      {kind === "eye-circles" && staticMode && (
        <path d="M60 28 A 15 8 0 1 1 59 28" stroke={ACCENT} strokeWidth={2} strokeDasharray="3 3" fill="none" />
      )}
    </g>
  );
}

// ---------- Gros plan main (poignets/doigts) ----------

// Main détaillée en coordonnées globales : paume + 4 doigts (2 phalanges) +
// pouce. Rend les aplats ET fournit ses volumes pour le contour unifié.
function handGeom(x: number, y: number, curl: number, spread: number, rotDeg: number, scale: number) {
  const rot = rad(rotDeg);
  const g = (px: number, py: number): P => ({
    x: x + (px * Math.cos(rot) - py * Math.sin(rot)) * scale,
    y: y + (px * Math.sin(rot) + py * Math.cos(rot)) * scale,
  });
  const fingers = [-5.2, -1.8, 1.8, 5.2].map((fx, i) => {
    const len = [10, 12, 11, 8.5][i];
    const sp = spread * (i - 1.5) * 9;
    const c2 = curl * 70;
    const base = { x: fx, y: -12 };
    const mid = {
      x: base.x + Math.sin(rad(sp)) * len * 0.55,
      y: base.y - Math.cos(rad(sp)) * len * 0.55 * (1 - curl * 0.35),
    };
    const tip = {
      x: mid.x + Math.sin(rad(sp + c2)) * len * 0.45,
      y: mid.y - Math.cos(rad(sp + c2)) * len * 0.45 * (1 - curl * 0.55),
    };
    return { base: g(base.x, base.y), mid: g(mid.x, mid.y), tip: g(tip.x, tip.y) };
  });
  const thumb = { a: g(-7, -4), b: g(-9.5 + curl * 5, -13 + curl * 3) };
  const palmC = g(0, -6);
  return { fingers, thumb, palmC, rotDeg, scale };
}

function HandFills({ h, skin }: { h: ReturnType<typeof handGeom>; skin: string }) {
  const s = h.scale;
  return (
    <g strokeLinecap="round" fill="none">
      <ellipse cx={h.palmC.x} cy={h.palmC.y} rx={7.2 * s} ry={6.8 * s} transform={`rotate(${h.rotDeg} ${h.palmC.x} ${h.palmC.y})`} fill={skin} stroke="none" />
      {h.fingers.map((f, i) => (
        <g key={i} stroke={skin}>
          <path d={L(f.base, f.mid)} strokeWidth={3 * s} />
          <path d={L(f.mid, f.tip)} strokeWidth={2.6 * s} />
        </g>
      ))}
      <path d={L(h.thumb.a, h.thumb.b)} stroke={skin} strokeWidth={3.2 * s} />
    </g>
  );
}

function handRings(h: ReturnType<typeof handGeom>) {
  const s = h.scale;
  return [
    ellipse(h.palmC, 7.2 * s, 6.8 * s, h.rotDeg),
    ...h.fingers.flatMap((f) => [seg(f.base, f.mid, 1.55 * s, 1.4 * s, 5), seg(f.mid, f.tip, 1.35 * s, 1.15 * s, 5)]),
    seg(h.thumb.a, h.thumb.b, 1.7 * s, 1.4 * s, 5),
  ];
}

function HandsScene({ kind, p, staticMode, look }: { kind: HandsKind; p: number; staticMode: boolean; look: Look }) {
  const { colors } = look;
  const t = staticMode ? 0.85 : (p < 0.5 ? p * 2 : 2 - p * 2);
  const eased = easeInOut(t);

  const forearmFill = (a: P, b: P) => (
    <g>
      <path d={L(a, b)} stroke={colors.top} strokeWidth={12} strokeLinecap="round" fill="none" />
      <circle cx={b.x} cy={b.y} r={5.4} fill={colors.skin} />
      <path d={`M${b.x - 5} ${b.y + 2.6} a 5.4 5.4 0 0 1 10 0`} stroke={ACCENT} strokeWidth={2} fill="none" />
    </g>
  );
  const forearmRings = (a: P, b: P) => [seg(a, b, 6.2, 5.8), circle(b, 5.4)];

  if (kind === "finger-fan" || kind === "fist") {
    const curl = kind === "fist" ? eased : 0.05;
    const spread = kind === "finger-fan" ? eased : 0;
    const h = handGeom(60, 70, curl, spread, 0, 2.1);
    const fa = { x: 60, y: 112 }, fb = { x: 60, y: 84 };
    return (
      <g>
        {forearmFill(fa, fb)}
        <HandFills h={h} skin={colors.skin} />
        <path d={unionPath([...forearmRings(fa, fb), ...handRings(h)])} stroke={DARK} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
        <path d={kind === "finger-fan" ? "M28 30 A 36 36 0 0 1 92 30" : "M40 26 L60 40 M80 26 L60 40"}
          stroke={ACCENT} strokeWidth={2.6} strokeLinecap="round" fill="none" markerEnd="url(#m-arrowhead)" />
      </g>
    );
  }

  if (kind === "prayer" || kind === "prayer-inv") {
    const inv = kind === "prayer-inv";
    const dy = eased * 8 * (inv ? -1 : 1);
    const cy = 58 + dy;
    const h1 = handGeom(53, cy + 12, 0.04, 0, inv ? 190 : -10, 1.55);
    const h2 = handGeom(67, cy + 12, 0.04, 0, inv ? 170 : 10, 1.55);
    const f1 = { a: { x: 22, y: 104 }, b: { x: 46, y: cy + 16 } };
    const f2 = { a: { x: 98, y: 104 }, b: { x: 74, y: cy + 16 } };
    return (
      <g>
        {forearmFill(f1.a, f1.b)}
        {forearmFill(f2.a, f2.b)}
        <HandFills h={h1} skin={colors.skin} />
        <HandFills h={h2} skin={colors.skin} />
        <path
          d={unionPath([...forearmRings(f1.a, f1.b), ...forearmRings(f2.a, f2.b), ...handRings(h1), ...handRings(h2)])}
          stroke={DARK} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
        {[36, 84].map((x) => (
          <path key={x} d={inv ? `M${x} ${cy + 8} L${x} ${cy - 8}` : `M${x} ${cy - 6} L${x} ${cy + 10}`}
            stroke={ACCENT} strokeWidth={2.6} markerEnd="url(#m-arrowhead)" fill="none" />
        ))}
      </g>
    );
  }

  const wrist = { x: 58, y: 62 };
  const rot =
    kind === "wrist-flex" ? lerp(95, 148, eased)
    : kind === "wrist-ext" ? lerp(85, 32, eased)
    : kind === "wrist-circles" ? 90 + Math.sin(p * Math.PI * 2) * 46
    : kind === "shake" ? 90 + Math.sin(p * Math.PI * 10) * 18
    : 90;
  const curl = kind === "forearm-massage" ? 0.3 : kind === "thumb" ? 0.15 : 0.06;
  const h = handGeom(wrist.x + 4, wrist.y, curl, 0, rot, 1.9);
  const fa = { x: 14, y: 74 }, fb = { x: wrist.x - 4, y: wrist.y + 2 };
  return (
    <g>
      {forearmFill(fa, fb)}
      <HandFills h={h} skin={colors.skin} />
      <path d={unionPath([...forearmRings(fa, fb), ...handRings(h)])} stroke={DARK} strokeWidth={1.3} fill="none" strokeLinejoin="round" />
      {kind === "flip" && (
        <path d="M92 44 A 13 13 0 1 1 92 70" stroke={ACCENT} strokeWidth={2.6} strokeDasharray="4 4" fill="none" markerEnd="url(#m-arrowhead)" />
      )}
      {(kind === "wrist-flex" || kind === "wrist-ext") && (
        <path d={kind === "wrist-flex" ? "M96 48 A 22 22 0 0 1 90 78" : "M90 76 A 22 22 0 0 0 95 46"}
          stroke={ACCENT} strokeWidth={2.6} fill="none" markerEnd="url(#m-arrowhead)" />
      )}
      {kind === "wrist-circles" && (
        <path d="M92 42 A 14 14 0 1 1 76 36" stroke={ACCENT} strokeWidth={2.6} strokeDasharray="4 4" fill="none" markerEnd="url(#m-arrowhead)" />
      )}
      {kind === "thumb" && (
        <circle cx={wrist.x - 10} cy={wrist.y - 16 + (staticMode ? 2 : Math.floor(p * 4) * 3 - 4)} r={2.8} fill={ACCENT} />
      )}
      {kind === "forearm-massage" && (
        <g>
          <ellipse cx={lerp(26, 46, eased)} cy={78} rx={6.5} ry={8.5} fill={colors.skin} stroke={DARK} strokeWidth={1} opacity={0.9} />
          <path d="M24 58 H50" stroke={ACCENT} strokeWidth={2.6} markerEnd="url(#m-arrowhead)" fill="none" />
        </g>
      )}
      {kind === "shake" && <path d="M86 36 l7 -5 M86 44 l9 0 M86 52 l7 5" stroke={ACCENT} strokeWidth={2.6} fill="none" />}
    </g>
  );
}

// ---------- Zoom vignette par zone ----------

function zoomBox(motion: Motion, zone: HighlightZone): string {
  if (motion.view === "face" || motion.view === "hands") return "0 0 120 120";
  const stand = motion.view === "side" && Boolean(motion.stand);
  const dy = stand ? -22 : 0;
  const front = motion.view === "front";
  switch (zone) {
    case "yeux":
    case "tete":
    case "nuque":
      return front ? "34 2 52 52" : `36 ${8 + dy} 52 52`;
    case "epaules":
    case "poitrine":
    case "haut-dos":
      return front ? "24 8 66 66" : `26 ${14 + dy} 66 66`;
    case "ventre":
    case "bas-dos":
    case "hanches":
      return front ? "24 34 70 70" : `24 ${36 + dy} 70 70`;
    case "poignets":
      return front ? "18 30 80 80" : "40 30 74 74";
    case "jambes":
      return front ? "24 46 74 74" : "38 44 78 78";
    default:
      return "6 2 112 112";
  }
}

// ---------- Composant principal ----------

export function ExerciseFigure({
  motion: motionId,
  size = 120,
  animate = false,
  className = "",
  zoom,
}: {
  motion: MotionId;
  size?: number;
  animate?: boolean;
  className?: string;
  zoom?: boolean; // vignette : cadre la zone travaillée
}) {
  const motion = MOTIONS[motionId] as Motion;
  const look = useLook();
  const [phase, setPhase] = useState(0);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const running = animate && !reduced.current;

  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const t0 = performance.now();
    const cycle = motion.hold ? 3800 : 2600;
    const loop = (t: number) => {
      setPhase(((t - t0) % cycle) / cycle);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, motion.hold]);

  let k = phase * 2;
  k = k < 1 ? k : 2 - k;
  if (motion.hold) k = Math.min(1, k * 1.5);
  const eased = easeInOut(k);
  const staticMode = !running;

  let body: React.ReactNode = null;
  if (motion.view === "side") {
    const defs = sideDefaults(Boolean(motion.stand));
    const frames = motion.frames.map((f) => mergeSide(defs, f));
    const poseAt = (tt: number) => {
      if (frames.length === 1) return frames[0];
      const s = tt * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(s));
      return lerpSide(frames[i], frames[i + 1], s - i);
    };
    body = (
      <>
        <SideScene stand={motion.stand} desk={motion.desk} />
        <SideBody pose={staticMode ? frames[frames.length - 1] : poseAt(eased)}
          stand={Boolean(motion.stand)} target={motion.target} look={look} />
      </>
    );
  } else if (motion.view === "front") {
    const frames = motion.frames.map(mergeFront);
    const poseAt = (tt: number) => {
      if (frames.length === 1) return frames[0];
      const s = tt * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(s));
      return lerpFront(frames[i], frames[i + 1], s - i);
    };
    body = <FrontBody pose={staticMode ? frames[frames.length - 1] : poseAt(eased)} look={look} />;
  } else if (motion.view === "face") {
    body = <FaceScene kind={motion.kind} p={phase} staticMode={staticMode} look={look} />;
  } else {
    body = <HandsScene kind={motion.kind} p={phase} staticMode={staticMode} look={look} />;
  }

  const vb = zoom ? zoomBox(motion, motion.highlight) : "0 0 120 120";

  return (
    <svg viewBox={vb} width={size} height={size} className={className} role="img" aria-hidden="true" fill="none">
      <rect x={-30} y={-30} width={180} height={180} fill="var(--m-soft)" opacity={0.5} />
      {!zoom && <ellipse cx={60} cy={107} rx={36} ry={4.5} fill="var(--m-ink)" opacity={0.07} />}
      {body}
      {!zoom &&
        motion.arrows?.map((d, i) => (
          <path key={i} d={d} stroke={ACCENT} strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.95}
            strokeDasharray={running ? "6 5" : undefined} markerEnd="url(#m-arrowhead)"
            style={running ? { animation: "m-arrow-dash 1.1s linear infinite" } : undefined} />
        ))}
      <defs>
        <marker id="m-arrowhead" markerWidth="8" markerHeight="8" refX="5.5" refY="4" orient="auto">
          <path d="M0 0.5 L8 4 L0 7.5 Z" fill={ACCENT} />
        </marker>
      </defs>
    </svg>
  );
}
