import { useEffect, useRef, useState } from "react";
import { ZONE_COLORS, ZONE_LABELS, ZONES, type Zone } from "../types";

// LE REFLET MOVAÉ — la signature de l'app.
//
// Votre reflet, debout, de profil : sa colonne s'arrondit réellement quand vos
// tensions montent (courbe du dos pilotée par le moteur), sa tête tombe avec la
// nuque, ses épaules s'enroulent. Il respire. Il se redresse et rayonne quand
// vous validez une pause. Chaque zone s'illumine de SA couleur.

const rad = (d: number) => (d * Math.PI) / 180;

interface Posture {
  slump: number; // arrondi du dos (0..1)
  droop: number; // chute de la tête (0..1)
  roll: number; // enroulement des épaules (0..1)
}

function postureFrom(strain: Record<Zone, number>): Posture {
  return {
    slump: Math.min(1, (strain.dos * 0.6 + strain.hanches * 0.2 + strain.epaules * 0.2) / 100),
    droop: Math.min(1, strain.nuque / 100),
    roll: Math.min(1, strain.epaules / 100),
  };
}

export function BodyMap({
  strain,
  justMoved = false,
}: {
  strain: Record<Zone, number>;
  justMoved?: boolean; // pause validée il y a peu : le reflet rayonne
}) {
  const sorted = [...ZONES].sort((a, b) => strain[b] - strain[a]);
  const target = postureFrom(strain);

  // Respiration + transition douce vers la posture cible (~15 img/s).
  const [t, setT] = useState(0);
  const posture = useRef<Posture>({ ...target });
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (reduced.current) {
      posture.current = target;
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    let lastFrame = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < 66) return;
      lastFrame = now;
      posture.current = {
        slump: posture.current.slump + (target.slump - posture.current.slump) * 0.12,
        droop: posture.current.droop + (target.droop - posture.current.droop) * 0.12,
        roll: posture.current.roll + (target.roll - posture.current.roll) * 0.12,
      };
      setT((now - t0) / 1000);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.slump, target.droop, target.roll]);

  const p = reduced.current ? target : posture.current;
  const breath = reduced.current ? 0.5 : Math.sin(t * 1.5) * 0.5 + 0.5; // cycle ~4 s

  // ---- Le Reflet : silhouette debout, de profil (face à droite) ----
  const groundY = 106;
  const pelvis = { x: 52, y: 62 };
  // Colonne : courbe quadratique — plus « slump » monte, plus le dos s'arrondit.
  const shoulder = {
    x: pelvis.x + 4 + p.slump * 11 + p.roll * 2,
    y: 34 + p.slump * 6 - breath * 1.1,
  };
  const spineCtrl = {
    x: pelvis.x - 3 - p.slump * 9, // le contrôle recule → dos convexe
    y: (pelvis.y + shoulder.y) / 2 + 1,
  };
  // Tête : pivote vers l'avant-bas avec la nuque.
  const headAngle = 12 + p.droop * 52 + p.slump * 10;
  const neckLen = 7.5;
  const headC = {
    x: shoulder.x + Math.sin(rad(headAngle)) * (neckLen + 7),
    y: shoulder.y - Math.cos(rad(headAngle)) * (neckLen + 7),
  };
  // Bras (pendants, légèrement vers l'avant quand les épaules s'enroulent)
  const elbowN = { x: shoulder.x + 2.5 + p.roll * 3.5, y: shoulder.y + 14 };
  const handN = { x: elbowN.x + 2.5 + p.slump * 4, y: elbowN.y + 13 };
  const elbowF = { x: shoulder.x - 2 + p.roll * 3, y: shoulder.y + 13.5 };
  const handF = { x: elbowF.x + 1.5 + p.slump * 4, y: elbowF.y + 13 };
  // Jambes (debout, léger décalage entre les deux)
  const kneeN = { x: pelvis.x + 3.5, y: 84 };
  const ankleN = { x: pelvis.x + 2.5, y: groundY - 2 };
  const kneeF = { x: pelvis.x - 2.5, y: 84 };
  const ankleF = { x: pelvis.x - 3.5, y: groundY - 2 };

  const L = (a: { x: number; y: number }, b: { x: number; y: number }) =>
    `M${a.x.toFixed(1)} ${a.y.toFixed(1)} L${b.x.toFixed(1)} ${b.y.toFixed(1)}`;

  const anchors: Record<Zone, { x: number; y: number }> = {
    yeux: { x: headC.x + 5.5, y: headC.y - 1 },
    nuque: { x: (shoulder.x + headC.x) / 2 - 1, y: (shoulder.y + headC.y) / 2 },
    epaules: { x: shoulder.x - 1, y: shoulder.y + 1.5 },
    dos: { x: spineCtrl.x - 2, y: spineCtrl.y },
    poignets: { x: handN.x, y: handN.y },
    hanches: { x: pelvis.x, y: pelvis.y },
    jambes: { x: kneeN.x + 1, y: kneeN.y + 8 },
    energie: { x: (pelvis.x + shoulder.x) / 2 + 8, y: (pelvis.y + shoulder.y) / 2 + 2 },
  };

  const globalNeed = Math.max(...ZONES.map((z) => strain[z]));
  const auraColor = justMoved ? "var(--m-accent)" : globalNeed > 70 ? "#C9A86A" : "var(--m-accent)";

  return (
    <div className="flex items-center gap-5">
      {/* Le Reflet */}
      <svg
        viewBox="0 0 120 120"
        className="w-40 shrink-0 sm:w-44"
        role="img"
        aria-label="Votre reflet : posture et tensions estimées en temps réel"
      >
        <rect x={4} y={4} width={112} height={112} rx={24} fill="var(--m-bg2)" />
        {/* aura respirante */}
        <circle
          cx={58}
          cy={62}
          r={42 + breath * 2.5 + (justMoved ? 4 : 0)}
          fill={auraColor}
          opacity={justMoved ? 0.2 : 0.06 + breath * 0.04}
        />
        {/* halos de zone */}
        {ZONES.map((z) => {
          const v = strain[z];
          return (
            <circle
              key={z}
              cx={anchors[z].x}
              cy={anchors[z].y}
              r={6.5 + (v / 100) * 7.5}
              fill={ZONE_COLORS[z]}
              opacity={0.13 + (v / 100) * 0.55}
            >
              <title>{`${ZONE_LABELS[z]} : ${Math.round(v)}/100`}</title>
            </circle>
          );
        })}
        {/* sol */}
        <path d={`M24 ${groundY} L96 ${groundY}`} stroke="var(--m-ink2)" strokeWidth={2.5} strokeLinecap="round" opacity={0.35} />
        <ellipse cx={pelvis.x + 2} cy={groundY + 3} rx={16} ry={2.5} fill="var(--m-ink)" opacity={0.08} />

        {/* le reflet */}
        <g strokeLinecap="round" strokeLinejoin="round" fill="none">
          {/* membres éloignés */}
          <g stroke="var(--m-ink)" opacity={0.3}>
            <path d={L(pelvis, kneeF)} strokeWidth={6.5} />
            <path d={L(kneeF, ankleF)} strokeWidth={6} />
            <path d={L(ankleF, { x: ankleF.x + 8.5, y: ankleF.y + 1.5 })} strokeWidth={4.5} />
            <path d={L({ x: shoulder.x - 1, y: shoulder.y + 1 }, elbowF)} strokeWidth={5} />
            <path d={L(elbowF, handF)} strokeWidth={4.5} />
          </g>
          <g stroke="var(--m-ink)" opacity={0.88}>
            {/* colonne : la courbe EST la posture */}
            <path
              d={`M${pelvis.x} ${pelvis.y} Q${spineCtrl.x} ${spineCtrl.y} ${shoulder.x.toFixed(1)} ${shoulder.y.toFixed(1)}`}
              strokeWidth={10.5}
            />
            {/* nuque + tête */}
            <path
              d={L(shoulder, {
                x: shoulder.x + Math.sin(rad(headAngle)) * neckLen,
                y: shoulder.y - Math.cos(rad(headAngle)) * neckLen,
              })}
              strokeWidth={5.5}
            />
            <circle cx={headC.x} cy={headC.y} r={9} fill="var(--m-ink)" stroke="none" />
            {/* profil du visage (nez) */}
            <circle cx={headC.x + 6.5} cy={headC.y + 1.5} r={2.2} fill="var(--m-ink)" stroke="none" />
            {/* bras proche */}
            <path d={L(shoulder, elbowN)} strokeWidth={5.5} />
            <path d={L(elbowN, handN)} strokeWidth={5} />
            <circle cx={handN.x} cy={handN.y} r={2.8} fill="var(--m-ink)" stroke="none" />
            {/* jambe proche */}
            <path d={L(pelvis, kneeN)} strokeWidth={7} />
            <path d={L(kneeN, ankleN)} strokeWidth={6.5} />
            <path d={L(ankleN, { x: ankleN.x + 9, y: ankleN.y + 1.5 })} strokeWidth={5} />
          </g>
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
