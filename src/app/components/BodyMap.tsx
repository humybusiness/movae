import { useEffect, useRef, useState } from "react";
import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// LE JUMEAU MOVAÉ — la signature de l'app.
//
// Un double vivant de votre corps : sa posture se dégrade en temps réel avec
// vos tensions calculées par le moteur (la tête tombe avec la nuque, le dos
// s'arrondit avec le dos, les épaules s'enroulent), il respire doucement, et
// il se redresse visiblement quand vous validez une pause. Chaque zone
// s'illumine de SA couleur. Lecture émotionnelle instantanée, zéro texte.

const rad = (d: number) => (d * Math.PI) / 180;

interface TwinPose {
  slump: number; // avachissement du buste (0..1)
  droop: number; // chute de la tête (0..1)
  roll: number; // enroulement des épaules (0..1)
}

function poseFrom(strain: Record<Zone, number>): TwinPose {
  return {
    slump: Math.min(1, (strain.dos * 0.7 + strain.hanches * 0.3) / 100),
    droop: Math.min(1, strain.nuque / 100),
    roll: Math.min(1, strain.epaules / 100),
  };
}

export function BodyMap({
  strain,
  justMoved = false,
}: {
  strain: Record<Zone, number>;
  justMoved?: boolean; // pause validée il y a peu : le jumeau rayonne
}) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  const target = poseFrom(strain);

  // Respiration + transition douce vers la posture cible.
  const [t, setT] = useState(0);
  const pose = useRef<TwinPose>({ ...target });
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (reduced.current) {
      pose.current = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    let lastFrame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      // ~15 images/s suffisent pour une respiration — économe en CPU
      if (now - lastFrame < 66) return;
      lastFrame = now;
      // approche progressive de la posture cible (le corps ne saute pas)
      pose.current = {
        slump: pose.current.slump + (target.slump - pose.current.slump) * 0.12,
        droop: pose.current.droop + (target.droop - pose.current.droop) * 0.12,
        roll: pose.current.roll + (target.roll - pose.current.roll) * 0.12,
      };
      setT((now - t0) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.slump, target.droop, target.roll]);

  const p = reduced.current ? target : pose.current;
  const breath = reduced.current ? 0 : Math.sin(t * 1.6) * 0.5 + 0.5; // cycle ~4 s

  // ---- Cinématique du jumeau (vue de profil, assis) ----
  const pelvis = { x: 50, y: 78 };
  const torsoAngle = 3 + p.slump * 16 + breath * 1.2; // se tasse vers l'avant
  const torsoLen = 29 - p.slump * 2.5;
  const shoulder = {
    x: pelvis.x + Math.sin(rad(torsoAngle)) * torsoLen + p.roll * 2.5,
    y: pelvis.y - Math.cos(rad(torsoAngle)) * torsoLen + p.roll * 2,
  };
  const headAngle = torsoAngle + 4 + p.droop * 30;
  const head = {
    x: shoulder.x + Math.sin(rad(headAngle)) * 13.5,
    y: shoulder.y - Math.cos(rad(headAngle)) * 13.5,
  };
  const elbow = { x: shoulder.x + 10, y: shoulder.y + 11 + p.roll * 2 };
  const hand = { x: elbow.x + 10, y: elbow.y + 2 };
  const knee = { x: pelvis.x + 23, y: pelvis.y - 2 };
  const ankle = { x: knee.x + 1, y: knee.y + 26 };

  const anchors: Record<Zone, { x: number; y: number }> = {
    yeux: { x: head.x + 5, y: head.y - 1 },
    nuque: { x: (shoulder.x + head.x) / 2, y: (shoulder.y + head.y) / 2 },
    epaules: { x: shoulder.x - 2, y: shoulder.y + 2 },
    dos: { x: pelvis.x + (shoulder.x - pelvis.x) * 0.4 - 5, y: pelvis.y + (shoulder.y - pelvis.y) * 0.5 },
    poignets: { x: hand.x, y: hand.y },
    hanches: { x: pelvis.x, y: pelvis.y },
    jambes: { x: knee.x + 2, y: knee.y + 14 },
    energie: { x: pelvis.x + (shoulder.x - pelvis.x) * 0.45 + 6, y: pelvis.y + (shoulder.y - pelvis.y) * 0.45 },
  };

  const L = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

  const globalNeed = Math.max(...ZONES.map((z) => strain[z]));
  const auraColor = justMoved ? "var(--m-accent)" : globalNeed > 70 ? "#C9A86A" : "var(--m-accent)";

  return (
    <div className="flex items-center gap-5">
      {/* Le Jumeau */}
      <svg
        viewBox="0 0 120 120"
        className="w-40 shrink-0 sm:w-44"
        role="img"
        aria-label="Votre jumeau : posture et tensions estimées en temps réel"
      >
        <rect x={4} y={4} width={112} height={112} rx={24} fill="var(--m-bg2)" />
        {/* aura respirante */}
        <circle
          cx={60}
          cy={58}
          r={40 + breath * 2.5 + (justMoved ? 4 : 0)}
          fill={auraColor}
          opacity={justMoved ? 0.2 : 0.07 + breath * 0.04}
        />
        {/* halos de zone */}
        {ZONES.map((z) => {
          const v = strain[z];
          return (
            <circle
              key={z}
              cx={anchors[z].x}
              cy={anchors[z].y}
              r={7 + (v / 100) * 8}
              fill={ZONE_COLORS[z]}
              opacity={0.14 + (v / 100) * 0.55}
            >
              <title>{`${ZONE_LABELS[z]} : ${Math.round(v)}/100`}</title>
            </circle>
          );
        })}
        {/* chaise */}
        <g stroke="var(--m-ink2)" strokeWidth={3.5} strokeLinecap="round" opacity={0.35} fill="none">
          <path d="M26 81 L62 81" />
          <path d="M27 81 L27 50" />
          <path d="M32 81 L32 106" />
          <path d="M58 81 L58 106" />
        </g>
        {/* le jumeau */}
        <g stroke="var(--m-ink)" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={0.88}>
          <path d={L(pelvis, shoulder)} strokeWidth={8.5} />
          <path d={L(shoulder, { x: (shoulder.x + head.x) / 2, y: (shoulder.y + head.y) / 2 })} strokeWidth={5} />
          <circle cx={head.x} cy={head.y} r={8.5} fill="var(--m-ink)" stroke="none" />
          <path d={L(shoulder, elbow)} strokeWidth={5.5} />
          <path d={L(elbow, hand)} strokeWidth={5.5} />
          <circle cx={hand.x} cy={hand.y} r={3} fill="var(--m-ink)" stroke="none" />
          <path d={L(pelvis, knee)} strokeWidth={7} />
          <path d={L(knee, ankle)} strokeWidth={7} />
          <path d={L(ankle, { x: ankle.x + 8, y: ankle.y })} strokeWidth={5.5} />
        </g>
      </svg>

      {/* Détail compact par zone */}
      <div className="min-w-0 flex-1 space-y-1.5">
        {sorted.map((z) => {
          const v = Math.round(strain[z]);
          return (
            <div key={z} className="flex items-center gap-2.5">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ZONE_COLORS[z] }} aria-hidden />
              <span className="w-16 shrink-0 truncate text-xs font-semibold text-[var(--m-ink2)]">
                {ZONE_LABELS[z]}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--m-bg2)]">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${v}%`, background: ZONE_COLORS[z] }}
                  role="progressbar"
                  aria-label={`${ZONE_LABELS[z]} : ${v} sur 100`}
                  aria-valuenow={v}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
