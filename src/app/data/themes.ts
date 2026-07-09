import type { ThemeId } from "../types";

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  dark: boolean;
  // Aperçu : [fond, accent, carte]
  preview: [string, string, string];
  vars: Record<string, string>;
}

export const THEMES: ThemeDef[] = [
  {
    id: "sauge",
    name: "Sauge",
    description: "Le thème Movaé d’origine. Calme, clair, actif.",
    dark: false,
    preview: ["#F7F7F2", "#7FA68A", "#FFFFFF"],
    vars: {
      "--m-bg": "#F7F7F2",
      "--m-bg2": "#F1F1EA",
      "--m-card": "#FFFFFF",
      "--m-ink": "#1E2420",
      "--m-ink2": "#6D756F",
      "--m-line": "#E5E7E0",
      "--m-accent": "#7FA68A",
      "--m-strong": "#4F755D",
      "--m-soft": "#DDEADF",
      "--m-shadow": "0 1px 2px rgb(30 36 32 / 0.04), 0 8px 24px -12px rgb(30 36 32 / 0.12)",
    },
  },
  {
    id: "nuit-calme",
    name: "Nuit calme",
    description: "Un mode sombre profond pour les fins de journée.",
    dark: true,
    preview: ["#111513", "#8FBF9A", "#1D241F"],
    vars: {
      "--m-bg": "#111513",
      "--m-bg2": "#161C18",
      "--m-card": "#1D241F",
      "--m-ink": "#F4F1E8",
      "--m-ink2": "#9BA69C",
      "--m-line": "#2D352F",
      "--m-accent": "#8FBF9A",
      "--m-strong": "#B4D8BC",
      "--m-soft": "#26332A",
      "--m-shadow": "0 1px 2px rgb(0 0 0 / 0.3), 0 8px 24px -12px rgb(0 0 0 / 0.5)",
    },
  },
  {
    id: "sable",
    name: "Sable",
    description: "Une palette chaude et minérale, façon carnet de terrain.",
    dark: false,
    preview: ["#F6F1E6", "#C9A86A", "#FFFFFF"],
    vars: {
      "--m-bg": "#F6F1E6",
      "--m-bg2": "#F0E9DA",
      "--m-card": "#FFFFFF",
      "--m-ink": "#262019",
      "--m-ink2": "#7A7264",
      "--m-line": "#E8E0CE",
      "--m-accent": "#C9A86A",
      "--m-strong": "#8F7443",
      "--m-soft": "#EFE4CD",
      "--m-shadow": "0 1px 2px rgb(38 32 25 / 0.05), 0 8px 24px -12px rgb(38 32 25 / 0.14)",
    },
  },
  {
    id: "foret",
    name: "Forêt profonde",
    description: "Un sombre végétal, réservé aux plus réguliers.",
    dark: true,
    preview: ["#0F1712", "#7FA68A", "#182219"],
    vars: {
      "--m-bg": "#0F1712",
      "--m-bg2": "#131D16",
      "--m-card": "#182219",
      "--m-ink": "#EFF4EC",
      "--m-ink2": "#93A296",
      "--m-line": "#263628",
      "--m-accent": "#7FA68A",
      "--m-strong": "#A9C9AF",
      "--m-soft": "#1F2E23",
      "--m-shadow": "0 1px 2px rgb(0 0 0 / 0.35), 0 8px 24px -12px rgb(0 0 0 / 0.55)",
    },
  },
  {
    id: "aube",
    name: "Aube",
    description: "Des tons chauds de lever de soleil pour bien démarrer.",
    dark: false,
    preview: ["#F7F3F0", "#C08968", "#FFFFFF"],
    vars: {
      "--m-bg": "#F7F3F0",
      "--m-bg2": "#F1EAE4",
      "--m-card": "#FFFFFF",
      "--m-ink": "#241E1A",
      "--m-ink2": "#7C7168",
      "--m-line": "#EADFD6",
      "--m-accent": "#C08968",
      "--m-strong": "#96603F",
      "--m-soft": "#F0DFD3",
      "--m-shadow": "0 1px 2px rgb(36 30 26 / 0.05), 0 8px 24px -12px rgb(36 30 26 / 0.14)",
    },
  },
];

export const themeById = (id: ThemeId): ThemeDef =>
  THEMES.find((t) => t.id === id) ?? THEMES[0];
