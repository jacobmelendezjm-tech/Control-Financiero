"use client"

import Lenis from "lenis"
import * as React from "react"

declare global {
  interface Window {
    __lenis?: Lenis | null
  }
}

/**
 * Smooth scroll con Lenis. Con «reducir movimiento» se queda el scroll nativo.
 *  - `lerp` (en vez de una duración fija): cada giro de rueda se suma al anterior sin reiniciar la
 *    animación, así no da tirones ni sigue deslizando de más con ratón o panel táctil.
 *  - `allowNestedScroll`: las zonas con su propio scroll (desplegables, tablas, diálogos) se
 *    desplazan ellas en vez de mover la página (antes parecía que el scroll se quedaba pegado).
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const instance = new Lenis({
      lerp: 0.12,
      smoothWheel: true,
      allowNestedScroll: true,
      autoRaf: true,
      anchors: { offset: -72 },
    })
    window.__lenis = instance
    return () => {
      instance.destroy()
      window.__lenis = null
    }
  }, [])
  return <>{children}</>
}
