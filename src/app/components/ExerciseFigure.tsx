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

// Figure d'exercice lisible sans texte :
//  - statique : pose de départ en fantôme + pose finale pleine + flèches de mouvement
//  - animée (lecteur/recommandation) : interpolation fluide entre poses clés
//  - zone travaillée mise en évidence par un halo
// Quatre vues : profil, face, visage (yeux), mains (poignets).

const rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

type P = { x: number; y: number };

// ---------- Poses complètes ----------

interface FullSide {
  torso: number; head: number; headX: number; shoulderLift: number; shoulderShift: number;
  armNear: { sh: number; el: number } | null; armFar: { sh: number; el: number } | null;
  thigh: number; shin: number; foot: number; thighFar: number; shinFar: number; footFar: number;
  pelvisY: number; belly: number; gaze: number;
}

function sideDefaults(stand: boolean): FullSide {
  return stand
    ? {
        torso: 0, head: 0, headX: 0, shoulderLift: 0, shoulderShift: 0,
        armNear: { sh: 10, el: 8 }, armFar: { sh: 6, el: 10 },
        thigh: -78, shin: 2, foot: 0, thighFar: -78, shinFar: 2, footFar: 0,
        pelvisY: 0, belly: 0, gaze: 1,
      }
    : {
        torso: 0, head: 0, headX: 0, shoulderLift: 0, shoulderShift: 0,
        armNear: { sh: 34, el: 58 }, armFar: { sh: 30, el: 62 },
        thigh: 0, shin: 0, foot: 0, thighFar: 0, shinFar: 0, footFar: 0,
        pelvisY: 0, belly: 0, gaze: 1,
      };
}

function mergeSide(base: FullSide, p: SidePose): FullSide {
  return {
    ...base,
    ...p,
    armNear: p.armNear === undefined ? base.armNear : p.armNear,
    armFar: p.armFar === undefined ? base.armFar : p.armFar,
  } as FullSide;
}

function lerpArm(
  a: { sh: number; el: number } | null,
  b: { sh: number; el: number } | null,
  t: number,
) {
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
  return {
    ...FRONT_DEFAULTS,
    ...p,
    armL: p.armL === undefined ? FRONT_DEFAULTS.armL : p.armL,
    armR: p.armR === undefined ? FRONT_DEFAULTS.armR : p.armR,
  } as FullFront;
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

// ---------- Cinématique (vue de profil) ----------

const TORSO_L = 27, NECK = 5, HEAD_R = 8, UA = 13, FA = 12, THIGH = 23, SHIN = 25, FOOT = 8;

interface SideJoints {
  pelvis: P; shoulder: P; headC: P;
  elbowN: P | null; handN: P | null; elbowF: P | null; handF: P | null;
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
    if (!spec) return { elbow: null as P | null, hand: null as P | null };
    const a1 = rad(pose.torso + spec.sh);
    const elbow = { x: shoulder.x + Math.sin(a1) * UA, y: shoulder.y + Math.cos(a1) * UA };
    const a2 = a1 + rad(spec.el);
    const hand = { x: elbow.x + Math.sin(a2) * FA, y: elbow.y + Math.cos(a2) * FA };
    return { elbow, hand };
  };
  const nearArm = arm(pose.armNear);
  const farArm = arm(pose.armFar);
  const leg = (th: number, sh: number, ft: number) => {
    const knee = { x: pelvis.x + Math.cos(rad(th)) * THIGH, y: pelvis.y - Math.sin(rad(th)) * THIGH };
    const a3 = rad(sh);
    const ankle = { x: knee.x + Math.sin(a3) * SHIN, y: knee.y + Math.cos(a3) * SHIN };
    const toe = { x: ankle.x + Math.cos(rad(ft)) * FOOT, y: ankle.y - Math.sin(rad(ft)) * FOOT };
    return { knee, ankle, toe };
  };
  const nearLeg = leg(pose.thigh, pose.shin, pose.foot);
  const farLeg = leg(pose.thighFar, pose.shinFar, pose.footFar);
  const belly = {
    x: pelvis.x + (shoulder.x - pelvis.x) * 0.42 + 5,
    y: pelvis.y + (shoulder.y - pelvis.y) * 0.42,
  };
  return {
    pelvis, shoulder, headC,
    elbowN: nearArm.elbow, handN: nearArm.hand, elbowF: farArm.elbow, handF: farArm.hand,
    kneeN: nearLeg.knee, ankleN: nearLeg.ankle, toeN: nearLeg.toe,
    kneeF: farLeg.knee, ankleF: farLeg.ankle, toeF: farLeg.toe,
    belly,
  };
}

