"use client"

import * as React from "react"

import { OrbeMark } from "@/components/finanzas/logo"
import { SilkShader } from "@/components/silk-shader"
import { cn } from "@/lib/utils"

const KEY = "orbe.splash"
const DURATION = 3600

/** Monedas de luz que suben: [izquierda %, retraso s, duración s, tamaño px]. */
const COINS = [
  [8, 0.2, 5.5, 10],
  [18, 1.1, 6.5, 14],
  [27, 0.6, 5, 8],
  [36, 1.6, 7, 12],
  [48, 0.3, 6, 9],
  [57, 1.3, 5.2, 13],
  [66, 0.8, 6.8, 10],
  [74, 0.1, 5.6, 16],
  [83, 1.4, 6.2, 9],
  [92, 0.7, 5.8, 12],
] as const

const WORDS = ["Ahorra", "Planifica", "Crece"]

/**
 * Apertura: sobre la seda en movimiento se dibuja una línea de crecimiento dorada
 * (un gráfico de ahorro que sube), flotan monedas de luz sobre una rejilla en
 * perspectiva, aparecen «Ahorra · Planifica · Crece» y el gráfico se convierte en
 * el logo. Sale con un iris que se cierra hacia el centro.
 * Una vez por sesión; un toque la salta; con «reducir movimiento» es breve y quieta.
 */
export function Splash() {
  const [phase, setPhase] = React.useState<"show" | "leaving" | "gone">("show")
  const [logo, setLogo] = React.useState(false)
  const seenRef = React.useRef<boolean | null>(null)

  React.useEffect(() => {
    if (seenRef.current === null) {
      seenRef.current = false
      try {
        seenRef.current = sessionStorage.getItem(KEY) === "1"
        sessionStorage.setItem(KEY, "1")
      } catch {}
    }
    if (seenRef.current) {
      // Ya se vio en esta sesión: no repetir al recargar.
      setPhase("gone")
      return
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t0 = setTimeout(() => setLogo(true), reduce ? 0 : 1450)
    const t1 = setTimeout(() => setPhase("leaving"), reduce ? 700 : DURATION)
    return () => {
      clearTimeout(t0)
      clearTimeout(t1)
    }
  }, [])

  React.useEffect(() => {
    if (phase !== "leaving") return
    const t = setTimeout(() => setPhase("gone"), 650)
    return () => clearTimeout(t)
  }, [phase])

  if (phase === "gone") return null
  return (
    <div
      role="presentation"
      onClick={() => setPhase("leaving")}
      className={cn("fixed inset-0 z-[100] overflow-hidden bg-[#0f1a1c] text-[#E5F9F8]", phase === "leaving" && "splash-iris")}
    >
      <SilkShader className="absolute inset-0" speed={1.1} />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgb(15_26_28/0.2),rgb(15_26_28/0.92)_75%)]" />

      {/* Rejilla en perspectiva: el «suelo» del futuro */}
      <div aria-hidden className="splash-grid absolute inset-x-[-50%] bottom-[-10%] h-[55%]" />

      {/* Monedas de luz */}
      {COINS.map(([left, delay, dur, size], i) => (
        <span
          key={i}
          aria-hidden
          className="splash-coin absolute bottom-[-24px] grid place-items-center rounded-full border border-[#E5F9F8]/50 bg-[#12B2C1]/15 font-heading font-bold text-[#E5F9F8]/80 shadow-[0_0_18px_rgb(18_178_193/0.55)]"
          style={{ left: `${left}%`, width: size + 8, height: size + 8, fontSize: size * 0.7, animationDelay: `${delay}s`, animationDuration: `${dur}s` }}
        >
          €
        </span>
      ))}

      <div className="relative grid h-full place-items-center px-6">
        <div className="grid w-full max-w-[520px] justify-items-center gap-5">
          <div className="flex items-center gap-3 text-[11px] font-semibold tracking-[0.34em] text-[#E5F9F8]/85 uppercase">
            {WORDS.map((w, i) => (
              <React.Fragment key={w}>
                {i ? <i aria-hidden className="splash-rise size-1 rounded-full bg-[#12B2C1]" style={{ animationDelay: `${0.25 + i * 0.38}s` }} /> : null}
                <span className="splash-rise" style={{ animationDelay: `${0.2 + i * 0.38}s` }}>
                  {w}
                </span>
              </React.Fragment>
            ))}
          </div>

          {/* Gráfico de crecimiento → logo */}
          <div className="relative grid aspect-[4/3] w-full place-items-center">
            <svg viewBox="0 0 400 300" aria-hidden className={cn("absolute inset-0 h-full w-full transition-all duration-700", logo && "scale-75 opacity-0 blur-sm")}>
              <defs>
                <linearGradient id="sp-line" x1="0" y1="1" x2="1" y2="0">
                  <stop offset="0" stopColor="#12B2C1" />
                  <stop offset="1" stopColor="#F2B84B" />
                </linearGradient>
                <linearGradient id="sp-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#12B2C1" stopOpacity="0.35" />
                  <stop offset="1" stopColor="#12B2C1" stopOpacity="0" />
                </linearGradient>
                <filter id="sp-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {[60, 120, 180, 240].map((y) => (
                <line key={y} x1="0" x2="400" y1={y} y2={y} stroke="#E5F9F8" strokeOpacity="0.08" strokeDasharray="2 6" />
              ))}
              <path className="splash-area" d="M10 262 L70 230 L120 244 L180 182 L232 196 L292 120 L342 134 L392 40 L392 300 L10 300 Z" fill="url(#sp-area)" />
              <path
                className="splash-line"
                pathLength={1}
                d="M10 262 L70 230 L120 244 L180 182 L232 196 L292 120 L342 134 L392 40"
                fill="none"
                stroke="url(#sp-line)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#sp-glow)"
              />
              <circle className="splash-dot" cx="392" cy="40" r="7" fill="#F2B84B" filter="url(#sp-glow)" />
            </svg>
            {logo ? <OrbeMark animated tile={false} className="relative size-40 drop-shadow-[0_0_44px_rgb(18_178_193/0.55)]" /> : null}
          </div>

          <div className="grid justify-items-center gap-1.5 text-center">
            <h1 className="splash-rise font-heading text-5xl font-bold tracking-tight" style={{ animationDelay: "1.9s" }}>
              Orbe
            </h1>
            <p className="splash-rise text-sm font-medium text-[#E5F9F8]/80" style={{ animationDelay: "2.15s" }}>
              Tu futuro, en órbita
            </p>
          </div>
        </div>
      </div>

      <p
        className="splash-rise absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-[11px] text-[#E5F9F8]/55"
        style={{ animationDelay: "2.4s" }}
      >
        Toca para entrar
      </p>
    </div>
  )
}
