"use client"

import Lenis from "lenis"
import * as React from "react"

declare global {
  interface Window {
    __lenis?: Lenis | null
  }
}

/** Smooth scroll con Lenis (como en IRONLOG). Con "reducir movimiento" se queda el scroll nativo. */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const instance = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      anchors: { offset: -72 },
    })
    window.__lenis = instance
    let raf = 0
    const loop = (time: number) => {
      instance.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      instance.destroy()
      window.__lenis = null
    }
  }, [])
  return <>{children}</>
}
