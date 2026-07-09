import { Award, Dumbbell, Home, LayoutList, Play, Settings, TrendingUp } from "lucide-react";
import { Logo } from "./shared";

// Mockup du tableau de bord Movaé dans une fenêtre de navigateur.
// 100 % HTML/CSS/SVG — aucune image externe.

function MiniRing({ value }: { value: number }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  const filled = (value / 100) * c;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F1EA" strokeWidth="9" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="#7FA68A"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${c - filled}`}
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="55" textAnchor="middle" fontSize="27" fontWeight="700" fill="#1E2420" fontFamily="var(--font-display)">
        {value}
      </text>
      <text x="50" y="68" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="#6D756F" letterSpacing="1">
        / 100
      </text>
    </svg>
  );
}

function MiniFigure() {
  return (
    <svg viewBox="0 0 120 120" className="h-20 w-20" fill="none" aria-hidden>
      <circle cx="60" cy="62" r="44" fill="#DDEADF" opacity="0.6" />
      <g stroke="#6D756F" strokeWidth="4" strokeLinecap="round" opacity="0.4">
        <path d="M30 78 L66 78" />
        <path d="M31 78 L31 46" />
        <path d="M36 78 L36 104" />
        <path d="M62 78 L62 104" />
      </g>
      <path d="M50 73 L74 73" stroke="#4F755D" strokeWidth="6" strokeLinecap="round" />
      <path d="M74 74 L74 101" stroke="#4F755D" strokeWidth="6" strokeLinecap="round" />
      <path d="M51 73 L56 50" stroke="#4F755D" strokeWidth="7" strokeLinecap="round" />
      <path d="M57 49 L67 59 L76 62" stroke="#4F755D" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <g
        style={{
          transformOrigin: "58px 46px",
          transformBox: "view-box",
          animation: "m-head-turn 3.6s ease-in-out infinite",
        }}
      >
        <circle cx="59" cy="36" r="8.5" fill="#4F755D" />
      </g>
    </svg>
  );
}

const NAV = [Home, Dumbbell, LayoutList, TrendingUp, Award, Settings];

export function BrowserMockup() {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-ligne bg-white shadow-2xl shadow-encre/10"
      role="img"
      aria-label="Aperçu du tableau de bord Movaé : Indice à 86, pause recommandée et progression du jour"
    >
      {/* Barre du navigateur */}
      <div className="flex items-center gap-3 border-b border-ligne bg-fond px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-[#E3B7AC]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8D5A8]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#B5CDBB]" />
        </div>
        <div className="flex-1 rounded-md border border-ligne bg-white px-3 py-1 text-[10px] font-medium text-encre-2">
          app.movae.fr
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="hidden w-36 shrink-0 flex-col gap-1 border-r border-ligne p-3 sm:flex">
          <div className="mb-2 flex items-center gap-1.5 px-1">
            <Logo size={18} />
            <span className="font-display text-xs font-semibold">Movaé</span>
          </div>
          {NAV.map((Icon, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${
                i === 0 ? "bg-sauge-claire text-sauge-fonce" : "text-encre-2"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden />
              <span className="h-1.5 w-12 rounded-full bg-current opacity-30" />
            </div>
          ))}
        </div>

        {/* Dashboard */}
        <div className="min-w-0 flex-1 space-y-3 bg-fond p-4">
          <p className="text-xs font-semibold text-encre">Bonjour Camille</p>

          <div className="grid grid-cols-5 gap-3">
            {/* Indice */}
            <div className="col-span-2 flex flex-col items-center rounded-xl border border-ligne bg-white p-3 text-center">
              <p className="text-[8px] font-bold uppercase tracking-widest text-encre-2">Indice Movaé</p>
              <MiniRing value={86} />
              <p className="text-[10px] font-bold text-sauge-fonce">Très bien</p>
              <p className="text-[8px] text-encre-2">+4 par rapport à hier</p>
            </div>
            {/* Pause recommandée */}
            <div className="col-span-3 flex flex-col rounded-xl border border-ligne bg-white p-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-ambre/20 px-2 py-0.5 text-[8px] font-bold text-[#8F7443]">
                  Pause recommandée
                </span>
                <span className="text-[8px] text-encre-2">il y a 52 min</span>
              </div>
              <div className="mt-1 flex flex-1 items-center gap-2">
                <MiniFigure />
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-encre">Rotations lentes de la nuque</p>
                  <p className="text-[9px] text-encre-2">45 s · assis · sans matériel</p>
                  <div className="mt-1 flex gap-1">
                    <span className="rounded-full bg-sauge-claire px-1.5 py-0.5 text-[7px] font-bold text-sauge-fonce">Nuque</span>
                    <span className="rounded-full bg-sauge-claire px-1.5 py-0.5 text-[7px] font-bold text-sauge-fonce">45 s</span>
                  </div>
                </div>
              </div>
              <div className="mt-1 flex gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-lg bg-sauge-fonce px-2.5 py-1 text-[9px] font-bold text-white">
                  <Play className="h-2.5 w-2.5" aria-hidden />
                  Commencer
                </span>
                <span className="rounded-lg border border-ligne px-2.5 py-1 text-[9px] font-semibold text-encre-2">
                  Plus tard
                </span>
              </div>
            </div>
          </div>

          {/* Cartes du bas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-ligne bg-white p-2.5">
              <p className="text-[7px] font-bold uppercase tracking-widest text-encre-2">Objectif du jour</p>
              <p className="font-display mt-1 text-sm font-bold">
                4 <span className="text-[9px] font-semibold text-encre-2">/ 6 pauses</span>
              </p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fond">
                <div className="h-full w-2/3 rounded-full bg-sauge" />
              </div>
            </div>
            <div className="rounded-xl border border-ligne bg-white p-2.5">
              <p className="text-[7px] font-bold uppercase tracking-widest text-encre-2">Série</p>
              <p className="font-display mt-1 text-sm font-bold">
                12 <span className="text-[9px] font-semibold text-encre-2">jours</span>
              </p>
              <p className="mt-1.5 text-[8px] text-encre-2">Record : 12</p>
            </div>
            <div className="rounded-xl border border-ligne bg-white p-2.5">
              <p className="text-[7px] font-bold uppercase tracking-widest text-encre-2">Récompense</p>
              <p className="mt-1 truncate text-[10px] font-bold">Quinzaine solide</p>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fond">
                <div className="h-full w-5/6 rounded-full bg-ambre" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
