"use client"

import * as React from "react"
import { CheckIcon, InfoIcon, TriangleAlertIcon } from "lucide-react"

import type { IslandMsg } from "@/lib/notify"
import { cn } from "@/lib/utils"

/**
 * Isla dinámica: una píldora negra de cristal arriba en el centro que se
 * expande con cada aviso y vuelve a encogerse. En reposo solo aparece
 * (en pequeño) mientras se guarda en la nube.
 */
export function DynamicIsland({ busy }: { busy: boolean }) {
  const [queue, setQueue] = React.useState<IslandMsg[]>([])
  const msg = queue[0]

  React.useEffect(() => {
    const on = (e: Event) => {
      const m = (e as CustomEvent<IslandMsg>).detail
      // Un aviso igual al que se está mostrando no se repite.
      setQueue((q) => (q.some((x) => x.text === m.text) ? q : [...q.slice(-2), m]))
      if (navigator.vibrate && m.tone !== "info") navigator.vibrate(m.tone === "error" ? [20, 40, 20] : 10)
    }
    window.addEventListener("orbe:island", on)
    return () => window.removeEventListener("orbe:island", on)
  }, [])

  React.useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setQueue((q) => q.slice(1)), msg.duration)
    return () => clearTimeout(t)
  }, [msg])

  const open = !!msg
  const visible = open || busy
  const Icon = msg?.tone === "success" ? CheckIcon : msg?.tone === "error" ? TriangleAlertIcon : InfoIcon

  return (
    <div className="pointer-events-none fixed inset-x-0 top-[max(0.5rem,env(safe-area-inset-top))] z-[95] flex justify-center px-3 lg:top-[4.75rem] lg:pl-[260px]">
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "island pointer-events-auto flex items-center overflow-hidden bg-black/85 text-white shadow-[0_18px_40px_-12px_rgb(0_0_0/0.55)] ring-1 ring-white/12 backdrop-blur-2xl",
          visible ? "opacity-100" : "pointer-events-none -translate-y-3 scale-75 opacity-0",
          open ? "island-open min-h-12 max-w-[min(420px,calc(100vw-24px))] gap-3 rounded-[26px] py-2 pr-2 pl-2" : "h-8 max-w-28 gap-2 rounded-full px-3"
        )}
        onClick={() => msg && !msg.action && setQueue((q) => q.slice(1))}
      >
        {open && msg ? (
          <>
            <span
              key={msg.id}
              className={cn(
                "island-pop grid size-9 shrink-0 place-items-center rounded-full",
                msg.tone === "success" ? "bg-[#12B2C1] text-[#0f1a1c]" : msg.tone === "error" ? "bg-[#ef6b63] text-white" : "bg-white/15 text-white"
              )}
            >
              {msg.icon ?? <Icon className="size-[18px]" strokeWidth={2.6} />}
            </span>
            <span key={`t${msg.id}`} className="island-text grid min-w-0 flex-1 pr-2">
              <span className="truncate text-[14.5px] font-semibold">{msg.text}</span>
              {msg.description ? <span className="line-clamp-2 text-xs text-white/70">{msg.description}</span> : null}
            </span>
            {msg.action ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  msg.action!.onClick()
                  setQueue((q) => q.slice(1))
                }}
                className="shrink-0 rounded-full bg-white px-3.5 py-2 text-[13px] font-semibold text-black active:scale-95"
              >
                {msg.action.label}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <span className="block size-3 animate-spin rounded-full border-2 border-[#12B2C1] border-t-transparent" aria-hidden />
            <span className="text-[11px] font-medium whitespace-nowrap text-white/80">Guardando</span>
          </>
        )}
      </div>
    </div>
  )
}