const L = (a: P, b: P) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

function SideBody({ pose, stand, ghost, target }: { pose: FullSide; stand: boolean; ghost?: boolean; target?: boolean }) {
  const j = solveSide(pose, stand);
  const stroke = "var(--m-strong)";
  const op = ghost ? 0.3 : 1;
  const gazeTarget = { x: lerp(80, 106, pose.gaze), y: lerp(42, 20, pose.gaze) };
  return (
    <g opacity={op} strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* membres éloignés (très estompés : pas de confusion avec le mouvement) */}
      <g stroke={stroke} opacity={0.2}>
        <path d={L({ x: j.pelvis.x - 3, y: j.pelvis.y }, { x: j.kneeF.x - 3, y: j.kneeF.y })} strokeWidth={6} />
        <path d={L({ x: j.kneeF.x - 3, y: j.kneeF.y }, { x: j.ankleF.x - 3, y: j.ankleF.y })} strokeWidth={6} />
        <path d={L({ x: j.ankleF.x - 3, y: j.ankleF.y }, { x: j.toeF.x - 3, y: j.toeF.y })} strokeWidth={5} />
        {j.elbowF && j.handF && (
          <>
            <path d={L({ x: j.shoulder.x - 3, y: j.shoulder.y }, { x: j.elbowF.x - 3, y: j.elbowF.y })} strokeWidth={5} />
            <path d={L({ x: j.elbowF.x - 3, y: j.elbowF.y }, { x: j.handF.x - 3, y: j.handF.y })} strokeWidth={5} />
          </>
        )}
      </g>
      {/* buste + respiration */}
      <path d={L(j.pelvis, j.shoulder)} stroke={stroke} strokeWidth={8.5} />
      {pose.belly > 0.02 && (
        <circle cx={j.belly.x} cy={j.belly.y} r={3.5 + pose.belly * 4} stroke="var(--m-accent)" strokeWidth={2} opacity={0.75} />
      )}
      {/* jambe proche */}
      <g stroke={stroke}>
        <path d={L(j.pelvis, j.kneeN)} strokeWidth={7} />
        <path d={L(j.kneeN, j.ankleN)} strokeWidth={7} />
        <path d={L(j.ankleN, j.toeN)} strokeWidth={5.5} />
      </g>
      {/* bras proche */}
      {j.elbowN && j.handN && (
        <g stroke={stroke}>
          <path d={L(j.shoulder, j.elbowN)} strokeWidth={5.5} />
          <path d={L(j.elbowN, j.handN)} strokeWidth={5.5} />
          <circle cx={j.handN.x} cy={j.handN.y} r={3.2} fill={stroke} stroke="none" />
        </g>
      )}
      {/* tête + nuque */}
      <path
        d={L(j.shoulder, { x: (j.shoulder.x + j.headC.x) / 2, y: (j.shoulder.y + j.headC.y) / 2 })}
        stroke={stroke}
        strokeWidth={5}
      />
      <circle cx={j.headC.x} cy={j.headC.y} r={HEAD_R + 0.5} fill={stroke} stroke="none" />
      {/* cible visuelle */}
      {target && !ghost && (
        <g>
          <path
            d={L({ x: j.headC.x + 7, y: j.headC.y - 1 }, gazeTarget)}
            stroke="var(--m-accent)"
            strokeWidth={1.8}
            strokeDasharray="3 4"
          />
          <circle cx={gazeTarget.x} cy={gazeTarget.y} r={4} fill="var(--m-accent)" stroke="none" />
        </g>
      )}
    </g>
  );
}

