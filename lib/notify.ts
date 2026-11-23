/*
 * Avisos de la app → isla dinámica (components/dynamic-island.tsx).
 * Misma forma que `toast` de sonner para no tocar cada llamada:
 *   toast("Texto"), toast.success(...), toast.error(...), con { description, action, duration, icon }.
 */
import type * as React from "react"

export type IslandTone = "info" | "success" | "error"
export interface IslandMsg {
  id: number
  text: string
  tone: IslandTone
  description?: string
  icon?: React.ReactNode
  action?: { label: string; onClick: () => void }
  duration: number
}
interface Opts {
  description?: string
  icon?: React.ReactNode
  action?: { label: string; onClick: () => void }
  duration?: number
}

let seq = 0
function emit(tone: IslandTone, text: string, o: Opts = {}) {
  if (typeof window === "undefined") return
  const msg: IslandMsg = {
    id: ++seq,
    text,
    tone,
    description: o.description,
    icon: o.icon,
    action: o.action,
    duration: o.duration ?? (o.action ? 5000 : tone === "error" ? 4500 : 2600),
  }
  window.dispatchEvent(new CustomEvent<IslandMsg>("orbe:island", { detail: msg }))
}

type Toast = ((text: string, o?: Opts) => void) & {
  success: (text: string, o?: Opts) => void
  error: (text: string, o?: Opts) => void
  info: (text: string, o?: Opts) => void
}
export const toast: Toast = Object.assign((text: string, o?: Opts) => emit("info", text, o), {
  success: (text: string, o?: Opts) => emit("success", text, o),
  error: (text: string, o?: Opts) => emit("error", text, o),
  info: (text: string, o?: Opts) => emit("info", text, o),
})
