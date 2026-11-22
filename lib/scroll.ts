/** Desplaza la página pasando por Lenis si está activo (si no, scroll nativo). */
export function scrollToY(top: number, immediate = false) {
  const lenis = typeof window !== "undefined" ? window.__lenis : null
  if (lenis) lenis.scrollTo(top, { immediate, force: true, duration: 0.8 })
  else window.scrollTo({ top, behavior: immediate ? "auto" : "smooth" })
}

/** Pausa el smooth scroll mientras hay un diálogo abierto. */
export function setScrollLocked(locked: boolean) {
  const lenis = typeof window !== "undefined" ? window.__lenis : null
  if (!lenis) return
  if (locked) lenis.stop()
  else lenis.start()
}
