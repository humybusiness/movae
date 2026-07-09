// Gestion du prompt d'installation PWA (beforeinstallprompt).
// Chrome/Edge exposent l'événement ; Safari et Firefox non → fallback modale.

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;

type Listener = () => void;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredPrompt = null;
    emit();
  });
}

export function canPromptInstall(): boolean {
  return deferredPrompt !== null;
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return installed || window.matchMedia("(display-mode: standalone)").matches;
}

export function onInstallChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export type InstallResult = "accepted" | "dismissed" | "fallback";

export async function triggerInstall(): Promise<InstallResult> {
  if (!deferredPrompt) return "fallback";
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  try {
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    emit();
    return choice.outcome;
  } catch {
    emit();
    return "fallback";
  }
}
