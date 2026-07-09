// Détection et API de la version bureau (Electron).
// En version web, toutes ces fonctions se replient proprement.

interface MovaeDesktopApi {
  isDesktop: boolean;
  getIdleSeconds: () => Promise<number>;
  showWindow: () => Promise<void>;
  getVersion: () => Promise<string>;
}

declare global {
  interface Window {
    movaeDesktop?: MovaeDesktopApi;
  }
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && Boolean(window.movaeDesktop?.isDesktop);
}

// Inactivité système (clavier/souris, toutes applications confondues).
// Renvoie null en version web : le moteur retombe sur l'activité dans l'onglet.
export async function systemIdleSeconds(): Promise<number | null> {
  if (!isDesktop()) return null;
  try {
    return await window.movaeDesktop!.getIdleSeconds();
  } catch {
    return null;
  }
}

export function focusDesktopWindow(): void {
  window.movaeDesktop?.showWindow().catch(() => {});
}
