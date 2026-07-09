import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Download, MonitorDown, ShieldAlert, X } from "lucide-react";
import { DOWNLOAD_URL_WINDOWS } from "../lib/constants";

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

// ---------- Téléchargement de l'application de bureau ----------

function isWindows(): boolean {
  return typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent);
}

interface InstallContextValue {
  requestInstall: () => void;
}

const InstallContext = createContext<InstallContextValue>({
  requestInstall: () => {},
});

export function useInstall() {
  return useContext(InstallContext);
}

function DownloadModal({ started, onClose }: { started: boolean; onClose: () => void }) {
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
      aria-labelledby="dl-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-ligne bg-white p-7 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="dl-title" className="font-display text-xl font-semibold tracking-tight">
            {started ? "Téléchargement lancé" : "Movaé pour Windows"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-encre-2 transition hover:bg-fond hover:text-encre"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {started ? (
          <>
            <p className="mt-2 text-sm text-encre-2">
              <strong>Movae-Setup.exe</strong> arrive dans votre dossier Téléchargements.
            </p>
            <ol className="mt-5 space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sauge-claire text-xs font-bold text-sauge-fonce">1</span>
                <span className="pt-0.5">Ouvrez le fichier <strong>Movae-Setup.exe</strong> une fois le téléchargement terminé.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sauge-claire text-xs font-bold text-sauge-fonce">2</span>
                <span className="pt-0.5">L'installation se fait en un clic : Movaé se lance et s'ajoute à votre menu Démarrer.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sauge-claire text-xs font-bold text-sauge-fonce">3</span>
                <span className="pt-0.5">Movaé veille ensuite depuis la zone de notification, même fenêtre fermée.</span>
              </li>
            </ol>
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-fond p-3 text-xs text-encre-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-ambre" aria-hidden />
              <span>
                Si Windows affiche « Windows a protégé votre ordinateur » (application récente,
                pas encore signée) : cliquez sur <strong>Informations complémentaires</strong> puis{" "}
                <strong>Exécuter quand même</strong>.
              </span>
            </p>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-encre-2">
              L'application de bureau Movaé est disponible pour <strong>Windows</strong>.
              Les versions macOS et Linux arrivent ensuite.
            </p>
            <a
              href={DOWNLOAD_URL_WINDOWS}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sauge-fonce px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <MonitorDown className="h-4 w-4" aria-hidden />
              Télécharger pour Windows
            </a>
          </>
        )}
      </div>
    </div>
  );
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<null | { started: boolean }>(null);

  const requestInstall = () => {
    if (isWindows()) {
      // Lance le téléchargement du vrai installeur, puis guide l'utilisateur.
      const a = document.createElement("a");
      a.href = DOWNLOAD_URL_WINDOWS;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setModal({ started: true });
    } else {
      setModal({ started: false });
    }
  };

  return (
    <InstallContext.Provider value={{ requestInstall }}>
      {children}
      {modal && <DownloadModal started={modal.started} onClose={() => setModal(null)} />}
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
