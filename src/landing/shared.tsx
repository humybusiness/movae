import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { Download, MonitorDown, Share, X } from "lucide-react";
import { isStandalone, triggerInstall } from "../lib/installPrompt";
import { APP_URL } from "../lib/constants";

// ---------- Conteneur ----------
export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-5 sm:px-8 ${className}`}>{children}</div>;
}

// ---------- Apparition douce au scroll ----------
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("is-visible");
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// ---------- Pills ----------
export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-ligne bg-white px-3 py-1.5 text-xs font-semibold text-encre-2">
      {children}
    </span>
  );
}

// ---------- Logo ----------
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <defs>
        <linearGradient id="lp-logo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7FA68A" />
          <stop offset="1" stopColor="#4F755D" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#lp-logo)" />
      <rect x="14" y="34" width="8" height="16" rx="4" fill="#F4F1E8" opacity="0.8" />
      <rect x="28" y="26" width="8" height="24" rx="4" fill="#F4F1E8" opacity="0.9" />
      <rect x="42" y="16" width="8" height="34" rx="4" fill="#F4F1E8" />
    </svg>
  );
}

// ---------- Installation PWA (contexte + modale) ----------
const InstallContext = createContext<{ requestInstall: () => void }>({
  requestInstall: () => {},
});

export function useInstall() {
  return useContext(InstallContext);
}

function InstallModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-encre/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-ligne bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 id="install-title" className="font-display text-2xl font-semibold tracking-tight">
            Installer Movaé
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-encre-2 transition hover:bg-fond hover:text-encre"
            autoFocus
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm text-encre-2">
          Selon votre navigateur, l’installation apparaît dans la barre d’adresse ou le menu.
        </p>
        <ul className="mt-5 space-y-3.5 text-sm">
          <li className="flex gap-3">
            <MonitorDown className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sauge-fonce" aria-hidden />
            <span>
              <strong>Chrome / Edge (ordinateur)</strong> — cliquez sur l’icône
              d’installation à droite de la barre d’adresse.
            </span>
          </li>
          <li className="flex gap-3">
            <Download className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sauge-fonce" aria-hidden />
            <span>
              <strong>Android</strong> — menu du navigateur &gt; « Installer l’application ».
            </span>
          </li>
          <li className="flex gap-3">
            <Share className="mt-0.5 h-4.5 w-4.5 shrink-0 text-sauge-fonce" aria-hidden />
            <span>
              <strong>iPhone / iPad (Safari)</strong> — Partager &gt; « Sur l’écran d’accueil ».
            </span>
          </li>
        </ul>
        <Link
          to={APP_URL}
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-sauge-fonce px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Ou ouvrir Movaé dans le navigateur
        </Link>
      </div>
    </div>
  );
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);

  const requestInstall = async () => {
    if (isStandalone()) {
      window.location.href = APP_URL;
      return;
    }
    const result = await triggerInstall();
    if (result === "fallback") setModalOpen(true);
    if (result === "accepted") window.location.href = APP_URL;
  };

  return (
    <InstallContext.Provider value={{ requestInstall }}>
      {children}
      {modalOpen && <InstallModal onClose={() => setModalOpen(false)} />}
    </InstallContext.Provider>
  );
}

// ---------- Boutons CTA ----------
export function PrimaryCta({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { requestInstall } = useInstall();
  return (
    <button
      onClick={requestInstall}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-sauge-fonce px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sauge-fonce/20 transition hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0 ${className}`}
    >
      <Download className="h-4 w-4" aria-hidden />
      {children}
    </button>
  );
}

export function SecondaryCta({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-ligne bg-white px-6 py-3.5 text-sm font-semibold text-encre transition hover:border-sauge hover:bg-sauge-claire/40 ${className}`}
    >
      {children}
    </a>
  );
}
