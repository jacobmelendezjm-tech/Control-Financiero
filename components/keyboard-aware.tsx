"use client"

import * as React from "react"

/*
 * Teclado del móvil: cuando se abre, tapa la parte de abajo de la pantalla.
 *  - Publica la zona visible como variables CSS en <html>:
 *      --vvh (alto visible), --vvt (desplazamiento del área visible) y --kb (alto del teclado).
 *    Los diálogos y la hoja de bienvenida las usan para quedar por encima del teclado.
 *  - Añade la clase `kb-open` a <html> mientras el teclado está abierto.
 *  - Al enfocar un campo en una pantalla táctil, lo lleva al centro de lo visible.
 */
export function KeyboardAware() {
  React.useEffect(() => {
    const vv = window.visualViewport
    const root = document.documentElement
    let raf = 0
    const update = () => {
      raf = 0
      const h = vv ? vv.height : window.innerHeight
      const top = vv ? vv.offsetTop : 0
      const kb = Math.max(0, window.innerHeight - h - top)
      root.style.setProperty("--vvh", `${h}px`)
      root.style.setProperty("--vvt", `${top}px`)
      root.style.setProperty("--kb", `${kb}px`)
      root.classList.toggle("kb-open", kb > 120)
    }
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    vv?.addEventListener("resize", schedule)
    vv?.addEventListener("scroll", schedule)
    window.addEventListener("resize", schedule)

    const touch = window.matchMedia("(pointer: coarse)").matches
    let t: ReturnType<typeof setTimeout> | undefined
    const onFocus = (e: FocusEvent) => {
      if (!touch) return
      const el = e.target as HTMLElement | null
      if (!el || !el.matches("input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable=true]")) return
      clearTimeout(t)
      // Espera a que el teclado termine de abrirse y recoloque los diálogos.
      t = setTimeout(() => el.scrollIntoView({ block: "center", behavior: "smooth" }), 350)
    }
    document.addEventListener("focusin", onFocus)

    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(t)
      vv?.removeEventListener("resize", schedule)
      vv?.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      document.removeEventListener("focusin", onFocus)
    }
  }, [])
  return null
}
