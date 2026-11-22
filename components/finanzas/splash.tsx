"use client"

import * as React from "react"

import { OrbeMark } from "@/components/finanzas/logo"
import { cn } from "@/lib/utils"

const KEY = "orbe.splash"
const DURATION = 2300

/** Apertura animada: se ve una vez por sesión (al abrir la app), y se salta con un toque. */
export function Splash() {
  const [phase, setPhase] = React.useState<"show" | "leaving" | "gone">("show")
  // Se decide una sola vez: en desarrollo React ejecuta los efectos dos veces.
  const seenRef = React.useRef<boolean | null>(null)

  React.useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = false
      try {
        seenRef.current = sessionStorage.getItem(KEY) === "1"
        sessionStorage.setItem(KEY, "1")
      } catch {}
    }
    const seen = seenRef.current
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (seen) {
      // Ya se vio en esta sesión: no repetir al recargar.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase("gone")
      return
    }
    const t1 = setTimeout(() => setPhase("leaving"), reduce ? 600 : DURATION)
    return () => clearTimeout(t1)
  }, [])

  React.useEffect(() => {
    if (phase !== "leaving") return
    const t = setTimeout(() => setPhase("gone"), 500)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === "gone") return null
  return (
    <div
      role="presentation"
      onClick={() => setPhase("leaving")}
      className={cn(
        "fixed inset-0 z-[100] grid place-items-center overflow-hidden bg-[#0f1a1c] text-[#e5f9f8]",
        phase === "leaving" && "splash-out"
      )}
    >
      {/* halo de fondo */}
      <div
        aria-hidden
        className="splash-glow absolute size-[120vmin] rounded-full opacity-60"
        style={{ background: "radial-gradient(closest-side, rgb(18 178 193 / 0.28), transparent 70%)" }}
      />
      <div className="relative grid justify-items-center gap-6 px-6 text-center">
        <OrbeMark animated tile={false} className="size-40 drop-shadow-[0_0_40px_rgb(18_178_193/0.45)]" />
        <div className="grid gap-2">
          <h1 className="splash-rise font-heading text-5xl font-bold tracking-tight" style={{ animationDelay: "1.05s" }}>
            Orbe
          </h1>
          <p
            className="splash-rise text-xs font-medium tracking-[0.32em] text-[#9fdde3] uppercase"
            style={{ animationDelay: "1.3s" }}
          >
            Tu dinero, en órbita
          </p>
        </div>
      </div>
      <p className="splash-rise absolute bottom-[max(2rem,env(safe-area-inset-bottom))] text-[11px] text-[#9db8b8]" style={{ animationDelay: "1.6s" }}>
        Toca para entrar
      </p>
    </div>
  )
}
