/** Desplaza la página pasando por Lenis si está activo (si no, scroll nativo). */
export function scrollToY(top: number, immediate = false) {
  const lenis = typeof window !== "undefined" ? window.__lenis : null
  if (lenis) lenis.scrollTo(top, { immediate, force: true, duration: 0.8 })
  else window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" })
}

/** Pausa el smooth scroll mientras hay un diálogo abierto. */
export function setScrollLocked(locked: boolean) {
  if (typeof window === "undefined") return
  const lenis = window.__lenis
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  } else document.documentElement.classList.toggle("scroll-locked", locked)
}
