import type { NextConfig } from "next"

/*
 * Cabeceras de seguridad (pentest del 23/11/2026).
 * CSP: solo se cargan cosas de la propia web y se habla solo con Supabase. Next mete
 * scripts y estilos en línea, por eso 'unsafe-inline' (sin 'unsafe-eval').
 * frame-ancestors 'none' + X-Frame-Options: nadie puede meter Orbe dentro de otra web (clickjacking).
 */
const SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || "https://vocggmajzqagykrojwkx.supabase.co").replace(/\/$/, "")
const SUPABASE_WS = SUPABASE.replace(/^https:/, "wss:")
const dev = process.env.NODE_ENV !== "production"

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE_WS}${dev ? " ws:" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ")

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ]
  },
}

export default nextConfig
