import { useEffect, useRef, useState } from "react";
import { defaultAvatar, useMovaeMaybe } from "../state/store";

// L'avatar 2D à son poste de travail — scène vivante du dashboard.
// Assis au bureau devant son ordinateur : il tape au clavier et, toutes les
// ~14 s, boit une gorgée. Couleurs et coupe = celles de l'avatar.

const ACCENT = "#C4795A", DARK = "#3A342C";

export function AvatarDesk({ height = 300 }: { height?: number }) {
  const store = useMovaeMaybe();
  const a = store?.state.avatar ?? defaultAvatar();
  const c = a.colors;
  const [t, setT] = useState(0);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (reduced.current) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      setT((now - t0) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  // cycle : 11 s de frappe, 3 s pour boire
  const cyc = t % 14;
  const dRaw = cyc > 11 ? (cyc - 11) / 3 : 0;
  const drink = dRaw === 0 ? 0 : dRaw < 0.5 ? dRaw * 2 : (1 - dRaw) * 2;
  const smooth = drink * drink * (3 - 2 * drink);
  const tap = Math.abs(Math.sin(t * 9)) * 2.2;
  const breath = Math.sin(t * 1.2) * 0.8;

  // repères (viewBox 0 0 220 130) — perso de profil, face au bureau à droite
  const hipX = 84, hipY = 88;
  const shX = hipX + 3, shY = hipY - 27 + breath * 0.4;
  const headX = shX + 3, headY = shY - 12;
  // bras qui tape : main sur le clavier ; bras qui boit : main → bouche
  const handTap = { x: 118, y: 74 - tap * 0.4 };
  const drinkHand = {
    x: shX + 14 - smooth * 8,
    y: shY + 18 - smooth * 26,
  };
  const elbowFor = (hx: number, hy: number) => ({ x: (shX + hx) / 2 - 2, y: (shY + hy) / 2 + 6 });
  const eT = elbowFor(handTap.x, handTap.y);
  const eD = elbowFor(drinkHand.x, drinkHand.y);
  const mug = smooth > 0.1 ? drinkHand : { x: 132, y: 71 };

  return (
    <svg viewBox="0 0 220 130" style={{ width: "100%", height, display: "block" }} aria-hidden>
      {/* sol + chaise */}
      <ellipse cx={110} cy={122} rx={88} ry={5} fill="var(--m-ink)" opacity={0.06} />
      <g stroke="var(--m-ink2)" strokeWidth={4} strokeLinecap="round" opacity={0.5} fill="none">
        <path d={`M${hipX - 14} ${hipY + 4} h26`} />
        <path d={`M${hipX - 13} ${hipY + 4} v-26`} />
        <path d={`M${hipX - 9} ${hipY + 4} v28`} />
        <path d={`M${hipX + 9} ${hipY + 4} v28`} />
      </g>
      {/* bureau + laptop + tasse */}
      <g>
        <rect x={104} y={76} width={86} height={5} rx={2.5} fill="#B99772" stroke={DARK} strokeWidth={0.6} />
        <path d="M110 81 v38 M184 81 v38" stroke="#96784F" strokeWidth={4} strokeLinecap="round" />
        <rect x={126} y={57} width={26} height={17} rx={2} fill={DARK} />
        <rect x={128} y={59} width={22} height={13} rx={1} fill="#8FB7C9" opacity={0.9} />
        <rect x={112} y={73.4} width={22} height={3} rx={1.5} fill="#5E564D" />
        {/* tasse (suit la main quand il boit) */}
        <g transform={`translate(${mug.x - 132} ${mug.y - 71}) ${smooth > 0.1 ? `rotate(${-smooth * 24} 132 71)` : ""}`}>
          <rect x={128} y={64} width={9} height={11} rx={2} fill={ACCENT} stroke={DARK} strokeWidth={0.6} />
          <path d="M137 67 a 3 3 0 1 1 0 5" stroke={ACCENT} strokeWidth={1.6} fill="none" />
        </g>
      </g>
      {/* jambes */}
      <path d={`M${hipX} ${hipY} L${hipX + 22} ${hipY - 2} L${hipX + 24} ${hipY + 22}`}
        stroke={c.trousers} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <ellipse cx={hipX + 28} cy={hipY + 24} rx={6} ry={3.4} fill={c.shoes} />
      {/* torse */}
      <path d={`M${hipX - 6} ${hipY + 2} Q ${hipX - 8} ${shY + 6} ${shX - 5} ${shY - 3}
          Q ${shX} ${shY - 5.5} ${shX + 5} ${shY - 2.5} Q ${shX + 9 + breath} ${(shY + hipY) / 2} ${hipX + 7} ${hipY + 2} Z`}
        fill={c.top} stroke={DARK} strokeWidth={0.6} />
      <path d={`M${hipX - 6} ${hipY + 1.6} Q ${hipX} ${hipY + 4} ${hipX + 7} ${hipY + 1.6}`} stroke={ACCENT} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      {/* bras gauche (fond, tape toujours) */}
      <g opacity={0.5}>
        <path d={`M${shX - 2} ${shY} L${eT.x - 4} ${eT.y} L${handTap.x - 6} ${handTap.y + tap * 0.3}`}
          stroke={c.top} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx={handTap.x - 6} cy={handTap.y + tap * 0.3} r={2.4} fill={c.skin} />
      </g>
      {/* cou + tête */}
      <path d={`M${shX} ${shY} L${headX} ${headY + 7}`} stroke={c.skin} strokeWidth={4.4} strokeLinecap="round" />
      <g transform={smooth > 0.1 ? `rotate(${-smooth * 10} ${headX} ${headY})` : undefined}>
        <circle cx={headX} cy={headY} r={8.5} fill={c.skin} stroke={DARK} strokeWidth={0.6} />
        <path d={`M${headX - 9} ${headY + 1.5} A 9.3 9.3 0 0 1 ${headX + 7} ${headY - 5.4} Q ${headX + 2} ${headY - 2} ${headX - 1.6} ${headY - 4} Q ${headX - 7.6} ${headY - 1} ${headX - 9} ${headY + 1.5} Z`} fill={c.hair} />
        <ellipse cx={headX + 3.6} cy={headY - 0.6} rx={1.1} ry={1.6} fill={DARK} />
        <path d={`M${headX + 2} ${headY - 3.4} q 2 -1 3.6 -0.2`} stroke={c.hair} strokeWidth={0.9} strokeLinecap="round" fill="none" />
        <path d={`M${headX + 7.9} ${headY + 0.6} q 2 0.9 0.6 2.6 q -1 0.8 -1.8 0.2`} fill={c.skin} stroke={DARK} strokeWidth={0.5} />
        <path d={`M${headX + 5.2} ${headY + 3.6} q 1.4 0.7 2.4 -0.2`} stroke={DARK} strokeWidth={0.7} strokeLinecap="round" fill="none" />
        <circle cx={headX + 3.4} cy={headY + 2.8} r={1.1} fill="#E4A78D" opacity={0.5} />
      </g>
      {/* bras droit (premier plan : tape ou boit) */}
      {smooth > 0.05 ? (
        <g>
          <path d={`M${shX + 2} ${shY + 1} L${eD.x} ${eD.y} L${drinkHand.x} ${drinkHand.y}`}
            stroke={c.top} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx={drinkHand.x} cy={drinkHand.y} r={2.7} fill={c.skin} stroke={DARK} strokeWidth={0.5} />
        </g>
      ) : (
        <g>
          <path d={`M${shX + 2} ${shY + 1} L${eT.x} ${eT.y} L${handTap.x} ${handTap.y}`}
            stroke={c.top} strokeWidth={5.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx={handTap.x} cy={handTap.y} r={2.7} fill={c.skin} stroke={DARK} strokeWidth={0.5} />
        </g>
      )}
    </svg>
  );
}
