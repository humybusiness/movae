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
import rigData from "../data/avatar-rig.json";
import { circle, ellipse, seg, unionPath, type P } from "./outline";
import { defaultAvatar, useMovaeMaybe } from "../state/store";
import type { AvatarColors, HairId } from "../types";

// ============================================================================
// Le personnage 2D Movaé — les VRAIS dessins, articulés (cut-out).
//
// Les planches générées (homme/femme, face + profil) sont découpées en pièces
// (tête, torse, bras, avant-bras+main, cuisse, tibia, pied...) par
// scripts/cut_avatar.py, avec pivots aux articulations (rig.json). Ici on
// anime ces pièces par rotations imbriquées, pilotées par motions.ts — le
// personnage affiché EST l'illustration d'origine, dans tous les plans
// (face, profil), avec gros plans vectoriels pour yeux et mains/doigts.
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

function useLook(): Look {
  const store = useMovaeMaybe();
  const a = store?.state.avatar ?? defaultAvatar();
  return { colors: a.colors, hair: a.hair, equipped: a.equipped };
}

const FEMALE_HAIRS: HairId[] = ["mi-long", "chignon", "queue", "boucles"];
const bodyOf = (hair: HairId) => (FEMALE_HAIRS.includes(hair) ? "f" : "m");

// ---------- Rig bitmap ----------

interface RigPiece { x: number; y: number; w: number; h: number; pivot: number[]; parent: string | null; z: number }
interface RigView { pelvis: number[]; ground: number; pieces: Record<string, RigPiece> }
const RIG = rigData as unknown as Record<string, RigView>;

const AV = (b: string, v: string, n: string) => `${import.meta.env.BASE_URL}avatar2d/${b}/${v}/${n}.webp`;

function Px({ b, v, n, far = false }: { b: string; v: string; n: string; far?: boolean }) {
  const p = RIG[`${b}.${v}`].pieces[n];
  return (
    <image
      href={AV(b, v, far ? `${n}_far` : n)}
      x={p.x} y={p.y} width={p.w} height={p.h}
      preserveAspectRatio="none"
    />
  );
}

const R = (a: number, p: number[]) => `rotate(${a.toFixed(2)} ${p[0]} ${p[1]})`;

// ---------- Poses complètes (cinématique motions.ts, inchangée) ----------

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

// ---------- Vue de PROFIL (pièces bitmap, FK imbriquée) ----------

const S_SIDE = 0.094;

