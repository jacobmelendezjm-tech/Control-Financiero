"use client"

import { useTheme } from "next-themes"
import { useCallback } from "react"
import { flushSync } from "react-dom"

type Theme = "light" | "dark"

const DURATION = 700
const EASING = "cubic-bezier(0.65, 0, 0.35, 1)"

/** Transiciones de tema en curso (por si se pulsa varias veces seguidas). */
let running = 0

/** Primer botón de tema visible (en móvil y escritorio hay uno distinto). */
export function visibleThemeToggle(): Element | null {
  const all = document.querySelectorAll("[data-theme-toggle]")
  for (const el of all) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) return el
  }
  return null
}

function originOf(from?: Element | null) {
  const r = from?.getBoundingClientRect()
  if (r && r.width > 0) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 }
}

/**
 * Devuelve una función que alterna claro/oscuro con animación:
 *  1. View Transitions API → círculo que se expande desde `from` (el botón pulsado).
 *  2. Sin esa API → fundido suave de colores.
 *  3. Con "reducir movimiento" → cambio instantáneo.
 */
export function useThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()

  return useCallback(
    (from?: Element | null) => {
      const root = document.documentElement
      const current: Theme =
        resolvedTheme === "dark" || (!resolvedTheme && root.classList.contains("dark"))
          ? "dark"
          : "light"
      const next: Theme = current === "dark" ? "light" : "dark"

      // next-themes aplica la clase en un efecto; aquí la ponemos ya, de forma
      // síncrona, para que la View Transition capture el estado nuevo.
      const apply = () => {
        root.classList.remove("light", "dark")
        root.classList.add(next)
        root.style.colorScheme = next
        flushSync(() => setTheme(next))
      }

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        apply()
        return
      }

      if (typeof document.startViewTransition !== "function") {
        root.classList.add("theme-fade")
        apply()
        window.setTimeout(() => root.classList.remove("theme-fade"), 650)
        return
      }

      const { x, y } = originOf(from)
      const radius = Math.hypot(
        Math.max(x, window.innerWidth - x),
        Math.max(y, window.innerHeight - y)
      )

      running++
      root.classList.add("theme-vt")
      const vt = document.startViewTransition(apply)

      vt.ready
        .then(() => {
          root.animate(
            {
              clipPath: [
                `circle(0px at ${x}px ${y}px)`,
                `circle(${radius}px at ${x}px ${y}px)`,
              ],
            },
            { duration: DURATION, easing: EASING, pseudoElement: "::view-transition-new(root)" }
          )
        })
        .catch(() => {
          /* transición omitida (p. ej. pestaña oculta): el tema ya se aplicó */
        })

      const done = () => {
        running = Math.max(0, running - 1)
        if (running === 0) root.classList.remove("theme-vt")
      }
      vt.finished.then(done, done)
    },
    [resolvedTheme, setTheme]
  )
}
