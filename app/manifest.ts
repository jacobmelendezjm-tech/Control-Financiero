import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Orbe · Control financiero",
    short_name: "Orbe",
    description: "Ingresos, gastos, gastos hormiga, ahorro, nóminas y horas de trabajo en tu móvil.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "es",
    background_color: "#0f1a1c",
    theme_color: "#1f2b2d",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/orbe.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Añadir gasto", url: "/#nuevo-gasto", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Registrar jornada", url: "/#trabajo", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  }
}
