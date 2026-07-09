import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Deux cibles de build :
//  - web (défaut)      → dist/          : site vitrine + démo, déployé sur Vercel
//  - desktop (--mode desktop) → dist-desktop/ : chargé par Electron (chemins relatifs, pas de service worker)
export default defineConfig(({ mode }) => ({
  base: mode === "desktop" ? "./" : "/",
  build: mode === "desktop" ? { outDir: "dist-desktop" } : {},
  plugins: [
    react(),
    tailwindcss(),
    ...(mode === "desktop"
      ? []
      : [VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "og-image.png", "icons/apple-touch-icon.png"],
      manifest: {
        id: "/app",
        name: "Movaé — Pauses actives au bureau",
        short_name: "Movaé",
        description:
          "Micro-pauses actives, exercices assis et Indice de progression pour les journées devant l’écran. Créé par des étudiants en kinésithérapie.",
        lang: "fr",
        start_url: "/app",
        scope: "/",
        display: "standalone",
        background_color: "#F7F7F2",
        theme_color: "#F7F7F2",
        categories: ["productivity", "lifestyle"],
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
        shortcuts: [
          {
            name: "Faire une pause maintenant",
            short_name: "Pause",
            url: "/app?action=pause",
            icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
        })]),
  ],
}));
