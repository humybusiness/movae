import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Download, MousePointerClick, X } from "lucide-react";
import {
  canPromptInstall,
  isStandalone,
  onInstallChange,
  triggerInstall,
} from "../lib/installPrompt";
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
type Platform = "desktop-chromium" | "ios" | "android" | "firefox" | "other";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (/mac/i.test(ua) && "ontouchend" in document)) return "ios";
  if (/android/i.test(ua)) return "android";
  if (/firefox/i.test(ua)) return "firefox";
  if (/edg|chrome|chromium/i.test(ua)) return "desktop-chromium";
  return "other";
}

interface InstallContextValue {
  requestInstall: () => void;
  canInstall: boolean;
  installed: boolean;
}

const InstallContext = createContext<InstallContextValue>({
  requestInstall: () => {},
  canInstall: false,
  installed: false,
});

export function useInstall() {
  return useContext(InstallContext);
}

function InstallModal({ onClose }: { onClose: () => void }) {
  const platform = detectPlatform();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const steps: Record<Platform, { label: string; text: string }[]> = {
    "desktop-chromium": [
      { label: "1", text: "Cliquez sur l’icône d’installation (un écran avec une flèche) tout à droite de la barre d’adresse." },
      { label: "2", text: "Confirmez « Installer » : Movaé s’ouvre dans sa propre fenêtre, comme un logiciel." },
    ],
    android: [
      { label: "1", text: "Ouvrez le menu ⋮ de votre navigateur." },
      { label: "2", text: "Touchez « Installer l’application » ou « Ajouter à l’écran d’accueil »." },
    ],
    ios: [
      { label: "1", text: "Dans Safari, touchez le bouton Partager (le carré avec une flèche)." },
      { label: "2", text: "Choisissez « Sur l’écran d’accueil », puis « Ajouter »." },
    ],
    firefox: [
      { label: "1", text: "Firefox n’installe pas les applications web sur ordinateur." },
      { label: "2", text: "Ouvrez Movaé dans le navigateur, ou installez-la depuis Chrome / Edge." },
    ],
    other: [
      { label: "1", text: "Ouvrez ce site dans Chrome ou Edge pour l’installer comme une application." },
      { label: "2", text: "Ou utilisez Movaé directement dans votre navigateur." },
    ],
  };

  const titles: Record<Platform, string> = {
    "desktop-chromium": "Installer Movaé sur votre ordinateur",
    android: "Installer Movaé sur Android",
    ios: "Ajouter Movaé sur iPhone / iPad",
    firefox: "Ouvrir Movaé",
    other: "Installer Movaé",
  };

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
        <div className="flex items-start justify-between gap-4">
          <h2 id="install-title" className="font-display text-xl font-semibold tracking-tight">
            {titles[platform]}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-encre-2 transition hover:bg-fond hover:text-encre"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-sm text-encre-2">
          Movaé est une application web : elle s’installe directement depuis le navigateur,
          sans store ni fichier à télécharger.
        </p>
        <ol className="mt-5 space-y-3 text-sm">
          {steps[platform].map((s) => (
            <li key={s.label} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sauge-claire text-xs font-bold text-sauge-fonce">
                {s.label}
              </span>
              <span className="pt-0.5">{s.text}</span>
            </li>
          ))}
        </ol>
        <Link
          to={APP_URL}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sauge-fonce px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <MousePointerClick className="h-4 w-4" aria-hidden />
          Ouvrir Movaé maintenant
        </Link>
      </div>
    </div>
  );
}

function InstalledToast({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-ligne bg-white px-4 py-3 text-sm font-semibold shadow-2xl">
      <CheckCircle2 className="h-4 w-4 text-sauge-fonce" aria-hidden />
      Movaé est installée. Retrouvez-la parmi vos applications.
    </div>
  );
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [canInstall, setCanInstall] = useState(canPromptInstall());
  const [installed, setInstalled] = useState(isStandalone());
  const [showToast, setShowToast] = useState(false);

  useEffect(() => onInstallChange(() => {
    setCanInstall(canPromptInstall());
    setInstalled(isStandalone());
  }), []);

  const requestInstall = async () => {
    if (isStandalone()) {
      window.location.href = APP_URL;
      return;
    }
    const result = await triggerInstall();
    if (result === "accepted") {
      setShowToast(true);
      setInstalled(true);
    } else if (result === "fallback") {
      setModalOpen(true);
    }
  };

  return (
    <InstallContext.Provider value={{ requestInstall, canInstall, installed }}>
      {children}
      {modalOpen && <InstallModal onClose={() => setModalOpen(false)} />}
      {showToast && <InstalledToast onClose={() => setShowToast(false)} />}
    </InstallContext.Provider>
  );
}

// ---------- Boutons CTA ----------
export function PrimaryCta({ children, className = "" }: { children: ReactNode; className?: string }) {
  const { requestInstall, installed } = useInstall();
  return (
    <button
      onClick={requestInstall}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-sauge-fonce px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sauge-fonce/20 transition hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0 ${className}`}
    >
      {installed ? (
        <>
          <MousePointerClick className="h-4 w-4" aria-hidden />
          Ouvrir Movaé
        </>
      ) : (
        <>
          <Download className="h-4 w-4" aria-hidden />
          {children}
        </>
      )}
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
