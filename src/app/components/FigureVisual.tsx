import type { CSSProperties } from "react";
import type { Visual } from "../data/exercises";

// Figure assise stylisée, dessinée en SVG et animée par zone selon l'exercice.
// Aucune image externe : tout est vectoriel et respecte prefers-reduced-motion.

interface GroupAnim {
  head?: string;
  torso?: string;
  arm?: string;
  hand?: string;
  shin?: string;
  leg?: string; // cuisse + tibia ensemble
}

interface VisualConfig {
  anim: GroupAnim;
  armPath?: string;
  handAt?: [number, number];
  shinPose?: string; // rotation statique du tibia
  extra?: "gaze" | "focus" | "palming" | "aura";
}

const CONFIGS: Record<Visual, VisualConfig> = {
  headTurn: { anim: { head: "m-head-turn 3.6s ease-in-out infinite" } },
  headTilt: { anim: { head: "m-head-tilt 4s ease-in-out infinite" } },
  chinTuck: { anim: { head: "m-chin-tuck 2.8s ease-in-out infinite" } },
  shoulderRoll: { anim: { arm: "m-shoulder-roll 2.6s ease-in-out infinite" } },
  chestOpen: {
    anim: { arm: "m-chest-open 3.4s ease-in-out infinite" },
    armPath: "M57 49 L63 62 L66 72",
    handAt: [66, 72],
  },
  twist: { anim: { torso: "m-twist 4s ease-in-out infinite" } },
  forwardFold: { anim: { torso: "m-fold 4.5s ease-in-out infinite" } },
  backExtend: {
    anim: { torso: "m-extend 3.6s ease-in-out infinite" },
    armPath: "M57 49 L64 40 L60 33",
    handAt: [60, 33],
  },
  pelvis: { anim: { torso: "m-twist 3s ease-in-out infinite" } },
  wristFlex: { anim: { hand: "m-wrist 3s ease-in-out infinite" } },
  wristCircles: { anim: { hand: "m-wrist 1.6s ease-in-out infinite" } },
  legExtend: { anim: { shin: "m-leg 3s ease-in-out infinite" } },
  heelToe: { anim: { shin: "m-march 1.4s ease-in-out infinite" } },
  figureFour: { anim: { torso: "m-fold 5s ease-in-out infinite" }, shinPose: "rotate(-58deg)" },
  seatedMarch: { anim: { leg: "m-march 1.5s ease-in-out infinite" } },
  gaze: { anim: {}, extra: "gaze" },
  palming: {
    anim: { torso: "m-breath 4s ease-in-out infinite" },
    armPath: "M57 49 L67 43 L63 35",
    handAt: [63, 35],
    extra: "palming",
  },
  focusShift: { anim: {}, extra: "focus" },
  breath: { anim: { torso: "m-breath 4.5s ease-in-out infinite" }, extra: "aura" },
  reachUp: {
    anim: { arm: "m-reach 3.2s ease-in-out infinite" },
    armPath: "M57 49 L62 33 L64 18",
    handAt: [64, 18],
  },
};

const origin = (x: number, y: number): CSSProperties => ({
  transformOrigin: `${x}px ${y}px`,
  transformBox: "view-box" as CSSProperties["transformBox"],
});

export function FigureVisual({
  visual,
  size = 120,
  className = "",
}: {
  visual: Visual;
  size?: number;
  className?: string;
}) {
  const cfg = CONFIGS[visual];
  const armPath = cfg.armPath ?? "M57 49 L67 59 L76 62";
  const handAt = cfg.handAt ?? [76, 62];

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
      {/* halo de fond */}
      <circle cx="60" cy="62" r="46" fill="var(--m-soft)" opacity="0.55" />
      {cfg.extra === "aura" && (
        <circle
          cx="60"
          cy="60"
          r="50"
          stroke="var(--m-accent)"
          strokeWidth="1.5"
          opacity="0.5"
          style={{ ...origin(60, 60), animation: "m-breath 4.5s ease-in-out infinite" }}
        />
      )}

      {/* chaise */}
      <g stroke="var(--m-ink2)" strokeWidth="4" strokeLinecap="round" opacity="0.45">
        <path d="M30 78 L66 78" />
        <path d="M31 78 L31 46" />
        <path d="M36 78 L36 104" />
        <path d="M62 78 L62 104" />
      </g>

      {/* jambe (cuisse + tibia) */}
      <g style={{ ...origin(50, 74), animation: cfg.anim.leg }}>
        <path d="M50 73 L74 73" stroke="var(--m-strong)" strokeWidth="6" strokeLinecap="round" />
        <g
          style={{
            ...origin(74, 74),
            animation: cfg.anim.shin,
            transform: cfg.shinPose,
          }}
        >
          <path d="M74 74 L74 101" stroke="var(--m-strong)" strokeWidth="6" strokeLinecap="round" />
          <path d="M74 101 L82 101" stroke="var(--m-strong)" strokeWidth="5" strokeLinecap="round" />
        </g>
      </g>

      {/* buste + tête + bras */}
      <g style={{ ...origin(51, 73), animation: cfg.anim.torso }}>
        <path d="M51 73 L56 50" stroke="var(--m-strong)" strokeWidth="7" strokeLinecap="round" />

        <g style={{ ...origin(57, 49), animation: cfg.anim.arm }}>
          <path d={armPath} stroke="var(--m-strong)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <g style={{ ...origin(handAt[0], handAt[1]), animation: cfg.anim.hand }}>
            <circle cx={handAt[0]} cy={handAt[1]} r="3.4" fill="var(--m-strong)" />
          </g>
        </g>

        <g style={{ ...origin(58, 46), animation: cfg.anim.head }}>
          <circle cx="59" cy="36" r="8.5" fill="var(--m-strong)" />
          {cfg.extra === "palming" && (
            <circle cx="64" cy="35" r="4" fill="var(--m-accent)" />
          )}
        </g>
      </g>

      {/* extras visuels : regard au loin / focus */}
      {cfg.extra === "gaze" && (
        <g>
          <path
            d="M68 34 L102 26"
            stroke="var(--m-accent)"
            strokeWidth="2"
            strokeDasharray="3 5"
            strokeLinecap="round"
          />
          <circle
            cx="104"
            cy="25"
            r="5"
            fill="var(--m-accent)"
            style={{ animation: "m-pulse-soft 2.4s ease-in-out infinite" }}
          />
        </g>
      )}
      {cfg.extra === "focus" && (
        <g>
          <circle
            cx="82"
            cy="34"
            r="4"
            fill="var(--m-accent)"
            style={{ animation: "m-gaze 3s ease-in-out infinite" }}
          />
          <circle
            cx="105"
            cy="24"
            r="5"
            fill="var(--m-accent)"
            opacity="0.4"
            style={{ animation: "m-gaze 3s ease-in-out infinite reverse" }}
          />
        </g>
      )}
    </svg>
  );
}