function CutSide({ pose, stand, target, body }: { pose: FullSide; stand: boolean; target?: boolean; body: string }) {
  const rig = RIG[`${body}.side`];
  const Pc = (n: string) => rig.pieces[n];
  const s = S_SIDE;
  const px0 = 54, py0 = (stand ? 54 : 76) + pose.pelvisY;
  const tx = px0 - rig.pelvis[0] * s;
  const ty = py0 - rig.pelvis[1] * s;

  // angles (rest bitmap = debout, bras le long du corps)
  const hipN = -(pose.thigh + 78);
  const kneeN = 78 + pose.thigh - pose.shin;
  const ankN = pose.shin - pose.foot - 2;
  const hipF = -(pose.thighFar + 78);
  const kneeF = 78 + pose.thighFar - pose.shinFar;
  const ankF = pose.shinFar - pose.footFar - 2;
  const shN = pose.armNear ? pose.armNear.sh - 7 : 0;
  const elN = pose.armNear ? pose.armNear.el - 8 : 0;
  const shF = pose.armFar ? pose.armFar.sh - 7 : 0;
  const elF = pose.armFar ? pose.armFar.el - 8 : 0;

  // points 120 pour les overlays vectoriels (ventre, cible du regard)
  const tor = rad(pose.torso);
  const shoulder120 = { x: px0 + Math.sin(tor) * 22.6, y: py0 - Math.cos(tor) * 22.6 };
  const belly120 = {
    x: px0 + (shoulder120.x - px0) * 0.45 + 5.5 + pose.belly * 2,
    y: py0 + (shoulder120.y - py0) * 0.45,
  };
  const hd = rad(pose.torso + pose.head);
  const head120 = {
    x: shoulder120.x + Math.sin(hd) * 13 + pose.headX,
    y: shoulder120.y - Math.cos(hd) * 13,
  };
  const gazeTarget = { x: lerp(80, 106, pose.gaze), y: lerp(42, 20, pose.gaze) };

  return (
    <g>
      <g transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s})`}>
        {/* ---- membres éloignés (assombris, derrière) ---- */}
        <g transform="translate(-14 0)">
          <g transform={R(hipF, Pc("thigh").pivot)}>
            <g transform={R(kneeF, Pc("shin").pivot)}>
              <g transform={R(ankF, Pc("foot").pivot)}><Px b={body} v="side" n="foot" far /></g>
              <Px b={body} v="side" n="shin" far />
            </g>
            <Px b={body} v="side" n="thigh" far />
          </g>
        </g>
        {pose.armFar && (
          <g transform={R(pose.torso, rig.pelvis)}>
            <g transform="translate(-12 0)">
              <g transform={R(shF, Pc("armup").pivot)}>
                <g transform={R(elF, Pc("armlo").pivot)}><Px b={body} v="side" n="armlo" far /></g>
                <Px b={body} v="side" n="armup" far />
              </g>
            </g>
          </g>
        )}
        {/* ---- jambe proche ---- */}
        <g transform={R(hipN, Pc("thigh").pivot)}>
          <g transform={R(kneeN, Pc("shin").pivot)}>
            <g transform={R(ankN, Pc("foot").pivot)}><Px b={body} v="side" n="foot" /></g>
            <Px b={body} v="side" n="shin" />
          </g>
          <Px b={body} v="side" n="thigh" />
        </g>
        {/* ---- torse + tête + bras proche ---- */}
        <g transform={R(pose.torso, rig.pelvis)}>
          <Px b={body} v="side" n="torso" />
          <g transform={`translate(${(pose.headX / s).toFixed(1)} 0) ${R(pose.head, Pc("head").pivot)}`}>
            <Px b={body} v="side" n="head" />
          </g>
          {pose.armNear && (
            <g transform={`translate(${(pose.shoulderShift / s).toFixed(1)} ${(pose.shoulderLift / s).toFixed(1)}) ${R(shN, Pc("armup").pivot)}`}>
              <g transform={R(elN, Pc("armlo").pivot)}><Px b={body} v="side" n="armlo" /></g>
              <Px b={body} v="side" n="armup" />
            </g>
          )}
        </g>
      </g>
      {/* ---- overlays vectoriels ---- */}
      {pose.belly > 0.02 && (
        <ellipse cx={belly120.x + 3.5} cy={belly120.y} rx={2 + pose.belly * 3} ry={3 + pose.belly * 3.4}
          fill="none" stroke={ACCENT} strokeWidth={1.1} opacity={0.55} />
      )}
      {target && (
        <g>
          <path d={`M${(head120.x + 7).toFixed(1)} ${(head120.y - 1).toFixed(1)} L${gazeTarget.x} ${gazeTarget.y}`}
            stroke={ACCENT} strokeWidth={1.6} strokeDasharray="3 4" fill="none" />
          <circle cx={gazeTarget.x} cy={gazeTarget.y} r={3.6} fill={ACCENT} />
        </g>
      )}
    </g>
  );
}

function SideScene({ stand, desk }: { stand?: boolean; desk?: boolean }) {
  return (
    <g stroke="var(--m-ink2)" strokeWidth={3} strokeLinecap="round" opacity={0.4} fill="none">
      {!stand && (
        <>
          <path d="M28 83 L60 83" />
          <path d="M29 83 L29 52" />
          <path d="M33 83 L33 100" />
          <path d="M56 83 L56 100" />
          <path d="M24 100 L96 100" strokeWidth={2.2} opacity={0.7} />
        </>
      )}
      {stand && <path d="M26 94.5 L104 94.5" strokeWidth={2.2} opacity={0.8} />}
      {desk && (
        <>
          <path d="M74 58 L114 58" />
          <path d="M110 58 L110 100" />
        </>
      )}
    </g>
  );
}

// ---------- Vue de FACE (pièces bitmap) ----------

const S_FRONT = 0.095;

function CutFront({ pose, body }: { pose: FullFront; body: string }) {
  const rig = RIG[`${body}.front`];
  const Pc = (n: string) => rig.pieces[n];
  const s = S_FRONT;
  const tx = 60 - rig.pelvis[0] * s;
  const ty = 72 - rig.pelvis[1] * s;

  const shrugDy = -(pose.shrug * 5 + pose.grow * 3) / s;
  const hipDx = (pose.hipShift * 6) / s;
  const twistDx = (pose.twist * 2) / s;
  const aL = pose.armL ? -(pose.armL.sh - 10) : 0;
  const eL = pose.armL ? -(pose.armL.el - 8) : 0;
  const aR = pose.armR ? pose.armR.sh - 10 : 0;
  const eR = pose.armR ? pose.armR.el - 8 : 0;
  const legOpen = pose.knees * 20;

  return (
    <g transform={pose.bend !== 0 ? `rotate(${pose.bend} 60 82)` : undefined}>
      <g transform={`translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s})`}>
        {/* jambes */}
        <g transform={R(-legOpen, Pc("legL").pivot)}><Px b={body} v="front" n="legL" /></g>
        <g transform={R(legOpen, Pc("legR").pivot)}><Px b={body} v="front" n="legR" /></g>
        {/* torse (torsion/translation bassin) + tête + bras */}
        <g transform={`translate(${(hipDx + twistDx).toFixed(1)} 0)`}>
          <Px b={body} v="front" n="torso" />
          <g transform={`translate(${(pose.turn * 8).toFixed(1)} ${(pose.nod * 4 + shrugDy * 0.6).toFixed(1)}) ${R(pose.tilt, Pc("head").pivot)}`}>
            <Px b={body} v="front" n="head" />
          </g>
          {pose.armL && (
            <g transform={`translate(0 ${shrugDy.toFixed(1)}) ${R(aL, Pc("armLup").pivot)}`}>
              <g transform={R(eL, Pc("armLlo").pivot)}><Px b={body} v="front" n="armLlo" /></g>
              <Px b={body} v="front" n="armLup" />
            </g>
          )}
          {pose.armR && (
            <g transform={`translate(0 ${shrugDy.toFixed(1)}) ${R(aR, Pc("armRup").pivot)}`}>
              <g transform={R(eR, Pc("armRlo").pivot)}><Px b={body} v="front" n="armRlo" /></g>
              <Px b={body} v="front" n="armRup" />
            </g>
          )}
        </g>
      </g>
    </g>
  );
}

// ---------- Gros plan visage (yeux) — vectoriel ----------

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

// ---------- Gros plan main (poignets/doigts) — vectoriel ----------

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

const L = (a: P, b: P) => `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

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
      return front ? "34 12 52 52" : `36 ${16 + dy} 52 52`;
    case "epaules":
    case "poitrine":
    case "haut-dos":
      return front ? "24 18 66 66" : `26 ${22 + dy} 66 66`;
    case "ventre":
    case "bas-dos":
    case "hanches":
      return front ? "24 40 70 70" : `24 ${42 + dy} 70 70`;
    case "poignets":
      return front ? "18 34 84 84" : "38 34 74 74";
    case "jambes":
      return front ? "24 48 74 74" : "36 46 78 78";
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
  const body = bodyOf(look.hair);
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

  let bodyEl: React.ReactNode = null;
  if (motion.view === "side") {
    const defs = sideDefaults(Boolean(motion.stand));
    const frames = motion.frames.map((f) => mergeSide(defs, f));
    const poseAt = (tt: number) => {
      if (frames.length === 1) return frames[0];
      const sgm = tt * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(sgm));
      return lerpSide(frames[i], frames[i + 1], sgm - i);
    };
    bodyEl = (
      <>
        <SideScene stand={motion.stand} desk={motion.desk} />
        <CutSide pose={staticMode ? frames[frames.length - 1] : poseAt(eased)}
          stand={Boolean(motion.stand)} target={motion.target} body={body} />
      </>
    );
  } else if (motion.view === "front") {
    const frames = motion.frames.map(mergeFront);
    const poseAt = (tt: number) => {
      if (frames.length === 1) return frames[0];
      const sgm = tt * (frames.length - 1);
      const i = Math.min(frames.length - 2, Math.floor(sgm));
      return lerpFront(frames[i], frames[i + 1], sgm - i);
    };
    bodyEl = <CutFront pose={staticMode ? frames[frames.length - 1] : poseAt(eased)} body={body} />;
  } else if (motion.view === "face") {
    bodyEl = <FaceScene kind={motion.kind} p={phase} staticMode={staticMode} look={look} />;
  } else {
    bodyEl = <HandsScene kind={motion.kind} p={phase} staticMode={staticMode} look={look} />;
  }

  const vb = zoom ? zoomBox(motion, motion.highlight) : "0 0 120 120";

  return (
    <svg viewBox={vb} width={size} height={size} className={className} role="img" aria-hidden="true" fill="none">
      <rect x={-30} y={-30} width={180} height={180} fill="var(--m-soft)" opacity={0.5} />
      {!zoom && <ellipse cx={60} cy={107} rx={36} ry={4.5} fill="var(--m-ink)" opacity={0.07} />}
      {bodyEl}
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