function SideScene({ stand, desk }: { stand?: boolean; desk?: boolean }) {
  return (
    <g stroke="var(--m-ink2)" strokeWidth={3.5} strokeLinecap="round" opacity={0.4} fill="none">
      {!stand && (
        <>
          <path d="M30 79 L66 79" />
          <path d="M31 79 L31 48" />
          <path d="M36 79 L36 106" />
          <path d="M62 79 L62 106" />
        </>
      )}
      {stand && <path d="M28 106 L104 106" strokeWidth={2.5} opacity={0.8} />}
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

function FrontBody({ pose, ghost }: { pose: FullFront; ghost?: boolean }) {
  const stroke = "var(--m-strong)";
  const op = ghost ? 0.26 : 1;
  const shY = 45 - pose.shrug * 5 - pose.grow * 3;
  const hipY = 80;
  const shL = { x: 45, y: shY };
  const shR = { x: 75, y: shY };
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
  const twistDeg = pose.twist * 16;
  const headC = { x: 60 + pose.turn * 2, y: 26 + pose.nod * 0.4 - pose.grow * 4 };
  const kneeAngle = rad(10 + pose.knees * 26);
  return (
    <g
      opacity={op}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      transform={pose.bend !== 0 ? `rotate(${pose.bend} 60 ${hipY})` : undefined}
    >
      {/* buste (rotation = léger pivot du groupe épaules) */}
      <g transform={twistDeg !== 0 ? `rotate(${twistDeg * 0.4} 60 ${shY + 16}) translate(${pose.twist * 2} 0)` : undefined}>
        <path d={L(shL, shR)} stroke={stroke} strokeWidth={7} />
        <path d={L({ x: 60, y: shY + 2 }, { x: 60 + pose.hipShift * 6, y: hipY })} stroke={stroke} strokeWidth={7} />
        {aL && (
          <g stroke={stroke} strokeWidth={5}>
            <path d={L(aL.s, aL.elbow)} />
            <path d={L(aL.elbow, aL.hand)} />
            <circle cx={aL.hand.x} cy={aL.hand.y} r={3} fill={stroke} stroke="none" />
          </g>
        )}
        {aR && (
          <g stroke={stroke} strokeWidth={5}>
            <path d={L(aR.s, aR.elbow)} />
            <path d={L(aR.elbow, aR.hand)} />
            <circle cx={aR.hand.x} cy={aR.hand.y} r={3} fill={stroke} stroke="none" />
          </g>
        )}
        {/* tête */}
        <g transform={pose.tilt !== 0 ? `rotate(${pose.tilt} 60 ${shY - 6})` : undefined}>
          <circle cx={headC.x} cy={headC.y} r={9} fill={stroke} stroke="none" />
          {/* regard (rotation de la tête) */}
          <circle cx={headC.x + pose.turn * 4 - 2.6} cy={headC.y - 1} r={1.2} fill="var(--m-bg)" stroke="none" />
          <circle cx={headC.x + pose.turn * 4 + 2.6} cy={headC.y - 1} r={1.2} fill="var(--m-bg)" stroke="none" />
        </g>
      </g>
      {/* bassin + jambes (assis, de face) */}
      <path
        d={L({ x: 48 + pose.hipShift * 6, y: hipY + 3 }, { x: 72 + pose.hipShift * 6, y: hipY + 3 })}
        stroke={stroke}
        strokeWidth={7}
      />
      <path
        d={L({ x: 52 + pose.hipShift * 5, y: hipY + 6 }, { x: 52 + pose.hipShift * 5 - Math.sin(kneeAngle) * 20, y: hipY + 6 + Math.cos(kneeAngle) * 20 })}
        stroke={stroke}
        strokeWidth={5.5}
      />
      <path
        d={L({ x: 68 + pose.hipShift * 5, y: hipY + 6 }, { x: 68 + pose.hipShift * 5 + Math.sin(kneeAngle) * 20, y: hipY + 6 + Math.cos(kneeAngle) * 20 })}
        stroke={stroke}
        strokeWidth={5.5}
      />
    </g>
  );
}

// ---------- Vue visage (yeux) ----------

function FaceScene({ kind, p, staticMode }: { kind: FaceKind; p: number; staticMode: boolean }) {
  const stroke = "var(--m-strong)";
  const t = staticMode ? 0.3 : p;
  const ang = t * Math.PI * 2;
  let dx = 0, dy = 0, lid = 0, closed = false, hands = false;
  if (kind === "eye-circles") { dx = Math.cos(ang) * 3; dy = Math.sin(ang) * 2.6; }
  if (kind === "eye-eight") { dx = Math.sin(ang) * 3.4; dy = Math.sin(ang * 2) * 1.8; }
  if (kind === "eye-sweep") { dx = Math.sin(ang) * 3.4; }
  if (kind === "blink") { lid = Math.max(0, Math.sin(ang)); }
  if (kind === "rest-closed") { closed = true; }
  if (kind === "palming") { hands = true; }
  const breath = kind === "palming" || kind === "rest-closed" ? 1 + Math.sin(ang) * 0.015 : 1;
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={48} rx={7} ry={lid > 0.6 || closed ? 0.8 : 5} stroke={stroke} strokeWidth={2} fill="var(--m-card)" />
      {!(lid > 0.6 || closed) && <circle cx={cx + dx} cy={48 + dy} r={2.6} fill={stroke} stroke="none" />}
    </g>
  );
  return (
    <g fill="none" strokeLinecap="round" transform={`scale(${breath})`} style={{ transformOrigin: "60px 56px" }}>
      <circle cx={60} cy={54} r={29} stroke={stroke} strokeWidth={3} />
      <path d="M31 52 Q27 54 31 58" stroke={stroke} strokeWidth={2.5} />
      <path d="M89 52 Q93 54 89 58" stroke={stroke} strokeWidth={2.5} />
      {!hands && eye(48)}
      {!hands && eye(72)}
      {!hands && <path d="M54 68 Q60 71 66 68" stroke={stroke} strokeWidth={2} opacity={0.7} />}
      {hands && (
        <g>
          <ellipse cx={47} cy={50} rx={11} ry={14} fill="var(--m-accent)" opacity={0.85} transform="rotate(-8 47 50)" />
          <ellipse cx={73} cy={50} rx={11} ry={14} fill="var(--m-accent)" opacity={0.85} transform="rotate(8 73 50)" />
          <path d="M40 62 L30 84" stroke={stroke} strokeWidth={5} />
          <path d="M80 62 L90 84" stroke={stroke} strokeWidth={5} />
        </g>
      )}
      {kind === "eye-sweep" && staticMode && (
        <path d="M40 34 H80 M44 31 l-4 3 4 3 M76 31 l4 3 -4 3" stroke="var(--m-accent)" strokeWidth={2} />
      )}
      {kind === "eye-circles" && staticMode && (
        <path d="M60 30 A 15 8 0 1 1 59 30" stroke="var(--m-accent)" strokeWidth={2} strokeDasharray="3 3" />
      )}
    </g>
  );
}

// ---------- Vue mains (poignets) ----------

function HandsScene({ kind, p, staticMode }: { kind: HandsKind; p: number; staticMode: boolean }) {
  const stroke = "var(--m-strong)";
  const t = staticMode ? 0.85 : (p < 0.5 ? p * 2 : 2 - p * 2);
  const eased = easeInOut(t);

  // ---- Éventail / poing : une grande main de face, immédiatement lisible ----
  if (kind === "finger-fan" || kind === "fist") {
    const open = kind === "finger-fan" ? eased : 1 - eased;
    const palm = { x: 60, y: 76 };
    return (
      <g fill="none" strokeLinecap="round">
        <path d="M60 110 L60 88" stroke={stroke} strokeWidth={13} />
        <ellipse cx={palm.x} cy={palm.y} rx={13} ry={14} stroke={stroke} strokeWidth={4.5} fill="var(--m-card)" />
        {[-2, -1, 0, 1, 2].map((i) => {
          const ang = rad(i * (5 + open * 10));
          const len = 8 + open * 13;
          const x0 = palm.x + i * 4.8;
          const y0 = palm.y - 12.5;
          return (
            <path
              key={i}
              d={`M${x0} ${y0} L${(x0 + Math.sin(ang) * len).toFixed(1)} ${(y0 - Math.cos(ang) * len).toFixed(1)}`}
              stroke={stroke}
              strokeWidth={4.2}
            />
          );
        })}
        <path
          d={`M${palm.x - 12.5} ${palm.y - 2} L${(palm.x - 17 - open * 5).toFixed(1)} ${(palm.y - 9 - open * 3).toFixed(1)}`}
          stroke={stroke}
          strokeWidth={4.2}
        />
        <path
          d={kind === "finger-fan" ? "M30 34 A 32 32 0 0 1 90 34" : "M42 32 L60 44 M78 32 L60 44"}
          stroke="var(--m-accent)"
          strokeWidth={3}
          strokeLinecap="round"
          markerEnd="url(#m-arrowhead)"
        />
      </g>
    );
  }

  // ---- Prière : deux paumes jointes au centre, mouvement vertical clair ----
  if (kind === "prayer" || kind === "prayer-inv") {
    const inv = kind === "prayer-inv";
    const dy = eased * 7 * (inv ? -1 : 1);
    const cy = 60 + dy;
    return (
      <g fill="none" strokeLinecap="round">
        <path d={`M26 102 L49 ${cy + 15}`} stroke={stroke} strokeWidth={10} />
        <path d={`M94 102 L71 ${cy + 15}`} stroke={stroke} strokeWidth={10} />
        <rect x={48.5} y={inv ? cy - 4 : cy - 22} width={11} height={28} rx={5.5} stroke={stroke} strokeWidth={4} fill="var(--m-card)" />
        <rect x={60.5} y={inv ? cy - 4 : cy - 22} width={11} height={28} rx={5.5} stroke={stroke} strokeWidth={4} fill="var(--m-card)" />
        <path
          d={inv ? `M36 ${cy + 6} L36 ${cy - 8}` : `M36 ${cy - 4} L36 ${cy + 10}`}
          stroke="var(--m-accent)"
          strokeWidth={3}
          markerEnd="url(#m-arrowhead)"
        />
        <path
          d={inv ? `M84 ${cy + 6} L84 ${cy - 8}` : `M84 ${cy - 4} L84 ${cy + 10}`}
          stroke="var(--m-accent)"
          strokeWidth={3}
          markerEnd="url(#m-arrowhead)"
        />
      </g>
    );
  }

  // ---- Profil « avant-bras + main » : étirements, cercles, rotations ----
  const wrist = { x: 60, y: 62 };
  const rot =
    kind === "wrist-flex" ? lerp(5, 55, eased)
    : kind === "wrist-ext" ? lerp(-5, -55, eased)
    : kind === "wrist-circles" ? Math.sin(p * Math.PI * 2) * 45
    : kind === "shake" ? Math.sin(p * Math.PI * 10) * 18
    : 0;
  const flip = kind === "flip" ? Math.cos(p * Math.PI * 2) : 1;
  const slide = kind === "forearm-massage" ? lerp(26, 48, eased) : 0;
  return (
    <g fill="none" strokeLinecap="round">
      {/* avant-bras bien identifiable */}
      <path d={`M14 72 L${wrist.x - 3} ${wrist.y + 3}`} stroke={stroke} strokeWidth={11} />
      {/* main : paume + 4 doigts parallèles, pivotant autour du poignet */}
      <g transform={`rotate(${rot.toFixed(1)} ${wrist.x} ${wrist.y})`}>
        <ellipse
          cx={wrist.x + 9}
          cy={wrist.y - 1}
          rx={Math.max(3, 7.5 * Math.abs(flip))}
          ry={9.5}
          stroke={stroke}
          strokeWidth={4}
          fill="var(--m-card)"
          transform={`rotate(74 ${wrist.x + 9} ${wrist.y - 1})`}
        />
        {[-5, -1.7, 1.7, 5].map((o) => (
          <path
            key={o}
            d={`M${wrist.x + 15} ${wrist.y - 1 + o * 0.75} L${wrist.x + 28} ${wrist.y - 2 + o}`}
            stroke={stroke}
            strokeWidth={3.8}
          />
        ))}
        {kind === "flip" && flip > 0.2 && (
          <circle cx={wrist.x + 9} cy={wrist.y - 1} r={2.2} fill="var(--m-accent)" stroke="none" />
        )}
      </g>
      {/* indications par exercice */}
      {(kind === "wrist-flex" || kind === "wrist-ext") && (
        <g>
          {/* l'autre main qui tire, esquissée */}
          <ellipse
            cx={94}
            cy={kind === "wrist-flex" ? 84 : 40}
            rx={7}
            ry={9}
            stroke={stroke}
            strokeWidth={3.5}
            opacity={0.5}
          />
          <path
            d={kind === "wrist-flex" ? "M98 52 A 20 20 0 0 1 93 76" : "M98 74 A 20 20 0 0 0 93 48"}
            stroke="var(--m-accent)"
            strokeWidth={3}
            markerEnd="url(#m-arrowhead)"
          />
        </g>
      )}
      {kind === "wrist-circles" && (
        <path d="M92 44 A 13 13 0 1 1 78 38" stroke="var(--m-accent)" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#m-arrowhead)" />
      )}
      {kind === "flip" && (
        <path d="M96 46 A 12 12 0 1 1 96 70" stroke="var(--m-accent)" strokeWidth={3} strokeDasharray="4 4" markerEnd="url(#m-arrowhead)" />
      )}
      {kind === "thumb" && (
        <circle
          cx={wrist.x + 26}
          cy={wrist.y - 5 + (staticMode ? 2 : Math.floor(p * 4) * 3 - 4)}
          r={3}
          fill="var(--m-accent)"
          stroke="none"
        />
      )}
      {kind === "forearm-massage" && (
        <g>
          <ellipse cx={slide} cy={66} rx={7.5} ry={9.5} stroke={stroke} strokeWidth={3.5} opacity={0.8} fill="var(--m-card)" />
          <path d="M26 50 H52" stroke="var(--m-accent)" strokeWidth={3} markerEnd="url(#m-arrowhead)" />
        </g>
      )}
      {kind === "shake" && (
        <path d="M88 38 l7 -5 M88 46 l9 0 M88 54 l7 5" stroke="var(--m-accent)" strokeWidth={3} />
      )}
    </g>
  );
}

// ---------- Halo de zone ----------

function zoneAnchor(motion: Motion, zone: HighlightZone): P {
  if (motion.view === "face") return { x: 60, y: 48 };
  if (motion.view === "hands") return { x: 60, y: 64 };
  if (motion.view === "front") {
    const map: Partial<Record<HighlightZone, P>> = {
      tete: { x: 60, y: 26 }, yeux: { x: 60, y: 26 }, nuque: { x: 60, y: 37 },
      epaules: { x: 60, y: 45 }, "haut-dos": { x: 60, y: 54 }, poitrine: { x: 60, y: 52 },
      "bas-dos": { x: 60, y: 76 }, hanches: { x: 60, y: 82 }, jambes: { x: 60, y: 96 },
      ventre: { x: 60, y: 66 }, corps: { x: 60, y: 56 }, poignets: { x: 60, y: 70 },
    };
    return map[zone] ?? { x: 60, y: 56 };
  }
  const stand = "stand" in motion && motion.stand;
  const dy = stand ? -22 : 0;
  const map: Partial<Record<HighlightZone, P>> = {
    tete: { x: 62, y: 31 + dy }, yeux: { x: 65, y: 30 + dy }, nuque: { x: 58, y: 41 + dy },
    epaules: { x: 55, y: 48 + dy }, "haut-dos": { x: 50, y: 56 + dy }, poitrine: { x: 61, y: 55 + dy },
    "bas-dos": { x: 50, y: 69 + dy }, hanches: { x: 54, y: 76 + dy }, jambes: { x: 72, y: 90 },
    poignets: { x: 78, y: 62 + dy }, ventre: { x: 60, y: 64 + dy }, corps: { x: 58, y: 58 + dy },
  };
  return map[zone] ?? { x: 58, y: 58 };
}

// ---------- Composant principal ----------

export function ExerciseFigure({
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

  // phase → position dans la séquence de poses (aller-retour, pause si étirement tenu)
  let k = phase * 2;
  k = k < 1 ? k : 2 - k;
  if (motion.hold) k = Math.min(1, k * 1.5); // plateau en fin d'amplitude
  const eased = easeInOut(k);

  const anchor = zoneAnchor(motion, motion.highlight);
  const staticMode = !running;

  let body: React.ReactNode = null;
  if (motion.view === "side") {
    const defs = sideDefaults(Boolean(motion.stand));
    const frames = motion.frames.map((f) => mergeSide(defs, f));
    const poseAt = (tt: number) => {
      if (frames.length === 1) return frames[0];
      const seg = tt * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(seg));
      return lerpSide(frames[i], frames[i + 1], seg - i);
    };
    body = (
      <>
        <SideScene stand={motion.stand} desk={motion.desk} />
        <SideBody
          pose={staticMode ? frames[frames.length - 1] : poseAt(eased)}
          stand={Boolean(motion.stand)}
          target={motion.target}
        />
      </>
    );
  } else if (motion.view === "front") {
    const frames = motion.frames.map(mergeFront);
    const poseAt = (tt: number) => {
      if (frames.length === 1) return frames[0];
      const seg = tt * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(seg));
      return lerpFront(frames[i], frames[i + 1], seg - i);
    };
    body = <FrontBody pose={staticMode ? frames[frames.length - 1] : poseAt(eased)} />;
  } else if (motion.view === "face") {
    body = <FaceScene kind={motion.kind} p={phase} staticMode={staticMode} />;
  } else {
    body = <HandsScene kind={motion.kind} p={phase} staticMode={staticMode} />;
  }

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-hidden="true"
      fill="none"
    >
      {/* Cadre commun à toutes les illustrations : même DA partout */}
      <rect x={6} y={6} width={108} height={108} rx={22} fill="var(--m-soft)" opacity={0.55} />
      <ellipse cx={60} cy={107} rx={36} ry={4.5} fill="var(--m-ink)" opacity={0.07} />
      {/* halo de la zone travaillée */}
      <circle cx={anchor.x} cy={anchor.y} r={14} fill="var(--m-accent)" opacity={0.18} />
      <circle cx={anchor.x} cy={anchor.y} r={6.5} fill="var(--m-accent)" opacity={0.22} />
      {body}
      {/* flèches de mouvement : pleines en statique, animées dans le lecteur */}
      {motion.arrows?.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke="var(--m-accent)"
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
          opacity={0.95}
          strokeDasharray={running ? "6 5" : undefined}
          markerEnd="url(#m-arrowhead)"
          style={running ? { animation: "m-arrow-dash 1.1s linear infinite" } : undefined}
        />
      ))}
      <defs>
        <marker id="m-arrowhead" markerWidth="8" markerHeight="8" refX="5.5" refY="4" orient="auto">
          <path d="M0 0.5 L8 4 L0 7.5 Z" fill="var(--m-accent)" />
        </marker>
      </defs>
    </svg>
  );
}
